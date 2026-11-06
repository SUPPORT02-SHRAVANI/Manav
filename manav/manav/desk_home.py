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

CHANGE NOTE
Date: 2026-10-28
Change: The landing page after login is the Manav Dashboard desk page (/desk/manav-dashboard,
route in hooks.py). Added set_app_name: the site's App Name (Website Settings and System
Settings) becomes "Manav Marketing" while it is empty or still Frappe's "Frappe".
Reason: The user asked for the dashboard to open directly after login and for a better login page
(the site was still named "Frappe", e.g. in login e-mails).

CHANGE NOTE
Date: 2026-10-28
Change: limit_desk_to_manav: the desk home shows only the four branch workspaces (Bangalore, FTWZ,
Chennai, Coimbatore) for every user, admins included; non-admins may open those and Manav.
Reason: The user asked to remove everything else from the desk home and keep four workspaces, one
per branch, with the same content for now.

CHANGE NOTE
Date: 2026-10-29
Change: Added add_draft_pi_to_selling_sidebar (after_migrate): "Draft PI" in ERPNext's Selling
sidebar between Quotation and Sales Order.
Reason: The user asked for the Draft PI between Quotation and Sales Order in the sidebar.
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


APP_TITLE = "Manav Marketing"


def set_app_name():
	"""Name the site "Manav Marketing" in Website Settings and System Settings (Frappe's own App
	Name, used by Frappe for the site, e.g. in login e-mails). Runs after every
	migrate; only an empty name or Frappe's default "Frappe" is replaced, so a name an
	administrator chose is kept. Added 2026-10-28."""
	for doctype in ("Website Settings", "System Settings"):
		if (frappe.db.get_single_value(doctype, "app_name") or "Frappe") == "Frappe":
			frappe.db.set_single_value(doctype, "app_name", APP_TITLE)


# ERPNext's sidebar that gets the Draft PI link, and the link it goes after (add_draft_pi_to_selling_sidebar).
SELLING_SIDEBAR = "Selling"
DRAFT_PI_SIDEBAR_AFTER = "Quotation"


def add_draft_pi_to_selling_sidebar():
	"""Put "Draft PI" in ERPNext's Selling sidebar, between Quotation and Sales Order (the order of
	the steps: Quotation -> Draft PI -> Final PI). Runs after every migrate (hooks.py), as a migrate
	may load ERPNext's sidebar again from its file; does nothing when the link is already there.

	Added 2026-10-29: the user asked for Draft PI between Quotation and Sales Order in the sidebar.

	Working: the Selling sidebar is ERPNext's (erpnext/workspace_sidebar/selling.json), so its file is
	not edited. Only one row (Workspace Sidebar Item, a copy of the Quotation row) is added to the
	site's record and the rows after Quotation move down one place. The sidebar is not saved as a
	whole on purpose: with developer_mode on (manav.local) saving a standard sidebar writes it back
	into ERPNext's file (WorkspaceSidebar.export_sidebar, checked on Frappe 16.33.1). Frappe reads
	the sidebar from the database at every page load (boot), so no cache is cleared.
	"""
	if not frappe.db.exists("Workspace Sidebar", SELLING_SIDEBAR) or not frappe.db.exists("DocType", "Draft PI"):
		return
	rows = frappe.get_all(
		"Workspace Sidebar Item",
		filters={"parent": SELLING_SIDEBAR, "parenttype": "Workspace Sidebar", "parentfield": "items"},
		fields=["name", "idx", "link_type", "link_to"],
		order_by="idx asc",
	)
	if any(row.link_type == "DocType" and row.link_to == "Draft PI" for row in rows):
		return
	after = next((row for row in rows if row.link_type == "DocType" and row.link_to == DRAFT_PI_SIDEBAR_AFTER), None)
	if not after:
		return  # ERPNext's sidebar changed: leave it as it is rather than guess a place

	for row in rows:
		if row.idx > after.idx:
			frappe.db.set_value("Workspace Sidebar Item", row.name, "idx", row.idx + 1, update_modified=False)
	draft_pi_row = frappe.copy_doc(frappe.get_doc("Workspace Sidebar Item", after.name))
	draft_pi_row.update(
		{
			"parent": SELLING_SIDEBAR,
			"parenttype": "Workspace Sidebar",
			"parentfield": "items",
			"docstatus": 0,  # copy_doc leaves it empty; the column may not be NULL
			"idx": after.idx + 1,
			"label": "Draft PI",
			"link_to": "Draft PI",
			"icon": "notepad-text",
		}
	)
	draft_pi_row.db_insert()


# Workspace, Workspace Sidebar and app shown to users who are not admins (limit_desk_to_manav).
MANAV_WORKSPACE = "Manav"
# 2026-10-28: one workspace per branch (branches.py), for now with the same content as Manav;
# the only icons on the desk home. Files: manav/manav/workspace/<branch>/, workspace_sidebar/,
# desktop_icon/.
BRANCH_WORKSPACES = ("Bangalore", "FTWZ", "Chennai", "Coimbatore")
# CHANGE NOTE
# Date: 2026-10-29
# Change: The Lead Management app (its own desk icon and sidebar, the custom Manav Lead doctypes and
# the Lead Dashboard) is also shown on the desk home and allowed for non-admins.
# Reason: The user asked for a separate Lead Management app icon on the desk, built from the Haas LMS
# (217.79.180.219/lms) and in the style of my_visit_monitor. Files: desktop_icon/lead_management.json,
# workspace_sidebar/lead_management.json, doctype/manav_lead*, page/manav_lead_dashboard.
LEAD_WORKSPACE = "Lead Management"
# The icons shown on the desk home (manav/desktop_icon/*.json): the four branches and Lead Management.
DESK_ICONS = (*BRANCH_WORKSPACES, LEAD_WORKSPACE)


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
	if frappe.session.user == "Guest":
		return

	# 2026-10-28: the desk home (/desk) shows only the four branch workspaces, for everyone, the
	# admins too (manav/desktop_icon/<branch>.json). The other modules stay reachable through the
	# search bar and links; only their icons are left out. (Before: non-admins saw the Manav icon,
	# admins every icon.)
	if bootinfo.get("desktop_icons"):
		bootinfo.desktop_icons = [i for i in bootinfo.desktop_icons if i.get("label") in DESK_ICONS]

	# 2026-11-04: since the Frappe update a desk icon finds its sidebar by its workspace's module
	# (desktop_icon.py sets icon.module; the desk opens module_sidebars[icon.module]). All Manav
	# sidebars (manav/sidebar/) share the module Manav, so every Manav icon - Lead Management and
	# the branches - opened the Manav / Bangalore sidebar. Each icon is named after its own
	# sidebar, so it is pointed at that one and opens its first link (Lead Dashboard for Lead
	# Management, Home for a branch).
	shells = bootinfo.get("module_sidebars") or {}
	for icon in bootinfo.get("desktop_icons") or []:
		if icon.get("label") in DESK_ICONS and icon.get("label") in shells:
			icon["module"] = icon["label"]

	if is_admin():
		return

	# Non-admins: the branch workspaces and the Manav workspace (still the target of links), with
	# their sidebars.
	allowed = {MANAV_WORKSPACE, LEAD_WORKSPACE, *BRANCH_WORKSPACES}
	sidebars = bootinfo.get("workspace_sidebar_item") or {}
	bootinfo.workspace_sidebar_item = {k: v for k, v in sidebars.items() if k in {a.lower() for a in allowed}}

	workspaces = bootinfo.get("workspaces") or {}
	if workspaces.get("pages"):
		workspaces["pages"] = [p for p in workspaces["pages"] if p.get("name") in allowed]

	# App switcher in the sidebar header: only Manav
	if bootinfo.get("app_data"):
		bootinfo.app_data = [a for a in bootinfo.app_data if a.get("app_name") == APP_NAME]
