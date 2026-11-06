# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: manav_lead_funnel.py
# Purpose: Leads grouped by a chosen dimension (status / source / location / sector / type / business
#          size), with the count, how many were qualified and converted (a lead with a Quotation), and
#          the conversion %. Shows where leads come from and where they drop.
# Created: 2026-10-30

# For the per-group totals.
from collections import defaultdict

# Frappe framework.
import frappe
# Translation function for messages shown to the user.
from frappe import _
# To decimal number.
from frappe.utils import flt

# The dimensions a lead can be grouped by: fieldname -> column label.
GROUP_FIELDS = {
	"status": "Status",
	"source": "Source",
	"location": "Location",
	"sector": "Sector",
	"type_of_company": "Type of Company",
	"business_size": "Business Size",
}


# Entry point Frappe calls for a Script Report.
def execute(filters=None):
	filters = filters or {}
	group_by = filters.get("group_by") if filters.get("group_by") in GROUP_FIELDS else "status"
	return get_columns(group_by), get_data(filters, group_by)


def get_columns(group_by):
	return [
		{"label": _(GROUP_FIELDS[group_by]), "fieldname": "dimension", "fieldtype": "Data", "width": 220},
		{"label": _("Leads"), "fieldname": "leads", "fieldtype": "Int", "width": 90},
		{"label": _("Qualified"), "fieldname": "qualified", "fieldtype": "Int", "width": 100},
		{"label": _("Converted"), "fieldname": "converted", "fieldtype": "Int", "width": 100},
		{"label": _("Conversion %"), "fieldname": "conversion", "fieldtype": "Percent", "width": 120},
	]


def get_data(filters, group_by):
	agg = defaultdict(lambda: {"leads": 0, "qualified": 0, "converted": 0})
	not_set = _("(not set)")

	lead_filters = {}
	if filters.get("from_date") and filters.get("to_date"):
		lead_filters["lead_date"] = ["between", [filters["from_date"], filters["to_date"]]]
	# The grouping field plus status and quotation; de-duplicated when the group is "status".
	fields = list(dict.fromkeys([group_by, "status", "quotation"]))

	# get_list applies the user's permissions (a salesperson sees only their own leads).
	for lead in frappe.get_list("Manav Lead", filters=lead_filters, fields=fields, limit_page_length=0):
		bucket = agg[lead.get(group_by) or not_set]
		bucket["leads"] += 1
		if lead.status == "Qualified":
			bucket["qualified"] += 1
		if lead.quotation:
			bucket["converted"] += 1

	rows = []
	total = {"leads": 0, "qualified": 0, "converted": 0}
	# Biggest group first.
	for dimension, d in sorted(agg.items(), key=lambda item: -item[1]["leads"]):
		rows.append(
			{
				"dimension": dimension,
				"leads": d["leads"],
				"qualified": d["qualified"],
				"converted": d["converted"],
				"conversion": (flt(d["converted"]) / d["leads"] * 100) if d["leads"] else 0,
			}
		)
		for key in total:
			total[key] += d[key]

	# A Total row at the bottom.
	if rows:
		rows.append(
			{
				"dimension": _("Total"),
				"leads": total["leads"],
				"qualified": total["qualified"],
				"converted": total["converted"],
				"conversion": (flt(total["converted"]) / total["leads"] * 100) if total["leads"] else 0,
			}
		)
	return rows
