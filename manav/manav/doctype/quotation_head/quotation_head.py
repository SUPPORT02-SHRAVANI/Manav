# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Quotation Head: one quotation, old or new: customer, references, address, items, options, amounts,
taxes and terms.

Working: the fields are defined in quotation_head.json. It is called Quotation Head because ERPNext
already has a doctype named Quotation. The customer name and address are a copy taken when the
quotation was made, so they are stored here and not read from the Customer.

Making a new quotation (the screen logic is in quotation_head.js):
1. The employee picks the Quotation Type (the principal / kind of goods). Its currency, number
   series, signing employee and standard terms are copied in (get_type_defaults).
2. They pick the Customer. Its code, name, address and region are copied in (get_customer_details).
3. They add items; only Quotation Item Master records of that Quotation Type can be chosen. The
   standard specifications of the item are copied into the Specifications table
   (get_item_specifications); they are printed under the item.
4. They add options and specifications; only Quotation Sub Item Master records of the items on the
   quotation can be chosen (get_sub_items feeds the "Add Options" window).
5. On save the amounts are calculated (set_amounts) and the quotation gets its number (autoname).

The old quotations are loaded by manav/manav/import_legacy.py. They come with their number and their
amounts and have no item rows, so neither autoname nor set_amounts changes them.

Created: 2026-10-12, from the old table "Quotation Head".

CHANGE NOTE
Date: 2026-10-12
Change: Added the quotation number, the amount calculation and the helper functions the form uses.
Reason: Employees have to make new quotations here by picking the Quotation Type (principal), the
items and their options; before this the doctype only stored the old quotations.

CHANGE NOTE
Date: 2026-10-12
Change: Added set_employee_names and get_item_specifications; get_customer_details also returns the
Haas Cust ID.
Reason: The old entry screen and printed quotation show the name of the signing employee and of the
sales engineer, the customer's Haas ID and a specification list under each item.

CHANGE NOTE
Date: 2026-10-13
Change: The default print format (quotation_head.json) is "Manav Modern Quotation Head"; before it
was "Manav Quotation", which stays selectable in the print window. No logic here changed.
Reason: The user asked for the new quotation layout on all quotations, the old ones included.
"""

import json

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, flt, getdate, nowdate


class QuotationHead(Document):
	"""One quotation: header, items, options, taxes and terms."""

	def autoname(self):
		"""Name the quotation by its Quotation No, making a new number when there is none yet.

		The old numbers look like 26QP000638: the first two digits are the financial year (April to
		March) the quotation date falls in, then the two letters of the series, then a six digit
		running number that starts again for every year and series.
		"""
		if not self.quotation_no:
			series = self.number_series or frappe.db.get_value(
				"Quotation Type", self.quotation_type, "number_series"
			)
			if not series:
				frappe.throw(
					_("Enter the Quotation No Series, or set it on Quotation Type {0}.").format(
						self.quotation_type
					)
				)
			self.number_series = series.strip().upper()
			date = getdate(self.quotation_date or nowdate())
			financial_year = date.year if date.month >= 4 else date.year - 1
			prefix = f"{financial_year % 100:02d}{self.number_series}"
			self.quotation_no = f"{prefix}{last_number(prefix) + 1:06d}"
		self.name = self.quotation_no

	def validate(self):
		self.set_employee_names()
		self.set_amounts()

	def set_employee_names(self):
		"""Fill Signed By and Sales Engineer with the names of the two employee codes.

		The codes are plain text because the old quotations use some codes that are not in Employee
		Master; for such a code the name is left empty and the print shows the code.
		"""
		for code_field, name_field in (
			("signature_one_code", "signed_by_name"),
			("signature_two_code", "sales_engineer_name"),
		):
			code = self.get(code_field)
			name = frappe.db.get_value("Employee Master", code, "employee_name") if code else None
			self.set(name_field, name)

	def set_amounts(self):
		"""Calculate the row amounts, the totals, the tax amounts and the final amount.

		Only done when the quotation has item or option rows. The old quotations were loaded with
		their amounts but without item rows; calculating would set their totals to zero.

		Final Amount = Quotation Amount + the three tax amounts + Freight. This is the rule every
		old quotation follows. Each tax amount is its percentage of the Quotation Amount.
		"""
		if not self.items and not self.sub_items:
			return

		total = 0
		for row in [*self.items, *self.sub_items]:
			row.amount = flt(flt(row.qty) * flt(row.rate), 2)
			total += row.amount

		self.item_total = flt(total, 2)
		self.quotation_amount = self.item_total
		self.sales_tax_amount = flt(self.quotation_amount * flt(self.sales_tax_percent) / 100, 2)
		self.sc_on_sales_tax_amount = flt(self.quotation_amount * flt(self.sc_on_sales_tax_percent) / 100, 2)
		self.sc_on_taxable_amount = flt(self.quotation_amount * flt(self.sc_on_taxable_percent) / 100, 2)
		self.final_amount = flt(
			self.quotation_amount
			+ self.sales_tax_amount
			+ self.sc_on_sales_tax_amount
			+ self.sc_on_taxable_amount
			+ flt(self.freight),
			2,
		)


def last_number(prefix):
	"""Return the highest running number used with this year + series prefix, 0 when there is none."""
	# All numbers of one prefix have the same length, so the highest name is the highest number.
	last = frappe.db.sql(
		"select max(name) from `tabQuotation Head` where name like %s and char_length(name) = %s",
		(prefix + "%", len(prefix) + 6),
	)[0][0]
	return cint(last[len(prefix) :]) if last else 0


@frappe.whitelist()
def get_type_defaults(quotation_type):
	"""Return what a quotation takes from its Quotation Type (the principal).

	That is the currency, the letter head, the number series, the signing employee and the
	standard terms.

	CHANGE NOTE
	Date: 2026-10-12
	Change: The letter head is returned too.
	Reason: Each principal has its own header, which has to be applied when the principal is chosen.
	"""
	doc = frappe.get_doc("Quotation Type", quotation_type)
	doc.check_permission("read")
	return {
		"currency": doc.currency_code,
		"number_series": doc.number_series,
		"letter_head": doc.letter_head,
		"signature_one_code": doc.signed_by_code,
		"terms": [
			{
				"term_type": t.term_type,
				"term_desc": t.term_desc,
				"sr_no": t.sr_no,
				"description": t.description,
			}
			for t in doc.terms
		],
	}


@frappe.whitelist()
def get_customer_details(customer):
	"""Return the customer's old code, name, region and primary address for a new quotation."""
	frappe.has_permission("Customer", "read", customer, throw=True)
	fields = ["customer_name", "customer_primary_address"]
	# The custom fields are created by manav/manav/customer_fields.py on bench migrate.
	meta = frappe.get_meta("Customer")
	custom = {
		"customer_code": "custom_customer_code",
		"haas_customer_id": "custom_haas_customer_id",
		"region_zone": "custom_region_zone",
		"region_state_code": "custom_region_state_code",
		"region_city_code": "custom_region_city_code",
	}
	custom = {target: source for target, source in custom.items() if meta.has_field(source)}
	values = frappe.db.get_value("Customer", customer, fields + list(custom.values()), as_dict=True)

	details = {"customer_name": values.customer_name}
	for target, source in custom.items():
		details[target] = values.get(source)

	if values.customer_primary_address:
		address = frappe.db.get_value(
			"Address",
			values.customer_primary_address,
			["address_line1", "address_line2", "city", "state", "pincode"],
			as_dict=True,
		)
		if address:
			details.update(
				{
					"address_1": address.address_line1,
					"address_2": address.address_line2,
					"address_3": None,
					"city": address.city,
					"state": address.state,
					"pin": address.pincode,
				}
			)
	return details


@frappe.whitelist()
def get_item_specifications(item):
	"""Return the Standard Specifications of a Quotation Item Master record, in their order."""
	frappe.has_permission("Quotation Item Master", "read", item, throw=True)
	return frappe.get_all(
		"Quotation Item Specification",
		filters={"parent": item, "parenttype": "Quotation Item Master"},
		fields=["specification", "highlight"],
		order_by="idx asc",
	)


@frappe.whitelist()
def get_sub_items(main_item_codes):
	"""Return the options (Quotation Sub Item Master records) of the given main item codes."""
	frappe.has_permission("Quotation Sub Item Master", "read", throw=True)
	if isinstance(main_item_codes, str):
		main_item_codes = json.loads(main_item_codes)
	if not main_item_codes:
		return []
	return frappe.get_all(
		"Quotation Sub Item Master",
		filters={"main_item_code": ["in", main_item_codes]},
		fields=[
			"name",
			"main_item_code",
			"sub_item_code",
			"item_description",
			"sub_item_type",
			"uom",
			"rate",
		],
		order_by="main_item_code asc, sr_no asc",
	)
