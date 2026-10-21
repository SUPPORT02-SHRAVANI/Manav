# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Custom fields that the Manav app adds to HRMS's Job Offer, for the print format "Manav
Appointment Letter" (the letter of Manav Marketing Pvt. Ltd.: reference, address, interview date,
designation, location, reporting, the salary table, probation, conveyance and two signatories).

Working: Job Offer belongs to HRMS, so its JSON must not be edited. The fields below are created as
Custom Fields by setup_job_offer_fields(), hooked to `after_migrate` / `after_install` in hooks.py;
every migrate brings them up to date. Every fieldname starts with `custom_`. When HRMS is not
installed (no Job Offer), nothing is done. The salary rows are the Manav child table
"Manav Offer Salary Line".

Designation, applicant name, offer date, company, the letter head and the extra terms (Job Offer
Terms, Terms and Conditions) are HRMS's own fields and are printed as they are.

Created: 2026-10-19, at the user's request for an appointment letter like the offer letter of
May 2026.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

JOB_OFFER_FIELDS = [
	{
		"fieldname": "custom_salutation",
		"label": "Salutation",
		"fieldtype": "Select",
		"options": "\nMr.\nMs.\nMrs.\nDr.",
		"insert_after": "applicant_email",
	},
	{
		"fieldname": "custom_candidate_address",
		"label": "Address (for the letter)",
		"fieldtype": "Small Text",
		"insert_after": "custom_salutation",
	},
	{
		"fieldname": "custom_reference_no",
		"label": "Letter Ref.",
		"fieldtype": "Data",
		"default": "MM/Office/Gen",
		"insert_after": "offer_date",
	},
	{
		"fieldname": "custom_interview_date",
		"label": "Interview Date",
		"fieldtype": "Date",
		"insert_after": "custom_reference_no",
	},
	{
		"fieldname": "custom_location",
		"label": "Location",
		"fieldtype": "Data",
		"default": "Bangalore",
		"insert_after": "designation",
	},
	{
		"fieldname": "custom_reporting_to",
		"label": "Reporting To",
		"fieldtype": "Data",
		"insert_after": "custom_location",
		"description": "As printed, e.g. MHM Jambunath – Executive Director",
	},
	# A section of its own after Company (the next HRMS field starts its own section).
	{
		"fieldname": "custom_letter_salary_section",
		"label": "Emoluments (Appointment Letter)",
		"fieldtype": "Section Break",
		"insert_after": "company",
	},
	{
		"fieldname": "custom_salary_lines",
		"label": "Salary per Month",
		"fieldtype": "Table",
		"options": "Manav Offer Salary Line",
		"insert_after": "custom_letter_salary_section",
		"description": "Rows ticked In Sub Total make the Sub Total; the Grand Total is all rows",
	},
	{
		"fieldname": "custom_letter_terms_section",
		"label": "Appointment Letter Terms",
		"fieldtype": "Section Break",
		"insert_after": "custom_salary_lines",
	},
	{
		"fieldname": "custom_probation_months",
		"label": "Probation (Months)",
		"fieldtype": "Int",
		"default": "6",
		"insert_after": "custom_letter_terms_section",
	},
	{
		"fieldname": "custom_conveyance_rate",
		"label": "Conveyance Rate per km (Two-Wheeler)",
		"fieldtype": "Float",
		"precision": "2",
		"default": "4.5",
		"insert_after": "custom_probation_months",
		"description": "Empty or 0: the conveyance point is left out of the letter",
	},
	{
		"fieldname": "custom_letter_column",
		"fieldtype": "Column Break",
		"insert_after": "custom_conveyance_rate",
	},
	{
		# the company record is named "Manav"; the letter signs with the full name
		"fieldname": "custom_letter_company",
		"label": "Signed for (Company)",
		"fieldtype": "Data",
		"default": "MANAV MARKETING PVT. LTD.",
		"insert_after": "custom_letter_column",
	},
	{
		"fieldname": "custom_signatory_1",
		"label": "Signatory 1",
		"fieldtype": "Data",
		"default": "MHM JAMBUNATH",
		"insert_after": "custom_letter_company",
	},
	{
		"fieldname": "custom_signatory_1_designation",
		"label": "Signatory 1 Designation",
		"fieldtype": "Data",
		"default": "EXECUTIVE DIRECTOR",
		"insert_after": "custom_signatory_1",
	},
	{
		"fieldname": "custom_signatory_2",
		"label": "Signatory 2",
		"fieldtype": "Data",
		"default": "NAVEEN MAHADEVAN",
		"insert_after": "custom_signatory_1_designation",
	},
	{
		"fieldname": "custom_signatory_2_designation",
		"label": "Signatory 2 Designation",
		"fieldtype": "Data",
		"default": "WHOLETIME DIRECTOR",
		"insert_after": "custom_signatory_2",
	},
]


# The letter's fields only feed the printed letter, so they may be filled or corrected also on a
# submitted Job Offer (an offer is usually submitted before the letter is printed). Added 2026-10-19.
for _field in JOB_OFFER_FIELDS:
	if _field["fieldtype"] not in ("Section Break", "Column Break"):
		_field["allow_on_submit"] = 1


def setup_job_offer_fields():
	"""Create or update the custom fields above (after every migrate). Nothing when HRMS is not
	installed. By hand: bench --site manav.local execute manav.manav.job_offer_fields.setup_job_offer_fields
	"""
	if not frappe.db.exists("DocType", "Job Offer"):
		return
	create_custom_fields({"Job Offer": JOB_OFFER_FIELDS}, update=True)
