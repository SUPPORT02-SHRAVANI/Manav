// File: manav_lead.js
// Purpose: Lead form behaviour: USD for a new lead, filter Product by Product Type and live-calculate
//          Amount = Qty x Rate.
// Created: 2026-10-29
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
	},
	refresh(frm) {
		// 2026-11-03: Product Type / Product are hidden (free-hand Product only), so no Product filter.

		// Visiting card scan: front and back, each by camera (capture) or a file from the device.
		const group = __("Visiting Card");
		frm.add_custom_button(__("Front: Take Photo"), () => pick_card(frm, "visiting_card", true), group);
		frm.add_custom_button(__("Front: Upload File"), () => pick_card(frm, "visiting_card", false), group);
		frm.add_custom_button(__("Back: Take Photo"), () => pick_card(frm, "visiting_card_back", true), group);
		frm.add_custom_button(__("Back: Upload File"), () => pick_card(frm, "visiting_card_back", false), group);
		frm.add_custom_button(__("Scan Now"), () => scan_card(frm), group);
	},
	// Amount = Quantity x Rate, recalculated as the user types.
	quantity: calc_amount,
	rate: calc_amount,
});

function calc_amount(frm) {
	frm.set_value("amount", flt(frm.doc.quantity) * flt(frm.doc.rate));
}

// Let the user take / choose a photo of the card into `fieldname` (front or back), then read the card.
function pick_card(frm, fieldname, use_camera) {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = "image/*";
	// "environment" = the back camera on phones; desktops ignore it and show the file picker.
	if (use_camera) input.setAttribute("capture", "environment");
	input.onchange = async () => {
		const file = input.files && input.files[0];
		if (!file) return;
		try {
			frappe.dom.freeze(__("Uploading visiting card..."));
			const blob = await shrink_image(file);
			const file_url = await upload_card(frm, blob, fieldname);
			frappe.dom.unfreeze();
			await frm.set_value(fieldname, file_url);
			// The picture is stored; the user clicks Scan Now to read it (front and back together).
			frappe.show_alert({ message: __("Photo added. Click Scan Now to read the card."), indicator: "blue" }, 6);
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

// Scan Now: make sure a card was uploaded, then read it.
function scan_card(frm) {
	if (!frm.doc.visiting_card && !frm.doc.visiting_card_back) {
		frappe.msgprint(__("Upload the visiting card (front and/or back) first, then click Scan Now."));
		return;
	}
	read_card(frm);
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
