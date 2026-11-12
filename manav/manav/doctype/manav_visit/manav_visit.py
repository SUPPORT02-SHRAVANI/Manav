# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: manav_visit.py
# Purpose: Visit controller for the Manav Lead Management module - a salesperson's visit to a lead,
#          in the style of my_visit_monitor. Fills the visit date, sale engineer and the customer
#          details from the linked lead.
# Created: 2026-10-29
# CHANGE NOTE
# Date: 2026-10-30
# Change: Rebuilt like My Visit Monitor's MVM Visit Entry: the first save is the check-in (date, time,
#         GPS position and accuracy from the form, sale engineer = logged-in user), the customer
#         position is taken from the lead or looked up from its address, the check-in is compared
#         with it (500 m, green / red sentence, warning when outside), the DIGIPIN is worked out from
#         the check-in point, check_out() records the check-out the same way, the Next Visit Date
#         becomes a ToDo and a new visit to the lead closes the earlier follow-up ToDos, and a
#         manager can make the check-in point the lead's location (use_checkin_as_customer_location).
# Reason: The user asked for visits to look and work like My Visit Monitor, with everything automated.
# CHANGE NOTE
# Date: 2026-11-03
# Change: Check-in / check-out removed: no GPS position, customer location, distance check or DIGIPIN,
#         no check_out / use_checkin_as_customer_location / check_out_visit methods; the first save
#         only records who made the visit and its date (Visit Date, the checkin_date field). The lead
#         moves on with the Next Stage button (lead_board.next_stage). Old visits keep their data.
# Reason: The user asked to remove the whole check-in and check-out system and give a Next Stage button.
# CHANGE NOTE
# Date: 2026-11-04
# Change: Visits are submittable (save, then submit; a submitted visit cannot be edited). The first save
#         gives the visit its Visit No. (1, 2, 3... per lead, cancelled visits not counted); cancelling
#         a visit cancels its open follow-up ToDo. The photo fields are gone from the form.
# Reason: The user asked that a visit is locked once done, that Next Stage makes a new visit, and for a
#         visit counter of the lead.
# CHANGE NOTE
# Date: 2026-11-12
# Change: auto_submit_old_drafts (hooks.py, cron every 15 minutes): a visit still in draft 5 hours after
#         it was made is submitted automatically, with a comment on it saying so. A visit that cannot be
#         submitted (e.g. a mandatory field empty) stays in draft and the failure is in the Error Log.
# Reason: The user asked that a visit left in draft is submitted by itself after 5 hours.

# Frappe framework.
import frappe
# Translation function for messages shown to the user.
from frappe import _
# Base class of every DocType controller.
from frappe.model.document import Document
# Date, time and conversion helpers.
from frappe.utils import (
	add_days,
	add_to_date,
	cint,
	date_diff,
	escape_html,
	formatdate,
	getdate,
	now_datetime,
	nowtime,
	today,
)

# A visit still in draft this many hours after it was made is submitted by auto_submit_old_drafts.
AUTO_SUBMIT_AFTER_HOURS = 5

# Controller of Manav Visit.
class ManavVisit(Document):
	# Runs once, when the visit is first saved: who made it and when.
	# 2026-11-03: no check-in any more (no GPS, customer location, distance or DIGIPIN; the user asked
	# to remove the whole check-in / check-out system). checkin_date is the visit's date ("Visit Date").
	def before_insert(self):
		# The visit belongs to the logged-in user.
		self.sale_engineer = frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user
		self.checkin_date = self.checkin_date or today()
		self.checkin_time = nowtime()
		self.status = None
		# 2026-11-04: this visit's number among the lead's visits (an amended visit keeps its number)
		if self.amended_from:
			self.visit_no = frappe.db.get_value("Manav Visit", self.amended_from, "visit_no")
		else:
			self.visit_no = frappe.db.count("Manav Visit", {"lead": self.lead, "docstatus": ["!=", 2]}) + 1

	# After every save: this visit closes the earlier follow-ups of the lead, and its Next Visit Date
	# becomes a ToDo.
	def on_update(self):
		close_done_followups(self)
		sync_followup_todo(self)

	# A cancelled visit is no follow-up task any more.
	def on_cancel(self):
		for todo_name in frappe.get_all(
			"ToDo",
			filters={"reference_type": "Manav Visit", "reference_name": self.name, "status": "Open"},
			pluck="name",
		):
			frappe.db.set_value("ToDo", todo_name, "status", "Cancelled")


# Scheduler entry point (cron every 15 minutes, hooks.py): submit the visits still in draft
# AUTO_SUBMIT_AFTER_HOURS after they were made. Submitting moves the lead (lead_board.move_lead_stage)
# just like a manual submit. Each visit is committed on its own, so one failure does not undo the rest.
def auto_submit_old_drafts():
	cutoff = add_to_date(now_datetime(), hours=-AUTO_SUBMIT_AFTER_HOURS)
	names = frappe.get_all(
		"Manav Visit",
		filters={"docstatus": 0, "creation": ["<=", cutoff]},
		order_by="creation asc",
		pluck="name",
	)
	for name in names:
		try:
			visit = frappe.get_doc("Manav Visit", name)
			visit.flags.ignore_permissions = True
			visit.submit()
			visit.add_comment(
				"Comment",
				_("Submitted automatically: it was still in draft {0} hours after it was made.").format(
					AUTO_SUBMIT_AFTER_HOURS
				),
			)
			frappe.db.commit()
		except Exception:
			frappe.db.rollback()
			frappe.log_error(title=f"Manav visit auto-submit failed: {name}")


# Keep the follow-up ToDo of a visit in step with its Next Visit Date.
def sync_followup_todo(visit):
	todo_name = frappe.db.get_value(
		"ToDo", {"reference_type": "Manav Visit", "reference_name": visit.name, "status": ["!=", "Cancelled"]}
	)
	# A follow-up date that has passed is no task any more.
	wanted = bool(visit.next_visit_date and getdate(visit.next_visit_date) >= getdate(today()))
	if not wanted:
		if todo_name and frappe.db.get_value("ToDo", todo_name, "status") == "Open":
			frappe.db.set_value("ToDo", todo_name, "status", "Cancelled")
		return

	values = {
		# The salesperson who made the visit makes the follow-up.
		"allocated_to": visit.owner,
		"date": visit.next_visit_date,
		"description": _("Follow-up visit: {0}. Last visit {1} ({2}): {3}").format(
			escape_html(visit.company_name or visit.lead),
			formatdate(visit.checkin_date),
			escape_html(visit.visit_purpose or ""),
			escape_html(visit.discussion or ""),
		),
	}
	if todo_name:
		todo = frappe.get_doc("ToDo", todo_name)
		# A moved date is a new task again, also when the old one was closed.
		if getdate(todo.date) != getdate(visit.next_visit_date):
			values["status"] = "Open"
		todo.update(values)
		# The salesperson may not change ToDos of others.
		todo.save(ignore_permissions=True)
		return
	frappe.get_doc(
		{
			"doctype": "ToDo",
			"status": "Open",
			"priority": "Medium",
			"reference_type": "Manav Visit",
			"reference_name": visit.name,
			"assigned_by": frappe.session.user,
			**values,
		}
	).insert(ignore_permissions=True)


# A new visit to a lead is the follow-up: close the open follow-up ToDos of the earlier visits there.
def close_done_followups(visit):
	earlier = frappe.get_all(
		"Manav Visit",
		filters={"lead": visit.lead, "name": ["!=", visit.name], "checkin_date": ["<=", visit.checkin_date]},
		pluck="name",
	)
	if not earlier:
		return
	for todo_name in frappe.get_all(
		"ToDo",
		filters={"reference_type": "Manav Visit", "reference_name": ["in", earlier], "status": "Open"},
		pluck="name",
	):
		frappe.db.set_value("ToDo", todo_name, "status", "Closed")


# Scheduler entry point (daily, hooks.py): remind the sale engineer about a follow-up the day before the
# Next Visit Date, and - if the follow-up is still not done - again on the due day and every day after,
# until the follow-up visit is made (which closes the ToDo via close_done_followups). It is tied to the
# open follow-up ToDos, so a lead already revisited is not reminded, and at most one reminder is sent per
# follow-up per day. A bell notification is always sent; an e-mail is sent only when Manav Lead Settings
# -> Send Follow-up Reminder Email is ticked (off during testing).
def send_followup_reminders():
	tomorrow = add_days(today(), 1)
	# Open follow-up ToDos due tomorrow (day-before), today or earlier (overdue), with their user and date.
	todos = frappe.get_all(
		"ToDo",
		filters={"reference_type": "Manav Visit", "status": "Open", "date": ["<=", tomorrow]},
		fields=["allocated_to", "reference_name", "date"],
	)
	# Whether to also e-mail (Lead Settings); off by default and while testing.
	send_email = cint(frappe.db.get_single_value("Manav Lead Settings", "send_followup_email"))
	for todo in todos:
		# A failure for one visit must not stop the rest.
		try:
			notify_followup(todo.allocated_to, todo.reference_name, getdate(todo.date), send_email)
		except Exception:
			frappe.log_error(title="Manav visit follow-up reminder failed")


# One reminder for a follow-up visit due on `date`: always a desk (bell) notification, and an e-mail too
# when `send_email` is on and an outgoing Email Account is set up.
def notify_followup(user, visit_name, date, send_email=False):
	if not user:
		return
	visit = frappe.db.get_value(
		"Manav Visit", visit_name, ["name", "company_name", "lead", "visit_purpose", "discussion"], as_dict=True
	)
	if not visit:
		return
	# At most one reminder per follow-up per day (also if the daily job is run again).
	if frappe.db.exists(
		"Notification Log",
		{"document_type": "Manav Visit", "document_name": visit.name, "for_user": user, "creation": [">=", today()]},
	):
		return

	company = visit.company_name or visit.lead
	# Days until the visit: > 0 the day before, 0 on the due day, < 0 overdue.
	days = date_diff(date, today())
	if days > 0:
		when = _("tomorrow ({0})").format(formatdate(date))
	elif days == 0:
		when = _("today ({0})").format(formatdate(date))
	else:
		when = _("overdue (was due {0})").format(formatdate(date))
	subject = _("Follow-up visit {0}: {1}").format(when, company)
	content = _("Reason: {0}<br>Last visit notes: {1}").format(
		escape_html(visit.visit_purpose or ""), escape_html(visit.discussion or "")
	)

	# The bell notification (type "Alert" never sends its own e-mail).
	frappe.get_doc(
		{
			"doctype": "Notification Log",
			"for_user": user,
			"type": "Alert",
			"subject": subject,
			"email_content": content,
			"document_type": "Manav Visit",
			"document_name": visit.name,
		}
	).insert(ignore_permissions=True)

	# The e-mail, only when switched on in Lead Settings and an outgoing account exists.
	if send_email and frappe.db.get_value("Email Account", {"default_outgoing": 1, "enable_outgoing": 1}):
		try:
			frappe.sendmail(
				recipients=[user],
				subject=subject,
				message=content,
				reference_doctype="Manav Visit",
				reference_name=visit.name,
			)
		except Exception:
			frappe.log_error(title="Manav visit follow-up e-mail failed")
