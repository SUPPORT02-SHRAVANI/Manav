# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Draft PI: the step between the quotation and the Final PI (ERPNext's Sales Order).

Working:
- Made from a submitted quotation (its "Make Draft PI" button, manav.manav.pi.make_draft_pi); it
  then has a number of its own, e.g. 26DPI00001, and refers to the quotation (Quotation No.), which
  shows it back as Draft PI No.
- Items, sub-items ("Sub-Item of"), quantities, rates and descriptions can be changed. Amounts and
  the total (before taxes) are worked out here; taxes and ERPNext's pricing run on the Final PI.
- "Make Final PI" (manav.manav.pi.make_final_pi) makes the Sales Order, e.g. 26FPI00001, from it.
  The Draft PI then shows the Final PI No., its status is "Final PI Made" and it can no longer be
  changed, until that Final PI is cancelled or deleted.
The field names are those of ERPNext's Quotation / Sales Order (also the custom_ ones Manav adds
there), so the values are copied by name in both steps and the PI print template works on it.

Created: 2026-10-29, when the user asked for the Draft PI as a document of its own (Manav module),
not a Sales Order, with a number different from the quotation's and the Final PI's.

CHANGE NOTE
Date: 2026-10-29
Change: validate gives sub-item lines their machine's price (quotation.keep_sub_item_rates, with
calculate_taxes_and_totals for it).
Reason: The user's print of 26DPI00001 (USD) showed sub-items at INR prices converted to USD
(10K-40T-GBX 146.47 instead of 13,900) copied from the quotation, while its Final PI had the right
prices; the user asked for the PI to print in its own currency (USD or INR), unconverted.

CHANGE NOTE
Date: 2026-10-29
Change: validate fills an empty CIF Port / CIF Charges from the principal's defaults when CIF is
ticked (quotation.fill_cif_defaults).
Reason: The user asked for the CIF port and charges to be filled in by default.

CHANGE NOTE
Date: 2026-10-31
Change: validate fills an empty Price Basis (pi.fill_price_basis).
Reason: The user asked for "Price EX-WORKS FTWZ WAREHOUSE CHENNAI (1 NOS) ...... US$ <amount>"
under each machine on the Draft PI and Final PI prints.

CHANGE NOTE
Date: 2026-11-02
Change: The Price Basis is two fields, Price Type and Port (defaults EX-WORKS FTWZ and WAREHOUSE
CHENNAI), still filled by pi.fill_price_basis; the old Price Basis is hidden.
Reason: The user asked for this as the default with an option to set it, as the old program's
"Final price with: Price Type / Port".

CHANGE NOTE
Date: 2026-11-03
Change: Price Type (labelled "Final price with: Price Type") and Port are in the left column of
the top, under Quotation No. / Final PI (draft_pi.json), instead of under CIF on the right.
(Earlier the same day: a section of their own after the totals; the user pointed at the empty
left column instead.)
Reason: The user asked for the old program's "Final price with" Price Type / Port on the Draft PI.

CHANGE NOTE
Date: 2026-11-03
Change: Added "Print Signature" (custom_print_signature, ticked by default, copied from the quotation
and to the Final PI); Account Manager is hidden.
Reason: The user asked for a choice whether the print carries the signature, and Account Manager
removed everywhere.

CHANGE NOTE
Date: 2026-11-03
Change: Added "Ex-Works From" (ex_works_from, shown when CIF is ticked), copied from the quotation and
to the Final PI, printed as "Prices : Ex-Works, <this>."; filled from the principal on saving.
Reason: The user showed the old CIF print ("Prices : Ex-Works, Oxnard, USA.", "CIF Charges upto FTWZ
Chennai").

CHANGE NOTE
Date: 2026-11-04
Change: draft_pi.json: the CIF tick (is_cif) is hidden and set from CIF Charges on saving
(fill_cif_defaults); CIF Charges, Port and Ex-Works From are always shown; an HTML field
custom_standard_accessories under the Items (public/js/standard_accessories.js); "Terms" is a tab
(terms_section is a Tab Break, was a collapsible section), as on the quotation.
Reason: The user asked to remove the CIF tick, for the Standard Accessories table, and for a Terms
tab like the quotation's.

CHANGE NOTE
Date: 2026-11-13
Change: A closed Draft PI (Final PI made) may still have its Print Signature changed: check_not_closed
lets a save through when that is the only change (only_print_signature_changed). Its default print
format is "Draft PI with HSN Code" (draft_pi.json; the same print as Manav Draft PI, now disabled).
Reason: The print page's Print Signature switch saves the tick on the document; on a closed Draft PI
that save was refused, so the signature kept printing although the switch was unticked.
"""

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt

from manav.manav import pi
from manav.manav.quotation import fill_cif_defaults, keep_sub_item_rates, number_sub_items


class DraftPI(Document):
	def autoname(self):
		# 26DPI00001: financial year, DPI, running number (pi.next_number)
		self.name = pi.next_number("Draft PI", "DPI", self.transaction_date)

	def validate(self):
		self.check_not_closed()
		# 2026-10-29: a sub-item line gets its machine's price, never a converted one (as the
		# quotation and the Final PI do). keep_sub_item_rates works it out again through
		# calculate_taxes_and_totals below.
		keep_sub_item_rates(self)
		self.set_amounts()
		# 2026-10-29: CIF ticked -> empty CIF Port / Charges from the principal's defaults
		fill_cif_defaults(self)
		# the sub-items' 1.1, 1.2 ... as on the quotation (the same field names)
		number_sub_items(self)
		# 2026-10-31: Price Basis for the line under each machine on the print (2026-11-02: Price
		# Type and Port)
		pi.fill_price_basis(self)
		self.status = "Final PI Made" if self.final_pi else "Draft"

	def check_not_closed(self):
		"""Once the Final PI is made, changes are made there. pi.py takes the Final PI No. off again
		when that Final PI is cancelled or deleted, and writes it with db.set_value (no validate)."""
		if self.is_new():
			return
		final_pi = frappe.db.get_value("Draft PI", self.name, "final_pi")
		# 2026-11-13: the print page's Print Signature switch is a print choice, not a change of the
		# Draft PI: it is saved even on a closed Draft PI
		if final_pi and self.only_print_signature_changed():
			return
		if final_pi:
			frappe.throw(
				_("Final PI {0} has been made from this Draft PI. Make the changes on the Final PI.").format(
					frappe.bold(final_pi)
				),
				title=_("Draft PI closed"),
			)

	def only_print_signature_changed(self):
		"""True when this Draft PI differs from the saved one in Print Signature only (added 2026-11-13):
		every other field unchanged and every table the same rows with the same values."""
		before = self.get_doc_before_save()
		if not before or not self.has_value_changed("custom_print_signature"):
			return False
		skip = {"modified", "modified_by", "custom_print_signature"}
		for df in self.meta.fields:
			if df.fieldname in skip:
				continue
			if df.fieldtype in frappe.model.table_fields:
				mine = [row.as_dict(no_default_fields=True, convert_dates_to_str=True) for row in self.get(df.fieldname)]
				stored = [row.as_dict(no_default_fields=True, convert_dates_to_str=True) for row in before.get(df.fieldname)]
				if mine != stored:
					return False
			elif df.fieldtype not in frappe.model.no_value_fields and self.has_value_changed(df.fieldname):
				return False
		return True

	def set_amounts(self):
		"""Amount = quantity x rate on every line; Total and Total Quantity of the lines. No taxes."""
		for row in self.items:
			row.amount = flt(row.qty) * flt(row.rate)
		self.total_qty = sum(flt(row.qty) for row in self.items)
		self.net_total = sum(flt(row.amount) for row in self.items)

	def calculate_taxes_and_totals(self):
		"""The name ERPNext's documents use: quotation.keep_sub_item_rates calls it after a price was
		put back. A Draft PI has no taxes, so it is the amounts and the total."""
		self.set_amounts()

	def on_update(self):
		# the quotation shows this Draft PI as its Draft PI No. (a reference only, so db.set_value:
		# the quotation is submitted)
		if self.quotation and frappe.db.exists("Quotation", self.quotation):
			frappe.db.set_value("Quotation", self.quotation, "custom_draft_pi_no", self.name, update_modified=False)

	def on_trash(self):
		# A Draft PI that has a Final PI is not deleted: Frappe's link check stops it (Sales Order
		# custom_draft_pi). Otherwise the quotation's reference to it is taken off.
		if self.quotation:
			frappe.db.set_value(
				"Quotation",
				{"name": self.quotation, "custom_draft_pi_no": self.name},
				"custom_draft_pi_no",
				None,
				update_modified=False,
			)
