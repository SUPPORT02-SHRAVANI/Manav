// Customer form: a "Customer Dashboard" button opening the page customer-dashboard
// (manav/manav/page/customer_dashboard) for the customer on screen.
// The page is for management only (customer_dashboard.py refuses others), so the button is shown
// only to the Administrator, System Managers and the Manav Management role (desk_home.is_management).
// Loaded through doctype_js (hooks.py), without Frappe's build.
//
// Created: 2026-11-03, when the user asked for the customer dashboard on the Customer form.

frappe.ui.form.on("Customer", {
	refresh(frm) {
		if (frm.is_new()) return;
		const management =
			frappe.session.user === "Administrator" ||
			frappe.user.has_role(["Manav Management", "System Manager"]);
		if (!management) return;

		frm.add_custom_button(__("Customer Dashboard"), () => {
			// the page reads the customer from route_options when it is shown (on_page_show)
			frappe.route_options = { customer: frm.doc.name };
			frappe.set_route("customer-dashboard");
		}).addClass("btn-primary");
	},
});
