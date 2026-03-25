#!/usr/bin/env python3
"""
Evidence Bundle Builder — The Oversight Report
================================================
Creates one frozen, machine-readable evidence bundle per facility.
This bundle becomes the ONLY source of truth for report generation.

Usage:
    python3 agents/bundle_builder.py <state_code> <ccn>
    Example: python3 agents/bundle_builder.py CA 055559

The bundle includes:
    - facility_identity (CCN, name, address, state)
    - data_as_of timestamp
    - staffing_facts, penalty_facts, inspection_facts
    - ownership_facts, quality_facts, star_ratings
    - confidence_flags, citations, limitations
    - bundle_version and bundle_hash for traceability
"""

import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

# Path to state JSON files (relative to repo root)
STATES_DIR = Path(__file__).resolve().parent.parent / "public" / "data" / "states"
OUTPUT_DIR = Path(__file__).resolve().parent / "bundles"

# CMS dataset citations — always included
CMS_CITATIONS = [
    {"source": "CMS Provider Info", "dataset_id": "4pq5-n9py"},
    {"source": "CMS Penalties", "dataset_id": "g6vv-u9sr"},
    {"source": "CMS Health Citations", "dataset_id": "r5ix-sfxw"},
    {"source": "CMS Fire Safety Citations", "dataset_id": "ifjz-ge4w"},
    {"source": "CMS Ownership", "dataset_id": "y2hd-n93e"},
    {"source": "CMS Quality Measures MDS", "dataset_id": "djen-97ju"},
]

# Standard limitations disclaimer
STANDARD_LIMITATIONS = [
    "Staffing data is self-reported by facilities to CMS",
    "Quality measures may have a reporting lag of 1-2 quarters",
    "Ownership data reflects current filing, not historical changes",
    "Penalty data covers last 3 years of CMS enforcement actions",
    "Star ratings are computed by CMS and may lag behind underlying data",
]


def find_facility(state_code, ccn):
    """Load a facility record from the state JSON file."""
    state_file = STATES_DIR / f"{state_code.upper()}.json"
    if not state_file.exists():
        raise FileNotFoundError(f"State file not found: {state_file}")

    with open(state_file) as f:
        state_data = json.load(f)

    metadata = state_data.get("_metadata", {})

    for fac in state_data.get("facilities", []):
        if fac.get("ccn") == ccn:
            return fac, metadata

    raise ValueError(f"Facility {ccn} not found in {state_code}.json")


def compute_bundle_hash(bundle_data):
    """Create a deterministic hash of the bundle contents for traceability."""
    # Sort keys for deterministic serialization
    raw = json.dumps(bundle_data, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def build_bundle(state_code, ccn):
    """Build a frozen evidence bundle for a single facility.
    
    Returns a dict containing all facts, citations, and metadata
    needed to generate a report without touching any other data source.
    """
    fac, metadata = find_facility(state_code, ccn)
    data_as_of = metadata.get("data_as_of", "unknown")
    now = datetime.now().isoformat()

    # Assemble all fact sections
    bundle = {
        "bundle_version": "1.0",
        "created_at": now,
        "data_as_of": data_as_of,

        "facility_identity": {
            "ccn": ccn,
            "name": fac.get("name", ""),
            "address": fac.get("address", ""),
            "city": fac.get("city", ""),
            "state": state_code.upper(),
            "zip": fac.get("zip", ""),
            "phone": fac.get("phone", ""),
            "beds": fac.get("beds"),
            "residents": fac.get("residents"),
        },

        "star_ratings": {
            "overall": fac.get("stars"),
            "staffing": fac.get("staffing_stars"),
            "quality": fac.get("quality_stars"),
            "inspection": fac.get("inspection_stars"),
        },

        "staffing_facts": {
            "total_hprd": fac.get("total_hprd"),
            "rn_hprd": fac.get("rn_hprd"),
            "lpn_hprd": fac.get("lpn_hprd"),
            "cna_hprd": fac.get("cna_hprd"),
            "adj_total_hprd": fac.get("adj_total_hprd"),
            "adj_rn_hprd": fac.get("adj_rn_hprd"),
            "total_turnover": fac.get("total_turnover"),
            "rn_turnover": fac.get("rn_turnover"),
            "admin_turnover": fac.get("admin_turnover"),
            "weekend_total_hprd": fac.get("weekend_total_hprd"),
            "weekend_rn_hprd": fac.get("weekend_rn_hprd"),
        },

        "penalty_facts": {
            "total_fines": fac.get("total_fines"),
            "fine_count": fac.get("fine_count"),
            "denial_count": fac.get("denial_count"),
            "penalty_timeline": fac.get("penalty_timeline", []),
        },

        "inspection_facts": {
            "total_deficiencies": fac.get("total_deficiencies"),
            "fire_deficiency_count": fac.get("fire_deficiency_count"),
            "complaint_investigations": fac.get("complaint_investigations"),
            "serious_deficiency_count": fac.get("serious_deficiency_count"),
        },

        "ownership_facts": {
            "chain_name": fac.get("chain_name"),
            "ownership_type": fac.get("ownership_type"),
            "owner_count": fac.get("owner_count"),
            "chain_avg_stars": fac.get("chain_avg_stars"),
            "owner_avg_stars": fac.get("owner_avg_stars"),
        },

        "quality_facts": fac.get("quality_measures", {}),

        # Confidence flags — empty for now, populated by Linkage agent later
        "confidence_flags": [],

        # Citations with data date
        "citations": [
            {**c, "date": data_as_of} for c in CMS_CITATIONS
        ],

        "limitations": STANDARD_LIMITATIONS,
    }

    # Compute and attach hash AFTER all content is assembled
    bundle["bundle_hash"] = compute_bundle_hash(bundle)

    return bundle


def save_bundle(bundle, output_dir=None):
    """Write the bundle to disk as JSON."""
    if output_dir is None:
        output_dir = OUTPUT_DIR
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    ccn = bundle["facility_identity"]["ccn"]
    filename = f"evidence_bundle_{ccn}.json"
    output_path = output_dir / filename

    with open(output_path, "w") as f:
        json.dump(bundle, f, indent=2)

    return output_path


# ── CLI Entry Point ─────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 bundle_builder.py <state_code> <ccn>")
        print("       Example: python3 bundle_builder.py CA 055559")
        sys.exit(1)

    state_code = sys.argv[1].upper()
    ccn = sys.argv[2]

    print(f"Building evidence bundle for {ccn} ({state_code})...")
    bundle = build_bundle(state_code, ccn)

    output_path = save_bundle(bundle)
    name = bundle["facility_identity"]["name"]
    print(f"\n✅ Evidence bundle created:")
    print(f"   Facility: {name} ({ccn})")
    print(f"   Data as of: {bundle['data_as_of']}")
    print(f"   Hash: {bundle['bundle_hash']}")
    print(f"   Saved to: {output_path}")


if __name__ == "__main__":
    main()
