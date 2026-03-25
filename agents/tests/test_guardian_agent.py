#!/usr/bin/env python3
"""
Tests for Guardian Agent v1
Run: python3 -m pytest agents/tests/test_guardian_agent.py -v
  or: python3 agents/tests/test_guardian_agent.py
"""

import sys
import os
import json
from datetime import datetime, timedelta

# Add parent dir so we can import the agent
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from guardian_agent import (
    run_guardian, check_freshness, check_required_fields,
    check_numeric_accuracy, check_citations, check_banned_language,
    check_confidence, make_flag, get_nested,
)

# ── Helpers ──────────────────────────────────────────────────────────────

def load_sample_bundle():
    sample_path = os.path.join(os.path.dirname(__file__), "..", "samples", "evidence_bundle_055559.json")
    with open(sample_path) as f:
        return json.load(f)

def load_sample_report():
    sample_path = os.path.join(os.path.dirname(__file__), "..", "samples", "draft_report_055559.txt")
    with open(sample_path) as f:
        return f.read()


# ── Test: Freshness ──────────────────────────────────────────────────────

def test_freshness_pass():
    """Recent data should pass."""
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    bundle = {"data_as_of": yesterday}
    flags = check_freshness(bundle)
    assert len(flags) == 0, f"Expected no flags, got: {flags}"

def test_freshness_warning():
    """Data near threshold should warn."""
    old_date = (datetime.now() - timedelta(days=35)).strftime("%Y-%m-%d")
    bundle = {"data_as_of": old_date}
    flags = check_freshness(bundle, threshold_days=60)
    assert any(f["severity"] == "warning" for f in flags)

def test_freshness_fail():
    """Old data should be critical."""
    old_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    bundle = {"data_as_of": old_date}
    flags = check_freshness(bundle, threshold_days=60)
    assert any(f["severity"] == "critical" for f in flags)

def test_freshness_missing():
    """No date should be critical."""
    flags = check_freshness({})
    assert any(f["severity"] == "critical" for f in flags)


# ── Test: Required Fields ────────────────────────────────────────────────

def test_required_fields_pass():
    bundle = {
        "facility_identity": {"ccn": "055559"},
        "data_as_of": "2026-03-01",
        "staffing_facts": {"total_hprd": 3.764},
        "penalty_facts": {"total_fines": 156358},
        "inspection_facts": {"total_deficiencies": 132},
        "ownership_facts": {"chain_name": "GENESIS"},
    }
    flags = check_required_fields(bundle)
    assert len(flags) == 0

def test_required_fields_missing():
    bundle = {"facility_identity": {"ccn": "055559"}}
    flags = check_required_fields(bundle)
    assert len(flags) >= 4  # missing data_as_of, staffing, penalty, inspection, ownership


# ── Test: Numeric Accuracy ───────────────────────────────────────────────

def test_numeric_match():
    bundle = {
        "penalty_facts": {"total_fines": 156358.0, "fine_count": 5, "denial_count": 3},
        "staffing_facts": {"total_hprd": 3.764, "rn_hprd": 0.326},
        "inspection_facts": {"total_deficiencies": 132},
    }
    report = "Total fines: $156,358. Fine count: 5. Denials: 3. HPRD: 3.764. RN: 0.326. Deficiencies: 132."
    flags = check_numeric_accuracy(bundle, report)
    critical = [f for f in flags if f["severity"] == "critical"]
    assert len(critical) == 0, f"Unexpected critical flags: {critical}"

def test_numeric_mismatch():
    bundle = {
        "penalty_facts": {"total_fines": 156358.0, "fine_count": 5, "denial_count": 3},
        "staffing_facts": {"total_hprd": 3.764, "rn_hprd": 0.326},
        "inspection_facts": {"total_deficiencies": 132},
    }
    report = "Total fines: $100,000. Fine count: 3."  # Wrong numbers!
    flags = check_numeric_accuracy(bundle, report)
    critical = [f for f in flags if f["severity"] == "critical"]
    assert len(critical) >= 2  # fines and fine_count should mismatch


# ── Test: Banned Language ────────────────────────────────────────────────

def test_banned_language_clean():
    report = "This facility has 132 deficiencies and $156,358 in fines."
    flags = check_banned_language(report)
    assert len(flags) == 0

def test_banned_language_flagged():
    report = "This facility is clearly negligent and liable for malpractice."
    flags = check_banned_language(report)
    assert len(flags) >= 2  # negligence, liable, malpractice


# ── Test: Citations ──────────────────────────────────────────────────────

def test_citations_present():
    bundle = {"facility_identity": {"name": "BAY CREST", "ccn": "055559"}}
    report = "BAY CREST (CCN: 055559) — Source: CMS Provider Info data."
    flags = check_citations(bundle, report)
    critical = [f for f in flags if f["severity"] == "critical"]
    assert len(critical) == 0

def test_citations_missing():
    bundle = {"facility_identity": {"name": "BAY CREST", "ccn": "055559"}}
    report = "This facility has issues."  # No sources at all
    flags = check_citations(bundle, report)
    critical = [f for f in flags if f["severity"] == "critical"]
    assert len(critical) >= 1


# ── Test: Confidence ─────────────────────────────────────────────────────

def test_confidence_pass():
    bundle = {"confidence_flags": [{"field": "ownership", "score": 0.95}]}
    flags = check_confidence(bundle)
    assert len(flags) == 0

def test_confidence_low():
    bundle = {"confidence_flags": [{"field": "ownership", "score": 0.4}]}
    flags = check_confidence(bundle)
    assert len(flags) == 1
    assert flags[0]["severity"] == "warning"


# ── Test: Full Run with Real Samples ─────────────────────────────────────

def test_full_run_bay_crest():
    """Run Guardian on actual Bay Crest sample files."""
    bundle = load_sample_bundle()
    report = load_sample_report()
    result = run_guardian(bundle, report)
    
    # Should not FAIL on clean sample data
    assert result["status"] in ("PASS", "REVIEW"), f"Unexpected FAIL: {result['flags']}"
    assert result["bundle_ccn"] == "055559"
    print(f"\n  Full run result: {result['status']} — {result['summary']}")


# ── Runner ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    tests = [
        test_freshness_pass, test_freshness_warning, test_freshness_fail, test_freshness_missing,
        test_required_fields_pass, test_required_fields_missing,
        test_numeric_match, test_numeric_mismatch,
        test_banned_language_clean, test_banned_language_flagged,
        test_citations_present, test_citations_missing,
        test_confidence_pass, test_confidence_low,
        test_full_run_bay_crest,
    ]
    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            print(f"  ✅ {test.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"  ❌ {test.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"  ❌ {test.__name__}: {type(e).__name__}: {e}")
            failed += 1

    print(f"\n{'='*40}")
    print(f"  {passed} passed, {failed} failed out of {len(tests)}")
    print(f"{'='*40}")
    sys.exit(0 if failed == 0 else 1)
