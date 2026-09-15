#!/usr/bin/env python3
"""
Download the current CMS Provider Data Catalog nursing-home CSVs into data/cms_raw/.

Resolves official HTTPS download URLs from the data.cms.gov metastore (not Care Compare HTML).
Writes data/cms_snf_sources.json with dataset IDs, released dates, and URLs for the PR.

Run: python3 scripts/download_cms_snf.py
"""

import json
import os
import urllib.request
from datetime import date

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT_DIR = os.path.join(ROOT, 'data', 'cms_raw')
SOURCES_PATH = os.path.join(ROOT, 'data', 'cms_snf_sources.json')

DATASETS = [
    ('4pq5-n9py', 'Provider Information', 'NH_ProviderInfo'),
    ('g6vv-u9sr', 'Penalties', 'NH_Penalties'),
    ('r5ix-sfxw', 'Health Deficiencies', 'NH_HealthCitations'),
    ('ifjz-ge4w', 'Fire Safety Deficiencies', 'NH_FireSafetyCitations'),
    ('y2hd-n93e', 'Ownership', 'NH_Ownership'),
    ('djen-97ju', 'MDS Quality Measures', 'NH_QualityMsr_MDS'),
    ('ijh5-nb2v', 'Medicare Claims Quality Measures', 'NH_QualityMsr_Claims'),
]

UA = 'OversightReports SNF refresh (https://oversightreports.com)'


def get_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.load(resp)


def download_file(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    print(f'  GET {url}')
    with urllib.request.urlopen(req, timeout=600) as resp, open(dest, 'wb') as out:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    size = os.path.getsize(dest)
    print(f'  saved {dest} ({size / 1_000_000:.1f} MB)')
    return size


def filename_from_url(url, prefix):
    base = url.rstrip('/').split('/')[-1]
    if base.startswith(prefix) and base.lower().endswith('.csv'):
        return base
    return f'{prefix}.csv'


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    records = []
    for ident, title, prefix in DATASETS:
        meta = get_json(
            f'https://data.cms.gov/provider-data/api/1/metastore/schemas/dataset/items/{ident}'
        )
        dist = (meta.get('distribution') or [{}])[0]
        url = dist.get('downloadURL')
        if not url:
            raise SystemExit(f'No downloadURL for {ident} ({title})')
        fname = filename_from_url(url, prefix)
        dest = os.path.join(OUT_DIR, fname)
        size = download_file(url, dest)
        rec = {
            'dataset_id': ident,
            'title': title,
            'modified': meta.get('modified'),
            'issued': meta.get('issued'),
            'released': meta.get('released'),
            'next_update': meta.get('nextUpdateDate'),
            'download_url': url,
            'filename': fname,
            'bytes': size,
        }
        records.append(rec)
        print(f'{ident} {title}: released={rec["released"]} modified={rec["modified"]} -> {fname}')

    payload = {
        'downloaded_on': date.today().isoformat(),
        'catalog': 'https://data.cms.gov/provider-data/topics/nursing-homes',
        'archive': 'https://data.cms.gov/provider-data/archived-data/nursing-homes',
        'note': (
            'Official CMS Provider Data Catalog CSVs. Theme zip was not used; '
            'individual dataset files match the August 26, 2026 nursing-homes release.'
        ),
        'datasets': records,
    }
    with open(SOURCES_PATH, 'w') as f:
        json.dump(payload, f, indent=2)
        f.write('\n')
    print(f'\nWrote {SOURCES_PATH}')


if __name__ == '__main__':
    main()
