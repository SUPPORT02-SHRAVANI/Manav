# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: manav_lead.py
# Purpose: Lead controller for the Manav Lead Management module. Mirrors the Haas LMS Lead Entry
#          Form (217.79.180.219/lms): fills Lead Date, Sale Engineer, Amount, and keeps a chosen
#          product consistent with its product type.
# Created: 2026-10-29
# CHANGE NOTE
# Date: 2026-11-03
# Change: Sales Engineer (sale_engineer) is a Link to Sales Person, filled with the logged-in user's
#         Sales Person; Product Type / Product are hidden (only the free-hand Product is used).
# Reason: The user asked to connect the lead's sales engineer and keep only the free-hand product.
# CHANGE NOTE
# Date: 2026-11-12
# Change: Sales Engineer is always the logged-in user's Sales Person for a salesperson (no manager
#         role): set on a new lead, unchangeable on a saved one. Managers may still pick anyone.
# Reason: The user asked that whoever logs in and makes the lead is its Sales Engineer.

# Frappe framework.
import frappe
# Date helper.
from frappe.utils import flt, nowdate
# Base class of every DocType controller.
from frappe.model.document import Document


# Controller of Manav Lead.
class ManavLead(Document):
	# Set the LMS-style defaults before the document is validated.
	def before_validate(self):
		# Lead Date defaults to today.
		if not self.lead_date:
			self.lead_date = nowdate()
		# Sales Engineer defaults to the logged-in user's Sales Person (2026-11-03; before: the
		# user's full name as text).
		from manav.manav.quotation import sales_person_for_user

		if not self.sale_engineer:
			self.sale_engineer = sales_person_for_user(frappe.session.user)
		# 2026-11-12: a salesperson (no manager role) cannot choose another Sales Engineer: a new lead
		# is theirs, and a saved lead keeps the one it has. Managers may pick anyone. The user asked
		# that whoever is logged in and makes the lead is its Sales Engineer.
		if not can_choose_sale_engineer():
			if self.is_new():
				self.sale_engineer = sales_person_for_user(frappe.session.user) or self.sale_engineer
			else:
				self.sale_engineer = frappe.db.get_value("Manav Lead", self.name, "sale_engineer") or self.sale_engineer
		# Currency defaults to USD (the LMS default).
		if not self.currency:
			self.currency = "USD"
		# Amount = Quantity x Rate.
		self.amount = flt(self.quantity) * flt(self.rate)

	# Keep the product and its type consistent.
	def validate(self):
		# If both a product and a product type are set, they must agree.
		if self.product and self.product_type:
			product_type = frappe.db.get_value("Manav Product", self.product, "product_type")
			if product_type and product_type != self.product_type:
				frappe.throw(
					frappe._("Product {0} belongs to product type {1}, not {2}.").format(
						self.product, product_type, self.product_type
					)
				)
		# If only the product is set, borrow its product type.
		elif self.product and not self.product_type:
			self.product_type = frappe.db.get_value("Manav Product", self.product, "product_type")


# 2026-11-12: roles that may set a lead's Sales Engineer to someone else (everyone else gets their own).
SALE_ENGINEER_CHOOSER_ROLES = {"System Manager", "Sales Manager", "Manav Management"}


def can_choose_sale_engineer():
	"""True when the logged-in user may pick any Sales Engineer on a lead (the form locks it otherwise,
	manav_lead.js, with the same roles)."""
	user = frappe.session.user
	return user == "Administrator" or bool(SALE_ENGINEER_CHOOSER_ROLES & set(frappe.get_roles(user)))
