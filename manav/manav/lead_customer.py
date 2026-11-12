# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: lead_customer.py
# Purpose: Manav Lead's link to the Customer master and its Sale Manager as a Sales Person.
#          - "Existing Customer" (customer): for a lead of a customer already in ERPNext; picking it fills
#            the lead's company, contact, address and IDs from the Customer master
#            (get_customer_details, called by public/js/manav_lead_customer.js).
#          - "Sale Manager" (sales_manager): a Link to Sales Person, the same list as Sales Engineer. It
#            replaces the old free-text sale_manager field, which is hidden; its values are moved over.
#          Both are custom fields made on migrate (setup_lead_customer_fields, hooks.py after_migrate), in
#          the way lead_board.py adds the stage fields, so the Manav Lead doctype file is not changed.
# Created: 2026-11-07
# CHANGE NOTE
# Date: 2026-11-07
# Change: The Source section comes first on the lead (field_order Property Setter, set_source_first), and
#         Existing Customer sits right under Source, shown and mandatory only when the source is an
#         existing customer ("Existing Customer - New order").
# Reason: The user asked that the lead first asks the source and offers the customer dropdown only when
#         the source is an existing customer.

import json

# Frappe framework.
import frappe
from frappe import _
from frappe.contacts.doctype.address.address import get_default_address
from frappe.contacts.doctype.contact.contact import get_default_contact
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

LEAD = "Manav Lead"
# The old free-text field (in manav_lead.json); Frappe does not allow Data -> Link by customization.
OLD_SALE_MANAGER = "sale_manager"

# The Source section's fields (manav_lead.json), moved before the Customer section (set_source_first).
SOURCE_FIELDS = ("sec_source", "source", "source_name")
SOURCE_BEFORE = "sec_customer"

# Existing Customer is offered when the Source is an existing customer: the seeded source
# "Existing Customer - New order" (lead_setup.LEAD_SOURCES), or any source whose name says
# "existing customer", so a renamed or added one works too. Evaluated in the browser only (Frappe
# does not evaluate depends_on on the server); the same test is in public/js/manav_lead_customer.js.
EXISTING_CUSTOMER_CONDITION = 'eval:(doc.source || "").toLowerCase().includes("existing customer")'

LEAD_CUSTOMER_FIELDS = {
	LEAD: [
		{
			"fieldname": "customer",
			"fieldtype": "Link",
			"label": "Existing Customer",
			"options": "Customer",
			# Right under Source (the Source section comes first on the form).
			"insert_after": "source",
			"in_standard_filter": 1,
			"depends_on": EXISTING_CUSTOMER_CONDITION,
			"mandatory_depends_on": EXISTING_CUSTOMER_CONDITION,
			"description": "Pick the customer from the Customer master; the lead's customer details are filled "
			"from it.",
		},
		{
			"fieldname": "sales_manager",
			"fieldtype": "Link",
			"label": "Sale Manager",
			"options": "Sales Person",
			"insert_after": OLD_SALE_MANAGER,
			"description": "The Sales Person managing the lead (the same list as Sales Engineer).",
		},
	],
}


def setup_lead_customer_fields():
	"""Create / update the custom fields, hide the old text field and move its values. Runs after every
	migrate; does nothing more once the old values are moved."""
	if not frappe.db.exists("DocType", LEAD):
		return
	create_custom_fields(LEAD_CUSTOMER_FIELDS, update=True)
	set_source_first()

	if not frappe.get_meta(LEAD).has_field(OLD_SALE_MANAGER):
		return
	frappe.make_property_setter(
		{
			"doctype": LEAD,
			"fieldname": OLD_SALE_MANAGER,
			"property": "hidden",
			"value": 1,
			"property_type": "Check",
		},
		validate_fields_for_doctype=False,
	)
	move_old_sale_managers()


def set_source_first():
	"""Put the Source section before the Customer section, as a field_order Property Setter (what
	Customize Form saves when fields are dragged). Built on every migrate from the doctype file's own
	order, so fields added to manav_lead.json later keep their place; custom fields follow their
	insert_after (Frappe's Meta.sort_fields)."""
	order = [df.fieldname for df in frappe.get_doc("DocType", LEAD).fields]
	if not all(f in order for f in (*SOURCE_FIELDS, SOURCE_BEFORE)):
		return
	order = [f for f in order if f not in SOURCE_FIELDS]
	at = order.index(SOURCE_BEFORE)
	order[at:at] = SOURCE_FIELDS
	frappe.make_property_setter(
		{
			"doctype": LEAD,
			"doctype_or_field": "DocType",
			"property": "field_order",
			"value": json.dumps(order),
			"property_type": "Data",
		},
		validate_fields_for_doctype=False,
	)


def move_old_sale_managers():
	"""Old text value -> the new Sale Manager when it is a Sales Person; otherwise it is kept in Other
	Information Notes. The old field is emptied afterwards, so each lead is handled once."""
	leads = frappe.get_all(
		LEAD,
		filters={OLD_SALE_MANAGER: ["is", "set"]},
		fields=["name", OLD_SALE_MANAGER, "sales_manager", "other_information_notes"],
	)
	for lead in leads:
		old = (lead.get(OLD_SALE_MANAGER) or "").strip()
		values = {OLD_SALE_MANAGER: None}
		if old and not lead.sales_manager and frappe.db.exists("Sales Person", old):
			values["sales_manager"] = old
		elif old and old != lead.sales_manager:
			note = f"Sale Manager (old text): {old}"
			if note not in (lead.other_information_notes or ""):
				values["other_information_notes"] = "\n".join(filter(None, [lead.other_information_notes, note]))
		# Direct update: an old lead missing newer mandatory fields is still moved over.
		frappe.db.set_value(LEAD, lead.name, values, update_modified=False)


@frappe.whitelist()
def get_customer_details(customer):
	"""The lead fields that can be filled from a Customer, with their values (empty ones left out).

	Contact and address: the customer's primary ones, else its default ones (Frappe's own lookup).
	"""
	doc = frappe.get_doc("Customer", customer)
	doc.check_permission("read")

	out = {
		"company_name": doc.customer_name,
		"mobile_no": doc.get("mobile_no"),
		"email_id": doc.get("email_id"),
		"website": doc.get("website"),
		# Custom fields of customer_fields.py: Haas Customer ID and the old (Magic) system's customer code.
		"haas_cust_id": doc.get("custom_haas_customer_id"),
		"magic_cust_id": doc.get("custom_customer_code"),
	}

	contact_name = doc.get("customer_primary_contact") or get_default_contact("Customer", doc.name)
	if contact_name:
		contact = frappe.db.get_value(
			"Contact",
			contact_name,
			["first_name", "last_name", "designation", "mobile_no", "phone", "email_id"],
			as_dict=True,
		)
		if contact:
			out["contact_person"] = " ".join(filter(None, [contact.first_name, contact.last_name]))
			out["contact_position"] = contact.designation
			out["mobile_no"] = out["mobile_no"] or contact.mobile_no or contact.phone
			out["email_id"] = out["email_id"] or contact.email_id

	address_name = doc.get("customer_primary_address") or get_default_address("Customer", doc.name)
	if address_name:
		address = frappe.db.get_value(
			"Address",
			address_name,
			["address_line1", "address_line2", "city", "state", "pincode", "country"],
			as_dict=True,
		)
		if address:
			city = " - ".join(filter(None, [address.city, address.pincode]))
			out["address"] = "\n".join(
				filter(None, [address.address_line1, address.address_line2, city, address.state, address.country])
			)

	return {key: value for key, value in out.items() if value}
