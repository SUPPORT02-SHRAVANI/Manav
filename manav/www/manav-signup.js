// Page /manav-signup: sends the access request (manav.manav.signup.submit_request).
// fetch is used instead of frappe.call so that the server's message is shown in the form
// rather than in a dialog.
// Created: 2026-10-22.

frappe.ready(() => {
	const form = document.getElementById("ms-form");
	const error = document.getElementById("ms-error");
	const submit = document.getElementById("ms-submit");

	const showError = (text) => {
		error.textContent = text;
		error.hidden = !text;
	};

	// the first message the server sent with an error (frappe.throw), as plain text
	const serverMessage = (data) => {
		try {
			const msg = JSON.parse(JSON.parse(data._server_messages)[0]).message;
			const div = document.createElement("div");
			div.innerHTML = msg;
			return div.textContent;
		} catch (e) {
			return "";
		}
	};

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const values = Object.fromEntries(new FormData(form).entries());
		values.full_name = values.full_name.trim();
		values.email = values.email.trim();
		if (!values.full_name) return showError(__("Please enter your full name"));
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
			return showError(__("Please enter a valid e-mail address"));
		showError("");

		submit.disabled = true;
		try {
			const res = await fetch("/api/method/manav.manav.signup.submit_request", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					"X-Frappe-CSRF-Token": frappe.csrf_token || "",
				},
				body: JSON.stringify(values),
			});
			if (res.status === 429) return showError(__("Too many requests. Please try again later."));
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				return showError(serverMessage(data) || __("The request could not be sent. Please try again."));
			}
			form.hidden = true;
			document.getElementById("ms-done-text").textContent = data.message;
			document.getElementById("ms-done").hidden = false;
		} catch (err) {
			showError(__("The request could not be sent. Please check your connection and try again."));
		} finally {
			submit.disabled = false;
		}
	});
});
