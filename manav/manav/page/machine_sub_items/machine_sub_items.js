// Page "Machine Sub-Items Tree" (/desk/machine-sub-items): the machines and their sub-items as a
// tree, Item Group -> machine -> sub-items (code, description, type, price for that machine).
// Opened from the Items list ("Sub-Items Tree" button, public/js/item_list.js) and the Manav
// sidebar. The nodes come from manav.manav.item_tree.get_tree_nodes, loaded when a node is opened.
//
// Uses Frappe's own tree component (frappe.ui.Tree, as the tree views of Item Group or Account),
// with its documented options: method, args, get_label, toolbar, on_render (checked on Frappe
// 16.33.1). A "search" route option (frappe.route_options) fills the search box.
//
// Created: 2026-10-19.

frappe.pages["machine-sub-items"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Machine Sub-Items Tree"),
		single_column: true,
	});
	const ROOT = "Machines with Sub-Items";
	const esc = frappe.utils.escape_html;
	let tree = null;
	let search_text = "";

	const search = page.add_field({
		fieldname: "search",
		label: __("Find a machine"),
		fieldtype: "Data",
		placeholder: __("Machine code or name"),
		change() {
			const text = (search.get_value() || "").trim();
			if (text !== search_text) build(text);
		},
	});
	page.add_inner_button(__("Item List"), () => frappe.set_route("List", "Item"));

	const body = $('<div class="manav-sub-tree"></div>').appendTo(page.main);
	add_style();

	// The text of a node: group with its number of machines, machine with its name and number of
	// sub-items, sub-item with its description, type and price.
	function label_of(node) {
		const d = node.data || {};
		if (node.is_root) return `<b>${esc(__(ROOT))}</b>`;
		if (d.kind === "group") {
			return `<b>${esc(d.title)}</b> <span class="text-muted">${esc(__("{0} machines", [d.count]))}</span>`;
		}
		if (d.kind === "machine") {
			return (
				`<b>${esc(d.title)}</b>` +
				(d.item_name && d.item_name !== d.title ? ` <span class="manav-tree-name">${esc(d.item_name)}</span>` : "") +
				` <span class="manav-tree-count">${esc(__("{0} sub-items", [d.count]))}</span>`
			);
		}
		const description = (d.description || "").replace(/\s+/g, " ").trim();
		return (
			`<span class="manav-tree-code">${esc(d.title)}</span>` +
			(description ? ` <span class="manav-tree-name">${esc(description)}</span>` : "") +
			(d.sub_item_type ? ` <span class="manav-tree-type">${esc(d.sub_item_type)}</span>` : "") +
			` <span class="manav-tree-rate">${esc(format_number(flt(d.rate), null, 2))}</span>`
		);
	}

	function build(text) {
		search_text = text || "";
		body.empty();
		tree = new frappe.ui.Tree({
			parent: body,
			label: ROOT,
			root_value: ROOT,
			method: "manav.manav.item_tree.get_tree_nodes",
			args: { search: search_text },
			get_label: label_of,
			// While searching, the groups are opened at once, so the machines found show directly.
			on_render(node) {
				if (search_text && node.data && node.data.kind === "group") {
					setTimeout(() => tree && tree.load_children(node), 0);
				}
			},
			toolbar: [
				{
					label: __("Open Item"),
					condition: (node) => {
						const d = node.data || {};
						return d.kind === "machine" || (d.kind === "sub" && d.item);
					},
					click: (node) => {
						const d = node.data;
						frappe.set_route("Form", "Item", d.kind === "machine" ? d.title : d.item);
					},
				},
				{
					label: __("Sub-Item Prices"),
					condition: (node) => (node.data || {}).kind === "machine",
					click: (node) => frappe.set_route("List", "Quotation Sub Item Master", { main_item_code: node.data.title }),
				},
			],
		});
	}

	function add_style() {
		if (document.getElementById("manav-sub-tree-style")) return;
		$(`<style id="manav-sub-tree-style">
			.manav-sub-tree { padding: 12px 0; }
			.manav-sub-tree .tree-label { white-space: normal; }
			.manav-sub-tree .manav-tree-name { color: var(--text-muted); }
			.manav-sub-tree .manav-tree-count,
			.manav-sub-tree .manav-tree-type {
				display: inline-block;
				font-size: var(--text-xs);
				padding: 0 6px;
				border-radius: 8px;
				background: var(--bg-blue);
				color: var(--text-on-blue);
			}
			.manav-sub-tree .manav-tree-type { background: var(--bg-gray); color: var(--text-color); }
			.manav-sub-tree .manav-tree-code { font-weight: 600; }
			.manav-sub-tree .manav-tree-rate { font-variant-numeric: tabular-nums; margin-left: 4px; }
		</style>`).appendTo("head");
	}

	// opened with a search (e.g. from an Item): fill it in; otherwise the whole tree
	page.wrapper.on("show", () => {
		const options = frappe.route_options || {};
		frappe.route_options = null;
		if (options.search) {
			search.set_value(options.search);
			build(options.search);
		}
	});
	build("");
};
