# Facility Page: Mockup vs Live — Gap Analysis
## March 5, 2026

---

## Summary Table

| # | Mockup Change | Status | Notes |
|---|---|---|---|
| 1 | Sticky Section Nav | ✅ Implemented | Centered pills, frosted glass, smooth scroll. Live version omits section numbers — arguably cleaner |
| 2 | Split Intro Card (Identity / Risk Badges / Bottom Line) | ✅ Implemented | Three separate `<div class="section">` blocks. Live matches mockup intent |
| 3 | Deficiency Severity & Year Filters + Pagination | ✅ Implemented | Filter chips (Serious Danger, Residents Hurt, Minor) + year chips + pagination at 5/page (mockup said 10) |
| 4 | Abuse Citation Grouping by F-Tag | ✅ Implemented | Groups abuse/neglect citations by F-tag with counts and harm breakdowns |
| 5 | Staffing Verdict Banner | ✅ Implemented | Concern/Caution/OK levels with benchmarks. Added in StaffingSection.jsx |
| 6 | Uniform Safety Score Card Height | ⚠️ Partial | Live uses `data-cell` with `min-height: 160px` in CSS, but CMS removal callout is still inside a single card (not moved below grid as mockup proposed) |
| 7 | Fire Safety — Uncorrected Violations Callout | ✅ Implemented | Shows uncorrected count + percentage + clinical interpretation when ≥50% remain open |
| 8 | Questions to Ask — Priority Tags & Ranking | ✅ Implemented | Critical/Important tags, numbered ranking, data-driven question generation |
| 9 | Ownership — Corporate Structure Diagram | ❌ Not Implemented | Mockup proposed a visual layered diagram (Operator → Building Owner → REIT/PE). Live site shows text-based ownership info but no visual corporate structure chain |
| 10 | Ownership — Operator Portfolio Stats & Star Distribution | ⚠️ Partial | Portfolio count and avg fines shown. Star distribution bar chart NOT implemented. Live has portfolio-level concern callout instead |
| 11 | Ask a Clinician CTA — Placement After Questions | ✅ Implemented | Placed at line 2004, right after Questions section. Also appears once more at bottom |
| 12 | Nearby Alternatives — Default Sort | ✅ Implemented (Different) | Mockup said "Safety Score" default; live defaults to "Distance". Rob approved this in prior session |
| 13 | Expanded Glossary + $29 Evidence PDF Upsell | ✅ Implemented | Glossary expanded to 11 terms. Comparison grid implemented. Searchable glossary NOT added |
| 14 | Bottom Download CTA | ❌ Removed (Intentional) | Was implemented, but removed in today's CTA consolidation audit. It had misleading copy ("evidence report" text triggered free download). Removed by design |

---

## Detailed Breakdown

### Change #1: Sticky Section Nav
**Mockup:** Numbered pill nav (01 Safety, 02 Inspections...) with active state tracking scroll position, horizontal scroll on mobile.
**Live:** Centered pill bar with frosted glass backdrop, smooth scroll on click. No section numbers — just labels (Safety, Inspections, Complaints...). No scroll-position active tracking.
**Gap:** Active scroll tracking not implemented (nav pills don't highlight as you scroll). Section numbers omitted. These are minor — the nav works well without them.

### Change #2: Split Intro Card
**Mockup:** Identity zone (name/stars/CCN) → Risk badges row (REIT, SFF) → Bottom Line card, all visually separated.
**Live:** Three separate `section` divs: `fp-identity-card`, `fp-ownership-alerts`, `fp-bottom-line`. Matches mockup intent. Ownership alerts conditionally render only when relevant.
**Gap:** None meaningful. ✅

### Change #3: Deficiency Filtering + Pagination
**Mockup:** Severity chips (All, Serious Danger, Residents Hurt, Minor) + Year chips (All, 2025, 2024, 2023) + Pagination at 10 per page.
**Live:** All filter chips implemented. Pagination at **5 per page** (mockup said 10). Year chips include count badges.
**Gap:** Page size is 5 vs mockup's 10. Could argue 5 is better for faster scanning.

### Change #4: Abuse Citation Grouping by F-Tag
**Mockup:** Group identical F-tag abuse citations into single cards showing count, harm breakdown, and years cited.
**Live:** Fully implemented in the Complaints section. Groups by F-tag with `abuse-group` cards showing header, stats, harm indicator dots, and year badges.
**Gap:** None. ✅

### Change #5: Staffing Verdict Banner
**Mockup:** Verdict banner above staffing table when numbers fall below federal benchmarks. Three levels: danger (both below), warning (one below), info (meets).
**Live:** Implemented in `StaffingSection.jsx` with concern/caution/ok levels. Uses RN 33 min and Total 246 min benchmarks. Shows percentage of benchmark and plain-English interpretation.
**Gap:** None. ✅

### Change #6: Uniform Safety Score Card Height
**Mockup:** All 6 metric cards at uniform height via `min-height`. CMS removal callout moved below the grid (was inside one card causing uneven heights).
**Live:** Uses `data-cell` with 160px min-height. CMS complaint investigation removal note IS still inside the individual card as a `stat-card-callout` div.
**Gap:** The CMS removal callout is still inside one card, not moved below the grid. Minor visual issue.

### Change #7: Fire Safety — Uncorrected Callout
**Mockup:** Red callout showing "X of Y violations still uncorrected" with clinical interpretation about blocked exits, malfunctioning sprinklers, etc.
**Live:** Fully implemented. Triggers when ≥50% of fire violations are uncorrected AND count > 2. Shows percentage, count, and strong clinical language about fire risk for immobile residents.
**Gap:** None. ✅

### Change #8: Questions — Priority Tags & Ranking
**Mockup:** Numbered questions with Critical (red) and Important (amber) priority tags. Data-driven — questions generated from facility's specific problems.
**Live:** Fully implemented. Generates questions dynamically based on jeopardy count, zero-RN days, staffing gaps, fines, etc. Shows Critical/Important tags with numbered ranking.
**Gap:** None. ✅

### Change #9: Ownership — Corporate Structure Diagram
**Mockup:** Visual layered diagram showing: Operator → Building Owner → REIT/PE firm, with connecting arrows. Makes corporate layers visible to families who see opaque LLC names.
**Live:** Ownership section shows text-based info — operator name, portfolio count, PE/REIT badges, ownership change timeline. **No visual corporate structure diagram.**
**Gap:** This is the biggest unimplemented mockup feature. The visual diagram would make complex ownership structures (especially PE/REIT layering) immediately understandable to families.

### Change #10: Ownership — Operator Portfolio Stats
**Mockup:** Side-by-side cards showing operator stats (facilities count, avg fines, avg stars) and a star distribution bar chart showing how many of the operator's facilities are 1-star, 2-star, etc.
**Live:** Portfolio count and avg fines shown. A portfolio concern callout triggers when a high percentage are below-average rated. **Star distribution bar chart is NOT implemented.**
**Gap:** Star distribution visualization missing. The live concern callout is a good alternative but the visual chart would be more impactful.

### Change #11: Ask a Clinician CTA Placement
**Mockup:** Place after Questions section (highest-intent moment).
**Live:** Placed at line 2004, right after "What You Can Do" section (which comes after Questions). Also at bottom of page.
**Gap:** Slight positional difference — it's after Action Paths rather than directly after Questions. Still in the high-intent zone. Close enough.

### Change #12: Nearby Alternatives — Default Sort
**Mockup:** Default sort by "Safety Score" (worst → best risk score).
**Live:** Default sort by "Distance" (closest first). Changed intentionally — Rob approved distance as more useful default.
**Gap:** Intentional deviation. ✅

### Change #13: Glossary + Evidence PDF Upsell
**Mockup:** Searchable glossary (filter input) with expanded terms (F-tag, K-tag, REIT, Scope & Severity added). Below glossary: side-by-side Free vs $29 comparison grid.
**Live:** Glossary expanded to 11 terms (F-tag, K-tag, REIT, Scope & Severity all added ✅). Comparison grid implemented and now repositioned above Evidence CTA per today's consolidation. **Glossary search input NOT implemented.**
**Gap:** Searchable/filterable glossary not added. With only 11 terms, search is arguably unnecessary.

### Change #14: Bottom Download CTA
**Mockup:** Dark gradient bar at bottom: "Save this report for later" + download button.
**Live:** Was implemented, then **intentionally removed today** because the copy said "evidence report" but triggered the free PDF — misleading. Removed as part of CTA consolidation audit.
**Gap:** Intentional removal. The free download CTA + comparison grid + Evidence CTA now serve this function better.

---

## Live Site Improvements NOT in Mockup

These are things the live site does that weren't in the original mockup:

1. **MetricTooltip component** — Interactive tooltip popovers on every metric explaining what it means in plain English. The mockup just had "?" icons with no content.

2. **ExplainerBanners component** — Contextual explanation banners that weren't in the mockup design.

3. **WhatDoesThisMean component** — KeyPoint-based clinical interpretations inline within sections.

4. **Staffing Trend Chart** — Quarter-over-quarter staffing trend visualization with declining/improving badges.

5. **Staffing Discrepancy Alert** — Flags when self-reported vs payroll-based hours diverge significantly.

6. **Zero-RN Days Alert** — Specific callout when facility reports zero registered nurse hours.

7. **Quality Measures Tab System** — Tabbed interface (Memory Care, Body & Basic Care, Rehab, Vaccines, Workforce) with color-coded dots showing concern level per category.

8. **Watchlist/Favorites system** — Star favorites with compare link.

9. **Evidence Preview Modal** — 10-section preview of what's in the $29 PDF.

10. **CTA Consolidation** — Cleaner 3-block funnel (Free → Comparison Grid → Evidence Package) instead of mockup's 5-block layout.

---

## Remaining Gaps — Priority Ranking

| Priority | Item | Impact | Effort |
|---|---|---|---|
| 🔴 High | **#9: Corporate Structure Diagram** | High — makes opaque ownership visible to families. Key differentiator for the tool. | Medium — needs SVG/CSS diagram component |
| 🟡 Medium | **#10: Star Distribution Bar Chart** | Medium — visual impact for portfolio analysis. The text callout works but chart is more compelling. | Low — simple horizontal bar chart |
| 🟢 Low | **#6: Move CMS callout below Safety grid** | Low — minor visual alignment issue | Very Low — move one div |
| 🟢 Low | **#1: Scroll-position active nav tracking** | Low — nice polish but users can navigate fine without it | Medium — needs Intersection Observer |
| ⚪ Skip | **#13: Glossary search** | Negligible — only 11 terms | Low |
