// Copyright (c) 2026, milind and contributors
// For license information, please see license.txt

// "Standard Accessories" table under the Items of the Quotation, Draft PI and Final PI (Sales
// Order) forms (loaded through `doctype_js` in hooks.py). One row per machine line (a line without
// "Sub-Item of"): its number, code and name, and the points of its description. The description is
// the Item's Standard Accessories (Item.description), copied to the line when the item is chosen;
// what is shown is what the quotation prints. Read only: the points are changed on the Item, or in
// the line's Description.
//
// Working: drawn in the HTML field custom_standard_accessories (Quotation, Sales Order: Custom Field
// in erpnext_fields.py; Draft PI: its own field), hidden when no machine line has points. Drawn
// again when a line's item or description changes or a line is removed. The points are the list
// items (<li>) of the description, bold ones kept bold; a description without a list is shown by
// its lines. The text is put on the page escaped, never as HTML.
//
// Created: 2026-11-04, the user asked for the Standard Accessories table on the Quotation, Draft PI
// and Final PI.
//
// CHANGE NOTE
// Date: 2026-11-04
// Change: While the document can be changed, each machine has an "Add accessory" box and each point
// a remove button. Both change only that line's Description on this document (and so its print);
// the Item master is not changed.
// Reason: The user asked to add standard accessories on the transaction only, not in the master.
//
// CHANGE NOTE
// Date: 2026-11-04
// Change: The add box and remove buttons are replaced by a rich-text editor per machine (Frappe's
// Text Editor control, render_editors) bound to the line's Description; a submitted / closed
// document still shows the points read only.
// Reason: The user asked for the Standard Accessories on the quotation and PI as rich text (RTF).
//
// CHANGE NOTE
// Date: 2026-11-04
// Change: The table is not shown on a phone (screens up to 767 px wide, Frappe's mobile width).
// Reason: The user asked not to show it in the phone view.

(function () {
	// hooks.py loads this file for each of the three forms; the handlers are set up once
	if (window.manav_standard_accessories_loaded) return;
	window.manav_standard_accessories_loaded = true;
	const FIELD = "custom_standard_accessories";
	const ITEM_DOCTYPES = { Quotation: "Quotation Item", "Sales Order": "Sales Order Item", "Draft PI": "Draft PI Item" };

	// The points of a description: [{text, bold}]. List items when there are any, else its lines.
	function points_of(description) {
		const html = description || "";
		if (!html.trim()) return [];
		const doc = new DOMParser().parseFromString(html, "text/html");
		const items = Array.from(doc.querySelectorAll("li"));
		if (items.length) {
			return items
				.map((li, li_index) => {
					const text = (li.textContent || "").replace(/\s+/g, " ").trim();
					const strong = li.querySelector("strong, b");
					// bold when the whole point is bold (the old "Bold Print" lines)
					const bold = !!strong && (strong.textContent || "").replace(/\s+/g, " ").trim() === text;
					// li_index: the point's place among the <li> (used by the remove button until it
					// gave way to the editor, 2026-11-04)
					return { text, bold, li_index };
				})
				.filter((point) => point.text);
		}
		// no list: one point per line (<br>, <p>, <div> or a new line)
		doc.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
		doc.querySelectorAll("p, div").forEach((block) => block.append("\n"));
		return (doc.body.textContent || "")
			.split(/\n+/)
			.map((line) => line.replace(/\s+/g, " ").trim())
			.filter(Boolean)
			.map((text) => ({ text, bold: false }));
	}

	// Points can be added or removed while the lines can be changed: a draft quotation / Final PI, a
	// Draft PI without its Final PI.
	function can_edit(frm) {
		return frm.doc.docstatus === 0 && !frm.doc.final_pi && Boolean(frm.perm && frm.perm[0] && frm.perm[0].write);
	}

	function render(frm) {
		const field = frm.fields_dict[FIELD];
		if (!field) return; // the field is created by `bench migrate`
		const esc = frappe.utils.escape_html;
		const editable = !!can_edit(frm);
		const machines = (frm.doc.items || []).filter((row) => row.item_code && !row.custom_main_item_code);
		const rows = [];
		machines.forEach((row, index) => {
			const points = points_of(row.description);
			// an editable document shows every machine, so accessories can be written for one without any
			if (points.length || editable) rows.push({ no: index + 1, row, points });
		});
		frm.toggle_display(FIELD, rows.length > 0);
		if (!rows.length) {
			frm.__manav_accessories_key = null;
			$(field.wrapper).empty();
			return;
		}
		add_style();
		if (editable) {
			render_editors(frm, field, rows);
			return;
		}
		frm.__manav_accessories_key = null;
		const body = rows
			.map(
				({ no, row, points }) => `<tr>
					<td class="msa-no">${no}</td>
					${machine_cell(row, esc(__("{0} points", [points.length])))}
					<td><ul class="msa-points">${points
						.map((point) => `<li${point.bold ? ' class="msa-bold"' : ""}>${esc(point.text)}</li>`)
						.join("")}</ul></td>
				</tr>`
			)
			.join("");
		$(field.wrapper).html(table_html(body));
	}

	function machine_cell(row, note) {
		const esc = frappe.utils.escape_html;
		return `<td class="msa-machine">
			<div class="msa-code">${esc(row.item_code)}</div>
			${row.item_name && row.item_name !== row.item_code ? `<div class="msa-name">${esc(row.item_name)}</div>` : ""}
			${note ? `<div class="msa-count">${note}</div>` : ""}
		</td>`;
	}

	function table_html(body, note) {
		const esc = frappe.utils.escape_html;
		return `<div class="msa">
			<div class="msa-title">${esc(__("Standard Accessories"))}</div>
			<div class="msa-wrap"><table class="msa-table">
				<thead><tr><th>${esc(__("No."))}</th><th>${esc(__("Machine"))}</th><th>${esc(__("Standard Accessories"))}</th></tr></thead>
				<tbody>${body}</tbody>
			</table></div>
			${note ? `<div class="msa-note text-muted">${esc(note)}</div>` : ""}
		</div>`;
	}

	// 2026-11-04: while the document can be changed, each machine's accessories are a rich-text
	// editor (Frappe's Text Editor control: bold, colour, lists, undo ...) bound to that line's
	// Description: what is typed is set on the line (frappe.model.set_value, through the control's
	// doctype / docname), so the form is marked unsaved and the print follows. Only this document
	// changes, never the Item. The editors are made again only when the machines change; a
	// description changed elsewhere (the line's own form) is put into an editor that is not in use.
	function render_editors(frm, field, rows) {
		const key = rows.map(({ row }) => `${row.name}:${row.item_code}`).join("|");
		const controls = frm.__manav_accessories_controls || {};
		if (frm.__manav_accessories_key === key && $(field.wrapper).find(".msa-editor").length) {
			rows.forEach(({ row }) => {
				const control = controls[row.name];
				if (!control || !control.quill || control.quill.hasFocus()) return;
				if ((row.description || "") !== control.get_input_value()) control.set_input(row.description || "");
			});
			return;
		}
		const esc = frappe.utils.escape_html;
		const body = rows
			.map(
				({ no, row }) => `<tr>
					<td class="msa-no">${no}</td>
					${machine_cell(row, "")}
					<td class="msa-editor-cell"><div class="msa-editor" data-name="${esc(row.name)}"></div></td>
				</tr>`
			)
			.join("");
		$(field.wrapper).html(
			table_html(body, __("Changed here: this document only (its line's Description and print); the Item master is not changed."))
		);
		frm.__manav_accessories_key = key;
		frm.__manav_accessories_controls = {};
		rows.forEach(({ row }) => {
			const $parent = $(field.wrapper).find(`.msa-editor[data-name="${CSS.escape(row.name)}"]`);
			const control = frappe.ui.form.make_control({
				df: { fieldtype: "Text Editor", fieldname: "description", label: "", max_height: "340px" },
				parent: $parent,
				render_input: true,
				only_input: true,
			});
			// bound to the line: the control reads and sets row.description
			control.doctype = row.doctype;
			control.docname = row.name;
			control.doc = row;
			control.set_input(row.description || "");
			frm.__manav_accessories_controls[row.name] = control;
		});
	}

	// Several changes come at once (an item fills name and description): draw once after them.
	function render_soon(frm) {
		clearTimeout(frm.__manav_accessories_timer);
		frm.__manav_accessories_timer = setTimeout(() => render(frm), 150);
	}

	function add_style() {
		if (document.getElementById("manav-std-accessories-style")) return;
		$(`<style id="manav-std-accessories-style">
			.msa { margin-top: 16px; }
			.msa-title { font-weight: 600; color: var(--heading-color, var(--text-color)); margin-bottom: 8px; }
			.msa-wrap { border: 1px solid var(--border-color); border-radius: 8px; overflow: auto; max-height: 520px; }
			.msa-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
			.msa-table th {
				position: sticky; top: 0; z-index: 1; background: var(--subtle-fg, var(--bg-light-gray));
				color: var(--text-muted); font-size: var(--text-xs); font-weight: 600; text-transform: uppercase;
				letter-spacing: 0.03em; padding: 8px 10px; border-bottom: 1px solid var(--border-color); text-align: left;
			}
			.msa-table td { padding: 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
			.msa-table tbody tr:last-child td { border-bottom: 0; }
			.msa-no { width: 48px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
			.msa-machine { width: 28%; min-width: 180px; border-left: 3px solid var(--blue-500, var(--blue-600)); background: var(--blue-50, transparent); }
			.msa-code { font-weight: 700; color: var(--blue-600); }
			.msa-name { color: var(--text-color); margin-top: 2px; }
			.msa-count { margin-top: 6px; font-size: var(--text-xs); color: var(--text-muted); }
			.msa-points { margin: 0; padding-left: 18px; columns: 2 240px; column-gap: 28px; }
			.msa-points li { break-inside: avoid; padding: 1px 0; }
			.msa-points li.msa-bold { font-weight: 700; }
			.msa-editor-cell { min-width: 320px; }
			.msa-editor .ql-editor { min-height: 120px; }
			.msa-note { font-size: var(--text-xs); margin-top: 6px; }
			/* 2026-11-04: not shown on a phone (the user's request): the table and its editors are too
			   wide there; the lines' descriptions are unchanged and still print */
			@media (max-width: 767px) {
				.frappe-control[data-fieldname="${FIELD}"], .msa { display: none !important; }
			}
		</style>`).appendTo("head");
	}

	Object.entries(ITEM_DOCTYPES).forEach(([doctype, item_doctype]) => {
		frappe.ui.form.on(doctype, {
			refresh: render,
			items_remove: render_soon,
		});
		frappe.ui.form.on(item_doctype, {
			item_code: render_soon,
			description: render_soon,
			custom_main_item_code: render_soon,
		});
	});
})();
