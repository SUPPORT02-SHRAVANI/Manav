# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Quotation Item Master: one item that can be put on a quotation of a given Quotation Type, with its
standard rate.

Working: the fields are defined in quotation_item_master.json. The record gets a running number
(QIM-00001). It is not named by item code, because the old table holds the same Quotation Type +
Item Code + Sr No twice for two different items. No custom logic is needed, so the class is empty.
The old records are loaded by manav/manav/import_legacy.py.

Created: 2026-10-12, from the old table "Quotation Item Master".
"""

# import frappe
from frappe.model.document import Document


class QuotationItemMaster(Document):
	"""One item that can be put on a quotation of a given Quotation Type."""
	pass
