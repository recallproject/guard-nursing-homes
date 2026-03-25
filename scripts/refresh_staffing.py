#!/usr/bin/env python3
"""
Refresh staffing data in facility JSON files from CMS NH_ProviderInfo CSV.

Updates for each facility:
  - total_hprd (Reported Total Nurse Staffing Hours per Resident per Day)
  - rn_hprd (Reported RN Staffing Hours per Resident per Day)
  - lpn_hprd (Reported LPN Staffing Hours per Resident per Day)
  - cna_hprd (Reported Nurse Aide Staffing Hours per Resident per Day)
  - total_turnover (Total nursing staff turnover)
  - rn_turnover (Registered Nurse turnover)
  - admin_turnover (Number of administrators who have left)
  - contractor_pct (not in this CSV — left unchanged)
  - zero_rn_pct (not in this CSV — left unchanged)

Also provides "adjusted" (case-mix adjusted) values as adj_* fields.

Source: CMS NH_ProviderInfo CSV
Run: python3 scripts/refresh_staffing.py [path_to_csv]
"""

import csv
import json
import os
import sys

STATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'states')
DEFAULT_CSV = os.path.join(os.path.dirname(__file__), '..', 'data', 'cms_raw', 'NH_ProviderInfo_Mar2026.csv')


def safe_float(val):
    try:
        v = float(val.strip())
        return round(v, 3) if v >= 0 else None
    except (ValueError, TypeError, AttributeError):
        return None


def load_staffing_from_csv(csv_path):
    """Parse CMS NH Provider Info CSV for staffing data."""
    staffing = {}

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ccn = (row.get('CMS Certification Number (CCN)', '') or
                   row.get('Federal Provider Number', '')).strip()
            if not ccn:
                continue

            staffing[ccn] = {
                # Reported (self-reported by facility)
                'total_hprd': safe_float(row.get('Reported Total Nurse Staffing Hours per Resident per Day', '')),
                'rn_hprd': safe_float(row.get('Reported RN Staffing Hours per Resident per Day', '')),
                'lpn_hprd': safe_float(row.get('Reported LPN Staffing Hours per Resident per Day', '')),
                'cna_hprd': safe_float(row.get('Reported Nurse Aide Staffing Hours per Resident per Day', '')),

                # Case-mix adjusted (accounts for acuity)
                'adj_total_hprd': safe_float(row.get('Adjusted Total Nurse Staffing Hours per Resident per Day', '')),
                'adj_rn_hprd': safe_float(row.get('Adjusted RN Staffing Hours per Resident per Day', '')),

                # Turnover
                'total_turnover': safe_float(row.get('Total nursing staff turnover', '')),
                'rn_turnover': safe_float(row.get('Registered Nurse turnover', '')),
                'admin_turnover': safe_float(row.get('Number of administrators who have left the nursing home', '')),

                # Weekend staffing
                'weekend_total_hprd': safe_float(row.get('Total number of nurse staff hours per resident per day on the weekend', '')),
                'weekend_rn_hprd': safe_float(row.get('Registered Nurse hours per resident per day on the weekend', '')),
            }

    print(f"Loaded staffing data for {len(staffing)} facilities from CSV")
    return staffing


def enrich_state_files(staffing):
    """Update staffing fields in each state JSON file."""
    updated_count = 0
    changed_hprd = 0

    for fname in sorted(os.listdir(STATES_DIR)):
        if not fname.endswith('.json'):
            continue

        fpath = os.path.join(STATES_DIR, fname)
        with open(fpath) as f:
            state_data = json.load(f)

        changed = False
        for fac in state_data.get('facilities', []):
            ccn = fac.get('ccn', '')
            if ccn not in staffing:
                continue

            s = staffing[ccn]
            updated_count += 1

            # Track HPRD changes
            old_total = fac.get('total_hprd')
            new_total = s['total_hprd']
            if new_total is not None and old_total != new_total:
                changed_hprd += 1

            # Update reported staffing (only if CMS has a value)
            for field in ['total_hprd', 'rn_hprd', 'lpn_hprd', 'cna_hprd',
                          'total_turnover', 'rn_turnover', 'admin_turnover',
                          'weekend_total_hprd', 'weekend_rn_hprd',
                          'adj_total_hprd', 'adj_rn_hprd']:
                if s.get(field) is not None:
                    fac[field] = s[field]
                    changed = True

        if changed:
            with open(fpath, 'w') as f:
                json.dump(state_data, f, separators=(',', ':'))

    print(f"\nUpdated staffing for {updated_count} facilities")
    print(f"Facilities with changed total_hprd: {changed_hprd}")


def verify_bay_crest(staffing):
    """Quick verification against Bay Crest."""
    bc = staffing.get('055559', {})
    if bc:
        print(f"\n🔍 Bay Crest (055559) staffing from CMS CSV:")
        print(f"  total_hprd: {bc['total_hprd']}")
        print(f"  rn_hprd: {bc['rn_hprd']}")
        print(f"  lpn_hprd: {bc['lpn_hprd']}")
        print(f"  cna_hprd: {bc['cna_hprd']}")
        print(f"  adj_total_hprd: {bc['adj_total_hprd']}")
        print(f"  adj_rn_hprd: {bc['adj_rn_hprd']}")
        print(f"  total_turnover: {bc['total_turnover']}")
        print(f"  rn_turnover: {bc['rn_turnover']}")
        print(f"  admin_turnover: {bc['admin_turnover']}")


def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV

    if not os.path.exists(csv_path):
        print(f"ERROR: CSV not found at {csv_path}")
        sys.exit(1)

    print(f"Reading: {csv_path}")
    staffing = load_staffing_from_csv(csv_path)
    verify_bay_crest(staffing)
    enrich_state_files(staffing)
    print("\n✅ Done! Re-run compute_national_averages.py to update benchmarks.")


if __name__ == "__main__":
    main()
