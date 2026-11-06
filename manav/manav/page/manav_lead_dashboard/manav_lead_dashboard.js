// File: manav_lead_dashboard.js
// Purpose: Lead Dashboard page - a greeting with the follow-ups that need action, four headline tiles,
//          the pipeline (active leads per stage), leads by status, visits per month, the leads needing
//          attention, a sales engineer leaderboard, and leads by source and location. Every figure opens
//          the matching list. Data: manav.manav.lead_api.get_dashboard.
// Created: 2026-10-29
// CHANGE NOTE
// Date: 2026-10-30
// Change: Rebuilt into a full dashboard from manav.manav.lead_api.get_dashboard (KPIs + charts).
// Reason: The user asked for a dashboard.
// CHANGE NOTE
// Date: 2026-10-30
// Change: Restyled into attractive stat tiles (coloured icon, big number, sub-line, hover lift) with a
//         clean responsive grid and four charts in cards; theme-aware for light and dark desk.
// Reason: The user asked for a fantastic, attractive and effective dashboard.
// CHANGE NOTE
// Date: 2026-11-04
// Change: Redesigned: greeting header with Overdue / Due Today, four headline tiles, a stage pipeline,
//         a status bar with legend, visits per month, a Needs Attention list, a sales engineer
//         leaderboard and source / location bars, all clickable, with a loading skeleton. Later made
//         phone friendly (styles below 600 px only, PC unchanged).
// Reason: The user asked for a better and more attractive Lead Dashboard.

frappe.pages["manav-lead-dashboard"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Lead Dashboard"),
		single_column: true,
	});

	// Small inline feather-style icons (stroke = currentColor).
	const ICONS = {
		users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
		flow: '<path d="M3 6h18M6 12h12M10 18h4"/>',
		file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
		pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
		alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
		clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		check: '<path d="M20 6 9 17l-5-5"/>',
		arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
	};
	const icon = (name, size = 20) =>
		`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
	const esc = (s) => frappe.utils.escape_html(s == null ? "" : String(s));
	const fmt = (n) => (n || 0).toLocaleString("en-IN");
	// Same status colours as the Manav Lead list and the Leads page.
	// Closed is a dark neutral gray, so it stays apart from Qualified's green also for colour-blind readers.
	const STATUS_COLOURS = { Open: "#2a78d6", "Pending to Qualify": "#eda100", Qualified: "#1baf7a", Closed: "#5f6368" };
	// "05 Quote Followup" -> "Quote Followup" (stages from before the numbers were removed)
	const stage_label = (s) => String(s || "").replace(/^\d+\s+/, "");

	// Theme-aware styling (light and dark desk).
	$(`
		<style>
			.mld { --ink:var(--heading-color,#171717); --ink2:var(--text-color,#3d3d3b); --muted:var(--text-muted,#8d969e);
				--line:var(--border-color,#e8eaed); --card:var(--card-bg,var(--fg-color,#fff)); --soft:var(--subtle-fg,var(--control-bg,#f5f5f4));
				--accent:#2a78d6; padding:4px 0 32px; color:var(--ink2); }
			.mld-card { background:var(--card); border:1px solid var(--line); border-radius:16px; }

			.mld-hero { display:flex; flex-wrap:wrap; align-items:center; gap:14px 24px; padding:22px 24px; margin-bottom:16px;
				background:linear-gradient(120deg, color-mix(in srgb, var(--accent) 12%, var(--card)), var(--card) 65%); }
			.mld-hero h2 { margin:0; font-size:22px; font-weight:700; color:var(--ink); }
			.mld-hero .sub { margin-top:4px; font-size:13px; color:var(--muted); }
			.mld-alerts { display:flex; flex-wrap:wrap; gap:8px; margin-left:auto; }
			.mld-alert { display:inline-flex; align-items:center; gap:9px; padding:9px 14px; border-radius:12px; cursor:pointer;
				background:var(--card); border:1px solid var(--line); font-size:13px; font-weight:600; color:var(--ink); }
			.mld-alert:hover { border-color:var(--c); }
			.mld-alert .ic { color:var(--c); display:inline-flex; }
			.mld-alert b { font-size:18px; color:var(--ink); }
			.mld-alert.ok { cursor:default; } .mld-alert.ok:hover { border-color:var(--line); }

			.mld-kpis { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin-bottom:16px; }
			.mld-kpi { padding:18px; cursor:pointer; transition:transform .15s, box-shadow .15s; }
			.mld-kpi:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(0,0,0,.07); }
			.mld-kpi .top { display:flex; align-items:center; justify-content:space-between; }
			.mld-kpi .nm { font-size:13px; font-weight:600; color:var(--muted); }
			.mld-kpi .ic { width:36px; height:36px; border-radius:11px; display:flex; align-items:center; justify-content:center;
				color:var(--c); background:color-mix(in srgb, var(--c) 13%, transparent); }
			.mld-kpi .v { font-size:32px; font-weight:800; color:var(--ink); line-height:1; margin-top:12px; letter-spacing:-.5px; font-variant-numeric:tabular-nums; }
			.mld-kpi .s { margin-top:8px; font-size:12.5px; color:var(--muted); }
			.mld-kpi .s b { color:var(--ink2); }

			.mld-row { display:grid; gap:14px; margin-bottom:14px; }
			.mld-row.r21 { grid-template-columns:2fr 1fr; }
			.mld-row.r111 { grid-template-columns:repeat(3,minmax(0,1fr)); }
			.mld-panel { padding:18px 20px; min-width:0; }
			.mld-panel h4 { display:flex; align-items:baseline; gap:8px; margin:0 0 14px; font-size:14px; font-weight:700; color:var(--ink); }
			.mld-panel h4 span { font-size:12px; font-weight:500; color:var(--muted); }
			.mld-panel h4 a { margin-left:auto; font-size:12px; font-weight:600; color:var(--accent); cursor:pointer; }

			/* horizontal bars (pipeline, source, location, leaderboard) */
			.mld-bars { display:flex; flex-direction:column; gap:4px; }
			.mld-bar { display:grid; grid-template-columns:minmax(90px,170px) 1fr 36px; align-items:center; gap:12px; padding:5px 6px;
				border-radius:8px; cursor:pointer; }
			.mld-bar:hover { background:var(--soft); }
			.mld-bar .l { font-size:12.5px; color:var(--ink2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
			.mld-bar .t { height:10px; border-radius:5px; background:var(--soft); overflow:hidden; }
			.mld-bar .f { display:block; height:100%; border-radius:0 4px 4px 0; background:var(--accent); min-width:2px; transition:width .5s ease; }
			.mld-bar.zero .f { min-width:0; }
			.mld-bar .n { font-size:13px; font-weight:700; color:var(--ink); text-align:right; font-variant-numeric:tabular-nums; }
			.mld-bar.zero .n, .mld-bar.zero .l { color:var(--muted); font-weight:500; }

			/* status split */
			.mld-split { display:flex; gap:2px; height:14px; border-radius:7px; overflow:hidden; background:var(--soft); margin:4px 0 16px; }
			.mld-split i { display:block; height:100%; }
			.mld-legend { display:flex; flex-direction:column; gap:2px; }
			.mld-leg { display:flex; align-items:center; gap:10px; padding:8px 6px; border-radius:8px; cursor:pointer; font-size:13px; }
			.mld-leg:hover { background:var(--soft); }
			.mld-leg .dot { width:10px; height:10px; border-radius:3px; flex:none; }
			.mld-leg .nm { flex:1; color:var(--ink2); }
			.mld-leg .n { font-weight:700; color:var(--ink); font-variant-numeric:tabular-nums; }
			.mld-leg .p { width:44px; text-align:right; color:var(--muted); font-size:12px; }

			/* needs attention */
			.mld-att { display:flex; flex-direction:column; gap:2px; }
			.mld-att-row { display:flex; align-items:center; gap:11px; padding:9px 6px; border-radius:10px; cursor:pointer; }
			.mld-att-row:hover { background:var(--soft); }
			.mld-av { width:34px; height:34px; flex:none; border-radius:10px; display:flex; align-items:center; justify-content:center;
				font-size:12.5px; font-weight:700; color:var(--accent); background:color-mix(in srgb, var(--accent) 12%, transparent); }
			.mld-att-row .m { flex:1; min-width:0; }
			.mld-att-row .c { font-size:13px; font-weight:600; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
			.mld-att-row .st { font-size:12px; color:var(--muted); }
			.mld-due { font-size:11.5px; font-weight:700; padding:3px 8px; border-radius:7px; white-space:nowrap; color:var(--ink2); background:var(--soft); }
			.mld-due.late { color:#c92a2a; background:color-mix(in srgb, #e34948 13%, transparent); }
			.mld-due.today { color:#a86400; background:color-mix(in srgb, #eda100 16%, transparent); }

			/* leaderboard */
			.mld-rank { width:22px; font-size:12px; font-weight:700; color:var(--muted); text-align:center; }
			.mld-lb .mld-bar { grid-template-columns:22px minmax(80px,130px) 1fr 32px; }

			.mld-empty { padding:26px 0; text-align:center; font-size:13px; color:var(--muted); }
			.mld-empty .ic { display:inline-flex; width:40px; height:40px; border-radius:12px; align-items:center; justify-content:center;
				background:var(--soft); margin-bottom:8px; color:#1baf7a; }
			.mld-skel { border-radius:16px; background:linear-gradient(90deg,var(--soft),var(--line),var(--soft)); background-size:200% 100%;
				animation:mld-sh 1.2s infinite; }
			@keyframes mld-sh { to { background-position:-200% 0; } }

			@media (max-width: 1100px) { .mld-kpis { grid-template-columns:repeat(2,minmax(0,1fr)); } .mld-row.r21, .mld-row.r111 { grid-template-columns:1fr; } }
			@media (max-width: 560px) { .mld-kpis { grid-template-columns:1fr 1fr; gap:10px; } .mld-kpi .v { font-size:26px; }
				.mld-alerts { margin-left:0; } .mld-hero { padding:18px 16px; } }
			/* phone */
			@media (max-width: 600px) {
				.mld { padding-bottom:20px; }
				.mld-card { border-radius:14px; }
				.mld-hero { padding:16px; gap:12px; margin-bottom:12px; }
				.mld-hero h2 { font-size:19px; }
				.mld-alerts { width:100%; display:grid; grid-template-columns:1fr 1fr; }
				.mld-alert { justify-content:center; padding:10px; }
				.mld-alert.ok { grid-column:1/-1; }
				.mld-kpis { gap:8px; margin-bottom:12px; }
				.mld-kpi { padding:14px 12px; }
				.mld-kpi .ic { width:30px; height:30px; border-radius:9px; }
				.mld-kpi .nm { font-size:12px; }
				.mld-kpi .v { font-size:24px; margin-top:8px; }
				.mld-kpi .s { font-size:11.5px; }
				.mld-row { gap:12px; margin-bottom:12px; }
				.mld-panel { padding:14px; }
				.mld-panel h4 { flex-wrap:wrap; row-gap:2px; }
				.mld-bar { grid-template-columns:minmax(84px,38%) 1fr 30px; gap:8px; padding:7px 4px; }
				.mld-lb .mld-bar { grid-template-columns:18px minmax(70px,34%) 1fr 28px; }
				.mld-leg, .mld-att-row { padding:10px 4px; }
			}
		</style>`).appendTo(page.body);

	const $root = $('<div class="mld"></div>').appendTo(page.body);
	$root.html(`<div class="mld-skel" style="height:96px;margin-bottom:16px"></div>
		<div class="mld-kpis">${'<div class="mld-skel" style="height:128px"></div>'.repeat(4)}</div>
		<div class="mld-row r21"><div class="mld-skel" style="height:320px"></div><div class="mld-skel" style="height:320px"></div></div>`);

	function openList(doctype, route_options) {
		frappe.route_options = route_options;
		frappe.set_route("List", doctype);
	}

	function greeting() {
		const h = new Date().getHours();
		const part = h < 12 ? __("Good morning") : h < 17 ? __("Good afternoon") : __("Good evening");
		const name = (frappe.boot.user && frappe.boot.user.first_name) || frappe.session.user_fullname || "";
		return name ? `${part}, ${name}` : part;
	}

	function initials(name) {
		const w = String(name || "?").replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/);
		const first = w[0] || "?";
		return (first[0] + (w.length > 1 ? w[1][0] : first[1] || "")).toUpperCase();
	}

	// Horizontal bars: rows of {label, count, go}; the longest bar is the largest count.
	function bars(rows, opts = {}) {
		if (!rows.length) return `<div class="mld-empty">${__("No data yet")}</div>`;
		const max = Math.max(1, ...rows.map((r) => r.count));
		return `<div class="mld-bars ${opts.cls || ""}">${rows
			.map((r, i) => `
				<div class="mld-bar ${r.count ? "" : "zero"}" data-i="${i}" title="${esc(r.label)}: ${fmt(r.count)}">
					${opts.rank ? `<span class="mld-rank">${i + 1}</span>` : ""}
					<span class="l">${esc(r.label)}</span>
					<span class="t"><span class="f" style="width:${(r.count / max) * 100}%"></span></span>
					<span class="n">${fmt(r.count)}</span>
				</div>`)
			.join("")}</div>`;
	}
	// Wire the bar rows of `$panel` to their rows' `go`.
	function wire($panel, rows) {
		$panel.find(".mld-bar").on("click", function () {
			const r = rows[cint($(this).attr("data-i"))];
			if (r && r.go) r.go();
		});
	}

	function panel(cls, title, sub, link) {
		return $(`<div class="mld-card mld-panel ${cls || ""}">
			<h4>${esc(title)}${sub ? `<span>${esc(sub)}</span>` : ""}${link ? `<a>${esc(link.label)} →</a>` : ""}</h4>
			<div class="body"></div></div>`).on("click", "h4 a", () => link && link.go());
	}

	function render(d) {
		const c = d.conversion;
		const total = d.status_counts.Total || 0;
		$root.empty();

		// --- greeting + follow-ups needing action ---
		const fu = d.followups || { overdue: 0, today: 0 };
		const $hero = $(`<div class="mld-card mld-hero">
			<div><h2>${esc(greeting())}</h2>
				<div class="sub">${esc(frappe.datetime.str_to_user(frappe.datetime.get_today()))} · ${__("{0} active leads in the pipeline", [fmt(d.active)])}</div></div>
			<div class="mld-alerts"></div></div>`).appendTo($root);
		const $alerts = $hero.find(".mld-alerts");
		if (!fu.overdue && !fu.today) {
			$alerts.append(`<span class="mld-alert ok" style="--c:#1baf7a"><span class="ic">${icon("check", 18)}</span>${__("No follow-ups due today")}</span>`);
		} else {
			[
				{ n: fu.overdue, label: __("Overdue"), c: "#e34948", ic: "alert" },
				{ n: fu.today, label: __("Due Today"), c: "#eda100", ic: "clock" },
			].forEach((a) =>
				$(`<span class="mld-alert" style="--c:${a.c}"><span class="ic">${icon(a.ic, 18)}</span><b>${fmt(a.n)}</b>${esc(a.label)}</span>`)
					.on("click", () => frappe.set_route("manav-leads-board"))
					.appendTo($alerts)
			);
		}

		// --- headline tiles ---
		const $kpis = $('<div class="mld-kpis"></div>').appendTo($root);
		[
			{ nm: __("Total Leads"), v: total, ic: "users", c: "#2a78d6",
				s: __("<b>+{0}</b> this month", [fmt(c.leads_month)]), go: () => openList("Manav Lead", {}) },
			{ nm: __("Active Pipeline"), v: d.active, ic: "flow", c: "#6250d6",
				s: __("<b>{0}</b> qualified ({1}%)", [fmt(c.qualified), c.qualified_pct]), go: () => frappe.set_route("manav-leads-board") },
			{ nm: __("Quotations Made"), v: c.converted, ic: "file", c: "#1baf7a",
				s: __("<b>{0}%</b> of leads converted", [c.pct]), go: () => openList("Manav Lead", { quotation: ["is", "set"] }) },
			{ nm: __("Visits This Month"), v: d.visits.month, ic: "pin", c: "#eb6834",
				s: __("<b>{0}</b> today", [fmt(d.visits.today)]), go: () => openList("Manav Visit", {}) },
		].forEach((t) =>
			$(`<div class="mld-card mld-kpi" style="--c:${t.c}">
					<div class="top"><span class="nm">${esc(t.nm)}</span><span class="ic">${icon(t.ic, 18)}</span></div>
					<div class="v">${fmt(t.v)}</div><div class="s">${t.s}</div>
				</div>`).on("click", t.go).appendTo($kpis)
		);

		// --- pipeline + status ---
		const $r1 = $('<div class="mld-row r21"></div>').appendTo($root);
		const pipe = (d.pipeline || []).map((p) => ({
			label: stage_label(p.stage), count: p.count,
			go: () => openList("Manav Lead", { stage: p.stage, status: ["!=", "Closed"] }),
		}));
		const $pipe = panel("", __("Pipeline by Stage"), __("active leads"), { label: __("Leads page"), go: () => frappe.set_route("manav-leads-board") }).appendTo($r1);
		$pipe.find(".body").html(bars(pipe));
		wire($pipe, pipe);

		const $status = panel("", __("Leads by Status"), __("{0} total", [fmt(total)])).appendTo($r1);
		const st = d.charts.by_status;
		const split = st.labels
			.map((s, i) => (st.values[i] ? `<i style="flex:${st.values[i]};background:${STATUS_COLOURS[s] || "#8d969e"}" title="${esc(__(s))}: ${st.values[i]}"></i>` : ""))
			.join("");
		$status.find(".body").html(`
			<div class="mld-split">${split}</div>
			<div class="mld-legend">${st.labels
				.map((s, i) => `<div class="mld-leg" data-s="${esc(s)}">
					<span class="dot" style="background:${STATUS_COLOURS[s] || "#8d969e"}"></span>
					<span class="nm">${esc(__(s))}</span><span class="n">${fmt(st.values[i])}</span>
					<span class="p">${total ? Math.round((st.values[i] / total) * 100) : 0}%</span></div>`)
				.join("")}</div>`);
		$status.find(".mld-leg").on("click", function () { openList("Manav Lead", { status: $(this).attr("data-s") }); });

		// --- visits per month + needs attention ---
		const $r2 = $('<div class="mld-row r21"></div>').appendTo($root);
		const $month = panel("", __("Visits per Month"), __("last 6 months"), { label: __("All visits"), go: () => openList("Manav Visit", {}) }).appendTo($r2);
		const vm = d.charts.visits_per_month;
		if (vm.values.some(Boolean)) {
			new frappe.Chart($month.find(".body").get(0), {
				type: "bar", height: 230, colors: ["#2a78d6"],
				barOptions: { spaceRatio: 0.55 }, axisOptions: { xIsSeries: 1 },
				data: { labels: vm.labels, datasets: [{ name: __("Visits"), values: vm.values }] },
				tooltipOptions: { formatTooltipY: (v) => __("{0} visits", [fmt(v)]) },
			});
		} else {
			$month.find(".body").html(`<div class="mld-empty">${__("No visits in the last 6 months")}</div>`);
		}

		const $att = panel("", __("Needs Attention"), __("overdue or due within 3 days")).appendTo($r2);
		const att = d.attention || [];
		$att.find(".body").html(att.length
			? `<div class="mld-att">${att
				.map((a) => {
					const due = a.days < 0 ? { cls: "late", t: __("{0}d overdue", [-a.days]) }
						: a.days === 0 ? { cls: "today", t: __("Today") }
						: { cls: "", t: a.days === 1 ? __("Tomorrow") : __("in {0} days", [a.days]) };
					return `<div class="mld-att-row" data-name="${esc(a.name)}">
						<span class="mld-av">${esc(initials(a.company_name))}</span>
						<span class="m"><div class="c">${esc(a.company_name || a.name)}</div>
						<div class="st">${esc(stage_label(a.stage) || __("No stage"))}</div></span>
						<span class="mld-due ${due.cls}">${esc(due.t)}</span></div>`;
				})
				.join("")}</div>`
			: `<div class="mld-empty"><span class="ic">${icon("check", 20)}</span><br>${__("All caught up - nothing due in the next 3 days")}</div>`);
		$att.find(".mld-att-row").on("click", function () { frappe.set_route("Form", "Manav Lead", $(this).attr("data-name")); });

		// --- leaderboard, sources, locations ---
		const $r3 = $('<div class="mld-row r111"></div>').appendTo($root);
		const eng = d.charts.top_engineers.labels.map((e, i) => ({
			label: e, count: d.charts.top_engineers.values[i], go: () => openList("Manav Visit", { sale_engineer: e }),
		}));
		const $eng = panel("mld-lb", __("Top Sales Engineers"), __("by visits")).appendTo($r3);
		$eng.find(".body").html(bars(eng, { rank: true }));
		wire($eng, eng);

		const src = d.charts.by_source.labels.map((s, i) => ({
			label: s, count: d.charts.by_source.values[i], go: () => openList("Manav Lead", { source: s }),
		}));
		const $src = panel("", __("Leads by Source")).appendTo($r3);
		$src.find(".body").html(bars(src));
		wire($src, src);

		const loc = (d.by_location || []).map((l) => ({
			label: l.label, count: l.count, go: () => openList("Manav Lead", { location: l.label }),
		}));
		const $loc = panel("", __("Leads by Location")).appendTo($r3);
		$loc.find(".body").html(bars(loc));
		wire($loc, loc);
	}

	function load() {
		frappe.call({
			method: "manav.manav.lead_api.get_dashboard",
			callback(r) {
				if (r.message) render(r.message);
			},
		});
	}

	page.set_primary_action(__("Refresh"), load, "refresh");
	page.set_secondary_action(__("Add Lead"), () => frappe.new_doc("Manav Lead"), "add");
	wrapper.mld_load = load;
	load();
};

// Fresh figures when coming back to the dashboard.
frappe.pages["manav-lead-dashboard"].on_page_show = function (wrapper) {
	if (wrapper.mld_load && wrapper.mld_loaded) wrapper.mld_load();
	wrapper.mld_loaded = true;
};
