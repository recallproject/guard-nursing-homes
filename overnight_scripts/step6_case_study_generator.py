#!/usr/bin/env python3
"""
STEP 6: Auto Case Study Generator
====================================
Takes the highest-scoring matches from the smoking gun cross-reference
and phone/markup analysis, and generates formatted case studies ready
for the RFI comment.

Input:  snf_dmepos_crossref.csv (from smoking gun)
        phone_markup_outliers.csv (from step 5)
        leie_hits.csv
        prosecutable_layer_clean.csv
Output: case_studies_report.txt (formatted for RFI insertion)
        case_studies_data.csv (structured data)

Run time estimate: ~2-3 minutes
"""

import pandas as pd
import os
import time

BASE = os.path.expanduser("~/Desktop/RB7-Project/healthcare_fraud/dmepos")

print("=" * 70)
print("STEP 6: AUTO CASE STUDY GENERATOR")
print("=" * 70)

start = time.time()

case_studies = []
study_num = 0

# ========================================================================
# Source 1: SNF-DMEPOS smoking gun matches
# ========================================================================
snf_path = os.path.join(BASE, "snf_dmepos_crossref.csv")
if os.path.exists(snf_path):
    print("\n[1/3] Loading SNF-DMEPOS cross-reference matches...")
    snf = pd.read_csv(snf_path, dtype=str, low_memory=False)
    snf['Suspicion_Score'] = pd.to_numeric(snf['Suspicion_Score'], errors='coerce')
    snf = snf.sort_values('Suspicion_Score', ascending=False)

    # Group by DMEPOS NPI to deduplicate
    top_snf = snf.drop_duplicates(subset='DMEPOS_NPI').head(20)

    for _, row in top_snf.iterrows():
        study_num += 1
        case = {
            'Study_Number': study_num,
            'Source': 'SNF-DMEPOS Cross-Reference',
            'Category': 'Ghost SNF Owner',
            'Suspicion_Score': row.get('Suspicion_Score', ''),
            'Primary_NPI': row.get('DMEPOS_NPI', ''),
            'Primary_Name': row.get('DMEPOS_Name', ''),
            'Primary_Address': f"{row.get('DMEPOS_Address', '')} {row.get('DMEPOS_City', '')}, {row.get('DMEPOS_State', '')}",
            'Primary_Taxonomy': row.get('DMEPOS_Taxonomy', ''),
            'LEIE_Status': row.get('DMEPOS_LEIE_Flag', ''),
            'Risk_Tier': row.get('DMEPOS_Risk_Tier', ''),
            'Match_Type': row.get('Match_Type', ''),
            'Connected_SNF_CCN': row.get('SNF_CCN', ''),
            'Connected_SNF_Name': row.get('SNF_Name', ''),
            'SNF_Rating': row.get('SNF_Overall_Rating', ''),
            'SNF_Staffing_Rating': row.get('SNF_Staffing_Rating', ''),
            'SNF_RN_HPRD': row.get('PBJ_Avg_RN_HPRD', ''),
            'SNF_Chain': row.get('SNF_Chain', ''),
            'SNF_Fines': row.get('SNF_Fines_Total', ''),
            'Red_Flags': [],
        }

        # Build red flags
        flags = []
        if row.get('Match_Type') == 'NAME_MATCH':
            flags.append(f"Auth official matches SNF owner: {row.get('Matched_Name', '')}")
        if row.get('Match_Type') == 'ADDRESS_MATCH':
            flags.append("DMEPOS supplier registered at same address as nursing facility")
        if row.get('DMEPOS_LEIE_Flag') == 'NPI_MATCH':
            flags.append("DMEPOS provider is EXCLUDED from Medicare (LEIE NPI match)")
        try:
            rn_hours = float(row.get('PBJ_Avg_RN_HPRD', 999))
            if rn_hours < 0.5:
                flags.append(f"Connected SNF has only {rn_hours:.2f} RN hours/resident/day — insufficient for wound care")
        except (ValueError, TypeError):
            pass
        try:
            rating = float(row.get('SNF_Overall_Rating', 5))
            if rating <= 2:
                flags.append(f"Connected SNF rated {int(rating)}-star (bottom tier)")
        except (ValueError, TypeError):
            pass

        case['Red_Flags'] = '; '.join(flags)
        case_studies.append(case)

    print(f"  Added {len(top_snf)} SNF-DMEPOS case studies")
else:
    print("  [SKIP] snf_dmepos_crossref.csv not found — run smoking gun first")

# ========================================================================
# Source 2: LEIE hits with cluster context
# ========================================================================
print("\n[2/3] Loading LEIE hits for case studies...")
leie_path = os.path.join(BASE, "leie_hits.csv")
if os.path.exists(leie_path):
    leie = pd.read_csv(leie_path, dtype=str, low_memory=False)
    # Focus on NPI-matched (high confidence)
    leie_npi = leie[leie['LEIE_Flag'] == 'NPI_MATCH'].copy()
    leie_npi['Cluster_Size_int'] = pd.to_numeric(leie_npi['Cluster_Size'], errors='coerce')

    # Most interesting: excluded providers at mid-range clusters (fraud ring size)
    interesting_leie = leie_npi[
        (leie_npi['Cluster_Size_int'] >= 4) &
        (leie_npi['Cluster_Size_int'] <= 50)
    ].sort_values('Cluster_Size_int', ascending=False).head(15)

    for _, row in interesting_leie.iterrows():
        study_num += 1
        flags = [
            f"Provider excluded from Medicare (LEIE NPI match)",
            f"Located at address cluster with {row.get('Cluster_Size', '?')} other NPIs",
        ]
        if row.get('LEIE_Detail'):
            flags.append(f"Exclusion detail: {row['LEIE_Detail'][:100]}")

        case_studies.append({
            'Study_Number': study_num,
            'Source': 'LEIE Cross-Reference',
            'Category': 'Excluded Provider in Active Cluster',
            'Suspicion_Score': '',
            'Primary_NPI': row.get('NPI', ''),
            'Primary_Name': row.get('Name', ''),
            'Primary_Address': f"{row.get('Street_Address', '')} {row.get('City', '')}, {row.get('State', '')}",
            'Primary_Taxonomy': row.get('Taxonomy', ''),
            'LEIE_Status': 'NPI_MATCH',
            'Risk_Tier': row.get('Risk_Tier', ''),
            'Match_Type': 'LEIE',
            'Connected_SNF_CCN': '',
            'Connected_SNF_Name': '',
            'SNF_Rating': '',
            'SNF_Staffing_Rating': '',
            'SNF_RN_HPRD': '',
            'SNF_Chain': '',
            'SNF_Fines': '',
            'Red_Flags': '; '.join(flags),
        })

    print(f"  Added {len(interesting_leie)} LEIE case studies")
else:
    print("  [SKIP] leie_hits.csv not found")

# ========================================================================
# Source 3: Phone cluster outliers
# ========================================================================
print("\n[3/3] Loading phone cluster outliers...")
phone_path = os.path.join(BASE, "phone_markup_outliers.csv")
if os.path.exists(phone_path):
    phone = pd.read_csv(phone_path, dtype=str, low_memory=False)
    phone['Phone_Risk_Score'] = pd.to_numeric(phone['Phone_Risk_Score'], errors='coerce')

    top_phone = phone.sort_values('Phone_Risk_Score', ascending=False).drop_duplicates(
        subset='Phone').head(10)

    for _, row in top_phone.iterrows():
        study_num += 1
        flags = [
            f"Phone {row.get('Phone', '?')} shared by {row.get('Phone_Cluster_Size', '?')} NPIs",
        ]
        if row.get('LEIE_Flag') == 'NPI_MATCH':
            flags.append("Provider is EXCLUDED from Medicare")

        case_studies.append({
            'Study_Number': study_num,
            'Source': 'Phone Cluster Analysis',
            'Category': 'Shared Phone Infrastructure',
            'Suspicion_Score': row.get('Phone_Risk_Score', ''),
            'Primary_NPI': row.get('NPI', ''),
            'Primary_Name': row.get('Name', ''),
            'Primary_Address': f"{row.get('Street_Address', '')} {row.get('City', '')}, {row.get('State', '')}",
            'Primary_Taxonomy': row.get('Taxonomy', ''),
            'LEIE_Status': row.get('LEIE_Flag', ''),
            'Risk_Tier': row.get('Risk_Tier', ''),
            'Match_Type': 'PHONE',
            'Connected_SNF_CCN': '',
            'Connected_SNF_Name': '',
            'SNF_Rating': '',
            'SNF_Staffing_Rating': '',
            'SNF_RN_HPRD': '',
            'SNF_Chain': '',
            'SNF_Fines': '',
            'Red_Flags': '; '.join(flags),
        })

    print(f"  Added {len(top_phone)} phone cluster case studies")
else:
    print("  [SKIP] phone_markup_outliers.csv not found — run step 5 first")

# ========================================================================
# Generate formatted output
# ========================================================================
print(f"\nTotal case studies generated: {len(case_studies)}")

# Save CSV
df_cases = pd.DataFrame(case_studies)
df_cases.to_csv(os.path.join(BASE, "case_studies_data.csv"), index=False)

# Generate formatted report
report = """======================================================================
CMS CRUSH RFI — CASE STUDIES FROM DMEPOS FRAUD DETECTION PIPELINE
======================================================================
Prepared by: OversightReports.com / DataLink Clinical LLC
Data Sources: NPPES NPI Registry, OIG LEIE, CMS PBJ Staffing,
              CMS Nursing Home Ownership, DMEPOS Supplier PUFs
======================================================================

"""

for case in case_studies:
    report += f"\n{'='*60}\n"
    report += f"CASE STUDY #{case['Study_Number']}: {case['Category']}\n"
    report += f"Source: {case['Source']}\n"
    if case.get('Suspicion_Score'):
        report += f"Suspicion Score: {case['Suspicion_Score']}\n"
    report += f"{'='*60}\n\n"

    report += f"DMEPOS Entity:\n"
    report += f"  NPI: {case['Primary_NPI']}\n"
    report += f"  Name: {case['Primary_Name']}\n"
    report += f"  Address: {case['Primary_Address']}\n"
    report += f"  Taxonomy: {case['Primary_Taxonomy']}\n"
    report += f"  LEIE Status: {case['LEIE_Status']}\n"
    report += f"  Risk Tier: {case['Risk_Tier']}\n"

    if case.get('Connected_SNF_CCN'):
        report += f"\nConnected Nursing Facility:\n"
        report += f"  CCN: {case['Connected_SNF_CCN']}\n"
        report += f"  Name: {case['Connected_SNF_Name']}\n"
        report += f"  Overall Rating: {case['SNF_Rating']} stars\n"
        report += f"  Staffing Rating: {case['SNF_Staffing_Rating']}\n"
        report += f"  RN Hours/Resident/Day: {case['SNF_RN_HPRD']}\n"
        report += f"  Chain: {case['SNF_Chain']}\n"
        report += f"  Total Fines: ${case['SNF_Fines']}\n"

    report += f"\nRED FLAGS:\n"
    for flag in case['Red_Flags'].split('; '):
        if flag:
            report += f"  ⚠ {flag}\n"

    report += f"\nCLINICAL PLAUSIBILITY NOTE:\n"
    if case['Category'] == 'Ghost SNF Owner':
        try:
            rn = float(case.get('SNF_RN_HPRD', 999))
            if rn < 0.5:
                report += f"  This facility averages {rn:.2f} RN hours per resident per day.\n"
                report += f"  For context, a facility with this staffing level cannot sustain\n"
                report += f"  the wound assessment, treatment planning, and documentation\n"
                report += f"  required for the surgical dressing orders that DMEPOS suppliers\n"
                report += f"  at this address would be billing Medicare for.\n"
            else:
                report += f"  Staffing data suggests this facility may have adequate nursing\n"
                report += f"  coverage, but the ownership overlap warrants investigation.\n"
        except (ValueError, TypeError):
            report += f"  Ownership overlap between DMEPOS supplier and nursing facility\n"
            report += f"  creates a conflict of interest worthy of investigation.\n"
    elif case['Category'] == 'Excluded Provider in Active Cluster':
        report += f"  This provider has been excluded from Medicare but remains registered\n"
        report += f"  at an address with {case.get('Red_Flags', '').split('with')[1].split('other')[0].strip() if 'with' in case.get('Red_Flags', '') else 'multiple'} other NPIs,\n"
        report += f"  suggesting the billing operation may continue under different NPIs.\n"
    else:
        report += f"  Shared phone infrastructure across multiple NPIs is a common\n"
        report += f"  indicator of coordinated billing operations.\n"

    report += "\n"

report += f"""
======================================================================
METHODOLOGY NOTE
======================================================================
These case studies were identified through a multi-layer analysis:

1. Address Clustering: Grouped all NPIs by normalized street address
2. LEIE Cross-Reference: Matched NPIs and names against the OIG
   exclusion list to identify banned providers
3. Phone Clustering: Identified NPIs sharing phone numbers (3+ NPIs)
4. SNF-DMEPOS Bridge: Cross-referenced nursing home ownership records
   with DMEPOS supplier authorized officials and addresses
5. Clinical Plausibility: Applied nursing staffing analysis (PBJ data)
   to assess whether facilities have the staff to support the wound
   care services that DMEPOS orders would require

This analysis uses exclusively PUBLIC DATA available through CMS and
NPPES downloads — no proprietary data or paid databases.

Total NPIs analyzed: ~2.2 million
Total case studies generated: {len(case_studies)}
"""

with open(os.path.join(BASE, "case_studies_report.txt"), "w") as f:
    f.write(report)

elapsed = time.time() - start
print(f"\nSaved case_studies_data.csv ({len(case_studies)} studies)")
print(f"Saved case_studies_report.txt")
print(f"Runtime: {elapsed:.1f} seconds")
print("\nSTEP 6 COMPLETE")
