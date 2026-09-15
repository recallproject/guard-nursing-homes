#!/usr/bin/env python3
"""
Rebuild public/deficiency_details/{ST}.json from CMS NH_HealthCitations CSV.

Facility pages load per-citation health inspection detail from these files
(survey date, F-tag, scope/severity, complaint flag). Fire citations stay as
counts on the facility record; this file is health citations only, matching
the existing schema.

Run: python3 scripts/rebuild_deficiency_details.py [path_to_health_csv]
"""

import csv
import json
import os
import sys
from collections import defaultdict
from datetime import datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STATES_DIR = os.path.join(ROOT, 'public', 'data', 'states')
OUT_DIR = os.path.join(ROOT, 'public', 'deficiency_details')
DEFAULT_CSV = os.path.join(ROOT, 'data', 'cms_raw', 'NH_HealthCitations_Aug2026.csv')

SEVERITY = {
    'A': ('Potential for Minimal Harm', 'Isolated'),
    'B': ('Potential for Minimal Harm', 'Pattern'),
    'C': ('Potential for Minimal Harm', 'Widespread'),
    'D': ('Potential for More Than Minimal Harm', 'Isolated'),
    'E': ('Potential for More Than Minimal Harm', 'Pattern'),
    'F': ('Potential for More Than Minimal Harm', 'Widespread'),
    'G': ('Actual Harm', 'Isolated'),
    'H': ('Actual Harm', 'Pattern'),
    'I': ('Actual Harm', 'Widespread'),
    'J': ('Immediate Jeopardy', 'Isolated'),
    'K': ('Immediate Jeopardy', 'Pattern'),
    'L': ('Immediate Jeopardy', 'Widespread'),
}


def parse_date(val):
    val = (val or '').strip()
    if not val:
        return None
    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m/%d/%y', '%Y%m%d'):
        try:
            return datetime.strptime(val, fmt).date().isoformat()
        except ValueError:
            continue
    return val


def format_ftag(row):
    prefix_and = (row.get('Deficiency Prefix and Number') or '').strip()
    if prefix_and:
        if '-' in prefix_and:
            return prefix_and.upper()
        digits = ''.join(ch for ch in prefix_and if ch.isdigit())
        letter = ''.join(ch for ch in prefix_and if ch.isalpha()) or 'F'
        if digits:
            return f'{letter.upper()}-{digits.zfill(4)}'
        return prefix_and.upper()
    prefix = (row.get('Deficiency Prefix') or row.get('Citation Prefix') or 'F').strip() or 'F'
    tag = (
        row.get('Citation Code')
        or row.get('Deficiency Tag Number')
        or row.get('Tag Number')
        or ''
    ).strip()
    if not tag:
        return None
    digits = ''.join(ch for ch in tag if ch.isdigit())
    if digits:
        return f'{prefix.upper()}-{digits.zfill(4)}'
    return tag.upper()


def load_citations(csv_path):
    by_ccn = defaultdict(list)
    with open(csv_path, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ccn = (
                row.get('CMS Certification Number (CCN)')
                or row.get('Federal Provider Number')
                or ''
            ).strip()
            if not ccn:
                continue
            scope = (
                row.get('Scope Severity Code')
                or row.get('Scope and Severity Code')
                or ''
            ).strip().upper()
            sev_label, scope_label = SEVERITY.get(scope, (None, None))
            corrected_raw = (row.get('Deficiency Corrected') or '').strip()
            still_open = corrected_raw in (
                'Deficient, Provider has plan of correction',
                'Deficient, Provider has no plan of correction',
            )
            corrected = bool(corrected_raw) and not still_open
            complaint = (row.get('Complaint Deficiency') or '').strip().upper() == 'Y'
            entry = {
                'survey_date': parse_date(row.get('Survey Date')),
                'ftag': format_ftag(row),
                'category': (row.get('Deficiency Category') or '').strip(),
                'description': (row.get('Deficiency Description') or '').strip(),
                'scope_severity': scope or None,
                'severity_label': sev_label,
                'scope_label': scope_label,
                'corrected': corrected,
                'correction_date': parse_date(row.get('Correction Date')),
                'survey_type': 'Health',
                'is_complaint': complaint,
            }
            by_ccn[ccn].append(entry)
    for ccn, items in by_ccn.items():
        items.sort(key=lambda x: x.get('survey_date') or '', reverse=True)
    print(f'Loaded health citation details for {len(by_ccn)} facilities')
    print(f'Total citation rows: {sum(len(v) for v in by_ccn.values())}')
    return by_ccn


def write_state_files(by_ccn):
    os.makedirs(OUT_DIR, exist_ok=True)
    written = 0
    for fname in sorted(os.listdir(STATES_DIR)):
        if not fname.endswith('.json'):
            continue
        state = fname.replace('.json', '')
        with open(os.path.join(STATES_DIR, fname)) as f:
            state_data = json.load(f)
        out = {}
        for fac in state_data.get('facilities', []):
            ccn = fac.get('ccn')
            if not ccn:
                continue
            out[ccn] = {'deficiency_details': by_ccn.get(ccn, [])}
        dest = os.path.join(OUT_DIR, fname)
        with open(dest, 'w') as f:
            json.dump(out, f, separators=(',', ':'))
        written += 1
        print(f'  {state}: {len(out)} facilities -> {dest}')
    print(f'Wrote {written} state deficiency_details files')


def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV
    if not os.path.exists(csv_path):
        print(f'ERROR: CSV not found at {csv_path}')
        sys.exit(1)
    print(f'Reading: {csv_path}')
    by_ccn = load_citations(csv_path)
    avir = by_ccn.get('675408', [])
    print(f'\nAvir 675408 health citation details: {len(avir)}')
    write_state_files(by_ccn)


if __name__ == '__main__':
    main()
