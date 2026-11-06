// Writing tests (run only with E2E_ALLOW_WRITES=1): masters created through their forms, and the
// sales flow of a Sales User: new lead -> it appears on the Leads Board -> a visit (DVR) checked in
// with a GPS position -> checked out. Every record is named / tagged with RUN_ID and deleted by
// the admin at the end, whether the tests pass or fail.
// Created: 2026-11-02.
import { Browser } from "@playwright/test";
import {
	test,
	expect,
	expectNoProblems,
	expectNoDialog,
	openDesk,
	saveForm,
	fillField,
	setValue,
	deleteDoc,
	slug,
	AUTH,
	ALLOW_WRITES,
	RUN_ID,
} from "./helpers";

test.skip(!ALLOW_WRITES, "set E2E_ALLOW_WRITES=1 to run tests that create records");
// The steps of the flow build on each other.
test.describe.configure({ mode: "serial" });

// Records to delete at the end, in this order (children before what they link to).
const created: [string, string][] = [];

async function cleanup(browser: Browser) {
	const ctx = await browser.newContext({ storageState: AUTH.admin });
	const page = await ctx.newPage();
	await openDesk(page, "manav");
	for (const [dt, dn] of [...created].reverse()) {
		// A visit's follow-up makes a ToDo; delete those first so the visit can go.
		await page.evaluate(
			async ([d, n]) => {
				const todos = await window.frappe.xcall("frappe.client.get_list", {
					doctype: "ToDo",
					filters: { reference_type: d, reference_name: n },
				});
				for (const t of todos) await window.frappe.xcall("frappe.client.delete", { doctype: "ToDo", name: t.name });
			},
			[dt, dn] as const
		);
		expect.soft(await deleteDoc(page, dt, dn), `cleanup ${dt} ${dn}`).toBe("");
	}
	await ctx.close();
}

test.afterAll(async ({ browser }) => cleanup(browser));

// Masters: [doctype, {field: value}] - the first field is the record's name (autoname field:...).
const MASTERS: [string, Record<string, string>][] = [
	["Manav Lead Source", { source_name: `${RUN_ID} Source` }],
	["Manav Lead Stage", { stage_name: `${RUN_ID} Stage` }],
	["Manav Product Type", { type_name: `${RUN_ID} Type` }],
	["Region Zone", { zone_code: `${RUN_ID}-Z`, zone_name: `${RUN_ID} Zone` }],
];

test.describe("admin creates masters through their forms", () => {
	test.use({ storageState: AUTH.admin });

	for (const [doctype, values] of MASTERS) {
		test(`${doctype}`, async ({ page, problems }) => {
			await openDesk(page, `${slug(doctype)}/new`);
			await page.waitForFunction((dt) => window.cur_frm?.doctype === dt, doctype);
			for (const [f, v] of Object.entries(values)) await fillField(page, f, v);
			await saveForm(page);
			const name: string = await page.evaluate(() => window.cur_frm.doc.name);
			created.push([doctype, name]);
			expect(name).toBe(Object.values(values)[0]);
			await expectNoDialog(page);
			expectNoProblems(problems);
		});
	}

	test("a required field left empty stops the save", async ({ page }) => {
		await openDesk(page, "manav-lead-source/new");
		await page.waitForFunction(() => window.cur_frm?.doctype === "Manav Lead Source");
		await page.keyboard.press("Control+s");
		// Frappe lists the missing mandatory fields in a dialog
		await expect(page.locator(".modal.show")).toContainText(/Missing Fields|Mandatory/i);
		expect(await page.evaluate(() => window.cur_frm.is_new())).toBeTruthy();
	});
});

test.describe("sales user: lead to visit", () => {
	test.use({
		storageState: AUTH.sales,
		// The visit form reads the browser's GPS position on check-in (manav_visit_position.js).
		geolocation: { latitude: 12.9716, longitude: 77.5946, accuracy: 10 },
		permissions: ["geolocation"],
	});

	const company = `${RUN_ID} Industries`;
	let lead = "";
	let visit = "";

	test("creates a lead", async ({ page, problems }) => {
		const source = created.find(([dt]) => dt === "Manav Lead Source")?.[1];
		test.skip(!source, "the lead source master was not created");

		await openDesk(page, "manav-lead/new");
		await page.waitForFunction(() => window.cur_frm?.doctype === "Manav Lead");
		// lead_date, status, location and naming series have defaults
		await fillField(page, "company_name", company);
		await fillField(page, "mobile_no", "9000000001");
		await fillField(page, "contact_person", "E2E Contact");
		await fillField(page, "contact_position", "Purchase Manager");
		await fillField(page, "email_id", `${RUN_ID.toLowerCase()}.lead@manav.test`);
		await setValue(page, "location", "CHENNAI");
		await setValue(page, "source", source);
		await saveForm(page);

		lead = await page.evaluate(() => window.cur_frm.doc.name);
		created.push(["Manav Lead", lead]);
		expect(lead).toMatch(/^LEAD-/);
		expect(await page.evaluate(() => window.cur_frm.doc.status)).toBe("Open");
		await expectNoDialog(page);
		expectNoProblems(problems);
	});

	test("the lead is on the Leads Board and in the lead list", async ({ page, problems }) => {
		test.skip(!lead, "no lead");
		await openDesk(page, "manav-leads-board");
		// The board opens on the "Open" tab, which is the new lead's status
		await expect(page.locator('[data-page-route="manav-leads-board"]').getByText(company).first()).toBeVisible();

		await openDesk(page, "manav-lead");
		await expect(page.locator(".frappe-list").getByText(company).first()).toBeVisible();
		expectNoProblems(problems);
	});

	test("checks in a visit for the lead with the GPS position", async ({ page, browserName, problems }) => {
		test.skip(!lead, "no lead");
		await openDesk(page, "manav-visit/new");
		await page.waitForFunction(() => window.cur_frm?.doctype === "Manav Visit");
		await setValue(page, "lead", lead);
		await setValue(page, "visit_purpose", "Follow-up");
		await fillField(page, "discussion", "Playwright test visit; safe to delete.");
		await saveForm(page);

		visit = await page.evaluate(() => window.cur_frm.doc.name);
		created.push(["Manav Visit", visit]);
		const doc = await page.evaluate(() => window.cur_frm.doc);
		expect(visit).toMatch(/^VISIT-/);
		expect(doc.status).toBe("Checked In");
		expect(doc.checkin_date).toBeTruthy();
		// Browsers share the position only on https or an origin treated as secure. playwright.config.ts
		// makes Chromium and Firefox treat the site as secure, so there the browser's (emulated) GPS
		// position must be saved. WebKit cannot, so it checks the http path of manav_visit_position.js:
		// the visit is still saved, without a position.
		const secure = await page.evaluate(() => window.isSecureContext);
		if (browserName === "webkit" && !secure) {
			test.info().annotations.push({ type: "note", description: "http site on WebKit: visit saved without a GPS position" });
			expect(Number(doc.checkin_latitude) || 0).toBe(0);
		} else {
			expect(secure, "site treated as a secure origin, so the browser shares its position").toBeTruthy();
			expect(Number(doc.checkin_latitude)).toBeCloseTo(12.9716, 3);
			expect(Number(doc.checkin_longitude)).toBeCloseTo(77.5946, 3);
			expect(Number(doc.checkin_accuracy)).toBeGreaterThan(0);
		}
		expectNoProblems(problems);
	});

	test("checks the visit out", async ({ page, problems }) => {
		test.skip(!visit, "no visit");
		await openDesk(page, `manav-visit/${visit}`);
		await page.waitForFunction((v) => window.cur_frm?.doc?.name === v, visit);
		await page.getByRole("button", { name: "Check Out" }).click();
		// The check-out may ask for confirmation first
		const yes = page.locator(".modal.show .btn-primary");
		if (await yes.isVisible().catch(() => false)) await yes.click();
		await expect
			.poll(() => page.evaluate(() => window.cur_frm.doc.status), { timeout: 45_000 })
			.not.toBe("Checked In");
		expect(await page.evaluate(() => window.cur_frm.doc.checkout_date)).toBeTruthy();
		expectNoProblems(problems);
	});

	test("a Sales User cannot delete their lead", async ({ page }) => {
		test.skip(!lead, "no lead");
		// Sales User has no delete permission on Manav Lead
		await openDesk(page, "manav");
		const res = await page.evaluate(async (l) => {
			try {
				await window.frappe.xcall("frappe.client.delete", { doctype: "Manav Lead", name: l });
				return "deleted";
			} catch (e) {
				return "refused";
			}
		}, lead);
		expect(res).toBe("refused");
	});
});
