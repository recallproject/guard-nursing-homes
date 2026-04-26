#!/usr/bin/env python3
"""
Download all post-acute CMS + CA State data and merge into unified files.
Provider types: HHA, Hospice, IRF, LTACH (+ existing SNF)
Filters to CA client-side since CMS API filters are unreliable.
"""
import requests
import json
import pandas as pd
import os
import sys
import time
import shutil
from thefuzz import fuzz

DATA_DIR = "/Users/rob/Projects/oversight-reports/data/ca-state"
errors = []

def log(msg):
    print(msg, flush=True)

def cms_api_fetch_all(dataset_id, max_records=50000):
    """Fetch all records from CMS Provider Data API with pagination, no filter."""
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
                all_records.extend(results)
                if len(all_records) % 5000 == 0:
                    log(f"    ... {len(all_records)} records fetched")
                if len(results) < limit:
                    break
                offset += limit
            else:
                log(f"    HTTP {r.status_code} at offset {offset}")
                break
        except Exception as e:
            log(f"    Error at offset {offset}: {e}")
            break
    return all_records

def filter_ca(records):
    """Filter records to CA only, trying multiple field names."""
    ca = []
    for r in records:
        state = None
        for key in ["state", "State", "STATE", "provider_state", "state_code"]:
            if key in r:
                state = r[key]
                break
            # case-insensitive
            for k in r.keys():
                if k.lower() == key.lower():
                    state = r[k]
                    break
            if state:
                break
        if state and str(state).strip().upper() == "CA":
            ca.append(r)
    return ca

def find_field(record, candidates, default=None):
    """Find a field value trying multiple possible key names."""
    for c in candidates:
        if c in record and record[c]:
            return record[c]
        for k in record.keys():
            if k.lower() == c.lower():
                if record[k]:
                    return record[k]
    return default

# ============================================================
# STEP 1: CMS HOME HEALTH
# ============================================================
log("\n=== STEP 1: CMS HOME HEALTH AGENCIES ===")
log("  Fetching dataset 6jpm-sxkc (all states)...")
hha_all = cms_api_fetch_all("6jpm-sxkc", max_records=15000)
log(f"  Total HHA records (all states): {len(hha_all)}")
hha_records = filter_ca(hha_all)
log(f"  CA HHA records: {len(hha_records)}")

if hha_records:
    log(f"  Sample keys: {list(hha_records[0].keys())[:15]}")

# HHCAHPS - this dataset may be very large, skip if >50K
log("  Fetching HHCAHPS survey data (ccn2-y3aq)...")
hha_survey_all = cms_api_fetch_all("ccn2-y3aq", max_records=15000)
hha_survey = filter_ca(hha_survey_all)
log(f"  HHCAHPS: {len(hha_survey_all)} total -> {len(hha_survey)} CA")

# Build survey lookup by CCN
survey_lookup = {}
for s in hha_survey:
    ccn = find_field(s, ["cms_certification_number_ccn", "ccn", "CCN", "provider_id"])
    if ccn:
        survey_lookup[str(ccn).strip()] = s

# Build HHA output
hha_output = []
for r in hha_records:
    ccn = find_field(r, ["cms_certification_number_ccn", "ccn", "CCN", "provider_id", "federal_provider_number"])
    name = find_field(r, ["provider_name", "agency_name", "facility_name"])
    city = find_field(r, ["city_town", "city"])
    zipcode = find_field(r, ["zip_code", "zip"])
    address = find_field(r, ["address_line_1", "address"])
    phone = find_field(r, ["phone_number", "phone"])
    ownership = find_field(r, ["type_of_ownership", "ownership_type"])
    stars = find_field(r, ["quality_of_patient_care_star_rating", "star_rating", "overall_rating"])

    qm = {}
    for k, v in r.items():
        kl = k.lower()
        if any(x in kl for x in ["how_often", "percent", "rate", "score", "quality", "improvement", "readmission", "dtc", "timely", "drug", "taught"]):
            qm[k] = v

    survey_data = {}
    if ccn and str(ccn).strip() in survey_lookup:
        sd = survey_lookup[str(ccn).strip()]
        for k, v in sd.items():
            kl = k.lower()
            if any(x in kl for x in ["star", "rating", "percent", "score", "recommend", "overall", "communication", "professional"]):
                survey_data[k] = v

    try:
        stars_val = float(stars) if stars and str(stars).replace('.','').replace('-','').isdigit() else None
    except:
        stars_val = None

    rec = {
        "provider_type": "HHA",
        "ccn": str(ccn).strip() if ccn else None,
        "name": str(name).strip() if name else None,
        "address": str(address).strip() if address else None,
        "city": str(city).strip() if city else None,
        "state": "CA",
        "zip": str(zipcode).strip()[:5] if zipcode else None,
        "phone": str(phone).strip() if phone else None,
        "stars": stars_val,
        "ownership_type": str(ownership).strip() if ownership else None,
        "quality_measures": qm,
        "patient_survey": survey_data if survey_data else None,
        "cms_source": True,
        "data_sources": ["CMS"]
    }
    hha_output.append(rec)

with open(os.path.join(DATA_DIR, "hha-cms-ca.json"), "w") as f:
    json.dump(hha_output, f, indent=2)
log(f"  Saved hha-cms-ca.json: {len(hha_output)} records")

# ============================================================
# STEP 2: CMS HOSPICE
# ============================================================
log("\n=== STEP 2: CMS HOSPICE ===")
log("  Fetching Hospice General (yc9t-dgbk)...")
hospice_all = cms_api_fetch_all("yc9t-dgbk", max_records=10000)
hospice_records = filter_ca(hospice_all)
log(f"  Hospice: {len(hospice_all)} total -> {len(hospice_records)} CA")
if hospice_records:
    log(f"  Sample keys: {list(hospice_records[0].keys())[:15]}")

# Hospice QM - can be very large (one row per measure per provider), limit to 50K
log("  Fetching Hospice QM (252m-zfp9)...")
hospice_qm_all = cms_api_fetch_all("252m-zfp9", max_records=50000)
hospice_qm = filter_ca(hospice_qm_all)
log(f"  Hospice QM: {len(hospice_qm_all)} total -> {len(hospice_qm)} CA")

hospice_qm_lookup = {}
for q in hospice_qm:
    ccn = find_field(q, ["cms_certification_number_ccn", "ccn", "provider_id", "federal_provider_number", "facility_id"])
    if ccn:
        ccn_key = str(ccn).strip()
        if ccn_key not in hospice_qm_lookup:
            hospice_qm_lookup[ccn_key] = {}
        measure = find_field(q, ["measure_name", "measure_code", "measure_id", "quality_measure"])
        score = find_field(q, ["score", "measure_score", "facility_score", "provider_score"])
        if measure and score:
            hospice_qm_lookup[ccn_key][str(measure)[:60]] = score
        else:
            for k, v in q.items():
                kl = k.lower()
                if any(x in kl for x in ["score", "measure", "rate", "percent", "star"]):
                    hospice_qm_lookup[ccn_key][k] = v

hospice_output = []
for r in hospice_records:
    ccn = find_field(r, ["cms_certification_number_ccn", "ccn", "provider_id", "federal_provider_number"])
    name = find_field(r, ["facility_name", "provider_name", "hospice_name"])
    city = find_field(r, ["city_town", "city"])
    zipcode = find_field(r, ["zip_code", "zip"])
    address = find_field(r, ["address_line_1", "address"])
    phone = find_field(r, ["phone_number", "phone"])
    ownership = find_field(r, ["ownership_type", "type_of_ownership"])
    cert_date = find_field(r, ["certification_date", "initial_certification_date"])

    qm = hospice_qm_lookup.get(str(ccn).strip(), {}) if ccn else {}

    rec = {
        "provider_type": "Hospice",
        "ccn": str(ccn).strip() if ccn else None,
        "name": str(name).strip() if name else None,
        "address": str(address).strip() if address else None,
        "city": str(city).strip() if city else None,
        "state": "CA",
        "zip": str(zipcode).strip()[:5] if zipcode else None,
        "phone": str(phone).strip() if phone else None,
        "ownership_type": str(ownership).strip() if ownership else None,
        "certification_date": str(cert_date).strip() if cert_date else None,
        "quality_measures": qm,
        "cms_source": True,
        "data_sources": ["CMS"]
    }
    hospice_output.append(rec)

with open(os.path.join(DATA_DIR, "hospice-cms-ca.json"), "w") as f:
    json.dump(hospice_output, f, indent=2)
log(f"  Saved hospice-cms-ca.json: {len(hospice_output)} records")

# ============================================================
# STEP 3: CMS IRF
# ============================================================
log("\n=== STEP 3: CMS IRF ===")
log("  Fetching IRF (v9e4-nwhh)...")
irf_all = cms_api_fetch_all("v9e4-nwhh", max_records=5000)
irf_records = filter_ca(irf_all)
log(f"  IRF: {len(irf_all)} total -> {len(irf_records)} CA")
if irf_records:
    log(f"  Sample keys: {list(irf_records[0].keys())[:15]}")

irf_output = []
for r in irf_records:
    ccn = find_field(r, ["cms_certification_number_ccn", "ccn", "provider_id", "federal_provider_number", "cms_id"])
    name = find_field(r, ["facility_name", "provider_name"])
    city = find_field(r, ["city_town", "city"])
    zipcode = find_field(r, ["zip_code", "zip"])
    address = find_field(r, ["address_line_1", "address"])
    phone = find_field(r, ["phone_number", "phone"])

    qm = {}
    for k, v in r.items():
        kl = k.lower()
        if any(x in kl for x in ["rate", "score", "percent", "measure", "readmission", "infection", "fall", "pressure"]):
            qm[k] = v

    rec = {
        "provider_type": "IRF",
        "ccn": str(ccn).strip() if ccn else None,
        "name": str(name).strip() if name else None,
        "address": str(address).strip() if address else None,
        "city": str(city).strip() if city else None,
        "state": "CA",
        "zip": str(zipcode).strip()[:5] if zipcode else None,
        "phone": str(phone).strip() if phone else None,
        "quality_measures": qm,
        "cms_source": True,
        "data_sources": ["CMS"]
    }
    irf_output.append(rec)

with open(os.path.join(DATA_DIR, "irf-cms-ca.json"), "w") as f:
    json.dump(irf_output, f, indent=2)
log(f"  Saved irf-cms-ca.json: {len(irf_output)} records")

# ============================================================
# STEP 4: CMS LTACH
# ============================================================
log("\n=== STEP 4: CMS LTACH ===")
log("  Fetching LTACH General (azum-44iv)...")
ltach_all = cms_api_fetch_all("azum-44iv", max_records=5000)
ltach_records = filter_ca(ltach_all)
log(f"  LTACH general: {len(ltach_all)} total -> {len(ltach_records)} CA")
if ltach_records:
    log(f"  Sample keys: {list(ltach_records[0].keys())[:15]}")

log("  Fetching LTACH QM (fp6g-2gsn)...")
ltach_qm_all = cms_api_fetch_all("fp6g-2gsn", max_records=10000)
ltach_qm = filter_ca(ltach_qm_all)
log(f"  LTACH QM: {len(ltach_qm_all)} total -> {len(ltach_qm)} CA")

ltach_qm_lookup = {}
for q in ltach_qm:
    ccn = find_field(q, ["cms_certification_number_ccn", "ccn", "provider_id", "federal_provider_number"])
    if ccn:
        ccn_key = str(ccn).strip()
        if ccn_key not in ltach_qm_lookup:
            ltach_qm_lookup[ccn_key] = {}
        for k, v in q.items():
            kl = k.lower()
            if any(x in kl for x in ["rate", "score", "percent", "measure", "readmission", "infection", "pressure", "fall"]):
                ltach_qm_lookup[ccn_key][k] = v

ltach_output = []
for r in ltach_records:
    ccn = find_field(r, ["cms_certification_number_ccn", "ccn", "provider_id", "federal_provider_number"])
    name = find_field(r, ["facility_name", "provider_name"])
    city = find_field(r, ["city_town", "city"])
    zipcode = find_field(r, ["zip_code", "zip"])
    address = find_field(r, ["address_line_1", "address"])
    phone = find_field(r, ["phone_number", "phone"])

    qm_base = {}
    for k, v in r.items():
        kl = k.lower()
        if any(x in kl for x in ["rate", "score", "percent", "measure"]):
            qm_base[k] = v
    if ccn and str(ccn).strip() in ltach_qm_lookup:
        qm_base.update(ltach_qm_lookup[str(ccn).strip()])

    rec = {
        "provider_type": "LTACH",
        "ccn": str(ccn).strip() if ccn else None,
        "name": str(name).strip() if name else None,
        "address": str(address).strip() if address else None,
        "city": str(city).strip() if city else None,
        "state": "CA",
        "zip": str(zipcode).strip()[:5] if zipcode else None,
        "phone": str(phone).strip() if phone else None,
        "quality_measures": qm_base,
        "cms_source": True,
        "data_sources": ["CMS"]
    }
    ltach_output.append(rec)

with open(os.path.join(DATA_DIR, "ltach-cms-ca.json"), "w") as f:
    json.dump(ltach_output, f, indent=2)
log(f"  Saved ltach-cms-ca.json: {len(ltach_output)} records")

# ============================================================
# STEP 5: CALIFORNIA STATE DATA
# ============================================================
log("\n=== STEP 5A: CDPH FACILITY LISTING (ALL TYPES) ===")
cdph = pd.read_csv(os.path.join(DATA_DIR, "cdph-facility-listing.csv"), low_memory=False)
log(f"  Total CDPH rows: {len(cdph)}")

pa_types = ["HHA", "HOSPICE", "SNF", "PPSREHB", "REHABC", "REHABC/CORF"]
cdph_pa = cdph[cdph["FAC_TYPE_CODE"].isin(pa_types)].copy()
log(f"  Post-acute CDPH rows: {len(cdph_pa)}")
for t, c in cdph_pa['FAC_TYPE_CODE'].value_counts().items():
    log(f"    {t}: {c}")

cdph_pa.to_csv(os.path.join(DATA_DIR, "cdph-all-facilities-ca.csv"), index=False)
log(f"  Saved cdph-all-facilities-ca.csv")

log("\n=== STEP 5B: HCAI HOME HEALTH & HOSPICE UTILIZATION ===")
hcai_urls = [
    "https://data.chhs.ca.gov/dataset/71587a38-d603-4a26-8d2b-4a65c5c3fd46/resource/36b1a67e-68d4-4e3a-ad5a-8e1e97ea6488/download/hhahospicecompletedata.csv",
    "https://data.chhs.ca.gov/dataset/71587a38-d603-4a26-8d2b-4a65c5c3fd46/resource/36b1a67e-68d4-4e3a-ad5a-8e1e97ea6488/download/home-health-hospice-complete-data.csv",
]
hcai_hha_hospice = None
for hcai_url in hcai_urls:
    try:
        log(f"  Trying: ...{hcai_url[-50:]}")
        r = requests.get(hcai_url, timeout=60, allow_redirects=True)
        if r.status_code == 200 and len(r.content) > 1000:
            out_path = os.path.join(DATA_DIR, "hha-hospice-hcai-ca.csv")
            with open(out_path, "wb") as f:
                f.write(r.content)
            hcai_hha_hospice = pd.read_csv(out_path, low_memory=False)
            log(f"  SUCCESS - HCAI rows: {len(hcai_hha_hospice)}")
            log(f"  Columns: {list(hcai_hha_hospice.columns)[:10]}")
            break
        else:
            log(f"  HTTP {r.status_code}, size={len(r.content)}")
    except Exception as e:
        log(f"  Error: {e}")

if hcai_hha_hospice is None:
    log("  HCAI download failed - checking existing chhs-utilization.xlsx...")
    errors.append("HCAI HHA/Hospice: download failed from all URLs")
    chhs_path = os.path.join(DATA_DIR, "chhs-utilization.xlsx")
    if os.path.exists(chhs_path):
        try:
            xl = pd.ExcelFile(chhs_path)
            log(f"  Sheets: {xl.sheet_names}")
        except Exception as e:
            log(f"  Error: {e}")

# ============================================================
# STEP 6: FUZZY MATCH WITH CDPH
# ============================================================
log("\n=== STEP 6: FUZZY MATCHING WITH CDPH ===")

def normalize_name(n):
    if not n or not isinstance(n, str):
        return ""
    return n.upper().strip().replace(",", "").replace(".", "").replace("  ", " ")

def fuzzy_match_cdph(providers, cdph_df, type_codes):
    cdph_subset = cdph_df[cdph_df["FAC_TYPE_CODE"].isin(type_codes)].copy()
    cdph_subset["name_norm"] = cdph_subset["FACNAME"].apply(normalize_name)
    cdph_subset["city_norm"] = cdph_subset["CITY"].apply(lambda x: normalize_name(str(x)) if pd.notna(x) else "")

    matched = 0
    for p in providers:
        pname = normalize_name(p.get("name", ""))
        pcity = normalize_name(p.get("city", ""))
        if not pname:
            continue

        best_score = 0
        best_row = None

        city_matches = cdph_subset[cdph_subset["city_norm"] == pcity]
        candidates = city_matches if len(city_matches) > 0 else cdph_subset

        for _, row in candidates.iterrows():
            score = fuzz.token_sort_ratio(pname, row["name_norm"])
            if score > best_score:
                best_score = score
                best_row = row

        if best_score >= 80 and best_row is not None:
            matched += 1
            p["cdph_facid"] = str(best_row.get("FACID", ""))
            p["cdph_license"] = str(best_row.get("LICENSE_NUMBER", ""))
            p["cdph_county"] = str(best_row.get("COUNTY_NAME", ""))
            p["cdph_capacity"] = best_row.get("CAPACITY")
            p["cdph_hcai_id"] = str(best_row.get("HCAI_ID", ""))
            p["cdph_status"] = str(best_row.get("FAC_STATUS_TYPE_CODE", ""))
            p["cdph_lat"] = best_row.get("LATITUDE")
            p["cdph_lon"] = best_row.get("LONGITUDE")
            if "CDPH" not in p["data_sources"]:
                p["data_sources"].append("CDPH")
    return matched

log("  Matching HHA to CDPH...")
hha_cdph_matched = fuzzy_match_cdph(hha_output, cdph, ["HHA"])
log(f"  HHA: {hha_cdph_matched}/{len(hha_output)} ({100*hha_cdph_matched/max(len(hha_output),1):.1f}%)")

log("  Matching Hospice to CDPH...")
hospice_cdph_matched = fuzzy_match_cdph(hospice_output, cdph, ["HOSPICE"])
log(f"  Hospice: {hospice_cdph_matched}/{len(hospice_output)} ({100*hospice_cdph_matched/max(len(hospice_output),1):.1f}%)")

log("  Matching IRF to CDPH...")
irf_cdph_matched = fuzzy_match_cdph(irf_output, cdph, ["PPSREHB", "REHABC", "REHABC/CORF", "GACH"])
log(f"  IRF: {irf_cdph_matched}/{len(irf_output)} ({100*irf_cdph_matched/max(len(irf_output),1):.1f}%)")

log("  Matching LTACH to CDPH...")
ltach_cdph_matched = fuzzy_match_cdph(ltach_output, cdph, ["GACH"])
log(f"  LTACH: {ltach_cdph_matched}/{len(ltach_output)} ({100*ltach_cdph_matched/max(len(ltach_output),1):.1f}%)")

# HCAI matching
hha_hcai_matched = 0
hospice_hcai_matched = 0

# Re-save with CDPH merged
for fname, data in [("hha-cms-ca.json", hha_output), ("hospice-cms-ca.json", hospice_output),
                     ("irf-cms-ca.json", irf_output), ("ltach-cms-ca.json", ltach_output)]:
    with open(os.path.join(DATA_DIR, fname), "w") as f:
        json.dump(data, f, indent=2)

# ============================================================
# UNIFIED POST-ACUTE (excl. SNF)
# ============================================================
log("\n=== STEP 6B: UNIFIED POST-ACUTE FILE ===")
all_pa = hha_output + hospice_output + irf_output + ltach_output
with open(os.path.join(DATA_DIR, "ca-post-acute-all-providers.json"), "w") as f:
    json.dump(all_pa, f, indent=2)
log(f"  Saved ca-post-acute-all-providers.json: {len(all_pa)} records")

# ============================================================
# STEP 7: SUMMARY
# ============================================================
def count_fields(records):
    if not records:
        return 0
    all_keys = set()
    for r in records:
        all_keys.update(r.keys())
        if "quality_measures" in r and isinstance(r["quality_measures"], dict):
            all_keys.update(r["quality_measures"].keys())
    return len(all_keys)

hha_f = count_fields(hha_output)
hospice_f = count_fields(hospice_output)
irf_f = count_fields(irf_output)
ltach_f = count_fields(ltach_output)

print("\n" + "="*75)
print("=== POST-ACUTE DATA DOWNLOAD SUMMARY ===")
print("="*75)
print(f"{'Provider Type':<14} | {'CMS Count (CA)':>14} | {'CDPH Matched':>12} | {'HCAI Matched':>15} | {'Total Fields':>12}")
print("-"*75)
fmt = lambda n, tot: f"{100*n/max(tot,1):.1f}%"
print(f"{'HHA':<14} | {len(hha_output):>14} | {fmt(hha_cdph_matched, len(hha_output)):>12} | {'N/A':>15} | {hha_f:>12}")
print(f"{'Hospice':<14} | {len(hospice_output):>14} | {fmt(hospice_cdph_matched, len(hospice_output)):>12} | {'N/A':>15} | {hospice_f:>12}")
print(f"{'IRF':<14} | {len(irf_output):>14} | {fmt(irf_cdph_matched, len(irf_output)):>12} | {'N/A':>15} | {irf_f:>12}")
print(f"{'LTACH':<14} | {len(ltach_output):>14} | {fmt(ltach_cdph_matched, len(ltach_output)):>12} | {'N/A':>15} | {ltach_f:>12}")
print(f"{'SNF (existing)':<14} | {'1,163':>14} | {'99.2%':>12} | {'90.5%':>15} | {'80+':>12}")
print("-"*75)
total_new = len(all_pa)
print(f"Total NEW post-acute: {total_new}")
print(f"Total ALL (incl. SNF): {total_new + 1163}")

if errors:
    print(f"\nERRORS ({len(errors)}):")
    for e in errors:
        print(f"  - {e}")
else:
    print("\nNo errors.")

print("\nFiles saved:")
for fname in ["hha-cms-ca.json", "hospice-cms-ca.json", "irf-cms-ca.json", "ltach-cms-ca.json",
              "cdph-all-facilities-ca.csv", "ca-post-acute-all-providers.json"]:
    fpath = os.path.join(DATA_DIR, fname)
    if os.path.exists(fpath):
        print(f"  {fname}: {os.path.getsize(fpath)/1024:.1f} KB")

# ============================================================
# STEP 8: MASTER FILE WITH SNF
# ============================================================
log("\n=== STEP 8: MASTER FILE WITH SNF ===")
with open(os.path.join(DATA_DIR, "ca-facilities-enriched.json")) as f:
    snf_data = json.load(f)

for s in snf_data:
    if "provider_type" not in s:
        s["provider_type"] = "SNF"

master = snf_data + all_pa
master_path = os.path.join(DATA_DIR, "ca-all-post-acute-enriched.json")
with open(master_path, "w") as f:
    json.dump(master, f, indent=2)
log(f"  Saved ca-all-post-acute-enriched.json: {len(master)} records")

desktop_path = "/Users/rob/Desktop/ca-all-post-acute-enriched.json"
shutil.copy2(master_path, desktop_path)
log(f"  Copied to {desktop_path}")

from collections import Counter
type_counts = Counter(r.get("provider_type", "Unknown") for r in master)
print("\nFinal master file breakdown:")
for t, c in sorted(type_counts.items()):
    print(f"  {t}: {c}")
print(f"  TOTAL: {len(master)}")
print(f"\nMaster file size: {os.path.getsize(master_path)/1024/1024:.1f} MB")
print("\nDONE.")
