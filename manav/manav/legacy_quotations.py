# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Make ERPNext Quotations of the old quotations, with their lines.

Working: the old quotations are already in Quotation Head (import_legacy.import_quotations), with
customer, dates, references, signatories and terms, but without lines; the lines come from the
old report "35-Quotation-Item" (legacy_data/quotation_line.json.gz, made by
legacy_data/convert_quotation_lines.py). For each old quotation that has lines, run() makes an
ERPNext Quotation:
- named by the old number (11QO000001 ...), given to insert() so no naming rule (nor Manav's
  autoname) renumbers it;
- customer, contact and address: the Customer of the old customer code, the Contact of the old
  contact person (Customer Code-Sr No), the customer's primary address;
- principal (custom_quotation_type), letter head and price list of the Quotation Type; currency
  from the old quotation (RS -> INR, US$ -> USD), else the type's; the exchange rate of a foreign
  currency is ERPNext's (get_exchange_rate) for the first day of the quotation's month;
- Your Reference and its date, Signed By and Sales Engineer (the two old signatories as Sales
  Persons), Haas Cust ID, machine number, and the old quotation's own terms as the terms text;
- the lines in the old Sr order. A line keeps its old price: the old rate is the list rate, an old
  discount the discount amount, and the net rate what the customer was quoted
  (ignore_pricing_rule, so today's price lists and pricing rules do not change it). A line without
  description takes the Item's. A line without qty gets 1.
- valid till 30 days after the quotation date (the old system kept no validity).
- submitted (docstatus 1) unless submit=0: they are records of quotations already sent.

Item codes of the old lines that are not Items yet (102 codes; most were typed on the quotation
only) are made as Items (not stock items, Item Group of the quotation's principal). Lines the old
system kept without an item code use the Item "OLD-NO-CODE".

Not carried over: the old sales tax (8736 quotations had one). A tax line in ERPNext needs a tax
account and rate set up per company; the old totals with tax stay readable in Quotation Head.
The total of an ERPNext Quotation is the sum of its lines; for about half of the old quotations
that differs from the total kept in the old header (often 0 there), which the summary counts.

An old quotation already in Quotation is skipped, so run() can be run again and in parts.

Run on the server, a few first (nothing is kept in a dry run: each quotation is made and then
rolled back, so every ERPNext check runs):
    bench --site manav.local execute manav.manav.legacy_quotations.run --kwargs "{'limit': 20}"
    bench --site manav.local execute manav.manav.legacy_quotations.run --kwargs "{'quotation': '12QX000007'}"
Then for real (all; takes hours, can be stopped and started again):
    bench --site manav.local execute manav.manav.legacy_quotations.run --kwargs "{'dry_run': 0}"

Created: 2026-10-15.
"""

import html
from collections import Counter, defaultdict

import frappe
from erpnext import get_default_company
from erpnext.setup.utils import get_exchange_rate
from frappe.utils import add_days, flt, get_first_day, getdate

from manav.manav.import_legacy import ITEM_GROUPS, load, terms_as_html

NO_CODE_ITEM = "OLD-NO-CODE"
VALID_DAYS = 30
COMMIT_EVERY = 100


def run(dry_run=1, limit=None, quotation=None, submit=1):
	"""Make Quotations of the old quotations; see the module text. Prints a summary."""
	dry_run, submit = int(dry_run), int(submit)
	limit = int(limit) if limit else None
	company = get_default_company()
	if not company:
		frappe.throw("No default Company. Set one in Global Defaults first.")
	frappe.flags.mute_emails = True

	heads = {row["quotation_no"]: row for row in load("quotation_head")}
	lines = defaultdict(list)
	for line in load("quotation_line"):
		lines[line["quotation_no"]].append(line)

	wanted = [quotation] if quotation else sorted(heads, key=lambda no: (date_of(heads[no]) or "", no))
	existing = set(frappe.get_all("Quotation", pluck="name"))
	setup = Setup(company)

	report = Counter()
	failed, unknown_customers = [], Counter()

	# The old quotations to make now, in date order.
	todo = []
	for number in wanted:
		if limit and len(todo) >= limit:
			break
		head = heads.get(number)
		if not head:
			report["not an old quotation"] += 1
		elif number in existing:
			report["already a Quotation"] += 1
		elif not lines.get(number):
			report["no lines in the report (skipped)"] += 1
		elif not setup.customers.get(head.get("customer_code")):
			unknown_customers[head.get("customer_code")] += 1
			report["customer not found (skipped)"] += 1
		else:
			todo.append(number)

	# Items for codes that are not Items yet are made first and kept, so a quotation that fails
	# later cannot take back an Item another quotation uses. (In a dry run they are made with each
	# quotation and rolled back with it.)
	if not dry_run:
		for number in todo:
			for line in lines[number]:
				try:
					frappe.db.savepoint("old_item")
					setup.item(line.get("item_code"), line, heads[number].get("quotation_type"), dry_run)
				except Exception as e:
					# The quotation using it fails later and is reported there.
					frappe.db.rollback(save_point="old_item")
					failed.append((f"Item {line.get('item_code')}", str(e)[:300]))
		frappe.db.commit()

	done = 0
	for number in todo:
		head = heads[number]
		customer = setup.customers[head.get("customer_code")]
		done += 1
		try:
			frappe.db.savepoint("old_quotation")
			doc = make_quotation(head, sorted(lines[number], key=lambda l: l["sr_no"]), customer, setup, dry_run)
			doc.docstatus = 1 if submit else 0
			# One write: insert with docstatus 1 runs the submit checks and hooks as well.
			doc.insert(set_name=number, ignore_permissions=True)
			if abs(flt(doc.total) - flt(head.get("item_total"))) >= 1:
				report["total differs from the old header"] += 1
			if dry_run:
				frappe.db.rollback(save_point="old_quotation")
				report["checked (dry run)"] += 1
				if quotation or done <= 3:
					print_quotation(doc)
			else:
				report["created"] += 1
		except Exception as e:
			frappe.db.rollback(save_point="old_quotation")
			failed.append((number, str(e)[:300]))
		if not dry_run and done % COMMIT_EVERY == 0:
			frappe.db.commit()
			print(f"  {done} done ({report['created']} created, {len(failed)} failed)")

	if dry_run:
		frappe.db.rollback()
	else:
		frappe.db.commit()

	print("--- Old quotations to ERPNext Quotation" + (" (DRY RUN, nothing kept)" if dry_run else ""))
	for key, count in report.items():
		print(f"{key}: {count}")
	if setup.items_made:
		print(f"Items {'that would be' if dry_run else ''} made for codes not in Item: {len(setup.items_made)}")
		print("  " + ", ".join(setup.items_made[:40]) + (" ..." if len(setup.items_made) > 40 else ""))
	if unknown_customers:
		print(f"Old customer codes without Customer: {', '.join(map(str, list(unknown_customers)[:30]))}")
	print(f"failed: {len(failed)}")
	for number, error in failed[:50]:
		print(f"  FAILED {number}: {error}")
	return {**report, "failed": len(failed)}


class Setup:
	"""The records the old quotations are matched to, read once."""

	def __init__(self, company):
		self.company = company
		self.company_currency = frappe.get_cached_value("Company", company, "default_currency")
		self.customers = {
			row.custom_customer_code: row
			for row in frappe.get_all(
				"Customer",
				fields=["name", "custom_customer_code", "customer_primary_address", "custom_haas_customer_id"],
			)
			if row.custom_customer_code
		}
		self.contacts = dict(
			frappe.get_all("Contact", fields=["custom_legacy_contact_key", "name"], as_list=True)
		)
		self.sales_persons = dict(
			frappe.get_all("Sales Person", fields=["custom_employee_code", "name"], as_list=True)
		)
		self.types = {
			row.name: row
			for row in frappe.get_all(
				"Quotation Type", fields=["name", "currency", "price_list", "letter_head", "item_group"]
			)
		}
		# Item codes are matched without case, as the database does.
		self.items = {
			row.name.lower(): row
			for row in frappe.get_all("Item", fields=["name", "item_name", "stock_uom", "description"])
		}
		self.price_list_currency = dict(frappe.get_all("Price List", fields=["name", "currency"], as_list=True))
		self.rates = {}
		self.items_made = []

	def item(self, code, line, quotation_type, dry_run):
		"""The Item of an old line's code; made (not a stock item) when there is none."""
		code = (code or "").strip() or NO_CODE_ITEM
		found = self.items.get(code.lower())
		if found:
			return found
		description = line.get("description") or code
		uom = "NOS" if frappe.db.exists("UOM", "NOS") else "Nos"
		item = frappe.get_doc(
			{
				"doctype": "Item",
				"item_code": code,
				"item_name": "Item without code (old quotations)" if code == NO_CODE_ITEM else description[:140],
				"description": html.escape(description, quote=False),
				"item_group": ITEM_GROUPS.get(quotation_type) or "Spares",
				"stock_uom": uom,
				"is_stock_item": 0,
				"is_sales_item": 1,
				"custom_quotation_type": quotation_type if quotation_type in self.types else None,
			}
		)
		item.insert(ignore_permissions=True)
		row = frappe._dict(name=item.name, item_name=item.item_name, stock_uom=uom, description=item.description)
		# In a dry run the Item is rolled back with the quotation; it is remembered only to report it.
		if not dry_run:
			self.items[code.lower()] = row
		if code not in self.items_made:
			self.items_made.append(code)
		return row

	def exchange_rate(self, currency, date):
		"""ERPNext's rate of `currency` for the first day of the month of `date`, read once a month."""
		if currency == self.company_currency:
			return 1
		key = (currency, str(get_first_day(date)))
		if key not in self.rates:
			self.rates[key] = flt(get_exchange_rate(currency, self.company_currency, key[1]))
		if not self.rates[key]:
			frappe.throw(
				f"No exchange rate {currency} to {self.company_currency} for {key[1]}. Add Currency"
				" Exchange records or allow ERPNext to fetch rates (Currency Exchange Settings)."
			)
		return self.rates[key]


def date_of(head):
	"""Date of an old quotation. Three old quotations have none; their creation date is used."""
	return head.get("quotation_date") or (head.get("legacy_created_on") or "")[:10] or None


def currency_of(head, quotation_type):
	"""ERPNext currency of an old quotation: its own currency text, else its principal's."""
	text = (head.get("currency") or "").upper().replace(".", "").replace(" ", "")
	if text in ("RS",):
		return "INR"
	if text in ("US$", "USD"):
		return "USD"
	return quotation_type.currency if quotation_type else None


def make_quotation(head, lines, customer, setup, dry_run):
	"""The Quotation document (not saved) of one old quotation and its lines."""
	quotation_type = setup.types.get(head.get("quotation_type"))
	date = getdate(date_of(head))
	currency = currency_of(head, quotation_type) or setup.company_currency
	price_list = quotation_type.price_list if quotation_type else None
	if price_list and setup.price_list_currency.get(price_list) != currency:
		price_list = None  # let ERPNext choose; a list in another currency would convert the rates

	doc = frappe.get_doc(
		{
			"doctype": "Quotation",
			"company": setup.company,
			"quotation_to": "Customer",
			"party_name": customer.name,
			"transaction_date": date,
			"valid_till": add_days(date, VALID_DAYS),
			"currency": currency,
			"conversion_rate": setup.exchange_rate(currency, date),
			"selling_price_list": price_list,
			"ignore_pricing_rule": 1,
			"customer_address": customer.customer_primary_address,
			"contact_person": setup.contacts.get(f"{head.get('customer_code')}-{head.get('contact_person_sr')}"),
			"letter_head": quotation_type.letter_head if quotation_type else None,
			"custom_quotation_type": quotation_type.name if quotation_type else None,
			"custom_your_reference": head.get("your_reference"),
			"custom_your_reference_date": head.get("your_reference_date"),
			"custom_signed_by": setup.sales_persons.get(head.get("signature_one_code")),
			"custom_sales_engineer": setup.sales_persons.get(head.get("signature_two_code")),
			"custom_haas_customer_id": customer.custom_haas_customer_id,
			"custom_machine_number": head.get("machine_number"),
			"terms": terms_as_html(head["terms"]) if head.get("terms") else None,
			"items": [],
		}
	)
	for line in lines:
		item = setup.item(line.get("item_code"), line, head.get("quotation_type"), dry_run)
		doc.append("items", item_row(line, item))
	return doc


def item_row(line, item):
	"""A Quotation Item of one old line, at the old price."""
	qty = flt(line.get("qty")) or 1
	list_rate = flt(line.get("rate"))
	net = line.get("net_amount")
	net = flt(line.get("amount")) if net is None else flt(net)
	rate = flt(net / qty, 4) if net else list_rate
	# A discount larger than the price (the old data has a few) would make a negative rate: the
	# line keeps its list rate then.
	if rate < 0:
		rate = list_rate
	description = line.get("description")
	return {
		"item_code": item.name,
		"item_name": item.item_name,
		"description": html.escape(description, quote=False) if description else item.description or item.item_name,
		"qty": qty,
		"uom": item.stock_uom,
		"stock_uom": item.stock_uom,
		"conversion_factor": 1,
		"price_list_rate": list_rate,
		"discount_amount": flt(list_rate - rate, 4) if list_rate and rate < list_rate else 0,
		"rate": rate,
	}


def print_quotation(doc):
	"""Print a made quotation, for the dry run."""
	print(
		f"\n=== {doc.name}  {doc.transaction_date}  {doc.party_name}  {doc.currency} @ {doc.conversion_rate}"
		f"  type {doc.custom_quotation_type}  contact {doc.contact_person}"
	)
	for row in doc.items:
		print(f"  {row.idx:>2} {row.item_code:<16} {row.qty:>5} x {row.rate:>12,.2f} = {row.amount:>12,.2f}  {(row.description or '')[:60]}")
	print(f"  total {doc.total:,.2f}  grand total {doc.grand_total:,.2f}")
