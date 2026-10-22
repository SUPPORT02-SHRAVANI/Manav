// Page "Manav Dashboard" (/desk/manav-dashboard): the Manav dashboard inside the Frappe desk,
// opened from the Manav sidebar and the Manav workspace. Every desk user may open it (the page has
// no roles): each user sees their own quotations (My Dashboard), management also the team, HR and
// payroll tabs. What is shown is decided on the server by manav.manav.dashboard.get_dashboard_data.
//
// Working: loads the view (public/js/manav_dashboard_view.js) and its styles
// (public/css/manav_dashboard.css) with frappe.require and mounts it in the page body once.
// Uses the documented frappe.ui.make_app_page (checked on Frappe 16.33.1).
//
// Created: 2026-10-22.
// Reason: The user asked for the dashboard inside the desk (it was the web page /manav-dashboard,
// which now redirects here) and for every sales employee to see their own figures.

frappe.pages["manav-dashboard"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Manav Dashboard"),
		single_column: true,
	});
	page.add_inner_button(__("Quotations"), () => frappe.set_route("List", "Quotation"));

	const body = $("<div></div>").appendTo(page.main);
	frappe
		.require(["/assets/manav/css/manav_dashboard.css", "/assets/manav/js/manav_dashboard_view.js"])
		.then(() => window.manav_dashboard_view.mount(body[0]));
};
