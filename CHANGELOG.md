# Changelog

Changes to the Manav app, newest first.

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
