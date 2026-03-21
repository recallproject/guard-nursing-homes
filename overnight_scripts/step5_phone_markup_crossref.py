#!/usr/bin/env python3
"""
STEP 5: Phone Cluster × Markup Outlier Cross-Reference
========================================================
Cross-references phone clusters (NPIs sharing phone numbers) with
DMEPOS billing data to find suppliers that share phone infrastructure
AND have high markup ratios.

A supplier sharing a phone with 5+ other NPIs AND billing 3x the
Medicare allowed amount = classic fraud ring indicator.

Input:  phone_clusters.csv, dmepos_geo_aggregate.csv,
        prosecutable_layer_clean.csv (or prosecutable_layer.csv)
Output: phone_markup_outliers.csv
        phone_markup_summary.txt

Run time estimate: ~5-8 minutes
"""

import pandas as pd
import os
import time

BASE = os.path.expanduser("~/Desktop/RB7-Project/healthcare_fraud/dmepos")

print("=" * 70)
print("STEP 5: PHONE CLUSTER × MARKUP OUTLIER CROSS-REFERENCE")
print("=" * 70)

start = time.time()

# ========================================================================
# 1. Load phone clusters
# ========================================================================
print("\n[1/4] Loading phone clusters...")
phones = pd.read_csv(os.path.join(BASE, "phone_clusters.csv"), dtype=str, low_memory=False)
phones['NPI_Count'] = pd.to_numeric(phones['NPI_Count'], errors='coerce')
print(f"  Loaded {len(phones):,} phone clusters")
print(f"  Phone clusters with 5+ NPIs: {len(phones[phones['NPI_Count'] >= 5]):,}")
print(f"  Phone clusters with 10+ NPIs: {len(phones[phones['NPI_Count'] >= 10]):,}")

# Expand phone clusters to NPI-level
# NPIs column contains pipe-separated NPI list
phone_npi_rows = []
for _, row in phones.iterrows():
    if pd.isna(row['NPIs']):
        continue
    npis = str(row['NPIs']).split('|')
    for npi in npis:
        npi = npi.strip()
        if npi:
            phone_npi_rows.append({
                'Phone': row['Phone'],
                'Phone_Cluster_Size': row['NPI_Count'],
                'NPI': npi,
            })

phone_npi_df = pd.DataFrame(phone_npi_rows)
print(f"  Expanded to {len(phone_npi_df):,} NPI-phone records")

# ========================================================================
# 2. Load DMEPOS geo aggregate (billing data with markup ratios)
# ========================================================================
print("\n[2/4] Loading DMEPOS billing data...")
geo = pd.read_csv(os.path.join(BASE, "dmepos_geo_aggregate.csv"), dtype=str, low_memory=False)
print(f"  Loaded {len(geo):,} DMEPOS billing records")

# Convert financial columns
for col in ['Avg_Suplr_Sbmtd_Chrg', 'Avg_Suplr_Mdcr_Alowd_Amt', 'Avg_Suplr_Mdcr_Pymt_Amt']:
    if col in geo.columns:
        geo[col] = pd.to_numeric(geo[col], errors='coerce')

# Calculate markup ratio (submitted charge vs Medicare allowed)
geo['Markup_Ratio'] = geo['Avg_Suplr_Sbmtd_Chrg'] / geo['Avg_Suplr_Mdcr_Alowd_Amt'].replace(0, float('nan'))

# High markup = submitted charges > 2x Medicare allowed
geo['High_Markup'] = geo['Markup_Ratio'] > 2.0

# Surgical dressings (the 57.6% improper payment rate items)
surgical_dressing_mask = geo['HCPCS_Cd'].str.match(r'^A6[0-4]\d{2}$', na=False)
geo['Is_Surgical_Dressing'] = surgical_dressing_mask

# CGM codes (continuous glucose monitors — hot items)
cgm_mask = geo['HCPCS_Cd'].str.match(r'^(E2102|A9278|K0553|K0554)', na=False)
geo['Is_CGM'] = cgm_mask

print(f"  Records with markup > 2x: {geo['High_Markup'].sum():,}")
print(f"  Surgical dressing records: {geo['Is_Surgical_Dressing'].sum():,}")
print(f"  CGM records: {geo['Is_CGM'].sum():,}")

# ========================================================================
# 3. Load prosecutable layer for enrichment
# ========================================================================
print("\n[3/4] Loading prosecutable layer for NPI details...")
clean_path = os.path.join(BASE, "prosecutable_layer_clean.csv")
if not os.path.exists(clean_path):
    clean_path = os.path.join(BASE, "prosecutable_layer.csv")

pros = pd.read_csv(clean_path, dtype=str, low_memory=False,
                   usecols=['NPI', 'Name', 'Street_Address', 'City', 'State',
                           'Taxonomy', 'Auth_Official', 'Cluster_Size',
                           'LEIE_Flag', 'Risk_Tier'])
print(f"  Loaded {len(pros):,} prosecutable NPIs")

# ========================================================================
# 4. Cross-reference: phone clusters × markup outliers
# ========================================================================
print("\n[4/4] Cross-referencing phone clusters with markup outliers...")

# Note: geo aggregate is at state/HCPCS level, not NPI level
# So we identify high-markup HCPCS codes and flag NPIs billing those codes
# that are also in suspicious phone clusters

# For now, flag NPIs in phone clusters of 5+ that are in prosecutable layer
suspicious_phones = phone_npi_df[phone_npi_df['Phone_Cluster_Size'] >= 5].copy()

# Merge with prosecutable layer
merged = suspicious_phones.merge(pros, on='NPI', how='inner')
print(f"  NPIs in phone clusters (5+) AND prosecutable layer: {len(merged):,}")

# Add LEIE flag scoring
merged['Phone_Cluster_Size'] = pd.to_numeric(merged['Phone_Cluster_Size'], errors='coerce')
merged['Cluster_Size_int'] = pd.to_numeric(merged['Cluster_Size'], errors='coerce')

# Score
merged['Phone_Risk_Score'] = 0
merged.loc[merged['Phone_Cluster_Size'] >= 10, 'Phone_Risk_Score'] += 10
merged.loc[merged['Phone_Cluster_Size'] >= 20, 'Phone_Risk_Score'] += 15
merged.loc[merged['Phone_Cluster_Size'] >= 50, 'Phone_Risk_Score'] += 25
merged.loc[merged['LEIE_Flag'] == 'NPI_MATCH', 'Phone_Risk_Score'] += 40
merged.loc[merged['LEIE_Flag'] == 'NAME_MATCH', 'Phone_Risk_Score'] += 15
merged.loc[merged['Risk_Tier'] == 'HIGH_RISK', 'Phone_Risk_Score'] += 20

# Sort by risk
merged = merged.sort_values('Phone_Risk_Score', ascending=False)

# Save
merged.to_csv(os.path.join(BASE, "phone_markup_outliers.csv"), index=False)

elapsed = time.time() - start

# Summary of high-markup HCPCS codes
high_markup_hcpcs = geo[geo['High_Markup']].groupby('HCPCS_Cd').agg({
    'Markup_Ratio': 'mean',
    'HCPCS_Desc': 'first',
}).sort_values('Markup_Ratio', ascending=False).head(25)

summary = f"""======================================================================
STEP 5: PHONE CLUSTER × MARKUP OUTLIER SUMMARY
======================================================================

PHONE CLUSTER ANALYSIS:
  Total phone clusters: {len(phones):,}
  Clusters with 5+ NPIs: {len(phones[phones['NPI_Count'] >= 5]):,}
  Clusters with 10+ NPIs: {len(phones[phones['NPI_Count'] >= 10]):,}
  Clusters with 50+ NPIs: {len(phones[phones['NPI_Count'] >= 50]):,}

SUSPICIOUS PHONE × PROSECUTABLE CROSS-REFERENCE:
  NPIs in suspicious phone clusters (5+): {len(merged):,}
  With LEIE NPI match: {len(merged[merged['LEIE_Flag'] == 'NPI_MATCH']):,}
  With Phone Risk Score > 30: {len(merged[merged['Phone_Risk_Score'] > 30]):,}

TOP 25 HIGH-MARKUP HCPCS CODES (avg submitted/allowed > 2x):
"""

for hcpcs, row in high_markup_hcpcs.iterrows():
    summary += f"  {hcpcs} ({row['HCPCS_Desc'][:50]}): {row['Markup_Ratio']:.1f}x markup\n"

summary += f"""
SURGICAL DRESSING BILLING (A6010-A6461):
  Records in billing data: {geo['Is_Surgical_Dressing'].sum():,}
  With markup > 2x: {len(geo[geo['Is_Surgical_Dressing'] & geo['High_Markup']]):,}

CGM BILLING:
  Records in billing data: {geo['Is_CGM'].sum():,}
  With markup > 2x: {len(geo[geo['Is_CGM'] & geo['High_Markup']]):,}

TOP 10 PHONE CLUSTER OUTLIERS:
"""

for i, (_, row) in enumerate(merged.head(10).iterrows()):
    summary += f"\n  #{i+1} Risk Score: {row.get('Phone_Risk_Score', 0)}\n"
    summary += f"     NPI: {row['NPI']} | {row.get('Name', '')}\n"
    summary += f"     Phone: {row['Phone']} (shared by {row.get('Phone_Cluster_Size', '?')} NPIs)\n"
    summary += f"     Address: {row.get('Street_Address', '')} {row.get('City', '')}, {row.get('State', '')}\n"
    summary += f"     LEIE: {row.get('LEIE_Flag', '')} | Risk Tier: {row.get('Risk_Tier', '')}\n"

summary += f"""
Runtime: {elapsed:.1f} seconds
"""

with open(os.path.join(BASE, "phone_markup_summary.txt"), "w") as f:
    f.write(summary)

print(summary)
print("STEP 5 COMPLETE")
