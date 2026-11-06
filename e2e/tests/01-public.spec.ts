// Pages a visitor sees without logging in: the login page (with Manav's "Request access" link and
// logo CSS), the sign-up page /manav-signup and its checks, and the desk refusing guests.
// Created: 2026-11-02.
import { test, expect, expectNoProblems, apiGet, ALLOW_WRITES, RUN_ID, AUTH, deleteDoc, openDesk } from "./helpers";

test.describe("guest", () => {
	test("login page shows the sign-in form and the Request access link", async ({ page, problems }) => {
		await page.goto("/login");
		await expect(page.locator("#login_email")).toBeVisible();
		await expect(page.locator("#login_password")).toBeVisible();
		// login_signup_link.js (web_include_js) adds the link under the form
		const link = page.locator(".manav-request-access a");
		await expect(link).toHaveText(/Request access/i);
		await expect(link).toHaveAttribute("href", "/manav-signup");
		// login.css (web_include_css) is served
		const css = await page.request.get("/assets/manav/css/login.css");
		expect(css.ok()).toBeTruthy();
		expectNoProblems(problems);
	});

	test("wrong password is refused", async ({ page }) => {
		await page.goto("/login");
		await page.fill("#login_email", "e2e.nobody@manav.test");
		await page.fill("#login_password", "wrong-password");
		await page.click(".for-login .btn-login");
		// Frappe 16 shows the error in a banner above the form and stays on /login
		await expect(page.getByText(/invalid credentials/i)).toBeVisible();
		expect(new URL(page.url()).pathname).toBe("/login");
	});

	test("Request access link opens the sign-up page", async ({ page, problems }) => {
		await page.goto("/login");
		await page.locator(".manav-request-access a").click();
		await expect(page).toHaveURL(/\/manav-signup/);
		await expect(page.locator("#ms-form")).toBeVisible();
		for (const name of ["full_name", "email", "mobile_no", "message"]) {
			await expect(page.locator(`#ms-form [name="${name}"]`)).toBeVisible();
		}
		expectNoProblems(problems);
	});

	test("sign-up page checks name and e-mail before sending", async ({ page }) => {
		const sent: string[] = [];
		page.on("request", (r) => r.url().includes("signup.submit_request") && sent.push(r.url()));
		await page.goto("/manav-signup");

		// The form is novalidate; manav-signup.js shows its own messages in #ms-error.
		await page.fill('#ms-form [name="full_name"]', "   ");
		await page.fill('#ms-form [name="email"]', "someone@example.com");
		await page.click("#ms-submit");
		await expect(page.locator("#ms-error")).toHaveText(/full name/i);

		await page.fill('#ms-form [name="full_name"]', "E2E Visitor");
		await page.fill('#ms-form [name="email"]', "not-an-email");
		await page.click("#ms-submit");
		await expect(page.locator("#ms-error")).toHaveText(/valid e-mail/i);

		expect(sent, "no request is sent while the form is invalid").toEqual([]);
	});

	test("desk and Manav APIs are closed to guests", async ({ page, request }) => {
		await page.goto("/desk/manav-lead");
		await expect(page).toHaveURL(/\/login/);

		const r = await apiGet(request, "manav.manav.dashboard.get_dashboard_data");
		expect(r.status).toBe(403);
		const leads = await request.get("/api/resource/Manav Lead");
		expect(leads.status()).toBe(403);
	});
});

test.describe("guest sign-up (writes)", () => {
	test.skip(!ALLOW_WRITES, "set E2E_ALLOW_WRITES=1 to run tests that create records");

	const email = `${RUN_ID.toLowerCase()}@manav.test`;

	test("a sign-up request is accepted and stored for the managers", async ({ page, browser, problems }) => {
		await page.goto("/manav-signup");
		await page.fill('#ms-form [name="full_name"]', `${RUN_ID} Visitor`);
		await page.fill('#ms-form [name="email"]', email);
		await page.fill('#ms-form [name="mobile_no"]', "9000000000");
		await page.fill('#ms-form [name="message"]', "Created by the Playwright tests; safe to delete.");
		await page.click("#ms-submit");
		await expect(page.locator("#ms-done")).toBeVisible();
		await expect(page.locator("#ms-form")).toBeHidden();
		expectNoProblems(problems);

		// The admin finds the request, then deletes it.
		const ctx = await browser.newContext({ storageState: AUTH.admin });
		const admin = await ctx.newPage();
		try {
			await openDesk(admin, "manav-signup-request");
			// frappe.client.get_list has no "pluck": it returns [{name}, ...]
			const names: string[] = await admin.evaluate(
				async (e) =>
					(await window.frappe.xcall("frappe.client.get_list", { doctype: "Manav Signup Request", filters: { email: e } })).map(
						(r: any) => r.name
					),
				email
			);
			expect(names.length).toBe(1);
			for (const n of names) expect(await deleteDoc(admin, "Manav Signup Request", n), `delete ${n}`).toBe("");
		} finally {
			await ctx.close();
		}
	});
});
