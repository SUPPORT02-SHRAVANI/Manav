# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Quotation Sub Item Master: one option or accessory (sub item) that can be quoted with a main item,
e.g. 32GB memory for machine CL-1.

Working: the fields are defined in quotation_sub_item_master.json. The record gets a running number
(QSI-00001). Main Item Code is plain text and not a link, because one item code has several
Quotation Item Master records. No custom logic is needed, so the class is empty. The old records are
loaded by manav/manav/import_legacy.py.

Created: 2026-10-12, from the old table "Quotation Sub Item Master".
"""

# import frappe
from frappe.model.document import Document


class QuotationSubItemMaster(Document):
	"""One option or accessory."""
	pass
