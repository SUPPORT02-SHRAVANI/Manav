# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt
# File: visit_location.py
# Purpose: Location helpers of Manav Visit (Lead Management): distance between two GPS points, the
#          customer position looked up from the lead's address (OpenStreetMap), and the India Post
#          DIGIPIN of a point. Modelled on my_visit_monitor/utils.py.
# Created: 2026-10-30

# Trigonometry for the distance.
import math
# Pause between address lookups.
import time

# Frappe framework.
import frappe
# To decimal number.
from frappe.utils import flt

# A check-in within this many metres of the customer counts as at the customer; 0 switches it off.
GEOFENCE_RADIUS = 500
# Most metres of GPS inaccuracy given to the salesperson in that check; a rougher position earns no more.
MAX_ACCURACY_ALLOWANCE = 50
# Roles that may set the customer location of a lead from a visit.
MANAGER_ROLES = ("System Manager", "Sales Manager", "Manav Management")

# OpenStreetMap's free address lookup (no key). Its usage policy asks for at most one request per
# second and a User-Agent naming the application; a lookup is made only at a check-in.
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# Nominatim's place_rank of a street / house; a lower rank is only a town or area.
EXACT_PLACE_RANK = 26
# Most lookups for one check-in (one second apart), so a check-in does not wait long.
MAX_LOOKUPS = 4

# DIGIPIN grid of India Post (https://github.com/INDIAPOST-gov/digipin): 4 x 4 symbols per level,
# 10 levels over the box below; about 4 m x 4 m at the last level.
DIGIPIN_GRID = (("F", "C", "9", "8"), ("J", "3", "2", "7"), ("K", "4", "5", "6"), ("L", "M", "P", "T"))
DIGIPIN_BOUNDS = (2.5, 38.5, 63.5, 99.5)  # min lat, max lat, min lon, max lon


# True when a position was captured; 0, 0 means no position.
def has_coordinates(latitude, longitude):
	return bool(flt(latitude) or flt(longitude))


# Great-circle distance between two points in metres (haversine formula).
def distance_in_metres(lat1, lon1, lat2, lon2):
	lat1, lon1, lat2, lon2 = (math.radians(flt(v)) for v in (lat1, lon1, lat2, lon2))
	a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
	# Angle times the radius of the earth (6371 km).
	return 6371000 * 2 * math.asin(math.sqrt(a))


def is_manager(user=None):
	"""May set customer locations and see every salesperson's visits."""
	return bool(set(frappe.get_roles(user)) & set(MANAGER_ROLES))


def get_digipin(latitude, longitude):
	"""The 10-symbol DIGIPIN of a point, written like 4P3-JK8-52C9; empty outside India's box or
	without a position. Same steps as India Post's reference code."""
	if not has_coordinates(latitude, longitude):
		return ""
	lat, lon = flt(latitude), flt(longitude)
	min_lat, max_lat, min_lon, max_lon = DIGIPIN_BOUNDS
	if not (min_lat <= lat <= max_lat and min_lon <= lon <= max_lon):
		return ""
	code = ""
	for level in range(1, 11):
		lat_div = (max_lat - min_lat) / 4
		lon_div = (max_lon - min_lon) / 4
		# Rows count from the north, columns from the west.
		row = min(max(3 - int((lat - min_lat) // lat_div), 0), 3)
		col = min(max(int((lon - min_lon) // lon_div), 0), 3)
		code += DIGIPIN_GRID[row][col]
		if level in (3, 6):
			code += "-"
		# Narrow the box to the chosen cell.
		max_lat = min_lat + lat_div * (4 - row)
		min_lat = min_lat + lat_div * (3 - row)
		min_lon = min_lon + lon_div * col
		max_lon = min_lon + lon_div
	return code


def geocode_address(address, company=None):
	"""Position of an address from OpenStreetMap: {latitude, longitude, exact} or None. `exact` is
	False when only the area / town was found, not the street or building.

	OpenStreetMap often does not know a full Indian address (plot number, pincode), so after the
	full address (and the address with the company name) the leading parts are dropped one by one
	("Plot 42, Peenya Industrial Area, Bengaluru" -> "Peenya Industrial Area, Bengaluru"), keeping at
	least the last two. Never raises: a failed lookup must not block a check-in."""
	parts = [part.strip() for part in (address or "").replace("\n", ",").split(",") if part.strip()]
	if not parts:
		return None
	queries = [", ".join(parts)]
	if company:
		queries.append(f"{company}, {', '.join(parts)}")
	queries += [", ".join(parts[i:]) for i in range(1, len(parts) - 1)]

	best = None
	for number, query in enumerate(queries[:MAX_LOOKUPS]):
		# Nominatim's usage policy: at most one request per second.
		if number:
			time.sleep(1)
		found = geocode_lookup(query)
		if found and (not best or found["rank"] > best["rank"]):
			best = found
		# Exact, or a shortened address answered: a shorter one will not be more exact.
		if best and (best["rank"] >= EXACT_PLACE_RANK or number >= (2 if company else 1)):
			break
	if not best:
		return None
	return {"latitude": best["latitude"], "longitude": best["longitude"], "exact": best["rank"] >= EXACT_PLACE_RANK}


def geocode_lookup(query):
	"""One Nominatim search, limited to India: {latitude, longitude, rank} or None."""
	if not query:
		return None
	import requests

	try:
		response = requests.get(
			NOMINATIM_URL,
			params={"q": query, "format": "jsonv2", "limit": 1, "countrycodes": "in"},
			headers={"User-Agent": f"Manav ERP visit check-in ({frappe.local.site})"},
			timeout=6,
		)
		response.raise_for_status()
		results = response.json()
		if not results:
			return None
		first = results[0]
		return {"latitude": flt(first["lat"]), "longitude": flt(first["lon"]), "rank": int(first.get("place_rank") or 0)}
	# Network error, timeout or unexpected answer: logged, the visit is saved without it.
	except Exception:
		frappe.log_error(title="Manav visit: address lookup failed")
		return None
