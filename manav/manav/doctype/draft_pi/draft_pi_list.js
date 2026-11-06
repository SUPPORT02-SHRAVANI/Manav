// Copyright (c) 2026, milind and contributors
// For license information, please see license.txt

// Draft PI list: "Draft" (orange) until its Final PI is made, then "Final PI Made" (green).
// Created: 2026-10-29, with the Draft PI doctype.
//
// CHANGE NOTE
// Date: 2026-11-04
// Change: No "Add Draft PI" (New) button: a Draft PI is made from a quotation (Make Draft PI).
// Reason: The user asked to remove the New button and go to the PIs only through the quotation.
// Upgrade note: listview.can_create and page.clear_primary_action are Frappe's list / page API
// (frappe/public/js/frappe/list/list_view.js, ui/page.js); without them the button stays.

frappe.listview_settings["Draft PI"] = {
	add_fields: ["status", "final_pi"],
	// 2026-11-04: no New button (also on the empty list), made from the quotation only
	onload(listview) {
		manav_hide_new_button(listview);
	},
	refresh(listview) {
		manav_hide_new_button(listview);
	},
	get_indicator(doc) {
		return doc.final_pi
			? [__("Final PI Made"), "green", "status,=,Final PI Made"]
			: [__("Draft"), "orange", "status,=,Draft"];
	},
};

// The Final PI list does the same (public/js/sales_order_list.js).
function manav_hide_new_button(listview) {
	listview.can_create = false;
	if (listview.page && typeof listview.page.clear_primary_action === "function") listview.page.clear_primary_action();
}
