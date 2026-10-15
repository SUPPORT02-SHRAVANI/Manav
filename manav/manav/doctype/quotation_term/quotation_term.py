# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Quotation Term: one line of the terms and conditions of a quotation (child table of Quotation Head).

Working: the fields are defined in quotation_term.json. Rows belong to a Quotation Head; Term Type
and Sr No give the order the old system printed them in. No custom logic is needed, so the class is
empty. The rows are loaded together with their Quotation Head by manav/manav/import_legacy.py.

Created: 2026-10-12, from the old table "Quotation Term".
"""

# import frappe
from frappe.model.document import Document


class QuotationTerm(Document):
	"""One line of the terms and conditions of a quotation."""
	pass
