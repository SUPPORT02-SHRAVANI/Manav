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

// CHANGE NOTE
// Date: 2026-11-12
// Change: Contact Person is a dropdown of the existing customer's contacts (Contact master). One contact:
//         filled by itself (name, designation, mobile, e-mail). Several: none is filled, the dropdown opens
//         and picking one fills its designation, mobile and e-mail. A name can still be typed by hand.
// Reason: The user asked for the customer's contacts in a dropdown when there are several, and
//         filled automatically when there is one.

// The Contact Person value that means "add a new contact to the customer's master".
const MANAV_NEW_CONTACT = "__manav_new_contact__";

// The customer's contacts in the Contact Person dropdown: bold name, designation and mobile below.
// 2026-11-12: for an existing customer the list ends with "+ Add new contact" (manav_add_contact_dialog).
function manav_set_contact_options(frm, contacts) {
	frm.manav_customer_contacts = contacts || [];
	const field = frm.fields_dict.contact_person;
	if (!field || !field.set_data) return;
	// a name not in the list may still be typed (a new person at the customer, or a new customer);
	// ignore_validation is no DocField property, so it is set on the field here
	field.df.ignore_validation = 1;
	const options = frm.manav_customer_contacts.map((c) => ({
		value: c.full_name,
		label: c.full_name,
		description: frappe.utils.escape_html(
			[c.designation, c.mobile_no, c.is_primary ? __("Primary") : ""].filter(Boolean).join(" · ")
		),
	}));
	if (frm.doc.customer) {
		options.push({
			value: MANAV_NEW_CONTACT,
			label: __("+ Add new contact"),
			description: __("Not in the list? Add the person to {0}'s contacts", [frappe.utils.escape_html(frm.doc.customer)]),
		});
	}
	field.set_data(options);
}

// The "+ Add new contact" form: saves the person as a Contact of the customer (master) and puts it on
// the lead.
function manav_add_contact_dialog(frm) {
	const d = new frappe.ui.Dialog({
		title: __("Add Contact to {0}", [frm.doc.customer]),
		fields: [
			{ fieldname: "first_name", fieldtype: "Data", label: __("First Name"), reqd: 1 },
			{ fieldname: "last_name", fieldtype: "Data", label: __("Last Name") },
			{ fieldname: "designation", fieldtype: "Data", label: __("Designation") },
			{ fieldname: "col", fieldtype: "Column Break" },
			{ fieldname: "mobile_no", fieldtype: "Data", label: __("Mobile No"), options: "Phone" },
			{ fieldname: "email_id", fieldtype: "Data", label: __("Email"), options: "Email" },
		],
		primary_action_label: __("Save Contact"),
		primary_action(values) {
			frappe
				.call({
					method: "manav.manav.lead_customer.add_customer_contact",
					args: Object.assign({ customer: frm.doc.customer }, values),
					freeze: true,
					freeze_message: __("Saving the contact..."),
				})
				.then((r) => {
					const c = r.message;
					if (!c) return;
					d.hide();
					manav_set_contact_options(frm, [...(frm.manav_customer_contacts || []), c]);
					// contact_person's handler fills designation, mobile and e-mail from the list
					frm.set_value("contact_person", c.full_name);
					frappe.show_alert(
						{ message: __("{0} added to the contacts of {1}.", [c.full_name, frm.doc.customer]), indicator: "green" },
						5
					);
				});
		},
	});
	d.show();
}

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
		// 2026-11-12: a saved lead of an existing customer offers its contacts again (fields untouched)
		if (frm.doc.customer) {
			frappe
				.call("manav.manav.lead_customer.get_customer_contacts", { customer: frm.doc.customer })
				.then((r) => manav_set_contact_options(frm, r.message));
		} else {
			manav_set_contact_options(frm, []);
		}
	},

	// 2026-11-12: a contact picked from the dropdown fills its designation, mobile and e-mail.
	contact_person(frm) {
		// "+ Add new contact" chosen: empty the field again and open the add form
		if (frm.doc.contact_person === MANAV_NEW_CONTACT) {
			frm.set_value("contact_person", "");
			if (frm.doc.customer) manav_add_contact_dialog(frm);
			return;
		}
		const c = (frm.manav_customer_contacts || []).find((x) => x.full_name === frm.doc.contact_person);
		if (!c) return;
		if (c.designation) frm.set_value("contact_position", c.designation);
		if (c.mobile_no) frm.set_value("mobile_no", c.mobile_no);
		if (c.email_id) frm.set_value("email_id", c.email_id);
	},
	source(frm) {
		// Another source: the lead is not for an existing customer any more.
		if (frm.doc.customer && !manav_is_existing_customer_source(frm.doc.source)) {
			frm.set_value("customer", null);
		}
	},
	customer(frm) {
		if (!frm.doc.customer) {
			manav_set_contact_options(frm, []);
			return;
		}
		frappe.call({
			method: "manav.manav.lead_customer.get_customer_details",
			args: { customer: frm.doc.customer },
			callback(r) {
				const values = Object.assign({}, r.message || {});
				const contacts = values.contacts || [];
				delete values.contacts;
				manav_set_contact_options(frm, contacts);
				// Several contacts: the previous customer's contact must not stay; the user picks one.
				if (contacts.length > 1) {
					for (const f of ["contact_person", "contact_position"]) frm.set_value(f, "");
				}
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
				// several contacts: pick one; none in the master and none filled: add one (2026-11-12)
				const none = !contacts.length && !frm.doc.contact_person;
				if (contacts.length > 1 || none) {
					frappe.show_alert(
						{
							message: none
								? __("{0} has no contacts yet - use + Add new contact in Contact Person.", [
										frappe.utils.escape_html(frm.doc.customer),
								  ])
								: __("{0} has {1} contacts - pick one in Contact Person.", [
										frappe.utils.escape_html(frm.doc.customer),
										contacts.length,
								  ]),
							indicator: "blue",
						},
						7
					);
					// open the dropdown
					setTimeout(() => {
						const f = frm.fields_dict.contact_person;
						if (f && f.$input) f.$input.focus().trigger("input");
					}, 400);
				}
			},
		});
	},
});
