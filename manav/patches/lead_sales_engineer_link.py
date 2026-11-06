# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
"""Manav Lead's Sale Engineer became a Link to Sales Person (2026-11-03). A text value that is not a
Sales Person (e.g. a user's full name) is replaced by the Sales Person of the lead's owner, else
cleared, so the lead can still be saved; the old text is kept in Other Information Notes.

Created: 2026-11-03.
"""

import frappe


def execute():
	if not frappe.db.has_column("Manav Lead", "sale_engineer"):
		return
	from manav.manav.quotation import sales_person_for_user

	for lead in frappe.get_all("Manav Lead", fields=["name", "owner", "sale_engineer", "other_information_notes"]):
		if not lead.sale_engineer or frappe.db.exists("Sales Person", lead.sale_engineer):
			continue
		values = {"sale_engineer": sales_person_for_user(lead.owner)}
		note = f"Sale Engineer (old text): {lead.sale_engineer}"
		if note not in (lead.other_information_notes or ""):
			values["other_information_notes"] = "\n".join(filter(None, [lead.other_information_notes, note]))
		frappe.db.set_value("Manav Lead", lead.name, values, update_modified=False)
