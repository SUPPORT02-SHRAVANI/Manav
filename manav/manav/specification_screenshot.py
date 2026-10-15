# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Read a specification table from a screenshot, for the Specifications box of an Item.

Working: some makers' web pages do not let the table be copied as text (the Jagdeep site), so the
table cannot be pasted into the Item. Instead the user uploads a screenshot of it with the
"From screenshot" button on the Item form (manav/public/js/item.js). The picture is attached to the
Item, and read_table() below sends it to Claude (Anthropic's API), which types the table out as
text: one table row per line, the cells separated by tabs. That is the same text a copy and paste
from the page would give, so the Format buttons on the Item then work on it as usual.

The picture is read by a machine and a digit can be read wrongly. The text is therefore only put
into the box for the user to check against the screenshot; nothing is saved by this module.

Setup, once per site (the key is kept in the site's site_config.json, never in the code):
    bench pip install anthropic
    bench --site <site> set-config anthropic_api_key <the key>
The server must be able to reach api.anthropic.com. Every screenshot read is paid for on that key.
The screenshot leaves the server: it is sent to Anthropic for reading.

Created: 2026-10-13.
"""

import base64
import mimetypes

import frappe
from frappe import _

# The model that reads the picture.
MODEL = "claude-opus-5-5"

# Picture types the API accepts.
IMAGE_TYPES = ("image/png", "image/jpeg", "image/gif", "image/webp")

# A screenshot of a table is well below this; a larger file is most likely not a screenshot.
MAX_IMAGE_BYTES = 4 * 1024 * 1024

# One request may take this many seconds, and is tried once more after a failure that can pass
# (busy server, broken connection). Together that stays below the two minutes a web request of
# Frappe is allowed to run.
REQUEST_TIMEOUT = 50
REQUEST_RETRIES = 1

# What the model answers when the picture has no table; the form shows a message for it.
NO_TABLE = "NO_TABLE"

INSTRUCTIONS = f"""You transcribe machine specification tables from screenshots of manufacturers' web pages. Your output is pasted into a form field and parsed by a program, and the values are printed on quotations sent to customers, so every character has to match the picture.

Write the table out as plain text:
- One table row per line, top to bottom. Separate the cells of a row with a single tab character.
- Copy every label, unit and value exactly as it is shown, including signs such as ± + - / and footnote marks such as (*). Do not correct spellings, do not convert units, do not fill in a value that is not in the picture.
- A cell that is merged across several columns is written once, not repeated. For example a "Models" cell that spans the label and unit columns is one cell, and a value shown once across all model columns is one cell.
- An empty cell that is not part of a merged cell is kept as an empty cell: two tabs with nothing between them.
- A row that only holds the title of a section of the table (for example "Travel" or "Electric Motors") is a line with that title alone.
- Keep the header rows (for example "Travels", "S.A.E.", "Metric", or "Models" followed by the model names, or "Descriptions", "Units").
- Text above or below the table that belongs to it (a list of operations, footnotes) is written on its own lines, each as a single cell.
- If part of the table is cut off or too blurred to read, write [unreadable] in that cell rather than guessing.

Output only the transcribed text: no introduction, no explanation, no Markdown, no code fences. If the picture contains no specification table, output exactly {NO_TABLE} and nothing else."""


@frappe.whitelist(methods=["POST"])
def read_table(file_name: str):
	"""Return the specification table shown in an attached screenshot, as tab-separated text.

	`file_name` is the name of the File record of the screenshot. Only a user who may change Items
	and may read that file can use this, because every call is paid for.
	"""
	frappe.has_permission("Item", "write", throw=True)
	file_doc = frappe.get_doc("File", file_name)
	file_doc.check_permission("read")

	media_type = mimetypes.guess_type(file_doc.file_name or file_doc.file_url or "")[0]
	if media_type not in IMAGE_TYPES:
		frappe.throw(_("The screenshot has to be a PNG, JPEG, GIF or WebP picture."))

	content = file_doc.get_content()
	# get_content returns text when the bytes happen to decode as text; a picture never does.
	if not isinstance(content, bytes):
		frappe.throw(_("The file is not a picture."))
	if len(content) > MAX_IMAGE_BYTES:
		frappe.throw(_("The screenshot is larger than 4 MB. Crop it to the table and upload it again."))

	text = transcribe(base64.standard_b64encode(content).decode("ascii"), media_type)
	if not text or text == NO_TABLE:
		frappe.throw(_("No specification table was found in the screenshot."))
	return text


def transcribe(image_data, media_type):
	"""Send the picture to Claude and return the text it types out."""
	api_key = frappe.conf.get("anthropic_api_key")
	if not api_key:
		frappe.throw(
			_(
				"Reading screenshots is not set up on this site. Ask the administrator to run:"
				" bench --site {0} set-config anthropic_api_key (the key)"
			).format(frappe.local.site),
			title=_("Not Set Up"),
		)
	try:
		import anthropic
	except ImportError:
		frappe.throw(
			_("The anthropic package is not installed. Ask the administrator to run: bench pip install anthropic"),
			title=_("Not Set Up"),
		)

	client = anthropic.Anthropic(api_key=api_key, timeout=REQUEST_TIMEOUT, max_retries=REQUEST_RETRIES)
	try:
		response = client.beta.messages.create(
			model=MODEL,
			max_tokens=16000,
			# Copying a table needs care but little reasoning; medium keeps the wait short.
			output_config={"effort": "medium"},
			# If the model's safety check declines a picture, Anthropic's recommended substitute
			# model reads it within the same request instead of the request failing.
			betas=["server-side-fallback-2026-07-01"],
			fallbacks="default",
			system=INSTRUCTIONS,
			messages=[
				{
					"role": "user",
					"content": [
						{
							"type": "image",
							"source": {"type": "base64", "media_type": media_type, "data": image_data},
						},
						{"type": "text", "text": "Transcribe the specification table in this screenshot."},
					],
				}
			],
		)
	except anthropic.AuthenticationError:
		frappe.throw(_("The Anthropic API key of this site was not accepted. Ask the administrator to check it."))
	except anthropic.RateLimitError:
		frappe.throw(_("The reading service is busy or its limit is reached. Try again in a minute."))
	except anthropic.APIStatusError as error:
		# The full reply of the service goes to the Error Log; the user gets a short message.
		frappe.log_error(title="Specification screenshot: API error", message=frappe.get_traceback())
		frappe.throw(_("The screenshot could not be read (service error {0}). Try again later.").format(error.status_code))
	except anthropic.APIConnectionError:
		# Also raised when the request takes longer than REQUEST_TIMEOUT.
		frappe.log_error(title="Specification screenshot: connection error", message=frappe.get_traceback())
		frappe.throw(_("The reading service could not be reached or took too long. Check the server's internet connection and try again."))

	if response.stop_reason == "refusal":
		frappe.throw(_("The reading service declined this picture. Upload a screenshot of the specification table only."))
	if response.stop_reason == "max_tokens":
		frappe.throw(_("The table is too long to read in one go. Upload it as two screenshots."))

	text = "".join(block.text for block in response.content if block.type == "text")
	return clean(text)


def clean(text):
	"""Tidy the model's answer: drop a code fence put around it and empty lines at the ends."""
	lines = text.replace("\r\n", "\n").split("\n")
	lines = [line for line in lines if not line.strip().startswith("```")]
	# Tabs at either end of a line are empty cells and are kept; only spaces at the end go.
	lines = [line.rstrip(" ") for line in lines]
	while lines and not lines[0].strip():
		lines.pop(0)
	while lines and not lines[-1].strip():
		lines.pop()
	return "\n".join(lines)
