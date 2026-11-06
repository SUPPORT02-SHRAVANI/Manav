// File: manav_lead_list.js
// Purpose: Colour-code the lead list by status (like the Haas LMS dashboard colours).
// Created: 2026-10-29

frappe.listview_settings["Manav Lead"] = {
	add_fields: ["status"],
	get_indicator(doc) {
		const colours = {
			Open: "blue",
			"Pending to Qualify": "orange",
			Qualified: "green",
			Closed: "gray",
		};
		return [__(doc.status), colours[doc.status] || "gray", "status,=," + doc.status];
	},
};
