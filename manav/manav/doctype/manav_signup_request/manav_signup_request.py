# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Manav Signup Request: one person asking for a login, waiting for a manager's decision.

Working: the fields are defined in manav_signup_request.json. A request is made by the sign-up
page (/manav-signup) or, for the Manav staff named in signup.py, by the setup after migrate. On
insert the managers are notified. A manager presses Approve or Reject on the form
(manav_signup_request.js), which calls approve / reject below; the e-mails and the user creation
are in manav/manav/signup.py.

Created: 2026-10-22.

CHANGE NOTE
Date: 2026-10-22
Change: Existing Employee / Employee: the manager says on approval whether the applicant is
already in Employee and picks them; the new login is then set as that employee's User ID. A new
request is pre-filled with the employee whose e-mail matches.
Reason: The user asked for the approval to ask whether the applicant is an existing employee and,
if so, to choose that employee; otherwise it is left blank.
"""

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime

from manav.manav import signup
from manav.manav.desk_home import is_management


class ManavSignupRequest(Document):
	"""One person asking for a login."""

	def validate(self):
		self.email = (self.email or "").strip().lower()
		self.full_name = (self.full_name or "").strip()
		if self.is_new():
			signup.check_can_request(self.email)
			if not self.employee:
				# a suggestion for the manager, who confirms or clears it on approval
				self.employee = signup.find_employee(self.email)
				self.existing_employee = 1 if self.employee else 0
		if not self.existing_employee:
			self.employee = None
			self.employee_name = None

	def after_insert(self):
		signup.notify_managers(self)

	@frappe.whitelist()
	def approve(
		self, role_profile: str | None = None, existing_employee: int = 0, employee: str | None = None
	):
		"""Create the user, link them to the chosen employee, and e-mail them the link to set
		their password."""
		self._check_decidable()
		if role_profile:
			self.role_profile = role_profile
		self.existing_employee = 1 if int(existing_employee or 0) and employee else 0
		self.employee = employee if self.existing_employee else None
		if self.employee:
			signup.check_employee_free(self.employee)
		self.user = signup.create_user(
			self.email, self.full_name, self.mobile_no, role_profile=self.role_profile
		)
		if self.employee:
			signup.link_employee(self.employee, self.user)
		self._decide("Approved")
		signup.send_approved_mail(self)

	@frappe.whitelist()
	def reject(self, reason: str | None = None):
		"""Refuse the request and e-mail the person the reason."""
		self._check_decidable()
		self.rejection_reason = reason
		self._decide("Rejected")
		signup.send_rejected_mail(self)

	def _check_decidable(self):
		if not is_management():
			frappe.throw(_("Only Manav managers can approve or reject access requests"), frappe.PermissionError)
		# lock the row so that two managers deciding at the same time do not both go through
		status = frappe.db.get_value(self.doctype, self.name, "status", for_update=True)
		if status != "Pending":
			frappe.throw(_("This request has already been {0}").format(_(status).lower()))

	def _decide(self, status):
		self.status = status
		self.decided_by = frappe.session.user
		self.decided_on = now_datetime()
		self.save(ignore_permissions=True)
