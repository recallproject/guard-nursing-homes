#!/usr/bin/env python3
"""
Router Agent — The Oversight Report
=====================================
Decides what happens to a report after the Guardian checks it.

Three possible outcomes:
    PUBLISH      — Auto-deliver (family reports that pass Guardian)
    HUMAN_REVIEW — Route to Rob for manual review before delivery
    HOLD         — Do NOT deliver. Fix issues first.

Rules:
    - Family reports + Guardian PASS → PUBLISH
    - Family reports + Guardian REVIEW → HUMAN_REVIEW
    - Attorney reports → ALWAYS HUMAN_REVIEW (even if PASS)
    - Any Guardian FAIL → HOLD

Usage:
    python3 agents/router_agent.py <guardian_result.json> <report_type>
    report_type: "family" or "attorney"
"""

import json
import sys
from datetime import datetime
from pathlib import Path


# ── Routing Logic ────────────────────────────────────────────────────────

def route_report(guardian_result, report_type):
    """Decide what to do with a report based on Guardian output and report type.

    Args:
        guardian_result: dict with "status" (PASS/REVIEW/FAIL) and "flags"
        report_type: "family" or "attorney"

    Returns:
        dict with:
            decision: "PUBLISH" | "HUMAN_REVIEW" | "HOLD"
            reason: why this decision was made
            guardian_status: what the Guardian said
            report_type: family or attorney
            action_items: list of things to do next
            decided_at: timestamp
    """
    guardian_status = guardian_result.get("status", "UNKNOWN")
    flags = guardian_result.get("flags", [])
    facility = guardian_result.get("bundle_facility", "unknown")
    ccn = guardian_result.get("bundle_ccn", "unknown")

    critical_flags = [f for f in flags if f["severity"] == "critical"]
    warning_flags = [f for f in flags if f["severity"] == "warning"]

    # ── Decision Tree ────────────────────────────────────────────────

    # Rule 1: Any FAIL → HOLD, regardless of report type
    if guardian_status == "FAIL":
        return {
            "decision": "HOLD",
            "reason": f"Guardian FAIL — {len(critical_flags)} critical issue(s) must be resolved before delivery",
            "guardian_status": guardian_status,
            "report_type": report_type,
            "facility": facility,
            "ccn": ccn,
            "action_items": [f["message"] for f in critical_flags],
            "decided_at": datetime.now().isoformat(),
        }

    # Rule 2: Attorney reports → ALWAYS HUMAN_REVIEW (even if PASS)
    if report_type == "attorney":
        reason = "Attorney report — requires clinician review before delivery"
        if guardian_status == "REVIEW":
            reason += f" (plus {len(warning_flags)} warning(s) to check)"
        return {
            "decision": "HUMAN_REVIEW",
            "reason": reason,
            "guardian_status": guardian_status,
            "report_type": report_type,
            "facility": facility,
            "ccn": ccn,
            "action_items": [f["message"] for f in warning_flags] if warning_flags else ["Standard clinician review"],
            "decided_at": datetime.now().isoformat(),
        }

    # Rule 3: Family report + REVIEW → HUMAN_REVIEW
    if report_type == "family" and guardian_status == "REVIEW":
        return {
            "decision": "HUMAN_REVIEW",
            "reason": f"Family report has {len(warning_flags)} warning(s) — needs review before auto-publish",
            "guardian_status": guardian_status,
            "report_type": report_type,
            "facility": facility,
            "ccn": ccn,
            "action_items": [f["message"] for f in warning_flags],
            "decided_at": datetime.now().isoformat(),
        }

    # Rule 4: Family report + PASS → PUBLISH
    if report_type == "family" and guardian_status == "PASS":
        return {
            "decision": "PUBLISH",
            "reason": "Family report passed all Guardian checks — safe to auto-deliver",
            "guardian_status": guardian_status,
            "report_type": report_type,
            "facility": facility,
            "ccn": ccn,
            "action_items": [],
            "decided_at": datetime.now().isoformat(),
        }

    # Fallback: unknown state → HOLD
    return {
        "decision": "HOLD",
        "reason": f"Unknown state: guardian={guardian_status}, type={report_type}",
        "guardian_status": guardian_status,
        "report_type": report_type,
        "facility": facility,
        "ccn": ccn,
        "action_items": ["Investigate unexpected routing state"],
        "decided_at": datetime.now().isoformat(),
    }


# ── CLI Entry Point ─────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 router_agent.py <guardian_result.json> <report_type>")
        print("       report_type: 'family' or 'attorney'")
        sys.exit(1)

    guardian_path = Path(sys.argv[1])
    report_type = sys.argv[2].lower()

    if report_type not in ("family", "attorney"):
        print(f"ERROR: report_type must be 'family' or 'attorney', got '{report_type}'")
        sys.exit(1)

    if not guardian_path.exists():
        print(f"ERROR: Guardian result not found: {guardian_path}")
        sys.exit(1)

    with open(guardian_path) as f:
        guardian_result = json.load(f)

    result = route_report(guardian_result, report_type)

    # Print results
    icon = {"PUBLISH": "🟢", "HUMAN_REVIEW": "🟡", "HOLD": "🔴"}.get(result["decision"], "⚪")
    print(f"\n{'='*60}")
    print(f"  {icon} ROUTER DECISION: {result['decision']}")
    print(f"  Facility: {result['facility']} ({result['ccn']})")
    print(f"  Report type: {result['report_type']}")
    print(f"  Guardian status: {result['guardian_status']}")
    print(f"{'='*60}")
    print(f"\n  Reason: {result['reason']}")

    if result["action_items"]:
        print(f"\n  Action items:")
        for item in result["action_items"]:
            print(f"    → {item}")
    print()

    # Save JSON output
    output_path = guardian_path.parent / f"router_result_{result['ccn']}.json"
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"Full result saved to: {output_path}")


if __name__ == "__main__":
    main()
