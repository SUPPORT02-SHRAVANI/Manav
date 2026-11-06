// File: manav_visit_analysis.js
// Purpose: Group-by and filters for the Visit Analysis report.
// Created: 2026-10-30

frappe.query_reports["Manav Visit Analysis"] = {
	filters: [
		{
			fieldname: "group_by",
			label: __("Group By"),
			fieldtype: "Select",
			default: "sale_engineer",
			options: [
				{ value: "sale_engineer", label: __("Sale Engineer") },
				{ value: "visit_purpose", label: __("Reason of Visit") },
				{ value: "location", label: __("Location") },
				{ value: "checkin_date", label: __("Visit Date") }, // 2026-11-03: was "Check-in Date"
			],
		},
		{ fieldname: "from_date", label: __("From Date"), fieldtype: "Date" },
		{ fieldname: "to_date", label: __("To Date"), fieldtype: "Date" },
		{ fieldname: "sale_engineer", label: __("Sale Engineer"), fieldtype: "Data" },
		{
			fieldname: "location",
			label: __("Location"),
			fieldtype: "Select",
			options: "\nBANGALORE\nFTWZ\nCHENNAI\nCOIMBATORE",
		},
		{
			fieldname: "visit_purpose",
			label: __("Reason of Visit"),
			fieldtype: "Select",
			options: "\nNew Enquiry\nFollow-up\nDemo\nInstallation\nService\nPayment Collection\nCourtesy Visit\nSales Promotion\nOthers",
		},
	],
};
