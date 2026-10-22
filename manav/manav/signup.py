# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Logins for Manav staff: the sign-up page, approval by the managers, and the e-mails.

Created: 2026-10-22.

Working:
- A new person fills the page /manav-signup (www/manav-signup.html). submit_request (open to
  guests, rate limited) saves a Manav Signup Request with status Pending. No User is created yet,
  so the person cannot log in.
- On insert the request notifies the managers (enabled users with the Manav Management role,
  see desk_home.py): a bell notification and an e-mail with a link to the request.
- A manager opens the request and presses Approve or Reject (manav_signup_request.js). Approve
  creates the desk User and e-mails "access approved" with a link to set the password; Reject
  e-mails "access rejected" with the reason. After setting the password the person is logged in
  and sent to the Default App's route, the Manav dashboard (desk_home.py, hooks.py).
- setup_signup (after install / every migrate) creates the outgoing e-mail account, the
  managers' users (MANAGERS; skipped when the user exists, apart from giving them the Manav
  Management role) and the logins of the other Manav staff (STAFF; skipped when the user exists).

CHANGE NOTE
Date: 2026-10-22
Change: On approval the manager says whether the applicant is an existing employee and picks the
Employee (find_employee suggests the one whose e-mail matches); the new login becomes that
employee's User ID (link_employee). The STAFF get their logins at once (setup_staff_logins), also
linked to their employee when the e-mail matches, instead of a Pending request.
Reason: The user asked for logins for the staff in the e-mail, and for the approval to offer the
existing employees, left blank when the applicant is not one.

The e-mail account's app password is not kept in the code: it is read from the site config key
manav_support_email_password (bench --site <site> set-config manav_support_email_password "...")
and only on the first migrate; Frappe then keeps it, encrypted, in the Email Account.
"""

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import escape_html, get_url, get_url_to_form, validate_email_address

from manav.manav.desk_home import MANAGEMENT_ROLE

DOCTYPE = "Manav Signup Request"

SUPPORT_EMAIL = "support@softworld.co.in"
SUPPORT_EMAIL_PASSWORD_KEY = "manav_support_email_password"

# The managers: they approve or reject access requests and see all employees' figures.
# (email, first name, last name)
MANAGERS = [
	("milind@swspl.com", "Milind", ""),
	("kavita@swspl.com", "Kavita", "Lokare"),
	("mnaveen@manavmarketing.com", "Naveen", "Mahadevan"),
]
MANAGER_ROLES = ["System Manager", MANAGEMENT_ROLE]

# Manav staff who get a login (Sales User) at the setup. (email, full name)
STAFF = [
	("govind@manavmarketing.com", "Govindharaj V"),
	("soma@manavmarketing.com", "Somashekar M"),
	("accounts@manavmarketing.com", "K Shivakumar"),
]

# Roles of an approved user when the manager picks no Role Profile. Sales User may read
# Quotations, which is what the Manav dashboard needs (desk_home.has_app_permission).
DEFAULT_ROLES = ["Sales User"]


# ------------------------------------------------------------------ the sign-up page


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=5, seconds=60 * 60)
def submit_request(full_name: str, email: str, mobile_no: str | None = None, message: str | None = None):
	"""Save an access request from the sign-up page. Returns the text shown to the applicant."""
	full_name = (full_name or "").strip()
	email = (email or "").strip().lower()
	if not full_name:
		frappe.throw(_("Please enter your full name"))
	validate_email_address(email, throw=True)

	frappe.get_doc(
		{
			"doctype": DOCTYPE,
			"full_name": full_name[:140],
			"email": email,
			"mobile_no": (mobile_no or "").strip()[:20] or None,
			"message": (message or "").strip()[:1000] or None,
			"source": "Sign-up Page",
		}
	).insert(ignore_permissions=True)

	sendmail(
		email,
		_("We have received your request for access"),
		_mail_body(
			_("Hello {0},").format(escape_html(full_name)),
			_("Your request for a login to the Manav system has been sent to the managers for approval."),
			_("You will receive an e-mail as soon as it has been approved or rejected."),
		),
	)
	return _("Your request has been sent for approval. You will receive an e-mail once a manager has decided.")


def check_can_request(email):
	"""Refuse a request for an e-mail address that already has a login or a pending request."""
	if frappe.db.exists("User", email):
		frappe.throw(
			_("A login already exists for {0}. Please log in, or use Forgot Password on the login page.").format(
				email
			)
		)
	if frappe.db.exists(DOCTYPE, {"email": email, "status": "Pending"}):
		frappe.throw(_("A request for {0} is already waiting for approval.").format(email))


# ------------------------------------------------------------------ notifications and e-mails


def get_managers():
	"""Enabled users with the Manav Management role (System Managers when there are none)."""
	for role in (MANAGEMENT_ROLE, "System Manager"):
		users = frappe.get_all(
			"Has Role", filters={"role": role, "parenttype": "User"}, pluck="parent", distinct=True
		)
		users = [
			u
			for u in users
			if u not in ("Administrator", "Guest") and frappe.db.get_value("User", u, "enabled")
		]
		if users:
			return users
	return []


def notify_managers(doc):
	"""A bell notification and an e-mail to every manager about a new request."""
	managers = get_managers()
	if not managers:
		return
	subject = _("Access request from {0} ({1})").format(doc.full_name, doc.email)

	from frappe.desk.doctype.notification_log.notification_log import enqueue_create_notification

	enqueue_create_notification(
		managers,
		{
			"type": "Alert",
			"document_type": doc.doctype,
			"document_name": doc.name,
			"subject": escape_html(subject),
		},
	)

	link = get_url_to_form(doc.doctype, doc.name)
	sendmail(
		managers,
		subject,
		_mail_body(
			_("{0} has asked for a login to the Manav system.").format(
				f"<b>{escape_html(doc.full_name)}</b> ({escape_html(doc.email)})"
			),
			_("Mobile: {0}").format(escape_html(doc.mobile_no)) if doc.mobile_no else "",
			_("Message: {0}").format(escape_html(doc.message)) if doc.message else "",
			_("Please open the request to approve or reject it:"),
			_button(link, _("Open Request {0}").format(doc.name)),
		),
		doc=doc,
	)


def send_approved_mail(doc):
	"""Tell the applicant that access was granted, with the link to set their password."""
	link = frappe.get_doc("User", doc.user)._reset_password()
	sendmail(
		doc.email,
		_("Your Manav login has been approved"),
		_mail_body(
			_("Hello {0},").format(escape_html(doc.full_name)),
			_("Your request for access to the Manav system has been <b>approved</b>."),
			_("Please create your password with the button below. After that you are logged in and taken to your dashboard."),
			_button(link, _("Create Password")),
			_("Your login is your e-mail address: {0}").format(escape_html(doc.email)),
			_("Site: {0}").format(get_url()),
		),
		doc=doc,
		now=True,
	)


def send_rejected_mail(doc):
	"""Tell the applicant that access was refused, with the manager's reason."""
	sendmail(
		doc.email,
		_("Your Manav access request has been rejected"),
		_mail_body(
			_("Hello {0},").format(escape_html(doc.full_name)),
			_("Your request for access to the Manav system has been <b>rejected</b>."),
			_("Reason: {0}").format(escape_html(doc.rejection_reason)) if doc.rejection_reason else "",
			_("If you think this is a mistake, please contact your manager."),
		),
		doc=doc,
		now=True,
	)


def send_login_created_mail(user, full_name, manager=False):
	"""Tell a user created by the setup how to set their password."""
	link = frappe.get_doc("User", user)._reset_password()
	sendmail(
		user,
		_("Your Manav manager login") if manager else _("Your Manav login"),
		_mail_body(
			_("Hello {0},").format(escape_html(full_name)),
			_("A manager login to the Manav system has been created for you. You will receive the access requests of new users for approval.")
			if manager
			else _("A login to the Manav system has been created for you. After creating your password you are taken to your dashboard."),
			_button(link, _("Create Password")),
			_("Your login is your e-mail address: {0}").format(escape_html(user)),
		),
	)


def sendmail(recipients, subject, message, doc=None, now=False):
	"""Send through the support account when it exists (else Frappe's default outgoing one)."""
	sender = SUPPORT_EMAIL if frappe.db.exists("Email Account", {"email_id": SUPPORT_EMAIL}) else None
	frappe.sendmail(
		recipients=recipients,
		sender=sender,
		subject=subject,
		message=message,
		reference_doctype=doc.doctype if doc else None,
		reference_name=doc.name if doc else None,
		now=now,
	)


def _mail_body(*paragraphs):
	return "".join(f"<p>{p}</p>" for p in paragraphs if p)


def _button(link, label):
	return (
		f'<a href="{escape_html(link)}" style="display:inline-block;padding:10px 18px;background:#2a78d6;'
		f'color:#fff;border-radius:6px;text-decoration:none;font-weight:600">{escape_html(label)}</a>'
	)


# ------------------------------------------------------------------ users


def create_user(email, full_name, mobile_no=None, role_profile=None, roles=None):
	"""Create an enabled desk user without Frappe's own welcome mail; returns the user's name.
	An existing (e.g. disabled) user with that e-mail is enabled again instead."""
	if frappe.db.exists("User", email):
		user = frappe.get_doc("User", email)
		user.enabled = 1
		user.save(ignore_permissions=True)
		return user.name

	first_name, _sep, last_name = (full_name or email).strip().partition(" ")
	user = frappe.get_doc(
		{
			"doctype": "User",
			"email": email,
			"first_name": first_name,
			"last_name": last_name.strip(),
			"mobile_no": mobile_no,
			"user_type": "System User",
			"enabled": 1,
			"send_welcome_email": 0,
			"role_profile_name": role_profile,
		}
	)
	user.insert(ignore_permissions=True)
	if not role_profile:
		user.add_roles(*[r for r in (roles or DEFAULT_ROLES) if frappe.db.exists("Role", r)])
	return user.name


# ------------------------------------------------------------------ employees


def find_employee(email):
	"""The active Employee without a login whose company, personal or preferred e-mail is
	`email`, or None."""
	if not email or not frappe.db.exists("DocType", "Employee"):
		return None
	for field in ("company_email", "prefered_email", "personal_email"):
		employee = frappe.db.get_value(
			"Employee", {field: email, "status": "Active", "user_id": ("is", "not set")}
		)
		if employee:
			return employee
	return None


def check_employee_free(employee):
	"""Refuse an employee that already has a login (Employee.user_id is unique per employee)."""
	user_id = frappe.db.get_value("Employee", employee, "user_id")
	if user_id:
		frappe.throw(_("Employee {0} already has the login {1}").format(employee, user_id))


def link_employee(employee, user):
	"""Make `user` the employee's User ID. ERPNext then gives the user the Employee role and
	restricts them to their own employee record."""
	doc = frappe.get_doc("Employee", employee)
	doc.user_id = user
	doc.save(ignore_permissions=True)


# ------------------------------------------------------------------ setup (after migrate)


def setup_signup():
	"""Create the e-mail account, the managers' and the staff's users (safe to run again)."""
	setup_email_account()
	setup_managers()
	setup_staff_logins()


def setup_email_account():
	"""Create the outgoing account support@softworld.co.in (Google SMTP) if it is missing.

	It becomes the default outgoing account only when the site has none, so an account an
	administrator chose is kept; the Manav mails name it as their sender either way."""
	if frappe.db.exists("Email Account", {"email_id": SUPPORT_EMAIL}):
		return
	password = frappe.conf.get(SUPPORT_EMAIL_PASSWORD_KEY)
	if not password:
		print(f"Manav: e-mail account {SUPPORT_EMAIL} not created, site config {SUPPORT_EMAIL_PASSWORD_KEY} is not set")
		return
	has_default = frappe.db.exists("Email Account", {"default_outgoing": 1, "enable_outgoing": 1})
	try:
		frappe.get_doc(
			{
				"doctype": "Email Account",
				"email_account_name": "Manav Support",
				"email_id": SUPPORT_EMAIL,
				"service": "GMail",
				"password": password,
				"enable_incoming": 0,
				"enable_outgoing": 1,
				"default_outgoing": 0 if has_default else 1,
				"smtp_server": "smtp.gmail.com",
				"smtp_port": 587,
				"use_tls": 1,
				"always_use_account_email_id_as_sender": 1,
			}
		).insert(ignore_permissions=True)
	except Exception:
		# e.g. Google refused the login: the migrate goes on, the error is in the Error Log
		frappe.log_error(title=f"Manav: e-mail account {SUPPORT_EMAIL} could not be created")
		print(f"Manav: e-mail account {SUPPORT_EMAIL} could not be created, see Error Log")


def setup_managers():
	for email, first_name, last_name in MANAGERS:
		if frappe.db.exists("User", email):
			# an existing user is otherwise left as it is; it only needs the role to approve
			user = frappe.get_doc("User", email)
			if MANAGEMENT_ROLE not in {r.role for r in user.roles}:
				user.add_roles(MANAGEMENT_ROLE)
			continue
		full_name = f"{first_name} {last_name}".strip()
		create_user(email, full_name, roles=MANAGER_ROLES)
		send_login_created_mail(email, full_name, manager=True)


def setup_staff_logins():
	for email, full_name in STAFF:
		if frappe.db.exists("User", email):
			continue
		create_user(email, full_name)
		employee = find_employee(email)
		if employee:
			try:
				link_employee(employee, email)
			except Exception:
				# e.g. an old employee record that no longer validates: the login stays, unlinked
				frappe.log_error(title=f"Manav: login {email} not linked to employee {employee}")
		send_login_created_mail(email, full_name)
