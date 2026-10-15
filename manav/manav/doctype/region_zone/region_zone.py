# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Region Zone: one sales zone of the old quotation system, e.g. A = HFO-BANGALORE.

Working: the fields are defined in region_zone.json. The record is named by its Zone Code. No custom
logic is needed, so the class is empty. The old records are loaded by manav/manav/import_legacy.py.

Created: 2026-10-12, from the old table "216-Region_Zone_mst".
"""

# import frappe
from frappe.model.document import Document


class RegionZone(Document):
	"""One sales zone, e.g. A = HFO-BANGALORE."""
	pass
