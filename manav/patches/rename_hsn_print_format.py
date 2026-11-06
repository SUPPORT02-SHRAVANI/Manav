# Renames the print format "Manav Modern Quotation CIF" to "Quotation with HSN Code".
# Created: 2026-11-04, the user's request.
#
# The format's file now carries the new name (print_format/quotation_with_hsn_code), so the model
# sync of migrate makes the new record; a migrate does not delete a standard record whose file was
# removed, so the old one is deleted here, else both would show in the Print view. A default print
# format (Property Setter) that pointed at the old name is moved to the new one. Runs after the
# sync (post_model_sync); safe to run again: an old record already gone is skipped.
import frappe

OLD_NAME = "Manav Modern Quotation CIF"
NEW_NAME = "Quotation with HSN Code"


def execute():
	if not frappe.db.exists("Print Format", NEW_NAME):
		# the new file did not sync: keep the old record rather than lose the format
		return
	for setter in frappe.get_all(
		"Property Setter", filters={"property": "default_print_format", "value": OLD_NAME}, pluck="name"
	):
		frappe.db.set_value("Property Setter", setter, "value", NEW_NAME)
	if frappe.db.exists("Print Format", OLD_NAME):
		# force: a standard record may only be deleted this way (developer mode is not needed)
		frappe.delete_doc("Print Format", OLD_NAME, force=True, ignore_permissions=True)
