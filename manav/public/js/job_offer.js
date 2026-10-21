// Manav's addition to HRMS's Job Offer form (loaded through `doctype_js` in hooks.py): a new Job
// Offer starts with the salary table of the Manav appointment letter filled with the usual
// components (amounts 0), so only the amounts are to be typed. The rows can be changed, removed
// or added to; they are printed by the print format "Manav Appointment Letter".
//
// Created: 2026-10-19, with the appointment letter the user asked for.

// Component, part of the monthly Sub Total, how it is paid (as on the May 2026 offer letter).
const MANAV_OFFER_COMPONENTS = [
	["Basic salary", 1, ""],
	["HRA", 1, ""],
	["Special Allowance", 1, ""],
	["Provident fund", 0, "Monthly"],
	["Insurance", 0, "Annually"],
	["Birthday Package", 0, "Annually"],
	["Bonus", 0, "Annually"],
];

frappe.ui.form.on("Job Offer", {
	onload(frm) {
		// only for a new offer whose table is still empty (the field exists after `bench migrate`)
		if (!frm.is_new() || !frm.fields_dict.custom_salary_lines) return;
		if ((frm.doc.custom_salary_lines || []).length) return;
		MANAV_OFFER_COMPONENTS.forEach(([component, in_sub_total, payable]) => {
			frm.add_child("custom_salary_lines", { component, in_sub_total, payable, amount: 0 });
		});
		frm.refresh_field("custom_salary_lines");
	},
});
