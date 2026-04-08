#!/usr/bin/env python3
"""
Refresh quality measures data in facility JSON files from CMS NH_QualityMsr_MDS CSV.

For each facility, updates quality_measures object with MDS measure data:
  quality_measures: {
    mds: {
      ls: {  // long-stay
        "401": { "s": <Q4 or latest score>, "d": "<Description>" },
        ...
      },
      ss: {  // short-stay
        "521": { "s": <Q4 or latest score>, "d": "<Description>" },
        ...
      }
    }
  }

Measure codes are grouped by resident type (Long Stay vs Short Stay).
For each measure, uses latest available quarter score (Q4 → Q3 → Q2 → Q1).

Source: CMS NH_QualityMsr_MDS CSV
Run: python3 scripts/refresh_quality_measures.py [path_to_csv]
"""

import csv
import json
import os
import sys
from collections import defaultdict

STATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'states')
DEFAULT_CSV = os.path.join(os.path.dirname(__file__), '..', 'data', 'cms_raw', 'NH_QualityMsr_MDS_Mar2026.csv')


def safe_float(val):
    """Safely convert string to float."""
    try:
        v = float(val.strip())
        return round(v, 2) if v >= 0 else None
    except (ValueError, TypeError, AttributeError):
        return None


def load_quality_measures_from_csv(csv_path):
    """Parse CMS quality measures CSV and group by CCN."""
    quality_measures = defaultdict(lambda: {
        'ls': {},  # long-stay
        'ss': {},  # short-stay
    })

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ccn = (row.get('CMS Certification Number (CCN)', '') or
                   row.get('Federal Provider Number', '')).strip()
            if not ccn:
                continue

            measure_code = row.get('Measure Code', '').strip()
            if not measure_code:
                continue

            resident_type = row.get('Resident type', row.get('Resident Type', '')).strip()
            measure_desc = row.get('Measure Description', '').strip()

            # Determine if long-stay or short-stay
            measure_type = 'ls' if 'Long' in resident_type else 'ss'

            # Try to get the latest available quarter score (Q4, Q3, Q2, Q1)
            score = None
            for quarter in ['Q4', 'Q3', 'Q2', 'Q1']:
                # Try both "Q4 Measure Score" and "Q4 Score" column names
                col_name = f'{quarter} Measure Score'
                quarter_score = safe_float(row.get(col_name, '') or row.get(f'{quarter} Score', ''))
                if quarter_score is not None:
                    score = quarter_score
                    break

            # Only add if we have a valid score
            if score is not None:
                quality_measures[ccn][measure_type][measure_code] = {
                    's': score,
                    'd': measure_desc
                }

    print(f"Loaded quality measures for {len(quality_measures)} facilities from CSV")
    total_measures = sum(
        len(q['ls']) + len(q['ss'])
        for q in quality_measures.values()
    )
    print(f"Total quality measures loaded: {total_measures}")
    return quality_measures


def enrich_state_files(quality_measures):
    """Update quality_measures fields in each state JSON file."""
    updated_count = 0
    changed_measures = 0

    for fname in sorted(os.listdir(STATES_DIR)):
        if not fname.endswith('.json'):
            continue

        fpath = os.path.join(STATES_DIR, fname)
        with open(fpath) as f:
            state_data = json.load(f)

        changed = False
        for fac in state_data.get('facilities', []):
            ccn = fac.get('ccn', '')
            if ccn not in quality_measures:
                continue

            q = quality_measures[ccn]
            updated_count += 1

            # Track changes
            old_measures = fac.get('quality_measures', {})
            if old_measures != {'mds': q}:
                changed_measures += 1

            # Update quality measures (merge to preserve claims/qrp keys)
            if 'quality_measures' not in fac:
                fac['quality_measures'] = {}
            fac['quality_measures']['mds'] = q
            changed = True

        if changed:
            with open(fpath, 'w') as f:
                json.dump(state_data, f, separators=(',', ':'))

    print(f"\nUpdated quality measures for {updated_count} facilities")
    print(f"Facilities with changed quality measures: {changed_measures}")


def verify_bay_crest(quality_measures):
    """Quick verification against known Bay Crest data."""
    bc = quality_measures.get('055559', {})
    if bc:
        ls_measures = bc.get('ls', {})
        ss_measures = bc.get('ss', {})
        
        print(f"\n🔍 Bay Crest (055559) verification:")
        print(f"  Long-stay measures: {len(ls_measures)}")
        if ls_measures:
            sample_codes = sorted(ls_measures.keys())[:3]
            for code in sample_codes:
                m = ls_measures[code]
                print(f"    {code}: score={m['s']}, desc={m['d'][:50]}...")
        
        print(f"  Short-stay measures: {len(ss_measures)}")
        if ss_measures:
            sample_codes = sorted(ss_measures.keys())[:3]
            for code in sample_codes:
                m = ss_measures[code]
                print(f"    {code}: score={m['s']}, desc={m['d'][:50]}...")


def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV

    if not os.path.exists(csv_path):
        print(f"ERROR: CSV not found at {csv_path}")
        sys.exit(1)

    print(f"Reading: {csv_path}")
    quality_measures = load_quality_measures_from_csv(csv_path)
    verify_bay_crest(quality_measures)
    enrich_state_files(quality_measures)
    print("\n✅ Done! Re-run compute_national_averages.py to update benchmarks.")


if __name__ == "__main__":
    main()
