// File: manav_lead.js
// Purpose: Lead form behaviour: USD for a new lead, filter Product by Product Type and live-calculate
//          Amount = Qty x Rate.
// Created: 2026-10-29
// CHANGE NOTE
// Date: 2026-11-13
// Change: Choosing an Item fills Rate from its Item Price (principal's price list first) and Amount
//         follows Quantity x Rate (fill_item_rate, lead_product.get_item_rate).
// Reason: The user asked that the rate comes by itself after adding the product, and amount from qty.
// CHANGE NOTE
// Date: 2026-11-13
// Change: The lead is submittable (manav_lead.json); Scan Visiting Card shows on a draft lead only.
// Reason: The user asked for a Submit button after saving a lead so that no one can change it.
// CHANGE NOTE
// Date: 2026-10-30
// Change: Visiting card scan: "Visiting Card" menu with Take Photo (opens the phone camera) and Upload
//         Card; the photo is shrunk, uploaded into the Visiting Card field, and read by OpenAI
//         (manav.manav.visiting_card.read_visiting_card), which fills company, contact, designation,
//         mobile and e-mail; other phones and GSTIN go into Other Information Notes.
//         Attaching a picture straight into the Visiting Card field reads it too.
// Reason: The user asked that a salesperson scans a visiting card and the AI fills the lead.
//         A plain <input capture> is used, not Frappe's Camera button, because the camera API
//         (mediaDevices) is blocked on http:// sites while the file input still opens the camera.
// CHANGE NOTE
// Date: 2026-10-30
// Change: The card's website and address fill the new Website / Address fields of the lead instead
//         of Other Information Notes.
// Reason: The user asked for Website and Address fields on the lead.
// CHANGE NOTE
// Date: 2026-10-30
// Change: Front and back of the card: a Visiting Card menu with Front / Back (Take Photo / Upload File).
//         After each picture both sides present are sent to the AI together (read_card), so a card with
//         details on the back is read into one set of fields.
// Reason: The user asked about cards where the information is on the back.
// CHANGE NOTE
// Date: 2026-10-30
// Change: The scan buttons are also shown in the Visiting Card section on the form body (Button fields
//         scan_front_camera / scan_front_upload / scan_back_camera / scan_back_upload), not only in the
//         top-right menu, so they are easy to find.
// Reason: The user found the top-right Visiting Card menu hard to find.
// CHANGE NOTE
// Date: 2026-10-30
// Change: Uploading a side no longer reads it straight away; the user clicks the new Scan Now button
//         (scan_now, also in the top-right menu), which reads the front and back together in one call.
// Reason: The user asked for a Scan Now button after uploading; it also avoids a second paid AI read
//         when the back is added after the front.
// CHANGE NOTE
// Date: 2026-10-31
// Change: A new lead opens in USD (the Currency field's default, as on the LMS) - see onload.
// Reason: A test run found new leads in INR: Frappe fills a Link field from the site's global
//         default of the same name ("currency" = INR, the company's) before the field's own default.
// CHANGE NOTE
// Date: 2026-11-03
// Change: No Product filter by Product Type: both are hidden, only the free-hand Product is used.
// Reason: The user asked to remove Product Type and Product from the lead.
// CHANGE NOTE
// Date: 2026-11-07
// Change: The Visiting Card section is gone from the form body (its scan buttons removed, the two
//         picture fields hidden); scanning is only through the top-right Visiting Card menu.
// Reason: The user said the top menu already does this, so the body section was a duplicate.
// CHANGE NOTE
// Date: 2026-11-12
// Change: The 5-item Visiting Card menu (Front/Back x Take Photo/Upload File + Scan Now) is replaced by
//         one "Scan Visiting Card" button opening a small dialog (card_dialog): a Front and a Back tile
//         (back optional) showing the picture, and a Scan Card button. A tile opens the device's own
//         chooser (on a phone: camera or gallery), so Take Photo / Upload File are no longer separate.
// Reason: The user found the menu with so many options confusing.
// CHANGE NOTE
// Date: 2026-11-12
// Change: Product section works like the quotation: Principal (Quotation Type) first, then Item - a
//         dropdown of the principal's items (manav.manav.lead_product.item_query) ending with
//         "Free Hand" - and the chosen item's description fills Product Description by itself. Free
//         Hand: the cursor goes to Product Description to type the product.
// Reason: The user asked for principal -> items -> automatic description, with a free-hand option.

// The Item value meaning "not in the list, typed by hand" (lead_product.FREE_HAND on the server).
const LEAD_FREE_HAND = "Free Hand";

// Card value -> Lead field it fills.
const CARD_TO_LEAD = {
	company_name: "company_name",
	contact_person: "contact_person",
	contact_position: "contact_position",
	mobile_no: "mobile_no",
	email_id: "email_id",
	website: "website",
	address: "address",
};
// Card values that have no field of their own; written into Other Information Notes.
const CARD_TO_NOTES = {
	other_phones: "Other Phones",
	gstin: "GSTIN",
};
// Longest side of the uploaded photo, in pixels: enough for small print, keeps the upload small.
const CARD_MAX_SIDE = 1600;

frappe.ui.form.on("Manav Lead", {
	onload(frm) {
		// A new lead gets the Currency field's own default (USD). Frappe put the site's global
		// "currency" default (INR) there first; only that value is replaced, so a currency the lead
		// came with otherwise (e.g. a duplicated lead in EUR) is kept. The user can still pick INR.
		const lead_default = frm.fields_dict.currency && frm.fields_dict.currency.df.default;
		if (
			frm.is_new() &&
			lead_default &&
			frm.doc.currency !== lead_default &&
			(!frm.doc.currency || frm.doc.currency === frappe.defaults.get_default("currency"))
		) {
			frm.set_value("currency", lead_default);
		}
		// 2026-11-12: Sales Engineer is locked for a salesperson (it is always the logged-in user); only
		// System Manager / Sales Manager / Manav Management may pick someone else. The server enforces
		// the same (ManavLead.before_validate). Same role list as SALE_ENGINEER_CHOOSER_ROLES there.
		const can_choose = frappe.user.has_role(["System Manager", "Sales Manager", "Manav Management"]);
		frm.set_df_property("sale_engineer", "read_only", can_choose ? 0 : 1);
		// 2026-11-12: a new lead shows its maker as Sales Engineer at once (the server also fills an
		// empty one on saving, ManavLead.before_validate), as the user asked.
		if (frm.is_new() && !frm.doc.sale_engineer) {
			frappe.call("manav.manav.lead_permission.my_sales_person").then((r) => {
				if (r.message && !frm.doc.sale_engineer) {
					frm.set_value("sale_engineer", r.message);
				} else if (!r.message) {
					frappe.show_alert(
						{
							message: __("Your login is not linked to a Sales Person, so Sales Engineer stays empty. Ask the admin to set it."),
							indicator: "orange",
						},
						8
					);
				}
			});
		}
	},
	refresh(frm) {
		// 2026-11-13: cancelling a submitted lead (to amend it) must not offer to cancel its visits and
		// quotations too; they move to the amended lead (manav_lead.py LEAD_HISTORY_FIELDS).
		frm.ignore_doctypes_on_cancel_all = ["Manav Visit", "Quotation"];
		// 2026-11-03: Product Type / Product are hidden (free-hand Product only), so no Product filter.

		// Visiting card scan: one button, the dialog holds front / back and the Scan Card button.
		// 2026-11-13: only on a draft lead - a submitted lead is locked (it fills the lead's fields).
		if (frm.doc.docstatus === 0) {
			frm.add_custom_button(__("Scan Visiting Card"), () => card_dialog(frm));
		}
		setup_item_dropdown(frm);
	},

	// 2026-11-12: a new principal empties an item chosen under the old one (Free Hand stays).
	principal(frm) {
		if (frm.doc.item_code && frm.doc.item_code !== LEAD_FREE_HAND) {
			frm.set_value("item_code", "");
		}
	},

	// 2026-11-12: Product Description is always typed by the salesperson; choosing an item does not
	// fill it (user's request: the lead keeps their own words, while the quotation takes the item's
	// description from the Item master). After choosing, the cursor goes to Product Description.
	item_code(frm) {
		const item = frm.doc.item_code;
		if (!item) return;
		setTimeout(() => {
			const f = frm.fields_dict.product_free_hand;
			f && f.$input && f.$input.focus();
		}, 200);
		if (item === LEAD_FREE_HAND) {
			frappe.show_alert({ message: __("Type the product in Product Description."), indicator: "blue" }, 4);
			return;
		}
		fill_item_rate(frm);
	},
	// Amount = Quantity x Rate, recalculated as the user types.
	quantity: calc_amount,
	rate: calc_amount,
});

// 2026-11-12: the Item dropdown (Autocomplete) asks the server for the principal's items matching what
// is typed; the list always ends with Free Hand. Without a principal the user is told to choose it.
function setup_item_dropdown(frm) {
	const field = frm.fields_dict.item_code;
	if (!field) return;
	// bold product name, its description below in grey, wrapped (not cut off at the dropdown's edge)
	if (!$("#manav-lead-item-style").length) {
		$(`<style id="manav-lead-item-style">
			.frappe-control[data-fieldname="item_code"] .awesomplete > ul { max-height: 360px; overflow-y: auto; }
			.frappe-control[data-fieldname="item_code"] .awesomplete li p { margin: 0; white-space: normal; line-height: 1.35; }
			.frappe-control[data-fieldname="item_code"] .awesomplete li strong { font-size: 13px; font-weight: 700; color: var(--heading-color); }
			.frappe-control[data-fieldname="item_code"] .awesomplete li .small { display: block; margin-top: 2px; font-size: 12px; color: var(--text-muted); }
		</style>`).appendTo("head");
	}
	field.get_query = () => {
		if (!frm.doc.principal && !(frm.manav_principal_told > Date.now() - 3000)) {
			frm.manav_principal_told = Date.now();
			frappe.show_alert({ message: __("Select the Principal first to see its items."), indicator: "orange" }, 4);
		}
		return {
			query: "manav.manav.lead_product.item_query",
			params: { principal: frm.doc.principal || "" },
		};
	};
}

function calc_amount(frm) {
	frm.set_value("amount", flt(frm.doc.quantity) * flt(frm.doc.rate));
}

// 2026-11-13: choosing an Item fills Rate from its price (principal's price list first, see
// lead_product.get_item_rate); Quantity becomes 1 when empty, and Amount follows (rate/quantity
// handlers). A price in another currency also switches the lead's Currency, so the rate stays right.
// No price found: Rate is left as it was and the salesperson is told to type it.
function fill_item_rate(frm) {
	const item = frm.doc.item_code;
	frappe
		.call("manav.manav.lead_product.get_item_rate", {
			item_code: item,
			principal: frm.doc.principal || null,
			currency: frm.doc.currency || null,
		})
		.then((r) => {
			if (frm.doc.item_code !== item) return; // the user picked another item meanwhile
			const p = r.message || {};
			if (!flt(p.rate)) {
				frappe.show_alert({ message: __("No price found for this item. Type the Rate."), indicator: "orange" }, 5);
				return;
			}
			const steps = [];
			if (p.currency && p.currency !== frm.doc.currency) {
				steps.push(() => frm.set_value("currency", p.currency));
				steps.push(() =>
					frappe.show_alert({ message: __("Currency set to {0} as per the item's price.", [p.currency]), indicator: "blue" }, 5)
				);
			}
			if (!flt(frm.doc.quantity)) steps.push(() => frm.set_value("quantity", 1));
			steps.push(() => frm.set_value("rate", flt(p.rate)));
			steps.push(() => calc_amount(frm));
			return frappe.run_serially(steps);
		});
}

// The Scan Visiting Card dialog: a Front and a Back tile and a Scan Card button.
function card_dialog(frm) {
	const sides = [
		{ fieldname: "visiting_card", label: __("Front side"), hint: __("Required") },
		{ fieldname: "visiting_card_back", label: __("Back side"), hint: __("Only if it has details") },
	];
	const d = new frappe.ui.Dialog({
		title: __("Scan Visiting Card"),
		fields: [{ fieldtype: "HTML", fieldname: "tiles" }],
		primary_action_label: __("Scan Card"),
		primary_action() {
			if (!frm.doc.visiting_card && !frm.doc.visiting_card_back) {
				frappe.show_alert({ message: __("Add a photo of the card first."), indicator: "orange" }, 4);
				return;
			}
			d.hide();
			read_card(frm);
		},
	});

	const $tiles = $(`<div class="mvc-tiles"></div>`).appendTo(d.fields_dict.tiles.$wrapper);
	$(`<p class="mvc-help">${__("Tap a side to take a photo or choose one from your phone / computer.")}</p>`).insertBefore($tiles);

	const render = () => {
		$tiles.empty();
		for (const side of sides) {
			const url = frm.doc[side.fieldname];
			const $tile = $(`
				<div class="mvc-tile ${url ? "has-photo" : ""}" role="button" tabindex="0">
					${
						url
							? `<img src="${encodeURI(url)}" alt="">`
							: `<div class="mvc-empty">${frappe.utils.icon("camera", "lg")}<span>${__("Add photo")}</span></div>`
					}
					<div class="mvc-label"><b>${side.label}</b> <span>${url ? __("Tap to change") : side.hint}</span></div>
				</div>`).appendTo($tiles);
			$tile.on("click keydown", (e) => {
				if (e.type === "keydown" && e.key !== "Enter") return;
				pick_card(frm, side.fieldname, render);
			});
		}
	};
	render();

	if (!$("#mvc-style").length) {
		$(`<style id="mvc-style">
			.mvc-help { color: var(--text-muted); margin-bottom: 12px; }
			.mvc-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
			.mvc-tile { border: 2px dashed var(--border-color); border-radius: 12px; overflow: hidden; cursor: pointer;
				background: var(--subtle-fg); transition: border-color .15s, background .15s; }
			.mvc-tile:hover, .mvc-tile:focus { border-color: var(--primary); outline: none; }
			.mvc-tile.has-photo { border-style: solid; }
			.mvc-tile img { width: 100%; height: 120px; object-fit: cover; display: block; }
			.mvc-empty { height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center;
				gap: 6px; color: var(--text-muted); }
			.mvc-label { padding: 8px 10px; font-size: 13px; border-top: 1px solid var(--border-color); }
			.mvc-label span { color: var(--text-muted); font-size: 12px; }
			@media (max-width: 480px) { .mvc-tiles { grid-template-columns: 1fr; } }
		</style>`).appendTo("head");
	}
	d.show();
}

// Let the user take / choose a photo of the card into `fieldname` (front or back); `done` runs after
// the upload (the dialog redraws its tile). No `capture` attribute: phones then offer camera or gallery.
function pick_card(frm, fieldname, done) {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = "image/*";
	input.onchange = async () => {
		const file = input.files && input.files[0];
		if (!file) return;
		try {
			frappe.dom.freeze(__("Uploading visiting card..."));
			const blob = await shrink_image(file);
			const file_url = await upload_card(frm, blob, fieldname);
			frappe.dom.unfreeze();
			await frm.set_value(fieldname, file_url);
			if (done) done();
		} catch (e) {
			frappe.dom.unfreeze();
			frappe.msgprint(__("The photo could not be uploaded: {0}", [e.message || e]));
		}
	};
	input.click();
}

// Resize the photo so its longest side is at most CARD_MAX_SIDE and save it as JPEG.
function shrink_image(file) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(url);
			const scale = Math.min(1, CARD_MAX_SIDE / Math.max(img.width, img.height));
			const canvas = document.createElement("canvas");
			canvas.width = Math.round(img.width * scale);
			canvas.height = Math.round(img.height * scale);
			canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
			canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("resize failed"))), "image/jpeg", 0.85);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error(__("The file is not a picture.")));
		};
		img.src = url;
	});
}

// Upload the picture as a private file (Frappe's upload_file); a saved lead gets it attached at
// once, a new one when it is saved (Frappe attaches files of Attach Image fields on save).
async function upload_card(frm, blob, fieldname) {
	const form_data = new FormData();
	form_data.append("file", blob, `${fieldname}-${Date.now()}.jpg`);
	form_data.append("is_private", 1);
	form_data.append("folder", "Home/Attachments");
	if (!frm.is_new()) {
		form_data.append("doctype", frm.doctype);
		form_data.append("docname", frm.doc.name);
		form_data.append("fieldname", fieldname);
	}
	const response = await fetch("/api/method/upload_file", {
		method: "POST",
		headers: { Accept: "application/json", "X-Frappe-CSRF-Token": frappe.csrf_token },
		body: form_data,
	});
	const data = await response.json();
	if (!response.ok || !data.message) {
		throw new Error(response.statusText || __("upload failed"));
	}
	return data.message.file_url;
}

// Send the picture(s) to the AI and fill the lead with what it read from the card (front + back).
function read_card(frm) {
	// Both sides that are present; the server merges them into one set of details.
	const file_urls = [frm.doc.visiting_card, frm.doc.visiting_card_back].filter(Boolean);
	if (!file_urls.length) return;
	frappe.call({
		method: "manav.manav.visiting_card.read_visiting_card",
		args: { file_urls: JSON.stringify(file_urls) },
		freeze: true,
		freeze_message: __("Reading the visiting card..."),
		callback(r) {
			const card = r.message || {};
			const filled = [];
			// The card's values replace what is in the fields: the card was scanned on purpose.
			for (const [key, fieldname] of Object.entries(CARD_TO_LEAD)) {
				if (card[key]) {
					frm.set_value(fieldname, card[key]);
					filled.push(__(frm.fields_dict[fieldname].df.label));
				}
			}
			// The rest go into the notes, below what is already there (not repeated on a second scan).
			const lines = Object.entries(CARD_TO_NOTES)
				.filter(([key]) => card[key])
				.map(([key, label]) => `${label}: ${card[key]}`);
			const notes = frm.doc.other_information_notes || "";
			const new_lines = lines.filter((line) => !notes.includes(line));
			if (new_lines.length) {
				frm.set_value("other_information_notes", [notes, ...new_lines].filter(Boolean).join("\n"));
				filled.push(__("Other Information Notes"));
			}

			if (filled.length) {
				frappe.show_alert(
					{ message: __("Filled from the card: {0}. Please check them.", [filled.join(", ")]), indicator: "green" },
					8
				);
			} else {
				frappe.msgprint(__("No details could be read from this picture. Take a sharper photo of the card."));
			}
		},
	});
}
