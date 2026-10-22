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

CHANGE NOTE
Date: 2026-10-22
Change: Added limit_desk_to_manav (extend_bootinfo hook): users other than the Administrator and
System Managers get only the Manav workspace, its sidebar and the Manav app in the desk.
Reason: The user asked that everyone except the admin sees only the Manav workspace.

CHANGE NOTE
Date: 2026-10-22
Change: The landing page after login is the Manav workspace (/desk/manav, route in hooks.py)
again instead of the dashboard; the dashboard stays linked from the workspace.
Reason: The user asked that everyone except the admin opens the Manav workspace after login.
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

	2026-10-22: System Managers too, even without a Quotation role, so that Manav is offered in
	the Default App list of System Settings and the User form (frappe.apps.get_apps runs this
	for the user looking at that form).
	"""
	if is_admin():
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


# Workspace, Workspace Sidebar and app shown to users who are not admins (limit_desk_to_manav).
MANAV_WORKSPACE = "Manav"


def is_admin(user=None):
	"""The Administrator and System Managers see the whole desk; everyone else only Manav."""
	user = user or frappe.session.user
	return user == "Administrator" or "System Manager" in frappe.get_roles(user)


def limit_desk_to_manav(bootinfo):
	"""extend_bootinfo hook (hooks.py): for a user who is not an admin, the desk offers only the
	Manav workspace, the Manav sidebar and the Manav app, instead of every ERPNext / HRMS
	workspace the user could otherwise open (Selling, Stock, CRM, ...).

	Why here: Frappe 16 shows a sidebar to anyone who may read one of its doctypes (boot.py
	get_sidebar_items), and Module Profiles do not hide sidebars, so the lists sent to the browser
	are trimmed instead. Nothing in Frappe or ERPNext is changed, and only navigation is hidden:
	what a user may read or create is still decided by their roles. A doctype opened from the
	Manav sidebar shows the Manav sidebar, as it is the only sidebar left that links to it.
	Checked on Frappe 16.33.1 (sessions.get calls this after the cached boot is loaded, on a copy,
	so the trimming is done for every page load and never stored in the cache).
	"""
	if frappe.session.user == "Guest" or is_admin():
		return

	key = MANAV_WORKSPACE.lower()
	sidebars = bootinfo.get("workspace_sidebar_item") or {}
	bootinfo.workspace_sidebar_item = {k: v for k, v in sidebars.items() if k == key}

	workspaces = bootinfo.get("workspaces") or {}
	if workspaces.get("pages"):
		workspaces["pages"] = [p for p in workspaces["pages"] if p.get("name") == MANAV_WORKSPACE]

	# Desk home (/desk) icons: only the Manav icon (manav/desktop_icon/manav.json)
	if bootinfo.get("desktop_icons"):
		bootinfo.desktop_icons = [
			i for i in bootinfo.desktop_icons if i.get("app") == APP_NAME or i.get("label") == MANAV_WORKSPACE
		]

	# App switcher in the sidebar header: only Manav
	if bootinfo.get("app_data"):
		bootinfo.app_data = [a for a in bootinfo.app_data if a.get("app_name") == APP_NAME]
