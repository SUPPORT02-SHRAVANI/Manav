# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: manav_lead_stage.py
# Purpose: Lead stage master (the Haas LMS steps: 01 Start Lead, 05 Quote Followup, ...) with the
#          number of days until the next follow-up. A DVR (Manav Visit) moves its lead to a stage.
# Created: 2026-11-02

from frappe.model.document import Document


class ManavLeadStage(Document):
	pass
