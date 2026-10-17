# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Page /manav-dashboard: the Manav dashboard (quotations / sales, HR & attendance, payroll).

Working: this only checks who may open the page; the figures are fetched by the page's script
(manav-dashboard.js, loaded by Frappe as the page's colocated script) from
manav.manav.dashboard.get_dashboard_data, which applies each reader's permissions per section.
Only desk users (System User) may open it: website users (customers, suppliers) are refused.

Created: 2026-10-17.
"""

import frappe
from frappe import _

no_cache = 1


def get_context(context):
	if frappe.session.user == "Guest":
		# send the visitor to the login page and back here after logging in
		frappe.local.flags.redirect_location = "/login?redirect-to=/manav-dashboard"
		raise frappe.Redirect
	if frappe.db.get_value("User", frappe.session.user, "user_type") != "System User":
		frappe.throw(_("Only staff users can open the Manav dashboard"), frappe.PermissionError)

	context.no_cache = 1
	context.show_sidebar = False
	context.full_width = True
	context.title = _("Manav Dashboard")
