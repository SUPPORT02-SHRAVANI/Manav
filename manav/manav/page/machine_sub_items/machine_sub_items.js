// Page "Machine Sub-Items" (/desk/machine-sub-items): the machines and their sub-items. On the
// left, every machine with sub-items, grouped by Item Group, with a search box and group filter;
// on the right, the chosen machine's sub-items as a table (code, description, type, qty, rate and
// an Active switch). Opened from the Manav sidebar ("Sub-Items"), the Items list ("Sub-Items Tree"
// button, public/js/item_list.js) and the Item form ("Open full tree", public/js/item.js).
//
// Data: manav.manav.item_tree.get_machines (all machines in one call, searched in the browser),
// get_sub_items (one machine's rows) and set_sub_item_active (the switch). A "search" route option
// (frappe.route_options) fills the search box and opens the machine of that code.
//
// Created: 2026-10-19.
//
// CHANGE NOTE
// Date: 2026-11-04
// Change: Redesigned: a machine list and a sub-items table in place of the tree (frappe.ui.Tree),
// with counts, group filter chips, a filter on the sub-items and the Active switch.
// Reason: The user asked to make the page nicer and to give it its own sidebar item.

frappe.pages["machine-sub-items"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Machine Sub-Items"),
		single_column: true,
	});
	page.add_inner_button(__("Item List"), () => frappe.set_route("List", "Item"));
	page.add_inner_button(__("Sub Item Master"), () => frappe.set_route("List", "Quotation Sub Item Master"));

	const esc = frappe.utils.escape_html;
	const state = { machines: [], search: "", group: "", selected: null, sub_filter: "", rows: [], can_write: false };
	add_style();

	const $root = $(`<div class="msi">
		<div class="msi-top">
			<label class="msi-search">
				${frappe.utils.icon("search", "sm")}
				<input type="search" class="msi-search-input" placeholder="${esc(__("Find a machine by code or name"))}">
			</label>
			<div class="msi-stats"></div>
		</div>
		<div class="msi-groups"></div>
		<div class="msi-body">
			<div class="msi-list"></div>
			<div class="msi-detail"></div>
		</div>
	</div>`).appendTo(page.main);
	const $search = $root.find(".msi-search-input");
	const $stats = $root.find(".msi-stats");
	const $groups = $root.find(".msi-groups");
	const $list = $root.find(".msi-list");
	const $detail = $root.find(".msi-detail");

	$search.on("input", frappe.utils.debounce(() => {
		state.search = ($search.val() || "").trim().toLowerCase();
		render_list();
	}, 150));

	// The machines that match the search box and the chosen group.
	function visible_machines() {
		return state.machines.filter((m) => {
			if (state.group && m.group !== state.group) return false;
			if (!state.search) return true;
			return m.code.toLowerCase().includes(state.search) || (m.name || "").toLowerCase().includes(state.search);
		});
	}

	function render_stats() {
		const total = state.machines.reduce((sum, m) => sum + m.count, 0);
		const active = state.machines.reduce((sum, m) => sum + m.active, 0);
		const stat = (value, label) => `<div class="msi-stat"><b>${esc(format_number(value, null, 0))}</b><span>${esc(label)}</span></div>`;
		$stats.html(stat(state.machines.length, __("Machines")) + stat(total, __("Sub-items")) + stat(active, __("Active")));
	}

	// One chip per Item Group, plus "All"; a click filters the list to that group.
	function render_groups() {
		const counts = {};
		state.machines.forEach((m) => (counts[m.group] = (counts[m.group] || 0) + 1));
		const chip = (value, label, count) =>
			`<button type="button" class="msi-chip ${state.group === value ? "active" : ""}" data-group="${esc(value)}">
				${esc(label)} <span>${count}</span></button>`;
		$groups.html(
			chip("", __("All"), state.machines.length) +
				Object.keys(counts)
					.sort()
					.map((group) => chip(group, group, counts[group]))
					.join("")
		);
		$groups.find(".msi-chip").on("click", function () {
			state.group = $(this).attr("data-group");
			render_groups();
			render_list();
		});
	}

	function render_list() {
		const shown = visible_machines();
		if (!shown.length) {
			$list.html(`<div class="msi-empty">${esc(__("No machine matches."))}</div>`);
			return;
		}
		let html = "";
		let group = null;
		shown.forEach((m) => {
			if (m.group !== group) {
				group = m.group;
				html += `<div class="msi-group-head">${esc(group)}</div>`;
			}
			html += `<button type="button" class="msi-machine ${state.selected === m.code ? "active" : ""}" data-code="${esc(m.code)}">
				<span class="msi-machine-text">
					<span class="msi-machine-code">${esc(m.code)}</span>
					${m.name && m.name !== m.code ? `<span class="msi-machine-name">${esc(m.name)}</span>` : ""}
				</span>
				<span class="msi-count" title="${esc(__("{0} of {1} sub-items active", [m.active, m.count]))}">${m.count}</span>
			</button>`;
		});
		$list.html(html);
		$list.find(".msi-machine").on("click", function () {
			select($(this).attr("data-code"));
		});
		// with one machine found, open it at once
		if (shown.length === 1 && state.selected !== shown[0].code) select(shown[0].code);
	}

	function render_placeholder() {
		$detail.html(`<div class="msi-placeholder">
			${frappe.utils.icon("list-tree", "lg")}
			<div>${esc(__("Choose a machine to see its sub-items"))}</div>
		</div>`);
	}

	function select(code) {
		state.selected = code;
		state.sub_filter = "";
		$list.find(".msi-machine").each(function () {
			$(this).toggleClass("active", $(this).attr("data-code") === code);
		});
		$detail.html(`<div class="msi-placeholder">${esc(__("Loading…"))}</div>`);
		frappe.call({ method: "manav.manav.item_tree.get_sub_items", args: { item_code: code } }).then((r) => {
			if (state.selected !== code) return; // another machine was chosen meanwhile
			const data = r.message || {};
			state.rows = data.rows || [];
			state.can_write = !!data.can_write;
			render_detail();
		});
	}

	function render_detail() {
		const m = state.machines.find((machine) => machine.code === state.selected) || { code: state.selected };
		const active = state.rows.filter((row) => cint(row.active)).length;
		$detail.html(`<div class="msi-detail-head">
				<div>
					<div class="msi-detail-code">${esc(m.code)}
						${m.group ? `<span class="msi-tag">${esc(m.group)}</span>` : ""}</div>
					${m.name ? `<div class="msi-detail-name">${esc(m.name)}</div>` : ""}
				</div>
				<div class="msi-detail-actions">
					<button type="button" class="btn btn-xs btn-default msi-open-item">${esc(__("Open Item"))}</button>
					<button type="button" class="btn btn-xs btn-default msi-open-prices">${esc(__("Sub-Item Prices"))}</button>
				</div>
			</div>
			<div class="msi-detail-bar">
				<span class="msi-pill">${esc(__("{0} sub-items", [state.rows.length]))}</span>
				<span class="msi-pill msi-pill-green">${esc(__("{0} active", [active]))}</span>
				${state.rows.length - active ? `<span class="msi-pill msi-pill-gray">${esc(__("{0} inactive", [state.rows.length - active]))}</span>` : ""}
				<input type="search" class="form-control input-xs msi-sub-filter" placeholder="${esc(__("Filter sub-items"))}">
			</div>
			<div class="msi-table-wrap"></div>`);
		$detail.find(".msi-open-item").on("click", () => frappe.set_route("Form", "Item", m.code));
		$detail.find(".msi-open-prices").on("click", () =>
			frappe.set_route("List", "Quotation Sub Item Master", { main_item_code: m.code })
		);
		$detail.find(".msi-sub-filter").on("input", function () {
			state.sub_filter = ($(this).val() || "").trim().toLowerCase();
			render_rows();
		});
		render_rows();
	}

	function render_rows() {
		const $wrap = $detail.find(".msi-table-wrap");
		const rows = state.rows.filter((row) => {
			if (!state.sub_filter) return true;
			const text = `${row.sub_item_code || ""} ${row.item_description || ""} ${row.sub_item_type || ""}`.toLowerCase();
			return text.includes(state.sub_filter);
		});
		if (!rows.length) {
			$wrap.html(`<div class="msi-empty">${esc(state.rows.length ? __("No sub-item matches.") : __("No sub-items yet."))}</div>`);
			return;
		}
		const body = rows
			.map((row) => {
				const on = cint(row.active);
				const code = row.sub_item_code || __("(no code)");
				return `<tr class="${on ? "" : "msi-off"}">
					<td class="msi-sr">${esc(String(row.sr_no || ""))}</td>
					<td><a href="/app/item/${encodeURIComponent(row.sub_item_code || "")}" class="msi-sub-code">${esc(code)}</a></td>
					<td class="msi-desc">${esc((row.item_description || "").replace(/\s+/g, " ").trim())}</td>
					<td>${row.sub_item_type ? `<span class="msi-type">${esc(row.sub_item_type)}</span>` : ""}</td>
					<td class="msi-num">${esc(format_number(flt(row.qty), null, 0))}${row.uom ? ` <span class="text-muted">${esc(row.uom)}</span>` : ""}</td>
					<td class="msi-num">${esc(format_number(flt(row.rate), null, 2))}</td>
					<td class="text-center">
						<label class="msi-switch" title="${esc(__("Active: offered on new quotations"))}">
							<input type="checkbox" data-name="${esc(row.name)}" ${on ? "checked" : ""} ${state.can_write ? "" : "disabled"}>
							<span></span>
						</label>
					</td>
				</tr>`;
			})
			.join("");
		$wrap.html(`<table class="msi-table">
			<thead><tr><th>${__("Sr")}</th><th>${__("Sub-Item")}</th><th>${__("Description")}</th><th>${__("Type")}</th>
			<th class="msi-num">${__("Qty")}</th><th class="msi-num">${__("Rate")}</th><th class="text-center">${__("Active")}</th></tr></thead>
			<tbody>${body}</tbody></table>`);
		$wrap.find("input[type=checkbox][data-name]").on("change", function () {
			const $box = $(this);
			const name = $box.attr("data-name");
			const on = $box.prop("checked") ? 1 : 0;
			frappe
				.call({ method: "manav.manav.item_tree.set_sub_item_active", args: { name, active: on } })
				.then(() => {
					// keep the row, the machine's count and the totals in step without reloading
					const row = state.rows.find((r) => r.name === name);
					if (row) row.active = on;
					const machine = state.machines.find((m) => m.code === state.selected);
					if (machine) machine.active += on ? 1 : -1;
					render_stats();
					render_detail();
				})
				// not saved (e.g. no permission): put the switch back
				.catch(() => $box.prop("checked", !on));
		});
	}

	function load() {
		$list.html(`<div class="msi-empty">${esc(__("Loading…"))}</div>`);
		render_placeholder();
		return frappe.call({ method: "manav.manav.item_tree.get_machines" }).then((r) => {
			state.machines = r.message || [];
			render_stats();
			render_groups();
			render_list();
		});
	}

	// opened with a search (e.g. from an Item): fill it in and open that machine when found
	page.wrapper.on("show", () => {
		const options = frappe.route_options || {};
		frappe.route_options = null;
		if (!options.search) return;
		const apply = () => {
			$search.val(options.search);
			state.search = String(options.search).trim().toLowerCase();
			state.group = "";
			render_groups();
			render_list();
			const exact = state.machines.find((m) => m.code.toLowerCase() === state.search);
			if (exact && state.selected !== exact.code) select(exact.code);
		};
		loaded.then(apply);
	});
	const loaded = load();

	function add_style() {
		if (document.getElementById("manav-msi-style")) return;
		$(`<style id="manav-msi-style">
			.msi { padding: 16px 0 24px; }
			.msi-top { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
			.msi-search {
				flex: 1 1 320px; max-width: 520px; display: flex; align-items: center; gap: 8px; margin: 0;
				padding: 0 12px; height: 36px; border-radius: 8px; background: var(--control-bg);
				border: 1px solid var(--border-color);
			}
			.msi-search:focus-within { border-color: var(--blue-400); box-shadow: 0 0 0 2px var(--blue-100); }
			.msi-search .icon { color: var(--text-muted); flex: none; }
			.msi-search input { border: 0; outline: 0; background: transparent; width: 100%; font-size: var(--text-base); color: var(--text-color); }
			.msi-stats { display: flex; gap: 8px; }
			.msi-stat {
				display: flex; flex-direction: column; min-width: 88px; padding: 6px 12px; border-radius: 8px;
				background: var(--card-bg); border: 1px solid var(--border-color);
			}
			.msi-stat b { font-size: var(--text-lg); color: var(--heading-color, var(--text-color)); font-variant-numeric: tabular-nums; }
			.msi-stat span { font-size: var(--text-xs); color: var(--text-muted); }
			.msi-groups { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0; }
			.msi-chip {
				border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color);
				border-radius: 999px; padding: 3px 10px; font-size: var(--text-sm); cursor: pointer;
			}
			.msi-chip span { color: var(--text-muted); margin-left: 2px; }
			.msi-chip:hover { background: var(--bg-gray); }
			.msi-chip.active { background: var(--blue-600); border-color: var(--blue-600); color: #fff; }
			.msi-chip.active span { color: rgba(255, 255, 255, 0.8); }
			.msi-body { display: grid; grid-template-columns: minmax(260px, 340px) 1fr; gap: 16px; align-items: start; }
			.msi-list, .msi-detail {
				background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 10px;
			}
			.msi-list { max-height: calc(100vh - 260px); overflow: auto; padding: 6px; position: sticky; top: 80px; }
			.msi-group-head {
				font-size: var(--text-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
				color: var(--text-muted); padding: 10px 8px 4px;
			}
			.msi-machine {
				display: flex; width: 100%; gap: 8px; align-items: center; justify-content: space-between; text-align: left;
				border: 0; border-left: 3px solid transparent; background: transparent; border-radius: 6px; padding: 7px 8px; cursor: pointer;
			}
			.msi-machine:hover { background: var(--bg-light-gray, var(--bg-gray)); }
			.msi-machine.active { background: var(--blue-50, var(--bg-blue)); border-left-color: var(--blue-600); }
			.msi-machine-text { display: flex; flex-direction: column; min-width: 0; }
			.msi-machine-code { font-weight: 600; color: var(--text-color); }
			.msi-machine.active .msi-machine-code { color: var(--blue-600); }
			.msi-machine-name {
				font-size: var(--text-xs); color: var(--text-muted); overflow: hidden; display: -webkit-box;
				-webkit-line-clamp: 2; -webkit-box-orient: vertical;
			}
			.msi-count {
				flex: none; font-size: var(--text-xs); font-weight: 600; padding: 1px 8px; border-radius: 999px;
				background: var(--blue-100); color: var(--blue-700, var(--blue-600)); font-variant-numeric: tabular-nums;
			}
			.msi-detail { padding: 16px; min-height: 320px; }
			.msi-placeholder {
				display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
				min-height: 280px; color: var(--text-muted);
			}
			.msi-detail-head { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: flex-start; }
			.msi-detail-code { font-size: var(--text-2xl, 20px); font-weight: 700; color: var(--heading-color, var(--text-color)); }
			.msi-detail-name { color: var(--blue-600); font-weight: 600; margin-top: 2px; }
			.msi-detail-actions .btn + .btn { margin-left: 6px; }
			.msi-tag {
				vertical-align: middle; margin-left: 8px; font-size: var(--text-xs); font-weight: 500; padding: 2px 8px;
				border-radius: 999px; background: var(--bg-gray); color: var(--text-muted);
			}
			.msi-detail-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 14px 0 10px; }
			.msi-pill { font-size: var(--text-xs); font-weight: 600; padding: 2px 10px; border-radius: 999px; background: var(--blue-100); color: var(--blue-700, var(--blue-600)); }
			.msi-pill-green { background: var(--green-100); color: var(--green-700, var(--green-600)); }
			.msi-pill-gray { background: var(--bg-gray); color: var(--text-muted); }
			.msi-sub-filter { margin-left: auto; max-width: 220px; }
			.msi-table-wrap { overflow: auto; max-height: calc(100vh - 330px); border: 1px solid var(--border-color); border-radius: 8px; }
			.msi-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
			.msi-table th {
				position: sticky; top: 0; z-index: 1; background: var(--subtle-fg, var(--bg-light-gray)); color: var(--text-muted);
				font-weight: 600; font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.03em;
				padding: 8px 10px; white-space: nowrap; border-bottom: 1px solid var(--border-color);
			}
			.msi-table td { padding: 7px 10px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
			.msi-table tbody tr:last-child td { border-bottom: 0; }
			.msi-table tbody tr:hover td { background: var(--bg-light-gray, var(--bg-gray)); }
			.msi-table tr.msi-off td { opacity: 0.5; }
			.msi-table .msi-sr { width: 44px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
			.msi-table .msi-sub-code { font-weight: 600; white-space: nowrap; }
			.msi-table .msi-desc { color: var(--text-muted); min-width: 220px; }
			.msi-table .msi-num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
			.msi-type { display: inline-block; font-size: var(--text-xs); padding: 1px 8px; border-radius: 999px; background: var(--bg-gray); white-space: nowrap; }
			.msi-switch { position: relative; display: inline-block; width: 30px; height: 17px; margin: 0; vertical-align: middle; }
			.msi-switch input { opacity: 0; width: 0; height: 0; }
			.msi-switch span { position: absolute; inset: 0; border-radius: 999px; background: var(--gray-300, #ccc); transition: background 0.15s; cursor: pointer; }
			.msi-switch span::before {
				content: ""; position: absolute; width: 13px; height: 13px; left: 2px; top: 2px; border-radius: 50%;
				background: #fff; transition: transform 0.15s;
			}
			.msi-switch input:checked + span { background: var(--green-500, #38a169); }
			.msi-switch input:checked + span::before { transform: translateX(13px); }
			.msi-switch input:disabled + span { cursor: not-allowed; opacity: 0.6; }
			.msi-empty { padding: 24px; text-align: center; color: var(--text-muted); }
			@media (max-width: 767px) {
				.msi-body { grid-template-columns: 1fr; }
				.msi-list { position: static; max-height: 320px; }
				.msi-sub-filter { margin-left: 0; max-width: none; flex: 1 1 100%; }
			}
		</style>`).appendTo("head");
	}
};
