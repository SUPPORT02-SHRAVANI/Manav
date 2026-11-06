// Playwright configuration for the Manav site's end-to-end tests.
// Created: 2026-11-02.
// Settings come from e2e/.env (see .env.example): the site URL, two test users and E2E_ALLOW_WRITES.
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, ".env") });

const baseURL = process.env.E2E_BASE_URL || "http://192.168.1.30:8006";

export default defineConfig({
	testDir: "./tests",
	// The site is a development bench (bench start), so pages are slower than production.
	timeout: 90_000,
	expect: { timeout: 20_000 },
	// Tests are independent (07-lead-flow is serial on its own), so they share out across workers.
	fullyParallel: true,
	workers: 3,
	retries: 1,
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		navigationTimeout: 60_000,
		actionTimeout: 20_000,
	},
	projects: [
		// Logs in each test user once and saves the session for the other tests.
		{ name: "setup", testMatch: /auth\.setup\.ts/ },
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				// CHANGE NOTE
				// Date: 2026-11-02
				// Change: full Chromium ("chromium" channel) instead of the default headless shell.
				// Reason: the site is plain http, where browsers refuse geolocation; only full Chromium
				// honours the flag that treats this one origin as secure, so the visit check-in test can
				// hand the form a GPS position (the headless shell ignores it).
				channel: "chromium",
				launchOptions: { args: [`--unsafely-treat-insecure-origin-as-secure=${baseURL}`] },
			},
			dependencies: ["setup"],
		},
		// Firefox and WebKit run the tests whose result can depend on the browser (pages, forms,
		// scripts, the lead flow). Server-only checks (API answers, PDFs, REST permissions) are the
		// same in every browser and run on Chromium only.
		{
			name: "firefox",
			use: {
				...devices["Desktop Firefox"],
				// Firefox's equivalent of the Chromium flag above: this host counts as a secure origin.
				launchOptions: { firefoxUserPrefs: { "dom.securecontext.allowlist": new URL(baseURL).hostname } },
			},
			dependencies: ["setup"],
			testIgnore: [/05-print-formats/, /06-api/],
			grepInvert: /sales user: doctype permissions/,
		},
		{
			// WebKit has no way to treat an http origin as secure, so here the visit test checks the
			// http behaviour instead: the visit is saved without a position.
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
			// 2026-11-02: WebKit loads the desk much more slowly from this development bench; with 90 s
			// seven form tests ran out of time (no error of the app), so it gets twice as long.
			timeout: 180_000,
			dependencies: ["setup"],
			testIgnore: [/05-print-formats/, /06-api/],
			grepInvert: /sales user: doctype permissions/,
		},
	],
});
