# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Figures and records of one customer for the page "Customer Dashboard" (/desk/customer-dashboard,
page/customer_dashboard/).

Working: the page calls get_customer_dashboard with the customer chosen in its drop-down. Only
management (desk_home.is_management: the Administrator, System Managers, role Manav Management)
may use it. Every record is read with frappe.get_list, so the reader's own permissions still
apply; a section whose doctype the reader may not read, or which is not on the site, comes back
as None and the page leaves it out. Rows are summed in Python rather than with SQL GROUP BY, so
only Frappe's documented API is used (upgrade-safe); one customer has few rows.

Sections: the customer's head (group, territory, Haas Cust ID, Account Manager), contacts and
addresses (ERPNext's, and the old system's Customer Contact Person),
key figures, quoted / ordered value by month (12 months), and the lists of Quotations, Draft PIs,
Final PIs (Sales Orders), Sales Invoices, Payment Entries, the customer's machines (Serial Nos) and
the old system's quotations (Quotation Head).

Amounts in the key figures and the chart are in the company currency (INR: base_ fields), as the
customer's documents may be in different currencies; the lists show each document in its own
currency.

Created: 2026-10-29, when the user asked for a customer dashboard showing all information about a
customer, the admin choosing the customer from a drop-down.

CHANGE NOTE
Date: 2026-10-29
Change: Removed customer_details (every filled field of the Customer form) from the page's data.
Reason: The user asked not to show the "Customer Details" card.

CHANGE NOTE
Date: 2026-10-29
Change: Quotations carry the principal's name (add_principal_names).
Reason: The user found the page "not looking good"; the Principal column showed the type's code.
"""

from collections import defaultdict

import frappe
from frappe import _
from frappe.utils import add_months, flt, get_first_day, getdate, nowdate

from manav.manav.desk_home import is_management

LIST_LIMIT = 50  # rows per list; the figures count all rows
MONTHS = 12


@frappe.whitelist()
def get_customer_dashboard(customer):
	"""Everything shown on the Customer Dashboard for `customer` (the Customer's name)."""
	if not is_management():
		frappe.throw(_("The Customer Dashboard is for management only."), frappe.PermissionError)
	if not customer or not frappe.db.exists("Customer", customer):
		frappe.throw(_("Customer {0} not found.").format(customer or ""))
	doc = frappe.get_doc("Customer", customer)
	doc.check_permission("read")

	quotations = quotation_rows(customer)
	add_principal_names(quotations)
	draft_pis = get_rows(
		"Draft PI",
		{"customer": customer},
		["name", "transaction_date", "quotation", "status", "currency", "net_total", "final_pi"],
		"transaction_date desc",
	)
	sales_orders = get_rows(
		"Sales Order",
		{"customer": customer, "docstatus": ["<", 2]},
		[
			"name",
			"transaction_date",
			"status",
			"docstatus",
			"currency",
			"grand_total",
			"base_net_total",
			"per_delivered",
			"per_billed",
			"custom_quotation",
			"custom_draft_pi",
		],
		"transaction_date desc",
	)
	invoices = get_rows(
		"Sales Invoice",
		{"customer": customer, "docstatus": 1},
		["name", "posting_date", "status", "currency", "grand_total", "base_grand_total", "outstanding_amount", "conversion_rate", "due_date"],
		"posting_date desc",
	)
	payments = get_rows(
		"Payment Entry",
		{"party_type": "Customer", "party": customer, "docstatus": 1, "payment_type": "Receive"},
		["name", "posting_date", "mode_of_payment", "paid_from_account_currency", "paid_amount", "base_paid_amount", "reference_no"],
		"posting_date desc",
	)

	return {
		"customer": customer_summary(doc),
		"contacts": contacts(customer),
		"addresses": addresses(customer),
		"old_contacts": get_rows(
			"Customer Contact Person",
			{"customer": customer},
			["name", "contact_name", "designation", "department", "mobile_no", "phone", "email"],
			"contact_name asc",
		),
		"currency": frappe.get_cached_value("Company", doc.get("default_company") or frappe.db.get_default("company"), "default_currency")
		or frappe.db.get_default("currency"),
		"figures": figures(quotations, sales_orders, invoices, payments, draft_pis),
		"chart": monthly_chart(quotations, sales_orders),
		"quotations": limited(quotations),
		"draft_pis": limited(draft_pis),
		"sales_orders": limited(sales_orders),
		"invoices": limited(invoices),
		"payments": limited(payments),
		"machines": get_rows(
			"Serial No",
			{"customer": customer},
			["name", "item_code", "item_name", "status", "warranty_expiry_date", "amc_expiry_date"],
			"creation desc",
		),
		"old_quotations": get_rows(
			"Quotation Head",
			{"customer": customer},
			["name", "quotation_no", "quotation_date", "quotation_type", "currency", "final_amount"],
			"quotation_date desc",
		),
	}


def get_rows(doctype, filters, fields, order_by):
	"""All rows of `doctype` for the customer the reader may read; None when the doctype is not on
	the site or not readable. Fields not on the site (e.g. a custom field before migrate) are left
	out rather than failing the page."""
	if not frappe.db.exists("DocType", doctype) or not frappe.has_permission(doctype, "read"):
		return None
	meta = frappe.get_meta(doctype)
	fields = [f for f in fields if f == "name" or f == "docstatus" or meta.has_field(f)]
	filters = {k: v for k, v in filters.items() if k == "docstatus" or meta.has_field(k)}
	return frappe.get_list(doctype, filters=filters, fields=fields, order_by=order_by, limit_page_length=0)


def limited(rows):
	return rows[:LIST_LIMIT] if rows is not None else None


def quotation_rows(customer):
	"""The customer's quotations, not cancelled. ERPNext keeps the customer in party_name (with
	quotation_to = Customer)."""
	return get_rows(
		"Quotation",
		{"quotation_to": "Customer", "party_name": customer, "docstatus": ["<", 2]},
		[
			"name",
			"transaction_date",
			"custom_quotation_type",
			"status",
			"docstatus",
			"currency",
			"grand_total",
			"base_net_total",
			"custom_draft_pi_no",
			"custom_pi_no",
		],
		"transaction_date desc",
	)


def add_principal_names(quotations):
	"""Each quotation gets "principal": its Quotation Type's description (e.g. MACHINES), as the
	type itself is a code (1, 2 ...). Added 2026-10-29: the page showed the code."""
	codes = {q.custom_quotation_type for q in quotations or [] if q.get("custom_quotation_type")}
	names = (
		dict(frappe.get_all("Quotation Type", filters={"name": ["in", list(codes)]}, fields=["name", "description"], as_list=True))
		if codes
		else {}
	)
	for q in quotations or []:
		q.principal = names.get(q.get("custom_quotation_type")) or q.get("custom_quotation_type")


def customer_summary(doc):
	"""The head of the page."""
	return {
		"name": doc.name,
		"customer_name": doc.customer_name,
		"customer_group": doc.customer_group,
		"territory": doc.territory,
		"customer_type": doc.customer_type,
		"disabled": doc.disabled,
		"image": doc.image,
		"haas_customer_id": doc.get("custom_haas_customer_id"),
		"account_manager": frappe.utils.get_fullname(doc.account_manager) if doc.get("account_manager") else None,
		"email": doc.get("email_id"),
		"mobile": doc.get("mobile_no"),
	}


def linked_names(doctype, customer):
	"""Names of Contacts / Addresses linked to the customer (ERPNext's Dynamic Link table)."""
	return [
		row.parent
		for row in frappe.get_all(
			"Dynamic Link",
			filters={"parenttype": doctype, "link_doctype": "Customer", "link_name": customer},
			fields=["parent"],
		)
	]


def contacts(customer):
	if not frappe.has_permission("Contact", "read"):
		return None
	names = linked_names("Contact", customer)
	if not names:
		return []
	return frappe.get_list(
		"Contact",
		filters={"name": ["in", names]},
		fields=["name", "first_name", "last_name", "designation", "department", "email_id", "mobile_no", "phone", "is_primary_contact"],
		order_by="is_primary_contact desc, first_name asc",
		limit_page_length=0,
	)


def addresses(customer):
	if not frappe.has_permission("Address", "read"):
		return None
	names = linked_names("Address", customer)
	if not names:
		return []
	return frappe.get_list(
		"Address",
		filters={"name": ["in", names]},
		fields=["name", "address_title", "address_type", "address_line1", "address_line2", "city", "state", "pincode", "country", "gstin", "is_primary_address", "is_shipping_address"],
		order_by="is_primary_address desc, address_type asc",
		limit_page_length=0,
	)


def figures(quotations, sales_orders, invoices, payments, draft_pis):
	"""The key figures, in company currency. None where the reader may not see that doctype."""
	result = {}
	if quotations is not None:
		won = [q for q in quotations if q.status in ("Ordered", "Partially Ordered")]
		submitted = [q for q in quotations if q.docstatus == 1]
		result.update(
			{
				"quotations": len(quotations),
				"quoted_value": flt(sum(flt(q.base_net_total) for q in quotations), 2),
				"open_quotations": len([q for q in quotations if q.status == "Open"]),
				"conversion": flt(100 * len(won) / len(submitted), 1) if submitted else None,
				"last_quotation": str(quotations[0].transaction_date) if quotations else None,
			}
		)
	if draft_pis is not None:
		result["draft_pis"] = len(draft_pis)
	if sales_orders is not None:
		submitted = [so for so in sales_orders if so.docstatus == 1]
		result.update(
			{
				"final_pis": len(submitted),
				"ordered_value": flt(sum(flt(so.base_net_total) for so in submitted), 2),
				"last_order": str(submitted[0].transaction_date) if submitted else None,
			}
		)
	if invoices is not None:
		result.update(
			{
				"invoiced": flt(sum(flt(inv.base_grand_total) for inv in invoices), 2),
				# outstanding_amount is in the invoice's currency; conversion_rate makes it company currency
				"outstanding": flt(sum(flt(inv.outstanding_amount) * flt(inv.conversion_rate or 1) for inv in invoices), 2),
			}
		)
	if payments is not None:
		result["received"] = flt(sum(flt(p.base_paid_amount) for p in payments), 2)
	return result


def monthly_chart(quotations, sales_orders):
	"""Quoted and ordered value (company currency, before taxes) of the last 12 months."""
	end = getdate(nowdate())
	start = get_first_day(add_months(end, -(MONTHS - 1)))
	keys, day = [], start
	while day <= end:
		keys.append(day.strftime("%Y-%m"))
		day = add_months(day, 1)
	quoted, ordered = defaultdict(float), defaultdict(float)
	for q in quotations or []:
		if q.transaction_date and getdate(q.transaction_date) >= start:
			quoted[getdate(q.transaction_date).strftime("%Y-%m")] += flt(q.base_net_total)
	for so in sales_orders or []:
		if so.docstatus == 1 and so.transaction_date and getdate(so.transaction_date) >= start:
			ordered[getdate(so.transaction_date).strftime("%Y-%m")] += flt(so.base_net_total)
	return {
		"labels": [getdate(k + "-01").strftime("%b %y") for k in keys],
		"quoted": [flt(quoted[k], 2) for k in keys],
		"ordered": [flt(ordered[k], 2) for k in keys],
	}
