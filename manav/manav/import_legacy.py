# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""One-time import of the old quotation system's tables into the Manav doctypes.

Working: each old table was exported as an HTML table or an Excel sheet. The tables were converted
once into JSON files in the legacy_data folder next to this file; the large ones are gzip-compressed
(.json.gz). Each function below loads one file and inserts its rows as documents, skipping any row
that already exists, so every function is safe to run again. The old dates (dd/mm/yyyy) are already
converted to yyyy-mm-dd in the JSON files.

Run on the server after `bench --site manav.local migrate`. Each function's own command is in its
docstring; import_all runs all of them in the right order.

Created: 2026-10-12, with the first table (Region Zone). One function is added per table.

CHANGE NOTE
Date: 2026-10-12
Change: Added import_customers, which loads the old customer master into the inbuilt ERPNext
Customer doctype.
Reason: The customers are the second old table to be moved. They do not fit import_rows, because a
Customer is named by ERPNext and not by its old code, and each one also gets an address and a contact.

CHANGE NOTE
Date: 2026-10-12
Change: Added import_legacy_docs and one import function each for Quotation Type, Employee Master,
Customer Contact Person, Quotation Item Master, Quotation Sub Item Master and Quotation Head (with its
Quotation Term rows), plus import_all. load() now also reads .json.gz files. import_customers now
keeps a Region Zone code that has no Region Zone record instead of leaving it empty.
Reason: Seven more old tables were moved. Their documents are not all named by one old column, some
point to a Customer by its old code, and 1167 quotations use zone "S", which is not in Region Zone.

CHANGE NOTE
Date: 2026-10-12
Change: import_quotation_types also loads each type's Quotation No Series and Standard Terms
(set_quotation_type_defaults).
Reason: New quotations are now made in Quotation Head; they take their number series and their
standard terms from the Quotation Type.

CHANGE NOTE
Date: 2026-10-12
Change: Added import_items, which loads the old items and sub items into the inbuilt ERPNext Item
doctype, and put it in import_all.
Reason: The items also have to be in ERPNext's own Item list (Selling > Item).

CHANGE NOTE
Date: 2026-10-12
Change: Added import_organizations, which makes a CRM Organization for every Customer, and put it
in import_all.
Reason: The customer companies also have to be in the Organizations list of the CRM app.

CHANGE NOTE
Date: 2026-10-12
Change: Added import_territories, import_sales_persons, import_contacts, import_item_prices and
import_quotation_setup, and put them in import_all.
Reason: Everything is to be used in ERPNext's own doctypes: zones as Territory, the old employees as
Sales Person, contact persons as Contact, rates as Item Price, and each principal's currency, price
list, item group and standard terms as the ERPNext records a Quotation uses.

CHANGE NOTE
Date: 2026-10-28
Change: Added import_item_groups (the 21 item groups of the old Magic system as ERPNext Item Groups
under "Magic Item Groups"; items are not moved), and put it in import_all.
Reason: The user asked for the old item group master (20_item_group_mst) to be imported.

CHANGE NOTE
Date: 2026-11-06
Change: import_item_groups drops the 8-digit tariff code from the group names ("01 MACHINES"
instead of "01 MACHINES - 16301000") and renames the groups already made.
Reason: The user asked for the number to be removed from the Item Group dropdown.
"""

import gzip
import html
import json
import os
import re
from collections import Counter

import frappe
from frappe.utils import validate_email_address, validate_phone_number
from frappe.utils.nestedset import get_root_of

DATA_DIR = os.path.join(os.path.dirname(__file__), "legacy_data")


def load(name):
	"""Read one data file from the legacy_data folder and return its rows.

	The file is name.json, or name.json.gz for the large tables.
	"""
	path = os.path.join(DATA_DIR, name + ".json")
	if os.path.exists(path):
		with open(path, encoding="utf-8") as f:
			return json.load(f)
	with gzip.open(path + ".gz", "rt", encoding="utf-8") as f:
		return json.load(f)


def import_rows(doctype, rows, key):
	"""Insert the rows as documents of `doctype` and print what happened.

	`key` is the field that holds the document name; a row whose name already exists is skipped.
	A row that fails is rolled back on its own and reported, so one bad row does not stop the rest.
	"""
	if not frappe.db.exists("DocType", doctype):
		frappe.throw(f"DocType {doctype} not found. Run bench migrate first.")

	created, skipped, failed = 0, 0, []
	for row in rows:
		if frappe.db.exists(doctype, row[key]):
			skipped += 1
			continue
		try:
			frappe.db.savepoint("legacy_row")
			frappe.get_doc({"doctype": doctype, **row}).insert(ignore_permissions=True)
			created += 1
		except Exception as e:
			frappe.db.rollback(save_point="legacy_row")
			failed.append((row[key], str(e)))

	frappe.db.commit()
	print(f"{doctype}: {created} created, {skipped} already there, {len(failed)} failed")
	for name, error in failed:
		print(f"  FAILED {name}: {error}")


def import_region_zones():
	"""Load the 6 zones of the old table "216-Region_Zone_mst" into Region Zone.

	bench --site manav.local execute manav.manav.import_legacy.import_region_zones
	"""
	import_rows("Region Zone", load("region_zone"), "zone_code")


def import_customers():
	"""Load the 8432 customers of the old customer master into the inbuilt Customer doctype.

	Each row of legacy_data/customer.json holds three kinds of values:
	- standard Customer fields: customer_name, tax_id (only a real GSTIN), disabled (old InActive);
	- the custom fields of manav/manav/customer_fields.py (names starting with custom_);
	- address_line1, city, state, pincode, country, email_id and mobile_no. These are not columns
	  of Customer. ERPNext itself turns them into the primary Address and primary Contact when a
	  new Customer is saved, the same way its quick entry form does.

	A customer whose Customer Code is already present is skipped, so this is safe to run again.
	ERPNext names the customer (by customer name or by series, as set in Selling Settings); when two
	old customers share a name, ERPNext adds " - 1", " - 2" to the later ones.

	Takes several minutes, because every customer is saved with its address and contact.

	bench --site manav.local execute manav.manav.import_legacy.import_customers
	"""
	if not frappe.get_meta("Customer").has_field("custom_customer_code"):
		frappe.throw("Customer has no Customer Code field yet. Run bench migrate first.")
	if not frappe.db.exists("Country", "India"):
		frappe.throw("Country India not found. Complete the ERPNext setup wizard first.")

	rows = load("customer")
	existing = set(frappe.get_all("Customer", pluck="custom_customer_code"))
	zones = set(frappe.get_all("Region Zone", pluck="name"))

	created, skipped, failed, unknown_zones = 0, 0, [], Counter()
	for row in rows:
		code = row["custom_customer_code"]
		if code in existing:
			skipped += 1
			continue

		zone = row.get("custom_region_zone")
		if zone and zone not in zones:
			unknown_zones[zone] += 1

		try:
			frappe.db.savepoint("legacy_row")
			# The old system has no company/individual flag; nearly all rows are firms.
			doc = frappe.get_doc({"doctype": "Customer", "customer_type": "Company", **row})
			# Region Zone is a Link field, and the old data uses zone "S", which has no Region Zone
			# record. Link checking is switched off so the code is kept as it was typed; the zones
			# found this way are reported at the end.
			doc.flags.ignore_links = True
			doc.insert(ignore_permissions=True)
			created += 1
		except Exception as e:
			frappe.db.rollback(save_point="legacy_row")
			failed.append((code, str(e)))

		# Commit in batches, so a stop in the middle keeps what is done and a rerun continues.
		if created and created % 500 == 0:
			frappe.db.commit()
			print(f"  {created} customers created so far")

	frappe.db.commit()
	print(f"Customer: {created} created, {skipped} already there, {len(failed)} failed")
	report_unknown_zones(unknown_zones)
	for code, error in failed:
		print(f"  FAILED {code}: {error}")


def report_unknown_zones(unknown_zones):
	"""Print the zone codes that were loaded although Region Zone has no record for them."""
	for zone, count in unknown_zones.items():
		print(f"  Zone {zone} is not in Region Zone; kept as typed on {count} records. Add it there.")


def import_legacy_docs(doctype, rows, key_fields, zone_field=None, with_customer=False):
	"""Insert the rows as documents of `doctype` and print what happened.

	`key_fields` are the fields that identify an old record, e.g. ["customer_code", "sr_no"]. A row
	whose key is already in the database is skipped. The key is counted, not just looked up, because
	Quotation Item Master holds the same key twice for two different items.

	`zone_field` names the row's Region Zone field, so unknown zone codes can be reported.

	`with_customer`: the row holds the old `customer_code`; the Customer with that code is looked up
	and put in the row's `customer` Link field. A code with no Customer is kept and reported.

	Link checking is switched off for these documents, so a code that points to a record that does
	not exist yet (zone "S", a boss loaded later) is kept as typed instead of failing the row.
	A row that fails is rolled back on its own and reported, so one bad row does not stop the rest.
	"""
	if not frappe.db.exists("DocType", doctype):
		frappe.throw(f"DocType {doctype} not found. Run bench migrate first.")

	existing = Counter(tuple(r) for r in frappe.get_all(doctype, fields=key_fields, as_list=True))
	zones = set(frappe.get_all("Region Zone", pluck="name")) if zone_field else set()
	customers = {}
	if with_customer:
		for name, code in frappe.get_all("Customer", fields=["name", "custom_customer_code"], as_list=True):
			if code:
				customers[code] = name

	created, skipped, failed, unknown_zones, no_customer = 0, 0, [], Counter(), set()
	for row in rows:
		key = tuple(row.get(f) for f in key_fields)
		if existing[key] > 0:
			existing[key] -= 1
			skipped += 1
			continue

		if zone_field and row.get(zone_field) and row[zone_field] not in zones:
			unknown_zones[row[zone_field]] += 1
		if with_customer and row.get("customer_code"):
			if row["customer_code"] in customers:
				row = {**row, "customer": customers[row["customer_code"]]}
			else:
				no_customer.add(row["customer_code"])

		try:
			frappe.db.savepoint("legacy_row")
			doc = frappe.get_doc({"doctype": doctype, **row})
			doc.flags.ignore_links = True
			doc.insert(ignore_permissions=True)
			created += 1
		except Exception as e:
			frappe.db.rollback(save_point="legacy_row")
			failed.append((" / ".join(str(k) for k in key), str(e)))

		# Commit in batches, so a stop in the middle keeps what is done and a rerun continues.
		if created and created % 500 == 0:
			frappe.db.commit()
			print(f"  {created} created so far")

	frappe.db.commit()
	print(f"{doctype}: {created} created, {skipped} already there, {len(failed)} failed")
	report_unknown_zones(unknown_zones)
	if no_customer:
		print(
			f"  {len(no_customer)} customer codes have no Customer; the Customer link was left empty."
			" Run import_customers first, then set the link on these records."
		)
	for name, error in failed:
		print(f"  FAILED {name}: {error}")


def import_quotation_types():
	"""Load the 8 quotation types of the old table "Quotation Type Master" into Quotation Type.

	bench --site manav.local execute manav.manav.import_legacy.import_quotation_types
	"""
	rows = load("quotation_type")
	import_legacy_docs("Quotation Type", rows, ["quotation_type"])
	set_quotation_type_defaults(rows)


def set_quotation_type_defaults(rows):
	"""Put the Quotation No Series and the Standard Terms on Quotation Types that have none yet.

	CHANGE NOTE
	Date: 2026-10-12
	Change: New function, called by import_quotation_types.
	Reason: The series and standard terms were added to the data file after the first version of
	the import. A Quotation Type loaded before that is skipped by the import, so it is completed
	here. Values a user has already entered are never overwritten.
	"""
	updated = 0
	for row in rows:
		doc = frappe.get_doc("Quotation Type", row["quotation_type"])
		changed = False
		if row.get("number_series") and not doc.number_series:
			doc.number_series = row["number_series"]
			changed = True
		if row.get("terms") and not doc.terms:
			doc.extend("terms", row["terms"])
			changed = True
		if changed:
			doc.save(ignore_permissions=True)
			updated += 1
	frappe.db.commit()
	if updated:
		print(f"  Quotation Type: series and standard terms set on {updated} records")


def import_employees():
	"""Load the 122 employees of the old table "Employee Master" into Employee Master.

	bench --site manav.local execute manav.manav.import_legacy.import_employees
	"""
	import_legacy_docs(
		"Employee Master", load("employee_master"), ["employee_code"], zone_field="region_zone"
	)


def import_customer_contact_persons():
	"""Load the 10907 contact persons of the old customers into Customer Contact Person.

	Run import_customers first, so each contact person can be linked to its Customer.

	bench --site manav.local execute manav.manav.import_legacy.import_customer_contact_persons
	"""
	import_legacy_docs(
		"Customer Contact Person",
		load("customer_contact_person"),
		["customer_code", "sr_no"],
		with_customer=True,
	)


def import_quotation_items():
	"""Load the 6527 items of the old table "Quotation Item Master" into Quotation Item Master.

	Run import_quotation_types first.

	bench --site manav.local execute manav.manav.import_legacy.import_quotation_items
	"""
	import_legacy_docs(
		"Quotation Item Master", load("quotation_item_master"), ["quotation_type", "item_code", "sr_no"]
	)


def import_quotation_sub_items():
	"""Load the 6059 sub items of the old table "Quotation Sub Item Master".

	bench --site manav.local execute manav.manav.import_legacy.import_quotation_sub_items
	"""
	import_legacy_docs(
		"Quotation Sub Item Master", load("quotation_sub_item_master"), ["main_item_code", "sr_no"]
	)


def import_quotations():
	"""Load the 22527 quotations of the old table "Quotation Head" into Quotation Head.

	Each row of legacy_data/quotation_head.json.gz carries its lines of the old table "Quotation
	Term" in `terms`; they are saved as the Quotation Term rows of the quotation (169092 rows in all).

	Run import_customers and import_quotation_types first. Takes a long time (about 190000 rows).

	bench --site manav.local execute manav.manav.import_legacy.import_quotations
	"""
	import_legacy_docs(
		"Quotation Head",
		load("quotation_head"),
		["quotation_no"],
		zone_field="region_zone",
		with_customer=True,
	)


def import_items():
	"""Load the old items and sub items into the inbuilt ERPNext Item doctype (5252 items).

	legacy_data/item.json.gz holds one row per item code: the 4670 different codes of the old
	"Quotation Item Master" and the 582 codes of "Quotation Sub Item Master" that are not items
	themselves. ERPNext allows an item code only once, so a code that the old tables hold several
	times (for two Quotation Types, or with several Sr Nos) is one Item.

	Items from the item master are stock items in the Item Group of their kind of goods (Machines,
	Spares, Chmer, Jagdeep). Codes that are only sub items go to the Item Group "Options" and are
	not stock items. The Item Groups and units that do not exist yet are created first.

	An item whose code is already in Item is skipped, so this is safe to run again.
	Run import_quotation_types first: each item links to its Quotation Type.

	bench --site manav.local execute manav.manav.import_legacy.import_items
	"""
	if not frappe.get_meta("Item").has_field("custom_quotation_type"):
		frappe.throw("Item has no Quotation Type field yet. Run bench migrate first.")

	rows = load("item")

	root_group = get_root_of("Item Group")
	if not root_group:
		frappe.throw("No root Item Group found. Complete the ERPNext setup wizard first.")
	for group in sorted({row["item_group"] for row in rows}):
		if not frappe.db.exists("Item Group", group):
			frappe.get_doc(
				{"doctype": "Item Group", "item_group_name": group, "parent_item_group": root_group}
			).insert(ignore_permissions=True)
			print(f"  Item Group {group} created")
	for uom in sorted({row["stock_uom"] for row in rows}):
		if not frappe.db.exists("UOM", uom):
			frappe.get_doc({"doctype": "UOM", "uom_name": uom}).insert(ignore_permissions=True)
			print(f"  UOM {uom} created")
	frappe.db.commit()

	# Item codes are compared without case: the database treats "mc4" and "MC4" as the same name.
	existing = {name.lower() for name in frappe.get_all("Item", pluck="name")}

	created, skipped, failed = 0, 0, []
	for row in rows:
		if row["item_code"].lower() in existing:
			skipped += 1
			continue

		# Item Description is a formatted (HTML) field. The old text is plain, so characters such as
		# < and & are escaped and line breaks are turned into <br>, to show it as it was typed.
		if row.get("description"):
			text = html.escape(row["description"], quote=False).replace("\n", "<br>")
			row = {**row, "description": text}

		try:
			frappe.db.savepoint("legacy_row")
			frappe.get_doc({"doctype": "Item", **row}).insert(ignore_permissions=True)
			created += 1
		except Exception as e:
			frappe.db.rollback(save_point="legacy_row")
			failed.append((row["item_code"], str(e)))

		if created and created % 500 == 0:
			frappe.db.commit()
			print(f"  {created} created so far")

	frappe.db.commit()
	print(f"Item: {created} created, {skipped} already there, {len(failed)} failed")
	for name, error in failed:
		print(f"  FAILED {name}: {error}")


def import_organizations():
	"""Make an Organization (CRM app) for every Customer that does not have one yet.

	This reads the Customers in the database, not a data file, so run import_customers first.
	The Organization gets the same name as the Customer record and the customer's primary address.
	Using the Customer's record name keeps the two lists one to one: two old customers with the
	same company name are "NAME" and "NAME - 1" in Customer, and the same in Organization.

	An Organization whose name already exists is skipped, so this is safe to run again.

	bench --site manav.local execute manav.manav.import_legacy.import_organizations
	"""
	if not frappe.db.exists("DocType", "CRM Organization"):
		frappe.throw("DocType CRM Organization not found. The CRM app is not installed on this site.")

	customers = frappe.get_all("Customer", fields=["name", "customer_primary_address"], order_by="name")
	# Names are compared without case: the database treats "Abc Ltd" and "ABC LTD" as the same name.
	existing = {name.lower() for name in frappe.get_all("CRM Organization", pluck="name")}

	created, skipped, failed = 0, 0, []
	for customer in customers:
		if customer.name.lower() in existing:
			skipped += 1
			continue
		try:
			frappe.db.savepoint("legacy_row")
			frappe.get_doc(
				{
					"doctype": "CRM Organization",
					"organization_name": customer.name,
					"address": customer.customer_primary_address,
				}
			).insert(ignore_permissions=True)
			existing.add(customer.name.lower())
			created += 1
		except Exception as e:
			frappe.db.rollback(save_point="legacy_row")
			failed.append((customer.name, str(e)))

		if created and created % 500 == 0:
			frappe.db.commit()
			print(f"  {created} created so far")

	frappe.db.commit()
	print(f"CRM Organization: {created} created, {skipped} already there, {len(failed)} failed")
	for name, error in failed:
		print(f"  FAILED {name}: {error}")


# Old currency text of a Quotation Type -> ERPNext Currency.
CURRENCIES = {"RS": "INR", "US$": "USD"}
# Price List of each currency. The rupee list is ERPNext's standard one where it exists.
PRICE_LISTS = {"INR": "Standard Selling", "USD": "Manav Selling USD"}
# Item Group of each Quotation Type; the same groups import_items puts the Items in.
ITEM_GROUPS = {
	"1": "Machines",
	"2": "Spares",
	"3": "Spares",
	"4": "Manav",
	"5": "Rotary Table",
	"6": "Chmer",
	"7": "Jagdeep",
}


def insert_many(doctype, docs, key_of):
	"""Insert the given documents one by one and print the result.

	`docs` are dicts without "doctype". A document that fails is rolled back on its own and
	reported with `key_of(doc)`, so one bad record does not stop the rest. Returns the count created.
	"""
	created, failed = 0, []
	for doc in docs:
		try:
			frappe.db.savepoint("legacy_row")
			frappe.get_doc({"doctype": doctype, **doc}).insert(ignore_permissions=True)
			created += 1
		except Exception as e:
			frappe.db.rollback(save_point="legacy_row")
			failed.append((key_of(doc), str(e)))
		if created and created % 500 == 0:
			frappe.db.commit()
			print(f"  {created} created so far")
	frappe.db.commit()
	print(f"{doctype}: {created} created, {len(failed)} failed")
	for key, error in failed:
		print(f"  FAILED {key}: {error}")
	return created


def import_territories():
	"""Make an ERPNext Territory for every Region Zone and set it on the customers of that zone.

	The Territory is named by the zone name (HFO-BANGALORE ...). A customer's Territory is set only
	when it is empty or still the root territory, so a territory chosen by a user is kept.
	Run import_region_zones and import_customers first. Safe to run again.

	bench --site manav.local execute manav.manav.import_legacy.import_territories
	"""
	root = get_root_of("Territory")
	if not root:
		frappe.throw("No root Territory found. Complete the ERPNext setup wizard first.")

	zones = frappe.get_all("Region Zone", fields=["name", "zone_name"])
	insert_many(
		"Territory",
		[
			{"territory_name": zone.zone_name, "parent_territory": root, "is_group": 0}
			for zone in zones
			if not frappe.db.exists("Territory", zone.zone_name)
		],
		lambda doc: doc["territory_name"],
	)

	updated = 0
	for zone in zones:
		customers = frappe.get_all(
			"Customer", filters={"custom_region_zone": zone.name}, fields=["name", "territory"]
		)
		for customer in customers:
			if customer.territory and customer.territory != root:
				continue
			# Only this one column changes; saving the whole Customer would run all its checks again.
			frappe.db.set_value(
				"Customer", customer.name, "territory", zone.zone_name, update_modified=False
			)
			updated += 1
	frappe.db.commit()
	print(f"  Territory set on {updated} customers")


def import_sales_persons():
	"""Load the 122 old employees into ERPNext's Sales Person, with their old code.

	The Sales Person is named by the employee name. Two old employees share a name; the second gets
	its code added, e.g. "SHASHANKA HEGDE (M-145)". Inactive employees are loaded disabled.
	A code that already has a Sales Person is skipped, so this is safe to run again.

	bench --site manav.local execute manav.manav.import_legacy.import_sales_persons
	"""
	if not frappe.get_meta("Sales Person").has_field("custom_employee_code"):
		frappe.throw("Sales Person has no Employee Code field yet. Run bench migrate first.")
	root = get_root_of("Sales Person")
	if not root:
		frappe.throw("No root Sales Person found. Complete the ERPNext setup wizard first.")

	existing_codes = set(frappe.get_all("Sales Person", pluck="custom_employee_code"))
	names = {name.lower() for name in frappe.get_all("Sales Person", pluck="name")}

	docs = []
	for row in load("employee_master"):
		code = row["employee_code"]
		if code in existing_codes:
			continue
		name = row["employee_name"].strip()
		if name.lower() in names:
			name = f"{name} ({code})"
		names.add(name.lower())
		docs.append(
			{
				"sales_person_name": name,
				"custom_employee_code": code,
				"parent_sales_person": root,
				"is_group": 0,
				"enabled": 0 if row.get("inactive") else 1,
			}
		)
	insert_many("Sales Person", docs, lambda doc: doc["custom_employee_code"])


def import_contacts():
	"""Load the 10907 old contact persons into ERPNext's Contact, linked to their Customer.

	Each contact gets its name, designation, department, e-mail and up to three phone numbers
	(mobile, phone, residence). An e-mail or phone that Frappe would reject as invalid is left out;
	it stays in Customer Contact Person. A contact person without a name is named "Contact".

	The old key Customer Code-Sr No is stored on the Contact; a key that is already there is
	skipped, so this is safe to run again. Run import_customers first.

	bench --site manav.local execute manav.manav.import_legacy.import_contacts
	"""
	if not frappe.get_meta("Contact").has_field("custom_legacy_contact_key"):
		frappe.throw("Contact has no Old System Key field yet. Run bench migrate first.")

	customers = {}
	for name, code in frappe.get_all("Customer", fields=["name", "custom_customer_code"], as_list=True):
		if code:
			customers[code] = name
	existing = set(frappe.get_all("Contact", pluck="custom_legacy_contact_key"))

	docs, no_customer = [], set()
	for row in load("customer_contact_person"):
		key = f"{row['customer_code']}-{row['sr_no']}"
		if key in existing:
			continue
		customer = customers.get(row["customer_code"])
		if not customer:
			no_customer.add(row["customer_code"])
			continue

		doc = {
			"first_name": row.get("contact_name") or "Contact",
			"designation": row.get("designation"),
			"department": row.get("department"),
			"custom_legacy_contact_key": key,
			"links": [{"link_doctype": "Customer", "link_name": customer}],
			"email_ids": [],
			"phone_nos": [],
		}
		email = (row.get("email") or "").strip()
		if email and validate_email_address(email):
			doc["email_ids"].append({"email_id": email, "is_primary": 1})

		phones = []
		for field in ("mobile_no", "phone", "res_phone"):
			number = (row.get(field) or "").strip()
			if number and number not in phones and validate_phone_number(number):
				phones.append(number)
				doc["phone_nos"].append(
					{
						"phone": number,
						"is_primary_mobile_no": 1 if field == "mobile_no" else 0,
						# The first number that is not the mobile is the contact's main phone.
						"is_primary_phone": 1
						if field != "mobile_no" and not any(p["is_primary_phone"] for p in doc["phone_nos"])
						else 0,
					}
				)
		docs.append(doc)

	insert_many("Contact", docs, lambda doc: doc["custom_legacy_contact_key"])
	if no_customer:
		print(f"  {len(no_customer)} customer codes have no Customer; their contacts were not loaded.")


def ensure_price_lists():
	"""Make sure the two selling price lists exist and return {currency: price list name}."""
	for currency, price_list in PRICE_LISTS.items():
		# A currency that is switched off cannot be chosen on a quotation.
		if frappe.db.exists("Currency", currency):
			frappe.db.set_value("Currency", currency, "enabled", 1)
		if not frappe.db.exists("Price List", price_list):
			frappe.get_doc(
				{
					"doctype": "Price List",
					"price_list_name": price_list,
					"currency": currency,
					"selling": 1,
					"enabled": 1,
				}
			).insert(ignore_permissions=True)
			print(f"  Price List {price_list} created")
	frappe.db.commit()
	return dict(PRICE_LISTS)


def import_item_prices():
	"""Make ERPNext Item Prices from the rates of the old item master.

	The currency of a rate is the currency of its Quotation Type: rupee rates go to the price list
	"Standard Selling", dollar rates to "Manav Selling USD". An item that the old table holds for a
	rupee type and for a dollar type gets a price in both lists. Where one item has several rows
	for the same currency, the first row that has a rate is used.

	An item that already has a price in a list is skipped, so this is safe to run again.
	Run import_items first. Options get no Item Price: their price depends on the machine and is
	taken from Quotation Sub Item Master by the Add Options button.

	bench --site manav.local execute manav.manav.import_legacy.import_item_prices
	"""
	price_lists = ensure_price_lists()
	type_currency = {
		row["quotation_type"]: CURRENCIES.get(row.get("currency_code")) for row in load("quotation_type")
	}
	# Item codes are matched without case, as the database does.
	items = {
		name.lower(): (name, uom)
		for name, uom in frappe.get_all("Item", fields=["name", "stock_uom"], as_list=True)
	}
	existing = {
		(item.lower(), price_list)
		for item, price_list in frappe.get_all(
			"Item Price", filters={"selling": 1}, fields=["item_code", "price_list"], as_list=True
		)
	}

	docs, no_item = [], set()
	for row in load("quotation_item_master"):
		currency = type_currency.get(row["quotation_type"])
		if not row.get("rate") or not currency:
			continue
		key = (row["item_code"].lower(), price_lists[currency])
		if key in existing:
			continue
		if key[0] not in items:
			no_item.add(row["item_code"])
			continue
		existing.add(key)
		item_code, uom = items[key[0]]
		docs.append(
			{
				"item_code": item_code,
				"uom": uom,
				"price_list": price_lists[currency],
				"price_list_rate": row["rate"],
			}
		)
	insert_many("Item Price", docs, lambda doc: f"{doc['item_code']} / {doc['price_list']}")
	if no_item:
		print(f"  {len(no_item)} item codes have no Item; run import_items first.")


def terms_as_html(terms):
	"""Turn the standard terms of a Quotation Type into the HTML table a Terms template holds."""
	rows = []
	for term in terms:
		# A second line of the same term continues without its number and heading.
		first = bool(term.get("term_desc")) or term.get("sr_no") in (None, 0, 1)
		number = term.get("term_type") if first and term.get("term_type") is not None else ""
		text = html.escape(term.get("description") or "", quote=False).replace("\n", "<br>")
		heading = html.escape(term.get("term_desc") or "", quote=False)
		rows.append(
			f'<tr><td style="width: 5%;">{number}</td>'
			f'<td style="width: 32%;">{heading}</td><td>{text}</td></tr>'
		)
	return '<table class="manav-terms" style="width: 100%;">' + "".join(rows) + "</table>"


def import_quotation_setup():
	"""Give every Quotation Type the ERPNext records a Quotation takes from its principal.

	For each type this sets, where the field is still empty: the Currency, the Price List of that
	currency, the Item Group of its items, and a Terms and Conditions template "Manav - <type>"
	made from the type's Standard Terms. Values a user has already chosen are kept.
	Run import_quotation_types and import_items first. Safe to run again.

	bench --site manav.local execute manav.manav.import_legacy.import_quotation_setup
	"""
	price_lists = ensure_price_lists()
	for name in frappe.get_all("Quotation Type", pluck="name", order_by="name"):
		doc = frappe.get_doc("Quotation Type", name)
		currency = CURRENCIES.get(doc.currency_code)
		if not doc.currency and currency and frappe.db.exists("Currency", currency):
			doc.currency = currency
		if not doc.price_list and doc.currency in price_lists:
			doc.price_list = price_lists[doc.currency]
		# QS (AMC service) has no goods of its own, so it has no Item Group.
		group = ITEM_GROUPS.get(name)
		if not doc.item_group and group and frappe.db.exists("Item Group", group):
			doc.item_group = group

		if not doc.terms_template and doc.terms:
			title = f"Manav - {doc.description.title()}"
			if not frappe.db.exists("Terms and Conditions", title):
				frappe.get_doc(
					{
						"doctype": "Terms and Conditions",
						"title": title,
						"selling": 1,
						"terms": terms_as_html([t.as_dict() for t in doc.terms]),
					}
				).insert(ignore_permissions=True)
			doc.terms_template = title
		doc.save(ignore_permissions=True)
	frappe.db.commit()
	print("Quotation Type: currency, price list, item group and terms template set where empty")


MAGIC_ITEM_GROUPS = "Magic Item Groups"

# The old group names end with an 8-digit tariff code ("MACHINES - 16301000",
# "INSPECTION EQUIPMENT 13400000"); it is not part of the name the users want to see.
TARIFF_CODE_SUFFIX = re.compile(r"\s*-?\s*\d{8}\s*$")


def item_group_name(row):
	"""ERPNext Item Group name of an old Magic group: "<code> <name>" without the tariff code,
	e.g. "01 MACHINES". Added 2026-11-06."""
	return f"{row['code']} {TARIFF_CODE_SUFFIX.sub('', row['group_name'])}"


def import_item_groups():
	"""Make an ERPNext Item Group for each of the 21 item groups of the old Magic system (file
	legacy_data/item_group.json, from 20_item_group_mst), under one parent "Magic Item Groups".
	Each is named by its old code and name without the tariff code ("01 MACHINES"; before
	2026-11-06 "01 MACHINES - 16301000", renamed when this runs again), so it cannot clash with the
	groups the quotations use (Machines, Spares, Options ...). Items are not moved into them: the
	principals' item lists on quotations depend on the current groups (chosen with the user on
	2026-10-28). Safe to run again. Added 2026-10-28.

	bench --site manav.local execute manav.manav.import_legacy.import_item_groups
	"""
	root = get_root_of("Item Group")
	if not root:
		frappe.throw("No root Item Group found. Complete the ERPNext setup wizard first.")
	if not frappe.db.exists("Item Group", MAGIC_ITEM_GROUPS):
		frappe.get_doc(
			{"doctype": "Item Group", "item_group_name": MAGIC_ITEM_GROUPS, "parent_item_group": root, "is_group": 1}
		).insert(ignore_permissions=True)

	added = renamed = 0
	for row in load("item_group"):
		old_name = f"{row['code']} {row['group_name']}"
		name = item_group_name(row)
		# 2026-11-06: groups made before this date carry the tariff code; rename them in place
		# (rename_doc also updates every Item that links to the old name).
		if old_name != name and frappe.db.exists("Item Group", old_name) and not frappe.db.exists("Item Group", name):
			frappe.rename_doc("Item Group", old_name, name, force=True)
			renamed += 1
		if frappe.db.exists("Item Group", name):
			continue
		frappe.get_doc(
			{"doctype": "Item Group", "item_group_name": name, "parent_item_group": MAGIC_ITEM_GROUPS, "is_group": 0}
		).insert(ignore_permissions=True)
		added += 1
	frappe.db.commit()
	print(f"  {added} item groups added, {renamed} renamed, under {MAGIC_ITEM_GROUPS}")


def import_all():
	"""Run every import in the order the tables depend on each other. Safe to run again.

	bench --site manav.local execute manav.manav.import_legacy.import_all
	"""
	import_region_zones()
	import_customers()
	import_territories()
	import_sales_persons()
	# The CRM app is not on every site; the other imports do not depend on the Organizations.
	if frappe.db.exists("DocType", "CRM Organization"):
		import_organizations()
	import_quotation_types()
	import_employees()
	import_customer_contact_persons()
	import_contacts()
	import_quotation_items()
	import_quotation_sub_items()
	import_item_groups()
	import_items()
	import_item_prices()
	import_quotation_setup()
	import_quotations()
