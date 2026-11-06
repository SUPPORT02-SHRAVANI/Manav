# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: manav_lead_settings.py
# Purpose: Single DocType for Lead Management settings. For now: whether the follow-up reminder is also
#          e-mailed (the bell notification is always sent). Read by manav_visit.send_followup_reminders.
# Created: 2026-10-30

# Base class of every DocType controller.
from frappe.model.document import Document


# Controller of Manav Lead Settings (a Single DocType - one record for the whole site).
class ManavLeadSettings(Document):
	pass
