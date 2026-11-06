# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: lead_setup.py
# Purpose: Seed the Lead Management dropdown masters with the Haas LMS values (Lead Sources and
#          Product Types). Runs after every migrate (hooks.py after_migrate); only adds what is
#          missing, so it is safe to run again and never overwrites values a user changed.
# Created: 2026-10-29
# CHANGE NOTE
# Date: 2026-11-02
# Change: Also seeds the Lead Stages (the LMS "Steps" dropdown, with their follow-up days).
# Reason: The user asked for a Leads Board showing each lead's stage, and DVRs that move the stage.
# CHANGE NOTE
# Date: 2026-11-04
# Change: The stages are named without their number ("Start Lead"); the number is their Sequence.
#         Existing stages were renamed by patches/clean_lead_dropdown_labels.py.
# Reason: The user asked that the stage dropdown shows the plain names, without 01 etc.

# Frappe framework.
import frappe

# The Source dropdown of the LMS Lead Entry Form.
LEAD_SOURCES = [
	"Direct Customer Call",
	"Existing Customer - New order",
	"Employee Refereance",
	"Get My Machine",
	"Sales Engineer / Sales Manager",
	"Trade Show Leads",
	"Vendor / Partner",
]

# The Product Type dropdown of the LMS (Haas machine type codes).
PRODUCT_TYPES = [
	"TM", "CM", "DT", "DM", "VMC-MINI", "VMC-40-STD", "VMC-40-SS", "VMC-50-STD",
	"VM", "VMC-5AXIS", "UMC", "GR", "HMC", "CL", "TL", "ST-STD", "ST-YAXIS", "DS",
]

# The Steps dropdown of the LMS New Call form: (sequence, stage, days until the next follow-up).
LEAD_STAGES = [
	(1, "Start Lead", 1),
	(3, "Qualification", 1),
	(4, "RFQ", 3),  # Request for Quotation: also shows Make Quotation (QUOTATION_STAGES)
	(5, "Quote Followup", 3),
	(6, "Customer HFO Visit", 1),
	(7, "Feasibility Study", 5),
	(9, "Customer Response", 3),
	(10, "PO Followup", 5),
	(11, "Send OA cum PI", 1),
	(12, "Payment Followup", 5),
	(14, "Schedule and Payment Followup", 4),
	(17, "Installation", 30),
]
# Stages whose leads get the Make Quotation button (Manav Lead Stage -> Show Make Quotation).
QUOTATION_STAGES = ("RFQ",)


# Insert the missing master rows. Runs after every migrate.
def setup_lead_masters():
	_seed("Manav Lead Source", "source_name", LEAD_SOURCES)
	_seed("Manav Product Type", "type_name", PRODUCT_TYPES)
	_seed_stages()


# Insert each value as a record of `doctype` (named by `field`) when it is not there yet.
def _seed(doctype, field, values):
	# The doctype is only present after it has been migrated; skip quietly otherwise.
	if not frappe.db.exists("DocType", doctype):
		return
	for value in values:
		if not frappe.db.exists(doctype, value):
			frappe.get_doc({"doctype": doctype, field: value}).insert(ignore_permissions=True)


# Insert the missing stages with their sequence (the LMS step number).
def _seed_stages():
	if not frappe.db.exists("DocType", "Manav Lead Stage"):
		return
	for sequence, stage, days in LEAD_STAGES:
		if not frappe.db.exists("Manav Lead Stage", stage):
			frappe.get_doc(
				{
					"doctype": "Manav Lead Stage",
					"stage_name": stage,
					"sequence": sequence,
					"days": days,
					"make_quotation": int(stage in QUOTATION_STAGES),
				}
			).insert(ignore_permissions=True)
	# Stages seeded before Show Make Quotation existed have it unticked: tick the RFQ stage once, while
	# no stage has it (a stage unticked by hand later stays unticked as long as another one is ticked).
	if not frappe.db.exists("Manav Lead Stage", {"make_quotation": 1}):
		for stage in QUOTATION_STAGES:
			if frappe.db.exists("Manav Lead Stage", stage):
				frappe.db.set_value("Manav Lead Stage", stage, "make_quotation", 1)
