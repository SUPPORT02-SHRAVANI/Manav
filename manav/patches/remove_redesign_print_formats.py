# Removes the three "Redesign" print formats that were added and taken back on 2026-11-02.
# Created: 2026-11-02.
#
# The formats were synced to manav.local by a migrate before the user said the print format is not
# to change; their files are gone from the app, but a migrate does not delete standard records whose
# files were removed, so they would stay in the Print view's list. The defaults that pointed at them
# are set back by the after_migrate step erpnext_fields.setup_erpnext_fields (Quotation, Sales Order)
# and by draft_pi.json (Draft PI). Safe to run again: a format already gone is skipped.
import frappe

REDESIGN_PRINT_FORMATS = ("Manav Quotation Redesign", "Manav PI Redesign", "Manav Draft PI Redesign")


def execute():
	for name in REDESIGN_PRINT_FORMATS:
		if frappe.db.exists("Print Format", name):
			# force: a standard record may only be deleted this way (developer mode is not needed)
			frappe.delete_doc("Print Format", name, force=True, ignore_permissions=True)
