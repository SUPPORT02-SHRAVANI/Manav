# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Quotation -> Draft PI -> Final PI: making each from the one before, their numbers and their
references to each other.

Working:
- Draft PI (Manav doctype "Draft PI", e.g. 26DPI00001): made from a submitted quotation by
  make_draft_pi (the quotation's "Make Draft PI" button). Its lines can be changed; see
  doctype/draft_pi/draft_pi.py.
- Final PI (ERPNext's Sales Order, e.g. 26FPI00001): made from the Draft PI by make_final_pi
  ("Make Final PI"). Submitting it confirms the order (the quotation becomes "Ordered").
The references, all read only:
- the quotation: Draft PI No. (custom_draft_pi_no, written by the Draft PI) and Final PI No.
  (custom_pi_no);
- the Draft PI: Quotation No. (quotation) and Final PI No. (final_pi);
- the Final PI: Quotation No. (custom_quotation), from ERPNext's own line link (Sales Order
  Item.prevdoc_docname), and Draft PI No. (custom_draft_pi).
A document refers to the one saved last when there are several (all are under the quotation's
Connections tab). A reference is taken off when its document is deleted (on_trash runs before
Frappe checks links, so the PI can still be deleted) or, for the Final PI, cancelled.
The fields are in erpnext_fields.py; the hooks in hooks.py (doc_events of Sales Order).

Created: 2026-10-28, when the user asked for the quotation number on the PI and the other way round.

CHANGE NOTE
Date: 2026-10-28
Change: Added fill_delivery_date (before_validate): the hidden Delivery Date is set to the PI's date.
Reason: The user asked to remove Delivery Date from the PI; ERPNext still requires one.

CHANGE NOTE
Date: 2026-10-29
Change: The Draft PI is a Manav doctype of its own (make_draft_pi, make_final_pi,
get_draft_pi_item_rate); the Sales Order is only the Final PI, numbered 26FPI00001 (autoname,
next_number); link_pi_documents / unlink_pi_documents keep quotation, Draft PI and Final PI
referring to each other (they replace link_quotation / unlink_quotation).
Reason: The user asked for a Draft PI step before the Final PI (the Sales Order), as a separate
document (not a Sales Order), with a different number for each of Quotation, Draft PI and Final PI,
each referring to the others. Until then the Draft PI was the Sales Order before its submission.

CHANGE NOTE
Date: 2026-10-31
Change: Added allow_draft_pi_quantities (Sales Order before_submit): a Final PI made from a Draft PI
may order more than the quotation's quantity.
Reason: A test run found that a quantity raised on the Draft PI stopped its Final PI from being
submitted (ERPNext's OverAllowanceError, Stock Settings over-delivery allowance 0%); the Draft PI
is where quantities are agreed, so its Final PI is not held to the quotation's.

CHANGE NOTE
Date: 2026-10-31
Change: Price Basis (custom_price_basis) on the Draft PI and the Final PI: filled by
fill_price_basis, copied to the Final PI (FINAL_PI_HEADER_FIELDS), printed under each machine.
Reason: The user asked for the old print's line "Price EX-WORKS FTWZ WAREHOUSE CHENNAI (1 NOS)
...... US$ 105100.00" on both PIs.

CHANGE NOTE
Date: 2026-11-02
Change: The price basis is two fields, as on the old program's "Final price with": Price Type
(custom_price_type, default EX-WORKS FTWZ) and Port (custom_price_port, default WAREHOUSE CHENNAI);
the print joins them. fill_price_basis fills them (also on a new Draft PI from make_draft_pi, so
the user sees and can change them before saving); the single Price Basis of 2026-10-31 is hidden
and moved into Price Type when an older PI is saved again.
Reason: The user asked for EX-WORKS FTWZ WAREHOUSE CHENNAI as the default with an option for the
user to set it, and showed the old program, where it is filled in as Price Type and Port.

CHANGE NOTE
Date: 2026-11-04
Change: make_draft_pi puts the quotation's Ex-Works From in the Draft PI's empty Price Type; the
quotation's Port is copied by its fieldname.
Reason: The quotation's price line is now typed as Ex-Works From and Port.
"""

import frappe
from frappe import _
from frappe.model.mapper import get_mapped_doc
from frappe.query_builder.functions import Length, Max
from frappe.utils import cint, flt, getdate, nowdate

NUMBER_DIGITS = 5

# 2026-10-31: the price basis printed under each machine when the principal (Quotation Type) has
# no Price Basis of its own; the wording of the user's old PI print.
# 2026-11-02: in two parts, Price Type and Port, as the old program's "Final price with" fields.
DEFAULT_PRICE_TYPE = "EX-WORKS FTWZ"
DEFAULT_PRICE_PORT = "WAREHOUSE CHENNAI"

# Header fields the Final PI takes from the Draft PI (changed there), over what ERPNext's own
# Quotation -> Sales Order brings from the quotation. Currency and price list are left to the
# quotation, as the Draft PI keeps the quotation's.
FINAL_PI_HEADER_FIELDS = (
	"custom_quotation_type",
	"custom_branch",
	"custom_your_reference",
	"custom_your_reference_date",
	"custom_machine_serial_no",
	"custom_sales_engineer",
	"custom_signed_by",
	"custom_account_manager",
	"custom_haas_customer_id",
	"customer_address",
	"address_display",
	"contact_person",
	"contact_display",
	"contact_mobile",
	"company_address",
	"company_address_display",
	"tc_name",
	"terms",
	"custom_price_basis",  # 2026-10-31 (hidden since 2026-11-02, kept for older PIs)
	"custom_price_type",  # 2026-11-02
	"custom_price_port",  # 2026-11-02
	"custom_print_signature",  # 2026-11-03
)

# Line fields the Final PI takes from the Draft PI (same names on both).
FINAL_PI_ITEM_FIELDS = (
	"item_code",
	"item_name",
	"description",
	"custom_main_item_code",
	"custom_specifications",
	"image",
	"qty",
	"uom",
	"rate",
	"prevdoc_docname",
	"quotation_item",
)


def next_number(doctype, letters, date=None):
	"""The next PI number, e.g. 26DPI00001 (Draft PI) or 26FPI00001 (Final PI).

	The two digits of the financial year (April to March) of the date, the letters, and a five digit
	running number that starts again for every year (as the quotation numbers, quotation.autoname).
	"""
	date = getdate(date or nowdate())
	financial_year = date.year if date.month >= 4 else date.year - 1
	prefix = f"{financial_year % 100:02d}{letters}"
	# All numbers of one prefix have the same length, so the highest name is the highest number.
	# Frappe's query builder, not SQL text naming the tables (upgrade-safe).
	table = frappe.qb.DocType(doctype)
	last = (
		frappe.qb.from_(table)
		.select(Max(table.name))
		.where(table.name.like(prefix + "%"))
		.where(Length(table.name) == len(prefix) + NUMBER_DIGITS)
	).run()[0][0]
	running = cint(last[len(prefix) :]) if last else 0
	return f"{prefix}{running + 1:0{NUMBER_DIGITS}d}"


def autoname(doc, method=None):
	"""Sales Order autoname: the Final PI's number, e.g. 26FPI00001. An amended one is named by
	Frappe (old number-1) before this is called."""
	doc.name = next_number("Sales Order", "FPI", doc.get("transaction_date"))


@frappe.whitelist()
def make_draft_pi(source_name, target_doc=None):
	"""Quotation -> Draft PI (the quotation's "Make Draft PI" button, opened unsaved by
	frappe.model.open_mapped_doc). Fields of the same name are copied; alternative items are left
	out unless the quotation has nothing else."""
	quotation = frappe.get_doc("Quotation", source_name)
	quotation.check_permission("read")
	if quotation.docstatus != 1:
		frappe.throw(_("Submit the quotation before making its Draft PI."))
	has_main_lines = any(not row.get("is_alternative") for row in quotation.items)

	def set_header(source, target):
		target.quotation = source.name
		# A quotation for a Lead or Prospect has no Customer yet: ERPNext makes one with the Final
		# PI (its own Quotation -> Sales Order); until then the Draft PI has the name only.
		target.customer = source.party_name if source.quotation_to == "Customer" else None
		target.customer_name = source.customer_name or source.party_name
		target.transaction_date = nowdate()
		# sub-items at their machine's price, not the quotation's converted one (draft_pi.py
		# validate does the same on saving); then the amounts and total
		from manav.manav.quotation import keep_sub_item_rates

		keep_sub_item_rates(target)
		target.run_method("set_amounts")
		# 2026-11-04: the quotation's price line is "Price <Ex-Works From> <Port>"; the Draft PI keeps
		# them as Price Type and Port (Port has the same fieldname and is copied as it is)
		if not target.get("custom_price_type") and source.get("custom_ex_works_from"):
			target.custom_price_type = source.custom_ex_works_from
		# 2026-11-02: Price Type and Port shown filled on the new Draft PI, for the user to change
		fill_price_basis(target)

	return get_mapped_doc(
		"Quotation",
		source_name,
		{
			# 2026-10-29: the quotation's CIF tick, charges and port (custom fields) are the Draft PI's
			# is_cif, cif_charges and cif_port
			"Quotation": {
				"doctype": "Draft PI",
				"validation": {"docstatus": ["=", 1]},
				"field_map": {
					"custom_is_cif": "is_cif",
					"custom_cif_charges": "cif_charges",
					"custom_cif_port": "cif_port",
					"custom_ex_works_from": "ex_works_from",  # 2026-11-03
				},
			},
			"Quotation Item": {
				"doctype": "Draft PI Item",
				"field_map": {"name": "quotation_item", "parent": "prevdoc_docname"},
				"condition": lambda row: not (has_main_lines and row.get("is_alternative")),
			},
		},
		target_doc,
		set_header,
	)


@frappe.whitelist()
def make_final_pi(draft_pi):
	"""Draft PI -> Final PI (Sales Order), saved as a draft so it can be checked before it is
	submitted; returns its name. When the Draft PI already has its Final PI, that one is returned.

	With a quotation, ERPNext's own Quotation -> Sales Order makes the Sales Order (customer, made
	from the Lead or Prospect if needed; addresses, taxes, payment terms; ERPNext's checks such as
	the quotation's validity). Its lines are then replaced by the Draft PI's, which keep their link
	to the quotation, so ERPNext marks the quotation "Ordered" when the Final PI is submitted; the
	Manav header fields come from the Draft PI.
	"""
	draft = frappe.get_doc("Draft PI", draft_pi)
	draft.check_permission("read")
	if draft.final_pi and frappe.db.exists("Sales Order", draft.final_pi):
		return draft.final_pi
	if not draft.items:
		frappe.throw(_("The Draft PI has no items."))

	if draft.quotation:
		from erpnext.selling.doctype.quotation.quotation import make_sales_order

		so = make_sales_order(draft.quotation)
	else:
		so = frappe.new_doc("Sales Order")
		so.update(
			{
				"customer": draft.customer,
				"company": draft.company,
				"currency": draft.currency,
				"selling_price_list": draft.selling_price_list,
			}
		)
	if not so.get("customer"):
		so.customer = draft.customer

	for fieldname in FINAL_PI_HEADER_FIELDS:
		so.set(fieldname, draft.get(fieldname))
	so.custom_draft_pi = draft.name
	# 2026-10-29: the advance typed on the Draft PI, printed on the Final PI (custom field)
	so.custom_advance_received = draft.get("advance_received")
	so.custom_is_cif = draft.get("is_cif")  # 2026-10-29: CIF label on the print
	so.custom_cif_charges = draft.get("cif_charges")
	so.custom_cif_port = draft.get("cif_port")
	so.custom_ex_works_from = draft.get("ex_works_from")  # 2026-11-03: "Prices : Ex-Works, <this>."
	so.transaction_date = nowdate()
	so.delivery_date = nowdate()

	so.set("items", [])
	for row in draft.items:
		line = {fieldname: row.get(fieldname) for fieldname in FINAL_PI_ITEM_FIELDS}
		# The price the line came with stays the price list rate (for a sub-item: its machine's
		# price, which quotation.keep_sub_item_rates checks); the Draft PI's rate is the rate.
		line["price_list_rate"] = flt(row.price_list_rate) or flt(row.rate)
		line["delivery_date"] = so.delivery_date
		so.append("items", line)

	# ERPNext fills what the lines still miss (UOM factor, warehouse, item tax ...) and the totals
	so.run_method("set_missing_values")
	so.run_method("calculate_taxes_and_totals")
	so.insert()  # Frappe checks the user's permission to create a Sales Order
	return so.name


@frappe.whitelist()
def get_draft_pi_item_rate(item_code, price_list=None, currency=None, main_item_code=None):
	"""The rate of a line added on a Draft PI: for a sub-item, its price for its machine (Quotation
	Sub Item Master, as on the quotation); otherwise the selling Item Price of the price list."""
	if main_item_code:
		rate = frappe.db.get_value(
			"Quotation Sub Item Master",
			{"main_item_code": main_item_code, "sub_item_code": item_code},
			"rate",
			order_by="sr_no asc",
		)
		if flt(rate):
			return flt(rate)
	if not price_list:
		return 0
	filters = {"item_code": item_code, "price_list": price_list, "selling": 1}
	if currency:
		filters["currency"] = currency
	return flt(frappe.db.get_value("Item Price", filters, "price_list_rate", order_by="valid_from desc"))


def fill_delivery_date(doc, method=None):
	"""Sales Order before_validate: the PI has no Delivery Date field for the user (hidden by
	property setters, erpnext_fields.py), but ERPNext requires one ("Please enter Delivery
	Date", SalesOrder.validate_delivery_date). An empty one is set to the PI's date, on the PI and
	its lines, before ERPNext checks it. Added 2026-10-28: the user asked to remove Delivery Date
	from the PI."""
	date = doc.get("transaction_date") or frappe.utils.nowdate()
	if not doc.get("delivery_date"):
		doc.delivery_date = date
	for row in doc.get("items") or []:
		if not row.get("delivery_date"):
			row.delivery_date = doc.delivery_date


def fill_price_basis(doc, method=None):
	"""Draft PI validate and Sales Order validate (and make_draft_pi): Price Type and Port, printed
	under each machine as "Price <type> <port> (1 NOS) ...... US$ <amount>"
	(manav_proforma_invoice.html). Added 2026-10-31 as one field, Price Basis; in two since
	2026-11-02.

	What the user typed is kept: only when both are empty are they filled, with
	- an older PI's Price Basis (the single field of 2026-10-31, now hidden), moved into Price Type
	  so that the PI prints as before and the user can change it (the old default text becomes the
	  two defaults);
	- else the principal's (Quotation Type's) Price Basis, as Price Type;
	- else DEFAULT_PRICE_TYPE and DEFAULT_PRICE_PORT.
	"""
	if doc.get("custom_price_type") or doc.get("custom_price_port"):
		return
	old_basis = (doc.get("custom_price_basis") or "").strip()
	# cleared, so that emptying both fields later gives the defaults, not this text again
	doc.custom_price_basis = None
	if old_basis and old_basis != f"{DEFAULT_PRICE_TYPE} {DEFAULT_PRICE_PORT}":
		doc.custom_price_type = old_basis
		return
	basis = None
	if doc.get("custom_quotation_type"):
		basis = frappe.db.get_value("Quotation Type", doc.custom_quotation_type, "price_basis")
	if basis and basis.strip():
		doc.custom_price_type = basis.strip()
	else:
		doc.custom_price_type = DEFAULT_PRICE_TYPE
		doc.custom_price_port = DEFAULT_PRICE_PORT


def allow_draft_pi_quantities(doc, method=None):
	"""Sales Order before_submit: a Final PI made from a Draft PI is not held to the quotation's
	quantities. Added 2026-10-31.

	On submit ERPNext adds each line's quantity to its quotation line's Ordered Qty and refuses a
	total above the quotation's quantity plus Stock Settings' Over Delivery/Receipt Allowance
	(StatusUpdater.validate_qty, from SalesOrder.on_submit). The Draft PI lets the user change the
	quantities, so for its Final PI that check is switched off with ERPNext's own option for it
	(validate_qty False on the status_updater entry); Ordered Qty is still updated and the
	quotation still becomes "Ordered". Sales Orders made without a Draft PI keep ERPNext's check,
	and the site-wide allowance (also used for deliveries and invoices) is left as it is.
	"""
	if not doc.get("custom_draft_pi"):
		return
	for args in getattr(doc, "status_updater", None) or []:
		if args.get("target_dt") == "Quotation Item":
			args["validate_qty"] = False


def set_quotation_reference(doc, method=None):
	"""Sales Order validate: Quotation No. = the quotation of its first line that has one; when no
	line has one (e.g. all were added on the Draft PI), the Draft PI's quotation."""
	quotations = [row.prevdoc_docname for row in doc.get("items") or [] if row.get("prevdoc_docname")]
	if quotations:
		doc.custom_quotation = quotations[0]
	elif doc.get("custom_draft_pi"):
		doc.custom_quotation = frappe.db.get_value("Draft PI", doc.custom_draft_pi, "quotation")
	else:
		doc.custom_quotation = None


def link_pi_documents(doc, method=None):
	"""Sales Order on_update / on_submit: write this Final PI on its quotation (Final PI No.) and on
	its Draft PI (Final PI No., status Final PI Made)."""
	# db.set_value: the quotation is submitted and the Draft PI closed; these are only references
	if doc.get("custom_quotation") and frappe.db.exists("Quotation", doc.custom_quotation):
		frappe.db.set_value("Quotation", doc.custom_quotation, "custom_pi_no", doc.name, update_modified=False)
	if doc.get("custom_draft_pi") and frappe.db.exists("Draft PI", doc.custom_draft_pi):
		frappe.db.set_value(
			"Draft PI",
			doc.custom_draft_pi,
			{"final_pi": doc.name, "status": "Final PI Made"},
			update_modified=False,
		)


def unlink_pi_documents(doc, method=None):
	"""Sales Order on_cancel / on_trash: take this Final PI off its quotation and Draft PI, so the
	Draft PI can be changed and a new Final PI made (an amended Final PI links itself again)."""
	if doc.get("custom_quotation"):
		frappe.db.set_value(
			"Quotation",
			{"name": doc.custom_quotation, "custom_pi_no": doc.name},
			"custom_pi_no",
			None,
			update_modified=False,
		)
	if doc.get("custom_draft_pi"):
		frappe.db.set_value(
			"Draft PI",
			{"name": doc.custom_draft_pi, "final_pi": doc.name},
			{"final_pi": None, "status": "Draft"},
			update_modified=False,
		)
