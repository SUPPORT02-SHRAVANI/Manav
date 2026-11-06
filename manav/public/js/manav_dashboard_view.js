// The Manav dashboard view, shown in the desk page "Manav Dashboard" (/desk/manav-dashboard,
// manav/manav/page/manav_dashboard). Fetches the figures from manav.manav.dashboard.get_dashboard_data for the chosen
// date range and draws: number tiles, a column chart per month (with hover tooltip and a table
// view) and horizontal bar lists for categories. Plain DOM/SVG, no chart library, so nothing
// extra has to be built or loaded from the internet.
//
// Created: 2026-10-17.
//
// CHANGE NOTE
// Date: 2026-10-19
// Change: The sections are tabs (showTab): My Dashboard for everyone (my_sales: the reader's own
// quotations), and Team Performance, HR & Attendance, Payroll only when the API returns their
// data (management). The sales tiles/charts are drawn by one function for both the reader's own
// and the team's quotations. The chosen tab is remembered in this browser.
// Reason: The user asked for tabs instead of scrolling, for everyone to see their own dashboard,
// and for only the admin, Milind and Naveen to see all employees' performance.
//
// CHANGE NOTE
// Date: 2026-10-22
// Change: Moved from manav/www/manav-dashboard.js and made a view for the desk: mount(root) writes
// the dashboard's markup (formerly manav/www/manav-dashboard.html) into the desk page and runs the
// code below on it. The web page /manav-dashboard now redirects to the desk page.
// Reason: The user asked that the dashboard opens inside the Frappe desk, not as a web page, and
// that every sales employee sees their own figures there.
//
// CHANGE NOTE
// Date: 2026-11-04
// Change: The look of the Lead Dashboard (styles in public/css/manav_dashboard.css): a greeting
// header holding the date filters, pill tabs, tiles with a coloured icon (a click opens the
// matching Quotation list within the dates), bar rows with hover (a status or customer row opens
// its quotations) and a loading shimmer. The data and the tabs are unchanged.
// Reason: The user asked for the quotation dashboard to match the Leads page and the Lead Dashboard.

window.manav_dashboard_view = window.manav_dashboard_view || {};
window.manav_dashboard_view.mount = function (root) {
	const API = "/api/method/manav.manav.dashboard.get_dashboard_data";
	const t = (text) => (window.__ ? window.__(text) : text);
	root.innerHTML = manav_dashboard_markup(t);
	// element by id inside this view (the ids are unique on the page: one dashboard per page)
	const $ = (id) => root.querySelector(`#${id}`);
	let currency = "INR";

	// ---------- formatting ----------
	const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
	const fmtInt = (n) => Number(n || 0).toLocaleString("en-IN");
	const fmtMoney = (n) => Number(n || 0).toLocaleString("en-IN", { style: "currency", currency, maximumFractionDigits: 0 });
	// short Indian form for axes and tiles: 12.5 L, 1.2 Cr
	function fmtShort(n) {
		const v = Math.abs(Number(n || 0));
		const sign = n < 0 ? "-" : "";
		if (v >= 1e7) return sign + (v / 1e7).toFixed(v >= 1e8 ? 0 : 1) + " Cr";
		if (v >= 1e5) return sign + (v / 1e5).toFixed(v >= 1e6 ? 0 : 1) + " L";
		if (v >= 1e3) return sign + (v / 1e3).toFixed(0) + " K";
		return sign + v.toFixed(0);
	}
	const monthName = (key) => {
		const [y, m] = key.split("-").map(Number);
		return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "short" }) + " " + String(y).slice(2);
	};
	const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

	// ---------- tooltip ----------
	const tip = $("md-tooltip");
	function showTip(html, ev) {
		tip.innerHTML = html;
		tip.hidden = false;
		const pad = 12, w = tip.offsetWidth, h = tip.offsetHeight;
		let x = ev.clientX + pad, y = ev.clientY - h - pad;
		if (x + w > window.innerWidth - 8) x = ev.clientX - w - pad;
		if (y < 8) y = ev.clientY + pad;
		tip.style.left = x + "px";
		tip.style.top = y + "px";
	}
	const hideTip = () => (tip.hidden = true);

	// ---------- pieces ----------
	// 2026-11-04: small line icons for the tiles, as on the Lead Dashboard (stroke = currentColor)
	const ICONS = {
		file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
		money: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
		check: '<path d="M20 6 9 17l-5-5"/>',
		clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		x: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
		trend: '<path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
		users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
		calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
		alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
	};
	const icon = (name) =>
		`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.file}</svg>`;

	// 2026-11-04: tiles as on the Lead Dashboard: label and a coloured icon (i.ic, i.c) on top, the
	// large figure, a sub-line; with i.go a click opens the matching list.
	function tiles(el, items) {
		el.innerHTML = items
			.map(
				(i, n) => `<div class="md-tile${i.go ? " md-go" : ""}" data-n="${n}" style="--c:${esc(i.c || "#2a78d6")}">
					<div class="md-tile-top"><span class="md-tile-label">${esc(i.label)}</span><span class="md-tile-ic">${icon(i.ic)}</span></div>
					<div class="md-tile-value">${esc(i.value)}</div>${i.sub ? `<div class="md-tile-sub">${esc(i.sub)}</div>` : ""}</div>`
			)
			.join("");
		el.querySelectorAll(".md-tile.md-go").forEach((tile) => tile.addEventListener("click", () => items[Number(tile.dataset.n)].go()));
	}

	// Horizontal bars: label | bar scaled to the largest value | value text. 2026-11-04: one row
	// element per entry (hover, as on the Lead Dashboard); with go(row) a click opens its list.
	function barList(el, rows, fmt, sub, go) {
		if (!rows || !rows.length) {
			el.innerHTML = `<div class="md-empty">${esc(t("No data in this range"))}</div>`;
			return;
		}
		const max = Math.max(...rows.map((r) => r.value), 0) || 1;
		el.innerHTML =
			`<div class="md-bars">` +
			rows
				.map(
					(r, n) =>
						`<div class="md-bar-row${go ? " md-go" : ""}" data-n="${n}">` +
						`<div class="md-bar-label" title="${esc(r.label)}">${esc(r.label)}</div>` +
						`<div class="md-bar-track"><div class="md-bar-fill" style="width:${((100 * r.value) / max).toFixed(1)}%"></div></div>` +
						`<div class="md-bar-value">${esc(fmt(r.value))}${sub ? ` <span class="md-muted">${esc(sub(r))}</span>` : ""}</div>` +
						`</div>`
				)
				.join("") +
			`</div>`;
		if (go) el.querySelectorAll(".md-bar-row").forEach((row) => row.addEventListener("click", () => go(rows[Number(row.dataset.n)])));
	}

	// 2026-11-04: open a list with filters (the tiles and bar rows), within the chosen dates
	function openList(doctype, filters, date_field) {
		if (!window.frappe || !frappe.set_route) return;
		const options = Object.assign({}, filters || {});
		if (date_field) options[date_field] = ["between", [$("md-from").value, $("md-to").value]];
		frappe.route_options = options;
		frappe.set_route("List", doctype);
	}
	const openQuotations = (filters) => openList("Quotation", filters, "transaction_date");

	// Column chart of one measure per month; hover shows the month's details.
	function columnChart(el, rows, valueOf, tipOf) {
		const W = 760, H = 240, left = 52, right = 8, top = 16, bottom = 28;
		const values = rows.map(valueOf);
		const max = niceMax(Math.max(...values, 0));
		const plotW = W - left - right, plotH = H - top - bottom;
		const step = plotW / Math.max(rows.length, 1);
		const barW = Math.max(Math.min(step * 0.6, 42), 3);
		const y = (v) => top + plotH - (plotH * v) / max;
		let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(t("Monthly chart"))}">`;
		for (let i = 0; i <= 4; i++) {
			const v = (max * i) / 4, yy = y(v);
			svg += `<line class="md-gridline" x1="${left}" x2="${W - right}" y1="${yy}" y2="${yy}"/>`;
			svg += `<text class="md-axis-text" x="${left - 6}" y="${yy + 4}" text-anchor="end">${esc(fmtShort(v))}</text>`;
		}
		const labelEvery = Math.ceil(rows.length / 12);
		const peak = values.indexOf(Math.max(...values));
		rows.forEach((r, i) => {
			const v = values[i], x = left + step * i + (step - barW) / 2, yy = y(v), h = top + plotH - yy;
			svg += `<g class="md-col" data-i="${i}">`;
			svg += `<rect class="md-hit" x="${left + step * i}" y="${top}" width="${step}" height="${plotH}"/>`;
			// rounded data end at the top, square at the baseline
			if (h > 0) {
				const r4 = Math.min(4, barW / 2, h);
				svg += `<path class="md-bar" d="M${x},${top + plotH} V${yy + r4} Q${x},${yy} ${x + r4},${yy} H${x + barW - r4} Q${x + barW},${yy} ${x + barW},${yy + r4} V${top + plotH} Z"/>`;
			}
			// one direct label: the highest month
			if (i === peak && v > 0) svg += `<text class="md-label" x="${x + barW / 2}" y="${yy - 4}" text-anchor="middle">${esc(fmtShort(v))}</text>`;
			if (i % labelEvery === 0) svg += `<text class="md-axis-text" x="${left + step * i + step / 2}" y="${H - 8}" text-anchor="middle">${esc(monthName(r.month))}</text>`;
			svg += `</g>`;
		});
		svg += `</svg>`;
		el.innerHTML = svg;
		el.querySelectorAll(".md-col").forEach((g) => {
			const r = rows[Number(g.dataset.i)];
			g.addEventListener("mousemove", (ev) => showTip(tipOf(r), ev));
			g.addEventListener("mouseleave", hideTip);
		});
	}
	function niceMax(v) {
		if (v <= 0) return 1;
		const p = Math.pow(10, Math.floor(Math.log10(v)));
		for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
		return 10 * p;
	}
	function table(el, head, rows) {
		el.innerHTML = `<table class="md-table"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
			.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
			.join("")}</tbody></table>`;
	}

	// ---------- sections ----------
	// Sales tiles and charts into the elements md-<prefix>-...: "mine" (the reader's own
	// quotations, no sales engineer list) or "sales" (all quotations, with the sales engineers).
	function renderSales(s, prefix) {
		if (!s) return;
		const el = (part) => $(`md-${prefix}-${part}`);
		// 2026-11-04: each tile with its icon and colour; a click opens the quotations in the dates
		tiles(el("tiles"), [
			{ label: t("Quotations"), value: fmtInt(s.count), sub: t("drafts + submitted"), ic: "file", c: "#2a78d6", go: () => openQuotations({}) },
			{ label: t("Quoted value"), value: fmtShort(s.value), sub: fmtMoney(s.value), ic: "money", c: "#6250d6", go: () => openQuotations({}) },
			{ label: t("Won (ordered)"), value: fmtInt(s.won_count), sub: fmtMoney(s.won_value), ic: "check", c: "#1baf7a", go: () => openQuotations({ status: "Ordered" }) },
			{ label: t("Open / replied"), value: fmtInt(s.open_count), ic: "clock", c: "#eda100", go: () => openQuotations({ status: ["in", ["Open", "Replied"]] }) },
			{ label: t("Lost"), value: fmtInt(s.lost_count), ic: "x", c: "#e34948", go: () => openQuotations({ status: "Lost" }) },
			{ label: t("Conversion"), value: s.conversion == null ? "–" : s.conversion + "%", sub: t("won ÷ submitted"), ic: "trend", c: "#eb6834" },
		]);
		columnChart(el("month"), s.by_month, (r) => r.value, (r) => `<b>${esc(monthName(r.month))}</b>${esc(fmtMoney(r.value))}<br>${esc(fmtInt(r.count))} ${esc(t("quotations"))}`);
		table(el("month-table"), [t("Month"), t("Quotations"), t("Value")], s.by_month.map((r) => [monthName(r.month), fmtInt(r.count), fmtMoney(r.value)]));
		const countSub = (r) => `(${fmtInt(r.count)})`;
		// 2026-11-04: a status or customer row opens its quotations ("Others (n)" rows do not)
		const real = (go) => (r) => (/^Others \(\d+\)$/.test(r.label) ? null : go(r));
		barList(el("status"), s.by_status, fmtShort, countSub, real((r) => openQuotations({ status: r.label })));
		barList(el("principal"), s.by_principal, fmtShort, countSub);
		if (el("engineer")) barList(el("engineer"), s.by_engineer, fmtShort, countSub);
		barList(el("customer"), s.by_customer, fmtShort, countSub, real((r) => openQuotations({ customer_name: r.label })));
	}

	function renderHr(h) {
		if (!h) return;
		const today = (h.today && h.today.by_status) || {};
		// 2026-11-04: icons and colours as on the Lead Dashboard
		const items = [{ label: t("Active employees"), value: fmtInt(h.active), ic: "users", c: "#2a78d6" }];
		if (h.today) {
			items.push(
				{ label: t("Present today"), value: fmtInt((today["Present"] || 0) + (today["Work From Home"] || 0)), sub: today["Work From Home"] ? `${fmtInt(today["Work From Home"])} ${t("work from home")}` : "", ic: "check", c: "#1baf7a" },
				{ label: t("On leave today"), value: fmtInt(today["On Leave"] || 0), ic: "calendar", c: "#6250d6" },
				{ label: t("Absent today"), value: fmtInt((today["Absent"] || 0) + (today["Half Day"] || 0)), sub: today["Half Day"] ? `${fmtInt(today["Half Day"])} ${t("half day")}` : "", ic: "x", c: "#e34948" },
				{ label: t("Not marked today"), value: fmtInt(h.today.not_marked), ic: "alert", c: "#eda100" }
			);
		}
		if (h.open_leaves != null) items.push({ label: t("Leave applications to approve"), value: fmtInt(h.open_leaves), ic: "clock", c: "#eb6834" });
		tiles($("md-hr-tiles"), items);
		if (h.month) {
			$("md-hr-month-title").textContent = `${t("Attendance in")} ${monthName(h.month.month)} (${t("records")})`;
			const order = ["Present", "Work From Home", "Half Day", "On Leave", "Absent"];
			const rows = Object.entries(h.month.by_status)
				.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
				.map(([label, value]) => ({ label: t(label), value }));
			barList($("md-hr-month"), rows, fmtInt);
		} else {
			$("md-hr-month").innerHTML = `<div class="md-empty">${esc(t("No permission to read Attendance"))}</div>`;
		}
		barList($("md-hr-department"), h.by_department, fmtInt);
	}

	function renderPayroll(p) {
		if (!p) return;
		tiles($("md-pay-tiles"), [
			{ label: t("Salary slips (submitted)"), value: fmtInt(p.slips), sub: p.draft_slips ? `${fmtInt(p.draft_slips)} ${t("still draft")}` : "", ic: "file", c: "#2a78d6" },
			{ label: t("Gross pay"), value: fmtShort(p.gross), sub: fmtMoney(p.gross), ic: "money", c: "#6250d6" },
			{ label: t("Net pay"), value: fmtShort(p.net), sub: fmtMoney(p.net), ic: "check", c: "#1baf7a" },
		]);
		columnChart(
			$("md-pay-month"),
			p.by_month,
			(r) => r.net,
			(r) => `<b>${esc(monthName(r.month))}</b>${esc(t("Gross"))}: ${esc(fmtMoney(r.gross))}<br>${esc(t("Deductions"))}: ${esc(fmtMoney(r.deduction))}<br>${esc(t("Net"))}: ${esc(fmtMoney(r.net))}<br>${esc(fmtInt(r.count))} ${esc(t("slips"))}`
		);
		table($("md-pay-month-table"), [t("Month"), t("Slips"), t("Gross"), t("Deductions"), t("Net")], p.by_month.map((r) => [monthName(r.month), fmtInt(r.count), fmtMoney(r.gross), fmtMoney(r.deduction), fmtMoney(r.net)]));
		$("md-pay-department-title").textContent = p.latest_month ? `${t("Gross pay by department")} – ${monthName(p.latest_month)}` : t("Gross pay by department");
		barList($("md-pay-department"), p.by_department, fmtShort, (r) => `(${fmtInt(r.count)})`);
	}

	// ---------- tabs ----------
	// Only one section is shown at a time. A tab is shown only when its data came back from the
	// server (the server leaves out what the reader may not see). The chosen tab is kept in this
	// browser's storage, which may be unavailable (private window): then the first tab is used.
	const TAB_KEY = "manav-dashboard-tab";
	const tabs = Array.from(root.querySelectorAll("#md-tabs [role=tab]"));
	function showTab(panelId) {
		tabs.forEach((tab) => {
			const on = tab.dataset.panel === panelId;
			tab.setAttribute("aria-selected", on ? "true" : "false");
			tab.tabIndex = on ? 0 : -1;
			$(tab.dataset.panel).hidden = !on;
		});
		try {
			localStorage.setItem(TAB_KEY, panelId);
		} catch (e) {
			/* storage blocked: the choice is simply not remembered */
		}
	}
	function setTabs(available) {
		tabs.forEach((tab) => (tab.hidden = !available[tab.dataset.panel]));
		const visible = tabs.filter((tab) => !tab.hidden).map((tab) => tab.dataset.panel);
		$("md-tabs").hidden = visible.length < 2;
		let wanted = null;
		try {
			wanted = localStorage.getItem(TAB_KEY);
		} catch (e) {
			wanted = null;
		}
		const current = tabs.find((tab) => tab.getAttribute("aria-selected") === "true");
		const pick = [current && current.dataset.panel, wanted, visible[0]].find((id) => id && visible.includes(id));
		if (pick) showTab(pick);
		else tabs.forEach((tab) => ($(tab.dataset.panel).hidden = true));
	}
	tabs.forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.panel)));
	// arrow keys move between the visible tabs (WAI-ARIA tabs pattern)
	$("md-tabs").addEventListener("keydown", (ev) => {
		if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
		const visible = tabs.filter((tab) => !tab.hidden);
		const i = visible.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
		const next = visible[(i + (ev.key === "ArrowRight" ? 1 : visible.length - 1)) % visible.length];
		if (next) {
			showTab(next.dataset.panel);
			next.focus();
		}
	});

	// ---------- loading ----------
	const status = $("md-status");
	// 2026-11-04: a greeting, as on the Lead Dashboard
	(() => {
		const h = new Date().getHours();
		const part = h < 12 ? t("Good morning") : h < 17 ? t("Good afternoon") : t("Good evening");
		const boot = window.frappe && frappe.boot && frappe.boot.user;
		const name = (boot && boot.first_name) || (window.frappe && frappe.session && frappe.session.user_fullname) || "";
		$("md-hello").textContent = name ? `${part}, ${name}` : part;
	})();
	const skeleton = status.innerHTML;
	async function load() {
		const from = $("md-from").value, to = $("md-to").value;
		status.innerHTML = skeleton;
		status.classList.remove("md-error");
		status.hidden = false;
		try {
			const res = await fetch(`${API}?from_date=${encodeURIComponent(from)}&to_date=${encodeURIComponent(to)}`, {
				headers: { Accept: "application/json" },
				credentials: "same-origin",
			});
			const body = await res.json();
			if (!res.ok) throw new Error(serverMessage(body) || res.statusText);
			const d = body.message;
			currency = d.currency || "INR";
			$("md-from").value = d.from_date;
			$("md-to").value = d.to_date;
			root.querySelectorAll("[data-unit]").forEach((e) => (e.textContent = `(${currency})`));
			$("md-range-note").textContent = `${d.user_name ? d.user_name + " · " : ""}${d.from_date} → ${d.to_date} · ${t("amounts in")} ${currency}`;
			renderSales(d.my_sales, "mine");
			renderSales(d.sales, "sales");
			renderHr(d.hr);
			renderPayroll(d.payroll);
			setTabs({ "md-mine": !!d.my_sales, "md-sales": !!d.sales, "md-hr": !!d.hr, "md-payroll": !!d.payroll });
			const none = !d.my_sales && !d.sales && !d.hr && !d.payroll;
			status.textContent = none ? t("You have no permission to see any section of this dashboard.") : "";
			status.hidden = !none;
		} catch (e) {
			status.textContent = `${t("Could not load the dashboard")}: ${e.message}`;
			status.classList.add("md-error");
		}
	}
	// Frappe returns errors in _server_messages (a JSON list of JSON strings)
	function serverMessage(body) {
		try {
			return JSON.parse(JSON.parse(body._server_messages)[0]).message.replace(/<[^>]+>/g, "");
		} catch (e) {
			return body.exception || "";
		}
	}

	$("md-filters").addEventListener("submit", (ev) => {
		ev.preventDefault();
		load();
	});
	root.querySelectorAll(".md-quick button").forEach((b) =>
		b.addEventListener("click", () => {
			const end = new Date();
			const start = b.dataset.ytd ? new Date(end.getFullYear(), 0, 1) : new Date(end.getFullYear(), end.getMonth() - Number(b.dataset.months) + 1, 1);
			$("md-from").value = iso(start);
			$("md-to").value = iso(end);
			load();
		})
	);
	load();
};

// The dashboard's markup (was manav/www/manav-dashboard.html until 2026-10-22): one tab per
// section; the script shows only the tabs whose data came back. `t` translates a text.
function manav_dashboard_markup(t) {
	return `
<div class="md-root" id="md-root">
	<header class="md-head">
		<div>
			<h2 class="md-hello" id="md-hello">${t("Quotation Dashboard")}</h2>
			<p class="md-muted" id="md-range-note"></p>
		</div>
		<form class="md-filters" id="md-filters">
			<label>${t("From")} <input type="date" name="from_date" id="md-from"></label>
			<label>${t("To")} <input type="date" name="to_date" id="md-to"></label>
			<div class="md-quick" role="group" aria-label="${t("Quick ranges")}">
				<button type="button" data-months="3">3M</button>
				<button type="button" data-months="6">6M</button>
				<button type="button" data-months="12">12M</button>
				<button type="button" data-ytd="1">${t("This year")}</button>
			</div>
			<button type="submit" class="md-apply">${t("Apply")}</button>
		</form>
	</header>

	<nav class="md-tabs" role="tablist" id="md-tabs" aria-label="${t("Dashboard sections")}">
		<button type="button" role="tab" id="md-tab-mine" data-panel="md-mine" aria-controls="md-mine" aria-selected="true">${t("My Dashboard")}</button>
		<button type="button" role="tab" id="md-tab-sales" data-panel="md-sales" aria-controls="md-sales" aria-selected="false" hidden>${t("Team Performance")}</button>
		<button type="button" role="tab" id="md-tab-hr" data-panel="md-hr" aria-controls="md-hr" aria-selected="false" hidden>${t("HR & Attendance")}</button>
		<button type="button" role="tab" id="md-tab-payroll" data-panel="md-payroll" aria-controls="md-payroll" aria-selected="false" hidden>${t("Payroll")}</button>
	</nav>

	<div class="md-status" id="md-status">
		<div class="md-tiles"><div class="md-skel" style="height:118px"></div><div class="md-skel" style="height:118px"></div><div class="md-skel" style="height:118px"></div></div>
		<div class="md-skel" style="height:280px"></div>
	</div>

	<section class="md-section" id="md-mine" role="tabpanel" aria-labelledby="md-tab-mine" hidden>
		<h2>${t("My Quotations")}</h2>
		<!-- 2026-11-03: no "Account Manager" in the text (removed everywhere at the user's request) -->
		<p class="md-muted md-section-note">${t("Quotations you created or that are for your customers")}</p>
		<div class="md-tiles" id="md-mine-tiles"></div>
		<div class="md-card md-wide">
			<h3>${t("My quotation value by month")} <span class="md-muted" data-unit></span></h3>
			<div class="md-chart" id="md-mine-month"></div>
			<details><summary>${t("Show as table")}</summary><div id="md-mine-month-table"></div></details>
		</div>
		<div class="md-grid">
			<div class="md-card"><h3>${t("By status")}</h3><div id="md-mine-status"></div></div>
			<div class="md-card"><h3>${t("By principal")}</h3><div id="md-mine-principal"></div></div>
			<div class="md-card"><h3>${t("My top customers")}</h3><div id="md-mine-customer"></div></div>
		</div>
	</section>

	<section class="md-section" id="md-sales" role="tabpanel" aria-labelledby="md-tab-sales" hidden>
		<h2>${t("Team Performance: all quotations")}</h2>
		<div class="md-tiles" id="md-sales-tiles"></div>
		<div class="md-card md-wide">
			<h3>${t("Quotation value by month")} <span class="md-muted" data-unit></span></h3>
			<div class="md-chart" id="md-sales-month"></div>
			<details><summary>${t("Show as table")}</summary><div id="md-sales-month-table"></div></details>
		</div>
		<div class="md-grid">
			<div class="md-card"><h3>${t("By status")}</h3><div id="md-sales-status"></div></div>
			<div class="md-card"><h3>${t("By principal")}</h3><div id="md-sales-principal"></div></div>
			<div class="md-card"><h3>${t("By sales engineer")}</h3><div id="md-sales-engineer"></div></div>
			<div class="md-card"><h3>${t("Top customers")}</h3><div id="md-sales-customer"></div></div>
		</div>
	</section>

	<section class="md-section" id="md-hr" role="tabpanel" aria-labelledby="md-tab-hr" hidden>
		<h2>${t("HR & Attendance")}</h2>
		<div class="md-tiles" id="md-hr-tiles"></div>
		<div class="md-grid">
			<div class="md-card"><h3 id="md-hr-month-title">${t("Attendance this month")}</h3><div id="md-hr-month"></div></div>
			<div class="md-card"><h3>${t("Active employees by department")}</h3><div id="md-hr-department"></div></div>
		</div>
	</section>

	<section class="md-section" id="md-payroll" role="tabpanel" aria-labelledby="md-tab-payroll" hidden>
		<h2>${t("Payroll")}</h2>
		<div class="md-tiles" id="md-pay-tiles"></div>
		<div class="md-card md-wide">
			<h3>${t("Net pay by month")} <span class="md-muted" data-unit></span></h3>
			<div class="md-chart" id="md-pay-month"></div>
			<details><summary>${t("Show as table")}</summary><div id="md-pay-month-table"></div></details>
		</div>
		<div class="md-card">
			<h3 id="md-pay-department-title">${t("Gross pay by department")}</h3>
			<div id="md-pay-department"></div>
		</div>
	</section>

	<div class="md-tooltip" id="md-tooltip" role="tooltip" hidden></div>
</div>`;
}
