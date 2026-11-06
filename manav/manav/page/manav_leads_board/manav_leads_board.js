// File: manav_leads_board.js
// Purpose: Leads page (route manav-leads-board) - a simple two-pane lead workspace: one row of quick
//          filters (overdue / today / this week / quotation, with counts) and a stage dropdown; a lead list
//          grouped by urgency (overdue / today / this week / later / no follow-up / closed) on the left and
//          the selected lead on the right: its stage with a progress bar and the next-stage visit button,
//          one row of action buttons (visits, quotation, Draft / Final PI, open lead) and a few details.
//          Data: manav.manav.lead_board.get_lead_board.
// Created: 2026-11-02
// CHANGE NOTE
// Date: 2026-11-02
// Change: A lead in a stage with Show Make Quotation (04 RFQ) gets a purple Make Quotation button that
//         opens a new ERPNext Quotation filled from the lead; once it has one, the button opens it.
// Reason: The user asked that the RFQ stage opens the ERPNext quotation with the lead's details filled in.
// CHANGE NOTE
// Date: 2026-11-03
// Change: The main button shows the NEXT stage's name and opens a new Visit of the lead with that stage
//         (and its Next Visit Date) filled in; saving the visit moves the lead. "DVR" is called "Visit"
//         everywhere. Clicking the visit count opens the lead's visit list.
// Reason: The user asked for the next stage name on that button and for the DVR term to become Visit.
// CHANGE NOTE
// Date: 2026-11-04
// Change: Card grid replaced by the two-pane layout above. On a phone the detail opens over the list with
//         a back button. Up / Down arrow keys move through the list. Later the same day made simpler: the
//         big summary tiles became one row of quick filters, the stage strip a dropdown, and the stage
//         timeline a progress bar.
// Reason: The user did not want the board of cards, then asked for the new page to be easier.
//         Later: no Call / Email buttons; a PI button after the Quotation (Final PI, Draft PI, or Make
//         Draft PI once the quotation is submitted), as the user asked. Then restyled to look better:
//         filter tiles with icons, a status dot and stage bar on each lead, a gradient header, a stage
//         progress ring, icon action tiles, detail cards, and the lead's three latest visits. Then made
//         phone friendly (styles below 600 px only, PC unchanged): compact tiles, a swipeable status
//         row, a full-width next-stage button, 16 px fields (no iOS zoom), and a lead opens at the top
//         of the page while Back returns to the same place in the list.

frappe.pages["manav-leads-board"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Leads"),
		single_column: true,
	});

	// Colour of each lead status (same as the Manav Lead list).
	const STATUS_COLOURS = {
		Open: "#1d89e2",
		"Pending to Qualify": "#f08c00",
		Qualified: "#28a745",
		Closed: "#8d969e",
	};
	// Avatar colours, picked by the company name.
	const AVATAR_COLOURS = ["#7c3aed", "#1d89e2", "#0ca678", "#f08c00", "#e64980", "#4263eb", "#0b7285", "#d9480f"];
	const ICONS = {
		clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
		pi: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
		alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
		cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
		box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
		phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
		star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
		plus: '<path d="M12 5v14M5 12h14"/>',
		arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
		back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
		ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
		file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
		list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
		check: '<path d="M20 6 9 17l-5-5"/>',
		search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
		user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
		inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
	};
	const icon = (name, size = 14) =>
		`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
	const esc = (s) => frappe.utils.escape_html(s == null ? "" : String(s));
	const fmt_date = (d) => (d ? frappe.datetime.str_to_user(d) : "");

	// Theme-aware styling (light and dark desk).
	$(`
		<style>
			.mlb { --mlb-accent:#7c3aed; --mlb-line:var(--border-color,#e8eaed); --mlb-soft:var(--subtle-fg,var(--control-bg,#f6f6f7));
				--mlb-card:var(--card-bg,var(--fg-color,#fff)); --mlb-muted:var(--text-muted,#8d969e); --mlb-text:var(--text-color,#1f272e);
				--mlb-head:var(--heading-color,#171717); padding:4px 0 32px; color:var(--mlb-text); }

			/* quick filters + stage */
			.mlb-top { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)) minmax(180px,240px); gap:10px; margin:4px 0 16px; }
			.mlb-q { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:14px; cursor:pointer; text-align:left;
				border:1px solid var(--mlb-line); background:var(--mlb-card); color:var(--mlb-text); transition:transform .15s, box-shadow .15s, border-color .15s; }
			.mlb-q:hover { border-color:var(--k); transform:translateY(-1px); box-shadow:0 6px 16px rgba(0,0,0,.06); }
			.mlb-q .qi { flex:none; width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center;
				color:var(--k); background:color-mix(in srgb, var(--k) 13%, transparent); }
			.mlb-q b { display:block; font-size:21px; font-weight:800; line-height:1.05; color:var(--mlb-head); font-variant-numeric:tabular-nums; }
			.mlb-q .ql { display:block; font-size:12px; font-weight:600; color:var(--mlb-muted); margin-top:2px; white-space:nowrap; }
			.mlb-q.active { background:var(--k); border-color:var(--k); box-shadow:0 6px 18px color-mix(in srgb, var(--k) 35%, transparent); }
			.mlb-q.active b, .mlb-q.active .ql { color:#fff; } .mlb-q.active .qi { background:rgba(255,255,255,.2); color:#fff; }
			.mlb-q.zero:not(.active) b { color:var(--mlb-muted); }
			.mlb-top select { height:100%; min-height:44px; border-radius:14px; border:1px solid var(--mlb-line); background:var(--mlb-card);
				color:var(--mlb-text); padding:0 14px; font-size:13px; font-weight:600; }

			/* two panes */
			.mlb-split { display:grid; grid-template-columns:minmax(300px,380px) 1fr; gap:16px; align-items:start; }
			.mlb-pane { background:var(--mlb-card); border:1px solid var(--mlb-line); border-radius:16px; overflow:hidden; }
			.mlb-left { position:sticky; top:calc(var(--navbar-height,48px) + 64px); display:flex; flex-direction:column;
				max-height:calc(100vh - var(--navbar-height,48px) - 90px); }
			.mlb-lhead { padding:12px; border-bottom:1px solid var(--mlb-line); display:flex; flex-direction:column; gap:10px; }
			.mlb-search { position:relative; }
			.mlb-search svg { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:var(--mlb-muted); }
			.mlb-search input { width:100%; height:36px; border-radius:10px; border:1px solid transparent; background:var(--control-bg,#f3f3f3);
				color:var(--mlb-text); padding:0 12px 0 34px; font-size:13px; outline:none; }
			.mlb-search input:focus { border-color:var(--mlb-accent); background:var(--mlb-card); }
			.mlb-seg { display:flex; flex-wrap:wrap; gap:4px; }
			.mlb-seg button { border:none; background:transparent; color:var(--mlb-muted); font-size:12.5px; font-weight:600; padding:5px 9px;
				border-radius:8px; white-space:nowrap; cursor:pointer; display:inline-flex; gap:6px; align-items:center; }
			.mlb-seg button:hover { color:var(--mlb-text); background:var(--mlb-soft); }
			.mlb-seg button.active { background:var(--mlb-head); color:var(--fg-color,#fff); }
			.mlb-seg .dot { width:7px; height:7px; border-radius:50%; }
			.mlb-seg .n { opacity:.65; font-weight:500; }

			.mlb-list { overflow-y:auto; flex:1; padding:4px 0 8px; }
			.mlb-grp { display:flex; align-items:center; gap:7px; padding:12px 16px 6px; font-size:11px; font-weight:700; letter-spacing:.6px;
				text-transform:uppercase; color:var(--g,var(--mlb-muted)); position:sticky; top:0; background:var(--mlb-card); z-index:1; }
			.mlb-grp .n { margin-left:auto; font-weight:600; color:var(--mlb-muted); }
			.mlb-row { display:flex; gap:11px; align-items:center; padding:10px 12px; margin:1px 6px; border-radius:11px; cursor:pointer;
				border-left:3px solid transparent; }
			.mlb-row:hover { background:var(--mlb-soft); }
			.mlb-row.sel { background:color-mix(in srgb, var(--mlb-accent) 9%, transparent); border-left-color:var(--mlb-accent); }
			.mlb-av { position:relative; flex:none; width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center;
				font-weight:700; font-size:14px; color:var(--a); background:color-mix(in srgb, var(--a) 14%, transparent); }
			.mlb-av .sd { position:absolute; right:-2px; bottom:-2px; width:12px; height:12px; border-radius:50%; border:2px solid var(--mlb-card); }
			.mlb-av.lg { width:60px; height:60px; border-radius:18px; font-size:21px; color:#fff; background:var(--a);
				box-shadow:0 6px 18px color-mix(in srgb, var(--a) 40%, transparent); }
			.mlb-rmain { flex:1; min-width:0; }
			.mlb-rtop { display:flex; align-items:center; gap:8px; }
			.mlb-rname { font-size:13.5px; font-weight:600; color:var(--mlb-head); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; }
			.mlb-rdue { font-size:11px; font-weight:700; white-space:nowrap; color:var(--mlb-muted); background:var(--mlb-soft); padding:2px 7px; border-radius:6px; }
			.mlb-rdue.late { color:#c92a2a; background:color-mix(in srgb, #e03131 12%, transparent); }
			.mlb-rdue.today { color:#b35c00; background:color-mix(in srgb, #f08c00 15%, transparent); }
			.mlb-mini { display:flex; gap:2px; margin-top:7px; }
			.mlb-mini i { flex:1; height:3px; border-radius:2px; background:var(--gray-300,#e3e5e8); }
			.mlb-mini i.done { background:color-mix(in srgb, var(--mlb-accent) 45%, transparent); } .mlb-mini i.cur { background:var(--mlb-accent); }
			.mlb-rsub { font-size:12px; color:var(--mlb-muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
			.mlb-rsub .stg { color:var(--mlb-accent); font-weight:600; }

			/* detail */
			.mlb-right { min-height:360px; }
			.mlb-hero { display:flex; gap:16px; align-items:center; padding:24px 22px 20px;
				background:linear-gradient(135deg, color-mix(in srgb, var(--a) 14%, transparent), transparent 70%); border-bottom:1px solid var(--mlb-line); }
			.mlb-back { display:none; border:none; background:var(--mlb-soft); color:var(--mlb-text); width:34px; height:34px; border-radius:10px;
				align-items:center; justify-content:center; cursor:pointer; flex:none; }
			.mlb-htitle { flex:1; min-width:0; }
			.mlb-htitle h3 { margin:0; font-size:19px; font-weight:700; color:var(--mlb-head); line-height:1.25; }
			.mlb-hmeta { display:flex; flex-wrap:wrap; align-items:center; gap:4px 12px; margin-top:4px; font-size:12.5px; color:var(--mlb-muted); }
			.mlb-hmeta span { display:inline-flex; gap:5px; align-items:center; }
			.mlb-pill { font-size:12px; font-weight:600; padding:4px 10px; border-radius:20px; white-space:nowrap; }
			.mlb-free { margin:14px 22px 0; font-size:13px; color:var(--mlb-text); background:var(--mlb-soft); border-radius:10px; padding:9px 12px;
				border-left:3px solid var(--mlb-accent); }

			.mlb-next { margin:16px 22px 0; border-radius:16px; padding:16px 18px;
				background:color-mix(in srgb, var(--mlb-accent) 7%, var(--mlb-card)); border:1px solid color-mix(in srgb, var(--mlb-accent) 20%, transparent); }
			.mlb-next.late { background:color-mix(in srgb, #e03131 6%, var(--mlb-card)); border-color:color-mix(in srgb, #e03131 25%, transparent); }
			.mlb-next-top { display:flex; flex-wrap:wrap; gap:12px 16px; align-items:center; }
			.mlb-next .t { flex:1; min-width:160px; }
			.mlb-ring { flex:none; position:relative; width:64px; height:64px; }
			.mlb-ring svg { transform:rotate(-90deg); }
			.mlb-ring .bg { stroke:color-mix(in srgb, var(--mlb-accent) 15%, transparent); }
			.mlb-ring .fg { stroke:var(--mlb-accent); transition:stroke-dashoffset .6s ease; }
			.mlb-ring span { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;
				font-size:15px; font-weight:800; color:var(--mlb-head); line-height:1; }
			.mlb-ring small { font-size:10px; font-weight:600; color:var(--mlb-muted); margin-top:2px; }
			.mlb-next .k { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--mlb-muted); }
			.mlb-next .s { font-size:16px; font-weight:700; color:var(--mlb-head); margin-top:2px; }
			.mlb-next .d { font-size:12.5px; margin-top:3px; color:var(--mlb-muted); display:flex; gap:5px; align-items:center; }
			.mlb-next .d.late { color:#e03131; font-weight:600; } .mlb-next .d.today { color:#f08c00; font-weight:600; }
			.mlb-steps { display:flex; gap:3px; margin-top:14px; }
			.mlb-steps i { flex:1; height:6px; border-radius:3px; background:var(--gray-300,#e3e5e8); }
			.mlb-steps i.done { background:color-mix(in srgb, var(--mlb-accent) 45%, transparent); } .mlb-steps i.cur { background:var(--mlb-accent); }
			.mlb-steps-l { display:flex; justify-content:space-between; font-size:11.5px; color:var(--mlb-muted); margin-top:6px; }

			.mlb-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; height:44px; padding:0 20px; border-radius:12px;
				border:none; font-size:14px; font-weight:600; cursor:pointer; color:#fff; white-space:nowrap;
				background:linear-gradient(135deg, var(--mlb-accent), #9b5cf6); box-shadow:0 6px 16px color-mix(in srgb, var(--mlb-accent) 35%, transparent);
				transition:transform .12s, box-shadow .12s; }
			.mlb-btn:hover { transform:translateY(-1px); box-shadow:0 8px 20px color-mix(in srgb, var(--mlb-accent) 45%, transparent); }
			.mlb-btn[disabled] { background:var(--mlb-soft); color:var(--mlb-muted); cursor:default; box-shadow:none; transform:none; }

			.mlb-acts { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin:16px 22px 0; }
			.mlb-act { --c:var(--mlb-accent); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; padding:14px 8px;
				border-radius:14px; border:1px solid var(--mlb-line); background:var(--mlb-card); color:var(--mlb-text); font-size:12.5px; font-weight:600;
				cursor:pointer; text-decoration:none !important; text-align:center; transition:transform .12s, border-color .12s, box-shadow .12s; }
			.mlb-act:hover { border-color:var(--c); color:var(--c); transform:translateY(-1px); box-shadow:0 6px 14px rgba(0,0,0,.06); }
			.mlb-act .ai { width:36px; height:36px; border-radius:11px; display:flex; align-items:center; justify-content:center;
				color:var(--c); background:color-mix(in srgb, var(--c) 12%, transparent); }
			.mlb-act.hot { --c:#0ca678; background:linear-gradient(135deg,#0ca678,#20c997); border-color:transparent; color:#fff;
				box-shadow:0 6px 14px rgba(12,166,120,.3); }
			.mlb-act.hot:hover { color:#fff; } .mlb-act.hot .ai { background:rgba(255,255,255,.2); color:#fff; }
			.mlb-act small { font-size:11px; font-weight:500; color:var(--mlb-muted); margin-top:-4px; }
			.mlb-act.hot small { color:rgba(255,255,255,.85); }

			.mlb-sec { margin:22px 22px 0; }
			.mlb-sec h6 { display:flex; align-items:center; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.6px;
				color:var(--mlb-muted); margin:0 0 10px; }
			.mlb-sec h6 a { margin-left:auto; font-size:12px; text-transform:none; letter-spacing:0; color:var(--mlb-accent); cursor:pointer; }
			.mlb-info { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
			.mlb-info > div { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:12px; background:var(--mlb-soft); min-width:0; }
			.mlb-info .fi { flex:none; width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center;
				background:var(--mlb-card); color:var(--mlb-accent); }
			.mlb-info .l { font-size:11.5px; color:var(--mlb-muted); }
			.mlb-info .v { font-size:13.5px; font-weight:600; color:var(--mlb-head); margin-top:1px; word-break:break-word; }

			.mlb-visits { display:flex; flex-direction:column; padding-bottom:22px; }
			.mlb-vi { position:relative; display:flex; gap:12px; padding:0 0 12px; cursor:pointer; }
			.mlb-vi:not(:last-child)::before { content:""; position:absolute; left:13px; top:28px; bottom:0; width:2px; background:var(--mlb-line); }
			.mlb-vi .vn { flex:none; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center;
				font-size:12px; font-weight:700; color:#fff; background:var(--mlb-accent); position:relative; z-index:1; }
			.mlb-vi .vc { flex:1; min-width:0; padding:8px 12px; border:1px solid var(--mlb-line); border-radius:12px; }
			.mlb-vi:hover .vc { border-color:var(--mlb-accent); }
			.mlb-vi .vh { display:flex; flex-wrap:wrap; gap:4px 10px; font-size:12.5px; color:var(--mlb-muted); }
			.mlb-vi .vh b { color:var(--mlb-head); }
			.mlb-vi .vt { font-size:13px; color:var(--mlb-text); margin-top:3px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box;
				-webkit-line-clamp:2; -webkit-box-orient:vertical; }
			.mlb-vnone { font-size:13px; color:var(--mlb-muted); padding:4px 0 22px; }

			.mlb-empty { text-align:center; padding:48px 20px; color:var(--mlb-muted); font-size:13px; }
			.mlb-empty .ei { width:52px; height:52px; border-radius:16px; margin:0 auto 12px; display:flex; align-items:center; justify-content:center;
				background:var(--mlb-soft); color:var(--mlb-muted); }
			.mlb-empty b { display:block; color:var(--mlb-head); font-size:14px; margin-bottom:3px; }
			.mlb-empty a { color:var(--mlb-accent); font-weight:600; cursor:pointer; }
			.mlb-skel { height:56px; margin:8px 12px; border-radius:11px; background:linear-gradient(90deg,var(--mlb-soft),var(--mlb-line),var(--mlb-soft));
				background-size:200% 100%; animation:mlb-sh 1.2s infinite; }
			@keyframes mlb-sh { to { background-position:-200% 0; } }

			@media (max-width: 1200px) { .mlb-top { grid-template-columns:repeat(4,minmax(0,1fr)); } .mlb-top select { grid-column:1/-1; } }
			@media (max-width: 900px) {
				.mlb-top { grid-template-columns:1fr 1fr; }
				.mlb-split { grid-template-columns:1fr; }
				.mlb-left { position:static; max-height:none; }
				.mlb-right { display:none; }
				.mlb.show-detail .mlb-left, .mlb.show-detail .mlb-top { display:none; }
				.mlb.show-detail .mlb-right { display:block; }
				.mlb-back { display:inline-flex; }
				.mlb-hero { padding:16px; } .mlb-free, .mlb-next, .mlb-acts, .mlb-sec { margin-left:16px; margin-right:16px; }
				.mlb-info { grid-template-columns:1fr; }
				/* the list scrolls with the page here: group headings must not stick under the navbar */
				.mlb-grp { position:static; }
			}
			/* phone */
			@media (max-width: 600px) {
				.mlb { padding-bottom:20px; }
				.mlb-top { gap:8px; margin-bottom:12px; }
				.mlb-q { padding:10px 11px; gap:9px; border-radius:12px; }
				.mlb-q .qi { width:32px; height:32px; border-radius:9px; }
				.mlb-q b { font-size:18px; } .mlb-q .ql { font-size:11.5px; }
				/* 16px stops iOS from zooming into the field */
				.mlb-top select, .mlb-search input { font-size:16px; }
				.mlb-top select { min-height:42px; }
				.mlb-pane { border-radius:14px; }
				.mlb-lhead { padding:10px; }
				.mlb-seg { flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; margin:0 -2px; }
				.mlb-seg::-webkit-scrollbar { display:none; }
				.mlb-seg button { padding:7px 11px; }
				.mlb-row { padding:12px 10px; margin:1px 4px; }

				.mlb-hero { flex-wrap:wrap; gap:12px; padding:14px; }
				.mlb-av.lg { width:48px; height:48px; border-radius:14px; font-size:17px; }
				.mlb-htitle h3 { font-size:17px; }
				/* the status goes on its own line under the name (back 34 + avatar 48 + two 12px gaps) */
				.mlb-htitle { flex:1 1 calc(100% - 120px); }
				.mlb-hero .mlb-pill { margin:-6px 0 0 106px; }
				.mlb-free, .mlb-next, .mlb-acts, .mlb-sec { margin-left:12px; margin-right:12px; }
				.mlb-next { padding:14px; }
				.mlb-next-top { gap:12px; }
				.mlb-next .t { min-width:0; flex:1 1 calc(100% - 80px); }
				.mlb-next .mlb-btn { flex:1 1 100%; white-space:normal; text-align:center; line-height:1.25; min-height:46px; height:auto; padding:10px 14px; }
				.mlb-steps-l { flex-wrap:wrap; gap:2px 10px; }
				.mlb-acts { grid-template-columns:1fr 1fr; gap:8px; }
				.mlb-act { padding:12px 6px; }
				.mlb-sec { margin-top:18px; }
			}
		</style>`).appendTo(page.body);

	const $root = $('<div class="mlb"></div>').appendTo(page.body);
	const $top = $('<div class="mlb-top"></div>').appendTo($root);
	const $quick = $('<div style="display:contents"></div>').appendTo($top);
	const $stage = $(`<select><option value="">${__("All Stages")}</option></select>`).appendTo($top);
	const $split = $('<div class="mlb-split"></div>').appendTo($root);
	const $left = $(`
		<div class="mlb-pane mlb-left">
			<div class="mlb-lhead">
				<div class="mlb-search">${icon("search", 15)}<input type="search" placeholder="${__("Search company, lead, contact...")}"></div>
				<div class="mlb-seg"></div>
			</div>
			<div class="mlb-list"></div>
		</div>`).appendTo($split);
	const $right = $('<div class="mlb-pane mlb-right"></div>').appendTo($split);
	const $seg = $left.find(".mlb-seg");
	const $list = $left.find(".mlb-list");

	// status: "" = every status; due: "" | overdue | today | week | quote; stage: "" = every stage.
	const state = { data: null, status: "", due: "", stage: "", search: "", selected: null, visible: [] };

	$list.html('<div class="mlb-skel"></div>'.repeat(6));

	$left.find("input").on("input", frappe.utils.debounce(function () {
		state.search = ($(this).val() || "").toLowerCase().trim();
		render();
	}, 180));
	$stage.on("change", function () {
		state.stage = $(this).val();
		render();
	});

	// Days from today to `date`: < 0 overdue, 0 today, > 0 later.
	const days_to = (date) => frappe.datetime.get_day_diff(date, state.data.today);
	const is_closed = (lead) => lead.status === "Closed";
	const is_overdue = (lead) => !is_closed(lead) && lead.next_followup_date && days_to(lead.next_followup_date) < 0;
	const is_today = (lead) => !is_closed(lead) && lead.next_followup_date && days_to(lead.next_followup_date) === 0;
	const is_week = (lead) => {
		if (is_closed(lead) || !lead.next_followup_date) return false;
		const d = days_to(lead.next_followup_date);
		return d >= 0 && d <= 7;
	};
	const stage_index = (lead) => state.data.stages.findIndex((s) => s.name === lead.stage);

	// "2 days ago" / "today" for the last visit.
	function ago(date) {
		const d = -days_to(date);
		if (d <= 0) return __("today");
		if (d === 1) return __("yesterday");
		return __("{0} days ago", [d]);
	}

	// Short due text for the list row and a longer one for the detail.
	function due_info(lead) {
		if (!lead.next_followup_date) return { cls: "", short: "", long: __("No follow-up date") };
		const d = days_to(lead.next_followup_date);
		const date = fmt_date(lead.next_followup_date);
		if (!is_closed(lead) && d < 0) return { cls: "late", short: __("{0}d late", [-d]), long: __("{0} · {1} days overdue", [date, -d]) };
		if (d === 0) return { cls: "today", short: __("Today"), long: __("Follow-up today") };
		if (d === 1) return { cls: "", short: __("Tomorrow"), long: __("Follow-up tomorrow ({0})", [date]) };
		if (d > 1 && d <= 7) return { cls: "", short: __("in {0}d", [d]), long: __("Follow-up {0} · in {1} days", [date, d]) };
		return { cls: "", short: date, long: __("Follow-up {0}", [date]) };
	}

	function initials(name) {
		const w = String(name || "?").replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/);
		const first = w[0] || "?";
		return (first[0] + (w.length > 1 ? w[1][0] : first[1] || "")).toUpperCase();
	}
	function avatar_colour(name) {
		let h = 0;
		for (const ch of String(name || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
		return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
	}
	// "06 Customer HFO Visit" -> "Customer HFO Visit"
	const stage_label = (name) => String(name || "").replace(/^\d+\s+/, "");

	function search_hit(lead) {
		if (!state.search) return true;
		return [lead.name, lead.company_name, lead.product_type, lead.product, lead.product_free_hand, lead.location,
			lead.sale_engineer, lead.contact_person, lead.mobile_no, lead.email_id, lead.stage]
			.join(" ").toLowerCase().includes(state.search);
	}
	const QUICK = [
		{ key: "overdue", label: __("Overdue"), colour: "#e03131", icon: "alert", test: is_overdue },
		{ key: "today", label: __("Due Today"), colour: "#f08c00", icon: "clock", test: is_today },
		{ key: "week", label: __("This Week"), colour: "#1d89e2", icon: "cal", test: is_week },
		{ key: "quote", label: __("Quotation Made"), colour: "#0ca678", icon: "file", test: (l) => !!l.quotation },
	];
	function matches(lead) {
		if (state.status && lead.status !== state.status) return false;
		if (state.due && !QUICK.find((q) => q.key === state.due).test(lead)) return false;
		if (state.stage && lead.stage !== state.stage) return false;
		return search_hit(lead);
	}

	function render_top() {
		const leads = state.data.leads;
		$quick.empty();
		QUICK.forEach((q) => {
			const n = leads.filter(q.test).length;
			$(`<button class="mlb-q ${state.due === q.key ? "active" : ""} ${n ? "" : "zero"}" style="--k:${q.colour}">
					<span class="qi">${icon(q.icon, 18)}</span><span><b>${n}</b><span class="ql">${esc(q.label)}</span></span>
				</button>`)
				.on("click", () => { state.due = state.due === q.key ? "" : q.key; render(); })
				.appendTo($quick);
		});
		$stage.val(state.stage);
	}

	function render_status_tabs() {
		const pool = state.data.leads;
		const tabs = [{ key: "", label: __("All"), n: pool.length }].concat(
			state.data.statuses.map((s) => ({ key: s, label: __(s), n: pool.filter((l) => l.status === s).length, dot: STATUS_COLOURS[s] || "#8d969e" }))
		);
		$seg.empty();
		tabs.forEach((t) => {
			$(`<button class="${state.status === t.key ? "active" : ""}">
					${t.dot ? `<span class="dot" style="background:${t.dot}"></span>` : ""}${esc(t.label)}<span class="n">${t.n}</span>
				</button>`)
				.on("click", () => { state.status = t.key; render(); })
				.appendTo($seg);
		});
	}

	// Urgency groups, top to bottom.
	function group_of(lead) {
		if (is_closed(lead)) return "closed";
		if (!lead.next_followup_date) return "none";
		const d = days_to(lead.next_followup_date);
		if (d < 0) return "overdue";
		if (d === 0) return "today";
		if (d <= 7) return "week";
		return "later";
	}
	const GROUPS = [
		{ key: "overdue", label: __("Overdue"), colour: "#e03131" },
		{ key: "today", label: __("Today"), colour: "#f08c00" },
		{ key: "week", label: __("This Week"), colour: "#1d89e2" },
		{ key: "later", label: __("Later") },
		{ key: "none", label: __("No Follow-up") },
		{ key: "closed", label: __("Closed") },
	];

	function row(lead) {
		const due = due_info(lead);
		const a = avatar_colour(lead.company_name);
		const idx = stage_index(lead);
		const mini = state.data.stages.map((s, i) => `<i class="${i < idx ? "done" : i === idx ? "cur" : ""}"></i>`).join("");
		return $(`
			<div class="mlb-row ${state.selected === lead.name ? "sel" : ""}" data-name="${esc(lead.name)}">
				<div class="mlb-av" style="--a:${a}">${esc(initials(lead.company_name))}
					<span class="sd" style="background:${STATUS_COLOURS[lead.status] || "#8d969e"}" title="${esc(__(lead.status))}"></span></div>
				<div class="mlb-rmain">
					<div class="mlb-rtop">
						<span class="mlb-rname">${esc(lead.company_name || lead.name)}</span>
						${due.short ? `<span class="mlb-rdue ${due.cls}">${esc(due.short)}</span>` : ""}
					</div>
					<div class="mlb-rsub"><span class="stg">${esc(stage_label(lead.stage) || __("No stage"))}</span>
						${lead.location ? " · " + esc(lead.location) : ""}</div>
					${state.data.stages.length ? `<div class="mlb-mini">${mini}</div>` : ""}
				</div>
			</div>`).on("click", () => select(lead.name, true));
	}

	function render_list() {
		const leads = state.data.leads.filter(matches);
		$list.empty();
		state.visible = [];
		if (!leads.length) {
			$list.html(`<div class="mlb-empty"><div class="ei">${icon("inbox", 24)}</div>
				<b>${__("No leads here")}</b><a data-clear>${__("Show all leads")}</a></div>`);
			$list.find("[data-clear]").on("click", () => {
				Object.assign(state, { status: "", due: "", stage: "", search: "" });
				$left.find("input").val("");
				render();
			});
			return;
		}
		const by_date = (a, b) => (a.next_followup_date || "9999").localeCompare(b.next_followup_date || "9999");
		GROUPS.forEach((g) => {
			const items = leads.filter((l) => group_of(l) === g.key).sort(by_date);
			if (!items.length) return;
			$list.append(`<div class="mlb-grp" style="${g.colour ? `--g:${g.colour}` : ""}">${esc(g.label)}<span class="n">${items.length}</span></div>`);
			items.forEach((l) => { state.visible.push(l.name); $list.append(row(l)); });
		});
	}

	// The stage after the lead's, by sequence (no stage yet: the first one); undefined at the last.
	function stage_after(lead) {
		const stages = state.data.stages;
		const idx = stage_index(lead);
		return idx < 0 ? stages[0] : stages[idx + 1];
	}

	const info = (ic, label, value) =>
		value ? `<div><span class="fi">${icon(ic, 15)}</span><div><div class="l">${esc(label)}</div><div class="v">${esc(value)}</div></div></div>` : "";
	// An action tile: icon in a tinted square, label, optional sub-line.
	const act = (name, ic, label, sub, opts = {}) =>
		`<a class="mlb-act ${opts.hot ? "hot" : ""}" data-act="${name}" ${opts.colour ? `style="--c:${opts.colour}"` : ""}>
			<span class="ai">${icon(ic, 18)}</span>${label}${sub ? `<small>${sub}</small>` : ""}</a>`;
	// Progress ring for "stage n of m".
	function ring(n, total) {
		const r = 27, len = 2 * Math.PI * r;
		const off = len * (1 - (total ? n / total : 0));
		return `<div class="mlb-ring"><svg width="64" height="64" viewBox="0 0 64 64">
			<circle class="bg" cx="32" cy="32" r="${r}" fill="none" stroke-width="6"/>
			<circle class="fg" cx="32" cy="32" r="${r}" fill="none" stroke-width="6" stroke-linecap="round"
				stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>
			<span>${n}<small>${__("of {0}", [total])}</small></span></div>`;
	}

	// The lead's three latest visits, loaded when the lead is opened.
	function load_recent_visits(lead) {
		frappe.db
			.get_list("Manav Visit", {
				filters: { lead: lead.name, docstatus: ["!=", 2] },
				fields: ["name", "visit_no", "checkin_date", "stage", "visit_purpose", "discussion", "docstatus"],
				order_by: "creation desc",
				limit: 3,
			})
			.then((visits) => {
				if (state.selected !== lead.name) return;
				const $box = $right.find(".mlb-visits").empty();
				if (!visits.length) {
					$box.replaceWith(`<div class="mlb-vnone">${__("No visits yet - use the button above to log the first one.")}</div>`);
					return;
				}
				visits.forEach((v) =>
					$(`<div class="mlb-vi"><span class="vn">${v.visit_no || ""}</span><div class="vc">
							<div class="vh"><b>${esc(fmt_date(v.checkin_date))}</b><span>${esc(stage_label(v.stage))}</span>
								<span>${esc(v.visit_purpose || "")}</span>${v.docstatus === 0 ? `<span style="color:#e8590c">${__("Draft")}</span>` : ""}</div>
							${v.discussion ? `<div class="vt">${esc(v.discussion)}</div>` : ""}
						</div></div>`)
						.on("click", () => frappe.set_route("Form", "Manav Visit", v.name))
						.appendTo($box)
				);
			});
	}

	function render_detail() {
		const lead = state.data.leads.find((l) => l.name === state.selected);
		if (!lead) {
			$right.html(`<div class="mlb-empty" style="padding:120px 20px"><div class="ei">${icon("user", 24)}</div>
				<b>${__("Select a lead")}</b>${__("Pick a lead on the left.")}</div>`);
			return;
		}
		const stages = state.data.stages;
		const idx = stage_index(lead);
		const stage = stages[idx];
		const next = stage_after(lead);
		const due = due_info(lead);
		const a = avatar_colour(lead.company_name);
		const colour = STATUS_COLOURS[lead.status] || "#8d969e";
		const product = [lead.product_type, lead.product].filter(Boolean).join(" · ");
		const steps = stages.map((s, i) => `<i class="${i < idx ? "done" : i === idx ? "cur" : ""}" title="${esc(s.name)}"></i>`).join("");

		// RFQ stage (Show Make Quotation): Make Quotation; once the lead has a quotation: open it.
		const quote_act = lead.quotation
			? act("open-quotation", "file", __("Quotation"),
				esc(lead.quotation) + (lead.quotation_docstatus === 0 ? " · " + __("Draft") : ""), { colour: "#0ca678" })
			: stage && cint(stage.make_quotation)
				? act("make-quotation", "file", __("Make Quotation"), "", { hot: true })
				: "";
		// 2026-11-04: the quotation's PI - Final PI, else Draft PI, else Make Draft PI once it is submitted
		const pi_act = lead.final_pi
			? act("open-final-pi", "pi", __("Final PI"), esc(lead.final_pi), { colour: "#1d89e2" })
			: lead.draft_pi
				? act("open-draft-pi", "pi", __("Draft PI"), esc(lead.draft_pi), { colour: "#f08c00" })
				: lead.quotation && lead.quotation_docstatus === 1
					? act("make-draft-pi", "pi", __("Make Draft PI"), "", { hot: true })
					: "";

		$right.html(`
			<div class="mlb-hero" style="--a:${a}">
				<button class="mlb-back" data-act="back" title="${__("Back")}">${icon("back", 16)}</button>
				<div class="mlb-av lg" style="--a:${a}">${esc(initials(lead.company_name))}</div>
				<div class="mlb-htitle">
					<h3>${esc(lead.company_name || lead.name)}</h3>
					<div class="mlb-hmeta">
						<span>${esc(lead.name)}</span>
						${lead.location ? `<span>${icon("pin", 12)}${esc(lead.location)}</span>` : ""}
						${lead.lead_date ? `<span>${icon("cal", 12)}${esc(fmt_date(lead.lead_date))}</span>` : ""}
					</div>
				</div>
				<span class="mlb-pill" style="color:${colour};background:${hexA(colour, 0.12)}">${esc(__(lead.status))}</span>
			</div>
			${lead.product_free_hand ? `<div class="mlb-free">${esc(lead.product_free_hand)}</div>` : ""}

			<div class="mlb-next ${due.cls === "late" ? "late" : ""}">
				<div class="mlb-next-top">
					${stages.length ? ring(idx + 1, stages.length) : ""}
					<div class="t">
						<div class="k">${__("Now at")}</div>
						<div class="s">${esc(lead.stage || __("No stage"))}</div>
						<div class="d ${due.cls}">${icon("clock", 12)}${esc(due.long)}</div>
					</div>
					${next
						? `<button class="mlb-btn" data-act="next-stage" title="${__("Log a visit that moves the lead to this stage")}">${icon("plus", 15)}${esc(next.name)} ${icon("arrow", 14)}</button>`
						: `<button class="mlb-btn" disabled>${icon("check", 15)}${__("Last stage reached")}</button>`}
				</div>
				${stages.length ? `<div class="mlb-steps">${steps}</div>
					<div class="mlb-steps-l"><span>${__("Stage {0} of {1}", [idx + 1, stages.length])}</span>
					<span>${next ? __("Next: {0}", [esc(next.name)]) : ""}</span></div>` : ""}
			</div>

			<div class="mlb-acts">
				${act("dvr-list", "list", lead.dvr_count === 1 ? __("1 Visit") : __("{0} Visits", [lead.dvr_count]),
					lead.last_dvr_date ? __("last {0}", [ago(lead.last_dvr_date)]) : "", { colour: "#7c3aed" })}
				${quote_act}
				${pi_act}
				${act("open-lead", "ext", __("Open Lead"), "", { colour: "#495057" })}
			</div>

			<div class="mlb-sec">
				<h6>${__("Details")}</h6>
				<div class="mlb-info">
					${info("user", __("Contact"), lead.contact_person)}
					${info("phone", __("Mobile"), lead.mobile_no)}
					${info("box", __("Product"), product)}
					${info("star", __("Sales Engineer"), lead.sale_engineer)}
				</div>
			</div>

			<div class="mlb-sec">
				<h6>${__("Recent Visits")}${lead.dvr_count > 3 ? `<a data-act="dvr-list">${__("View all {0}", [lead.dvr_count])} →</a>` : ""}</h6>
				<div class="mlb-visits"><div class="mlb-skel" style="height:48px;margin:0 0 8px"></div></div>
			</div>`);
		load_recent_visits(lead);
	}

	// Detail panel actions (Call / Email are plain links).
	$right.on("click", "[data-act]", (e) => {
		e.preventDefault();
		const act = $(e.currentTarget).attr("data-act");
		if (act === "back") {
			$root.removeClass("show-detail");
			// phone: back to where the list was
			window.scrollTo(0, state.list_scroll || 0);
			return;
		}
		const lead = state.data && state.data.leads.find((l) => l.name === state.selected);
		if (!lead) return;
		if (act === "next-stage") {
			// a new Visit of the lead in the next stage; saving it moves the lead (lead_board.move_lead_stage)
			const next = stage_after(lead);
			const values = { lead: lead.name };
			if (next) {
				values.stage = next.name;
				if (cint(next.days) > 0) values.next_visit_date = frappe.datetime.add_days(frappe.datetime.get_today(), cint(next.days));
			}
			frappe.new_doc("Manav Visit", values);
		} else if (act === "open-lead") frappe.set_route("Form", "Manav Lead", lead.name);
		else if (act === "make-quotation") manav.lead_quotation.make(lead.name);
		else if (act === "open-quotation") frappe.set_route("Form", "Quotation", lead.quotation);
		else if (act === "open-draft-pi") frappe.set_route("Form", "Draft PI", lead.draft_pi);
		else if (act === "open-final-pi") frappe.set_route("Form", "Sales Order", lead.final_pi);
		// the quotation's own Make Draft PI (pi.make_draft_pi): a new, unsaved Draft PI from it
		else if (act === "make-draft-pi")
			frappe.model.open_mapped_doc({ method: "manav.manav.pi.make_draft_pi", source_name: lead.quotation });
		else if (act === "dvr-list") {
			frappe.route_options = { lead: lead.name };
			frappe.set_route("List", "Manav Visit");
		}
	});

	function select(name, from_click) {
		state.selected = name;
		$list.find(".mlb-row").removeClass("sel").filter((_, el) => el.dataset.name === name).addClass("sel");
		render_detail();
		if (from_click) {
			// phone (one pane): the lead opens over the list, at the top of the page
			if (window.matchMedia("(max-width: 900px)").matches) {
				state.list_scroll = window.scrollY;
				window.scrollTo(0, 0);
			}
			$root.addClass("show-detail");
		}
	}

	// Up / Down move through the list while no field has focus.
	$(document).on("keydown.mlb", (e) => {
		if (frappe.get_route()[0] !== "manav-leads-board" || !state.visible.length) return;
		if ($(e.target).is("input, textarea, select, [contenteditable]")) return;
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
		e.preventDefault();
		const i = state.visible.indexOf(state.selected);
		const j = Math.max(0, Math.min(state.visible.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)));
		select(state.visible[j]);
		const el = $list.find(".mlb-row.sel")[0];
		if (el) el.scrollIntoView({ block: "nearest" });
	});

	function render() {
		if (!state.data) return;
		render_top();
		render_status_tabs();
		render_list();
		// keep the selection while it is still listed, else the first lead
		if (!state.visible.includes(state.selected)) state.selected = state.visible[0] || null;
		$list.find(".mlb-row").filter((_, el) => el.dataset.name === state.selected).addClass("sel");
		render_detail();
	}

	function load() {
		frappe.call({
			method: "manav.manav.lead_board.get_lead_board",
			callback(r) {
				if (!r.message) return;
				state.data = r.message;
				$stage.find("option:not(:first)").remove();
				state.data.stages.forEach((s) => $stage.append(`<option value="${esc(s.name)}">${esc(s.name)}</option>`));
				render();
			},
		});
	}

	page.set_primary_action(__("Add Lead"), () => frappe.new_doc("Manav Lead"), "add");
	page.set_secondary_action(__("Refresh"), load, "refresh");
	// Make Quotation helper (manav.lead_quotation), shared with the lead and visit forms.
	frappe.require("/assets/manav/js/manav_lead_quotation.js");
	wrapper.mlb_load = load;
};

// Loads on first show and again when coming back from a lead or a visit.
frappe.pages["manav-leads-board"].on_page_show = function (wrapper) {
	if (wrapper.mlb_load) wrapper.mlb_load();
};

// "#1d89e2" + alpha -> "rgba(29,137,226,a)" for the soft pill background.
function hexA(hex, alpha) {
	const n = parseInt(hex.slice(1), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
