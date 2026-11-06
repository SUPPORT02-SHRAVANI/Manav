// Desk navigation set by manav.manav.desk_home: the page after login, the desk icons (the branch
// workspaces + Lead Management, for everyone), non-admins limited to the Manav workspaces and app,
// and every Manav workspace opening.
// Created: 2026-11-02.
import { test, expect, expectNoProblems, expectNoDialog, openDesk, currentRoute, AUTH, USERS, Role } from "./helpers";

// desk_home.BRANCH_WORKSPACES / DESK_ICONS / MANAV_WORKSPACE
const BRANCHES = ["Bangalore", "FTWZ", "Chennai", "Coimbatore"];
const DESK_ICONS = [...BRANCHES, "Lead Management"];
const MANAV_WORKSPACES = ["Manav", "Lead Management", ...BRANCHES];

for (const role of ["admin", "sales"] as Role[]) {
	test.describe(`as ${role}`, () => {
		test("after login the user lands on the Manav Dashboard", async ({ browser }) => {
			// hooks.py add_to_apps_screen route + System Settings default app = manav
			const ctx = await browser.newContext();
			const page = await ctx.newPage();
			await page.goto("/login");
			await page.fill("#login_email", USERS[role].user);
			await page.fill("#login_password", USERS[role].password);
			await page.click(".for-login .btn-login");
			await page.waitForURL(/\/desk/);
			await page.waitForFunction(() => !!window.frappe?.get_route, null, { timeout: 60_000 });
			await expect.poll(() => page.evaluate(() => window.frappe.get_route()[0]), { timeout: 20_000 }).toBe("manav-dashboard");
			await ctx.close();
		});
	});

	test.describe(`as ${role} (saved login)`, () => {
		test.use({ storageState: AUTH[role] });

		test("desk home shows only the branch and Lead Management icons", async ({ page, problems }) => {
			await openDesk(page, "");
			const icons: string[] = await page.evaluate(() => (window.frappe.boot.desktop_icons || []).map((i: any) => i.label));
			expect(icons.sort()).toEqual([...DESK_ICONS].sort());
			await expectNoDialog(page);
			expectNoProblems(problems);
		});

		for (const ws of ["Manav", ...BRANCHES]) {
			test(`workspace ${ws} opens without errors`, async ({ page, problems }) => {
				await openDesk(page, ws.toLowerCase());
				expect(await currentRoute(page)).toEqual(["Workspaces", ws]);
				await expect(page.locator(".layout-main-section").first()).toBeVisible();
				// number cards / charts the user may not read show a Permission Error dialog
				await expectNoDialog(page);
				expectNoProblems(problems);
			});
		}
	});
}

test.describe("non-admin desk is limited to Manav", () => {
	test.use({ storageState: AUTH.sales });

	test("sales user gets only the Manav workspaces, sidebars and app", async ({ page }) => {
		await openDesk(page, "manav");
		const boot = await page.evaluate(() => ({
			workspaces: (window.frappe.boot.workspaces.pages || []).map((p: any) => p.name),
			sidebars: Object.keys(window.frappe.boot.workspace_sidebar_item || {}),
			apps: (window.frappe.boot.app_data || []).map((a: any) => a.app_name),
		}));
		expect(boot.workspaces).toContain("Manav");
		for (const ws of boot.workspaces) expect(MANAV_WORKSPACES).toContain(ws);
		for (const sb of boot.sidebars) expect(MANAV_WORKSPACES.map((w) => w.toLowerCase())).toContain(sb);
		expect(boot.apps).toEqual(["manav"]);
	});
});

test.describe("admin desk is not limited", () => {
	test.use({ storageState: AUTH.admin });

	test("System Manager keeps the ERPNext workspaces", async ({ page }) => {
		await openDesk(page, "manav");
		const workspaces: string[] = await page.evaluate(() => (window.frappe.boot.workspaces.pages || []).map((p: any) => p.name));
		expect(workspaces).toContain("Manav");
		expect(workspaces.some((w) => !MANAV_WORKSPACES.includes(w)), "admin also sees non-Manav workspaces").toBeTruthy();
	});
});
