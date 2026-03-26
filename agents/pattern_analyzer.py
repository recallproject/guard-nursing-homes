#!/usr/bin/env python3
"""
Pattern Analyzer — The Oversight Report
=========================================
Analyzes deficiency data to surface patterns attorneys need:
  - Deficiency grouping by category with complaint %
  - Immediate Jeopardy and Actual Harm highlights
  - Scope/severity breakdown
  - Top recurring F-tags with CFR citations
  - Timeline of most serious findings

Usage:
    python3 agents/pattern_analyzer.py <state_code> <ccn>

This enriches the evidence bundle with attorney-ready analysis.
"""

import json
import os
import sys
from collections import defaultdict
from pathlib import Path

DEFICIENCY_DIR = Path(__file__).resolve().parent.parent / "public" / "deficiency_details"
FTAG_REF_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "ftag-reference.json"


def load_ftag_reference():
    """Load the F-tag to CFR citation reference file."""
    if FTAG_REF_PATH.exists():
        with open(FTAG_REF_PATH) as f:
            return json.load(f)
    return {}


def load_deficiency_details(state_code, ccn):
    """Load deficiency details for a specific facility."""
    state_file = DEFICIENCY_DIR / f"{state_code.upper()}.json"
    if not state_file.exists():
        return []
    with open(state_file) as f:
        state_data = json.load(f)
    fac_data = state_data.get(ccn, {})
    return fac_data.get("deficiency_details", [])


def analyze_patterns(deficiencies, ftag_ref=None):
    """Analyze deficiency patterns for attorney use.
    
    Returns a dict with:
        - category_breakdown: deficiencies grouped by category
        - severity_summary: IJ, actual harm, pattern counts
        - ij_findings: list of Immediate Jeopardy deficiencies
        - harm_findings: list of Actual Harm deficiencies
        - top_ftags: most frequently cited F-tags with descriptions
        - complaint_ratio: % of deficiencies from complaint investigations
        - timeline: serious findings in chronological order
    """
    if ftag_ref is None:
        ftag_ref = load_ftag_reference()

    if not deficiencies:
        return {"empty": True, "total": 0}

    # Group by category
    by_category = defaultdict(lambda: {"count": 0, "complaint_count": 0, "ftags": []})
    for d in deficiencies:
        cat = d.get("category", "Unknown")
        by_category[cat]["count"] += 1
        if d.get("is_complaint"):
            by_category[cat]["complaint_count"] += 1
        ftag = d.get("ftag", "")
        if ftag:
            by_category[cat]["ftags"].append(ftag)

    # Sort categories by count descending
    category_breakdown = [
        {"category": cat, **data}
        for cat, data in sorted(by_category.items(), key=lambda x: -x[1]["count"])
    ]

    # Severity analysis
    ij_findings = []
    harm_findings = []
    for d in deficiencies:
        sev = d.get("severity_label", "")
        if "Immediate Jeopardy" in sev:
            # Enrich with CFR citation
            ftag_clean = (d.get("ftag", "").replace("F-0", "F").replace("F-", "F"))
            ref = ftag_ref.get(ftag_clean, {})
            ij_findings.append({
                "date": d.get("survey_date"),
                "ftag": d.get("ftag"),
                "cfr": ref.get("cfr", ""),
                "title": ref.get("title", d.get("description", "")[:100]),
                "scope": d.get("scope_label", ""),
                "from_complaint": d.get("is_complaint", False),
                "corrected": d.get("corrected"),
                "correction_date": d.get("correction_date"),
            })
        elif "Actual Harm" in sev:
            ftag_clean = (d.get("ftag", "").replace("F-0", "F").replace("F-", "F"))
            ref = ftag_ref.get(ftag_clean, {})
            harm_findings.append({
                "date": d.get("survey_date"),
                "ftag": d.get("ftag"),
                "cfr": ref.get("cfr", ""),
                "title": ref.get("title", d.get("description", "")[:100]),
                "scope": d.get("scope_label", ""),
                "from_complaint": d.get("is_complaint", False),
            })

    # Sort serious findings by date (newest first)
    ij_findings.sort(key=lambda x: x.get("date", ""), reverse=True)
    harm_findings.sort(key=lambda x: x.get("date", ""), reverse=True)

    # Scope/severity breakdown
    severity_counts = defaultdict(int)
    for d in deficiencies:
        sev = d.get("severity_label", "Unknown")
        severity_counts[sev] += 1

    # Top recurring F-tags
    ftag_counts = defaultdict(int)
    for d in deficiencies:
        ftag = d.get("ftag", "").replace("F-0", "F").replace("F-", "F")
        if ftag:
            ftag_counts[ftag] += 1

    top_ftags = []
    for ftag, count in sorted(ftag_counts.items(), key=lambda x: -x[1])[:10]:
        ref = ftag_ref.get(ftag, {})
        top_ftags.append({
            "ftag": ftag,
            "count": count,
            "cfr": ref.get("cfr", ""),
            "title": ref.get("title", ""),
            "category": ref.get("category", ""),
            "ca_title22": ref.get("ca_title22"),
        })

    # Complaint ratio
    total = len(deficiencies)
    complaint_count = sum(1 for d in deficiencies if d.get("is_complaint"))
    complaint_ratio = round(complaint_count / total * 100, 1) if total > 0 else 0

    return {
        "total": total,
        "category_breakdown": category_breakdown,
        "severity_summary": dict(severity_counts),
        "ij_count": len(ij_findings),
        "harm_count": len(harm_findings),
        "ij_findings": ij_findings,
        "harm_findings": harm_findings,
        "top_ftags": top_ftags,
        "complaint_count": complaint_count,
        "complaint_ratio": complaint_ratio,
        "attorney_summary": build_attorney_summary(
            total, ij_findings, harm_findings, complaint_ratio, category_breakdown, top_ftags
        ),
    }


def build_attorney_summary(total, ij_findings, harm_findings, complaint_ratio, categories, top_ftags):
    """Build a plain-language summary an attorney can scan in 30 seconds."""
    lines = []
    lines.append(f"This facility has {total} documented deficiencies on record.")

    if ij_findings:
        lines.append(
            f"CMS found {len(ij_findings)} Immediate Jeopardy finding(s) — "
            f"the highest severity level, indicating conditions that caused or were likely to cause "
            f"serious injury, harm, impairment, or death to a resident."
        )
        for ij in ij_findings[:3]:
            lines.append(f"  - {ij['date']}: {ij['ftag']} ({ij['cfr']}) — {ij['title']}")

    if harm_findings:
        lines.append(
            f"Additionally, {len(harm_findings)} finding(s) were classified as Actual Harm — "
            f"meaning CMS determined that a resident was harmed as a result of the deficiency."
        )

    if complaint_ratio > 50:
        lines.append(
            f"{complaint_ratio}% of deficiencies originated from complaint investigations, "
            f"suggesting a pattern of external reports of concern."
        )

    # Top problem areas
    if categories:
        top3 = categories[:3]
        areas = ", ".join(f"{c['category']} ({c['count']})" for c in top3)
        lines.append(f"Most frequent deficiency categories: {areas}.")

    # Top F-tags for demand letters
    if top_ftags:
        lines.append("Most frequently cited regulations:")
        for ft in top_ftags[:5]:
            cite = f"{ft['ftag']} — {ft['cfr']}" if ft['cfr'] else ft['ftag']
            lines.append(f"  - {cite}: {ft['title']} (cited {ft['count']}x)")

    return "\n".join(lines)


# ── CLI Entry Point ─────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 pattern_analyzer.py <state_code> <ccn>")
        sys.exit(1)

    state_code = sys.argv[1].upper()
    ccn = sys.argv[2]

    print(f"Analyzing deficiency patterns for {ccn} ({state_code})...")
    deficiencies = load_deficiency_details(state_code, ccn)

    if not deficiencies:
        print(f"No deficiency details found for {ccn}")
        sys.exit(0)

    result = analyze_patterns(deficiencies)

    print(f"\n{'='*60}")
    print(f"  PATTERN ANALYSIS: {ccn} ({state_code})")
    print(f"{'='*60}")
    print(f"\n{result['attorney_summary']}")

    print(f"\n--- Severity Breakdown ---")
    for sev, count in sorted(result["severity_summary"].items(), key=lambda x: -x[1]):
        print(f"  {sev}: {count}")

    # Save JSON output
    output_dir = Path(__file__).resolve().parent / "bundles"
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / f"pattern_analysis_{ccn}.json"
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nFull analysis saved to: {output_path}")


if __name__ == "__main__":
    main()
