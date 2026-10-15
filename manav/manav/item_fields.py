# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Custom fields that the Manav app adds to the inbuilt ERPNext Item doctype.

Working: Item belongs to ERPNext, so its JSON file must not be edited. The three extra fields the
old item master needs, and the Specifications field, are listed below and created as Custom Fields
by setup_item_fields(). That function is hooked to `after_migrate` in hooks.py, so every
`bench migrate` creates the missing fields and brings changed ones up to date. Specifications sits
below the item description; the other three sit in their own section "Old System Data" after it.

Every fieldname starts with `custom_` so it can never clash with a field ERPNext or another app adds
to Item later.

The old rate is kept as a plain number with its currency next to it, as a record of the old value.
The prices ERPNext uses are Item Price records, made by import_item_prices in import_legacy.py.

Created: 2026-10-12, when the old item and sub item masters were loaded into Item.

CHANGE NOTE
Date: 2026-10-12
Change: Added the Specifications field.
Reason: The printed quotation shows a list of specifications under each machine. With quotations now
made in ERPNext's Quotation, the list is kept on the Item and copied to the quotation line.

CHANGE NOTE
Date: 2026-10-13
Change: The help text of Specifications describes the lines "label : value || value" and
"#Title || Column 2 || Column 3".
Reason: The quotation now prints the specifications as a table of three columns, whose titles come
from the heading line (S.A.E. and Metric for Haas, Units and the model for Jagdeep).
"""

from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

ITEM_FIELDS = [
	{
		"fieldname": "custom_specifications",
		"label": "Specifications",
		"fieldtype": "Text",
		"insert_after": "description",
		"description": (
			"One specification per line; copied to a quotation line and printed as a table in"
			" place of the description. Write a line as: label : value || value."
			" Start a line with # for a heading (#Title || Column 2 || Column 3 also names the"
			" two value columns), with ! to print it bold."
			" A table copied from the maker's site can be pasted here and tidied with the"
			" Format buttons under Specifications"
		),
	},
	{
		"fieldname": "custom_old_system_section",
		"label": "Old System Data",
		"fieldtype": "Section Break",
		"insert_after": "custom_specifications",
		"collapsible": 1,
	},
	{
		"fieldname": "custom_quotation_type",
		"label": "Quotation Type",
		"fieldtype": "Link",
		"options": "Quotation Type",
		"insert_after": "custom_old_system_section",
		"in_standard_filter": 1,
		"description": "The principal / kind of goods the item belongs to",
	},
	{
		"fieldname": "custom_old_system_column",
		"fieldtype": "Column Break",
		"insert_after": "custom_quotation_type",
	},
	{
		"fieldname": "custom_old_rate",
		"label": "Rate (Old System)",
		"fieldtype": "Float",
		"precision": "2",
		"insert_after": "custom_old_system_column",
		"read_only": 1,
		"no_copy": 1,
	},
	{
		"fieldname": "custom_old_rate_currency",
		"label": "Rate Currency (Old System)",
		"fieldtype": "Data",
		"insert_after": "custom_old_rate",
		"read_only": 1,
		"no_copy": 1,
	},
]


def setup_item_fields():
	"""Create or update the custom fields on Item. Runs after every `bench migrate`.

	To run it by hand:
	bench --site manav.local execute manav.manav.item_fields.setup_item_fields
	"""
	create_custom_fields({"Item": ITEM_FIELDS}, update=True)
