# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Quotation Item Specification: one line of the standard specifications of an item (child table of
Quotation Item Master).

Working: the fields are defined in quotation_item_specification.json. The lines are copied into a
quotation when the item is chosen there. No custom logic is needed, so the class is empty.

Created: 2026-10-12, for making new quotations.
"""

# import frappe
from frappe.model.document import Document


class QuotationItemSpecification(Document):
	"""One line of the standard specifications of an item."""
	pass
