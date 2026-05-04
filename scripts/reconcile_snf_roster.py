#!/usr/bin/env python3
"""
Reconcile SNF roster against the latest CMS NH_ProviderInfo CSV.

The state JSONs at public/data/states/{XX}.json are the source-of-truth roster
for the Oversight Reports site. When CMS publishes a new monthly snapshot, the
roster drifts:
  - Decertified facilities still appear in our state JSONs.
  - Newly certified facilities are missing entirely.

This script reconciles the roster:
  1. REMOVE any facility whose CCN is no longer in the new Provider Info CSV.
  2. ADD any facility from the new CSV that isn't currently in our state JSONs,
     populated only with Provider Info basics (no fabricated metrics).
  3. Update each state JSON's top-level aggregates (count, total_fines, _metadata).
  4. Print a roster delta report.

Run AFTER running refresh_penalties / refresh_staffing / etc., because new
facilities will have empty metric arrays that downstream refresh scripts will
populate on the next cycle.

Usage:
    python3 scripts/reconcile_snf_roster.py [path_to_provider_info_csv]
"""

import csv
import json
import os
import sys
from datetime import date

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STATES_DIR = os.path.join(ROOT, 'public', 'data', 'states')
DEFAULT_CSV = os.path.join(
    ROOT, '..', 'data', 'cms_raw', 'NH_ProviderInfo_Apr2026.csv'
)


def parse_int(v, default=None):
    try:
        return int(float(v)) if v not in (None, '', ' ') else default
    except (ValueError, TypeError):
        return default


def parse_float(v, default=None):
    try:
        return float(v) if v not in (None, '', ' ') else default
    except (ValueError, TypeError):
        return default


def parse_provider_info(csv_path):
    """Build a dict of CCN -> provider basics from the CSV."""
    roster = {}
    with open(csv_path, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ccn = (row.get('CMS Certification Number (CCN)') or '').strip()
            if not ccn:
                continue
            roster[ccn] = {
                'ccn': ccn,
                'name': (row.get('Provider Name') or '').strip(),
                'address': (row.get('Provider Address') or '').strip(),
                'city': (row.get('City/Town') or '').strip(),
                'state': (row.get('State') or '').strip(),
                'zip': (row.get('ZIP Code') or '').strip(),
                'lat': parse_float(row.get('Latitude')),
                'lon': parse_float(row.get('Longitude')),
                'beds': parse_int(row.get('Number of Certified Beds'), 0),
                'stars': parse_int(row.get('Overall Rating')),
                'ownership_type': (row.get('Ownership Type') or '').strip(),
                'chain_name': (row.get('Chain Name') or '').strip() or None,
                'abuse_icon': (row.get('Abuse Icon') or '').strip() == 'Y',
            }
    return roster


def make_new_facility_record(provider):
    """Build a minimal facility record for a newly certified facility.

    Empty metrics are honest (no fabrication). Downstream refresh scripts
    populate these on the next cycle.
    """
    return {
        'ccn': provider['ccn'],
        'name': provider['name'],
        'address': provider['address'],
        'city': provider['city'],
        'state': provider['state'],
        'zip': provider['zip'],
        'lat': provider['lat'],
        'lon': provider['lon'],
        'beds': provider['beds'],
        'stars': provider['stars'],
        'composite': None,
        'staffing_score': None,
        'deficiency_score': None,
        'penalty_score': None,
        'ownership_score': None,
        'quality_score': None,
        'flags': [],
        # Staffing
        'rn_hprd': None,
        'total_hprd': None,
        'lpn_hprd': None,
        'cna_hprd': None,
        'zero_rn_pct': None,
        'rn_gap_pct': None,
        'self_report_rn': None,
        'contractor_pct': None,
        'avg_census': None,
        # Deficiencies
        'total_deficiencies': 0,
        'harm_count': 0,
        'jeopardy_count': 0,
        'severity_score': 0,
        'top_categories': [],
        'fire_deficiency_count': 0,
        'fire_safety_score': None,
        'fire_deficiencies': [],
        # Penalties
        'total_fines': 0,
        'fine_count': 0,
        'denial_count': 0,
        'penalty_timeline': [],
        # Ownership
        'num_owners': 0,
        'worst_owner': None,
        'owner_portfolio_count': 0,
        'owner_avg_fines': 0,
        'owner_avg_stars': None,
        'owner_pct_below_avg': None,
        'chain_name': provider['chain_name'],
        'ownership_type': provider['ownership_type'],
        'pe_owned': False,
        'reit_owned': False,
        'pe_owner_name': None,
        'reit_owner_name': None,
        'investment_firm_involved': False,
        'pe_detection_method': None,
        'reit_detection_method': None,
        'ownership_changed_recently': False,
        'ownership_change_date': None,
        'new_owner_name': None,
        # Chain context
        'chain_avg_stars': None,
        'chain_total_fines': 0,
        'chain_facility_count': None,
        'chain_abuse_pct': None,
        'chain_avg_hprd': None,
        # Trends
        'staffing_trend': None,
        'trend_direction': 'unknown',
        # Cost reports
        'related_party_costs': None,
        'related_party_year': None,
        # Newly-added marker for downstream scripts / transparency
        '_newly_added': True,
        '_added_on': date.today().isoformat(),
    }


def reconcile():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV
    if not os.path.exists(csv_path):
        print(f'ERROR: CSV not found at {csv_path}')
        sys.exit(1)

    print(f'Reading roster from {csv_path}')
    roster = parse_provider_info(csv_path)
    print(f'  CSV roster size: {len(roster)} CCNs')

    # Group new-roster CCNs by state for fast lookup
    by_state_new = {}
    for ccn, p in roster.items():
        by_state_new.setdefault(p['state'], {})[ccn] = p

    removed = []
    added = []
    state_files = sorted(
        f for f in os.listdir(STATES_DIR) if f.endswith('.json')
    )
    today_iso = date.today().isoformat()

    for fname in state_files:
        state_code = fname.replace('.json', '')
        fpath = os.path.join(STATES_DIR, fname)
        with open(fpath) as f:
            data = json.load(f)

        existing_facs = data.get('facilities', [])
        existing_ccns = {fac.get('ccn') for fac in existing_facs}

        # 1. Remove decertified facilities
        kept = []
        for fac in existing_facs:
            ccn = fac.get('ccn')
            if ccn in roster:
                kept.append(fac)
            else:
                removed.append(
                    {
                        'ccn': ccn,
                        'name': fac.get('name'),
                        'state': fac.get('state'),
                    }
                )

        # 2. Add new facilities for this state
        new_in_state = by_state_new.get(state_code, {})
        for ccn, p in new_in_state.items():
            if ccn not in existing_ccns:
                new_rec = make_new_facility_record(p)
                kept.append(new_rec)
                added.append(
                    {'ccn': ccn, 'name': p['name'], 'state': p['state']}
                )

        # 3. Update top-level aggregates
        new_total_fines = sum((f.get('total_fines') or 0) for f in kept)
        new_high_risk = sum(
            1
            for f in kept
            if (f.get('jeopardy_count') or 0) > 0
            or (f.get('total_fines') or 0) >= 100000
        )

        data['facilities'] = kept
        data['count'] = len(kept)
        data['high_risk'] = new_high_risk
        data['total_fines'] = round(new_total_fines, 2)

        meta = data.setdefault('_metadata', {})
        meta['data_as_of'] = '2026-04-01'
        meta['last_enriched'] = today_iso
        meta['facility_count'] = len(kept)
        if 'sources' not in meta:
            meta['sources'] = []

        with open(fpath, 'w') as f:
            json.dump(data, f, separators=(',', ':'))

    # Print summary
    final_total = sum(
        json.load(open(os.path.join(STATES_DIR, fn))).get('count', 0)
        for fn in state_files
    )
    print(f'\nRemoved (decertified): {len(removed)}')
    for r in removed[:10]:
        print(f'  - {r["ccn"]} {r["name"]} ({r["state"]})')
    if len(removed) > 10:
        print(f'  ... ({len(removed) - 10} more)')

    print(f'\nAdded (newly certified): {len(added)}')
    for a in added[:10]:
        print(f'  + {a["ccn"]} {a["name"]} ({a["state"]})')
    if len(added) > 10:
        print(f'  ... ({len(added) - 10} more)')

    print(f'\nFinal facility count across all state JSONs: {final_total}')
    print(
        f'Expected from CSV: {len(roster)} '
        f'(match: {final_total == len(roster)})'
    )

    return removed, added, final_total


if __name__ == '__main__':
    reconcile()
