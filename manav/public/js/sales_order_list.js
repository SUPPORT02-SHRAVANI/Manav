// Copyright (c) 2026, milind and contributors
// For license information, please see license.txt

// Sales Order list (loaded through `doctype_list_js` in hooks.py, after ERPNext's own
// sales_order_list.js): the status label calls a Sales Order Manav's Final PI (since 2026-10-29;
// before, an unsubmitted one was the Draft PI): "Final PI: Not Submitted" while it is a draft, then
// "Final PI: " followed by ERPNext's own status (To Deliver and Bill, Completed ...). Cancelled ones
// keep Frappe's "Cancelled". Frappe uses the same label at the top of the Sales Order form.
//
// Working: ERPNext's get_indicator is kept and wrapped, so its statuses and their filters stay.
// has_indicator_for_draft makes Frappe ask get_indicator for drafts too (otherwise it shows its own
// "Draft"). Upgrade note: listview_settings.get_indicator and has_indicator_for_draft are Frappe's
// list API (frappe/public/js/frappe/model/indicator.js), checked on Frappe 16.33.1.
//
// Created: 2026-10-28, when the user asked to see in the Sales Order list whether each one is a
// Draft PI or a Final PI.
//
// CHANGE NOTE
// Date: 2026-10-29
// Change: Every Sales Order is a Final PI: "Final PI: Not Submitted" (red) while it is a draft,
// "Final PI: <status>" once submitted. The Draft PI is now the Manav doctype "Draft PI".
// Reason: The user asked for the Draft PI as a separate document before the Final PI (Sales Order).
//
// CHANGE NOTE
// Date: 2026-11-04
// Change: No "Add Sales Order" (New) button: a Final PI is made from a Draft PI (Make Final PI).
// ERPNext's own onload / refresh, if any, still run.
// Reason: The user asked to remove the New button and go to the PIs only through the quotation.
// Upgrade note: listview.can_create and page.clear_primary_action are Frappe's list / page API
// (frappe/public/js/frappe/list/list_view.js, ui/page.js); without them the button stays.

(function () {
	const settings = (frappe.listview_settings["Sales Order"] = frappe.listview_settings["Sales Order"] || {});
	if (settings.manav_pi_indicator) return;
	settings.manav_pi_indicator = true;

	const erpnext_get_indicator = settings.get_indicator;
	settings.has_indicator_for_draft = 1;
	settings.get_indicator = function (doc) {
		if (doc.docstatus == 0) {
			return [`${__("Final PI")}: ${__("Not Submitted")}`, "red", "docstatus,=,0"];
		}
		const status = typeof erpnext_get_indicator === "function" ? erpnext_get_indicator.call(this, doc) : null;
		if (doc.docstatus == 1) {
			// "Final PI: To Deliver and Bill", in ERPNext's colour and with its filter
			return status
				? [`${__("Final PI")}: ${status[0]}`, status[1], status[2]]
				: [__("Final PI"), "green", "docstatus,=,1"];
		}
		return status;
	};

	// 2026-11-04: no New button (also on the empty list); ERPNext's handlers are kept and called
	const hide_new = (listview) => {
		listview.can_create = false;
		if (listview.page && typeof listview.page.clear_primary_action === "function") listview.page.clear_primary_action();
	};
	["onload", "refresh"].forEach((event) => {
		const erpnext_handler = settings[event];
		settings[event] = function (listview) {
			if (typeof erpnext_handler === "function") erpnext_handler.apply(this, arguments);
			hide_new(listview);
		};
	});
})();
