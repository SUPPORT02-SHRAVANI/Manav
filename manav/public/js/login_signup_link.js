// Login page: a "Request access" link under the sign-in form, opening /manav-signup.
// Loaded on every website page (web_include_js in hooks.py); does nothing outside /login.
// Frappe's own sign-up stays off, because it would create a login without a manager's approval.
// Created: 2026-10-22.

document.addEventListener("DOMContentLoaded", () => {
	if (window.location.pathname !== "/login") return;
	document.querySelectorAll(".for-login .login-content, .for-email-login .login-content").forEach((card) => {
		if (card.querySelector(".manav-request-access")) return;
		const p = document.createElement("div");
		p.className = "text-center sign-up-message manav-request-access";
		p.append(document.createTextNode(__("New user?") + " "));
		const a = document.createElement("a");
		a.href = "/manav-signup";
		a.textContent = __("Request access");
		p.append(a);
		card.append(p);
	});
});
