// Manav's desk pages (manav/manav/page) and script reports (manav/manav/report) open and load
// their data without errors, for the admin and for a Sales User (who has the reports' roles).
// Created: 2026-11-02.
import { test, expect, expectNoProblems, expectNoDialog, openDesk, currentRoute, AUTH, Role } from "./helpers";

// page name -> roles that may open it ("all" = no roles set on the page)
const PAGES: { name: string; sales: boolean }[] = [
	{ name: "manav-dashboard", sales: true },
	{ name: "manav-lead-dashboard", sales: true },
	{ name: "manav-leads-board", sales: true },
	{ name: "machine-sub-items", sales: true },
	// management only (customer_dashboard.get_customer_dashboard)
	{ name: "customer-dashboard", sales: false },
];

const REPORTS = [
	"Manav Lead Register",
	"Manav Lead Funnel",
	"Manav Salesperson Performance",
	"Manav Visit Register",
	"Manav Visit Analysis",
	"Manav Followup Tracker",
];

for (const role of ["admin", "sales"] as Role[]) {
	test.describe(`${role}: pages`, () => {
		test.use({ storageState: AUTH[role] });

		for (const { name, sales } of PAGES) {
			if (role === "sales" && !sales) continue;
			test(`${name} opens`, async ({ page, problems }) => {
				await openDesk(page, name);
				expect((await currentRoute(page))[0]).toBe(name);
				await expect(page.locator(`[data-page-route="${name}"]`)).toBeVisible();
				await expectNoDialog(page);
				expectNoProblems(problems);
			});
		}
	});

	test.describe(`${role}: reports`, () => {
		test.use({ storageState: AUTH[role] });

		for (const report of REPORTS) {
			test(`${report} runs`, async ({ page, problems }) => {
				await openDesk(page, `query-report/${report}`);
				// The report has run once its rows (possibly none) are on frappe.query_report.
				await expectNoDialog(page);
				await page.waitForFunction(
					(r) => window.frappe.query_report?.report_name === r && Array.isArray(window.frappe.query_report.data),
					report,
					{ timeout: 45_000 }
				);
				await expect(page.locator(".report-wrapper").first()).toBeVisible();
				expectNoProblems(problems);
			});
		}
	});
}

test.describe("leads board and dashboards show data", () => {
	test.use({ storageState: AUTH.admin });

	test("Leads Board: the All tab counts and shows every lead", async ({ page, problems }) => {
		await openDesk(page, "manav-leads-board");
		const board = page.locator('[data-page-route="manav-leads-board"]');
		const total: number = await page.evaluate(() => window.frappe.xcall("frappe.client.get_count", { doctype: "Manav Lead" }));
		const lead = await page.evaluate(() =>
			window.frappe.xcall("frappe.client.get_list", {
				doctype: "Manav Lead",
				fields: ["company_name"],
				order_by: "modified desc",
				limit_page_length: 1,
			})
		);
		test.skip(!lead.length, "no Manav Lead on the site");

		// The board opens on the "Open" tab; "All <n>" lists every lead the user can read.
		const all = board.getByText(/^\s*All\s*\d+\s*$/).first();
		await expect(all).toContainText(String(total));
		await all.click();
		await expect(board.getByText(lead[0].company_name).first()).toBeVisible();
		expectNoProblems(problems);
	});

	test("Machine Sub-Items tree loads its root", async ({ page, problems }) => {
		await openDesk(page, "machine-sub-items");
		await expect(page.locator(`[data-page-route="machine-sub-items"] .tree, [data-page-route="machine-sub-items"] .tree-node`).first()).toBeVisible();
		expectNoProblems(problems);
	});
});
