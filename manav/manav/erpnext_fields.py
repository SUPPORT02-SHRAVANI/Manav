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

CHANGE NOTE
Date: 2026-10-17
Change: Quotation's custom_quotation_type is shown in the list view (in_list_view).
Reason: The user asked for the principal to be shown in colour in the Quotation list.

CHANGE NOTE
Date: 2026-10-19
Change: The description of Sub-Item Sr.No gives the new numbers (1.1, 1.2 ... under machine 1).
Reason: Sub-items are now numbered with their machine's number (quotation.number_sub_items).

CHANGE NOTE
Date: 2026-10-19
Change: Added Quotation's "Account Manager" (custom_account_manager, Link to User), filled from
the Customer's Account Manager (quotation.js party_name, and quotation.fill_account_manager on
validate).
Reason: The user asked for the Account Manager set on the Customer to appear on the quotation.
ERPNext's Quotation has no such field, and fetch_from cannot follow party_name (a Dynamic Link).

CHANGE NOTE
Date: 2026-10-19
Change: Added Sales Person's "Login User" (custom_user, Link to User, unique).
Reason: The user asked for the Account Manager to be put in Signed By too; Signed By is a Sales
Person, the Account Manager a User, and nothing on the site linked the two.

CHANGE NOTE
Date: 2026-10-28
Change: Added Quotation Item's "Magic Ref. Code" (custom_magic_ref_code), fetched from the Item,
read only and print_hide.
Reason: The user asked for the old Magic item codes on the doctypes, but not on the print.

CHANGE NOTE
Date: 2026-10-28
Change: Sales Order and Sales Order Item get the same custom fields as Quotation and Quotation Item
(ERPNEXT_FIELDS["Sales Order"] ...), Sub-Item Sr.No first in the PI's Items table too, and Sales
Order's default print format is Manav Proforma Invoice.
Reason: The user asked for Quotation -> Draft PI -> Final PI; the PI is ERPNext's Sales Order (chosen
by the user), and ERPNext's mapping copies fields of the same name from the quotation.

CHANGE NOTE
Date: 2026-10-28
Change: Added Quotation's "Branch" (custom_branch, Link to Branch); Sales Order gets it too.
Reason: The user asked for the branches Bangalore (head office), FTWZ, Chennai and Coimbatore.

CHANGE NOTE
Date: 2026-10-28
Change: Added Quotation's "Customer's Machine (Serial No)" (custom_machine_serial_no; Sales Order
gets it too); Serial No's Customer is editable (property setter).
Reason: The user asked for spare parts quotations for the machine the customer bought, and chose
ERPNext's Serial No as the record of the customer's machines.

CHANGE NOTE
Date: 2026-10-29
Change: Added Sales Order's "Draft PI No." (custom_draft_pi, Link to the Manav doctype Draft PI) and
Quotation's "Draft PI No." (custom_draft_pi_no); Quotation's "PI No." (custom_pi_no) is now labelled
"Final PI No.". Sales Order fields custom_pi_stage / custom_final_pi of an earlier version of the same
day are deleted where a site has them (OBSOLETE_FIELDS).
Reason: The user asked for the Draft PI as a separate document (not a Sales Order) before the Final
PI (the Sales Order), each with its own number and referring to the quotation and to the other
(pi.py).
Later the same day: Sales Order "Advance Received" (custom_advance_received) and "CIF"
(custom_is_cif), for the PI print (advance and CIF totals), and Quotation "CIF" (custom_is_cif),
at the user's request; then Quotation and Sales Order "CIF Charges" (custom_cif_charges) and "CIF
Port" (custom_cif_port), shown when CIF is ticked, Quotation's CIF moved under Customer Ref. Date.

CHANGE NOTE
Date: 2026-10-31
Change: Sales Order "Price Basis" (custom_price_basis), copied from the Draft PI.
Reason: The user asked for the old print's line under each machine, "Price EX-WORKS FTWZ
WAREHOUSE CHENNAI (1 NOS) ...... US$ 105100.00", on the Draft PI and the Final PI.

CHANGE NOTE
Date: 2026-11-02
Change: Sales Order "Price Type" (custom_price_type) and "Port" (custom_price_port), copied from the
Draft PI; "Price Basis" (custom_price_basis) is hidden and read only, kept for older PIs.
Reason: The user asked for EX-WORKS FTWZ WAREHOUSE CHENNAI as a default the user can set, filled in
as Price Type and Port like the old program's "Final price with".

CHANGE NOTE
Date: 2026-11-02
Change: A Quotation opens with "Manav Classic Quotation" (DEFAULT_QUOTATION_PRINT_FORMATS); Manav
Modern Quotation and Manav Sales Quotation stay as fallbacks and in the Print view.
Reason: The user asked for the quotation print to match the old one and to make it the default.

CHANGE NOTE
Date: 2026-11-02
Change: Quotation Item "Specifications" (custom_specifications) is hidden; the quotation prints only
the description.
Reason: The user asked to remove Specifications (Item form) and print only the description.

CHANGE NOTE
Date: 2026-11-03
Change: Added Sales Person's "Signature" (custom_signature, Attach Image), printed above the
signer's name on the quotation and PI prints.
Reason: The user asked for a signature of each user on the PDF (placeholder images for now).

CHANGE NOTE
Date: 2026-11-03
Change: Quotation's Principal (custom_quotation_type) is compulsory; Account Manager
(custom_account_manager) is hidden on Quotation and Sales Order, and ERPNext's Customer Account
Manager is hidden by a property setter; added "Print Signature" (custom_print_signature, ticked by
default) and "Magic Cust Code" (custom_magic_cust_code, the Customer's old-system code) on Quotation
and Sales Order.
Reason: The user asked for a compulsory quotation type, the Magic customer code on the quotation,
Account Manager removed everywhere, and a choice whether the print carries the signature.

CHANGE NOTE
Date: 2026-11-03
Change: Quotation and Sales Order "Ex-Works From" (custom_ex_works_from), shown when CIF is ticked;
CIF Port is described as where the CIF charges run to.
Reason: The user showed the old CIF print: "Prices : Ex-Works, Oxnard, USA." and "CIF Charges upto
FTWZ Chennai ...... amount".

CHANGE NOTE
Date: 2026-11-04
Change: The CIF tick (custom_is_cif) of Quotation and Sales Order is hidden and CIF Charges, CIF
Port and Ex-Works From are always shown (depends_on cleared); the tick is set on saving from CIF
Charges (quotation.fill_cif_defaults). Added the HTML field custom_standard_accessories under the
Items of both, for the Standard Accessories table (public/js/standard_accessories.js).
Reason: The user asked to remove the CIF tick and show its fields directly, and for the Standard
Accessories table on the Quotation, Draft PI and Final PI.

CHANGE NOTE
Date: 2026-11-04
Change: Quotation "Price Type" (custom_price_type) and "Port" (custom_price_port), printed in the
quotation's price line instead of the fixed EX-WORKS FTWZ WAREHOUSE CHENNAI.
Reason: The user asked for that text not to be fixed; it is typed on the quotation.
Later the same day: Price Type is dropped again (OBSOLETE_FIELDS); the line is "Price <Ex-Works From>
<Port>", as the user showed with the old program's Price Type / Port.

CHANGE NOTE
Date: 2026-11-04
Change: Quotation print formats "Quotation Modern", "Quotation Modern with Images" (ERPNext) and
"Manav Sales Quotation" are disabled after every migrate (HIDDEN_PRINT_FORMATS); Manav Sales
Quotation is no longer a default fallback.
Reason: The user crossed them out of the Print view's list.

CHANGE NOTE
Date: 2026-11-12
Change: On the Quotation, "Machine Number" (custom_machine_number), "Customer's Machine (Serial No)"
(custom_machine_serial_no) and "CIF Port" (custom_cif_port) are hidden. Their columns and values
stay. CIF Port is still filled from the principal's default (else FTWZ Chennai, quotation.fill_cif_defaults)
and printed in "CIF Charges - <port>". The Final PI (Sales Order) keeps its CIF Port.
Reason: The user asked to remove these fields from the quotation; the quotation already has a Port.

CHANGE NOTE
Date: 2026-11-13
Change: Each of Quotation, Draft PI and Final PI (Sales Order) keeps three print formats: Classic,
with HSN Code and Modern. Disabled after every migrate (HIDDEN_PRINT_FORMATS): Manav Banded /
Colour Quotation, Manav Quotation Classic / Bordered, Manav Draft PI, Manav Proforma Invoice
(replaced by Draft PI / Proforma Invoice with HSN Code, the same print) and ERPNext's four Sales
Order formats (later the same day also ERPNext's "Proforma Invoice"). The Final PI opens with "Proforma
Invoice with HSN Code" (DEFAULT_PI_PRINT_FORMAT). Print Settings "Print the PDF" is switched on, so
that the Print button prints the server's PDF (head and page number on every page).
Reason: The user asked for only those three formats on the quotation, the Draft PI and the Final PI.
"""

import json

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
from frappe.custom.doctype.property_setter.property_setter import make_property_setter

# The print format a Quotation opens with: the first of these that is on the site.
# 2026-11-02: Manav Classic Quotation first (the old print's layout and calculation, the user's
# choice); before: Manav Modern Quotation, then Manav Sales Quotation.
# 2026-11-04: Manav Sales Quotation is no longer a fallback (it is disabled, HIDDEN_PRINT_FORMATS).
DEFAULT_QUOTATION_PRINT_FORMATS = ("Manav Classic Quotation", "Manav Modern Quotation")

# 2026-11-04: Quotation print formats the user does not want in the Print view: ERPNext's "Quotation
# Modern" and "Quotation Modern with Images", and Manav Sales Quotation (older layout). Disabled by
# setup_erpnext_fields. Frappe's built-in "Standard" is left out of the list by
# public/js/manav_print_sidebar.js, as it is not a record.
HIDDEN_PRINT_FORMATS = (
	"Quotation Modern",
	"Quotation Modern with Images",
	"Manav Sales Quotation",
	# 2026-11-04 (later): replaced by Manav Quotation Classic / Manav Quotation Bordered, the same
	# layouts with the Standard Accessories under the Items (the print view shows them as
	# "Quotation Classic" / "Quotation Bordered", without "Manav")
	"Quotation Classic",
	"Quotation Bordered",
	# 2026-11-13: three formats per document (Classic, with HSN Code, Modern), the user's request
	"Manav Banded Quotation",
	"Manav Colour Quotation",
	"Manav Quotation Classic",
	"Manav Quotation Bordered",
	# replaced by "Draft PI with HSN Code" / "Proforma Invoice with HSN Code" (the same print)
	"Manav Draft PI",
	"Manav Proforma Invoice",
	# ERPNext's own Sales Order formats
	"Sales Order Bordered",
	"Sales Order Classic",
	"Sales Order Modern",
	"Sales Order Modern with Images",
	# 2026-11-13 (later): ERPNext's own "Proforma Invoice" of the Sales Order (on the live site)
	"Proforma Invoice",
)

ERPNEXT_FIELDS = {
	"Quotation": [
		{
			"fieldname": "custom_quotation_type",
			"label": "Principal (Quotation Type)",
			"fieldtype": "Link",
			"options": "Quotation Type",
			"insert_after": "order_type",
			"in_standard_filter": 1,
			# a column of the Quotation list, drawn in the principal's colour (quotation_list.js)
			"in_list_view": 1,
			# 2026-11-03: compulsory on the quotation (the user's request); not on the PI (below)
			"reqd": 1,
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
			# Filled from the Customer's Account Manager (a User), see quotation.fill_account_manager.
			"fieldname": "custom_account_manager",
			"label": "Account Manager",
			"fieldtype": "Link",
			"options": "User",
			"insert_after": "custom_sales_engineer",
			# 2026-11-03: hidden (the user asked to remove Account Manager everywhere); still filled
			# from the Customer, as the Manav dashboard uses it to find a user's quotations
			"hidden": 1,
			"description": "Taken from the Customer's Account Manager",
		},
		{
			# 2026-11-03: untick to print the quotation / PI without the signer's signature image
			"fieldname": "custom_print_signature",
			"label": "Print Signature",
			"fieldtype": "Check",
			"default": "1",
			"allow_on_submit": 1,
			# 2026-11-12: hidden on the form; asked on the print page only (the "Print Signature"
			# switch of manav_print_sidebar.js sets this field). The user asked not to be asked for
			# the signature in the quotation, only when printing.
			"hidden": 1,
			"insert_after": "custom_account_manager",
			"description": "Untick to print without the signature",
		},
		{
			"fieldname": "custom_manav_column_2",
			"fieldtype": "Column Break",
			"insert_after": "custom_print_signature",
		},
		{
			"fieldname": "custom_haas_customer_id",
			"label": "Haas Cust ID",
			"fieldtype": "Data",
			"insert_after": "custom_manav_column_2",
			"description": "Printed as Cust ID",
		},
		{
			# 2026-11-03: the customer's code in the old (Magic) system, Customer.custom_customer_code;
			# filled when the customer is chosen (quotation.js) and on saving (quotation.fill_account_manager)
			"fieldname": "custom_magic_cust_code",
			"label": "Magic Cust Code",
			"fieldtype": "Data",
			"read_only": 1,
			"insert_after": "custom_haas_customer_id",
			"description": "The customer's code in the old system",
		},
		{
			"fieldname": "custom_machine_number",
			"label": "Machine Number",
			"fieldtype": "Data",
			"insert_after": "custom_haas_customer_id",
			# 2026-11-12: hidden (the user's request); the value is kept
			"hidden": 1,
		},
		{
			# The customer's machine, kept as an ERPNext Serial No (machine model + customer). On a
			# spares quotation it offers that model's spare parts (quotation.js). (2026-10-28)
			"fieldname": "custom_machine_serial_no",
			"label": "Customer's Machine (Serial No)",
			"fieldtype": "Link",
			"options": "Serial No",
			"insert_after": "custom_machine_number",
			"description": "For spares: the customer's machine; \"Spares for Machine\" then offers its spare parts",
			# 2026-11-12: hidden (the user's request); without a machine the "Spares for Machine"
			# button is not shown, spares are added through a line's Item Code
			"hidden": 1,
		},
		{
			# The Manav branch the quotation (and the PI made from it) belongs to (branches.py).
			"fieldname": "custom_branch",
			"label": "Branch",
			"fieldtype": "Link",
			"options": "Branch",
			"insert_after": "custom_machine_serial_no",
			"in_standard_filter": 1,
			"description": "Manav Marketing - Bangalore (head office), FTWZ, Chennai or Coimbatore",
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
			# The item's code in the old Magic item master (Item.custom_magic_ref_code); shown, not printed.
			"fieldname": "custom_magic_ref_code",
			"label": "Magic Ref. Code",
			"fieldtype": "Data",
			"insert_after": "custom_main_item_code",
			"fetch_from": "item_code.custom_magic_ref_code",
			"read_only": 1,
			"print_hide": 1,
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
			"description": "Number of a sub-item under its machine: 1.1, 1.2 ... under machine 1; set on saving",
		},
		{
			"fieldname": "custom_specifications",
			"label": "Specifications",
			"fieldtype": "Text",
			"insert_after": "description",
			# 2026-11-02: hidden; the quotation prints only the description (no specifications)
			"hidden": 1,
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
		{
			# The login of this sales person: a quotation whose Account Manager is this user gets
			# this sales person in Signed By (quotation.sales_person_for_user).
			"fieldname": "custom_user",
			"label": "Login User",
			"fieldtype": "Link",
			"options": "User",
			"insert_after": "custom_employee_code",
			"unique": 1,
			"in_standard_filter": 1,
			"description": "The user who logs in as this sales person; fills Signed By on quotations",
		},
		{
			# 2026-11-03: printed above the name of the signing person (Signed By) on the quotation
			# and PI prints (q.signature in the print data templates).
			"fieldname": "custom_signature",
			"label": "Signature",
			"fieldtype": "Attach Image",
			"insert_after": "custom_user",
			"description": "Image of the signature, printed above the name on quotations and PIs this person signs",
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

# Sales Order is the PI: a Draft PI while it is not submitted (items and sub-items can be changed),
# the Final PI once submitted. (Since 2026-10-29 the Sales Order is the Final PI only and the Draft
# PI is the Manav doctype "Draft PI"; its fields have the same names, so they copy by name.) It is made from a submitted Quotation by ERPNext's own mapping, which
# copies every field of the same name, so Sales Order and Sales Order Item get the same fields as
# Quotation and Quotation Item: principal, references, signing persons, sub-item links. (2026-10-28)
ERPNEXT_FIELDS["Sales Order"] = [dict(field) for field in ERPNEXT_FIELDS["Quotation"]]
ERPNEXT_FIELDS["Sales Order Item"] = [dict(field) for field in ERPNEXT_FIELDS["Quotation Item"]]
for _field in ERPNEXT_FIELDS["Sales Order"]:
	if _field["fieldname"] == "custom_quotation_type":
		_field["description"] = "The principal, copied from the quotation"
		# 2026-11-03: compulsory on the quotation only; a PI keeps what its quotation had
		_field.pop("reqd", None)
	elif _field["fieldname"] == "custom_signed_by":
		_field["description"] = "Signs the PI"

# The PI and its quotation refer to each other (pi.py). Added after the copy above, so that each
# field is only on its own doctype. (2026-10-28)
ERPNEXT_FIELDS["Sales Order"].append(
	{
		"fieldname": "custom_quotation",
		"label": "Quotation No.",
		"fieldtype": "Link",
		"options": "Quotation",
		# 2026-10-28: right under Customer at the top of the PI (was in Manav Details, after Branch),
		# at the user's request
		"insert_after": "customer",
		"read_only": 1,
		"no_copy": 1,
		"in_standard_filter": 1,
		"description": "The quotation this PI was made from (set on saving)",
	}
)
# 2026-10-29: the Final PI (Sales Order) refers to the Draft PI (Manav doctype "Draft PI") it was
# made from; set by pi.make_final_pi, so read only. Kept on an amended Final PI (not no_copy).
ERPNEXT_FIELDS["Sales Order"].append(
	{
		"fieldname": "custom_draft_pi",
		"label": "Draft PI No.",
		"fieldtype": "Link",
		"options": "Draft PI",
		"insert_after": "custom_quotation",
		"read_only": 1,
		"in_standard_filter": 1,
		"description": "The Draft PI this Final PI was made from",
	}
)

# 2026-10-29: an advance typed by hand (from the Draft PI, or here), printed as "Less: Advance
# Received" before the BALANCE. ERPNext's own Advance Paid (Payment Entries against the Sales
# Order) is printed instead when there is one (manav_proforma_invoice.html).
ERPNEXT_FIELDS["Sales Order"].append(
	{
		"fieldname": "custom_advance_received",
		"label": "Advance Received",
		"fieldtype": "Currency",
		"options": "currency",
		"insert_after": "custom_draft_pi",
		"allow_on_submit": 1,
		"no_copy": 1,
		"description": "Advance typed by hand, in this PI's currency, printed as Less: Advance Received."
		" A Payment Entry against this Sales Order (Advance Paid) is printed instead when there is one",
	}
)

# 2026-10-29: CIF prices; the PI print then labels its total "TOTAL (CIF)" / "BALANCE (CIF)"
# (manav_proforma_invoice.html). Copied from the Draft PI by pi.make_final_pi.
ERPNEXT_FIELDS["Sales Order"].append(
	{
		"fieldname": "custom_is_cif",
		"label": "CIF",
		"fieldtype": "Check",
		"insert_after": "custom_advance_received",
		# 2026-11-04: hidden (the user's request); set on saving from CIF Charges (an amount = CIF)
		"hidden": 1,
		"allow_on_submit": 1,
		"description": "Prices are CIF: the print's total reads TOTAL (CIF) / BALANCE (CIF)",
	}
)
# 2026-10-29 (later): CIF Charges and Port, as on the quotation; copied from the Draft PI.
ERPNEXT_FIELDS["Sales Order"].extend(
	[
		{
			"fieldname": "custom_cif_charges",
			"label": "CIF Charges",
			"fieldtype": "Currency",
			"options": "currency",
			"insert_after": "custom_is_cif",
			"allow_on_submit": 1,
			# 2026-11-04: always shown (was only when CIF was ticked)
			"depends_on": "",
			"description": "Printed as CIF Charges - <port> and added to the printed total",
		},
		{
			"fieldname": "custom_cif_port",
			"label": "CIF Port",
			"fieldtype": "Data",
			"insert_after": "custom_cif_charges",
			"allow_on_submit": 1,
			# 2026-11-04: always shown (was only when CIF was ticked)
			"depends_on": "",
			# 2026-11-04: printed "CIF Charges - <port>" (was "upto <port>")
			"description": "Printed as CIF Charges - <port>, e.g. Chennai Sea Port",
		},
		{
			# 2026-11-03: printed as "Prices : Ex-Works, <this>." on a CIF print; copied from the Draft PI
			"fieldname": "custom_ex_works_from",
			"label": "Ex-Works From",
			"fieldtype": "Data",
			"insert_after": "custom_cif_port",
			"allow_on_submit": 1,
			# 2026-11-04: always shown (was only when CIF was ticked)
			"depends_on": "",
			"description": "Printed as Prices : Ex-Works, <this>. e.g. Oxnard, USA",
		},
	]
)
# 2026-10-31: printed under each machine as "Price <this> (1 NOS) ...... US$ <amount>"
# (manav_proforma_invoice.html); copied from the Draft PI, filled by pi.fill_price_basis.
ERPNEXT_FIELDS["Sales Order"].append(
	{
		"fieldname": "custom_price_basis",
		"label": "Price Basis (old)",
		"fieldtype": "Data",
		"insert_after": "custom_cif_port",
		"allow_on_submit": 1,
		# 2026-11-02: replaced by Price Type and Port; moved into Price Type by pi.fill_price_basis
		"hidden": 1,
		"read_only": 1,
		"description": "Price Basis of a PI saved before 2026-11-02; moved into Price Type when the PI is"
		" saved again",
	}
)
# 2026-11-02: the price basis in two parts, as the old program's "Final price with: Price Type /
# Port"; copied from the Draft PI, filled by pi.fill_price_basis, printed joined.
ERPNEXT_FIELDS["Sales Order"].extend(
	[
		{
			"fieldname": "custom_price_type",
			"label": "Price Type",
			"fieldtype": "Data",
			"insert_after": "custom_price_basis",
			"allow_on_submit": 1,
			"description": "Final price with: printed once before the total as Price <Price Type> <Port> (qty)"
			" ...... total. Filled with the principal's Price Basis, else EX-WORKS FTWZ; can be changed",
		},
		{
			"fieldname": "custom_price_port",
			"label": "Port",
			"fieldtype": "Data",
			"insert_after": "custom_price_type",
			"allow_on_submit": 1,
			"description": "Printed after the Price Type, e.g. WAREHOUSE CHENNAI (the default); can be"
			" changed or left empty",
		},
	]
)

# Custom fields of an earlier 2026-10-29 version, in which Draft PI and Final PI were both Sales
# Orders; removed by setup_erpnext_fields when a site has them.
OBSOLETE_FIELDS = {"Sales Order": ("custom_pi_stage", "custom_final_pi")}

ERPNEXT_FIELDS["Quotation"].extend(
	[
		{
			"fieldname": "custom_draft_pi_no",
			"label": "Draft PI No.",
			"fieldtype": "Link",
			"options": "Draft PI",
			"insert_after": "custom_branch",
			"read_only": 1,
			"no_copy": 1,
			"allow_on_submit": 1,
			"description": "The Draft PI made from this quotation; all PIs are under Connections",
		},
		{
			"fieldname": "custom_pi_no",
			# 2026-10-29: "Final PI No." (was "PI No." while the Sales Order was both Draft and Final PI)
			"label": "Final PI No.",
			"fieldtype": "Link",
			"options": "Sales Order",
			"insert_after": "custom_draft_pi_no",
			"read_only": 1,
			"no_copy": 1,
			"allow_on_submit": 1,
			"description": "The Final PI (the order) made from this quotation's Draft PI",
		},
	]
)

# 2026-10-29: CIF prices on the quotation too; copied to the Draft PI (is_cif) by pi.make_draft_pi
# and printed by Manav Modern Quotation as "GRAND TOTAL (CIF)". Added after the Sales Order copy
# above, which has its own custom_is_cif.
# 2026-10-29 (later): under Customer Ref. Date (was after Final PI No.), and when ticked "CIF
# Charges" and "CIF Port": the prints add the line "CIF Charges - <port>" and that amount to the
# grand total (the old system's "CIF Charges - Chennai Sea Port ... US$ 5500.00"). The amount is
# printed only: ERPNext's own totals of the document do not include it.
ERPNEXT_FIELDS["Quotation"].extend(
	[
		{
			"fieldname": "custom_is_cif",
			"label": "CIF",
			"fieldtype": "Check",
			"insert_after": "custom_your_reference_date",
			# 2026-11-04: hidden (the user's request); set on saving from CIF Charges (an amount = CIF)
			"hidden": 1,
			"description": "Prices are CIF: the print's total reads GRAND TOTAL (CIF); copied to the Draft PI",
		},
		{
			"fieldname": "custom_cif_charges",
			"label": "CIF Charges",
			"fieldtype": "Currency",
			"options": "currency",
			"insert_after": "custom_is_cif",
			# 2026-11-04: always shown (was only when CIF was ticked)
			"depends_on": "",
			"description": "Printed as CIF Charges - <port> and added to the printed grand total",
		},
		{
			"fieldname": "custom_cif_port",
			"label": "CIF Port",
			"fieldtype": "Data",
			"insert_after": "custom_cif_charges",
			# 2026-11-04: always shown (was only when CIF was ticked)
			"depends_on": "",
			# 2026-11-04: printed "CIF Charges - <port>" (was "upto <port>")
			"description": "Printed as CIF Charges - <port>, e.g. Chennai Sea Port",
			# 2026-11-12: hidden on the quotation (the user's request: the quotation already has a
			# Port); still filled from the principal's default and printed (fill_cif_defaults)
			"hidden": 1,
		},
		{
			# 2026-11-03: the place the price is ex-works from, printed as "Prices : Ex-Works, <this>."
			# on a CIF print (the old system's print); filled from the principal (quotation.fill_cif_defaults)
			"fieldname": "custom_ex_works_from",
			"label": "Ex-Works From",
			"fieldtype": "Data",
			"insert_after": "custom_cif_port",
			# 2026-11-04: always shown (was only when CIF was ticked)
			"depends_on": "",
			# 2026-11-04: on every quotation the start of the price line (was the CIF line only)
			"description": "Printed as Price <Ex-Works From> <Port> (qty) ...... amount, e.g. EX-WORKS FTWZ."
			" Filled with the principal's default; can be changed",
		},
	]
)

# 2026-11-04: the price line of the quotation print, "Price <Ex-Works From> <Port> (1 NOS) ......
# amount", typed on the quotation (no fixed text; the user's request, as the old program's "Final
# price with: Price Type / Port"). The same fieldname as the PI's Port, so make_draft_pi copies it.
# (A Quotation "Price Type" added earlier the same day is replaced by Ex-Works From; OBSOLETE_FIELDS.)
ERPNEXT_FIELDS["Quotation"].extend(
	[
		{
			"fieldname": "custom_price_port",
			"label": "Port",
			"fieldtype": "Data",
			"insert_after": "custom_ex_works_from",
			"description": "Printed after Ex-Works From, e.g. WAREHOUSE CHENNAI; can be left empty",
		},
	]
)
OBSOLETE_FIELDS["Quotation"] = ("custom_price_type",)

# 2026-11-04: the Standard Accessories table right under the Items (each machine line's points),
# drawn by public/js/standard_accessories.js; an HTML field, so nothing is stored.
for _doctype in ("Quotation", "Sales Order"):
	ERPNEXT_FIELDS[_doctype].append(
		{
			"fieldname": "custom_standard_accessories",
			"label": "Standard Accessories",
			"fieldtype": "HTML",
			"insert_after": "items",
		}
	)

# The print format a Sales Order (PI) opens with, when it is on the site.
# 2026-11-13: was "Manav Proforma Invoice" (now disabled); the same print under its new name
DEFAULT_PI_PRINT_FORMAT = "Proforma Invoice with HSN Code"


def setup_erpnext_fields():
	"""Create or update the custom fields above. Runs after every `bench migrate`.

	A doctype that is not on the site (ERPNext not installed) is left out.

	To run it by hand:
	bench --site manav.local execute manav.manav.erpnext_fields.setup_erpnext_fields
	"""
	fields = {dt: f for dt, f in ERPNEXT_FIELDS.items() if frappe.db.exists("DocType", dt)}
	create_custom_fields(fields, update=True)
	# 2026-10-29: fields no longer used (see OBSOLETE_FIELDS) are taken off the form
	for doctype, fieldnames in OBSOLETE_FIELDS.items():
		for fieldname in fieldnames:
			custom_field = frappe.db.get_value("Custom Field", {"dt": doctype, "fieldname": fieldname})
			if custom_field:
				frappe.delete_doc("Custom Field", custom_field, ignore_permissions=True)
	for item_doctype in ("Quotation Item", "Sales Order Item"):
		if item_doctype in fields:
			place_sub_item_no_first(item_doctype)

	# 2026-10-28: a customer's machine is an ERPNext Serial No. ERPNext fills its Customer only when
	# the machine is delivered through a Delivery Note; machines sold before ERPNext are entered by
	# hand, so Customer is made editable (as Customize Form would, a property setter).
	if frappe.db.exists("DocType", "Serial No"):
		make_property_setter("Serial No", "customer", "read_only", 0, "Check")
		make_property_setter("Serial No", "customer", "in_standard_filter", 1, "Check")

	# 2026-10-28: the Quotation form shows no Total Taxes and Charges and no Totals section (Grand
	# Total, Rounding Adjustment, Rounded Total, In Words, Disable Rounded Total), at the user's
	# request. Only the two sections are hidden: ERPNext still works the totals out, and the print
	# formats show what they show. Section names checked on ERPNext 16.
	if "Quotation" in fields:
		for section in ("section_break_39", "totals"):
			make_property_setter("Quotation", section, "hidden", 1, "Check")

	# 2026-11-03: ERPNext's Account Manager of the Customer is hidden (the user asked to remove
	# Account Manager everywhere); its value is kept.
	if frappe.db.exists("DocType", "Customer") and frappe.get_meta("Customer").has_field("account_manager"):
		make_property_setter("Customer", "account_manager", "hidden", 1, "Check")

	# 2026-10-28: no Delivery Date on the PI (the user's request). ERPNext's field is hidden on the
	# Sales Order and its lines; pi.fill_delivery_date sets it to the PI's date, as ERPNext needs one.
	if "Sales Order" in fields:
		make_property_setter("Sales Order", "delivery_date", "hidden", 1, "Check")
		make_property_setter("Sales Order", "delivery_date", "in_list_view", 0, "Check")
	if "Sales Order Item" in fields:
		make_property_setter("Sales Order Item", "delivery_date", "hidden", 1, "Check")
		make_property_setter("Sales Order Item", "delivery_date", "in_list_view", 0, "Check")

	# 2026-10-28: the PI opens with its own print format
	if "Sales Order" in fields and frappe.db.exists("Print Format", DEFAULT_PI_PRINT_FORMAT):
		make_property_setter(
			"Sales Order", None, "default_print_format", DEFAULT_PI_PRINT_FORMAT, "Data", for_doctype=True
		)

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

	# 2026-11-04: print formats taken out of the Quotation's Print view (the user's request):
	# disabled, so Frappe no longer lists them; the records stay. ERPNext's own formats are not
	# edited in their files: the flag is set again after every migrate, in case an ERPNext update
	# brings them back.
	for print_format in HIDDEN_PRINT_FORMATS:
		if frappe.db.get_value("Print Format", print_format, "disabled") == 0:
			frappe.db.set_value("Print Format", print_format, "disabled", 1, update_modified=False)

	# 2026-11-13: Print Settings "Print the PDF" on: the Print button prints the PDF made on the
	# server (letter head, the Classic head box and "Page n of m" on every page) instead of the
	# browser's own print of the page, which repeats a head only while it is under about a quarter
	# of the page and so left the first page empty and no head on the others. Frappe's own setting.
	if frappe.get_meta("Print Settings").has_field("print_generated_pdf"):
		frappe.db.set_single_value("Print Settings", "print_generated_pdf", 1)


def place_sub_item_no_first(doctype="Quotation Item"):
	"""Put Sub-Item Sr.No in front of Item Code, so the Items table shows it right after No.
	(doctype: Quotation Item, or Sales Order Item for the PI since 2026-10-28.)

	The Items table shows its columns in the order of the fields. Item Code is ERPNext's first
	field of Quotation Item and a custom field can only be placed after a field, so the order is
	set with a `field_order` property setter, as Customize Form does; fields ERPNext adds later
	still find their place (Frappe's Meta.sort_fields). Quantity is narrowed from 2 to 1 column so
	that the table keeps its width (Frappe's grid shares about 11 column units between No. and the
	other columns, and Item Code, Quantity, Rate and Amount took them all; Quantity shows short
	figures).
	"""
	frappe.clear_cache(doctype=doctype)
	order = [df.fieldname for df in frappe.get_meta(doctype).fields]
	if order and order[0] != "custom_sub_item_sr_no":
		order.remove("custom_sub_item_sr_no")
		order = json.dumps(["custom_sub_item_sr_no", *order])
		make_property_setter(doctype, None, "field_order", order, "Data", for_doctype=True)
	make_property_setter(doctype, "qty", "columns", 1, "Int")
	frappe.clear_cache(doctype=doctype)
