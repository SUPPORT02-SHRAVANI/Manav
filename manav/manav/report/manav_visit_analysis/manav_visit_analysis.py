# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: manav_visit_analysis.py
# Purpose: Visits grouped by a chosen dimension (sale engineer / reason / location / check-in date), with
#          the count and how many were checked out. For managers also the location check: how many
#          check-ins were within and outside the customer location.
# Created: 2026-10-30

# For the per-group totals.
from collections import defaultdict

# Frappe framework.
import frappe
# Translation function for messages shown to the user.
from frappe import _

# Who may see the location check (same roles as the visit form / register).
from manav.manav.visit_location import is_manager

# The dimensions a visit can be grouped by: fieldname -> column label.
GROUP_FIELDS = {
	"sale_engineer": "Sale Engineer",
	"visit_purpose": "Reason of Visit",
	"location": "Location",
	"checkin_date": "Visit Date",  # 2026-11-03: was "Check-in Date" (check-in removed)
}


# Entry point Frappe calls for a Script Report.
def execute(filters=None):
	filters = filters or {}
	group_by = filters.get("group_by") if filters.get("group_by") in GROUP_FIELDS else "sale_engineer"
	# Only managers see where a visit was captured (within / outside the customer location).
	manager = is_manager()
	return get_columns(group_by, manager), get_data(filters, group_by, manager)


def get_columns(group_by, manager):
	columns = [
		{
			"label": _(GROUP_FIELDS[group_by]),
			"fieldname": "dimension",
			"fieldtype": "Date" if group_by == "checkin_date" else "Data",
			"width": 200,
		},
		{"label": _("Visits"), "fieldname": "visits", "fieldtype": "Int", "width": 90},
		{"label": _("Checked Out"), "fieldname": "checked_out", "fieldtype": "Int", "width": 110},
	]
	if manager:
		columns += [
			{"label": _("Within Location"), "fieldname": "within", "fieldtype": "Int", "width": 130},
			{"label": _("Outside Location"), "fieldname": "outside", "fieldtype": "Int", "width": 130},
		]
	return columns


def get_data(filters, group_by, manager):
	agg = defaultdict(lambda: {"visits": 0, "checked_out": 0, "within": 0, "outside": 0})
	not_set = _("(not set)")

	visit_filters = {}
	if filters.get("from_date") and filters.get("to_date"):
		visit_filters["checkin_date"] = ["between", [filters["from_date"], filters["to_date"]]]
	if filters.get("sale_engineer"):
		visit_filters["sale_engineer"] = ["like", f"%{filters['sale_engineer']}%"]
	if filters.get("location"):
		visit_filters["location"] = filters["location"]
	if filters.get("visit_purpose"):
		visit_filters["visit_purpose"] = filters["visit_purpose"]

	# The grouping field plus status and the location check; de-duplicated.
	fields = list(dict.fromkeys([group_by, "status", "checkin_location_status"]))

	# get_list applies the user's permissions (a salesperson sees only their own visits).
	for v in frappe.get_list("Manav Visit", filters=visit_filters, fields=fields, limit_page_length=0):
		bucket = agg[v.get(group_by) or not_set]
		bucket["visits"] += 1
		if v.status == "Checked Out":
			bucket["checked_out"] += 1
		if v.checkin_location_status == "Inside":
			bucket["within"] += 1
		elif v.checkin_location_status == "Outside":
			bucket["outside"] += 1

	# By date: oldest first; otherwise the busiest group first.
	if group_by == "checkin_date":
		items = sorted(agg.items())
	else:
		items = sorted(agg.items(), key=lambda item: -item[1]["visits"])

	rows = []
	for dimension, d in items:
		row = {"dimension": dimension, "visits": d["visits"], "checked_out": d["checked_out"]}
		if manager:
			row["within"] = d["within"]
			row["outside"] = d["outside"]
		rows.append(row)
	return rows
