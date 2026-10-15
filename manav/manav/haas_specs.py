# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Fill Specifications and the photo of Haas machine Items from haascnc.com.

Run on the server (dry run first; nothing is written):
    bench --site manav.local execute manav.manav.haas_specs.run
Then write:
    bench --site manav.local execute manav.manav.haas_specs.run --kwargs "{'dry_run': 0}"

What it does:
- Lists the machine pages of haascnc.com (from the site's sitemap; if that cannot be read, by
  following the links from https://www.haascnc.com/machines.html). Only pages under /machines/
  count, so tooling and accessories are never matched.
- Matches each enabled Item to a page by its model name in the item code or item name ("VF-2",
  "VF 2", "VF2" all match the page vf-2.html; the longest model wins, so VF-2SS is not taken as
  VF-2). An Item is only considered when "haas" appears in its brand, code, name, group or
  description (pass require_haas=0 to drop that check).
- Skips an Item that already has Specifications or a photo.
- Specifications: the S.A.E./Metric tables of the page, written as the "Format: key
  specifications" button in public/js/item.js writes them ("#Travels || S.A.E. || Metric",
  "X Axis : 40.00 in || 1016 mm"). Pass only_key=0 for "Format: all rows".
- Photo: the page's main image (og:image), saved as a public File attached to the Item and set
  as its image.

Created: 2026-10-15.
"""

import re
from urllib.parse import urljoin, urlparse

import frappe
import requests
from bs4 import BeautifulSoup

BASE = "https://www.haascnc.com"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/128.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
TIMEOUT = 30

# Same as MANAV_UNIT_SEPARATOR and MANAV_KEY_SPECIFICATIONS in public/js/item.js. Keep in step.
UNIT_SEPARATOR = " || "
DROP_BLOCKS = re.compile(r"air requirement|electrical|dimension|shipping|axis motor", re.I)
KEEP_LABELS = [
    re.compile(p, re.I)
    for p in [
        r"^[xyzabc] axis$",
        r"^travel$",
        r"^max rating$",
        r"^max speed$",
        r"^max torque$",
        r"^taper$",
        r"^spindle nose$",
        r"^spindle bore",
        r"^length$",
        r"^width$",
        r"platter diameter",
        r"^max weight",
        r"^rapids",
        r"^max cutting",
        r"^capacity$",
        r"^type$",
        r"number of tools",
        r"chuck size",
        r"bar capacity",
        r"swing",
        r"coolant capacity",
        r"table diameter",
        r"max\.? ?turning",
        r"work ?piece weight",
        r"axis.*travel",
        r"main spindle",
        r"table speeds",
        r"cnc control",
    ]
]
# An Item whose code or name has one of these words is a part or accessory for a machine, not a
# machine, even when it names the model ("Haas VF-2 Coolant Pump"). Add words here if needed.
NOT_A_MACHINE = re.compile(
    r"\b(pump|kit|filter|chuck|vise|vice|holder|collet|spare|part|parts|accessor\w*|option|"
    r"tool ?setter|probe|conveyor|tank|motor|belt|cover|guard|seal|bearing|lamp|light|cable|"
    r"service|repair|amc|training|install\w*|transport\w*|freight|software)\b",
    re.I,
)
UNIT_HEADING = re.compile(r"^(s\.?a\.?e\.?|metric|imperial)$", re.I)


def run(dry_run=1, only_key=1, require_haas=1, item=None):
    dry_run, only_key, require_haas = int(dry_run), int(only_key), int(require_haas)
    session = requests.Session()
    session.headers.update(HEADERS)

    pages = machine_pages(session)
    if not pages:
        print("No machine pages found on haascnc.com (blocked or the site changed). Nothing done.")
        return
    print(f"{len(pages)} Haas machine pages found.")

    filters = {"disabled": 0}
    if item:
        filters["name"] = item
    items = frappe.get_all(
        "Item",
        filters=filters,
        fields=["name", "item_name", "item_group", "brand", "description", "image", "custom_specifications"],
    )

    report = {"updated": [], "would_update": [], "skipped": [], "not_machine": [], "no_page": [], "failed": []}
    for row in items:
        haystack = " ".join(str(row.get(f) or "") for f in ("brand", "name", "item_name", "item_group", "description"))
        if require_haas and "haas" not in haystack.lower():
            continue
        name_text = f"{row.name} {row.item_name or ''}"
        if NOT_A_MACHINE.search(name_text):
            report["not_machine"].append(f"{row.name} ({row.item_name})")
            continue
        slug = match_model(name_text, pages)
        if not slug:
            if "haas" in haystack.lower():
                report["no_page"].append(row.name)
            continue
        if (row.custom_specifications or "").strip() or row.image:
            report["skipped"].append(f"{row.name} (has {'specifications' if (row.custom_specifications or '').strip() else 'photo'})")
            continue

        url = pages[slug]
        try:
            html = get(session, url).text
            specs, image_url = read_page(html, url, only_key)
        except Exception as e:
            report["failed"].append(f"{row.name}: {url}: {e}")
            continue
        if not specs and not image_url:
            report["failed"].append(f"{row.name}: {url}: no specification table and no image on the page")
            continue

        label = f"{row.name} <- {url} ({len(specs.splitlines())} spec lines, image: {'yes' if image_url else 'no'})"
        if dry_run:
            report["would_update"].append(label)
            print(f"\n=== {row.name} ({url})\n{specs}\nimage: {image_url}")
            continue
        try:
            update_item(session, row.name, specs, image_url)
            frappe.db.commit()
            report["updated"].append(label)
        except Exception as e:
            frappe.db.rollback()
            report["failed"].append(f"{row.name}: {e}")

    print("\n--- Summary" + (" (DRY RUN, nothing written)" if dry_run else ""))
    for key, rows in report.items():
        if rows:
            print(f"\n{key.replace('_', ' ')}: {len(rows)}")
            for line in rows:
                print(f"  {line}")
    return {k: len(v) for k, v in report.items()}


def get(session, url):
    r = session.get(url, timeout=TIMEOUT)
    r.raise_for_status()
    return r


# ---------- Finding the machine pages ----------


def is_machine_page(url):
    path = urlparse(url).path.lower()
    return path.startswith("/machines/") and "/models/" in path and path.endswith(".html")


def slug_of(url):
    return urlparse(url).path.rstrip("/").rsplit("/", 1)[-1].removesuffix(".html").lower()


def machine_pages(session):
    """{model slug: page url} for every Haas machine model page."""
    urls = set()
    try:
        urls = sitemap_urls(session, f"{BASE}/sitemap.xml")
    except Exception as e:
        print(f"Sitemap not readable ({e}); following links from the machines page instead.")
    if not any(is_machine_page(u) for u in urls):
        urls = crawl_machines(session)
    pages = {}
    for u in sorted(urls):
        if is_machine_page(u):
            pages.setdefault(slug_of(u), u)
    return pages


def sitemap_urls(session, url, depth=0):
    soup = BeautifulSoup(get(session, url).content, "xml")
    found = set()
    for loc in soup.find_all("loc"):
        u = loc.get_text(strip=True)
        if u.endswith(".xml") and depth < 2:
            if "machine" in u.lower() or "sitemap" in u.lower():
                try:
                    found |= sitemap_urls(session, u, depth + 1)
                except Exception:
                    pass
        else:
            found.add(u)
    return found


def crawl_machines(session, max_pages=200):
    seen, queue, found = set(), [f"{BASE}/machines.html"], set()
    while queue and len(seen) < max_pages:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        try:
            soup = BeautifulSoup(get(session, url).text, "html.parser")
        except Exception:
            continue
        for a in soup.find_all("a", href=True):
            u = urljoin(url, a["href"]).split("#")[0].split("?")[0]
            if urlparse(u).netloc != urlparse(BASE).netloc or not urlparse(u).path.startswith("/machines"):
                continue
            if is_machine_page(u):
                found.add(u)
            elif u.endswith(".html") and u not in seen:
                queue.append(u)
    return found


# ---------- Matching an Item to a model ----------


def norm(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


def match_model(text, pages):
    """The slug of the longest model named in `text` as a whole word ("VF-2", "VF 2", "VF2")."""
    words = [w for w in re.split(r"[\s/,()\[\]\-_.]+", text) if w]
    candidates = set()
    for i in range(len(words)):
        for n in (1, 2, 3, 4):
            if i + n <= len(words):
                candidates.add(norm("".join(words[i : i + n])))
    best = None
    for slug in pages:
        key = norm(slug)
        if key in candidates and (best is None or len(key) > len(norm(best))):
            best = slug
    return best


# ---------- Reading a machine page ----------


def read_page(html, url, only_key=1):
    soup = BeautifulSoup(html, "html.parser")
    image = None
    meta = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "og:image"})
    if meta and meta.get("content"):
        image = urljoin(url, meta["content"])
    return format_specifications(pasted_text(soup), bool(only_key)), image


def cell_text(el):
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)).strip()


def pasted_text(soup):
    """The spec tables as a browser copy would paste them: one line per row, cells joined by tabs.

    Only tables whose heading names S.A.E./Metric/Imperial are taken, so other tables on the
    page are left out."""
    lines, seen_blocks = [], set()
    for table in soup.find_all("table"):
        # Only this table's own rows and cells; a table inside it is read on its own.
        rows = [
            [cell_text(c) for c in tr.find_all(["th", "td"]) if c.find_parent("tr") is tr]
            for tr in table.find_all("tr")
            if tr.find_parent("table") is table
        ]
        rows = [r for r in rows if any(r)]
        if not any(any(UNIT_HEADING.match(c) for c in r[1:]) for r in rows[:2]):
            continue
        block = "\n".join("\t".join(r) for r in rows)
        if block not in seen_blocks:  # the same table shown twice on the page (tabs, mobile view)
            seen_blocks.add(block)
            lines.append(block)
    if lines:
        return "\n".join(lines)

    # No <table>: rows built from divs. Take each element whose text is exactly "S.A.E." as the
    # heading of a block and read the sibling rows of its row.
    for marker in soup.find_all(string=re.compile(r"^\s*S\.?A\.?E\.?\s*$")):
        head_row = marker.parent
        while head_row is not None and len([c for c in head_row.find_all(recursive=False)]) < 3:
            head_row = head_row.parent
        if head_row is None or head_row.parent is None:
            continue
        for row in head_row.parent.find_all(recursive=False):
            cells = [cell_text(c) for c in row.find_all(recursive=False)] or [cell_text(row)]
            cells = [c for c in cells if c]
            if cells:
                lines.append("\t".join(cells))
    return "\n".join(dict.fromkeys(lines))


def format_specifications(text, only_key=True):
    """Python form of manav_format_specifications in public/js/item.js, for the S.A.E./Metric kind
    of table (the Haas site)."""
    join = UNIT_SEPARATOR.join
    blocks = [{"heading": None, "rows": []}]
    for raw in (text or "").splitlines():
        cells = [c.strip() for c in re.split(r"\t| {3,}", raw)]
        cells = [c for c in cells if c]
        if not cells:
            continue
        block = blocks[-1]
        if len(cells) > 1 and any(UNIT_HEADING.match(c) for c in cells[1:]):
            blocks.append({"heading": join(cells), "rows": []})
            continue
        if cells[0].startswith("#"):
            blocks.append({"heading": cells[0].lstrip("#").strip(), "rows": []})
            continue
        if len(cells) > 1:
            value = join([cells[1], cells[-1]]) if len(cells) > 2 else cells[1]
            block["rows"].append({"label": cells[0], "value": value})
            continue
        at = cells[0].find(" : ")
        if at > 0:
            block["rows"].append({"label": cells[0][:at].strip(), "value": cells[0][at + 3 :].strip()})
        else:
            block["rows"].append({"plain": cells[0]})

    lines = []
    for block in blocks:
        if only_key and block["heading"] and DROP_BLOCKS.search(block["heading"]):
            continue
        rows = [
            r
            for r in block["rows"]
            if not only_key
            or "plain" in r
            or not block["heading"]
            or r["label"].startswith("!")
            or any(p.search(r["label"]) for p in KEEP_LABELS)
        ]
        if not rows:
            continue
        if block["heading"]:
            lines.append(f"#{block['heading']}")
        lines += [r.get("plain") or f"{r['label']} : {r['value']}" for r in rows]
    return "\n".join(lines)


# ---------- Writing ----------


def update_item(session, item_name, specs, image_url):
    if specs:
        frappe.db.set_value("Item", item_name, "custom_specifications", specs)
    if image_url:
        r = get(session, image_url)
        file_name = urlparse(image_url).path.rsplit("/", 1)[-1] or f"{item_name}.jpg"
        f = frappe.get_doc(
            {
                "doctype": "File",
                "file_name": file_name,
                "attached_to_doctype": "Item",
                "attached_to_name": item_name,
                "attached_to_field": "image",
                "is_private": 0,
                "content": r.content,
            }
        ).insert(ignore_permissions=True)
        frappe.db.set_value("Item", item_name, "image", f.file_url)
