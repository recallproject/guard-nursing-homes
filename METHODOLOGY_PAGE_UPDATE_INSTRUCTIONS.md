# Methodology Page — New Sections to Add

## Instructions for Claude Code

Add these as new sections to `src/pages/MethodologyPage.jsx`. Insert them into the existing page structure. Each section should follow the existing `methodology-section` class pattern with `section-light` or `section-dark` alternation. Add to the TOC as well.

---

## NEW SECTION: "How Reports Are Built" (insert after Data Sources, before Key Metrics)

### TOC entry: "How Reports Are Built"
### Anchor: `#how-reports-are-built`

### Content:

**Section title:** How Reports Are Built

**Intro paragraph:**
The Oversight Report is built by a nurse practitioner using automated tools. We believe in full transparency about what's human and what's machine in our process.

**Three-part breakdown (use the methodology-source-card style):**

**Card 1 — "Data Pipeline (Automated)"**
We download raw CSV files directly from CMS (Centers for Medicare & Medicaid Services) federal databases. These files are processed through automated scripts that clean, merge, and structure the data across multiple datasets — linking inspection records with staffing data, penalty histories, ownership filings, and quality measures. No data is altered, fabricated, or estimated. Every number traces back to a specific CMS source file.

**Card 2 — "Report Generation (AI-Assisted)"**
Individual facility reports and PDF documents are assembled programmatically using AI-assisted code. This includes structuring data into readable formats, calculating comparative metrics (national averages, percentiles), and generating consistent report layouts. The technology allows us to produce reports for all 14,713 facilities — something that would be impossible to do manually.

**Card 3 — "Clinical Interpretation (Human)"**
Every piece of contextual language on this site — what a metric means, why it matters, what families should look for — is written or reviewed by Robert Benard, NP, a board-certified nurse practitioner with 20+ years of acute care hospital experience. The clinical framing comes from bedside experience, not an algorithm. When a report says "this is a red flag," that judgment comes from a clinician who has seen what understaffing looks like at 3am.

**Summary callout (use the methodology-note style):**
We use automation and AI to do what machines do well: process large datasets quickly and consistently. We use clinical expertise to do what machines cannot: interpret data in the context of real patient care. This combination is what allows a small team to provide transparency across every Medicare-certified nursing home in the country.

---

## NEW SECTION: "Who Reviews This Data" (insert after "How Reports Are Built")

### TOC entry: "Who Reviews This Data"
### Anchor: `#who-reviews`

### Content:

**Section title:** Who Reviews This Data

**Bio card (centered, use a styled card):**

**Robert Benard, NP**
AGACNP-BC · PMHNP-BC
Board-Certified Nurse Practitioner · 20+ Years Clinical Experience

Robert has spent 20+ years at the bedside in acute care hospitals. He reviews and interprets every report — the clinical context comes from real experience, not an algorithm.

contact@oversightreports.com

**Below bio — credibility paragraph:**
The Oversight Report is operated under DataLink Clinical LLC. This project is independent — it receives no funding from the nursing home industry, healthcare systems, insurance companies, or government agencies. Our revenue comes from optional paid services (data interpretation reports), not from the facilities we analyze. No facility can pay to change their data or how it is presented on this site.

---

## NEW SECTION: "Government Data Transparency Changes" (insert after "Data Freshness")

### TOC entry: "Data Transparency Changes"
### Anchor: `#transparency-changes`

### Content:

**Section title:** Government Data Transparency Changes

**Intro paragraph:**
We track changes to what the federal government makes publicly available. When CMS removes data from public view, we document it here and explain how it affects what families can see.

**Item 1 — Complaint Counts Removed (Feb 25, 2026)**
On February 25, 2026, CMS removed complaint investigation counts from the Care Compare website. Previously, families could see how many complaints had been filed against a nursing home. This information is no longer available on the official CMS site.

The Oversight Report reconstructed complaint counts from publicly available federal inspection records (CMS Health Deficiencies and Inspection Dates files). Each inspection record includes a flag indicating whether it was triggered by a complaint investigation. We count these flags per facility to calculate complaint investigation totals.

This is not estimated or modeled data — it is a direct count from the same federal records CMS previously used. We archived these datasets before the removal and will continue to provide this information as long as the underlying inspection records remain publicly available.

**Item 2 — Ownership Disclosure Suspension**
CMS has suspended certain enhanced ownership disclosure requirements that were part of the 2024 regulatory package. We continue to report ownership data using the currently available CMS Ownership file, which includes owner names, organization types, and ownership percentages. Readers should be aware that some previously proposed disclosure enhancements (such as detailed private equity and real estate investment trust identification) may not be reflected in current CMS data.

---

## NEW SECTION: "AI Governance & Data Integrity" (insert after "Who Reviews This Data")

### TOC entry: "AI Governance & Data Integrity"
### Anchor: `#ai-governance`

### Content:

**Section title:** AI Governance & Data Integrity

**Intro paragraph:**
AI tools can produce errors — including "hallucinations," where a system generates plausible-sounding but fabricated information. In healthcare, this is unacceptable. We have designed our process specifically to minimize this risk, informed by responsible AI principles from Harvard's Data Science Initiative and established governance frameworks.

**Four safeguard cards (use methodology-source-card style):**

**Card 1 — "Structured Data, Not Generated Text"**
Title: Ground Truth Verification
Content: Our AI tools process structured government datasets — rows and columns from CMS CSV files with defined fields and values. We do not ask AI to generate medical facts, predict outcomes, or produce clinical assessments from unstructured input. Every number displayed on this site can be verified against the original CMS source file. This design eliminates the most common source of AI hallucination: generating information that doesn't exist in the source data.

**Card 2 — "Human-in-the-Loop Review"**
Title: Clinician Oversight (HITL)
Content: The Human-in-the-Loop (HITL) model is widely recognized as the standard for responsible AI deployment in healthcare settings. At The Oversight Report, a board-certified nurse practitioner reviews all clinical interpretation, contextual language, and risk characterization. AI processes the data. A clinician decides what it means. This separation ensures that clinical judgment — the part that requires experience and accountability — is never delegated to a machine.

**Card 3 — "Reproducible and Auditable"**
Title: Full Traceability
Content: Every metric on this site includes its data source, calculation method, and the specific CMS dataset it comes from. Our methodology is fully documented. Any researcher, journalist, or regulator can download the same CMS files we use and reproduce our results independently. We do not use proprietary models, black-box scoring, or opaque algorithms. If you disagree with a number, you can check our work.

**Card 4 — "What We Verify"**
Title: Quality Checks
Content: Before any data reaches the site, we run automated validation checks against known constraints: facility counts match CMS totals, staffing hours fall within plausible ranges, deficiency counts reconcile across datasets, and penalty amounts match published CMS records. When discrepancies arise between datasets, we flag them rather than silently resolve them. We also monitor for CMS data quality issues — such as facilities reporting zero staffing hours while maintaining high star ratings — and note these anomalies explicitly.

**Closing note (use methodology-note style):**
Our approach is guided by principles from Harvard's Data Science Initiative frameworks for responsible AI governance: transparency in how systems work, accountability for outputs, human oversight of high-stakes decisions, and verifiability of results. We believe that using AI responsibly in healthcare means being honest about what it does, what it doesn't do, and who is accountable when something goes wrong. At The Oversight Report, the answer to that last question is always the same: the clinician whose name is on every report.

---

## UPDATED SECTION: "Data Sources" (add new cards to existing grid)

Add these cards to the existing data source grid:

**Card: MDS Quality Measures**
Clinical quality indicators reported quarterly by every nursing home, based on resident assessments. Includes antipsychotic medication rates, pressure ulcers, falls with injury, urinary tract infections, depression, and more. Source: CMS MDS 3.0.

**Card: Claims-Based Quality Measures**
Outcome measures derived from Medicare claims data — including 30-day re-hospitalization rates, emergency room visits, and discharge to community rates for short-stay (rehab) patients.

**Card: SNF Quality Reporting Program (QRP)**
Measures reported under the IMPACT Act, including functional improvement at discharge, Medicare spending per beneficiary, healthcare-associated infection rates, and COVID-19 vaccination rates for both residents and staff.

**Card: SNF Value-Based Purchasing (VBP)**
CMS performance scores and Medicare payment adjustments. Includes staff turnover rates, re-hospitalization performance, and whether the facility received a Medicare payment bonus or penalty.

**Card: Fire Safety Deficiencies**
Separate from health inspections. Fire code violations, sprinkler system issues, blocked exits, and emergency preparedness deficiencies. Every nursing home receives periodic fire safety inspections.

**Card: Special Focus Facility (SFF) List**
CMS designation for facilities with a pattern of serious quality issues. Approximately 88 of 14,713 facilities are designated SFF at any time. These facilities receive twice the normal inspection frequency.

---

## UPDATED SECTION: "Data Freshness" (update dates)

Update the current data version and dates to reflect the latest downloads:

- Current Data Version: February 2026
- Last updated: March 2026
- CMS datasets downloaded: March 2, 2026
- 18 CMS datasets integrated (up from original count)
