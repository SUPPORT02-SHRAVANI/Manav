// Every Manav print format renders (HTML and PDF) for the newest record of its doctype.
// A format whose doctype has no record yet is skipped, not failed.
// Created: 2026-11-02.
import { test, expect, expectNoProblems, latestName, AUTH } from "./helpers";

// manav/manav/print_format: format -> doctype
const FORMATS: [string, string][] = [
	["Manav Modern Quotation", "Quotation"],
	["Manav Modern Quotation CIF", "Quotation"],
	["Manav Classic Quotation", "Quotation"],
	["Manav Banded Quotation", "Quotation"],
	["Manav Colour Quotation", "Quotation"],
	["Manav Sales Quotation", "Quotation"],
	["Manav Quotation", "Quotation Head"],
	["Manav Modern Quotation Head", "Quotation Head"],
	["Manav Draft PI", "Draft PI"],
	["Manav Proforma Invoice", "Sales Order"],
	["Manav Appointment Letter", "Job Offer"],
];

// Text Frappe puts in a print when the template fails.
const PRINT_ERROR = /Traceback|Error in print format|TemplateSyntaxError|UndefinedError|jinja2\./i;

test.describe("print formats", () => {
	test.use({ storageState: AUTH.admin });

	for (const [format, doctype] of FORMATS) {
		test(`${format} (${doctype})`, async ({ page, request, problems }) => {
			const name = await latestName(request, doctype);
			test.skip(!name, `no ${doctype} on the site to print`);

			// HTML print view, as opened from the form's Print button
			const q = new URLSearchParams({ doctype, name: name!, format, no_letterhead: "0" });
			await page.goto(`/printview?${q}`);
			await expect(page.locator(".print-format").first()).toBeVisible();
			const html = await page.locator("body").innerText();
			expect(html).not.toMatch(PRINT_ERROR);
			expect(html.trim().length).toBeGreaterThan(50);

			// PDF download
			const pdf = await request.get("/api/method/frappe.utils.print_format.download_pdf", {
				params: { doctype, name: name!, format, no_letterhead: "0" },
				timeout: 120_000,
			});
			expect(pdf.status()).toBe(200);
			expect(pdf.headers()["content-type"]).toContain("application/pdf");
			expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
			expectNoProblems(problems);
		});
	}
});
