// Every Manav doctype's list and new form open without errors, the ERPNext doctypes Manav extends
// (custom fields + doctype_js / doctype_list_js in hooks.py) still open, and the doctype
// permissions hold for a Sales User.
// Created: 2026-11-02.
import { test, expect, expectNoProblems, expectNoDialog, openDesk, currentRoute, slug, AUTH } from "./helpers";

// Manav's own doctypes (manav/manav/doctype), without child tables, and which a Sales User may read.
const DOCTYPES: { name: string; sales: boolean }[] = [
	{ name: "Manav Lead", sales: true },
	{ name: "Manav Visit", sales: true },
	{ name: "Manav Lead Source", sales: true },
	{ name: "Manav Lead Stage", sales: true },
	{ name: "Manav Product", sales: true },
	{ name: "Manav Product Type", sales: true },
	{ name: "Draft PI", sales: true },
	{ name: "Quotation Head", sales: true },
	{ name: "Quotation Item Master", sales: true },
	{ name: "Quotation Sub Item Master", sales: true },
	{ name: "Quotation Type", sales: true },
	{ name: "Region Zone", sales: true },
	{ name: "Customer Contact Person", sales: true },
	{ name: "Employee Master", sales: false },
	{ name: "Manav Signup Request", sales: false },
];
const SINGLES = ["Manav AI Settings", "Manav Lead Settings"];

// ERPNext / HRMS doctypes with Manav fields or scripts, and fields Manav adds to them
// (manav/manav/erpnext_fields.py and pi.py).
const EXTENDED: Record<string, string[]> = {
	Quotation: ["custom_quotation_type", "custom_signed_by", "custom_sales_engineer", "custom_branch"],
	"Sales Order": ["custom_price_type", "custom_price_port"],
	Item: [],
	Customer: [],
	"Job Offer": [],
};

test.describe("admin: Manav doctypes", () => {
	test.use({ storageState: AUTH.admin });

	for (const { name } of DOCTYPES) {
		test(`${name}: list and new form open`, async ({ page, problems }) => {
			await openDesk(page, slug(name));
			expect((await currentRoute(page))[0]).toBe("List");
			await expect(page.locator(".frappe-list").first()).toBeVisible();
			await expectNoDialog(page);

			await openDesk(page, `${slug(name)}/new`);
			await page.waitForFunction((dt) => window.cur_frm?.doctype === dt && window.cur_frm.is_new(), name);
			await expect(page.locator(".form-layout").first()).toBeVisible();
			await expectNoDialog(page);
			expectNoProblems(problems);
		});
	}

	for (const name of SINGLES) {
		test(`${name}: settings form opens`, async ({ page, problems }) => {
			await openDesk(page, slug(name));
			await page.waitForFunction((dt) => window.cur_frm?.doctype === dt, name);
			await expectNoDialog(page);
			expectNoProblems(problems);
		});
	}
});

test.describe("admin: ERPNext doctypes extended by Manav", () => {
	test.use({ storageState: AUTH.admin });

	for (const [doctype, fields] of Object.entries(EXTENDED)) {
		test(`${doctype}: list and new form open with Manav fields`, async ({ page, problems }) => {
			await openDesk(page, slug(doctype));
			await expect(page.locator(".frappe-list").first()).toBeVisible();
			await expectNoDialog(page);

			await openDesk(page, `${slug(doctype)}/new`);
			await page.waitForFunction((dt) => window.cur_frm?.doctype === dt, doctype);
			for (const f of fields) {
				const df = await page.evaluate(([dt, fn]) => !!window.frappe.meta.get_docfield(dt, fn), [doctype, f] as const);
				expect(df, `${doctype}.${f} exists`).toBeTruthy();
			}
			await expectNoDialog(page);
			expectNoProblems(problems);
		});
	}

	test("Item list has the Sub-Items Tree button (item_list.js)", async ({ page, problems }) => {
		await openDesk(page, "item");
		await expect(page.getByRole("button", { name: /Sub-Items Tree/i })).toBeVisible();
		expectNoProblems(problems);
	});
});

test.describe("sales user: doctype permissions", () => {
	test.use({ storageState: AUTH.sales });

	for (const { name, sales } of DOCTYPES) {
		test(`${name}: ${sales ? "readable" : "refused"}`, async ({ page, problems }) => {
			// The REST API reflects the doctype permissions directly.
			const res = await page.request.get(`/api/resource/${encodeURIComponent(name)}`, {
				params: { limit_page_length: "1" },
			});
			expect(res.status()).toBe(sales ? 200 : 403);

			if (sales) {
				await openDesk(page, `${slug(name)}/new`);
				await page.waitForFunction((dt) => window.cur_frm?.doctype === dt, name);
				await expectNoDialog(page);
				expectNoProblems(problems);
			}
		});
	}

	test("Manav AI Settings is refused", async ({ page }) => {
		const res = await page.request.get("/api/resource/Manav AI Settings/Manav AI Settings");
		expect(res.status()).toBe(403);
	});
});
