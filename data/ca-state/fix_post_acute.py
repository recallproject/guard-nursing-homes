#!/usr/bin/env python3
"""
Fix post-acute data:
1. Fix city field (was citytown in CMS data)
2. Deduplicate IRF/LTACH measure-level data into one record per facility
3. Fix phone field (was telephone_number)
4. Rebuild master file
"""
import json
import os
import shutil

DATA_DIR = "/Users/rob/Projects/oversight-reports/data/ca-state"

def fix_city_phone(records, raw_records_by_ccn=None):
    """Fix city and phone from raw CMS data embedded in quality_measures or from raw lookup."""
    for r in records:
        # These were likely null because the script looked for 'city' not 'citytown'
        if not r.get("city") and raw_records_by_ccn and r.get("ccn") in raw_records_by_ccn:
            raw = raw_records_by_ccn[r["ccn"]]
            r["city"] = raw.get("citytown") or raw.get("city_town") or raw.get("city")
            if not r.get("phone"):
                r["phone"] = raw.get("telephone_number") or raw.get("phone_number")
    return records

def dedup_measure_level(records):
    """Consolidate measure-level records into one record per CCN with all measures."""
    by_ccn = {}
    for r in records:
        ccn = r.get("ccn")
        if not ccn:
            continue
        if ccn not in by_ccn:
            # Start with a copy, but reset quality_measures
            base = dict(r)
            base["quality_measures"] = {}
            by_ccn[ccn] = base

        # Add this record's measure to the consolidated quality_measures
        qm = r.get("quality_measures", {})
        measure_code = qm.get("measure_code", "")
        score = qm.get("score", "")
        if measure_code and score:
            by_ccn[ccn]["quality_measures"][measure_code] = score

        # Also grab any CDPH fields if present
        for k in ["cdph_facid", "cdph_license", "cdph_county", "cdph_capacity",
                   "cdph_hcai_id", "cdph_status", "cdph_lat", "cdph_lon"]:
            if r.get(k) and not by_ccn[ccn].get(k):
                by_ccn[ccn][k] = r[k]

        # Fix data_sources
        for src in r.get("data_sources", []):
            if src not in by_ccn[ccn].get("data_sources", []):
                by_ccn[ccn].setdefault("data_sources", []).append(src)

    return list(by_ccn.values())

# ============================================================
# Reload raw CMS data to fix city/phone
# ============================================================
print("Reloading CMS data to fix city/phone fields...")

# We need to re-fetch from the saved JSON and look at the raw quality_measures
# Actually, the raw CMS fields were stored in quality_measures for HHA
# For IRF/LTACH the raw was measure-level

# For HHA - city is in citytown, need to re-download or parse from raw
# Let's just re-download a small sample to get field names right, then fix

import requests

def cms_fetch_sample(dataset_id, limit=5):
    url = f"https://data.cms.gov/provider-data/api/1/datastore/query/{dataset_id}/0?limit={limit}&offset=0"
    try:
        r = requests.get(url, timeout=15)
        if r.status_code == 200:
            return r.json().get("results", [])
    except:
        pass
    return []

# Check field names
sample = cms_fetch_sample("6jpm-sxkc")
if sample:
    print(f"HHA field names: {list(sample[0].keys())}")

# The city field is 'citytown' - we need to re-process all data
# Rather than re-download everything, let's fetch all CA again quickly with proper field mapping

def cms_api_fetch_ca(dataset_id, max_records=50000):
    base = f"https://data.cms.gov/provider-data/api/1/datastore/query/{dataset_id}/0"
    all_records = []
    offset = 0
    limit = 500
    while offset < max_records:
        url = f"{base}?limit={limit}&offset={offset}"
        try:
            r = requests.get(url, timeout=30)
            if r.status_code == 200:
                data = r.json()
                results = data.get("results", [])
                if not results:
                    break
                # Filter to CA inline
                for rec in results:
                    state = rec.get("state", "")
                    if str(state).strip().upper() == "CA":
                        all_records.append(rec)
                if len(results) < limit:
                    break
                offset += limit
            else:
                break
        except:
            break
    return all_records

# Build CCN -> raw record lookup for each type
print("\nFetching HHA raw data for city/phone fix...")
hha_raw = cms_api_fetch_ca("6jpm-sxkc", 15000)
hha_raw_by_ccn = {}
for r in hha_raw:
    ccn = r.get("cms_certification_number_ccn", "")
    if ccn:
        hha_raw_by_ccn[str(ccn).strip()] = r
print(f"  HHA raw: {len(hha_raw)} CA records")

print("Fetching Hospice raw data...")
hospice_raw = cms_api_fetch_ca("yc9t-dgbk", 10000)
hospice_raw_by_ccn = {}
for r in hospice_raw:
    ccn = r.get("cms_certification_number_ccn", "")
    if ccn:
        hospice_raw_by_ccn[str(ccn).strip()] = r
print(f"  Hospice raw: {len(hospice_raw)} CA records")

print("Fetching IRF raw data...")
irf_raw = cms_api_fetch_ca("v9e4-nwhh", 5000)
irf_raw_by_ccn = {}
for r in irf_raw:
    ccn = r.get("cms_certification_number_ccn", "")
    if ccn:
        irf_raw_by_ccn[str(ccn).strip()] = r
print(f"  IRF raw: {len(irf_raw)} CA records, {len(irf_raw_by_ccn)} unique CCNs")

print("Fetching LTACH raw data...")
ltach_raw = cms_api_fetch_ca("azum-44iv", 5000)
ltach_raw_by_ccn = {}
for r in ltach_raw:
    ccn = r.get("cms_certification_number_ccn", "")
    if ccn:
        ltach_raw_by_ccn[str(ccn).strip()] = r
print(f"  LTACH raw: {len(ltach_raw)} CA records")

# ============================================================
# Fix HHA
# ============================================================
print("\n--- Fixing HHA ---")
with open(os.path.join(DATA_DIR, "hha-cms-ca.json")) as f:
    hha = json.load(f)

for r in hha:
    ccn = r.get("ccn", "")
    if ccn in hha_raw_by_ccn:
        raw = hha_raw_by_ccn[ccn]
        if not r.get("city"):
            r["city"] = raw.get("citytown", "").strip() if raw.get("citytown") else None
        if not r.get("phone"):
            r["phone"] = raw.get("telephone_number", "").strip() if raw.get("telephone_number") else None
        if not r.get("address"):
            r["address"] = raw.get("address", "").strip() if raw.get("address") else None

cities_filled = sum(1 for r in hha if r.get("city"))
print(f"  HHA: {len(hha)} records, {cities_filled} with city")

with open(os.path.join(DATA_DIR, "hha-cms-ca.json"), "w") as f:
    json.dump(hha, f, indent=2)

# ============================================================
# Fix Hospice
# ============================================================
print("\n--- Fixing Hospice ---")
with open(os.path.join(DATA_DIR, "hospice-cms-ca.json")) as f:
    hospice = json.load(f)

for r in hospice:
    ccn = r.get("ccn", "")
    if ccn in hospice_raw_by_ccn:
        raw = hospice_raw_by_ccn[ccn]
        if not r.get("city"):
            r["city"] = raw.get("citytown", "").strip() if raw.get("citytown") else None
        if not r.get("phone"):
            r["phone"] = raw.get("telephone_number", "").strip() if raw.get("telephone_number") else None

cities_filled = sum(1 for r in hospice if r.get("city"))
print(f"  Hospice: {len(hospice)} records, {cities_filled} with city")

with open(os.path.join(DATA_DIR, "hospice-cms-ca.json"), "w") as f:
    json.dump(hospice, f, indent=2)

# ============================================================
# Fix IRF - dedup + city/phone
# ============================================================
print("\n--- Fixing IRF (dedup measure-level) ---")
with open(os.path.join(DATA_DIR, "irf-cms-ca.json")) as f:
    irf = json.load(f)

print(f"  IRF before dedup: {len(irf)} records")
irf_deduped = dedup_measure_level(irf)

for r in irf_deduped:
    ccn = r.get("ccn", "")
    if ccn in irf_raw_by_ccn:
        raw = irf_raw_by_ccn[ccn]
        if not r.get("city"):
            r["city"] = raw.get("citytown", "").strip() if raw.get("citytown") else None
        if not r.get("phone"):
            r["phone"] = raw.get("telephone_number", "").strip() if raw.get("telephone_number") else None
        if not r.get("name") or len(r.get("name","")) < 5:
            r["name"] = raw.get("provider_name", "").strip() if raw.get("provider_name") else r.get("name")

cities_filled = sum(1 for r in irf_deduped if r.get("city"))
print(f"  IRF after dedup: {len(irf_deduped)} unique facilities, {cities_filled} with city")

with open(os.path.join(DATA_DIR, "irf-cms-ca.json"), "w") as f:
    json.dump(irf_deduped, f, indent=2)

# ============================================================
# Fix LTACH - dedup + city/phone
# ============================================================
print("\n--- Fixing LTACH (dedup measure-level) ---")
with open(os.path.join(DATA_DIR, "ltach-cms-ca.json")) as f:
    ltach = json.load(f)

print(f"  LTACH before dedup: {len(ltach)} records")
# LTACH general info was facility-level (20 records, 20 unique)
# but the QM data was merged in. Check if measure-level:
ltach_ccns = set(r.get("ccn") for r in ltach)
if len(ltach_ccns) < len(ltach):
    ltach_deduped = dedup_measure_level(ltach)
else:
    ltach_deduped = ltach

for r in ltach_deduped:
    ccn = r.get("ccn", "")
    if ccn in ltach_raw_by_ccn:
        raw = ltach_raw_by_ccn[ccn]
        if not r.get("city"):
            r["city"] = raw.get("citytown", "").strip() if raw.get("citytown") else None
        if not r.get("phone"):
            r["phone"] = raw.get("telephone_number", "").strip() if raw.get("telephone_number") else None
        # Add beds if available
        if raw.get("total_number_of_beds"):
            r["beds"] = raw["total_number_of_beds"]

cities_filled = sum(1 for r in ltach_deduped if r.get("city"))
print(f"  LTACH after dedup: {len(ltach_deduped)} unique facilities, {cities_filled} with city")

with open(os.path.join(DATA_DIR, "ltach-cms-ca.json"), "w") as f:
    json.dump(ltach_deduped, f, indent=2)

# ============================================================
# Rebuild master file
# ============================================================
print("\n--- Rebuilding master files ---")
all_pa = hha + hospice + irf_deduped + ltach_deduped
with open(os.path.join(DATA_DIR, "ca-post-acute-all-providers.json"), "w") as f:
    json.dump(all_pa, f, indent=2)
print(f"  ca-post-acute-all-providers.json: {len(all_pa)} records")

# Load SNF and merge
with open(os.path.join(DATA_DIR, "ca-facilities-enriched.json")) as f:
    snf_data = json.load(f)
for s in snf_data:
    if "provider_type" not in s:
        s["provider_type"] = "SNF"

master = snf_data + all_pa
master_path = os.path.join(DATA_DIR, "ca-all-post-acute-enriched.json")
with open(master_path, "w") as f:
    json.dump(master, f, indent=2)
print(f"  ca-all-post-acute-enriched.json: {len(master)} records")

desktop_path = "/Users/rob/Desktop/ca-all-post-acute-enriched.json"
shutil.copy2(master_path, desktop_path)
print(f"  Copied to Desktop")

# Final summary
from collections import Counter
type_counts = Counter(r.get("provider_type", "Unknown") for r in master)

print("\n" + "="*75)
print("=== FINAL POST-ACUTE DATA SUMMARY (FIXED) ===")
print("="*75)
print(f"{'Provider Type':<14} | {'Count':>8} | {'With City':>10} | {'With Phone':>11} | {'QM Fields':>10}")
print("-"*65)

for ptype, label in [("HHA", "HHA"), ("Hospice", "Hospice"), ("IRF", "IRF"), ("LTACH", "LTACH"), ("SNF", "SNF")]:
    subset = [r for r in master if r.get("provider_type") == ptype]
    n = len(subset)
    with_city = sum(1 for r in subset if r.get("city"))
    with_phone = sum(1 for r in subset if r.get("phone"))
    qm_keys = set()
    for r in subset:
        if isinstance(r.get("quality_measures"), dict):
            qm_keys.update(r["quality_measures"].keys())
    print(f"{label:<14} | {n:>8} | {with_city:>10} | {with_phone:>11} | {len(qm_keys):>10}")

print("-"*65)
print(f"{'TOTAL':<14} | {len(master):>8}")
print(f"\nMaster file: {os.path.getsize(master_path)/1024/1024:.1f} MB")
print("DONE.")
