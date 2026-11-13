# Changelog

Changes to the Manav app, newest first.

## 2026-11-13

**Desk: no branches for now; the first page shows Quotation and Lead Management.**

- Summary: `desk_home.limit_desk_to_manav` sends the browser two desk icons: "Quotation" (the
  Bangalore sidebar under that name) and Lead Management. The Bangalore sidebar is labelled
  "Quotation" (sidebar header and module menu); FTWZ, Chennai, Coimbatore and the generic Manav
  sidebar are left out of the module menu; `open_branch_sidebar` puts every user in that sidebar
  whatever their branch (HOME_SHELL). The Bangalore workspace's heading reads "Manav Marketing".
  Only what is sent to the browser changes: the branch workspaces, sidebars and icons stay and can be
  shown again (HIDDEN_SHELLS, SHELL_LABELS, DESK_ICONS).
- Reason: the user asked not to show the separate branches for now, only Quotation and Lead
  Management on the first page after login.
- Files: `manav/manav/desk_home.py`, `manav/manav/workspace/bangalore/bangalore.json`.
- Testing (manav.local, e2e.admin, System Manager): after login the desk (/desk) shows the icons
  Quotation and Lead Management only (screenshot); the Manav sidebars sent are Bangalore (label
  Quotation) and Lead Management (plus one local-only sidebar not on the live site); the Quotation list
  opens with the sidebar headed "Quotation". `py_compile` OK. Not tested: a non-admin user; the
  workspace heading (comes with migrate); the live site.
- Pending: deploy (with migrate).

**Leads and visits: every user could be refused ("Not allowed via controller permission check").**

- Summary: `lead_permission.has_permission` and `visit_has_permission` return True ("no objection")
  where they returned None. The installed Frappe (16.54 local / 16.55 live) reads a None from a
  has_permission hook as a refusal (`frappe/permissions.py`, has_controller_permissions), so every
  user but Administrator was refused creating or opening a lead or a visit, System Managers too.
  False still refuses another user's lead or visit; the role permissions still apply.
- Reason: the user could not create a Manav Lead on the live site ("You need the 'create' permission
  on Manav Lead"); the same was found on manav.local earlier the same day (403 opening LEAD-00001).
- Files: `manav/manav/lead_permission.py`.
- Testing (manav.local, as e2e.admin): the lead flow test (`lead-flow.mjs`) end to end: lead saved
  (LEAD-00008), Next Stage, DVR saved and submitted (VISIT-00016, lead moved to RFQ), Make Quotation
  (26QX000092 linked to the lead), Make Quotation again opens the same one, Leads Board / Dashboard /
  lists / forms open; the lead form shows Open Quotation (screenshot; the test's own button check ran
  before the button was drawn). Test records deleted afterwards (the test's cleanup was refused by
  CSRF in its browser session; deleted with a fresh API login, none left). `py_compile` OK.
  Not tested: a user with only the Sales roles (no System Manager); the live site (needs deploy).
- Pending: deploy; then a non-admin user creates a lead on live.

**Print button prints the server PDF; Classic head room fixed; signing block kept together.**

- Summary: Print Settings "Print the PDF" (Frappe's `print_generated_pdf`) is switched on by
  `setup_erpnext_fields` after every migrate (set on the live site by hand the same day), so the
  Print button prints the PDF made on the server. Classic: more room at the top of each PDF page
  for the letter head and the repeated box (title 10 mm, box at least 36 mm or 17 + 4.2 mm per
  address line, heads 9 mm, 4 mm gap); the signing block and the FMT / CC line stay on one page.
  ERPNext's "Proforma Invoice" (Sales Order) is added to HIDDEN_PRINT_FORMATS.
- Reason: the user found the pages wrong when clicking Print on 26QX000003 (live). The browser's own
  print repeats a table head only while it is under about a quarter of the page: with the Classic
  box in the head, page 1 had the head only, the content started on page 2 and no head or page
  number followed. In the server PDF the top of the letter head was cut off and the FMT line went
  onto a page of its own.
- Files: `manav/templates/print_formats/manav_classic_quotation_body.html`,
  `manav/manav/erpnext_fields.py`.
- Testing: live, before the change: Chrome's print of 26QX000003 (Classic) drawn page by page
  (3 pages: head only / content without head / terms without head); the server PDF drawn page by
  page (head box and "Page n of 3" on every page, letter head cut at the top, page 3 only the FMT
  line). After "Print the PDF" on live: clicking Print on /desk/bangalore/print/Quotation/26QX000003
  loads frappe.utils.print_format.download_pdf (Classic, Haas Factory Outlet). manav.local: Classic
  and Quotation Classic render (HTML and PDF) for 26QX000089 / 26QX000091; `py_compile` OK. Not seen
  yet: the live PDF with the new top margin (needs the deploy).
- Pending: deploy; then look at 26QX000003's PDF again.

**Three print formats on Quotation, Draft PI and Final PI; Classic head on every page; closer
option rows; Print Signature on a closed Draft PI.**

- Summary:
  - Print formats: each document keeps Classic, with HSN Code and Modern. New (app records):
    "Manav Classic Draft PI", "Draft PI with HSN Code", "Manav Modern Draft PI", "Manav Classic
    Proforma Invoice", "Proforma Invoice with HSN Code", "Manav Modern Proforma Invoice". The
    Classic ones use the quotation's Classic templates (`manav_quotation_data.html` now also reads
    a Draft PI / Sales Order: title, and the Draft PI's ex_works_from / is_cif / cif_charges /
    cif_port); the Modern ones are the PI template without its HSN Code column (`pi_show_hsn`).
    Disabled after every migrate (`erpnext_fields.HIDDEN_PRINT_FORMATS`): Manav Banded / Colour
    Quotation, Manav Quotation Classic / Bordered, Manav Draft PI, Manav Proforma Invoice and
    ERPNext's Sales Order Bordered / Classic / Modern / Modern with Images. Defaults: Draft PI
    "Draft PI with HSN Code" (draft_pi.json), Final PI "Proforma Invoice with HSN Code"
    (DEFAULT_PI_PRINT_FORMAT); both print as before.
  - Classic (quotation and PI): the title, the customer / document box and the column heads are
    repeated at the top of every page under the letter head (`manav_page_frame.html`:
    frame_head_extra, frame_head_extra_mm, frame_lh_mm; the PDF's top margin grows with it).
  - Modern and the PI prints: option rows closer (3px), the code on one line beside its
    description (a CSS rule of lower weight had padded the inner cells by 6px).
  - Print Signature unticked: an empty signing space in the Modern / PI prints (the signer's name
    in italics was printed instead of a missing image). A closed Draft PI (Final PI made) accepts a
    change of Print Signature alone (`DraftPI.only_print_signature_changed`); before, the print
    page's switch could not save it there and the signature kept printing.
- Reason: the user asked for only three formats (Classic, with HSN Code, Modern) on the quotation,
  the Draft PI and the Final PI, for the Classic box on every printed page, for less line spacing
  in the prints, and found the Draft PI signature printed with the switch unticked.
- Files: `manav/templates/print_formats/manav_page_frame.html`, `manav_classic_quotation_body.html`,
  `manav_quotation_data.html`, `manav_modern_quotation_body.html`, `manav_proforma_invoice.html`;
  `manav/manav/print_format/` six new folders; `manav/manav/erpnext_fields.py`;
  `manav/manav/doctype/draft_pi/draft_pi.py`, `draft_pi.json`.
- Testing (manav.local): the six new formats' HTML inserted as temporary print formats and rendered
  (HTML and PDF) on 26DPI00004 / 26FPI00003, plus Classic and Modern quotation on 26QX000089: 7/7
  pass, then deleted; screenshots looked at (Classic Proforma Invoice layout, Modern Draft PI
  option rows). All existing formats render again: Quotation 14/14, Draft PI 1/1, Sales Order 5/5.
  Closed Draft PI 26DPI00004: Print Signature 0 saved and the print has no signature image, then
  restored to 1; a change of Ref. No. on it is still refused ("Draft PI closed"). `py_compile` of
  draft_pi.py and erpnext_fields.py: OK. Not checked: the repeated Classic head in the server PDF
  (manav.local's wkhtmltopdf draws no header-html; check on live after the deploy); the browser's
  own print repeats a head only while it is at most about a quarter of the page high.
- Pending: deploy and migrate (new formats, disabled formats and the Draft PI default come with
  migrate).

**Quotation prints: no lines in the points, CC = Signed By, page numbers on the builder formats;
CIF written by the form taken back on a change of principal; signatures on live.**

- Summary:
  - Manav Modern Quotation: no lines inside a machine's points (two columns of "* ...").
  - Manav Classic Quotation: "CC :" prints the Signed By sales person (was the Sales Engineer).
  - Manav Quotation Classic / Bordered (print-builder): Page Number "Bottom Right" (was "Hide"),
    so their PDF has "Page n of m" like the other formats.
  - Quotation form (`quotation.js`): CIF Charges / Port that the form wrote for a principal that is
    CIF by default (MACHINES: 1500, Chennai Sea Port) are cleared when the principal is changed to
    one that is not (e.g. JAGDEEP); amounts the user typed are kept. The print already shows the CIF
    line only when CIF Charges has an amount.
  - Live data (mmblr.frappe.cloud): the 19 Sales Persons' signature images copied from manav.local
    (live had none, so the Print Signature switch had nothing to show; list in
    `C:\e2e-out\signatures-copied.json` on the tester's PC); draft 26QX000003 (Jagdeep, started as
    MACHINES): CIF Charges 1500 / Chennai Sea Port cleared.
- Reason: the user asked for the lines in the points removed, the Signed By name in CC, the header
  and "Page 1 of 3" on every page of every print, the CIF line only when CIF was filled, and
  reported that the Print Signature switch did nothing.
- Files: `manav/templates/print_formats/manav_modern_quotation_body.html`,
  `manav/templates/print_formats/manav_classic_quotation_body.html`,
  `manav/manav/print_format/manav_quotation_classic/manav_quotation_classic.json`,
  `manav/manav/print_format/manav_quotation_bordered/manav_quotation_bordered.json`,
  `manav/public/js/quotation.js`.
- Testing: live PDFs of 26QX000002 / 26QX000003 in all 7 formats checked page by page (pypdf):
  Classic, Modern, Banded, Colour, Quotation with HSN Code have the letter head image(s) and
  "Page n of m" on every page; Quotation Classic / Bordered have the letter head but no page number
  (fixed in the JSON; their Page Number cannot be changed on the live site, HTTP 417, as they are
  app formats). Live Print Signature switch: Classic and Modern print the signature when ticked and
  not when unticked (26QX000002, restored to its value). 26QX000003 Classic after the CIF clear: no
  CIF line. Local Modern screenshot: no lines in the points. `node --check` of quotation.js and a
  Jinja2 parse of the two templates: OK. Not run: the quotation form in a browser (principal change);
  the builder formats' page number (needs deploy and migrate). manav.local's own PDFs have no
  letter head / page number in any format (its wkhtmltopdf does not draw header-html /
  footer-html); live does, so this was not changed.
- Pending: deploy (and migrate for the two print format JSONs). 26QX000003 still has the Haas
  Factory Outlet letter head and the MACHINES-era values the principal change did not reset.

**Modern quotation print: an option's description beside its code, not under it.**

- Summary: in Manav Modern Quotation an option (sub-item) row prints code | description side by side
  (a two-cell table inside the description cell: code 30%, description the rest); machine rows are
  unchanged.
- Reason: the user asked for the options' description in the next column instead of below the code.
- Files: `manav/templates/print_formats/manav_modern_quotation_body.html`.
- Testing (manav.local): all 7 enabled Quotation formats render (HTML and PDF) for 26QX000089,
  26QX000078 and 26QX000091: 21/21 pass. Screenshot of 26QX000089 (Modern) looked at: 7 options with
  code and description on one row, a long description wraps in its own column. Not looked at: the
  PDF pages themselves (no PDF viewer here).
- Pending: deploy to Frappe Cloud.

**Jagdeep quotation print (Classic): terms fixed, old Jagdeep layout, no port, no 0 amount.**

- Summary:
  - `manav_quotation_data.html`: `q.is_jagdeep` (Quotation Type "JAGDEEP"); for Jagdeep the currency
    label is the principal's Currency Code ("RS") and the price text is Ex-Works From only (the Port
    is not printed). `machine.price_zero`: a machine's 0 price is left blank. New macro
    `mend_terms`: a terms table row the text editor split into extra cells is joined back into
    No. | Term | Details, and line breaks inside a term become spaces (Classic, Banded, Colour).
  - `manav_classic_quotation_body.html`: for Jagdeep the "Prices : <Ex-Works From>  RS <amount>"
    line comes after the machine's points, as on the old Jagdeep print (others keep it under the
    name); terms table with fixed widths (No. 5%, Term 28% bold, Details).
  - `manav_builder_lines.html` (Quotation Classic / Bordered): 0 price left blank.
  - Manav Modern Quotation (later the same day, the user marked the old Jagdeep print: "price
    below"): `manav_quotation_pi_totals.html` sets `q.is_jagdeep` and leaves the Port out of a
    Jagdeep price line; `manav_modern_quotation_body.html` prints the machine's "Prices : ...  Rs.
    <amount>" row after its points for Jagdeep (others keep it under the name);
    `manav_modern_quotation.html` gives each machine `price_zero`, and a 0 amount is left blank.
  - `import_legacy.terms_as_html`: a term's lines joined with a space instead of `<br>`.
  - Live data (mmblr.frappe.cloud, 2026-11-13, old values saved in `C:\e2e-out\jagdeep-fix-mmblr.frappe.cloud.json`
    on the tester's PC): Terms "Manav - Jagdeep" without `<br>` in its cells; Item JVTM-1.2 name
    "CENTER) - JVTM-1.2" -> "JAGDEEP CNC VTM- (VERTICAL TURN-MILL CENTER) - JVTM-1.2 (HSN : 84589990)";
    Quotation Type 7 Default Ex-Works From and Price Basis "Ex-Works, Punjab India." (were empty);
    draft 26QX000002 terms reloaded and its JVTM-1.2 line name corrected. manav.local: only the
    terms template (the test login may not edit Items).
- Reason: the user showed the old Jagdeep print and asked for the Classic print on the live site to
  match it: the terms printed as a broken table (the quotation's text editor turns each `<br>` inside
  a cell into a new cell), Jagdeep mostly has no port, and a 0 CIF / price must not print as 0.
- Files: `manav/templates/print_formats/manav_quotation_data.html`,
  `manav/templates/print_formats/manav_classic_quotation_body.html`,
  `manav/templates/print_formats/manav_builder_lines.html`, `manav/manav/import_legacy.py`,
  `manav/templates/print_formats/manav_quotation_pi_totals.html`,
  `manav/templates/print_formats/manav_modern_quotation.html`,
  `manav/templates/print_formats/manav_modern_quotation_body.html`.
- Testing (manav.local, which reads the templates from this bench): all 7 enabled Quotation formats
  render (HTML view and PDF) for Jagdeep 26QX000089 (CIF 1500), Jagdeep draft 26QX000078 and Haas
  26QX000091: 21/21 pass. Screenshots looked at: Jagdeep price line after the points with "RS",
  "Price in RS", CIF line only when not 0, terms as a 3-column table; Haas unchanged apart from the
  terms widths. `mend_terms` run with Jinja2 3.1.6 on the live quotation's split terms: 10 rows of 3
  cells, no `<br>` left. Live after the data fixes: 26QX000002 renders in all 7 formats, terms and
  machine name correct. After the Modern change: the 21 quotation renders pass again, Draft PI
  26DPI00004 (1 format) and Final PI 26FPI00003 (5 formats) render (HTML and PDF); Modern screenshot
  of 26QX000089 looked at: price row after the points, before the options. `py_compile` of import_legacy.py and a Jinja2 parse of the three templates
  (Windows): OK. Not run: the import itself; the live server's print with the new templates (needs
  the deploy).
- Pending: commit, push and deploy to Frappe Cloud; until then live still prints the price under
  the name, "Rs." and 0.00. Draft 26QX000002 has rate 0, so its price stays blank until a price is
  entered. Ex-Works From typed on old quotations ("Ex- Works ,Punjab India") is printed as typed.

## 2026-11-12

**Desk: every page opens in the user's branch sidebar (not ERPNext's Selling / Stock ...).**

- Summary: new `desk_home.open_branch_sidebar` (called from the `limit_desk_to_manav` boot hook, for
  all users including admins) sets the boot's `home_shell` to the user's branch sidebar (Bangalore,
  FTWZ, Chennai, Coimbatore; Bangalore when the user has no branch or one without a sidebar, e.g.
  Hyderabad) and points every page of the `canonical_shell` map that belonged to an ERPNext / HRMS
  sidebar, the Manav sidebar or another branch's sidebar to it. Lead Management keeps its pages.
  `branches.get_user_branch` is the branch lookup shared with `add_branch_to_boot`.
- Reason: the user found that going back, or opening a Quotation / Customer / Item ..., switched the
  sidebar to ERPNext's; Frappe 16.54 picks the sidebar for any page the one on screen does not list
  from that map. The older trimming (`workspace_sidebar_item`) no longer covered it.
- Files: `manav/manav/desk_home.py`, `manav/manav/branches.py`.
- Testing: `py_compile` (Windows) OK. On manav.local (read only, boot built with the new hooks):
  Administrator home Bangalore, Quotation / Customer / Item / Sales Order / Draft PI / Employee ->
  Bangalore; shyam (Coimbatore) home Coimbatore, the same pages -> Coimbatore; Manav Lead / Visit ->
  Lead Management; no ERPNext sidebar left in either map. Not run: clicking through in a browser.
- Pending: deploy, then users log in again (or reload) so the new boot is used. ERPNext's sidebars
  stay reachable for admins through the Apps menu / search.

**Print page: Frappe's Print Format dropdown hidden; the Print Format Type cards choose the format.**

- Summary: under Format in the print page's sidebar, Frappe's Print Format dropdown is hidden while the
  Print Format Type cards are shown (a doctype with more than one format); the cards still set its
  hidden value, so Print and PDF work as before. With a single format the dropdown shows again.
- Reason: the user asked to remove the dropdown, as the same choice is in the cards below.
- Files: `manav/public/js/manav_print_sidebar.js`.
- Testing: `node` parse (Windows): OK. All 43 template includes of the print formats on GitHub `main`
  resolve to files on `main`. Not run: the print page in a browser.
- Pending: `bench build` (Frappe Cloud: deploy) and a browser reload.

**Quotation prints: the Classic machine line in every format (no Quantity / Rate columns).**

- Summary: every quotation format now prints the lines as Manav Classic Quotation: the machine's row
  ("1 / 01, code, name"), under it "Prices : <basis>   US$ <machine amount>" with the amount in the
  one Price column, then the sub-items with their own amount; no Qty / Rate columns.
  - Modern / HSN (`manav_modern_quotation_body.html`, switch `machine_price_line`): no Price and
    Quantity columns, the machine's own cell empty, and no price line after all lines (CIF / other
    charges stay). The PI does not set the switch and is unchanged.
  - Banded / Colour (`manav_banded_quotation_body.html`): columns No | Item & Description | Price.
  - Quotation Classic / Bordered (print-builder): the Items table is replaced by an HTML block that
    draws the lines from the new `manav_builder_lines.html` (data from `manav_quotation_data.html`);
    the Standard Accessories block stays; `modified` raised.
- Reason: the user showed the Classic print and asked for that machine line in every print format.
- Files: `manav/templates/print_formats/manav_modern_quotation_body.html`, `manav_modern_quotation.html`,
  `manav_modern_quotation_cif.html`, `manav_banded_quotation_body.html`, `manav_builder_lines.html`
  (new), `manav_quotation_data.html` (header note);
  `manav/manav/print_format/manav_quotation_classic/manav_quotation_classic.json`,
  `manav/manav/print_format/manav_quotation_bordered/manav_quotation_bordered.json`.
- Testing (Windows, local): Jinja2 parse of the six templates OK; Banded body, builder lines and the
  Modern machine / sub-item rows rendered with sample data in the Classic arrangement. Not run: real
  print previews / PDFs.
- Pending: `bench --site manav.local migrate` for the two builder formats (the template files apply on
  reload). Builder edits made on the site to those two formats are overwritten by the import.

**Quotation Classic / Quotation Bordered prints: no Quantity and Rate columns.**

- Summary: the Items table of the print-builder formats Manav Quotation Classic and Manav Quotation
  Bordered (shown as "Quotation Classic" / "Quotation Bordered") no longer has the Quantity columns
  (both alternatives, `uom` / `qty`) or Rate; their width goes to the Item column. No, Item, Code and
  Amount remain. `modified` raised so `bench migrate` re-imports both formats.
- Reason: the user asked for the Quantity and Rate shown in this print to be removed. A builder format
  cannot blank cells for sub-item rows only, so the columns are removed for every line.
- Files: `manav/manav/print_format/manav_quotation_classic/manav_quotation_classic.json`,
  `manav/manav/print_format/manav_quotation_bordered/manav_quotation_bordered.json`.
- Testing: JSON rewritten and read back (Windows): the columns are as listed. Not run: `bench migrate`
  and the print preview.
- Pending: `bench --site manav.local migrate`. Print Format Builder edits made on the site to these
  two formats would be overwritten by the import.

**Quotation prints: "Prices : <basis>   US$ <amount>" under each machine's name in every format.**

- Summary: Manav Modern Quotation, Quotation with HSN Code, Manav Banded Quotation and Manav Colour
  Quotation now print, right under each machine's row, the bold line "Prices : <Ex-Works From> <Port>"
  (else the principal's Price Basis) with the machine's own amount ("US$ 187000.00"), as Manav Classic
  Quotation does. The Price / Qty / Total columns of the machine's row stay (the user's choice).
  Modern / HSN: new body switch `machine_price_line` and per-machine `price_digits`; the PI does not
  set the switch and is unchanged.
- Reason: the user showed the Classic print and asked for the same machine price under the machine
  name in all print formats.
- Files: `manav/templates/print_formats/manav_modern_quotation_body.html`,
  `manav_modern_quotation.html`, `manav_modern_quotation_cif.html`, `manav_banded_quotation_body.html`.
- Testing (Windows, local): Jinja2 parse of the five quotation templates OK; the Banded body and the
  Modern machine row rendered with sample data show the line under the machine name. Not run: real
  print previews / PDFs on the site.
- Pending: Modern / HSN still also print the one "Prices : ... <total of machines>" line after all the
  lines (existing); with one machine it repeats the machine's line. Remove it if not wanted.

**Quotation form: Machine Number, Customer's Machine (Serial No) and CIF Port hidden.**

- Summary: the three Quotation custom fields get `hidden: 1` in `ERPNEXT_FIELDS` (re-applied on every
  migrate). The columns and values stay. CIF Port is still filled on saving from the principal's
  default, else FTWZ Chennai (`quotation.fill_cif_defaults`), so the prints' "CIF Charges - <port>"
  line is unchanged. With no machine to choose, the "Spares for Machine" button no longer appears;
  spares are added through a line's Item Code. The Final PI (Sales Order) keeps its CIF Port.
- Reason: the user asked to remove these fields from the quotation; it already has a Port field.
- Files: `manav/manav/erpnext_fields.py`.
- Testing: `py_compile` (Windows): OK. Not run: `bench migrate` and the form in a browser.
- Pending: `bench --site manav.local migrate`, then reload the Quotation form.

**Quotation: Principal asked on clicking Item Code; Print Signature asked only on the print page.**

- Summary: on a quotation without a Principal, clicking into an Items line's Item Code (before typing)
  shows "Select the Principal first" and offers no items (`quotation.js` `set_item_query`; the
  earlier checks on adding a line / choosing an item stay). "Print Signature"
  (`custom_print_signature`) is hidden on the Quotation and Final PI forms; it is set by the
  existing "Print Signature" switch of the print page (`manav_print_sidebar.js`).
- Reason: the user asked to be warned on clicking the item, and not to be asked for the signature in
  the quotation but at printing.
- Files: `manav/public/js/quotation.js`, `manav/manav/erpnext_fields.py`.
- Testing: `node --check` and `py_compile` OK; `bench migrate` on manav.local OK, the field read back as
  hidden on Quotation and Sales Order. Not run: the form and print page in a browser.
- Pending: Draft PI keeps its own visible Print Signature field (its own doctype JSON).

**Quotation: Principal first, Magic code before saving; quotation prints: price under the machine, darker lines, sub-items without Qty / Rate.**

- Summary:
  - Quotation form: adding an Items line or choosing an Item Code while the Principal (Quotation
    Type) is empty shows "Select the Principal first" and scrolls to it; an item chosen anyway is
    taken off the line again (`quotation_item_events.items_add` / `item_code`, `principal_missing`).
    Quotation only, not the Final PI.
  - Magic Cust Code is visible before saving: a quotation made from a lead (Make Quotation) gets it
    from `lead_board.make_quotation`, and a draft opened with its customer but without the code gets
    it on refresh (`fill_missing_magic_code`). Before, only choosing the customer on the form, or
    saving, filled it.
  - Manav Classic Quotation (default): the "Prices : <basis>  US$ <amount>" line is printed right under
    the machine's name, before its points; CIF / other charges stay after the last machine's points.
    Options and terms lines are black.
  - Manav Modern Quotation and Quotation with HSN Code: new switches `option_amount_only` and
    `dark_lines` of the shared body: sub-item rows print only their Total (Price and Quantity empty);
    line table, totals, terms and the top box lines are dark. The PI (Manav Proforma Invoice), which
    uses the same body, does not set them and is unchanged.
  - Manav Banded / Colour Quotation: sub-item rows print only their Amount (Qty and Rate empty);
    table lines in the theme's dark colour.
- Reason: the user asked for the principal to be chosen before items, the Magic code to show before
  saving, the machine's price under its name, darker table lines and no quantity / per-item price of
  the sub-items in the print.
- Files: `manav/public/js/quotation.js`, `manav/manav/lead_board.py`,
  `manav/templates/print_formats/manav_classic_quotation_body.html`,
  `manav_banded_quotation_body.html`, `manav_modern_quotation_body.html`,
  `manav_modern_quotation.html`, `manav_modern_quotation_cif.html`.
- Testing (Windows, local): `node` parse of `quotation.js`, `py_compile` of `lead_board.py`, Jinja2
  parse of the five templates: OK. The Classic body was rendered with sample data: price line under
  the machine name and CIF charges after the last machine's points, as intended. Not run: `bench
  build` / `bench clear-cache` on the server, the form in a browser, and real print previews / PDFs.
- Pending: in the Modern / HSN / Banded / Colour layouts the machine's price was already on the
  machine's own row (beside its name), so only Classic was rearranged; confirm this on the prints.

## 2026-11-07

**Lead: Existing Customer fills the lead from the Customer master; Sale Manager from the Sales Person list.**

- Summary:
  - The Source section comes first on the lead form, before the Customer section (a `field_order`
    Property Setter, rebuilt from `manav_lead.json`'s order on every migrate).
  - New "Existing Customer" field (Link to Customer) right under Source, shown and mandatory only
    when the Source contains "existing customer" (the seeded "Existing Customer - New order").
    Choosing another source clears it. The rule is checked in the browser only, as Frappe does
    not evaluate `mandatory_depends_on` on the server.
  - A new lead opens with a popup "New Customer / Existing Customer". Existing Customer asks for
    the customer in the popup, sets the Source to "Existing Customer - New order" (else the first
    source with "existing customer" in its name) and fills the lead. The popup appears once per
    new form, and not when the lead already comes with a Source or Customer. Picking a customer
    fills Company Name, Mobile No, Email ID, Website, Contact Person, Contact
    Position, Address, Haas Cust ID and Magic Cust ID from the customer and its primary (else
    default) contact and address. Fields stay editable.
  - Sale Manager is now a Link to Sales Person, the same list as Sales Engineer. Frappe does not
    allow a Data field to become a Link by customization, so the old text field `sale_manager`
    is hidden (Property Setter) and a new custom field `sales_manager` (label "Sale Manager")
    sits after it. On migrate an old text value that is a Sales Person moves to the new field;
    any other old text goes into Other Information Notes. The old field is emptied either way.
  - Both are custom fields made on migrate (`lead_customer.setup_lead_customer_fields`), like the
    stage fields of `lead_board.py`. `manav_lead.json` is not changed.
- Reason: the user asked for the same list in Sales Engineer and Sale Manager, for an existing
  customer's details to come from the Customer master, and for the lead to ask the source first
  and offer the customer dropdown only for an existing customer.
- Files: `manav/manav/lead_customer.py` (new), `manav/public/js/manav_lead_customer.js` (new),
  `manav/hooks.py`.
- Testing: Python syntax check and `node --check` (Windows): OK. On manav.local: `bench migrate`
  OK; meta read back: `customer` Link Customer, `sales_manager` Link Sales Person, `sale_manager`
  hidden; no old text values were left (none set on this site). `get_customer_details` on
  ZODIAC LIFE SCIENCES PVT LTD. returned company name, Magic Cust ID MZ029 and the 5-line address.
  `bench build --app manav` (with Node 24) and `clear-cache` OK. After the Source change:
  `setup_lead_customer_fields` run on manav.local, meta order read back as Source section ->
  source, customer, source_name -> Customer section, with the depends_on / mandatory_depends_on
  condition on `customer`. Popup: `node --check` OK; the source lookup it uses
  (`frappe.client.get_list` with `like %existing customer%`) returned "Existing Customer - New
  order" on manav.local. Not run: the lead form and popup in a browser.
- Pending: Make Quotation (`lead_board.get_or_make_customer`) still finds the customer by Company
  Name. This works because the name is filled from the chosen customer, but it does not read the
  new Existing Customer field yet. `lead_board.py`, `manav_lead.json` and `manav_lead.js` are
  read-only on the share for this login, so they were not edited. The stage dropdown order (the
  user's other request) is already fixed by commit 7633c79 (`lead_board.stage_query`), which
  still needs deploying and migrating on the live site.

**Desk home (/desk) blank for the Administrator: stale saved desk layouts reset on migrate.**

- Summary: new `desk_home.reset_stale_desktop_layouts` (after_migrate) deletes every saved
  Frappe "Desktop Layout" that does not list all the Manav desk icons (Bangalore, FTWZ, Chennai,
  Coimbatore, Lead Management), the same as Frappe's own "Reset Desktop Layout". Layouts that
  list all of them are kept. Nothing is done if Frappe drops the Desktop Layout doctype.
- Reason: on manav.mymagicerp.com the Administrator's /desk showed only the search bar. Their
  layout, saved before the Manav icons existed, listed 47 ERPNext / HRMS icons, all marked "not
  permitted" because `limit_desk_to_manav` no longer sends them, and none of the Manav icons
  (checked in the browser console on the live site).
- Files: `manav/manav/desk_home.py`, `manav/hooks.py`.
- Testing: Python syntax check of both files (Windows): OK. `bench migrate` on manav.local ran
  the after_migrate hooks without error; no Desktop Layout records remain there. Not run: the
  live site, the desk in a browser after the reset.
- Pending: the fix applies after the code is deployed and `bench migrate` runs on the live site.
  Until then the console reset (`delete_layout`) clears it for one user.

## 2026-11-06

**Workspaces: title card and greeting line removed.**

- Summary: the workspaces with the "Manav Dashboard Tabs" block (e.g. Bangalore) no longer show
  the title as a tinted card with "Good morning, <name> · <date>" under it; the title is Frappe's
  own heading again. Tabs, tile and chart styling are unchanged.
- Reason: the user did not want that part; the card also overlapped the first row of shortcuts.
- Files: `manav/manav/workspace_tabs_block/tabs.js`.
- Testing: `node --check` on the server: OK; `setup_workspace_tabs` run on manav.local and the
  saved block read back (no greeting function, no title-card style); cache cleared. Not tested:
  the workspace in a browser.
- Pending: the live site gets this only after the code is deployed there and migrated.

**Item form: Item Name shows an Item Master dropdown on a new item.**

- Summary: while typing Item Name on a new Item, a dropdown lists up to 20 existing items whose
  name or code contains the text (from 2 letters); picking one opens that item instead of making
  a duplicate. Saved items are unchanged. Done in the app's Item form script (Awesomplete +
  `frappe.db.get_list`), ERPNext's Item doctype is not changed.
- Reason: the user asked for an Item Master dropdown on Item Name.
- Files: `manav/public/js/item.js`.
- Testing: `node --check` on the server: OK; checked that `frappe.desk.reportview.get_list`
  accepts `or_filters`; `bench build --app manav` and `clear-cache` on manav.local: OK. Not
  tested: the dropdown in a browser.
- Pending: none.

**Item Groups: tariff code removed from the old Magic group names.**

- Summary: the 21 groups under "Magic Item Groups" no longer end with the old 8-digit tariff code
  ("01 MACHINES" instead of "01 MACHINES - 16301000"). `import_item_groups` strips the code and
  renames groups made earlier (`frappe.rename_doc`, which also updates linked Items).
- Reason: the user asked for the number to be removed from the Item Group dropdown.
- Files: `manav/manav/import_legacy.py`.
- Testing: `py_compile` and `import_item_groups` run on manav.local: 14 groups renamed (the other
  7 had no code), the 21 names read back without codes.
- Pending: none.

## 2026-11-05

**Leads: each login sees only its own leads; Administrator / System Manager see all.**

- Summary: row-level rule on Manav Lead. A user other than Administrator / System Manager sees
  only the leads they created or where they are the Sale Engineer (their Sales Person, found with
  `sales_person_for_user`). Applies to the Lead list, reports, Leads Board, Lead Funnel, link
  searches (all use `frappe.get_list`) and to opening a lead by URL (`has_permission`).
- Reason: the user asked that whoever logs in sees only their leads, and the admin sees everything
  for now.
- Files: `manav/manav/lead_permission.py` (new), `manav/hooks.py`.
- Testing: Python syntax check of both files (Windows). Not run: `bench restart`, a check with a
  Sales User / Sales Manager login on the server.
- Pending: the Sales User role still has "Only if Creator" (if_owner) on Manav Lead, so a Sales
  User sees only leads they created, not ones assigned to them as Sale Engineer.
  `manav_lead.json` is read-only on the share for this login; remove if_owner there (or in Role
  Permissions Manager) if assigned leads should show too. DVRs (Manav Visit) are not limited yet.

**Quotation: Item Code dropdown offers the whole Item Master.**

- Summary: the Item Code dropdown of the Quotation Items table lists every sales item (not
  variant templates) of the Item Master on every line, still with its rate; it is no longer
  limited to the principal's Item Group (machine lines) or that group plus Options (sub-item
  lines). Sub-items via "+" and spares are unchanged.
- Reason: the user asked for the Item Master dropdown when adding a quotation item.
- Files: `manav/public/js/quotation.js`.
- Testing: `node --check` (Windows). Not run: the form in a browser.
- Pending: none.

**Quotation: sub-item prices without decimals.**

- Summary: the sub-items dialog of a machine's line shows prices as whole numbers (25,000 instead
  of 25,000.000).
- Reason: the user asked for no decimals in that list.
- Files: `manav/public/js/quotation.js`.
- Testing: `node --check` (Windows). Not run: the dialog in a browser.
- Pending: none.

## 2026-11-04

**Workspace (Manav / branches): greeting, icon chips, tab colours, tidier charts.**

- Summary: on top of the earlier restyle of today: a greeting line ("Good afternoon, <name> ·
  <date>") under the workspace title in the tinted card (added next to the title, never saved with
  the workspace, removed in edit mode); number cards with an icon chip and a top edge, and
  shortcuts with a left edge, in the chosen tab's colour (blue Sales, green HR, orange Payroll,
  purple Masters); the "Last synced" line under the charts hidden. Phone: no icon chips (room).
- Reason: the user showed the Bangalore workspace and asked to make it better.
- Files: `manav/manav/workspace_tabs_block/tabs.js`.
- Testing: the block script compiles (Windows). Not run: `bench migrate`, the workspace in a
  browser.
- Pending: none.

**Sidebar header: "Manav" left out of the Modules list.**

- Summary: the sidebar header's Modules list shows Bangalore, Chennai, Coimbatore, FTWZ and Lead
  Management, no longer Manav. Only that list changes: the Manav sidebar stays (Home, the Manav
  pages and forms opened from it use it). Done by wrapping Frappe's
  `frappe.ui.SidebarHeader.prototype.switcher_items` in `manav_branch.js` (guarded; nothing changes
  if Frappe drops it). The file's `?v=` in hooks.py is raised so browsers fetch it again.
- Reason: the user asked to remove Manav from that list.
- Files: `manav/public/js/manav_branch.js`, `manav/hooks.py`.
- Testing: `node --check` and a compile of hooks.py (Windows). Not run: the desk in a browser.
- Pending: none.

**Home (Manav workspace) in the look of the Lead Dashboard; phone friendly.**

- Summary: the Manav workspace (sidebar "Home", also the branch workspaces with the same tab block)
  gets the Lead Dashboard look through the "Manav Dashboard Tabs" block: the title block as a
  tinted card, number cards and shortcuts as 16 px rounded tiles with a large figure and hover
  lift, charts in rounded cards, and the chosen tab filled with its colour. On a phone: smaller
  title card, two tiles a row, a full-width swipeable tab bar. Styles only, scoped to the
  workspace holding the block (switched off when another workspace is opened); content,
  permissions and edit mode unchanged.
- Reason: the user asked for the home dashboard to match the Leads page / Lead Dashboard.
- Files: `manav/manav/workspace_tabs_block/tabs.js`, `tabs.css` (written into the Custom HTML
  Block by `workspace_tabs.setup_workspace_tabs` on migrate).
- Testing: the block script compiles (Windows). Not run: `bench migrate`, the workspace in a
  browser (PC or phone).
- Pending: none.

**Standard Accessories table hidden on a phone.**

- Summary: on screens up to 767 px wide (Frappe's mobile width) the Standard Accessories table
  under the Items of Quotation, Draft PI and Final PI is not shown; on a PC it is unchanged. The
  lines' descriptions and the prints are not affected.
- Reason: the user asked not to show it in the phone view (too narrow there).
- Files: `manav/public/js/standard_accessories.js`.
- Testing: `node --check` (Windows). Not run: the form on a phone.
- Pending: none.

**Quotation (Manav) Dashboard and Customer Dashboard in the look of the Lead Dashboard / Leads page; phone friendly.**

- Summary:
  - Manav Dashboard (quotations, team, HR, payroll tabs): greeting header tinted with the accent
    colour holding the date filters and quick ranges, pill tabs, tiles with a coloured icon and a
    large figure (a click opens the matching Quotation list within the dates: all, Ordered,
    Open / Replied, Lost), bar rows with hover (a status or customer row opens its quotations),
    16 px panels, loading shimmer; the desk's own colours (light / dark). Phone: two tiles a row,
    panels stacked, smaller header.
  - Customer Dashboard: 16 px cards, tinted header with a coloured avatar, key figure tiles with a
    coloured icon (group colours kept), pill tabs in each tab's colour; phone: two tiles a row, a
    swipeable tab row, smaller header and tables.
  - Data, tabs, lists and what each user may see are unchanged.
- Reason: the user asked for the quotation and customer dashboards to match the Leads page and the
  Lead Dashboard, nothing else changing, and good on a phone.
- Files: `manav/public/css/manav_dashboard.css`, `manav/public/js/manav_dashboard_view.js`,
  `manav/manav/page/customer_dashboard/customer_dashboard.js`.
- Testing: `node --check` on both scripts (Windows). Not run: the pages in a browser (PC or phone).
- Pending: the browser may keep the old dashboard stylesheet until a hard refresh (Ctrl+Shift+R).

**Prints keep the rich-text formatting of the points (colour, italic, underline ...).**

- Summary: a description's list items are printed with their own HTML from the rich-text editor
  instead of their bare text, so colour, italic, underline, size and bold print as typed. Done in
  the macro describe (Modern, Quotation with HSN Code, Draft PI / Final PI), the quotation data of
  Classic / Banded / Colour, and the Standard Accessories block of Quotation Classic / Bordered.
  Quill's empty marker span is left out. A list item is now one point as it is (no longer cut into
  sentences at ". ").
- Reason: the user asked for the colour and other formatting of the rich text to print as well.
- Files: templates `manav_modern_quotation.html`, `manav_modern_quotation_cif.html`,
  `manav_proforma_invoice.html`, `manav_quotation_data.html`, `manav_std_accessories.html`.
- Testing: the describe macro rendered with Jinja on a sample list (Windows): a red point keeps its
  `<span style="color: ...">`, a bold point with italic keeps both, the marker span is gone; the
  five templates parse. Not run: a real print / PDF.
- Pending: Quill's class-based formats (alignment, indent) are not styled in the prints; inline
  styles (colour, background, size) and tags (bold, italic, underline, strike) are.

**Quotation Classic / Bordered: Standard Accessories printed under the Items table.**

- Summary: new print formats "Manav Quotation Classic" and "Manav Quotation Bordered": copies of
  ERPNext's "Quotation Classic" / "Quotation Bordered" (Frappe print format builder layouts) with a
  Standard Accessories block under the Items table: per machine line its name and code, then its
  points in two columns (bold points bold), from `manav_std_accessories.html`. In the Classic copy
  the description is no longer squeezed into the narrow Item column. ERPNext's two originals are
  disabled (`HIDDEN_PRINT_FORMATS`; their files are not edited); the Print view shows the copies as
  "Quotation Classic" / "Quotation Bordered".
- Reason: the user showed Quotation Classic with a long list in a narrow column ("manage this")
  and Quotation Bordered without the accessories ("here add std acc").
- Files: `manav/manav/print_format/manav_quotation_classic/`, `manav_quotation_bordered/` (new),
  `manav/templates/print_formats/manav_std_accessories.html` (new), `manav/manav/erpnext_fields.py`.
- Testing: the block rendered with Jinja on a sample quotation (Windows): one machine, three
  points in two columns, the bold point bold, the sub-item line left out. Not run: `bench migrate`,
  the builder's print (Chrome PDF).
- Pending: the copies do not follow later ERPNext changes to the originals' layout.

**Rich-text editor: colour saved, Undo / Redo buttons; Standard Accessories on Quotation / PI as rich text.**

- Summary:
  - New `manav/public/js/manav_text_editor.js` (app_include_js, every desk page): Undo and Redo
    buttons first in the toolbar of every rich-text (Text Editor) field; before any form is saved,
    each editor whose text differs from the form's value hands it over at once.
  - Standard Accessories table (Quotation, Draft PI, Final PI): on a document that can be changed,
    each machine's accessories are a rich-text editor (bold, colour, lists, undo ...) bound to that
    line's Description; only this document changes, not the Item. Submitted documents still show
    the points read only. The add box / remove buttons of earlier today are gone.
- Reason: the user reported that a colour put on text was not saved, asked for an undo button in
  the editor, and for the Standard Accessories on the quotation and PI as rich text.
  Cause found for the colour: Frappe hands the editor's text to the form 300 ms after the last
  change; a Save right after picking a colour saved the old text. (No save error was in the
  server logs.)
- Files: `manav/public/js/manav_text_editor.js` (new), `manav/hooks.py` (app_include_js),
  `manav/public/js/standard_accessories.js`.
- Testing: `node --check` on both scripts (Windows). Not run: `bench build`, the editors in a
  browser (toolbar buttons, colour, save).
- Pending: if a colour is still lost after this, the exact steps / any message are needed.

**Letter head, footer and page number on every page of every Manav print.**

- Summary: new shared `manav/templates/print_formats/manav_page_frame.html`. Classic, Banded, Colour
  quotations and the Appointment Letter now print the letter head at the top of every page and the
  letter head footer plus "Page n of m" at the foot of every page: in the PDF (header-html /
  footer-html, page margins made room for them) and when printed from the browser (repeated table
  head / foot rows). The Modern layout (Modern, Quotation with HSN Code, Draft PI, Final PI) already
  did this, with its quotation box in the head as well. Without a letter head only the page number
  is repeated.
- Reason: the user asked for the header, the footer and the page number on every page, whichever
  print format is used.
- Files: `manav_page_frame.html` (new), `manav_classic_quotation_body.html`,
  `manav_banded_quotation_body.html`, `manav_appointment_letter.html`.
- Testing: Jinja parse of the four files; the Banded body rendered (Windows) with and without a
  letter head: one header-html and one footer-html, page margins 34 mm / 15 mm at the top, the
  footer in both copies. Not run: a real PDF (wkhtmltopdf) or browser print.
- Pending: in Classic and Banded / Colour only the letter head repeats, not their title and customer
  box (the Modern layout repeats its box). Check a 2-3 page PDF of each: the top margin (34 mm)
  assumes a letter head at most 27 mm high.

**Quotation Print view: Standard, Quotation Modern, Quotation Modern with Images and Sales Quotation removed.**

- Summary: ERPNext's "Quotation Modern" and "Quotation Modern with Images" and "Manav Sales
  Quotation" are disabled (set again after every migrate, `erpnext_fields.HIDDEN_PRINT_FORMATS`;
  ERPNext's files are not edited; Manav Sales Quotation also `disabled: 1` in its own file). Frappe's
  built-in "Standard" is left out of the Quotation's list by `manav_print_sidebar.js` (it is not a
  record). Manav Sales Quotation is no longer a default fallback. Kept: Classic Quotation, Quotation
  Classic, Quotation Bordered, Modern Quotation, Quotation with HSN Code, Colour, Banded.
- Reason: the user crossed those four out of the Print Format Type cards.
- Files: `manav/manav/erpnext_fields.py`, `manav/public/js/manav_print_sidebar.js`,
  `manav/manav/print_format/manav_sales_quotation/manav_sales_quotation.json`.
- Testing: `node --check` and a Python compile (Windows). Not run: `bench migrate`, the Print view.
- Pending: Standard is still listed for other doctypes (Sales Order, Draft PI).

**Print format "Manav Modern Quotation CIF" renamed "Quotation with HSN Code".**

- Summary: the format's file is now `print_format/quotation_with_hsn_code/quotation_with_hsn_code.json`
  with the new name (same layout and template, `manav_modern_quotation_cif.html`); the old folder is
  removed. Patch `manav.patches.rename_hsn_print_format` (post_model_sync) deletes the old record
  after the new one has synced and moves any default print format pointing at the old name.
- Reason: the user asked to rename it "Quotation with HSN Code".
- Files: `manav/manav/print_format/quotation_with_hsn_code/` (new), `manav/manav/print_format/
  manav_modern_quotation_cif/` (removed; it was not in git), `manav/patches/rename_hsn_print_format.py`
  (new), `manav/patches.txt`, `manav/templates/print_formats/manav_modern_quotation_cif.html` (note).
- Testing: JSON load and a syntax check of the patch (Windows). Not run: `bench migrate` (the patch
  and the sync).
- Pending: the sidebar tile of the renamed format uses the plain thumbnail (its name no longer has
  "CIF").

**Price line: "Prices : ..." on the quotation, "Price ... (n NOS)" on the Draft PI and Final PI.**

- Summary:
  - Quotation (Modern): "Prices : <Ex-Works From> <Port>" with the amount at the right, no quantity
    and no dots (q.price_no_dots), as on the old quotation print, then "CIF Charges - <port> ......
    amount". Classic already printed "Prices : ..." with the amount.
  - Draft PI / Final PI: always "Price <Price Type> <Port> (n NOS) ...... amount"; a CIF PI no longer
    replaces it with "Prices : Ex-Works, <place>.".
- Reason: the user showed the two old prints: the first for the quotation only, the second for the
  Draft PI and Final PI.
- Files: templates `manav_quotation_pi_totals.html`, `manav_modern_quotation_body.html`,
  `manav_proforma_invoice.html`.
- Testing: Jinja parse of the three templates; the quotation line rendered as "Prices : Ex-Works,
  Oxnard, USA." / "Prices : EX-WORKS FTWZ WAREHOUSE CHENNAI" / "Price :" (Windows). Not run: a real
  print.
- Pending: Make Draft PI still puts the quotation's Ex-Works From in the Draft PI's Price Type (and
  copies Port); change it there when the PI should read differently.

**CIF line wording: "CIF Charges - <CIF Port>".**

- Summary: the CIF charges line prints "CIF Charges - <CIF Port> ...... amount" (e.g. "CIF Charges -
  Chennai Sea Port") instead of "CIF Charges upto <port>", on the Modern, Classic, Banded / Colour
  quotations and the PI. CIF Port's help text on Quotation, Sales Order and Draft PI says the same.
- Reason: the user asked for this wording (old print).
- Files: templates `manav_quotation_pi_totals.html`, `manav_quotation_data.html`,
  `manav_proforma_invoice.html`; `manav/manav/erpnext_fields.py`,
  `manav/manav/doctype/draft_pi/draft_pi.json`.
- Testing: Jinja parse of the three templates, the line rendered as "CIF Charges - Chennai Sea
  Port"; JSON load and `py_compile` passed (Windows). Not run: a real print, `bench migrate`.
- Pending: an empty CIF Port is still filled with "FTWZ Chennai" (DEFAULT_CIF_PORT); the user may
  want "Chennai Sea Port" as that default.

**Price line bold again.**

- Summary: the price line ("Price <Ex-Works From> <Port> (n NOS)" on the Modern quotation,
  "Prices : ..." on Classic, the CIF line of the PI) is printed bold again; the not-bold setting of
  earlier today (q.price_plain) is no longer used. The style for it stays in the Modern body.
- Reason: the user asked for the line in bold.
- Files: templates `manav_quotation_pi_totals.html`, `manav_classic_quotation_body.html`,
  `manav_proforma_invoice.html`.
- Testing: Jinja parse of the three templates (Windows). Not run: a real print.
- Pending: none.

**Quotation price line: "Price <Ex-Works From> <Port> (n NOS)"; the Quotation Price Type is dropped.**

- Summary: the quotation's price line starts with Ex-Works From, followed by Port when typed, e.g.
  "Price EX-WORKS FTWZ WAREHOUSE CHENNAI (1 NOS) ...... amount", on every quotation, CIF or not
  (the CIF-only "Prices : Ex-Works, <place>." line is gone); not bold. Classic prints
  "Prices : <Ex-Works From> <Port>". The Quotation "Price Type" added earlier today is removed
  (OBSOLETE_FIELDS deletes it on migrate); Port stays. Choosing a principal fills an empty
  Ex-Works From with the principal's Ex-Works From, else its Price Basis. Make Draft PI puts
  Ex-Works From in the Draft PI's Price Type and copies Port.
- Reason: the user showed the old program's Price Type / Port and its print line, and asked for
  Ex-Works From first in the line with Port after it.
- Files: `manav/manav/erpnext_fields.py`, `manav/manav/quotation.py`, `manav/manav/pi.py`,
  `manav/public/js/quotation.js`, templates `manav_quotation_pi_totals.html`,
  `manav_quotation_data.html`, `manav_classic_quotation_body.html`.
- Testing: Jinja parse of the four quotation templates; the line rendered as "Price EX-WORKS FTWZ
  WAREHOUSE CHENNAI (1 NOS)", "Price Ex-Works Dubai (1 NOS)" and "Price (1 NOS)"; `py_compile` and
  `node --check` passed (Windows). Not run: `bench migrate`, a real print.
- Pending: the Draft PI / Final PI prints still use their own Price Type and Port (unchanged).

**Draft PI: Terms tab; Banded / Colour prints: Standard Accessories laid out in their own rows.**

- Summary:
  - Draft PI: the Terms section (Terms template, Terms and Conditions) is a "Terms" tab, as on the
    quotation; the fields before it stay on the first tab ("Details").
  - Manav Banded Quotation (black) and Manav Colour Quotation: a machine's Standard Accessories are
    no longer squeezed into the machine row's description cell. Under the machine's row come a
    "Standard Accessories" heading and the points in two columns (read down the left, then the
    right), each pair a row of its own across the table, so a long list runs onto the next page;
    a small square bullet in the theme colour; bold points stay bold. The machine's name is on its
    own line under the code.
- Reason: the user asked for a Terms tab on the Draft PI like the quotation's, and said the Standard
  Accessories did not look right in the black and colour prints.
- Files: `manav/manav/doctype/draft_pi/draft_pi.json`, `draft_pi.py` (note),
  `manav/templates/print_formats/manav_banded_quotation_body.html`.
- Testing: the banded body rendered with Jinja (Windows) on sample data: 7 points give 4 rows,
  left column 1-4, right 5-7, the bold point bold. Not run: `bench migrate`, a real PDF
  (wkhtmltopdf) of either format.
- Pending: check one long machine (60 points) as PDF in both formats.

**Quotation: the price line's text is typed on the quotation (Price Type, Port).**

- Summary: new Quotation fields "Price Type" (custom_price_type) and "Port" (custom_price_port)
  after Ex-Works From. The Modern quotation prints "Price <Price Type> <Port> (n NOS) ...... amount"
  and Classic "Prices : <Price Type> <Port>" from them; the fixed EX-WORKS FTWZ WAREHOUSE CHENNAI
  is gone from the quotation prints. Choosing a principal puts its Price Basis in an empty Price
  Type (editable). A quotation saved before still prints its principal's Price Basis; with
  neither, "Price (n NOS)". Same fieldnames as the PI's, so Make Draft PI copies them.
- Reason: the user asked for that text not to be fixed; they type it on the quotation.
- Files: `manav/manav/erpnext_fields.py`, `manav/manav/quotation.py`, `manav/public/js/quotation.js`,
  templates `manav_quotation_pi_totals.html`, `manav_quotation_data.html`.
- Testing: Jinja parse of both templates; the price-line expression rendered with type + port,
  with nothing, and with a type only ("Price EX-WORKS FTWZ WAREHOUSE CHENNAI (1 NOS)", "Price (1
  NOS)", "Price CIF Chennai (1 NOS)"); `node --check` and `py_compile` passed (Windows). Not run:
  `bench migrate`, a real print.
- Pending: the Draft PI / Final PI still fill EX-WORKS FTWZ / WAREHOUSE CHENNAI when both fields
  are empty (pi.fill_price_basis), as asked on 2026-11-02.

**Standard Accessories table: add / remove points on the document only.**

- Summary: on a Quotation, Draft PI or Final PI that can still be changed (draft; a Draft PI
  without its Final PI), each machine in the Standard Accessories table has an "Add an accessory"
  box (+ Add or Enter) and each point a remove (×) button on hover. They change only that line's
  Description on this document, so its print follows; the Item master is not changed. Machines
  without points are listed too while the document is editable.
- Reason: the user asked to add standard accessories on the transaction only, not in the master.
- Files: `manav/public/js/standard_accessories.js`.
- Testing: `node --check` passed (Windows). Not run: `bench build`; not tried in a browser.
- Pending: a submitted Quotation / Final PI cannot be changed this way (its lines are locked).

**Standard Accessories table on Quotation, Draft PI and Final PI; CIF without a tick; Ex-Works print; no New button on PI lists.**

- Summary:
  - A read-only "Standard Accessories" table under the Items table of Quotation, Draft PI and
    Final PI (Sales Order): one row per machine line (No., code, name) with the points of its
    description (the Item's Standard Accessories), bold points bold. HTML field
    `custom_standard_accessories` (Custom Field on Quotation / Sales Order, own field on Draft PI),
    drawn by the new `public/js/standard_accessories.js`; hidden when no machine has points.
  - CIF: the CIF tick is hidden on Quotation, Draft PI and Final PI; CIF Charges, CIF Port and
    Ex-Works From are always shown. A document is CIF when CIF Charges has an amount: the hidden
    tick is set from it on saving (`quotation.fill_cif_defaults`, now also on Sales Order validate
    and update after submit), so the prints are unchanged. Typing charges fills an empty Port and
    Ex-Works From; a principal that is CIF by default writes its charges (1500 without a default)
    on the quotation. The server no longer writes 1500 by itself.
  - Prints: the CIF line "Prices : Ex-Works, <place>. (n NOS)" now has the machines' price after it
    on the Modern quotation (it had none; the PI had it already), and the text is not bold (Modern,
    PI, Classic).
  - Draft PI and Final PI lists have no New button; they are made from the quotation (Make Draft
    PI) and the Draft PI (Make Final PI).
- Reason: the user asked for the Standard Accessories table on the three documents, to remove the
  CIF tick and give its fields directly, the price in front of Ex-Works with Ex-Works not bold, and
  no New button on the Draft PI / Final PI lists.
- Files: `manav/public/js/standard_accessories.js` (new), `manav/hooks.py`,
  `manav/manav/erpnext_fields.py`, `manav/manav/quotation.py`, `manav/public/js/quotation.js`,
  `manav/public/js/sales_order_list.js`, `manav/manav/doctype/draft_pi/draft_pi.json`,
  `draft_pi.js`, `draft_pi_list.js`, templates `manav_quotation_pi_totals.html`,
  `manav_proforma_invoice.html`, `manav_modern_quotation_body.html`,
  `manav_classic_quotation_body.html`.
- Testing: `node --check` on the five JS files, `py_compile` on the three Python files, JSON load of
  draft_pi.json and a Jinja parse of the four templates passed (Windows). Not run: `bench migrate`,
  `bench build`, the forms and prints in a browser.
- Pending: an existing document ticked CIF with CIF Charges 0 stops being CIF when next saved.
  Direct links such as /app/draft-pi/new still open a new form (only the list buttons are gone).

**Sidebars: "Sub-Item List" in "Item & Price Masters".**

- Summary: a link "Sub-Item List" (the Quotation Sub Item Master list) at the top of the section
  "Item & Price Masters" in the Manav, Bangalore, Chennai, Coimbatore and FTWZ sidebars (after
  "Machine Sub-Items Tree" in the branch sidebars).
- Reason: the user asked for the list of sub-items in that section.
- Files: `manav/workspace_sidebar/manav.json`, `bangalore.json`, `chennai.json`,
  `coimbatore.json`, `ftwz.json`.
- Testing: the files were read back as JSON and the link is in place. Not run: `bench migrate` on
  the server; not looked at in a browser.
- Pending: none.

**Machine Sub-Items page redesigned; own "Sub-Items" link in the Manav sidebar.**

- Summary: the page machine-sub-items (now titled "Machine Sub-Items") shows a searchable machine
  list grouped by Item Group, with group filter chips and totals (machines, sub-items, active). A
  click opens that machine's sub-items as a table (Sr, code, description, type, qty, rate) with a
  filter box and an Active switch; this replaces the tree. New server method
  `item_tree.get_machines`; `get_tree_nodes` is kept. The Manav sidebar has a top-level
  "Sub-Items" link after Item (moved out of "Item & Price Masters").
- Reason: the user asked to make the sub-items page nicer and to give it its own sidebar item.
- Files: `manav/manav/page/machine_sub_items/machine_sub_items.js` and `.json`,
  `manav/manav/item_tree.py`, `manav/workspace_sidebar/manav.json`.
- Testing: `node --check` on the page script and `py_compile` on item_tree.py passed (Windows). Not
  run: `bench migrate` / `bench build` on the server, and not looked at in a browser.
- Pending: the branch sidebars (Bangalore, Chennai, Coimbatore, FTWZ) still list the page under
  "Item & Price Masters" as "Machine Sub-Items Tree".

**Item: the item's full name is shown under the Description heading.**

- Summary: new HTML custom field `custom_item_full_name` (after the hidden Brand, top of the
  Description section in the Standard Accessories tab); the Item form shows the Item Name (else
  the code) there in blue, above Standard Accessories, and refreshes it when Item Name changes.
  Nothing is stored and the prints are unchanged. The section's "Description" heading is removed
  (property setter: section_break_11 label empty).
- Reason: the user asked for the full name of the item under Description, in another colour, and
  for the Description heading to go.
- Files: `manav/manav/item_fields.py`, `manav/public/js/item.js`.
- Testing: `node --check` on item.js and `py_compile` on item_fields.py passed (Windows). Not run:
  `bench migrate` / `bench build` on the server, and not looked at in a browser.
- Pending: run `bench migrate` and `bench build --app manav` on the server.

## 2026-11-03

**Item: the Description field is labelled "Standard Accessories".**

- Summary: property setter on Item.description (label), added to ITEM_PROPERTIES so every migrate
  keeps it. Only the label on the Item form changes; quotation lines and prints are unchanged.
- Reason: the user asked to name the field Standard Accessories.
- Files: `manav/manav/item_fields.py`.
- Testing: setup_item_fields run on manav.local; Item meta shows the label "Standard Accessories".
  Not looked at in a browser.
- Pending: none.

**Machines' Standard Accessories loaded from the old "Quotation Sub Machine Mst"; bold points print bold.**

- Summary: the old table (744_Quotation_Sub_Machine_Mst.xlsx, 5434 rows, 187 machines) was loaded
  into the Item Description ("Standard Accessories" tab) of 178 machines on manav.local as a
  bulleted list in Sub Item Sr.no. order; rows with Bold Print "Bo"/"BO" are <strong>. The
  previous descriptions were replaced (backup: `~/item_description_backup_20261103.json` on the
  server). Not loaded: EC-300, MDC-500, SR-100, VF-3APC, VF-3SSAPC, VF-4APC, VF-4SSAPC, VR-11B (no
  Item with that code) and HRT310 (no text). Prints: a bold list item is marked "!" when the
  description is read and printed bold (Modern, Modern CIF, PI, Classic, Banded / Colour).
- Reason: the user asked to add the points from the file to Standard Accessories.
- Files: templates `manav_modern_quotation.html`, `manav_modern_quotation_cif.html`,
  `manav_proforma_invoice.html`, `manav_quotation_data.html`, `manav_modern_quotation_body.html`;
  data change on manav.local (one-off script, not in the app).
- Testing: dry run, then applied (178 Items). An unsaved quotation with the new VF-2SSYT
  description renders the points with "BT 40-Taper Spindle" bold and no stray "!" in Modern,
  Classic and Banded. Not looked at in a browser.
- Pending: existing quotation lines keep the description they were made with; only lines added
  from now on (or re-picked items) get the new points. The 8 missing machines need Items first.

**CIF prints like the old system; "Ex-Works From"; board next stage opens a Visit; bullets by default.**

- Summary:
  - CIF: new "Ex-Works From" on Quotation and Sales Order (custom_ex_works_from), Draft PI
    (ex_works_from) and the principal ("Default Ex-Works From", Quotation Type ex_works_from),
    shown when CIF is ticked, copied Quotation -> Draft PI -> Final PI and filled from the
    principal. CIF Port is where the charges run to; FTWZ Chennai when the principal has none.
    A CIF document with Ex-Works From prints "Prices : Ex-Works, <place>." (Modern: no dots, no
    amount) and "CIF Charges upto <port> ...... <charges>" in Modern, Modern CIF, Classic,
    Banded / Colour, Draft PI and Final PI (PI: "Prices : Ex-Works, <place>. (n NOS) ...... total").
  - Leads Board: the next-stage button opens a new Visit of the lead with that stage and its Next
    Visit Date filled in (saving the visit moves the lead), instead of moving the lead at once.
  - Item: an empty Description starts as a bullet list (Quill, without marking the form changed).
- Reason: the user's screenshot of the old CIF print beside ours; "after clicking next stage open
  visit"; "make this (bullet) default".
- Files: `manav/manav/erpnext_fields.py`, `quotation.py`, `pi.py`, doctypes `quotation_type`
  (json, py), `draft_pi` (json, py, js), `public/js/quotation.js`, `public/js/item.js`,
  `page/manav_leads_board/manav_leads_board.js`, templates `manav_quotation_pi_totals.html`,
  `manav_quotation_data.html`, `manav_proforma_invoice.html`, `manav_modern_quotation_body.html`.
- Testing: `bench --site manav.local migrate` rc=0; JS files pass `node --check`; 26QX000087 set
  in memory to CIF / Ex-Works From "Oxnard, USA" / port "FTWZ Chennai" / 1500 (not saved) prints
  "Prices : Ex-Works, Oxnard, USA." and "CIF Charges upto FTWZ Chennai ... USD 1500.00" in Modern
  and Modern CIF, the same lines in Classic, and "CIF Charges upto FTWZ Chennai" in Banded. The
  first run failed (a Jinja comment inside `{% set q = {...} %}`), fixed. Not tried in a browser.
- Pending: principal "1" still has Default CIF Port "Chennai Sea Port" and no Default Ex-Works
  From, so its new CIF quotations get those until the Quotation Type is filled in. 26QX000087's own
  CIF Port is "Oxnard USA" (typed earlier) and its Ex-Works From is empty: it prints the CIF line
  "CIF Charges upto Oxnard USA" and the old price line until it is corrected.

**Item description as rich text; no Payment block on prints; Signature switch on the print page.**

- Summary: the Item's Description is ERPNext's rich-text editor again: the numbered points panel
  (and its help text) is removed from `item.js`; bullet lists typed in the editor still print as
  points. The Payment / Valid till block is no longer printed by the Classic, Banded / Colour and
  Modern layouts (so by every Manav quotation and PI format). The print page's sidebar has a
  "Print Signature" switch under Font that saves the document's Print Signature tick
  (custom_print_signature) and redraws the preview; shown only where the field exists.
- Reason: the user asked to make the description RTF, to remove the Payment block from every print,
  and for a sign / no-sign option on the print page.
- Files: `manav/public/js/item.js`, `manav/public/js/manav_print_sidebar.js`,
  `manav_classic_quotation_body.html`, `manav_banded_quotation_body.html`,
  `manav_modern_quotation_body.html`.
- Testing: both JS files pass `node --check`; on manav.local 26QX000085 in six quotation formats,
  Draft PI 26DPI00002 and Final PI 26FPI00001 render without "Payment" / "Valid till". The
  sidebar switch and the Item editor were not tried in a browser.
- Pending: none known.

**Leads Board: next-stage button, "Visit" instead of "DVR", simpler card.**

- Summary: the card's main button shows the next stage's name and moves the lead there
  (lead_board.next_stage; "Last stage" when there is none); "DVR(s)" reads "Visit(s)"; clicking
  "3 Visits" opens that lead's visit list; the big stage number and the list / edit icon buttons
  are gone (the lead no. still opens the lead); no "Open DVR (checked in)" button. Lead Stage's
  Days description says visit instead of DVR. Possible now that the files are owned by support02
  again.
- Reason: the user's screenshots of the board card.
- Files: `manav/manav/page/manav_leads_board/manav_leads_board.js`,
  `manav/manav/doctype/manav_lead_stage/manav_lead_stage.json`.
- Testing: `node --check` passes; `bench --site manav.local migrate` rc=0. Not looked at in a
  browser.
- Pending: none known.

**Lead / Visit, Quotation, prints and Item changes (the user's list of 15).**

- Summary:
  - Lead: Sales Engineer (sale_engineer) is a Link to Sales Person, filled with the user's own Sales
    Person; patch `lead_sales_engineer_link` replaced the two old text values ("Administrator", no
    Sales Person) with the owner's Sales Person (none) and kept the text in Other Information Notes.
    Product Type / Product hidden; the free-hand field is labelled "Product". Top-right buttons
    "New Visit" (primary) and "Next Stage" (lead_board.next_stage: next stage by sequence, next
    follow-up = today + its days). The quotation from a lead takes the lead's Sales Engineer.
  - Visit (was DVR): check-in / check-out removed: no GPS on save, no Check Out button (form and
    list), map, location checks, DIGIPIN or Set as Customer Location; those sections and Status are
    hidden, old data kept. checkin_date is shown as "Visit Date". A "Next Stage" button sets the
    visit's stage to the next one and saves, which moves the lead. `manav_visit_position.js`
    deleted and dropped from hooks. Visit list indicator = stage; Visit Register shows Visit Date
    and Stage instead of In / Out / Status / location; field texts say "visit" instead of "DVR".
  - Quotation: Principal (Quotation Type) compulsory (not on the PI); "Magic Cust Code"
    (custom_magic_cust_code, read only) filled from Customer.custom_customer_code when the customer
    is chosen and on save; "Print Signature" tick (default on) on Quotation, Draft PI and Final PI;
    Connections show a "PI" group with Draft PI and Sales Order (override_doctype_dashboards).
  - Account Manager hidden on Quotation, Sales Order, Draft PI and Customer (values kept; the Manav
    dashboard still uses it), removed from the Customer Dashboard and the Manav dashboard text.
  - Prints: the signature image only when Print Signature is ticked (all Manav quotation / PI
    formats); the Modern layout's signing block starts "For <company>" instead of "Account Manager"
    (Classic, Banded / Colour and Sales Quotation already had "For <company>").
  - Item: the tab "Description" is "Standard Accessories"; Sub-Items is a table (Sr, code,
    description, type, qty, rate, Active switch) with "+ Add Sub-Item", shown on every saved item
    (item_tree.get_sub_items / add_sub_item / set_sub_item_active). New field Quotation Sub Item
    Master "Active" (all 6059 rows active); switched-off sub-items are not offered on quotations.
  - Draft PI form: machine lines blue with a blue bar, sub-items indented, as on the quotation.
- Reason: the user's list of changes for leads, visits, quotations, prints and items.
- Files: `manav/hooks.py`, `manav/patches.txt`, `manav/patches/lead_sales_engineer_link.py` (new),
  `manav/manav/erpnext_fields.py`, `quotation.py`, `pi.py`, `lead_board.py`, `item_tree.py`,
  `item_fields.py`, doctypes `manav_lead` (json, py, js), `manav_visit` (json, py, js, list js),
  `draft_pi` (json, py, js), `quotation_sub_item_master` (json, py), `quotation_head.py`,
  `public/js/quotation.js`, `item.js`, `manav_lead_form.js`, `manav_dashboard_view.js`,
  `public/js/manav_visit_position.js` (deleted), `page/customer_dashboard/customer_dashboard.js`,
  reports `manav_visit_register`, `manav_visit_analysis`, print templates
  `manav_modern_quotation.html`, `manav_modern_quotation_cif.html`, `manav_proforma_invoice.html`,
  `manav_quotation_data.html`, `manav_modern_quotation_body.html`.
- Testing: all changed Python files parse; all changed JS files pass `node --check`;
  `bench --site manav.local migrate` rc=0. On manav.local (writes rolled back): field properties as
  above; Magic code of ZODIAC LIFE SCIENCES PVT LTD. -> MZ029; next_stage 04 RFQ -> 05 Quote
  Followup with follow-up 2026-11-06; Modern print of 26QX000085 has the signature image with Print
  Signature on and none with it off, "For Manav" and no "Account Manager"; VS-1 has 19 sub-items,
  switching one off gives 18 options; the Quotation dashboard has the PI group. Nothing was tried
  in a browser.
- Pending: the Leads Board page (`page/manav_leads_board`, owned by Linux user support03, folder not
  writable) still says "Make DVR" / "DVRs" and has the old "Open DVR (checked in)" button for old
  checked-in visits; `manav_lead_stage.json`'s description still says DVR. Both need
  `sudo chown` first. newsite.local / OH.local not migrated.

**Page numbers ("Page n of m") on the quotation and PI PDFs: templates done, server PDF tool pending.**

- Summary: new shared footer `manav_page_number.html` (id footer-html, visible-pdf) with
  "Page <page> of <topage>", which Frappe's PDF footer fills on every page. Used by the Modern
  layout (Modern, Modern CIF, Modern Quotation Head, Draft PI, Final PI; under the letter head
  footer, PDF bottom margin 31 mm with a footer, was 26), the Classic, Banded and Colour bodies, and
  the inline formats Manav Sales Quotation and Manav Quotation (their JSON html, modified bumped).
- Reason: the user asked for page numbers when printing quotations and PIs.
- Files: `manav/templates/print_formats/manav_page_number.html` (new),
  `manav_modern_quotation_body.html`, `manav_classic_quotation_body.html`,
  `manav_banded_quotation_body.html`,
  `manav/manav/print_format/manav_sales_quotation/manav_sales_quotation.json`,
  `manav/manav/print_format/manav_quotation/manav_quotation.json`.
- Testing: migrate on manav.local rc=0; all nine formats render to PDF without error and the
  footer reaches wkhtmltopdf (`--footer-html` file holds the "Page ... of ..." line). The page
  numbers do NOT appear yet: the server's wkhtmltopdf is Ubuntu's 0.12.6 without patched Qt, which
  ignores --header-html / --footer-html (so the Modern layout's letter head footer has not been
  in server PDFs either). The patched build wkhtmltox 0.12.6.1-3 (jammy, amd64; sha256
  4f723b26...ddba15) was downloaded to ~/ on the server; its dependencies are present on Ubuntu
  24.04 except xfonts-75dpi (apt installs it). It was not run or installed (needs sudo).
- Pending: install it (`sudo apt install ~/wkhtmltox_0.12.6.1-3.jammy_amd64.deb`), then re-check
  the PDFs. Printing from the browser (Print button) has no page numbers on the Modern layout,
  which removes the browser's own page margins.

**Draft PI: "Final price with" section (Price Type, Port).**

- Summary: the Draft PI's Price Type (now labelled "Final price with: Price Type") and Port moved
  into the empty left column at the top, under Quotation No. / Final PI No., as the user marked on
  the form. (First the same day they were put in a section after the totals; moved again at the
  user's request.) Filling is unchanged (pi.fill_price_basis: the principal's Price Basis, else
  EX-WORKS FTWZ / WAREHOUSE CHENNAI). The two existing Draft PIs, 26DPI00001 and 26DPI00002, had both
  fields empty (saved before the fields existed) and were filled with those defaults (db_set, the
  modified date kept); their print does not change, as it already used the defaults.
- Reason: the user asked for the old program's "Final price with" Price Type / Port on the Draft PI.
- Files: `manav/manav/doctype/draft_pi/draft_pi.json`, `manav/manav/doctype/draft_pi/draft_pi.py`
  (change note).
- Testing: `bench --site manav.local migrate` rc=0 (twice); the Draft PI meta has Price Type and
  Port right after Final PI No., in the left column. Not looked at in a browser.
- Pending: newsite.local / OH.local not migrated for this change (Manav runs on manav.local).

**CIF ticked: CIF Charges 1500 by default.**

- Summary: ticking CIF on a Quotation, Draft PI or Final PI (Sales Order) writes 1500 in an empty
  CIF Charges when the principal (Quotation Type) has no Default CIF Charges (none has one now).
  The field stays editable and a typed amount is never replaced. The same rule runs on saving the
  Quotation and Draft PI (quotation.fill_cif_defaults, DEFAULT_CIF_CHARGES), now also without a
  principal. A principal's Default CIF Charges, when set, still wins.
- Reason: the user asked for 1500 to be written automatically when CIF is selected, with the
  option to change it.
- Files: `manav/manav/quotation.py`, `manav/public/js/quotation.js`,
  `manav/manav/doctype/draft_pi/draft_pi.js`.
- Testing: both JS files pass `node --check`; on manav.local fill_cif_defaults on an unsaved copy
  of 26QX000085 (rolled back): empty -> 1500 (port Chennai Sea Port from principal 1), typed 2200
  kept, no principal -> 1500. The forms were not tried in a browser.
- Pending: none known.

**Customer Dashboard colour bands; no lone TOTAL row on the PI prints.**

- Summary: Customer Dashboard: the Overview groups have their own colour (Sales blue, Orders
  purple, Accounts green): a coloured title label, a 4px band on top of each card and a light tint;
  each tab has a colour dot, and when active a coloured underline, tint and filled count pill.
  PI prints (Manav Draft PI, Manav Proforma Invoice): the TOTAL row is left out (q.no_totals) when
  nothing is added to the price line, as it only repeated the price line's amount; with CIF
  charges or an advance the rows down to GRAND TOTAL / BALANCE stay. The quotation formats with
  the price line already printed no totals.
- Reason: the user asked for colour bands on the dashboard, and marked the TOTAL row under the
  price line as not needed in any print format.
- Files: `manav/manav/page/customer_dashboard/customer_dashboard.js`,
  `manav/templates/print_formats/manav_proforma_invoice.html`.
- Testing: dashboard script passes `node --check` and the served page script contains the new
  classes (manav.local, cache cleared); not looked at in a browser. Rendered on manav.local: Manav
  Proforma Invoice (3 Final PIs) and Manav Draft PI 26DPI00001 have the price line and no totals
  row; Draft PI 26DPI00002 (with an advance) still prints BALANCE; all Manav quotation formats
  render without error.
- Pending: Manav Banded / Colour Quotation (no price line) still print Subtotal / Grand Total;
  left as is because it is their only total.

**"Customer Dashboard" button on the Customer form.**

- Summary: the Customer form has a blue "Customer Dashboard" button that opens the page
  customer-dashboard for that customer (via route_options, read by the page's on_page_show). Shown
  only to the Administrator, System Managers and Manav Management, as the page refuses others.
- Reason: the user asked for the customer dashboard on the Customer form.
- Files: `manav/public/js/customer.js` (new), `manav/hooks.py` (doctype_js).
- Testing: on manav.local, after clearing the cache, the hooks list customer.js for Customer and
  the form's served script contains the button; the file passes `node --check`. Not clicked in a
  browser.
- Pending: none known.

**The user's branch beside the page title in the desk.**

- Summary: every desk page shows the logged-in user's branch (User > Branch; when empty, the branch
  of the user's Employee) as a blue pill beside the title, e.g. "Manav  [Manav Marketing -
  Bangalore]". The branch is sent in the boot (`add_branch_to_boot`, extend_bootinfo) and drawn by
  `public/js/manav_branch.js` (app_include_js), which wraps frappe.ui.Page.render_breadcrumbs so
  the pill is put back after every title change. Users without a branch (the Administrator) see
  no pill; hidden on phones.
- Reason: the user asked for the branch name beside the "Manav" title at the top of the page.
- Files: `manav/hooks.py`, `manav/manav/branches.py`, `manav/public/js/manav_branch.js` (new).
- Testing: on manav.local the hooks list the new boot function and script after clearing the
  cache; the boot function gives "Manav Marketing - Coimbatore" for shyam@manavmarketing.com and
  nothing for the Administrator; the script is served (HTTP 200) and passes `node --check`. Not
  checked in a browser.
- Pending: none known.

**Signatures on quotation / PI prints; lead "Masters" group out of the Manav sidebar.**

- Summary: Sales Person has a "Signature" field (custom_signature, Attach Image, after Login User;
  `erpnext_fields.py`). The print data (`manav_quotation_data.html`, `manav_modern_quotation.html`,
  `manav_modern_quotation_cif.html`, `manav_proforma_invoice.html`) carries `q.signature` from the
  Signed By sales person, and the Classic, Banded and Modern bodies print it in the signing space
  (Modern: in place of the italic name); nothing changes when there is no signature. Placeholder
  signature images (name in dark-blue "ink" with a flourish, made with Pillow) were attached to the
  19 sales persons of the user list on manav.local. The "Masters" group (Lead Sources, Product
  Types, Products, Lead Stages, Lead Management Settings) was removed from the site's Manav sidebar,
  and the Masters and Settings sections from `manav/workspace_sidebar/lead_management.json`; they
  stay on the Lead Management workspace page.
- Reason: the user asked for a dummy signature per user on the PDF, and to remove that sidebar group.
- Files: `manav/manav/erpnext_fields.py`, the four print data templates above,
  `manav_classic_quotation_body.html`, `manav_banded_quotation_body.html`,
  `manav_modern_quotation_body.html`, `manav/workspace_sidebar/lead_management.json`.
- Testing: migrate on manav.local rc=0; quotation 26QX000085 rendered with Signed By set in memory
  (not saved): the image is in the HTML of Classic, Banded and Modern, and the Modern PDF shows it
  above the name. A PDF made from a script needs host_name pointing at the server (it fails with
  HostNotFoundError on http://manav.local:8005 with or without a signature); in the browser the URL
  comes from the request. Sidebar: the site's "Manav" sidebar went from 65 to 59 items.
- Pending: real signatures to be uploaded (Sales Person > Signature); several lead-module files
  were again created as Linux user support03 (read-only for support02), see
  `find ~/frappe-bench/apps/manav -not -user support02`.

**Bench updated to the latest version-16 (all sites), at the user's request.**

- Summary: Frappe 16.33.1 -> 16.54.0, ERPNext 16.35.0 -> 16.53.0, HRMS 16.19.0 -> 16.53.0; other
  apps unchanged. Hand edits inside the three core apps were saved to `~/core_edits_20261103/`
  (diff + untracked files + HEAD) and re-applied; conflicts resolved: frappe `modules.txt` keeps
  upstream's list plus "Evision"; ERPNext `employee.json` keeps upstream's new "select" roles plus
  the local Administrator / System Manager rights, read_only and show_title_field_in_link;
  desktop icons deleted locally stay deleted; frappe `ui/` dev files (package.json, yarn.lock,
  RecipientSelect.vue, CodeEditorField.vue) take upstream (local versions only in the saved patch).
  The git stashes "hand edits before v16 update 2026-11-03" are kept in each app.
- newsite.local: migrate failed in Frappe's `rename_conflicting_custom_module` (it queries the new
  `tabSidebar` before it exists) because Module Def "BNI Milestone" was still flagged custom while
  milestone_app ships it (its 14 doctypes already belong to the app); the flag was cleared and the
  migrate re-run.
- Manav: the new Frappe opens /desk on an "Apps" screen; Desktop Settings -> Desktop Page is set to
  "Desktop Icons" on manav.local so the branch icons show again. "Lead Management" had only a
  Workspace Sidebar; a standard Workspace "Lead Management" (module Manav) was added to the app
  (`manav/manav/workspace/lead_management/`), as Frappe 16.54 needs one for a desktop icon.
- Reason: the user asked to update Frappe and to get the branch icons back on the desk.
- Testing: backups of all 3 sites first (`sites/*/private/backups/20261103_100*`); `bench --site
  <site> migrate` rc=0 on manav.local, OH.local and (after the fix) newsite.local; `bench build`
  rc=0 for all apps except helpdesk; boot data for Administrator and govind@ lists Manav,
  Bangalore, FTWZ, Chennai, Coimbatore, Lead Management; both web servers answer `ping`.
- Pending: helpdesk (1.30.1) does not build against Frappe 16.54's UI ("TabList" not exported by
  its frappe-ui) and keeps its old assets until helpdesk is updated; `bench setup requirements`
  fails on `apps/employee_tracker` (not a git repository); supervisor-managed workers were not
  restarted (sudo needs a password); no browser check yet.

**Workspaces (Manav and the branch workspaces): better-looking dashboard.**

- Summary: number cards coloured by meaning (blue counts, green money / present, orange waiting,
  red absent, purple ordered); "Quotation Value by Month" is a filled green line, "Quotations by
  Status" a donut, the other quotation charts in their own colours; shortcuts coloured, and
  "Quotation Head (Old)" (cut off on its tile) is now "Old Quotations"; the tab bar is a segmented
  pill bar with a coloured dot per tab and no visible scrollbar.
- Reason: the user asked to make the workspace UI better (screenshot of Manav Marketing - Bangalore).
- Files: `manav/manav/number_card/*` (12), `manav/manav/dashboard_chart/*` (6),
  `manav/manav/workspace/{manav,bangalore,chennai,coimbatore,ftwz}/*.json`,
  `manav/manav/workspace_tabs_block/tabs.css`.
- Testing: see the migrate line below; not checked in a browser.

**Branch on User; Hyderabad branch; user list linked to Employees (manav.local).**

- Summary: new branch "Manav Marketing - Hyderabad"; User has a "Branch" field (custom_branch,
  beside Username), created by `setup_branches` (after_migrate). The 19 users of the list got their
  branch. 10 existing Employees were linked to their user (user_id) and branch: Naveen Kumar S,
  Somashekar M, Suresh Kumar K, Mohanraj K, Raghu P Ambore, Vishwanath M, Manoj S, Kolakoti Navin,
  Sivakumar P, Shyam Shankar T.
- Reason: the user asked for the branch on users and for the user list in Employee too.
- Files: `manav/manav/branches.py`; data via one-off scripts over SSH (not kept).
- Testing: `py_compile` passed; `bench execute ...setup_branches` ran; every user / employee
  update printed OK.
- Pending: no Employee exists for Govind, MHM Jambunath, B. Vijay Bhaskar Reddy, Krishna Mohan,
  L. Karthikeyan, Sharan Kumar, G. Jayaprakash, Anbu, L.R.K Reddy; creating them needs gender, date
  of birth and date of joining (mandatory), which the list does not give.

**Customer Dashboard: "Quotations & PIs" tab as deals (Quotation -> Draft PI -> Final PI).**

- Summary: the three separate tables are replaced by one row per deal with three stage cards
  (number, date, amount, status; Delivered / Billed bars on a submitted Final PI; dashed "Not yet"
  when a stage is not reached), linked through the quotation's Draft PI No. / Final PI No., the Draft
  PI's quotation / final_pi and the Sales Order's custom_quotation / custom_draft_pi; Draft / Final
  PIs without a quotation get their own row. Above: count and value per stage with "Open list".
- Reason: the user found the tab "still not good" (screenshot: wide, unaligned tables, empty link
  columns).
- Files: `manav/manav/page/customer_dashboard/customer_dashboard.js`.
- Testing: `node --check` passed; `bench build --app manav` and `clear-cache` on manav.local over
  SSH completed. Not checked in a browser.

**Login users for the sales team (data only, manav.local).**

- Summary: from the user's list "User List for frappe.pdf", 17 users were created (Sales User role,
  no welcome email; passwords to be set by the user) and the 2 existing ones (govind@, soma@) kept as
  they were. Each of the 19 is linked to their existing Sales Person through "Login User"
  (custom_user), e.g. manavblr@mmpltd.in -> NAVEEN KUMAR .S, manavchennai@mmpltd.in -> SURESH KUMAR
  .K, manavcbe@mmpltd.in -> MOHAN RAJ.K, krishna@ -> KRISHNA MOHAN (matches confirmed by the user).
  Signed By still lists all Sales Persons (the user's choice).
- Reason: the user asked for the user list to be made and the people to be in the Signed By dropdown.
- Files: none in the app (one-off script run over SSH, not kept).
- Testing: script output showed every user created/kept and every Sales Person linked, no errors.
- Pending: passwords for the new users; branches (incl. Hyderabad, which is not a Manav Branch) are
  not stored on the users.

**Item form: points panel without title box; Details and Description tabs coloured.**

- Summary: the points panel has no inner "Description" label and no title box; a title already in a
  description is shown as point 1 and saved as a point on the next change (so it then prints as a
  "*" point). The Details tab is blue and the Description tab green (CSS in item.js, Item form only).
- Reason: user request (screenshot).
- Files: `manav/public/js/item.js`.
- Testing: `node --check` passed; `bench build --app manav` and `clear-cache` on manav.local over
  SSH: both completed. Not checked in a browser.

**Item: description shown point-wise on the form, with "Add point".**

- Summary: the "Add points" dialog under Description is replaced by a "Description points" panel:
  an optional title and the points as a numbered list, each editable in place with a remove (×)
  button, plus "+ Add point"; Enter in a point adds the next one. Every change rewrites the
  description as before (title paragraph + bulleted list, printed as "*" points). Editing the
  description in the editor redraws the panel. Without write permission the points are listed
  read-only.
- Reason: the user asked to see the description point-wise and to have an option to add points.
- Files: `manav/public/js/item.js`.
- Testing: `node --check` on item.js passed. Not tested in a browser; needs `bench build --app manav`
  on the Linux bench server (not run from Windows).
- Pending: check on the live Item form (e.g. ST-10Y) after the build.
- Follow-up (same day): the Description rich-text editor box is hidden on the Item form (CSS on the
  field wrapper only; the field and its data are unchanged); the points panel is labelled
  "Description" and "+ Add point" is a primary (coloured) button. Reason: user asked to remove the
  big box and colour the add button. Testing: `node --check` passed; not tested in a browser.

**Item form: shorter Details tab, Description in its own tab, Brand hidden.**

- Summary: ERPNext's "Item Attributes" section and the over-delivery / over-billing allowances
  section (labelled "Allowances") are collapsible and start closed. A new tab "Description"
  (Custom Field `custom_description_tab`) holds the Description section; Brand is hidden. "Old
  System Data" and "Sub-Items" are moved before the new tab so they stay on Details. Done with a
  Custom Field and property setters in `setup_item_fields` (after_migrate); ERPNext files untouched.
- Reason: user asked to collapse those sections, put the description in a tab and remove Brand.
- Files: `manav/manav/item_fields.py`.
- Testing: `python -m py_compile` passed. `bench --site manav.local migrate` run over SSH:
  completed (after_migrate hooks ran). Checked afterwards (Item meta, read-only): no `field_order`
  property setter on Item; Item Attributes and Allowances collapsible; Old System Data and Sub-Items
  on Details; tab Description holds the Description section with Brand hidden; Accounting follows.
  `bench build --app manav` over SSH failed: the non-interactive shell has Node 18 and Frappe v16
  needs Node >= 24 (not needed for item.js, which `doctype_js` serves from the file).
  Re-run with nvm's Node 24 on the PATH (`~/.nvm/versions/node/v24.21.0/bin`, which a
  non-interactive SSH shell does not load): build completed.
- Pending: no browser check yet.

## 2026-11-02

**Migrate run on manav.local (at the user's request).**

- `bench --site manav.local migrate` over SSH: completed (after_migrate hooks ran).
- Checked afterwards (database, read-only): Specifications hidden on Item and Quotation Item; no
  "Redesign" print formats left (patch `remove_redesign_print_formats` logged); default print formats
  Quotation = Manav Classic Quotation, Sales Order = Manav Proforma Invoice, Draft PI = Manav Draft PI;
  page_js hook for the print page active.
- Checked in a browser on the live site (as e2e.admin, nothing changed): Item ST-10Y shows "Add
  points" and no Specifications or its buttons; the Print page of 26QX000085 opens Manav Classic
  Quotation with the sidebar sections Format and Print Format Type (9 format cards); no JavaScript
  errors.

**Item: Specifications hidden; "Add points" for the description; prints read the points.**

- Reason: the user asked to remove Specifications from the Item form and to give a point-wise way to
  enter the description.
- Changes:
  - `item_fields.py`: Item "Specifications" (`custom_specifications`) `hidden: 1`; `erpnext_fields.py`:
    the same field on Quotation Item hidden. The values stay in the database.
  - `public/js/item.js`: the Specifications buttons (Format / From screenshot) only while that field
    is shown; "Add points" button under Description: a dialog with Title and Points (one per line,
    a leading * or - is dropped), filled from the current description ("Title; a, b, c", several
    lines, or an existing list); it writes `<p>Title</p><ul><li>point</li>...</ul>`.
  - Print templates: macro `describe` (`manav_modern_quotation.html`, `manav_modern_quotation_cif.html`,
    `manav_proforma_invoice.html`) reads such a list (title = text before it, a point per item);
    `manav_quotation_data.html` (Classic, Banded, Colour) takes a bullet per list item and no longer
    falls back to the key Specifications.
- Testing: `node --check` of `item.js`, `py_compile` of both field files. On the server (read-only,
  description changed in memory only): 26QX000085's ST-10Y with title + 3 points prints the 3 points
  and the title in Modern, CIF and Classic, no specifications. On the live site (edited item.js
  served by Playwright, item ST-10Y, not saved): "Add points" pre-filled title "CNC Lathe w/Y Axis"
  and point "9" x 14" (229 x 356 mm) max capacity"; OK wrote the title and list; no JavaScript errors.
- Not run: hiding the fields (after_migrate step) - needs `bench --site manav.local migrate`, then a
  hard reload of the Item form.
- Pending: existing items keep their old descriptions until edited with "Add points" (a description
  "Title; a, b, c" already prints as points). Quotation lines take the description when the item is
  chosen, so quotations made before an item is edited keep the old text.

**Quotation / Final PI: options (sub-items) no longer offered in a machine line's Item Code search.**

- Reason: the user asked why ACF (an option / sub-item) is in the Item Code list when no spares or
  sub-items were asked for.
- Cause: `set_item_query` (public/js/quotation.js, 2026-10-19) let the principal's Item Group and the
  "Options" group into every line. ACF, 10K-40T-GBX, PFDM, 18K-HSK-A63 are in "Options".
- Change: `public/js/quotation.js` `set_item_query`: a line without "Sub-Item of" offers only the
  principal's Item Group (without a principal: anything but Options); a line with "Sub-Item of"
  still offers the principal's group and Options. The "+" sub-items dialog and "Spares for Machine"
  are unchanged. (The file is also the Sales Order / Final PI's script, so the same applies there.)
- Testing: `node --check`; on the live site, new Quotation with principal 1 (Machines), the edited
  file put in place of the served form script by Playwright: machine line filter "Machines", search
  "ACF" -> nothing, "VF-10" -> VF-10/40, VF-10/50; sub-item line (Sub-Item of VF-10/40) filter
  Machines + Options, search "ACF" -> ACF; no JavaScript errors.
- Pending: 17 items of the "Machines" group are also registered as sub-items in Quotation Sub Item
  Master (e.g. HRT450); by group they are machines, so they are still offered on machine lines. The
  form script reaches browsers after `bench --site manav.local clear-cache` and a hard reload.

**Print page sidebar: Page, "<Doctype> options" and "Set as default" removed; price / CIF lines bold.**

- Reason: the user marked the sidebar's Page / Quotation options / Set as default part "remove this
  part", and the quotation's Price and CIF Charges lines "make this bold".
- Changes:
  - `public/js/manav_print_sidebar.js`: no Page section (paper size, orientation), no "<Doctype>
    options" (Frappe's print settings section is hidden; their defaults still apply), no "Set as
    default" button; the `add_settings_to_sidebar` wrapper is gone. Format, Print Format Type cards and
    Font stay.
  - `manav_modern_quotation_body.html`: the price line and the lines under it 10.5pt, weight 800, black;
    amounts 900. The PI prints use the same lines and are bold the same way.
- Testing: `node --check`; on the live print page of 26QX000085 (file appended to the page script by
  Playwright): sections Format and Print Format Type, controls print_format / letterhead / language /
  font, no default button, no JavaScript errors. Read-only render of 26QX000085 (CIF) checked on a
  screenshot.
- Not run: the hook-served file on the site (needs `bench --site manav.local clear-cache` or a migrate).

**Manav Modern Quotation: no specifications, the description as "*" points (as on the old print).**

- Reason: the user said: in the quotation no specification, only the description, like the old
  print's photo.
- Changes:
  - `manav_modern_quotation.html`: `no_specs` and `no_page_per_machine` (no "Equipment Specification"
    box, machines one after another); each machine's and option's description split into points
    (macro `describe`, copied from `manav_modern_quotation_cif.html`, where the same macro already
    lives, as in `manav_proforma_invoice.html`); `bullet: "*"`. Specifications are no longer read.
  - `manav_modern_quotation_cif.html`: `bullet: "*"` as well.
  - `manav_modern_quotation_body.html`: optional `q.bullet` (default the round bullet, so the PI prints
    are unchanged).
- Testing: read-only render on the server: 26QX000080 (Modern) shows no specification box, VF-1 and
  VF-10/40 with their description as two columns of "*" points beside the picture, HIL's point under
  it (screenshot checked); 26QX000085, 26FPI00001, 26DPI00002 render.
- Pending: the picture beside the points is kept (asked for on 2026-10-28); the old print had none.

**Quotation prints (Modern, CIF): no total line; currency code with the prices.**

- Reason: the user marked the Modern/CIF quotation print: "don't add total line", and write INR or USD
  with the price.
- Changes:
  - `manav_quotation_pi_totals.html`: `q.no_totals` (no TOTAL / GRAND TOTAL row); CIF charges and any
    taxes as dotted lines under the price line (`q.charge_lines`, replacing `q.cif_line` of earlier
    today); the amounts in those lines and the column heads use the currency code (USD / INR) instead
    of "US$" / "Rs." (`q.currency_code`).
  - `manav_modern_quotation_body.html`: `q.charge_lines` list, optional `q.no_totals` (payment info
    stays), optional `q.currency_code` in the heads ("Price (USD)", "Total (USD)"). The PI prints do not
    set these and are unchanged.
- Testing: read-only render on the server: 26QX000085 (CIF) shows "Price ... USD 187000.00", "CIF
  Charges - Chennai Sea Port ... USD 1500.00", heads "PRICE (USD)" / "TOTAL (USD)", no total row
  (screenshot checked); 26QX000080, 26FPI00001, 26DPI00002 render, the PIs still with their TOTAL.
- Not run: on the live site's Print view (needs the files there; the site serves the app's files, so
  a reload of the print should show it).

**Quotation print like the old one: Manav Classic Quotation matches the old print and is the default; options are never added to the price or total.**

- Reason: the user showed the old entry screen (machine at its own rate, CIF as an "Essential" sub-item)
  and the old print, and asked for the print to match "whole format, calculation and all"; asked,
  they chose the old calculation (price = machine only, options listed with own prices but not added,
  no Total) and Classic as the default; then "in quotation don't add the sub-item's price in the
  total". This replaces the "options added in" choice made earlier the same day (entry below).
- Changes:
  - `manav_classic_quotation_body.html`: title "Quotation"; plain bordered heads; per machine
    "Prices : <price basis>  US$ <machine's own amount>" (plain digits), under the last machine
    "CIF Charges - <port> . . . . US$ <amount>" and other charges the same way; then "Options" in the
    same four columns (1, 2, 3 | code | description | price). No Total row, no amount in words.
  - `manav_quotation_data.html`: new keys `price_digits`, `cif_line` / `cif_digits`, `tax_lines` (the
    keys Banded and Colour use are unchanged).
  - `manav_quotation_pi_totals.html` (Modern, CIF): price line = the machines' own amounts; total =
    machines + taxes + CIF charges; options keep their own prices on their lines but are not added.
  - `erpnext_fields.py`: `DEFAULT_QUOTATION_PRINT_FORMATS` starts with Manav Classic Quotation (set as
    the Quotation's default print format by the after_migrate step).
- Testing: on the server (read-only render with the real documents): Classic for 26QX000085 shows
  "Price : US$ 187000.00", "CIF Charges - Chennai Sea Port ... US$ 1500.00" and Options ACF 3400.00,
  10K-40T-GBX 10000.00, PFDM 0.00, HRT450 25000.00, no total (screenshot checked by eye); 26QX000080
  renders. Modern / CIF: 26QX000085 TOTAL (CIF) 1,88,500 (= 187,000 + 1,500); 26QX000080 TOTAL 0
  (both machines are entered at 0 there); PI prints unchanged.
- Not run: the default print format change (after_migrate step, next migrate); PDF of Classic.
- Pending: the Quotation's own Grand Total (ERPNext, used by the dashboards' "Quoted value" and taken
  over to the Draft PI) still adds the options; only the prints leave them out. Quotation Types still
  have no Price Basis, so the line says "Price :" until one is entered.

**Quotation print: each line priced, CIF charges as a line under the price (as on the old print).**

- Reason: the user showed the old quotation print ("Prices : Ex-Works, Oxnard, USA ... US$ 105100.00",
  "CIF Charges - Chennai Sea Port ...... US$ 5500.00", options with their own prices) and asked for
  the calculation to work the same in the quotation; asked, they chose to keep the options added into
  the price, for both Manav Modern Quotation and Manav Modern Quotation CIF.
- Changes:
  - `manav_modern_quotation.html`, `manav_modern_quotation_cif.html`: the machine row shows the
    machine's own rate / amount and each option row its own rate / amount (since 2026-10-28 the
    machine row showed the machine plus its options and the options had no price).
  - `manav_quotation_pi_totals.html`: CIF charges go to `q.cif_line` / `q.cif_amount` instead of a
    totals row; the totals are one row TOTAL (CIF) = net total + CIF charges (with taxes: TOTAL, taxes,
    GRAND TOTAL (CIF)).
  - `manav_modern_quotation_body.html`: optional second dotted line under the price line for
    `q.cif_line` (the PI prints do not give it and are unchanged).
- Testing: on the server (read-only render with the real documents): 26QX000085 (CIF) prints VF-10/40
  187,000 + ACF 3,400 + 10K-40T-GBX 10,000 + PFDM 0 + HRT450 25,000 = "Price ... US$ 225400.00",
  "CIF Charges - Chennai Sea Port ... US$ 1500.00", "TOTAL (CIF): $ 2,26,900.00" (checked on a
  screenshot); 26QX000080, 26FPI00001 and 26DPI00002 render without errors.
- Pending: no Quotation Type has a Price Basis, so the line says the default "EX-WORKS FTWZ WAREHOUSE
  CHENNAI"; for the old wording, enter e.g. "Ex-Works, Oxnard, USA." in the principal's Quotation Type
  (Price Basis). Takes effect on the site after `bench --site manav.local migrate` (the template files
  are read by the print formats synced there).

**Customer Dashboard: new look in the frappe-ui style.**

- Reason: the user asked to make the dashboard prettier ("/frappe-ui").
- Changes (`page/customer_dashboard/customer_dashboard.js` only; same data, same tabs and lists):
  - Styled with the desk's frappe-ui colour tokens (`--ink-gray-*`, `--surface-*`, `--outline-*`), so
    light and dark themes both work. It stays a desk page: the app has no Vue / frappe-ui build, and
    adding one would need a server build.
  - Header: round avatar, details line (id · group · territory · type), contact chips (mail / phone
    links, Haas Cust ID, Account Manager).
  - Underline tabs with count pills.
  - Key figures as number cards in three groups: Sales (with a conversion bar), Orders, Accounts
    (Outstanding red / Received green when not zero).
  - Chart card "Quoted vs ordered": light / strong blue, shortened Y-axis numbers (were cut off as
    "0000000").
  - Lists: cards with count pill and "Open list →", quiet headers, 40px rows, tinted status badges
    (red / amber / blue / green), right-aligned tabular figures; empty state when no customer is
    chosen.
- Testing: `node --check`. On the live site as e2e.admin (Customer "Z AXIS"), the page loaded with
  this file put in place of the served page script by Playwright: overview, Quotations & PIs tab and
  dark theme screenshotted and checked by eye; no JavaScript errors. The Accounts group and Invoices
  tab were not seen (the test user has no accounts role).
- Not run: the file served by the site itself (it is read from the app; a `bench --site manav.local
  clear-cache` or the next migrate brings it).

**Print page: left sidebar like the design (Format, Print Format Type, Font, Page, options, set default).**

- Reason: the user pointed to sketch.netchamp.dev/u/iamejaaz/print-page-redesign and said the print
  format is not to change, only that left sidebar is wanted; then asked for the print format types
  in place of the style cards.
- Changes:
  - New `public/js/manav_print_sidebar.js`, loaded on Frappe's print page by `hooks.py`
    `page_js = {"print": ...}`. It extends `frappe.ui.form.PrintView` (Frappe 16.33.1; each wrapper
    calls Frappe's method, and nothing runs if a method is missing):
    - Format: Print Format, Letter Head, Language (letter head moved above language);
    - Print Format Type: a card per print format of the doctype (Frappe's own list); a click selects
      it, the same as the Print Format field;
    - Font; Page: Paper size (A4, A5, Letter, Legal) and Portrait / Landscape. They change the preview
      (font, page width, `@page` size); when one differs from the default, Print prints the preview
      itself, else Frappe's Print runs as before. PDF still uses Print Settings (noted in the sidebar).
      Remembered per browser (localStorage);
    - "<Doctype> options": Frappe's print settings of the doctype, drawn as switches;
    - "Set as default for <Doctype>": Frappe's `print_format.make_default`; shown only to users who may
      write Print Format.
- Testing: `node --check` of the file; `py_compile` of `hooks.py`. On the live site, as e2e.admin and
  e2e.sales, the print page loaded with the file appended to the page script by Playwright (what the
  page_js hook does, as the hook needs a cache clear first): sections and cards drawn for Quotation
  26QX000085 and Sales Order 26FPI00001, a card click switched the format (Manav Classic Quotation),
  Landscape / Inter changed the preview's CSS and width, no JavaScript errors, "Set as default" shown
  to the admin only. Checked by eye on screenshots.
- Not run: the hook itself on the site (needs `bench --site manav.local migrate` or `clear-cache`);
  printing on paper and the browser print dialog.

**Quotation print: the PI's price line and totals. ("Redesign" print formats added and taken back.)**

- Reason: the user asked for the quotation to print like the PI ("in quotation also i want pi format
  print"), choosing the price line + totals only (options stay without prices), for the Modern and
  CIF formats.
- Changes:
  - The HTML of **Manav Modern Quotation** and **Manav Modern Quotation CIF** moved from their JSON
    into `templates/print_formats/manav_modern_quotation.html` / `manav_modern_quotation_cif.html`
    (the JSONs only include them); the values printed are unchanged except the totals below.
  - New `templates/print_formats/manav_quotation_pi_totals.html`, included by both: the PI's line
    "Price <Quotation Type price basis, else EX-WORKS FTWZ WAREHOUSE CHENNAI> (n NOS) ...... US$ <net
    total>" after the lines; totals as on the PI: TOTAL alone, or TOTAL / rows to add / GRAND TOTAL
    (" (CIF)" for CIF). No "Subtotal" and no "Tax / Duties: As Applicable" row. The Modern format still
    prints tax rows that have an amount (so the printed total is the quotation's); the CIF format
    still prints none.
  - The same day, a "redesign" style of the shared layout and three print formats (Manav Quotation
    Redesign, Manav PI Redesign, Manav Draft PI Redesign) were added and made the defaults, and a
    migrate put them on manav.local. The user then said the print format is not to change, so all of
    it was taken back: the style, the formats' files and the default changes (`erpnext_fields.py`,
    `draft_pi.json` back to Manav Draft PI, its `modified` moved on so migrate reloads it). New patch
    `manav.patches.remove_redesign_print_formats` deletes the three records on the next migrate;
    `erpnext_fields.setup_erpnext_fields` sets the Quotation / Sales Order defaults back to Manav
    Modern Quotation / Manav Proforma Invoice.
- Testing: on the server (read-only, `frappe.render_template` with 26QX000085 CIF, 26QX000080,
  26FPI00001, 26DPI00002), after the take-back: all rendered without errors, each with the price line
  and no "Tax / Duties" row. The live print page showed the price line and PI totals (the migrate
  above had run). `py_compile` of `erpnext_fields.py` and the patch.
- Not run: the patch and the reset of the defaults (they run on the next migrate).
- Pending:
  - Run `bench --site manav.local migrate`. Then check that the Redesign formats are gone from the
    Print view and that Quotation / PI / Draft PI open with Manav Modern Quotation / Manav Proforma
    Invoice / Manav Draft PI.
  - Found while checking, not caused by this change: the server's wkhtmltopdf 0.12.6 is built with
    unpatched Qt and ignores `--header-html`, so "Get PDF" of all the Manav modern / PI formats
    prints **no letter head and no customer box** (checked on the live CIF format PDF of 26QX000085).
    Fix on the server: install wkhtmltopdf 0.12.6.1 with patched Qt, or set the formats' PDF
    Generator to Chrome.
  - A CIF quotation's price line says the price basis (EX-WORKS ... by default), as on the PI; the CIF
    charges follow in the totals. Quotation has no Price Type / Port fields of its own.

**E2E: Firefox and WebKit results; WebKit time limit raised.**

- Firefox + WebKit run (2026-11-02, 56 min, writes on): 122 passed, 36 failed. Firefox: only the known
  app findings (landing page, workspaces' Salary Slip card, Sales User reports, Lead Dashboard
  `removeChild` error). WebKit: the same, plus 7 form tests in `03-doctypes` that ran out of their
  90 s ("Target page ... closed") while the slow desk loaded; WebKit's Lead Dashboard error reads
  "The object can not be found here." (the same `removeChild` bug). The lead flow, with the GPS
  check-in, passed in both (Firefox saved the position; WebKit the http case without one).
- Change: `e2e/playwright.config.ts`: the webkit project's test timeout is 180 s.
- Not run: WebKit again with the longer limit.

**Playwright end-to-end tests for the whole Manav site (`e2e/`).**

- Reason: the user asked for Playwright test cases covering the whole Manav Frappe site.
- Changes (new folder `e2e/`, its own `package.json`, so `bench setup requirements` does not install
  it; nothing in the app itself changed):
  - `playwright.config.ts`, `.env.example`, `.gitignore` (`.env` and `.auth/` are not committed),
    `README.md`.
  - `tests/helpers.ts` (users, a `problems` fixture failing a test on uncaught JS errors or HTTP
    errors from `/api/`, desk / API helpers); `tests/auth.setup.ts` (login via `/login`, saved sessions).
  - Specs: `01-public` (login page, Request access, `/manav-signup` checks, guests refused, sign-up
    request), `02-navigation` (landing page, desk icons, non-admin limited to Manav, the five
    workspaces), `03-doctypes` (list + new form of every Manav doctype and settings, ERPNext doctypes
    with Manav fields, Sales User permissions), `04-pages-reports` (5 desk pages, 6 script reports, as
    admin and Sales User; Leads Board tabs), `05-print-formats` (11 formats as HTML and PDF),
    `06-api` (read-only whitelisted methods and refusals), `07-lead-flow` (masters through their
    forms, mandatory check, lead -> Leads Board -> visit check-in -> check-out, Sales User cannot
    delete).
  - Writing tests run only with `E2E_ALLOW_WRITES=1`; their records are named `E2E-<run id>` and
    deleted by the admin afterwards.
  - On `manav.local`, two test users were created over SSH: `e2e.admin@manav.test` (System Manager,
    Sales Manager, Sales User) and `e2e.sales@manav.test` (Sales User). Their random passwords are
    only in the git-ignored `e2e/.env` on the share.
- Testing: run from Windows (Node 24, Playwright 1.64.1, Chromium) against
  http://192.168.1.30:8006 with writes on. Full run 2: 98 passed, 17 failed (23.1 min). After fixing
  3 test bugs (sign-up cleanup, Leads Board default tab, GPS over http), the affected tests were
  re-run and passed (5 passed). The remaining failures are app findings, listed below. Test records
  checked on the server afterwards: none left (one leftover from an earlier run, MSR-12593, deleted).
- Pending (findings from the tests; the app was not changed):
  - Sales Users cannot open any of the 6 Manav reports ("You don't have permission to get a report
    on: Manav Lead"). Their Manav Lead / Manav Visit permission is "If Owner", and Frappe's
    `has_permission(doctype, "report")` without a document is then False.
  - After login, users land on `/desk` (desk home), not on the Manav Dashboard (`/desk/manav-dashboard`)
    the 2026-10-28 hooks.py change intends.
  - The Manav and branch workspaces show the "Draft Salary Slips" number card. A System Manager
    without an HR role gets a "Permission Error: Insufficient Permission for Salary Slip" dialog.
    The Sales User test did not hit it.
  - `manav-lead-dashboard` sometimes throws "Failed to execute 'removeChild' on 'Node'" (run 2, both
    users; not seen in run 1).
  - Visit check-in with a GPS position is only checked when the site is served over https; over http
    the test checks that the visit is saved without a position.

**PI print: one price line for the whole bill (before TOTAL), not one under each machine.**

- Reason: the user's print of 26DPI00002 showed "Price EX-WORKS FTWZ WAREHOUSE CHENNAI (1 NOS) ...
  US$ 0.00" under every machine; the user said it is one line for the whole bill.
- Changes:
  - `manav_proforma_invoice.html`: `q.price_line` / `q.price_amount` once per PI: "Price <Price Type>
    <Port> (<machines' qty added up> <first machine's UOM>)" and the PI's total before advance and
    CIF charges (`net_total`), plain digits.
  - `manav_modern_quotation_body.html`: the row under each machine removed; the line is printed after
    the last line table, before the totals (new optional key `price_line` / `price_amount` of `q`).
  - Price Type help text (Draft PI, Sales Order custom field) says "printed once before the total".
- Testing: local: both templates parsed with jinja2; the PI's price-line block rendered with two
  machines (1 NOS each, net_total 105100) -> "Price EX-WORKS FTWZ WAREHOUSE CHENNAI (2 NOS)" /
  "US$ 105100.00", and with no machines -> no line. `bench --site manav.local migrate` over SSH:
  completed. No PDF rendered on the server; not checked in a browser.
- Pending: reprint 26DPI00002 and a Final PI to check the line's place and look.

**Draft PI / Final PI: price basis as "Price Type" + "Port" (defaults EX-WORKS FTWZ / WAREHOUSE CHENNAI), editable.**

- Reason: the user asked for "EX-WORKS FTWZ WAREHOUSE CHENNAI" as the default with an option to set
  it, and showed the old program, where it is entered under "Final price with" as Price Type and Port.
- Changes:
  - New fields **Price Type** (`custom_price_type`) and **Port** (`custom_price_port`) on Draft PI
    (`draft_pi.json`) and Sales Order (custom fields, `erpnext_fields.py`, allow on submit); copied
    Draft PI -> Final PI (`pi.FINAL_PI_HEADER_FIELDS`).
  - `pi.fill_price_basis`: fills both only when both are empty: an older PI's Price Basis (the old
    default text splits into the two defaults, any other text goes to Price Type), else the
    principal's Quotation Type Price Basis as Price Type, else `DEFAULT_PRICE_TYPE` /
    `DEFAULT_PRICE_PORT`. Also called by `make_draft_pi`, so a new Draft PI opens with them filled.
  - Price Basis (`custom_price_basis`, 2026-10-31) is hidden / read only ("Price Basis (old)"), kept
    for PIs not saved since.
  - `manav_proforma_invoice.html`: the price line prints "Price <Price Type> <Port> (qty UOM) ......
    US$ <amount>"; falls back to the old Price Basis, the principal's, then the default text. The
    amount is unchanged (the machine line's amount).
- Testing: local only (Windows): `py_compile` of `pi.py`, `erpnext_fields.py`, `draft_pi.py`; JSON of
  `draft_pi.json` re-parsed; `fill_price_basis` run with a stubbed `frappe` for new / user-typed / old
  default / old other / principal cases, and the template's price-basis expression rendered with
  jinja2 for type+port, type only, old basis and empty: all gave the expected text.
  `bench --site manav.local migrate` run over SSH: completed (after_migrate hooks ran, no errors
  shown).
- Not run: no database check that the fields exist, no PDF rendered, not checked in a browser.
- Pending: open a Draft PI / Final PI (hard-reload), check Price Type and Port, and print it.
  `newsite.local` not migrated.

## 2026-10-31

**Draft PI / Final PI print: "Price EX-WORKS FTWZ WAREHOUSE CHENNAI (1 NOS) ...... US$ 105100.00" under each machine.**

- Reason: the user asked for this line of the old print on both the Draft PI and the Final PI.
- Changes:
  - New field **Price Basis** (`custom_price_basis`): Draft PI (`draft_pi.json`) and Sales Order
    (custom field, `erpnext_fields.py`). Filled when empty by `pi.fill_price_basis` (Draft PI
    validate, Sales Order validate hook) with the principal's Quotation Type Price Basis, else
    `pi.DEFAULT_PRICE_BASIS` = "EX-WORKS FTWZ WAREHOUSE CHENNAI"; editable; copied Draft PI -> Final
    PI (`FINAL_PI_HEADER_FIELDS`).
  - `manav_proforma_invoice.html`: each machine gets `price_line` ("Price <basis> (<qty> <UOM>)")
    and `price_amount` ("US$"/"Rs." + the machine line's amount, plain digits as on the old print);
    PIs saved before the field existed fall back to the principal's basis / the default.
  - `manav_modern_quotation_body.html`: a bold row under a machine's points with a dotted leader,
    printed only when the PI passes `price_line` (quotation prints unchanged).
- Testing: `py_compile` on the server; `bench --site manav.local migrate` (both fields created);
  PDFs of 26FPI00001 and 26DPI00002 rendered and checked as images (line under each machine, dots,
  amount right). End-to-end suite on manav.local (rolled back): 78/78 passed, including "quotation
  prints have no price line" and Price Basis filled / copied.
- Pending: none of the Quotation Types has a Price Basis yet, so every PI prints the default; set
  one per principal (or edit Price Basis on the PI) where another basis applies (e.g. CIF).

**Final PI with a Draft PI quantity above the quotation's can be submitted; new leads open in USD.**

- Reason: an end-to-end test run on manav.local found two problems: (1) a quantity raised on the
  Draft PI stopped its Final PI from being submitted (ERPNext `OverAllowanceError`, Stock Settings
  over-delivery allowance 0%); (2) new leads got INR instead of the lead's USD default, because
  Frappe fills a Link field from the site's global default of the same name (`currency` = INR)
  before the field's own default.
- Changes:
  - `pi.py` `allow_draft_pi_quantities` + `hooks.py` (Sales Order `before_submit`): for a Final PI
    made from a Draft PI, ERPNext's quantity check against the quotation is switched off with its
    own `validate_qty: False` option on the Quotation Item status updater. Ordered Qty is still
    updated and the quotation still becomes "Ordered". Other Sales Orders and the site-wide
    allowance are unchanged.
  - `manav_lead.js` `onload`: a new lead whose currency is the global default is set to the
    Currency field's default (USD). A currency picked by the user, or brought by a duplicate, is kept.
- Testing: `py_compile` (pi.py, hooks.py) and `node --check` (manav_lead.js) on the server; cache
  cleared. End-to-end test script (Quotation, 6 quotation prints + Draft PI + Proforma Invoice
  HTML/PDF, Draft PI, Final PI incl. qty above the quotation, Lead, Visit, dashboard API) run on
  manav.local in a rolled-back transaction: 68/68 passed, 0 test records left. The lead form's USD
  default (JavaScript) was not tested in a browser.
- Pending: open a new Manav Lead in the browser to confirm USD (hard-reload first). A Sales Order
  without a Draft PI keeps ERPNext's check (by design; not re-tested).

**Sidebars: "Draft PI" and "Final PI" links under Quotation.**

- Reason: the user asked for Draft PI and Final PI in the sidebar next to Quotation.
- Changes: `workspace_sidebar/manav.json`, `bangalore.json`, `chennai.json`, `coimbatore.json`,
  `ftwz.json`: two top-level links after Quotation: "Draft PI" (doctype Draft PI, icon
  `notepad-text-dashed`) and "Final PI" (doctype Sales Order, icon `file-check`). `modified` set to
  2026-10-31 so `bench migrate` reloads the sidebars from the files.
- Testing: JSON files re-parsed by the edit script; icon names checked in Frappe's lucide sprite.
  `bench --site manav.local migrate` run over SSH: completed; the database shows Draft PI (idx 3)
  and Final PI (idx 4) in all five sidebars. Not viewed in a browser.
- Pending: hard-reload the browser. `newsite.local` not migrated.

## 2026-10-30

**Lead Management: Lead Dashboard restyled (attractive stat tiles + charts).**

- Reason: the user asked for a fantastic, attractive and effective dashboard.
- Changes:
  - `manav_lead_dashboard.js`: KPI stat tiles with a coloured icon, big number and a sub-line
    (Total Leads +this month, Qualified %-of-leads, Converted conversion %, Visits Today +this month,
    Pending Follow-ups with overdue in red), hover lift, responsive grid, and four charts in cards
    (status donut, source bar, visits-per-month spline-area line, engineers bar). Theme-aware.
  - `lead_api.py` `get_dashboard`: added leads-this-month, qualified count and qualified % to the
    conversion block for the new sub-lines.
- Testing: `py_compile`, `node --check`; `get_dashboard()` on manav.local returned the enriched block.
  Cache cleared. Not viewed in a browser.
- Pending: hard-reload once. Uses the desk's bundled frappe.Chart.

**Lead Management: Lead Dashboard rebuilt with KPIs and charts.**

- Reason: the user asked for a dashboard.
- Changes:
  - `lead_api.py`: new `get_dashboard()` - lead status counts, conversion (leads / converted / %), visit
    figures (today, this month, pending and overdue follow-ups) and data for four charts. All via
    `frappe.get_list`, so a salesperson sees only their own leads / visits.
  - `page/manav_lead_dashboard/manav_lead_dashboard.js`: rebuilt - status cards (unchanged, click opens
    the lead list), a KPI row (Visits Today / This Month, Pending & Overdue Follow-ups -> Follow-up
    Tracker, Conversion %), and four frappe.Chart graphs (leads by status donut, leads by source bar,
    visits per month line, visits by sale engineer bar). Refresh redraws.
- Testing: `py_compile`, `node --check`; `get_dashboard()` on manav.local returned the right counts,
  conversion, visit figures and six-month chart labels. Cache cleared. Not viewed in a browser.
- Pending: hard-reload once. Charts use the desk's bundled frappe.Chart.

**Lead Management: four new reports.**

- Reason: the user asked for good reports; the existing ones were plain lists.
- Changes (all Script Reports under `manav/manav/report/`, each with filters, linked in the Lead
  Management sidebar; all use `frappe.get_list`, so a salesperson sees only their own data):
  - `Manav Followup Tracker`: pending follow-up visits (open follow-up ToDos) with Next Visit Date and
    days overdue; overdue rows red, due-today orange; filters sale engineer / location / overdue-only.
  - `Manav Salesperson Performance`: per sale engineer over a date range - visits, days worked, leads,
    qualified, converted (lead with a Quotation), conversion %, follow-ups pending.
  - `Manav Lead Funnel`: leads grouped by status / source / location / sector / type / business size,
    with qualified, converted and conversion %, and a Total row.
  - `Manav Visit Analysis`: visits grouped by sale engineer / reason / location / check-in date, with
    checked-out count and, for managers only, within / outside the customer location.
- Testing: `py_compile`, `node --check`, JSON load for all four; migrate on manav.local; each report's
  execute() ran on seeded data (rolled back) and returned the right columns and rows. Not viewed in a
  browser.
- Pending: hard-reload once to see the sidebar links. Location columns in Visit Analysis show only to
  System Manager / Sales Manager / Manav Management.

**Manav Visit: remind until follow-up is done; Lead Settings email toggle (off for now).**

- Reason: the reminder should go the day before and, if the follow-up is still not done, keep going on
  the due day and after; and the email should be switchable - off while testing.
- Changes:
  - `manav_visit.py` `send_followup_reminders`: now reminds for open follow-up ToDos due tomorrow, today
    or overdue (date <= tomorrow), once per follow-up per day, until the visit is made (ToDo closed). The
    subject says tomorrow / today / overdue. An e-mail is sent only when the new setting is ticked and an
    outgoing account exists; the bell notification is always sent.
  - New Single DocType `Manav Lead Settings` with "Send Follow-up Reminder Email" (default OFF). Linked in
    the Lead Management sidebar under a new Settings group.
- Testing: `py_compile`, JSON load; migrate on manav.local. On the server (rolled back, three separate
  leads): day-before, due-day and overdue each produced the right bell notification; a second run did not
  duplicate; the setting read 0 and 0 e-mails were queued.
- Pending: the e-mail option is OFF now (testing) - no mail is sent. Turn it on in Lead Management ->
  Lead Management Settings when ready (needs an outgoing Email Account). Reminders need the scheduler on.

**Manav Visit: follow-up reminder the day before the next visit.**

- Reason: the follow-up ToDo lands on the Next Visit Date itself; the user wanted the notification a day
  earlier - if the next visit is tomorrow, remind today.
- Changes:
  - `manav_visit.py`: `send_followup_reminders()` (daily) finds the open follow-up ToDos due tomorrow and
    sends each sale engineer a desk (bell) Notification Log today; `notify_followup()` builds it and skips
    a duplicate the same day. Tied to the open ToDos, so a lead already revisited is not reminded.
  - `hooks.py`: `scheduler_events` daily -> send_followup_reminders.
- Testing: `py_compile`; migrate registered the Scheduled Job Type. On manav.local (rolled back): a visit
  with Next Visit Date = tomorrow created the notification today; a second run did not duplicate it; a
  visit 3 days out got none. Not seen in the browser bell.
- Pending: a desk notification (no e-mail). The site scheduler must stay enabled (it is now). If e-mail
  reminders are also wanted, an outgoing Email Account is needed.

**Manav Visit: photo options moved to buttons on the form body.**

- Reason: the camera options were in a top-right Take Photo menu, which the user found confusing; the
  Lead's visiting card uses body buttons.
- Changes:
  - `manav_visit.json`: Button fields under each photo - Front: Take Photo / Upload File, Back: Take
    Photo / Upload File.
  - `manav_visit.js`: handlers for the four buttons (via manav.photo.capture); the top-right Take Photo
    menu is removed. The photo fields still show their own Attach and preview.
- Testing: `node --check`, JSON field order passed; migrate on manav.local. Not tried in a browser.
- Pending: hard-reload the browser once.

**Manav Lead: Scan Now button shown in white.**

- Reason: the user asked for the Scan Now button to be white so it stands out.
- Changes: `manav_lead.js` styles the body Scan Now button white (dark text, light border, bold) in
  refresh.
- Testing: `node --check` passed; cache cleared. Not tried in a browser.

**Manav Lead: visiting card image fields made visible again (not read-only).**

- Reason: as read-only, an empty Attach Image rendered nothing (the Front field disappeared, leaving only
  its buttons) and a filled one showed the raw file path instead of the picture.
- Changes:
  - `manav_lead.json`: the Visiting Card (Front) and (Back) fields are no longer read-only, so each shows
    its label and an image preview. The scan buttons and Scan Now stay.
- Testing: migrate on manav.local; both fields read back read_only = 0. Not tried in a browser.
- Pending: the fields' own "Attach" button is back too; on a brand-new lead it tries to save and will ask
  for the mandatory fields - use the Take Photo / Upload File buttons to avoid that. Hard-reload once.

**Manav Lead: a Scan Now button; upload no longer reads straight away.**

- Reason: the user asked for a Scan Now button after uploading a card.
- Changes:
  - `manav_lead.json`: a Scan Now button in its own row at the bottom of the Visiting Card section.
  - `manav_lead.js`: uploading a side now only stores it (with a "click Scan Now" hint); Scan Now
    (body button and top-right menu) reads the front and back together in one call, and warns if no
    card was uploaded.
- Benefit: for a two-sided card the AI is now called once (both sides), not once per side.
- Testing: `node --check`, JSON field order passed; migrate on manav.local. The server read (front +
  back merged) was tested earlier. Not tried in a browser.
- Pending: hard-reload the browser once to get the updated form.

**Manav Lead: visiting card scan buttons on the form body too.**

- Reason: after the field was made read-only the only scan buttons were in the top-right menu, which was
  hard to find.
- Changes:
  - `manav_lead.json`: four Button fields in the Visiting Card section - Front: Take Photo / Upload File
    under the front image, Back: Take Photo / Upload File under the back image.
  - `manav_lead.js`: handlers for the four buttons (same actions as the top-right menu, which is kept).
- Testing: `node --check`, JSON field order passed; migrate on manav.local. Not tried in a browser.
- Pending: hard-reload the browser once to get the updated form.

**Manav Lead: visiting card - read front and back together.**

- Reason: some cards have the phone, e-mail or address only on the back; one side missed them.
- Changes:
  - `manav_lead.json`: new Visiting Card (Back) image field beside the front one (both read-only).
  - `manav_lead.js`: the Visiting Card menu now has Front / Back, each with Take Photo and Upload File.
    After a picture is added, both sides present are sent to the AI together.
  - `visiting_card.py`: `read_visiting_card` takes a list of file URLs (front and back) and sends both
    in one request; the model merges them into a single set of details. A single `file_url` still works.
- Testing: `py_compile`, `node --check`, JSON field order passed; migrate on manav.local. On the server
  (rolled back): a front with only the name / company, and a back with the phone / e-mail / address /
  GSTIN, read front-only = name + company; front + back = all fields merged correctly. Not tried in a
  browser.
- Pending: adding the back after the front triggers a second AI read (the first was front-only); each
  read is paid for on the OpenAI key. Hard-reload the browser once to get the updated form.

**Manav Lead: visiting card scan did nothing - field made read-only, use the buttons.**

- Reason: on a new lead, clicking the Visiting Card field's built-in "Attach" did nothing (no AI). Two
  causes: the browser was running an old copy of the lead form (before the scan feature), so the
  "Visiting Card -> Take Photo / Upload Card" buttons and the field-change scan were absent; and
  Frappe's built-in Attach control calls `frm.save()` right after upload, which fails on a new lead
  because the required fields are still empty (so the scan never ran).
- Changes:
  - `manav_lead.json`: the Visiting Card field is now read-only, so the only way to add a card is the
    Take Photo / Upload Card buttons (which upload without forcing a save and then run the AI). The
    built-in Attach button, and its broken save-on-new-lead, are gone. Description updated.
- Testing: migrate on manav.local; the field reads back read-only; the form meta still serves the scan
  script. The server path (read_visiting_card on an uploaded File) was tested earlier and read a test
  card correctly. Not tried in a browser.
- Pending: the browser must be hard-reloaded (Ctrl+Shift+R) once to pick up the current lead form; the
  old cached form is why nothing appeared.

**Manav Visit: Front / Back photos with upload and phone-camera capture.**

- Reason: the user asked for front and back photo upload on a visit, plus a take-photo-from-the-phone-
  camera option.
- Changes:
  - `manav_visit.json`: new "Photos" section with Front Photo and Back Photo (Attach Image), after the
    customer details and before Check In. Visible to everyone (salespeople take the photos).
  - New `public/js/manav_photo.js`: `manav.photo.capture(frm, fieldname, use_camera)` opens the phone's
    back camera (`<input capture="environment">`, works on http:// unlike the mediaDevices camera),
    shrinks the picture to 1600 px JPEG, uploads it as a private file and stores it in the field.
  - `manav_visit.js`: a "Take Photo" button group with Front Photo / Back Photo (camera). Upload from a
    file is the Attach Image fields' own built-in option.
  - `hooks.py`: the Manav Visit form now loads both `manav_visit_position.js` and `manav_photo.js`.
- Testing: `node --check`, `py_compile`, JSON field order passed; `bench --site manav.local migrate`
  added both columns (confirmed in the db); the helper is served through the asset symlink; cache
  cleared. Not looked at in a browser or on a phone.
- Pending: none known. The camera uses the phone's native file-capture, so it needs no HTTPS.

**Manav Visit: the captured location is hidden from salespeople (managers only).**

- Reason: the user asked that a visit does not show the salesperson that their location is tracked.
- Changes:
  - `manav_visit.js`: the Check In / Check Out / Map / Customer Location sections, the coordinates,
    the distance, the location check and the DIGIPIN are shown only to System Manager, Sales Manager
    and Manav Management. A Sales User sees a plain visit (lead, reason, description, status, next
    visit date, Check Out button) with no sign of a position. The GPS is still read and saved in the
    background on the first save; only the display is hidden (set_df_property hidden by role).
  - `manav_visit_register.py`: the Location Check and Distance columns are returned only to those
    manager roles; a salesperson's report has neither the columns nor the data.
- Testing: `node --check`, `py_compile` passed; `get_columns(True/False)` returns the location
  columns only for managers (confirmed on manav.local). Cache cleared. `bench build` does not run on
  this server (its Node is v18, the framework wants v24), but these files need no build - the doctype
  JS loads directly and the helper is served through the asset symlink. Not looked at in a browser
  as each role.
- Pending: the browser's own one-time "allow location" prompt cannot be hidden (a browser feature);
  the hide is at the form / report display level, so the position is still stored on the visit and a
  manager (or the API) can read it.

**Manav Visit rebuilt like My Visit Monitor (GPS check-in / check-out, map, location check).**

- Reason: the user asked for visits to look like My Visit Monitor's MVM Visit Entry, with everything
  automated. Built inside the manav app (modelled on my_visit_monitor's code, no dependency on it).
- Changes:
  - `manav_visit.json`: layout of MVM Visit Entry: Lead (company, contact, mobile, location fetched),
    Reason of Visit, Visit Description | Sale Engineer, Status (Checked In / Checked Out), Next Visit
    Date, Digipin; sections Check In, Check Out, Map, Customer Location. The old Visit Date, Check-in /
    Check-out Datetime, Latitude / Longitude and Remarks fields are gone (no visits existed).
  - `manav_visit.py`: first save = check-in (date, time, sale engineer = user, GPS from the form);
    customer point from the lead, else its address looked up on OpenStreetMap; distance and a
    500 m check (green Inside / red Outside with a warning; "approximate" without warning when only
    the area was found); DIGIPIN of the check-in point; `check_out()` / `check_out_visit()`;
    Next Visit Date -> ToDo of the salesperson, a new visit to the lead closes earlier follow-up
    ToDos; `use_checkin_as_customer_location()` for System / Sales Manager and Manav Management.
  - New `manav/manav/visit_location.py`: distance, OpenStreetMap (Nominatim) lookup with shortened
    addresses, India Post DIGIPIN.
  - New `public/js/manav_visit_position.js` (loaded for Manav Visit form and list in `hooks.py`):
    best GPS position within 10 s, accuracy warning, check-out call.
  - `manav_visit.js`: check-in on save, red Check Out, map (green / red / blue marks with legend),
    coloured location checks, Set as Customer Location. `manav_visit_list.js`: Checked In / Out
    colours and a red Check Out row button.
  - Manav Lead: collapsible Customer Location section (Latitude, Longitude).
  - Manav Visit Register report: check-in date / in / out times, location check and distance.
- Testing: `py_compile` / `node --check` / JSON field order on the server passed. DIGIPIN of India
  Post's example point (28.622788, 77.213033) = 39J-49L-L8T4 as published; distance of the
  screenshot's points = 133 m as MVM showed. `bench --site manav.local migrate` without errors. On
  manav.local, in a transaction rolled back afterwards: check-in (3.6 s with lookup), approximate
  area match, check-out, Set as Customer Location, a second visit "Within 500 m" (31 m) closing the
  first visit's ToDo, a far visit "Not within ... 11910 m", a visit without GPS, the report. Not
  looked at in a browser or on a phone.
- Pending: GPS is only given to HTTPS pages; on http:// visits are saved without a position
  ("Check-in location was not captured"). Addresses are sent to OpenStreetMap at check-in when the
  lead has no location.

**Lead Management: scan a visiting card into a lead (OpenAI).**

- Reason: the user asked that a salesperson takes a photo of / attaches a visiting card and the AI
  fills the lead.
- Changes:
  - Manav Lead (`manav_lead.json`): new "Visiting Card" section with an Attach Image field
    (`visiting_card`) at the top of the form.
  - `manav_lead.js`: "Visiting Card" menu with Take Photo (`<input capture>`: opens the phone
    camera, also on http://) and Upload Card. The photo is shrunk to 1600 px JPEG, uploaded as a
    private file into the field, and read; attaching a picture straight into the field reads it
    too. Company, Contact Person, Contact Position, Mobile, E-mail, Website and Address are filled
    from the card; other phones and GSTIN are added to Other Information Notes.
  - Manav Lead: new fields Address (Small Text, under Location) and Website (Data / URL, under
    Email ID) in the Customer section, on the user's request.
  - New `manav/manav/visiting_card.py`: `read_visiting_card(file_url)` (whitelisted, POST) checks
    lead create/write and file read permission, sends the picture to OpenAI Chat Completions with
    a strict JSON schema, and returns the card details. Key, model and effort come from
    `get_ai_settings()` (same as Draft with AI).
  - Site data (manav.local, on the user's request): the OpenAI key the user gave was stored
    encrypted in Manav AI Settings. It now wins over site_config's `openai_api_key`, so Draft with
    AI uses it too.
- Testing: `py_compile`, `node --check`, JSON load on the server passed. `call_openai` with a
  generated test card on manav.local (gpt-5-mini, effort low): all ten fields read correctly in
  7.7 s. Not migrated; the form buttons, upload and camera were not tried in a browser or phone.
- Pending: `bench --site manav.local migrate` for the new field. The key was pasted in chat and
  should be rotated at platform.openai.com, then re-entered in Manav AI Settings.

**Lead Management: Visits in the sidebar; clearer location error on Manav Visit.**

- Reason: "Visits" did not show in the Lead Management sidebar, and Capture Location only said
  "Could not read the location" with no cause.
- Changes:
  - `manav/workspace_sidebar/lead_management.json`: `modified` bumped to 2026-10-30. Frappe
    re-imports a Workspace Sidebar on migrate only when the file's `modified` is newer than the
    database copy (no hash check, unlike DocTypes), so the Visits rows added later were skipped.
  - `manav/manav/doctype/manav_visit/manav_visit.js`: `capture_location` says when the page is not
    on HTTPS (browsers refuse geolocation on http://; the bench serves http on port 8005), and on
    a failure names the cause (permission blocked, position unavailable, timeout); on timeout /
    unavailable it retries once without high accuracy (desktops without GPS).
  - Server: the Lead Management files had been created as Linux user support03 and could not be
    edited; the user changed their owner to support02 (41 files, apps/manav only).
- Testing: `node --check manav_visit.js` on the server passed; no file in apps/manav is owned by
  anyone but support02 any more. Not migrated and not looked at in a browser.
- Pending: `bench --site manav.local migrate` for the sidebar. Real GPS capture needs the site on
  HTTPS (or a browser flag for testing).

## 2026-10-29

**CIF defaults per principal.**

- Reason: the user asked for the CIF port and the rest to be filled in by default.
- Changes:
  - Quotation Type (`quotation_type.json`): "CIF by Default" (`cif_default`), "Default CIF Port"
    (`cif_port`), "Default CIF Charges" (`cif_charges`), after Price Basis.
  - `manav/manav/quotation.py`: `get_type_defaults` returns them; `fill_cif_defaults` (Quotation
    validate in `hooks.py`, Draft PI validate) fills an empty CIF Port / Charges of a document
    ticked CIF; typed values are kept.
  - `manav/public/js/quotation.js`: choosing a principal that is CIF by default ticks CIF; ticking
    CIF fills an empty port / charges. `draft_pi.js`: the same for the Draft PI's CIF tick.
- Testing: `py_compile`, `node --check`; `bench --site manav.local migrate` without errors, the
  three fields on the site; `fill_cif_defaults` on 26QX000082 in memory with a principal port
  stubbed as "Chennai Sea Port": empty port filled, typed "Mumbai Air Port" kept, not CIF left
  alone. Not looked at in a browser.
- Site data (manav.local, after the user's "not coming in quotation" and their go-ahead): Quotation
  Type 1 MACHINES set to CIF by Default, Default CIF Port "Chennai Sea Port" (no default charges);
  `get_type_defaults("1")` read back with these values. Before, no principal had defaults, so
  nothing was filled. Other principals have none.
- Pending: "CIF by Default" ticks CIF only in the form when the principal is chosen; a quotation
  made without the form (import, API) is not ticked. Not looked at in a browser.

**CIF Charges amount and port (Quotation, Draft PI, Final PI); Quotation's CIF moved.**

- Reason: the user asked to move the quotation's CIF tick under Customer Ref. Date and, once CIF is
  ticked, to enter an amount, printed as on the old quotation ("CIF Charges - Chennai Sea Port ...
  US$ 5500.00", screenshot).
- Changes:
  - `manav/manav/erpnext_fields.py`: Quotation CIF after Customer Ref. Date; Quotation and Sales
    Order "CIF Charges" (`custom_cif_charges`) and "CIF Port" (`custom_cif_port`), shown only when
    CIF is ticked. Draft PI `cif_charges`, `cif_port` (`draft_pi.json`).
  - `manav/manav/pi.py`: copied Quotation -> Draft PI (`field_map`) -> Final PI.
  - Prints: "CIF Charges - <port>" and the amount added to the printed grand total in Manav Modern
    Quotation, Manav Modern Quotation CIF (TOTAL, CIF Charges, GRAND TOTAL (CIF)), Classic / Colour
    / Banded (`manav_quotation_data.html`, amount in words follows) and the PI template (TOTAL, CIF
    Charges, GRAND TOTAL (CIF); with an advance, Less: Advance Received and BALANCE (CIF)).
- Testing: `bench --site manav.local migrate` without errors; fields read back; on the site with
  CIF Charges 5,500 / "Chennai Sea Port" set in memory (rolled back): Modern "GRAND TOTAL (CIF):
  $ 2,48,384.62"; Modern CIF "TOTAL $ 2,42,884.62, CIF Charges $ 5,500.00, GRAND TOTAL (CIF)
  $ 2,48,384.62"; Classic "CIF Charges - Chennai Sea Port US$ 5,500.00, Total US$ 2,48,384.62";
  Draft PI made from the quotation copies the three values; Draft PI print with advance 10,000:
  BALANCE (CIF) $ 2,38,384.62. Not looked at in a browser; Banded and Colour not printed.
- Pending: the CIF amount is added on the prints only; ERPNext's own totals (quotation, Sales
  Order, dashboard figures, invoices) do not include it. Banded prints no "Tax / Duties: As
  Applicable" row when the CIF line is its only charge line.

**Quotation: CIF option.**

- Reason: the user asked for the CIF tick on the quotation too.
- Changes: Quotation custom field "CIF" (`custom_is_cif`, after Final PI No., `erpnext_fields.py`);
  `pi.make_draft_pi` copies it into the Draft PI's CIF (`field_map`); print format Manav Modern
  Quotation prints "GRAND TOTAL (CIF)" when ticked. The other quotation print formats are unchanged
  (Manav Modern Quotation CIF always says CIF).
- Testing: `bench --site manav.local migrate` without errors; on the site, in a transaction rolled
  back afterwards: 26QX000082 prints "GRAND TOTAL: $ 2,42,884.62", ticked "GRAND TOTAL (CIF):
  $ 2,42,884.62"; a Draft PI made from it has CIF ticked. Not looked at in a browser.
- Pending: Classic, Banded, Colour and Sales Quotation prints do not show CIF.

**PI: CIF option.**

- Reason: the user asked for a CIF option on the PI; chosen with the user: a tick box and the
  label only (prices print as before).
- Changes: Draft PI "CIF" (`is_cif`, `draft_pi.json`); Sales Order custom field "CIF"
  (`custom_is_cif`, allow on submit, `erpnext_fields.py`), copied from the Draft PI by
  `pi.make_final_pi`; `manav_proforma_invoice.html` prints "TOTAL (CIF)" / "BALANCE (CIF)" when
  ticked.
- Testing: `bench --site manav.local migrate` without errors; `frappe.get_print` on the site with
  the values set in memory (not saved): 26DPI00001 CIF -> "TOTAL (CIF): $ 2,42,884.62"; CIF with
  advance 10,000 -> TOTAL (CIF), "Less: Advance Received: - $ 10,000.00", "BALANCE (CIF):
  $ 2,32,884.62"; 26FPI00001 CIF -> "TOTAL (CIF): $ 2,74,700.00", not CIF -> "TOTAL". Not looked
  at in a browser.
- Pending: none known.

**Customer Dashboard page.**

- Reason: the user asked for a customer dashboard showing all information about a customer, the
  admin choosing the customer from a drop-down.
- Changes:
  - `manav/manav/page/customer_dashboard/` (new): desk page /desk/customer-dashboard. Customer
    drop-down (also `?customer=<name>`), buttons Open Customer / New Quotation. Shows the
    customer's head, key figures (quotations, quoted value, conversion, Draft / Final PIs, ordered
    value, invoiced, outstanding, received; company currency, quoted / ordered before taxes), a
    12-month quoted vs ordered chart (frappe.Chart), and lists of Quotations, Draft PIs, Final PIs,
    Sales Invoices, Payments, Machines (Serial Nos), Contacts, Addresses, old Contact Persons and old
    quotations (Quotation Head), plus every filled field of the Customer form. Rows open their
    documents.
  - `manav/manav/customer_dashboard.py` (new): `get_customer_dashboard`, management only
    (`desk_home.is_management`); records read with `frappe.get_list` (reader's permissions).
  - `manav/workspace_sidebar/{manav,bangalore,ftwz,chennai,coimbatore}.json`: "Customer Dashboard"
    under Customer.
- Testing: `py_compile`, `node --check`; `bench --site manav.local migrate` without errors; on the
  site: page and sidebar links present; `get_customer_dashboard("MERRITRONIX LIMITED")` as
  Administrator returned the figures (1 quotation, 1 Draft PI, 1 Final PI), 28 detail fields,
  2 contacts, 1 address, 1 old contact person, the chart. Not looked at in a browser.
- Pending: users outside management see the sidebar link but get "for management only".
- Later the same day: the "Customer Details" card (every filled field of the Customer form) was
  removed at the user's request (`customer_dashboard.js`, `customer_dashboard.py`
  `customer_details`). Checked: `get_customer_dashboard` for Z AXIS on the site returns no
  details; `node --check` / `py_compile` pass. Not looked at in a browser.
- Later the same day: tabs under the customer's head, at the user's request
  (`customer_dashboard.js`): Overview (key figures, chart), Quotations & PIs, Invoices &
  Payments, Machines, Contacts & Addresses, Old Records, each with its row count; a tab whose
  lists the reader may not see is left out; the chosen tab stays when another customer is chosen;
  the chart is drawn when Overview is shown. Checked: `node --check`. Not looked at in a browser.
- Later the same day (user: "not looking good", screenshot of Quotations & PIs): the lists of a
  tab are one under the other at full width (were up to three side by side, cut off, scrolling
  sideways); roomier rows; Principal shows the name (`add_principal_names`: Z AXIS's quotations
  show MACHINES instead of 1, checked on the site); "Not Submitted" red; empty lists say
  "No ... yet". Checked: `py_compile`, `node --check`. Not looked at in a browser.

**PI print: advance received.**

- Reason: the user asked that when the customer has paid an advance, the PI print shows the total,
  minus the advance, and then the total to pay.
- Changes:
  - `manav/templates/print_formats/manav_proforma_invoice.html`: with an advance, TOTAL, "Less:
    Advance Received", BALANCE; without, TOTAL only as before. Advance on the Final PI: ERPNext's
    Advance Paid (Payment Entries against the Sales Order; converted from company currency to the
    PI's), else the hand-typed Advance Received; on the Draft PI its Advance Received.
  - `manav/templates/print_formats/manav_modern_quotation_body.html`: optional `subtotal_label`.
  - Draft PI field "Advance Received" (`advance_received`, `draft_pi.json`); Sales Order custom field
    "Advance Received" (`custom_advance_received`, allow on submit, `erpnext_fields.py`), copied from
    the Draft PI by `pi.make_final_pi`.
- Testing: template rendered locally with a stubbed `frappe`: Draft PI with 10,000 advance -> TOTAL
  274,700.00 / Less 10,000.00 / BALANCE 264,700.00; Final PI with Advance Paid INR 9,49,000 at 94.9
  -> Less $ 10,000.00; no advance -> TOTAL only. After migrate, `frappe.get_print` of 26DPI00001
  and 26FPI00001 on the site (no advance): TOTAL only, no tax rows. Not printed with an advance on
  the site, not looked at in a browser.
- Pending: none known.

**Draft PI: sub-items at their machine's price, not converted.**

- Reason: the user asked for the PI to print in its own currency (USD or INR). Draft PI 26DPI00001
  (USD) printed sub-items at INR prices converted to USD (10K-40T-GBX 146.47 instead of 13,900;
  total 242,884.62), copied from quotation 26QX000082; its Final PI 26FPI00001 had the right
  prices (274,700.00), as the Sales Order applies `keep_sub_item_rates`.
- Changes: `manav/manav/doctype/draft_pi/draft_pi.py` validate runs `quotation.keep_sub_item_rates`
  (with a `calculate_taxes_and_totals` method for it); `manav/manav/pi.py` `make_draft_pi` does
  the same when the Draft PI is made.
- Testing: `py_compile`; on manav.local `make_draft_pi("26QX000082")` built in memory (not saved):
  sub-items 13,900 / 8,500 / 3,500 / 200 / 10,000 / 2,600, total $ 2,74,700.00 = the Final PI's.
- Pending: the saved 26DPI00001 still holds the converted prices (it is closed, its Final PI
  exists) and quotation 26QX000082 too (submitted); neither was changed. USD amounts are grouped
  the Indian way (2,74,700.00) because the USD Currency has no number format of its own.

**Draft PI in ERPNext's Selling sidebar, between Quotation and Sales Order.**

- Reason: the user asked for Draft PI between Quotation and Sales Order in the sidebar.
- Changes: `manav/manav/desk_home.py` `add_draft_pi_to_selling_sidebar` (in `after_migrate`,
  `manav/hooks.py`): adds one Workspace Sidebar Item "Draft PI" after Quotation in the site's
  Selling sidebar and moves the rows after it down. ERPNext's `selling.json` is not edited, and the
  sidebar is not saved as a whole, because with developer_mode on that writes ERPNext's file.
- Testing: run twice with `bench --site manav.local execute` on the server: the first run failed
  (copied row had no docstatus; nothing was committed), fixed; then the sidebar reads Home,
  Dashboard, Quotation, Draft PI, Sales Order, Sales Invoice ...; one Draft PI row after the second
  run; `git status` of ERPNext's workspace_sidebar folder clean. Not looked at in a browser.
- Pending: the Manav and branch sidebars (what non-admin users see) have no Draft PI link.

**Draft PI as a document of its own (Manav doctype); the Sales Order is the Final PI; no taxes on
the PI prints.**

- Reason: the user asked for the Final PI to be the Sales Order, with one more step, the Draft PI,
  as a separate document (not a Sales Order), and a different number for each of Quotation, Draft
  PI and Final PI, each referring to the others. Later the same day the user asked to remove the
  taxes from the print of both PIs. (An earlier version of the same day kept the Draft PI as a
  Sales Order with a "PI Stage"; the user rejected it and it was replaced before it reached the
  server. Its custom fields are deleted on migrate where a site has them.)
- Changes:
  - `manav/manav/doctype/draft_pi/` and `draft_pi_item/` (new): doctype Draft PI (Manav module,
    numbered `26DPI00001`: financial year, DPI, five-digit running number) with Draft PI Item.
    Field names are those of Quotation / Sales Order (custom_ ones included), so values copy by
    name and the PI print template works on it. Amounts and Total (before taxes) worked out on
    save, sub-items numbered as on the quotation, status Draft / Final PI Made; closed for changes
    once its Final PI exists. Form (`draft_pi.js`): live amounts, rates of added lines (price list,
    or the machine's sub-item price), "Make Final PI"; list labels (`draft_pi_list.js`).
  - `manav/manav/pi.py`: `make_draft_pi` (Quotation -> Draft PI, `get_mapped_doc`; Lead/Prospect
    quotations keep the name only, the Customer is made with the Final PI); `make_final_pi`
    (Draft PI -> Sales Order through ERPNext's own `make_sales_order`, so taxes, addresses, payment
    terms and the quotation checks are ERPNext's; lines replaced by the Draft PI's, keeping their
    quotation links so the quotation becomes Ordered on submit); `get_draft_pi_item_rate`; Sales
    Orders numbered `26FPI00001` (`autoname`); references kept by `link_pi_documents` /
    `unlink_pi_documents` (also on cancel, which frees the Draft PI again).
  - `manav/manav/erpnext_fields.py`: Sales Order "Draft PI No." (`custom_draft_pi`, Link to Draft
    PI); Quotation "Draft PI No." (`custom_draft_pi_no`, new) and "Final PI No." (`custom_pi_no`,
    was "PI No."). Obsolete `custom_pi_stage` / `custom_final_pi` deleted on migrate.
  - `manav/hooks.py`: Sales Order `autoname`, `on_cancel`, new link hooks.
  - `manav/public/js/quotation.js`: the quotation's "Make Draft PI" makes a Draft PI; a draft
    Sales Order says "Final PI, not yet submitted".
  - `manav/public/js/sales_order_list.js`: "Final PI: Not Submitted" / "Final PI: <status>".
  - `manav/templates/print_formats/manav_proforma_invoice.html` (new, the HTML moved out of the
    print format): shared by print formats Manav Proforma Invoice (Sales Order) and Manav Draft PI
    (new, `manav/manav/print_format/manav_draft_pi/`, default of Draft PI). DRAFT PROFORMA INVOICE
    / Draft PI No. on the Draft PI; PROFORMA INVOICE / PI No. and "Against Draft PI No." on the
    Final PI. No taxes on either: no subtotal, tax rows or "Tax / Duties: As Applicable"; one TOTAL
    row with the total before taxes.
- Testing (local, Windows): `py_compile` of all changed Python files; `node --check` of the four
  JS files; all JSON files load; the shared template rendered with a stubbed `frappe` for a Draft
  PI and a Sales Order (title, number label, both "Against ..." lines, TOTAL = total before taxes,
  no tax / subtotal rows).
- Server: `bench --site manav.local migrate` ran without errors; read back on the site: doctypes
  Draft PI and Draft PI Item, print formats Manav Draft PI (Draft PI) and Manav Proforma Invoice
  (both modified 2026-10-29), the custom fields above (Quotation "Final PI No."), the obsolete
  custom_pi_stage / custom_final_pi absent, default print formats set.
- Not tested yet in a browser: Make Draft PI, editing it, Make Final PI, submitting, cancelling,
  the prints.
- Pending: Sales Orders made before keep their SAL-ORD-... names; draft ones made as "Draft PI" on
  2026-10-28 now count as Final PIs not yet submitted. HSN Code column and payment schedule are
  still printed on the PIs. Quotation's Connections tab does not list Draft PIs (Draft PI No. on the
  quotation does).

## 2026-10-28

**Quotation form: Total Taxes and Charges and the Totals section hidden.**

- Reason: the user asked to remove these from the quotation form.
- Changes: `manav/manav/erpnext_fields.py`: property setters hide Quotation's sections
  `section_break_39` (Total Taxes and Charges, both currencies) and `totals` (Grand Total,
  Rounding Adjustment, Rounded Total, In Words, Disable Rounded Total). Totals are still worked
  out by ERPNext; prints and the PI unchanged.
- Testing: `py_compile`; `bench migrate` on manav.local; property setters read back. Not looked
  at in a browser.
- Pending: none known.

**No Delivery Date on the PI.**

- Reason: the user asked to remove Delivery Date from the PI (Sales Order).
- Changes:
  - `manav/manav/erpnext_fields.py`: property setters hide Delivery Date on Sales Order and Sales
    Order Item (and take it out of their list views).
  - `manav/manav/pi.py` `fill_delivery_date` (Sales Order before_validate in `manav/hooks.py`): an
    empty Delivery Date is set to the PI's date, on the PI and its lines, because ERPNext still
    requires one ("Please enter Delivery Date").
  - `manav/public/js/quotation.js` (added after the user's first save failed): Sales Order form
    `validate` fills the empty Delivery Date of the PI and its rows with the PI's date, because
    ERPNext's form makes the Items' Delivery Date compulsory in the browser (toggle_delivery_date)
    and stopped the save with "Delivery Date is required in every row".
- Testing: `py_compile`, `node --check`; `bench migrate` on manav.local; property setters read
  back. The user's save of a Draft PI failed before the form fix; saving again not yet tested.
- Pending: the stored delivery date equals the PI date; Delivery Note planning reports will show
  that date.

**Desk home: only four branch workspaces (Bangalore, FTWZ, Chennai, Coimbatore).**

- Reason: the user asked to remove everything else from the desk home (/desk) and keep four
  workspaces like the branches, with the same content on all four for now.
- Changes:
  - `manav/manav/workspace/{bangalore,ftwz,chennai,coimbatore}/`, `manav/workspace_sidebar/<branch>.json`,
    `manav/desktop_icon/<branch>.json` (new): copies of the Manav workspace, sidebar and desktop
    icon; the page header names the branch ("Manav Marketing - FTWZ"), the sidebar's Home opens
    the branch workspace. Charts, number cards and the dashboard tabs block are shared.
  - `manav/manav/desk_home.py` `limit_desk_to_manav`: the desk home shows only the four branch
    icons for every user (admins too); non-admins may open the branch workspaces and Manav.
- Testing: `py_compile`; `bench migrate` on manav.local; workspaces, sidebars and desktop icons
  read back. Not looked at in a browser.
- Pending: the four workspaces show the same (all-branch) figures; filtering by branch would come
  later. Other modules are no longer on the desk home but still open through search (Ctrl+K)
  and links. Login still lands on the Manav Dashboard.

**Old Magic item groups imported as ERPNext Item Groups.**

- Reason: the user asked to import the old item group master (20_item_group_mst.pdf). Chosen with
  the user: groups only; items stay in their current groups (the principals' item lists on
  quotations depend on Machines / Spares / Options ...).
- Changes:
  - `manav/manav/legacy_data/item_group.json` (new): the 21 groups (code and name) from the PDF.
  - `manav/manav/import_legacy.py`: `import_item_groups` makes them under a parent group "Magic
    Item Groups", named "<code> <name>" (e.g. "01 MACHINES - 16301000"); in `import_all`.
- Testing: `py_compile`; run on manav.local: 21 groups added and read back.
- Pending: items are not assigned to these groups. The old items' group codes in 21_item_mst do
  not match the site's grouping (e.g. old group 3 SPARES also holds Options and Machines); 39
  items use codes 98 / 99, which are not in the group master.

**Login page back to Frappe's default, with the company logo shown properly.**

- Reason: the user asked for the default login page, only with the company logo shown properly.
- Changes:
  - `manav/public/css/login.css`: only the logo size is kept (login page, max 120px high /
    300px wide instead of Frappe's 32px high; first 64px / 240px, made bigger the same day at the
    user's request); background, card, button and link styles removed.
  - `manav/public/images/manav_marketing_logo.png` (new): the company logo, copied from
    manavmarketing.com (2048 x 758), so the login page no longer depends on that website.
  - Site setting on manav.local: Website Settings > App Logo = /assets/manav/images/
    manav_marketing_logo.png (was the image's address on manavmarketing.com).
- Testing: `bench migrate`; logo file and login.css served (HTTP 200); login page shows the new
  logo address. Not looked at in a browser.
- Pending: on other sites (e.g. manav.mymagicerp.com), set App Logo in Website Settings the same
  way. The App Name "Manav Marketing" and the dashboard after login stay as set earlier today.

**Better login page; Manav Dashboard opens after login.**

- Reason: the user asked for a better looking login page and for the Manav dashboard to open
  directly after login.
- Changes:
  - `manav/public/css/login.css` (new, `web_include_css` in `manav/hooks.py`): login page only
    (body[data-path="login"]): light blue background, white card with Manav-blue top border and
    shadow, larger logo, blue Sign In button and links.
  - `manav/manav/desk_home.py`: `set_app_name` (after_migrate): App Name "Manav Marketing" in
    Website Settings and System Settings while it is empty or "Frappe".
  - `manav/hooks.py`: the Manav app's route (`add_to_apps_screen`) is `/desk/manav-dashboard`;
    Frappe sends users to the Default App's route after login.
- Testing: `py_compile`; `bench migrate` on manav.local; the login page fetched from the server
  carries login.css (served) and the new App Name. Not looked at in a browser; login with a
  user not tried.
- Pending: a user whose own Default App (User form) is another app lands there instead.

**Spares quotation for the customer's machine (ERPNext Serial No).**

- Reason: the user asked for spare parts quotations for the machine the customer bought; chose
  ERPNext's Serial No as the record of customers' machines, and linked spares first plus a search
  over all spares.
- Changes:
  - `manav/manav/erpnext_fields.py`: Quotation (and Sales Order) "Customer's Machine (Serial No)"
    (custom_machine_serial_no, Link to Serial No); property setters make Serial No's Customer
    editable and a list filter (ERPNext fills it only on delivery).
  - `manav/manav/quotation.py`: `get_machine_spares(serial_no)`: the machine model and its spare
    parts from Quotation Sub Item Master (Items in group Spares).
  - `manav/public/js/quotation.js`: the machine field offers only the customer's Serial Nos and
    copies the serial into Machine Number; "Spares for Machine" button (draft with a machine)
    lists the model's linked spares; ticked ones are added as normal lines (ERPNext fetches name,
    unit and price list rate). Other spares through the Item Code search, as before.
- Testing: `py_compile`, `node --check`; `bench migrate` on manav.local; fields and property setter
  read back. 136 machine models have linked spares. Not tested in a browser; no Serial No exists
  on the site yet.
- Pending: the customers' machines must be entered as Serial Nos (serial number, machine model,
  company, customer). Old spares quotations have a machine number but no model, so they cannot be
  turned into Serial Nos automatically.

**Quotation No. on the PI, PI No. on the quotation.**

- Reason: the user asked for the quotation number as reference on the PI and the other way round.
- Changes:
  - `manav/manav/pi.py` (new): Sales Order validate sets `custom_quotation` from ERPNext's own
    line link (Sales Order Item.prevdoc_docname); on_update / on_submit write the PI on the
    quotation's `custom_pi_no`; on_trash clears it.
  - `manav/manav/erpnext_fields.py`: Sales Order "Quotation No." (custom_quotation) and Quotation
    "PI No." (custom_pi_no, allow_on_submit), both read only. Quotation No. sits right under
    Customer at the top of the PI (moved there from Manav Details the same day, user's request).
  - `manav/hooks.py`: the Sales Order doc_events above.
  - `manav/manav/print_format/manav_proforma_invoice/`: "Against Quotation No. ..." under the head.
- Testing: `py_compile`; PI rendered locally with a quotation set (line printed); `bench
  migrate` on manav.local. Not tested: saving a real PI (no Sales Order on the site yet).
- Pending: a quotation with several PIs shows the last saved one; all are in its Connections tab.

**Quotation print: one price per machine (machine + its sub-items); sub-items without price.**

- Reason: the user asked for the quotation to show only the machine's price in the total, not the
  sub-items' prices.
- Changes: `manav/manav/print_format/manav_modern_quotation/` and
  `manav/manav/print_format/manav_modern_quotation_cif/`: a machine's row prints Total = machine
  amount + its sub-items' amounts and Price = that total / machine qty; its sub-item rows print
  no price or total. Sub-items whose machine is not on the quotation keep their prices. Grand
  total unchanged. Print format only (no code or fields).
- Testing: both rendered locally with a stubbed `frappe`: VF-2 (100) + sub-item (10) printed as
  110 with the sub-item row blank; grand total unchanged. `bench migrate` on manav.local.
- Pending: the PI (Manav Proforma Invoice) and Manav Modern Quotation Head (old quotations) still
  print each sub-item's price. Check a real print.

**Branches: Manav Marketing - Bangalore (head office), FTWZ, Chennai, Coimbatore.**

- Reason: the user asked for four branches of Manav Marketing with Bangalore as the head office;
  chosen with the user: branches of the one company "Manav" (not separate ERPNext companies),
  named "Manav Marketing - <city>".
- Changes:
  - `manav/manav/branches.py` (new): `setup_branches` (after_migrate in `manav/hooks.py`) renames
    the existing Branch "Bangalore" to "Manav Marketing - Bangalore" (links follow) and creates
    the missing ones. Idempotent.
  - `manav/manav/erpnext_fields.py`: Branch field (`custom_branch`) on Quotation and Sales Order
    (copied from quotation to PI), standard filter.
- Testing: `py_compile`; `bench migrate` on manav.local; the four Branch records read back.
- Pending: Branch has no parent field, so "head office" is only in the name. The Branch field is
  not filled by default and not printed. Not an accounting dimension (no split of the books by
  branch).

**Sales Order list shows "Draft PI" / "Final PI".**

- Reason: the user asked to see in the Sales Order list whether each is a Draft or Final PI.
- Changes: `manav/public/js/sales_order_list.js` (new, via `doctype_list_js` in `manav/hooks.py`)
  wraps ERPNext's list indicator: not submitted = "Draft PI" (orange); submitted = "Final PI: "
  + ERPNext's status (its colour and filter); cancelled stays "Cancelled". The form's status
  label at the top follows the same rule.
- Testing: `node --check`, `py_compile` of hooks.py; `bench migrate` on manav.local. Not seen in
  a browser.
- Pending: none known.

**Quotation -> Draft PI -> Final PI (ERPNext Sales Order as the PI).**

- Reason: the user asked for a Draft PI after the quotation, editable (items, sub-items and all),
  then a Final PI. The user chose ERPNext's Sales Order as the PI and only submitted quotations
  as its source.
- Changes:
  - `manav/manav/erpnext_fields.py`: Sales Order / Sales Order Item get the same custom fields as
    Quotation / Quotation Item (principal, references, Signed By, Sales Engineer, Account
    Manager, Haas Cust ID, Sub-Item of, Sub-Item Sr.No, Specifications, Magic Ref. Code), so
    ERPNext's Quotation -> Sales Order mapping copies them. Sub-Item Sr.No first in the PI's Items
    table; default print format of Sales Order = Manav Proforma Invoice. Quotation Item's Magic
    Ref. Code is no longer no_copy (so it maps to the PI).
  - `manav/hooks.py`: `doctype_js` loads `public/js/quotation.js` for Sales Order too;
    `doc_events` Sales Order validate: `keep_sub_item_rates`, `number_sub_items`.
  - `manav/public/js/quotation.js`: handlers registered once for Quotation and Sales Order.
    Submitted quotation: "Make Draft PI" button (ERPNext's own make_sales_order). Sales Order:
    "+" sub-items on machine lines, item search with rates, principal's currency / price list,
    customer -> Haas Cust ID and Account Manager, and a note "Draft PI" / "Final PI".
  - `manav/manav/print_format/manav_proforma_invoice/` (new): PROFORMA INVOICE (DRAFT PROFORMA
    INVOICE while not submitted), Invoice To / PI No., HSN, description points with photo,
    subtotal, taxes, grand total, payment schedule.
  - `manav/templates/print_formats/manav_modern_quotation_body.html`: optional `doc_title`,
    `to_label`, `number_label` (defaults unchanged).
- Testing: `py_compile` of hooks.py and erpnext_fields.py, `node --check` of quotation.js;
  PI (draft and final), CIF and Modern rendered locally with a stubbed `frappe`: the PI shows its
  title and labels, CIF and Modern unchanged. `bench migrate` on manav.local. Not tested in a
  browser: making a Draft PI from a quotation, sub-items on the Sales Order, submitting.
- Pending: ERPNext asks for a Delivery Date on the Sales Order and refuses quotations past
  "Valid till" unless Selling Settings allows it. The PI keeps ERPNext's Sales Order numbering.

**"Magic Ref. Code" on Item and Quotation Item (shown in the form, not printed).**

- Reason: the user asked for the old Magic item codes (21_item_mst) on the doctypes, not on prints.
- Changes:
  - `manav/manav/item_fields.py`: Item field `custom_magic_ref_code` in "Old System Data"
    (standard filter, no_copy, print_hide).
  - `manav/manav/erpnext_fields.py`: Quotation Item field `custom_magic_ref_code`, fetched from
    the Item, read only, print_hide.
  - Data on manav.local: filled on the 5239 Items whose code is in the file.
- Testing: `py_compile` of both files; `bench migrate` on manav.local; 5239 Items have the code
  set; the Quotation Item field has fetch_from and print_hide as intended.
- Pending: for every matched item the Magic code equals the Item code (items were loaded under
  those codes). Quotation lines made before today keep an empty value until the item is chosen
  again. The 109 codes Excel turned into numbers in the file could not be filled.

**Manav Modern Quotation CIF: machine photo.**

- Reason: the user asked for the photo on the CIF quotation too.
- Changes: the CIF format passes the machine's picture again (line image, else Item image; Haas
  WebP links asked for as PNG, which wkhtmltopdf can show). The shared layout prints it, when
  the specification box is off (`no_specs`), on the left of the machine's description points.
  Manav Modern Quotation still shows it in its specification box only.
- Testing: rendered locally (stubbed `frappe`): one picture beside the points in CIF, none in
  Modern's line rows. The Haas PNG link answers 200 image/png. `bench migrate` on manav.local.
- Pending: only 4 Items on manav.local have a picture; check the PDF on the server.

**Manav Modern Quotation CIF: description point by point, side by side.**

- Reason: the user asked for each item's description as points in two columns.
- Changes:
  - `manav/manav/print_format/manav_modern_quotation_cif/`: macro `describe` splits the
    quotation line's description ("Title; a, b, c. d", or one point per line) into points and a
    short title. A one-line description without "; " and under six comma parts is not split.
  - `manav/templates/print_formats/manav_modern_quotation_body.html`: a line with `points` gets a
    row under it with the points as bullets in two columns; its title is the short title. Lines
    without points (all lines of the other print formats) print as before.
- Testing: rendered locally with Jinja2 and a stubbed `frappe`, using the VF-10/40 description
  of quotation 26QX000084: 9 points in two columns under "Vertical Machining Center"; Manav
  Modern Quotation shows no points. `bench migrate` run on manav.local.
- Pending: check the printed PDF on the server.

**Item descriptions on manav.local set from the old item master (data, no code).**

- Reason: the user asked for the item descriptions from `21_item_mst.xlsx` / `.pdf`.
- Change: 599 Items whose description differed got the file's "Item Description" (broken
  characters replaced by spaces). Skipped: empty descriptions in the file, code 37012 (twice in
  the file with different texts), and codes Excel had turned into numbers.
- Testing: read back after the update: 599 of 599 match.
- Pending: the file's texts are often cut at about 40 characters, so some Items now have
  shorter descriptions than before (e.g. VF-10/40, 10K50T-5). The old values are saved in
  `~/frappe-bench/tmp_item_desc/desc_backup.json` on the server.

**New print format "Manav Modern Quotation CIF".**

- Reason: the user asked for a quotation like Manav Modern Quotation without Cust ID, phone
  number, specifications, subtotal, tax and the payment terms (100%), with the HSN code and a
  CIF grand total only.
- Changes:
  - `manav/manav/print_format/manav_modern_quotation_cif/` (new): Quotation print format in the
    modern layout. Head without Cust ID and phone; no Equipment Specification boxes (and so no
    page break per machine); HSN Code column, read from Quotation Item Master by item code (the
    quotation's principal first); totals show only GRAND TOTAL (CIF); payment info shows only
    "Valid till".
  - `manav/templates/print_formats/manav_modern_quotation_body.html`: optional switches
    `no_specs`, `no_page_per_machine`, `show_hsn`, `no_tax_line`, `grand_total_label`, and an
    empty subtotal is not printed. Manav Modern Quotation and Manav Modern Quotation Head do not
    set them and print as before.
- Testing: both print formats rendered locally with Jinja2, a stubbed `frappe` and a sample
  quotation: the CIF format shows HSN codes and GRAND TOTAL (CIF) and none of Cust ID, phone,
  specifications, subtotal, tax or payment schedule; Manav Modern Quotation still shows all of
  them. Not run on a bench or printed to PDF.
- Pending: `bench migrate` on the server to load the print format; check a real print/PDF.
  Items without an HSN code in Quotation Item Master print an empty HSN cell.

## 2026-10-22

**Draft with AI: the party can also be a Prospect.**

- Reason: the user asked that Draft with AI also finds the customer name among Prospects
  (ERPNext CRM), not only Customers.
- Changes:
  - `manav/manav/quotation_agent.py`: `find_customers` returns Customers and Prospects, each
    with `party_type` (Prospects read with the user's permissions; a Prospect already made into
    a Customer is left out). `create_quotation` takes `party_type` and makes the quotation to
    that Prospect (`quotation_to = Prospect`; ERPNext fills the customer name). The Haas Cust
    ID and Account Manager are still only taken from a Customer. Tool schema and instructions
    updated: when a company is both, the Customer is taken.
  - `manav/public/js/quotation_list.js`: the dialog hint says "Customer or prospect".
- Testing: `py_compile` and `node --check` pass; `find_customers` run against a stubbed
  `frappe` (Customer + Prospect returned, converted Prospect left out, no Prospect permission:
  Customers only). Not run against OpenAI or on a bench.
- Pending: none known.

**Manav Dashboard is a desk page (/desk/manav-dashboard), linked again in the Manav sidebar.**

- Reason: the user asked that every sales employee sees a dashboard of their own figures, and
  that it opens inside the Frappe desk, not as the web page /manav-dashboard (chosen with the
  user: a desk page).
- Changes:
  - `manav/manav/page/manav_dashboard/` (new): desk Page "manav-dashboard" without roles, so
    every desk user may open it. It mounts the existing dashboard view; the server
    (`dashboard.get_dashboard_data`, unchanged) still decides what each user sees: My Dashboard
    (own quotations: created by or Account Manager of) for everyone; Team Performance, HR &
    Attendance and Payroll for management only.
  - `manav/public/js/manav_dashboard_view.js` (moved from `manav/www/manav-dashboard.js`) and
    `manav/public/css/manav_dashboard.css` (moved from `manav/www/manav-dashboard.css`): the view
    now writes its own markup (formerly `manav-dashboard.html`) via `mount(root)`.
  - `manav/www/manav_dashboard.py` / `manav-dashboard.html`: the old address redirects to the
    desk page (guests via the login page).
  - `manav/workspace_sidebar/manav.json`: "Dashboard" link back under Home, now to the desk page.
  - `manav/manav/workspace/manav/manav.json`: the "Manav Dashboard" shortcut opens the desk page.
  - `manav/manav/signup.py`: mail texts say users are taken to the Manav workspace (the landing
    page since today), not the dashboard.
- Testing: `node --check` of the view and the page script, `py_compile` of the changed Python
  files pass; JSONs parse. Not tested in a browser or on a bench (none on Windows): to check
  after deploy, open Dashboard in the sidebar as a sales user and as a manager.
- Pending: a sales employee's own figures are their quotations by creator / Account Manager;
  quotations entered by someone else with no Account Manager set do not count for them.

**Fix: "Insufficient Permission for Quotation Type" for sales users.**

- Reason: on manav.mymagicerp.com a user who is not a System Manager got "Insufficient
  Permission for Quotation Type". Manav's own masters gave permissions to System Manager only,
  while the Quotation form and list read them for the user (Principal link and its search,
  `frappe.db.get_value("Quotation Type")` in quotation.js, the principal labels in
  quotation_list.js), as does the Region Zone link on Customer.
- Change: Sales User and Sales Manager may read (also select, report, print, export, e-mail)
  Quotation Type, Quotation Item Master, Quotation Sub Item Master, Customer Contact Person,
  Region Zone and Quotation Head (old records). Read only: changing the masters stays with System
  Manager. Files: the six DocType JSONs in `manav/manav/doctype/` (`modified` raised so migrate
  applies them).
- Testing: the JSONs parse. Not run on a bench (none on Windows).
- Pending: users with other roles (e.g. only Employee) still cannot read these masters. If the
  site has its own permissions for these DocTypes (Role Permission Manager), those win over the
  JSON and need the same rows added there.

**Fix: installing / migrating no longer fails without an outgoing e-mail account.**

- Reason: the install of manav (CI) stopped with `OutgoingEmailError: Please setup default
  outgoing Email Account`: `signup.setup_signup` (after install / migrate) mailed the password
  link to each manager it created, and the site had no outgoing account (the support account is
  only created when `manav_support_email_password` is in site config).
- Change: `manav/manav/signup.py` `send_setup_mail`: the setup's login mails are skipped when no
  outgoing account exists (a line is printed) and any other mail error goes to the Error Log;
  the users are still created. Their password link is then sent from the User form (Reset
  Password).
- Testing: `py_compile` passes. Not run on a bench (none on Windows); CI will run the install.
- Pending: on sites where the mail was skipped, send the managers / staff their password links
  by hand, or set `manav_support_email_password` before the first migrate.

**Desk: users other than the admin see only the Manav workspace and land on it after login;
Dashboard link removed from the Manav sidebar.**

- Reason: the user asked that on manav.mymagicerp.com the Dashboard entry is removed from the
  sidebar and that everyone who logs in, except the admin, sees only the Manav workspace and is
  taken straight to it.
- Changes:
  - `manav/workspace_sidebar/manav.json`: the "Dashboard" link (/manav-dashboard) removed;
    `modified` raised so migrate syncs the sidebar. The dashboard page itself is unchanged and
    still linked from the Manav workspace.
  - `manav/hooks.py`: `add_to_apps_screen` route is `/desk/manav`, so users land on the Manav
    workspace after login (was `/manav-dashboard` since 2026-10-19). Asked for by the user. An
    admin can choose another landing page with Default App in their own User form. This is
    also where Frappe sends a new user after setting their password.
  - `manav/www/manav_signup.py`: a logged-in visitor of /manav-signup is sent to `/desk/manav`
    (was `/manav-dashboard`).
  - `manav/manav/desk_home.py`: `is_admin` (Administrator or System Manager) and
    `limit_desk_to_manav`, which trims the boot sent to the browser for other users to the Manav
    workspace, the Manav sidebar, the Manav desktop icon and the Manav app. Only navigation is
    hidden; permissions still come from roles.
  - `manav/manav/desk_home.py` `has_app_permission`: System Managers are always offered Manav,
    so it appears in the Default App list (System Settings / User form); before, a System
    Manager without a Quotation role did not see it there (live site, 2026-10-22).
  - `manav/hooks.py`: `extend_bootinfo = ["manav.manav.desk_home.limit_desk_to_manav"]`.
- Testing: `py_compile` of `desk_home.py` and `hooks.py` passes (also after the route change); the sidebar JSON parses. The
  trimming was run locally against a stubbed `frappe` (normal user: only Manav left; System
  Manager and Administrator: everything kept). Not tested on a real site yet: no bench on
  Windows, and the live site needs a deploy and migrate.
- Pending: deploy on Frappe Cloud (migrate syncs the sidebar). Users who are not admins and
  have the Workspace Manager role are trimmed too. Doctypes not in the Manav sidebar can still
  be opened by URL or search if the user's roles allow it.

## 2026-10-21

**Quotation agent: "Draft with AI" makes a draft Quotation from one typed line (OpenAI).**

- Reason: the user found making a quotation by hand slow (principal, customer, each machine,
  then each machine's sub-items) and asked for an agent using an OpenAI key. Chosen with the
  user: input is a short typed request; the quotation is saved as a Draft automatically.
- Changes:
  - `manav/manav/quotation_agent.py` (new): `draft_quotation` (whitelisted, POST, needs Quotation
    create permission) runs OpenAI's Chat Completions API (plain `requests`, no new package) with
    tools `list_principals`, `find_customers`, `find_items`, `get_sub_items` and
    `create_quotation`. The model only picks from existing records; `create_quotation` checks
    every choice again (customer exists, machine in the principal's Item Group, sub-item belongs
    to its machine) and builds the quotation as the form does (principal's currency, price list,
    letter head, terms with text, Signed By; Haas Cust ID; sub-item prices from Quotation Sub
    Item Master), then saves it, so the existing validate hooks number and price it as usual. The
    typed request is kept as a comment on the quotation. When something is unclear (two
    customers fit, item not found) no quotation is made and the model's question is shown.
  - `manav/public/js/quotation_list.js`: "Draft with AI" button on the Quotation list (only for
    users who may create quotations); a dialog for the request; the new draft opens.
  - Key and settings in site_config.json, not in the code: `openai_api_key` (required),
    `openai_model` (default gpt-5-mini), `openai_reasoning_effort` (default low).
- Server: `bench --site manav.local clear-cache`. No migrate needed (no new fields or doctypes).
- Testing: `node --check`, `py_compile` pass (ruff is not installed on the server, not run). On
  manav.local, the tools without OpenAI: principals listed; "VF-2" finds the machine VF-2 first
  ($60,000, MACHINES; spare parts rank lower); 69 sub-items of VF-2; a wrong sub-item is
  refused; `create_quotation` for 2 x VF-2 + 10K-40T-GBX + 10K-40T-IN saved 26QX000083 in USD
  (rate 94.83, Manav Selling USD, Haas letter head, Machines terms, specifications fetched,
  sub-items 1.1 / 1.2 at master prices, total 143,800), then rolled back (not on the site). The
  server reaches api.openai.com (HTTP 401 without key).
  After the key was set on manav.local, two requests through the model (gpt-5-mini), both rolled
  back: "VF-2 for A B" saved a draft for A B INDUSTRIES, 1 x VF-2, USD 60,000 (11 s, 4 model
  calls); "3M India, 2 x VF-2 with the 10000 rpm gearbox spindle" found the customer and
  10K-40T-GBX but asked whether VF-2 or the old duplicate "VF-2." was meant (14 s). A rule was
  then added to the instructions: an exact code match is used without asking. Re-run, rolled
  back: the 3M request now saved 2 x VF-2 + 2 x 10K-40T-GBX (sub-item 1.1), USD 152,400 (14 s);
  "A B Industries, VF-2SS with HSM and LK" saved VF-2SS + HSM (1.1) + LK1 Lifting Kit (1.2, the
  only LK of VF-2SS), USD 86,300 (17 s). Not run: the button and dialog in the browser.
- Same day, after the user's first use (26QX000083 saved from the browser): the model's question
  now comes with buttons. New tool `ask_user` (question + choices); `draft_quotation` returns
  `choices`; the dialog shows one button per choice, and a click adds "Answer: <question>
  <choice>" to the request and sends it again. The instructions forbid asking to confirm what is
  clear, or for quantities / sub-items not mentioned (the model had asked "which JK TYRE"
  together with machine, quantity and accessory questions). Tested on manav.local, rolled back:
  "JK Tyre, VF-10/40" asked "Which customer did you mean?" with choices JK TYRE & INDUSTRIES /
  JK TYRE & INDUSTRIES LTD; with the answer added, 1 x VF-10/40, USD 187,000 was saved, no extra
  questions. `node --check`, `py_compile` pass. Not run: the buttons in the browser.
- Same day: **Manav AI Settings** (new single DocType, `manav/manav/doctype/manav_ai_settings/`,
  System Manager only): OpenAI API Key (Password, stored encrypted), Model, Reasoning Effort.
  `quotation_agent.get_ai_settings` reads it first and falls back to site_config; the "key
  missing" message points to it. Reason: on manav.mymagicerp.com (Frappe Cloud) the user has no
  Site Config screen to enter the key. Server: backup `20261021_161535-manav_local`,
  `bench --site manav.local migrate`. Testing on manav.local: with the page empty the site_config
  key is used (gpt-5-mini, low); with a test key, model and "none" saved on the page, those are
  used and no effort is sent (rolled back). Found while testing: the OpenAI account answers 429
  "no credits remaining", so Draft with AI fails on every site until credit is added.
- Pending: push to GitHub so Frappe Cloud deploys it; then on manav.mymagicerp.com enter the key
  in Manav AI Settings. Draft with AI leaves Valid Till empty (the form fills it); not fixed yet.
- Pending: try real requests from the list in the browser and adjust the instructions if the
  model picks wrongly. A run must finish within Frappe's 120-second request limit (stopped at
  100 s). Duplicate items such as "VF-2." confuse the search; disabling unused ones would help.

## 2026-10-19

**Appointment letter: print format "Manav Appointment Letter" on HRMS's Job Offer.**

- Reason: the user supplied the offer letter of Manav Marketing Pvt. Ltd. (May 2026) and asked
  for an appointment letter like it.
- Changes:
  - `manav/manav/doctype/manav_offer_salary_line/` (new child DocType "Manav Offer Salary
    Line": Component, Amount per Month, In Sub Total, Payable Monthly / Annually).
  - `manav/manav/job_offer_fields.py` (new; `after_migrate`/`after_install` in
    `manav/hooks.py`): Job Offer custom fields Salutation, Address (for the letter), Letter Ref.
    (default MM/Office/Gen), Interview Date, Location (default Bangalore), Reporting To, the
    salary table, Probation (Months) (default 6), Conveyance Rate per km (default 4.5), Signed
    for (Company) (default MANAV MARKETING PVT. LTD.; the company record is named "Manav"),
    Signatory 1 / 2 and their designations (defaults from the sample letter). Nothing when HRMS
    is not installed.
  - `manav/public/js/job_offer.js` (new; `doctype_js`): a new Job Offer starts with the seven
    salary components of the sample (amounts 0).
  - `manav/manav/print_format/manav_appointment_letter/` + layout
    `manav/templates/print_formats/manav_appointment_letter.html`: the letter as in the sample;
    Sub Total and Grand Total are summed by the print; probation and conveyance points only when
    filled; HRMS's Job Offer Terms and Terms and Conditions follow as further points; the letter
    head chosen on the Job Offer is printed on top.
- Server: backup `20261019_151758-manav_local`, `bench --site manav.local migrate` (table,
  fields and print format on the site).
- Testing: `node --check`, `py_compile`, JSON load pass. On manav.local the Job Offer
  HR-OFF-2026-00001-1 was filled in memory with the sample's values (not saved, rolled back) and
  printed: 58,500.00 Sub Total, 68,842.00 Grand Total, "11th May 2026", "May 14, 2026",
  "(Payable Annually)", "4.5/- km" present; looked at as a screenshot, matching the sample.
  (HR-OFF-2026-00001 is cancelled; Frappe does not print cancelled documents.) Not run: the
  form and print view in the browser, the PDF (server wkhtmltopdf error, see below).
  The letter's fields and the salary rows are "Allow on Submit", because Job Offer is
  submittable and an offer is usually submitted before its letter is printed (HR-OFF-2026-00001-1
  is submitted); checked on the site after a second migrate.
- Pending: fill the new fields on Roopa D V's Job Offer (HR-OFF-2026-00001-1) and print it.

**Fix: sub-item prices on a USD (MACHINES) quotation; colour on one print format only; bold rate.**

- Reasons: (1) the user reported that after choosing MACHINES "dollar is not applied". The
  currency was USD (26QX000082, re-saved 15:09), but the sub-item lines had converted INR
  prices: ERPNext re-prices every line from the price list when the currency / price list
  changes, and a sub-item has no USD list price (its price depends on the machine), so its old
  INR price was converted (10K-40T-GBX 146.47 USD instead of 10,000; LK 2.11 instead of 200).
  (2) The user asked for colour on one quotation format only. (3) The user asked for the rate
  in the Item Code drop-down in bold.
- Changes:
  - `manav/manav/quotation.py` `keep_sub_item_rates` (+ first in Quotation `validate` in
    `manav/hooks.py`): on saving a draft, every sub-item line gets its price for its machine
    from Quotation Sub Item Master (price list rate and rate; discount and margin cleared) and
    the totals are worked out again. A master price of 0 is not applied, so a typed price stays.
  - `manav/public/js/quotation.js` `restore_sub_item_rates`: the same on the form, after
    ERPNext's re-pricing calls have finished (`frappe.after_ajax`), when the principal's
    currency / price list was put back.
  - Print formats: "Manav Banded Quotation Blue" became "Manav Colour Quotation" (the only
    coloured format); "Manav Banded Quotation Green" became "Manav Banded Quotation" in black
    and white (grey banding); "Manav Banded Quotation Red" removed; "Manav Classic Quotation"
    now black and white. Folders under `manav/manav/print_format/` accordingly; comments in the
    shared templates updated. The three old records were deleted on manav.local
    (`frappe.delete_doc`), the new ones loaded by migrate.
  - Bold rate: `item_query_with_rate` sends the rate as the first line of the description;
    `add_rate_style` (quotation.js) shows that line bold, only in the Item Code field of the
    Quotation form's Items rows (Frappe prints the description as plain text, so it is styled,
    not marked up).
- Server: backup `20261019_151005-manav_local`; old formats deleted; `bench --site manav.local
  migrate`; `clear-cache`.
- Testing: `node --check`, `py_compile` pass. On manav.local without saving: 26QX000082 after
  `keep_sub_item_rates`: 10K-40T-GBX 13,900 (VF-1) / 10,000 (VF-10/40), 10K-40T-GREASE-IN
  8,500, HSM 3,500, LK 200, P-COOL kept at 2,600 (master 0); total 274,700 (was 242,884.62).
  The three formats render; only Manav Colour Quotation holds colour values. The search gives
  "Rate for VF-2SS-I: $ 3,000.00" + line break + description. Not run: the form in the browser
  (the order of ERPNext's re-pricing and the restore is to be checked there).
- Pending: open 26QX000082 and save it once to correct its sub-item prices (the server fix
  applies on saving). Check in the browser that, after choosing MACHINES, the sub-items keep
  their machine prices.

**Quotation Items table: the rate in the Item Code drop-down.**

- Reason: the user asked for the rate to show in the Item Code search of a quotation line.
- Changes:
  - `manav/manav/quotation.py` `item_query_with_rate` (whitelisted search): runs ERPNext's
    `item_query` unchanged and puts the rate first in each result's description: for a sub-item
    of a machine on the quotation its price for that machine ("Rate for VF-2SS-I: $ 3,000.00",
    Quotation Sub Item Master), otherwise the rate in the quotation's price list ("Rate: $
    60,000.00", Item Price, a price for no particular customer preferred); nothing when neither.
  - `manav/public/js/quotation.js` `set_item_query`: uses it; passes the price list, the
    machines on the quotation and the currency as extra filter keys, which the server removes
    before ERPNext's search.
- Testing: `node --check`, `py_compile` pass. On manav.local through Frappe's link search
  (`frappe.desk.search.search_link`, as the drop-down calls it): ACF with VF-2SS-I on the
  quotation "Rate for VF-2SS-I: $ 3,000.00"; 18K-HSK-A63 "$ 24,000.00" for VF-2SS-I; VF-2,
  VF-2. and VF-2SS-I with their USD price list rates; 32GB (no machine) its price list rate.
  Not run: the drop-down in the browser.
- Pending: hard reload of the browser.

**Four coloured quotation print formats; the old layout with the description as bullets.**

- Reason: the user asked for a print format that shows an item's description like the old
  quotation (two columns of "*" lines, "Prices : Ex-Works, Oxnard, USA.", "CIF Charges -
  Chennai Sea Port ... US$"), and for 3-4 quotation formats with colour, formatting and row
  banding.
- Changes:
  - `manav/manav/print_format/manav_classic_quotation/` "Manav Classic Quotation": the old
    layout (Sr.No | Item Code | Particulars | Price in US$) in navy; per machine "01 CODE name",
    bullets in two columns, "Prices : <price basis>" and the amount, options in a banded table
    (1.1, 1.2 ...); charges from Taxes and Charges as dotted-leader lines and a Total bar; payment,
    banded terms, signature, FMT: QUOT-11 footer.
  - `manav_banded_quotation_blue/`, `_green/`, `_red/` "Manav Banded Quotation Blue / Green /
    Red": title band, tinted customer and reference cards, one items table per machine with a
    coloured head, tinted machine row with its features, sub-items 1.1 ... indented and banded,
    totals with charges and a coloured Grand Total bar, amount in words, banded terms.
  - `manav/templates/print_formats/manav_quotation_data.html` (shared): gathers the quotation
    (machines and options as in Manav Modern Quotation) and a machine's bullets: the features of
    a "Title; a, b, c" description, the lines of a multi-line description, else the key
    Specifications lines (air, electrical, dimensions/shipping and axis-motor blocks and bare
    "... specifications" labels left out); "!" lines bold.
    `manav_classic_quotation_body.html`, `manav_banded_quotation_body.html`: the two layouts.
    Each machine after the first starts a new page in all four.
  - `manav/manav/doctype/quotation_type/quotation_type.json` (+ note in .py): field Price Basis
    (`price_basis`), printed as "Prices : <price basis>"; empty: "Price :".
  - CIF charges are entered as a row of the quotation's Taxes and Charges (charge type Actual,
    description e.g. "CIF Charges - Chennai Sea Port"); no new field.
- Server: backup `20261019_150004-manav_local`, `bench --site manav.local migrate` (the four
  formats and the field are on the site).
- Testing: on manav.local, an unsaved copy of 26QX000081 with VF-10/40 (description bullets),
  two of its sub-items, UMC-1000 (specification bullets) and a CIF charge of US$ 10,500 (Price
  Basis set in a transaction rolled back afterwards) was printed with all four formats
  (`frappe.get_print`): Prices line, CIF line, 2.1 / 2.2 present; grand total US$ 4,91,900.
  The Classic, Blue and Red pages were looked at as screenshots (Edge on the Windows PC, with
  the site's print styles). Not run: the PDF from the server (wkhtmltopdf HostNotFoundError,
  see below), the print view in Frappe.
- Pending: fill Price Basis on the Quotation Types (e.g. MACHINES: "Ex-Works, Oxnard, USA.");
  it is empty on all now. The default print format of Quotation is still Manav Modern Quotation.

**Item form: the machine's sub-items as a tree, in the item itself.**

- Reason: the user looked for the tree inside the Item form ("for that particular item"); the
  page from the entry below was only reachable from the Items list and sidebar.
- Changes:
  - `manav/manav/item_fields.py`: Item custom fields "Sub-Items" (`custom_sub_items_section`,
    Section Break, the last section of the Details tab, before Accounting) and
    `custom_sub_items_tree` (HTML).
  - `manav/public/js/item.js` `manav_show_sub_items_tree`: draws the tree (machine at the root,
    its sub-items with description, type and price, Sr No order; "Open Item" on a sub-item;
    "Open full tree" opens the page searched for this machine). Hidden for new items, items
    without sub-items, and readers without access to Quotation Sub Item Master.
  - `manav/manav/item_tree.py`: a "machine::<code>" root gives that machine's sub-items;
    `count_sub_items` (0 instead of an error without permission).
- Server: `setup_item_fields` run and `bench --site manav.local clear-cache`.
- Testing: `node --check`, `py_compile` pass. On manav.local: the section sits after Old System
  Data and before the Accounting tab; VF-10/40 has 55 sub-items and its tree root gives 55
  nodes; TSC (not a machine) 0; emily.demo 0. Not run: the form in the browser.
- Pending: hard reload and a look at a machine's Item form.

**Machine Sub-Items Tree: the machines and their sub-items as a tree, from the Items list.**

- Reason: the user asked for a tree chart of the sub-items in the Items list. Frappe's tree view
  only works for tree doctypes (Item is not one), so a page with Frappe's own tree component
  (frappe.ui.Tree) is used.
- Changes:
  - `manav/manav/page/machine_sub_items/` (new standard Page "Machine Sub-Items Tree",
    /desk/machine-sub-items, module Manav): tree Item Group -> machine (code, name, number of
    sub-items) -> sub-items (code, description, type, price for that machine, in Sr No order);
    "Find a machine" search (code or name) opens the matching groups; node buttons "Open Item"
    and "Sub-Item Prices" (the machine's rows in Quotation Sub Item Master).
  - `manav/manav/item_tree.py` (new): whitelisted `get_tree_nodes`, children loaded when a node
    is opened; read permission on Quotation Sub Item Master required; unique node values,
    because a sub-item sits under many machines.
  - `manav/public/js/item_list.js` (new) + `doctype_list_js` in `manav/hooks.py`: "Sub-Items
    Tree" button on the Items list (extends ERPNext's list settings, its onload still runs).
  - `manav/workspace_sidebar/manav.json`: link to the page under Item & Price Masters.
- Server: backup `20261019_144239-manav_local`, then `bench --site manav.local migrate` (loaded
  the page and the sidebar); the page, sidebar link and list hook were then found on the site.
- Testing: `node --check`, `py_compile` pass. On manav.local `get_tree_nodes`: groups Machines
  139, Jagdeep 22, Chmer 3, Spares 2, Options 1, "(Item not found)" 1; VF-2SS-I 56 sub-items with
  unique values; search "vf-2" 9 machines; emily.demo (Sales User, no read on Quotation Sub Item
  Master) refused. Not run: the page in the browser.
- Pending: hard reload and a look at the page. Users without read access to Quotation Sub Item
  Master (e.g. Sales User) cannot open the tree, as with the Sub-Items dialog.

**Fix: choosing MACHINES did not keep the quotation in USD.**

- Reason: the user chose the principal MACHINES and the currency stayed INR. The Quotation Type
  itself is right (USD, Manav Selling USD). ERPNext sets the customer's default currency and
  price list when the customer (or company) is chosen; MERRITRONIX LIMITED has none, so the
  company's INR and Standard Selling replaced the principal's values. 26QX000082 (MACHINES,
  made 2026-10-19 14:25) was saved so.
- Changes:
  - `manav/public/js/quotation.js`: `keep_type_values` puts the principal's currency and price
    list back after ERPNext changes them (on customer, company, currency or price list change;
    waits 400 ms until ERPNext's changes have settled) and fills an emptied letter head / terms
    template; the principal's values are set one after another (`set_type_values`), and fetched
    once per principal (`load_type_defaults`).
  - `manav/manav/quotation.py` `warn_principal_currency` + `manav/hooks.py` (validate): an orange
    warning when a draft is saved in another currency than its principal's; saving is not
    stopped.
- Server: `bench --site manav.local clear-cache` (new validate hook).
- Testing: `node --check`, `py_compile` pass; Frappe lists the three validate hooks. On
  manav.local without saving: 26QX000082 (INR, MACHINES) gets the warning, 26QX000081 (USD) none.
  Not run: the form in the browser (the order customer -> principal and principal -> customer).
- Pending: 26QX000082 is still INR: open it, choose the principal again (or set USD and Manav
  Selling USD) and check the item rates, then save.

**Quotation: Signed By follows the Account Manager.**

- Reason: the user asked for the same person in Signed By as in Account Manager. Signed By is a
  Sales Person, the Account Manager a User, and nothing on the site linked the two.
- Changes:
  - `manav/manav/erpnext_fields.py`: Sales Person gets "Login User" (`custom_user`, Link to
    User, unique).
  - `manav/manav/quotation.py`: `sales_person_for_user` (enabled Sales Person by Login User,
    else ERPNext's Sales Person -> Employee -> User ID); whitelisted `get_signed_by` for the
    form; `fill_account_manager` (validate) also fills an empty Signed By.
  - `manav/public/js/quotation.js`: when the Account Manager is set (from the customer or by
    hand), Signed By becomes that user's Sales Person; with none linked, Signed By is left and
    an orange note says so.
- Server: `setup_erpnext_fields` run on manav.local (created the field) and `bench --site
  manav.local clear-cache` (Frappe's cached field list did not have it yet).
- Testing: `node --check`, `py_compile` pass. On manav.local in a rolled-back transaction:
  with K. KATHIRAVAN's Login User set to support02, the lookup and `get_signed_by` gave
  K. KATHIRAVAN; an empty Signed By was filled on validate; a hand-set one kept; an unlinked
  user gave none; nothing stayed after the rollback. Not run: the form in the browser.
- Pending: fill "Login User" on the Sales Persons who use the system (none is set yet).

**Quotation pop-ups: Back and Save buttons (for use on the phone).**

- Reason: the user asked for a Back and a Save button on the quotation's pop-ups (the Sub-Items
  dialog and the "Editing Row" panel of an Items line), so they are easy to use in the app view.
- Changes (`manav/public/js/quotation.js`):
  - Sub-Items dialog: "Back" closes it without changes; the main button is "Save" (was
    "Update"): it applies the ticks as before and then saves the quotation (`frm.save()`).
  - Items line panel (`form_render` of Quotation Item -> `add_row_form_buttons`): Back (closes
    the panel, the typed values stay) and Save (closes it and saves the quotation), beside Delete
    at the top and in a bar at the foot that stays visible while scrolling. Save is left out for
    a submitted quotation or a table that cannot be edited. Uses Frappe grid internals, guarded
    and noted with the version (16.33.1); missing internals mean no buttons, not an error.
- Testing: `node --check` passes; Frappe's Dialog supports `secondary_action_label` (checked in
  frappe/public/js/frappe/ui/dialog.js). Not run: the form in the browser or on a phone.
- Pending: hard reload of the browser / app and a try on the phone.

**`bench migrate` run on manav.local; tabs on the Manav workspace; Account Manager error fixed.**

- Reason: the user asked for tabs on the Manav workspace (desk page) as well, and reported
  "Field custom_account_manager not found" on the Quotation form (the field did not exist yet,
  migrate had not been run).
- Changes:
  - `manav/manav/workspace_tabs.py` (new) + `manav/manav/workspace_tabs_block/tabs.html`,
    `tabs.css`, `tabs.js` (new): Custom HTML Block "Manav Dashboard Tabs", written from these
    files by `setup_workspace_tabs` (in `after_migrate`/`after_install`, `manav/hooks.py`). Its
    script shows one section of the workspace at a time (Quotations / Sales, HR & Attendance,
    Payroll, Masters & Records), skips sections the user has nothing to see in, shows all in
    edit mode, remembers the tab in the browser, supports arrow keys, and fires a window resize
    so charts drawn in a hidden tab get their width. It uses the workspace's Editor.js DOM
    (.ce-block, .ce-header, .widget, .edit-mode), checked on Frappe 16.33.1; it does nothing
    if these change.
  - `manav/manav/workspace/manav/manav.json`: the block under the shortcuts.
  - `manav/public/js/quotation.js`: the Account Manager is set only when the field exists.
- Server: site backup `20261019_140858-manav_local` taken, then `bench --site manav.local
  migrate` run (2026-10-19 14:09) without errors. This also applied the earlier entries of
  today (Account Manager field, Manav Management role, chart roles, sidebar, Default App).
  Checked afterwards: the custom field and its column exist; role exists; Default App = manav;
  the tab block exists (public) and is on the workspace; the six charts carry the role
  (emily.demo may not see "Quotations by Sales Engineer", Administrator may); sidebar 36 items.
  The site runs `bench serve`, which reloads Python changes, so no restart was done.
- Testing: `node --check` and `py_compile` pass. Not run: the workspace tabs and the form in the
  browser (no browser login from here).
- Pending: hard reload of the browser and a look at the workspace tabs; Milind/Naveen users and
  the role, as in the entry below.

**Dashboard: tabs, each user's own dashboard after login, team figures for management only.**

- Reason: the user asked for tabs instead of scrolling, for everyone to see their own dashboard
  after login, and for only the admin, Milind and Naveen to see all employees' performance.
  Decisions taken with the user: a role instead of fixed names; "own" quotations are those the
  user created or is Account Manager of (no login user is linked to a Sales Person on the site);
  the landing page is the dashboard page.
- Changes:
  - `manav/manav/desk_home.py`: role "Manav Management" (`setup_management_role`, in
    `after_migrate`/`after_install`) and `is_management()` (Administrator, System Manager, or the
    role). The role gives no doctype permissions.
  - `manav/hooks.py`: the apps-screen route, and so the page after login, is `/manav-dashboard`
    (was `/desk/manav`, set earlier today).
  - `manav/manav/dashboard.py`: `my_sales` (own quotations) for every reader; `sales` (all
    quotations, by sales engineer), `hr` and `payroll` only for management; still read with
    `frappe.get_list`, so doctype permissions apply as well.
  - `manav/www/manav-dashboard.html`, `.js`, `.css`: tab bar (My Dashboard, Team Performance,
    HR & Attendance, Payroll); a tab shows only when its data came back; keyboard arrows move
    between tabs; the chosen tab is remembered in the browser. New "My Quotations" panel. The
    header link goes to the Manav workspace (was /app).
  - `manav/manav/dashboard_chart/*.json` (6): role Manav Management on every Manav chart, so
    the workspace shows the company-wide charts only to management (Frappe hides a chart from a
    user without its roles; System Managers always see them).
- Testing: `node --check` and `py_compile` pass. On manav.local, `get_dashboard_data` as
  Administrator: own 715, team 715, HR 63 employees, payroll 1 slip; as emily.demo and
  sarah.demo (Sales User / Sales Manager): own 0, team/HR/payroll none; as support02 (HR, no
  Quotation access): nothing. In a rolled-back transaction: the role was created (twice, no
  error), emily.demo with the role got the team figures (715) but no HR/payroll (she has no read
  access to Employee / Salary Slip). The apps route is /manav-dashboard. Not run: `bench migrate`
  (creates the role, loads the chart roles), the page in the browser, a real login.
- Pending: `bench --site manav.local migrate` and `bench restart`. Create users for Milind and
  Naveen (the site has none; there are two Naveens in Sales Person / Employee Master: M-02 and
  M-18) and give them "Manav Management"; for the HR & Attendance and Payroll tabs they also need
  read access there (e.g. HR User; Payroll also one of HR Manager, HR User, Accounts Manager).
  Roopa (support02, HR Manager) no longer sees the HR/Payroll tabs unless given the role. The
  workspace's number cards (totals such as Quotations This Month) are not limited by role;
  Frappe has no role setting for them.

**Quotation: Account Manager filled from the Customer.**

- Reason: the user asked for the Account Manager set on the Customer (Sales Team tab) to be
  filled in automatically on the quotation.
- Changes:
  - `manav/manav/erpnext_fields.py`: new Quotation custom field "Account Manager"
    (`custom_account_manager`, Link to User) in Manav Details, after the Sales Engineer.
    ERPNext's Quotation has no such field; `fetch_from` cannot be used because `party_name` is
    a Dynamic Link.
  - `manav/public/js/quotation.js`: choosing the customer sets the Account Manager (with the
    Haas Cust ID, in one call); another customer replaces it.
  - `manav/manav/quotation.py` `fill_account_manager` + `manav/hooks.py` (validate is now a
    list): on saving, an empty Account Manager is taken from the Customer (covers imports and
    copies); one set by hand is kept; quotations to a Lead/Prospect are left alone.
- Testing: `node --check` and `py_compile` pass. On manav.local, inside a transaction rolled
  back afterwards: Frappe lists both validate hooks; a customer given an Account Manager filled
  an empty quotation value, a hand-set value was kept, a Lead quotation stayed empty; the
  customer's value was empty again after the rollback. Not run: `bench migrate` (creates the
  field), the form in the browser.
- Pending: `bench --site manav.local migrate` (new field) and a hard reload. No Customer has an
  Account Manager on the site yet. The Account Manager is a User, while "Discussion With (Sales
  Engineer)" is a Sales Person; no Sales Person is linked to an Employee/User on the site, so
  the Sales Engineer is not filled from it.

**Quotation Items table: blue machine rows, sub-items numbered 1.1, 1.2 and indented.**

- Reason: the user asked for the machine rows in blue, for the sub-items of machine 1 to be
  numbered 1.1, 1.2 ..., and for the sub-items to be indented in the table.
- Changes:
  - `manav/public/js/quotation.js`: machine rows are `--blue-300` (dark theme `--blue-900`) with
    blue bold text and a `--blue-500` bar at the left; before they were `--bg-blue` (#edf6fd),
    which could hardly be told from white. Sub-item rows get the class `manav-sub-item-row`: Sub-Item
    Sr.No and Item Code are indented (no arrow). `number_sub_items` gives
    "<machine No.>.<n>"; lines dragged to another place are numbered again (`items_move`).
  - `manav/manav/quotation.py`: `number_sub_items` (on validate) numbers the same way. A
    sub-item belongs to the nearest line of its machine above it (else the first line of its
    machine); a sub-item whose machine is not on the quotation keeps a plain 1, 2, 3.
  - `manav/manav/erpnext_fields.py`: description of Sub-Item Sr.No updated.
- Testing: `node --check` on the JS and `py_compile` on the Python pass. On manav.local,
  `number_sub_items` on an unsaved test document (machine, 2 sub-items, 2nd machine, 1 sub-item,
  the 1st machine again with 1 sub-item, a sub-item of a missing machine) gave 1.1, 1.2, 2.1, 3.1
  and 1. Not run: the form in the browser.
- Pending: hard reload of the browser (no build needed; `doctype_js` is served from the app).
  Quotations already saved keep their old 1, 2, 3 until they are saved again.

**Print (Manav Modern Quotation / Manav Modern Quotation Head): the same numbering, blue and indent.**

- Reason: the user's print still showed 1., 2. in black and white ("STILL SAME"); the change
  above had covered only the form.
- Changes: `manav/templates/print_formats/manav_modern_quotation_body.html` (shared by both
  print formats): `lines_table` takes the machine's number; the machine's row is light blue with
  a blue bar at its No. and numbered "1.", its options "1.1", "1.2" ... with the number and the
  description moved a little to the right (an arrow "↳" in front was removed at the user's
  request). Loose options (machine not on the quotation) continue the machines'
  numbers, without colour. The numbers are worked out in the print, so saved quotations print
  correctly without being saved again.
- Testing: on manav.local, `frappe.get_print` of 26QX000081 (VF-1 with ACF) gave a blue row
  "1. VF-1" and an indented row "1.1 ACF". Making the PDF failed on the server with
  wkhtmltopdf "HostNotFoundError" (it cannot reach the site's host name; not caused by this
  change). Not run: the print preview in the browser, the PDF.
- Pending: check the print preview and the PDF; the PDF error on the server needs the site's
  host name to resolve there (e.g. `host_name` in site_config or an /etc/hosts entry).

**Print: every machine after the first starts a new page.**

- Reason: the user asked for a newly added item to go to the second page of the print.
- Changes: `manav/templates/print_formats/manav_modern_quotation_body.html`: the piece of each
  machine after the first carries the marker `mm-new-page`; in the browser's copy its row of the
  sheet table gets `page-break-before`, in the PDF's copy (wkhtmltopdf) its block. Machine 1
  stays under the quotation box on page 1; each further machine, with its specification box and
  sub-items, begins a page. Totals, terms and signature follow the last machine as before.
  Applies to both Manav Modern print formats (Quotation and Quotation Head).
- Testing: on manav.local an unsaved copy of 26QX000081 with a second machine (VF-3) added was
  rendered with `frappe.get_print` (nothing saved, rolled back): one break marker in each copy,
  numbers 1. VF-1 / 1.1 ACF / 2. VF-3. That HTML printed to PDF with headless Edge on the
  Windows PC gave 2 pages: page 1 VF-1 and ACF, page 2 VF-3 and the totals. Not run: the
  server's PDF (wkhtmltopdf HostNotFoundError, see above) and the print view in Frappe.
- Pending: check a real quotation with two machines in the print view and, once the server's
  PDF works, in the PDF.

**After login users land on the Manav workspace; the Manav sidebar lists all masters.**

- Reason: the user asked for only the Manav page to be shown after login, and for the masters and
  other needed links in the left menu.
- Changes:
  - `manav/hooks.py`: `add_to_apps_screen` entry for Manav (route `/desk/manav`, the Manav
    workspace); `manav.manav.desk_home.set_default_app` added to `after_migrate` (and so to
    `after_install`).
  - `manav/manav/desk_home.py` (new): `has_app_permission` (desk users who may read Quotation;
    not website users) and `set_default_app`, which sets System Settings > Default App to Manav
    when it is empty (an administrator's later choice is kept). Frappe's login then redirects to
    the Default App's route (frappe/apps.py `get_default_path`, Frappe 16.33.1).
  - `manav/public/images/manav_logo.svg` (new): the app's logo on the /apps screen.
  - `manav/workspace_sidebar/manav.json`: besides Home, Dashboard, Quotation, Customer and Item,
    folded groups Quotation Masters (Quotation Type, Quotation Item / Sub Item Master, Terms and
    Conditions, Letter Head, Print Format), Customer Masters (Customer Contact Person, Contact,
    Address, Customer Group, Territory, Region Zone), Item & Price Masters (Item Group, Item Price,
    Price List, UOM, Currency, Currency Exchange), Sales Team (Sales Person, Employee Master),
    Reports (Quotation Trends, Sales Person-wise Transaction Summary), Settings (Selling Settings,
    Print Settings) and Old Records (Quotation Head).
- Testing: `py_compile` passes. On manav.local: every DocType and Report the sidebar links to
  exists; Frappe reads the new hook and `get_apps()` lists Manav with route `/desk/manav`; the
  logo is reachable through `sites/assets/manav`. System Settings > Default App is empty there
  now. Not run: `bench migrate` and a real login in the browser.
- Pending: `bench --site manav.local migrate` (loads the sidebar, sets the Default App), then
  `bench restart` so the new hook is read, and a log in to check. A user whose own Default App
  (User form) is set to another app still lands there. Other apps' workspaces (ERPNext, HR, CRM)
  stay reachable from the desk; they are not hidden.

## 2026-10-17

**Quotation list: the principal (Quotation Type) as a coloured label.**

- Reason: the user asked for colour on the quotation type in the list view.
- Changes:
  - `manav/manav/doctype/quotation_type/quotation_type.json` (+ note in `quotation_type.py`):
    new Select field List Colour (`list_color`: blue, green, orange, purple, pink, cyan, yellow,
    red, gray).
  - `manav/manav/erpnext_fields.py`: Quotation's `custom_quotation_type` is shown in the list view.
  - `manav/public/js/quotation_list.js` + `doctype_list_js` in `manav/hooks.py`: the column shows
    the principal's description (MACHINES, SPARES IN RUPEES ...) as a Frappe indicator pill in its
    List Colour; without one, a fixed colour by code order. Extends ERPNext's list settings (its
    onload is still called).
- Testing: `node --check` on the JS and `py_compile` on the Python pass. On the server: Frappe
  adds `doctype_list_js` after the doctype's own list JS (frappe/desk/form/meta.py), and all nine
  colours are in Frappe's indicator colours. Not run: `bench migrate` and the list in the browser.
- Pending: `bench --site manav.local migrate` (new field and the list column), then a hard reload.
  Users who saved their own list columns may need to add "Principal (Quotation Type)" via List
  Settings.

**Manav workspace shows the dashboard itself: number cards and charts for sales, HR, payroll.**

- Reason: after the workspace was loaded, the user asked for everything to be on the workspace
  page, not only a link to /manav-dashboard.
- Changes (standard records of module Manav, loaded by `bench migrate`):
  - `manav/manav/number_card/*` (12): Quotations This Month, Quoted Value This Month, Open
    Quotations, Ordered Quotations This Year; Active Employees, Present / On Leave / Absent
    Today, Leaves To Approve; Net Pay Last Month, Gross Pay Last Month, Draft Salary Slips.
  - `manav/manav/dashboard_chart/*` (6): Quotation Value by Month; Quotations by Status, Quoted
    Value by Principal, Quotations by Sales Engineer, Top Customers by Quoted Value (rolling last
    12 months through a dynamic filter, since Frappe's "last year" is the previous calendar
    year); Attendance This Month. The workspace also uses three HRMS standard charts:
    Department Wise Employee Count, Outgoing Salary, Department Wise Salary(Last Month).
  - `manav/manav/workspace/manav/manav.json`: sections Quotations / Sales, HR & Attendance,
    Payroll, each with its cards and charts; shortcuts at the top and the link cards at the foot.
- Testing: on manav.local every card and chart was computed from its file without saving:
  Active Employees 63, Quotations This Month 8 (value 10,18,65,962); value by month Apr–Aug
  2026; principals by name (SPARES IN RUPEES, MACHINES, JAGDEEP); top engineer ARUN .V (416);
  attendance and payroll empty (no records yet). Not run: `bench migrate` and the browser view.
- Pending: `bench --site manav.local migrate`, then a hard reload of the desk. HR and payroll
  cards need HRMS on the site (Manav itself only requires ERPNext).

**"Manav" workspace, sidebar and desktop icon (Frappe v16 desk), with the dashboard link.**

- Reason: the user asked for the dashboard to be in a workspace.
- Changes (standard files of the app, loaded by every `bench migrate`, so they survive updates):
  - `manav/manav/workspace/manav/manav.json`: Workspace "Manav" (module Manav, public).
    Shortcuts: Manav Dashboard (/manav-dashboard), Quotation, Quotation Type, Quotation Head (Old),
    Customer, Item. Cards: Quotations, Customers, Masters, Old Records.
  - `manav/workspace_sidebar/manav.json`: sidebar "Manav": Home, Dashboard, Quotation, Customer,
    Item, and folded groups Quotation Masters, Other Masters, Old Records.
  - `manav/desktop_icon/manav.json`: "Manav" icon on the desk home, opening that sidebar.
- Testing: on manav.local the three files were loaded as documents and checked for mandatory
  fields, select options and links without saving: all linked DocTypes exist; the only unresolved
  links are to the "Manav" workspace/sidebar themselves, which migrate creates (Frappe's file
  import skips link checks, modules/import_file.py). Icon names are ones ERPNext/HRMS sidebars use.
  Not run: `bench migrate`, and a look at the desk in the browser.
- Pending: `bench --site manav.local migrate` on the server.

**Manav dashboard page (/manav-dashboard): quotations / sales, HR & attendance, payroll.**

- Reason: the user asked for a dashboard for Manav covering sales, HR & attendance and payroll,
  as a separate web page.
- Changes:
  - `manav/manav/dashboard.py`: whitelisted `get_dashboard_data(from_date, to_date)` (default the
    last 12 months). Reads with `frappe.get_list`, so each reader's permissions apply; a section
    the reader may not read comes back empty and is hidden. Sales: quotation count and value
    (company currency), won / open / lost, conversion, by month, status, principal (Quotation
    Type description), sales engineer, top customers. HR: active employees, today's attendance,
    this month's attendance, open leave applications, employees by department. Payroll (System
    Manager, HR Manager/User, Accounts Manager only): submitted slips, gross / net by month, gross
    by department for the latest month. HR and payroll are left out when HRMS is not installed.
  - `manav/www/manav-dashboard.html`, `manav_dashboard.py`, `manav-dashboard.css`,
    `manav-dashboard.js`: the page. Desk users only; guests are sent to the login page. Date
    range with 3M / 6M / 12M / this-year buttons; number tiles; monthly column charts with hover
    details and a table view; bar lists for categories; light and dark colours. No chart library.
- Testing: both Python files compile; `node --check` passes on the JS. On the server (manav.local),
  `get_dashboard_data` was called read-only as Administrator: 715 quotations in the last 12 months,
  principals named (SPARES IN RUPEES, MACHINES, JAGDEEP), 63 active employees, no attendance or
  salary slips yet; an 82-month range also worked. Guest request to /manav-dashboard gives 301 to
  /login. Not tested: the page in a logged-in browser (charts, layout, dark mode).
- Pending: data gaps the dashboard shows rather than fixes: 707 of the 715 quotations are
  "Expired" (imported, past Valid Till), so conversion is 0%; 62 of 63 employees have no
  Department; payroll is empty until salary slips are submitted.

**Quotation print: each machine's lines right under its specification box.**

- Reason: the print showed all specification boxes first and one line table after them. The
  user asked for the first machine with its sub-items under it, then the second machine with
  its sub-items, and so on.
- Change (`manav/templates/print_formats/manav_modern_quotation_body.html`, shared by Manav
  Modern Quotation and Manav Modern Quotation Head): after each machine's box comes a line table
  of that machine and its options (new macro `lines_table`); loose options follow the last
  machine, then the totals. Line numbers run on across the tables; each table has its heading.
- Testing: the whole layout was rendered locally with Jinja2 3.1.6 and mock data (two machines
  with options plus a loose option); the order came out box VF-1, 1 VF-1, 2 HIL, box VF-10/40,
  3 VF-10/40, 4 ACF, 5 TSC, 6 loose option, totals. Not run: printing or PDF on the server.
- Pending: `bench restart` (or `bench clear-cache`) on the server so the changed template is
  read.

**Quotation print: each machine, then its options, also for options added as ordinary lines.**

- Reason: on quotation 26QX000081 the option ACF had been added as an ordinary line (its
  "Sub-Item of" empty), so it printed as a machine with its own specification box, above VF-1.
  The user asked for each machine followed by its options, then the next machine.
- Change (`manav/manav/print_format/manav_modern_quotation/manav_modern_quotation.json`): a line
  with an empty "Sub-Item of" is treated as an option of another machine line on the quotation
  when the Quotation Sub Item Master lists it as that machine's sub-item (and it is not itself a
  machine there). Codes are compared without case. `modified` raised so migrate reloads it.
- Testing: the gathering part of the print format was rendered locally with Jinja2 3.1.6 and
  mock data: [ACF, VF-1] gives VF-1 with option ACF; mixed marked/unmarked lines and an option
  whose machine is missing (loose option) group as expected. Not run: printing on the server.
- Pending: `bench --site <site> migrate` on the Linux server (and on mmblr.frappe.cloud after
  deploy) to load the changed print format. The "Sub-Item of" field of the saved line is not
  filled in by this change; Manav Modern Quotation Head is unchanged.

## 2026-10-15

**Setup also runs when the app is installed (after_install).**

- Reason: after Manav was installed on mmblr.frappe.cloud, its print formats were there but none
  of its custom fields: they are made by the `after_migrate` functions, and installing an app does
  not run a migrate.
- Change (`manav/hooks.py`): `after_install` runs the same functions as `after_migrate` (custom
  fields of Customer, Item, Quotation and others; letter heads).
- Testing: hooks.py compiles; Frappe's installer runs every entry of the `after_install` list
  (frappe/installer.py). Not tested by an install. The cloud site still needs one migrate now,
  because the app is already installed there.

**Copy items, prices, quotation print setup and customers to another site (Frappe Cloud).**

- Reason: the user asked to upload all item data and the quotation printing data to
  https://mmblr.frappe.cloud/, choosing all four groups (items, item prices, quotation print
  setup, customers and contacts) and to skip records the site already has. Frappe Cloud gives no
  bench command line, so the data has to go over the site's API.
- Changes:
  - `manav/manav/site_transfer.py`: `export()` (run on manav.local) writes
    `sites/<site>/private/transfer/manav_transfer.json.gz` with the records of UOM, Brand, Item
    Group, Price List (selling), Region Zone, Territory, Customer Group, Sales Person, Employee
    Master, Letter Head, Terms and Conditions, Quotation Type, Item, Item Price, Quotation Item /
    Sub Item Master, Customer, Address and Contact (those of customers), Customer Contact Person
    and CRM Organization, plus the files they show (item photos, letter head pictures).
    `receive_files()`, `receive()` and `relink()` (System Manager only) store them on the other
    site under their own names, skipping names already there. Company-bound tables (item
    defaults, customer accounts, credit limits) are left out; a customer's mobile/e-mail summary
    is left out so ERPNext does not make a second contact.
  - `tools/push_to_site.py`: sends the transfer file in parts with the other site's API key, read
    from a file outside the project (%USERPROFILE%\.manav_transfer_site.json); rerunnable; writes
    the failed records next to the transfer file.
- Testing: both files compile; the picture-url pattern was checked on sample HTML. Not run: the
  export needs the server, the receive side needs this version of the app deployed on the cloud
  site, and the push needs its API key.
- Run on 2026-10-15 to https://mmblr.frappe.cloud (Manav installed there and the site migrated
  first): every exported record is on the site: Item 5348, Item Price 1750, Quotation Item Master
  6527, Quotation Sub Item Master 6059, Customer 8432, Address 8426, Contact 18094, Customer
  Contact Person 10907, CRM Organization 8432 (+7 already there), Sales Person 122, Employee
  Master 122, Quotation Type 8, Terms and Conditions 6, Region Zone 6, plus the item groups,
  territories, price list and files; 8428 customers got their primary address/contact. Counts on
  the site were compared with the export afterwards: all present. 3 Employee Master records failed
  at first ("Could not find Boss") because their boss came later in the file; sent again, created.
- Fix after the run: `export_names` puts each Employee Master's boss before the employees under
  them (`bosses_first`; tested on sample data including a self-boss and a loop).
- Cleanup: the transfer file, its failure list and the file with the cloud site's API key were
  deleted. The API key was posted in the chat; it should be regenerated on the cloud site.

**GitHub CI: test bench on Frappe 16 with ERPNext.**

- Reason: the "Server" job of the CI workflow failed after the push (exit code 1; the user pasted
  the summary, not the log). The workflow built a bench of Frappe's default branch without ERPNext
  and installed Manav on it, but Manav needs ERPNext 16 (its custom fields and code are on
  ERPNext's Quotation, Item and Customer; `required_apps` and pyproject.toml now say so).
- Changes (`.github/workflows/ci.yml`): `bench init --frappe-branch version-16`;
  `bench get-app --branch version-16 erpnext` and `install-app erpnext` before Manav.
- Testing: the workflow file parses (YAML). Not run: it runs on GitHub after the push. The
  failed run's log was not seen, so this fixes the cause found in the workflow; if the job still
  fails, its log shows the next one.

**App can be added on Frappe Cloud: Frappe/ERPNext versions declared, ERPNext required.**

- Reason: Frappe Cloud's "Add app from GitHub" refused the repository: "Could not find a
  compatible Frappe version in pyproject.toml ... ensure '[tool.bench.frappe-dependencies]' is
  defined".
- Changes: `pyproject.toml` has `[tool.bench.frappe-dependencies]` with frappe and erpnext
  `>=16.0.0,<17.0.0` (the bench runs Frappe 16.33.1; the app uses ERPNext 16's Quotation, Item and
  Customer). `manav/hooks.py`: `required_apps = ["frappe/erpnext"]`.
- Testing: pyproject.toml parses (tomllib) with the new section; hooks.py compiles. Not tested on
  Frappe Cloud (needs the change pushed to GitHub).
- Pending: commit and push. `manav/manav/legacy_data/` is in .gitignore, so the old data and the
  import tools that read it are not in the repository; the imports run only on this server.

**Old quotations made into ERPNext Quotations, with their lines from the report "35-Quotation-Item".**

- Reason: the user supplied the old system's report of all quotation lines (2788 pages; also as
  .xls) and chose to have the old quotations made as ERPNext Quotations. Quotation Head already
  held the 22527 old quotations, but without lines.
- Changes:
  - `manav/manav/legacy_data/convert_quotation_lines.py` (tool, run on a developer machine): reads
    the report's .xls (one column of printed text) into `legacy_data/quotation_line.json.gz`:
    34899 lines of 21992 quotations with item code, Sr, description, qty, rate, amount, discount %
    and amount, net amount. Descriptions printed on lines above/below the report line are joined
    back; item codes are matched against the old item masters (codes with spaces, codes running
    into the Sr column); lines without an item code are kept.
  - `manav/manav/legacy_quotations.py`: `run()` makes one ERPNext Quotation per old quotation with
    lines, named by the old number (set_name, so no naming rule renumbers it): Customer, Contact,
    address, principal, letter head, currency (RS -> INR, US$ -> USD; ERPNext's exchange rate of
    the month), Your Reference, Signed By / Sales Engineer, Haas Cust ID, machine number, the old
    terms, and the lines at their old prices (list rate, discount, net rate; pricing rules off).
    Valid till 30 days after the date; submitted. Missing item codes become Items (not stock;
    lines without code use OLD-NO-CODE). Dry run by default (each quotation made and rolled
    back); skips quotations already made, so it can run in parts.
- Testing (on Windows, not on the site): every report line is read (0 unread); for all 32726
  priced lines qty x rate = amount and amount - discount = net; no (quotation, Sr) twice; the
  pricing of every line was run through the importer's item_row (rate x qty = old net, list rate
  - discount = rate, no negative rate); a sample of wrapped descriptions read back correctly. The
  importer compiles; it was not run against ERPNext (needs the server).
- Found: 10509 old quotations have a header total different from the sum of their lines (often
  0 in the header), with no mark in the report to tell lines apart; ERPNext totals the lines.
  536 old quotations have no lines in the report and are not made; 1 report quotation has no old
  header.
- Fix after the first run on the server (it stopped with KeyError 'quotation_date' before making
  anything): 3 old quotations (13QX000506, 16QX000197, 24QX001104) have no date; their creation
  date in the old system is used (`date_of`).
- Pending: dry run and the real run on the server; the old sales tax is not carried over (8736
  quotations; needs a tax account per company); the print of an imported quotation not checked.

**Upgrade-safety review of the Manav app (rules of the new global skill frappe-upgrade-safe).**

- Reason: the user asked that the Manav project survive `bench update` and future Frappe/ERPNext
  versions, using Frappe's built-in customization rather than code that an update overwrites.
- Found already in order: all changes live in the Manav app; no file of Frappe or ERPNext was
  changed by it. Fields on ERPNext/Frappe doctypes (Customer, Item, Quotation, Quotation Item,
  Sales Person, Contact) are Custom Fields with the `custom_` prefix, created on every migrate by
  `after_migrate`; the Quotation's default print format, the Items table order and the Quantity
  width are Property Setters made there too. Server logic attaches through `doc_events`
  (autoname, validate), form logic through `doctype_js`; no overridden doctype classes or
  methods, no monkey patching. The four print formats are standard, of module Manav, so they ship
  with the app.
- Changed:
  - `manav/manav/quotation.py`: `last_number` uses Frappe's query builder instead of SQL text on
    ERPNext's `tabQuotation` (same query: MAX(name), LIKE prefix%, LENGTH = prefix + 6; checked by
    rendering it with pypika).
  - `manav/public/js/quotation.js`: ERPNext's `frm.cscript.calculate_taxes_and_totals` is only
    called when present; the upgrade note lists every Frappe internal the file uses, checked on
    Frappe 16.33.1.
  - `manav/public/js/item.js`: Frappe's internal `frm.attachments.attachment_uploaded` is checked
    before it is called.
- Testing: Python compiles; both scripts parse (node); the new query renders to the same SQL. Not
  run on the server.
- Pending / outside this app: the bench's own copies of Frappe and ERPNext have edits from
  2026-09-23/26 that are not from Manav (ERPNext's Employee doctype: two permission rows and
  read_only; Frappe's modules.txt: module "Evision"). `bench update` will clash with or drop them;
  they belong in the app that needs them (Custom DocPerm / Property Setter, the module in that
  app). Settings made in the site's UI (Customize Form, Client/Server Scripts) survive updates but
  are not in the app's code; they were not checked from here (needs the site's database).

**Quotation form: no row number on sub-items; machine colour on the whole line; "+" fixed.**

- Reason: the user's next screenshot showed the sub-items numbered 2 to 5 in No. ("for sub-items
  don't add these numbers"), the machine line coloured only in some cells while open for typing,
  and the "+" still above the pen.
- Causes: Frappe 16 keeps the pen element itself (`.btn-open-row`), not its cell, in
  `grid_row.open_form_button`, so the "+" was put inside the pen's box and the cell styles did not
  reach it. An open line's input boxes have their own white background.
- Changes (`manav/public/js/quotation.js`): the "+" is put into the cell in front of the pen; No.
  shows 1, 2, 3 for the machines (and unfilled lines) and nothing for sub-items (only the shown
  text; idx and the order are Frappe's); input boxes of a machine line are see-through so the
  whole line shows the colour.
- Testing: the script parses; checked against Frappe 16's grid_row.js (open_form_button,
  set_row_index runs before `grid-row-render`). Not looked at in the browser.
- Pending: cache clear and browser reload on the site. After rows are dragged into a new order,
  No. may show Frappe's numbers until the table is drawn again (save or reload).

**Quotation form: machine lines coloured; "+" beside the pen instead of above it.**

- Reason: the user's screenshot showed the "+" above the edit pen, making each machine row twice
  as high, and they asked for the machines' rows to be coloured. (The Sub-Item Sr.No column was
  missing because the migrate on the server ran at 14:17, before that field was added at 14:23.)
- Changes (`manav/public/js/quotation.js`): on `grid-row-render` a machine's line gets the class
  `manav-machine-row`, styled with Frappe's `--bg-blue` (light and dark theme) and semi-bold text;
  the cell with "+" and pen is kept on one line (no wrap, 52 px wide at least).
- Testing: the script parses; the CSS selectors were checked against Frappe 16's grid_row.js
  (`.grid-row > .data-row.row > .col`, `.static-area`). Not looked at in the browser.
- Pending: `bench --site manav.local migrate` (for Sub-Item Sr.No), a cache clear and a browser
  reload.

**Quotation form: Sub-Item Sr.No column, and the sub-items already chosen shown ticked.**

- Reason: the user asked for a column "Sub-Item Sr.No" beside No. with the number of each
  sub-item, and for the sub-items already on the quotation to be ticked in the list.
- Changes:
  - `manav/manav/erpnext_fields.py`: new Quotation Item field `custom_sub_item_sr_no` ("Sub-Item
    Sr.No", read only, in the Items table). `place_sub_item_no_first()` puts it in front of Item
    Code with a `field_order` property setter, so it shows right after No., and sets Quantity to
    one column (from two) so the table keeps its width.
  - `manav/manav/quotation.py` + `hooks.py`: `number_sub_items` on Quotation's validate numbers the
    sub-items of each machine 1, 2, 3 in line order; machine lines have none.
  - `manav/public/js/quotation.js`: the sub-items dialog lists all sub-items of the machine, those
    on the quotation ticked; "Update" adds the newly ticked ones under the machine and takes the
    unticked ones off. The numbers are set again after the dialog and after a line is deleted.
- Testing: in node with stand-ins for Frappe, the dialog for VF-2 showed its two sub-items on the
  quotation ticked; unticking one and ticking another removed and added the right lines (under
  VF-2) and numbered them 1 and 2. The Python numbering gave 1, 1, 2 for sub-items of two
  machines. Files parse/compile. Not tested in the browser or on the site.
- Pending: needs `bench --site manav.local migrate` (field, order, Quantity width), a cache clear
  and a browser reload; quotations saved before get their numbers when next saved. Deleting a
  machine's line leaves its sub-items (as before).

**Quotation form: options called sub-items, and added from the machine's own line.**

- Reason: the user asked for "Sub-Items" in place of "Options", and for the button to add them
  beside the edit pen of the machine's line instead of under the Items table.
- Changes:
  - `manav/public/js/quotation.js`: each machine line of the Items table has a "+" beside its edit
    pen (added on Frappe's `grid-row-render` event); it opens the sub-items of that machine only.
    The "Add Options" button under the table is gone; the one at the top of the form is "Add
    Sub-Items" and still offers the sub-items of all machines. The dialog and its messages say
    sub-items. Ticked sub-items are put under their machine's line (after its earlier sub-items)
    instead of at the end of the table.
  - `manav/manav/erpnext_fields.py`: Quotation Item's "Option of Item" is labelled "Sub-Item of".
- Testing: the ordering function was run in node on a sample table (two machines, a sub-item
  each, an empty line): new sub-items went under the right machine and the lines were numbered
  1 to 6; quotation.js and erpnext_fields.py parse. Not tested in the browser or on the site.
- Pending: the new label needs `bench --site manav.local migrate` on the server; the script needs
  a cache clear and a browser reload. The data keeps its names (Quotation Sub Item Master, item
  group Options).

**Haas machine Items: short Item Name in place of the catalogue text.**

- Reason: the user pointed out Item Names such as "Super-Speed Vertical Machining Center; 50" x
  20" x 25" (1270 x 508 x 635 mm), 40 taper, 30 hp ..." and did not want the description in the
  name. The old item master held the catalogue line as the name; the import cut it at 140
  characters. The full text is in the Item's Description.
- Changes: new `manav/manav/haas_item_names.py`. `run()` renames Items of the group Machines whose
  name holds catalogue text to "Haas USA Make <kind> Model <code>" (the style of the machines that
  already had a short name; the user chose it), the kind being the text before the first ";" or
  ", <figure>". Only Item Name is changed; an empty Description gets the old name.
- Testing (on Windows, with a stand-in for Frappe's database, not on the site): on the legacy
  item data 84 Items are renamed (VF, VM, VS, UMC-750, ST, DS, TL, TM, EC, HS-3R, GR, DT-1, Mini
  Mills, OL/OM); bar feeders, rotary tables and spares keep their names; the longest new name is
  under 110 characters. Not run on the server.
- Pending: the dry run and the write have to be run on the server (commands in the module).
  Quotations made before keep the item name they were made with.

**Haas machine Items: shipping size and weight added to Specifications from Haas document
ES0428.**

- Reason: the user asked for the specifications of each Haas machine on its Item. haascnc.com
  could not be read from here (its Cloudflare check answers 403), so the user supplied Haas's
  "Shipping Dimensions, Weight, and Crating Information" (ES0428 Rev DN, August 2020) to use
  instead.
- Changes: new `manav/manav/haas_shipping.py`. It holds the document's domestic pallet, export
  pallet and export crate sizes and the weight (S.A.E. and Metric) for 104 machine models (65 rows of the document), and
  `run()` writes them into `custom_specifications` of each matching Item that has none, as a
  block "#Shipping Dimensions and Weight || S.A.E. || Metric" with a source line. Item codes with
  a trailing "." or "-I" and the old names MINIMILL/SMINIMILL(2) and GM-2 are matched to their
  model. Option rows of the document (50+1 SMTC, EC8, conveyor, pallet pool), rotary tables and
  accessories are not used. Photos are not touched (the document has none).
- Testing (on Windows, with a stand-in for Frappe's database, not on the site): run against the
  230 machine codes of the legacy item data, 122 Items match and every model of the table is
  used; an Item with Specifications is skipped. The written text passes through the Item form's
  "Format: all rows" unchanged (node, public/js/item.js). Not run on the server; not checked in
  the quotation print.
- Pending: the dry run and the write have to be run on the server (commands in the module).
  Pressing "Format: key specifications" on such an Item drops the shipping block (it drops
  blocks named shipping/dimension). Machines not in the document (e.g. ST-15Y, ST-20L, UMC-350,
  UMC-1250, VF-14/40, VS-3, EC-630) get nothing. Full machine specifications and photos still
  need the haascnc.com pages; `manav/manav/haas_specs.py` (added earlier the same day, not
  from this change) downloads them from the server and is likely to be blocked the same way.

## 2026-10-14

**Quotation print: the head made shorter so that it repeats on every page also on US Letter paper.**

- Reason: the user reported the head (letter head and quotation box) not on every page and asked for
  neatly aligned pages. On US Letter paper, which a printer or browser set to Letter uses, the head
  was taller than a quarter of the page, the most a browser repeats; it then printed on the first
  page only. On A4 it repeated.
- Changes (`manav/templates/print_formats/manav_modern_quotation_body.html`): less space above and
  below the head, a slimmer title strip, Kind Attn and the phone on one line (the phone kept in one
  piece), the customer column 57% wide with the address in 8 pt so that a long address takes two
  lines. The head now ends at about 58 mm with a long address, under the limit on A4 (74 mm) and on
  Letter (70 mm).
- Testing: the sample was printed with Edge on A4 and Letter with a short and with a long address,
  and with Chrome and Firefox on A4 (one machine, and 23 lines): the full head on every page in all
  cases, all pages with the same left and right edges, the lowest text 8 to 25 mm above the footer.
  The render checks pass. Not tested on the site.

**Quotation print from the browser: the quotation starts on the first page again, and stays clear
of the footer.**

- Reason: the user's print of a one-machine quotation came out as three pages: the head alone on
  the first, everything else on the second running into the footer, and a third page with only
  the footer. They asked for the quotation on two pages.
- Causes, found by printing the layout in Chrome 155 and Firefox 157 on this machine, with the
  print view's own styles added to the test page:
  1. The print view loads Bootstrap's print rule `tr { page-break-inside: avoid }` and Frappe's
     `table td div { page-break-inside: avoid !important }`. The whole quotation sat in one row of
     the table that repeats the head and the footer, so it became one piece that may not be split:
     Firefox moved all of it past the first page (Chrome did not, which is why earlier tests here
     looked right).
  2. Frappe's standard.css turns every `tfoot` into a header group ("hack for webkit specific
     browser"), so the foot row that keeps the room for the footer did not stay at the bottom of
     the pages, and text ran under the footer in both browsers.
- Changes (`manav/templates/print_formats/manav_modern_quotation_body.html`, both print formats):
  - The page is put out in pieces, each in its own row of that table: each machine's box, each
    line, the totals, each term (the first with the title and the column headings), the
    signature. A page now ends between two pieces. The lines and the terms are small tables of one
    row each with fixed column widths, so they still read as one table. In the PDF made on the
    server the pieces simply follow one another.
  - The head and foot rows of that table are kept as head and foot rows (`display:
    table-header-group` / `table-footer-group`, overriding Frappe's rule).
  - The rule added earlier the same day that allowed the row to break is gone.
- Lost: the column headings of the line table are no longer repeated on a page where the lines go
  on (the head of the page, with the quotation box, still is).
- Testing: the user's case (one machine with picture and specifications, one line, ten terms) and
  a quotation of 23 lines were printed with Chrome and with Firefox (headless; Firefox through its
  WebDriver BiDi agent) and looked at: two pages and three pages, the head and the footer on every
  page, the lowest text 10 to 16 mm above the footer, terms going on from one page to the next.
  All render checks pass (the two copies are now compared by their text). Not tested: the print
  view of the site itself, and the PDF made on the server.

**Quotation print: blank band above the page removed; head and machine box polished.**

- Reason: the user's print preview showed a large blank band above the letter head ("remove this
  blank space and make it more attractive").
- Cause: the rule that gives the PDF its page margins (`.print-format { margin-top: ...mm }`, added
  earlier the same day) was cancelled only inside the print view's gutter; the print preview inside
  the form has no gutter, so the 50 to 70 mm showed there as space.
- Changes (`manav/templates/print_formats/manav_modern_quotation_body.html`, both print formats):
  - The cancelling rule is now `.print-format.print-format { margin-top: 0 !important; ... }`,
    which weighs more in every view and which Frappe does not read as page margins (checked by
    running Frappe's selection with cssutils on the two rules: only the one-class rule is passed).
  - The title strip QUOTATION is dark (#1f2937) with white letters.
  - The date is written short and on one line ("13 Oct 2026").
  - A machine whose name is too long for the chip has the name printed beside the chip, cut at 95
    letters, instead of the code alone.
- Testing: all render checks pass; a page laid out like the print preview (no gutter) was shown in
  Edge and looked at: no blank band; the sample was printed on A4 and looked at. On US Letter paper
  the slightly taller title strip now makes the head print on the first page only; on A4 it
  repeats. Not looked at on the site.

**Quotation PDF: page margins for the repeated head; the letter head at full width again.**

- Reason: the user's PDF (Get PDF, made by wkhtmltopdf, with the letter head "Company Letterhead -
  Grey") showed the head of the page and nothing else; and the letter head in the browser's print
  was small and centred ("format this letter head properly").
- Cause of the empty PDF, as far as could be found from the code (the PDF was not produced here):
  wkhtmltopdf draws the head of the pages inside the top page margin, and Frappe gives it a top
  margin of about 10 mm. The head is some 60 mm high, so it was drawn over the page and the
  quotation could not be seen. The server's log shows two errors during "download pdf" for
  26QX000076 at 09:37 the same morning, whose details are in the site's Error Log and were not read.
- Changes (`manav/templates/print_formats/manav_modern_quotation_body.html`, both print formats):
  - The page margins of the PDF are given to Frappe the way it reads them, as a rule
    `.print-format { margin-top: ...; margin-bottom: ... }`, worked out from what the head holds
    (letter head, box, and about 3.6 mm per line of the customer's address) and from whether the
    letter head has a footer. A second rule keeps the page itself without these margins.
  - The letter head picture may be 27 mm high (it was capped at 20 mm, which made a wide banner
    such as Manav Letter Head 2025 narrow and centred); such a banner now fills the width of the
    page (186 mm, as wide as the box and the footer). The top space of the head row is 4 mm.
- The browser's print still repeats the head on every page on A4 (head 65 mm, 69 mm with a
  three-line address, limit 74 mm). On US Letter paper a three-line address now passes the limit
  and the head is then printed on the first page only.
- Testing: render checks pass (the margin rule included). The sample was printed with Edge
  (headless) on A4 and Letter, short and long address, and looked at: letter head 186 mm wide, head
  on every page except Letter with a long address. Not tested: the PDF made on the server; the
  margin values are worked out, not measured in a wkhtmltopdf PDF.

**Quotation print: the whole quotation header on every page, as on the old printed quotation.**

- Reason: the user showed a two-page quotation of the old system (26QX070512), whose header box
  (customer, address, Kind Attn; Document No., Date, Ref. No., Ref Dt., Sales Engg., Cust ID)
  repeats on every page, and asked for the information to be printed that way on all pages.
- Change (`manav/templates/print_formats/manav_modern_quotation_body.html`, both print formats):
  the head of every page is now the letter head, then a bordered quotation box whose top strip is
  the title QUOTATION, with the customer, its address, Kind Attn and phone on the left and the
  quotation number, date, Cust ID, Ref. No., Ref Dt. and Sales Engg. on the right. It replaces the
  number / date band of every page and the customer box of the first page only. "Issued By" (the
  company's name and address, and FMT: QUOT-11) is left out, as on the old print, where the letter
  head carries the company.
- Limit found while testing: a browser repeats the head row of a table on every page only while
  that row is at most a quarter of the page high (about 74 mm on A4, 70 mm on Letter). The first
  version of this head was about 73 mm and printed on the first page only. The head was therefore
  made shorter: the letter head picture at most 20 mm high, the title as the box's top strip, the
  references two to a row, smaller top margin. It now ends at about 59 mm, or 63 mm with a
  three-line address. A much longer address or a much taller letter head could again pass the
  limit; the head would then print on the first page only.
- Testing: the render checks were changed to check the text of the head (the same in the browser's
  copy and in the PDF's copy, once each); all pass for Quotation and Quotation Head. A sample of 23
  lines with the Jagdeep terms was printed with Edge (headless) on A4 and on Letter, with a short
  and with a three-line address, and looked at: the full head on every page (3 or 4 pages), no
  value wrapping, letter head and footer on every page. Not looked at on the site; the head in the
  PDF made on the server (wkhtmltopdf) has not been seen.

**Quotation print: the terms as a proper table, and a quotation band at the head of every page.**

- Reason: the user asked for the terms "more proper with table" and for the quotation number box on
  every page.
- Changes (`manav/templates/print_formats/manav_modern_quotation_body.html`, both print formats):
  - Band at the head of every page, under the letter head (or the company name without one): the
    quotation number on the left, the title QUOTATION in the middle, the date on the right. It
    replaces the separate title and the number / date band at the top of the quotation box. Its
    look is written into the tags, because the PDF maker draws the head of the pages without the
    page's styles.
  - Terms: one bordered table across the page with a shaded heading row (No. / Term / Details), a
    line under each term, the term's heading in bold; a second line of a term (no number, no
    heading) joins the term above. Breaks the old system left inside a sentence (a break followed
    by a small letter) become spaces; other breaks (address lines, list items) stay. The table may
    run on over the next page between two terms, with its heading row repeated; the title stays
    with the first rows. The two-column layout and its cut are gone.
- Testing: the three render checks pass with the new markup (band in both copies, the terms table
  with heading, numbered rows and continuation rows, Quotation and Quotation Head). A sample with the
  ten Jagdeep terms of the user's screenshot and 23 lines was printed to PDF with Edge (headless)
  and looked at: 4 pages, the band on every page, the terms table running from page 3 on to page 4
  with its heading repeated, the broken sentences joined. Not looked at on the site; the band in
  the PDF made on the server (wkhtmltopdf) has not been seen.

**Quotation print: one quotation box with the number at its top left.**

- Reason: the user asked for the customer / issuer part to look better, with the quotation number at
  the top left in the box.
- Change (`manav/templates/print_formats/manav_modern_quotation_body.html`, both print formats): the
  grey box, the strip with date and number and the row of references are one bordered box:
  - a shaded band across its top with "Quotation No." and the number (large) on the left and the
    date on the right;
  - below it "Quotation To" and "Issued By" side by side, divided by a line; addresses are one run
    of text (lines joined by commas) instead of one line per part; Kind Attn and Ph. under the
    customer; "FMT: QUOT-11" under the issuer;
  - the four reference fields (Ref. No., Ref Dt., Sales Engg., Cust ID) at its foot.
  - The date under the title QUOTATION was dropped, as it is in the box. Shaded parts are printed
    also when the browser's "Background graphics" is off.
- Testing: the three render checks pass with the new markup (number and date in the box, addresses
  on one run, Kind Attn, references; Quotation and Quotation Head). A sample was printed with Edge
  (headless) and the box looked at. Not looked at on the site.

**Specifications typed on an Item after its quotation line was made now print, also when typed with
running numbers.**

- Reason: the user typed specifications on an Item ("Description : Unit || Specification", then
  "1 : Table Diameter (Manual Chuck) || 1200" and so on) and they did not appear on the quotation.
- Causes found:
  1. The quotation prints the Specifications of the quotation line, which are copied from the Item
     only when the item is chosen on the line. A line made before the Item had specifications keeps
     an empty field. Quotation Head printed only its own Specifications rows.
  2. In the layout, "1 : Table Diameter || 1200" would have printed the running number "1" as the
     name and "Table Diameter / 1200" as the value; the first line would have printed as a cell
     "Description: Unit / Specification".
- Changes:
  - `print_format/manav_modern_quotation/`: a line without Specifications prints those of its Item.
  - `print_format/manav_modern_quotation_head/`: a machine without Specifications rows prints those
    of the ERPNext Item with the same code.
  - `manav/templates/print_formats/manav_modern_quotation_body.html`: a line "number : name ||
    value" is read as name and value; a first line of the same form without a number, above
    numbered lines, is read as the heading (column titles).
  - `manav/public/js/item.js`: the Format buttons rewrite such text as "#Description || Unit ||
    Specification" and "Table Diameter (Manual Chuck) : 1200".
- A line's own Specifications still win over the Item's, so text changed on one quotation stays.
- Testing: the formatter was run with Node on the user's text (all rows and key rows, second run
  changes nothing, Haas and plain lines untouched); both print formats were rendered with that text
  kept on the Item only (name / value cells, heading, no running numbers); all earlier checks pass.
  Not run on the site.

**Quotation print: the picture of the machine in its specification box.**

- Reason: the user asked for the image of the item on the quotation.
- Changes:
  - `manav/templates/print_formats/manav_modern_quotation_body.html` (shared layout): a machine
    with a picture shows it on the left of its "Equipment Specification" box (about a third of the
    width, at most 45 mm high), with the specifications beside it, one cell fewer to a row (three
    name / value cells, or two cells of a description). A machine without a picture prints as
    before. Options in the line table get no picture.
  - `print_format/manav_modern_quotation/`: the picture is the Image of the quotation line (ERPNext
    copies it from the Item when the item is chosen), else the Item's Image, for lines made before
    the Item had one.
  - `print_format/manav_modern_quotation_head/`: Quotation Head has no picture field; the Image of
    the ERPNext Item with the same code is used.
- Where the picture comes from: the Image field of the Item (the picture at the top left of the
  Item form). How many Items have one on the site is not known here; the item import did not load
  any pictures.
- Testing: both render checks pass, with a new case (picture on the left, the box closed after the
  text). A sample with a picture was printed to PDF with Edge (headless) and looked at: picture on
  the left, specifications in two columns beside it, letter head and footer on each page. Not
  tested: the site's print view, a private picture (one uploaded as private), and the PDF made on
  the server.

## 2026-10-13

**Quotation print: the specifications are a table with S.A.E. and Metric columns, in place of the
description paragraph.**

- Reason: the user asked for the item on the printed quotation to show the table of the maker's page
  (block title, S.A.E., Metric; one specification to a row) instead of the description paragraph.
- Changes:
  - `print_format/manav_sales_quotation/`: an item line that has Specifications prints them as a
    full-width table with the columns label, S.A.E. and Metric, and its description is not printed.
    The shaded heading row of a block carries the column titles. A line with one value puts it
    across both value columns; a line without " : " fills the row. A line without Specifications
    prints its description as before.
  - `manav/public/js/item.js`: the two Format buttons keep both values of a pasted row, as
    "label : S.A.E. value || Metric value" (before: the Metric value only). Two bars separate the
    values because a single bar occurs inside values on the maker's page (Taper).
  - `item_fields.py`, `erpnext_fields.py`: the help texts of the two Specifications fields.
- Testing (on the Windows machine, outside Frappe):
  - Formatter run with Node on the Travels and Spindle rows of the user's screenshot: output as
    expected for "all rows" and "key specifications", a second run changes nothing, and lines
    formatted before this change, hand-typed lines and bold lines are left as they are. Passed.
  - Print template rendered with Jinja and a stand-in for `frappe`: heading row with unit titles,
    three-cell rows, one-value rows, bold row, plain line, no description when there are
    specifications, description kept when there are none, options and price. Passed.
  - `item_fields.py` and `erpnext_fields.py` compile.
  - Not done: `bench migrate`, opening the Item form, and printing a quotation on the site. The look
    on paper (widths, type size, page breaks) has not been seen.
- Then, on request (the Jagdeep site's table has another shape: Description, Units and one column
  for each of eight models, JVTC/JVTM-1 to 4, with section rows such as Travel and Electric Motors):
  - The titles of the two value columns are no longer fixed. A heading line written as
    `#Title || Column 2 || Column 3` gives them; the print format reads them from there. A Haas
    paste gives `#Travels || S.A.E. || Metric`. A heading without titles is printed across the row.
  - `manav/public/js/item.js`: a pasted table that has a row starting with "Models" is read as a
    table of several models. The Format buttons then ask which model column to keep and suggest
    the one whose number is in the item code (item JVTC-2.5, column JVTC/JVTM-2.5). The result is
    `#Descriptions || Units || JVTC/JVTM-2.5` and lines `label : unit || value`. A value written
    once across all models is taken for every model; a row without a unit gets "-"; section rows
    become headings; the notes below the table and the operations line above it stay as plain lines.
  - The key rows list (`MANAV_KEY_SPECIFICATIONS`) has the Jagdeep row names: table diameter,
    maximum turning diameter and height, work piece weight, axis travels, main spindle motor, table
    speeds and CNC control. This choice is a judgement, like the Haas one.
  - How the Jagdeep page arrives when pasted was not seen: the rows were typed from the user's
    screenshot, assuming cells separated by tabs and a merged cell pasted as one cell. The Jagdeep
    site was not read.
  - Testing: the formatter was run again with Node on the Haas rows and on the Jagdeep rows of the
    screenshot (model list, suggested column for four item codes, all rows and key rows for
    JVTC/JVTM-2, other columns, second run changes nothing); the render check was extended with a
    Jagdeep item. Both pass. The first run of the key rows check failed because the page writes
    "Max.Turning" without a space; the pattern was corrected. The model question on the Item form
    was not opened in a browser.
- Then, because the user could not copy the table from the Jagdeep site:
  `manav/manav/specification_tables/jagdeep_cnc_vtl_vtm.tsv` (new) holds that table as text, cells
  separated by tabs, ready to be pasted into the Specifications of a Jagdeep CNC item and formatted.
  - Source: the user's screenshot of the page "CNC VTL/VTM Machine" (jagdeepfoundry.in,
    `17-cnc-vtl.html`), compared with a reading of the page made through a web fetch tool. That
    reading is a retelling of the page, not its exact text, so the screenshot was followed.
  - Differences from the page, made on purpose: "Z-Axis (Vertical Ram Travel)" and "Z-Axis Servo
    Motor" have their value in the Units column on the page; here the units are MM and N-M (as on
    the X-axis rows) and the values 900/1100 and 40. The moveable cross rail row has no unit on the
    page; here MM. "Simens" is written Siemens. The two C-axis values are ±15 and ±5 with the unit
    Arc sec in the Units column only. Label spacing and capitals are made regular.
  - The table has no column for JVTC-5 and JVTM-1.6, and the conventional JVT machines are on
    another page; these items are not covered by the file.
  - Testing: the formatter was run on the file for each of the eight models (29 lines each, every
    row with a unit and a value, a second run changes nothing, six values compared with the
    screenshot). Passed. The values were not checked with Jagdeep.
- Then, on request ("add option in that specification for screenshot"): a button "From screenshot"
  under Specifications on the Item form, for makers' pages whose table cannot be copied.
  - `manav/public/js/item.js` (`manav_read_screenshot`): uploads a picture (PNG, JPEG, GIF, WebP) as
    a private attachment of the saved Item, has it read on the server, and puts the text into
    Specifications unformatted, after asking before it replaces text that is already there. A
    message tells the user to compare every value with the screenshot before formatting and saving.
  - `manav/manav/specification_screenshot.py` (new): `read_table` checks that the user may change
    Items and read the file, refuses a file that is not a picture or is over 4 MB, and sends the
    picture to Claude (Anthropic's API, model `claude-opus-5-5`) with instructions to type the table
    out as tab-separated lines, exactly as shown, with `[unreadable]` for a cell it cannot read. A
    declined picture is retried on Anthropic's substitute model within the same request
    (`fallbacks: "default"`). One request may take 50 seconds and is tried once more on a failure
    that can pass, to stay inside Frappe's two-minute request limit.
  - `pyproject.toml`: dependency `anthropic>=1.13,<2`.
  - Setup needed on the server, once: `bench pip install anthropic`, and the API key in the site
    configuration under `anthropic_api_key` (it is not in the code or in this repository). The
    server must reach api.anthropic.com. Each screenshot read is charged to that key, and the
    screenshot is sent to Anthropic.
  - Testing: the server module was run outside Frappe with a stand-in for `frappe` and the real SDK
    (1.13.0) on a replaced network layer, so nothing was sent: the request it builds (model, effort,
    fallback, picture, key header), the cleaning of the answer, the four refused inputs, the three
    non-table answers and the four service failures all behave as intended (12 checks, passed).
    `item.js` passes a syntax check and the earlier formatter checks.
  - Not tested: no picture has been read through the real service (there is no key here), so how
    accurately a real screenshot is read is unknown. The button and the upload window were not
    opened in a browser.
- Then, on request ("if no specification then show description in proper table format"): in
  `print_format/manav_sales_quotation/`, an item line without Specifications prints its description
  as a table when the description is written as a list.
  - "Title; feature, feature, ..." (89 of the old Haas machine descriptions are written so): the
    title is a shaded heading row and the features fill the cells below it, two to a row. A list
    with commas only is treated the same when it has six parts or more ("CNC Lathe, ...").
  - Several lines with "label : value" among them (the Chmer machines): the first line is the
    heading row and the other lines are rows, as for Specifications.
  - Every other description is printed as plain text as before: short names, spare parts (so that
    "CABLE, AXIS, BRUSHLESS" is not cut up), a title with a single remark.
  - The description is a text editor field and may be stored as HTML; its tags are removed before
    it is cut into cells. A comma inside a number (12,000 rpm) does not cut. The last feature keeps
    its "and" ("rigid tapping and 95-gallon ... coolant system"): it is not split further.
  - The rule of six parts is a judgement made from the 5252 old item descriptions.
  - Testing: the template was rendered with a stand-in for `frappe` and descriptions taken from the
    old item data: the VF-5SS description of the user's screenshot (as HTML and as plain text), a
    lathe, a Chmer machine (plain and HTML), four descriptions that must stay plain, an item with
    Specifications, an item without a description, and a quantity other than 1 (12 checks,
    passed). The earlier render check still passes. Not printed on the site.
- Then, on request ("make new and let it be default quotation template"): a new print format
  `print_format/manav_modern_quotation/` ("Manav Modern Quotation") for ERPNext's Quotation, made
  the default.
  - Design: the user's file `quotation_template (2).html` ("Modern Minimalist Black & White"), the
    newest of three versions in their Downloads folder. That file was a sample with typed-in
    figures, styled by Tailwind and a web font loaded from the internet. The print format has the
    same look written as plain CSS and tables, because wkhtmltopdf runs no such scripts and has no
    flexbox or grid, and it reads every value from the quotation.
  - Layout: head (letter head, else company name; title and date), grey box "Quotation To" /
    "Issued By", strip with date and number, one "Equipment Specification" box per machine, the
    line table (each machine followed by its options; price, quantity, total), totals, and a foot
    with payment schedule and validity, terms, and the signing sales person.
  - Specifications in the box are label / value cells, four to a row: a Haas line shows
    "S.A.E. / Metric" (once when both are the same), a Jagdeep line shows the value with its unit
    ("2000 MM"). An item without Specifications shows its description by the rules added earlier
    today (feature cells, rows, or plain text).
  - Kept from the old layout though not in the sample: Kind Attn, the customer's reference, Sales
    Engg. and Cust ID (shown only when filled). Left out of the sample: its print button bar, its
    invented logo mark and tagline, and its sample names and addresses.
  - `erpnext_fields.py`: the default print format of Quotation is the first of "Manav Modern
    Quotation", "Manav Sales Quotation" that is on the site. The old format stays selectable.
    The default of Quotation Head (old quotations) is unchanged.
  - Testing: the template was rendered outside Frappe with stand-ins and a quotation of seven lines
    (a Haas machine with specifications and an option, a Haas machine with only a description, a
    Jagdeep machine, a Chmer description, a plain description, an option without its machine), once
    without and once with taxes and a letter head (43 checks, passed). The first run showed a unit
    and value the wrong way round in a later section of a Jagdeep table; corrected. `erpnext_fields.py`
    compiles.
  - Not tested: nothing was rendered by Frappe or turned into a PDF, so how wkhtmltopdf draws it
    (fonts, spacing, page breaks, the rupee sign) has not been seen; the change of default was not
    run. The sample's font (Inter) is used only if the server has it; otherwise Helvetica or Arial.
  - After the user saw it on the site ("switch this"): in the specification box the machine's name
    is on the left and the caption "Equipment Specification" on the right; they were the other way
    round. Render check passes; not looked at on the site after the change.
  - Then ("switch payment term up and terms and conditions into two columns"): Payment Info is
    beside the totals, on their left; the terms run across the page in two columns with the
    signature below them. The rows of the terms table are dealt into two tables side by side
    (first half left), and the cut is moved down when the right column would start with a row
    that continues the term above it. Terms typed as paragraphs or a list are flowed over two CSS
    columns instead. Render check extended (payment beside totals, the cut, both kinds of terms,
    signature after the terms) and passes; not looked at on the site after the change. The CSS
    columns of the second case depend on wkhtmltopdf and were not seen.
  - Then ("make item name bold instead of specifications"): in the specification box the machine's
    name is the bold element (heavier and slightly larger); the specification values are in normal
    weight, and the caption "Equipment Specification" and the group titles are lighter. Render
    check passes; not looked at on the site after the change.
- Then, on request ("when quotation type is machine use this letter head"): the Haas Factory Outlet
  header for the machine quotations.
  - `manav/public/images/haas_factory_outlet_letter_head.jpg` (new): the header picture, the user's
    file `manav-haas-letterhead-1-2021.jpg` (2090 x 388).
  - `manav/manav/letter_heads.py` (new), hooked to `after_migrate` in `hooks.py`: makes the Letter
    Head "Haas Factory Outlet" (the picture across the page) when it is missing, and sets it on the
    Quotation Type whose description is MACHINES (type 1) when that type has no Letter Head. It is
    not made the site's default letter head. A Letter Head or a choice made by hand is not changed.
  - Only type 1 gets it. CHMER (6) and JAGDEEP (7) are machines of other makers and were left
    without a header.
  - `print_format/manav_modern_quotation/`: a letter head is printed across the top of the page
    with the title below it on the right; before, it stood in a cell beside the title, which is
    too narrow for a banner.
  - A quotation takes the header when its principal is chosen. Quotations made before this keep
    what they had; their Letter Head can be set on the quotation or in the print window.
  - Testing: `letter_heads.py` was run with a stand-in for `frappe`: in a migrate, run again, run by
    hand, and on a site that already has a default letter head (5 checks, passed). The render check
    passes with the letter head across the page. Not run on the site: the Letter Head record, the
    picture's address under /assets and the print with the picture have not been seen.
- Then, on request ("give option for this letter head also"): the company's full-page letter head
  of 2025 as a second Letter Head, "Manav Letter Head 2025".
  - `manav/public/images/manav_letter_head_2025_header.jpg` and `..._footer.jpg` (new): the top
    strip (logos and Chennai address, rows 0 to 199) and the bottom strip (FTWZ warehouse and head
    office lines, rows 1858 to 1999) cut from the user's file `Manav Letter head 2025 final (1).jpg`
    (1414 x 2000). The cuts were placed by the blank rows of the picture and looked at.
  - `manav/manav/letter_heads.py`: a header can have a footer picture and can be listed without a
    Quotation Type. "Manav Letter Head 2025" is made with header and footer and is set on no
    Quotation Type: it is offered in the Letter Head lists (Quotation Type, quotation, print window).
  - `print_format/manav_modern_quotation/`: prints the footer of the letter head, the way Frappe's
    standard format does: at the foot of every page of the PDF when "Repeat Header and Footer" is on
    in Print Settings, otherwise once after the quotation.
  - The older format "Manav Sales Quotation" does not print a letter head footer.
  - Testing: the `letter_heads.py` check was extended (second header, its footer, set on no type;
    6 checks, passed); the render check covers the footer repeated, printed once, and absent
    (passed). Not run on the site; where wkhtmltopdf places the footer has not been seen.
- Then, when the user asked which specification each value in the box is ("where is name"): in
  `print_format/manav_modern_quotation/`, the cells made from a description get a name above the
  value, e.g. "Spindle Speed / 12,000 rpm", "Travels (X/Y/Z) / 50" x 20" x 25" (1270 x 508 x 635 mm)".
  - Cause of the missing names: such an item has no Specifications, and its description lists the
    values without saying what they are.
  - The name is worked out from the wording of the value by a list of rules (`feature_rules` at the
    top of the template: "rpm" is Spindle Speed, "taper" is Spindle Taper, "tool changer" is Tool
    Changer, and so on). A value no rule knows, and a value of more than one sentence, is printed
    without a name. An item with Specifications does not use the rules; its names are its own.
  - These names are a reading of the text, not data. Run over the 94 old machine descriptions that
    are lists (1229 values), the rules name 943 (77%); the names were read through and the rules
    that named wrongly were tightened (values of two sentences are no longer named). A wrong name
    on an unusual description is still possible.
  - Testing: render check extended (six names, a value without a rule, a value of two sentences)
    and passes; not looked at on the site after the change.
- Then, on request ("make sure to apply this for all quotation"): the new layout also for Quotation
  Head, the doctype of the old quotations.
  - `manav/templates/print_formats/manav_modern_quotation_body.html` (new): the layout, moved out
    of the print format into one file that both print formats include. Each print format now only
    gathers the values of its doctype into one variable (`q`) and includes that file, so a change of
    the look is made once.
  - `print_format/manav_modern_quotation/`: reduced to the gathering of the values of ERPNext's
    Quotation. The page it prints was compared by the existing render check and is unchanged.
  - `print_format/manav_modern_quotation_head/` (new, "Manav Modern Quotation Head"): the same for
    Quotation Head: items as machines, their Specifications rows and Options, the three tax amounts
    (CGST, SGST, IGST) and freight, the terms rows as a table, names of the signing employee and the
    sales engineer from Employee Master, Cust ID from the customer when the quotation has none. An
    old quotation loaded without item rows prints header, stored totals, terms and signature.
  - `doctype/quotation_head/quotation_head.json`: default print format "Manav Modern Quotation
    Head" (was "Manav Quotation", which stays selectable).
  - The layout file is found by Frappe under the name `manav/templates/...`, the way ERPNext's own
    print formats take in shared templates. This was checked against Frappe's template loader in
    the code and tried with a loader of the same kind, not on the site.
- Then, on request (a picture of the old header: "make sure these info is also added"): Ref. No.,
  Ref Dt., Sales Engg. and Cust ID are printed always, side by side under the date strip, each with
  its name, also when empty; Kind Attn likewise. Before, each was left out when not filled.
  Document No., Date, the customer and the address were already printed.
  - Testing for both: the render check of Quotation passes after the move and with the
    reference fields filled and empty; a new render check of Quotation Head passes (a quotation
    with items, specification rows, options, taxes, freight and terms; an old quotation without
    items and with employee codes that are not in Employee Master; letter head and footer).
    `quotation_head.json` is valid JSON. Nothing was run on the site: neither print format has
    been rendered by Frappe since the move, and the change of the default has not been run.
- Then, on request ("add terms on new page"): in the shared layout
  (`manav/templates/print_formats/manav_modern_quotation_body.html`) the terms always start a new
  page, under a larger heading that repeats the quotation number, still in two columns, with the
  signature after them. A quotation without terms gets no extra page. This holds for both print
  formats. Testing: both render checks pass (they see the page-break rule and the heading); a page
  break only shows in the PDF or on paper, which was not produced here.
- Then, on request ("make quotation in middle"): in the shared layout the title QUOTATION and its
  date are in the middle of the page; without a letter head the company name is centred above
  them. Before, the title was on the right. Both render checks pass; not looked at on the site.
- Then, after the user's print showed the page under the totals empty and the terms alone on the
  next page ("here it is space, add terms here"): the forced new page for the terms was taken
  back. The terms follow the totals in the space left on that page and are kept in one piece, so
  they move to the next page only when they do not fit. Their heading is the plain "Terms &
  Condition" again. Both render checks pass; the page fill can only be judged on a print, which
  was not produced here.
- Then, after the user's print showed the letter head footer in the middle of the last page and the
  browser's own date, address and page number lines on every page ("this should be footer, and for
  printing always off header and footer"): in the shared layout,
  - the footer of the letter head is at the foot of every page, both when printed from the browser
    and in the PDF made on the server, whatever "Repeat Header and Footer" in Print Settings says;
  - a print from the browser has no page margin of the browser's own, which makes the browser
    leave out its date, title, address and page number lines without anyone having to untick
    "Headers and footers" in the print window. The margins are made by a table around the page
    whose head and foot rows the browser repeats on every page; the footer is fixed to the bottom
    of the page and the foot row keeps exactly its height free.
  - For this the page is put out in two copies, one shown only in the browser and one used only for
    the PDF, with Frappe's own classes `hidden-pdf` and `visible-pdf`. The PDF copy is what it was
    before, plus the footer handed to the PDF maker always.
  - Testing: both render checks pass (the two copies hold the same page; footer present in both
    ways; none without a letter head or with the letter head switched off). A sample quotation of
    35 lines with the real header and footer pictures was printed to PDF with Edge (headless) on
    the Windows machine and looked at: 3 pages, the footer at the bottom of each, the header on the
    first, margins on every page, terms under the totals, none of the browser's lines. The same
    page without the no-margin rule printed 4 pages with the browser's address line on each, which
    shows the rule is what removes them.
  - Not tested: the print view of the site itself, other browsers than Edge, paper sizes other
    than the sample's (Letter), and the PDF made on the server (wkhtmltopdf), whose copy and footer
    were only checked as HTML.
- Then, on request ("on every page print letter head"): in the shared layout the letter head is at
  the top of every page; before, only on the first. In the copy the browser prints it stands in the
  repeated head row of the table around the page; in the copy for the PDF it is handed to the PDF
  maker as `header-html`. The title QUOTATION and the customer box stay on the first page only.
  - Testing: both render checks pass (letter head once in each copy, none inside the page itself).
    The 35-line sample was printed again with Edge (headless) and looked at: 4 pages (one more than
    before, as the letter head takes room on each), letter head and footer on every page, the
    column headings of the line table repeated, none of the browser's lines.
  - Not tested: the print view of the site, A4 paper, and the PDF made on the server (wkhtmltopdf).
    For that PDF the header now goes through Frappe's repeated-header mechanism, which has not been
    run with this layout; its spacing in particular is unseen.
- Pending:
  - Look at a printed quotation in the new format and report what is off.
  - For "From screenshot": install the package and set the key (see above), then try it with the
    Jagdeep screenshot and compare the result with `specification_tables/jagdeep_cnc_vtl_vtm.tsv`.
  - `bench migrate` on the server, to load the print format and the help texts; then `bench build`
    or a hard refresh for `item.js`.
  - Items formatted before this change hold the Metric value only; the S.A.E. value was not stored.
    They print with the value across both value columns until the table is pasted and formatted
    again.
  - A quotation line copies the Specifications when the item is chosen. Lines made earlier keep
    their old text; clear the line's Specifications and save, or choose the item again, to take the
    new text.
  - A real paste from the Jagdeep page has to be tried on one item, to confirm it arrives as assumed.
  - The print format of the old quotations (`manav_quotation`, for Quotation Head) is unchanged.

## 2026-10-12

**Machine specifications: paste-and-format on the Item, headings on the quotation print.**

- Reason: the specifications of a machine (as shown on the Haas site, in blocks such as Travels and
  Spindle) have to be printed under the machine on the quotation.
- The Haas site could not be read automatically: every request from this side is answered with
  HTTP 403 by the site's bot protection, so no specifications were downloaded. Instead the table
  is copied from the page in a browser and pasted into the Item.
- Changes:
  - `manav/public/js/item.js` (new), hooked in `manav/hooks.py` (`doctype_js` for Item): button
    "Format Pasted Specifications" on the Item form. It turns pasted table rows (label, S.A.E.,
    Metric) into lines "label : metric value" and each block title into a `#` heading line.
  - `print_format/manav_sales_quotation/`: a `#` line is printed as a heading across the page with
    its lines in two columns below it. `!` (bold line) works as before.
  - `item_fields.py`, `erpnext_fields.py`: the field help texts mention `#`.
  - `manav/public/js/quotation.js`: "Add Options" is also shown under the Items table.
- Testing: the formatter was run with rows in the Haas layout (expected output, and a second run
  changes nothing); the print template was rendered with a specification text that has two heading
  blocks. Not tried on the site with a real paste from the Haas page.
- Later the same day, on request ("compact and in a table"): the specifications are printed as a
  bordered table in small type instead of starred lines. Each "label : value" line is a label cell
  and a value cell, two pairs to a row; a `#` line is a shaded heading row; a line without " : "
  fills both cells of its pair. Only `print_format/manav_sales_quotation/` changed; the render test
  was extended for the cells and passes.
- Then, on request ("only show necessary specifications"): `manav/public/js/item.js` has two buttons
  under "Specifications" on the Item. "Format: key specifications" keeps only the rows a buyer
  compares machines by (axis travels, spindle power, speed, torque and taper, tilt/rotary travel and
  speed, table size and load, rapids and cutting feed, tool changer type and capacity, lathe chuck,
  bar and swing sizes, coolant capacity) and leaves out the Air Requirements, Electrical, Dimensions
  and Axis Motors blocks. "Format: all rows" keeps everything. The list of key rows is
  `MANAV_KEY_SPECIFICATIONS` at the top of the file. Hand-typed lines, rows above the first heading
  and rows marked bold are never removed.
  - The list of key rows is a judgement made from the UMC-1000 page in the user's screenshot; the
    Haas pages of other machine families (lathes, rotaries) could not be read, so their row names
    are assumed.
  - Testing: run with the UMC-1000 rows of the screenshot (29 rows become 16; pressing again changes
    nothing; hand-typed and bold lines are kept). Not tried on the site.
- Then, on request ("reduce spacing between lines"): both print formats (`manav_sales_quotation`,
  `manav_quotation`) state their cell paddings with `!important` and set their own line height.
  Cause of the wide rows: Frappe's standard print style puts `padding: 6px !important` on every
  table cell and a 3px margin on every paragraph, which overrode the formats' smaller values.
  Testing: both templates render and pass their checks; the spacing itself can only be judged on a
  real print, which was not done.
- The user found that too tight, so the spacing was set to a middle value: cells 2px above and
  below (0 before, Frappe's default 6px), line height 1.35 (1.2 before); specification table 1px
  and 1.3; section boxes 3px. Same testing as above.

**Moved the quotation process and the remaining masters into ERPNext's own doctypes.**

- Reason: everything is to be used in ERPNext itself. Agreed with the user: the old quotations stay
  in Quotation Head as history (ERPNext's Quotation needs item lines, which the old data lacks);
  options keep their per-machine price and are added with an "Add Options" button; the old
  employees become Sales Persons.
- Where things are now:

  | Old data | ERPNext doctype | Loaded by |
  | --- | --- | --- |
  | Customers, addresses | Customer, Address (done earlier) | `import_customers` |
  | Contact persons (10907) | Contact, linked to the Customer | `import_contacts` |
  | Region zones (6) | Territory, set on the customers | `import_territories` |
  | Employees (122) | Sales Person, with Employee Code | `import_sales_persons` |
  | Items (5252) | Item (done earlier) | `import_items` |
  | Item rates | Item Price in "Standard Selling" (INR) and "Manav Selling USD" | `import_item_prices` |
  | Standard terms per type | Terms and Conditions "Manav - <type>" | `import_quotation_setup` |
  | New quotations | Quotation | made by the users |
  | Old quotations (22527) | stay in Quotation Head (history) | `import_quotations` |

- New files:
  - `manav/manav/erpnext_fields.py`: custom fields on Quotation (Principal, Customer Ref. No./Date,
    Signed By, Discussion With, Haas Cust ID, Machine Number), Quotation Item (Option of Item,
    Specifications), Sales Person (Employee Code) and Contact (Old System Key); makes "Manav Sales
    Quotation" the default print format of Quotation.
  - `manav/manav/quotation.py`: `get_type_defaults`, `get_options`, and `autoname`, which numbers a
    Quotation that has a principal like the old system (26QP000639) and continues after the highest
    number in Quotation and Quotation Head.
  - `manav/public/js/quotation.js`: on ERPNext's Quotation form, choosing the principal sets
    currency, price list, letter head and terms; the item list is limited to the principal's Item
    Group plus Options; the "Add Options" button adds options with their price for that machine.
  - `manav/manav/print_format/manav_sales_quotation/`: the old quotation layout for ERPNext's
    Quotation.
- Changed files:
  - `manav/hooks.py`: `after_migrate` (erpnext_fields), `doctype_js` and `doc_events` for Quotation.
  - `manav/manav/import_legacy.py`: the five import functions above, `insert_many`, `import_all`.
  - `manav/manav/item_fields.py`: new Item field Specifications (one per line, `!` at the start of a
    line prints it bold); it is copied to the quotation line and printed under the item.
  - `doctype/quotation_type/quotation_type.json`: Currency, Price List, Item Group, Terms Template.
- Details and limits:
  - Item Price: 938 rupee and 368 dollar prices; an item held for a rupee and a dollar type gets
    both. Options get no Item Price; their price comes from Quotation Sub Item Master.
  - Contact: an e-mail or phone that Frappe rejects as invalid is left out (it stays in Customer
    Contact Person); 80 contact persons without a name are named "Contact".
  - Sales Person: one repeated name gets its code added; 22 inactive employees are disabled. The
    sales person codes on customers were not turned into ERPNext sales teams, because a sales team
    needs percentages that the old data does not have.
  - Territory is set on 8280 customers; the 40 customers of zone S have none, as S is not a zone.
  - Types 4 (Manav) and 5 (Rotary Table) have no currency in the old data, so no price list.
  - Taxes on a Quotation use ERPNext's Sales Taxes and Charges templates; none are created here.
  - Quotation Head and its form stay as they are, for the old quotations.
- Testing: the five imports were run twice against the real data files with a stand-in for the
  database (second run created nothing); number, defaults and options helpers were run the same
  way; the print template was rendered with sample data. ERPNext's own checks on Contact, Item
  Price, Sales Person and Quotation were not exercised, and nothing was run on the site.

**Quotation Head follows the old entry screen and prints in the old quotation layout.**

- Reason: the old "Enter Quotation" screen and seven printed quotations (26QX000067 to 26QX000073)
  were given as the model for how a quotation is entered and how it looks.
- Checked against the loaded data: on 26QX000068 the machine price (18650000) plus the seven printed
  options (5425000) is the stored Item Total (24075000), so options are part of the total, as the
  amount rule already had it. "Sales Engg." on the print is the employee of the second code
  ("Discussion with"), the signature is the employee of the first code ("Signed by"), and "Cust ID"
  is the customer's Haas Cust ID.
- New print format `print_format/manav_quotation/` ("Manav Quotation", default for Quotation Head):
  letter head, header box, items with their specification lines in two columns (bold where marked),
  options with prices under their item, terms, signing employee, footer line FMT: QUOT-11. A totals
  block is printed only when the quotation has freight or a tax amount.
- New on the form (`quotation_head.json`, `.py`, `.js`):
  - Specifications table (`doctype/quotation_head_specification/`): the lines printed under an item.
    They are copied from the item's Standard Specifications when the item is chosen and can be
    changed for the quotation.
  - Haas Cust ID (from the customer), Contact E-mail (from the contact person), Signed By and Sales
    Engineer names (from Employee Master by the two codes, set on save), HSN Code on item rows, and a
    Customer Requirement section (Model, Category, Quantity, Cycle Time Required, Cycle Time by Date).
  - The two code fields are now labelled "Signed By (Employee Code)" and "Discussion With (Employee
    Code)".
- New on Quotation Item Master: HSN Code and a Standard Specifications table
  (`doctype/quotation_item_specification/`).
- Not done:
  - The specification lines themselves are not loaded. The old item master holds only the item
    title; the lists printed on the old quotations (the "STD ACCESS" data) were not among the files
    received. Until they are, the lines are typed once per item in Quotation Item Master.
  - Discount %, Custom Duty and Clearing Charges of the old screen: these columns are empty on every
    old quotation, so their effect on the total could not be checked; they were left out.
  - The "Prices : Ex-Works, Punjab India." line of the old print: its source is not known; the print
    shows "Price :" and the first term carries the wording.
  - The letter head picture has to be created as a Letter Head record and set on each Quotation Type.
- Testing: the print template was rendered with sample data modelled on 26QX000068 and on a spares
  quotation with tax (numbers, names, bold lines, options, totals block all as expected). The
  controller tests (11 cases) and the import run with a stand-in database pass. Not opened or
  printed on the site; `bench migrate` for these changes has not been run.

**Added an import that makes a CRM Organization for every customer company.**

- Reason: the customer companies also have to be in the Organizations list of the CRM app.
- Change: `manav/manav/import_legacy.py`: new `import_organizations`, also run by `import_all`
  right after the customers (only on a site that has the CRM app).
- How it works: it reads the Customers in the database, so the customers must be loaded first. Each
  Organization gets the Customer's record name and the customer's primary address. Customers with a
  repeated company name are "NAME" and "NAME - 1" in Customer and get the same names here, so the
  8432 old customers give 8432 Organizations.
- Not carried to the Organization: phone, e-mail, GST number and the old codes. They stay on the
  Customer; Organization has no fields for them.
- Testing: run with a stand-in for the database and the 8432 customers named the way ERPNext names
  them: 8432 created, none failed, a second run skipped all. Not run on the server.

**The principal's header (Letter Head) is applied when the principal is chosen on a quotation.**

- Reason: each principal has its own header; choosing the principal has to apply its header along
  with its currency and the rest.
- The principal list is the Quotation Type list. Nothing new was made for it.
- Changes:
  - `doctype/quotation_type/quotation_type.json`: new field Letter Head (link to ERPNext's Letter
    Head), to be filled once per type.
  - `doctype/quotation_head/quotation_head.json`: new field Letter Head; the Quotation Type field is
    now labelled "Principal (Quotation Type)".
  - `quotation_head.py` (`get_type_defaults`) and `quotation_head.js`: the Letter Head of the type is
    copied to the quotation when the type is chosen or changed. Frappe prints a document with the
    Letter Head named in its `letter_head` field.
- Not done: no Letter Head records are created; the header pictures of the principals were not
  provided. The old quotations have no Letter Head stored; one can be chosen in the print window.
- Testing: syntax of the changed files; the earlier number, amount and import checks were run again
  and pass. Not opened in a browser; `bench migrate` not run on the server.

**Added the old items and sub items to the inbuilt ERPNext Item doctype.**

- Reason: the items also have to be in ERPNext's own Item list (Selling > Item), which was empty.
- Files added or changed:
  - `manav/manav/legacy_data/item.json.gz` (new): 5252 items.
  - `manav/manav/import_legacy.py`: `import_items`, also run by `import_all`.
  - `manav/manav/item_fields.py` (new): three custom fields on Item in a section "Old System Data":
    Quotation Type, Rate (Old System), Rate Currency (Old System).
  - `manav/hooks.py`: `after_migrate` also creates these Item fields.
- What becomes an Item:
  - One Item per item code. ERPNext allows a code only once, so the 6527 rows of Quotation Item
    Master give 4670 Items (1857 rows repeat a code for another Quotation Type or Sr No; the first
    row is used, completed with a description or rate from a later row when it has none).
  - The 582 sub item codes that are not items themselves are also Items. The other sub item rows
    are options whose code is already an item (for example HRT160).
- Item Group: Machines (248), Spares (4393, both spares types), Chmer (6), Jagdeep (23), Options
  (582, the sub-item-only codes). The import creates the groups under the root Item Group.
- Unit: NOS = Nos, SET and ST = Set, FT = Foot, LTR = Litre; an empty or unclear unit = Nos.
- Items from the item master are stock items; the Options are not.
- Item Name is the first line of the description, cut at 140 characters; the full text is in the
  Description.
- Rates: 1210 Items carry their old rate and its currency (936 RS, 274 US$) in the custom fields.
  No ERPNext Item Price is made, because no price lists for the two currencies are set up. An
  option has a different rate for each machine, so no rate is stored on the Options.
- Not changed: Quotation Head still picks items from Quotation Item Master and options from
  Quotation Sub Item Master, which keep the rate per Quotation Type and per machine.
- Testing: the import was run against the real data file with a stand-in for the database: 5252
  created, none failed, a second run skipped all, and every item has a code, name, group and unit.
  `bench migrate` and the import have not been run on the server, so ERPNext's own checks on Item
  have not been exercised.

**Quotation Head can now be used to make new quotations.**

- Reason: employees make a quotation by choosing the principal (the company the goods come from),
  then the items and their specifications; all of it has to appear on the quotation. It was agreed
  that the principal is the Quotation Type and that new quotations are made in Quotation Head.
- How a quotation is made:
  1. Quotation Type: its currency, number series, signing employee and standard terms are copied in.
  2. Customer: its old code, name, primary address and region are copied in. A Customer Contact
     Person of that customer can be chosen.
  3. Items: only Quotation Item Master records of that Quotation Type are offered. Code,
     description, unit and rate are copied in and can be changed for the quotation.
  4. Options and Specifications: only Quotation Sub Item Master records of the items on the
     quotation are offered. The "Add Options" button lists them with tick boxes.
  5. Save: the amounts are calculated and the quotation gets its number.
- Files added or changed:
  - `doctype/quotation_head_item/` and `doctype/quotation_head_sub_item/` (new child tables).
  - `doctype/quotation_head/quotation_head.json`: Items and Options tables, Quotation No Series,
    Customer Contact Person; Quotation Type is now mandatory; the calculated amounts are read only;
    Quotation Date defaults to today; the name is set by the controller.
  - `doctype/quotation_head/quotation_head.py`: `autoname`, `set_amounts`, `get_type_defaults`,
    `get_customer_details`, `get_sub_items`.
  - `doctype/quotation_head/quotation_head.js` (new): the form logic.
  - `doctype/quotation_type/quotation_type.json`: Quotation No Series and Standard Terms.
  - `legacy_data/quotation_type.json` and `import_legacy.py` (`set_quotation_type_defaults`): the
    series and standard terms of each type are loaded with the types, also onto types loaded earlier.
- Rules taken from the old data:
  - Quotation number: financial year (April to March) + series + six digit running number, e.g.
    26QP000639. Series per type: 1, 6, 7 = QX; 2, 3 = QP; QS = QS. Types 4 and 5 were never used on
    a quotation and have no series. Spares quotations numbered QO (those with an "Our Reference")
    use the same type as QP, so the series can be changed on the quotation before the first save.
  - Final Amount = Quotation Amount + Sales Tax Amount + the two SC amounts + Freight. All 18035 old
    quotations that have a final amount follow this. On the quotations since GST the three
    percentages hold CGST, SGST and IGST (tax code G01 = 9 + 9, G02 = 18).
  - Standard terms: types 1, 2, 7 = the set of terms used most often on the last 3000 quotations;
    types 3 and 6 = the terms of their latest quotation; QS = the terms stored under 05QS999999.
- The old quotations are not changed by this: they have a number and amounts but no item rows, and
  the number and amount logic only acts on a quotation without a number / with item rows.
- Testing: the number and amount logic was run with a stand-in for the database (10 cases, all
  passed: next number, financial year change on 1 April, new series, old quotation untouched, row
  and tax amounts). The import was run again the same way, including completing Quotation Types
  loaded earlier. The form script was checked for syntax only; the form has not been opened in a
  browser, and `bench migrate` has not been run on the server.
- Pending: a print format for the quotation; the items quoted on the old quotations (not received).
  Only 1349 of the 6527 items have a rate in the old item master; for the others the employee types
  the rate.

**Added seven doctypes for the old quotation tables, with their data and import functions.**

- Reason: seven more old tables were moved into Frappe.
- Source: the Excel files in `All_Converted_Excel_Files` (`Quotation_Type_Master`, `Employee_Master`,
  `Customer_Contact_Person_Master`, `Quotation_Item_Master`, `Quotation_Sub_Item_Master`,
  `Quotation_Head_34`, `Quotation_Term`). `Quotation_Head.xlsx` holds only the first 5
  quotations of `Quotation_Head_34` and was not used. `Customer_Master.xlsx` has the same 8432
  customer codes as the customer file converted earlier and was not converted again.
- Doctypes added, in `manav/manav/doctype/`:

  | Doctype | Old table | Records | Named by |
  | --- | --- | --- | --- |
  | Quotation Type | Quotation Type Master | 8 | Quotation Type code |
  | Employee Master | Employee Master | 122 | Employee Code |
  | Customer Contact Person | Customer Contact Person Master | 10907 | Customer Code-Sr No |
  | Quotation Item Master | Quotation Item Master | 6527 | running number QIM-00001 |
  | Quotation Sub Item Master | Quotation Sub Item Master | 6059 | running number QSI-00001 |
  | Quotation Head | Quotation Head | 22527 | Quotation No |
  | Quotation Term (child table of Quotation Head) | Quotation Term | 169092 rows | - |

- Why these names: ERPNext already has doctypes named Quotation, Quotation Item, Employee and Contact,
  so the old table names were kept where the short name was taken.
- Other files added or changed:
  - `manav/manav/legacy_data/`: one data file per doctype. The four large ones are gzip-compressed
    (`.json.gz`). The Quotation Term rows are inside `quotation_head.json.gz`, under each quotation.
  - `manav/manav/import_legacy.py`: `import_legacy_docs` (shared helper), `import_quotation_types`,
    `import_employees`, `import_customer_contact_persons`, `import_quotation_items`,
    `import_quotation_sub_items`, `import_quotations` and `import_all`. `load` also reads `.json.gz`.
- Design points:
  - Customer Contact Person and Quotation Head have a Customer link and also keep the old Customer
    Code. The import finds the Customer by its Customer Code, so `import_customers` must run first.
  - Quotation Head keeps the customer name, address and contact person of the quotation itself; the
    old system stored a copy on every quotation.
  - Employee Master is separate from the HR Employee doctype, which needs joining date, birth date
    and company that the old table does not have.
  - Sales person and signature codes (M-03, E-006, H 17) stay plain text: up to 9% of the codes used
    on quotations and customers are not in Employee Master.
  - Amounts are plain numbers, not Currency fields, because quotations are in RS or US$.
  - Quotation Item Master is not named by item code: the old table has the same Quotation Type +
    Item Code + Sr No twice for two different items (93-1989 and 93-4538).
- Changed behaviour of `import_customers`: a Region Zone code that has no Region Zone record (zone
  "S") is now kept as typed instead of being left empty. The same is done for the new doctypes. Zone
  S is on 40 customers and 1167 quotations; it should be added to Region Zone.
- Cleaning done while converting: same rules as for the customers (punctuation-only cells are empty,
  dates become yyyy-mm-dd, date + time become one date-time). The old "no date" values 00/00/0000,
  01/01/1901, 00/00/00 and 01/01/01 are empty. Two-digit years are read as 20yy.
- Old rows not carried over:
  - 1 contact person with no customer code, 2 items with no item code, 7 sub item rows with no sub
    item code, 3 quotations with no type and no customer (24rt000001, 25F 000001, 26QX000005).
  - 1067 Quotation Term rows of 130 quotation numbers that are not in Quotation Head. One of them is
    05QS999999, which looks like the standard terms of the AMC service quotation (15 rows).
- Old columns not carried over: columns empty or the same in every row (for example Discount %,
  Excise Code, Custom Duty, LMS No, Source/Destination Location on quotations, To be deleted, New item
  code), the Quotation Type repeated on each term row, the "Last modified on / User code" pair where
  it repeats "modified by / modified on", and the two address cells of Employee Master (one note).
- Testing: the Python and JSON files were checked for syntax. Every import function was run against
  the real data files with a stand-in for the database: all rows were accepted, every value fits its
  field type, every required field is filled, a second run skipped every row, and every customer code
  on contacts and quotations was found in the customer file. `bench migrate` and the imports have
  not been run on the server yet.
- Pending: the quotation item lines (the items quoted on each quotation) are not in these files.

**Added the old customer master to the inbuilt ERPNext Customer doctype.**

- Reason: the customers are the second old table to be moved. Customer already exists in ERPNext, so
  no new doctype was made; the old columns it does not have were added as custom fields.
- Source: `Customer_Master_Dataset.xlsx`, sheet "Customer Master" (8432 customers, 78 columns).
- Files added or changed:
  - `manav/manav/customer_fields.py` (new): the 49 custom fields (34 hold data, the rest are layout).
    Customer Code is on the main tab; the others are on a new tab "Old System Data".
  - `manav/hooks.py`: `after_migrate` now creates these fields on every `bench migrate`.
  - `manav/manav/legacy_data/customer.json` (new): the 8432 old records.
  - `manav/manav/import_legacy.py`: `import_customers` loads them.
- Where the old columns go:
  - Customer Name, InActive: the standard fields Customer Name and Disabled.
  - Address One/Two/Three, City, State, Pincode: the customer's primary Address (country India).
  - Phone, E-mail: the customer's primary Contact, and also kept as typed in custom fields.
  - GST No: kept as typed in a custom field; a real GSTIN (1888 rows) also goes to Tax ID.
  - All other columns that hold data: one custom field each.
- Cleaning done while converting:
  - Cells holding only punctuation (".", "...", "=") were treated as empty.
  - Dates dd/mm/yyyy became yyyy-mm-dd; each date and its time column became one date-time.
  - Phone and e-mail cells often hold two values or are cut at 40 characters. Only the first value
    that is a valid phone (6264 rows) or e-mail (5389 rows) goes to the Contact.
  - Pincodes typed as "600 032" became "600032"; a pincode that is not 6 digits was left out.
  - City empty (94 rows): the last address line was used as the city. Address lines empty (26 rows):
    the city was used as the address line. 6 customers have no address at all and get none.
- Old columns not carried over:
  - Empty in every row: Contact Person One/Two/Three, Designation One/Two, Department Three/Five,
    Octroi Account No, Road Permit Req., Commission, OPENDRCR, DRBAL, CRBAL, Credit Limit, Closing
    Balance, CLOSDRCR, Old Segment Code, Old Region Code, Source Location, Destination Location,
    Delete Status, Tally Cust Name, FOR 4, FOR 5, Industry.
  - Same value in every row: Active Contact Per. (0), Cust-Reg-Srno. (0), File Number (0),
    FOR 1 CNC / MM (M).
  - Forwarder (4 rows, no usable value) and Country (14 rows, India or a stray character).
- Known points:
  - 40 customers have zone "S", which is not one of the 6 Region Zone records. `import_customers`
    loads them with the zone empty and lists them. To keep the zone, add zone S to Region Zone
    before running the import.
  - The sales person, segment, state and city codes are plain text for now, because their old tables
    are not rebuilt yet.
- Testing: the Python files were checked for syntax. The field list was checked against the data
  file and ERPNext's Customer (no duplicate or clashing fieldnames, every data key has a field).
  `bench migrate` and the import have not been run yet.

**Added the Region Zone doctype, the first table of the old quotation system.**

- Reason: the quotation module is being rebuilt in Frappe, one old table at a time.
- Old table: `216-Region_Zone_mst` (6 zones, A to F).
- Files added:
  - `manav/manav/doctype/region_zone/` (the doctype)
  - `manav/manav/legacy_data/region_zone.json` (the 6 old records)
  - `manav/manav/import_legacy.py` (`import_region_zones` loads them)
- Old columns not carried over: `User code` and `Last modified on` (empty in every row), and the
  three `InActive Status By/On/Time` columns (a copy of the created by/on/time values).
- Testing: the JSON files and Python files were checked for syntax only. `bench migrate` and the
  import have not been run yet.
- Pending: the other 15 old tables.
