# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Quotation Head Sub Item: one option or specification quoted with an item of a quotation (child table
of Quotation Head).

Working: the fields are defined in quotation_head_sub_item.json. The option is chosen from the
Quotation Sub Item Master records of the items on the quotation; its codes, description, type, unit
and rate are copied in and can then be changed for this quotation. No custom logic is needed, so the
class is empty; the amount of each row is calculated by Quotation Head (quotation_head.py).

Created: 2026-10-12, for making new quotations.
"""

# import frappe
from frappe.model.document import Document


class QuotationHeadSubItem(Document):
	"""One option or specification quoted with an item of a quotation."""
	pass
