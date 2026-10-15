# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Customer Contact Person: one contact person of a customer in the old quotation system.

Working: the fields are defined in customer_contact_person.json. The record is named
Customer Code-Sr No, e.g. MA018-2, the key of the old table. No custom logic is needed, so the class
is empty. The old records are loaded by manav/manav/import_legacy.py.

Created: 2026-10-12, from the old table "Customer Contact Person Master".
"""

# import frappe
from frappe.model.document import Document


class CustomerContactPerson(Document):
	"""One contact person of a customer in the old quotation system."""
	pass
 