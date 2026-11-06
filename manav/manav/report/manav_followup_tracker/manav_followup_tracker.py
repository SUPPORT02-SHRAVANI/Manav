# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: manav_followup_tracker.py
# Purpose: The pending follow-up visits - one row per visit that still has an open follow-up ToDo, with
#          its Next Visit Date and how many days it is overdue. The "what to visit next" list.
# Created: 2026-10-30

# Frappe framework.
import frappe
# Translation function for messages shown to the user.
from frappe import _
# Date helpers.
from frappe.utils import date_diff, today


# Entry point Frappe calls for a Script Report.
def execute(filters=None):
	filters = filters or {}
	return get_columns(), get_data(filters)


def get_columns():
	return [
		{"label": _("Visit"), "fieldname": "visit", "fieldtype": "Link", "options": "Manav Visit", "width": 110},
		{"label": _("Company"), "fieldname": "company_name", "fieldtype": "Data", "width": 200},
		{"label": _("Next Visit"), "fieldname": "next_visit_date", "fieldtype": "Date", "width": 100},
		{"label": _("Days Overdue"), "fieldname": "days_overdue", "fieldtype": "Int", "width": 110},
		{"label": _("Stage"), "fieldname": "stage", "fieldtype": "Data", "width": 100},
		{"label": _("Reason"), "fieldname": "visit_purpose", "fieldtype": "Data", "width": 120},
		{"label": _("Sale Engineer"), "fieldname": "sale_engineer", "fieldtype": "Data", "width": 150},
		{"label": _("Mobile"), "fieldname": "mobile_no", "fieldtype": "Data", "width": 120},
		{"label": _("Location"), "fieldname": "location", "fieldtype": "Data", "width": 100},
		{"label": _("Lead"), "fieldname": "lead", "fieldtype": "Link", "options": "Manav Lead", "width": 110},
	]


def get_data(filters):
	# The visits that still have an open follow-up ToDo (closed once the lead is revisited).
	open_visits = frappe.get_all(
		"ToDo", filters={"reference_type": "Manav Visit", "status": "Open"}, pluck="reference_name"
	)
	if not open_visits:
		return []

	conditions = {"name": ["in", open_visits]}
	if filters.get("sale_engineer"):
		conditions["sale_engineer"] = ["like", f"%{filters['sale_engineer']}%"]
	if filters.get("location"):
		conditions["location"] = filters["location"]

	# get_list applies the user's permissions (a salesperson sees only their own visits).
	visits = frappe.get_list(
		"Manav Visit",
		filters=conditions,
		fields=[
			"name", "company_name", "next_visit_date", "visit_purpose", "sale_engineer",
			"mobile_no", "location", "lead",
		],
		order_by="next_visit_date asc",
		limit_page_length=0,
	)

	rows = []
	for v in visits:
		if not v.next_visit_date:
			continue
		# Days past the planned date: > 0 overdue, 0 due today, < 0 still upcoming.
		overdue = date_diff(today(), v.next_visit_date)
		if filters.get("overdue_only") and overdue <= 0:
			continue
		stage = _("Overdue") if overdue > 0 else (_("Due today") if overdue == 0 else _("Upcoming"))
		rows.append(
			{
				"visit": v.name,
				"company_name": v.company_name,
				"next_visit_date": v.next_visit_date,
				"days_overdue": overdue if overdue > 0 else 0,
				"stage": stage,
				"visit_purpose": v.visit_purpose,
				"sale_engineer": v.sale_engineer,
				"mobile_no": v.mobile_no,
				"location": v.location,
				"lead": v.lead,
			}
		)
	return rows
