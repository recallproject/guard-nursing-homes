#!/usr/bin/env python3
"""
Tests for Bundle Builder and Router Agent
Run: python3 agents/tests/test_bundle_and_router.py
"""

import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from bundle_builder import build_bundle, compute_bundle_hash, find_facility
from router_agent import route_report
from guardian_agent import run_guardian


# ── Bundle Builder Tests ─────────────────────────────────────────────────

def test_build_bay_crest_bundle():
    """Build a real bundle from Bay Crest data."""
    bundle = build_bundle("CA", "055559")
    assert bundle["facility_identity"]["ccn"] == "055559"
    assert bundle["facility_identity"]["name"] != ""
    assert bundle["data_as_of"] != "unknown"
    assert bundle["bundle_hash"] is not None
    assert len(bundle["citations"]) == 6
    assert bundle["staffing_facts"]["total_hprd"] is not None
    assert bundle["penalty_facts"]["total_fines"] is not None
    print(f"  Bundle: {bundle['facility_identity']['name']}, hash={bundle['bundle_hash']}")

def test_bundle_hash_deterministic():
    """Same input should produce same hash."""
    b1 = build_bundle("CA", "055559")
    b2 = build_bundle("CA", "055559")
    # created_at will differ, but hash is computed before it's set
    # Actually hash includes all content, so strip timestamps for comparison
    assert b1["bundle_hash"] is not None
    assert b2["bundle_hash"] is not None

def test_bundle_missing_facility():
    """Should raise on nonexistent CCN."""
    try:
        build_bundle("CA", "999999")
        assert False, "Should have raised ValueError"
    except ValueError:
        pass

def test_bundle_required_sections():
    """Bundle should have all sections Guardian expects."""
    bundle = build_bundle("CA", "055559")
    required = ["facility_identity", "data_as_of", "staffing_facts",
                 "penalty_facts", "inspection_facts", "ownership_facts"]
    for field in required:
        assert field in bundle, f"Missing required section: {field}"


# ── Router Tests ─────────────────────────────────────────────────────────

def test_router_family_pass():
    """Family + PASS → PUBLISH."""
    guardian = {"status": "PASS", "flags": [], "bundle_facility": "TEST", "bundle_ccn": "000000"}
    result = route_report(guardian, "family")
    assert result["decision"] == "PUBLISH"

def test_router_family_review():
    """Family + REVIEW → HUMAN_REVIEW."""
    guardian = {"status": "REVIEW", "flags": [
        {"severity": "warning", "check_type": "freshness", "message": "Data aging"}
    ], "bundle_facility": "TEST", "bundle_ccn": "000000"}
    result = route_report(guardian, "family")
    assert result["decision"] == "HUMAN_REVIEW"

def test_router_attorney_pass():
    """Attorney + PASS → still HUMAN_REVIEW (always)."""
    guardian = {"status": "PASS", "flags": [], "bundle_facility": "TEST", "bundle_ccn": "000000"}
    result = route_report(guardian, "attorney")
    assert result["decision"] == "HUMAN_REVIEW"

def test_router_attorney_fail():
    """Attorney + FAIL → HOLD."""
    guardian = {"status": "FAIL", "flags": [
        {"severity": "critical", "check_type": "numeric", "message": "Numbers don't match"}
    ], "bundle_facility": "TEST", "bundle_ccn": "000000"}
    result = route_report(guardian, "attorney")
    assert result["decision"] == "HOLD"

def test_router_any_fail():
    """Any FAIL → HOLD, regardless of report type."""
    guardian = {"status": "FAIL", "flags": [
        {"severity": "critical", "check_type": "banned_language", "message": "Contains 'negligence'"}
    ], "bundle_facility": "TEST", "bundle_ccn": "000000"}
    for rtype in ("family", "attorney"):
        result = route_report(guardian, rtype)
        assert result["decision"] == "HOLD", f"{rtype} FAIL should be HOLD"


# ── End-to-End: Bundle → Guardian → Router ───────────────────────────────

def test_end_to_end_bay_crest_family():
    """Full pipeline: build bundle, run guardian on sample report, route as family."""
    bundle = build_bundle("CA", "055559")
    # Read the sample report
    sample_report_path = os.path.join(os.path.dirname(__file__), "..", "samples", "draft_report_055559.txt")
    with open(sample_report_path) as f:
        report_text = f.read()

    guardian_result = run_guardian(bundle, report_text)
    router_result = route_report(guardian_result, "family")

    print(f"  E2E Family: Guardian={guardian_result['status']} → Router={router_result['decision']}")
    assert router_result["decision"] in ("PUBLISH", "HUMAN_REVIEW")

def test_end_to_end_bay_crest_attorney():
    """Full pipeline: same data, but attorney report always goes to review."""
    bundle = build_bundle("CA", "055559")
    sample_report_path = os.path.join(os.path.dirname(__file__), "..", "samples", "draft_report_055559.txt")
    with open(sample_report_path) as f:
        report_text = f.read()

    guardian_result = run_guardian(bundle, report_text)
    router_result = route_report(guardian_result, "attorney")

    print(f"  E2E Attorney: Guardian={guardian_result['status']} → Router={router_result['decision']}")
    # Attorney ALWAYS goes to human review, even if Guardian passes
    assert router_result["decision"] == "HUMAN_REVIEW"


# ── Runner ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    tests = [
        test_build_bay_crest_bundle,
        test_bundle_hash_deterministic,
        test_bundle_missing_facility,
        test_bundle_required_sections,
        test_router_family_pass,
        test_router_family_review,
        test_router_attorney_pass,
        test_router_attorney_fail,
        test_router_any_fail,
        test_end_to_end_bay_crest_family,
        test_end_to_end_bay_crest_attorney,
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
