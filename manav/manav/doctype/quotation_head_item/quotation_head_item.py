# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Quotation Head Item: one item quoted on a quotation (child table of Quotation Head).

Working: the fields are defined in quotation_head_item.json. The item is chosen from the Quotation
Item Master records of the quotation's Quotation Type; its code, description, unit and rate are
copied in and can then be changed for this quotation. No custom logic is needed, so the class is
empty; the amount of each row is calculated by Quotation Head (quotation_head.py).

Created: 2026-10-12, for making new quotations.
"""

# import frappe
from frappe.model.document import Document


class QuotationHeadItem(Document):
	"""One item quoted on a quotation."""
	pass
