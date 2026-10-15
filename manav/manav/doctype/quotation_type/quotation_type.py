# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Quotation Type: one kind of quotation of the old quotation system, e.g. 1 = MACHINES, 2 = SPARES IN
RUPEES.

Working: the fields are defined in quotation_type.json. The record is named by its Quotation Type
code. No custom logic is needed, so the class is empty. The old records are loaded by
manav/manav/import_legacy.py.

Created: 2026-10-12, from the old table "Quotation Type Master".
"""

# import frappe
from frappe.model.document import Document


class QuotationType(Document):
	"""One kind of quotation of the old quotation system."""
	pass
