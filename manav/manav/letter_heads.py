# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Letter heads of the principals, and which Quotation Type prints with which.

Working: a quotation is printed with the Letter Head named in its `letter_head` field. That field
is filled from the Quotation Type (the principal) when the principal is chosen on the quotation
(get_type_defaults in quotation.py and quotation_head.py). So a principal's header needs two things,
which setup_letter_heads() below makes on every `bench migrate` (hooked to `after_migrate`):
1. a Letter Head record that shows the header picture;
2. that Letter Head set on the Quotation Type.

The pictures are files of this app (manav/public/images/), served under /assets/manav/images/, so
they come with the code and need no upload.

Both steps only fill what is missing: a Letter Head that exists is not changed, and a Quotation
Type that already has a Letter Head keeps it. A header chosen or edited by hand on the site is
therefore never overwritten.

Created: 2026-10-13, for the Haas Factory Outlet header of the machine quotations.

CHANGE NOTE
Date: 2026-10-13
Change: A header can have a footer picture and can be offered without belonging to a Quotation
Type; added "Manav Letter Head 2025".
Reason: The user asked for the company's full-page letter head of 2025 as a further choice.
"""

import frappe

# One entry per header: the Letter Head to make, its picture, the picture of its footer if it has
# one, and the Quotation Types (by their Description) that print with it. A header with no
# Quotation Types is only offered: it can be chosen on a Quotation Type, on a quotation or in the
# print window.
LETTER_HEADS = [
	{
		"name": "Haas Factory Outlet",
		"image": "/assets/manav/images/haas_factory_outlet_letter_head.jpg",
		# Type 1, the Haas machines. CHMER and JAGDEEP are machines of other makers and do not
		# get the Haas header.
		"quotation_types": ["MACHINES"],
	},
	{
		# The company's page of 2025 (Chennai office): logos and address at the top, the FTWZ
		# warehouse and head office lines at the bottom. The two pictures are the top and the
		# bottom strip cut from the user's full-page file "Manav Letter head 2025 final (1).jpg".
		"name": "Manav Letter Head 2025",
		"image": "/assets/manav/images/manav_letter_head_2025_header.jpg",
		"footer_image": "/assets/manav/images/manav_letter_head_2025_footer.jpg",
		"quotation_types": [],
	},
]


def setup_letter_heads():
	"""Create the missing Letter Heads and set them on Quotation Types that have none.

	To run it by hand:
	bench --site manav.local execute manav.manav.letter_heads.setup_letter_heads
	"""
	for header in LETTER_HEADS:
		make_letter_head(header["name"], header["image"], header.get("footer_image"))
		if not frappe.db.exists("DocType", "Quotation Type"):
			continue
		for description in header["quotation_types"]:
			for quotation_type in frappe.get_all(
				"Quotation Type", filters={"description": description}, fields=["name", "letter_head"]
			):
				if not quotation_type.letter_head:
					frappe.db.set_value("Quotation Type", quotation_type.name, "letter_head", header["name"])


def picture_html(image, name):
	"""The HTML of a header or footer: the picture across the full width of the page."""
	return f'<div style="text-align: center;"><img src="{image}" alt="{name}" style="width: 100%; height: auto;"></div>'


def make_letter_head(name, image, footer_image=None):
	"""Create the Letter Head `name` if it is missing: the picture `image` across the top of the
	page and, when given, `footer_image` across the bottom."""
	if frappe.db.exists("Letter Head", name):
		return

	# The first Letter Head made on a site makes itself the default of every document. This one
	# belongs to one principal, so it must not become the default by that rule.
	had_default = frappe.db.exists("Letter Head", {"is_default": 1})

	doc = frappe.new_doc("Letter Head")
	doc.letter_head_name = name
	# The header is written as HTML and not as an attached image: an attached image is given a
	# fixed width in pixels, while this banner has to fill the width of the page.
	doc.source = "HTML"
	doc.content = picture_html(image, name)
	# The footer is set to HTML also when there is none, so that Frappe does not ask for a
	# footer image.
	doc.footer_source = "HTML"
	if footer_image:
		doc.footer = picture_html(footer_image, name)
	doc.insert(ignore_permissions=True)

	# Outside a migrate, Frappe switches a new Letter Head to "Image" (for its upload screen) and
	# may have made it the default; both are put right here.
	if doc.source != "HTML" or (doc.is_default and not had_default):
		doc.source = "HTML"
		if not had_default:
			doc.is_default = 0
		doc.save(ignore_permissions=True)
