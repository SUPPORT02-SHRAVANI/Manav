// File: manav_lead_list.js
// Purpose: Colour-code the lead list by status (like the Haas LMS dashboard colours).
// Created: 2026-10-29
// CHANGE NOTE
// Date: 2026-11-12
// Change: The Visits column (visit_count, lead_board.py) is shown as a coloured badge:
//         0 red, 1-2 orange, 3-4 blue, 5+ green.
// Reason: The user asked to see each lead's number of visits in the lead list, highlighted by colour.

// Badge colours for a visit count: [background, text].
function manav_visit_badge_colours(count) {
	if (count <= 0) return ["#FDE2E1", "#C0392B"]; // no visit yet
	if (count <= 2) return ["#FFF0D9", "#B9640A"];
	if (count <= 4) return ["#DCEBFF", "#1D5FBF"];
	return ["#D9F5E3", "#16804A"];
}

frappe.listview_settings["Manav Lead"] = {
	add_fields: ["status", "visit_count"],
	get_indicator(doc) {
		const colours = {
			Open: "blue",
			"Pending to Qualify": "orange",
			Qualified: "green",
			Closed: "gray",
		};
		return [__(doc.status), colours[doc.status] || "gray", "status,=," + doc.status];
	},
	formatters: {
		visit_count(value) {
			const count = cint(value);
			const [bg, fg] = manav_visit_badge_colours(count);
			const label = count === 1 ? __("1 Visit") : __("{0} Visits", [count]);
			return `<span style="display:inline-block;min-width:64px;text-align:center;padding:2px 10px;border-radius:10px;font-weight:600;font-size:12px;background:${bg};color:${fg};">${label}</span>`;
		},
	},
};
