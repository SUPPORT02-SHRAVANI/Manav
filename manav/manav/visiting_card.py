# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Visiting card reader for Manav Lead: photos of a business card are sent to OpenAI's model, which
returns the company, person, designation, phone numbers, e-mail, website and address on it.

Working: the Lead form (manav_lead.js) uploads the front (and optionally the back) of the card and
calls read_visiting_card() with the file URLs. Both sides are sent in one request, so a card whose
phone / e-mail / address is on the back is read into a single set of details (the model merges the
two images). The answer is a fixed JSON shape (Structured Outputs), so the form can copy each value
into its field. Nothing is saved here.

Setup: the same OpenAI key, model and reasoning effort as Draft with AI (get_ai_settings in
quotation_agent.py: Manav AI Settings, else site_config openai_api_key). The key is never in the
code. The pictures leave the server: they are sent to OpenAI, and every read is paid for on that key.

Created: 2026-10-30.
CHANGE NOTE
Date: 2026-10-30
Change: read_visiting_card takes a list of file URLs (front and back) and sends both in one call.
Reason: some cards carry the contact details on the back; one side alone missed them.
"""

import base64
import json
import mimetypes

import frappe
import requests
from frappe import _

from manav.manav.quotation_agent import OPENAI_URL, get_ai_settings

# Picture types OpenAI's vision input accepts.
IMAGE_TYPES = ("image/png", "image/jpeg", "image/gif", "image/webp")

# The form shrinks a phone photo to well below this before uploading; a larger file is refused so a
# single read stays cheap and quick.
MAX_IMAGE_BYTES = 8 * 1024 * 1024

# Frappe stops a web request after 120 seconds (gunicorn timeout).
REQUEST_TIMEOUT = 60

# At most this many pictures per card (front and back).
MAX_IMAGES = 2

# The fields read from the card. Every one is required by the schema (Structured Outputs strict
# mode); the model answers "" for what the card does not show.
CARD_FIELDS = {
	"company_name": "Name of the company or organisation.",
	"contact_person": "Full name of the person.",
	"contact_position": "The person's designation / job title.",
	"mobile_no": "The person's mobile number, with country code if printed (e.g. +91 98450 12345).",
	"other_phones": "Any other phone / landline / fax numbers, comma separated.",
	"email_id": "The person's e-mail address (lower case).",
	"website": "Website address.",
	"address": "Full postal address on one line.",
	"city": "City of the address.",
	"gstin": "GSTIN / GST number, if printed.",
}

SCHEMA = {
	"type": "object",
	"properties": {key: {"type": "string", "description": text} for key, text in CARD_FIELDS.items()},
	"required": list(CARD_FIELDS),
	"additionalProperties": False,
}

INSTRUCTIONS = """You read business (visiting) cards photographed by salespeople of Manav Marketing, an Indian dealer of machine tools. When two pictures are given they are the front and the back of ONE card: read both and return a single, merged set of details. Copy the details exactly as printed; do not guess or invent anything. Use an empty string for a detail the card does not show or that cannot be read. When the card has several mobile numbers, put the first one in mobile_no and the rest in other_phones. If the pictures are not a visiting card, return every field empty."""


@frappe.whitelist(methods=["POST"])
def read_visiting_card(file_urls=None, file_url=None):
	"""Return the details on the visiting card, merged from its picture(s), as a dict with the keys of
	CARD_FIELDS. `file_urls` is a JSON list (front and back); `file_url` is accepted for one picture.
	Only a user who may create or change leads and may read the files can use it (every call is paid)."""
	if not (frappe.has_permission("Manav Lead", "create") or frappe.has_permission("Manav Lead", "write")):
		frappe.throw(_("You are not allowed to create or change leads."), frappe.PermissionError)

	# One file_url, or a JSON list of them; keep the non-empty ones, at most MAX_IMAGES.
	if isinstance(file_urls, str):
		try:
			file_urls = json.loads(file_urls)
		except ValueError:
			file_urls = [file_urls]
	urls = [url for url in (file_urls or [file_url]) if url][:MAX_IMAGES]
	if not urls:
		frappe.throw(_("Upload a visiting card first."))

	# Read and check each picture, build the data URLs sent to the model.
	data_urls = [read_image(url) for url in urls]

	settings = get_ai_settings()
	if not settings["api_key"]:
		frappe.throw(
			_("The OpenAI key is not set for this site. A System Manager can enter it in Manav AI Settings."),
			title=_("OpenAI key missing"),
		)

	return call_openai(settings, data_urls)


def read_image(file_url):
	"""Check one uploaded picture (permission, type, size) and return its data URL for the model."""
	file_name = frappe.db.get_value("File", {"file_url": file_url}, "name")
	if not file_name:
		frappe.throw(_("The visiting card picture was not found. Upload it again."))
	file_doc = frappe.get_doc("File", file_name)
	# File's own permission check: the uploader, or someone who may read the document it is attached to
	file_doc.check_permission("read")

	media_type = mimetypes.guess_type(file_doc.file_name or file_doc.file_url or "")[0]
	if media_type not in IMAGE_TYPES:
		frappe.throw(_("The visiting card has to be a photo (JPEG, PNG, GIF or WebP)."))
	content = file_doc.get_content()
	# get_content returns text when the bytes happen to decode as text; a picture never does.
	if not isinstance(content, bytes):
		frappe.throw(_("The file is not a picture."))
	if len(content) > MAX_IMAGE_BYTES:
		frappe.throw(_("The photo is larger than 8 MB. Take it again or crop it to the card."))
	return f"data:{media_type};base64,{base64.standard_b64encode(content).decode('ascii')}"


def call_openai(settings, data_urls):
	"""One Chat Completions call with the picture(s); returns the card details as a dict. API errors
	are shown with OpenAI's own message (never the key)."""
	# The text, then one image per side; "high" detail so small print (e-mails) is read.
	content = [{"type": "text", "text": "Read this visiting card (front and back if two pictures)."}]
	content += [{"type": "image_url", "image_url": {"url": data_url, "detail": "high"}} for data_url in data_urls]
	body = {
		"model": settings["model"],
		"messages": [
			{"role": "system", "content": INSTRUCTIONS},
			{"role": "user", "content": content},
		],
		"response_format": {
			"type": "json_schema",
			"json_schema": {"name": "visiting_card", "strict": True, "schema": SCHEMA},
		},
	}
	if settings["effort"]:
		body["reasoning_effort"] = settings["effort"]

	try:
		response = requests.post(
			OPENAI_URL,
			headers={"Authorization": f"Bearer {settings['api_key']}"},
			json=body,
			timeout=REQUEST_TIMEOUT,
		)
	except requests.RequestException as e:
		frappe.throw(_("OpenAI could not be reached: {0}").format(e), title=_("Visiting card not read"))

	if response.status_code != 200:
		try:
			detail = response.json().get("error", {}).get("message")
		except ValueError:
			detail = None
		frappe.throw(
			_("OpenAI answered {0}: {1}").format(response.status_code, detail or response.reason),
			title=_("Visiting card not read"),
		)

	message = response.json()["choices"][0]["message"]
	if message.get("refusal"):
		frappe.throw(_("The AI declined to read this picture: {0}").format(message["refusal"]))
	try:
		card = json.loads(message.get("content") or "{}")
	except ValueError:
		frappe.throw(_("The AI's answer could not be read. Try again."))
	# Only the known keys, as trimmed strings.
	return {key: str(card.get(key) or "").strip() for key in CARD_FIELDS}
