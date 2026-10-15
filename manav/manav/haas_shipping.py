# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Fill the Specifications of Haas machine Items with their shipping size and weight.

Source: Haas Automation document ES0428 Rev DN (August 2020), "Shipping Dimensions, Weight, and
Crating Information", supplied by the user. The values below were typed from that document's
tables; the document says a machine's weight may differ by +/- 5% with its options.

Working: SHIPPING lists, per model, the domestic pallet, export pallet and export crate size
(L x W x H) and the weight, each in S.A.E. and Metric, as the document prints them. A size the
document gives as N/A is left out. Only the standard machine is taken: rows for an option
(50+1 SMTC, EC8, conveyor, pallet pool) are not used, except where the document has no row
without one (VF-6/40 to VF-11/40 come with a 30+1 tool changer; that row is used and named).
Rotary tables, bar feeders and other accessories in the document are not machines and are left
out, as the user asked.

An Item matches a model when its code is the model, also written with a trailing "." or "-I"
(the old system kept VF-2, VF-2. and VF-2-I as separate items for the same machine), or by the
document's other name for it (MM is the Mini Mill, GM-2-3AX the 3-axis GM-2). An Item that
already has Specifications is skipped, so nothing typed by hand is lost. The photo is not
touched: the document has no pictures.

The text is written as the Format buttons of the Item form write it (public/js/item.js):
    #Shipping Dimensions and Weight || S.A.E. || Metric
    Domestic Pallet (L x W x H) : 101 x 99 x 101 in || 257 x 251 x 257 cm
Note: "Format: key specifications" drops blocks whose title has "shipping" or "dimension", so
pressing that button on an Item later removes these lines; "Format: all rows" keeps them.

Run on the server (dry run first; nothing is written):
    bench --site manav.local execute manav.manav.haas_shipping.run
Then write:
    bench --site manav.local execute manav.manav.haas_shipping.run --kwargs "{'dry_run': 0}"

Created: 2026-10-15.
"""

import re

import frappe

SOURCE = "Haas ES0428 Rev DN (Aug 2020); weight may vary +/- 5% with options."
HEADING = "#Shipping Dimensions and Weight || S.A.E. || Metric"
UNIT_SEPARATOR = " || "  # same as MANAV_UNIT_SEPARATOR in public/js/item.js

# (models, domestic pallet, export pallet, export crate, weight, note)
# Each size and the weight is (S.A.E., Metric); None where the document has N/A.
# note: the configuration the row is for, when the document has no row for the bare machine.
SHIPPING = [
	# Vertical Machining Centers, pages 2 to 9
	(["CM-1"], ("78 x 62 x 90 in", "199 x 158 x 229 cm"), ("78 x 62 x 90 in", "199 x 158 x 229 cm"), None, ("2,020 lb", "950 kg"), None),
	(["DT-1", "DM-1"], ("80 x 100 x 98 in", "203 x 254 x 249 cm"), ("80 x 100 x 98 in", "203 x 254 x 249 cm"), None, ("5,150 lb", "2,336 kg"), None),
	(["DT-2", "DM-2"], ("91 x 100 x 98 in", "231 x 254 x 249 cm"), ("91 x 100 x 98 in", "231 x 254 x 249 cm"), None, ("5,350 lb", "2,427 kg"), None),
	(["MM", "SMM"], ("90 x 64 x 100 in", "229 x 163 x 254 cm"), ("90 x 64 x 100 in", "229 x 163 x 254 cm"), None, ("4,000 lb", "1,820 kg"), None),
	(["MM2", "SMM2"], ("91 x 88 x 100 in", "232 x 224 x 254 cm"), ("91 x 88 x 100 in", "232 x 224 x 254 cm"), None, ("5,100 lb", "2,315 kg"), None),
	(["TM-1", "TM-1P"], ("100 x 78 x 101 in", "254 x 199 x 257 cm"), ("100 x 78 x 101 in", "254 x 199 x 257 cm"), None, ("4,500 lb", "2,050 kg"), None),
	(["TM-2", "TM-2P"], ("130 x 78 x 98 in", "331 x 199 x 249 cm"), ("130 x 78 x 98 in", "331 x 199 x 249 cm"), None, ("5,200 lb", "2,360 kg"), None),
	(["TM-3", "TM-3P"], ("130 x 88 x 98 in", "331 x 224 x 249 cm"), ("130 x 88 x 98 in", "331 x 224 x 249 cm"), None, ("6,200 lb", "2,815 kg"), None),
	(["VF-1"], ("101 x 99 x 101 in", "257 x 251 x 257 cm"), ("91 1/2 x 98 x 101 in", "232 x 249 x 257 cm"), None, ("7,800 lb", "3,550 kg"), None),
	(["VF-1YT"], ("106 x 101 1/4 x 101 in", "269 x 257 x 257 cm"), ("91 1/2 x 100 x 101 in", "232 x 254 x 257 cm"), None, ("8,000 lb", "3,630 kg"), None),
	(["VF-2", "VF-2SS"], ("101 x 99 x 101 in", "257 x 251 x 257 cm"), ("91 1/2 x 98 x 101 in", "232 x 249 x 257 cm"), None, ("7,800 lb", "3,540 kg"), None),
	(["VF-2SSYT", "VF-2YT"], ("106 x 101 1/4 x 101 in", "269 x 257 x 257 cm"), ("91 1/2 x 100 x 101 in", "232 x 254 x 257 cm"), None, ("7,800 lb", "3,550 kg"), None),
	(["VF-2TR"], ("101 x 99 x 102 in", "257 x 251 x 259 cm"), ("91 1/2 x 98 x 102 in", "232 x 249 x 259 cm"), None, ("8,300 lb", "3,770 kg"), None),
	(["VF-3", "VF-4", "VF-3SS", "VF-4SS"], ("152 x 99 x 106 in", "386 x 252 x 269 cm"), ("131 x 91 1/2 x 101 in", "333 x 233 x 257 cm"), None, ("11,720 lb", "5,316 kg"), None),
	(["VF-3YT", "VF-3SSYT"], ("156 x 102 x 109 in", "397 x 259 x 277 cm"), ("164 x 91 1/2 x 101 in", "417 x 233 x 254 cm"), None, ("15,000 lb", "6,820 kg"), None),
	(["VF-3YT/50"], ("156 x 102 x 121 in", "397 x 259 x 308 cm"), None, ("156 x 102 x 130 in", "396 x 259 x 331 cm"), ("16,500 lb", "7,500 kg"), None),
	(["VF-5/40", "VF-5SS", "VF-5/40TR", "VF-5/40XT"], ("168 x 101 x 109 in", "427 x 257 x 277 cm"), ("164 x 91 1/2 x 101 in", "417 x 233 x 257 cm"), None, ("12,700 lb", "5,760 kg"), None),
	(["VF-5/50", "VF-5/50TR", "VF-5/50XT"], ("168 x 102 x 125 in", "427 x 259 x 318 cm"), None, ("168 x 102 x 130 in", "427 x 259 x 330 cm"), ("16,250 lb", "7,350 kg"), None),
	(["VF-6/40", "VF-6SS"], ("195 x 102 x 128 1/2 in", "496 x 259 x 327 cm"), None, ("195 x 105 x 130 1/2 in", "496 x 267 x 332 cm"), ("22,300 lb", "10,100 kg"), "30+1 SMTC"),
	(["VF-6/40TR"], ("195 x 102 x 135 in", "496 x 259 x 343 cm"), None, ("195 x 105 x 139 in", "496 x 267 x 354 cm"), ("26,100 lb", "11,850 kg"), None),
	(["VF-6/50"], ("195 x 102 x 132 in", "496 x 259 x 336 cm"), None, ("195 x 105 x 136 in", "496 x 267 x 346 cm"), ("25,500 lb", "11,570 kg"), None),
	(["VF-6/50TR"], ("195 x 102 x 136 in", "496 x 259 x 346 cm"), None, ("195 x 105 x 144 in", "496 x 267 x 366 cm"), ("26,460 lb", "12,020 kg"), None),
	(["VF-7/40"], ("214 x 102 x 130 in", "544 x 259 x 331 cm"), None, ("214 x 105 x 134 in", "544 x 267 x 341 cm"), ("25,600 lb", "11,600 kg"), "30+1 SMTC"),
	(["VF-7/50"], ("214 x 102 x 132 in", "544 x 259 x 336 cm"), None, ("214 x 106 x 136 in", "544 x 270 x 346 cm"), ("26,500 lb", "12,000 kg"), None),
	(["VF-8/40"], ("193 x 120 x 130 in", "491 x 305 x 331 cm"), None, ("193 x 123 x 134 in", "491 x 313 x 341 cm"), ("24,800 lb", "11,250 kg"), "30+1 SMTC"),
	(["VF-8/50"], ("193 x 120 x 132 in", "491 x 305 x 336 cm"), None, ("193 x 123 x 136 in", "491 x 313 x 346 cm"), ("29,000 lb", "13,160 kg"), None),
	(["VF-9/40"], ("214 x 120 x 130 in", "544 x 305 x 331 cm"), None, ("288 x 123 x 134 in", "732 x 313 x 341 cm"), ("28,300 lb", "12,840 kg"), "30+1 SMTC"),
	(["VF-9/50"], ("214 x 120 x 132 in", "544 x 305 x 336 cm"), None, ("288 x 123 x 136 in", "732 x 313 x 346 cm"), ("28,900 lb", "13,110 kg"), None),
	(["VF-10/40"], ("288 x 102 x 130 in", "732 x 260 x 331 cm"), None, ("288 x 105 x 134 in", "732 x 267 x 341 cm"), ("30,100 lb", "13,650 kg"), "30+1 SMTC"),
	(["VF-10/50"], ("288 x 102 x 132 in", "732 x 260 x 336 cm"), None, ("288 x 105 x 136 in", "732 x 267 x 346 cm"), ("31,600 lb", "14,330 kg"), None),
	(["VF-11/40"], ("288 x 120 x 130 in", "732 x 305 x 331 cm"), None, ("288 x 124 x 134 in", "732 x 315 x 341 cm"), ("33,400 lb", "15,150 kg"), "30+1 SMTC"),
	(["VF-11/50"], ("288 x 102 x 132 in", "732 x 260 x 336 cm"), None, ("288 x 105 x 136 in", "732 x 267 x 346 cm"), ("35,700 lb", "16,200 kg"), None),
	(["VF-12/40"], ("348 x 110 x 130 in", "884 x 280 x 331 cm"), None, ("348 x 110 x 134 in", "884 x 280 x 341 cm"), ("36,300 lb", "16,465 kg"), None),
	(["VF-12/50"], ("348 x 110 x 134 in", "884 x 280 x 341 cm"), None, ("348 x 110 x 137 in", "884 x 280 x 348 cm"), ("37,200 lb", "16,880 kg"), None),
	(["VM-2"], ("102 x 106 x 102 in", "260 x 270 x 260 cm"), ("100 x 91 1/2 x 101 in", "254 x 233 x 257 cm"), None, ("9,400 lb", "4,260 kg"), None),
	(["VM-3"], ("156 x 102 x 125 in", "397 x 260 x 318 cm"), ("164 x 91 1/2 x 101 in", "417 x 233 x 257 cm"), None, ("15,300 lb", "6,940 kg"), None),
	(["VM-6"], ("195 x 102 x 129 in", "496 x 259 x 328 cm"), None, ("195 x 105 x 130 in", "496 x 267 x 331 cm"), ("24,000 lb", "10,890 kg"), None),
	(["UMC-500"], ("120 x 98 x 109 in", "305 x 249 x 277 cm"), None, ("120 x 92 x 101 in", "305 x 234 x 257 cm"), ("11,900 lb", "5,400 kg"), None),
	(["UMC-750", "UMC-750P", "UMC-750SS"], ("168 x 93 x 110 in", "427 x 237 x 280 cm"), ("169 x 92 x 101 in", "430 x 234 x 257 cm"), None, ("14,900 lb", "6,760 kg"), None),
	(["UMC-1000"], ("168 x 94 x 116 in", "427 x 239 x 295 cm"), ("165 x 92 x 101 in", "420 x 234 x 257 cm"), None, ("15,600 lb", "7,100 kg"), None),
	(["UMC-1500-DUO"], ("188 x 91 x 109 in", "478 x 232 x 277 cm"), ("185 x 91 x 101 in", "470 x 232 x 257 cm"), None, ("20,100 lb", "9,120 kg"), None),
	(["GM-2-3AX"], ("226 x 143 x 108 in", "574 x 364 x 275 cm"), None, ("226 x 146 x 127 in", "574 x 371 x 323 cm"), ("20,200 lb", "9,163 kg"), None),
	(["GM-2-5AX"], ("226 x 143 x 136 in", "574 x 364 x 346 cm"), None, ("226 x 143 x 140 in", "574 x 364 x 356 cm"), ("22,040 lb", "10,000 kg"), None),
	(["GR-510"], ("206 x 111 x 109 in", "524 x 282 x 277 cm"), None, ("206 x 111 x 112 in", "524 x 282 x 285 cm"), ("19,400 lb", "8,800 kg"), None),
	(["GR-712"], ("226 x 137 x 116 in", "575 x 348 x 295 cm"), None, ("226 x 137 x 119 in", "575 x 348 x 303 cm"), ("24,000 lb", "10,890 kg"), None),
	(["DESKTOP MILL"], ("56 x 37 x 35 in", "143 x 94 x 89 cm"), None, ("56 x 37 x 35 in", "143 x 94 x 89 cm"), ("360 lb", "164 kg"), None),
	(["VR-8"], ("193 x 120 x 130 in", "491 x 305 x 331 cm"), None, ("193 x 123 x 134 in", "491 x 313 x 341 cm"), ("24,800 lb", "11,250 kg"), None),
	(["VR-9"], ("214 x 120 x 130 in", "544 x 305 x 331 cm"), None, ("288 x 123 x 134 in", "732 x 313 x 341 cm"), ("28,300 lb", "12,850 kg"), None),
	(["VR-11", "VR-14"], ("214 x 120 x 130 in", "544 x 305 x 331 cm"), None, ("214 x 124 x 134 in", "544 x 315 x 341 cm"), ("33,400 lb", "15,150 kg"), None),
	# Horizontal Machining Centers, page 10
	(["EC-400"], ("202 x 100 x 112 in", "513 x 254 x 284 cm"), None, ("176 x 92 x 101 in", "447 x 234 x 257 cm"), ("17,520 lb", "7,947 kg"), None),
	(["EC-500"], ("202 x 100 x 110 in", "513 x 254 x 280 cm"), None, ("197 x 91 1/2 x 100 in", "501 x 233 x 254 cm"), ("20,120 lb", "9,126 kg"), None),
	(["EC-1600"], ("192 x 144 x 136 in", "488 x 366 x 346 cm"), None, ("192 x 144 x 137 in", "488 x 366 x 348 cm"), ("30,000 lb", "13,640 kg"), None),
	(["EC-1600ZT"], ("192 x 166 x 136 in", "488 x 422 x 346 cm"), None, ("192 x 166 x 137 in", "488 x 422 x 348 cm"), ("35,000 lb", "15,900 kg"), None),
	# Lathes, page 11 (domestic and export pallet)
	(["CL-1"], ("78 x 62 x 80 in", "199 x 158 x 204 cm"), ("78 x 62 x 80 in", "199 x 158 x 204 cm"), None, ("2,020 lb", "920 kg"), None),
	(["TL-1"], ("92 x 69 x 83 in", "234 x 176 x 211 cm"), ("92 x 69 x 83 in", "234 x 176 x 211 cm"), None, ("4,900 lb", "2,225 kg"), None),
	(["TL-2"], ("111 x 71 x 83 in", "282 x 181 x 211 cm"), ("111 x 71 x 83 in", "282 x 181 x 211 cm"), None, ("5,900 lb", "2,680 kg"), None),
	(["ST-10", "ST-10Y", "ST-15"], ("126 x 70 x 80 in", "321 x 178 x 204 cm"), ("126 x 70 x 80 in", "321 x 178 x 204 cm"), None, ("7,900 lb", "3,585 kg"), None),
	(["ST-20", "ST-20Y", "ST-20SS", "ST-20SSY", "ST-25", "ST-25Y"], ("143 x 90 x 87 in", "364 x 229 x 221 cm"), ("143 x 90 x 87 in", "364 x 229 x 221 cm"), None, ("10,480 lb", "4,754 kg"), None),
	(["ST-30", "ST-30Y", "ST-30SS", "ST-30SSY", "ST-35", "ST-35Y"], ("171 x 90 x 98 in", "435 x 229 x 249 cm"), ("171 x 90 x 98 in", "435 x 229 x 249 cm"), None, ("14,300 lb", "6,490 kg"), None),
	(["ST-30L"], ("198 x 90 x 92 in", "503 x 229 x 234 cm"), ("198 x 90 x 92 in", "503 x 229 x 234 cm"), None, ("13,300 lb", "6,033 kg"), None),
	(["DS-30", "DS-30Y"], ("171 x 90 x 92 in", "435 x 229 x 234 cm"), ("171 x 90 x 92 in", "435 x 229 x 234 cm"), None, ("16,000 lb", "7,260 kg"), None),
	(["DS-30SS", "DS-30SSY"], ("171 x 90 x 92 in", "435 x 229 x 234 cm"), ("171 x 90 x 92 in", "435 x 229 x 234 cm"), None, ("14,800 lb", "6,700 kg"), None),
	(["ST-40", "ST-45"], ("217 x 96 x 105 in", "552 x 244 x 267 cm"), ("215 x 91 x 100 in", "547 x 231 x 254 cm"), None, ("25,900 lb", "11,750 kg"), None),
	(["ST-40L", "ST-45L"], ("254 x 95 x 105 in", "646 x 242 x 267 cm"), ("249 x 90 x 100 in", "633 x 229 x 254 cm"), None, ("29,900 lb", "13,560 kg"), None),
	(["ST-50", "ST-55"], ("254 x 95 x 105 in", "646 x 242 x 267 cm"), ("249 x 90 x 100 in", "633 x 229 x 254 cm"), None, ("31,000 lb", "14,100 kg"), None),
]

# The document's model name for an item code of the old system that differs from it.
ALIASES = {
	"MINIMILL": "MM",
	"SMINIMILL": "SMM",
	"MINIMILL2": "MM2",
	"SMINIMILL2": "SMM2",
	"GM-2": "GM-2-3AX",
}


def model_of(item_code):
	"""The document's model for an item code, or None. "VF-2.", "VF-2-I" and "vf-2" are VF-2."""
	code = (item_code or "").strip().upper()
	code = re.sub(r"\.+$", "", code)  # VF-2. is VF-2
	code = re.sub(r"-I$", "", code)  # VF-2-I is VF-2 (the old system's second item for it)
	code = ALIASES.get(code, code)
	return code if code in ROWS else None


def specification_text(model):
	"""The Specifications lines for one model of SHIPPING."""
	dom, exp_pallet, crate, weight, note = ROWS[model]
	lines = [HEADING]
	if note:
		lines.append(f"Configuration : {note}")
	for label, pair in (
		("Domestic Pallet (L x W x H)", dom),
		("Export Pallet (L x W x H)", exp_pallet),
		("Export Crate (L x W x H)", crate),
		("Weight", weight),
	):
		if pair:
			lines.append(f"{label} : {UNIT_SEPARATOR.join(pair)}")
	lines.append(SOURCE)
	return "\n".join(lines)


# {model: (domestic pallet, export pallet, export crate, weight, note)}
ROWS = {model: row[1:] for row in SHIPPING for model in row[0]}


def run(dry_run=1):
	"""Fill Specifications of the Items that match a model and have none. Prints what it does."""
	dry_run = int(dry_run)
	items = frappe.get_all(
		"Item",
		filters={"disabled": 0},
		fields=["name", "item_name", "custom_specifications"],
		order_by="name",
	)

	report = {"updated": [], "would_update": [], "skipped (has specifications)": []}
	for row in items:
		model = model_of(row.name)
		if not model:
			continue
		if (row.custom_specifications or "").strip():
			report["skipped (has specifications)"].append(row.name)
			continue
		text = specification_text(model)
		if dry_run:
			report["would_update"].append(f"{row.name} <- {model}")
			continue
		# set_value writes the one field without running the Item's validations, which the
		# items brought over from the old system may not all pass.
		frappe.db.set_value("Item", row.name, "custom_specifications", text)
		report["updated"].append(f"{row.name} <- {model}")
	if not dry_run:
		frappe.db.commit()

	print("--- Haas shipping specifications" + (" (DRY RUN, nothing written)" if dry_run else ""))
	for key, rows in report.items():
		print(f"\n{key}: {len(rows)}")
		for line in rows:
			print(f"  {line}")
	if dry_run and report["would_update"]:
		example = report["would_update"][0].split(" <- ")[1]
		print(f"\nExample, {example}:\n{specification_text(example)}")
	return {key: len(rows) for key, rows in report.items()}
