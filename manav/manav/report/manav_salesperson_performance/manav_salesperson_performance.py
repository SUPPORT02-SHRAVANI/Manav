# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: manav_salesperson_performance.py
# Purpose: One row per sale engineer for a date range: visits done, days worked, leads created, leads
#          qualified / converted (a lead with a Quotation), conversion %, and follow-ups still pending.
# Created: 2026-10-30

# For the per-engineer totals.
from collections import defaultdict

# Frappe framework.
import frappe
# Translation function for messages shown to the user.
from frappe import _
# To decimal number.
from frappe.utils import flt


# Entry point Frappe calls for a Script Report.
def execute(filters=None):
	filters = filters or {}
	return get_columns(), get_data(filters)


def get_columns():
	return [
		{"label": _("Sale Engineer"), "fieldname": "sale_engineer", "fieldtype": "Data", "width": 180},
		{"label": _("Visits"), "fieldname": "visits", "fieldtype": "Int", "width": 80},
		{"label": _("Days Worked"), "fieldname": "days_worked", "fieldtype": "Int", "width": 100},
		{"label": _("Leads"), "fieldname": "leads", "fieldtype": "Int", "width": 80},
		{"label": _("Qualified"), "fieldname": "qualified", "fieldtype": "Int", "width": 90},
		{"label": _("Converted"), "fieldname": "converted", "fieldtype": "Int", "width": 90},
		{"label": _("Conversion %"), "fieldname": "conversion", "fieldtype": "Percent", "width": 110},
		{"label": _("Follow-ups Pending"), "fieldname": "followups", "fieldtype": "Int", "width": 140},
	]


def get_data(filters):
	# Figures per sale engineer. "days" is a set of dates, so a day with several visits counts once.
	agg = defaultdict(lambda: {"visits": 0, "days": set(), "leads": 0, "qualified": 0, "converted": 0, "followups": 0})
	date_range = _date_range(filters)
	unknown = _("(unknown)")

	# Visits in the range (get_list applies the user's permissions).
	visit_filters = {}
	if date_range:
		visit_filters["checkin_date"] = ["between", date_range]
	for v in frappe.get_list(
		"Manav Visit", filters=visit_filters, fields=["sale_engineer", "checkin_date"], limit_page_length=0
	):
		bucket = agg[v.sale_engineer or unknown]
		bucket["visits"] += 1
		if v.checkin_date:
			bucket["days"].add(str(v.checkin_date))

	# Leads created in the range.
	lead_filters = {}
	if date_range:
		lead_filters["lead_date"] = ["between", date_range]
	for lead in frappe.get_list(
		"Manav Lead", filters=lead_filters, fields=["sale_engineer", "status", "quotation"], limit_page_length=0
	):
		bucket = agg[lead.sale_engineer or unknown]
		bucket["leads"] += 1
		if lead.status == "Qualified":
			bucket["qualified"] += 1
		# A lead that became a Quotation is counted as converted.
		if lead.quotation:
			bucket["converted"] += 1

	# Pending follow-ups: visits that still have an open follow-up ToDo.
	open_visits = frappe.get_all(
		"ToDo", filters={"reference_type": "Manav Visit", "status": "Open"}, pluck="reference_name"
	)
	if open_visits:
		for v in frappe.get_list(
			"Manav Visit", filters={"name": ["in", open_visits]}, fields=["sale_engineer"], limit_page_length=0
		):
			agg[v.sale_engineer or unknown]["followups"] += 1

	rows = []
	for engineer, d in sorted(agg.items()):
		leads = d["leads"]
		rows.append(
			{
				"sale_engineer": engineer,
				"visits": d["visits"],
				"days_worked": len(d["days"]),
				"leads": leads,
				"qualified": d["qualified"],
				"converted": d["converted"],
				"conversion": (flt(d["converted"]) / leads * 100) if leads else 0,
				"followups": d["followups"],
			}
		)
	return rows


# The From / To date range, or None when not both given.
def _date_range(filters):
	if filters.get("from_date") and filters.get("to_date"):
		return [filters["from_date"], filters["to_date"]]
	return None
