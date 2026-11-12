// File: manav_lead_customer.js
// Purpose: Manav Lead form - picking an Existing Customer fills the lead's company, contact, address and
//          IDs from the Customer master (manav.manav.lead_customer.get_customer_details).
// Created: 2026-11-07
// CHANGE NOTE
// Date: 2026-11-07
// Change: Existing Customer is shown only for an existing-customer Source (depends_on, lead_customer.py);
//         choosing another source clears it.
// Reason: The user asked that the lead first asks the source and offers the customer dropdown only when
//         the source is an existing customer.

// CHANGE NOTE
// Date: 2026-11-07
// Change: A new lead opens with a popup asking New Customer or Existing Customer; for an existing one the
//         customer is picked in the popup, the Source is set to the existing-customer source and the lead
//         is filled from the customer.
// Reason: The user asked for a popup on adding a lead asking whether the customer is existing or not.

// Same test as EXISTING_CUSTOMER_CONDITION in manav/manav/lead_customer.py.
function manav_is_existing_customer_source(source) {
	return (source || "").toLowerCase().includes("existing customer");
}

// The Manav Lead Source for an existing customer: the seeded "Existing Customer - New order" when present,
// else the first source whose name says "existing customer"; null when there is none.
async function manav_existing_customer_source() {
	const rows = await frappe.db.get_list("Manav Lead Source", {
		filters: { name: ["like", "%existing customer%"] },
		fields: ["name"],
		limit: 20,
	});
	const sources = rows.map((r) => r.name);
	return sources.find((s) => s === "Existing Customer - New order") || sources[0] || null;
}

// The popup on a new lead: New Customer (carry on with the empty form) or Existing Customer (pick it).
function manav_ask_customer_kind(frm) {
	const NEW = __("New Customer");
	const EXISTING = __("Existing Customer");
	const dialog = new frappe.ui.Dialog({
		title: __("New Lead"),
		fields: [
			{
				fieldname: "kind",
				fieldtype: "Select",
				label: __("Is this lead from an existing customer?"),
				options: [NEW, EXISTING].join("\n"),
				default: NEW,
				reqd: 1,
			},
			{
				fieldname: "customer",
				fieldtype: "Link",
				label: __("Customer"),
				options: "Customer",
				depends_on: `eval:doc.kind == ${JSON.stringify(EXISTING)}`,
				mandatory_depends_on: `eval:doc.kind == ${JSON.stringify(EXISTING)}`,
			},
		],
		primary_action_label: __("Continue"),
		async primary_action(values) {
			dialog.hide();
			if (values.kind !== EXISTING) return;
			const source = await manav_existing_customer_source();
			if (source) {
				await frm.set_value("source", source);
			} else {
				frappe.msgprint(__("No Lead Source for existing customers was found; please choose the Source."));
			}
			// Fills the lead from the customer (the customer handler below).
			await frm.set_value("customer", values.customer);
		},
	});
	dialog.show();
}

frappe.ui.form.on("Manav Lead", {
	refresh(frm) {
		// Once per new lead, only when nothing was chosen yet (a lead opened with a source or customer,
		// e.g. made from another screen, is not asked).
		if (frm.is_new() && !frm.doc.source && !frm.doc.customer && !frm.__manav_customer_asked) {
			frm.__manav_customer_asked = true;
			manav_ask_customer_kind(frm);
		}
	},
	source(frm) {
		// Another source: the lead is not for an existing customer any more.
		if (frm.doc.customer && !manav_is_existing_customer_source(frm.doc.source)) {
			frm.set_value("customer", null);
		}
	},
	customer(frm) {
		if (!frm.doc.customer) return;
		frappe.call({
			method: "manav.manav.lead_customer.get_customer_details",
			args: { customer: frm.doc.customer },
			callback(r) {
				const values = r.message || {};
				const filled = [];
				// The customer was picked on purpose: its values replace what is in the fields.
				for (const [fieldname, value] of Object.entries(values)) {
					if (!frm.fields_dict[fieldname]) continue;
					frm.set_value(fieldname, value);
					filled.push(__(frm.fields_dict[fieldname].df.label));
				}
				if (filled.length) {
					frappe.show_alert(
						{ message: __("Filled from the customer: {0}", [filled.join(", ")]), indicator: "green" },
						6
					);
				}
			},
		});
	},
});
