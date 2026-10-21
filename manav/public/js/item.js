// Copyright (c) 2026, milind and contributors
// For license information, please see license.txt

// Manav's addition to ERPNext's Item form (loaded through `doctype_js` in hooks.py): buttons that
// turn a specification table copied from a manufacturer's web page into the lines the quotation
// print uses.
//
// Working: copied from a web page and pasted into the Specifications box, each table row arrives
// as one line with the cells separated by tabs. The buttons under "Specifications" rewrite the
// box as lines the print format "Manav Sales Quotation" reads:
//     #Title || Column 2 || Column 3      a heading row, which also names the two value columns
//     label : value 2 || value 3          a table row
// Two kinds of table are understood.
//
// 1. One machine, two unit systems (the Haas site):
//        Travels     S.A.E.      Metric
//        X Axis      40.00 in    1016 mm
//    becomes
//        #Travels || S.A.E. || Metric
//        X Axis : 40.00 in || 1016 mm
//
// 2. Several models side by side, with a Units column (the Jagdeep site):
//        Models                          JVTC/JVTM-1   JVTC/JVTM-1.2   JVTC/JVTM-1.5
//        Descriptions            Units
//        Table Diameter          MM      1000          1200            1500
//        Travel
//        X - Axis Rapid Rate     MM/MIN  1000
//    An Item is one model, so the button asks which model column to keep (it suggests the one
//    whose number is in the item code). For JVTC/JVTM-1.2 the box becomes
//        #Descriptions || Units || JVTC/JVTM-1.2
//        Table Diameter : MM || 1200
//        #Travel
//        X - Axis Rapid Rate : MM/MIN || 1000
//    A value written once across all models on the page (a merged cell) is the value of every
//    model. The table is recognised by its row that starts with "Models".
//
// "From screenshot" fills the box from a picture of the table when the page does not allow
// copying; the Format buttons are then used on that text in the same way.
//
// "Format: key specifications" also drops the rows a customer does not need on a quotation (see
// MANAV_KEY_SPECIFICATIONS below); "Format: all rows" keeps every row. Both can be pressed again
// on text that is already formatted.
//
// Created: 2026-10-12.
//
// CHANGE NOTE
// Date: 2026-10-12
// Change: Added "Format: key specifications", which keeps only the rows listed below.
// Reason: The full table of the manufacturer's page is too long for a quotation; only the
// specifications a buyer compares machines by are to be shown.
//
// CHANGE NOTE
// Date: 2026-10-13
// Change: A pasted row keeps its S.A.E. and its Metric value ("label : S.A.E. || Metric"); before
// this only the Metric value was kept.
// Reason: The quotation is to print the specifications as the table of the maker's page, with an
// S.A.E. and a Metric column, instead of the description paragraph.
//
// CHANGE NOTE
// Date: 2026-10-13
// Change: Tables with several models side by side (kind 2 above) are understood, the heading line
// carries the titles of the value columns, and the key rows list has the Jagdeep row names.
// Reason: The Jagdeep site lays its specifications out as Description, Units and one column per
// model, not as S.A.E. and Metric, so the fixed S.A.E./Metric layout did not fit its machines.
//
// CHANGE NOTE
// Date: 2026-10-13
// Change: Added "From screenshot" under Specifications (manav_read_screenshot).
// Reason: The Jagdeep site does not let its table be copied, so there was nothing to paste. A
// screenshot of the table is uploaded instead and read into the box on the server.
//
// CHANGE NOTE
// Date: 2026-10-14
// Change: A line typed with a running number in front ("1 : Table Diameter || 1200") is
// rewritten by the Format buttons as "Table Diameter : 1200".
// Reason: The user typed an Item's specifications that way; the number was taken for the label.
//
// CHANGE NOTE
// Date: 2026-10-15
// Change: The call to Frappe's internal frm.attachments.attachment_uploaded is checked first.
// Reason: Upgrade-safe rule: an internal that a later Frappe version drops must not stop the upload.
//
// CHANGE NOTE
// Date: 2026-10-19
// Change: A machine's form shows its sub-items as a tree in the section "Sub-Items" at the foot
// of the Details tab (manav_show_sub_items_tree); the section is hidden for other items.
// Reason: The user asked for the sub-items tree inside the Item form of that item.

// Separates the cells of a line after the label (S.A.E. and Metric, or Units and value). Two bars,
// because a single bar is used inside values on the maker's page (Taper: CT40 | BT40 | HSK-A63).
// The print format "Manav Sales Quotation" splits the line on the same text.
const MANAV_UNIT_SEPARATOR = " || ";

// Which rows are "key". A block whose title matches `drop_blocks` is left out whole. In the other
// blocks a row is kept when its label matches one of `keep_labels`. A block with no kept row is
// left out with its heading. Always kept: lines without " : ", rows above the first heading, and
// rows marked bold with !.
// To show more or fewer rows on quotations, change these two lists.
const MANAV_KEY_SPECIFICATIONS = {
	drop_blocks: /air requirement|electrical|dimension|shipping|axis motor/i,
	keep_labels: [
		/^[xyzabc] axis$/i, // travels
		/^travel$/i, // travel of a tilt or rotary axis
		/^max rating$/i, // spindle power
		/^max speed$/i,
		/^max torque$/i,
		/^taper$/i,
		/^spindle nose$/i, // lathes
		/^spindle bore/i,
		/^length$/i, // table
		/^width$/i,
		/platter diameter/i,
		/^max weight/i, // on table or platter
		/^rapids/i, // feedrates
		/^max cutting/i, // cutting feedrate; on lathes cutting diameter and length
		/^capacity$/i, // tool changer
		/^type$/i,
		/number of tools/i, // lathe turret
		/chuck size/i, // lathe capacities
		/bar capacity/i,
		/swing/i,
		/coolant capacity/i,
		// Vertical turning lathes (the Jagdeep table)
		/table diameter/i,
		/max\.? ?turning/i, // turning diameter and height; the page also writes "Max.Turning"
		/work ?piece weight/i,
		/axis.*travel/i, // X-Axis (Horizontal Travel), Z-Axis (Vertical Ram Travel)
		/main spindle/i, // main spindle motor
		/table speeds/i,
		/cnc control/i,
	],
};

frappe.ui.form.on("Item", {
	refresh(frm) {
		manav_show_sub_items_tree(frm);
		if (!frm.fields_dict.custom_specifications) return;
		const group = __("Specifications");
		frm.add_custom_button(__("Format: key specifications"), () => manav_apply_format(frm, true), group);
		frm.add_custom_button(__("Format: all rows"), () => manav_apply_format(frm, false), group);
		frm.add_custom_button(__("From screenshot"), () => manav_read_screenshot(frm), group);
	},
});

// The machine's sub-items as a tree, in the HTML field custom_sub_items_tree (section "Sub-Items",
// item_fields.py): the machine at the root, its sub-items under it with description, type and
// price for this machine, in Sr No order. Uses Frappe's tree component (frappe.ui.Tree) with the
// nodes of manav.manav.item_tree.get_tree_nodes, as the page Machine Sub-Items Tree does (whose
// label code this follows). The section is hidden for an item without sub-items, for a new item,
// and for a reader who may not read Quotation Sub Item Master (count_sub_items then gives 0).
// Added 2026-10-19.
function manav_show_sub_items_tree(frm) {
	const field = frm.fields_dict.custom_sub_items_tree;
	if (!field) return; // the field is created by `bench migrate`
	frm.toggle_display("custom_sub_items_section", false);
	if (frm.is_new()) return;
	const code = frm.doc.name;
	frappe
		.call({ method: "manav.manav.item_tree.count_sub_items", args: { item_code: code } })
		.then((r) => {
			const count = r.message || 0;
			// another item may have been opened meanwhile
			if (frm.doc.name !== code || !count) return;
			frm.toggle_display("custom_sub_items_section", true);
			manav_add_sub_tree_style();
			const esc = frappe.utils.escape_html;
			const $wrapper = $(field.wrapper).empty();
			$(`<div class="manav-item-tree-head">
					<span class="text-muted">${esc(__("{0} sub-items, with their price for this machine", [count]))}</span>
					<button type="button" class="btn btn-xs btn-default">${esc(__("Open full tree"))}</button>
				</div>`)
				.appendTo($wrapper)
				.find("button")
				.on("click", () => frappe.set_route("machine-sub-items", { search: code }));
			const $tree = $('<div class="manav-sub-tree"></div>').appendTo($wrapper);
			new frappe.ui.Tree({
				parent: $tree,
				label: code,
				root_value: `machine::${code}`,
				method: "manav.manav.item_tree.get_tree_nodes",
				args: { search: "" },
				get_label(node) {
					if (node.is_root) {
						const name = frm.doc.item_name && frm.doc.item_name !== code ? frm.doc.item_name : "";
						return `<b>${esc(code)}</b>${name ? ` <span class="manav-tree-name">${esc(name)}</span>` : ""}`;
					}
					const d = node.data || {};
					const description = (d.description || "").replace(/\s+/g, " ").trim();
					return (
						`<span class="manav-tree-code">${esc(d.title)}</span>` +
						(description ? ` <span class="manav-tree-name">${esc(description)}</span>` : "") +
						(d.sub_item_type ? ` <span class="manav-tree-type">${esc(d.sub_item_type)}</span>` : "") +
						` <span class="manav-tree-rate">${esc(format_number(flt(d.rate), null, 2))}</span>`
					);
				},
				toolbar: [
					{
						label: __("Open Item"),
						condition: (node) => !node.is_root && (node.data || {}).item,
						click: (node) => frappe.set_route("Form", "Item", node.data.item),
					},
				],
			});
		});
}

function manav_add_sub_tree_style() {
	if (document.getElementById("manav-item-sub-tree-style")) return;
	$(`<style id="manav-item-sub-tree-style">
		.manav-item-tree-head { display: flex; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 8px; }
		.manav-sub-tree .tree-label { white-space: normal; }
		.manav-sub-tree .manav-tree-name { color: var(--text-muted); }
		.manav-sub-tree .manav-tree-type {
			display: inline-block;
			font-size: var(--text-xs);
			padding: 0 6px;
			border-radius: 8px;
			background: var(--bg-gray);
			color: var(--text-color);
		}
		.manav-sub-tree .manav-tree-code { font-weight: 600; }
		.manav-sub-tree .manav-tree-rate { font-variant-numeric: tabular-nums; margin-left: 4px; }
	</style>`).appendTo("head");
}

// Fill Specifications from a screenshot of the maker's table, for pages whose table cannot be
// copied as text. The picture is uploaded as an attachment of the Item (so it stays there to
// check the values against), then read on the server by
// manav/manav/specification_screenshot.py, which returns the table as tab-separated lines: the
// same text a paste from the page gives. It is put into the box unformatted; the user checks it
// and presses a Format button.
function manav_read_screenshot(frm) {
	// An attachment needs a saved document to belong to.
	if (frm.is_new()) {
		frappe.msgprint(__("Save the item first, then upload the screenshot."));
		return;
	}
	new frappe.ui.FileUploader({
		doctype: frm.doctype,
		docname: frm.docname,
		frm: frm,
		dialog_title: __("Upload a screenshot of the specification table"),
		allow_multiple: false,
		// A screenshot of a maker's page is not for everyone to open by its link.
		make_attachments_public: false,
		restrictions: { allowed_file_types: [".png", ".jpg", ".jpeg", ".gif", ".webp"] },
		on_success(file_doc) {
			if (!file_doc) return;
			// Shows the new file in the sidebar at once. frm.attachments is Frappe's internal
			// sidebar object (checked on Frappe 16.33.1); without it the file shows after a reload.
			if (frm.attachments && typeof frm.attachments.attachment_uploaded === "function") {
				frm.attachments.attachment_uploaded(file_doc);
			}
			frappe.call({
				method: "manav.manav.specification_screenshot.read_table",
				args: { file_name: file_doc.name },
				freeze: true,
				freeze_message: __("Reading the screenshot. This can take up to a minute."),
				callback(r) {
					if (r.message) manav_use_screenshot_text(frm, r.message);
				},
			});
		},
	});
}

// Put the text read from a screenshot into Specifications. Text already in the box is only
// replaced after the user agrees, because it may have been corrected by hand.
function manav_use_screenshot_text(frm, text) {
	const set = () => {
		frm.set_value("custom_specifications", text);
		frappe.msgprint({
			title: __("Check the Specifications"),
			indicator: "orange",
			message: __(
				"The table was read from the picture by a machine and a figure can be wrong. Compare every value with the screenshot (it is in the attachments), correct what differs, then press a Format button and save."
			),
		});
	};
	if ((frm.doc.custom_specifications || "").trim()) {
		frappe.confirm(__("Replace the present Specifications with the table read from the screenshot?"), set);
	} else {
		set();
	}
}

function manav_apply_format(frm, only_key) {
	const before = frm.doc.custom_specifications || "";
	if (!before.trim()) {
		frappe.show_alert(__("Paste the specification table into Specifications first."));
		return;
	}

	const models = manav_specification_models(before);
	if (models.length < 2) {
		manav_set_formatted(frm, before, manav_format_specifications(before, only_key, models[0]));
		return;
	}
	// A table of several models: the Item is one of them, so ask which column to keep.
	frappe.prompt(
		{
			fieldname: "model",
			fieldtype: "Select",
			label: __("Model column to keep"),
			options: models,
			default: manav_guess_model(models, frm.doc.item_code || frm.doc.name),
			reqd: 1,
			description: __("The pasted table has a column for each model; this item is one of them."),
		},
		(values) => {
			manav_set_formatted(frm, before, manav_format_specifications(before, only_key, values.model));
		},
		__("Format Specifications"),
		__("Format")
	);
}

function manav_set_formatted(frm, before, after) {
	if (after === before) {
		frappe.show_alert(__("The specifications are already in this form."));
		return;
	}
	frm.set_value("custom_specifications", after);
	frappe.show_alert({ message: __("Specifications formatted. Check them, then save."), indicator: "green" });
}

// The cells of one pasted line, empty ones included. Cells are separated by a tab; some browsers
// paste a run of spaces instead.
function manav_split_cells(line) {
	return line.split(/\t| {3,}/).map((cell) => cell.trim());
}

// The model names of a pasted table of several models, in column order; [] for any other text.
// Such a table has a row that starts with "Models" and then names at least three models. (With
// fewer, a row could not be told from a merged one by its number of cells.)
function manav_specification_models(text) {
	for (const line of (text || "").split(/\r?\n/)) {
		const cells = manav_split_cells(line).filter(Boolean);
		if (cells.length > 3 && /^models?$/i.test(cells[0])) return cells.slice(1);
	}
	return [];
}

// The model column an item most likely is: the one whose number is the number in the item code
// (item JVTC-2.5 and column JVTC/JVTM-2.5). Without a match, the first column.
function manav_guess_model(models, item_code) {
	const number_of = (text) => {
		const found = (text || "").match(/(\d+(?:\.\d+)?)\D*$/);
		return found ? parseFloat(found[1]) : null;
	};
	const wanted = number_of(item_code);
	return models.find((model) => wanted !== null && number_of(model) === wanted) || models[0];
}

// Turn pasted table rows into specification lines; with `only_key`, keep just the key rows.
// `model` is the column to keep of a table of several models (default: its first model).
// Kept free of form code so it can be tested alone.
function manav_format_specifications(text, only_key, model) {
	const models = manav_specification_models(text);
	const column = Math.max(models.indexOf(model), 0);
	const join = (cells) => cells.join(MANAV_UNIT_SEPARATOR);

	// 1. Read every line as a heading, a "label : value" row, or a plain line, grouped in blocks.
	const blocks = [{ heading: null, rows: [] }];
	let in_models_table = false; // true from the "Models" row on
	(text || "").split(/\r?\n/).forEach((raw) => {
		const all_cells = manav_split_cells(raw);
		const cells = all_cells.filter(Boolean);
		if (!cells.length) return;
		const block = blocks[blocks.length - 1];

		if (models.length && cells.length > 3 && /^models?$/i.test(cells[0])) {
			// The titles of the page's first two columns come on the next row; until then
			// (or if the page has no such row) they are Description and Units.
			in_models_table = true;
			blocks.push({ heading: join(["Description", "Units", models[column]]), rows: [], titled: true });
			return;
		}

		if (in_models_table) {
			if (all_cells.length > models.length) {
				// A full row: the last cells are the values, one per model; before them the
				// label and (mostly) the unit. Counted from the right, because a merged cell
				// on the left of the page is pasted as one cell.
				const first_value = all_cells.length - models.length;
				const head = all_cells.slice(0, first_value).filter(Boolean);
				if (!head.length) return;
				block.rows.push({ label: head[0], value: join([head[1] || "-", all_cells[first_value + column] || "-"]) });
			} else if (cells.length === 1) {
				// One cell: the title of a section of the table (Travel, Electric Motors).
				blocks.push({ heading: cells[0], rows: [], section: true });
			} else if (cells.length === 2 && /^units?$/i.test(cells[1])) {
				// The row that names the first two columns ("Descriptions", "Units").
				if (block.titled && !block.rows.length) block.heading = join([cells[0], cells[1], models[column]]);
			} else if (cells.length === 2) {
				block.rows.push({ label: cells[0], value: cells[1] });
			} else {
				// Label, unit and one value written across all models: it holds for each of them.
				block.rows.push({ label: cells[0], value: join([cells[1], cells.slice(2).join(", ")]) });
			}
			return;
		}

		// Above the "Models" row a line of many cells is not a table row (on the Jagdeep page
		// it is the list of operations); it is kept as one line.
		if (models.length && cells.length > 3) {
			block.rows.push({ plain: cells.join(", ") });
			return;
		}

		// The first row of each pasted block names the block and the two unit systems.
		const is_pasted_heading =
			cells.length > 1 && cells.slice(1).some((cell) => /^(s\.?a\.?e\.?|metric|imperial)$/i.test(cell));
		if (is_pasted_heading) {
			blocks.push({ heading: join(cells), rows: [] });
			return;
		}
		if (cells[0].startsWith("#")) {
			blocks.push({ heading: cells[0].replace(/^#/, "").trim(), rows: [] });
			return;
		}

		if (cells.length > 1) {
			// Label, S.A.E. value, Metric value: keep both. Label and one value: keep it.
			const value = cells.length > 2 ? join([cells[1], cells[cells.length - 1]]) : cells[1];
			block.rows.push({ label: cells[0], value: value });
			return;
		}
		// One cell: a row formatted earlier ("label : value"), or a line typed by hand.
		const at = cells[0].indexOf(" : ");
		if (at > 0) {
			let label = cells[0].slice(0, at).trim();
			let value = cells[0].slice(at + 3).trim();
			// Typed with a running number in front, "1 : Table Diameter || 1200": the number is
			// dropped and the two sides of the || are the label and the value.
			const bar = value.indexOf(MANAV_UNIT_SEPARATOR);
			const numbered = /^\d+$/.test(label) && bar > 0;
			if (numbered) {
				label = value.slice(0, bar).trim();
				value = value.slice(bar + MANAV_UNIT_SEPARATOR.length).trim();
			}
			block.rows.push({ label: label, value: value, numbered: numbered });
		} else {
			block.rows.push({ plain: cells[0] });
		}
	});

	// Typed with running numbers, the first line is often the column titles written the same way
	// ("Description : Unit || Specification" above "1 : Table Diameter || 1200"): it becomes the
	// heading "#Description || Unit || Specification".
	const first = blocks[0].rows;
	if (first.length > 1 && !first[0].plain && !first[0].numbered && first[1].numbered && first[0].value.includes(MANAV_UNIT_SEPARATOR)) {
		blocks[0].heading = join([first[0].label, ...first[0].value.split(MANAV_UNIT_SEPARATOR).map((title) => title.trim())]);
		first.shift();
	}

	// A section title with no rows under it is not a title: it is a note below the table (on the
	// Jagdeep page, the footnotes "(*) Customization Available."). It is kept as a plain line.
	const read_blocks = [];
	blocks.forEach((block) => {
		if (block.section && !block.rows.length && read_blocks.length) {
			read_blocks[read_blocks.length - 1].rows.push({ plain: block.heading });
		} else {
			read_blocks.push(block);
		}
	});

	// 2. Write the blocks out again, leaving out what is not key when asked to.
	const lines = [];
	read_blocks.forEach((block) => {
		if (only_key && block.heading && MANAV_KEY_SPECIFICATIONS.drop_blocks.test(block.heading)) return;
		const rows = block.rows.filter((row) => {
			if (!only_key || row.plain) return true;
			// Rows above the first heading were typed by hand (the old style list), and a row
			// marked bold with ! was marked on purpose: neither is filtered.
			if (!block.heading || row.label.startsWith("!")) return true;
			return MANAV_KEY_SPECIFICATIONS.keep_labels.some((pattern) => pattern.test(row.label));
		});
		if (!rows.length) return;
		if (block.heading) lines.push(`#${block.heading}`);
		rows.forEach((row) => lines.push(row.plain || `${row.label} : ${row.value}`));
	});
	return lines.join("\n");
}

// Lets the formatter be loaded by a test outside the browser; ignored on the form.
if (typeof module !== "undefined") {
	module.exports = { manav_format_specifications, manav_specification_models, manav_guess_model };
}
