# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: manav_lead_register.py
# Purpose: Lead register report - leads with status, source, product, location and sale engineer,
#          filtered by status / location / date range. Respects the user's lead permissions.
# Created: 2026-10-29

# Frappe framework.
import frappe


# Entry point Frappe calls for a Script Report.
def execute(filters=None):
	filters = filters or {}
	return get_columns(), get_data(filters)


# The report columns.
def get_columns():
	return [
		{"label": "Lead", "fieldname": "name", "fieldtype": "Link", "options": "Manav Lead", "width": 110},
		{"label": "Lead Date", "fieldname": "lead_date", "fieldtype": "Date", "width": 95},
		{"label": "Company", "fieldname": "company_name", "fieldtype": "Data", "width": 190},
		{"label": "Contact", "fieldname": "contact_person", "fieldtype": "Data", "width": 130},
		{"label": "Mobile", "fieldname": "mobile_no", "fieldtype": "Data", "width": 110},
		{"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 130},
		{"label": "Source", "fieldname": "source", "fieldtype": "Link", "options": "Manav Lead Source", "width": 120},
		{"label": "Product Type", "fieldname": "product_type", "fieldtype": "Link", "options": "Manav Product Type", "width": 130},
		{"label": "Location", "fieldname": "location", "fieldtype": "Data", "width": 100},
		{"label": "Sale Engineer", "fieldname": "sale_engineer", "fieldtype": "Data", "width": 150},
	]


# The report rows, built from the filters.
def get_data(filters):
	conditions = {}
	if filters.get("status"):
		conditions["status"] = filters["status"]
	if filters.get("location"):
		conditions["location"] = filters["location"]
	if filters.get("from_date") and filters.get("to_date"):
		conditions["lead_date"] = ["between", [filters["from_date"], filters["to_date"]]]

	# get_list applies the user's permissions (a salesperson sees only their own leads).
	return frappe.get_list(
		"Manav Lead",
		filters=conditions,
		fields=[
			"name", "lead_date", "company_name", "contact_person", "mobile_no",
			"status", "source", "product_type", "location", "sale_engineer",
		],
		order_by="modified desc",
	)
