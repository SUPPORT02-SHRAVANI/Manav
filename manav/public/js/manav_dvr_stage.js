// File: manav_dvr_stage.js
// Purpose: DVR (Manav Visit) form - the Stage and Lead Status start from the lead's, and choosing a stage
//          sets the Next Visit Date to today plus the stage's days (like the LMS "05 Quote Followup(3 Days)").
//          The server does the same when they are left empty (manav/lead_board.py fill_dvr_stage).
// Created: 2026-11-02
// CHANGE NOTE
// Date: 2026-11-02
// Change: A saved DVR in a stage with Show Make Quotation (04 RFQ) has a Make Quotation button (Open
//         Quotation once the lead has one), via manav.lead_quotation (public/js/manav_lead_quotation.js).
// Reason: The user asked that the RFQ stage opens the ERPNext quotation filled from the lead.
// CHANGE NOTE
// Date: 2026-11-12
// Change: Make Quotation shows only once the visit is SUBMITTED (not on a draft: the lead moves to the
//         RFQ stage on submit). Right after submitting a visit in such a stage, a prompt offers to make
//         the quotation at once. Open Quotation still shows on any saved visit whose lead has one.
// Reason: The user asked that a visit in the RFQ stage gives the Make Quotation option after submit.

frappe.ui.form.on("Manav Visit", {
	refresh(frm) {
		if (frm.is_new() || !frm.doc.lead || frm.doc.docstatus === 2) return;
		// The lead's own quotation, if it has one.
		frappe.db.get_value("Manav Lead", frm.doc.lead, "quotation").then((r) => {
			const quotation = r.message && r.message.quotation;
			// Draft visit: only Open Quotation (when there is one); Make Quotation waits for the submit.
			if (frm.doc.docstatus !== 1 && !quotation) return;
			manav.lead_quotation.add_button(frm, frm.doc.lead, frm.doc.stage, quotation);
		});
	},

	// Just submitted in a Make Quotation stage (RFQ) and the lead has no quotation yet: offer it now.
	on_submit(frm) {
		if (!frm.doc.lead || !frm.doc.stage) return;
		Promise.all([
			frappe.db.get_value("Manav Lead Stage", frm.doc.stage, "make_quotation"),
			frappe.db.get_value("Manav Lead", frm.doc.lead, "quotation"),
		]).then(([stage, lead]) => {
			if (!cint(stage.message && stage.message.make_quotation)) return;
			if (lead.message && lead.message.quotation) return;
			frappe.confirm(
				__("This visit is in the {0} stage. Make the quotation for {1} now?", [
					frappe.utils.escape_html(frm.doc.stage),
					frappe.utils.escape_html(frm.doc.company_name || frm.doc.lead),
				]),
				() => manav.lead_quotation.make(frm.doc.lead)
			);
		});
	},

	// A DVR opened from the Leads Board comes with its lead already set.
	onload(frm) {
		if (frm.is_new() && frm.doc.lead && !frm.doc.stage) fill_from_lead(frm);
	},

	lead(frm) {
		if (frm.is_new() && frm.doc.lead) fill_from_lead(frm);
	},

	stage(frm) {
		if (!frm.is_new() || !frm.doc.stage) return;
		frappe.db.get_value("Manav Lead Stage", frm.doc.stage, "days").then((r) => {
			const days = cint(r.message && r.message.days);
			if (days > 0) frm.set_value("next_visit_date", frappe.datetime.add_days(frappe.datetime.get_today(), days));
		});
	},
});

// Stage and status of the lead as the DVR's starting point.
function fill_from_lead(frm) {
	frappe.db.get_value("Manav Lead", frm.doc.lead, ["stage", "status"]).then((r) => {
		const lead = r.message || {};
		if (lead.stage && !frm.doc.stage) frm.set_value("stage", lead.stage);
		if (lead.status && !frm.doc.lead_status) frm.set_value("lead_status", lead.status);
	});
}
