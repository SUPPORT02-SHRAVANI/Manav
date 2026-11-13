# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: lead_notify.py
# Purpose: Tell the lead's Sale Manager (Manav Lead.sales_manager, a Sales Person) when a Quotation, a
#          Draft PI or a Final PI (Sales Order) is made for that lead: a desk (bell) notification with a
#          link to the new document. No e-mail.
#          The lead is found through the chain the documents already keep:
#            Quotation.custom_manav_lead
#            Draft PI.quotation -> Quotation.custom_manav_lead
#            Sales Order.custom_quotation (pi.set_quotation_reference) -> Quotation.custom_manav_lead
#          The Sales Person's login is Sales Person.custom_user, else its Employee's User ID (the same
#          link as quotation.sales_person_for_user, the other way round).
#          Nothing is sent when the document has no lead, the lead has no Sale Manager, the manager has
#          no login, or the manager made the document himself / herself.
# Created: 2026-11-13
# Reason: The user asked that the Sale Manager chosen on the lead is notified when its quotation,
#         Draft PI or Final PI is made.

import frappe
from frappe import _


def notify_lead_sales_manager(doc, method=None):
	"""after_insert of Quotation, Draft PI and Sales Order (hooks.py). A failure is logged and never
	stops the document being saved."""
	try:
		_notify(doc)
	except Exception:
		frappe.log_error(title=f"Manav: Sale Manager notification failed for {doc.doctype} {doc.name}")


def _notify(doc):
	lead = lead_of(doc)
	if not lead:
		return
	lead_values = frappe.db.get_value(
		"Manav Lead", lead, ["sales_manager", "company_name"], as_dict=True
	)
	if not lead_values or not lead_values.sales_manager:
		return
	user = user_for_sales_person(lead_values.sales_manager)
	if not user or user == doc.owner:
		return

	label = document_label(doc)
	party = doc.get("customer_name") or doc.get("party_name") or doc.get("customer") or lead_values.company_name or lead
	maker = frappe.utils.get_fullname(doc.owner)
	subject = _("{0} {1} made for lead {2} ({3}) by {4}").format(label, doc.name, lead, party, maker)

	frappe.get_doc(
		{
			"doctype": "Notification Log",
			"for_user": user,
			"from_user": doc.owner,
			# "Alert" is a bell notification only, it never sends an e-mail of its own
			"type": "Alert",
			"subject": subject,
			"document_type": doc.doctype,
			"document_name": doc.name,
		}
	).insert(ignore_permissions=True)


def lead_of(doc):
	"""The Manav Lead behind a Quotation, Draft PI or Sales Order, or None."""
	if doc.doctype == "Quotation":
		return doc.get("custom_manav_lead")
	if doc.doctype == "Draft PI":
		quotation = doc.get("quotation")
	elif doc.doctype == "Sales Order":
		quotation = doc.get("custom_quotation")
	else:
		return None
	if not quotation or not frappe.get_meta("Quotation").has_field("custom_manav_lead"):
		return None
	return frappe.db.get_value("Quotation", quotation, "custom_manav_lead")


def document_label(doc):
	"""What the users call the document."""
	return {"Quotation": _("Quotation"), "Draft PI": _("Draft PI"), "Sales Order": _("Final PI")}.get(
		doc.doctype, _(doc.doctype)
	)


def user_for_sales_person(sales_person):
	"""The enabled login User of a Sales Person: Sales Person.custom_user, else its Employee's User ID."""
	if not sales_person:
		return None
	user = None
	if frappe.get_meta("Sales Person").has_field("custom_user"):
		user = frappe.db.get_value("Sales Person", sales_person, "custom_user")
	if not user and frappe.db.exists("DocType", "Employee"):
		employee = frappe.db.get_value("Sales Person", sales_person, "employee")
		if employee:
			user = frappe.db.get_value("Employee", employee, "user_id")
	if user and frappe.db.get_value("User", user, "enabled"):
		return user
	return None
