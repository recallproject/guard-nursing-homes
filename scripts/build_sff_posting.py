#!/usr/bin/env python3
"""
Build public/data/sff_posting.json from the monthly CMS Special Focus Facility PDF.

CMS Provider Information only has Special Focus Status = "SFF" | "SFF Candidate" | blank.
Graduated homes (Table B) and homes that left Medicare/Medicaid (Table C) are blank in
that column, which is why a boolean "SFF: Yes" mislabels graduates such as CCN 345529.

Tables in the monthly posting (https://www.cms.gov/medicare/health-safety-standards/quality-safety-oversight-general-information/special-focus-facility-sff-program):
  A  current SFF
  B  graduated (listed for about three years)
  C  no longer participating in Medicare/Medicaid
  D  SFF candidates (not current SFF)

Refresh next month
------------------
1. Download the new posting PDF from the CMS SFF program page (URL changes each month).
2. Optionally download NH_ProviderInfo for that release (dataset 4pq5-n9py) so Care
   Compare names override the PDF name when they differ from our stored display name.
3. Run:

     pip install pymupdf
     python3 scripts/build_sff_posting.py \\
       --pdf /path/to/sff-posting.pdf \\
       --provider-csv /path/to/NH_ProviderInfo_MonYYYY.csv

   Or let the script download the PDF:

     python3 scripts/build_sff_posting.py \\
       --pdf-url https://www.cms.gov/files/document/sff-posting-candidate-list-MONTH-YEAR.pdf \\
       --provider-csv /path/to/NH_ProviderInfo_MonYYYY.csv

4. Commit public/data/sff_posting.json. The Vite app and prerender read that file;
   they do not parse the PDF at request time.
5. npm test — graduated vs active vs candidate is covered in src/utils/sffStatus.test.js.

Requires: Python 3 and pymupdf (import pymupdf). Not a site runtime dependency.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import urllib.request
from collections import defaultdict
from datetime import date

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DEFAULT_OUT = os.path.join(ROOT, 'public', 'data', 'sff_posting.json')
DEFAULT_PDF_URL = 'https://www.cms.gov/files/document/sff-posting-candidate-list-august-2026.pdf'
UA = 'OversightReports SFF refresh (https://oversightreports.com)'

CCN_RE = re.compile(r'^[0-9]{2}[0-9A-Z][0-9]{3}$')
DATE_RE = re.compile(r'^(\d{2})/(\d{2})/(\d{4})$')

# Later tables win only if we explicitly rank them. A facility should be on one table.
STATUS_RANK = {'active': 4, 'candidate': 3, 'graduated': 2, 'terminated': 1}

HEADER_WORDS = {
    'Facility', 'Address', 'City', 'State', 'Zip', 'Phone', 'Months',
    'Graduation', 'Termination', 'Inspection', 'Candidate', 'Met',
    'Survey', 'Criteria', 'Provider', 'Number', 'SFF', 'Date', 'of',
    'as', 'an', 'Most', 'Recent',
}


def download(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    print(f'GET {url}')
    with urllib.request.urlopen(req, timeout=180) as resp, open(dest, 'wb') as out:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    print(f'  saved {dest} ({os.path.getsize(dest)} bytes)')


def iso_date(token):
    match = DATE_RE.match(token or '')
    if not match:
        return None
    month, day, year = match.groups()
    return f'{year}-{month}-{day}'


def parse_months(tokens):
    for token in reversed(tokens):
        if re.fullmatch(r'\d{1,3}', token):
            return int(token)
    return None


def table_kind(header_words):
    texts = {w[4] for w in header_words}
    if 'Graduation' in texts:
        return 'graduated'
    if 'Termination' in texts:
        return 'terminated'
    if 'Candidate' in texts and 'Inspection' not in texts and 'Graduation' not in texts:
        return 'candidate'
    if 'Inspection' in texts or 'Met' in texts:
        return 'active'
    return None


def column_anchors(header_words, kind):
    def first_x(label):
        hits = [w[0] for w in header_words if w[4] == label]
        return min(hits) if hits else None

    anchors = [
        ('ccn', 0.0),
        ('name', first_x('Facility')),
        ('address', first_x('Address')),
        ('city', first_x('City')),
        ('state', first_x('State')),
        ('zip', first_x('Zip')),
        ('phone', first_x('Phone')),
    ]
    if kind == 'active':
        anchors.append(('inspection_date', first_x('Inspection')))
        anchors.append(('met', first_x('Met')))
        anchors.append(('months', first_x('Months')))
    elif kind == 'graduated':
        anchors.append(('graduation_date', first_x('Graduation')))
        anchors.append(('months', first_x('Months')))
    elif kind == 'terminated':
        anchors.append(('termination_date', first_x('Termination')))
        anchors.append(('months', first_x('Months')))
    elif kind == 'candidate':
        anchors.append(('months', first_x('Months')))

    anchors = [(name, x) for name, x in anchors if x is not None]
    anchors.sort(key=lambda item: item[1])
    return anchors


def assign_columns(words, anchors):
    buckets = {name: [] for name, _x in anchors}
    starts = anchors
    for word in sorted(words, key=lambda w: w[0]):
        x = word[0]
        chosen = starts[0][0]
        for i, (name, start) in enumerate(starts):
            next_start = starts[i + 1][1] if i + 1 < len(starts) else 10_000
            if start - 2 <= x < next_start - 2:
                chosen = name
                break
            if x >= start:
                chosen = name
        buckets[chosen].append(word[4])
    return {name: ' '.join(tokens).strip() for name, tokens in buckets.items()}


def met_value(text):
    cleaned = re.sub(r'\s+', ' ', text or '').strip().lower()
    if cleaned == 'met':
        return True
    if cleaned == 'not met':
        return False
    return None


def record_from_row(columns, kind):
    ccn = columns.get('ccn', '')
    if not CCN_RE.match(ccn):
        return None
    months = parse_months([columns.get('months', '')])
    rec = {
        'ccn': ccn,
        'status': kind,
        'table': {'active': 'A', 'graduated': 'B', 'terminated': 'C', 'candidate': 'D'}[kind],
        'name': columns.get('name') or '',
        'address': columns.get('address') or '',
        'city': columns.get('city') or '',
        'state': columns.get('state') or '',
        'zip': columns.get('zip') or '',
        'phone': columns.get('phone') or '',
    }
    if kind == 'active':
        rec['most_recent_inspection'] = iso_date(columns.get('inspection_date', '').split()[0] if columns.get('inspection_date') else '')
        # inspection column may contain only the date; met is separate
        if rec['most_recent_inspection'] is None:
            rec['most_recent_inspection'] = iso_date(columns.get('inspection_date', ''))
        rec['met_survey_criteria'] = met_value(columns.get('met', ''))
        rec['months_in_program'] = months
    elif kind == 'graduated':
        raw = columns.get('graduation_date', '')
        rec['graduation_date'] = iso_date(raw.split()[0] if raw else '')
        rec['months_in_program'] = months
    elif kind == 'terminated':
        raw = columns.get('termination_date', '')
        rec['termination_date'] = iso_date(raw.split()[0] if raw else '')
        rec['months_in_program'] = months
    elif kind == 'candidate':
        rec['months_as_candidate'] = months
    return rec


def cluster_rows(words, y_tolerance=2.0):
    rows = []
    for word in sorted(words, key=lambda w: (w[1], w[0])):
        if not rows or abs(word[1] - rows[-1][0]) > y_tolerance:
            rows.append((word[1], [word]))
        else:
            rows[-1][1].append(word)
    return [words for _y, words in rows]


def parse_pdf(path):
    import pymupdf

    doc = pymupdf.open(path)
    by_ccn = {}
    conflicts = []
    page_counts = defaultdict(int)
    current_kind = None

    for page_index, page in enumerate(doc):
        words = page.get_text('words')
        # "Address" is a column title. Data rows contain street words, not the token Address.
        # Do not use every HEADER_WORDS hit: body cells say "Met" and would swallow the first rows.
        address_headers = [w for w in words if w[4] == 'Address' and w[1] < 140]
        if not address_headers:
            continue
        address_y = min(w[1] for w in address_headers)
        # Column titles sit on the Address baseline. The next baseline is data.
        header_words = [w for w in words if address_y - 28 <= w[1] <= address_y + 2]
        header_bottom = max(w[1] for w in header_words)
        kind = table_kind(header_words) or current_kind
        if kind is None:
            continue
        current_kind = kind
        anchors = column_anchors(header_words, kind)
        if not any(name == 'name' for name, _x in anchors):
            continue
        data_words = [w for w in words if w[1] > header_bottom + 2]
        for row_words in cluster_rows(data_words):
            columns = assign_columns(row_words, anchors)
            rec = record_from_row(columns, kind)
            if not rec:
                continue
            page_counts[kind] += 1
            prev = by_ccn.get(rec['ccn'])
            if prev and prev['status'] != rec['status']:
                winner = rec if STATUS_RANK[rec['status']] >= STATUS_RANK[prev['status']] else prev
                loser = prev if winner is rec else rec
                conflicts.append({
                    'ccn': rec['ccn'],
                    'kept': winner['status'],
                    'dropped': loser['status'],
                })
                by_ccn[rec['ccn']] = winner
            elif prev and prev['status'] == rec['status']:
                # Continuation duplicate — keep the row with more date fields.
                if _richness(rec) >= _richness(prev):
                    by_ccn[rec['ccn']] = rec
            else:
                by_ccn[rec['ccn']] = rec

    return by_ccn, conflicts, dict(page_counts)


def _richness(rec):
    score = 0
    for key in ('most_recent_inspection', 'graduation_date', 'termination_date', 'met_survey_criteria', 'months_in_program', 'months_as_candidate', 'name'):
        if rec.get(key) not in (None, '', False):
            score += 1
    return score


def load_provider_info(csv_path):
    """Return ccn -> {name, special_focus_status}."""
    out = {}
    with open(csv_path, newline='', encoding='utf-8-sig') as handle:
        for row in csv.DictReader(handle):
            ccn = (row.get('CMS Certification Number (CCN)') or '').strip()
            if not ccn:
                continue
            out[ccn] = {
                'name': (row.get('Provider Name') or '').strip(),
                'special_focus_status': (row.get('Special Focus Status') or '').strip(),
            }
    return out


def provider_status_to_enum(value):
    if value == 'SFF':
        return 'active'
    if value == 'SFF Candidate':
        return 'candidate'
    return None


def strip_empty(rec):
    cleaned = {}
    for key, value in rec.items():
        if value is None or value == '':
            continue
        cleaned[key] = value
    return cleaned


def sniff_posting_label(pdf_path):
    import pymupdf
    doc = pymupdf.open(pdf_path)
    text = []
    for index in range(min(doc.page_count, 6)):
        text.append(doc[index].get_text('text'))
    blob = '\n'.join(text)
    match = re.search(r'Updated\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})', blob)
    if not match:
        return 'CMS SFF posting', None
    month, day, year = match.groups()
    months = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12',
    }
    iso_month = months.get(month.lower())
    updated = f'{year}-{iso_month}-{int(day):02d}' if iso_month else None
    return f'{month} {year}', updated


def build_payload(by_ccn, provider, pdf_url, conflicts, posting_label, updated):
    provider_status = {}
    for ccn, info in provider.items():
        if info['special_focus_status']:
            provider_status[ccn] = info['special_focus_status']
        rec = by_ccn.get(ccn)
        if rec and info['name']:
            rec['provider_name'] = info['name']
            if info['special_focus_status']:
                rec['provider_special_focus_status'] = info['special_focus_status']

    # Provider Info is a backstop when the PDF row was missed. Never let a blank
    # provider status erase a graduated or terminated PDF row.
    added_from_provider = 0
    for ccn, info in provider.items():
        status = provider_status_to_enum(info['special_focus_status'])
        if not status or ccn in by_ccn:
            continue
        by_ccn[ccn] = {
            'ccn': ccn,
            'status': status,
            'table': 'A' if status == 'active' else 'D',
            'name': info['name'],
            'provider_name': info['name'],
            'provider_special_focus_status': info['special_focus_status'],
            'source': 'provider_info_backstop',
        }
        added_from_provider += 1

    counts = defaultdict(int)
    for rec in by_ccn.values():
        counts[rec['status']] += 1

    facilities = {ccn: strip_empty(rec) for ccn, rec in sorted(by_ccn.items())}
    return {
        'source': 'CMS Special Focus Facility monthly posting, tables A–D',
        'source_url': pdf_url,
        'provider_info': 'CMS NH_ProviderInfo Special Focus Status + Provider Name (dataset 4pq5-n9py)' if provider else None,
        'posting_label': posting_label,
        'updated': updated,
        'parsed_on': date.today().isoformat(),
        'refresh': 'python3 scripts/build_sff_posting.py --pdf-url <new pdf> --provider-csv <NH_ProviderInfo csv>',
        'notes': (
            'status is one of active (Table A), graduated (Table B), terminated (Table C), '
            'candidate (Table D). Provider Info alone cannot represent graduated or terminated. '
            'provider_name is the Care Compare name when the provider-info CSV was supplied.'
        ),
        'counts': {
            'active': counts['active'],
            'candidate': counts['candidate'],
            'graduated': counts['graduated'],
            'terminated': counts['terminated'],
        },
        'provider_backstop_added': added_from_provider,
        'table_conflicts': conflicts,
        'by_ccn': facilities,
        'provider_status': provider_status,
    }


def assert_ground_truth(payload):
    rec = payload['by_ccn'].get('345529')
    if not rec:
        raise SystemExit('CCN 345529 missing from parsed posting')
    problems = []
    if rec.get('status') != 'graduated':
        problems.append(f"345529 status={rec.get('status')}")
    if rec.get('graduation_date') != '2026-06-08':
        problems.append(f"345529 graduation_date={rec.get('graduation_date')}")
    if rec.get('months_in_program') != 15:
        problems.append(f"345529 months={rec.get('months_in_program')}")
    name = (rec.get('provider_name') or rec.get('name') or '').lower()
    if 'perry creek' not in name:
        problems.append(f'345529 name={rec.get("name")!r} provider={rec.get("provider_name")!r}')
    if rec.get('state') and rec.get('state') != 'NC':
        problems.append(f"345529 state={rec.get('state')}")
    active = payload['by_ccn'].get('015463')
    if not active or active.get('status') != 'active':
        problems.append(f"015463 expected active, got {active}")
    candidate = payload['by_ccn'].get('015019')
    if candidate and candidate.get('status') not in ('candidate', 'active'):
        problems.append(f"015019 unexpected status {candidate.get('status')}")
    terminated = payload['by_ccn'].get('295029')
    if not terminated or terminated.get('status') != 'terminated':
        problems.append(f"295029 expected terminated, got {terminated}")
    if problems:
        raise SystemExit('Ground truth check failed:\n  ' + '\n  '.join(problems))


def main():
    parser = argparse.ArgumentParser(description='Build the SFF posting JSON used by OversightReports.')
    parser.add_argument('--pdf', help='Local path to the CMS SFF posting PDF')
    parser.add_argument('--pdf-url', default=DEFAULT_PDF_URL, help='PDF URL to download when --pdf is omitted')
    parser.add_argument('--provider-csv', help='NH_ProviderInfo CSV (optional, for Care Compare names and status backstop)')
    parser.add_argument('--out', default=DEFAULT_OUT)
    args = parser.parse_args()

    pdf_path = args.pdf
    pdf_url = args.pdf_url
    if not pdf_path:
        pdf_path = os.path.join('/tmp', 'sff-posting.pdf')
        download(pdf_url, pdf_path)
    elif args.pdf_url and args.pdf:
        pdf_url = args.pdf_url

    by_ccn, conflicts, page_counts = parse_pdf(pdf_path)
    posting_label, updated = sniff_posting_label(pdf_path)
    print('Posting:', posting_label, updated)
    print('Parsed row counts by table:', dict(page_counts))
    print('Unique CCNs:', len(by_ccn))
    if conflicts:
        print(f'Table conflicts kept by rank ({len(conflicts)}):')
        for row in conflicts[:20]:
            print(' ', row)

    provider = load_provider_info(args.provider_csv) if args.provider_csv else {}
    if provider:
        print(f'Provider info rows: {len(provider)}')
    payload = build_payload(by_ccn, provider, pdf_url, conflicts, posting_label, updated)
    assert_ground_truth(payload)
    print('Counts:', payload['counts'], 'provider backstop added:', payload['provider_backstop_added'])

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, indent=2)
        handle.write('\n')
    print(f'Wrote {args.out}')


if __name__ == '__main__':
    try:
        main()
    except ModuleNotFoundError as exc:
        if exc.name == 'pymupdf':
            sys.exit('pymupdf is required for this refresh script. Install with: pip install pymupdf')
        raise
