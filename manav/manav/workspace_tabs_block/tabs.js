// Custom HTML Block "Manav Dashboard Tabs" (script part): turns the sections of the Manav
// workspace that follow this block (Quotations / Sales, HR & Attendance, Payroll, Masters &
// Records - each starts with a heading block) into tabs: one section is shown at a time.
//
// Frappe runs this inside a function where `root_element` is the block's shadow root.
// Written into the block by manav/manav/workspace_tabs.py on every migrate. Created: 2026-10-19.
//
// Upgrade note: Frappe workspaces have no tabs of their own, so this works on the workspace's
// page: the Editor.js blocks (.ce-block, siblings of this block's .ce-block), the heading block
// (.ce-header), the widgets (.widget) and the edit mode (.edit-mode on blocks while editing).
// Checked on Frappe 16.33.1. If these change, the script does nothing (every section stays
// visible, as without tabs) rather than failing. In edit mode all sections are shown.
//
// CHANGE NOTE
// Date: 2026-11-04
// Change: Also gives the workspace the look of the Lead Dashboard (addLook): the title block as a
// tinted card, number cards and shortcuts as rounded tiles with a large figure and hover lift,
// charts in rounded cards; on a phone two tiles a row. Styles only, scoped to this workspace.
// Reason: The user asked for the home dashboard to match the Leads page / Lead Dashboard.
//
// CHANGE NOTE
// Date: 2026-11-04
// Change: More of the Lead Dashboard: a greeting line with the date under the title (greet; not
// saved with the workspace, removed in edit mode), number cards with an icon chip, number cards and
// shortcuts in the chosen tab's colour (data-mws-tab), and no "Last synced" line under the charts.
// Reason: The user asked to make the (Bangalore) workspace better.
//
// CHANGE NOTE
// Date: 2026-11-06
// Change: Removed the title card (the workspace title as a tinted box) and the "Good morning,
// <name> · <date>" line under it; tabs, tiles and charts keep their look.
// Reason: The user asked why that part was there and did not want it; the card also overlapped
// the first row of shortcuts.
(function manavWorkspaceTabs() {
	const host = root_element.host;
	const bar = root_element.querySelector(".mwt-bar");
	const KEY = "manav-workspace-tab";
	if (!host || !bar) return;
	let active = null;
	try {
		active = localStorage.getItem(KEY);
	} catch (e) {
		active = null; // storage blocked (private window): start on the first tab
	}

	const ownBlock = () => (host.closest ? host.closest(".ce-block") : null);

	// The sections after this block: a heading block starts one; every block up to the next
	// heading belongs to it. has_content: it shows at least one widget the user may see (Frappe
	// leaves a chart's block empty when the user may not read the chart).
	function readSections(own) {
		const sections = [];
		let current = null;
		for (let el = own.nextElementSibling; el; el = el.nextElementSibling) {
			if (!el.classList.contains("ce-block")) continue;
			const heading = el.querySelector(".ce-header");
			if (heading) {
				current = { title: heading.textContent.trim(), blocks: [el], has_content: false };
				sections.push(current);
			} else if (current) {
				current.blocks.push(el);
				if (el.querySelector(".widget")) current.has_content = true;
			}
		}
		return sections;
	}

	function showAll(sections) {
		sections.forEach((s) => s.blocks.forEach((b) => (b.style.display = "")));
		bar.innerHTML = "";
	}

	// 2026-11-04: the look of the Lead Dashboard on this workspace (the user's request): one style
	// sheet in the page's head, applying only inside the workspace that holds this block (class
	// manav-ws on its block list). Only looks: the blocks, their content and edit mode are as before.
	// Frappe's workspace classes used: .ce-block, .ce-header, .widget, .number-widget-box,
	// .shortcut-widget-box, .dashboard-widget-box, .widget-title, .number (checked on Frappe 16.33.1);
	// if they change, the page simply keeps Frappe's own look.
	function addLook(list) {
		list.classList.add("manav-ws");
		if (document.getElementById("manav-ws-style")) return;
		const style = document.createElement("style");
		style.id = "manav-ws-style";
		style.textContent = `
			.manav-ws { --mws-accent: #2a78d6; }
			/* 2026-11-06: the title block is Frappe's own heading again (the tinted title card was removed) */
			/* cards: 16 px corners, a thin line, no shadow; tiles lift on hover */
			.manav-ws .widget { border-radius: 16px; border: 1px solid var(--border-color); box-shadow: none; }
			.manav-ws .number-widget-box, .manav-ws .shortcut-widget-box { padding: 14px 16px; transition: transform 0.15s, box-shadow 0.15s; }
			.manav-ws .number-widget-box:hover, .manav-ws .shortcut-widget-box:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(0, 0, 0, 0.07); }
			.manav-ws .number-widget-box { border-top: 3px solid var(--mws-accent); }
			.manav-ws .number-widget-box .widget-title, .manav-ws .shortcut-widget-box .widget-title { font-size: 13px; font-weight: 600; color: var(--text-muted); }
			.manav-ws .shortcut-widget-box .widget-title { color: var(--heading-color); }
			.manav-ws .number-widget-box .number { font-size: 30px; font-weight: 800; letter-spacing: -0.5px; color: var(--heading-color); font-variant-numeric: tabular-nums; }
			.manav-ws .dashboard-widget-box { padding: 12px 14px; }
			.manav-ws .dashboard-widget-box .widget-title { font-size: 14px; font-weight: 700; color: var(--heading-color); }
			/* later 2026-11-04: the chosen tab's colour (as its pill in tabs.css) for the tiles */
			.manav-ws[data-mws-tab="1"] { --mws-accent: #16a34a; }
			.manav-ws[data-mws-tab="2"] { --mws-accent: #ea580c; }
			.manav-ws[data-mws-tab="3"] { --mws-accent: #7c3aed; }
			.manav-ws[data-mws-tab="4"] { --mws-accent: #0891b2; }
			/* a number card: an icon chip in the tab's colour at its top right, as the Lead Dashboard */
			.manav-ws .number-widget-box { position: relative; }
			.manav-ws .number-widget-box .widget-head { padding-right: 40px; }
			.manav-ws .number-widget-box::after {
				content: ""; position: absolute; top: 14px; right: 14px; width: 32px; height: 32px; border-radius: 10px;
				background: color-mix(in srgb, var(--mws-accent) 13%, transparent);
			}
			.manav-ws .number-widget-box::before {
				content: ""; position: absolute; top: 22px; right: 22px; width: 16px; height: 16px; z-index: 1;
				background: var(--mws-accent);
				-webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 3v18h18'/%3E%3Cpath d='m7 15 4-4 3 3 5-6'/%3E%3C/svg%3E") center / contain no-repeat;
				mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 3v18h18'/%3E%3Cpath d='m7 15 4-4 3 3 5-6'/%3E%3C/svg%3E") center / contain no-repeat;
			}
			/* shortcuts: a coloured edge on the left, the count pill rounder */
			.manav-ws .shortcut-widget-box { border-left: 3px solid var(--mws-accent); }
			.manav-ws .shortcut-widget-box .indicator-pill { border-radius: 999px; font-weight: 600; }
			/* charts: no "Last synced just now" line under the title */
			.manav-ws .dashboard-widget-box .widget-subtitle { display: none; }
			/* phone: two tiles a row (the tabs still hide what is not chosen) */
			@media (max-width: 767px) {
				.manav-ws > .ce-block:has(.number-widget-box), .manav-ws > .ce-block:has(.shortcut-widget-box) {
					flex: 0 0 50% !important; max-width: 50% !important; width: 50% !important;
				}
				.manav-ws .number-widget-box, .manav-ws .shortcut-widget-box { padding: 12px; }
				.manav-ws .number-widget-box .number { font-size: 22px; }
				.manav-ws .number-widget-box::after, .manav-ws .number-widget-box::before { display: none; }
				.manav-ws .number-widget-box .widget-head { padding-right: 0; }
			}
		`;
		document.head.appendChild(style);
	}

	// 2026-11-06: the greeting line under the title (greet) was removed; a line left by an older
	// version of this script on an open page is taken away.
	function apply() {
		const own = ownBlock();
		if (!own || !own.parentElement) return;
		addLook(own.parentElement);
		const editing = Boolean(own.parentElement.querySelector(".edit-mode"));
		own.parentElement.querySelectorAll(".mws-greet").forEach((el) => el.remove());
		const sections = readSections(own);
		const tabs = sections.filter((s) => s.has_content);
		// Editing the workspace, or nothing to choose from: no tabs, everything visible.
		if (editing || tabs.length < 2) {
			delete own.parentElement.dataset.mwsTab;
			showAll(sections);
			return;
		}
		if (!tabs.some((s) => s.title === active)) active = tabs[0].title;
		// later 2026-11-04: the chosen tab's place gives the tiles its colour (addLook)
		own.parentElement.dataset.mwsTab = String(tabs.findIndex((s) => s.title === active));

		// A section is shown only when it is the active tab. Its heading block is hidden too:
		// the tab already names it. Sections without content stay hidden.
		sections.forEach((s) => {
			const on = s.has_content && s.title === active;
			s.blocks.forEach((b, i) => (b.style.display = on && i > 0 ? "" : "none"));
		});
		drawBar(tabs.map((s) => s.title));
	}

	function drawBar(titles) {
		const same =
			bar.children.length === titles.length &&
			titles.every((title, i) => bar.children[i].dataset.title === title);
		if (!same) {
			bar.innerHTML = "";
			titles.forEach((title) => {
				const button = document.createElement("button");
				button.type = "button";
				button.className = "mwt-tab";
				button.setAttribute("role", "tab");
				button.dataset.title = title;
				button.textContent = title;
				button.addEventListener("click", () => select(title));
				bar.appendChild(button);
			});
		}
		Array.from(bar.children).forEach((button) => {
			const on = button.dataset.title === active;
			button.setAttribute("aria-selected", on ? "true" : "false");
			button.tabIndex = on ? 0 : -1;
		});
	}

	function select(title) {
		active = title;
		try {
			localStorage.setItem(KEY, title);
		} catch (e) {
			/* not remembered when storage is blocked */
		}
		apply();
		// Frappe's charts take their width when drawn; a chart drawn while its tab was hidden
		// is redrawn by the window resize that Frappe Charts listens to.
		window.dispatchEvent(new Event("resize"));
	}

	// Left / right arrow keys move between the tabs (WAI-ARIA tabs pattern).
	bar.addEventListener("keydown", (ev) => {
		if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
		const buttons = Array.from(bar.children);
		const i = buttons.findIndex((b) => b.dataset.title === active);
		const next = buttons[(i + (ev.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length];
		if (next) {
			select(next.dataset.title);
			next.focus();
		}
	});

	// The blocks of the workspace are drawn one after another, some after this script has run,
	// and the page is drawn again for edit mode: sort them into tabs whenever they change.
	// The watcher stops when this block leaves the page (another workspace was opened).
	let pending = false;
	let watched = null; // the block list being watched (and given the class manav-ws)
	const observer = new MutationObserver(() => {
		if (!host.isConnected) {
			// 2026-11-04: another workspace is drawn in the same place: it keeps Frappe's own look
			if (watched) watched.classList.remove("manav-ws");
			observer.disconnect();
			return;
		}
		if (pending) return;
		pending = true;
		requestAnimationFrame(() => {
			pending = false;
			apply();
		});
	});
	const start = () => {
		const own = ownBlock();
		if (!own || !own.parentElement) return false;
		watched = own.parentElement;
		observer.observe(own.parentElement, { childList: true, subtree: true, attributeFilter: ["class"] });
		apply();
		return true;
	};
	// The block may not sit in the page yet when this runs; try again shortly.
	if (!start()) setTimeout(start, 300);
})();
