# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Custom fields that the Manav app adds to the inbuilt ERPNext Customer doctype.

Working: Customer belongs to ERPNext, so its JSON file must not be edited. The extra fields the old
customer master needs are listed below and created as Custom Fields by setup_customer_fields(). That
function is hooked to `after_migrate` in hooks.py, so every `bench migrate` creates the missing
fields and brings changed ones up to date.

Every fieldname starts with `custom_` so it can never clash with a field ERPNext or another app adds
to Customer later. The Customer Code sits on the main tab next to the customer name; all the other
fields sit on their own tab, "Old System Data".

The codes that point to old tables not rebuilt yet (sales persons, segments, state and city codes)
are plain Data fields for now. They can be changed to Link fields once those doctypes exist.

Created: 2026-10-12, from the old customer master (Customer_Master_Dataset.xlsx, 8432 customers).
"""

from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

# The last field of the standard Customer form before the Connections tab. The new tab is placed
# after it, so it shows after "More Info" and before "Connections".
LAST_STANDARD_FIELD = "supplier_numbers"


def data(fieldname, label, **more):
	"""One Data field. The old values are short codes and numbers typed as text."""
	return {"fieldname": fieldname, "label": label, "fieldtype": "Data", **more}


def layout(fieldname, fieldtype, label=None, **more):
	"""One Tab Break, Section Break or Column Break."""
	field = {"fieldname": fieldname, "fieldtype": fieldtype, **more}
	if label:
		field["label"] = label
	return field


# Listed in the order they appear on the form. chain() below turns this order into `insert_after`.
MAIN_TAB_FIELDS = [
	# Old column CUSTCODE, e.g. MS123. Unique, because the import uses it to find a customer that is
	# already loaded. Not mandatory, so customers made in ERPNext later can be saved without a code.
	data(
		"custom_customer_code",
		"Customer Code",
		unique=1,
		bold=1,
		in_list_view=1,
		in_standard_filter=1,
		no_copy=1,
		description="Customer code of the old system",
	),
]

OLD_SYSTEM_TAB_FIELDS = [
	layout("custom_old_system_tab", "Tab Break", "Old System Data"),
	# --- Region and sales responsibility ---
	layout("custom_region_section", "Section Break", "Region and Sales"),
	{
		"fieldname": "custom_region_zone",
		"label": "Region Zone",
		"fieldtype": "Link",
		"options": "Region Zone",
		"in_standard_filter": 1,
	},
	data("custom_region_state_code", "Region State Code"),
	data("custom_region_city_code", "Region City Code"),
	data("custom_segment_code", "Segment Code"),
	layout("custom_region_column_2", "Column Break"),
	data("custom_sales_manager_code", "Sales Manager Code (PIC 1)"),
	data("custom_sales_responsible_code", "Sales Responsible Code (PIC 2)"),
	data("custom_person_responsible_2_code", "Person Responsible 2 Code"),
	data("custom_service_manager_code", "Service Manager Code"),
	layout("custom_region_column_3", "Column Break"),
	data("custom_customer_type_code", "Type of Customer Code"),
	data("custom_business_size_code", "Business Size Code"),
	data("custom_valid_customer", "Valid Customer", description="C or P in the old system"),
	data("custom_agent_code", "Agent Code"),
	# --- Contact details exactly as typed. The cleaned first phone and e-mail are also stored in
	# the standard primary contact; these fields keep the full text, which often holds two numbers.
	layout("custom_old_contact_section", "Section Break", "Contact Details as Typed in Old System"),
	data("custom_old_phone", "Phone"),
	layout("custom_old_contact_column_2", "Column Break"),
	data("custom_old_fax", "Fax"),
	layout("custom_old_contact_column_3", "Column Break"),
	data("custom_old_email", "E-mail"),
	# --- Tax and registration numbers ---
	layout("custom_old_tax_section", "Section Break", "Tax and Registration"),
	# Kept as typed, because many rows hold a note such as "Sales person not given" instead of a
	# number. A value that is a real GSTIN is also stored in the standard Tax ID field.
	data("custom_gst_no", "GST No"),
	data("custom_gst_flag", "GST Flag", description="I or S in the old system"),
	data("custom_haas_customer_id", "Haas Customer ID"),
	data("custom_ecc_no", "ECC No"),
	data("custom_vendor_code", "Vendor Code"),
	layout("custom_old_tax_column_2", "Column Break"),
	data("custom_central_sales_tax_no", "Central Sales Tax No"),
	{
		"fieldname": "custom_central_sales_tax_date",
		"label": "Central Sales Tax Date",
		"fieldtype": "Date",
	},
	data("custom_state_sales_tax_no", "State Sales Tax No"),
	{
		"fieldname": "custom_state_sales_tax_date",
		"label": "State Sales Tax Date",
		"fieldtype": "Date",
	},
	layout("custom_old_tax_column_3", "Column Break"),
	data("custom_stax_reg_no", "Service Tax Reg No"),
	data("custom_tan_no", "TAN No"),
	{
		"fieldname": "custom_credit_period",
		"label": "Credit Period (Days)",
		"fieldtype": "Int",
	},
	data("custom_old_payment_terms", "Payment Terms"),
	data("custom_old_remarks", "Remarks"),
	# --- Who created and changed the record in the old system. Read only: it is history. ---
	layout("custom_old_record_section", "Section Break", "Old System Record", collapsible=1),
	data("custom_legacy_created_by", "Created By (Old System)", read_only=1, no_copy=1),
	{
		"fieldname": "custom_legacy_created_on",
		"label": "Created On (Old System)",
		"fieldtype": "Datetime",
		"read_only": 1,
		"no_copy": 1,
	},
	layout("custom_old_record_column_2", "Column Break"),
	data("custom_legacy_modified_by", "Modified By (Old System)", read_only=1, no_copy=1),
	{
		"fieldname": "custom_legacy_modified_on",
		"label": "Modified On (Old System)",
		"fieldtype": "Datetime",
		"read_only": 1,
		"no_copy": 1,
	},
	layout("custom_old_record_column_3", "Column Break"),
	data("custom_legacy_status_by", "Active Status Set By (Old System)", read_only=1, no_copy=1),
	{
		"fieldname": "custom_legacy_status_on",
		"label": "Active Status Set On (Old System)",
		"fieldtype": "Datetime",
		"read_only": 1,
		"no_copy": 1,
	},
]


def chain(fields, after):
	"""Place the fields one after another, the first one after the field named `after`."""
	placed = []
	for field in fields:
		placed.append({**field, "insert_after": after})
		after = field["fieldname"]
	return placed


def get_customer_fields():
	"""Return every custom field of Customer with its position on the form."""
	return chain(MAIN_TAB_FIELDS, "customer_name") + chain(OLD_SYSTEM_TAB_FIELDS, LAST_STANDARD_FIELD)


def setup_customer_fields():
	"""Create or update the custom fields on Customer. Runs after every `bench migrate`.

	To run it by hand:
	bench --site manav.local execute manav.manav.customer_fields.setup_customer_fields
	"""
	create_custom_fields({"Customer": get_customer_fields()}, update=True)
