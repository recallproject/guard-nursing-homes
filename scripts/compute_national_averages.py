#!/usr/bin/env python3
"""
Compute national averages from the facility dataset and write to a JSON file.
This replaces hardcoded NATIONAL_AVG constants in generateEvidencePDF.js and EvidencePage.jsx.

Run after any data refresh to keep benchmarks current.
Output: public/data/national_averages.json
"""

import json
import os
import statistics
from datetime import date

STATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'states')
OUTPUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'national_averages.json')

def load_all_facilities():
    facilities = []
    for fname in sorted(os.listdir(STATES_DIR)):
        if fname.endswith('.json'):
            with open(os.path.join(STATES_DIR, fname)) as f:
                data = json.load(f)
                facilities.extend(data.get('facilities', []))
    return facilities

def safe_avg(facilities, field, exclude_zero=False):
    vals = []
    for f in facilities:
        v = f.get(field)
        if v is not None:
            if exclude_zero and v == 0:
                continue
            vals.append(v)
    return round(sum(vals) / len(vals), 2) if vals else None

def safe_median(facilities, field):
    vals = [f[field] for f in facilities if f.get(field) is not None]
    return round(statistics.median(vals), 2) if vals else None

def main():
    facilities = load_all_facilities()
    print(f"Loaded {len(facilities)} facilities from {STATES_DIR}")

    averages = {
        # Staffing
        "total_hprd": safe_avg(facilities, "total_hprd", exclude_zero=True),
        "rn_hprd": safe_avg(facilities, "rn_hprd", exclude_zero=True),
        "lpn_hprd": safe_avg(facilities, "lpn_hprd", exclude_zero=True),
        "cna_hprd": safe_avg(facilities, "cna_hprd", exclude_zero=True),
        "zero_rn_pct": safe_avg(facilities, "zero_rn_pct"),
        "contractor_pct": safe_avg(facilities, "contractor_pct"),

        # Turnover
        "total_turnover": safe_avg(facilities, "total_turnover", exclude_zero=True),
        "rn_turnover": safe_avg(facilities, "rn_turnover", exclude_zero=True),
        "admin_turnover": safe_avg(facilities, "admin_turnover"),

        # Ratings & Scores
        "stars": safe_avg(facilities, "stars", exclude_zero=True),
        "composite": safe_avg(facilities, "composite"),

        # Penalties
        "total_fines": safe_avg(facilities, "total_fines"),
        "total_fines_median": safe_median(facilities, "total_fines"),

        # Deficiencies
        "total_deficiencies": safe_avg(facilities, "total_deficiencies"),
        "fire_deficiency_count": safe_avg(facilities, "fire_deficiency_count"),

        # Complaint investigations
        "complaint_investigations": 7,  # CMS published, not in our dataset

        # Metadata
        "_computed_from": len(facilities),
        "_computed_on": date.today().isoformat(),
        "_note": "Computed from facility dataset. Some CMS-published averages may differ due to methodology."
    }

    # Also compute per-state averages
    state_avgs = {}
    by_state = {}
    for f in facilities:
        st = f.get("state", "")
        if st:
            by_state.setdefault(st, []).append(f)

    for st, facs in sorted(by_state.items()):
        state_avgs[st] = {
            "total_hprd": safe_avg(facs, "total_hprd", exclude_zero=True),
            "rn_hprd": safe_avg(facs, "rn_hprd", exclude_zero=True),
            "stars": safe_avg(facs, "stars", exclude_zero=True),
            "composite": safe_avg(facs, "composite"),
            "total_fines": safe_avg(facs, "total_fines"),
            "total_deficiencies": safe_avg(facs, "total_deficiencies"),
            "total_turnover": safe_avg(facs, "total_turnover", exclude_zero=True),
            "facility_count": len(facs),
        }

    output = {
        "national": averages,
        "by_state": state_avgs,
    }

    with open(OUTPUT, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nNational averages written to {OUTPUT}")
    print(f"\nKey values:")
    for k, v in averages.items():
        if not k.startswith("_"):
            print(f"  {k}: {v}")
    print(f"\nState averages computed for {len(state_avgs)} states")

if __name__ == "__main__":
    main()
