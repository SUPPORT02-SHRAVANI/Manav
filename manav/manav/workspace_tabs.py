# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Tabs on the Manav workspace: the Custom HTML Block "Manav Dashboard Tabs".

Created: 2026-10-19.

Working: Frappe workspaces have no tabs. A Custom HTML Block (Frappe's own building block for
workspaces) placed under the shortcuts of the Manav workspace (workspace/manav/manav.json) draws
a tab bar and shows one section of the workspace at a time (Quotations / Sales, HR & Attendance,
Payroll, Masters & Records). Its HTML, CSS and script are the files in workspace_tabs_block/;
setup_workspace_tabs (hooked to after_migrate / after_install in hooks.py) writes them into the
block, so the code stays in the app and every migrate brings the block up to date. A Custom HTML
Block has no module and is not exported with an app, which is why it is written from here.

Reason: the user asked for tabs on the Manav workspace instead of one long page.
"""

import frappe

BLOCK_NAME = "Manav Dashboard Tabs"
# Custom HTML Block field -> file in workspace_tabs_block/
BLOCK_FILES = {"html": "tabs.html", "style": "tabs.css", "script": "tabs.js"}


def setup_workspace_tabs():
	"""Create or update the tab block from the app's files. Safe to run again: the block is only
	saved when its content differs from the files."""
	if not frappe.db.exists("DocType", "Custom HTML Block"):
		return
	folder = frappe.get_app_path("manav", "manav", "workspace_tabs_block")
	values = {}
	for field, file_name in BLOCK_FILES.items():
		with open(f"{folder}/{file_name}", encoding="utf-8") as f:
			values[field] = f.read()
	# public: every desk user who opens the workspace gets the tabs
	values["private"] = 0

	if frappe.db.exists("Custom HTML Block", BLOCK_NAME):
		doc = frappe.get_doc("Custom HTML Block", BLOCK_NAME)
		if all(doc.get(field) == value for field, value in values.items()):
			return
		doc.update(values)
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc({"doctype": "Custom HTML Block", **values})
		doc.insert(ignore_permissions=True, set_name=BLOCK_NAME)
