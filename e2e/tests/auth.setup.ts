// Setup step: logs each test user in through the real login page and saves the session
// (.auth/<role>.json), so the other tests start already logged in.
// Created: 2026-11-02.
import { test as setup, expect } from "@playwright/test";
import { AUTH, USERS, Role } from "./helpers";

for (const role of Object.keys(USERS) as Role[]) {
	setup(`log in as ${role}`, async ({ page }) => {
		const { user, password } = USERS[role];
		expect(user && password, `E2E_${role.toUpperCase()}_USER / _PASSWORD missing in e2e/.env`).toBeTruthy();

		await page.goto("/login");
		await page.fill("#login_email", user);
		await page.fill("#login_password", password);
		await page.click(".for-login .btn-login");
		await page.waitForURL(/\/desk/, { timeout: 60_000 });
		await page.waitForFunction(() => !!(window as any).frappe?.boot?.user, null, { timeout: 60_000 });
		expect(await page.evaluate(() => (window as any).frappe.session.user)).toBe(user);

		await page.context().storageState({ path: AUTH[role] });
	});
}
