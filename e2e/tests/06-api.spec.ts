// Manav's read-only whitelisted methods answer for the right users and refuse the wrong ones.
// Methods that call the AI service, read images or move data between sites (quotation_agent,
// visiting_card, specification_screenshot, site_transfer) are deliberately not called.
// Created: 2026-11-02.
import { test, expect, apiGet, latestName, AUTH } from "./helpers";

const M = "manav.manav";

test.describe("admin API", () => {
	test.use({ storageState: AUTH.admin });

	test("dashboard figures", async ({ request }) => {
		const r = await apiGet(request, `${M}.dashboard.get_dashboard_data`);
		expect(r.status).toBe(200);
		expect(r.body.message).toBeTruthy();
	});

	test("lead counts, lead dashboard and leads board", async ({ request }) => {
		const counts = await apiGet(request, `${M}.lead_api.get_lead_counts`);
		expect(counts.status).toBe(200);
		// every status starts at 0, so the counts are numbers
		for (const v of Object.values(counts.body.message)) expect(typeof v).toBe("number");

		expect((await apiGet(request, `${M}.lead_api.get_dashboard`)).status).toBe(200);
		expect((await apiGet(request, `${M}.lead_board.get_lead_board`)).status).toBe(200);
	});

	test("machine sub-items tree", async ({ request }) => {
		const root = await apiGet(request, `${M}.item_tree.get_tree_nodes`, { is_root: "1" });
		expect(root.status).toBe(200);
		expect(Array.isArray(root.body.message)).toBeTruthy();
	});

	test("customer dashboard for the newest customer", async ({ request }) => {
		const customer = await latestName(request, "Customer");
		test.skip(!customer, "no Customer on the site");
		const r = await apiGet(request, `${M}.customer_dashboard.get_customer_dashboard`, { customer: customer! });
		expect(r.status).toBe(200);
		expect(r.body.message).toBeTruthy();
	});

	test("customer dashboard refuses an unknown customer", async ({ request }) => {
		const r = await apiGet(request, `${M}.customer_dashboard.get_customer_dashboard`, { customer: "E2E-NO-SUCH-CUSTOMER" });
		expect(r.status).toBeGreaterThanOrEqual(400);
	});
});

test.describe("sales user API", () => {
	test.use({ storageState: AUTH.sales });

	test("own dashboard and lead APIs answer", async ({ request }) => {
		expect((await apiGet(request, `${M}.dashboard.get_dashboard_data`)).status).toBe(200);
		expect((await apiGet(request, `${M}.lead_api.get_lead_counts`)).status).toBe(200);
		expect((await apiGet(request, `${M}.lead_board.get_lead_board`)).status).toBe(200);
	});

	test("customer dashboard is management only", async ({ request }) => {
		const r = await apiGet(request, `${M}.customer_dashboard.get_customer_dashboard`, { customer: "anything" });
		expect(r.status).toBe(403);
	});

	test("POST-only methods refuse GET", async ({ request }) => {
		// @frappe.whitelist(methods=["POST"]) in quotation_agent / site_transfer
		for (const m of [`${M}.quotation_agent.draft_quotation`, `${M}.site_transfer.receive`]) {
			const r = await apiGet(request, m);
			expect(r.status, m).toBeGreaterThanOrEqual(400);
		}
	});
});
