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

CHANGE NOTE
Date: 2026-10-19
Change: Added the section "Sub-Items" (custom_sub_items_section) with an HTML field
(custom_sub_items_tree) at the foot of the Details tab, in which the Item form draws the
machine's sub-items as a tree (public/js/item.js; hidden for items without sub-items).
Reason: The user asked for the sub-items tree inside the Item form of that item.

CHANGE NOTE
Date: 2026-10-28
Change: Added "Magic Ref. Code" (custom_magic_ref_code) in "Old System Data": the item's code in
the old Magic item master (file 21_item_mst), filled once from that file. Shown in the form and
as a list filter, never printed (print_hide). Quotation Item fetches it (erpnext_fields.py).
Reason: The user asked for the old item codes to be on the doctypes, but not on the print.

CHANGE NOTE
Date: 2026-11-02
Change: Specifications (custom_specifications) is hidden on the Item form (hidden: 1); its values
stay in the database. The description is entered point by point instead ("Add points" under
Description, public/js/item.js).
Reason: The user asked to remove Specifications and to enter the description point-wise; the
quotation prints only the description.

CHANGE NOTE
Date: 2026-11-03
Change: The Details tab is shortened: ERPNext's sections "Item Attributes" and the allowances
section are collapsible (closed), and the Description section moves to its own tab "Description"
(custom_description_tab) with Brand hidden. "Old System Data" and "Sub-Items" now come before that
tab, so they stay on Details. All done with a Custom Field and property setters (ITEM_PROPERTIES).
Reason: The user asked to collapse those sections, to put the description in a tab and to remove
Brand from it.

CHANGE NOTE
Date: 2026-11-03
Change: The tab "Description" (custom_description_tab) is labelled "Standard Accessories"; the
Sub-Items section is a table with add and an Active switch (public/js/item.js, item_tree.py) and
is shown for every saved item.
Reason: The user asked to rename the machine description to Standard Accessories on the Item
form, and for the sub-items in table form with adding and activate / deactivate.

CHANGE NOTE
Date: 2026-11-03
Change: The Item's Description field is labelled "Standard Accessories" (property setter in
ITEM_PROPERTIES), like its tab.
Reason: The user asked for the field to be named Standard Accessories.

CHANGE NOTE
Date: 2026-11-04
Change: Added the HTML field custom_item_full_name at the top of the Description section (after
the hidden Brand), where public/js/item.js shows the item's full name above Standard Accessories.
Reason: The user asked for the full name of the item under Description.

CHANGE NOTE
Date: 2026-11-04
Change: The Description section (section_break_11) has no heading (label property setter).
Reason: The user asked to remove the "Description" heading above Item Name.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
from frappe.custom.doctype.property_setter.property_setter import make_property_setter

ITEM_FIELDS = [
	{
		"fieldname": "custom_specifications",
		"label": "Specifications",
		"fieldtype": "Text",
		"insert_after": "description",
		# 2026-11-02: hidden, the description is entered point by point instead
		"hidden": 1,
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
		# 2026-11-03: placed before the Description section (was after Specifications), so it stays
		# on the Details tab when Description gets its own tab
		"insert_after": "over_billing_allowance",
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
		# The code of the item in the old Magic item master; for reference only, never printed.
		"fieldname": "custom_magic_ref_code",
		"label": "Magic Ref. Code",
		"fieldtype": "Data",
		"insert_after": "custom_quotation_type",
		"in_standard_filter": 1,
		"no_copy": 1,
		"print_hide": 1,
		"description": "Code of the item in the old Magic item master",
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
	# A machine's sub-items, drawn as a tree by public/js/item.js (the section is hidden for items
	# without sub-items). After the last field of the Details tab, so it is the tab's last section.
	{
		"fieldname": "custom_sub_items_section",
		"label": "Sub-Items",
		"fieldtype": "Section Break",
		"insert_after": "custom_old_rate_currency",
	},
	{
		"fieldname": "custom_sub_items_tree",
		# 2026-11-03: a table with add and Active switch (item.js); was the tree
		"label": "Sub-Items",
		"fieldtype": "HTML",
		"insert_after": "custom_sub_items_section",
	},
	# 2026-11-03: the tab "Description" after the Sub-Items section: ERPNext's Description section
	# (section_break_11: Brand, Description) and Specifications follow it up to the Accounting tab.
	{
		"fieldname": "custom_description_tab",
		# 2026-11-03: was "Description" (the user's request)
		"label": "Standard Accessories",
		"fieldtype": "Tab Break",
		"insert_after": "custom_sub_items_tree",
	},
	# 2026-11-04: the item's full name (item_name) at the top of the Description section, above
	# Standard Accessories, drawn by public/js/item.js; an HTML field, so nothing is stored.
	{
		"fieldname": "custom_item_full_name",
		"label": "Item Name",
		"fieldtype": "HTML",
		"insert_after": "brand",
	},
]

# Changes to ERPNext's own Item fields, as Customize Form would make them (property setters):
# (fieldname, property, value, property type). Fieldnames checked on ERPNext 16.
ITEM_PROPERTIES = [
	# 2026-11-03: the sections "Item Attributes" and the over-delivery / over-billing allowances
	# start closed; the allowances section has no label in ERPNext and needs one to be collapsible.
	("section_break_zlmj", "collapsible", 1, "Check"),
	("section_break_znra", "label", "Allowances", "Data"),
	("section_break_znra", "collapsible", 1, "Check"),
	# 2026-11-03: in its own tab the Description section is always open; Brand is not used.
	("section_break_11", "collapsible", 0, "Check"),
	# 2026-11-04: no "Description" heading over the section; its tab already names it (the user's request)
	("section_break_11", "label", "", "Data"),
	("brand", "hidden", 1, "Check"),
	# 2026-11-03: the description field is the machine's standard accessories (the user's request);
	# only the label on the Item form changes, the field and the prints stay as they are
	("description", "label", "Standard Accessories", "Data"),
]


def setup_item_fields():
	"""Create or update the custom fields on Item. Runs after every `bench migrate`.

	To run it by hand:
	bench --site manav.local execute manav.manav.item_fields.setup_item_fields
	"""
	create_custom_fields({"Item": ITEM_FIELDS}, update=True)
	meta = frappe.get_meta("Item")
	for fieldname, prop, value, property_type in ITEM_PROPERTIES:
		# skip a field a later ERPNext version renames or drops, so migrate does not fail
		if meta.has_field(fieldname):
			make_property_setter("Item", fieldname, prop, value, property_type)
