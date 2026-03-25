#!/usr/bin/env python3
"""
Guardian Agent v1 — The Oversight Report
=========================================
Verifies attorney-facing report drafts against a frozen evidence bundle.
Outputs PASS / REVIEW / FAIL with machine-readable flags.

Usage:
    python3 agents/guardian_agent.py [evidence_bundle.json] [draft_report.txt]

The Guardian checks:
    1. Data freshness (is the bundle recent enough?)
    2. Required fields (are all critical fields present?)
    3. Numeric accuracy (do report numbers match the bundle?)
    4. Citation presence (does the report cite its sources?)
    5. Banned language (no unsupported legal conclusions?)
    6. Confidence flags (any low-confidence data joins?)
"""

import json
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

# ── Configuration (easy to change) ──────────────────────────────────────

# How old can the data be before we flag it? (in days)
FRESHNESS_THRESHOLD_DAYS = 60

# Fields that MUST exist in the evidence bundle
REQUIRED_BUNDLE_FIELDS = [
    "facility_identity",
    "data_as_of",
    "staffing_facts",
    "penalty_facts",
    "inspection_facts",
    "ownership_facts",
]

# Numeric fields to cross-check between bundle and report
# Format: (bundle_path, display_name)
NUMERIC_CHECKS = [
    ("penalty_facts.total_fines", "total fines"),
    ("penalty_facts.fine_count", "fine count"),
    ("penalty_facts.denial_count", "denial count"),
    ("staffing_facts.total_hprd", "total staffing HPRD"),
    ("staffing_facts.rn_hprd", "RN HPRD"),
    ("inspection_facts.total_deficiencies", "total deficiencies"),
]

# Phrases that should NEVER appear in attorney reports
# (unsupported legal conclusions, speculation, etc.)
BANNED_PHRASES = [
    "negligence",
    "guilty",
    "liable",
    "malpractice",
    "clearly at fault",
    "without a doubt",
    "proves that",
    "definitely caused",
    "guarantees",
    "exposed to liability",
    "should be held responsible",
    "criminal",
]

# Minimum confidence score for data joins (0.0 to 1.0)
MIN_CONFIDENCE_SCORE = 0.7


# ── Flag Object ─────────────────────────────────────────────────────────

def make_flag(severity, check_type, message):
    """Create a standardized flag dict.
    
    severity: "critical" | "warning" | "info"
    check_type: which check produced this flag
    message: human-readable explanation
    """
    return {
        "severity": severity,
        "check_type": check_type,
        "message": message,
        "timestamp": datetime.now().isoformat(),
    }


# ── Helper: get nested dict value by dot path ───────────────────────────

def get_nested(data, dot_path, default=None):
    """Get a value from a nested dict using 'a.b.c' notation."""
    keys = dot_path.split(".")
    current = data
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return default
    return current


# ── Check 1: Data Freshness ─────────────────────────────────────────────

def check_freshness(bundle, threshold_days=FRESHNESS_THRESHOLD_DAYS):
    """Is the data recent enough to trust?"""
    flags = []
    data_as_of = bundle.get("data_as_of")
    if not data_as_of:
        flags.append(make_flag("critical", "freshness", "No data_as_of date in evidence bundle"))
        return flags

    try:
        data_date = datetime.strptime(data_as_of, "%Y-%m-%d")
    except ValueError:
        flags.append(make_flag("critical", "freshness", f"Cannot parse data_as_of date: {data_as_of}"))
        return flags

    age_days = (datetime.now() - data_date).days
    if age_days > threshold_days:
        flags.append(make_flag("critical", "freshness",
            f"Data is {age_days} days old (threshold: {threshold_days} days). Bundle date: {data_as_of}"))
    elif age_days > threshold_days // 2:
        flags.append(make_flag("warning", "freshness",
            f"Data is {age_days} days old — approaching threshold of {threshold_days} days"))
    return flags


# ── Check 2: Required Fields ────────────────────────────────────────────

def check_required_fields(bundle, required=REQUIRED_BUNDLE_FIELDS):
    """Are all critical sections present in the bundle?"""
    flags = []
    for field in required:
        if field not in bundle or bundle[field] is None:
            flags.append(make_flag("critical", "required_field", f"Missing required field: {field}"))
        elif isinstance(bundle[field], dict) and len(bundle[field]) == 0:
            flags.append(make_flag("warning", "required_field", f"Field '{field}' is present but empty"))
    return flags


# ── Check 3: Numeric Accuracy ───────────────────────────────────────────

def check_numeric_accuracy(bundle, report_text, checks=NUMERIC_CHECKS):
    """Do the numbers in the report match the evidence bundle?"""
    flags = []
    for dot_path, display_name in checks:
        bundle_value = get_nested(bundle, dot_path)
        if bundle_value is None:
            flags.append(make_flag("warning", "numeric", f"Cannot verify {display_name} — not in bundle"))
            continue

        # Look for this number in the report text
        # Try both integer and float representations
        bundle_num = float(bundle_value)
        found = False

        # Check for the exact number in various formats
        patterns = []
        if bundle_num == int(bundle_num):
            # Integer: look for "5" or "5.0"
            patterns.append(str(int(bundle_num)))
            # Also check with commas: "156,358"
            patterns.append(f"{int(bundle_num):,}")
        else:
            patterns.append(str(bundle_num))
            patterns.append(f"{bundle_num:.2f}")
        # Also check dollar amounts: "$156,358" or "$156,358.00"
        if "fine" in display_name.lower() or "penalty" in display_name.lower():
            patterns.append(f"${int(bundle_num):,}")
            patterns.append(f"${bundle_num:,.2f}")

        for pattern in patterns:
            if pattern in report_text:
                found = True
                break

        if not found:
            flags.append(make_flag("critical", "numeric",
                f"{display_name}: expected {bundle_value} but not found in report"))
    return flags


# ── Check 4: Citation Presence ──────────────────────────────────────────

def check_citations(bundle, report_text):
    """Does the report reference its data sources?"""
    flags = []
    citations = bundle.get("citations", [])

    # Check if report mentions CMS or data source at all
    source_keywords = ["CMS", "Medicare", "data.cms.gov", "Provider Info", "Care Compare"]
    has_any_source = any(kw.lower() in report_text.lower() for kw in source_keywords)

    if not has_any_source:
        flags.append(make_flag("critical", "citation",
            "Report does not reference any CMS data source"))

    # Check if facility name appears
    facility_name = get_nested(bundle, "facility_identity.name", "")
    if facility_name and facility_name.lower() not in report_text.lower():
        flags.append(make_flag("warning", "citation",
            f"Facility name '{facility_name}' not found in report"))

    # Check if CCN appears
    ccn = get_nested(bundle, "facility_identity.ccn", "")
    if ccn and ccn not in report_text:
        flags.append(make_flag("info", "citation",
            f"CCN '{ccn}' not referenced in report"))

    return flags


# ── Check 5: Banned Language ────────────────────────────────────────────

def check_banned_language(report_text, banned=BANNED_PHRASES):
    """Flag unsupported legal conclusions or speculation."""
    flags = []
    report_lower = report_text.lower()
    for phrase in banned:
        if phrase.lower() in report_lower:
            flags.append(make_flag("critical", "banned_language",
                f"Report contains banned phrase: '{phrase}'"))
    return flags


# ── Check 6: Clinical Red Flags ─────────────────────────────────────────

# Quality measure codes and their national averages (computed March 2026)
# These are the clinical indicators Paski flagged as critical for attorney reports
CLINICAL_RED_FLAGS = {
    "ls_408": {"name": "Depression (long-stay)", "national_avg": 12.49, "alert_multiplier": 2.0},
    "ls_480": {"name": "Incontinence worsening (long-stay)", "national_avg": 18.98, "alert_multiplier": 1.5},
    "ls_481": {"name": "Antipsychotic use (long-stay)", "national_avg": 16.34, "alert_multiplier": 1.5},
    "ss_434": {"name": "New antipsychotic use (short-stay)", "national_avg": 1.39, "alert_multiplier": 2.0},
    "ls_409": {"name": "Physical restraint use (long-stay)", "national_avg": 0.13, "alert_multiplier": 3.0},
    "ls_479": {"name": "Pressure ulcers (long-stay)", "national_avg": 4.56, "alert_multiplier": 2.0},
    "ls_404": {"name": "Weight loss (long-stay)", "national_avg": 4.99, "alert_multiplier": 2.0},
}


def check_clinical_red_flags(bundle, red_flags=CLINICAL_RED_FLAGS):
    """Surface clinical quality concerns that attorneys and families need to see."""
    flags = []
    quality = bundle.get("quality_facts", {})
    mds = quality.get("mds", {})
    if not mds:
        flags.append(make_flag("info", "clinical", "No quality measures data in bundle"))
        return flags

    for key, config in red_flags.items():
        rtype, code = key.split("_", 1)
        measures = mds.get(rtype, {})
        measure = measures.get(code, {})
        score = measure.get("s")

        if score is None:
            continue

        threshold = config["national_avg"] * config["alert_multiplier"]
        if score > threshold:
            flags.append(make_flag("warning", "clinical_red_flag",
                f"{config['name']}: {score:.1f}% (national avg: {config['national_avg']:.1f}%, "
                f"threshold: {threshold:.1f}%) — ELEVATED"))
        elif score > config["national_avg"]:
            flags.append(make_flag("info", "clinical",
                f"{config['name']}: {score:.1f}% (above national avg of {config['national_avg']:.1f}%)"))

    return flags


# ── Check 7: Confidence Flags ───────────────────────────────────────────

def check_confidence(bundle, min_score=MIN_CONFIDENCE_SCORE):
    """Flag any low-confidence data joins in the bundle."""
    flags = []
    confidence_flags = bundle.get("confidence_flags", [])

    for cf in confidence_flags:
        score = cf.get("score", 1.0)
        field = cf.get("field", "unknown")
        if score < min_score:
            flags.append(make_flag("warning", "confidence",
                f"Low confidence ({score:.2f}) on '{field}' — may need manual verification"))
    return flags


# ── Main Guardian Function ──────────────────────────────────────────────

def run_guardian(bundle, report_text):
    """Run all Guardian checks and return a verdict.
    
    Returns dict with:
        status: "PASS" | "REVIEW" | "FAIL"
        flags: list of flag dicts
        summary: human-readable summary
        checked_at: timestamp
    """
    all_flags = []

    # Run all 6 checks
    all_flags.extend(check_freshness(bundle))
    all_flags.extend(check_required_fields(bundle))
    all_flags.extend(check_numeric_accuracy(bundle, report_text))
    all_flags.extend(check_citations(bundle, report_text))
    all_flags.extend(check_banned_language(report_text))
    all_flags.extend(check_clinical_red_flags(bundle))
    all_flags.extend(check_confidence(bundle))

    # Determine verdict
    critical_count = sum(1 for f in all_flags if f["severity"] == "critical")
    warning_count = sum(1 for f in all_flags if f["severity"] == "warning")

    if critical_count > 0:
        status = "FAIL"
    elif warning_count > 0:
        status = "REVIEW"
    else:
        status = "PASS"

    # Build summary
    summary_parts = []
    if critical_count:
        summary_parts.append(f"{critical_count} critical issue(s)")
    if warning_count:
        summary_parts.append(f"{warning_count} warning(s)")
    info_count = sum(1 for f in all_flags if f["severity"] == "info")
    if info_count:
        summary_parts.append(f"{info_count} info note(s)")

    summary = f"Guardian verdict: {status}"
    if summary_parts:
        summary += f" — {', '.join(summary_parts)}"

    return {
        "status": status,
        "flags": all_flags,
        "summary": summary,
        "checked_at": datetime.now().isoformat(),
        "bundle_facility": get_nested(bundle, "facility_identity.name", "unknown"),
        "bundle_ccn": get_nested(bundle, "facility_identity.ccn", "unknown"),
    }


# ── CLI Entry Point ─────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 guardian_agent.py <evidence_bundle.json> <draft_report.txt>")
        print("       Verifies a report draft against its evidence bundle.")
        sys.exit(1)

    bundle_path = Path(sys.argv[1])
    report_path = Path(sys.argv[2])

    if not bundle_path.exists():
        print(f"ERROR: Bundle not found: {bundle_path}")
        sys.exit(1)
    if not report_path.exists():
        print(f"ERROR: Report not found: {report_path}")
        sys.exit(1)

    with open(bundle_path) as f:
        bundle = json.load(f)
    with open(report_path) as f:
        report_text = f.read()

    result = run_guardian(bundle, report_text)

    # Print results
    print(f"\n{'='*60}")
    print(f"  GUARDIAN VERDICT: {result['status']}")
    print(f"  Facility: {result['bundle_facility']} ({result['bundle_ccn']})")
    print(f"  Checked at: {result['checked_at']}")
    print(f"{'='*60}")
    print(f"\n{result['summary']}\n")

    for flag in result["flags"]:
        icon = {"critical": "🔴", "warning": "🟡", "info": "🔵"}.get(flag["severity"], "⚪")
        print(f"  {icon} [{flag['check_type']}] {flag['message']}")

    print()

    # Also write JSON output for machine consumption
    output_path = bundle_path.parent / f"guardian_result_{result['bundle_ccn']}.json"
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"Full result saved to: {output_path}")

    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
