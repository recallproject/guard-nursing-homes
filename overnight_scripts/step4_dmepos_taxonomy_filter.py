#!/usr/bin/env python3
"""
STEP 4: DMEPOS Taxonomy Filter
================================
From the clean prosecutable layer, isolate actual DMEPOS suppliers
(taxonomy 332B00000X etc.) vs individual providers who happen to share
an address. This creates the DMEPOS-specific fraud target list.

Input:  prosecutable_layer_clean.csv (from Step 3)
Output: dmepos_suppliers_only.csv (actual DMEPOS entities)
        dmepos_taxonomy_summary.txt

Run time estimate: ~2-3 minutes
"""

import pandas as pd
import os
import time

BASE = os.path.expanduser("~/Desktop/RB7-Project/healthcare_fraud/dmepos")

# DMEPOS and medical supply taxonomy codes
DMEPOS_TAXONOMIES = {
    '332B00000X': 'Durable Medical Equipment & Medical Supplies',
    '335E00000X': 'Prosthetic/Orthotic Supplier',
    '332S00000X': 'Hearing Aid Equipment',
    '335G00000X': 'Medical Foods Supplier',
    '332U00000X': 'Home Delivered Meals',
    '332H00000X': 'Eye Bank',
    '331L00000X': 'Blood Bank',
    '335U00000X': 'Organ Procurement Organization',
    '332000000X': 'Suppliers (General)',
}

# Related taxonomies that could be DMEPOS-adjacent fraud
ADJACENT_TAXONOMIES = {
    '251E00000X': 'Home Health',
    '251B00000X': 'Community Based Residential Treatment',
    '3336C0003X': 'Pharmacy — Clinic',
    '3336C0004X': 'Pharmacy — Community/Retail',
    '3336H0001X': 'Pharmacy — Home Infusion',
    '261QH0100X': 'Home Health Clinic',
    '374700000X': 'Home Health Aide',
}

ALL_TARGET = {**DMEPOS_TAXONOMIES, **ADJACENT_TAXONOMIES}

print("=" * 70)
print("STEP 4: DMEPOS TAXONOMY FILTER")
print("=" * 70)

start = time.time()

# Load clean prosecutable layer
clean_path = os.path.join(BASE, "prosecutable_layer_clean.csv")
if not os.path.exists(clean_path):
    clean_path = os.path.join(BASE, "prosecutable_layer.csv")

print(f"\nLoading {os.path.basename(clean_path)}...")
df = pd.read_csv(clean_path, dtype=str, low_memory=False)
print(f"  Loaded {len(df):,} rows")

# Filter to DMEPOS taxonomies
dmepos_mask = df['Taxonomy'].isin(DMEPOS_TAXONOMIES.keys())
adjacent_mask = df['Taxonomy'].isin(ADJACENT_TAXONOMIES.keys())

dmepos_only = df[dmepos_mask].copy()
adjacent_only = df[adjacent_mask].copy()
dmepos_plus_adjacent = df[dmepos_mask | adjacent_mask].copy()

# Tag the taxonomy type
dmepos_only['Taxonomy_Category'] = 'DMEPOS_CORE'
adjacent_only['Taxonomy_Category'] = 'DMEPOS_ADJACENT'

# Also flag entity type 2 (organizations) — more likely to be supplier companies
df['is_org'] = df['Entity_Type'] == '2'

# Save
dmepos_plus_adjacent_tagged = pd.concat([dmepos_only, adjacent_only])
dmepos_plus_adjacent_tagged.to_csv(os.path.join(BASE, "dmepos_suppliers_only.csv"), index=False)

# Taxonomy breakdown
taxonomy_counts = df['Taxonomy'].value_counts().head(30)

elapsed = time.time() - start

summary = f"""======================================================================
STEP 4: DMEPOS TAXONOMY FILTER SUMMARY
======================================================================

Input: {os.path.basename(clean_path)} ({len(df):,} rows)
Output: dmepos_suppliers_only.csv ({len(dmepos_plus_adjacent_tagged):,} rows)

DMEPOS CORE SUPPLIERS: {len(dmepos_only):,}
"""

for tax, name in DMEPOS_TAXONOMIES.items():
    count = len(df[df['Taxonomy'] == tax])
    if count > 0:
        summary += f"  {tax} ({name}): {count:,}\n"

summary += f"""
DMEPOS-ADJACENT ENTITIES: {len(adjacent_only):,}
"""

for tax, name in ADJACENT_TAXONOMIES.items():
    count = len(df[df['Taxonomy'] == tax])
    if count > 0:
        summary += f"  {tax} ({name}): {count:,}\n"

summary += f"""
Entity Type Breakdown (DMEPOS core):
  Organizations (Type 2): {len(dmepos_only[dmepos_only['Entity_Type'] == '2']):,}
  Individuals (Type 1): {len(dmepos_only[dmepos_only['Entity_Type'] == '1']):,}

DMEPOS suppliers with LEIE hits: {len(dmepos_only[dmepos_only['LEIE_Flag'].notna() & (dmepos_only['LEIE_Flag'] != '')]):,}

TOP 30 TAXONOMIES IN FULL PROSECUTABLE LAYER:
"""

for tax, count in taxonomy_counts.items():
    name = ALL_TARGET.get(tax, tax)
    summary += f"  {tax} ({name}): {count:,}\n"

summary += f"""
Runtime: {elapsed:.1f} seconds
"""

with open(os.path.join(BASE, "dmepos_taxonomy_summary.txt"), "w") as f:
    f.write(summary)

print(summary)
print("STEP 4 COMPLETE")
