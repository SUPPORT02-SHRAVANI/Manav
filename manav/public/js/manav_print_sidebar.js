// Print page (/desk/print/<doctype>/<name>): the left sidebar laid out like the design the user
// pointed to (sketch.netchamp.dev/u/iamejaaz/print-page-redesign): sections Format (print format,
// letter head, language), Print Format Type (one card per print format of the doctype) and Font.
// Created: 2026-11-02.
//
// CHANGE NOTE
// Date: 2026-11-02
// Change: The "Style" cards (Frappe's Print Styles) became "Print Format Type" cards: the print
// formats of the doctype, a click prints with that format. The Print Style is no longer changed.
// Reason: The user asked to show the print format types there instead of the styles.
//
// CHANGE NOTE
// Date: 2026-11-02
// Change: Removed the Page section (paper size, orientation), the "<Doctype> options" switches
// (Frappe's print settings of the doctype; their section is hidden, their defaults still apply) and
// "Set as default for <Doctype>".
// Reason: The user asked to remove that part of the sidebar.
//
// Loaded by hooks.py page_js {"print": ...}: Frappe appends it to its own print page script, after
// frappe.ui.form.PrintView is defined and before the page makes its PrintView. The print formats
// themselves are not changed; Font only changes how the preview is drawn and printed.
//
// What each choice does:
// - Print Format Type: sets Frappe's own Print Format field of the sidebar (same as choosing it there).
// - Font: CSS put into the preview frame.
// - Print: when a font is chosen, Print prints the preview frame itself, so the font reaches the
//   paper; otherwise Frappe's own Print (the /printview tab) runs, as before.
// - PDF is made on the server from Print Settings and does not take the font.
// The font is remembered in this browser (localStorage), for the next print.
//
// CHANGE NOTE
// Date: 2026-11-03
// Change: A "Signature" switch under Font: it sets the document's Print Signature tick
// (custom_print_signature, on Quotation, Draft PI and Final PI; allowed after submit) and draws the
// preview again, so the print and PDF are made with or without the signer's signature image.
// Shown only for a doctype that has the field.
// Reason: The user asked for an option on the print page to add the signature or not.
//
// CHANGE NOTE
// Date: 2026-11-04
// Change: Frappe's built-in "Standard" print format is left out of the Quotation's list (the cards
// and the Print Format field), as long as the doctype has other formats. The other unwanted
// formats are disabled records (erpnext_fields.HIDDEN_PRINT_FORMATS).
// Reason: The user crossed Standard out of the Print Format Type cards.
// Upgrade note: wraps frappe.meta.get_print_formats (frappe/public/js/frappe/model/meta.js,
// checked on Frappe 16.33.1); without it nothing is left out.
//
// CHANGE NOTE
// Date: 2026-11-12
// Change: Frappe's "Print Format" dropdown under Format is hidden while the Print Format Type cards
// are shown; the cards still set its (hidden) value, so printing works as before.
// Reason: The user asked to remove the dropdown, as the same choice is in the cards below.
//
// Upgrade note: this extends PrintView methods (setup_sidebar, show, setup_print_format_dom,
// printit), checked against Frappe 16.33.1. Each wrapper calls Frappe's own
// method first, and the whole file does nothing if PrintView or a method is missing. After a Frappe
// upgrade, re-check the print page.

// 2026-11-04: no "Standard" in the Quotation's print format list (the user's request). Frappe adds
// it to every doctype's list by name, it is not a record that could be disabled.
(() => {
	const NO_STANDARD = ["Quotation"];
	const meta = frappe.meta;
	if (!meta || typeof meta.get_print_formats !== "function" || meta.__manav_no_standard) return;
	meta.__manav_no_standard = true;
	const frappe_get_print_formats = meta.get_print_formats;
	meta.get_print_formats = function (doctype) {
		const names = frappe_get_print_formats.apply(this, arguments) || [];
		if (!NO_STANDARD.includes(doctype)) return names;
		const others = names.filter((name) => name !== "Standard");
		// keep Standard when it is the only one, so the page can still print
		return others.length ? others : names;
	};
})();

(() => {
	const PrintView = frappe.ui.form && frappe.ui.form.PrintView;
	const METHODS = ["setup_sidebar", "show", "setup_print_format_dom", "printit"];
	if (!PrintView || PrintView.prototype.__manav_sidebar) return;
	if (METHODS.some((m) => typeof PrintView.prototype[m] !== "function")) return;
	PrintView.prototype.__manav_sidebar = true;

	const original = {};
	METHODS.forEach((m) => (original[m] = PrintView.prototype[m]));

	const STORE_KEY = "manav_print_options";
	// Options of Print Settings "Font"
	const FONTS = ["Default", "Inter", "Helvetica Neue", "Arial", "Helvetica", "Verdana", "Monospace"];

	// Read / write the remembered choices; the page works the same when storage is blocked.
	function load_options() {
		try {
			const saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
			return { font: saved.font };
		} catch (e) {
			return {};
		}
	}
	function save_options(options) {
		try {
			localStorage.setItem(STORE_KEY, JSON.stringify(options));
		} catch (e) {
			/* storage blocked: the choice lasts for this page only */
		}
	}

	add_styles();

	PrintView.prototype.setup_sidebar = function () {
		original.setup_sidebar.apply(this, arguments);
		const saved = load_options();
		this.manav = { font: FONTS.includes(saved.font) ? saved.font : "Default" };
		try {
			build_sidebar(this);
		} catch (e) {
			// the sidebar keeps Frappe's own controls if the layout could not be built
			console.warn("Manav print sidebar:", e);
		}
	};

	PrintView.prototype.show = function (frm) {
		const result = original.show.apply(this, arguments);
		if (this.manav_ui) {
			draw_format_cards(this);
			sync_signature(this);
		}
		return result;
	};

	// After every preview: the font into the frame (before Frappe measures its height),
	// and the card of the print format shown marked.
	PrintView.prototype.setup_print_format_dom = function () {
		const result = original.setup_print_format_dom.apply(this, arguments);
		if (this.manav && this.$print_format_body) apply_page_css(this);
		refresh_choices(this);
		return result;
	};

	// Print: the preview frame itself when a font is chosen (see the top).
	PrintView.prototype.printit = function () {
		const frame = this.print_wrapper && this.print_wrapper.find("iframe.print-format-container")[0];
		const use_frame =
			this.manav &&
			has_custom_choice(this) &&
			frame &&
			frame.contentWindow &&
			!cint(this.print_settings && this.print_settings.enable_print_server) &&
			!this.is_raw_printing() &&
			this.get_mapped_printer().length !== 1;
		if (!use_frame) return original.printit.apply(this, arguments);
		frame.contentWindow.focus();
		frame.contentWindow.print();
	};

	function has_custom_choice(view) {
		const m = view.manav;
		return m.font !== "Default";
	}

	// Font changed: remember it and draw the preview again.
	function choose(view, key, value) {
		view.manav[key] = value;
		save_options(view.manav);
		refresh_choices(view);
		view.preview();
	}

	function build_sidebar(view) {
		const $sidebar = view.sidebar.addClass("manav-print-sidebar");
		const control_of = ($input) => ($input && $input.length ? $input.closest(".frappe-control") : $());
		const $format = control_of(view.print_format_selector);
		const $language = control_of(view.language_selector);
		const $letterhead = control_of(view.letterhead_selector);
		const $dynamic = view.sidebar_dynamic_section;
		if (!$format.length || !$language.length || !$letterhead.length || !$dynamic || !$dynamic.length) return;

		// Format: print format, letter head, language (the design's order)
		$(`<div class="manav-ps-head">${__("Format")}</div>`).insertBefore($format);
		$letterhead.insertBefore($language);

		// Print Format Type: one card per print format of the doctype (drawn in show)
		const $types = $(`<div class="manav-ps-section">
			<div class="manav-ps-head">${__("Print Format Type")}</div>
			<div class="manav-ps-formats"></div>
		</div>`).insertBefore($dynamic);
		$types.on("click", ".manav-ps-format", (e) => {
			const name = String($(e.currentTarget).data("format"));
			if (name === view.selected_format()) return;
			// the same as choosing it in Frappe's Print Format field
			view.print_format_selector.val(name);
			view.refresh_print_format();
			refresh_choices(view);
		});

		// Font
		const $font_wrap = $(`<div class="manav-ps-section"></div>`).insertBefore($dynamic);
		const font_control = frappe.ui.form.make_control({
			df: {
				fieldtype: "Select",
				fieldname: "manav_font",
				label: __("Font"),
				options: FONTS.map((f) => ({ value: f, label: __(f) })),
				change: () => choose(view, "font", font_control.get_value() || "Default"),
			},
			parent: $font_wrap,
			render_input: 1,
		});
		font_control.set_input(view.manav.font);

		// Signature (2026-11-03): the document's Print Signature tick, see the top
		const $sign_wrap = $(`<div class="manav-ps-section"></div>`).insertBefore($dynamic);
		const sign_control = frappe.ui.form.make_control({
			df: {
				fieldtype: "Check",
				fieldname: "manav_print_signature",
				label: __("Print Signature"),
				description: __("Untick to print without the signature"),
				change: () => set_signature(view, sign_control.get_value() ? 1 : 0),
			},
			parent: $sign_wrap,
			render_input: 1,
		});

		// Frappe's print settings of the doctype ("Compact Item Print" ...) are not shown (2026-11-02);
		// their defaults still apply
		$dynamic.hide();

		view.manav_ui = { $types, $format, font_control, sign_control, $sign_wrap };
		refresh_choices(view);
	}

	// The Signature switch shows the document's Print Signature; hidden when the doctype has no such field.
	function sync_signature(view) {
		const ui = view.manav_ui;
		const doc = view.frm && view.frm.doc;
		const has = !!(doc && frappe.meta.has_field(doc.doctype, "custom_print_signature"));
		ui.$sign_wrap.toggle(has);
		if (has) ui.sign_control.set_input(doc.custom_print_signature === 0 ? 0 : 1);
	}

	// Save the choice on the document (frappe.client.set_value, the user's own permissions), then
	// draw the preview again so it is made with the saved value.
	function set_signature(view, value) {
		const doc = view.frm && view.frm.doc;
		if (!doc || cint(doc.custom_print_signature === 0 ? 0 : 1) === value) return;
		frappe.db
			.set_value(doc.doctype, doc.name, "custom_print_signature", value)
			.then(() => {
				doc.custom_print_signature = value;
				view.preview();
			})
			// not saved (e.g. no write permission): show the stored value again
			.catch(() => sync_signature(view));
	}

	// The print format cards: Frappe's own list of the doctype's print formats (as in its Print
	// Format field), each with a small drawing picked from words in its name.
	function draw_format_cards(view) {
		const doctype = view.frm && view.frm.doctype;
		const $list = view.manav_ui.$types.find(".manav-ps-formats").empty();
		if (!doctype) return;
		let names = [];
		try {
			names = frappe.meta.get_print_formats(doctype) || [];
		} catch (e) {
			names = [];
		}
		view.manav_ui.$types.toggle(names.length > 1);
		// 2026-11-12: Frappe's Print Format dropdown is hidden while the cards are shown (the user's
		// request: the cards already choose the format). It stays in the page, as the cards set its
		// value; with no cards (one format only) it is shown again.
		view.manav_ui.$format.toggle(!(names.length > 1));
		names.forEach((name) => {
			const words = String(name).toLowerCase();
			const kind =
				["classic", "banded", "colour", "cif", "proforma", "pi", "head"].find((w) =>
					new RegExp(`\\b${w}\\b`).test(words)
				) || "plain";
			$(`<button type="button" class="manav-ps-format" data-format="${frappe.utils.escape_html(name)}" title="${frappe.utils.escape_html(__(name))}">
				<span class="manav-ps-thumb manav-ps-thumb-${kind}"><i></i><i></i><i></i></span>
				<span class="manav-ps-format-name">${frappe.utils.escape_html(__(short_name(name)))}</span>
			</button>`).appendTo($list);
		});
		refresh_choices(view);
	}

	// "Manav Modern Quotation CIF" -> "Modern Quotation CIF": only the app's name is left out, so
	// that two formats never end up with the same card name ("Standard", "Quotation Standard").
	function short_name(name) {
		const short = String(name).replace(/^Manav\s+/i, "");
		return short || name;
	}

	// Marks the current choices in the sidebar.
	function refresh_choices(view) {
		const ui = view.manav_ui;
		if (!ui) return;
		const current = view.selected_format();
		ui.$types.find(".manav-ps-format").each((i, el) => {
			$(el).toggleClass("active", String($(el).data("format")) === current);
		});
	}

	// The font of the preview frame (and of printing from it).
	function apply_page_css(view) {
		const m = view.manav;
		const css = [];
		if (m.font && m.font !== "Default") {
			const family = m.font === "Monospace" ? "monospace" : `"${m.font}", sans-serif`;
			css.push(`.print-format, .print-format * { font-family: ${family} !important; }`);
		}
		const $head = view.$print_format_body.find("head");
		$head.find("#manav-print-page").remove();
		$head.append(`<style id="manav-print-page">${css.join("\n")}</style>`);
	}

	// The sidebar's look, with Frappe's CSS variables so light and dark themes both work.
	function add_styles() {
		if (document.getElementById("manav-print-sidebar-css")) return;
		const style = document.createElement("style");
		style.id = "manav-print-sidebar-css";
		style.textContent = `
			.manav-print-sidebar { padding-bottom: var(--padding-lg); }
			.manav-print-sidebar .manav-ps-head { margin: var(--margin-lg) 0 var(--margin-sm); font-size: var(--text-sm); font-weight: 500; color: var(--text-muted); }
			.manav-print-sidebar .manav-ps-head:first-child { margin-top: var(--margin-sm); }
			.manav-print-sidebar .manav-ps-formats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: var(--margin-md); }
			.manav-print-sidebar .manav-ps-format { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-width: 0; padding: 8px; border: 1px solid var(--border-color); border-radius: var(--border-radius-md); background: var(--card-bg); font-size: var(--text-xs); line-height: 1.25; color: var(--text-color); text-align: left; }
			.manav-print-sidebar .manav-ps-format:hover { border-color: var(--gray-400); }
			.manav-print-sidebar .manav-ps-format.active { border-color: var(--text-color); box-shadow: 0 0 0 1px var(--text-color); }
			.manav-print-sidebar .manav-ps-format-name { display: block; width: 100%; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
			.manav-print-sidebar .manav-ps-thumb { display: block; width: 100%; height: 30px; }
			.manav-print-sidebar .manav-ps-thumb i { display: block; height: 4px; margin-bottom: 5px; border-radius: 2px; background: var(--gray-300); }
			.manav-print-sidebar .manav-ps-thumb i:first-child { width: 35%; height: 5px; background: var(--text-color); }
			.manav-print-sidebar .manav-ps-thumb-classic i:not(:first-child) { height: 7px; background: transparent; border: 1px solid var(--gray-500); border-radius: 0; }
			.manav-print-sidebar .manav-ps-thumb-banded i:nth-child(2) { height: 7px; background: var(--gray-700); border-radius: 0; }
			.manav-print-sidebar .manav-ps-thumb-colour i:nth-child(2) { background: var(--blue-400); }
			.manav-print-sidebar .manav-ps-thumb-colour i:last-child { background: var(--red-300); }
			.manav-print-sidebar .manav-ps-thumb-cif i:last-child { width: 55%; margin-left: 45%; background: var(--text-color); }
			.manav-print-sidebar .manav-ps-thumb-head i:first-child { width: 100%; background: var(--gray-600); }
		`;
		document.head.appendChild(style);
	}
})();
