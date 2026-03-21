#!/usr/bin/env python3
"""
SMOKING GUN: SNF-DMEPOS Cross-Reference
=========================================
The play CMS says they can't do — bridging the silo between nursing home
oversight data and DMEPOS supplier fraud detection.

This script cross-references:
1. Nursing home OWNERSHIP data (who owns/manages each facility)
2. DMEPOS supplier NPIs from our enriched fraud rings
3. PBJ staffing data (actual nursing hours per resident)
4. Provider info (star ratings, deficiencies, beds)

Looking for:
- Same PERSON appears as nursing home owner AND DMEPOS supplier auth official
- Same ADDRESS appears for both a nursing home and a DMEPOS supplier
- Facilities with terrible staffing + connected DMEPOS suppliers billing
  surgical dressings (57.6% improper payment rate)

Input:  enriched_fraud_rings.csv, ownership.csv, provider_info.csv,
        pbj_staffing_2023q3.csv, leie_hits.csv
Output: snf_dmepos_crossref.csv (the smoking gun matches)
        snf_dmepos_summary.txt
        snf_dmepos_case_studies.csv (top 50 most suspicious networks)

Run time estimate: ~10-15 minutes (large files)
"""

import pandas as pd
import os
import time
import re
from collections import defaultdict

BASE_DMEPOS = os.path.expanduser("~/Desktop/RB7-Project/healthcare_fraud/dmepos")
BASE_NH = os.path.expanduser("~/Desktop/RB7-Project/healthcare_fraud/nursing_home")

def normalize_name(name):
    """Normalize name for matching: LAST, FIRST -> standardized"""
    if pd.isna(name):
        return ""
    name = str(name).upper().strip()
    # Remove suffixes
    name = re.sub(r'\b(JR|SR|II|III|IV|MD|DO|NP|PA|RN|LPN|DPM|PHD|MBA)\b', '', name)
    # Remove punctuation
    name = re.sub(r'[^A-Z\s,]', '', name)
    # Normalize whitespace
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def normalize_address(addr):
    """Normalize address for matching"""
    if pd.isna(addr):
        return ""
    addr = str(addr).upper().strip()
    # Standard abbreviations
    replacements = {
        'STREET': 'ST', 'AVENUE': 'AVE', 'BOULEVARD': 'BLVD',
        'DRIVE': 'DR', 'ROAD': 'RD', 'LANE': 'LN', 'COURT': 'CT',
        'PLACE': 'PL', 'CIRCLE': 'CIR', 'HIGHWAY': 'HWY',
        'SUITE': 'STE', 'NORTH': 'N', 'SOUTH': 'S', 'EAST': 'E', 'WEST': 'W',
    }
    for full, abbr in replacements.items():
        addr = re.sub(r'\b' + full + r'\b', abbr, addr)
    # Remove unit/suite numbers for broader matching
    addr_base = re.sub(r'\s*(STE|UNIT|APT|#)\s*\S+', '', addr)
    addr_base = re.sub(r'[^A-Z0-9\s]', '', addr_base)
    addr_base = re.sub(r'\s+', ' ', addr_base).strip()
    return addr_base

print("=" * 70)
print("SMOKING GUN: SNF-DMEPOS CROSS-REFERENCE")
print("=" * 70)

start = time.time()

# ========================================================================
# 1. Load nursing home ownership data
# ========================================================================
print("\n[1/6] Loading nursing home ownership data...")
ownership = pd.read_csv(os.path.join(BASE_NH, "ownership.csv"), dtype=str, low_memory=False)
print(f"  Loaded {len(ownership):,} ownership records")
print(f"  Unique facilities: {ownership['CMS Certification Number (CCN)'].nunique():,}")
print(f"  Unique owners: {ownership['Owner Name'].nunique():,}")

# Normalize owner names
ownership['owner_norm'] = ownership['Owner Name'].apply(normalize_name)
ownership['addr_norm'] = ownership['Provider Address'].apply(normalize_address)

# Build owner-to-facility mapping
owner_to_facilities = defaultdict(set)
for _, row in ownership.iterrows():
    if row['owner_norm'] and len(row['owner_norm']) > 3:
        owner_to_facilities[row['owner_norm']].add(row['CMS Certification Number (CCN)'])

# Build address-to-facility mapping
addr_to_facilities = defaultdict(set)
for _, row in ownership.iterrows():
    if row['addr_norm'] and len(row['addr_norm']) > 5:
        key = f"{row['addr_norm']}|{str(row['City/Town']).upper()}|{str(row['State']).upper()}"
        addr_to_facilities[key].add(row['CMS Certification Number (CCN)'])

print(f"  Unique normalized owner names: {len(owner_to_facilities):,}")
print(f"  Unique normalized addresses: {len(addr_to_facilities):,}")

# ========================================================================
# 2. Load DMEPOS enriched data (use prosecutable layer if available)
# ========================================================================
print("\n[2/6] Loading DMEPOS supplier data...")
prosecutable_path = os.path.join(BASE_DMEPOS, "prosecutable_layer_clean.csv")
if not os.path.exists(prosecutable_path):
    prosecutable_path = os.path.join(BASE_DMEPOS, "prosecutable_layer.csv")
if not os.path.exists(prosecutable_path):
    prosecutable_path = os.path.join(BASE_DMEPOS, "enriched_fraud_rings.csv")

dmepos = pd.read_csv(prosecutable_path, dtype=str, low_memory=False)
print(f"  Loaded {len(dmepos):,} DMEPOS NPIs from {os.path.basename(prosecutable_path)}")

# Normalize auth official names and addresses
dmepos['auth_norm'] = dmepos['Auth_Official'].apply(normalize_name)
dmepos['addr_norm'] = dmepos['Street_Address'].apply(normalize_address)
dmepos['city_state'] = dmepos['City'].str.upper().str.strip() + '|' + dmepos['State'].str.upper().str.strip()
dmepos['addr_key'] = dmepos['addr_norm'] + '|' + dmepos['city_state']

# DMEPOS-specific taxonomy codes (the suppliers we care about)
DMEPOS_TAXONOMY_CODES = [
    '332B00000X',  # Durable Medical Equipment & Medical Supplies
    '335E00000X',  # Prosthetic/Orthotic Supplier
    '332S00000X',  # Hearing Aid Equipment
    '335G00000X',  # Medical Foods Supplier
    '335U00000X',  # Organ Procurement Organization
    '332U00000X',  # Home Delivered Meals
    '331L00000X',  # Blood Bank
    '332H00000X',  # Home Health
    '3336C0003X',  # Pharmacy — Clinic
    '3336C0004X',  # Pharmacy — Community/Retail
]

# Filter to DMEPOS-related or keep all (we want auth official matches regardless)
dmepos_suppliers = dmepos[dmepos['Taxonomy'].isin(DMEPOS_TAXONOMY_CODES)].copy()
print(f"  DMEPOS-taxonomy suppliers: {len(dmepos_suppliers):,}")

# ========================================================================
# 3. CROSS-REFERENCE: Name matching (auth official = facility owner)
# ========================================================================
print("\n[3/6] Cross-referencing names: DMEPOS auth officials vs SNF owners...")

name_matches = []
matched_names = set()

# Get unique auth officials from DMEPOS
dmepos_auth_names = dmepos[dmepos['auth_norm'].str.len() > 3]['auth_norm'].unique()
print(f"  Unique DMEPOS auth officials to check: {len(dmepos_auth_names):,}")

match_count = 0
for name in dmepos_auth_names:
    if name in owner_to_facilities:
        matched_names.add(name)
        facilities = owner_to_facilities[name]
        # Get all DMEPOS NPIs with this auth official
        npis = dmepos[dmepos['auth_norm'] == name]
        for _, npi_row in npis.iterrows():
            for ccn in facilities:
                name_matches.append({
                    'Match_Type': 'NAME_MATCH',
                    'Matched_Name': name,
                    'DMEPOS_NPI': npi_row['NPI'],
                    'DMEPOS_Name': npi_row.get('Name', ''),
                    'DMEPOS_Address': npi_row.get('Street_Address', ''),
                    'DMEPOS_City': npi_row.get('City', ''),
                    'DMEPOS_State': npi_row.get('State', ''),
                    'DMEPOS_Taxonomy': npi_row.get('Taxonomy', ''),
                    'DMEPOS_Cluster_Size': npi_row.get('Cluster_Size', ''),
                    'DMEPOS_LEIE_Flag': npi_row.get('LEIE_Flag', ''),
                    'DMEPOS_Risk_Tier': npi_row.get('Risk_Tier', ''),
                    'SNF_CCN': ccn,
                })
        match_count += 1

print(f"  Name matches found: {match_count:,} unique names")
print(f"  Total name match records: {len(name_matches):,}")

# ========================================================================
# 4. CROSS-REFERENCE: Address matching (same address for SNF and DMEPOS)
# ========================================================================
print("\n[4/6] Cross-referencing addresses: DMEPOS locations vs SNF locations...")

addr_matches = []
dmepos_addr_keys = set(dmepos[dmepos['addr_key'].str.len() > 5]['addr_key'].unique())
snf_addr_keys = set(addr_to_facilities.keys())

shared_addrs = dmepos_addr_keys & snf_addr_keys
print(f"  DMEPOS unique addresses: {len(dmepos_addr_keys):,}")
print(f"  SNF unique addresses: {len(snf_addr_keys):,}")
print(f"  Shared addresses: {len(shared_addrs):,}")

for addr_key in shared_addrs:
    ccns = addr_to_facilities[addr_key]
    npis = dmepos[dmepos['addr_key'] == addr_key]
    for _, npi_row in npis.iterrows():
        for ccn in ccns:
            addr_matches.append({
                'Match_Type': 'ADDRESS_MATCH',
                'Matched_Address': addr_key,
                'DMEPOS_NPI': npi_row['NPI'],
                'DMEPOS_Name': npi_row.get('Name', ''),
                'DMEPOS_Address': npi_row.get('Street_Address', ''),
                'DMEPOS_City': npi_row.get('City', ''),
                'DMEPOS_State': npi_row.get('State', ''),
                'DMEPOS_Taxonomy': npi_row.get('Taxonomy', ''),
                'DMEPOS_Cluster_Size': npi_row.get('Cluster_Size', ''),
                'DMEPOS_LEIE_Flag': npi_row.get('LEIE_Flag', ''),
                'DMEPOS_Risk_Tier': npi_row.get('Risk_Tier', ''),
                'SNF_CCN': ccn,
            })

print(f"  Address match records: {len(addr_matches):,}")

# ========================================================================
# 5. Enrich matches with SNF provider info + staffing data
# ========================================================================
print("\n[5/6] Enriching matches with SNF provider info and staffing data...")

# Load provider info
provider_info = pd.read_csv(os.path.join(BASE_NH, "provider_info.csv"), dtype=str, low_memory=False)
provider_info_map = {}
for _, row in provider_info.iterrows():
    ccn = row['CMS Certification Number (CCN)']
    provider_info_map[ccn] = {
        'SNF_Name': row.get('Provider Name', ''),
        'SNF_Address': row.get('Provider Address', ''),
        'SNF_City': row.get('City/Town', ''),
        'SNF_State': row.get('State', ''),
        'SNF_Beds': row.get('Number of Certified Beds', ''),
        'SNF_Avg_Residents': row.get('Average Number of Residents per Day', ''),
        'SNF_Overall_Rating': row.get('Overall Rating', ''),
        'SNF_Health_Rating': row.get('Health Inspection Rating', ''),
        'SNF_Staffing_Rating': row.get('Staffing Rating', ''),
        'SNF_RN_Hours': row.get('Reported RN Staffing Hours per Resident per Day', ''),
        'SNF_Total_Nurse_Hours': row.get('Reported Total Nurse Staffing Hours per Resident per Day', ''),
        'SNF_Ownership_Type': row.get('Ownership Type', ''),
        'SNF_Chain': row.get('Chain Name', ''),
        'SNF_Fines_Total': row.get('Total Amount of Fines in Dollars', ''),
        'SNF_Penalties_Count': row.get('Total Number of Penalties', ''),
        'SNF_Deficiencies_C1': row.get('Rating Cycle 1 Total Number of Health Deficiencies', ''),
        'SNF_Special_Focus': row.get('Special Focus Status', ''),
    }
print(f"  Loaded provider info for {len(provider_info_map):,} facilities")

# Load PBJ staffing data (most recent available)
pbj_path = os.path.join(BASE_DMEPOS, "pbj_staffing_2023q3.csv")
if not os.path.exists(pbj_path):
    pbj_path = os.path.join(BASE_DMEPOS, "pbj_staffing_2023q1.csv")

print(f"  Loading PBJ staffing data from {os.path.basename(pbj_path)}...")
pbj = pd.read_csv(pbj_path, dtype=str, low_memory=False)

# Calculate average staffing per facility
pbj['Hrs_RN_num'] = pd.to_numeric(pbj['Hrs_RN'], errors='coerce')
pbj['Hrs_CNA_num'] = pd.to_numeric(pbj['Hrs_CNA'], errors='coerce')
pbj['Hrs_LPN_num'] = pd.to_numeric(pbj['Hrs_LPN'], errors='coerce')
pbj['MDScensus_num'] = pd.to_numeric(pbj['MDScensus'], errors='coerce')

# Per-day staffing per resident
pbj['rn_hprd'] = pbj['Hrs_RN_num'] / pbj['MDScensus_num'].replace(0, float('nan'))
pbj['cna_hprd'] = pbj['Hrs_CNA_num'] / pbj['MDScensus_num'].replace(0, float('nan'))
pbj['total_nurse_hprd'] = (pbj['Hrs_RN_num'] + pbj['Hrs_LPN_num'] + pbj['Hrs_CNA_num']) / pbj['MDScensus_num'].replace(0, float('nan'))

# Average across all days for each facility
pbj_avg = pbj.groupby('PROVNUM').agg({
    'rn_hprd': 'mean',
    'cna_hprd': 'mean',
    'total_nurse_hprd': 'mean',
    'MDScensus_num': 'mean',
}).reset_index()
pbj_avg.columns = ['PROVNUM', 'PBJ_Avg_RN_HPRD', 'PBJ_Avg_CNA_HPRD', 'PBJ_Avg_Total_HPRD', 'PBJ_Avg_Census']
pbj_map = pbj_avg.set_index('PROVNUM').to_dict('index')
print(f"  PBJ staffing averages for {len(pbj_map):,} facilities")

# Combine all matches
all_matches = name_matches + addr_matches
print(f"\n  Total cross-reference matches: {len(all_matches):,}")

# Enrich with SNF data
enriched = []
for match in all_matches:
    ccn = match['SNF_CCN']
    # Add provider info
    if ccn in provider_info_map:
        match.update(provider_info_map[ccn])
    # Add PBJ staffing
    if ccn in pbj_map:
        pbj_data = pbj_map[ccn]
        match['PBJ_Avg_RN_HPRD'] = round(pbj_data.get('PBJ_Avg_RN_HPRD', 0), 3)
        match['PBJ_Avg_CNA_HPRD'] = round(pbj_data.get('PBJ_Avg_CNA_HPRD', 0), 3)
        match['PBJ_Avg_Total_HPRD'] = round(pbj_data.get('PBJ_Avg_Total_HPRD', 0), 3)
        match['PBJ_Avg_Census'] = round(pbj_data.get('PBJ_Avg_Census', 0), 1)
    enriched.append(match)

# ========================================================================
# 6. Score and rank — find the smoking guns
# ========================================================================
print("\n[6/6] Scoring and ranking matches...")

df_matches = pd.DataFrame(enriched)

if len(df_matches) > 0:
    # Convert numeric fields
    for col in ['SNF_Overall_Rating', 'SNF_Staffing_Rating', 'SNF_RN_Hours',
                'PBJ_Avg_RN_HPRD', 'PBJ_Avg_Total_HPRD', 'SNF_Beds']:
        if col in df_matches.columns:
            df_matches[col] = pd.to_numeric(df_matches[col], errors='coerce')

    # SUSPICION SCORE
    # Higher = more suspicious
    df_matches['Suspicion_Score'] = 0

    # LEIE hit on DMEPOS side = huge red flag
    df_matches.loc[df_matches['DMEPOS_LEIE_Flag'] == 'NPI_MATCH', 'Suspicion_Score'] += 50
    df_matches.loc[df_matches['DMEPOS_LEIE_Flag'] == 'NAME_MATCH', 'Suspicion_Score'] += 20

    # Low staffing at SNF = can't be doing wound care
    df_matches.loc[df_matches['PBJ_Avg_RN_HPRD'] < 0.5, 'Suspicion_Score'] += 30
    df_matches.loc[df_matches['PBJ_Avg_Total_HPRD'] < 3.0, 'Suspicion_Score'] += 20

    # Low star ratings
    df_matches.loc[df_matches['SNF_Overall_Rating'] <= 2, 'Suspicion_Score'] += 15
    df_matches.loc[df_matches['SNF_Staffing_Rating'] <= 1, 'Suspicion_Score'] += 20

    # Name match (auth official = owner) is stronger than address match
    df_matches.loc[df_matches['Match_Type'] == 'NAME_MATCH', 'Suspicion_Score'] += 25

    # Both name AND address match
    if 'Matched_Name' in df_matches.columns and 'Matched_Address' in df_matches.columns:
        both = df_matches.groupby('DMEPOS_NPI').apply(
            lambda x: len(x['Match_Type'].unique()) > 1
        )
        both_npis = both[both].index
        df_matches.loc[df_matches['DMEPOS_NPI'].isin(both_npis), 'Suspicion_Score'] += 30

    # DMEPOS taxonomy (actual supplier vs individual provider)
    df_matches.loc[df_matches['DMEPOS_Taxonomy'].isin(DMEPOS_TAXONOMY_CODES), 'Suspicion_Score'] += 15

    # Risk tier from step 2
    if 'DMEPOS_Risk_Tier' in df_matches.columns:
        df_matches.loc[df_matches['DMEPOS_Risk_Tier'] == 'HIGH_RISK', 'Suspicion_Score'] += 20

    # Sort by suspicion score
    df_matches = df_matches.sort_values('Suspicion_Score', ascending=False)

    # Save full results
    df_matches.to_csv(os.path.join(BASE_DMEPOS, "snf_dmepos_crossref.csv"), index=False)
    print(f"  Saved {len(df_matches):,} matches to snf_dmepos_crossref.csv")

    # Top 50 case studies
    case_studies = df_matches.head(50)
    case_studies.to_csv(os.path.join(BASE_DMEPOS, "snf_dmepos_case_studies.csv"), index=False)
    print(f"  Saved top 50 case studies to snf_dmepos_case_studies.csv")

    # ========================================================================
    # Summary
    # ========================================================================
    elapsed = time.time() - start

    summary = f"""======================================================================
SMOKING GUN: SNF-DMEPOS CROSS-REFERENCE SUMMARY
======================================================================

Runtime: {elapsed:.1f} seconds

INPUT FILES:
  - DMEPOS enriched: {os.path.basename(prosecutable_path)} ({len(dmepos):,} rows)
  - SNF ownership: ownership.csv ({len(ownership):,} records)
  - SNF provider info: provider_info.csv ({len(provider_info):,} facilities)
  - PBJ staffing: {os.path.basename(pbj_path)}

CROSS-REFERENCE RESULTS:
  Total matches: {len(df_matches):,}
  Name matches (auth official = SNF owner): {len([m for m in all_matches if m['Match_Type'] == 'NAME_MATCH']):,}
  Address matches (same location): {len([m for m in all_matches if m['Match_Type'] == 'ADDRESS_MATCH']):,}
  Unique DMEPOS NPIs matched: {df_matches['DMEPOS_NPI'].nunique():,}
  Unique SNF CCNs matched: {df_matches['SNF_CCN'].nunique():,}

HIGHEST SUSPICION MATCHES (Score > 50):
  Count: {len(df_matches[df_matches['Suspicion_Score'] > 50]):,}

"""

    # Show top 10 case studies
    summary += "TOP 10 SMOKING GUN CASE STUDIES:\n"
    summary += "=" * 70 + "\n\n"

    for i, (_, row) in enumerate(case_studies.head(10).iterrows()):
        summary += f"#{i+1}  SUSPICION SCORE: {row.get('Suspicion_Score', 'N/A')}\n"
        summary += f"    Match Type: {row.get('Match_Type', '')}\n"
        if row.get('Match_Type') == 'NAME_MATCH':
            summary += f"    Matched Person: {row.get('Matched_Name', '')}\n"
        summary += f"    DMEPOS NPI: {row.get('DMEPOS_NPI', '')}\n"
        summary += f"    DMEPOS Name: {row.get('DMEPOS_Name', '')}\n"
        summary += f"    DMEPOS Address: {row.get('DMEPOS_Address', '')} {row.get('DMEPOS_City', '')}, {row.get('DMEPOS_State', '')}\n"
        summary += f"    DMEPOS Taxonomy: {row.get('DMEPOS_Taxonomy', '')}\n"
        summary += f"    DMEPOS LEIE: {row.get('DMEPOS_LEIE_Flag', '')}\n"
        summary += f"    SNF CCN: {row.get('SNF_CCN', '')}\n"
        summary += f"    SNF Name: {row.get('SNF_Name', '')}\n"
        summary += f"    SNF Rating: {row.get('SNF_Overall_Rating', '')} stars\n"
        summary += f"    SNF Staffing Rating: {row.get('SNF_Staffing_Rating', '')}\n"
        summary += f"    SNF RN Hours/Resident/Day: {row.get('PBJ_Avg_RN_HPRD', 'N/A')}\n"
        summary += f"    SNF Total Nurse Hours/Res/Day: {row.get('PBJ_Avg_Total_HPRD', 'N/A')}\n"
        summary += f"    SNF Chain: {row.get('SNF_Chain', '')}\n"
        summary += f"    SNF Fines: ${row.get('SNF_Fines_Total', '0')}\n"
        summary += "\n"

    # Stats on low-staffing matches
    if 'PBJ_Avg_RN_HPRD' in df_matches.columns:
        low_rn = df_matches[df_matches['PBJ_Avg_RN_HPRD'] < 0.5]
        summary += f"\nCRITICAL: LOW-STAFFING FACILITIES WITH DMEPOS CONNECTIONS\n"
        summary += f"  Facilities with < 0.5 RN hours/resident/day: {low_rn['SNF_CCN'].nunique():,}\n"
        summary += f"  Connected DMEPOS NPIs: {low_rn['DMEPOS_NPI'].nunique():,}\n"
        very_low = df_matches[df_matches['PBJ_Avg_RN_HPRD'] < 0.3]
        summary += f"  Facilities with < 0.3 RN hours/resident/day: {very_low['SNF_CCN'].nunique():,}\n"

    # State breakdown
    if 'DMEPOS_State' in df_matches.columns:
        summary += f"\nMATCHES BY STATE (top 15):\n"
        state_counts = df_matches.groupby('DMEPOS_State')['DMEPOS_NPI'].nunique().sort_values(ascending=False).head(15)
        for state, count in state_counts.items():
            summary += f"  {state}: {count:,}\n"

    with open(os.path.join(BASE_DMEPOS, "snf_dmepos_summary.txt"), "w") as f:
        f.write(summary)

    print(summary)

else:
    print("\n  NO MATCHES FOUND — check data paths and column names")

print("\nSMOKING GUN CROSS-REFERENCE COMPLETE")
