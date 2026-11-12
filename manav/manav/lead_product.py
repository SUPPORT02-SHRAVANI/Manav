# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: lead_product.py
# Purpose: The lead's product chosen like on a quotation: first the Principal (Quotation Type), then an
#          Item of that principal (Item.custom_quotation_type = principal, or the principal's Item Group),
#          whose description fills the lead's Product Description. The Item dropdown (an Autocomplete,
#          manav_lead.js) ends with a "Free Hand" choice for a product not in the list; the description
#          is then typed by hand.
# Created: 2026-11-12
# Reason: The user asked for Principal -> Items -> automatic description on the lead, as on the
#         quotation, with a free-hand option when the product is not in the dropdown.

import html
import re

# Frappe framework.
import frappe
from frappe import _
from frappe.utils import cint, strip_html_tags

# The Item value meaning "not in the list, typed by hand" (also used in manav_lead.js).
FREE_HAND = "Free Hand"
# How many items the dropdown shows per search (the user types to narrow it down).
MAX_ITEMS = 50


@frappe.whitelist()
def item_query(txt=None, principal=None, **kwargs):
	"""Items of the principal matching `txt` (code or name), for the lead's Item dropdown, followed by
	the Free Hand choice. No principal: only Free Hand (the form asks for the principal first)."""
	rows = []
	if principal:
		item_group = frappe.db.get_value("Quotation Type", principal, "item_group")
		conditions = []
		values = {"principal": principal, "group": item_group or "", "txt": f"%{(txt or '').strip()}%"}
		# The principal's items: tagged with it, or in its Item Group.
		if frappe.db.has_column("Item", "custom_quotation_type"):
			conditions.append("custom_quotation_type = %(principal)s")
		if item_group:
			conditions.append("item_group = %(group)s")
		if conditions:
			of_principal = " or ".join(conditions)
			rows = frappe.db.sql(
				f"""select name, item_name, description from `tabItem`
				where disabled = 0 and is_sales_item = 1 and has_variants = 0
					and ({of_principal})
					and (name like %(txt)s or item_name like %(txt)s)
				order by item_name asc
				limit {cint(MAX_ITEMS)}""",
				values,
				as_dict=True,
			)

	# 2026-11-12: bold product name, and under it the start of its description (was: the item code),
	# as the user asked.
	out = [
		{
			"value": r.name,
			"label": r.item_name or r.name,
			"description": short_description(r),
		}
		for r in rows
	]
	out.append(
		{
			"value": FREE_HAND,
			"label": _("✎ Free Hand - type your own product"),
			"description": _("The product is not in this list"),
		}
	)
	return out


@frappe.whitelist()
def get_item_description(item_code):
	"""The item's description as plain text (the Item's description is HTML), for the lead's Product
	Description. Falls back to the item name."""
	if not item_code or item_code == FREE_HAND or not frappe.db.exists("Item", item_code):
		return ""
	item = frappe.db.get_value("Item", item_code, ["item_name", "description"], as_dict=True)
	return html_to_text(item.description) or item.item_name or item_code


# Longest description shown under a product in the dropdown.
DROPDOWN_DESCRIPTION_CHARS = 120


def short_description(item):
	"""The item's description on one line, cut to DROPDOWN_DESCRIPTION_CHARS, for the dropdown. Empty
	when it only repeats the name; the code then, so items of the same name can be told apart."""
	text = " ".join(html_to_text(item.description).split())
	name = (item.item_name or item.name or "").strip()
	if not text or text.lower() == name.lower():
		return item.name if item.name != name else ""
	if len(text) > DROPDOWN_DESCRIPTION_CHARS:
		text = text[:DROPDOWN_DESCRIPTION_CHARS].rsplit(" ", 1)[0] + "…"
	# the dropdown shows it as HTML
	return frappe.utils.escape_html(text)


def html_to_text(value):
	"""HTML (Text Editor) -> plain text keeping the lines and bullet points."""
	if not value:
		return ""
	text = re.sub(r"(?i)<br\s*/?>", "\n", value)
	text = re.sub(r"(?i)<li[^>]*>", "\n• ", text)
	text = re.sub(r"(?i)</(p|div|li|h[1-6]|tr)>", "\n", text)
	text = re.sub(r"(?i)</t[dh]>", "  ", text)
	text = html.unescape(strip_html_tags(text))
	lines = [line.strip() for line in text.replace("\xa0", " ").splitlines()]
	# no runs of empty lines
	text = re.sub(r"\n{3,}", "\n\n", "\n".join(lines))
	return text.strip()
