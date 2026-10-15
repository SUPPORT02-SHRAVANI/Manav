# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Send a transfer file made by manav.manav.site_transfer.export to another site.

Working: the file holds records in the order they must be inserted, and the files they show. The
files are sent first (the other site may store one under another url; the records are then
changed to point there), then the records of each doctype in parts of BATCH, then the customers'
primary address and contact. The other site skips any record it already has, so this can be run
again after a stop or a fix. What failed is printed and written next to the transfer file.

The other site is given in a small JSON file kept outside the project (it holds the API key, which
must never be put into the code or the repository):
    {"url": "https://mmblr.frappe.cloud", "api_key": "...", "api_secret": "..."}
The key is of a System Manager on that site (User > Settings > API Access > Generate Keys).

    python tools/push_to_site.py <transfer file> [<site file>]
The site file defaults to %USERPROFILE%\\.manav_transfer_site.json.

Needs only Python's standard library. Created: 2026-10-15.
"""

import gzip
import json
import os
import sys
import time
import urllib.error
import urllib.request

BATCH = 50  # records per request; small enough for the site's request time limit
FILE_BATCH_BYTES = 4 * 1024 * 1024
APP = "manav.manav.site_transfer"


def main(bundle_path, site_path=None):
	site_path = site_path or os.path.join(os.path.expanduser("~"), ".manav_transfer_site.json")
	with open(site_path, encoding="utf-8") as f:
		site = json.load(f)
	with gzip.open(bundle_path, "rt", encoding="utf-8") as f:
		bundle = json.load(f)
	print(f"From {bundle.get('site')} to {site['url']}")

	urls = send_files(site, bundle["files"])
	moved = {old: new for old, new in urls.items() if old != new}

	failures = []
	for part in bundle["doctypes"]:
		doctype, docs = part["doctype"], part["docs"]
		if moved:
			docs = json.loads(replace_urls(json.dumps(docs), moved))
		totals = {"created": 0, "skipped": 0, "failed": 0}
		for start in range(0, len(docs), BATCH):
			result = call(site, "receive", {"doctype": doctype, "docs": docs[start : start + BATCH]})
			totals["created"] += result["created"]
			totals["skipped"] += result["skipped"]
			totals["failed"] += len(result["failed"])
			failures += [(doctype, name, error) for name, error in result["failed"]]
			print(f"\r{doctype}: {min(start + BATCH, len(docs))}/{len(docs)}", end="", flush=True)
		print(f"\r{doctype}: {totals['created']} created, {totals['skipped']} already there, {totals['failed']} failed")

	links = bundle.get("customer_links") or []
	updated = 0
	for start in range(0, len(links), 500):
		updated += call(site, "relink", {"customer_links": links[start : start + 500]})["updated"]
	print(f"Customers' primary address/contact set: {updated}")

	log_path = bundle_path + ".failed.txt"
	with open(log_path, "w", encoding="utf-8") as f:
		for doctype, name, error in failures:
			f.write(f"{doctype}\t{name}\t{error}\n")
	print(f"{len(failures)} failed; list in {log_path}")


def send_files(site, files):
	"""Send the files in parts of about FILE_BATCH_BYTES; return {old url: url on the site}."""
	urls, part, size = {}, {}, 0
	present = {url: data for url, data in files.items() if data}
	for url, data in present.items():
		part[url] = data
		size += len(data["content"])
		if size >= FILE_BATCH_BYTES:
			urls.update(call(site, "receive_files", {"files": part}))
			part, size = {}, 0
	if part:
		urls.update(call(site, "receive_files", {"files": part}))
	print(f"Files: {len(urls)} on the site ({len(files) - len(present)} were not found on the old site)")
	return urls


def replace_urls(text, moved):
	for old, new in moved.items():
		text = text.replace(json.dumps(old)[1:-1], json.dumps(new)[1:-1])
	return text


def call(site, method, payload, tries=3):
	"""POST to a Manav method of the site; retried on a network error or a server error."""
	request = urllib.request.Request(
		f"{site['url'].rstrip('/')}/api/method/{APP}.{method}",
		data=json.dumps(payload).encode(),
		headers={
			"Authorization": f"token {site['api_key']}:{site['api_secret']}",
			"Content-Type": "application/json",
			"Accept": "application/json",
		},
		method="POST",
	)
	for attempt in range(1, tries + 1):
		try:
			with urllib.request.urlopen(request, timeout=300) as response:
				return json.loads(response.read())["message"]
		except urllib.error.HTTPError as e:
			body = e.read().decode(errors="replace")[:500]
			if e.code < 500 or attempt == tries:
				raise SystemExit(f"{method}: HTTP {e.code}: {body}")
		except (urllib.error.URLError, TimeoutError) as e:
			if attempt == tries:
				raise SystemExit(f"{method}: {e}")
		time.sleep(10 * attempt)


if __name__ == "__main__":
	main(*sys.argv[1:3])
