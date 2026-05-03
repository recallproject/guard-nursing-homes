#!/usr/bin/env python3
"""
Refresh deficiency data in facility JSON files from CMS health and fire safety citations.

Recalculates for each facility:
  - total_deficiencies: total count of health citations
  - fire_deficiency_count: total count of fire safety citations
  - complaint_investigations: count of complaint-based health citations
  - serious_deficiency_count: count of citations with immediate jeopardy/actual harm

Source: CMS NH_HealthCitations_Mar2026.csv and NH_FireSafetyCitations_Mar2026.csv
Run: python3 scripts/refresh_deficiencies.py [path_to_health_csv] [path_to_fire_csv]
"""

import csv
import json
import os
import sys
from collections import defaultdict

STATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'states')
DEFAULT_HEALTH_CSV = os.path.join(os.path.dirname(__file__), '..', 'data', 'cms_raw', 'NH_HealthCitations_Mar2026.csv')
DEFAULT_FIRE_CSV = os.path.join(os.path.dirname(__file__), '..', 'data', 'cms_raw', 'NH_FireSafetyCitations_Mar2026.csv')


def load_health_citations_from_csv(csv_path):
    """Parse CMS health citations CSV and group by CCN."""
    deficiencies = defaultdict(list)
    complaint_counts = defaultdict(int)
    serious_counts = defaultdict(int)
    harm_counts = defaultdict(int)
    jeopardy_counts = defaultdict(int)

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ccn = (row.get('CMS Certification Number (CCN)', '') or
                   row.get('Federal Provider Number', '')).strip()
            if not ccn:
                continue

            deficiencies[ccn].append(row)

            # Count complaint investigations
            complaint_deficiency = row.get('Complaint Deficiency', '').strip().upper()
            if complaint_deficiency == 'Y':
                complaint_counts[ccn] += 1

            # Count serious deficiencies (scope/severity codes G-L indicate immediate jeopardy or actual harm)
            # CMS column has been "Scope Severity Code" (no "and") in 2025-2026 refreshes; keep both for safety
            scope_severity = (row.get('Scope Severity Code', '') or
                              row.get('Scope and Severity Code', '')).strip().upper()
            if scope_severity in ['G', 'H', 'I', 'J', 'K', 'L']:
                serious_counts[ccn] += 1
            # Split: G/H/I = actual harm, J/K/L = immediate jeopardy
            if scope_severity in ['G', 'H', 'I']:
                harm_counts[ccn] += 1
            elif scope_severity in ['J', 'K', 'L']:
                jeopardy_counts[ccn] += 1

    print(f"Loaded health citations for {len(deficiencies)} facilities from CSV")
    total_records = sum(len(v) for v in deficiencies.values())
    print(f"Total health citation records: {total_records}")
    return deficiencies, complaint_counts, serious_counts, harm_counts, jeopardy_counts


def load_fire_citations_from_csv(csv_path):
    """Parse CMS fire safety citations CSV and group by CCN."""
    fire_deficiencies = defaultdict(int)

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ccn = (row.get('CMS Certification Number (CCN)', '') or
                   row.get('Federal Provider Number', '')).strip()
            if not ccn:
                continue

            fire_deficiencies[ccn] += 1

    print(f"Loaded fire safety citations for {len(fire_deficiencies)} facilities from CSV")
    total_records = sum(fire_deficiencies.values())
    print(f"Total fire safety citation records: {total_records}")
    return fire_deficiencies


def enrich_state_files(health_deficiencies, complaint_counts, serious_counts, harm_counts, jeopardy_counts, fire_deficiencies):
    """Update deficiency fields in each state JSON file."""
    updated_count = 0
    changed_deficiency_count = 0
    total_deficiency_delta = 0

    for fname in sorted(os.listdir(STATES_DIR)):
        if not fname.endswith('.json'):
            continue

        fpath = os.path.join(STATES_DIR, fname)
        with open(fpath) as f:
            state_data = json.load(f)

        changed = False
        for fac in state_data.get('facilities', []):
            ccn = fac.get('ccn', '')
            
            # Calculate health deficiencies
            new_total_deficiencies = len(health_deficiencies.get(ccn, []))
            new_complaint_investigations = complaint_counts.get(ccn, 0)
            new_serious_deficiency_count = serious_counts.get(ccn, 0)
            new_harm_count = harm_counts.get(ccn, 0)
            new_jeopardy_count = jeopardy_counts.get(ccn, 0)
            
            # Get fire safety count
            new_fire_deficiency_count = fire_deficiencies.get(ccn, 0)

            # Track changes
            old_total = fac.get('total_deficiencies', 0) or 0
            if new_total_deficiencies != old_total:
                changed_deficiency_count += 1
                total_deficiency_delta += (new_total_deficiencies - old_total)

            # Update all deficiency fields
            fac['total_deficiencies'] = new_total_deficiencies
            fac['fire_deficiency_count'] = new_fire_deficiency_count
            fac['complaint_investigations'] = new_complaint_investigations
            fac['serious_deficiency_count'] = new_serious_deficiency_count
            fac['harm_count'] = new_harm_count
            fac['jeopardy_count'] = new_jeopardy_count
            changed = True
            updated_count += 1

        if changed:
            with open(fpath, 'w') as f:
                json.dump(state_data, f, separators=(',', ':'))

    print(f"\nUpdated deficiencies for {updated_count} facilities")
    print(f"Facilities with changed deficiency counts: {changed_deficiency_count}")
    print(f"Net change in total deficiencies across all facilities: {total_deficiency_delta}")


def verify_bay_crest(health_deficiencies, complaint_counts, serious_counts, fire_deficiencies):
    """Quick verification against known Bay Crest data."""
    bc_health = len(health_deficiencies.get('055559', []))
    bc_fire = fire_deficiencies.get('055559', 0)
    bc_complaints = complaint_counts.get('055559', 0)
    bc_serious = serious_counts.get('055559', 0)
    
    print(f"\n🔍 Bay Crest (055559) verification:")
    print(f"  Total health citations: {bc_health}")
    print(f"  Fire safety citations: {bc_fire}")
    print(f"  Complaint investigations: {bc_complaints}")
    print(f"  Serious deficiencies (G-L): {bc_serious}")


def main():
    health_csv_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_HEALTH_CSV
    fire_csv_path = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_FIRE_CSV

    if not os.path.exists(health_csv_path):
        print(f"ERROR: Health CSV not found at {health_csv_path}")
        sys.exit(1)

    if not os.path.exists(fire_csv_path):
        print(f"ERROR: Fire CSV not found at {fire_csv_path}")
        sys.exit(1)

    print(f"Reading: {health_csv_path}")
    health_deficiencies, complaint_counts, serious_counts, harm_counts, jeopardy_counts = load_health_citations_from_csv(health_csv_path)
    
    print(f"Reading: {fire_csv_path}")
    fire_deficiencies = load_fire_citations_from_csv(fire_csv_path)
    
    verify_bay_crest(health_deficiencies, complaint_counts, serious_counts, fire_deficiencies)
    enrich_state_files(health_deficiencies, complaint_counts, serious_counts, harm_counts, jeopardy_counts, fire_deficiencies)
    print("\n✅ Done! Re-run compute_national_averages.py to update benchmarks.")


if __name__ == "__main__":
    main()
