// Manav's addition to ERPNext's Quotation list: the Principal (Quotation Type) column is drawn as a
// coloured label with the principal's name (e.g. "MACHINES") instead of its number ("1").
//
// Working: loaded through `doctype_list_js` in hooks.py, after ERPNext's quotation_list.js, so it
// extends frappe.listview_settings["Quotation"] instead of replacing it: ERPNext's onload is still
// called, and the formatter is added beside any formatters already there. The colour of a principal
// is its "List Colour" on Quotation Type; when that is empty, a colour is taken from PALETTE in the
// order of the Quotation Type codes, so every principal has a fixed colour without any setup.
// Colours are Frappe's indicator-pill classes, which follow the light and dark theme.
//
// Upgrade note: uses the documented list settings `onload` and `formatters` (checked on Frappe
// 16.33); listview.refresh() redraws the rows once the principals are loaded.
//
// Created: 2026-10-17.

(() => {
	const PALETTE = ["blue", "green", "orange", "purple", "pink", "cyan", "yellow", "red"];
	const settings = (frappe.listview_settings["Quotation"] = frappe.listview_settings["Quotation"] || {});
	const erpnext_onload = settings.onload;
	// Quotation Type code -> { label, color }; loaded once per page load
	let principals = null;

	settings.onload = function (listview) {
		if (erpnext_onload) erpnext_onload.call(this, listview);
		if (principals) return;
		frappe.db
			.get_list("Quotation Type", {
				fields: ["name", "description", "list_color"],
				order_by: "name asc",
				limit: 0,
			})
			.then((rows) => {
				principals = {};
				rows.forEach((row, index) => {
					principals[row.name] = {
						label: row.description || row.name,
						color: row.list_color || PALETTE[index % PALETTE.length],
					};
				});
				listview.refresh();
			});
	};

	settings.formatters = Object.assign({}, settings.formatters, {
		custom_quotation_type(value) {
			if (!value) return "";
			const principal = principals && principals[value];
			// not loaded yet, or no permission to read Quotation Type: plain code
			if (!principal) return frappe.utils.escape_html(value);
			const label = frappe.utils.escape_html(principal.label);
			return `<span class="indicator-pill ${principal.color} ellipsis" title="${label}">${label}</span>`;
		},
	});
})();
