// Copyright (c) 2026, milind and contributors
// For license information, please see license.txt

// Frappe's rich-text editor (Text Editor fields: the Item's Standard Accessories, the quotation /
// PI line descriptions, Terms ...), on every desk page (app_include_js in hooks.py, served as it
// is, without Frappe's build):
// 1. Undo and Redo buttons at the start of the editor's toolbar (Quill's history module, the same
//    as Ctrl+Z / Ctrl+Y).
// 2. Before a form is saved, every editor whose text differs from the form's value hands its text
//    over at once. Frappe hands it over 300 ms after the last change (a debounce), so a change
//    made just before Save, such as a colour picked from the toolbar, was not saved.
//
// Created: 2026-11-04, the user's report: a colour put on text in the rich-text editor was not
// saved, and the request for an undo button in the editor.
//
// Upgrade note: wraps frappe.ui.form.ControlTextEditor (get_toolbar_options, make_quill_editor)
// and frappe.ui.form.Form.prototype.save, checked on Frappe 16.33.1. Each wrapper calls Frappe's
// own method; if a class or method is missing, that part does nothing.

(() => {
	const editors = new Set(); // the editors made on this page, for handing over before a save

	const ICONS = {
		undo: '<svg viewBox="0 0 18 18" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M6 5 2.5 8.5 6 12M3 8.5h8a4 4 0 0 1 0 8H8"/></svg>',
		redo: '<svg viewBox="0 0 18 18" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M12 5l3.5 3.5L12 12M15 8.5H7a4 4 0 0 0 0 8h3"/></svg>',
	};

	function setup_editor() {
		const Control = frappe.ui.form && frappe.ui.form.ControlTextEditor;
		if (!Control || Control.prototype.__manav_text_editor) return Boolean(Control);
		const proto = Control.prototype;
		const methods = ["get_toolbar_options", "get_quill_options", "make_quill_editor"];
		if (methods.some((m) => typeof proto[m] !== "function")) return true;
		proto.__manav_text_editor = true;

		// 1. Undo / Redo first in the toolbar (an editor with its own toolbar, df.get_toolbar_options,
		//    and the toolbar-less editor of a grid row are left as they are)
		const frappe_toolbar = proto.get_toolbar_options;
		proto.get_toolbar_options = function () {
			const options = frappe_toolbar.apply(this, arguments) || [];
			return [["undo", "redo"], ...options];
		};

		// Quill attaches a toolbar button only when the editor is made and only to a known format or
		// a handler given then, so the two handlers go into the options (`this` is the toolbar)
		const frappe_options = proto.get_quill_options;
		proto.get_quill_options = function () {
			const options = frappe_options.apply(this, arguments);
			const toolbar = options && options.modules && options.modules.toolbar;
			if (Array.isArray(toolbar) && toolbar.some((group) => Array.isArray(group) && group.includes("undo"))) {
				options.modules.toolbar = {
					container: toolbar,
					handlers: {
						undo() {
							this.quill.history.undo();
						},
						redo() {
							this.quill.history.redo();
						},
					},
				};
			}
			return options;
		};

		const frappe_make = proto.make_quill_editor;
		proto.make_quill_editor = function () {
			const had_quill = Boolean(this.quill);
			const result = frappe_make.apply(this, arguments);
			if (had_quill || !this.quill) return result;
			editors.add(this);
			// Quill has no pictures for these two buttons
			const toolbar = this.quill.getModule("toolbar");
			const container = toolbar && toolbar.container;
			if (container) {
				$(container).find("button.ql-undo").html(ICONS.undo).attr("title", __("Undo (Ctrl+Z)"));
				$(container).find("button.ql-redo").html(ICONS.redo).attr("title", __("Redo (Ctrl+Y)"));
			}
			return result;
		};
		return true;
	}

	// 2. Hand the editors' text over before saving (only editors still on the page)
	function hand_over_editors() {
		const pending = [];
		editors.forEach((control) => {
			const root = control.quill && control.quill.root;
			if (!root || !document.body.contains(root)) {
				editors.delete(control);
				return;
			}
			if (control.disabled || control.df.read_only) return;
			const value = control.get_input_value();
			if (value !== control.value && typeof control.parse_validate_and_set_in_model === "function") {
				pending.push(control.parse_validate_and_set_in_model(value));
			}
		});
		return pending;
	}

	function setup_save() {
		const Form = frappe.ui.form && frappe.ui.form.Form;
		if (!Form || Form.prototype.__manav_editor_save) return Boolean(Form);
		if (typeof Form.prototype.save !== "function") return true;
		Form.prototype.__manav_editor_save = true;
		const frappe_save = Form.prototype.save;
		Form.prototype.save = function () {
			const args = arguments;
			const pending = hand_over_editors();
			if (!pending.length) return frappe_save.apply(this, args);
			return Promise.all(pending).then(() => frappe_save.apply(this, args));
		};
		return true;
	}

	// The form classes are loaded with the desk; try now and again once the desk is ready.
	const setup = () => setup_editor() && setup_save();
	if (!setup()) {
		$(document).on("app_ready", setup);
		$(setup);
	}
})();
