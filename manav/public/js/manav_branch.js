// The logged-in user's branch (User > Branch) as a pill beside the page title at the top of every
// desk page, e.g. "Manav  [Manav Marketing - Bangalore]". The branch comes from the boot
// (frappe.boot.manav_branch, manav.manav.branches.add_branch_to_boot); users without a branch,
// such as the Administrator, see no pill.
// Loaded on every desk page through app_include_js (hooks.py), without Frappe's build.
//
// Working: Frappe 16 draws the page title as the last breadcrumb, refilled by
// frappe.ui.Page.render_breadcrumbs on every set_title; that method is wrapped here so the pill is
// put back after each repaint. Nothing in Frappe is changed.
//
// Created: 2026-11-03, when the user asked for the branch name beside the "Manav" title.
//
// CHANGE NOTE
// Date: 2026-11-04
// Change: Also leaves "Manav" out of the sidebar header's Modules list (see the end of the file).
// Reason: The user asked to remove Manav from that list.

(function () {
	const Page = frappe.ui && frappe.ui.Page;
	if (!Page || Page.prototype.__manav_branch) return;
	Page.prototype.__manav_branch = true;

	const style = document.createElement("style");
	style.textContent = `
		.manav-branch-pill { display: inline-flex; align-items: center; gap: 4px; margin-left: 10px;
			padding: 2px 10px; border-radius: 999px; font-size: var(--text-sm); font-weight: 600;
			white-space: nowrap; flex-shrink: 0; color: var(--blue-700); background: var(--blue-50);
			border: 1px solid var(--blue-200); }
		[data-theme="dark"] .manav-branch-pill { color: var(--blue-300); background: transparent;
			border-color: var(--blue-700); }
		@media (max-width: 576px) { .manav-branch-pill { display: none; } }
	`;
	document.head.appendChild(style);

	const render = Page.prototype.render_breadcrumbs;
	Page.prototype.render_breadcrumbs = function () {
		const out = render.apply(this, arguments);
		const branch = frappe.boot && frappe.boot.manav_branch;
		const $nav = this.$title_area && this.$title_area.find(".navbar-breadcrumbs");
		if (branch && $nav && $nav.length) {
			// after the breadcrumb <nav>, inside the title area (a flex row), once per page
			this.$title_area.find(".manav-branch-pill").remove();
			$(`<span class="manav-branch-pill"></span>`)
				.attr("title", __("Your branch"))
				.text(branch)
				.insertAfter($nav.first());
		}
		return out;
	};
})();

// 2026-11-04: the sidebar header's "Modules" list (Bangalore, Chennai, Coimbatore, FTWZ, Lead
// Management, Manav) without Manav, as the user asked. Only that list changes: the Manav sidebar
// itself stays, as Home, the Manav pages and the forms opened from it use it.
// Upgrade note: wraps frappe.ui.SidebarHeader.prototype.switcher_items (Frappe 16, items named
// "switch-module" with a submenu "module-<sidebar>"); if that is missing nothing is changed.
(function () {
	const Header = frappe.ui && frappe.ui.SidebarHeader;
	if (!Header || typeof Header.prototype.switcher_items !== "function" || Header.prototype.__manav_no_manav) return;
	Header.prototype.__manav_no_manav = true;
	const HIDDEN = ["manav"];
	const switcher_items = Header.prototype.switcher_items;
	Header.prototype.switcher_items = function () {
		const items = switcher_items.apply(this, arguments) || [];
		items.forEach((item) => {
			if (item.name !== "switch-module" || !Array.isArray(item.submenu)) return;
			const kept = item.submenu.filter((entry) => !HIDDEN.includes(String(entry.name || "").replace(/^module-/, "").toLowerCase()));
			// keep at least one entry, so the menu never ends up empty
			if (kept.length) item.submenu = kept;
		});
		return items;
	};
})();
