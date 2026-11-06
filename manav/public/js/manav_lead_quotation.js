// File: manav_lead_quotation.js
// Purpose: Make Quotation from a lead (RFQ stage) - opens a new ERPNext Quotation filled from the lead
//          (manav.manav.lead_board.make_quotation), or the lead's quotation when it already has one.
//          Used by the Leads Board page and the Manav Lead (manav_lead_form.js) and DVR (manav_dvr_stage.js)
//          forms; only defines helpers, so it can load with both forms.
// Created: 2026-11-02

frappe.provide("manav.lead_quotation");

manav.lead_quotation.make = function (lead) {
	return frappe.call({
		method: "manav.manav.lead_board.make_quotation",
		args: { lead },
		freeze: true,
		freeze_message: __("Preparing the quotation from the lead..."),
	}).then((r) => {
		const out = r.message;
		if (!out) return;
		if (out.existing) {
			frappe.set_route("Form", "Quotation", out.existing);
			return;
		}
		// Like ERPNext's mapped documents (frappe.model.open_mapped_doc).
		frappe.model.sync(out);
		frappe.set_route("Form", out.doctype, out.name);
	});
};

// Make Quotation when the stage asks for it and the lead has no quotation yet; Open Quotation once it has.
manav.lead_quotation.add_button = function (frm, lead, stage, quotation) {
	if (quotation) {
		frm.add_custom_button(__("Open Quotation"), () => frappe.set_route("Form", "Quotation", quotation));
		return;
	}
	if (!lead || !stage) return;
	frappe.db.get_value("Manav Lead Stage", stage, "make_quotation").then((r) => {
		if (cint(r.message && r.message.make_quotation)) {
			frm.add_custom_button(__("Make Quotation"), () => manav.lead_quotation.make(lead)).addClass("btn-primary");
		}
	});
};
