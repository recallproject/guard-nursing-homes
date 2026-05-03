#!/usr/bin/env python3
"""
Add data_as_of metadata to state JSON files.

Each state JSON will get a top-level `_metadata` object with:
  - data_as_of: date of the underlying CMS data snapshot
  - last_enriched: date this script was last run
  - facility_count: number of facilities in the file
  - source: description of data sources

This supports the remediation plan requirement for every section to
carry a "data as of" timestamp.

Run: python3 scripts/add_data_metadata.py
"""

import json
import os
from datetime import date

STATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'states')

# The underlying CMS data snapshot date — update this each time you download fresh CMS data
# This should reflect when the CMS data was published, not when we downloaded it
CMS_DATA_DATE = "2026-04-29"  # NH_ProviderInfo_Apr2026.csv — refreshed 2026-05-03


def add_metadata():
    today = date.today().isoformat()
    total_facilities = 0

    for fname in sorted(os.listdir(STATES_DIR)):
        if not fname.endswith('.json'):
            continue

        fpath = os.path.join(STATES_DIR, fname)
        with open(fpath) as f:
            state_data = json.load(f)

        fac_count = len(state_data.get('facilities', []))
        total_facilities += fac_count

        state_data['_metadata'] = {
            'data_as_of': CMS_DATA_DATE,
            'last_enriched': today,
            'facility_count': fac_count,
            'sources': [
                'CMS Provider Info (overall & component star ratings)',
                'CMS PBJ Staffing (HPRD, turnover, contractor %)',
                'CMS Penalties (fines, denials, payment suspensions)',
                'CMS Deficiencies (health & fire safety inspections)',
                'CMS Ownership (chain, operator, individuals)',
            ],
            'note': 'data_as_of reflects the CMS data publication date. Individual data elements may have their own reporting periods.'
        }

        with open(fpath, 'w') as f:
            json.dump(state_data, f, separators=(',', ':'))

    print(f"Added _metadata to all state files")
    print(f"Total facilities across all states: {total_facilities}")
    print(f"data_as_of: {CMS_DATA_DATE}")
    print(f"last_enriched: {today}")


if __name__ == "__main__":
    add_metadata()
