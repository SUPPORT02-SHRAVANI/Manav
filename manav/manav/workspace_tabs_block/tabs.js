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

	function apply() {
		const own = ownBlock();
		if (!own || !own.parentElement) return;
		const sections = readSections(own);
		const tabs = sections.filter((s) => s.has_content);
		// Editing the workspace, or nothing to choose from: no tabs, everything visible.
		if (own.parentElement.querySelector(".edit-mode") || tabs.length < 2) {
			showAll(sections);
			return;
		}
		if (!tabs.some((s) => s.title === active)) active = tabs[0].title;

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
	const observer = new MutationObserver(() => {
		if (!host.isConnected) {
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
		observer.observe(own.parentElement, { childList: true, subtree: true, attributeFilter: ["class"] });
		apply();
		return true;
	};
	// The block may not sit in the page yet when this runs; try again shortly.
	if (!start()) setTimeout(start, 300);
})();
