// File: manav_salesperson_performance.js
// Purpose: Date-range filter for the Salesperson Performance report (defaults to the last month).
// Created: 2026-10-30

frappe.query_reports["Manav Salesperson Performance"] = {
	filters: [
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
		},
	],
};
