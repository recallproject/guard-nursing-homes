# Claude Code Overnight Instructions — CMS CRUSH Pipeline

## Quick Start
```bash
# Copy scripts to the data directory first
cp ~/Desktop/RB7-Project/healthcare_fraud/dmepos/overnight_scripts/*.py ~/Desktop/RB7-Project/healthcare_fraud/dmepos/overnight_scripts/ 2>/dev/null || true
# OR just run from wherever the scripts are:

# Option A: Run everything sequentially (recommended)
bash /path/to/run_all_overnight.sh

# Option B: Run as sub-agents (parallel where possible)
# See "Sub-Agent Strategy" below
```

## Sub-Agent Strategy for Claude Code

### Agent 1: Step 3 — AMC Scrub (RUN FIRST, blocks everything)
```
python3 step3_amc_scrub.py
```
- Input: `prosecutable_layer.csv`
- Output: `prosecutable_layer_clean.csv`, `amc_removed.csv`
- ~3 min
- **MUST complete before Steps 4, 5**

### Agent 2: Smoking Gun — SNF-DMEPOS Cross-Reference (CAN RUN IN PARALLEL with Step 3)
```
python3 step_smoking_gun_snf_dmepos.py
```
- Input: `enriched_fraud_rings.csv` (NOT prosecutable_layer_clean — uses its own logic)
- Also reads: `nursing_home/ownership.csv`, `nursing_home/provider_info.csv`, `pbj_staffing_2023q3.csv`
- Output: `snf_dmepos_crossref.csv`, `snf_dmepos_case_studies.csv`, `snf_dmepos_summary.txt`
- ~10-15 min (biggest job — lots of name matching)
- **THIS IS THE PRIORITY OUTPUT**

### Agent 3: Step 4 — DMEPOS Taxonomy Filter (AFTER Step 3)
```
python3 step4_dmepos_taxonomy_filter.py
```
- Input: `prosecutable_layer_clean.csv` (from Step 3)
- Output: `dmepos_suppliers_only.csv`
- ~2 min

### Agent 4: Step 5 — Phone × Markup Cross-Reference (AFTER Step 3)
```
python3 step5_phone_markup_crossref.py
```
- Input: `phone_clusters.csv`, `prosecutable_layer_clean.csv` (from Step 3), `dmepos_geo_aggregate.csv`
- Output: `phone_markup_outliers.csv`
- ~5 min

### Agent 5: Step 6 — Case Study Generator (AFTER Steps 2-5)
```
python3 step6_case_study_generator.py
```
- Input: ALL previous outputs
- Output: `case_studies_data.csv`, `case_studies_report.txt`
- ~2 min
- **RUN LAST**

## Dependency Graph
```
Step 3 (AMC Scrub) ──→ Step 4 (Taxonomy) ──→ Step 6 (Case Studies)
         │                                          ↑
         └──────────→ Step 5 (Phone×Markup) ────────┘
                                                    ↑
Smoking Gun (parallel) ─────────────────────────────┘
```

## Parallelization
- **Wave 1** (parallel): Step 3 + Smoking Gun
- **Wave 2** (after Step 3): Step 4 + Step 5 (parallel)
- **Wave 3** (after all): Step 6

## Expected Output Files
After completion, check `~/Desktop/RB7-Project/healthcare_fraud/dmepos/` for:

| File | Description | Priority |
|------|-------------|----------|
| `snf_dmepos_crossref.csv` | THE smoking gun — SNF owners who are also DMEPOS suppliers | ⭐⭐⭐ |
| `snf_dmepos_summary.txt` | Top 10 case studies formatted | ⭐⭐⭐ |
| `case_studies_report.txt` | All case studies formatted for RFI | ⭐⭐ |
| `prosecutable_layer_clean.csv` | AMC-scrubbed prosecutable NPIs | ⭐⭐ |
| `dmepos_suppliers_only.csv` | Actual DMEPOS suppliers isolated | ⭐ |
| `phone_markup_outliers.csv` | Phone cluster fraud indicators | ⭐ |

## Validation After Run
Check these summary files for results:
```bash
cat ~/Desktop/RB7-Project/healthcare_fraud/dmepos/amc_scrub_summary.txt
cat ~/Desktop/RB7-Project/healthcare_fraud/dmepos/snf_dmepos_summary.txt
cat ~/Desktop/RB7-Project/healthcare_fraud/dmepos/dmepos_taxonomy_summary.txt
cat ~/Desktop/RB7-Project/healthcare_fraud/dmepos/phone_markup_summary.txt
```

## What We're Looking For (the "so what")
The smoking gun is finding a person who:
1. Is listed as an owner/authorized official of a DMEPOS supplier
2. Is ALSO listed as an owner/manager of a nursing home
3. That nursing home has terrible staffing (< 0.5 RN hours/resident/day)
4. The DMEPOS supplier is billing surgical dressings (A6010-A6461)

This proves the silo gap CMS admits they have — nobody is connecting
nursing home quality data with DMEPOS supplier fraud.
