// Copyright (c) 2026, milind and contributors
// For license information, please see license.txt

// Draft PI form (the step between the quotation and the Final PI; see draft_pi.py).
//
// Working:
// - Amounts and the total (before taxes) follow quantity and rate as the user types; the server
//   works them out again on saving.
// - A line's item: name, description, unit, picture and specifications come from the Item (the
//   fields' fetch_from); the rate from the Draft PI's price list, or for a sub-item ("Sub-Item of"
//   filled) its price for that machine (manav.manav.pi.get_draft_pi_item_rate).
// - A saved Draft PI has "Make Final PI": unsaved changes are saved first, then the Sales Order
//   (Final PI) is made (manav.manav.pi.make_final_pi) and opened.
// - Once the Final PI is made the form is read only (the server refuses changes too) and links
//   to it.
//
// Created: 2026-10-29, when the user asked for the Draft PI as a document of its own, not a Sales
// Order.
// Later the same day: ticking CIF fills an empty CIF Port / Charges from the principal (is_cif).
//
// CHANGE NOTE
// Date: 2026-11-03
// Change: Ticking CIF writes 1500 in an empty CIF Charges when the principal has no default.
// Reason: The user asked for 1500 when CIF is selected, with the option to change it.
//
// CHANGE NOTE
// Date: 2026-11-03
// Change: A machine's line in the Items table is blue with a blue bar, its sub-items indented, as
// on the quotation (mark_machine_rows; the style is the quotation's manav-machine-row).
// Reason: The user said the main machine has no blue line on the Draft PI.

frappe.ui.form.on("Draft PI", {
	setup(frm) {
		mark_machine_rows(frm);
	},

	refresh(frm) {
		if (frm.doc.final_pi) {
			frm.set_intro(
				__("Final PI {0} has been made from this Draft PI; changes are made there.", [
					frappe.utils.get_form_link("Sales Order", frm.doc.final_pi, true),
				]),
				"blue"
			);
			frm.disable_form();
			return;
		}
		if (frm.is_new()) {
			frm.set_intro(__("Draft PI: change items, sub-items, quantities and rates, then save."), "orange");
			return;
		}
		frm.set_intro(
			__("Draft PI: items, sub-items, prices and the other details can still be changed. When it is agreed, use Make Final PI."),
			"orange"
		);
		if (frappe.model.can_create("Sales Order")) {
			frm.add_custom_button(__("Make Final PI"), () => make_final_pi(frm)).addClass("btn-primary");
		}
	},

	items_remove(frm) {
		set_totals(frm);
	},

	// CIF ticked: an empty CIF Port / Charges gets the principal's default, as on the quotation
	// (the server does the same on saving). Added 2026-10-29.
	// 2026-11-03: charges 1500 when the principal has no default (or there is no principal); editable.
	// 2026-11-04: runs when CIF Charges gets an amount (was: CIF ticked); the tick is hidden and set
	// by the server from the charges (quotation.fill_cif_defaults), at the user's request.
	cif_charges(frm) {
		if (!flt(frm.doc.cif_charges)) return;
		const fill = (defaults) => {
			// 2026-11-03: port FTWZ Chennai when the principal has none; Ex-Works From from the principal
			if (!frm.doc.cif_port) frm.set_value("cif_port", defaults.custom_cif_port || "FTWZ Chennai");
			if (defaults.custom_ex_works_from && !frm.doc.ex_works_from) frm.set_value("ex_works_from", defaults.custom_ex_works_from);
		};
		if (!frm.doc.custom_quotation_type) return fill({});
		frappe
			.call({ method: "manav.manav.quotation.get_type_defaults", args: { quotation_type: frm.doc.custom_quotation_type } })
			.then((r) => fill(r.message || {}));
	},
});

frappe.ui.form.on("Draft PI Item", {
	item_code(frm, cdt, cdn) {
		fetch_rate(frm, locals[cdt][cdn]);
	},

	custom_main_item_code(frm, cdt, cdn) {
		fetch_rate(frm, locals[cdt][cdn]);
	},

	qty(frm, cdt, cdn) {
		set_amount(frm, locals[cdt][cdn]);
	},

	rate(frm, cdt, cdn) {
		set_amount(frm, locals[cdt][cdn]);
	},
});

// The rate of a line whose item (or machine) was chosen here; also kept as its price list rate,
// which the Final PI keeps (the Sales Order's sub-item price check, quotation.keep_sub_item_rates).
function fetch_rate(frm, row) {
	if (!row.item_code) return;
	frappe
		.call({
			method: "manav.manav.pi.get_draft_pi_item_rate",
			args: {
				item_code: row.item_code,
				price_list: frm.doc.selling_price_list,
				currency: frm.doc.currency,
				main_item_code: row.custom_main_item_code,
			},
		})
		.then((r) => {
			const rate = flt(r.message);
			if (!rate) return;
			frappe.model.set_value(row.doctype, row.name, "price_list_rate", rate);
			frappe.model.set_value(row.doctype, row.name, "rate", rate);
		});
}

function set_amount(frm, row) {
	frappe.model.set_value(row.doctype, row.name, "amount", flt(row.qty) * flt(row.rate));
	set_totals(frm);
}

function set_totals(frm) {
	const items = frm.doc.items || [];
	frm.set_value("total_qty", items.reduce((sum, row) => sum + flt(row.qty), 0));
	frm.set_value("net_total", items.reduce((sum, row) => sum + flt(row.qty) * flt(row.rate), 0));
}

function make_final_pi(frm) {
	Promise.resolve(frm.is_dirty() ? frm.save() : null)
		.then(() =>
			frappe.call({
				method: "manav.manav.pi.make_final_pi",
				args: { draft_pi: frm.doc.name },
				freeze: true,
				freeze_message: __("Making the Final PI..."),
			})
		)
		.then((r) => r && r.message && frappe.set_route("Form", "Sales Order", r.message));
}

// Blue machine lines in the Items table (2026-11-03), as quotation.js does on the quotation:
// Frappe fires "grid-row-render" on the form each time it draws a line; a line that is not a
// sub-item (no "Sub-Item of") is a machine. Uses Frappe's grid internals (grid_row.wrapper,
// .data-row / .row-index), checked on Frappe 16.54; if they change the lines simply stay plain.
function mark_machine_rows(frm) {
	if (!document.getElementById("manav-draft-pi-machine-style")) {
		$(`<style id="manav-draft-pi-machine-style">
			:root { --manav-machine-bg: var(--blue-300); --manav-machine-text: var(--blue-800); }
			[data-theme="dark"] { --manav-machine-bg: var(--blue-900); --manav-machine-text: var(--blue-100); }
			.grid-body .grid-row.manav-machine-row > .data-row > .col {
				background-color: var(--manav-machine-bg); color: var(--manav-machine-text);
			}
			.grid-body .grid-row.manav-machine-row > .data-row > .row-index { box-shadow: inset 4px 0 0 var(--blue-500); }
			.grid-body .grid-row.manav-machine-row .form-control,
			.grid-body .grid-row.manav-machine-row .form-control:disabled,
			.grid-body .grid-row.manav-machine-row .form-control[readonly] {
				background-color: transparent; color: var(--manav-machine-text);
			}
			.grid-body .grid-row.manav-machine-row .static-area { font-weight: 600; }
			.grid-body .grid-row.manav-sub-item-row .col[data-fieldname="item_code"] .static-area { padding-left: 16px; }
		</style>`).appendTo("head");
	}
	$(frm.wrapper).on("grid-row-render", (event, grid_row) => {
		if (grid_row.grid.df.fieldname !== "items" || !grid_row.wrapper) return;
		const row = grid_row.doc || {};
		const is_sub_item = Boolean(row.custom_main_item_code);
		grid_row.wrapper.toggleClass("manav-machine-row", Boolean(row.item_code) && !is_sub_item);
		grid_row.wrapper.toggleClass("manav-sub-item-row", is_sub_item);
	});
}
