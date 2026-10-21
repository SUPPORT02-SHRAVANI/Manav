# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Manav Offer Salary Line: one row of the salary table of an offer / appointment letter (child
table of HRMS's Job Offer, through the custom field custom_salary_lines, job_offer_fields.py).

Working: the fields are defined in manav_offer_salary_line.json. The print format "Manav
Appointment Letter" prints the rows ticked "In Sub Total" first, then their Sub Total, then the
other rows with "(Payable Monthly / Annually)", then the Grand Total of all rows. No custom
logic is needed, so the class is empty.

Created: 2026-10-19, for the appointment letter the user asked for (like the offer letter of
Manav Marketing Pvt. Ltd., May 2026).
"""

# import frappe
from frappe.model.document import Document


class ManavOfferSalaryLine(Document):
	"""One row of the salary table of an offer letter."""
	pass
