# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Custom fields that the Manav app adds to ERPNext's Quotation, Quotation Item, Sales Person and
Contact, so that quotations are made in ERPNext's own Quotation form.

Working: these doctypes belong to ERPNext and Frappe, so their JSON files must not be edited. The
fields below are created as Custom Fields by setup_erpnext_fields(), which is hooked to
`after_migrate` in hooks.py. The same function sets the default print format of Quotation (see
DEFAULT_QUOTATION_PRINT_FORMATS). Every fieldname starts with `custom_`, so it cannot clash with a
field ERPNext adds later.

What the fields are for:
- Quotation: the principal (Quotation Type) that decides currency, price list, letter head, terms and
  the quotation number; the customer's reference; the two sales persons printed on the quotation
  (Signed By, Sales Engineer); the Haas Cust ID and machine number of the old system.
- Quotation Item: "Sub-Item of" marks a line as a sub-item (option) of a machine on the same quotation;
  Specifications holds the lines printed under an item (one per line, copied from the Item).
- Sales Person: the old employee code (M-02, M-36 ...), which the old data uses everywhere.
- Contact: the old key Customer Code-Sr No, which lets the import find a contact it already loaded.

The custom fields on Customer and Item are in customer_fields.py and item_fields.py.

Created: 2026-10-12, when the quotation process was moved from Quotation Head to ERPNext's Quotation.

CHANGE NOTE
Date: 2026-10-13
Change: The help text of Quotation Item's Specifications describes the lines
"label : value || value" and "#Title || Column 2 || Column 3".
Reason: The quotation now prints the specifications as a table of three columns, whose titles come
from the heading line (S.A.E. and Metric for Haas, Units and the model for Jagdeep).

CHANGE NOTE
Date: 2026-10-15
Change: The label of Quotation Item's custom_main_item_code is "Sub-Item of" (was "Option of Item").
Reason: The user asked for options to be called sub-items on the quotation form.

CHANGE NOTE
Date: 2026-10-15
Change: Added Quotation Item's "Sub-Item Sr.No" (custom_sub_item_sr_no), shown in the Items table
right after No. (place_sub_item_no_first); Quantity is one column wide there instead of two.
Reason: The user asked for a column numbering the sub-items beside the row number.
"""

import json

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
from frappe.custom.doctype.property_setter.property_setter import make_property_setter

# The print format a Quotation opens with: the first of these that is on the site.
DEFAULT_QUOTATION_PRINT_FORMATS = ("Manav Modern Quotation", "Manav Sales Quotation")

ERPNEXT_FIELDS = {
	"Quotation": [
		{
			"fieldname": "custom_quotation_type",
			"label": "Principal (Quotation Type)",
			"fieldtype": "Link",
			"options": "Quotation Type",
			"insert_after": "order_type",
			"in_standard_filter": 1,
			"description": "Decides the currency, price list, letter head, terms, items and quotation number",
		},
		# A section of its own, between the customer block and "Currency and Price List".
		{
			"fieldname": "custom_manav_section",
			"label": "Manav Details",
			"fieldtype": "Section Break",
			"insert_after": "amended_from",
		},
		{
			"fieldname": "custom_your_reference",
			"label": "Customer Ref. No.",
			"fieldtype": "Data",
			"insert_after": "custom_manav_section",
			"description": "For example Discussions, Direct Visit, or the enquiry number",
		},
		{
			"fieldname": "custom_your_reference_date",
			"label": "Customer Ref. Date",
			"fieldtype": "Date",
			"insert_after": "custom_your_reference",
		},
		{
			"fieldname": "custom_manav_column_1",
			"fieldtype": "Column Break",
			"insert_after": "custom_your_reference_date",
		},
		{
			"fieldname": "custom_signed_by",
			"label": "Signed By",
			"fieldtype": "Link",
			"options": "Sales Person",
			"insert_after": "custom_manav_column_1",
			"description": "Signs the quotation",
		},
		{
			"fieldname": "custom_sales_engineer",
			"label": "Discussion With (Sales Engineer)",
			"fieldtype": "Link",
			"options": "Sales Person",
			"insert_after": "custom_signed_by",
			"description": "Printed as Sales Engg.",
		},
		{
			"fieldname": "custom_manav_column_2",
			"fieldtype": "Column Break",
			"insert_after": "custom_sales_engineer",
		},
		{
			"fieldname": "custom_haas_customer_id",
			"label": "Haas Cust ID",
			"fieldtype": "Data",
			"insert_after": "custom_manav_column_2",
			"description": "Printed as Cust ID",
		},
		{
			"fieldname": "custom_machine_number",
			"label": "Machine Number",
			"fieldtype": "Data",
			"insert_after": "custom_haas_customer_id",
		},
	],
	"Quotation Item": [
		{
			"fieldname": "custom_main_item_code",
			"label": "Sub-Item of",
			"fieldtype": "Data",
			"insert_after": "item_name",
			"read_only": 1,
			"description": "Filled by Add Sub-Items: the machine this line is a sub-item (option) of",
		},
		{
			# Shown in the Items table right after No. (see SUB_ITEM_NO_FIRST below).
			"fieldname": "custom_sub_item_sr_no",
			"label": "Sub-Item Sr.No",
			"fieldtype": "Data",
			"insert_after": "item_code",
			"read_only": 1,
			"in_list_view": 1,
			"columns": 1,
			"no_copy": 1,
			"description": "Number of a sub-item under its machine (1, 2, 3 ...); set on saving",
		},
		{
			"fieldname": "custom_specifications",
			"label": "Specifications",
			"fieldtype": "Text",
			"insert_after": "description",
			# Copied from the Item once; after that the lines belong to this quotation.
			"fetch_from": "item_code.custom_specifications",
			"fetch_if_empty": 1,
			"description": (
				"One specification per line, printed as a table in place of the description."
				" Write a line as: label : value || value."
				" Start a line with # for a heading (#Title || Column 2 || Column 3 also names"
				" the two value columns), with ! to print it bold"
			),
		},
	],
	"Sales Person": [
		{
			"fieldname": "custom_employee_code",
			"label": "Employee Code",
			"fieldtype": "Data",
			"insert_after": "sales_person_name",
			"unique": 1,
			"in_list_view": 1,
			"in_standard_filter": 1,
			"description": "Employee code of the old system, e.g. M-02",
		},
	],
	"Contact": [
		{
			"fieldname": "custom_legacy_contact_key",
			"label": "Old System Key",
			"fieldtype": "Data",
			"insert_after": "company_name",
			"unique": 1,
			"read_only": 1,
			"no_copy": 1,
			"description": "Customer Code-Sr No of the old contact person table",
		},
	],
}


def setup_erpnext_fields():
	"""Create or update the custom fields above. Runs after every `bench migrate`.

	A doctype that is not on the site (ERPNext not installed) is left out.

	To run it by hand:
	bench --site manav.local execute manav.manav.erpnext_fields.setup_erpnext_fields
	"""
	fields = {dt: f for dt, f in ERPNEXT_FIELDS.items() if frappe.db.exists("DocType", dt)}
	create_custom_fields(fields, update=True)
	if "Quotation Item" in fields:
		place_sub_item_no_first()

	# The print formats are part of this app (print_format/); migrate has synced them before this
	# function runs. Setting the default here keeps ERPNext's own doctype file untouched.
	#
	# CHANGE NOTE
	# Date: 2026-10-13
	# Change: The default is "Manav Modern Quotation"; before it was "Manav Sales Quotation",
	# which stays available in the print window and is the default again if the new one is missing.
	# Reason: The user supplied a new quotation layout and asked for it to be the default.
	if "Quotation" in fields:
		for print_format in DEFAULT_QUOTATION_PRINT_FORMATS:
			if frappe.db.exists("Print Format", print_format):
				make_property_setter(
					"Quotation", None, "default_print_format", print_format, "Data", for_doctype=True
				)
				break


def place_sub_item_no_first():
	"""Put Sub-Item Sr.No in front of Item Code, so the Items table shows it right after No.

	The Items table shows its columns in the order of the fields. Item Code is ERPNext's first
	field of Quotation Item and a custom field can only be placed after a field, so the order is
	set with a `field_order` property setter, as Customize Form does; fields ERPNext adds later
	still find their place (Frappe's Meta.sort_fields). Quantity is narrowed from 2 to 1 column so
	that the table keeps its width (Frappe's grid shares about 11 column units between No. and the
	other columns, and Item Code, Quantity, Rate and Amount took them all; Quantity shows short
	figures).
	"""
	frappe.clear_cache(doctype="Quotation Item")
	order = [df.fieldname for df in frappe.get_meta("Quotation Item").fields]
	if order and order[0] != "custom_sub_item_sr_no":
		order.remove("custom_sub_item_sr_no")
		order = json.dumps(["custom_sub_item_sr_no", *order])
		make_property_setter("Quotation Item", None, "field_order", order, "Data", for_doctype=True)
	make_property_setter("Quotation Item", "qty", "columns", 1, "Int")
	frappe.clear_cache(doctype="Quotation Item")
