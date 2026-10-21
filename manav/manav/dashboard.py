# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Figures for the Manav dashboard page (manav/www/manav-dashboard.html): quotations / sales,
HR & attendance, and payroll.

Working: the page calls get_dashboard_data with a date range and draws the charts in the browser.
Every figure is read with frappe.get_list, so the reader's own permissions (role and user
permissions) apply; a section whose doctype the reader may not read is returned as None and the
page leaves it out. The rows are summed here in Python rather than with SQL GROUP BY, which keeps
to Frappe's documented API across versions (upgrade-safe rule); the row counts of a company this
size are small.

- Sales: ERPNext Quotations (drafts and submitted, not cancelled) whose date is in the range.
  Amounts are base_net_total, i.e. in the company currency (INR), because the quotations of the
  principals are in different currencies.
- HR & attendance: active Employees; today's and this month's Attendance; open Leave
  Applications. Attendance and leave are HRMS doctypes: left out when HRMS is not installed
  (Manav itself only requires ERPNext).
- Payroll: submitted Salary Slips whose start date is in the range, in company currency
  (base_gross_pay, base_total_deduction, base_net_pay). Shown only to the roles in
  PAYROLL_ROLES, because an Employee may read their own slips and would see their own pay as
  "payroll".

Created: 2026-10-17.

CHANGE NOTE
Date: 2026-10-19
Change: Every reader gets "my_sales": the same sales figures for only their own quotations (those
they created or are Account Manager of). The figures of all employees - "sales" (team
performance, with the sales engineers), "hr" and "payroll" - are returned only to management
(desk_home.is_management: Administrator, System Manager, role Manav Management), otherwise None.
"is_management" and "user_name" are returned for the page's tabs and greeting.
Reason: The user asked that everyone sees their own dashboard, and that only the admin, Milind and
Naveen see all employees' performance. Own quotations are matched by creator and Account Manager
because no login user is linked to a Sales Person on the site (user's choice, 2026-10-19).
"""

from collections import defaultdict

import frappe
from frappe import _
from frappe.utils import add_months, flt, get_first_day, get_last_day, getdate, nowdate

from manav.manav.desk_home import is_management

PAYROLL_ROLES = {"System Manager", "HR Manager", "HR User", "Accounts Manager"}
# Quotation statuses that count as won for the conversion rate
WON_STATUSES = {"Ordered", "Partially Ordered"}
TOP_N = 10


@frappe.whitelist()
def get_dashboard_data(from_date=None, to_date=None):
	"""Return the dashboard figures for from_date..to_date (default: the last 12 months)."""
	if frappe.session.user == "Guest":
		raise frappe.PermissionError

	to_date = getdate(to_date or nowdate())
	from_date = getdate(from_date or get_first_day(add_months(to_date, -11)))
	if from_date > to_date:
		frappe.throw(_("From Date must be on or before To Date"))

	months = month_keys(from_date, to_date)
	management = is_management()
	return {
		"from_date": str(from_date),
		"to_date": str(to_date),
		"currency": frappe.db.get_default("currency") or "INR",
		"months": months,
		"is_management": management,
		"user_name": frappe.utils.get_fullname(frappe.session.user),
		"my_sales": sales_data(from_date, to_date, months, own=True) if can_read("Quotation") else None,
		# all employees' figures: management only
		"sales": sales_data(from_date, to_date, months) if management and can_read("Quotation") else None,
		"hr": hr_data() if management and hrms_installed() and can_read("Employee") else None,
		"payroll": payroll_data(from_date, to_date, months) if management and can_see_payroll() else None,
	}


def can_read(doctype):
	return bool(frappe.has_permission(doctype, "read"))


def hrms_installed():
	return "hrms" in frappe.get_installed_apps()


def can_see_payroll():
	return hrms_installed() and can_read("Salary Slip") and bool(PAYROLL_ROLES & set(frappe.get_roles()))


def month_keys(from_date, to_date):
	"""The months of the range as "YYYY-MM", oldest first."""
	keys, day = [], get_first_day(from_date)
	while day <= to_date:
		keys.append(day.strftime("%Y-%m"))
		day = add_months(day, 1)
	return keys


def person(name):
	"""A sales person whose name was taken already is stored as "NAME (CODE)"; the code is dropped
	(as on the printed quotation)."""
	return (name or "").split(" (")[0].strip()


def top(totals, n=TOP_N):
	"""[{label, value, count}] of the n largest values; the rest are summed into "Others"."""
	rows = sorted(totals.items(), key=lambda kv: kv[1]["value"], reverse=True)
	result = [{"label": k, "value": flt(v["value"], 2), "count": v["count"]} for k, v in rows[:n]]
	rest = rows[n:]
	if rest:
		result.append(
			{
				"label": _("Others ({0})").format(len(rest)),
				"value": flt(sum(v["value"] for _k, v in rest), 2),
				"count": sum(v["count"] for _k, v in rest),
			}
		)
	return result


def own_quotation_filters():
	"""or_filters for the logged-in user's own quotations: created by them, or with them as Account
	Manager. The Account Manager field is a Manav custom field; until `bench migrate` has created
	it, only the creator is used."""
	user = frappe.session.user
	or_filters = {"owner": user}
	if frappe.get_meta("Quotation").has_field("custom_account_manager"):
		or_filters["custom_account_manager"] = user
	return or_filters


def sales_data(from_date, to_date, months, own=False):
	"""Sales figures of the quotations in the range: all the reader may read, or with own=True
	only the reader's own (own_quotation_filters)."""
	rows = frappe.get_list(
		"Quotation",
		filters={"docstatus": ["<", 2], "transaction_date": ["between", [from_date, to_date]]},
		or_filters=own_quotation_filters() if own else None,
		fields=[
			"status",
			"transaction_date",
			"base_net_total",
			"custom_quotation_type",
			"custom_sales_engineer",
			"customer_name",
			"party_name",
		],
		limit_page_length=0,
	)

	def blank():
		return {"value": 0.0, "count": 0}

	by_month = {m: blank() for m in months}
	by_status, by_principal, by_engineer, by_customer = (defaultdict(blank) for _i in range(4))
	for row in rows:
		value = flt(row.base_net_total)
		groups = (
			by_month.get(getdate(row.transaction_date).strftime("%Y-%m")),
			by_status[row.status or _("Draft")],
			by_principal[row.custom_quotation_type or _("Not set")],
			by_engineer[person(row.custom_sales_engineer) or _("Not set")],
			by_customer[row.customer_name or row.party_name or _("Not set")],
		)
		for group in groups:
			if group is not None:
				group["value"] += value
				group["count"] += 1

	# Quotation Type records are numbered ("2"); show their Description (the title field)
	principal_names = dict(frappe.get_all("Quotation Type", fields=["name", "description"], as_list=True))
	named = defaultdict(blank)
	for code, group in by_principal.items():
		target = named[principal_names.get(code) or code]
		target["value"] += group["value"]
		target["count"] += group["count"]
	by_principal = named

	won = [r for r in rows if r.status in WON_STATUSES]
	# conversion counts only quotations that were sent (submitted statuses), not drafts
	decided = [r for r in rows if r.status and r.status != "Draft"]
	return {
		"count": len(rows),
		"value": flt(sum(flt(r.base_net_total) for r in rows), 2),
		"won_count": len(won),
		"won_value": flt(sum(flt(r.base_net_total) for r in won), 2),
		"lost_count": sum(1 for r in rows if r.status == "Lost"),
		"open_count": sum(1 for r in rows if r.status in ("Open", "Replied")),
		"conversion": flt(100.0 * len(won) / len(decided), 1) if decided else None,
		"by_month": [{"month": m, "value": flt(v["value"], 2), "count": v["count"]} for m, v in by_month.items()],
		"by_status": top(by_status),
		"by_principal": top(by_principal),
		"by_engineer": top(by_engineer),
		"by_customer": top(by_customer),
	}


def hr_data():
	today = getdate(nowdate())
	employees = frappe.get_list("Employee", filters={"status": "Active"}, fields=["department"], limit_page_length=0)
	# show the department's own name, without the company suffix ("Human Resources - M")
	department_names = dict(frappe.get_all("Department", fields=["name", "department_name"], as_list=True))
	by_department = defaultdict(lambda: {"value": 0, "count": 0})
	for row in employees:
		group = by_department[department_names.get(row.department) or row.department or _("Not set")]
		group["value"] += 1
		group["count"] += 1

	result = {
		"active": len(employees),
		"by_department": top(by_department, n=12),
		"today": None,
		"month": None,
		"open_leaves": None,
	}

	if can_read("Attendance"):
		marked_today = frappe.get_list(
			"Attendance", filters={"docstatus": 1, "attendance_date": today}, fields=["status"], limit_page_length=0
		)
		today_counts = defaultdict(int)
		for row in marked_today:
			today_counts[row.status] += 1
		result["today"] = {
			"date": str(today),
			"by_status": dict(today_counts),
			"not_marked": max(len(employees) - len(marked_today), 0),
		}

		month_rows = frappe.get_list(
			"Attendance",
			filters={"docstatus": 1, "attendance_date": ["between", [get_first_day(today), get_last_day(today)]]},
			fields=["status"],
			limit_page_length=0,
		)
		month_counts = defaultdict(int)
		for row in month_rows:
			month_counts[row.status] += 1
		result["month"] = {"month": today.strftime("%Y-%m"), "by_status": dict(month_counts)}

	if can_read("Leave Application"):
		result["open_leaves"] = len(
			frappe.get_list(
				"Leave Application", filters={"status": "Open", "docstatus": 0}, pluck="name", limit_page_length=0
			)
		)
	return result


def payroll_data(from_date, to_date, months):
	rows = frappe.get_list(
		"Salary Slip",
		filters={"docstatus": 1, "start_date": ["between", [from_date, to_date]]},
		fields=["start_date", "department", "base_gross_pay", "base_total_deduction", "base_net_pay"],
		limit_page_length=0,
	)
	by_month = {m: {"gross": 0.0, "deduction": 0.0, "net": 0.0, "count": 0} for m in months}
	for row in rows:
		group = by_month.get(getdate(row.start_date).strftime("%Y-%m"))
		if group is None:
			continue
		group["gross"] += flt(row.base_gross_pay)
		group["deduction"] += flt(row.base_total_deduction)
		group["net"] += flt(row.base_net_pay)
		group["count"] += 1

	# gross pay by department for the latest month that has slips
	paid_months = [m for m, v in by_month.items() if v["count"]]
	latest = paid_months[-1] if paid_months else None
	department_names = dict(frappe.get_all("Department", fields=["name", "department_name"], as_list=True))
	by_department = defaultdict(lambda: {"value": 0.0, "count": 0})
	for row in rows:
		if latest and getdate(row.start_date).strftime("%Y-%m") == latest:
			group = by_department[department_names.get(row.department) or row.department or _("Not set")]
			group["value"] += flt(row.base_gross_pay)
			group["count"] += 1

	drafts = frappe.get_list(
		"Salary Slip",
		filters={"docstatus": 0, "start_date": ["between", [from_date, to_date]]},
		pluck="name",
		limit_page_length=0,
	)
	return {
		"slips": len(rows),
		"draft_slips": len(drafts),
		"gross": flt(sum(v["gross"] for v in by_month.values()), 2),
		"net": flt(sum(v["net"] for v in by_month.values()), 2),
		"by_month": [
			{
				"month": m,
				"gross": flt(v["gross"], 2),
				"deduction": flt(v["deduction"], 2),
				"net": flt(v["net"], 2),
				"count": v["count"],
			}
			for m, v in by_month.items()
		],
		"latest_month": latest,
		"by_department": top(by_department, n=12),
	}
