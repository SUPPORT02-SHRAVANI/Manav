// Manav's addition to ERPNext's Item list: a "Sub-Items Tree" button that opens the page Machine
// Sub-Items Tree (manav/manav/page/machine_sub_items): the machines with their sub-items as a tree.
//
// Working: loaded through `doctype_list_js` in hooks.py, after ERPNext's item_list.js, so it
// extends frappe.listview_settings["Item"]: ERPNext's own onload is still called first. Uses the
// documented list settings `onload` and listview.page.add_inner_button (Frappe 16.33.1).
//
// Created: 2026-10-19, at the user's request for a tree of the sub-items in the Items list.

(() => {
	const settings = (frappe.listview_settings["Item"] = frappe.listview_settings["Item"] || {});
	const erpnext_onload = settings.onload;

	settings.onload = function (listview) {
		if (erpnext_onload) erpnext_onload.call(this, listview);
		listview.page.add_inner_button(__("Sub-Items Tree"), () => frappe.set_route("machine-sub-items"));
	};
})();
