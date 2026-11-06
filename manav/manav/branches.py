# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""The branches of Manav Marketing: Bangalore (head office), FTWZ, Chennai and Coimbatore.

Working: they are branches of the one company "Manav" (one set of books), chosen by the user on
2026-10-28 over separate ERPNext companies. Each is a record of the Branch doctype (HRMS), which
Employee already links to; Quotation and Sales Order (the PI) get a Branch field
(custom_branch, erpnext_fields.py), copied from the quotation to the PI.

setup_branches() below runs after every `bench migrate` (hooked to `after_migrate`) and only adds
what is missing, so it is safe to run again and reaches every site the app is installed on:
- the branch "Bangalore" made earlier by hand is renamed to "Manav Marketing - Bangalore"
  (frappe.rename_doc, which also changes every record that links to it), when the new name is
  not taken yet;
- the other branches are created when missing.
Branch has no parent field, so "head office" is only in the name list below, not in the data.

Created: 2026-10-28, when the user asked for the four branches with Bangalore as the head office.

CHANGE NOTE
Date: 2026-11-03
Change: Added the branch "Manav Marketing - Hyderabad", and a "Branch" field on User
(custom_branch, Link to Branch, beside Username) created here as a Custom Field.
Reason: The user's list of login users gives each person a branch, Hyderabad among them, and the
user asked for the branch on the User form.

CHANGE NOTE
Date: 2026-11-03
Change: Added add_branch_to_boot (extend_bootinfo hook): the user's branch is sent to the desk and
shown beside the page title (public/js/manav_branch.js).
Reason: The user asked for the branch name beside the "Manav" title at the top of the page.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

# The head office first.
BRANCHES = (
	"Manav Marketing - Bangalore",
	"Manav Marketing - FTWZ",
	"Manav Marketing - Chennai",
	"Manav Marketing - Coimbatore",
	# 2026-11-03: in the user list (B. Vijay Bhaskar Reddy, Krishna Mohan, K. Navin)
	"Manav Marketing - Hyderabad",
)
HEAD_OFFICE = BRANCHES[0]
# The name the Bangalore branch had before 2026-10-28.
OLD_HEAD_OFFICE = "Bangalore"


def setup_branches():
	"""Create the Manav branches that are missing (see the module text). Runs after every migrate.

	To run it by hand:
	bench --site manav.local execute manav.manav.branches.setup_branches
	"""
	# Branch belongs to HRMS; without it there is nothing to set up.
	if not frappe.db.exists("DocType", "Branch"):
		return

	if not frappe.db.exists("Branch", HEAD_OFFICE) and frappe.db.exists("Branch", OLD_HEAD_OFFICE):
		frappe.rename_doc("Branch", OLD_HEAD_OFFICE, HEAD_OFFICE, force=True)

	for branch in BRANCHES:
		if not frappe.db.exists("Branch", branch):
			frappe.get_doc({"doctype": "Branch", "branch": branch}).insert(ignore_permissions=True)

	# 2026-11-03: the branch a login user works at, on the User form beside Username
	create_custom_fields(
		{
			"User": [
				{
					"fieldname": "custom_branch",
					"label": "Branch",
					"fieldtype": "Link",
					"options": "Branch",
					"insert_after": "username",
					"in_standard_filter": 1,
				}
			]
		},
		update=True,
	)


def add_branch_to_boot(bootinfo):
	"""extend_bootinfo hook (hooks.py), added 2026-11-03: the logged-in user's branch (User >
	Branch, custom_branch) as frappe.boot.manav_branch, shown beside the page title in the desk
	(public/js/manav_branch.js). Users without a branch (e.g. the Administrator) get none.
	"""
	if frappe.session.user == "Guest" or not frappe.db.has_column("User", "custom_branch"):
		return
	branch = frappe.db.get_value("User", frappe.session.user, "custom_branch")
	# no branch on the User: the branch of the user's Employee record, if any (HRMS)
	if not branch and frappe.db.has_column("Employee", "branch"):
		branch = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "branch")
	bootinfo.manav_branch = branch
