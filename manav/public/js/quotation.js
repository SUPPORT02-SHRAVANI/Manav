// Copyright (c) 2026, milind and contributors
// For license information, please see license.txt

// Manav's additions to ERPNext's Quotation form (loaded through `doctype_js` in hooks.py).
//
// Working, in the order the employee uses the form:
// 1. Principal (Quotation Type): its currency, price list, letter head, terms template and signing
//    sales person are put on the quotation. The Items table then offers only the items of the
//    principal's Item Group, plus the Options group.
// 2. Customer: ERPNext fills name, address, contact and territory; this script adds the Haas Cust ID.
// 3. Items: ERPNext fills description, unit and the rate from the principal's price list. The
//    item's Specifications are copied by the field's fetch_from.
// 4. Sub-items (called options in the code and the data: Quotation Sub Item Master, the item
//    group Options): the "+" button beside the edit pen of a machine's line lists that machine's
//    sub-items, each with its price for that machine; those already on the quotation are ticked.
//    Ticked ones are added as quotation lines marked "Sub-Item of", under the machine's line, and
//    unticked ones are taken off. A search box at the top of the dialog narrows the list by code
//    or description. Sub-Item Sr.No numbers the sub-items of each machine 1, 2, 3.
//
// Totals, taxes and saving are ERPNext's own. The quotation number is given on the server
// (autoname in manav/manav/quotation.py).
//
// Created: 2026-10-12, when the quotation process was moved from Quotation Head to ERPNext's Quotation.
//
// CHANGE NOTE
// Date: 2026-10-15
// Change: "Options" is called "Sub-Items" on the form. The "Add Options" button under the Items
// table is replaced by a "+" button beside the edit pen of each machine's line, which offers only
// that machine's sub-items. Added sub-items are put under their machine's line instead of at the
// end of the table.
// Reason: The user asked for the words sub-items, and to add them from the machine's own line.
//
// CHANGE NOTE
// Date: 2026-10-15
// Change: The sub-items dialog shows the sub-items already on the quotation ticked (before they
// were left out), and unticking one takes its line off. Sub-Item Sr.No is numbered on every change
// (number_sub_items).
// Reason: The user asked to see the selected sub-items ticked, and for a sub-item number column.
//
// CHANGE NOTE
// Date: 2026-10-15
// Change: A machine's line in the Items table is coloured (manav-machine-row) in every cell, its
// "+" sits beside the edit pen, and the No. column numbers only the machines (sub-items blank).
// Reason: The user asked for the machines' rows to be coloured and for no row number on the
// sub-items; the "+" sat above the pen (it had been put inside the pen's own box) and only some
// cells of an open line were coloured.
//
// CHANGE NOTE
// Date: 2026-10-15
// Change: ERPNext's frm.cscript.calculate_taxes_and_totals is only called when present; the
// upgrade note above setup_sub_item_buttons lists every Frappe/ERPNext internal this file uses.
// Reason: Upgrade-safe rule: internals are guarded and listed with the version they were checked on.
//
// CHANGE NOTE
// Date: 2026-10-16
// Change: The sub-items dialog has a Search box that shows only the sub-items whose code or
// description has the typed text. The "Add Sub-Items" button at the top of the form is removed;
// sub-items are added with the "+" on each machine's line.
// Reason: The user asked to search the sub-items by code, and to remove the top button.

const MANAV_QUOTATION = "manav.manav.quotation";

frappe.ui.form.on("Quotation", {
	setup(frm) {
		setup_sub_item_buttons(frm);
	},

	// A line deleted by hand: the sub-items after it are numbered again.
	items_remove(frm) {
		number_sub_items(frm);
		frm.refresh_field("items");
	},

	refresh(frm) {
		set_item_query(frm);
	},

	custom_quotation_type(frm) {
		if (!frm.doc.custom_quotation_type) {
			frm.manav_item_group = null;
			return;
		}
		frappe.call({
			method: `${MANAV_QUOTATION}.get_type_defaults`,
			args: { quotation_type: frm.doc.custom_quotation_type },
			callback(r) {
				const defaults = r.message || {};
				frm.manav_item_group = defaults.item_group || null;
				// Each of these is an ERPNext field; setting it runs ERPNext's own follow-up
				// (exchange rate for the currency, the terms text for the template, and so on).
				["currency", "selling_price_list", "letter_head", "tc_name"].forEach((field) => {
					if (defaults[field] && frm.doc[field] !== defaults[field]) {
						frm.set_value(field, defaults[field]);
					}
				});
				if (defaults.custom_signed_by && !frm.doc.custom_signed_by) {
					frm.set_value("custom_signed_by", defaults.custom_signed_by);
				}
			},
		});
		if ((frm.doc.items || []).some((row) => row.item_code)) {
			frappe.msgprint(__("The principal was changed. Check that the items belong to it."));
		}
	},

	party_name(frm) {
		if (frm.doc.quotation_to !== "Customer" || !frm.doc.party_name) return;
		frappe.db.get_value("Customer", frm.doc.party_name, "custom_haas_customer_id").then((r) => {
			frm.set_value("custom_haas_customer_id", (r.message || {}).custom_haas_customer_id || null);
		});
	},
});

// Offer only the items of the principal's Item Group, and the Options group. This replaces the
// item query ERPNext sets on the form, so it is set again on every refresh. A quotation without
// a principal keeps ERPNext's rule (all sales items).
function set_item_query(frm) {
	const load_group = frm.doc.custom_quotation_type
		? frappe.db.get_value("Quotation Type", frm.doc.custom_quotation_type, "item_group")
		: Promise.resolve({ message: {} });
	load_group.then((r) => {
		frm.manav_item_group = (r.message || {}).item_group || null;
	});
	frm.set_query("item_code", "items", () => {
		const filters = { is_sales_item: 1, has_variants: 0 };
		if (frm.manav_item_group) {
			filters.item_group = ["in", [frm.manav_item_group, "Options"]];
		}
		return { query: "erpnext.controllers.queries.item_query", filters: filters };
	});
}

// The machines on the quotation: the item codes of the lines that are not options themselves.
function main_item_codes(frm) {
	const codes = (frm.doc.items || [])
		.filter((row) => row.item_code && !row.custom_main_item_code)
		.map((row) => row.item_code);
	return [...new Set(codes)];
}

// Put a "+" button beside the edit pen of each machine's line in the Items table. Frappe draws a
// row again whenever it changes, and then fires "grid-row-render" on the form; the button is
// added (or removed, when the line became a sub-item or was emptied) each time.
// Upgrade note: this uses Frappe's grid internals (the "grid-row-render" event, grid_row.wrapper,
// grid_row.open_form_button, the .row-index span and the .grid-row/.data-row classes), checked on
// Frappe 16.33.1. The sub-items dialog also uses frappe.model.clear_doc (to take a line off) and
// ERPNext's frm.cscript.calculate_taxes_and_totals (guarded). After a Frappe upgrade, check the Items table of a Quotation: "+" beside the
// pen, machine lines coloured, no number in No. for sub-items. If an internal is gone, the code
// does nothing rather than failing (the open_form_button check below).
function setup_sub_item_buttons(frm) {
	add_machine_row_style();
	$(frm.wrapper).on("grid-row-render", (event, grid_row) => {
		if (grid_row.grid.df.fieldname !== "items" || !grid_row.open_form_button) return;
		// Frappe keeps the pen itself (.btn-open-row) in open_form_button; the cell is its parent.
		const cell = grid_row.open_form_button.parent();
		cell.find(".manav-add-sub-items").remove();

		const row = grid_row.doc;
		const is_sub_item = Boolean(row.custom_main_item_code);
		const is_machine = Boolean(row.item_code) && !is_sub_item;

		// No.: the machines (and lines not yet filled) are numbered 1, 2, 3 among themselves; a
		// sub-item has no number there, it has its Sub-Item Sr.No. Only the number shown changes:
		// the line's idx, which keeps the order, stays as Frappe sets it.
		const position = (frm.doc.items || []).filter((line) => !line.custom_main_item_code).indexOf(row);
		grid_row.wrapper.find(".row-index span").text(is_sub_item ? "" : position + 1);

		// A machine's line is coloured, so the machines stand out from their sub-items.
		grid_row.wrapper.toggleClass("manav-machine-row", is_machine);
		if (frm.doc.docstatus !== 0 || !is_machine) return;

		// The "+" goes into the cell, in front of the pen, so the two sit side by side.
		$(`<div class="manav-add-sub-items" title="${__("Add Sub-Items")}" style="cursor: pointer; margin-right: 8px;">
				<a>${frappe.utils.icon("add", "xs")}</a>
			</div>`)
			.prependTo(cell)
			// Not the click of the cell, which opens the row for editing.
			.on("click", () => {
				show_options_dialog(frm, row.item_code);
				return false;
			});
	});
}

// The colour of a machine's line in the Items table: every cell of the line, also while the line
// is open for typing (its input boxes are then see-through). Frappe's colour variables are used,
// so the colour also suits the dark theme. Added once per page.
function add_machine_row_style() {
	if (document.getElementById("manav-machine-row-style")) return;
	$(`<style id="manav-machine-row-style">
		.grid-body .grid-row.manav-machine-row > .data-row > .col,
		.grid-body .grid-row.manav-machine-row > .data-row > .col:last-child {
			background-color: var(--bg-blue);
		}
		.grid-body .grid-row.manav-machine-row .form-control,
		.grid-body .grid-row.manav-machine-row .form-control:disabled,
		.grid-body .grid-row.manav-machine-row .form-control[readonly] {
			background-color: transparent;
		}
		.grid-body .grid-row.manav-machine-row .static-area {
			font-weight: 600;
		}
	</style>`).appendTo("head");
}

// Show every sub-item of the machines on the quotation (or of `only_code`, the machine whose "+"
// was pressed) with a tick box, one block per machine, and add the ticked ones as quotation lines.
function show_options_dialog(frm, only_code) {
	const codes = only_code ? [only_code] : main_item_codes(frm);
	if (!codes.length) {
		frappe.msgprint(__("Add a machine first; the sub-items depend on the machine."));
		return;
	}

	frappe.call({
		method: `${MANAV_QUOTATION}.get_options`,
		args: { main_item_codes: codes },
		callback(r) {
			// The sub-items already on the quotation, by machine and sub-item: they are shown ticked.
			const key_of = (main_item_code, item_code) => `${main_item_code}::${item_code}`;
			const added = new Set(
				(frm.doc.items || [])
					.filter((row) => row.custom_main_item_code)
					.map((row) => key_of(row.custom_main_item_code, row.item_code))
			);
			const options = r.message || [];
			if (!options.length) {
				frappe.msgprint(
					only_code
						? __("There are no sub-items for {0}.", [only_code])
						: __("There are no sub-items for the machines on this quotation.")
				);
				return;
			}

			const by_key = {};
			const fields = [
				{
					fieldtype: "Data",
					fieldname: "search",
					label: __("Search"),
					placeholder: __("Type a code or description to find a sub-item"),
				},
			];
			const multi_check_fields = [];
			codes.forEach((code, index) => {
				const of_item = options.filter((option) => option.main_item_code === code);
				if (!of_item.length) return;
				fields.push({ fieldtype: "Section Break", label: __("Sub-Items of {0}", [code]) });
				multi_check_fields.push(`options_${index}`);
				fields.push({
					fieldtype: "MultiCheck",
					fieldname: `options_${index}`,
					columns: 2,
					options: of_item.map((option) => {
						by_key[option.key] = option;
						const description = (option.description || "").slice(0, 90);
						const rate = format_number(flt(option.rate));
						const label = `${option.item_code}: ${description} (${rate})`;
						return {
							label: frappe.utils.escape_html(label),
							value: option.key,
							checked: added.has(key_of(option.main_item_code, option.item_code)) ? 1 : 0,
						};
					}),
				});
			});

			const dialog = new frappe.ui.Dialog({
				title: only_code ? __("Sub-Items of {0}", [only_code]) : __("Sub-Items"),
				size: "extra-large",
				fields: fields,
				primary_action_label: __("Update"),
				primary_action(values) {
					const ticked = new Set(multi_check_fields.flatMap((fieldname) => values[fieldname] || []));
					const shown = Object.values(by_key);
					// Ticked and not yet on the quotation: add it under its machine.
					shown
						.filter((option) => ticked.has(option.key))
						.filter((option) => !added.has(key_of(option.main_item_code, option.item_code)))
						.forEach((option) => add_option_line(frm, option));
					// On the quotation and unticked: take its line off.
					const untick = new Set(
						shown
							.filter((option) => !ticked.has(option.key))
							.map((option) => key_of(option.main_item_code, option.item_code))
					);
					(frm.doc.items || [])
						.filter((row) => row.custom_main_item_code)
						.filter((row) => untick.has(key_of(row.custom_main_item_code, row.item_code)))
						.forEach((row) => frappe.model.clear_doc(row.doctype, row.name));
					number_sub_items(frm);
					dialog.hide();
					frm.refresh_field("items");
					frm.dirty();
					// ERPNext's own totals; the option lines carry their rate already. (ERPNext's
					// controller method; guarded so a version without it does not stop the dialog.)
					if (typeof frm.cscript.calculate_taxes_and_totals === "function") {
						frm.cscript.calculate_taxes_and_totals();
					}
				},
			});
			// Search: show only the sub-items whose code or description has the typed text (ticked
			// ones that are hidden stay ticked), and hide a machine's block when none of its show.
			dialog.fields_dict.search.$input.on("input", function () {
				const text = ($(this).val() || "").trim().toLowerCase();
				multi_check_fields.forEach((fieldname) => {
					const field = dialog.fields_dict[fieldname];
					let shown = 0;
					field.$wrapper.find(".checkbox").each(function () {
						const match = !text || $(this).text().toLowerCase().includes(text);
						$(this).toggle(match);
						if (match) shown++;
					});
					field.$wrapper.closest(".form-section").toggle(shown > 0);
				});
			});
			dialog.show();
			setTimeout(() => dialog.fields_dict.search.$input.trigger("focus"), 300);
		},
	});
}

// Number the sub-items of each machine 1, 2, 3 ... in Sub-Item Sr.No, in the order of the lines;
// a machine's line has no number. The same as number_sub_items in manav/manav/quotation.py, which
// sets the numbers again on saving.
function number_sub_items(frm) {
	const counts = {};
	(frm.doc.items || []).forEach((row) => {
		const main_item_code = row.custom_main_item_code;
		if (main_item_code) {
			counts[main_item_code] = (counts[main_item_code] || 0) + 1;
			row.custom_sub_item_sr_no = String(counts[main_item_code]);
		} else {
			row.custom_sub_item_sr_no = "";
		}
	});
}

// Add one option as a quotation line. The values are set on the row directly, without running
// ERPNext's item_code event: that event would look the rate up in the price list, and an option's
// price depends on the machine, so it comes from Quotation Sub Item Master instead.
function add_option_line(frm, option) {
	// ERPNext keeps one empty line in a new quotation; use it up before adding more.
	const empty = (frm.doc.items || []).find((row) => !row.item_code);
	const row = empty || frm.add_child("items");
	move_under_machine(frm, row, option.main_item_code);
	Object.assign(row, {
		item_code: option.item_code,
		item_name: option.item_name,
		description: option.description,
		custom_main_item_code: option.main_item_code,
		stock_uom: option.stock_uom,
		uom: option.stock_uom,
		conversion_factor: 1,
		qty: 1,
		price_list_rate: flt(option.rate),
		rate: flt(option.rate),
	});
}

// Move `row` (a new sub-item line) to just below the lines of its machine: below the machine's
// line and the sub-items already under it. When the machine is on the quotation more than once,
// below its last line. Without the machine on the quotation the row stays where it is.
function move_under_machine(frm, row, main_item_code) {
	const items = frm.doc.items;
	items.splice(items.indexOf(row), 1);
	let after = -1;
	items.forEach((line, index) => {
		const is_machine = line.item_code === main_item_code && !line.custom_main_item_code;
		if (is_machine) after = index;
		else if (after === index - 1 && line.custom_main_item_code === main_item_code) after = index;
	});
	items.splice(after === -1 ? items.length : after + 1, 0, row);
	items.forEach((line, index) => (line.idx = index + 1));
}
