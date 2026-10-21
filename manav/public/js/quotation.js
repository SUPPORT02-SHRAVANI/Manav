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
//
// CHANGE NOTE
// Date: 2026-10-19
// Change: Sub-Item Sr.No carries the machine's number: the sub-items of machine 1 are 1.1, 1.2 ...
// A machine's line is a clearly visible blue (was the near-white --bg-blue) with a blue bar on the
// left; a sub-item's line is indented (manav-sub-item-row) under its machine. Lines moved by drag
// are numbered again (Quotation Item items_move).
// Reason: The user asked for blue machine rows, sub-items numbered 1.1, 1.2 under machine 1, and
// the sub-items indented in the table.
//
// CHANGE NOTE
// Date: 2026-10-19
// Change: Choosing the customer also fills Account Manager (custom_account_manager) from the
// Customer's Account Manager.
// Reason: The user asked for the Account Manager set on the Customer to appear on the quotation.
//
// CHANGE NOTE
// Date: 2026-10-19
// Change: Back and Save buttons on the Sub-Items dialog (Save applies the ticks and saves the
// quotation; was "Update", which did not save) and on the panel of an Items line opened for
// editing (add_row_form_buttons), at its top and foot.
// Reason: The user asked for Back and Save on these pop-ups, for easy use on the phone.
//
// CHANGE NOTE
// Date: 2026-10-19
// Change: Setting the Account Manager puts that user's Sales Person (by its Login User) in
// Signed By (custom_account_manager handler, server method get_signed_by).
// Reason: The user asked for the same person in Signed By as in Account Manager.
//
// CHANGE NOTE
// Date: 2026-10-19
// Change: The principal's currency and price list are put back whenever ERPNext changes them
// (on choosing the customer or company, or later), and an emptied letter head / terms template is
// filled again (keep_type_values). The principal's values are set one after another
// (set_type_values) instead of all at once.
// Reason: The user chose MACHINES and the quotation stayed in INR: ERPNext sets the customer's
// currency (none, so the company's INR) and Standard Selling when the customer is chosen, which
// replaced the principal's USD (quotation 26QX000082 was saved so).
//
// CHANGE NOTE
// Date: 2026-10-19
// Change: The Item Code search of the Items table shows each item's rate (set_item_query uses
// manav.manav.quotation.item_query_with_rate, which wraps ERPNext's item_query).
// Reason: The user asked to see the rate in the Item Code drop-down.
//
// CHANGE NOTE
// Date: 2026-10-19
// Change: After a currency / price list change, the sub-item lines get their machine's price back
// (restore_sub_item_rates); the rate in the Item Code drop-down is bold (add_rate_style).
// Reason: "Dollar not applied" on a MACHINES quotation: the currency was USD, but ERPNext had
// re-priced the sub-items from the price list, converting their old INR prices (26QX000082:
// 10K-40T-GBX 146.47 instead of 10,000). The user also asked for the rate in bold.

const MANAV_QUOTATION = "manav.manav.quotation";

frappe.ui.form.on("Quotation", {
	setup(frm) {
		setup_sub_item_buttons(frm);
		add_rate_style();
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
		load_type_defaults(frm).then((defaults) => {
			frm.manav_item_group = defaults.item_group || null;
			// Each of these is an ERPNext field; setting it runs ERPNext's own follow-up
			// (exchange rate for the currency, the terms text for the template, and so on).
			// One after another, so that those follow-ups do not run over each other.
			set_type_values(frm, defaults, ["currency", "selling_price_list", "letter_head", "tc_name"], false);
			if (defaults.custom_signed_by && !frm.doc.custom_signed_by) {
				frm.set_value("custom_signed_by", defaults.custom_signed_by);
			}
		});
		if ((frm.doc.items || []).some((row) => row.item_code)) {
			frappe.msgprint(__("The principal was changed. Check that the items belong to it."));
		}
	},

	// ERPNext puts the customer's (or else the company's) currency and price list on the quotation
	// when the customer or the company is chosen, and when a line is added it may set them again.
	// The principal decides them, so they are put back to the principal's (keep_type_values).
	// (Added 2026-10-19: a MACHINES quotation chosen before its customer was saved in INR.)
	currency(frm) {
		keep_type_values(frm, false);
	},
	selling_price_list(frm) {
		keep_type_values(frm, false);
	},
	company(frm) {
		keep_type_values(frm, true);
	},

	// The Account Manager (from the customer, or chosen by hand) also signs: Signed By becomes the
	// Sales Person whose Login User is this user. Without such a Sales Person, Signed By is left
	// as it is and a short note says what to link. (Added 2026-10-19, asked for by the user.)
	custom_account_manager(frm) {
		const user = frm.doc.custom_account_manager;
		if (!user || frm.doc.docstatus !== 0) return;
		frappe.call({
			method: `${MANAV_QUOTATION}.get_signed_by`,
			args: { user: user },
			callback(r) {
				// the manager may have been changed again while this was asked
				if (frm.doc.custom_account_manager !== user) return;
				if (r.message) {
					if (frm.doc.custom_signed_by !== r.message) frm.set_value("custom_signed_by", r.message);
				} else {
					frappe.show_alert({
						message: __("No Sales Person has {0} as Login User; Signed By was not changed.", [user]),
						indicator: "orange",
					});
				}
			},
		});
	},

	party_name(frm) {
		// ERPNext now fills the customer's details, currency and price list among them.
		keep_type_values(frm, true);
		if (frm.doc.quotation_to !== "Customer" || !frm.doc.party_name) return;
		// The Haas Cust ID and the Account Manager both come from the chosen customer; another
		// customer replaces them (the server fills the manager on saving only when it is empty).
		frappe.db
			.get_value("Customer", frm.doc.party_name, ["custom_haas_customer_id", "account_manager"])
			.then((r) => {
				const customer = r.message || {};
				frm.set_value("custom_haas_customer_id", customer.custom_haas_customer_id || null);
				// Only when the field is on the site (created by `bench migrate`); without the check
				// Frappe shows "Field custom_account_manager not found".
				if (frm.fields_dict.custom_account_manager) {
					frm.set_value("custom_account_manager", customer.account_manager || null);
				}
			});
	},
});

// A line dragged to another place: the machine numbers, and so the sub-items' 1.1, 1.2, change.
// (Frappe triggers "<table>_move" on the child doctype; checked on Frappe 16.33.1.)
frappe.ui.form.on("Quotation Item", {
	items_move(frm) {
		number_sub_items(frm);
		frm.refresh_field("items");
	},

	// An Items line opened for editing ("Editing Row #n"): Back and Save buttons on it.
	form_render(frm, cdt, cdn) {
		add_row_form_buttons(frm, cdn);
	},
});

// Back and Save on the panel of an Items line opened for editing, at its top and at its foot, so
// that on a phone the panel can be closed or the quotation saved without scrolling back or
// looking for the small arrow. Back closes the panel (the line keeps what was typed); Save
// closes it and saves the quotation. Save is left out when the quotation cannot be edited.
// Upgrade note: uses Frappe's grid internals (grid.grid_rows_by_docname, grid_row.grid_form and
// its wrapper, .grid-form-heading .row-actions, .grid-form-body, grid_row.toggle_view), checked on
// Frappe 16.33.1. When one is missing nothing is added; the panel works as before.
// CHANGE NOTE
// Date: 2026-10-19
// Change: Added (Back / Save on the row panel).
// Reason: The user asked for Back and Save on the quotation's pop-ups, for use on the phone.
function add_row_form_buttons(frm, cdn) {
	const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
	const grid_row = grid && grid.grid_rows_by_docname && grid.grid_rows_by_docname[cdn];
	const wrapper = grid_row && grid_row.grid_form && grid_row.grid_form.wrapper;
	if (!wrapper || typeof grid_row.toggle_view !== "function") return;
	if (wrapper.find(".manav-row-buttons").length) return;

	// a draft whose Items table may be edited (the grid's own check, as for its Delete button)
	const can_save = frm.doc.docstatus === 0 && (typeof grid.is_editable !== "function" || grid.is_editable());
	const make_buttons = (extra_class) => {
		const $buttons = $(`<span class="manav-row-buttons ${extra_class}">
			<button type="button" class="btn btn-secondary btn-sm manav-row-back">${__("Back")}</button>
			${can_save ? `<button type="button" class="btn btn-primary btn-sm manav-row-save">${__("Save")}</button>` : ""}
		</span>`);
		$buttons.find(".manav-row-back").on("click", () => {
			grid_row.toggle_view(false);
			return false; // not the click of the heading, which also opens/closes the panel
		});
		$buttons.find(".manav-row-save").on("click", () => {
			grid_row.toggle_view(false);
			frm.save();
			return false;
		});
		return $buttons;
	};

	// At the top: beside Delete. At the foot: its own bar under the fields.
	wrapper.find(".grid-form-heading .row-actions").first().prepend(make_buttons("manav-row-buttons-top"));
	wrapper.find(".grid-form-body").first().append(make_buttons("manav-row-buttons-bottom"));
	add_row_buttons_style();
}

function add_row_buttons_style() {
	if (document.getElementById("manav-row-buttons-style")) return;
	$(`<style id="manav-row-buttons-style">
		.manav-row-buttons { display: inline-flex; gap: 8px; }
		.manav-row-buttons-top { float: right; margin-left: 8px; }
		.manav-row-buttons-bottom {
			display: flex;
			justify-content: flex-end;
			padding: 12px 15px;
			border-top: 1px solid var(--border-color);
			position: sticky;
			bottom: 0;
			background: var(--fg-color);
		}
		.manav-row-buttons-bottom .btn { min-width: 88px; }
	</style>`).appendTo("head");
}

// The rate in the Item Code drop-down of the Items table in bold. The server sends the rate as
// the first line of each result's description (item_query_with_rate); Frappe prints the
// description as plain text, so the line break is kept (pre-line) and the first line made bold.
// Only for the Item Code field in the rows of the Quotation form, so no other drop-down changes.
// Upgrade note: uses the drop-down's markup (.awesomplete li span.small, the page's
// data-page-route), checked on Frappe 16.33.1; if it changes, the rate is simply not bold.
// Added 2026-10-19 (user's request).
function add_rate_style() {
	if (document.getElementById("manav-rate-style")) return;
	$(`<style id="manav-rate-style">
		.page-container[data-page-route="Quotation"] .grid-row [data-fieldname="item_code"] .awesomplete li span.small {
			display: block;
			white-space: pre-line;
		}
		.page-container[data-page-route="Quotation"] .grid-row [data-fieldname="item_code"] .awesomplete li span.small::first-line {
			font-weight: 700;
			color: var(--text-color);
		}
	</style>`).appendTo("head");
}

// What a quotation takes from its principal (get_type_defaults on the server), fetched once per
// principal and kept on the form.
function load_type_defaults(frm) {
	const type = frm.doc.custom_quotation_type;
	if (!type) return Promise.resolve(null);
	if (frm.manav_type_defaults && frm.manav_type_defaults.type === type) {
		return Promise.resolve(frm.manav_type_defaults.values);
	}
	return frappe
		.call({ method: `${MANAV_QUOTATION}.get_type_defaults`, args: { quotation_type: type } })
		.then((r) => {
			const values = r.message || {};
			frm.manav_type_defaults = { type: type, values: values };
			return values;
		});
}

// Set the principal's value of each of `fields` that differs, one after another. only_empty: set
// a field only when it is empty (used for the letter head and terms after ERPNext emptied or
// replaced them on choosing the customer, so a template chosen by hand is not undone).
function set_type_values(frm, defaults, fields, only_empty) {
	const steps = fields
		.filter((field) => defaults[field] && frm.doc[field] !== defaults[field])
		.filter((field) => !only_empty || !frm.doc[field])
		.map((field) => () => frm.set_value(field, defaults[field]));
	if (steps.length) return frappe.run_serially(steps);
}

// Put the principal's currency and price list back when ERPNext changed them, on a draft with a
// principal. ERPNext changes several fields one after another, so this waits until they have
// settled (each new change restarts the wait). with_texts: also fill an empty letter head and
// terms template. (Added 2026-10-19.)
function keep_type_values(frm, with_texts) {
	if (!frm.doc.custom_quotation_type || frm.doc.docstatus !== 0) return;
	frm.manav_keep_texts = frm.manav_keep_texts || with_texts;
	clearTimeout(frm.manav_keep_timer);
	frm.manav_keep_timer = setTimeout(() => {
		const texts = frm.manav_keep_texts;
		frm.manav_keep_texts = false;
		load_type_defaults(frm).then((defaults) => {
			if (!defaults) return;
			const done = set_type_values(frm, defaults, ["currency", "selling_price_list"], false);
			Promise.resolve(done).then(() => {
				if (texts) set_type_values(frm, defaults, ["letter_head", "tc_name"], true);
				// ERPNext prices every line again from the (new) price list; once its calls are
				// done, the sub-items get their machine's price back.
				frappe.after_ajax(() => restore_sub_item_rates(frm));
			});
		});
	}, 400);
}

// Give every sub-item line its price for its machine again (Quotation Sub Item Master, as the
// Sub-Items dialog sets it). ERPNext re-prices all lines from the price list when the currency or
// price list changes; a sub-item has no price there of its own (its price depends on the
// machine), so ERPNext converted its old INR price instead (e.g. 13,900 INR became 146.47 USD).
// Setting price_list_rate lets ERPNext work out rate, amount and totals as usual. The server does
// the same on saving (keep_sub_item_rates in manav/manav/quotation.py). (Added 2026-10-19.)
function restore_sub_item_rates(frm) {
	if (frm.doc.docstatus !== 0) return;
	const subs = (frm.doc.items || []).filter((row) => row.custom_main_item_code && row.item_code);
	const machines = main_item_codes(frm);
	if (!subs.length || !machines.length) return;
	frappe.call({
		method: `${MANAV_QUOTATION}.get_options`,
		args: { main_item_codes: machines },
		callback(r) {
			const key = (machine, item) => `${machine}::${item}`.toLowerCase();
			const rate_of = {};
			(r.message || []).forEach((option) => {
				const k = key(option.main_item_code, option.item_code);
				if (!(k in rate_of)) rate_of[k] = flt(option.rate);
			});
			subs.forEach((row) => {
				const rate = rate_of[key(row.custom_main_item_code, row.item_code)];
				// a master price of 0 (e.g. included as standard) does not wipe out a typed price
				if (rate && flt(row.price_list_rate) !== rate) {
					frappe.model.set_value(row.doctype, row.name, "price_list_rate", rate);
				}
			});
		},
	});
}

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
		// 2026-10-19: ERPNext's item search, with each item's rate in the drop-down. The three
		// manav_ keys tell the server where to look the rate up; it takes them out of the filters
		// before ERPNext's search runs (manav.manav.quotation.item_query_with_rate).
		filters.manav_price_list = frm.doc.selling_price_list || "";
		filters.manav_machines = main_item_codes(frm);
		filters.manav_currency = frm.doc.currency || "";
		return { query: `${MANAV_QUOTATION}.item_query_with_rate`, filters: filters };
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

		// A machine's line is blue, so the machines stand out; its sub-items are indented under it.
		grid_row.wrapper.toggleClass("manav-machine-row", is_machine);
		grid_row.wrapper.toggleClass("manav-sub-item-row", is_sub_item);
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
// is open for typing (its input boxes are then see-through), and a blue bar at its left edge.
// A sub-item's line has its Sub-Item Sr.No and Item Code moved right, so it reads as part of the
// machine above (no arrow: the user asked for the "↳" to be removed, 2026-10-19). Frappe's
// colour variables are used, with a darker blue for the dark theme. Added once per page.
// CHANGE NOTE
// Date: 2026-10-19
// Change: Blue is --blue-300 (light theme) / --blue-900 (dark theme) instead of --bg-blue, with a
// --blue-500 bar on the left and blue text; added the sub-item indent (without an arrow).
// Reason: --bg-blue (#edf6fd) could hardly be told from white; the user asked for blue rows and
// indented sub-items.
function add_machine_row_style() {
	if (document.getElementById("manav-machine-row-style")) return;
	$(`<style id="manav-machine-row-style">
		:root {
			--manav-machine-bg: var(--blue-300);
			--manav-machine-text: var(--blue-800);
		}
		[data-theme="dark"] {
			--manav-machine-bg: var(--blue-900);
			--manav-machine-text: var(--blue-100);
		}
		.grid-body .grid-row.manav-machine-row > .data-row > .col,
		.grid-body .grid-row.manav-machine-row > .data-row > .col:last-child {
			background-color: var(--manav-machine-bg);
			color: var(--manav-machine-text);
		}
		.grid-body .grid-row.manav-machine-row > .data-row > .row-index {
			box-shadow: inset 4px 0 0 var(--blue-500);
		}
		.grid-body .grid-row.manav-machine-row .form-control,
		.grid-body .grid-row.manav-machine-row .form-control:disabled,
		.grid-body .grid-row.manav-machine-row .form-control[readonly] {
			background-color: transparent;
			color: var(--manav-machine-text);
		}
		.grid-body .grid-row.manav-machine-row .static-area {
			font-weight: 600;
		}
		.grid-body .grid-row.manav-sub-item-row .col[data-fieldname="custom_sub_item_sr_no"] .static-area {
			padding-left: 12px;
		}
		.grid-body .grid-row.manav-sub-item-row .col[data-fieldname="item_code"] .static-area {
			padding-left: 16px;
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
				// 2026-10-19: "Back" closes the dialog without changing anything; "Save" (was
				// "Update") applies the ticks and saves the quotation. Asked for by the user, for
				// use on the phone.
				secondary_action_label: __("Back"),
				secondary_action() {
					dialog.hide();
				},
				primary_action_label: __("Save"),
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
					// Save the quotation with the new lines. When something required is still
					// missing, Frappe says what; the lines stay on the form.
					frm.save();
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

// Number the sub-items in Sub-Item Sr.No as <machine's No.>.<n>: under machine 1 they are 1.1,
// 1.2, 1.3 ..., under machine 2 they are 2.1, 2.2 ... A machine's No. is its place among the lines
// that are not sub-items (as the No. column shows it). A sub-item belongs to the nearest line above
// it of its machine; when there is none above, to the first line of its machine; when the machine
// is not on the quotation at all, it is numbered 1, 2, 3 without a machine number. A machine's
// line has no Sub-Item Sr.No. The same as number_sub_items in manav/manav/quotation.py, which
// sets the numbers again on saving.
// CHANGE NOTE
// Date: 2026-10-19
// Change: The number is "<machine No.>.<n>" (was n per machine code).
// Reason: The user asked for the sub-items of machine 1 to be numbered 1.1, 1.2 and so on.
function number_sub_items(frm) {
	const rows = frm.doc.items || [];
	// First pass: the No. of the first line of each machine (for a sub-item placed above it).
	const first_no = {};
	let machine_no = 0;
	rows.forEach((row) => {
		if (row.custom_main_item_code) return;
		machine_no++;
		if (row.item_code && !(row.item_code in first_no)) first_no[row.item_code] = machine_no;
	});

	const last_no = {};
	const counts = {};
	machine_no = 0;
	rows.forEach((row) => {
		const main_item_code = row.custom_main_item_code;
		if (!main_item_code) {
			machine_no++;
			if (row.item_code) last_no[row.item_code] = machine_no;
			row.custom_sub_item_sr_no = "";
			return;
		}
		const parent_no = last_no[main_item_code] || first_no[main_item_code] || 0;
		const key = parent_no || `?${main_item_code}`;
		counts[key] = (counts[key] || 0) + 1;
		row.custom_sub_item_sr_no = parent_no ? `${parent_no}.${counts[key]}` : String(counts[key]);
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
