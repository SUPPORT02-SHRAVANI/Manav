# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Page /manav-dashboard: the Manav dashboard (quotations / sales, HR & attendance, payroll).

Working: this only checks who may open the page; the figures are fetched by the page's script
(manav-dashboard.js, loaded by Frappe as the page's colocated script) from
manav.manav.dashboard.get_dashboard_data, which applies each reader's permissions per section.
Only desk users (System User) may open it: website users (customers, suppliers) are refused.

Created: 2026-10-17.

CHANGE NOTE
Date: 2026-10-22
Change: The page only redirects to the desk page /desk/manav-dashboard (manav/manav/page/
manav_dashboard), which shows the same dashboard inside the desk; a visitor who is not logged in
is sent to the login page first. Its script and styles moved to manav/public/.
Reason: The user asked that the dashboard opens inside the Frappe desk, not as a web page.
"""

import frappe

no_cache = 1

DESK_ROUTE = "/desk/manav-dashboard"


def get_context(context):
	if frappe.session.user == "Guest":
		# the login page sends the visitor on to the desk page after logging in
		frappe.local.flags.redirect_location = f"/login?redirect-to={DESK_ROUTE}"
	else:
		frappe.local.flags.redirect_location = DESK_ROUTE
	raise frappe.Redirect
