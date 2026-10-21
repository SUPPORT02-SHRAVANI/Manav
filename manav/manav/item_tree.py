# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Data of the page "Machine Sub-Items Tree" (manav/manav/page/machine_sub_items): the machines and
their sub-items as a tree, Item Group -> machine -> sub-items.

Created: 2026-10-19.

Working: the page uses Frappe's tree component (frappe.ui.Tree), which asks get_tree_nodes for
the children of a node when it is opened, so only what is opened is loaded (6,000+ sub-item rows
in all). A machine is an item that has rows in Quotation Sub Item Master (main_item_code); its
sub-items are those rows, in their Sr No order, with type and price for that machine.

The tree keeps its nodes by value, so every value is unique: "group::<Item Group>",
"machine::<code>", "sub::<machine>::<sub-item>::<sr no>::<n>" (a sub-item is under many
machines). Codes are matched to Items without regard to case, as the database does.

Reason: the user asked for a tree of the machines' sub-items from the Items list.

CHANGE NOTE
Date: 2026-10-19
Change: A "machine::<code>" root gives that machine's sub-items (the Item form's Sub-Items
section draws one machine's tree); added count_sub_items for that section.
Reason: The user looked for the tree inside the Item form.
"""

import frappe
from frappe import _

ROOT = "Machines with Sub-Items"
NO_GROUP = "(Item not found)"


@frappe.whitelist()
def get_tree_nodes(parent=None, is_root=None, search=None, **kwargs):
	"""Children of a tree node for frappe.ui.Tree. search: only machines whose code or name has
	this text (no case)."""
	frappe.has_permission("Quotation Sub Item Master", "read", throw=True)
	search = (search or "").strip().lower()

	# A group or machine node, also when it is the root of a tree (the Item form shows the tree
	# of one machine, rooted at "machine::<code>"); anything else is the root of the whole tree.
	parent = parent or ""
	if parent.startswith("group::"):
		return machine_nodes(parent[len("group::") :], search)
	if parent.startswith("machine::"):
		return sub_item_nodes(parent[len("machine::") :])
	return group_nodes(search)


@frappe.whitelist()
def count_sub_items(item_code):
	"""Number of sub-items of a machine, for the Item form's Sub-Items section (shown when > 0).
	0 also when the reader may not read Quotation Sub Item Master, so the section stays hidden
	instead of showing an error. (Added 2026-10-19.)"""
	if not item_code or not frappe.has_permission("Quotation Sub Item Master", "read"):
		return 0
	return frappe.db.count("Quotation Sub Item Master", {"main_item_code": item_code})


def machines(search=""):
	"""{code: {"code", "name", "group", "count"}} of the machines that have sub-items."""
	counts = {}
	for row in frappe.get_all("Quotation Sub Item Master", fields=["main_item_code"], limit_page_length=0):
		if row.main_item_code:
			counts[row.main_item_code] = counts.get(row.main_item_code, 0) + 1
	items = frappe.get_all(
		"Item",
		filters={"name": ["in", list(counts)]},
		fields=["name", "item_name", "item_group"],
		limit_page_length=0,
	)
	item_by_code = {item.name.lower(): item for item in items}

	result = {}
	for code, count in counts.items():
		item = item_by_code.get(code.lower())
		name = item.item_name if item else ""
		if search and search not in code.lower() and search not in (name or "").lower():
			continue
		result[code] = {
			"code": item.name if item else code,
			"name": name,
			"group": (item.item_group if item else None) or NO_GROUP,
			"count": count,
		}
	return result


def group_nodes(search):
	groups = {}
	for machine in machines(search).values():
		groups[machine["group"]] = groups.get(machine["group"], 0) + 1
	return [
		{"value": f"group::{group}", "title": group, "count": count, "kind": "group", "expandable": 1}
		for group, count in sorted(groups.items())
	]


def machine_nodes(group, search):
	rows = [m for m in machines(search).values() if m["group"] == group]
	return [
		{
			"value": f"machine::{m['code']}",
			"title": m["code"],
			"item_name": m["name"],
			"count": m["count"],
			"kind": "machine",
			"expandable": 1,
		}
		for m in sorted(rows, key=lambda m: m["code"].lower())
	]


def sub_item_nodes(machine):
	rows = frappe.get_all(
		"Quotation Sub Item Master",
		filters={"main_item_code": machine},
		fields=["sub_item_code", "item_description", "sub_item_type", "rate", "sr_no"],
		order_by="sr_no asc",
		limit_page_length=0,
	)
	# the Item of each sub-item, for its name and to open it (matched without case)
	codes = list({r.sub_item_code for r in rows if r.sub_item_code})
	items = frappe.get_all("Item", filters={"name": ["in", codes]}, pluck="name", limit_page_length=0) if codes else []
	item_by_code = {name.lower(): name for name in items}
	return [
		{
			"value": f"sub::{machine}::{r.sub_item_code}::{r.sr_no}::{n}",
			"title": r.sub_item_code or _("(no code)"),
			"description": r.item_description,
			"sub_item_type": r.sub_item_type,
			"rate": r.rate,
			"item": item_by_code.get((r.sub_item_code or "").lower()),
			"kind": "sub",
			"expandable": 0,
		}
		for n, r in enumerate(rows, start=1)
	]
