# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: lead_api.py
# Purpose: Server methods for the Lead Dashboard page (manav-lead-dashboard).
# Created: 2026-10-29
# CHANGE NOTE
# Date: 2026-10-30
# Change: Added get_dashboard() - the status counts plus visit / follow-up / conversion figures and the
#         chart data for the rebuilt Lead Dashboard. All of it through frappe.get_list, so a salesperson
#         sees only their own leads and visits and a manager sees everyone's.
# Reason: The user asked for a dashboard.
# CHANGE NOTE
# Date: 2026-11-04
# Change: get_dashboard also returns the leads per stage (pipeline), per location, the active (not
#         closed) count, overdue / due-today follow-ups of the leads, and the leads needing attention
#         (overdue or due within 3 days); cancelled visits are not counted.
# Reason: The user asked for a better, more attractive Lead Dashboard.

import datetime
from collections import Counter

# Frappe framework.
import frappe
# Date helpers.
from frappe.utils import add_months, getdate, today

# The lead statuses shown on the dashboard, in order (same as the Haas LMS).
STATUSES = ["Open", "Pending to Qualify", "Qualified", "Closed"]


# Count of leads in each status that the logged-in user may see.
@frappe.whitelist()
def get_lead_counts():
	# Start every status at zero.
	counts = {s: 0 for s in STATUSES}
	# frappe.get_list respects the user's permissions (a salesperson sees only their own leads).
	# The status of each accessible lead is counted in Python - robust across Frappe versions.
	for row in frappe.get_list(
		"Manav Lead", filters={"docstatus": ["!=", 2]}, fields=["status"], limit_page_length=0  # 2026-11-13: not cancelled
	):
		if row.status in counts:
			counts[row.status] += 1
	# Also return the overall total.
	counts["Total"] = sum(counts[s] for s in STATUSES)
	return counts


# Everything the Lead Dashboard shows: lead status counts, visit / follow-up / conversion figures and
# the data for four charts. Permission-aware (get_list), so each user sees only what they may read.
@frappe.whitelist()
def get_dashboard():
	leads = frappe.get_list(
		"Manav Lead",
		fields=[
			"name", "company_name", "status", "source", "quotation", "lead_date", "stage",
			"location", "next_followup_date",
		],
		limit_page_length=0,
	)
	visits = frappe.get_list(
		"Manav Visit",
		filters={"docstatus": ["!=", 2]},
		fields=["name", "sale_engineer", "checkin_date", "next_visit_date"],
		limit_page_length=0,
	)
	# Visits that still have an open follow-up ToDo (closed once the lead is revisited).
	open_visits = set(
		frappe.get_all("ToDo", filters={"reference_type": "Manav Visit", "status": "Open"}, pluck="reference_name")
	)

	day = getdate(today())
	month_start = day.replace(day=1)

	# --- Leads: status counts, source chart, conversion, leads this month ---
	status_counts = {s: 0 for s in STATUSES}
	source_counter = Counter()
	converted = leads_month = 0
	for lead in leads:
		if lead.status in status_counts:
			status_counts[lead.status] += 1
		if lead.source:
			source_counter[lead.source] += 1
		# A lead that became a Quotation counts as converted.
		if lead.quotation:
			converted += 1
		if lead.lead_date and getdate(lead.lead_date) >= month_start:
			leads_month += 1
	total_leads = len(leads)
	status_counts["Total"] = total_leads

	# --- Visits: today, this month, per month, per engineer, pending / overdue follow-ups ---
	# Labels for the last six months, oldest first (e.g. ["May 26", ..., "Oct 26"]).
	months = [getdate(add_months(day, -i)).strftime("%Y-%m") for i in range(5, -1, -1)]
	month_counter = Counter()
	engineer_counter = Counter()
	visits_today = visits_month = pending = overdue = 0
	for v in visits:
		checkin = getdate(v.checkin_date) if v.checkin_date else None
		if checkin == day:
			visits_today += 1
		if checkin and checkin >= month_start:
			visits_month += 1
		if checkin:
			key = checkin.strftime("%Y-%m")
			if key in months:
				month_counter[key] += 1
		if v.sale_engineer:
			engineer_counter[v.sale_engineer] += 1
		if v.name in open_visits:
			pending += 1
			if v.next_visit_date and getdate(v.next_visit_date) < day:
				overdue += 1

	top_sources = source_counter.most_common(6)
	top_engineers = engineer_counter.most_common(8)

	# --- 2026-11-04: pipeline per stage, locations, the leads' own follow-ups ---
	active = [lead for lead in leads if lead.status != "Closed"]
	stage_counter = Counter(lead.stage for lead in active if lead.stage)
	location_counter = Counter(lead.location for lead in leads if lead.location)
	lead_overdue = lead_today = 0
	attention = []
	for lead in active:
		if not lead.next_followup_date:
			continue
		days = (getdate(lead.next_followup_date) - day).days
		if days < 0:
			lead_overdue += 1
		elif days == 0:
			lead_today += 1
		if days <= 3:
			attention.append(
				{"name": lead.name, "company_name": lead.company_name, "stage": lead.stage, "days": days}
			)
	attention.sort(key=lambda a: a["days"])
	stages = frappe.get_all("Manav Lead Stage", fields=["name"], order_by="sequence asc", pluck="name")

	return {
		"active": len(active),
		"followups": {"overdue": lead_overdue, "today": lead_today},
		"attention": attention[:6],
		"pipeline": [{"stage": s, "count": stage_counter.get(s, 0)} for s in stages],
		"by_location": [{"label": loc, "count": n} for loc, n in location_counter.most_common()],
		"status_counts": status_counts,
		"conversion": {
			"leads": total_leads,
			"leads_month": leads_month,
			"qualified": status_counts["Qualified"],
			"converted": converted,
			"pct": round(converted / total_leads * 100, 1) if total_leads else 0,
			"qualified_pct": round(status_counts["Qualified"] / total_leads * 100) if total_leads else 0,
		},
		"visits": {
			"today": visits_today,
			"month": visits_month,
			"pending_followups": pending,
			"overdue_followups": overdue,
		},
		"charts": {
			"by_status": {"labels": STATUSES, "values": [status_counts[s] for s in STATUSES]},
			"by_source": {"labels": [s for s, _n in top_sources], "values": [n for _s, n in top_sources]},
			"visits_per_month": {
				"labels": [_month_label(m) for m in months],
				"values": [month_counter.get(m, 0) for m in months],
			},
			"top_engineers": {"labels": [e for e, _n in top_engineers], "values": [n for _e, n in top_engineers]},
		},
	}


# "2026-10" -> "Oct 26".
def _month_label(year_month):
	year, month = year_month.split("-")
	return datetime.date(int(year), int(month), 1).strftime("%b %y")
