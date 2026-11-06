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
		if not self.sale_engineer:
			from manav.manav.quotation import sales_person_for_user

			self.sale_engineer = sales_person_for_user(frappe.session.user)
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
