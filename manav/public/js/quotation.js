// Copyright (c) 2026, milind and contributors
// For license information, please see license.txt

// Manav's additions to ERPNext's Quotation form (loaded through `doctype_js` in hooks.py).
//
// Working, in the order the employee uses the form:
// 1. Principal (Quotation Type): its currency, price list, letter head, terms template and signing
//    sales person are put on the quotation. The Items table offers every sales item of the Item
//    Master (2026-11-05; before: only the principal's Item Group, plus the Options group).
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
//
// CHANGE NOTE
// Date: 2026-10-28
// Change: The PI. A submitted quotation has a "Make Draft PI" button, which makes an ERPNext Sales
// Order from it (ERPNext's own Quotation -> Sales Order, so the fields of the same name, sub-item
// links among them, are copied). A Sales Order not yet submitted is the Draft PI: its items,
// sub-items ("+" on a machine's line), prices and other fields can be changed as on a quotation;
// submitting it makes it the Final PI. This file is loaded for Sales Order too (hooks.py) and
// registers the handlers of both forms on its first run only (each form runs the file in a scope
// of its own, so a second run would register every handler twice).
// Reason: The user asked for Quotation -> Draft PI -> Final PI, with items and sub-items editable in
// the draft, and chose Sales Order as the PI.
//
// CHANGE NOTE
// Date: 2026-10-28
// Change: "Customer's Machine (Serial No)" offers the customer's machines (ERPNext Serial Nos), and
// "Spares for Machine" adds that model's linked spare parts (setup_machine_spares).
// Reason: The user asked for spare parts quotations for the machine the customer bought.
//
// CHANGE NOTE
// Date: 2026-10-28
// Change: Sales Order "validate" fills an empty (hidden) Delivery Date with the PI's date.
// Reason: Saving a Draft PI stopped with "Delivery Date is required in every row" although the
// user had asked for Delivery Date to be removed from the PI.
//
// CHANGE NOTE
// Date: 2026-10-29
// Change: The Draft PI is a Manav doctype of its own ("Make Draft PI" makes it); a Sales Order is the
// Final PI only (show_pi_stage). The Draft PI's form has its own script (doctype/draft_pi/draft_pi.js).
// Reason: The user asked for the Draft PI as a separate document before the Final PI (Sales Order).
//
// CHANGE NOTE
// Date: 2026-11-02
// Change: The Item Code search of a machine's line (no "Sub-Item of") offers only the principal's
// Item Group, no longer the Options group; a sub-item line ("Sub-Item of" filled) still offers the
// principal's group and Options. Sub-items come from the "+" button of their machine and spares from
// "Spares for Machine", as before.
// Reason: The user asked why ACF (an option, a sub-item) is offered in the Item Code list when no
// spares / sub-items were asked for.
//
// CHANGE NOTE
// Date: 2026-11-05
// Change: The sub-items dialog shows each sub-item's price without decimals (25,000 not 25,000.000).
// Reason: The user asked for no decimals in the sub-item list.
//
// CHANGE NOTE
// Date: 2026-11-05
// Change: The Item Code dropdown of the Items table offers every sales item of the Item Master on
// every line; it is no longer limited to the principal's Item Group (or Options on sub-item lines).
// Reason: The user asked for the full Item Master in the dropdown when adding a quotation item.
//
// CHANGE NOTE
// Date: 2026-11-13
// Change: CIF Charges / CIF Port that this form wrote itself (a principal that is CIF by default,
// e.g. MACHINES: 1500, Chennai Sea Port) are cleared again when the principal is changed to one that
// is not CIF by default (e.g. JAGDEEP). Amounts the user typed are kept.
// Reason: The user asked for the CIF line to print only when CIF was filled on the quotation; a
// Jagdeep quotation started as MACHINES kept the MACHINES CIF and printed it.

const MANAV_QUOTATION = "manav.manav.quotation";

const quotation_events = {
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
		add_draft_pi_button(frm);
		setup_machine_spares(frm);
		fill_missing_magic_code(frm);
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
			// 2026-10-29: a principal that is CIF by default makes the quotation CIF
			// 2026-11-04: no tick any more: its CIF Charges (1500 without a default) are written,
			// and custom_cif_charges below fills the port and Ex-Works From
			if (defaults.custom_is_cif && !flt(frm.doc.custom_cif_charges) && frm.doc.docstatus === 0) {
				const charges = flt(defaults.custom_cif_charges) || DEFAULT_CIF_CHARGES;
				frm.set_value("custom_cif_charges", charges);
				// 2026-11-13: remembered, so that a change to a non-CIF principal can take it back
				frm.manav_auto_cif = { charges: charges, port: defaults.custom_cif_port || "FTWZ Chennai" };
			} else if (!defaults.custom_is_cif && frm.doc.docstatus === 0 && frm.manav_auto_cif) {
				// 2026-11-13: the new principal is not CIF by default: CIF written by this form (not
				// typed by the user) is cleared, so the print shows no CIF line
				const auto = frm.manav_auto_cif;
				frm.manav_auto_cif = null;
				if (flt(frm.doc.custom_cif_charges) === auto.charges) {
					frm.set_value("custom_cif_charges", 0);
					if (frm.doc.custom_cif_port === auto.port) frm.set_value("custom_cif_port", "");
				}
			}
			// 2026-11-04: Ex-Works From starts the price line ("Price <Ex-Works From> <Port> (1 NOS)"):
			// an empty one gets the principal's Ex-Works From, else its Price Basis; the user changes it
			const ex_works = defaults.custom_ex_works_from || defaults.price_basis;
			if (ex_works && frm.fields_dict.custom_ex_works_from && !frm.doc.custom_ex_works_from && frm.doc.docstatus === 0) {
				frm.set_value("custom_ex_works_from", ex_works);
			}
		});
		if ((frm.doc.items || []).some((row) => row.item_code)) {
			frappe.msgprint(__("The principal was changed. Check that the items belong to it."));
		}
	},

	// CIF ticked: an empty CIF Port / Charges gets the principal's default (Quotation Type); the
	// server does the same on saving (quotation.fill_cif_defaults). Added 2026-10-29.
	// CHANGE NOTE
	// Date: 2026-11-03
	// Change: Charges are 1500 (DEFAULT_CIF_CHARGES) when the principal has no default; the field
	// stays editable. Shared with the Final PI (Sales Order) form.
	// Reason: The user asked for 1500 to be written when CIF is selected, with the option to change it.
	// CHANGE NOTE
	// Date: 2026-11-04
	// Change: Runs when CIF Charges gets an amount (was: when CIF was ticked); the CIF tick is hidden
	// and set by the server from the charges (quotation.fill_cif_defaults).
	// Reason: The user asked to remove the CIF tick and to show the CIF fields directly.
	custom_cif_charges(frm) {
		if (!flt(frm.doc.custom_cif_charges) || frm.doc.docstatus !== 0) return;
		load_type_defaults(frm).then((defaults) => {
			defaults = defaults || {};
			// 2026-11-03: port FTWZ Chennai when the principal has none; Ex-Works From from the principal
			if (!frm.doc.custom_cif_port) {
				frm.set_value("custom_cif_port", defaults.custom_cif_port || "FTWZ Chennai");
				// 2026-11-13: the port written here is the form's, like the charges (manav_auto_cif)
				if (frm.manav_auto_cif) frm.manav_auto_cif.port = defaults.custom_cif_port || "FTWZ Chennai";
			}
			if (defaults.custom_ex_works_from && frm.fields_dict.custom_ex_works_from && !frm.doc.custom_ex_works_from) {
				frm.set_value("custom_ex_works_from", defaults.custom_ex_works_from);
			}
		});
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

	custom_machine_serial_no(frm) {
		on_machine_serial_no(frm);
	},

	party_name(frm) {
		// ERPNext now fills the customer's details, currency and price list among them.
		keep_type_values(frm, true);
		if (frm.doc.quotation_to !== "Customer" || !frm.doc.party_name) return;
		fill_customer_values(frm, frm.doc.party_name);
	},
};

// The Haas Cust ID and the Account Manager both come from the chosen customer; another customer
// replaces them (the server fills the manager on saving only when it is empty). Used by the
// quotation (party_name) and the PI (customer).
// 2026-11-03: also the customer's old-system (Magic) code, Customer.custom_customer_code, shown in
// Magic Cust Code.
function fill_customer_values(frm, customer_name) {
	frappe.db.get_value("Customer", customer_name, ["custom_haas_customer_id", "account_manager", "custom_customer_code"]).then((r) => {
		const customer = r.message || {};
		frm.set_value("custom_haas_customer_id", customer.custom_haas_customer_id || null);
		if (frm.fields_dict.custom_magic_cust_code) {
			frm.set_value("custom_magic_cust_code", customer.custom_customer_code || null);
		}
		// Only when the field is on the site (created by `bench migrate`); without the check
		// Frappe shows "Field custom_account_manager not found".
		if (frm.fields_dict.custom_account_manager) {
			frm.set_value("custom_account_manager", customer.account_manager || null);
		}
	});
}

// CHANGE NOTE
// Date: 2026-11-12
// Change: A draft quotation that already has its customer but no Magic Cust Code (made from a lead,
// copied, or opened from a link) gets the code when the form opens, not only on saving.
// Reason: The user asked for the Magic code to be visible before the quotation is saved; the
// party_name event that fills it does not run when the customer comes with the new document.
function fill_missing_magic_code(frm) {
	if (frm.doc.doctype !== "Quotation" || frm.doc.docstatus !== 0) return;
	if (!frm.fields_dict.custom_magic_cust_code || frm.doc.custom_magic_cust_code) return;
	if (frm.doc.quotation_to !== "Customer" || !frm.doc.party_name) return;
	const customer = frm.doc.party_name;
	frappe.db.get_value("Customer", customer, "custom_customer_code").then((r) => {
		const code = r.message && r.message.custom_customer_code;
		// only when the customer has a code and was not changed meanwhile
		if (code && frm.doc.party_name === customer && !frm.doc.custom_magic_cust_code) {
			frm.set_value("custom_magic_cust_code", code);
		}
	});
}

// Items need a principal first (2026-11-12, the user's request): the principal decides the price
// list and currency, and so the rates; an item chosen before it would be priced from the wrong list.
// Returns true (after telling the user) when the principal is still empty.
function principal_missing(frm) {
	if (!frm.fields_dict.custom_quotation_type || frm.doc.custom_quotation_type) return false;
	frappe.msgprint({
		title: __("Select the Principal first"),
		message: __("Please select the Principal (Quotation Type) before adding items."),
		indicator: "orange",
	});
	frm.scroll_to_field("custom_quotation_type");
	return true;
}

// The PI (Sales Order) works as the quotation does: sub-items, item search with rates, the
// principal's currency and price list, Account Manager and Signed By. (2026-10-28)
// CIF Charges written when CIF is ticked and the principal has no default (2026-11-03); the same
// as quotation.DEFAULT_CIF_CHARGES on the server.
const DEFAULT_CIF_CHARGES = 1500;

const sales_order_events = {
	setup: quotation_events.setup,
	// 2026-11-03: the Final PI too: CIF ticked -> empty CIF Port / Charges filled (1500 by default)
	// 2026-11-04: CIF Charges with an amount -> empty CIF Port / Ex-Works From filled (no tick)
	custom_cif_charges: quotation_events.custom_cif_charges,
	items_remove: quotation_events.items_remove,
	custom_quotation_type: quotation_events.custom_quotation_type,
	currency: quotation_events.currency,
	selling_price_list: quotation_events.selling_price_list,
	company: quotation_events.company,
	custom_account_manager: quotation_events.custom_account_manager,
	custom_machine_serial_no: quotation_events.custom_machine_serial_no,

	refresh(frm) {
		set_item_query(frm);
		show_pi_stage(frm);
		setup_machine_spares(frm);
	},

	// The PI has no Delivery Date for the user (hidden, 2026-10-28), but ERPNext's form makes the
	// Items' Delivery Date compulsory (toggle_delivery_date) and stops the save. Frappe runs this
	// "validate" before that check, so an empty date is filled with the PI's date here; the server
	// does the same (pi.fill_delivery_date). Values are set on the rows directly, so ERPNext's
	// delivery-date handlers do not run. (Checked on Frappe 16.33.1 / ERPNext 16.)
	validate(frm) {
		const date = frm.doc.transaction_date || frappe.datetime.get_today();
		if (!frm.doc.delivery_date) frm.doc.delivery_date = date;
		(frm.doc.items || []).forEach((row) => {
			if (!row.delivery_date) row.delivery_date = frm.doc.delivery_date;
		});
	},

	customer(frm) {
		keep_type_values(frm, true);
		if (frm.doc.customer) fill_customer_values(frm, frm.doc.customer);
	},
};

// "Make Draft PI" on a submitted quotation that still has something to order: the quotation is
// copied into a new Draft PI (Manav doctype; manav.manav.pi.make_draft_pi), opened unsaved.
// CHANGE NOTE
// Date: 2026-10-29
// Change: Makes a Draft PI (Manav doctype) instead of a Sales Order (ERPNext's make_sales_order);
// the Sales Order, the Final PI, is made from the Draft PI.
// Reason: The user asked for the Draft PI as a separate document, not a Sales Order.
function add_draft_pi_button(frm) {
	if (frm.doc.docstatus !== 1 || ["Lost", "Ordered"].includes(frm.doc.status)) return;
	if (!frappe.model.can_create("Draft PI")) return;
	frm.add_custom_button(__("Make Draft PI"), () => {
		frappe.model.open_mapped_doc({
			method: "manav.manav.pi.make_draft_pi",
			frm: frm,
		});
	}).addClass("btn-primary");
}

// Spares for the customer's machine (2026-10-28, user's request). The customer's machines are
// ERPNext Serial Nos (serial number, machine model, customer). "Customer's Machine (Serial No)"
// offers only the chosen customer's machines; on a draft with a machine, "Spares for Machine" lists
// the spare parts linked to its model (Quotation Sub Item Master) to tick, and adds the ticked ones
// as ordinary lines: setting item_code runs ERPNext's own item fetch, so name, unit and the price
// from the quotation's price list come as for any line. Other spares are found as before through
// the Item Code of a new line (all items of the principal's group, Spares).
function setup_machine_spares(frm) {
	if (!frm.fields_dict.custom_machine_serial_no) return;
	frm.set_query("custom_machine_serial_no", () => {
		const customer = frm.doc.doctype === "Sales Order" ? frm.doc.customer : frm.doc.quotation_to === "Customer" && frm.doc.party_name;
		return customer ? { filters: { customer: customer } } : {};
	});
	if (frm.doc.docstatus === 0 && frm.doc.custom_machine_serial_no) {
		frm.add_custom_button(__("Spares for Machine"), () => show_machine_spares_dialog(frm));
	}
}

// The machine chosen: its serial number is also the old "Machine Number" field, and the button is shown.
function on_machine_serial_no(frm) {
	const serial_no = frm.doc.custom_machine_serial_no;
	if (serial_no && frm.doc.custom_machine_number !== serial_no) {
		frm.set_value("custom_machine_number", serial_no);
	}
	frm.refresh();
}

function show_machine_spares_dialog(frm) {
	frappe.call({
		method: `${MANAV_QUOTATION}.get_machine_spares`,
		args: { serial_no: frm.doc.custom_machine_serial_no },
		callback(r) {
			const { model, spares } = r.message || {};
			if (!spares || !spares.length) {
				frappe.msgprint(
					__("No spare parts are linked to {0} in Quotation Sub Item Master. Add them with a new line's Item Code.", [
						model || frm.doc.custom_machine_serial_no,
					])
				);
				return;
			}
			const on_quotation = new Set((frm.doc.items || []).map((row) => row.item_code));
			const dialog = new frappe.ui.Dialog({
				title: __("Spares for {0} ({1})", [model, frm.doc.custom_machine_serial_no]),
				size: "extra-large",
				fields: [
					{
						fieldtype: "MultiCheck",
						fieldname: "spares",
						columns: 2,
						options: spares.map((spare) => ({
							label: frappe.utils.escape_html(`${spare.item_code}: ${(spare.description || "").slice(0, 90)}`),
							value: spare.item_code,
							checked: on_quotation.has(spare.item_code) ? 1 : 0,
						})),
					},
				],
				secondary_action_label: __("Back"),
				secondary_action() {
					dialog.hide();
				},
				primary_action_label: __("Add"),
				primary_action(values) {
					const codes = (values.spares || []).filter((code) => !on_quotation.has(code));
					dialog.hide();
					// one after another, so that ERPNext's fetch of each line finishes before the next
					frappe.run_serially(
						codes.map((code) => () => {
							const empty = (frm.doc.items || []).find((row) => !row.item_code);
							const row = empty || frm.add_child("items");
							return frappe.model.set_value(row.doctype, row.name, "item_code", code);
						})
					);
				},
			});
			dialog.show();
		},
	});
}

// Which PI this Sales Order is, at the top of the form: since 2026-10-29 every Sales Order is the
// Final PI (the Draft PI is the Manav doctype "Draft PI"), so a draft says to submit it.
// CHANGE NOTE
// Date: 2026-10-29
// Change: "Final PI, not yet submitted" for a draft Sales Order (was "Draft PI").
// Reason: The user asked for the Draft PI as a separate document before the Final PI.
function show_pi_stage(frm) {
	if (frm.doc.docstatus === 0) {
		frm.set_intro(__("Final PI, not yet submitted: check it and submit it to confirm the order."), "blue");
	} else if (frm.doc.docstatus === 1) {
		frm.set_intro(__("Final PI."), "green");
	} else {
		frm.set_intro("");
	}
}

// A line dragged to another place: the machine numbers, and so the sub-items' 1.1, 1.2, change.
// (Frappe triggers "<table>_move" on the child doctype; checked on Frappe 16.33.1.)
const quotation_item_events = {
	items_move(frm) {
		number_sub_items(frm);
		frm.refresh_field("items");
	},

	// An Items line opened for editing ("Editing Row #n"): Back and Save buttons on it.
	form_render(frm, cdt, cdn) {
		add_row_form_buttons(frm, cdn);
	},

	// CHANGE NOTE
	// Date: 2026-11-12
	// Change: On a quotation without a Principal, adding a line or choosing an Item Code asks for the
	// Principal first (principal_missing); an item chosen anyway is taken off the line again.
	// Reason: The user asked that the principal be selected before items are added.
	items_add(frm) {
		if (frm.doc.doctype === "Quotation") principal_missing(frm);
	},

	item_code(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (frm.doc.doctype !== "Quotation" || !row || !row.item_code || !principal_missing(frm)) return;
		// ERPNext's own item_code handler is already fetching the item's details (name, rate from
		// the price list); clear the line after that call has returned, so its answer does not
		// fill the line again.
		frappe.after_ajax(() => {
			frappe.model.set_value(cdt, cdn, {
				item_code: "",
				item_name: "",
				description: "",
				price_list_rate: 0,
				rate: 0,
			});
		});
	},
};

// Registered once, on the first run of this file (see the change note of 2026-10-28 above). The
// handlers keep the functions of that first run.
if (!frappe.manav_quotation_events_registered) {
	frappe.manav_quotation_events_registered = true;
	frappe.ui.form.on("Quotation", quotation_events);
	frappe.ui.form.on("Quotation Item", quotation_item_events);
	frappe.ui.form.on("Sales Order", sales_order_events);
	frappe.ui.form.on("Sales Order Item", quotation_item_events);
}

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
		.page-container[data-page-route="Quotation"] .grid-row [data-fieldname="item_code"] .awesomplete li span.small,
		.page-container[data-page-route="Sales Order"] .grid-row [data-fieldname="item_code"] .awesomplete li span.small {
			display: block;
			white-space: pre-line;
		}
		.page-container[data-page-route="Quotation"] .grid-row [data-fieldname="item_code"] .awesomplete li span.small::first-line,
		.page-container[data-page-route="Sales Order"] .grid-row [data-fieldname="item_code"] .awesomplete li span.small::first-line {
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

// The Item Code search of the Items table: every sales item (no variants templates) of the Item
// Master, with its rate (2026-11-05; before: only the principal's Item Group, and Options on a
// sub-item's line). This replaces the item query ERPNext sets on the form, so it is set again on
// every refresh.
function set_item_query(frm) {
	const load_group = frm.doc.custom_quotation_type
		? frappe.db.get_value("Quotation Type", frm.doc.custom_quotation_type, "item_group")
		: Promise.resolve({ message: {} });
	load_group.then((r) => {
		frm.manav_item_group = (r.message || {}).item_group || null;
	});
	frm.set_query("item_code", "items", (doc, cdt, cdn) => {
		// CHANGE NOTE
		// Date: 2026-11-12
		// Change: On a quotation without a Principal, clicking into Item Code (Frappe runs this query
		// as soon as the box is focused, before anything is typed) asks for the Principal first and
		// offers no items. The message is shown once per click (frm.manav_principal_asked_at).
		// Reason: The user asked to be told on clicking the item, not only after choosing one.
		if (frm.doc.doctype === "Quotation" && !frm.doc.custom_quotation_type && frm.fields_dict.custom_quotation_type) {
			if (!frm.manav_principal_asked_at || Date.now() - frm.manav_principal_asked_at > 1500) {
				frm.manav_principal_asked_at = Date.now();
				document.activeElement && document.activeElement.blur();
				principal_missing(frm);
			}
			return { filters: { name: "__select_the_principal_first__" } };
		}
		// 2026-11-05: every sales item of the Item Master is offered, on any line; the Item Group
		// filter (principal's group, Options only on sub-item lines, added 2026-11-02) is removed
		// at the user's request. frm.manav_item_group is still loaded but no longer filters here.
		const filters = { is_sales_item: 1, has_variants: 0 };
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
						// Whole number only (no decimals), as the user asked for this list.
						const rate = format_number(flt(option.rate), null, 0);
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
