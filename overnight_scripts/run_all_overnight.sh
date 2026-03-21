#!/bin/bash
# ======================================================================
# OVERNIGHT RUNNER: CMS CRUSH DMEPOS Fraud Detection Pipeline
# ======================================================================
# Run this script to execute all analysis steps sequentially.
# Steps MUST run in order because each depends on the previous output.
#
# Usage: bash ~/Desktop/RB7-Project/healthcare_fraud/dmepos/overnight_scripts/run_all_overnight.sh
#
# Estimated total runtime: 25-40 minutes
# ======================================================================

set -e  # Exit on any error

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPTS_DIR/overnight_run_$(date +%Y%m%d_%H%M%S).log"

echo "======================================================================" | tee "$LOG_FILE"
echo "OVERNIGHT PIPELINE STARTED: $(date)" | tee -a "$LOG_FILE"
echo "======================================================================" | tee -a "$LOG_FILE"

# Step 3: AMC Scrub (depends on: prosecutable_layer.csv from step 2)
echo "" | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] RUNNING STEP 3: AMC Scrub..." | tee -a "$LOG_FILE"
python3 "$SCRIPTS_DIR/step3_amc_scrub.py" 2>&1 | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] STEP 3 DONE" | tee -a "$LOG_FILE"

# Smoking Gun: SNF-DMEPOS Cross-Reference (depends on: enriched_fraud_rings.csv + nursing home data)
echo "" | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] RUNNING SMOKING GUN: SNF-DMEPOS Cross-Reference..." | tee -a "$LOG_FILE"
python3 "$SCRIPTS_DIR/step_smoking_gun_snf_dmepos.py" 2>&1 | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] SMOKING GUN DONE" | tee -a "$LOG_FILE"

# Step 4: DMEPOS Taxonomy Filter (depends on: prosecutable_layer_clean.csv from step 3)
echo "" | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] RUNNING STEP 4: DMEPOS Taxonomy Filter..." | tee -a "$LOG_FILE"
python3 "$SCRIPTS_DIR/step4_dmepos_taxonomy_filter.py" 2>&1 | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] STEP 4 DONE" | tee -a "$LOG_FILE"

# Step 5: Phone × Markup Cross-Reference (depends on: phone_clusters.csv, prosecutable_layer_clean.csv)
echo "" | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] RUNNING STEP 5: Phone × Markup Cross-Reference..." | tee -a "$LOG_FILE"
python3 "$SCRIPTS_DIR/step5_phone_markup_crossref.py" 2>&1 | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] STEP 5 DONE" | tee -a "$LOG_FILE"

# Step 6: Case Study Generator (depends on: ALL previous outputs)
echo "" | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] RUNNING STEP 6: Case Study Generator..." | tee -a "$LOG_FILE"
python3 "$SCRIPTS_DIR/step6_case_study_generator.py" 2>&1 | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] STEP 6 DONE" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "======================================================================" | tee -a "$LOG_FILE"
echo "OVERNIGHT PIPELINE COMPLETE: $(date)" | tee -a "$LOG_FILE"
echo "======================================================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "OUTPUT FILES:" | tee -a "$LOG_FILE"
echo "  ~/Desktop/RB7-Project/healthcare_fraud/dmepos/" | tee -a "$LOG_FILE"
echo "    - prosecutable_layer_clean.csv  (Step 3: AMC-scrubbed)" | tee -a "$LOG_FILE"
echo "    - amc_removed.csv              (Step 3: what was removed)" | tee -a "$LOG_FILE"
echo "    - snf_dmepos_crossref.csv      (SMOKING GUN: all matches)" | tee -a "$LOG_FILE"
echo "    - snf_dmepos_case_studies.csv   (SMOKING GUN: top 50)" | tee -a "$LOG_FILE"
echo "    - dmepos_suppliers_only.csv     (Step 4: DMEPOS taxonomy)" | tee -a "$LOG_FILE"
echo "    - phone_markup_outliers.csv     (Step 5: phone × markup)" | tee -a "$LOG_FILE"
echo "    - case_studies_data.csv         (Step 6: structured cases)" | tee -a "$LOG_FILE"
echo "    - case_studies_report.txt       (Step 6: formatted report)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "SUMMARY FILES:" | tee -a "$LOG_FILE"
echo "    - amc_scrub_summary.txt" | tee -a "$LOG_FILE"
echo "    - snf_dmepos_summary.txt" | tee -a "$LOG_FILE"
echo "    - dmepos_taxonomy_summary.txt" | tee -a "$LOG_FILE"
echo "    - phone_markup_summary.txt" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Log saved to: $LOG_FILE" | tee -a "$LOG_FILE"
