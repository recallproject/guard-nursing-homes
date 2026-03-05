# Facility Page: Mockup v2 → Live Implementation Gap Analysis

## Reference Files
- **Mockup (spec):** ~/Desktop/RB7-Project/healthcare_fraud/nursing_home/frontend/mockups/facility-page-unified-v2.html
- **Live code:** ~/Desktop/RB7-Project/healthcare_fraud/nursing_home/frontend/src/pages/FacilityPage.jsx
- **Test URL:** http://localhost:5177/facility/355109

## Summary
The mockup has specific design patterns, layout structures, and data presentations that the live build doesn't match. This prompt documents every gap section-by-section. The mockup is the spec — match it.

---

## SECTION-BY-SECTION GAPS

### Page Header / Facility Header
**Mockup has:**
- page-badge ("Facility Report Card") — small blue pill above facility name
- facility-meta row: city, beds, star badge, ProPublica link, Medicare Compare link — all horizontal flex with dot separators
- star-badge — styled inline badge (e.g., "1 ★ CMS Rating") with red background tint
- bottom-line — full-width banner below meta with icon + "Bottom Line" label + narrative synthesizing: deficiency count vs state avg, IJ citations, total fines, zero-RN %, complaint count, and CMS removal callout

---

### Section 01 — Safety Score
**Mockup has:** 6 stat cards in 2 rows of 3 (cols-3)
- Row 1: Total Deficiencies, Serious Danger (IJ), Total Fines
- Row 2: Zero-RN Days, Complaint Investigations (with inline CMS removal callout), Fire Safety Violations

**Key difference:** Mockup has 6 cards, live has 4. Add:
- Complaint investigation count as 5th card with stat-card-callout: "CMS removed this from Care Compare on 2/25/26. We rebuilt it from inspection records."
- Fire safety violation count as 6th card
- Stat cards use conditional styling: .stat-card.alert (red), .stat-card.warn (orange), .stat-card.good (green)

---

### Section 02 — What Did Inspectors Find?
**Mockup adds at top:**
- 2 NEW stat cards (cols-2): "Avg Days to Correct" + "Repeat Offender Citations"
- Verdict banner: "Slow to Fix Problems & Repeat Offender"
- Severity badges: sev-badge ij (red "Serious Danger"), sev-badge harm ("Residents Hurt"), sev-badge minor (gray "Minor")
- "What does this mean?" expandable explainer
- Source line at bottom

**Data:** Days to correct = survey_date vs correction_date diff. Repeat offenders = same F-tag cited in multiple consecutive cycles.

---

### Section 03 — Complaints & Abuse History
**Mockup has ALL of:**
- SFF Banner (pulsing red dot + "CMS Special Focus Facility" label) — only if on SFF list
- 3 stat cards (cols-3): Complaint Investigations, Abuse/Neglect Citations (F600-F609), Led to Penalties
- Verdict banner: "Pattern of Complaints With Abuse Citations"
- CMS Callout: orange info box about CMS removing complaint counts Feb 25, 2026
- Complaint Investigations by Year: horizontal bar chart with year labels + colored fills
- Abuse & Neglect Citations: F-tag badge list (F600, F607, F609 etc.) with severity + type + year
- Source line

---

### Section 05 — How Are Residents Doing? (Quality Measures)
**This is the biggest gap. Mockup specifies:**

**6 tabs with colored flag dots and count pills:**
1. Memory Care (5 measures, red flag)
2. Body & Basic Care (7 measures, orange flag)
3. Rehab & Short-Stay (9 measures, red flag)
4. Safety Record (5 measures, orange flag)
5. Workforce (2 measures, red flag)
6. Vaccines (6 measures, red flag)

**Per-tab structure:**
- Verdict banner at top (auto-generated from data thresholds)
- Indicator rows with:
  - Name + ? info button
  - Facility value (colored) + "vs" + national average
  - HORIZONTAL COMPARISON BAR: gradient fill + national average marker line with "avg" label
  - Expandable clinical explainer (triggered by ? button)
- Direction note at bottom
- QM disclaimer at very bottom

**Specific measures per tab:**

Memory Care: Antipsychotic medication, Anti-anxiety/sedative, Physical restraints, Depressive symptoms, Falls with major injury

Body & Basic Care: Pressure ulcers, UTIs, Catheter left in, Weight loss, ADL decline, Walking worsened, Incontinence

Rehab & Short-Stay: Re-hospitalized 30d, ER visits, Discharged to community, New antipsychotics, HAIs, Medicare spending, Functional improvement, Falls short-stay, CMS payment adjustment (VBP)

Safety Record: IJ citations, Total fines, Infection control citations, Days to correct, Repeat offenders

Workforce: Nursing staff turnover, Weekend staffing drop

Vaccines: COVID residents, COVID staff, Flu LS, Pneumococcal LS, Flu SS, Pneumococcal SS (with sub-labels separating COVID from Flu sections)

**Critical visual: the indicator-bar-wrap** — 8px track, gradient fill, vertical national avg marker with "avg" label above. This is the key visual element.

---

### Section 08 — Fire Safety
**Mockup has 3 stat cards (cols-3):**
- Fire Code Violations (count vs nat'l 14.3)
- Serious K-Level (count)
- Still Uncorrected (count)
- Verdict banner: "Above-Average Fire Code Violations"

**Live has only 2 cards (count + IJ). Add:**
- "Still Uncorrected" count
- Verdict banner with narrative
- 3-column layout

---

### Section 09 — Who Runs This Place?
**Mockup adds:**
- Ownership Change Timeline: vertical timeline with colored dots (red=recent, orange=previous, blue=earlier, muted=opened), each with date + event + detail
- Verdict banner: "Frequent Ownership Changes" narrative about PE flipping pattern

---

## GLOBAL DESIGN PATTERNS

### Stat Cards
stat-card base + .alert (red tint), .warn (orange tint), .good (green tint)
Grid: stat-row cols-2/cols-3/cols-4/cols-6

### Verdict Banners
.verdict-banner.concern (red), .caution (orange), .ok (green)
Structure: icon circle + h3 title + paragraph with bold data

### Stat Card Inline Callout
.stat-card-callout — orange bg, small text, inside stat card

### CMS Callout
.cms-callout — orange info box, standalone

### SFF Banner
.sff-banner — red border, pulsing dot, uppercase label

### Indicator Bars
.indicator-bar-wrap (8px track) + .indicator-bar (gradient fill) + .natl-marker (vertical line at avg)

### Source Lines
.source-line — JetBrains Mono, small, bottom of each section

---

## PRIORITY ORDER
1. Section 05 (Quality Measures) — biggest visual gap, most complex
2. Section 01 (Safety Score) — add complaint + fire safety cards
3. Section 03 (Complaints) — verify all sub-elements
4. Section 08 (Fire Safety) — add missing cards + verdict banner
5. Section 02 (Inspectors) — add days-to-correct + repeat offender cards
6. Section 09 (Ownership) — add timeline + verdict banner
7. Header — verify bottom-line narrative completeness
