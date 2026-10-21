# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""The Manav workspace as the page a user lands on after logging in.

Created: 2026-10-19.

Working: Frappe sends a desk user, after login, to the route of the "Default App" (System Settings,
or the user's own Default App in the User form), as given by that app's `add_to_apps_screen` hook
(frappe/apps.py get_default_path, checked on Frappe 16.33.1). hooks.py therefore lists Manav in
`add_to_apps_screen` with the route of the Manav workspace (/desk/manav), and set_default_app below
makes Manav the system's Default App. Both are Frappe's own settings: nothing in Frappe or ERPNext
is changed, and an administrator can choose another app in System Settings > App at any time.

CHANGE NOTE
Date: 2026-10-19
Change: The landing page is the Manav dashboard (/manav-dashboard, route in hooks.py) instead of
the workspace. Added the role "Manav Management" (setup_management_role) and is_management().
Reason: The user asked that everyone sees their own dashboard after login, and that only the
admin, Milind and Naveen see the performance of all employees. A role is used instead of fixed
names: the administrator gives it to Milind's and Naveen's users (User > Roles).
"""

import frappe

APP_NAME = "manav"
# Sees the figures of all employees on the dashboard (Team Performance, HR, Payroll tabs) and the
# team charts of the Manav workspace. Everyone else sees only their own quotations.
MANAGEMENT_ROLE = "Manav Management"


def is_management(user=None):
	"""Whether `user` (default: the logged-in user) may see all employees' figures: the
	Administrator, System Managers (the site's admins) and users with the Manav Management role."""
	user = user or frappe.session.user
	if user == "Administrator":
		return True
	return bool({MANAGEMENT_ROLE, "System Manager"} & set(frappe.get_roles(user)))


def setup_management_role():
	"""Create the Manav Management role if it is missing (after install / every migrate; safe to
	run again). The role only marks who sees all figures; it gives no doctype permissions."""
	if not frappe.db.exists("Role", MANAGEMENT_ROLE):
		frappe.get_doc({"doctype": "Role", "role_name": MANAGEMENT_ROLE, "desk_access": 1}).insert(
			ignore_permissions=True
		)


def has_app_permission():
	"""Whether the logged-in user is offered the Manav app (on /apps and as the landing page).

	Website users (customers on the portal) cannot open desk pages, so they are left out; a desk
	user who may read Quotations is offered it. Without this, such a user would be sent to the
	workspace and get "not permitted".
	"""
	if frappe.session.user == "Administrator":
		return True
	if frappe.get_cached_value("User", frappe.session.user, "user_type") == "Website User":
		return False
	return bool(frappe.has_permission("Quotation", ptype="read"))


def set_default_app():
	"""Make Manav the Default App in System Settings, so users land on the Manav workspace.

	Runs after install and every migrate (hooks.py). Only an empty Default App is filled: when an
	administrator has chosen another app, that choice is kept. The value is written directly
	because the field is a Select whose options Frappe fills only in the browser.
	"""
	if not frappe.db.get_single_value("System Settings", "default_app"):
		frappe.db.set_single_value("System Settings", "default_app", APP_NAME)
