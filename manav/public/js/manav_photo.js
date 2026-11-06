// File: manav_photo.js
// Purpose: Capture or choose a picture and upload it into an Attach Image field of any form. Used by the
//          Take Photo buttons of Manav Visit (front / back photo). A plain <input capture> opens the
//          phone camera, which works on http:// sites too (the mediaDevices camera does not).
// Created: 2026-10-30

frappe.provide("manav.photo");

Object.assign(manav.photo, {
	// Longest side of the uploaded picture, in pixels: enough detail, keeps the upload small.
	MAX_SIDE: 1600,

	// Open the camera (use_camera) or the file picker, shrink the picture and store it in `fieldname`.
	capture(frm, fieldname, use_camera) {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "image/*";
		// "environment" = the back camera on phones; desktops ignore it and show the file picker.
		if (use_camera) input.setAttribute("capture", "environment");
		input.onchange = async () => {
			const file = input.files && input.files[0];
			if (!file) return;
			try {
				frappe.dom.freeze(__("Uploading photo..."));
				const blob = await this.shrink(file);
				const file_url = await this.upload(frm, fieldname, blob);
				frappe.dom.unfreeze();
				await frm.set_value(fieldname, file_url);
			} catch (e) {
				frappe.dom.unfreeze();
				frappe.msgprint(__("The photo could not be uploaded: {0}", [e.message || e]));
			}
		};
		input.click();
	},

	// Resize a picture so its longest side is at most MAX_SIDE and save it as JPEG.
	shrink(file) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const url = URL.createObjectURL(file);
			img.onload = () => {
				URL.revokeObjectURL(url);
				const scale = Math.min(1, this.MAX_SIDE / Math.max(img.width, img.height));
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
	},

	// Upload the picture as a private file. A saved document gets it attached at once; a new one when it
	// is saved (Frappe attaches the files of Attach Image fields on save).
	async upload(frm, fieldname, blob) {
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
	},
});
