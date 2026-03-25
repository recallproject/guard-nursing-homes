#!/usr/bin/env python3
"""
Refresh penalty data in facility JSON files from CMS NH_Penalties CSV.

Recalculates for each facility:
  - total_fines: sum of all Fine amounts
  - fine_count: number of Fine penalties
  - denial_count: number of Payment Denial penalties
  - penalty_timeline: array of individual penalties with dates and amounts

Source: CMS NH_Penalties CSV (g6vv-u9sr)
Run: python3 scripts/refresh_penalties.py [path_to_csv]
"""

import csv
import json
import os
import sys
from collections import defaultdict

STATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'states')
DEFAULT_CSV = os.path.join(os.path.dirname(__file__), '..', 'data', 'cms_raw', 'NH_Penalties_Mar2026.csv')


def load_penalties_from_csv(csv_path):
    """Parse CMS penalties CSV and group by CCN."""
    penalties = defaultdict(list)

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ccn = (row.get('CMS Certification Number (CCN)', '') or
                   row.get('Federal Provider Number', '')).strip()
            if not ccn:
                continue

            penalty_type = row.get('Penalty Type', '').strip()
            penalty_date = row.get('Penalty Date', '').strip()
            fine_amount = row.get('Fine Amount', '').strip()
            denial_start = row.get('Payment Denial Start Date', '').strip()
            denial_days = row.get('Payment Denial Length in Days', '').strip()

            entry = {
                'type': penalty_type,
                'date': penalty_date,
            }

            if penalty_type == 'Fine' and fine_amount:
                try:
                    entry['amount'] = round(float(fine_amount), 2)
                except ValueError:
                    entry['amount'] = 0
            elif penalty_type == 'Payment Denial':
                entry['denial_start'] = denial_start
                try:
                    entry['denial_days'] = int(denial_days)
                except (ValueError, TypeError):
                    entry['denial_days'] = 0

            penalties[ccn].append(entry)

    print(f"Loaded penalties for {len(penalties)} facilities from CSV")
    total_records = sum(len(v) for v in penalties.values())
    print(f"Total penalty records: {total_records}")
    return penalties


def enrich_state_files(penalties):
    """Update penalty fields in each state JSON file."""
    updated_count = 0
    changed_fines = 0
    total_fines_delta = 0

    for fname in sorted(os.listdir(STATES_DIR)):
        if not fname.endswith('.json'):
            continue

        fpath = os.path.join(STATES_DIR, fname)
        with open(fpath) as f:
            state_data = json.load(f)

        changed = False
        for fac in state_data.get('facilities', []):
            ccn = fac.get('ccn', '')
            if ccn in penalties:
                pen_list = penalties[ccn]

                # Calculate totals
                fines = [p for p in pen_list if p['type'] == 'Fine']
                denials = [p for p in pen_list if p['type'] == 'Payment Denial']
                new_total_fines = sum(p.get('amount', 0) for p in fines)
                new_fine_count = len(fines)
                new_denial_count = len(denials)

                # Track changes
                old_total = fac.get('total_fines', 0) or 0
                if abs(new_total_fines - old_total) > 0.01:
                    changed_fines += 1
                    total_fines_delta += (new_total_fines - old_total)

                # Build penalty timeline sorted by date desc
                timeline = sorted(pen_list, key=lambda x: x.get('date', ''), reverse=True)

                fac['total_fines'] = round(new_total_fines, 2)
                fac['fine_count'] = new_fine_count
                fac['denial_count'] = new_denial_count
                fac['penalty_timeline'] = timeline
                changed = True
                updated_count += 1
            else:
                # No penalties in CMS — ensure zeroed out
                if fac.get('total_fines', 0) != 0 or fac.get('fine_count', 0) != 0:
                    fac['total_fines'] = 0
                    fac['fine_count'] = 0
                    fac['denial_count'] = 0
                    fac['penalty_timeline'] = []
                    changed = True

        if changed:
            with open(fpath, 'w') as f:
                json.dump(state_data, f, separators=(',', ':'))

    print(f"\nUpdated penalties for {updated_count} facilities")
    print(f"Facilities with changed fine totals: {changed_fines}")
    print(f"Net change in total fines across all facilities: ${total_fines_delta:,.2f}")


def verify_bay_crest(penalties):
    """Quick verification against known Bay Crest data."""
    bc = penalties.get('055559', [])
    if bc:
        fines = [p for p in bc if p['type'] == 'Fine']
        total = sum(p.get('amount', 0) for p in fines)
        print(f"\n🔍 Bay Crest (055559) verification:")
        print(f"  Fines: {len(fines)}, Total: ${total:,.2f}")
        print(f"  Expected: 5 fines, $156,358.00")
        for p in sorted(fines, key=lambda x: x['date']):
            print(f"    {p['date']}: ${p.get('amount', 0):,.2f}")


def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV

    if not os.path.exists(csv_path):
        print(f"ERROR: CSV not found at {csv_path}")
        sys.exit(1)

    print(f"Reading: {csv_path}")
    penalties = load_penalties_from_csv(csv_path)
    verify_bay_crest(penalties)
    enrich_state_files(penalties)
    print("\n✅ Done! Re-run compute_national_averages.py to update benchmarks.")


if __name__ == "__main__":
    main()
