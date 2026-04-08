#!/usr/bin/env python3
"""
Recompute the composite risk score for every facility from its sub-scores.

Composite formula (see MethodologyPage.jsx):
  composite = (staffing_score  * 0.35)
            + (deficiency_score * 0.25)
            + (penalty_score    * 0.20)
            + (quality_score    * 0.10)
            + (ownership_score  * 0.10)

Missing sub-scores default to 50 and are logged as warnings.
Run after any sub-score refresh to keep the composite current.
"""

import json
import os
import statistics
import sys

STATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'states')

WEIGHTS = {
    'staffing_score':   0.35,
    'deficiency_score': 0.25,
    'penalty_score':    0.20,
    'quality_score':    0.10,
    'ownership_score':  0.10,
}

DEFAULT_SCORE = 50


def compute_composite(facility):
    """Return (composite_value, list_of_missing_field_names)."""
    missing = []
    total = 0.0
    for field, weight in WEIGHTS.items():
        val = facility.get(field)
        if val is None:
            missing.append(field)
            val = DEFAULT_SCORE
        total += val * weight
    return round(total, 1), missing


def main():
    total_facilities = 0
    composites = []
    missing_count = 0  # number of individual missing sub-scores across all facilities

    for fname in sorted(os.listdir(STATES_DIR)):
        if not fname.endswith('.json'):
            continue

        fpath = os.path.join(STATES_DIR, fname)
        with open(fpath) as f:
            state_data = json.load(f)

        changed = False
        for fac in state_data.get('facilities', []):
            total_facilities += 1
            new_composite, missing_fields = compute_composite(fac)

            if missing_fields:
                missing_count += len(missing_fields)
                ccn = fac.get('ccn', 'UNKNOWN')
                name = fac.get('name', 'UNKNOWN')
                print(f"  WARNING: {ccn} ({name}) missing: {', '.join(missing_fields)} — defaulted to {DEFAULT_SCORE}")

            fac['composite'] = new_composite
            composites.append(new_composite)
            changed = True

        if changed:
            with open(fpath, 'w') as f:
                json.dump(state_data, f, separators=(',', ':'))

    # Summary
    if not composites:
        print("No facilities found.")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"Composite refresh complete")
    print(f"{'='*60}")
    print(f"  Total facilities:      {total_facilities}")
    print(f"  Min composite:         {min(composites)}")
    print(f"  Max composite:         {max(composites)}")
    print(f"  Mean composite:        {round(statistics.mean(composites), 2)}")
    print(f"  Median composite:      {round(statistics.median(composites), 2)}")
    print(f"  Missing sub-scores:    {missing_count}")
    print(f"\nDone. Re-run compute_national_averages.py to update benchmarks.")


if __name__ == "__main__":
    main()
