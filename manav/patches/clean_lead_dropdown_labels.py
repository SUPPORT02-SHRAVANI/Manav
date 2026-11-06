# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: clean_lead_dropdown_labels.py
# Purpose: One-time patch - the dropdowns without their Haas LMS codes: the Lead Stages lose their number
#          ("01 Start Lead" -> "Start Lead"; the order stays by Sequence), and the leads' Sector and Type of
#          Company lose their code ("Z0009_Heavy Industries" -> "Heavy Industries", "1_Original Equipment
#          Manufacturer" -> "Original Equipment Manufacturer"), to match the new options in manav_lead.json.
# Created: 2026-11-04
# Reason: The user asked that the dropdowns show the plain names, without 01 / Z0009_ / 1_.

# Regular expressions for the codes in front of the names.
import re

# Frappe framework.
import frappe
# Renames a record and updates every Link to it (the leads' and visits' Stage).
from frappe.model.rename_doc import rename_doc

# "01 Start Lead" -> "Start Lead"
STAGE_NUMBER = re.compile(r"^\d+\s+")
# "Z0009_Heavy Industries" / "1_Original Equipment Manufacturer" -> the name after the code
SELECT_CODE = re.compile(r"^(Z\d+|\d+)_")


def execute():
	rename_stages()
	clean_select("sector")
	clean_select("type_of_company")


# Each numbered stage gets its name without the number (its Sequence keeps the order).
def rename_stages():
	if not frappe.db.exists("DocType", "Manav Lead Stage"):
		return
	for name in frappe.get_all("Manav Lead Stage", pluck="name"):
		new = STAGE_NUMBER.sub("", name)
		if new == name or frappe.db.exists("Manav Lead Stage", new):
			continue
		rename_doc("Manav Lead Stage", name, new, force=True, ignore_permissions=True, show_alert=False)
		# stage_name is the naming field: keep it the same as the new name
		frappe.db.set_value("Manav Lead Stage", new, "stage_name", new, update_modified=False)


# The lead's `field` values without their code.
def clean_select(field):
	for lead in frappe.get_all("Manav Lead", filters={field: ["like", "%\\_%"]}, fields=["name", field]):
		value = lead.get(field)
		new = SELECT_CODE.sub("", value or "")
		if new != value:
			frappe.db.set_value("Manav Lead", lead.name, field, new, update_modified=False)
