// Page "Customer Dashboard" (/desk/customer-dashboard): everything about one customer on one page,
// for management. The customer is chosen in the drop-down at the top (or opened with
// /desk/customer-dashboard?customer=<name>); the figures come from
// manav.manav.customer_dashboard.get_customer_dashboard, which also refuses users who are not
// management (the page itself has no roles, as Manav Management is created only after migrate).
//
// Shown: the customer's head (group, territory, Haas Cust ID, Account Manager), key figures
// (quotations, quoted value, conversion, Draft / Final PIs, ordered, invoiced, outstanding,
// received; company currency), quoted vs ordered by month, and the lists: Quotations, Draft PIs,
// Final PIs, Sales Invoices, Payments, Machines, Contacts, Addresses, and the old system's
// quotations and contact persons. Each row opens its document.
//
// Working: Frappe's documented page API (frappe.ui.make_app_page, page.add_field) and frappe.Chart,
// checked on Frappe 16.33.1. Styles use Frappe's CSS variables, so light and dark themes work.
//
// Created: 2026-10-29, when the user asked for a customer dashboard showing all information about
// a customer, the admin choosing the customer from a drop-down.
//
// CHANGE NOTE
// Date: 2026-10-29
// Change: Removed the "Customer Details" card (every filled field of the Customer form).
// Reason: The user asked not to show it.
//
// CHANGE NOTE
// Date: 2026-10-29
// Change: The page is in tabs under the customer's head: Overview (key figures, chart), Quotations
// & PIs, Invoices & Payments, Machines, Contacts & Addresses, Old Records; each tab shows how many
// rows it has. The chosen tab is kept when another customer is chosen.
// Reason: The user asked for tabs on the customer dashboard.
//
// CHANGE NOTE
// Date: 2026-10-29
// Change: In a tab the lists are one under the other at full width (were up to three side by
// side, cut off and scrolling sideways); roomier rows with hover; Principal shows the principal's
// name; "Not Submitted" is red; an empty list says "No ... yet".
// Reason: The user found the tabs "not looking good" (screenshot of Quotations & PIs).
//
// CHANGE NOTE
// Date: 2026-11-02
// Change: New look in the frappe-ui design language, with the desk's frappe-ui colour tokens
// (--ink-gray-*, --surface-*, --outline-*), so light and dark themes still work: a header with
// avatar, details line and contact chips; underline tabs with count pills; the key figures grouped
// as Sales / Orders / Accounts number cards (conversion with a bar, outstanding red and received green
// when not zero); a chart card with its own legend colours and shortened Y-axis numbers (they were
// cut off, "0000000"); list cards with tinted status badges, right-aligned figures and an empty
// state. The data and what the page shows are unchanged.
// Reason: The user asked to make the dashboard prettier, in the frappe-ui style.
//
// CHANGE NOTE
// Date: 2026-11-03
// Change: The tab "Quotations & PIs" shows one "deal" per row instead of three separate tables:
// Quotation -> Draft PI -> Final PI side by side as stage cards (number, date, amount, status;
// Delivered / Billed on a submitted Final PI; a dashed "Not yet" stage when not reached), linked
// through the quotation's Draft PI No. / Final PI No., the Draft PI's quotation / final_pi and the
// Sales Order's custom_quotation / custom_draft_pi. Draft and Final PIs without a quotation get a
// row of their own. A strip above gives the count and value per stage and the "Open list" links.
// Reason: The user found the three tables "still not good" (columns spread out, not lined up, link
// columns mostly empty).
//
// CHANGE NOTE
// Date: 2026-11-03
// Change: Colour bands: the Overview groups in their own colour (Sales blue, Orders purple,
// Accounts green: coloured title label, a band on top of each card, a light tint); each tab with
// its own colour dot, and a coloured underline, tint and count pill when active.
// Reason: The user asked for colour bands on the dashboard (screenshot of the Overview tab).
//
// CHANGE NOTE
// Date: 2026-11-03
// Change: The header no longer shows the Account Manager chip.
// Reason: The user asked to remove Account Manager everywhere.
//
// CHANGE NOTE
// Date: 2026-11-04
// Change: The look of the Lead Dashboard and the Leads page: 16 px cards, a header tinted with the
// accent colour, key figure tiles with a coloured icon and a large figure (hover lift), pill tabs
// in each tab's colour, and phone styles (below 600 px: two tiles a row, a swipeable tab row, smaller
// header). Only the styles and the tile icons change; data, tabs and lists are as before.
// Reason: The user asked for the customer dashboard to match the Leads page and the Lead
// Dashboard, unchanged otherwise, and good on a phone.

frappe.pages["customer-dashboard"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Customer Dashboard"),
		single_column: true,
	});
	add_styles();

	const body = $('<div class="mcd"></div>').appendTo(page.main);
	const field = page.add_field({
		fieldname: "customer",
		label: __("Customer"),
		fieldtype: "Link",
		options: "Customer",
		change() {
			const customer = field.get_value();
			if (customer && customer !== page.mcd_customer) load(page, body, customer);
		},
	});
	page.mcd_field = field;
	page.add_inner_button(__("Open Customer"), () => {
		if (page.mcd_customer) frappe.set_route("Form", "Customer", page.mcd_customer);
	});
	page.add_inner_button(__("New Quotation"), () => {
		if (!page.mcd_customer) return;
		frappe.new_doc("Quotation", { quotation_to: "Customer", party_name: page.mcd_customer });
	});
	show_empty(body);
};

// The customer from the address (?customer=...) or from route_options (frappe.set_route with
// options), each time the page is shown.
frappe.pages["customer-dashboard"].on_page_show = function (wrapper) {
	const page = wrapper.page;
	const customer =
		(frappe.route_options && frappe.route_options.customer) || frappe.utils.get_query_params().customer;
	frappe.route_options = null;
	if (page && page.mcd_field && customer && customer !== page.mcd_customer) {
		page.mcd_field.set_value(customer);
	}
};

// Before a customer is chosen: a centred empty state (frappe-ui style).
function show_empty(body) {
	body.html(`<div class="mcd-empty">
		<div class="mcd-empty-icon">${frappe.utils.icon("users", "md")}</div>
		<div class="mcd-empty-title">${__("No customer chosen")}</div>
		<div class="mcd-empty-text">${__("Choose a customer in the field above to see quotations, PIs, invoices and contacts.")}</div>
	</div>`);
}

function load(page, body, customer) {
	page.mcd_customer = customer;
	body.html(`<div class="mcd-empty"><div class="mcd-empty-text">${__("Loading...")}</div></div>`);
	frappe
		.call({ method: "manav.manav.customer_dashboard.get_customer_dashboard", args: { customer } })
		.then((r) => {
			if (page.mcd_customer !== customer) return; // another customer was chosen meanwhile
			render(body, r.message);
		})
		.catch(() => show_empty(body));
}

// ---- formatting --------------------------------------------------------------------------

const esc = (v) => frappe.utils.escape_html(v == null ? "" : String(v));
const money = (v, currency) => (v == null ? "" : format_currency(v, currency));
const date = (v) => (v ? frappe.datetime.str_to_user(v) : "");
const link = (doctype, name, text) =>
	name ? `<a href="/desk/${frappe.router.slug(doctype)}/${encodeURIComponent(name)}">${esc(text || name)}</a>` : "";

// A list as a table. columns: [label, (row) => html, "right" for numbers]
function table(title, rows, columns, doctype_for_list, list_filters) {
	if (rows == null) return ""; // the reader may not see this doctype
	const more =
		doctype_for_list && rows.length
			? `<button type="button" class="mcd-more" data-doctype="${esc(doctype_for_list)}" data-filters='${esc(JSON.stringify(list_filters || {}))}'>${__("Open list")} &rarr;</button>`
			: "";
	const head = columns.map((c) => `<th class="${c[2] || ""}">${esc(c[0])}</th>`).join("");
	const lines = rows.length
		? rows
				.map((row) => `<tr>${columns.map((c) => `<td class="${c[2] || ""}">${c[1](row) ?? ""}</td>`).join("")}</tr>`)
				.join("")
		: `<tr><td colspan="${columns.length}" class="mcd-none">${__("No {0} yet", [title])}</td></tr>`;
	return `<div class="mcd-card">
		<div class="mcd-card-head"><span class="mcd-card-title">${esc(title)} <span class="mcd-pill">${rows.length}</span></span>${more}</div>
		<div class="mcd-scroll"><table class="mcd-table"><thead><tr>${head}</tr></thead><tbody>${lines}</tbody></table></div>
	</div>`;
}

// A status as a frappe-ui subtle badge: red problems, amber waiting, blue open, green done.
function status(text, docstatus) {
	if (!text) return "";
	const theme =
		docstatus === 2 || /not submitted|cancel|lost|expired|overdue/i.test(text)
			? "red"
			: /draft|to deliver|to bill|unpaid|partly|pending/i.test(text)
			? "amber"
			: /open|active/i.test(text)
			? "blue"
			: "green";
	return badge(__(text), theme);
}

const badge = (text, theme) => `<span class="mcd-badge mcd-badge-${theme || "gray"}">${esc(text)}</span>`;

// 2026-11-04: small line icons for the key figures, the same set as the Lead Dashboard's
const MCD_ICONS = {
	file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
	money: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
	check: '<path d="M20 6 9 17l-5-5"/>',
	trend: '<path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
	alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
};
const mcd_icon = (name) =>
	`<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${MCD_ICONS[name] || MCD_ICONS.file}</svg>`;

// ---- deals (tab Quotations & PIs, 2026-11-03) -------------------------------------------

// Each quotation with the Draft PI and Final PI made from it, then the Draft / Final PIs that
// belong to no quotation shown here. Lists the reader may not see (null) count as empty.
function deals(data) {
	const quotations = data.quotations || [];
	const drafts = data.draft_pis || [];
	const finals = data.sales_orders || [];
	const used_drafts = new Set();
	const used_finals = new Set();
	const take = (list, used, test) => {
		const row = list.find((r) => !used.has(r.name) && test(r));
		if (row) used.add(row.name);
		return row || null;
	};
	const final_for = (q, d) =>
		take(
			finals,
			used_finals,
			(s) =>
				(q && (s.name === q.custom_pi_no || s.custom_quotation === q.name)) ||
				(d && (s.name === d.final_pi || s.custom_draft_pi === d.name))
		);
	const out = quotations.map((q) => {
		const d = take(drafts, used_drafts, (r) => r.name === q.custom_draft_pi_no || r.quotation === q.name);
		return { q, d, s: final_for(q, d) };
	});
	drafts
		.filter((d) => !used_drafts.has(d.name))
		.forEach((d) => {
			used_drafts.add(d.name);
			out.push({ q: null, d, s: final_for(null, d) });
		});
	finals.filter((s) => !used_finals.has(s.name)).forEach((s) => out.push({ q: null, d: null, s }));
	return out;
}

// One stage of a deal: label and status, number, date and amount; dashed "Not yet" when the deal
// has not got there.
function stage(label, doctype, row, fields) {
	if (!row) {
		return `<div class="mcd-stage mcd-stage-empty"><div class="mcd-stage-label">${esc(label)}</div><div class="mcd-stage-none">${__("Not yet")}</div></div>`;
	}
	return `<div class="mcd-stage">
		<div class="mcd-stage-top"><span class="mcd-stage-label">${esc(label)}</span>${fields.status || ""}</div>
		<div class="mcd-stage-no">${link(doctype, row.name)}</div>
		<div class="mcd-stage-meta"><span>${esc(fields.date || "")}</span><span class="mcd-stage-amount">${fields.amount || ""}</span></div>
		${fields.extra || ""}
	</div>`;
}

const progress = (label, value) => {
	const v = Math.max(0, Math.min(100, Math.round(value || 0)));
	return `<div class="mcd-mini"><span>${esc(label)}</span><div class="mcd-mini-bar"><span style="width: ${v}%"></span></div><span>${v}%</span></div>`;
};

function deals_tab(data, c) {
	if (data.quotations == null && data.draft_pis == null && data.sales_orders == null) return "";
	const rows = deals(data);
	const sum = (list, key) => list.reduce((n, r) => n + (r[key] || 0), 0);
	// the value of a stage only when all its rows are in one currency
	const one_currency = (list) => {
		const set = new Set(list.map((r) => r.currency).filter(Boolean));
		return set.size === 1 ? [...set][0] : null;
	};
	const summary = [
		[__("Quotations"), data.quotations, "grand_total", "Quotation", { quotation_to: "Customer", party_name: c.name }],
		[__("Draft PIs"), data.draft_pis, "net_total", "Draft PI", { customer: c.name }],
		[__("Final PIs"), data.sales_orders, "grand_total", "Sales Order", { customer: c.name }],
	]
		.filter((x) => x[1] != null)
		.map(([label, list, key, doctype, filters]) => {
			const cur = one_currency(list);
			const more = list.length
				? `<button type="button" class="mcd-more" data-doctype="${esc(doctype)}" data-filters='${esc(JSON.stringify(filters))}'>${__("Open list")} &rarr;</button>`
				: "";
			return `<div class="mcd-sum">
				<div class="mcd-sum-label">${esc(label)} <span class="mcd-pill">${list.length}</span></div>
				<div class="mcd-sum-value">${list.length && cur ? money(sum(list, key), cur) : "&mdash;"}</div>
				${more}
			</div>`;
		})
		.join("");

	const arrow = `<div class="mcd-arrow">&rarr;</div>`;
	const body = rows.length
		? rows
				.map(({ q, d, s }) => {
					const stages = [
						stage(__("Quotation"), "Quotation", q, q && {
							status: status(q.status, q.docstatus),
							date: date(q.transaction_date),
							amount: money(q.grand_total, q.currency),
							extra: q.principal || q.custom_quotation_type
								? `<div class="mcd-stage-sub">${esc(q.principal || q.custom_quotation_type)}</div>`
								: "",
						}),
						stage(__("Draft PI"), "Draft PI", d, d && {
							status: status(d.status),
							date: date(d.transaction_date),
							amount: money(d.net_total, d.currency),
						}),
						stage(__("Final PI"), "Sales Order", s, s && {
							status: status(s.docstatus === 0 ? "Not Submitted" : s.status, s.docstatus),
							date: date(s.transaction_date),
							amount: money(s.grand_total, s.currency),
							extra: s.docstatus === 1 ? progress(__("Delivered"), s.per_delivered) + progress(__("Billed"), s.per_billed) : "",
						}),
					];
					return `<div class="mcd-deal">${stages.join(arrow)}</div>`;
				})
				.join("")
		: `<div class="mcd-none">${__("No quotations or PIs yet")}</div>`;

	return `<div class="mcd-sums">${summary}</div>
		<div class="mcd-card">
			<div class="mcd-card-head"><span class="mcd-card-title">${__("Deals")} <span class="mcd-pill">${rows.length}</span>
				<span class="mcd-card-note">${__("Quotation")} &rarr; ${__("Draft PI")} &rarr; ${__("Final PI")}</span></span></div>
			<div class="mcd-deals">${body}</div>
		</div>`;
}

// ---- page --------------------------------------------------------------------------------

// The tab shown; kept when another customer is chosen.
let active_tab = "overview";

// The lists of a tab, one under the other at full width; empty when the reader may see none of them.
function grid(...cards) {
	const html = cards.filter(Boolean).join("");
	return html ? `<div class="mcd-grid">${html}</div>` : "";
}

function render(body, data) {
	const c = data.customer;
	const cur = data.currency;
	const f = data.figures || {};
	const name = c.customer_name || c.name;

	// Header: details line (id, group, territory, type) and chips (contact, Haas Cust ID, manager)
	const details = [link("Customer", c.name), esc(c.customer_group), esc(c.territory), esc(c.customer_type)]
		.filter(Boolean)
		.join(`<span class="mcd-dot">&middot;</span>`);
	const chips = [
		c.email ? `<a class="mcd-chip" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : "",
		c.mobile ? `<a class="mcd-chip" href="tel:${esc(c.mobile)}">${esc(c.mobile)}</a>` : "",
		c.haas_customer_id ? `<span class="mcd-chip"><span class="mcd-chip-label">${__("Haas Cust ID")}</span> ${esc(c.haas_customer_id)}</span>` : "",
		// 2026-11-03: no Account Manager chip (the user asked to remove Account Manager everywhere)
	].join("");

	// Key figures as frappe-ui number cards, in three groups; tone "red" / "green" colours the value.
	// 2026-11-04: with a small icon in the group's colour, as the Lead Dashboard's tiles
	const card = (label, value, note, extra = "", tone = "", ic = "") =>
		value == null
			? ""
			: `<div class="mcd-tile"><div class="mcd-tile-top"><span class="mcd-tile-label">${esc(label)}</span>${ic ? `<span class="mcd-tile-ic">${mcd_icon(ic)}</span>` : ""}</div>
				<div class="mcd-tile-value${tone ? ` mcd-${tone}` : ""}">${esc(value)}</div>
				${extra}<div class="mcd-tile-note">${esc(note || "")}</div></div>`;
	const conversion_bar =
		f.conversion != null
			? `<div class="mcd-bar"><span style="width: ${Math.max(0, Math.min(100, Number(f.conversion) || 0))}%"></span></div>`
			: "";
	// 2026-11-03: each group in its own colour (tone): a band on top of its cards, a coloured title
	const group = (title, cards, tone) => {
		const inner = cards.join("");
		return inner
			? `<div class="mcd-group mcd-tone-${tone}"><div class="mcd-group-title">${esc(title)}</div><div class="mcd-tiles">${inner}</div></div>`
			: "";
	};
	const figures = [
		group(__("Sales"), [
			card(__("Quotations"), f.quotations, f.open_quotations != null ? `${f.open_quotations} ${__("open")}` : "", "", "", "file"),
			card(__("Quoted value"), f.quoted_value != null ? money(f.quoted_value, cur) : null, __("before taxes"), "", "", "money"),
			card(__("Conversion"), f.conversion != null ? `${f.conversion}%` : f.quotations != null ? "-" : null, __("of submitted quotations"), conversion_bar, "", "trend"),
		], "blue"),
		group(__("Orders"), [
			card(__("Draft PIs"), f.draft_pis, "", "", "", "file"),
			card(__("Final PIs"), f.final_pis, f.last_order ? `${__("last")} ${date(f.last_order)}` : "", "", "", "check"),
			card(__("Ordered value"), f.ordered_value != null ? money(f.ordered_value, cur) : null, __("before taxes"), "", "", "money"),
		], "purple"),
		group(__("Accounts"), [
			card(__("Invoiced"), f.invoiced != null ? money(f.invoiced, cur) : null, "", "", "", "file"),
			card(__("Outstanding"), f.outstanding != null ? money(f.outstanding, cur) : null, "", "", f.outstanding > 0 ? "red" : "", "alert"),
			card(__("Received"), f.received != null ? money(f.received, cur) : null, "", "", f.received > 0 ? "green" : "", "check"),
		], "green"),
	].join("");

	const html = [];
	const t = {}; // the lists, by name, put into the tabs below
	html.push(`<div class="mcd-card mcd-head">
		${c.image ? `<img class="mcd-image" src="${esc(c.image)}" alt="">` : `<div class="mcd-avatar">${esc(frappe.get_abbr(name))}</div>`}
		<div class="mcd-head-text">
			<div class="mcd-name">${esc(name)} ${c.disabled ? badge(__("Disabled"), "red") : ""}</div>
			<div class="mcd-sub">${details}</div>
			${chips ? `<div class="mcd-chips">${chips}</div>` : ""}
		</div>
	</div>`);
	const overview = `${figures}
		<div class="mcd-card">
			<div class="mcd-card-head">
				<span class="mcd-card-title">${__("Quoted vs ordered")}<span class="mcd-card-note">${__("by month")} &middot; ${esc(cur)} &middot; ${__("before taxes")}</span></span>
			</div>
			<div class="mcd-chart"></div>
		</div>`;

	t.quotations = table(__("Quotations"), data.quotations, [
		[__("No."), (r) => link("Quotation", r.name)],
		[__("Date"), (r) => date(r.transaction_date)],
		[__("Principal"), (r) => esc(r.principal || r.custom_quotation_type)],
		[__("Status"), (r) => status(r.status, r.docstatus)],
		[__("Amount"), (r) => money(r.grand_total, r.currency), "right"],
		[__("Draft PI"), (r) => link("Draft PI", r.custom_draft_pi_no)],
		[__("Final PI"), (r) => link("Sales Order", r.custom_pi_no)],
	], "Quotation", { quotation_to: "Customer", party_name: c.name });
	t.draft_pis = table(__("Draft PIs"), data.draft_pis, [
		[__("No."), (r) => link("Draft PI", r.name)],
		[__("Date"), (r) => date(r.transaction_date)],
		[__("Quotation"), (r) => link("Quotation", r.quotation)],
		[__("Status"), (r) => status(r.status)],
		[__("Total"), (r) => money(r.net_total, r.currency), "right"],
		[__("Final PI"), (r) => link("Sales Order", r.final_pi)],
	], "Draft PI", { customer: c.name });
	t.sales_orders = table(__("Final PIs (Sales Orders)"), data.sales_orders, [
		[__("No."), (r) => link("Sales Order", r.name)],
		[__("Date"), (r) => date(r.transaction_date)],
		[__("Status"), (r) => status(r.docstatus === 0 ? "Not Submitted" : r.status, r.docstatus)],
		[__("Amount"), (r) => money(r.grand_total, r.currency), "right"],
		[__("Delivered"), (r) => `${Math.round(r.per_delivered || 0)}%`, "right"],
		[__("Billed"), (r) => `${Math.round(r.per_billed || 0)}%`, "right"],
		[__("Draft PI"), (r) => link("Draft PI", r.custom_draft_pi)],
	], "Sales Order", { customer: c.name });
	t.invoices = table(__("Sales Invoices"), data.invoices, [
		[__("No."), (r) => link("Sales Invoice", r.name)],
		[__("Date"), (r) => date(r.posting_date)],
		[__("Status"), (r) => status(r.status)],
		[__("Amount"), (r) => money(r.grand_total, r.currency), "right"],
		[__("Outstanding"), (r) => money(r.outstanding_amount, r.currency), "right"],
		[__("Due"), (r) => date(r.due_date)],
	], "Sales Invoice", { customer: c.name, docstatus: 1 });
	t.payments = table(__("Payments Received"), data.payments, [
		[__("No."), (r) => link("Payment Entry", r.name)],
		[__("Date"), (r) => date(r.posting_date)],
		[__("Mode"), (r) => esc(r.mode_of_payment)],
		[__("Amount"), (r) => money(r.paid_amount, r.paid_from_account_currency), "right"],
		[__("Reference"), (r) => esc(r.reference_no)],
	], "Payment Entry", { party_type: "Customer", party: c.name });
	t.machines = table(__("Machines (Serial Nos)"), data.machines, [
		[__("Serial No"), (r) => link("Serial No", r.name)],
		[__("Model"), (r) => esc(r.item_code)],
		[__("Name"), (r) => esc(r.item_name)],
		[__("Status"), (r) => status(r.status)],
		[__("Warranty till"), (r) => date(r.warranty_expiry_date)],
		[__("AMC till"), (r) => date(r.amc_expiry_date)],
	], "Serial No", { customer: c.name });
	t.contacts = table(__("Contacts"), data.contacts, [
		[__("Name"), (r) => link("Contact", r.name, [r.first_name, r.last_name].filter(Boolean).join(" ") || r.name) + (r.is_primary_contact ? ` ${badge(__("Primary"), "blue")}` : "")],
		[__("Designation"), (r) => esc([r.designation, r.department].filter(Boolean).join(", "))],
		[__("Email"), (r) => (r.email_id ? `<a href="mailto:${esc(r.email_id)}">${esc(r.email_id)}</a>` : "")],
		[__("Mobile / Phone"), (r) => esc([r.mobile_no, r.phone].filter(Boolean).join(" / "))],
	]);
	t.addresses = table(__("Addresses"), data.addresses, [
		[__("Type"), (r) => link("Address", r.name, r.address_type || r.name) + (r.is_primary_address ? ` ${badge(__("Primary"), "blue")}` : "")],
		[__("Address"), (r) => esc([r.address_line1, r.address_line2, r.city, r.state, r.pincode, r.country].filter(Boolean).join(", "))],
		[__("GSTIN"), (r) => esc(r.gstin)],
	]);
	t.old_contacts = table(__("Old Contact Persons"), data.old_contacts, [
		[__("Name"), (r) => link("Customer Contact Person", r.name, r.contact_name)],
		[__("Designation"), (r) => esc([r.designation, r.department].filter(Boolean).join(", "))],
		[__("Email"), (r) => esc(r.email)],
		[__("Mobile / Phone"), (r) => esc([r.mobile_no, r.phone].filter(Boolean).join(" / "))],
	]);
	t.old_quotations = table(__("Old Quotations"), data.old_quotations, [
		[__("No."), (r) => link("Quotation Head", r.name, r.quotation_no || r.name)],
		[__("Date"), (r) => date(r.quotation_date)],
		[__("Type"), (r) => esc(r.quotation_type)],
		[__("Amount"), (r) => esc(r.final_amount != null ? `${r.currency || ""} ${format_number(r.final_amount, null, 2)}` : ""), "right"],
	], "Quotation Head", { customer: c.name });

	// The tabs (2026-10-29): Overview first; a tab whose lists the reader may not see is left out.
	// The count is the number of rows shown in its lists.
	const count = (...keys) => keys.reduce((n, k) => n + (data[k] ? data[k].length : 0), 0);
	const tabs = [
		["overview", __("Overview"), overview, null],
		// 2026-11-03: deals (stage cards) instead of the tables t.quotations / t.draft_pis / t.sales_orders
		["sales", __("Quotations & PIs"), deals_tab(data, c), count("quotations", "draft_pis", "sales_orders")],
		["accounts", __("Invoices & Payments"), grid(t.invoices, t.payments), count("invoices", "payments")],
		["machines", __("Machines"), grid(t.machines), count("machines")],
		["contacts", __("Contacts & Addresses"), grid(t.contacts, t.addresses, t.old_contacts), count("contacts", "addresses", "old_contacts")],
		["old", __("Old Records"), grid(t.old_quotations), count("old_quotations")],
	].filter((tab) => tab[2]);
	if (!tabs.some((tab) => tab[0] === active_tab)) active_tab = "overview";
	// 2026-11-03: each tab in its own colour (dot; underline and tint when active)
	const tab_tone = { overview: "gray", sales: "blue", accounts: "green", machines: "orange", contacts: "cyan", old: "purple" };

	html.push(`<div class="mcd-tabs">${tabs
		.map(
			(tab) => `<button class="mcd-tab mcd-tone-${tab_tone[tab[0]] || "gray"} ${tab[0] === active_tab ? "active" : ""}" data-tab="${tab[0]}"><span class="mcd-tab-dot"></span>${esc(tab[1])}${
				tab[3] != null ? ` <span class="mcd-pill">${tab[3]}</span>` : ""
			}</button>`
		)
		.join("")}</div>`);
	tabs.forEach((tab) =>
		html.push(`<div class="mcd-pane" data-pane="${tab[0]}" ${tab[0] === active_tab ? "" : "hidden"}>${tab[2]}</div>`)
	);

	body.html(html.join(""));

	body.find(".mcd-tab").on("click", function () {
		active_tab = $(this).attr("data-tab");
		body.find(".mcd-tab").removeClass("active");
		$(this).addClass("active");
		body.find(".mcd-pane").attr("hidden", true);
		body.find(`.mcd-pane[data-pane="${active_tab}"]`).removeAttr("hidden");
		draw_chart(body, data, cur);
	});

	body.find(".mcd-more").on("click", function () {
		frappe.route_options = JSON.parse($(this).attr("data-filters"));
		frappe.set_route("List", $(this).attr("data-doctype"));
	});

	draw_chart(body, data, cur);
}

// The chart is drawn once, while Overview is shown (frappe.Chart needs a visible box for its width).
function draw_chart(body, data, cur) {
	const box = body.find(".mcd-chart");
	if (!box.length || !box.is(":visible") || box.attr("data-drawn")) return;
	box.attr("data-drawn", 1);
	if (data.chart && data.chart.labels.length) {
		new frappe.Chart(box[0], {
			type: "bar",
			height: 260,
			// quoted light, ordered strong; short Y labels (1.2Cr instead of cut-off digits)
			colors: ["light-blue", "blue"],
			axisOptions: { xIsSeries: 0, shortenYAxisNumbers: 1 },
			barOptions: { spaceRatio: 0.4 },
			data: {
				labels: data.chart.labels,
				datasets: [
					{ name: __("Quoted"), values: data.chart.quoted },
					{ name: __("Ordered"), values: data.chart.ordered },
				],
			},
			tooltipOptions: { formatTooltipY: (v) => format_currency(v, cur) },
		});
	}
}

// frappe-ui look with the desk's token variables (Frappe 16: --ink-gray-1..9, --surface-gray-1..7,
// --surface-<colour>-1..3, --outline-gray-1..5); they switch with the light / dark theme.
function add_styles() {
	if (document.getElementById("mcd-styles")) return;
	$("<style id='mcd-styles'></style>")
		.text(
			`
.mcd { padding-bottom: var(--padding-xl); color: var(--ink-gray-8); }
.mcd-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 72px 16px; text-align: center; }
.mcd-empty-icon { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; margin-bottom: 6px; border-radius: 50%; background: var(--surface-gray-2); color: var(--ink-gray-5); }
.mcd-empty-title { font-size: var(--text-base); font-weight: 500; color: var(--ink-gray-8); }
.mcd-empty-text { max-width: 360px; font-size: var(--text-sm); color: var(--ink-gray-5); }

.mcd-card { background: var(--surface-cards, var(--card-bg)); border: 1px solid var(--outline-gray-1); border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
.mcd-card-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--outline-gray-1); }
.mcd-card-title { display: inline-flex; align-items: center; gap: 8px; font-size: var(--text-base); font-weight: 600; color: var(--ink-gray-9); }
.mcd-card-note { margin-left: 4px; font-size: var(--text-sm); font-weight: 400; color: var(--ink-gray-5); }
.mcd-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 18px; padding: 0 6px; border-radius: 999px; background: var(--surface-gray-2); color: var(--ink-gray-6); font-size: var(--text-xs); font-weight: 500; font-variant-numeric: tabular-nums; }
.mcd-more { padding: 3px 8px; border: 0; border-radius: 8px; background: transparent; color: var(--ink-gray-6); font-size: var(--text-sm); cursor: pointer; }
.mcd-more:hover { background: var(--surface-gray-2); color: var(--ink-gray-8); }

/* header */
.mcd-head { display: flex; gap: 16px; align-items: center; padding: 20px; }
.mcd-image, .mcd-avatar { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; flex: none; }
.mcd-avatar { display: flex; align-items: center; justify-content: center; background: var(--surface-blue-2); color: var(--ink-blue-3); font-size: 20px; font-weight: 600; }
.mcd-head-text { min-width: 0; }
.mcd-name { display: flex; align-items: center; gap: 8px; font-size: var(--text-2xl); font-weight: 600; color: var(--ink-gray-9); line-height: 1.25; }
.mcd-sub { display: flex; flex-wrap: wrap; align-items: center; margin-top: 4px; font-size: var(--text-sm); color: var(--ink-gray-5); }
.mcd-sub a { color: var(--ink-gray-7); }
.mcd-dot { margin: 0 6px; color: var(--ink-gray-4); }
.mcd-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.mcd-chip { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 10px; border-radius: 999px; background: var(--surface-gray-2); color: var(--ink-gray-7); font-size: var(--text-xs); text-decoration: none; }
a.mcd-chip:hover { background: var(--surface-gray-3); color: var(--ink-gray-9); text-decoration: none; }
.mcd-chip-label { color: var(--ink-gray-5); }

/* tabs (frappe-ui underline tabs) */
.mcd-tabs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid var(--outline-gray-1); }
.mcd-tab { display: inline-flex; align-items: center; gap: 6px; margin-bottom: -1px; padding: 10px 12px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--ink-gray-5); font-size: var(--text-base); font-weight: 500; }
.mcd-tab:hover { color: var(--ink-gray-8); }
.mcd-tab.active { color: var(--ink-gray-9); border-bottom-color: var(--ink-gray-9); }
.mcd-tab.active .mcd-pill { background: var(--surface-gray-3); color: var(--ink-gray-8); }
/* 2026-11-03: colour bands. A tone sets --mcd-c (the colour); tints are mixed from it, so they
   work in light and dark themes alike. */
.mcd-tone-gray { --mcd-c: var(--gray-600); }
.mcd-tone-blue { --mcd-c: var(--blue-500); }
.mcd-tone-purple { --mcd-c: var(--purple-500); }
.mcd-tone-green { --mcd-c: var(--green-500); }
.mcd-tone-orange { --mcd-c: var(--orange-500); }
.mcd-tone-cyan { --mcd-c: var(--cyan-500); }
.mcd-tab { border-radius: 8px 8px 0 0; }
.mcd-tab-dot { width: 8px; height: 8px; border-radius: 999px; background: var(--mcd-c); }
.mcd-tab:hover { background: color-mix(in srgb, var(--mcd-c) 8%, transparent); }
.mcd-tab.active { color: var(--mcd-c); border-bottom-color: var(--mcd-c); background: color-mix(in srgb, var(--mcd-c) 12%, transparent); font-weight: 600; }
.mcd-tab.active .mcd-pill { background: var(--mcd-c); color: #fff; }

/* key figures (frappe-ui NumberCard) */
.mcd-group { margin-bottom: 16px; }
.mcd-group-title { margin-bottom: 8px; font-size: var(--text-sm); font-weight: 500; color: var(--ink-gray-5); }
/* 2026-11-03: the group title as a coloured label, its cards with a colour band on top */
.mcd-group[class*="mcd-tone-"] .mcd-group-title { display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px; border-radius: 999px; color: var(--mcd-c); background: color-mix(in srgb, var(--mcd-c) 12%, transparent); font-weight: 600; }
.mcd-group[class*="mcd-tone-"] .mcd-tile { border-top: 4px solid var(--mcd-c); background: linear-gradient(180deg, color-mix(in srgb, var(--mcd-c) 6%, transparent), transparent 60%), var(--surface-cards, var(--card-bg)); }
.mcd-group[class*="mcd-tone-"] .mcd-bar > span { background: var(--mcd-c); }
.mcd-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.mcd-tile { display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; background: var(--surface-cards, var(--card-bg)); border: 1px solid var(--outline-gray-1); border-radius: 12px; }
.mcd-tile-label { font-size: var(--text-sm); color: var(--ink-gray-5); }
.mcd-tile-value { font-size: var(--text-2xl); font-weight: 600; color: var(--ink-gray-9); line-height: 1.25; font-variant-numeric: tabular-nums; }
.mcd-tile-value.mcd-red { color: var(--ink-red-3); }
.mcd-tile-value.mcd-green { color: var(--ink-green-3); }
.mcd-tile-note { min-height: 1em; font-size: var(--text-xs); color: var(--ink-gray-5); }
.mcd-bar { height: 6px; margin: 2px 0; border-radius: 999px; background: var(--surface-gray-2); overflow: hidden; }
.mcd-bar > span { display: block; height: 100%; border-radius: 999px; background: var(--ink-blue-2); }

.mcd-chart { padding: 12px 8px 4px; }

/* lists */
.mcd-grid { display: block; }
.mcd-scroll { overflow-x: auto; max-height: 440px; overflow-y: auto; }
.mcd-table { width: 100%; font-size: var(--text-sm); border-collapse: collapse; }
.mcd-table th { position: sticky; top: 0; z-index: 1; padding: 8px 16px; background: var(--surface-cards, var(--card-bg)); border-bottom: 1px solid var(--outline-gray-1); color: var(--ink-gray-5); font-weight: 400; text-align: left; white-space: nowrap; }
.mcd-table td { height: 40px; padding: 6px 16px; border-top: 1px solid var(--outline-gray-1); color: var(--ink-gray-7); white-space: nowrap; vertical-align: middle; }
.mcd-table tbody tr:first-child td { border-top: 0; }
.mcd-table tbody tr:hover td { background: var(--surface-gray-1); }
.mcd-table td a { color: var(--ink-gray-9); font-weight: 500; }
.mcd-table td a:hover { text-decoration: underline; }
.mcd-table .right { text-align: right; font-variant-numeric: tabular-nums; }
.mcd-none { padding: 28px 16px !important; color: var(--ink-gray-4) !important; text-align: center; }

/* badges (frappe-ui Badge, subtle) */
.mcd-badge { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; font-size: var(--text-xs); font-weight: 500; white-space: nowrap; }
.mcd-badge-gray { background: var(--surface-gray-2); color: var(--ink-gray-7); }
.mcd-badge-green { background: var(--surface-green-2); color: var(--ink-green-3); }
.mcd-badge-red { background: var(--surface-red-2); color: var(--ink-red-3); }
.mcd-badge-amber { background: var(--surface-amber-2); color: var(--ink-amber-3); }
.mcd-badge-blue { background: var(--surface-blue-2); color: var(--ink-blue-3); }

/* deals: Quotation -> Draft PI -> Final PI (2026-11-03) */
.mcd-sums { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
.mcd-sum { display: flex; flex-direction: column; gap: 4px; padding: 12px 16px; background: var(--surface-cards, var(--card-bg)); border: 1px solid var(--outline-gray-1); border-radius: 12px; }
.mcd-sum-label { display: inline-flex; align-items: center; gap: 8px; font-size: var(--text-sm); color: var(--ink-gray-5); }
.mcd-sum-value { font-size: var(--text-xl); font-weight: 600; color: var(--ink-gray-9); font-variant-numeric: tabular-nums; }
.mcd-sum .mcd-more { align-self: flex-start; margin-left: -8px; }
.mcd-deals { display: flex; flex-direction: column; }
.mcd-deal { display: grid; grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr) 24px minmax(0, 1fr); align-items: stretch; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--outline-gray-1); }
.mcd-deal:first-child { border-top: 0; }
.mcd-deal:hover { background: var(--surface-gray-1); }
.mcd-arrow { display: flex; align-items: center; justify-content: center; color: var(--ink-gray-4); }
.mcd-stage { display: flex; flex-direction: column; gap: 4px; min-width: 0; padding: 10px 12px; border: 1px solid var(--outline-gray-2); border-radius: 10px; background: var(--surface-cards, var(--card-bg)); }
.mcd-stage-empty { justify-content: center; border-style: dashed; background: transparent; }
.mcd-stage-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.mcd-stage-label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-gray-5); }
.mcd-stage-none { font-size: var(--text-sm); color: var(--ink-gray-4); }
.mcd-stage-no a { color: var(--ink-gray-9); font-weight: 600; }
.mcd-stage-no a:hover { text-decoration: underline; }
.mcd-stage-meta { display: flex; justify-content: space-between; gap: 8px; font-size: var(--text-sm); color: var(--ink-gray-6); }
.mcd-stage-amount { color: var(--ink-gray-9); font-weight: 500; font-variant-numeric: tabular-nums; }
.mcd-stage-sub { font-size: var(--text-xs); color: var(--ink-gray-5); }
.mcd-mini { display: grid; grid-template-columns: 64px 1fr 36px; align-items: center; gap: 6px; font-size: var(--text-xs); color: var(--ink-gray-5); }
.mcd-mini span:last-child { text-align: right; font-variant-numeric: tabular-nums; }
.mcd-mini-bar { height: 4px; border-radius: 999px; background: var(--surface-gray-2); overflow: hidden; }
.mcd-mini-bar span { display: block; height: 100%; background: var(--ink-green-3); }
@media (max-width: 768px) {
	.mcd-deal { grid-template-columns: 1fr; }
	.mcd-arrow { transform: rotate(90deg); height: 16px; }
}

/* 2026-11-04: the look of the Lead Dashboard and the Leads page (manav_lead_dashboard.js): 16 px
   cards, a header tinted with the accent colour, tiles with a coloured icon and a large figure,
   pill tabs, softer rows. Only looks change; the content is as before. */
.mcd { --mcd-accent: #2a78d6; }
.mcd-card { border-radius: 16px; border-color: var(--border-color, var(--outline-gray-1)); }
.mcd-head { padding: 22px 24px; background: linear-gradient(120deg, color-mix(in srgb, var(--mcd-accent) 12%, var(--card-bg, #fff)), var(--card-bg, #fff) 65%); }
.mcd-avatar, .mcd-image { width: 60px; height: 60px; border-radius: 18px; }
.mcd-avatar { background: var(--mcd-accent); color: #fff; font-size: 21px; font-weight: 700; }
.mcd-name { font-size: 22px; font-weight: 700; }
.mcd-chip { border-radius: 10px; background: var(--card-bg, #fff); border: 1px solid var(--border-color, var(--outline-gray-1)); }
.mcd-tabs { gap: 4px; border-bottom: 0; margin-bottom: 16px; }
.mcd-tab { border-bottom: 0; border-radius: 10px; padding: 7px 12px; font-size: 13px; font-weight: 600; }
.mcd-tab.active { background: var(--mcd-c); color: #fff; border-bottom: 0; box-shadow: 0 6px 16px color-mix(in srgb, var(--mcd-c) 30%, transparent); }
.mcd-tab.active .mcd-tab-dot { background: #fff; }
.mcd-tab.active .mcd-pill { background: rgba(255, 255, 255, 0.25); color: #fff; }
.mcd-group[class*="mcd-tone-"] .mcd-tile { border-top: 1px solid var(--border-color, var(--outline-gray-1)); background: var(--card-bg, #fff); }
.mcd-tile { padding: 18px; border-radius: 16px; gap: 6px; transition: transform 0.15s, box-shadow 0.15s; }
.mcd-tile:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(0, 0, 0, 0.07); }
.mcd-tile-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.mcd-tile-label { font-size: 13px; font-weight: 600; }
.mcd-tile-ic { width: 34px; height: 34px; flex: none; border-radius: 11px; display: flex; align-items: center; justify-content: center;
	color: var(--mcd-c, var(--mcd-accent)); background: color-mix(in srgb, var(--mcd-c, var(--mcd-accent)) 13%, transparent); }
.mcd-tile-value { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-top: 4px; }
.mcd-sum { border-radius: 16px; }
.mcd-stage { border-radius: 12px; }
.mcd-deal { border-radius: 12px; margin: 2px 6px; }
.mcd-table tbody tr:hover td { background: var(--subtle-fg, var(--surface-gray-1)); }

/* phone */
@media (max-width: 600px) {
	.mcd-head { padding: 16px; gap: 12px; flex-wrap: wrap; }
	.mcd-avatar, .mcd-image { width: 48px; height: 48px; border-radius: 14px; font-size: 17px; }
	.mcd-name { font-size: 18px; flex-wrap: wrap; }
	.mcd-tabs { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
	.mcd-tab { flex: none; }
	.mcd-tiles, .mcd-sums { grid-template-columns: 1fr 1fr; gap: 8px; }
	.mcd-tile, .mcd-sum { padding: 12px; border-radius: 14px; }
	.mcd-tile-ic { width: 28px; height: 28px; border-radius: 9px; }
	.mcd-tile-value { font-size: 18px; word-break: break-word; }
	.mcd-sum-value { font-size: 16px; word-break: break-word; }
	.mcd-card { border-radius: 14px; }
	.mcd-card-head { padding: 10px 12px; flex-wrap: wrap; }
	.mcd-table th, .mcd-table td { padding: 6px 10px; }
	.mcd-deal { padding: 10px; margin: 2px 0; }
}
`
		)
		.appendTo("head");
}
