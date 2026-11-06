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
"""

import frappe

from manav.manav.quotation import sales_person_for_user

FULL_ACCESS_ROLES = {"System Manager"}


def _sees_all(user):
	"""Administrator / System Manager are not limited to their own leads."""
	return user == "Administrator" or bool(FULL_ACCESS_ROLES & set(frappe.get_roles(user)))


def get_permission_query_conditions(user=None):
	"""SQL condition added to every list query of Manav Lead for this user ("" = no limit)."""
	user = user or frappe.session.user
	if _sees_all(user):
		return ""
	condition = f"`tabManav Lead`.`owner` = {frappe.db.escape(user)}"
	sales_person = sales_person_for_user(user)
	if sales_person:
		condition += f" or `tabManav Lead`.`sale_engineer` = {frappe.db.escape(sales_person)}"
	return f"({condition})"


def has_permission(doc, ptype=None, user=None, debug=False):
	"""Single-document check: False refuses another user's lead; None leaves the decision to the
	role permissions."""
	user = user or frappe.session.user
	if _sees_all(user):
		return None
	# A lead being created has no owner check to make yet.
	if not doc.get("name") or (hasattr(doc, "is_new") and doc.is_new()):
		return None
	if doc.get("owner") == user:
		return None
	sales_person = sales_person_for_user(user)
	if sales_person and doc.get("sale_engineer") == sales_person:
		return None
	return False
