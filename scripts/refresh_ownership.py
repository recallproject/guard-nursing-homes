#!/usr/bin/env python3
"""
Refresh ownership data in facility JSON files from CMS NH_Ownership CSV.

Updates for each facility:
  - chain_name: name from "Management company" or "Management/Operator" role (first match)
  - ownership_type: from "5% or greater direct ownership interest" rows
  - owner_count: distinct count of owner names
  - ownership_changes: left unchanged (cannot compute from snapshot)

Source: CMS NH_Ownership CSV
Run: python3 scripts/refresh_ownership.py [path_to_csv]
"""

import csv
import json
import os
import sys
from collections import defaultdict

STATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'states')
DEFAULT_CSV = os.path.join(os.path.dirname(__file__), '..', 'data', 'cms_raw', 'NH_Ownership_Mar2026.csv')


def load_ownership_from_csv(csv_path):
    """Parse CMS ownership CSV and group by CCN."""
    ownership_data = defaultdict(lambda: {
        'chain_name': None,
        'ownership_type': None,
        'owner_names': set(),
    })

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ccn = (row.get('CMS Certification Number (CCN)', '') or
                   row.get('Federal Provider Number', '')).strip()
            if not ccn:
                continue

            owner_name = row.get('Owner Name', '').strip()
            owner_type = row.get('Owner Type', '').strip()
            role = row.get('Role played by Owner or Manager in Facility', '').strip().upper()

            if owner_name:
                ownership_data[ccn]['owner_names'].add(owner_name)

            # Get chain/management company name
            if ownership_data[ccn]['chain_name'] is None:
                if 'MANAGEMENT' in role or 'OPERATOR' in role:
                    ownership_data[ccn]['chain_name'] = owner_name

            # Get ownership type from direct or indirect ownership rows
            if ownership_data[ccn]['ownership_type'] is None:
                if '5%' in role and 'OWNERSHIP' in role:
                    if owner_type:
                        ownership_data[ccn]['ownership_type'] = owner_type

    print(f"Loaded ownership data for {len(ownership_data)} facilities from CSV")
    return ownership_data


def enrich_state_files(ownership_data):
    """Update ownership fields in each state JSON file."""
    updated_count = 0
    changed_chain = 0
    changed_ownership_type = 0

    for fname in sorted(os.listdir(STATES_DIR)):
        if not fname.endswith('.json'):
            continue

        fpath = os.path.join(STATES_DIR, fname)
        with open(fpath) as f:
            state_data = json.load(f)

        changed = False
        for fac in state_data.get('facilities', []):
            ccn = fac.get('ccn', '')
            if ccn not in ownership_data:
                continue

            o = ownership_data[ccn]
            updated_count += 1

            # Track changes
            old_chain = fac.get('chain_name')
            new_chain = o['chain_name']
            if new_chain and old_chain != new_chain:
                changed_chain += 1

            old_ownership_type = fac.get('ownership_type')
            new_ownership_type = o['ownership_type']
            if new_ownership_type and old_ownership_type != new_ownership_type:
                changed_ownership_type += 1

            # Update ownership fields
            if o['chain_name']:
                fac['chain_name'] = o['chain_name']
                changed = True
            
            if o['ownership_type']:
                fac['ownership_type'] = o['ownership_type']
                changed = True
            
            # Always update owner count
            owner_count = len(o['owner_names'])
            fac['owner_count'] = owner_count
            changed = True
            
            # Note: ownership_changes is left unchanged as per spec

        if changed:
            with open(fpath, 'w') as f:
                json.dump(state_data, f, separators=(',', ':'))

    print(f"\nUpdated ownership data for {updated_count} facilities")
    print(f"Facilities with changed chain_name: {changed_chain}")
    print(f"Facilities with changed ownership_type: {changed_ownership_type}")


def verify_bay_crest(ownership_data):
    """Quick verification against known Bay Crest data."""
    bc = ownership_data.get('055559', {})
    if bc:
        print(f"\n🔍 Bay Crest (055559) verification:")
        print(f"  chain_name: {bc['chain_name']}")
        print(f"  ownership_type: {bc['ownership_type']}")
        print(f"  owner_count: {len(bc['owner_names'])}")
        if bc['owner_names']:
            print(f"  owners: {', '.join(sorted(bc['owner_names']))[:100]}...")


def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV

    if not os.path.exists(csv_path):
        print(f"ERROR: CSV not found at {csv_path}")
        sys.exit(1)

    print(f"Reading: {csv_path}")
    ownership_data = load_ownership_from_csv(csv_path)
    verify_bay_crest(ownership_data)
    enrich_state_files(ownership_data)
    print("\n✅ Done! Re-run compute_national_averages.py to update benchmarks.")


if __name__ == "__main__":
    main()
