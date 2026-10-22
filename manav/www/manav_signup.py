# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Page /manav-signup: a new person asks for a login to the Manav system.

Working: the form (manav-signup.html, script manav-signup.js) posts to
manav.manav.signup.submit_request, which saves a Manav Signup Request for the managers to approve.
Someone who is already logged in is sent to the Manav workspace instead (the landing page, 2026-10-22).

Created: 2026-10-22.
"""

import frappe
from frappe import _

no_cache = 1


def get_context(context):
	if frappe.session.user != "Guest":
		frappe.local.flags.redirect_location = "/desk/manav"
		raise frappe.Redirect

	context.no_cache = 1
	context.show_sidebar = False
	context.title = _("Request Access")
