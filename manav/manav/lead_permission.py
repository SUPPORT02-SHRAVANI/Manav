# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Who may see which Manav Lead (row-level rule, hooked in hooks.py).

Working:
- Administrator and System Manager see every lead.
- Every other user sees only "their" leads: the ones they created (owner) or the ones whose Sale
  Engineer (sale_engineer, a Sales Person) is linked to their login (sales_person_for_user in
  quotation.py: Sales Person.custom_user, else Sales Person -> Employee -> User ID).
- permission_query_conditions filters lists, reports, the Leads Board and link searches (all of
  them read through frappe.get_list); has_permission blocks opening another user's lead by URL.
The role permissions of the doctype (read / write / create ...) still apply on top of this.

Created: 2026-11-05, when the user asked that each login sees only its own leads and the admin
sees all.

CHANGE NOTE
Date: 2026-11-12
Change: The same rule for Manav Visit (visit_query_conditions / visit_has_permission): a user sees the
        visits they made, and the visits of their own leads (as above). Before, Sales Manager and
        Manav Management saw every visit. Added my_sales_person for the lead form (a new lead shows the
        user's Sales Person as Sales Engineer at once).
Reason: The user asked that each login sees only its own leads and visits, and that the Sales Engineer
        of a lead is the user who made it.

CHANGE NOTE
Date: 2026-11-13
Change: has_permission and visit_has_permission return True ("no objection") where they returned None.
        The installed Frappe (16.54 / 16.55) treats a None from a has_permission hook as a refusal
        (frappe/permissions.py has_controller_permissions: "if not controller_permission: return
        False"), so every user but Administrator was refused leads and visits, even creating one ("Not
        allowed via controller permission check"). True only means "this hook does not object": the
        role permissions still decide, and False still refuses another user's lead or visit.
Reason: The user could not create a Manav Lead on the live site ("You need the 'create' permission on
        Manav Lead"); the same was found on manav.local.

CHANGE NOTE
Date: 2026-11-13
Change: A manager sees their people's leads and visits: a lead is also the user's when its Sales
        Engineer is the user's Sales Person or any Sales Person under it in the Sales Person tree, or
        when the user is its Sale Manager (sales_manager). Manav Management sees everything, like
        System Manager.
Reason: The user asked that a manager sees everything of their employees, and that Naveen Mahadevan is
        the manager of all.
"""

import frappe

from manav.manav.quotation import sales_person_for_user

# 2026-11-13: Manav Management (the top managers) see every lead and visit too.
FULL_ACCESS_ROLES = {"System Manager", "Manav Management"}


def _sees_all(user):
	"""Administrator / System Manager / Manav Management are not limited to their own leads."""
	return user == "Administrator" or bool(FULL_ACCESS_ROLES & set(frappe.get_roles(user)))


def _team(user):
	"""(the user's Sales Person, the user's team): the team is that Sales Person and every Sales Person
	under it in the Sales Person tree (a manager's Sales Person is a group with their people under
	it). (None, []) when the user has no Sales Person."""
	sales_person = sales_person_for_user(user)
	if not sales_person:
		return None, []
	bounds = frappe.db.get_value("Sales Person", sales_person, ["lft", "rgt"], as_dict=True)
	if not bounds or bounds.lft is None:
		return sales_person, [sales_person]
	team = frappe.get_all(
		"Sales Person",
		filters={"lft": [">=", bounds.lft], "rgt": ["<=", bounds.rgt]},
		pluck="name",
	)
	return sales_person, team or [sales_person]


def _lead_condition(user, alias):
	"""SQL: the lead (table alias `alias`) is the user's: made by them, its Sales Engineer is in their
	team, or they are its Sale Manager."""
	condition = f"{alias}.`owner` = {frappe.db.escape(user)}"
	sales_person, team = _team(user)
	if team:
		names = ", ".join(frappe.db.escape(name) for name in team)
		condition += f" or {alias}.`sale_engineer` in ({names})"
	if sales_person and _has_sales_manager():
		condition += f" or {alias}.`sales_manager` = {frappe.db.escape(sales_person)}"
	return condition


def _has_sales_manager():
	"""Sale Manager is a custom field (lead_customer.py, made on migrate); not there yet -> not used."""
	return frappe.get_meta("Manav Lead").has_field("sales_manager")


def _lead_is_users(values, user):
	"""Python twin of _lead_condition for one lead's owner / sale_engineer / sales_manager."""
	if values.get("owner") == user:
		return True
	sales_person, team = _team(user)
	if values.get("sale_engineer") and values.get("sale_engineer") in team:
		return True
	return bool(sales_person and values.get("sales_manager") == sales_person)


def get_permission_query_conditions(user=None):
	"""SQL condition added to every list query of Manav Lead for this user ("" = no limit)."""
	user = user or frappe.session.user
	if _sees_all(user):
		return ""
	return f"({_lead_condition(user, '`tabManav Lead`')})"


def has_permission(doc, ptype=None, user=None, debug=False):
	"""Single-document check: False refuses another user's lead; True leaves the decision to the
	role permissions (2026-11-13: was None, which the installed Frappe reads as a refusal)."""
	user = user or frappe.session.user
	if _sees_all(user):
		return True
	# A lead being created has no owner check to make yet.
	if not doc.get("name") or (hasattr(doc, "is_new") and doc.is_new()):
		return True
	return _lead_is_users(doc, user)


def _is_own_lead(lead, user):
	"""The lead is the user's (made by them, Sales Engineer in their team, or they are its Sale
	Manager)."""
	if not lead:
		return False
	fields = ["owner", "sale_engineer"] + (["sales_manager"] if _has_sales_manager() else [])
	values = frappe.db.get_value("Manav Lead", lead, fields, as_dict=True)
	if not values:
		return False
	return _lead_is_users(values, user)


def visit_query_conditions(user=None):
	"""SQL condition added to every list query of Manav Visit: the user's own visits and the visits of
	the user's own leads ("" = no limit)."""
	user = user or frappe.session.user
	if _sees_all(user):
		return ""
	lead_condition = _lead_condition(user, "l")
	return (
		f"(`tabManav Visit`.`owner` = {frappe.db.escape(user)}"
		f" or `tabManav Visit`.`lead` in (select l.`name` from `tabManav Lead` l where {lead_condition}))"
	)


def visit_has_permission(doc, ptype=None, user=None, debug=False):
	"""Single-visit check: False refuses a visit that is neither the user's nor of the user's lead."""
	user = user or frappe.session.user
	# 2026-11-13: True ("no objection") where this returned None, as in has_permission above
	if _sees_all(user):
		return True
	if not doc.get("name") or (hasattr(doc, "is_new") and doc.is_new()):
		# a new visit: only to a lead the user may see
		if doc.get("lead") and not _is_own_lead(doc.get("lead"), user):
			return False
		return True
	if doc.get("owner") == user or _is_own_lead(doc.get("lead"), user):
		return True
	return False


@frappe.whitelist()
def my_sales_person():
	"""The logged-in user's Sales Person (the Sales Engineer of a lead they make), or None."""
	return sales_person_for_user(frappe.session.user)
