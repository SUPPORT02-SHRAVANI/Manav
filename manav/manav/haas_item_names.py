# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Give Haas machine Items a short Item Name in place of the catalogue text.

Working: the old system's item master held the whole catalogue line of many Haas machines as the
item's name ("Super-Speed Vertical Machining Center; 50" x 20" x 25" (1270 x 508 x 635 mm), 40
taper, ..."), and the import cut it at ERPNext's 140 characters. The full text is in the Item's
Description; only the name is changed here.

The new name is written as the other Haas machines were already named in the old system:
    Haas USA Make <kind of machine> Model <item code>
where the kind is the catalogue line up to its first ";" (or up to the first ", " followed by a
figure, for lines written "CNC Lathe, 10" x 21" ..."). Only Items of the item group Machines
whose kind names a machine (machining center, lathe, mill, router, drill/tap center, mold making
machine) are changed, so bar feeders, rotary tables and other accessories keep their names. An Item whose name holds no
catalogue text is left alone. A Description left empty gets the old name, so no text is lost.

Run on the server (dry run first; nothing is written):
    bench --site manav.local execute manav.manav.haas_item_names.run
Then write:
    bench --site manav.local execute manav.manav.haas_item_names.run --kwargs "{'dry_run': 0}"

Created: 2026-10-15.
"""

import re

import frappe

# Where the catalogue text starts after the kind of machine: "; ..." or ", 10" x ...".
DETAILS_START = re.compile(r";|,\s*\d")
# A kind of machine, as against an accessory ("Haas Bar Feeder for ST-10", "Rotary Table").
MACHINE_KIND = re.compile(
	r"machining center|lathe|\bmill\b|router|drill/tap center|mold making machine", re.I
)


def short_name(item_code, item_name):
	"""The new Item Name, or None when the name has no catalogue text or is not a machine's."""
	found = DETAILS_START.search(item_name or "")
	if not found:
		return None
	kind = item_name[: found.start()].strip(" ,.")
	if not MACHINE_KIND.search(kind):
		return None
	model = re.sub(r"\.+$", "", item_code.strip())  # the old system's second item "VF-2." is VF-2
	return f"Haas USA Make {kind} Model {model}"


def run(dry_run=1):
	"""Shorten the names; prints the old and new name of each Item."""
	dry_run = int(dry_run)
	# Only the item group Machines: spares and options such as a probe "for Lathes" or a simulator
	# "(Mill & Lathe)" also name a machine kind in their text.
	items = frappe.get_all(
		"Item",
		filters={"disabled": 0, "item_group": "Machines"},
		fields=["name", "item_name", "description"],
		order_by="name",
	)

	changed = []
	for row in items:
		new_name = short_name(row.name, row.item_name)
		if not new_name or new_name == row.item_name:
			continue
		changed.append(row.name)
		print(f"{row.name}\n  old: {row.item_name}\n  new: {new_name}")
		if dry_run:
			continue
		values = {"item_name": new_name}
		if not (row.description or "").strip():
			values["description"] = row.item_name  # keep the catalogue text
		# set_value changes only these fields, without the Item's other validations, which the
		# items brought over from the old system may not all pass.
		frappe.db.set_value("Item", row.name, values)
	if not dry_run:
		frappe.db.commit()

	print(f"\n{len(changed)} Item names " + ("would be shortened (DRY RUN, nothing written)" if dry_run else "shortened"))
	return len(changed)
