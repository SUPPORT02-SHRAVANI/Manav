# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Manav's additions to ERPNext's Quotation: the principal's defaults, the options of a machine, and
the quotation number.

Working: quotations are made in ERPNext's own Quotation form. That form and its controller belong to
ERPNext, so the Manav behaviour is attached from outside:
- the fields are custom fields (erpnext_fields.py);
- the screen logic is manav/public/js/quotation.js, loaded through `doctype_js` in hooks.py; it calls
  get_type_defaults and get_options below;
- the number is given by autoname() below, attached through `doc_events` in hooks.py.

The principal is a Quotation Type record. It holds what a quotation takes from its principal:
currency, price list, letter head, terms template, the item group whose items may be chosen, the
signing sales person and the two letters of the quotation number.

Options: an option (sub item) has a different price for each machine, which ERPNext's Item Price
cannot hold. The per-machine prices therefore stay in Quotation Sub Item Master, and get_options
returns them for the machines on the quotation.

Created: 2026-10-12, when the quotation process was moved from Quotation Head to ERPNext's Quotation.

CHANGE NOTE
Date: 2026-10-15
Change: Added number_sub_items (Sub-Item Sr.No of each sub-item line, on validate).
Reason: The user asked for the sub-items to be numbered under their machine in the Items table.

CHANGE NOTE
Date: 2026-10-15
Change: last_number reads the highest number with Frappe's query builder instead of SQL text.
Reason: Upgrade-safe rule: no raw SQL on ERPNext's own tables (here tabQuotation).

CHANGE NOTE
Date: 2026-10-19
Change: number_sub_items numbers the sub-items 1.1, 1.2 ... under machine 1 (machine's No. + n).
Reason: The user asked for the sub-item numbers to carry their machine's number.

CHANGE NOTE
Date: 2026-10-19
Change: Added fill_account_manager (Account Manager of the Customer onto the quotation, on validate).
Reason: The user asked for the Account Manager set on the Customer to be filled in on the quotation.

CHANGE NOTE
Date: 2026-10-19
Change: fill_account_manager also fills an empty Signed By with the Account Manager's Sales
Person (sales_person_for_user); get_signed_by gives the same to the form.
Reason: The user asked for the same person in Signed By as in Account Manager.

CHANGE NOTE
Date: 2026-10-19
Change: Added warn_principal_currency (validate): a warning when a draft is in another currency
than its principal's.
Reason: A MACHINES quotation (26QX000082) was saved in INR; ERPNext had replaced the principal's
USD when the customer was chosen.

CHANGE NOTE
Date: 2026-10-19
Change: Added item_query_with_rate: ERPNext's item search with the rate of each item in front
of its description (sub-item price for a machine on the quotation, else the price list rate).
Reason: The user asked to see the rate in the Item Code drop-down of the Items table.

CHANGE NOTE
Date: 2026-10-19
Change: Added keep_sub_item_rates (validate): sub-item lines get their machine's price back.
item_query_with_rate puts the rate on a line of its own, so the form can print it bold.
Reason: On a MACHINES quotation the sub-items showed converted INR prices in USD after ERPNext
re-priced the lines from the USD price list; the user also asked for the rate in bold.

CHANGE NOTE
Date: 2026-10-28
Change: Added get_machine_spares (the model of a customer's machine, an ERPNext Serial No, and its
linked spare parts).
Reason: The user asked for spare parts quotations for the machine the customer bought; the
customer's machines are kept as ERPNext Serial Nos (chosen by the user).

CHANGE NOTE
Date: 2026-11-03
Change: fill_cif_defaults writes DEFAULT_CIF_CHARGES (1500) in an empty CIF Charges when the
principal has no default charges (also without a principal).
Reason: The user asked for 1500 to be written when CIF is selected, with the option to change it.

CHANGE NOTE
Date: 2026-11-03
Change: fill_account_manager also puts the Customer's old-system code (custom_customer_code) in
Magic Cust Code (custom_magic_cust_code); added get_quotation_dashboard (Connections: Draft PI and
Final PI).
Reason: The user asked for the customer's Magic code on the quotation, and the Draft PI and Final
PI in the quotation's connections.
get_options leaves out sub-items switched off (Quotation Sub Item Master.active), as the user asked
to activate / deactivate sub-items on the Item. CIF: the principal's "Default Ex-Works From"
(get_type_defaults, fill_cif_defaults) and CIF Port FTWZ Chennai when the principal has none
(DEFAULT_CIF_PORT), for the old print's CIF lines.

CHANGE NOTE
Date: 2026-11-04
Change: fill_cif_defaults sets the (now hidden) CIF tick from CIF Charges: an amount means CIF.
It no longer writes 1500 itself, and it also runs for the Final PI (Sales Order).
Reason: The user asked to remove the CIF tick and to show the CIF fields directly.

CHANGE NOTE
Date: 2026-11-04
Change: get_type_defaults also returns the principal's Price Basis (price_basis); the form puts the
principal's Ex-Works From, else that Price Basis, in an empty Ex-Works From, which now starts the
price line of every quotation ("Price <Ex-Works From> <Port> (1 NOS)").
Reason: The quotation's price line is typed on the quotation instead of a fixed text.
"""

import json

import frappe
from frappe import _
from frappe.query_builder.functions import Length, Max
from frappe.utils import cint, flt, getdate, nowdate, strip_html_tags


@frappe.whitelist()
def get_type_defaults(quotation_type):
	"""Return what a quotation takes from its principal (Quotation Type)."""
	doc = frappe.get_doc("Quotation Type", quotation_type)
	doc.check_permission("read")

	signed_by = None
	if doc.signed_by_code:
		signed_by = frappe.db.get_value("Sales Person", {"custom_employee_code": doc.signed_by_code})

	return {
		"currency": doc.currency,
		"selling_price_list": doc.price_list,
		"letter_head": doc.letter_head,
		"tc_name": doc.terms_template,
		"item_group": doc.item_group,
		"custom_signed_by": signed_by,
		# 2026-10-29: the principal's CIF defaults (fill_cif_defaults; quotation.js)
		"custom_is_cif": doc.get("cif_default"),
		"custom_cif_port": doc.get("cif_port"),
		"custom_cif_charges": doc.get("cif_charges"),
		# 2026-11-03: printed as "Prices : Ex-Works, <this>." on CIF prints
		"custom_ex_works_from": doc.get("ex_works_from"),
		# 2026-11-04: an empty Ex-Works From (the start of the price line) gets the principal's
		# Ex-Works From, else its Price Basis (quotation.js)
		"price_basis": doc.get("price_basis"),
	}


# CIF Charges when CIF is ticked and the principal (Quotation Type) has no default (2026-11-03);
# the same number is in quotation.js and draft_pi.js.
DEFAULT_CIF_CHARGES = 1500
# CIF Port (where the CIF charges run to) when the principal has none (2026-11-03, the old print's
# "CIF Charges upto FTWZ Chennai"); the same text is in quotation.js and draft_pi.js.
DEFAULT_CIF_PORT = "FTWZ Chennai"


def fill_cif_defaults(doc, method=None):
	"""Quotation, Draft PI and Final PI (Sales Order) validate: a CIF document whose CIF Port or
	Ex-Works From is empty gets its principal's defaults (Quotation Type). Values typed on the
	document are kept. Added 2026-10-29: the user asked for the port and charges to be filled by
	default. (The Draft PI's fields have no prefix, the ERPNext doctypes' are custom_*.)

	2026-11-04: the CIF tick is hidden (the user's request); a document is CIF when CIF Charges has
	an amount, and the hidden tick is set from that here, so the prints, which read the tick, stay
	as they are. Charges are no longer filled with 1500 here (that would make every document CIF);
	the form fills them when the principal is CIF by default (quotation.js, draft_pi.js)."""
	prefix = "" if doc.doctype == "Draft PI" else "custom_"
	if not doc.meta.has_field(prefix + "is_cif"):
		return
	is_cif = 1 if flt(doc.get(prefix + "cif_charges")) else 0
	doc.set(prefix + "is_cif", is_cif)
	if not is_cif:
		return
	port, charges, ex_works = (
		frappe.db.get_value("Quotation Type", doc.custom_quotation_type, ["cif_port", "cif_charges", "ex_works_from"])
		if doc.get("custom_quotation_type")
		else None
	) or (None, None, None)
	# 2026-11-03: FTWZ Chennai when the principal has no port
	if not doc.get(prefix + "cif_port"):
		doc.set(prefix + "cif_port", port or DEFAULT_CIF_PORT)
	# 2026-11-03: Ex-Works From (Quotation custom_ex_works_from, Draft PI ex_works_from) from the principal
	if ex_works and doc.meta.has_field(prefix + "ex_works_from") and not doc.get(prefix + "ex_works_from"):
		doc.set(prefix + "ex_works_from", ex_works)


@frappe.whitelist()
def get_options(main_item_codes):
	"""Return the options of the given machines, each with its price for that machine.

	Every option is also an Item (import_items makes one for each sub item code), so it can be put
	on the quotation as an ordinary line. The Item is matched without regard to case, because the
	database treats codes that differ only in case as the same.
	"""
	frappe.has_permission("Quotation Sub Item Master", "read", throw=True)
	if isinstance(main_item_codes, str):
		main_item_codes = json.loads(main_item_codes)
	if not main_item_codes:
		return []

	options = frappe.get_all(
		"Quotation Sub Item Master",
		# 2026-11-03: switched-off sub-items (Active unticked on the Item's Sub-Items table) are not offered
		filters={"main_item_code": ["in", main_item_codes], "active": 1},
		fields=["main_item_code", "sub_item_code", "item_description", "sub_item_type", "rate", "sr_no"],
		order_by="main_item_code asc, sr_no asc",
	)
	items = frappe.get_all(
		"Item",
		filters={"name": ["in", list({o.sub_item_code for o in options})]},
		fields=["name", "item_name", "stock_uom"],
	)
	item_by_code = {item.name.lower(): item for item in items}

	result = []
	for option in options:
		item = item_by_code.get((option.sub_item_code or "").lower())
		# An option whose Item is missing cannot be a quotation line; it is left out.
		if not item:
			continue
		result.append(
			{
				"key": f"{option.main_item_code}::{option.sub_item_code}::{option.sr_no}",
				"main_item_code": option.main_item_code,
				"item_code": item.name,
				"item_name": item.item_name,
				"stock_uom": item.stock_uom,
				"description": option.item_description or item.item_name,
				"sub_item_type": option.sub_item_type,
				"rate": option.rate,
			}
		)
	return result


@frappe.whitelist()
def get_machine_spares(serial_no):
	"""The machine model of a customer's machine (its ERPNext Serial No) and the spare parts linked
	to that model in Quotation Sub Item Master (the sub-items whose Item is in the group Spares).
	Used by the "Spares for Machine" button of a spares quotation (public/js/quotation.js). Added
	2026-10-28: the user asked for spare parts quotations for the machine the customer bought."""
	frappe.has_permission("Serial No", "read", serial_no, throw=True)
	model = frappe.db.get_value("Serial No", serial_no, "item_code")
	if not model:
		return {"model": None, "spares": []}
	options = get_options([model])
	spare_codes = set(
		frappe.get_all(
			"Item",
			filters={"name": ["in", [o["item_code"] for o in options]], "item_group": "Spares"},
			pluck="name",
		)
	)
	return {"model": model, "spares": [o for o in options if o["item_code"] in spare_codes]}


def number_sub_items(doc, method=None):
	"""Number the sub-items in Sub-Item Sr.No as <machine's No.>.<n> (hooked to Quotation's
	validate in hooks.py): under machine 1 they are 1.1, 1.2 ..., under machine 2 they are 2.1 ...

	A machine's No. is its place among the lines that are not sub-items (the No. column of the
	form). A sub-item belongs to the nearest line of its machine above it, else to the first line of
	its machine; when its machine is not on the quotation it is numbered 1, 2, 3 without a machine
	number. A machine's line has no number. The form numbers them the same way while the user works
	(number_sub_items in public/js/quotation.js); this keeps the saved numbers right also after
	lines were moved or deleted.

	CHANGE NOTE
	Date: 2026-10-19
	Change: The number is "<machine No.>.<n>" (was n per machine code).
	Reason: The user asked for the sub-items of machine 1 to be numbered 1.1, 1.2 and so on.
	"""
	rows = doc.get("items") or []
	# First pass: the No. of the first line of each machine (for a sub-item placed above it).
	first_no = {}
	machine_no = 0
	for row in rows:
		if row.get("custom_main_item_code"):
			continue
		machine_no += 1
		if row.item_code:
			first_no.setdefault(row.item_code, machine_no)

	last_no = {}
	counts = {}
	machine_no = 0
	for row in rows:
		main_item_code = row.get("custom_main_item_code")
		if not main_item_code:
			machine_no += 1
			if row.item_code:
				last_no[row.item_code] = machine_no
			row.custom_sub_item_sr_no = None
			continue
		parent_no = last_no.get(main_item_code) or first_no.get(main_item_code) or 0
		key = parent_no or f"?{main_item_code}"
		counts[key] = counts.get(key, 0) + 1
		row.custom_sub_item_sr_no = f"{parent_no}.{counts[key]}" if parent_no else str(counts[key])


def fill_terms(doc, method=None):
	"""Quotation / Sales Order validate (hooks.py), and lead_board.make_quotation: a chosen Terms
	template (tc_name) with empty Terms gets the template's text, as the form does on choosing the
	template. Empty means no text left once the HTML is stripped (the editor saves "<p><br></p>").
	Terms typed or edited by hand are kept.
	2026-11-13: quotations made from a lead had the principal's template but no terms (make_quotation
	set only tc_name), and a quotation saved before the template's text arrived kept empty terms."""
	if not doc.get("tc_name") or not doc.meta.has_field("terms"):
		return
	if strip_html_tags(doc.get("terms") or "").replace("&nbsp;", " ").strip():
		return
	template = frappe.db.get_value("Terms and Conditions", doc.tc_name, "terms")
	if template:
		# the same rendering as ERPNext's get_terms_and_conditions, without its read-permission check
		# (the user chose the template, or the principal did)
		doc.terms = frappe.render_template(template, doc.as_dict(), restrict_globals=1)


def fill_account_manager(doc, method=None):
	"""Put the Customer's Account Manager on the quotation, when the quotation has none (hooked to
	Quotation's validate in hooks.py). The form does the same as soon as the customer is chosen
	(party_name in public/js/quotation.js); this also covers quotations made without the form
	(imports, API, copies). A manager typed on the quotation by hand is kept. A quotation to a
	Lead or Prospect has no Customer and is left alone."""
	if not doc.get("custom_account_manager") and doc.get("quotation_to") == "Customer" and doc.get("party_name"):
		doc.custom_account_manager = frappe.db.get_value("Customer", doc.party_name, "account_manager")

	# 2026-10-19: the Account Manager's own sales person signs, when Signed By is still empty
	# (the form already does this when the manager is set; one chosen by hand is kept).
	if doc.get("custom_account_manager") and not doc.get("custom_signed_by"):
		doc.custom_signed_by = sales_person_for_user(doc.custom_account_manager)

	# 2026-11-03: the customer's code in the old (Magic) system, shown on the quotation
	if doc.meta.has_field("custom_magic_cust_code"):
		code = None
		if doc.get("quotation_to") == "Customer" and doc.get("party_name") and frappe.get_meta("Customer").has_field("custom_customer_code"):
			code = frappe.db.get_value("Customer", doc.party_name, "custom_customer_code")
		doc.custom_magic_cust_code = code


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def item_query_with_rate(doctype, txt, searchfield, start, page_len, filters):
	"""Item Code search of the quotation's Items table, with the rate in front of each result's
	description (the line under the code in the drop-down). Added 2026-10-19 at the user's request.

	The search itself is ERPNext's item_query, unchanged. The form adds three keys to the filters,
	which are taken out before ERPNext sees them: manav_price_list (the quotation's price list),
	manav_machines (the machines on the quotation) and manav_currency. The rate shown is:
	- for a sub-item of a machine on the quotation, its price for that machine (Quotation Sub
	  Item Master; the first machine in the order of the quotation), "Rate for VF-2: US$ 3,000.00";
	- otherwise the item's rate in the price list, "Rate: US$ 49,000.00";
	- nothing when neither has one.
	"""
	from erpnext.controllers.queries import item_query

	if isinstance(filters, str):
		filters = json.loads(filters)
	filters = dict(filters or {})
	price_list = filters.pop("manav_price_list", None)
	machines = filters.pop("manav_machines", None) or []
	currency = filters.pop("manav_currency", None)

	rows = item_query(doctype, txt, searchfield, start, page_len, filters)
	codes = [row[0] for row in rows]
	if not codes:
		return rows

	# a sub-item's price for the first machine on the quotation that has it (codes without case)
	sub_rates = {}
	if machines:
		order = {code.lower(): i for i, code in enumerate(machines)}
		for row in sorted(
			frappe.get_all(
				"Quotation Sub Item Master",
				filters={"main_item_code": ["in", machines], "sub_item_code": ["in", codes]},
				fields=["main_item_code", "sub_item_code", "rate"],
			),
			key=lambda r: order.get((r.main_item_code or "").lower(), 99999),
		):
			sub_rates.setdefault((row.sub_item_code or "").lower(), (row.main_item_code, row.rate))

	list_rates = {}
	if price_list:
		for row in frappe.get_all(
			"Item Price",
			filters={"price_list": price_list, "item_code": ["in", codes]},
			fields=["item_code", "price_list_rate", "customer", "uom"],
		):
			# a price for no particular customer is preferred
			if row.item_code not in list_rates or not row.customer:
				list_rates[row.item_code] = row.price_list_rate

	def rate_text(code):
		sub = sub_rates.get(code.lower())
		if sub:
			return _("Rate for {0}: {1}").format(sub[0], frappe.utils.fmt_money(sub[1], currency=currency))
		if code in list_rates:
			return _("Rate: {0}").format(frappe.utils.fmt_money(list_rates[code], currency=currency))
		return None

	# The rate is the first line of the description, with the item's first detail on the next
	# line: the description is plain text, so the form's style (add_rate_style in
	# public/js/quotation.js) makes that first line bold. (Bold rate: 2026-10-19, user's request.)
	result = []
	for row in rows:
		rate = rate_text(row[0])
		if not rate:
			result.append(row)
			continue
		first = row[1] if len(row) > 1 and row[1] else ""
		result.append((row[0], rate + ("\n" + str(first) if first else ""), *row[2:]))
	return result


def keep_sub_item_rates(doc, method=None):
	"""Give every sub-item line of a draft its price for its machine (hooked to Quotation's
	validate). Added 2026-10-19.

	A sub-item's price depends on the machine, so it is kept in Quotation Sub Item Master, not in
	a price list. When the currency or price list of a quotation changes, ERPNext prices every line
	again from the price list; for a sub-item it then converted the old INR price (26QX000082:
	10K-40T-GBX 146.47 USD instead of 10,000). Here the line's price list rate and rate are set
	back to the machine's price (no discount or margin), and the totals are worked out again.
	A line whose price list rate already is the machine's price is left alone, so a rate the user
	lowered by hand stays. Codes are compared without case. The form does the same while the user
	works (restore_sub_item_rates in public/js/quotation.js)."""
	if doc.docstatus != 0:
		return
	subs = [row for row in doc.get("items") or [] if row.get("custom_main_item_code") and row.item_code]
	if not subs:
		return
	rate_of = {}
	for option in frappe.get_all(
		"Quotation Sub Item Master",
		filters={"main_item_code": ["in", list({row.custom_main_item_code for row in subs})]},
		fields=["main_item_code", "sub_item_code", "rate"],
		order_by="sr_no asc",
	):
		rate_of.setdefault(f"{option.main_item_code}::{option.sub_item_code}".lower(), flt(option.rate))

	changed = False
	for row in subs:
		rate = rate_of.get(f"{row.custom_main_item_code}::{row.item_code}".lower())
		# no price in the master (0, e.g. a sub-item included as standard): the line is left as
		# it is, so a price typed by hand is not wiped out
		if not rate or flt(row.price_list_rate) == rate:
			continue
		row.price_list_rate = rate
		row.discount_percentage = 0
		row.discount_amount = 0
		row.margin_rate_or_amount = 0
		row.rate = rate
		changed = True
	if changed:
		doc.calculate_taxes_and_totals()


def warn_principal_currency(doc, method=None):
	"""Warn (not stop) when a draft quotation is saved in another currency than its principal's,
	e.g. a MACHINES quotation in INR (hooked to Quotation's validate). The form keeps the
	principal's currency (keep_type_values in public/js/quotation.js); this catches quotations
	where that did not happen, such as one saved before the fix or changed by other means.
	Added 2026-10-19 after 26QX000082 (MACHINES) was saved in INR without anyone noticing."""
	if doc.docstatus != 0 or not doc.get("custom_quotation_type"):
		return
	currency = frappe.db.get_value("Quotation Type", doc.custom_quotation_type, "currency")
	if currency and doc.currency and doc.currency != currency:
		principal = frappe.db.get_value("Quotation Type", doc.custom_quotation_type, "description")
		frappe.msgprint(
			_("This quotation is in {0}, but the principal {1} quotes in {2}. Choose the principal again to set {2}.").format(
				doc.currency, principal or doc.custom_quotation_type, currency
			),
			title=_("Currency differs from the principal"),
			indicator="orange",
		)


def sales_person_for_user(user):
	"""The enabled Sales Person of a login user, or None. Looked up by the Sales Person's Login
	User (custom_user, a Manav field); else by ERPNext's own link, Sales Person -> Employee whose
	User ID is the user (HRMS's Employee; left out when it is not installed)."""
	if not user:
		return None
	if frappe.get_meta("Sales Person").has_field("custom_user"):
		name = frappe.db.get_value("Sales Person", {"custom_user": user, "enabled": 1})
		if name:
			return name
	if frappe.db.exists("DocType", "Employee"):
		employee = frappe.db.get_value("Employee", {"user_id": user})
		if employee:
			return frappe.db.get_value("Sales Person", {"employee": employee, "enabled": 1})
	return None


@frappe.whitelist()
def get_signed_by(user):
	"""For the form: the Sales Person to put in Signed By for this Account Manager (None if no
	Sales Person is linked to the user)."""
	frappe.has_permission("Quotation", "read", throw=True)
	return sales_person_for_user(user)


def autoname(doc, method=None):
	"""Give a Quotation its Manav number, e.g. 26QP000639 (hooked to Quotation in hooks.py).

	The number is: the two digits of the financial year (April to March) of the quotation date, the
	two letters of the principal's Quotation No Series, and a six digit running number that starts
	again for every year and series. The running number continues after the highest number already
	used in ERPNext's Quotation and in Quotation Head (the old quotations), so a new quotation never
	repeats an old number.

	A quotation without a principal, or whose principal has no series, is not named here; ERPNext
	then names it by its own naming series (SAL-QTN-...). An amended quotation is named by Frappe
	(old number-1) before this is called.
	"""
	if not doc.get("custom_quotation_type"):
		return
	series = frappe.db.get_value("Quotation Type", doc.custom_quotation_type, "number_series")
	if not series:
		return

	date = getdate(doc.transaction_date or nowdate())
	financial_year = date.year if date.month >= 4 else date.year - 1
	prefix = f"{financial_year % 100:02d}{series.strip().upper()}"
	doc.name = f"{prefix}{last_number(prefix) + 1:06d}"


def last_number(prefix):
	"""Return the highest running number used with this year + series prefix, 0 when there is none."""
	highest = 0
	# All numbers of one prefix have the same length, so the highest name is the highest number.
	# Frappe's query builder, not SQL text naming ERPNext's table (upgrade-safe; names are ASCII,
	# so Length counts characters).
	for doctype in ("Quotation", "Quotation Head"):
		table = frappe.qb.DocType(doctype)
		last = (
			frappe.qb.from_(table)
			.select(Max(table.name))
			.where(table.name.like(prefix + "%"))
			.where(Length(table.name) == len(prefix) + 6)
		).run()[0][0]
		if last:
			highest = max(highest, cint(last[len(prefix) :]))
	return highest


def get_quotation_dashboard(data):
	"""override_doctype_dashboards (hooks.py), added 2026-11-03: the Quotation's Connections also
	list its Draft PIs (Draft PI.quotation) and Final PIs (Sales Order.custom_quotation, set by
	pi.make_final_pi). ERPNext's own Sales Order link (prevdoc_docname of the lines) is replaced by
	custom_quotation, as Manav's Final PIs are made from the Draft PI."""
	data = data or {}
	data.setdefault("non_standard_fieldnames", {})
	data["non_standard_fieldnames"]["Draft PI"] = "quotation"
	data["non_standard_fieldnames"]["Sales Order"] = "custom_quotation"
	transactions = [t for t in data.get("transactions", []) if "Sales Order" not in t.get("items", [])]
	transactions.insert(0, {"label": _("PI"), "items": ["Draft PI", "Sales Order"]})
	data["transactions"] = transactions
	return data
