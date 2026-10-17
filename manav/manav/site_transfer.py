# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Copy the item, price, quotation-print and customer records of one site to another site.

Working, in three steps:
1. export() runs on the site that has the data (manav.local) and writes one file,
   <site>/private/transfer/manav_transfer.json.gz: the records of the doctypes in DOCTYPES, in the
   order they depend on each other, and the content of the files they show (item photos, letter
   head pictures).
2. tools/push_to_site.py (run on any computer) reads that file and sends it in parts to the other
   site's receive_files() and receive(), signed with an API key of a System Manager there.
3. receive() on the other site inserts each record under its own name (insert(set_name=...)), so
   the links between records stay right; a record whose name is already there is skipped, so the
   push can be run again. relink() then sets the primary address and contact of the customers,
   which can only be set once those exist.

What is left out of the records: values the other site makes itself (creation, modified, owner,
tree positions, child names) and the company-bound tables (item defaults, customer accounts and
credit limits), because the other site's company and accounts are its own. A customer's
mobile/e-mail summary fields are left out too: ERPNext would make a second contact from them;
the real contacts come as Contact records.

Both sites need the Manav app (its custom fields and doctypes) at the same version.

On the site with the data:
    bench --site manav.local execute manav.manav.site_transfer.export

Created: 2026-10-15.
"""

import base64
import gzip
import json
import os
import re

import frappe

# In the order they are inserted: a record's links must already be there.
DOCTYPES = [
	"UOM",
	"Brand",
	"Item Group",
	"Price List",
	"Region Zone",
	"Territory",
	"Customer Group",
	"Sales Person",
	"Employee Master",
	"Letter Head",
	"Terms and Conditions",
	"Quotation Type",
	"Item",
	"Item Price",
	"Quotation Item Master",
	"Quotation Sub Item Master",
	"Customer",
	"Address",
	"Contact",
	"Customer Contact Person",
	"CRM Organization",
]
TREES = {"Item Group", "Territory", "Customer Group", "Sales Person"}

# Values the receiving site sets itself.
SYSTEM_FIELDS = {
	"creation",
	"modified",
	"modified_by",
	"owner",
	"docstatus",
	"idx",
	"_user_tags",
	"_comments",
	"_assign",
	"_liked_by",
	"_seen",
	"lft",
	"rgt",
	"old_parent",
}
CHILD_SYSTEM_FIELDS = SYSTEM_FIELDS - {"idx"} | {"name", "parent", "parenttype"}

# Fields left out per doctype (see the module text).
LEFT_OUT = {
	"Item": {"item_defaults", "taxes", "reorder_levels", "supplier_items"},
	"Customer": {
		"accounts",
		"credit_limits",
		"mobile_no",
		"email_id",
		"customer_primary_contact",
		"customer_primary_address",
		"primary_address",
	},
}
# Set after the addresses and contacts are in (relink).
CUSTOMER_LINKS = ("customer_primary_address", "customer_primary_contact")


def export():
	"""Write the transfer file of this site. Prints where it is and what it holds."""
	bundle = {"site": frappe.local.site, "doctypes": [], "files": {}, "customer_links": []}
	for doctype in DOCTYPES:
		if not frappe.db.exists("DocType", doctype):
			print(f"{doctype}: not on this site, left out")
			continue
		names = export_names(doctype)
		docs = [clean(frappe.get_doc(doctype, name).as_dict(), doctype) for name in names]
		bundle["doctypes"].append({"doctype": doctype, "docs": docs})
		print(f"{doctype}: {len(docs)}")
		for doc in docs:
			for url in file_urls(doctype, doc):
				bundle["files"].setdefault(url, None)

	bundle["customer_links"] = [
		row
		for row in frappe.get_all("Customer", fields=["name", *CUSTOMER_LINKS])
		if any(row.get(field) for field in CUSTOMER_LINKS)
	]

	for url in list(bundle["files"]):
		bundle["files"][url] = file_content(url)
	missing = [url for url, content in bundle["files"].items() if content is None]
	print(f"Files: {len(bundle['files']) - len(missing)} read, {len(missing)} not found")

	folder = frappe.get_site_path("private", "transfer")
	os.makedirs(folder, exist_ok=True)
	path = os.path.join(folder, "manav_transfer.json.gz")
	with gzip.open(path, "wt", encoding="utf-8") as f:
		json.dump(bundle, f, default=str)
	print(f"Written: {os.path.abspath(path)}")
	print("It holds customer and contact details: delete it when the transfer is done.")


def export_names(doctype):
	"""Names of the records of `doctype` to copy, in the order to insert them."""
	if doctype in TREES:
		# Parents before children; the root is on every site already.
		return [
			row.name
			for row in frappe.get_all(doctype, fields=["name", "lft"], order_by="lft")
			if row.name not in root_names(doctype)
		]
	if doctype == "Price List":
		return frappe.get_all(doctype, filters={"selling": 1}, pluck="name")
	if doctype in ("Address", "Contact"):
		# Only those of customers; a company's own address belongs to that site.
		return frappe.get_all(
			"Dynamic Link",
			filters={"parenttype": doctype, "link_doctype": "Customer"},
			pluck="parent",
			distinct=True,
		)
	if doctype == "Employee Master":
		return bosses_first()
	return frappe.get_all(doctype, pluck="name", order_by="creation")


def bosses_first():
	"""Employee Master names with each boss before the employees under them (Boss links to
	Employee Master; the first transfer on 2026-10-15 failed 3 employees whose boss came later)."""
	boss_of = dict(frappe.get_all("Employee Master", fields=["name", "boss"], as_list=True))
	ordered, placed = [], set()

	def place(name, seen=()):
		if name in placed or name not in boss_of or name in seen:
			return
		boss = boss_of[name]
		if boss and boss != name:
			place(boss, (*seen, name))
		placed.add(name)
		ordered.append(name)

	for name in sorted(boss_of):
		place(name)
	return ordered


def root_names(doctype):
	"""The top record(s) of a tree (All Item Groups ...), which every site has."""
	return set(frappe.get_all(doctype, filters={"parent_" + frappe.scrub(doctype): ["is", "not set"]}, pluck="name"))


def clean(doc, doctype):
	"""A record as a dict without the values the receiving site sets itself."""
	left_out = SYSTEM_FIELDS | LEFT_OUT.get(doctype, set())
	out = {}
	for field, value in doc.items():
		if field in left_out or value is None:
			continue
		if isinstance(value, list):
			out[field] = [{k: v for k, v in row.items() if k not in CHILD_SYSTEM_FIELDS and v is not None} for row in value]
		else:
			out[field] = value
	return out


def file_urls(doctype, doc):
	"""The site files a record shows: an item's photo, a letter head's pictures."""
	urls = []
	for field in ("image", "footer_image"):
		value = doc.get(field)
		if isinstance(value, str) and value.startswith(("/files/", "/private/files/")):
			urls.append(value)
	if doctype == "Letter Head":
		for field in ("content", "footer"):
			urls += re.findall(r"""(?:src|href)=["'](/files/[^"']+)""", doc.get(field) or "")
	return urls


def file_content(url):
	"""{file_name, is_private, content (base64)} of a site file, or None when it is not there."""
	name = frappe.db.get_value("File", {"file_url": url}, "name")
	if not name:
		return None
	file = frappe.get_doc("File", name)
	try:
		content = file.get_content()
	except Exception:
		return None
	if isinstance(content, str):
		content = content.encode()
	return {"file_name": file.file_name, "is_private": file.is_private, "content": base64.b64encode(content).decode()}


@frappe.whitelist(methods=["POST"])
def receive_files(files):
	"""Store the sent files; return {old url: url on this site}. A url already here is kept."""
	frappe.only_for("System Manager")
	files = json.loads(files) if isinstance(files, str) else files
	urls = {}
	for url, data in files.items():
		existing = frappe.db.get_value("File", {"file_url": url}, "file_url")
		if existing:
			urls[url] = existing
			continue
		file = frappe.get_doc(
			{
				"doctype": "File",
				"file_name": data["file_name"],
				"is_private": data.get("is_private") or 0,
				"content": base64.b64decode(data["content"]),
			}
		).insert(ignore_permissions=True)
		urls[url] = file.file_url
	frappe.db.commit()
	return urls


@frappe.whitelist(methods=["POST"])
def receive(doctype, docs):
	"""Insert the sent records of `doctype` under their own names; skip names already here.

	Returns {created, skipped, failed: [[name, error]]}. Each record is its own savepoint, so one
	that fails does not stop the others."""
	frappe.only_for("System Manager")
	if not frappe.db.exists("DocType", doctype):
		return {"created": 0, "skipped": 0, "failed": [["*", f"DocType {doctype} is not on this site"]]}
	docs = json.loads(docs) if isinstance(docs, str) else docs
	frappe.flags.mute_emails = True
	result = {"created": 0, "skipped": 0, "failed": []}
	for data in docs:
		name = data.get("name")
		if name and frappe.db.exists(doctype, name):
			result["skipped"] += 1
			continue
		try:
			frappe.db.savepoint("transfer")
			doc = frappe.get_doc({**data, "doctype": doctype})
			doc.insert(set_name=name, ignore_permissions=True)
			result["created"] += 1
		except Exception as e:
			frappe.db.rollback(save_point="transfer")
			frappe.clear_messages()
			result["failed"].append([name, str(e)[:300]])
	frappe.db.commit()
	return result


@frappe.whitelist(methods=["POST"])
def relink(customer_links):
	"""Set the primary address and contact of the customers where they exist on this site."""
	frappe.only_for("System Manager")
	rows = json.loads(customer_links) if isinstance(customer_links, str) else customer_links
	updated = 0
	for row in rows:
		if not frappe.db.exists("Customer", row["name"]):
			continue
		values = {
			field: row[field]
			for field, doctype in zip(CUSTOMER_LINKS, ("Address", "Contact"))
			if row.get(field) and frappe.db.exists(doctype, row[field])
		}
		if values:
			# Only these links change; saving the whole Customer would run all its checks again.
			frappe.db.set_value("Customer", row["name"], values, update_modified=False)
			updated += 1
	frappe.db.commit()
	return {"updated": updated}
