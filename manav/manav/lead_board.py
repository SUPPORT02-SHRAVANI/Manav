# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: lead_board.py
# Purpose: Lead stages and the Leads Board page (manav-leads-board). A DVR (Manav Visit) moves its lead
#          to a stage (the Haas LMS "Steps", Manav Lead Stage) and sets its next follow-up from the
#          stage's days; the board shows every lead as a card with its stage, status, dates and DVR count.
#          The stage fields are custom fields (setup_lead_board_fields, after_migrate) and the DVR logic
#          runs from hooks.py doc_events, so the Manav Lead / Manav Visit doctype files stay unchanged.
# Created: 2026-11-02
# CHANGE NOTE
# Date: 2026-11-02
# Change: make_quotation - a lead in a stage with Show Make Quotation (04 RFQ) gets a Make Quotation
#         button (board card, lead form, DVR form) that opens a new ERPNext Quotation filled from the lead:
#         the Customer (found by company name, else made with its contact and address), reference, Haas
#         Cust ID, branch, sales engineer and the product as an item when it is an Item. The quotation
#         keeps its lead (custom_manav_lead) and, once saved, becomes the lead's Quotation.
# Reason: The user asked that the RFQ stage opens the ERPNext quotation with the lead's details filled in.
# CHANGE NOTE
# Date: 2026-11-03
# Change: "DVR" is called "Visit" in the field texts; added next_stage (the Next Stage button of the lead
#         and visit forms); the quotation from a lead takes the lead's Sales Engineer (now a Sales Person);
#         the board no longer looks for visits still checked in (check-in / check-out removed).
# Reason: The user asked to rename DVR to Visit, remove check-in / check-out and give a Next Stage
#         button instead, and to connect the lead's sales engineer.
# CHANGE NOTE
# Date: 2026-11-04
# Change: get_lead_board also returns the lead's email_id (the new lead detail panel shows it).
# Reason: The user asked for a better Leads page instead of the card board.
# CHANGE NOTE
# Date: 2026-11-04
# Change: Visits are submittable now: a visit moves its lead when it is submitted (hooks.py on_submit),
#         and cancelled visits are not counted on the Leads page. get_lead_board also returns the
#         quotation's state and its Draft PI / Final PI numbers (the page's Quotation / PI buttons).
# Reason: The user asked that a visit is saved then submitted and cannot be edited after.

# Frappe framework.
import frappe
# Creates / updates custom fields from a dict.
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
# Date helpers.
from frappe.utils import add_days, cint, flt, getdate, today

# Sales Person of a login user (Discussion With / Signed By on the quotation).
from manav.manav.quotation import sales_person_for_user

# The lead's Location -> the Manav branch of the quotation (branches.py).
LOCATION_BRANCHES = {
	"BANGALORE": "Manav Marketing - Bangalore",
	"FTWZ": "Manav Marketing - FTWZ",
	"CHENNAI": "Manav Marketing - Chennai",
	"COIMBATORE": "Manav Marketing - Coimbatore",
}

# The stage fields: on the lead (where it stands now) and on the DVR (where the DVR moves it).
LEAD_BOARD_FIELDS = {
	"Manav Lead": [
		{
			"fieldname": "stage",
			"fieldtype": "Link",
			"label": "Stage",
			"options": "Manav Lead Stage",
			"insert_after": "status",
			"in_standard_filter": 1,
			"description": "Moved by each visit of the lead, or by Next Stage.",
		},
		{
			"fieldname": "next_followup_date",
			"fieldtype": "Date",
			"label": "Next Follow-up Date",
			"insert_after": "stage",
			"read_only": 1,
			"description": "From the latest visit: its Next Visit Date (by default the visit date plus the stage's days).",
		},
	],
	"Manav Visit": [
		{
			"fieldname": "stage",
			"fieldtype": "Link",
			"label": "Stage",
			"options": "Manav Lead Stage",
			"insert_after": "visit_purpose",
			"in_list_view": 1,
			"in_standard_filter": 1,
			"description": "The lead's stage after this visit. Empty: the lead's current stage.",
		},
		{
			"fieldname": "lead_status",
			"fieldtype": "Select",
			"label": "Lead Status",
			# Filled from Manav Lead's Status options in setup_lead_board_fields.
			"options": "",
			"insert_after": "stage",
			"description": "The lead's status after this visit. Empty: unchanged.",
		},
	],
	# The lead a quotation was made from (Make Quotation); saving the quotation links it on the lead.
	"Quotation": [
		{
			"fieldname": "custom_manav_lead",
			"fieldtype": "Link",
			"label": "Lead (Lead Management)",
			"options": "Manav Lead",
			"insert_after": "custom_branch",
			"read_only": 1,
			"no_copy": 1,
		},
	],
}


# Create or update the stage custom fields. Runs after every migrate, after the stages are seeded.
def setup_lead_board_fields():
	if not (frappe.db.exists("DocType", "Manav Lead Stage") and frappe.db.exists("DocType", "Manav Visit")):
		return
	fields = {dt: f for dt, f in LEAD_BOARD_FIELDS.items() if frappe.db.exists("DocType", dt)}
	# The DVR's Lead Status offers the lead's statuses (blank = keep the lead's status).
	lead_status = frappe.get_meta("Manav Lead").get_field("status")
	for field in LEAD_BOARD_FIELDS["Manav Visit"]:
		if field["fieldname"] == "lead_status":
			field["options"] = "\n" + (lead_status.options or "")
	create_custom_fields(fields, update=True)

	# Leads made before stages existed start at the first stage.
	first = first_stage()
	if first:
		frappe.db.sql(
			"update `tabManav Lead` set stage=%s where ifnull(stage, '')=''",
			first,
		)


# Name of the first stage by sequence ("01 Start Lead"), or None when there are none.
def first_stage():
	stages = frappe.get_all("Manav Lead Stage", order_by="sequence asc", pluck="name", limit=1)
	return stages[0] if stages else None


# --- DVR (Manav Visit) events, hooks.py doc_events ---


# Before the DVR is first saved: the stage defaults to the lead's, and an empty Next Visit Date becomes
# the DVR date plus the stage's days (so the follow-up ToDo and reminders follow the stage).
def fill_dvr_stage(visit, method=None):
	if not visit.lead:
		return
	if not visit.get("stage"):
		visit.stage = frappe.db.get_value("Manav Lead", visit.lead, "stage") or first_stage()
	if visit.stage and not visit.next_visit_date:
		days = cint(frappe.db.get_value("Manav Lead Stage", visit.stage, "days"))
		if days > 0:
			visit.next_visit_date = add_days(visit.checkin_date or today(), days)


# When a visit is submitted (on_submit since 2026-11-04, was every save): the latest submitted visit of a
# lead sets the lead's stage, status and next follow-up.
def move_lead_stage(visit, method=None):
	if not visit.lead:
		return
	latest = frappe.get_all(
		"Manav Visit", filters={"lead": visit.lead, "docstatus": 1}, order_by="creation desc", pluck="name", limit=1
	)
	# An older visit submitted later does not move the lead back.
	if latest and latest[0] != visit.name:
		return
	values = {"next_followup_date": visit.next_visit_date}
	if visit.get("stage"):
		values["stage"] = visit.stage
	if visit.get("lead_status"):
		values["status"] = visit.lead_status
	# set_value: the salesperson's DVR updates the lead even when the lead misses newer mandatory fields.
	frappe.db.set_value("Manav Lead", visit.lead, values)


# --- Next Stage (lead and visit forms, 2026-11-03) ---


# The stage after `stage` by sequence; None at the last stage. No stage: the first one.
def stage_after(stage):
	if not stage:
		return first_stage()
	sequence = frappe.db.get_value("Manav Lead Stage", stage, "sequence")
	nxt = frappe.get_all(
		"Manav Lead Stage",
		filters={"sequence": [">", cint(sequence)]},
		order_by="sequence asc",
		pluck="name",
		limit=1,
	)
	return nxt[0] if nxt else None


# Next Stage button: move the lead to the stage after its current one, with the next follow-up
# date = today + that stage's days. Replaces check-in / check-out as the way a lead moves on.
@frappe.whitelist()
def next_stage(lead):
	doc = frappe.get_doc("Manav Lead", lead)
	doc.check_permission("write")
	new_stage = stage_after(doc.stage)
	if not new_stage:
		frappe.throw(frappe._("Lead {0} is already at the last stage ({1}).").format(doc.name, doc.stage))
	values = {"stage": new_stage}
	days = cint(frappe.db.get_value("Manav Lead Stage", new_stage, "days"))
	if days > 0:
		values["next_followup_date"] = add_days(today(), days)
	# set_value, like a visit moving the lead: a lead missing newer mandatory fields still moves.
	frappe.db.set_value("Manav Lead", doc.name, values)
	return values


# --- Leads Board page ---


# Everything the Leads Board shows: the leads the user may see (get_list) with their stage, status,
# dates and DVR count, plus the stages and statuses for the filters.
@frappe.whitelist()
def get_lead_board():
	leads = frappe.get_list(
		"Manav Lead",
		fields=[
			"name", "company_name", "lead_date", "status", "stage", "next_followup_date",
			"product_type", "product", "product_free_hand", "location", "sale_engineer",
			"contact_person", "mobile_no", "email_id", "quotation",
		],
		order_by="modified desc",
		limit_page_length=0,
	)

	# DVRs per lead: count, date of the last one, and whether one is still checked in.
	dvrs = {}
	names = [lead.name for lead in leads]
	if names:
		for v in frappe.get_all(
			"Manav Visit",
			# 2026-11-04: cancelled visits do not count
			filters={"lead": ["in", names], "docstatus": ["!=", 2]},
			fields=["name", "lead", "checkin_date", "status"],
			order_by="creation asc",
		):
			d = dvrs.setdefault(v.lead, {"count": 0, "last_date": None})
			d["count"] += 1
			if v.checkin_date and (not d["last_date"] or getdate(v.checkin_date) >= getdate(d["last_date"])):
				d["last_date"] = v.checkin_date
			# 2026-11-03: no "still checked in" visit any more (check-in / check-out removed)

	# 2026-11-04: the lead's quotation with its Draft PI and Final PI (pi.py keeps their numbers on it)
	quotations = {}
	quotation_names = [lead.quotation for lead in leads if lead.quotation]
	if quotation_names:
		for q in frappe.get_all(
			"Quotation",
			filters={"name": ["in", quotation_names]},
			fields=["name", "docstatus", "custom_draft_pi_no", "custom_pi_no"],
		):
			quotations[q.name] = q

	for lead in leads:
		d = dvrs.get(lead.name, {})
		lead.dvr_count = d.get("count", 0)
		lead.last_dvr_date = d.get("last_date")
		q = quotations.get(lead.quotation) or {}
		lead.quotation_docstatus = q.get("docstatus")
		lead.draft_pi = q.get("custom_draft_pi_no")
		lead.final_pi = q.get("custom_pi_no")

	status_field = frappe.get_meta("Manav Lead").get_field("status")
	return {
		"leads": leads,
		"stages": frappe.get_all(
			"Manav Lead Stage", fields=["name", "sequence", "days", "make_quotation"], order_by="sequence asc"
		),
		"statuses": [s for s in (status_field.options or "").split("\n") if s],
		"today": today(),
	}


# --- Make Quotation (RFQ stage) ---


# A new, unsaved ERPNext Quotation filled from the lead, opened by the client like a mapped document
# (frappe.model.sync + set_route). The lead's existing quotation is returned instead when it has one.
@frappe.whitelist()
def make_quotation(lead):
	lead = frappe.get_doc("Manav Lead", lead)
	lead.check_permission("read")
	if lead.quotation and frappe.db.exists("Quotation", lead.quotation):
		return {"existing": lead.quotation}

	customer = get_or_make_customer(lead)
	contact = get_or_make_contact(lead, customer)

	qtn = frappe.new_doc("Quotation")
	qtn.quotation_to = "Customer"
	qtn.party_name = customer
	qtn.transaction_date = today()
	qtn.custom_manav_lead = lead.name
	# Printed as "Your Ref.": the lead number and date.
	qtn.custom_your_reference = lead.name
	qtn.custom_your_reference_date = lead.lead_date
	qtn.custom_haas_customer_id = lead.haas_cust_id or frappe.db.get_value(
		"Customer", customer, "custom_haas_customer_id"
	)
	branch = LOCATION_BRANCHES.get((lead.location or "").upper())
	if branch and frappe.db.exists("Branch", branch):
		qtn.custom_branch = branch
	# The lead's Sales Engineer (a Sales Person since 2026-11-03), else the salesperson who owns the lead.
	qtn.custom_sales_engineer = (
		lead.sale_engineer if lead.sale_engineer and frappe.db.exists("Sales Person", lead.sale_engineer) else None
	) or sales_person_for_user(lead.owner)
	qtn.custom_account_manager = frappe.db.get_value("Customer", customer, "account_manager")
	if contact:
		qtn.contact_person = contact

	# The product as a line when it is an Item (by code or name); else the user picks the items.
	# The rate comes from the principal's price list, like any quotation line.
	item_code = find_item(lead.product) or find_item(lead.product_free_hand)
	if item_code:
		qtn.append("items", {"item_code": item_code, "qty": flt(lead.quantity) or 1})

	# Customer address, contact details, price list, etc. like ERPNext does on choosing the customer.
	qtn.run_method("set_missing_values")
	if contact:
		qtn.contact_person = contact
		qtn.contact_email = qtn.contact_email or lead.email_id
		qtn.contact_mobile = qtn.contact_mobile or lead.mobile_no

	out = qtn.as_dict()
	out["__islocal"] = 1
	return out


# The Customer of the lead: one with the same name, else a new one made from the lead.
def get_or_make_customer(lead):
	name = (lead.company_name or "").strip()
	if not name:
		frappe.throw(frappe._("The lead has no Company Name."))
	existing = frappe.db.get_value("Customer", {"customer_name": name})
	if existing:
		return existing

	customer = frappe.new_doc("Customer")
	customer.customer_name = name
	customer.customer_type = "Company"
	customer.customer_group = frappe.db.get_single_value("Selling Settings", "customer_group")
	customer.territory = frappe.db.get_single_value("Selling Settings", "territory")
	customer.website = lead.website
	if customer.meta.has_field("custom_haas_customer_id"):
		customer.custom_haas_customer_id = lead.haas_cust_id
	customer.insert()
	make_address(lead, customer.name)
	return customer.name


# The lead's contact person as a Contact of the customer (found by name, else made).
def get_or_make_contact(lead, customer):
	if not lead.contact_person:
		return None
	existing = frappe.get_all(
		"Contact",
		filters=[
			["Dynamic Link", "link_doctype", "=", "Customer"],
			["Dynamic Link", "link_name", "=", customer],
			["full_name", "=", lead.contact_person],
		],
		pluck="name",
		limit=1,
	)
	if existing:
		return existing[0]
	contact = frappe.new_doc("Contact")
	contact.first_name = lead.contact_person
	contact.designation = lead.contact_position
	if lead.email_id:
		contact.append("email_ids", {"email_id": lead.email_id, "is_primary": 1})
	if lead.mobile_no:
		contact.append("phone_nos", {"phone": lead.mobile_no, "is_primary_mobile_no": 1})
	contact.append("links", {"link_doctype": "Customer", "link_name": customer})
	contact.insert()
	return contact.name


# The lead's address as the new customer's address. A missing city / state rule (e.g. India
# Compliance) must not stop the quotation: the address is then left for the user.
def make_address(lead, customer):
	if not lead.address:
		return
	lines = [l.strip() for l in lead.address.replace("\r", "").split("\n") if l.strip()]
	if not lines:
		return
	frappe.db.savepoint("manav_lead_address")
	try:
		address = frappe.new_doc("Address")
		address.address_title = lead.company_name
		address.address_type = "Billing"
		address.address_line1 = lines[0][:140]
		address.address_line2 = ", ".join(lines[1:])[:140] or None
		address.city = (lead.location or "").title() or lines[-1][:50]
		address.country = frappe.db.get_default("country") or "India"
		address.email_id = lead.email_id
		address.phone = lead.mobile_no
		address.is_primary_address = 1
		address.append("links", {"link_doctype": "Customer", "link_name": customer})
		address.insert()
	except Exception:
		frappe.db.rollback(save_point="manav_lead_address")
		frappe.log_error(title=f"Manav lead {lead.name}: customer address not made")


# Item code for a product name, or None.
def find_item(product):
	if not product:
		return None
	if frappe.db.exists("Item", product):
		return product
	return frappe.db.get_value("Item", {"item_name": product, "disabled": 0})


# Quotation on_update (hooks.py): a quotation made from a lead becomes that lead's Quotation.
def link_quotation_to_lead(doc, method=None):
	lead = doc.get("custom_manav_lead")
	if lead and not frappe.db.get_value("Manav Lead", lead, "quotation"):
		frappe.db.set_value("Manav Lead", lead, "quotation", doc.name)
