// File: manav_visit.js
// Purpose: Visit form behaviour - the visit's number at the top and the Next Stage button that makes a
//          new visit of the lead in its next stage. (Until 2026-11-03 also check-in / check-out with the
//          phone's GPS; until 2026-11-04 photo buttons.)
// Created: 2026-10-29
// CHANGE NOTE
// Date: 2026-10-30
// Change: capture_location tells the user why the location could not be read (page not on HTTPS,
//         permission blocked, position unavailable, timeout) and retries once without high accuracy.
// Reason: "Could not read the location" gave no hint; browsers block GPS on plain http:// sites, and
//         desktops without GPS often time out in high-accuracy mode.
// CHANGE NOTE
// Date: 2026-10-30
// Change: Rebuilt like My Visit Monitor's visit form: the first Save is the check-in and sends the GPS
//         position (manav.visit_position in public/js/manav_visit_position.js); a red Check Out button
//         while checked in; the map with green check-in, red check-out and blue customer marks; the
//         location checks coloured green / red; Set as Customer Location for managers. The old Check
//         In / Check Out / Capture Location buttons and the lead fill-in (now fetch_from) are gone.
// Reason: The user asked for visits to look and work like My Visit Monitor, with everything automated.

// CHANGE NOTE
// Date: 2026-10-30
// Change: The location is hidden from salespeople: only the manager roles below see the Check In /
//         Check Out / Map / Customer Location sections, the coordinates, the distance and the location
//         check. A Sales User sees a plain visit form (no sign that the position is captured). The GPS
//         is still read and saved in the background on the first save (before_save, unchanged).
// Reason: The user asked that visits do not show that the salesperson's location is being tracked.
//         (The browser's own one-time "allow location" prompt is a browser feature and cannot be hidden.)

// CHANGE NOTE
// Date: 2026-10-30
// Change: The photo options are buttons in the Photos section on the form body (Front / Back: Take Photo
//         / Upload File), not a top-right Take Photo menu.
// Reason: The user found the top-right menu confusing; the Lead's visiting card uses body buttons too.

// CHANGE NOTE
// Date: 2026-11-03
// Change: Check-in / check-out removed: no GPS on saving, no Check Out button, map, location checks or
//         Set as Customer Location (those sections are hidden in manav_visit.json). Added a Next Stage
//         button: the visit's Stage becomes the stage after it (or after the lead's), and a saved visit
//         is saved, which moves the lead (lead_board.move_lead_stage).
// Reason: The user asked to remove the whole check-in and check-out system and give a Next Stage button.

// CHANGE NOTE
// Date: 2026-11-04
// Change: No photos (fields and buttons removed). Visits are submittable: save, then submit, and a
//         submitted visit cannot be edited. Next Stage shows only on a saved visit and makes a NEW visit
//         of the lead in the next stage (with its Next Visit Date and the product); a visit not yet
//         submitted is submitted first. The visit's number for its lead (Visit No.) shows at the top.
// Reason: The user asked to remove the photos, to lock a visit once done, that Next Stage makes a new
//         visit, for the product on the visit and for a visit counter.

// CHANGE NOTE
// Date: 2026-11-12
// Change: No "Visit No. N for <company>" headline at the top any more (it showed twice; Visit No. is a
//         field on the form). A new visit opened from a lead (New Visit on the lead, Next Stage, Leads
//         page) has its Lead locked (read-only); a saved visit's Lead was already locked (set_only_once).
// Reason: The user asked to remove the headline and that the lead of a visit made from it cannot be changed.

frappe.ui.form.on("Manav Visit", {
	onload(frm) {
		// The lead came with the new visit (from the lead / Next Stage): remember to lock it.
		// (set every time: Frappe reuses the same form object for every visit opened)
		frm.__manav_lead_locked = Boolean(frm.is_new() && frm.doc.lead);
	},

	refresh(frm) {
		frm.dashboard.clear_headline();
		focus_description(frm);
		frm.set_df_property("lead", "read_only", !frm.is_new() || frm.__manav_lead_locked ? 1 : 0);
		if (frm.is_new() || !frm.doc.lead || frm.doc.docstatus === 2) return;
		if (!frappe.model.can_create("Manav Visit")) return;
		frm.add_custom_button(__("Next Stage"), () => next_stage(frm)).addClass("btn-primary");
	},
});

// 2026-11-12: a visit still being filled (new or draft) opens with the cursor in Visit Description, the
// field the salesperson types first. Delayed so it runs after Frappe's own focus on the first field.
function focus_description(frm) {
	if (frm.doc.docstatus !== 0) return;
	setTimeout(() => {
		const field = frm.fields_dict.discussion;
		if (!field || !field.$input || !field.$input.is(":visible")) return;
		field.$input.focus();
	}, 400);
}

// Next Stage: a new visit of the lead in the stage after this visit's (or, when it has none, after the
// lead's), by the stages' Sequence, with the Next Visit Date = today plus that stage's days. A visit not
// yet submitted is submitted first, so it is locked and moves the lead.
function next_stage(frm) {
	frappe.db
		.get_list("Manav Lead Stage", { fields: ["name", "sequence", "days"], order_by: "sequence asc", limit: 0 })
		.then(async (stages) => {
			let current = frm.doc.stage;
			if (!current) {
				const r = await frappe.db.get_value("Manav Lead", frm.doc.lead, "stage");
				current = r.message && r.message.stage;
			}
			const next = stages[stages.findIndex((s) => s.name === current) + 1];
			if (!next) {
				frappe.msgprint(__("The lead is already at the last stage ({0}).", [current || "-"]));
				return;
			}
			const open_next = () => {
				const values = { lead: frm.doc.lead, stage: next.name, product: frm.doc.product };
				if (cint(next.days) > 0) values.next_visit_date = frappe.datetime.add_days(frappe.datetime.get_today(), cint(next.days));
				frappe.new_doc("Manav Visit", values);
			};
			// savesubmit asks "Permanently Submit?" itself
			if (frm.doc.docstatus === 0) frm.savesubmit(null, open_next);
			else open_next();
		});
}
