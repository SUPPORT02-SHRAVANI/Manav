# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: manav_visit_register.py
# Purpose: Visit register report - visits with purpose, status, customer and sale engineer,
#          filtered by status / purpose / location / date range. Respects the user's permissions.
# Created: 2026-10-29
# CHANGE NOTE
# Date: 2026-10-30
# Change: Uses the rebuilt visit fields: Check-in Date / Time, Check-out Time, location check and
#         distance; the date filter is on the check-in date.
# Reason: Manav Visit was rebuilt like My Visit Monitor (visit_date / check_in_time are gone).
# CHANGE NOTE
# Date: 2026-10-30
# Change: The location check and the distance are shown only to managers, like the visit form.
# Reason: The user asked that salespeople are not shown that their location is tracked.
# CHANGE NOTE
# Date: 2026-11-03
# Change: Columns Visit Date (checkin_date) and Stage; no In / Out times, status, location check or
#         distance (check-in / check-out removed). The Status filter still works on older visits.
# Reason: The user asked to remove the whole check-in and check-out system.

# Frappe framework.
import frappe

# Who counts as a manager (sees the location).
from manav.manav.visit_location import is_manager


# Entry point Frappe calls for a Script Report.
def execute(filters=None):
	filters = filters or {}
	# Only managers see where a visit was captured (location check, distance).
	manager = is_manager()
	return get_columns(manager), get_data(filters, manager)


# The report columns. `manager` adds the location columns.
def get_columns(manager):
	columns = [
		{"label": "Visit", "fieldname": "name", "fieldtype": "Link", "options": "Manav Visit", "width": 110},
		# 2026-11-03: the visit's date; no In / Out times, status, location check or distance any more
		# (check-in / check-out removed at the user's request)
		{"label": "Visit Date", "fieldname": "checkin_date", "fieldtype": "Date", "width": 100},
		{"label": "Company", "fieldname": "company_name", "fieldtype": "Data", "width": 190},
		{"label": "Reason", "fieldname": "visit_purpose", "fieldtype": "Data", "width": 120},
		{"label": "Stage", "fieldname": "stage", "fieldtype": "Data", "width": 150},
	]
	# "Location" here is the branch (BANGALORE / FTWZ / ...), not a GPS position.
	columns += [
		{"label": "Location", "fieldname": "location", "fieldtype": "Data", "width": 100},
		{"label": "Sale Engineer", "fieldname": "sale_engineer", "fieldtype": "Data", "width": 150},
		{"label": "Lead", "fieldname": "lead", "fieldtype": "Link", "options": "Manav Lead", "width": 110},
		{"label": "Next Visit", "fieldname": "next_visit_date", "fieldtype": "Date", "width": 95},
	]
	return columns


# The report rows, built from the filters. `manager` adds the location fields.
def get_data(filters, manager):
	conditions = {}
	if filters.get("status"):
		conditions["status"] = filters["status"]
	if filters.get("visit_purpose"):
		conditions["visit_purpose"] = filters["visit_purpose"]
	if filters.get("location"):
		conditions["location"] = filters["location"]
	if filters.get("from_date") and filters.get("to_date"):
		conditions["checkin_date"] = ["between", [filters["from_date"], filters["to_date"]]]

	fields = [
		"name", "checkin_date", "company_name", "visit_purpose",
		"stage", "location", "sale_engineer", "lead", "next_visit_date",
	]
	# The location check and distance are fetched only when they will be shown.
	if manager:
		fields += ["location_remark", "checkin_distance"]

	# get_list applies the user's permissions (a salesperson sees only their own visits).
	return frappe.get_list("Manav Visit", filters=conditions, fields=fields, order_by="creation desc")
