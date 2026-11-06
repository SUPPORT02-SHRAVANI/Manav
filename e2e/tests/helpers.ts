// Shared helpers for the Manav Playwright tests: users, a fixture that records browser errors and
// failed API calls, desk navigation, Frappe API calls and the checks most tests end with.
// Created: 2026-11-02.
import { test as base, expect, Page, APIRequestContext } from "@playwright/test";

// The desk's globals, used inside page.evaluate / waitForFunction.
declare global {
	interface Window {
		frappe: any;
		cur_frm: any;
	}
}

export type Role = "admin" | "sales";

// Saved logins written by auth.setup.ts (git-ignored: they hold session cookies).
export const AUTH: Record<Role, string> = {
	admin: ".auth/admin.json",
	sales: ".auth/sales.json",
};

export const USERS: Record<Role, { user: string; password: string }> = {
	admin: { user: process.env.E2E_ADMIN_USER || "", password: process.env.E2E_ADMIN_PASSWORD || "" },
	sales: { user: process.env.E2E_SALES_USER || "", password: process.env.E2E_SALES_PASSWORD || "" },
};

// Tests that create records run only when asked for, as they write to the site's database.
export const ALLOW_WRITES = process.env.E2E_ALLOW_WRITES === "1";

// Unique suffix for records made by one run, so runs never clash and leftovers are easy to find.
export const RUN_ID = `E2E-${Date.now().toString(36).toUpperCase()}`;

// Desk route of a doctype or page: "Manav Lead" -> "manav-lead".
export const slug = (name: string) => name.toLowerCase().replace(/ /g, "-");

/**
 * `problems` collects, for every test, uncaught browser errors and API calls that answered with an
 * HTTP error. Tests end with expectNoProblems(problems); tests that expect a refusal (permission
 * checks) simply do not call it.
 */
export const test = base.extend<{ problems: string[] }>({
	problems: [
		async ({ page }, use, testInfo) => {
			const problems: string[] = [];
			page.on("pageerror", (e) => problems.push(`JS error: ${e.message}`));
			page.on("response", (r) => {
				const url = new URL(r.url());
				if (r.status() >= 400 && url.pathname.startsWith("/api/")) {
					problems.push(`HTTP ${r.status()} ${r.request().method()} ${url.pathname}`);
				}
			});
			await use(problems);
			if (problems.length) {
				await testInfo.attach("problems", { body: problems.join("\n"), contentType: "text/plain" });
			}
		},
		{ auto: true },
	],
});

export { expect };

export function expectNoProblems(problems: string[]) {
	expect(problems, "browser errors / failed API calls").toEqual([]);
}

// Waits until the desk has booted and the router has finished (no freeze, no pending requests).
export async function waitForDesk(page: Page) {
	await page.waitForFunction(() => !!(window.frappe && window.frappe.boot && window.frappe.get_route), null, {
		timeout: 60_000,
	});
	await page.waitForLoadState("networkidle").catch(() => {});
	await page.waitForFunction(() => !window.frappe.dom || !window.frappe.dom.freeze_count, null, { timeout: 30_000 });
}

// Opens a desk route ("manav-lead", "query-report/Manav Lead Register", ...).
export async function openDesk(page: Page, route: string) {
	await page.goto(`/desk/${route}`);
	await waitForDesk(page);
}

export const currentRoute = (page: Page): Promise<string[]> => page.evaluate(() => window.frappe.get_route());

/**
 * Text of an open message / error dialog (frappe.msgprint, frappe.throw), or "" when none is open.
 * Frappe 16 shows these in a Bootstrap modal with the class "msgprint-dialog".
 */
export async function openDialogText(page: Page): Promise<string> {
	const dialog = page.locator(".modal.show.msgprint-dialog, .modal.show:has(.msgprint)");
	if (!(await dialog.count())) return "";
	return ((await dialog.first().innerText()) || "").trim();
}

export async function expectNoDialog(page: Page) {
	expect(await openDialogText(page), "an error / message dialog is open").toBe("");
}

/**
 * Calls a whitelisted method as the page's logged-in user through frappe.xcall, so the CSRF token
 * and session are the desk's own. Resolves with `message`, or rejects with the server's error.
 */
export async function xcall<T = any>(page: Page, method: string, args: Record<string, any> = {}): Promise<T> {
	return page.evaluate(([m, a]) => window.frappe.xcall(m, a), [method, args] as const);
}

// Same call, but returns {ok, message, error} instead of throwing, for permission tests.
export async function tryXcall(page: Page, method: string, args: Record<string, any> = {}) {
	return page.evaluate(
		async ([m, a]) => {
			try {
				// frappe.call without its error dialog, so the test page stays clean.
				const r = await window.frappe.call({ method: m, args: a, freeze: false, error_handlers: {}, silent: true });
				return { ok: true, message: r && r.message, error: "" };
			} catch (e: any) {
				return { ok: false, message: null, error: String((e && (e.exc_type || e.message)) || e) };
			}
		},
		[method, args] as const
	);
}

// GET a whitelisted method with the request context's session (read-only calls need no CSRF token).
export async function apiGet(request: APIRequestContext, method: string, params: Record<string, string> = {}) {
	const res = await request.get(`/api/method/${method}`, { params });
	let body: any = null;
	try {
		body = await res.json();
	} catch {
		body = null;
	}
	return { status: res.status(), body };
}

// Newest record of a doctype the user can read, or null when there is none.
export async function latestName(request: APIRequestContext, doctype: string): Promise<string | null> {
	const res = await request.get(`/api/resource/${encodeURIComponent(doctype)}`, {
		params: { fields: JSON.stringify(["name"]), order_by: "modified desc", limit_page_length: "1" },
	});
	if (!res.ok()) return null;
	const data = (await res.json()).data || [];
	return data.length ? data[0].name : null;
}

// Deletes a record as the page's user (cleanup helper). Resolves with "" once the record is gone
// (also when it never existed), else with the reason, so a cleanup that fails is reported.
export async function deleteDoc(page: Page, doctype: string, name: string): Promise<string> {
	const error = await page.evaluate(
		async ([dt, dn]) => {
			try {
				await window.frappe.xcall("frappe.client.delete", { doctype: dt, name: dn });
				return "";
			} catch (e: any) {
				return String((e && (e.exc_type || e.message)) || e || "error");
			}
		},
		[doctype, name] as const
	);
	const left = await page.evaluate(([dt, dn]) => window.frappe.db.exists(dt, dn), [doctype, name] as const);
	if (!left) return "";
	console.warn(`cleanup: ${doctype} ${name} not deleted: ${error}`);
	return error || "still exists";
}

// Saves the open form with Ctrl+S and waits until it is no longer new / dirty.
export async function saveForm(page: Page) {
	await page.keyboard.press("Control+s");
	await page.waitForFunction(
		() => window.cur_frm && !window.cur_frm.is_new() && !window.cur_frm.is_dirty() && !window.cur_frm.saving,
		null,
		{ timeout: 45_000 }
	);
	await waitForDesk(page);
}

// Types into a Data / Small Text field of the open form, the way a user would.
export async function fillField(page: Page, fieldname: string, value: string) {
	const input = page
		.locator(`.frappe-control[data-fieldname="${fieldname}"]:visible`)
		.locator("input, textarea")
		.first();
	await input.fill(value);
	await input.blur();
}

// Sets a Link / Select field through the form API (the dropdowns of link fields are flaky to click).
export async function setValue(page: Page, fieldname: string, value: any) {
	await page.evaluate(([f, v]) => window.cur_frm.set_value(f, v), [fieldname, value] as const);
	await page.waitForLoadState("networkidle").catch(() => {});
}
