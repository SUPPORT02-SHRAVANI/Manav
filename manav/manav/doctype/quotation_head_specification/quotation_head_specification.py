# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Quotation Head Specification: one specification line of an item on a quotation (child table of
Quotation Head).

Working: the fields are defined in quotation_head_specification.json. The lines come from the
Standard Specifications of the item and can be changed for the quotation. They are printed under
their item in two columns; a line marked Bold is printed bold. No custom logic is needed, so the
class is empty.

Created: 2026-10-12, for making new quotations.
"""

# import frappe
from frappe.model.document import Document


class QuotationHeadSpecification(Document):
	"""One specification line of an item on a quotation."""
	pass
