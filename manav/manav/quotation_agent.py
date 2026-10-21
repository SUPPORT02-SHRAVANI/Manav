# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Quotation agent: makes a draft Quotation from one short typed request, with OpenAI's model.

Why: making a quotation by hand takes many steps (principal, customer, each machine, then the
sub-items of each machine from the "+" dialog). The sales engineer types instead e.g.
    "ABC Industries, 2 x VF-2SS with HSM and LK"
and gets a saved draft quotation to check.

Working: draft_quotation() is called from the "Draft with AI" button of the Quotation list
(manav/public/js/quotation_list.js). It sends the request to OpenAI's Chat Completions API with
the tools below, and runs the model's tool calls until the model creates the quotation or answers
with a question (e.g. which of two customers was meant). The model only chooses; it never sets a
price or a code of its own:
- find_customers, list_principals, find_items and get_sub_items look up existing records (with
  the user's permissions), so the model can only pick customers, items and sub-items that exist;
- create_quotation checks every choice again (the customer exists, each machine belongs to the
  principal's Item Group, each sub-item is a sub-item of its machine) and builds the quotation
  the way the form does: the principal's currency, price list, letter head, terms and signing
  sales person (get_type_defaults), machine lines priced by ERPNext from the price list, and
  sub-item lines priced from Quotation Sub Item Master (as add_option_line in quotation.js). The
  usual validate hooks (keep_sub_item_rates, number_sub_items, fill_account_manager, autoname)
  then run on saving, exactly as for a quotation saved from the form.
The quotation is saved as a Draft, and the typed request is kept as a comment on it.

Setup, once per site (the key is kept in the site's site_config.json, never in the code):
    bench --site <site> set-config openai_api_key <the key>
Optional: openai_model (default DEFAULT_MODEL) and openai_reasoning_effort (default "low"; set
it to "" for a model that has no reasoning effort, such as gpt-4.1).
The server must be able to reach api.openai.com. Every request is paid for on that key. The typed
request and the names, codes and descriptions of the customers and items looked up are sent to
OpenAI.

Created: 2026-10-21.

CHANGE NOTE
Date: 2026-10-21
Change: Added the ask_user tool: when something is unclear the model asks one question with the
candidates as choices, which the dialog shows as buttons; the answer clicked is added to the
request ("Answer: ...") and the request is sent again. The model may no longer ask to confirm
what is clear, nor ask for quantities or sub-items not mentioned.
Reason: The user asked for selectable options instead of typing the answer; the model had asked
"which JK TYRE customer" together with needless questions on machine, quantity and accessories.
"""

import json
import time

import frappe
import requests
from frappe import _
from frappe.utils import flt, nowdate

from manav.manav.quotation import get_options, get_type_defaults

OPENAI_URL = "https://api.openai.com/v1/chat/completions"

# A small, quick model is enough: the work is picking from lists the tools return.
DEFAULT_MODEL = "gpt-5-mini"

# Frappe's web request is stopped after 120 seconds (gunicorn timeout), so the whole run has to
# finish well before that; one model call may take up to REQUEST_TIMEOUT seconds.
RUN_DEADLINE = 100
REQUEST_TIMEOUT = 45

# The most model calls in one run; a normal request needs 3 to 6.
MAX_TURNS = 12

# The most rows one lookup returns, so the model is not flooded (and the call stays cheap).
MAX_CUSTOMERS = 10
MAX_ITEMS = 15
MAX_SUB_ITEMS_PER_MACHINE = 150

INSTRUCTIONS = """You prepare draft sales quotations in ERPNext for Manav Marketing, an Indian dealer of machine tools.

A quotation has:
- one principal (the "Quotation Type", e.g. MACHINES): it decides the currency and which items may be quoted;
- one customer;
- one or more machines (items of the principal), each with a quantity;
- under each machine, optional sub-items (accessories / options of that machine, e.g. HSM, LK). A sub-item's price depends on its machine.

The user types a short request. Work as follows:
1. Find the customer with find_customers. Try a shorter part of the name if nothing is found.
2. Find each machine with find_items. When the user named the principal, pass it; otherwise search without it and take the principal of the items found.
3. When sub-items are asked for, call get_sub_items for the machines and match the user's words to the sub-item codes or descriptions.
4. Call create_quotation once everything is clear. If it returns errors, correct them and call it again.

Rules:
- Use only customers, principals, item codes and sub-item codes returned by the tools. Never invent a code.
- When an item code is exactly what the user typed (ignoring case), use that item without asking, even if similar codes exist (e.g. "VF-2" and "VF-2.").
- Quantity is 1 unless the user gives one. A sub-item's quantity is 1 unless the user gives one.
- Do not create the quotation when something is unclear: several customers or items fit equally well, a machine or sub-item cannot be found, or the machines belong to different principals. Instead call ask_user with one short question and the candidates as choices, written exactly as the tools returned them (customer name, or item code with its name). The user's answers come back as lines starting with "Answer:".
- Ask about one thing at a time, and only about what is really unclear. Never ask to confirm something already clear, and never ask for a quantity or for sub-items the user did not mention: those are 1 and none.
- After creating the quotation, answer with one or two short sentences: the quotation number and what is on it, and anything you left out.
- Write plainly, without Markdown."""

TOOLS = [
	{
		"type": "function",
		"function": {
			"name": "list_principals",
			"description": "List the principals (Quotation Types): code, name, currency and item group.",
			"parameters": {"type": "object", "properties": {}, "additionalProperties": False},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "find_customers",
			"description": "Find customers whose name or ID contains the text (not case sensitive).",
			"parameters": {
				"type": "object",
				"properties": {"search": {"type": "string", "description": "Part of the customer's name."}},
				"required": ["search"],
				"additionalProperties": False,
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "find_items",
			"description": "Find machines (items) whose code, name or description contains the text, best matches first, each with the principal(s) it can be quoted under and its list rate there.",
			"parameters": {
				"type": "object",
				"properties": {
					"search": {"type": "string", "description": "Part of the item code or name, e.g. VF-2SS."},
					"principal": {
						"type": "string",
						"description": "Principal code to search in; empty to search all principals.",
					},
				},
				"required": ["search", "principal"],
				"additionalProperties": False,
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "get_sub_items",
			"description": "List the sub-items (options) of the given machines, each with its price for that machine.",
			"parameters": {
				"type": "object",
				"properties": {
					"machine_item_codes": {"type": "array", "items": {"type": "string"}},
				},
				"required": ["machine_item_codes"],
				"additionalProperties": False,
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "ask_user",
			"description": "Ask the user one question when something is unclear; the choices are shown as buttons. Ends this run.",
			"parameters": {
				"type": "object",
				"properties": {
					"question": {"type": "string"},
					"choices": {"type": "array", "items": {"type": "string"}},
				},
				"required": ["question", "choices"],
				"additionalProperties": False,
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "create_quotation",
			"description": "Create and save the draft quotation. Returns its number, or the errors to correct.",
			"parameters": {
				"type": "object",
				"properties": {
					"customer": {"type": "string", "description": "Customer ID from find_customers."},
					"principal": {"type": "string", "description": "Principal code."},
					"machines": {
						"type": "array",
						"items": {
							"type": "object",
							"properties": {
								"item_code": {"type": "string"},
								"qty": {"type": "number"},
								"sub_items": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"item_code": {"type": "string"},
											"qty": {"type": "number"},
										},
										"required": ["item_code", "qty"],
										"additionalProperties": False,
									},
								},
							},
							"required": ["item_code", "qty", "sub_items"],
							"additionalProperties": False,
						},
					},
				},
				"required": ["customer", "principal", "machines"],
				"additionalProperties": False,
			},
		},
	},
]


@frappe.whitelist(methods=["POST"])
def draft_quotation(request: str):
	"""Run the agent on the typed request. Returns {"quotation": name or None, "message": text}.

	Only a user who may create Quotations can use this, because every call is paid for and it
	saves a quotation. The lookups and the saving use the user's own permissions.
	"""
	frappe.has_permission("Quotation", "create", throw=True)
	request = (request or "").strip()
	if not request:
		frappe.throw(_("Type what the quotation should contain."))
	if len(request) > 2000:
		frappe.throw(_("The request is too long; keep it to a few lines."))

	api_key = frappe.conf.get("openai_api_key")
	if not api_key:
		frappe.throw(
			_(
				"The OpenAI key is not set for this site. On the server run:"
				" bench --site {0} set-config openai_api_key (the key)"
			).format(frappe.local.site),
			title=_("OpenAI key missing"),
		)

	agent = QuotationAgent(api_key, request)
	message = agent.run()
	# 2026-10-21: "choices" are the buttons of the AI's question (ask_user); the dialog adds the
	# one clicked to the request as an "Answer:" line and sends it again.
	return {"quotation": agent.quotation, "message": message, "choices": agent.choices}


class QuotationAgent:
	"""One run of the model on one request. `quotation` holds the name of the saved quotation;
	`choices` the answers offered when the model asked a question instead (ask_user)."""

	def __init__(self, api_key, request):
		self.api_key = api_key
		self.request = request
		self.quotation = None
		self.question = None
		self.choices = []
		self.messages = [
			{"role": "system", "content": INSTRUCTIONS},
			{"role": "user", "content": f"Today is {nowdate()}.\n\n{request}"},
		]

	def run(self):
		started = time.monotonic()
		for _turn in range(MAX_TURNS):
			if time.monotonic() - started > RUN_DEADLINE:
				break
			reply = self.call_model()
			self.messages.append(reply)
			tool_calls = reply.get("tool_calls") or []
			if not tool_calls:
				return (reply.get("content") or "").strip() or self.fallback_message()
			for call in tool_calls:
				result = self.run_tool(call)
				self.messages.append(
					{
						"role": "tool",
						"tool_call_id": call["id"],
						"content": json.dumps(result, default=str),
					}
				)
			# The model asked the user (ask_user): the run ends here with its question.
			if self.question and not self.quotation:
				return self.question
		return self.fallback_message()

	def fallback_message(self):
		if self.quotation:
			return _("Quotation {0} was created as a draft.").format(self.quotation)
		return _("The AI could not finish the quotation. Add more detail to the request and try again.")

	def call_model(self):
		"""One Chat Completions call; returns the assistant message. API errors are shown to the
		user with OpenAI's own message (never the key)."""
		body = {
			"model": frappe.conf.get("openai_model") or DEFAULT_MODEL,
			"messages": self.messages,
			"tools": TOOLS,
		}
		effort = frappe.conf.get("openai_reasoning_effort", "low")
		if effort:
			body["reasoning_effort"] = effort
		try:
			response = requests.post(
				OPENAI_URL,
				headers={"Authorization": f"Bearer {self.api_key}"},
				json=body,
				timeout=REQUEST_TIMEOUT,
			)
		except requests.RequestException as e:
			frappe.throw(_("OpenAI could not be reached: {0}").format(e), title=_("AI request failed"))

		if response.status_code != 200:
			try:
				detail = response.json().get("error", {}).get("message")
			except ValueError:
				detail = None
			frappe.throw(
				_("OpenAI answered {0}: {1}").format(response.status_code, detail or response.reason),
				title=_("AI request failed"),
			)
		message = response.json()["choices"][0]["message"]
		# Only what the next call needs is sent back (the API rejects unknown keys such as
		# "refusal": None on some models, so the message is rebuilt).
		kept = {"role": "assistant", "content": message.get("content")}
		if message.get("tool_calls"):
			kept["tool_calls"] = message["tool_calls"]
		return kept

	def run_tool(self, call):
		"""Run one tool call of the model. A failure is returned to the model as an error, so it
		can correct itself; it does not stop the run."""
		name = call["function"]["name"]
		try:
			args = json.loads(call["function"].get("arguments") or "{}")
		except ValueError:
			return {"error": "The arguments were not valid JSON."}
		try:
			if name == "list_principals":
				return list_principals()
			if name == "find_customers":
				return find_customers(args.get("search"))
			if name == "find_items":
				return find_items(args.get("search"), args.get("principal"))
			if name == "get_sub_items":
				return get_sub_items(args.get("machine_item_codes"))
			if name == "ask_user":
				self.question = (args.get("question") or "").strip()
				# at most 10 buttons, each a short line
				self.choices = [str(c).strip()[:140] for c in args.get("choices") or [] if str(c).strip()][:10]
				return {"ok": True}
			if name == "create_quotation":
				if self.quotation:
					return {"error": f"Quotation {self.quotation} was already created."}
				result = create_quotation(
					args.get("customer"), args.get("principal"), args.get("machines"), self.request
				)
				self.quotation = result.get("quotation")
				return result
			return {"error": f"Unknown tool {name}."}
		except frappe.PermissionError:
			frappe.clear_last_message()
			return {"error": "The user has no permission for this."}
		except frappe.ValidationError as e:
			# Frappe's msgprint of the error would also pop up on the form; the model gets it instead.
			frappe.clear_last_message()
			return {"error": str(e) or e.__class__.__name__}


# Tools ------------------------------------------------------------------------------------------


def list_principals():
	return [
		{"code": row.name, "name": row.description, "currency": row.currency, "item_group": row.item_group}
		for row in frappe.get_list(
			"Quotation Type",
			fields=["name", "description", "currency", "item_group"],
			order_by="name asc",
		)
	]


def find_customers(search):
	search = (search or "").strip()
	if not search:
		return {"error": "Give part of the customer's name."}
	return frappe.get_list(
		"Customer",
		filters={"disabled": 0},
		or_filters={"name": ["like", f"%{search}%"], "customer_name": ["like", f"%{search}%"]},
		fields=["name", "customer_name", "territory"],
		limit_page_length=MAX_CUSTOMERS,
		order_by="customer_name asc",
	)


def find_items(search, principal=None):
	"""Machines of one principal (its Item Group), or of all principals, matching the text. The
	sub-items' own group (Options) is left out: sub-items come from get_sub_items."""
	search = (search or "").strip()
	if not search:
		return {"error": "Give part of the item code or name."}
	# Item Group -> its principals; one group can belong to several principals (Spares: SPARES IN
	# RUPEES and SPARES IN DOLLARS), so each item lists all of them.
	principals = {}
	for row in frappe.get_list(
		"Quotation Type",
		filters={"name": principal} if principal else {"item_group": ["is", "set"]},
		fields=["name", "description", "item_group", "price_list", "currency"],
		order_by="name asc",
	):
		if row.item_group:
			principals.setdefault(row.item_group, []).append(row)
	if not principals:
		return {"error": f"Principal {principal} not found or has no item group."}

	# More rows than are returned, so the best matches can be put first: e.g. "VF-2" also matches
	# dozens of spare parts "for VF-2SS", which come before the machine VF-2 in code order.
	items = frappe.get_list(
		"Item",
		filters={
			"item_group": ["in", list(principals)],
			"disabled": 0,
			"is_sales_item": 1,
			"has_variants": 0,
		},
		or_filters={
			"name": ["like", f"%{search}%"],
			"item_name": ["like", f"%{search}%"],
			"description": ["like", f"%{search}%"],
		},
		fields=["name", "item_name", "item_group"],
		limit_page_length=200,
		order_by="name asc",
	)
	text = search.lower()

	def rank(item):
		code = item.name.lower()
		if code == text:
			return 0
		if code.startswith(text):
			return 1
		if text in code:
			return 2
		if text in (item.item_name or "").lower():
			return 3
		return 4

	items = sorted(items, key=lambda item: (rank(item), len(item.name), item.name))[:MAX_ITEMS]

	# each item's rate in its principals' price lists (a price for no particular customer)
	price_lists = [p.price_list for group in principals.values() for p in group if p.price_list]
	rates = {}
	for row in frappe.get_all(
		"Item Price",
		filters={
			"item_code": ["in", [item.name for item in items] or [""]],
			"price_list": ["in", price_lists or [""]],
		},
		fields=["item_code", "price_list", "price_list_rate", "customer"],
	):
		if (row.item_code, row.price_list) not in rates or not row.customer:
			rates[(row.item_code, row.price_list)] = row.price_list_rate

	return [
		{
			"item_code": item.name,
			"item_name": item.item_name,
			"principals": [
				{
					"principal": p.name,
					"principal_name": p.description,
					"rate": rates.get((item.name, p.price_list)),
					"currency": p.currency,
				}
				for p in principals[item.item_group]
			],
		}
		for item in items
	]


def get_sub_items(machine_item_codes):
	if isinstance(machine_item_codes, str):
		machine_item_codes = [machine_item_codes]
	if not machine_item_codes:
		return {"error": "Give the machine item codes."}
	result = {}
	for option in get_options(machine_item_codes):
		rows = result.setdefault(option["main_item_code"], [])
		if len(rows) < MAX_SUB_ITEMS_PER_MACHINE:
			rows.append(
				{
					"item_code": option["item_code"],
					# descriptions can be long; the start is enough to recognise the sub-item
					"description": (option["description"] or "")[:150],
					"type": option["sub_item_type"],
					"rate": option["rate"],
				}
			)
	return result or {"error": "These machines have no sub-items."}


def create_quotation(customer, principal, machines, request):
	"""Check the model's choices and save the draft quotation. Returns {"quotation": name} or
	{"errors": [...]} for the model to correct (nothing is saved then)."""
	errors = []
	if not customer or not frappe.db.exists("Customer", customer):
		errors.append(f"Customer {customer!r} does not exist; use an ID from find_customers.")
	if not principal or not frappe.db.exists("Quotation Type", principal):
		errors.append(f"Principal {principal!r} does not exist; use a code from list_principals.")
	if not machines:
		errors.append("Add at least one machine.")
	if errors:
		return {"errors": errors}

	defaults = get_type_defaults(principal)
	item_group = defaults.get("item_group")

	# The machines, checked against the principal's item group (codes compared without case, as
	# the database does).
	codes = [m.get("item_code") or "" for m in machines]
	found = {
		row.name.lower(): row
		for row in frappe.get_all(
			"Item", filters={"name": ["in", codes], "disabled": 0}, fields=["name", "item_group"]
		)
	}
	for code in codes:
		item = found.get(code.lower())
		if not item:
			errors.append(f"Machine {code!r} does not exist.")
		elif item_group and item.item_group != item_group:
			errors.append(f"Machine {code} is not an item of principal {principal} (item group {item_group}).")

	# The sub-items, each checked against its own machine's sub-items.
	options = {}
	for option in get_options([item.name for item in found.values()]):
		key = f"{option['main_item_code']}::{option['item_code']}".lower()
		options.setdefault(key, option)
	for machine in machines:
		for sub in machine.get("sub_items") or []:
			key = f"{machine.get('item_code')}::{sub.get('item_code')}".lower()
			if key not in options:
				errors.append(
					f"{sub.get('item_code')!r} is not a sub-item of {machine.get('item_code')}; use get_sub_items."
				)
	if errors:
		return {"errors": errors}

	doc = frappe.new_doc("Quotation")
	doc.quotation_to = "Customer"
	doc.party_name = customer
	doc.transaction_date = nowdate()
	doc.custom_quotation_type = principal
	# What the form takes from the principal (custom_quotation_type in quotation.js). ERPNext only
	# fills the customer's currency and price list when these are empty, so the principal's stay.
	for field in ("currency", "selling_price_list", "letter_head", "tc_name", "custom_signed_by"):
		if defaults.get(field):
			doc.set(field, defaults[field])
	# The form copies the Haas Cust ID when the customer is chosen (party_name in quotation.js).
	if doc.meta.has_field("custom_haas_customer_id"):
		doc.custom_haas_customer_id = frappe.db.get_value("Customer", customer, "custom_haas_customer_id")
	# The terms text of the template, which the form fetches when tc_name is set.
	if doc.tc_name:
		from erpnext.setup.doctype.terms_and_conditions.terms_and_conditions import get_terms_and_conditions

		doc.terms = get_terms_and_conditions(doc.tc_name, doc.as_dict())

	for machine in machines:
		code = found[machine["item_code"].lower()].name
		# ERPNext fills description, unit and the price list rate on saving; the Specifications
		# are copied by their fetch_from.
		doc.append("items", {"item_code": code, "qty": flt(machine.get("qty")) or 1})
		for sub in machine.get("sub_items") or []:
			option = options[f"{code}::{sub['item_code']}".lower()]
			# As add_option_line in quotation.js: the price is the machine's price for it.
			doc.append(
				"items",
				{
					"item_code": option["item_code"],
					"item_name": option["item_name"],
					"description": option["description"],
					"custom_main_item_code": code,
					"stock_uom": option["stock_uom"],
					"uom": option["stock_uom"],
					"conversion_factor": 1,
					"qty": flt(sub.get("qty")) or 1,
					"price_list_rate": flt(option["rate"]),
					"rate": flt(option["rate"]),
				},
			)

	doc.insert()
	# Who asked for what, kept on the quotation for checking later.
	# (the typed text is escaped: a comment is shown as HTML)
	doc.add_comment(
		"Comment",
		_("Drafted by AI from the request: {0}").format(frappe.bold(frappe.utils.escape_html(request))),
	)

	if defaults.get("currency") and doc.currency != defaults["currency"]:
		# Saved, but the model is told, so it can mention it to the user.
		return {
			"quotation": doc.name,
			"warning": f"Saved in {doc.currency}, not in the principal's {defaults['currency']}.",
		}
	return {
		"quotation": doc.name,
		"currency": doc.currency,
		"grand_total": doc.grand_total,
		"lines": len(doc.items),
	}
