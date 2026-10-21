# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Quotation Type: one kind of quotation of the old quotation system, e.g. 1 = MACHINES, 2 = SPARES IN
RUPEES.

Working: the fields are defined in quotation_type.json. The record is named by its Quotation Type
code. No custom logic is needed, so the class is empty. The old records are loaded by
manav/manav/import_legacy.py.

Created: 2026-10-12, from the old table "Quotation Type Master".

CHANGE NOTE
Date: 2026-10-17
Change: Added the field List Colour (list_color), read by manav/public/js/quotation_list.js.
Reason: The user asked for each principal to be shown in colour in the Quotation list.

CHANGE NOTE
Date: 2026-10-19
Change: Added the field Price Basis (price_basis), printed by the Classic quotation format as
"Prices : <price basis>" before a machine's price.
Reason: The user's old quotation prints "Prices : Ex-Works, Oxnard, USA."; the text depends on
the principal.
"""

# import frappe
from frappe.model.document import Document


class QuotationType(Document):
	"""One kind of quotation of the old quotation system."""
	pass
