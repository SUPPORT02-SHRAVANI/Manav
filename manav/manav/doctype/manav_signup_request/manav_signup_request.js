// Copyright (c) 2026, milind and contributors
// For license information, please see license.txt

// Manav Signup Request: the Approve and Reject buttons of a pending request.
// Created: 2026-10-22.
// CHANGE NOTE
// Date: 2026-10-22
// Change: The Approve dialog asks "Existing Employee?" and, when ticked, which Employee (active
// ones without a login); it starts with the employee whose e-mail matched, if any.
// Reason: The user asked for the existing employees to be offered on approval, else left blank.

frappe.ui.form.on("Manav Signup Request", {
	refresh(frm) {
		if (frm.is_new() || frm.doc.status !== "Pending" || !frm.perm[0].write) return;

		frm.add_custom_button(__("Approve"), () => {
			const d = new frappe.ui.Dialog({
				title: __("Approve {0}", [frm.doc.full_name]),
				fields: [
					{
						fieldname: "role_profile",
						fieldtype: "Link",
						options: "Role Profile",
						label: __("Role Profile"),
						default: frm.doc.role_profile,
						description: __("Leave empty for the default roles (Sales User)."),
					},
					{
						fieldname: "existing_employee",
						fieldtype: "Check",
						label: __("Existing Employee?"),
						default: frm.doc.existing_employee,
						description: __("Tick if {0} is already in the Employee list.", [frm.doc.full_name]),
					},
					{
						fieldname: "employee",
						fieldtype: "Link",
						options: "Employee",
						label: __("Employee"),
						default: frm.doc.employee,
						depends_on: "existing_employee",
						mandatory_depends_on: "existing_employee",
						// only employees who do not have a login yet
						get_query: () => ({ filters: { status: "Active", user_id: ["is", "not set"] } }),
					},
				],
				primary_action_label: __("Approve and send password link"),
				primary_action(values) {
					if (!values.existing_employee) values.employee = null;
					d.hide();
					frm.call("approve", values).then(() => {
						frappe.show_alert({ message: __("Approved; e-mail sent"), indicator: "green" });
						frm.reload_doc();
					});
				},
			});
			d.show();
		}).addClass("btn-primary");

		frm.add_custom_button(__("Reject"), () => {
			frappe.prompt(
				{ fieldname: "reason", fieldtype: "Small Text", label: __("Reason (sent to the applicant)") },
				(values) =>
					frm.call("reject", values).then(() => {
						frappe.show_alert({ message: __("Rejected; e-mail sent"), indicator: "orange" });
						frm.reload_doc();
					}),
				__("Reject {0}", [frm.doc.full_name]),
				__("Reject")
			);
		});
	},
});
