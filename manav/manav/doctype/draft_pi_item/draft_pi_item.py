# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Draft PI Item: one line of a Draft PI (machine, sub-item or spare part).

Working: the fields are defined in draft_pi_item.json; their names are those of ERPNext's Quotation
Item / Sales Order Item, so the lines are copied from the quotation and into the Final PI by name,
and the Manav print template and sub-item numbering work on them unchanged. Amounts are worked out
by the parent (draft_pi.py).

Created: 2026-10-29, when the user asked for the Draft PI as a document of its own, not a Sales
Order.
"""

from frappe.model.document import Document


class DraftPIItem(Document):
	"""A line of a Draft PI; no logic of its own."""

	pass
