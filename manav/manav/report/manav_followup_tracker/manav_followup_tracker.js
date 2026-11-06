// File: manav_followup_tracker.js
// Purpose: Filters and colour for the Follow-up Tracker (overdue rows red, due-today orange).
// Created: 2026-10-30

frappe.query_reports["Manav Followup Tracker"] = {
	filters: [
		{ fieldname: "sale_engineer", label: __("Sale Engineer"), fieldtype: "Data" },
		{
			fieldname: "location",
			label: __("Location"),
			fieldtype: "Select",
			options: "\nBANGALORE\nFTWZ\nCHENNAI\nCOIMBATORE",
		},
		{ fieldname: "overdue_only", label: __("Overdue only"), fieldtype: "Check" },
	],

	// Colour the Stage and Days Overdue: red when overdue, orange when due today.
	formatter(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);
		if (data && (column.fieldname === "stage" || column.fieldname === "days_overdue")) {
			if (data.days_overdue > 0) {
				value = `<span style="color:#e03131;font-weight:600">${value}</span>`;
			} else if (data.stage === __("Due today")) {
				value = `<span style="color:#f08c00;font-weight:600">${value}</span>`;
			}
		}
		return value;
	},
};
