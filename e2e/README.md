# Manav end-to-end tests (Playwright)

Created: 2026-11-02.

Browser tests for a running Manav site (default `manav.local`, http://192.168.1.30:8006). They
drive the real desk and website as two users and check that every part of the Manav app opens and
works. Nothing here is part of the Frappe app build. The folder has its own `package.json` so that
`bench setup requirements` does not install Playwright on the server.

## Setup (Windows or Linux, Node 18+)

```sh
cd apps/manav/e2e
npm install
npx playwright install chromium     # once per machine
cp .env.example .env                # then fill in the users' passwords
```

`.env` needs two enabled **System Users**:

| Variable | Role(s) | Used for |
|---|---|---|
| `E2E_ADMIN_USER` / `_PASSWORD` | System Manager (+ Sales Manager, Sales User) | full desk, print formats, cleanup |
| `E2E_SALES_USER` / `_PASSWORD` | Sales User only | the limited desk and the permission checks |

`.env` and `.auth/` (the saved logins) are git-ignored. Never commit passwords.

## Running

```sh
npx playwright test                       # everything
npx playwright test tests/03-doctypes     # one file
npx playwright test -g "Manav Lead"       # by test name
npx playwright test --headed --workers=1  # watch it in a browser
npx playwright show-report                # HTML report, with traces and videos of failures
```

`E2E_ALLOW_WRITES=1` also runs the tests that **create records** on the site (sign-up request,
masters, a lead and a visit). They are named with `E2E-<run id>` and the admin deletes them at the
end. With `E2E_ALLOW_WRITES=0` the suite only reads.

## What is covered

| File | Covers |
|---|---|
| `auth.setup.ts` | Login through `/login` for both users; saves the sessions |
| `01-public.spec.ts` | Login page + "Request access" link, wrong password, `/manav-signup` checks, guest refused; *(writes)* sign-up request |
| `02-navigation.spec.ts` | Landing page after login, desk icons, non-admin limited to Manav (`desk_home.limit_desk_to_manav`), all Manav workspaces |
| `03-doctypes.spec.ts` | List + new form of every Manav doctype and settings; Quotation / Sales Order / Item / Customer / Job Offer with Manav fields; Sales User permissions |
| `04-pages-reports.spec.ts` | All Manav desk pages and the 6 script reports, as admin and Sales User |
| `05-print-formats.spec.ts` | All 11 Manav print formats render as HTML and PDF (newest record; skipped if none) |
| `06-api.spec.ts` | Read-only whitelisted methods; management-only and POST-only refusals |
| `07-lead-flow.spec.ts` | *(writes)* Masters through their forms, a mandatory-field check, and the lead flow: Lead, then Leads Board, then Visit check-in with GPS, then check-out |

Not called on purpose: the AI methods (`quotation_agent`, `visiting_card`,
`specification_screenshot`) and `site_transfer`, because they cost money or move data.

## Browsers and GPS

- **chromium** runs everything. It uses Playwright's full Chromium (`channel: "chromium"`, not the
  headless shell) with `--unsafely-treat-insecure-origin-as-secure=<site>`. That lets the visit
  check-in get an emulated GPS position although the site is plain http. The test checks that the
  position is saved.
- **firefox** does the same through the pref `dom.securecontext.allowlist`.
- **webkit** cannot treat http as secure, so its visit test checks the http path instead: the visit
  is saved without a position.
- Firefox and WebKit skip `05-print-formats`, `06-api` and the Sales User REST permission checks.
  Those are server answers that are the same in every browser.
- Run one browser with `--project=chromium` (or firefox / webkit).

## Known failures (2026-11-02)

These tests fail because of problems in the app, not in the tests (see CHANGELOG.md, 2026-11-02):

- `04` sales: all 6 reports. Sales User's "If Owner" permission gives no report permission.
- `02` "lands on the Manav Dashboard". Users land on `/desk`.
- `02` admin workspaces. The "Draft Salary Slips" number card needs an HR role.
- `04` `manav-lead-dashboard`. An intermittent `removeChild` JS error.

Each test also fails on an uncaught browser error, or on an `/api/` call that answers with an HTTP
error (the `problems` fixture in `tests/helpers.ts`).
