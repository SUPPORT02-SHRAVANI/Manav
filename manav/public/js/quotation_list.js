// Manav's addition to ERPNext's Quotation list: the Principal (Quotation Type) column is drawn as a
// coloured label with the principal's name (e.g. "MACHINES") instead of its number ("1").
//
// Working: loaded through `doctype_list_js` in hooks.py, after ERPNext's quotation_list.js, so it
// extends frappe.listview_settings["Quotation"] instead of replacing it: ERPNext's onload is still
// called, and the formatter is added beside any formatters already there. The colour of a principal
// is its "List Colour" on Quotation Type; when that is empty, a colour is taken from PALETTE in the
// order of the Quotation Type codes, so every principal has a fixed colour without any setup.
// Colours are Frappe's indicator-pill classes, which follow the light and dark theme.
//
// Upgrade note: uses the documented list settings `onload` and `formatters` (checked on Frappe
// 16.33); listview.refresh() redraws the rows once the principals are loaded.
//
// Created: 2026-10-17.
//
// CHANGE NOTE
// Date: 2026-10-21
// Change: "Draft with AI" button (add_ai_draft_button): the user types a short request, e.g.
// "ABC Industries, 2 x VF-2SS with HSM and LK"; the server (manav.manav.quotation_agent) has
// OpenAI's model pick the customer, machines and sub-items, saves a draft quotation and the form
// opens. Uses the documented listview.page.add_inner_button and frappe.ui.Dialog.
// Reason: The user found making a quotation by hand slow and asked for an agent with an OpenAI key.

(() => {
	const PALETTE = ["blue", "green", "orange", "purple", "pink", "cyan", "yellow", "red"];
	const settings = (frappe.listview_settings["Quotation"] = frappe.listview_settings["Quotation"] || {});
	const erpnext_onload = settings.onload;
	// Quotation Type code -> { label, color }; loaded once per page load
	let principals = null;

	settings.onload = function (listview) {
		if (erpnext_onload) erpnext_onload.call(this, listview);
		add_ai_draft_button(listview);
		if (principals) return;
		frappe.db
			.get_list("Quotation Type", {
				fields: ["name", "description", "list_color"],
				order_by: "name asc",
				limit: 0,
			})
			.then((rows) => {
				principals = {};
				rows.forEach((row, index) => {
					principals[row.name] = {
						label: row.description || row.name,
						color: row.list_color || PALETTE[index % PALETTE.length],
					};
				});
				listview.refresh();
			});
	};

	settings.formatters = Object.assign({}, settings.formatters, {
		custom_quotation_type(value) {
			if (!value) return "";
			const principal = principals && principals[value];
			// not loaded yet, or no permission to read Quotation Type: plain code
			if (!principal) return frappe.utils.escape_html(value);
			const label = frappe.utils.escape_html(principal.label);
			return `<span class="indicator-pill ${principal.color} ellipsis" title="${label}">${label}</span>`;
		},
	});

	// "Draft with AI": a dialog for the request; the server saves a draft quotation and its form is
	// opened. When the AI needs more detail (e.g. two customers fit), its question is shown and the
	// dialog stays open with the request, to be completed and sent again. (Added 2026-10-21.)
	function add_ai_draft_button(listview) {
		if (!frappe.model.can_create("Quotation")) return;
		listview.page.add_inner_button(__("Draft with AI"), () => {
			const dialog = new frappe.ui.Dialog({
				title: __("Draft Quotation with AI"),
				fields: [
					{
						fieldname: "request",
						fieldtype: "Small Text",
						label: __("What should the quotation contain?"),
						reqd: 1,
						description: __(
							"Customer, machines with quantity, and their sub-items, e.g. ABC Industries, 2 x VF-2SS with HSM and LK"
						),
					},
					{ fieldname: "answer", fieldtype: "HTML" },
				],
				primary_action_label: __("Draft"),
				primary_action(values) {
					send(values.request);
				},
			});

			function send(request) {
				dialog.fields_dict.answer.$wrapper.empty();
				frappe.call({
					method: "manav.manav.quotation_agent.draft_quotation",
					args: { request: request },
					freeze: true,
					freeze_message: __("The AI is drafting the quotation..."),
					callback(r) {
						const result = r.message || {};
						if (result.quotation) {
							dialog.hide();
							frappe.show_alert({ message: result.message, indicator: "green" }, 10);
							frappe.set_route("Form", "Quotation", result.quotation);
							return;
						}
						show_question(result);
					},
				});
			}

			// No quotation: the AI's question (or reason) under the request, with a button for each
			// choice it offers. A click adds "Answer: <question> <choice>" to the request, so the
			// AI sees what was settled, and sends it again. Typing an answer into the request and
			// clicking Draft works too. (Buttons added 2026-10-21, asked for by the user.)
			function show_question(result) {
				const $answer = dialog.fields_dict.answer.$wrapper;
				const $box = $(`<div class="alert alert-warning" style="white-space: pre-wrap;"></div>`)
					.text(result.message || "")
					.appendTo($answer.empty());
				const choices = result.choices || [];
				if (!choices.length) return;
				const $buttons = $(`<div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px;"></div>`).appendTo(
					$box
				);
				choices.forEach((choice) => {
					$(`<button class="btn btn-default btn-sm" style="white-space: normal; text-align: left;"></button>`)
						.text(choice)
						.appendTo($buttons)
						.on("click", () => {
							const request = `${dialog.get_value("request")}\nAnswer: ${result.message} ${choice}`;
							dialog.set_value("request", request);
							send(request);
						});
				});
			}

			dialog.show();
		});
	}
})();
