// File: manav_lead_form.js
// Purpose: Manav Lead form - Make Quotation when the lead's stage has Show Make Quotation (04 RFQ),
//          Open Quotation once it has one (manav.lead_quotation, public/js/manav_lead_quotation.js).
// Created: 2026-11-02
// CHANGE NOTE
// Date: 2026-11-03
// Change: Top-right buttons "New Visit" (a new Manav Visit for this lead; the DVR is called Visit now)
//         and "Next Stage" (lead_board.next_stage: the lead moves to the stage after its current one).
// Reason: The user asked for the option to create a visit at the upper right of the lead, DVR renamed
//         Visit, and a Next Stage button instead of check-in / check-out.
// CHANGE NOTE
// Date: 2026-11-04
// Change: Next Stage opens a new Visit of the lead in the next stage (with its Next Visit Date), like the
//         Leads page and the visit form; submitting that visit moves the lead. The lead's visit count
//         ("3 Visits", cancelled ones not counted) shows at the top and opens its visits.
// Reason: The user asked that Next Stage makes a new visit and for a visit counter on the lead.
// CHANGE NOTE
// Date: 2026-11-04
// Change: Visits tab (visits_html): every visit of the lead, one line each - Visit No., date, stage,
//         reason, description, next visit date, sales engineer and Draft / Submitted / Cancelled.
//         A line opens the visit. Later the same day: a timeline of visit cards under four summary
//         figures (total, last visit, next follow-up, stage), no New Visit button in the tab (it is at the top).
// Reason: The user asked for a Visits tab on the lead showing its visits line-wise.
// CHANGE NOTE
// Date: 2026-11-12
// Change: Every section of the lead form gets its own light background colour and a coloured left
//         edge (colour_lead_sections), with darker shades in dark mode.
// Reason: The user asked that each section has a light colour while filling in a lead.
// CHANGE NOTE
// Date: 2026-11-13
// Change: No Make Quotation / New Visit on a cancelled lead (the lead is submittable now).
// Reason: A cancelled document cannot be linked; the amended lead takes new visits and quotations.

frappe.ui.form.on("Manav Lead", {
	refresh(frm) {
		colour_lead_sections(frm);
		render_visits(frm);
		// 2026-11-12: no "N Visits" headline at the top any more (the user asked to remove it); the count
		// is the Visits field in Lead Info and the Visits tab.
		frm.dashboard.clear_headline();
		if (frm.is_new()) return;
		// 2026-11-13: a cancelled lead takes no new visit or quotation (its amendment does)
		if (frm.doc.docstatus === 2) return;
		manav.lead_quotation.add_button(frm, frm.doc.name, frm.doc.stage, frm.doc.quotation);
		if (frappe.model.can_create("Manav Visit")) {
			// 2026-11-12: only New Visit at the top - the Next Stage button (a new visit in the next stage)
			// did the same thing and was removed; the visit's Stage is chosen in the visit.
			frm.add_custom_button(__("New Visit"), () => frappe.new_doc("Manav Visit", { lead: frm.doc.name })).addClass(
				"btn-primary"
			);
		}
	},
});

// 2026-11-12 (later): softer pastel tints, a coloured section title with a header band, white input
// boxes with a clear border (the grey Frappe inputs disappeared on the coloured sections) and a
// coloured focus ring. Per section: [tint, border, accent, dark tint, dark accent].
const MANAV_LEAD_SECTION_COLOURS = [
	["#F4F8FF", "#D6E4FB", "#3B6FD4", "#1B2230", "#6E9BEA"], // sky blue
	["#F3FBF6", "#CDEBD9", "#23905A", "#18261F", "#5CC48D"], // mint
	["#FFF8F0", "#F5DDBF", "#C7771F", "#2B2219", "#E3A35A"], // peach
	["#F8F5FF", "#E1D7F7", "#7A55CC", "#221E2D", "#A98BEB"], // lavender
	["#F1FAFA", "#C9E9E9", "#1F8A8A", "#172728", "#5CC2C2"], // aqua
	["#FFF5F7", "#F6D5DD", "#C2456A", "#2B1D22", "#E57E9C"], // rose
	["#FDFBEF", "#EEE6B8", "#9C8414", "#28261A", "#D3BC4E"], // lemon
];
// Fixed colour per known section, so a section keeps its colour; others take the next one.
const MANAV_LEAD_SECTION_INDEX = {
	sec_customer: 0,
	sec_lead_info: 1,
	sec_source: 2,
	sec_product: 3,
	sec_profile: 4,
	sec_notes: 5,
	sec_conversion: 6,
};

// Give every section of the lead form its light colour (classes manav-sec-0..6 + one stylesheet).
function colour_lead_sections(frm) {
	$("#manav-lead-section-style").remove();
	{
		// Each colour only sets three variables; the shared rules below use them.
		const rules = MANAV_LEAD_SECTION_COLOURS.map(
			([tint, border, accent, dtint, daccent], i) => `
			.manav-lead-coloured .form-section.manav-sec-${i} { --ms-tint: ${tint}; --ms-border: ${border}; --ms-accent: ${accent}; }
			[data-theme="dark"] .manav-lead-coloured .form-section.manav-sec-${i} { --ms-tint: ${dtint}; --ms-border: ${daccent}55; --ms-accent: ${daccent}; }`
		).join("");
		const S = ".manav-lead-coloured .form-section.card-section";
		$(`<style id="manav-lead-section-style">
			${rules}
			${S} {
				background: var(--ms-tint);
				border: 1px solid var(--ms-border) !important;
				border-left: 5px solid var(--ms-accent) !important;
				border-radius: 12px;
				margin: 0 0 14px 0;
				box-shadow: 0 1px 3px rgba(16, 24, 40, 0.06);
				/* no overflow:hidden - it cut off the Link dropdowns (Sales Engineer, Sale Manager) */
				overflow: visible !important;
			}
			/* a field with an open dropdown sits above the next sections */
			${S} .frappe-control:focus-within { position: relative; z-index: 20; }
			${S}:focus-within { position: relative; z-index: 10; }
			${S} > .section-head {
				color: var(--ms-accent);
				font-weight: 700;
				font-size: 13px;
				letter-spacing: 0.3px;
				text-transform: uppercase;
				padding: 10px 16px !important;
				margin: 0 !important;
				border-bottom: 1px solid var(--ms-border);
				border-radius: 0 11px 0 0;
				background: linear-gradient(90deg, var(--ms-border), transparent 70%);
			}
			${S} > .section-body { padding-top: 12px; }
			${S} .control-label { color: var(--text-color); font-weight: 600; }

			/* The input boxes: white with a clear border, so they stand out on the coloured section */
			${S} .form-control,
			${S} .like-disabled-input,
			${S} .ql-editor,
			${S} textarea {
				background: #ffffff !important;
				border: 1px solid #CBD3DE !important;
				border-radius: 8px !important;
				box-shadow: 0 1px 1px rgba(16, 24, 40, 0.04);
			}
			${S} .form-control:hover { border-color: var(--ms-accent) !important; }
			${S} .form-control:focus {
				border-color: var(--ms-accent) !important;
				box-shadow: 0 0 0 3px var(--ms-border) !important;
			}
			/* read-only values: a light grey box so they look locked */
			${S} .like-disabled-input { background: #F6F7F9 !important; }

			[data-theme="dark"] ${S} .form-control,
			[data-theme="dark"] ${S} textarea,
			[data-theme="dark"] ${S} .ql-editor {
				background: #12161C !important;
				border-color: #3A4350 !important;
			}
			[data-theme="dark"] ${S} .like-disabled-input { background: #1C2128 !important; border-color: #3A4350 !important; }
		</style>`).appendTo("head");
	}
	$(frm.wrapper).addClass("manav-lead-coloured");
	let next = Object.keys(MANAV_LEAD_SECTION_INDEX).length;
	(frm.layout.sections || []).forEach((section) => {
		const name = section.df && section.df.fieldname;
		let i = MANAV_LEAD_SECTION_INDEX[name];
		if (i === undefined) i = next++;
		const $w = $(section.wrapper);
		$w.removeClass((_, c) => (c.match(/manav-sec-\d+/g) || []).join(" "));
		$w.addClass(`manav-sec-${i % MANAV_LEAD_SECTION_COLOURS.length}`);
	});
}

// "3 Visits" at the top of the lead; a click opens the lead's visits.
// The Visits tab: the lead's visits, newest first, one line each.
function render_visits(frm) {
	const field = frm.get_field("visits_html");
	if (!field) return;
	const $w = $(field.wrapper);
	if (frm.is_new()) {
		$w.html(`<p class="text-muted" style="padding:12px 0">${__("Save the lead to see its visits.")}</p>`);
		return;
	}
	add_visits_style();
	const esc = frappe.utils.escape_html;
	const date = (d) => (d ? frappe.datetime.str_to_user(d) : "");
	const STATE = { 0: [__("Draft"), "#e8590c"], 1: [__("Submitted"), "#2f9e44"], 2: [__("Cancelled"), "#868e96"] };
	const today = frappe.datetime.get_today();
	// "today" / "yesterday" / "5 days ago"
	const ago = (d) => {
		const n = frappe.datetime.get_day_diff(today, d);
		return n <= 0 ? __("today") : n === 1 ? __("yesterday") : __("{0} days ago", [n]);
	};
	frappe.db
		.get_list("Manav Visit", {
			filters: { lead: frm.doc.name },
			fields: ["name", "visit_no", "checkin_date", "stage", "visit_purpose", "discussion", "next_visit_date", "sale_engineer", "docstatus"],
			order_by: "creation desc",
			limit: 0,
		})
		.then((visits) => {
			const live = visits.filter((v) => v.docstatus !== 2);
			const last = live.find((v) => v.checkin_date);
			const next = frm.doc.next_followup_date;
			const late = next && frappe.datetime.get_day_diff(next, today) < 0;
			const stats = [
				[__("Total Visits"), live.length, ""],
				[__("Last Visit"), last ? date(last.checkin_date) : "—", last ? ago(last.checkin_date) : __("no visit yet")],
				[__("Next Follow-up"), next ? date(next) : "—", late ? __("overdue") : "", late ? "late" : ""],
				[__("Current Stage"), String(frm.doc.stage || "—").replace(/^\d+\s+/, ""), ""],
			];
			const cards = visits
				.map((v) => {
					const [state, colour] = STATE[v.docstatus] || STATE[0];
					return `<div class="mlv-item ${v.docstatus === 2 ? "cancelled" : ""}" data-name="${esc(v.name)}">
						<span class="mlv-dot">${v.visit_no || ""}</span>
						<div class="mlv-card">
							<div class="mlv-head">
								<b>${__("Visit {0}", [v.visit_no || ""])}</b>
								<span class="mlv-date">${esc(date(v.checkin_date))}</span>
								${v.stage ? `<span class="mlv-chip">${esc(String(v.stage).replace(/^\d+\s+/, ""))}</span>` : ""}
								<span class="mlv-state" style="--c:${colour}">${esc(state)}</span>
							</div>
							${v.visit_purpose ? `<div class="mlv-reason">${esc(v.visit_purpose)}</div>` : ""}
							${v.discussion ? `<div class="mlv-text">${esc(v.discussion)}</div>` : ""}
							<div class="mlv-foot">
								${v.sale_engineer ? `<span>${__("By {0}", [esc(v.sale_engineer)])}</span>` : ""}
								${v.next_visit_date ? `<span>${__("Next visit {0}", [esc(date(v.next_visit_date))])}</span>` : ""}
							</div>
						</div>
					</div>`;
				})
				.join("");
			$w.html(`<div class="mlv">
				<div class="mlv-stats">${stats
					.map(([l, v, s, cls]) => `<div class="mlv-stat"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div>
						${s ? `<div class="s ${cls || ""}">${esc(s)}</div>` : ""}</div>`)
					.join("")}</div>
				${visits.length
					? `<div class="mlv-list">${cards}</div>`
					: `<div class="mlv-empty">${__("No visits yet. Use New Visit at the top to add the first one.")}</div>`}
			</div>`);
			$w.find(".mlv-item").on("click", function () {
				frappe.set_route("Form", "Manav Visit", $(this).attr("data-name"));
			});
		});
}

// Styles of the Visits tab (once per page load; theme-aware).
function add_visits_style() {
	if (document.getElementById("mlv-style")) return;
	$(`<style id="mlv-style">
		.mlv { --mlv-line:var(--border-color,#e8eaed); --mlv-soft:var(--subtle-fg,var(--control-bg,#f6f6f7));
			--mlv-ink:var(--heading-color,#171717); --mlv-muted:var(--text-muted,#8d969e); --mlv-accent:#7c3aed; padding:6px 0 10px; }
		.mlv-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:20px; }
		.mlv-stat { border:1px solid var(--mlv-line); border-radius:12px; padding:12px 14px; background:var(--card-bg,var(--fg-color,#fff)); }
		.mlv-stat .l { font-size:11.5px; font-weight:600; color:var(--mlv-muted); text-transform:uppercase; letter-spacing:.4px; }
		.mlv-stat .v { font-size:18px; font-weight:700; color:var(--mlv-ink); margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
		.mlv-stat .s { font-size:12px; color:var(--mlv-muted); margin-top:2px; }
		.mlv-stat .s.late { color:#e03131; font-weight:600; }
		.mlv-list { position:relative; padding-left:4px; }
		.mlv-item { position:relative; display:flex; gap:14px; padding-bottom:14px; cursor:pointer; }
		.mlv-item:not(:last-child)::before { content:""; position:absolute; left:15px; top:32px; bottom:0; width:2px; background:var(--mlv-line); }
		.mlv-dot { flex:none; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center;
			font-size:13px; font-weight:700; color:#fff; background:var(--mlv-accent); position:relative; z-index:1;
			box-shadow:0 0 0 4px color-mix(in srgb, var(--mlv-accent) 15%, transparent); }
		.mlv-card { flex:1; min-width:0; border:1px solid var(--mlv-line); border-radius:12px; padding:12px 14px;
			background:var(--card-bg,var(--fg-color,#fff)); transition:border-color .12s, box-shadow .12s; }
		.mlv-item:hover .mlv-card { border-color:var(--mlv-accent); box-shadow:0 4px 14px rgba(0,0,0,.06); }
		.mlv-head { display:flex; flex-wrap:wrap; align-items:center; gap:6px 10px; font-size:13px; }
		.mlv-head b { color:var(--mlv-ink); font-size:14px; }
		.mlv-date { color:var(--mlv-muted); }
		.mlv-chip { font-size:12px; font-weight:600; color:var(--mlv-accent); background:color-mix(in srgb, var(--mlv-accent) 11%, transparent);
			padding:2px 9px; border-radius:20px; }
		.mlv-state { margin-left:auto; font-size:12px; font-weight:600; color:var(--c); background:color-mix(in srgb, var(--c) 12%, transparent);
			padding:2px 9px; border-radius:20px; }
		.mlv-reason { margin-top:8px; font-size:12px; font-weight:600; color:var(--mlv-muted); text-transform:uppercase; letter-spacing:.3px; }
		.mlv-text { margin-top:4px; font-size:13.5px; color:var(--text-color,#1f272e); white-space:pre-wrap; line-height:1.5; }
		.mlv-foot { display:flex; flex-wrap:wrap; gap:4px 16px; margin-top:10px; font-size:12px; color:var(--mlv-muted); }
		.mlv-item.cancelled { opacity:.55; } .mlv-item.cancelled .mlv-dot { background:#868e96; box-shadow:none; }
		.mlv-empty { padding:30px 0; text-align:center; color:var(--mlv-muted); font-size:13px; }
		@media (max-width: 768px) { .mlv-stats { grid-template-columns:1fr 1fr; } }
		/* phone */
		@media (max-width: 600px) {
			.mlv-stats { gap:8px; margin-bottom:16px; }
			.mlv-stat { padding:10px 12px; }
			.mlv-stat .v { font-size:16px; }
			.mlv-list { padding-left:0; }
			.mlv-item { gap:10px; }
			.mlv-item:not(:last-child)::before { left:12px; top:26px; }
			.mlv-dot { width:26px; height:26px; font-size:12px; box-shadow:0 0 0 3px color-mix(in srgb, var(--mlv-accent) 15%, transparent); }
			.mlv-card { padding:10px 12px; }
			.mlv-head { gap:4px 8px; }
			.mlv-state { margin-left:0; }
		}
	</style>`).appendTo("head");
}
