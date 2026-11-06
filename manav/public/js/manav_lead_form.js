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

frappe.ui.form.on("Manav Lead", {
	refresh(frm) {
		render_visits(frm);
		if (frm.is_new()) return;
		show_visit_count(frm);
		manav.lead_quotation.add_button(frm, frm.doc.name, frm.doc.stage, frm.doc.quotation);
		if (frappe.model.can_create("Manav Visit")) {
			frm.add_custom_button(__("New Visit"), () => frappe.new_doc("Manav Visit", { lead: frm.doc.name })).addClass(
				"btn-primary"
			);
			frm.add_custom_button(__("Next Stage"), () => next_lead_stage(frm));
		}
	},
});

// "3 Visits" at the top of the lead; a click opens the lead's visits.
function show_visit_count(frm) {
	frappe.db.count("Manav Visit", { filters: { lead: frm.doc.name, docstatus: ["!=", 2] } }).then((n) => {
		frm.dashboard.set_headline(
			`<a href="#" class="manav-lead-visits"><b>${n === 1 ? __("1 Visit") : __("{0} Visits", [n])}</b></a>`
		);
		frm.dashboard.wrapper.find(".manav-lead-visits").on("click", (e) => {
			e.preventDefault();
			frappe.route_options = { lead: frm.doc.name };
			frappe.set_route("List", "Manav Visit");
		});
	});
}

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

// A new visit of the lead in the stage after its current one (by the stages' Sequence; no stage yet:
// the first one); submitting the visit moves the lead there.
function next_lead_stage(frm) {
	frappe.db
		.get_list("Manav Lead Stage", { fields: ["name", "days"], order_by: "sequence asc", limit: 0 })
		.then((stages) => {
			const idx = stages.findIndex((s) => s.name === frm.doc.stage);
			const next = idx < 0 ? stages[0] : stages[idx + 1];
			if (!next) {
				frappe.msgprint(__("The lead is already at the last stage ({0}).", [frm.doc.stage || "-"]));
				return;
			}
			const values = { lead: frm.doc.name, stage: next.name };
			if (cint(next.days) > 0) values.next_visit_date = frappe.datetime.add_days(frappe.datetime.get_today(), cint(next.days));
			frappe.new_doc("Manav Visit", values);
		});
}
