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
// 4. "Add Options" lists the options of the machines on the quotation, each with its price for
//    that machine, and adds the ticked ones as quotation lines marked "Option of Item".
//
// Totals, taxes and saving are ERPNext's own. The quotation number is given on the server
// (autoname in manav/manav/quotation.py).
//
// Created: 2026-10-12, when the quotation process was moved from Quotation Head to ERPNext's Quotation.

const MANAV_QUOTATION = "manav.manav.quotation";

frappe.ui.form.on("Quotation", {
	refresh(frm) {
		set_item_query(frm);
		if (frm.doc.docstatus === 0) {
			frm.add_custom_button(__("Add Options"), () => show_options_dialog(frm));
			// CHANGE NOTE
			// Date: 2026-10-12
			// Change: The button is also shown under the Items table, beside "Add row".
			// Reason: The button at the top of the form is out of sight while working in the
			// Items table, and users looked for it there.
			frm.fields_dict.items.grid.add_custom_button(__("Add Options"), () =>
				show_options_dialog(frm)
			);
		}
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

// Show every option of the machines on the quotation with a tick box, one block per machine, and
// add the ticked ones as quotation lines.
function show_options_dialog(frm) {
	const codes = main_item_codes(frm);
	if (!codes.length) {
		frappe.msgprint(__("Add an item first; the options depend on the item."));
		return;
	}

	frappe.call({
		method: `${MANAV_QUOTATION}.get_options`,
		args: { main_item_codes: codes },
		callback(r) {
			// An option already on the quotation for the same machine is not offered again.
			const added = new Set(
				(frm.doc.items || [])
					.filter((row) => row.custom_main_item_code)
					.map((row) => `${row.custom_main_item_code}::${row.item_code}`)
			);
			const options = (r.message || []).filter(
				(option) => !added.has(`${option.main_item_code}::${option.item_code}`)
			);
			if (!options.length) {
				frappe.msgprint(__("There are no more options for the items on this quotation."));
				return;
			}

			const by_key = {};
			const fields = [];
			codes.forEach((code, index) => {
				const of_item = options.filter((option) => option.main_item_code === code);
				if (!of_item.length) return;
				fields.push({ fieldtype: "Section Break", label: __("Options of {0}", [code]) });
				fields.push({
					fieldtype: "MultiCheck",
					fieldname: `options_${index}`,
					columns: 2,
					options: of_item.map((option) => {
						by_key[option.key] = option;
						const description = (option.description || "").slice(0, 90);
						const rate = format_number(flt(option.rate));
						const label = `${option.item_code}: ${description} (${rate})`;
						return { label: frappe.utils.escape_html(label), value: option.key };
					}),
				});
			});

			const dialog = new frappe.ui.Dialog({
				title: __("Add Options"),
				size: "extra-large",
				fields: fields,
				primary_action_label: __("Add"),
				primary_action(values) {
					Object.values(values)
						.flat()
						.forEach((key) => {
							if (by_key[key]) add_option_line(frm, by_key[key]);
						});
					dialog.hide();
					frm.refresh_field("items");
					frm.dirty();
					// ERPNext's own totals; the option lines carry their rate already.
					frm.cscript.calculate_taxes_and_totals();
				},
			});
			dialog.show();
		},
	});
}

// Add one option as a quotation line. The values are set on the row directly, without running
// ERPNext's item_code event: that event would look the rate up in the price list, and an option's
// price depends on the machine, so it comes from Quotation Sub Item Master instead.
function add_option_line(frm, option) {
	// ERPNext keeps one empty line in a new quotation; use it up before adding more.
	const empty = (frm.doc.items || []).find((row) => !row.item_code);
	const row = empty || frm.add_child("items");
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
