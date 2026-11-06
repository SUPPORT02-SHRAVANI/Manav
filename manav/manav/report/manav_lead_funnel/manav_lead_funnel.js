// File: manav_lead_funnel.js
// Purpose: Group-by and date filters for the Lead Funnel report.
// Created: 2026-10-30

frappe.query_reports["Manav Lead Funnel"] = {
	filters: [
		{
			fieldname: "group_by",
			label: __("Group By"),
			fieldtype: "Select",
			default: "status",
			options: [
				{ value: "status", label: __("Status") },
				{ value: "source", label: __("Source") },
				{ value: "location", label: __("Location") },
				{ value: "sector", label: __("Sector") },
				{ value: "type_of_company", label: __("Type of Company") },
				{ value: "business_size", label: __("Business Size") },
			],
		},
		{ fieldname: "from_date", label: __("From Date"), fieldtype: "Date" },
		{ fieldname: "to_date", label: __("To Date"), fieldtype: "Date" },
	],
};
