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
"""

import json

import frappe
from frappe.utils import cint, getdate, nowdate


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
	}


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
		filters={"main_item_code": ["in", main_item_codes]},
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
	for table in ("tabQuotation", "tabQuotation Head"):
		last = frappe.db.sql(
			f"select max(name) from `{table}` where name like %s and char_length(name) = %s",
			(prefix + "%", len(prefix) + 6),
		)[0][0]
		if last:
			highest = max(highest, cint(last[len(prefix) :]))
	return highest
