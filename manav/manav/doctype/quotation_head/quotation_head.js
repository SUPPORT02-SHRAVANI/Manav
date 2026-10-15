// Copyright (c) 2026, milind and contributors
// For license information, please see license.txt

// Quotation Head form: the screen logic for making a quotation.
//
// Working, in the order the employee uses the form:
// 1. Quotation Type (the principal / kind of goods): its currency, number series, signing employee
//    and standard terms are copied in. The Items table then offers only items of that type.
// 2. Customer: its old code, name, address and region are copied in. Customer Contact Person offers
//    only the contact persons of that customer.
// 3. Items: choosing an item copies its code, description, HSN code, unit and rate, and adds the
//    item's standard specifications to the Specifications table (they print under the item).
// 4. Options and Specifications: offers only the options of the items on the quotation. The
//    "Add Options" button shows them all with tick boxes, so several can be added at once.
// 5. Amounts are recalculated on every change. The server calculates them again on save
//    (set_amounts in quotation_head.py), so the saved figures never depend on this script.
//
// The old quotations have no item rows; nothing here changes their amounts.
//
// Created: 2026-10-12.
//
// CHANGE NOTE
// Date: 2026-10-12
// Change: Item specifications, employee names, contact e-mail and HSN code are filled in.
// Reason: To follow the old entry screen and printed quotation.

const QUOTATION_HEAD = "manav.manav.doctype.quotation_head.quotation_head";

// Percentages of the tax codes used on the quotations made since GST, taken from the old data:
// [Sales Tax % (CGST), SC on Sales Tax % (SGST), SC on Taxable % (IGST)].
// A code that is not listed leaves the percentages as they are.
const TAX_CODE_PERCENTAGES = {
	G01: [9, 9, 0],
	G02: [0, 0, 18],
	G03: [0, 0, 0],
	G05: [14, 14, 0],
	G06: [0, 0, 28],
	G08: [2.5, 2.5, 0],
	S05: [0, 0, 0],
};

frappe.ui.form.on("Quotation Head", {
	setup(frm) {
		// Only items of the chosen Quotation Type (principal) can be put on the quotation.
		frm.set_query("item", "items", () => ({
			filters: { quotation_type: frm.doc.quotation_type || "" },
		}));
		// Only options of the items already on the quotation can be chosen.
		frm.set_query("sub_item", "sub_items", () => ({
			filters: { main_item_code: ["in", main_item_codes(frm)] },
		}));
		frm.set_query("customer_contact", () => ({
			filters: { customer_code: frm.doc.customer_code || "" },
		}));
	},

	refresh(frm) {
		// The series is part of the quotation number, so it cannot change after the first save.
		frm.toggle_enable("number_series", frm.is_new());
		frm.add_custom_button(__("Add Options"), () => show_options_dialog(frm));
	},

	quotation_type(frm) {
		if (!frm.doc.quotation_type) return;
		frappe.call({
			method: `${QUOTATION_HEAD}.get_type_defaults`,
			args: { quotation_type: frm.doc.quotation_type },
			callback(r) {
				const defaults = r.message || {};
				if (defaults.currency) frm.set_value("currency", defaults.currency);
				// The header follows the principal: it is replaced (or cleared) whenever the type changes.
				frm.set_value("letter_head", defaults.letter_head || null);
				if (frm.is_new() && defaults.number_series) {
					frm.set_value("number_series", defaults.number_series);
				}
				if (defaults.signature_one_code && !frm.doc.signature_one_code) {
					frm.set_value("signature_one_code", defaults.signature_one_code);
				}
				// Terms already typed on this quotation are kept; the standard ones fill an empty table.
				if (!(frm.doc.terms || []).length && (defaults.terms || []).length) {
					defaults.terms.forEach((term) => frm.add_child("terms", term));
					frm.refresh_field("terms");
				}
			},
		});
		if ((frm.doc.items || []).length) {
			frappe.msgprint(__("The Quotation Type was changed. Check that the items belong to it."));
		}
	},

	customer(frm) {
		frm.set_value("customer_contact", null);
		if (!frm.doc.customer) return;
		frappe.call({
			method: `${QUOTATION_HEAD}.get_customer_details`,
			args: { customer: frm.doc.customer },
			callback(r) {
				if (r.message) frm.set_value(r.message);
			},
		});
	},

	customer_contact(frm) {
		if (!frm.doc.customer_contact) return;
		frappe.db
			.get_value("Customer Contact Person", frm.doc.customer_contact, [
				"contact_name",
				"designation",
				"sr_no",
				"email",
			])
			.then((r) => {
				const contact = r.message || {};
				frm.set_value({
					contact_person: contact.contact_name,
					designation: contact.designation,
					contact_person_sr: contact.sr_no,
					contact_email: contact.email,
				});
			});
	},

	// Show the employee's name next to the code as soon as it is typed (the server sets it again on save).
	signature_one_code(frm) {
		set_employee_name(frm, "signature_one_code", "signed_by_name");
	},
	signature_two_code(frm) {
		set_employee_name(frm, "signature_two_code", "sales_engineer_name");
	},

	sales_tax_code(frm) {
		const percentages = TAX_CODE_PERCENTAGES[(frm.doc.sales_tax_code || "").toUpperCase()];
		if (!percentages) return;
		frm.set_value({
			sales_tax_percent: percentages[0],
			sc_on_sales_tax_percent: percentages[1],
			sc_on_taxable_percent: percentages[2],
		}).then(() => set_amounts(frm));
	},

	sales_tax_percent: set_amounts,
	sc_on_sales_tax_percent: set_amounts,
	sc_on_taxable_percent: set_amounts,
	freight: set_amounts,
});

frappe.ui.form.on("Quotation Head Item", {
	item(frm, cdt, cdn) {
		copy_from_master(frm, cdt, cdn, "item", "Quotation Item Master", [
			"item_code",
			"item_description",
			"hsn_code",
			"uom",
			"rate",
		]).then(() => add_item_specifications(frm, locals[cdt][cdn]));
	},
	qty: set_amounts,
	rate: set_amounts,
	items_remove: set_amounts,
});

frappe.ui.form.on("Quotation Head Sub Item", {
	sub_item(frm, cdt, cdn) {
		copy_from_master(frm, cdt, cdn, "sub_item", "Quotation Sub Item Master", [
			"main_item_code",
			"sub_item_code",
			"item_description",
			"sub_item_type",
			"uom",
			"rate",
		]);
	},
	qty: set_amounts,
	rate: set_amounts,
	sub_items_remove: set_amounts,
});

// Copy the master's values into the row whenever another item or option is chosen in it.
// The fields' fetch_from only fills empty fields (so a rate changed for this quotation survives a
// save); without this, a row whose item is changed would keep the old description and rate.
function copy_from_master(frm, cdt, cdn, link_field, master, fields) {
	const row = locals[cdt][cdn];
	if (!row[link_field]) return Promise.resolve();
	return frappe.db.get_value(master, row[link_field], fields).then((r) => {
		const values = r.message || {};
		fields.forEach((field) => {
			row[field] = values[field];
		});
		if (!row.qty) row.qty = 1;
		set_amounts(frm);
	});
}

function set_employee_name(frm, code_field, name_field) {
	const code = frm.doc[code_field];
	if (!code) {
		frm.set_value(name_field, null);
		return;
	}
	frappe.db.get_value("Employee Master", code, "employee_name").then((r) => {
		frm.set_value(name_field, (r.message || {}).employee_name || null);
	});
}

// Copy the Standard Specifications of the chosen item into the quotation's Specifications table.
// Nothing is added when the quotation already has specification lines for that item code, so
// lines changed for this quotation are not doubled or overwritten.
function add_item_specifications(frm, row) {
	if (!row || !row.item || !row.item_code) return;
	if ((frm.doc.specifications || []).some((spec) => spec.item_code === row.item_code)) return;
	frappe.call({
		method: `${QUOTATION_HEAD}.get_item_specifications`,
		args: { item: row.item },
		callback(r) {
			(r.message || []).forEach((spec) => {
				frm.add_child("specifications", {
					item_code: row.item_code,
					specification: spec.specification,
					highlight: spec.highlight,
				});
			});
			frm.refresh_field("specifications");
		},
	});
}

// The item codes on the quotation; these are the "main items" whose options can be added.
function main_item_codes(frm) {
	const codes = (frm.doc.items || []).map((row) => row.item_code).filter(Boolean);
	return [...new Set(codes)];
}

// Same calculation as set_amounts in quotation_head.py:
// Final Amount = Quotation Amount + the three tax amounts + Freight.
function set_amounts(frm) {
	const rows = [...(frm.doc.items || []), ...(frm.doc.sub_items || [])];
	// An old quotation has its amounts but no item rows; leave it as it was loaded.
	if (!rows.length) return;

	let total = 0;
	rows.forEach((row) => {
		row.amount = flt(flt(row.qty) * flt(row.rate), 2);
		total += row.amount;
	});

	const doc = frm.doc;
	doc.item_total = flt(total, 2);
	doc.quotation_amount = doc.item_total;
	doc.sales_tax_amount = flt((doc.quotation_amount * flt(doc.sales_tax_percent)) / 100, 2);
	doc.sc_on_sales_tax_amount = flt((doc.quotation_amount * flt(doc.sc_on_sales_tax_percent)) / 100, 2);
	doc.sc_on_taxable_amount = flt((doc.quotation_amount * flt(doc.sc_on_taxable_percent)) / 100, 2);
	doc.final_amount = flt(
		doc.quotation_amount +
			doc.sales_tax_amount +
			doc.sc_on_sales_tax_amount +
			doc.sc_on_taxable_amount +
			flt(doc.freight),
		2
	);
	frm.refresh_fields([
		"items",
		"sub_items",
		"item_total",
		"quotation_amount",
		"sales_tax_amount",
		"sc_on_sales_tax_amount",
		"sc_on_taxable_amount",
		"final_amount",
	]);
}

// Show every option of the items on the quotation with a tick box, one block per item, and add the
// ticked ones to the Options and Specifications table.
function show_options_dialog(frm) {
	const codes = main_item_codes(frm);
	if (!codes.length) {
		frappe.msgprint(__("Add an item first; the options depend on the item."));
		return;
	}

	frappe.call({
		method: `${QUOTATION_HEAD}.get_sub_items`,
		args: { main_item_codes: codes },
		callback(r) {
			// Options already on the quotation are not offered again.
			const added = new Set((frm.doc.sub_items || []).map((row) => row.sub_item));
			const options = (r.message || []).filter((option) => !added.has(option.name));
			if (!options.length) {
				frappe.msgprint(__("There are no more options for the items on this quotation."));
				return;
			}

			const by_name = {};
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
						by_name[option.name] = option;
						const description = (option.item_description || "").slice(0, 90);
						const rate = format_number(flt(option.rate));
						const label = `${option.sub_item_code}: ${description} (${rate})`;
						return { label: frappe.utils.escape_html(label), value: option.name };
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
						.forEach((name) => {
							const option = by_name[name];
							if (!option) return;
							frm.add_child("sub_items", {
								sub_item: option.name,
								main_item_code: option.main_item_code,
								sub_item_code: option.sub_item_code,
								item_description: option.item_description,
								sub_item_type: option.sub_item_type,
								uom: option.uom,
								qty: 1,
								rate: option.rate,
							});
						});
					dialog.hide();
					frm.dirty();
					set_amounts(frm);
				},
			});
			dialog.show();
		},
	});
}
