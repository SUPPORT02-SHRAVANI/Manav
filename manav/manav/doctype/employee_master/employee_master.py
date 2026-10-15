# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Employee Master: one employee of the old quotation system, e.g. M-03. These codes are the sales
person and signature codes used on customers and quotations.

Working: the fields are defined in employee_master.json. The record is named by its Employee Code.
It is separate from the HR Employee doctype, which needs joining date, birth date and company that
the old table does not have. No custom logic is needed, so the class is empty. The old records are
loaded by manav/manav/import_legacy.py.

Created: 2026-10-12, from the old table "Employee Master".
"""

# import frappe
from frappe.model.document import Document


class EmployeeMaster(Document):
	"""One employee of the old quotation system."""
	pass
