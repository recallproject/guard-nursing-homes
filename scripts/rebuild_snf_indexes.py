#!/usr/bin/env python3
"""
Rebuild SNF lookup indexes from public/data/states/*.json after a roster refresh.

Writes:
  - public/data/ccn-index.json
  - public/data/index.json
  - public/facilities_map_data.json

Does not touch hospice / home-health / IRF / LTACH indexes.
"""

import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STATES_DIR = os.path.join(ROOT, 'public', 'data', 'states')
OUT_CCN = os.path.join(ROOT, 'public', 'data', 'ccn-index.json')
OUT_INDEX = os.path.join(ROOT, 'public', 'data', 'index.json')
OUT_MAP = os.path.join(ROOT, 'public', 'facilities_map_data.json')


def avg(vals):
    vals = [v for v in vals if v is not None]
    if not vals:
        return None
    return round(sum(vals) / len(vals), 1)


def is_high_risk(fac):
    """Match useFacilityData getHighRiskFacilities: composite >= 60."""
    return (fac.get('composite') or 0) >= 60


def main():
    states = {}
    ccn_index = {}
    for fname in sorted(os.listdir(STATES_DIR)):
        if not fname.endswith('.json'):
            continue
        code = fname.replace('.json', '')
        with open(os.path.join(STATES_DIR, fname)) as f:
            data = json.load(f)
        states[code] = data
        for fac in data.get('facilities', []):
            ccn = fac.get('ccn')
            if ccn:
                ccn_index[ccn] = fac.get('state') or code

    state_summary = {}
    national = {
        'total_facilities': 0,
        'high_risk': 0,
        'total_fines': 0,
        'zero_rn_facilities': 0,
        'serious_danger_facilities': 0,
        'pe_owned_count': 0,
        'reit_owned_count': 0,
        'recent_chow_count': 0,
        'trend_improving_count': 0,
        'trend_declining_count': 0,
        'trend_stable_count': 0,
        'investment_firm_count': 0,
    }

    for code, data in states.items():
        facs = data.get('facilities', [])
        high_risk = sum(1 for f in facs if is_high_risk(f))
        total_fines = round(sum((f.get('total_fines') or 0) for f in facs))
        composites = [f.get('composite') for f in facs if f.get('composite') is not None]
        stars = [f.get('stars') for f in facs if f.get('stars') is not None]
        state_summary[code] = {
            'count': len(facs),
            'high_risk': high_risk,
            'total_fines': total_fines,
            'avg_composite': avg(composites),
            'avg_stars': avg(stars),
        }
        national['total_facilities'] += len(facs)
        national['high_risk'] += high_risk
        national['total_fines'] += total_fines
        for f in facs:
            if (f.get('zero_rn_pct') or 0) > 0:
                national['zero_rn_facilities'] += 1
            if (f.get('jeopardy_count') or 0) > 0:
                national['serious_danger_facilities'] += 1
            if f.get('pe_owned'):
                national['pe_owned_count'] += 1
            if f.get('reit_owned'):
                national['reit_owned_count'] += 1
            if f.get('ownership_changed_recently'):
                national['recent_chow_count'] += 1
            if f.get('investment_firm_involved'):
                national['investment_firm_count'] += 1
            trend = f.get('trend_direction')
            if trend == 'improving':
                national['trend_improving_count'] += 1
            elif trend == 'declining':
                national['trend_declining_count'] += 1
            elif trend == 'stable':
                national['trend_stable_count'] += 1

    with open(OUT_CCN, 'w') as f:
        json.dump(ccn_index, f, separators=(',', ':'))
    with open(OUT_INDEX, 'w') as f:
        json.dump({'state_summary': state_summary, 'national': national}, f, separators=(',', ':'))
    with open(OUT_MAP, 'w') as f:
        json.dump({'states': states}, f, separators=(',', ':'))

    print(f'ccn-index.json: {len(ccn_index)} CCNs')
    print(f'index.json: {len(state_summary)} states, national facilities={national["total_facilities"]}')
    print(f'facilities_map_data.json: {len(states)} states')
    print(f'  high_risk={national["high_risk"]} total_fines=${national["total_fines"]:,}')


if __name__ == '__main__':
    main()
