// File: manav_visit_list.js
// Purpose: Visit list - each visit shows the lead stage it moved the lead to.
// Created: 2026-10-29
// CHANGE NOTE
// Date: 2026-10-30
// Change: Statuses are now Checked In (orange) / Checked Out (green), and visits still checked in have a
//         red Check Out button in their row (manav.visit_position, public/js/manav_visit_position.js).
// Reason: Visits were rebuilt like My Visit Monitor's visit entries.
// CHANGE NOTE
// Date: 2026-11-03
// Change: No Checked In / Checked Out status and no Check Out button; the indicator is the visit's stage.
// Reason: The user asked to remove the whole check-in and check-out system.

frappe.listview_settings["Manav Visit"] = {
	add_fields: ["stage"],
	get_indicator(doc) {
		return doc.stage ? [__(doc.stage), "blue", `stage,=,${doc.stage}`] : [__("No stage"), "gray", "stage,is,not set"];
	},
};
