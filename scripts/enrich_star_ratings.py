#!/usr/bin/env python3
"""
Enrich facility JSON files with CMS component star ratings from NH_ProviderInfo CSV.

Downloads or reads the CMS NH Provider Info CSV and adds:
  - staffing_stars (1-5)
  - quality_stars (1-5)
  - inspection_stars (1-5)
  - Verifies overall_rating matches our `stars` field

Also updates overall stars if CMS has a newer value.

Source: CMS NH Provider Info CSV
Run: python3 scripts/enrich_star_ratings.py [path_to_csv]
"""

import csv
import json
import os
import sys

STATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'states')
DEFAULT_CSV = os.path.join(os.path.dirname(__file__), '..', 'data', 'cms_raw', 'NH_ProviderInfo_Mar2026.csv')


def load_ratings_from_csv(csv_path):
    """Parse CMS NH Provider Info CSV for star ratings."""
    ratings = {}

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)

        for row in reader:
            # CMS uses different column names across releases — try all known variants
            ccn = (row.get('CMS Certification Number (CCN)', '') or
                   row.get('Federal Provider Number', '') or
                   row.get('CCN', '')).strip()
            if not ccn:
                continue

            def safe_int(val):
                try:
                    v = int(val.strip())
                    return v if 1 <= v <= 5 else None
                except (ValueError, TypeError, AttributeError):
                    return None

            ratings[ccn] = {
                'overall_rating': safe_int(row.get('Overall Rating', '')),
                'staffing_stars': safe_int(row.get('Staffing Rating', '')),
                'quality_stars': safe_int(row.get('QM Rating', '')),
                'inspection_stars': safe_int(row.get('Health Inspection Rating', '')),
                'provider_name': row.get('Provider Name', '').strip(),
            }

    print(f"Loaded ratings for {len(ratings)} facilities from CSV")
    return ratings


def enrich_state_files(ratings):
    """Add component star ratings to each state JSON file."""
    updated_count = 0
    missing_count = 0
    stars_mismatches = []

    for fname in sorted(os.listdir(STATES_DIR)):
        if not fname.endswith('.json'):
            continue

        fpath = os.path.join(STATES_DIR, fname)
        with open(fpath) as f:
            state_data = json.load(f)

        changed = False
        for fac in state_data.get('facilities', []):
            ccn = fac.get('ccn', '')
            if ccn in ratings:
                r = ratings[ccn]

                # Add component star ratings
                if r['staffing_stars'] is not None:
                    fac['staffing_stars'] = r['staffing_stars']
                    changed = True
                if r['quality_stars'] is not None:
                    fac['quality_stars'] = r['quality_stars']
                    changed = True
                if r['inspection_stars'] is not None:
                    fac['inspection_stars'] = r['inspection_stars']
                    changed = True

                # Check and update overall stars
                our_stars = fac.get('stars')
                cms_stars = r['overall_rating']
                if cms_stars is not None and our_stars != cms_stars:
                    stars_mismatches.append({
                        'ccn': ccn,
                        'name': fac.get('name', r['provider_name']),
                        'ours': our_stars,
                        'cms': cms_stars,
                    })
                    fac['stars'] = cms_stars
                    changed = True

                updated_count += 1
            else:
                missing_count += 1

        if changed:
            with open(fpath, 'w') as f:
                json.dump(state_data, f, separators=(',', ':'))

    print(f"\nEnriched {updated_count} facilities with component star ratings")
    print(f"Missing from CMS CSV: {missing_count} facilities (may be closed/decertified)")

    if stars_mismatches:
        print(f"\n⚠️  Overall star rating mismatches ({len(stars_mismatches)} facilities):")
        for m in stars_mismatches[:20]:
            print(f"  {m['ccn']} ({m['name']}): ours={m['ours']} → CMS={m['cms']}")
        if len(stars_mismatches) > 20:
            print(f"  ... and {len(stars_mismatches) - 20} more")
    else:
        print("\n✅ All overall star ratings match CMS data")


def print_sample(ratings):
    """Print a few sample facilities to verify data quality."""
    print("\nSample ratings:")
    for i, (ccn, r) in enumerate(ratings.items()):
        if i >= 5:
            break
        print(f"  {ccn}: overall={r['overall_rating']} staffing={r['staffing_stars']} "
              f"quality={r['quality_stars']} inspection={r['inspection_stars']}")


def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV

    if not os.path.exists(csv_path):
        print(f"ERROR: CSV not found at {csv_path}")
        print(f"Download from CMS Provider Data: NH_ProviderInfo CSV")
        sys.exit(1)

    print(f"Reading: {csv_path}")
    ratings = load_ratings_from_csv(csv_path)
    print_sample(ratings)
    enrich_state_files(ratings)
    print("\n✅ Done! Re-run compute_national_averages.py to update benchmarks if needed.")


if __name__ == "__main__":
    main()
