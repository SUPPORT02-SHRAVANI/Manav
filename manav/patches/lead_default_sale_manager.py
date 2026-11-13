# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
"""Leads without a Sale Manager get the manager of all (manav_lead.DEFAULT_SALE_MANAGER, Naveen
Mahadevan), as new leads now do on saving. Nothing happens on a site without that Sales Person.

Created: 2026-11-13, when the user asked that Naveen Mahadevan is the manager of all leads.
"""

import frappe


def execute():
	from manav.manav.doctype.manav_lead.manav_lead import DEFAULT_SALE_MANAGER

	if not frappe.db.has_column("Manav Lead", "sales_manager"):
		return
	if not frappe.db.exists("Sales Person", DEFAULT_SALE_MANAGER):
		return
	# "is not set" matches both NULL and "" (an IN list with None would miss NULL)
	for name in frappe.get_all(
		"Manav Lead", filters={"sales_manager": ["is", "not set"]}, pluck="name"
	):
		frappe.db.set_value("Manav Lead", name, "sales_manager", DEFAULT_SALE_MANAGER, update_modified=False)
