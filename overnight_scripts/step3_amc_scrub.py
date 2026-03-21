#!/usr/bin/env python3
"""
STEP 3: Academic Medical Center (AMC) Scrub
============================================
Removes individual physician NPIs that are at known academic medical center
addresses but slipped through Step 2's hospital filter because they have
non-hospital taxonomy codes (e.g., individual physician specialties).

Input:  prosecutable_layer.csv (2,226,033 rows from Step 2)
Output: prosecutable_layer_clean.csv (AMCs removed)
        amc_removed.csv (what was removed, for audit)
        amc_scrub_summary.txt

Run time estimate: ~3-5 minutes
"""

import pandas as pd
import os
import time

BASE = os.path.expanduser("~/Desktop/RB7-Project/healthcare_fraud/dmepos")

# Known AMC addresses that slipped through Step 2
# These are the top clusters from filter_summary.txt that are clearly academic/VA
AMC_ADDRESSES = [
    # Mayo Clinic
    "200 1ST ST SW",
    "200 FIRST ST SW",
    # Cleveland Clinic
    "9500 EUCLID AVE",
    "9500 EUCLID AVENUE",
    # UF Health Gainesville
    "1600 SW ARCHER RD",
    "4300 SW 13TH ST",
    # MGH Boston
    "55 FRUIT ST",
    "55 FRUIT STREET",
    # Children's Hospital Columbus
    "700 CHILDRENS DR",
    # University of Iowa
    "200 HAWKINS DR",
    # UW Seattle
    "1959 NE PACIFIC ST",
    # OHSU Portland
    "3181 SW SAM JACKSON PARK RD",
    # MD Anderson Houston
    "1515 HOLCOMBE BLVD",
    # UNC Chapel Hill
    "101 MANNING DR",
    # Stanford
    "300 PASTEUR DR",
    # Scott & White Temple TX
    "2401 S 31ST ST",
    # UW Madison
    "600 HIGHLAND AVE",
    # UC Anschutz Aurora CO
    "12605 E 16TH AVE",
    "13123 E 16TH AVE",
    # VA Portsmouth
    "620 JOHN PAUL JONES CIR",
    # Medical College of Wisconsin
    "9200 W WISCONSIN AVE",
    # Ochsner New Orleans
    "1514 JEFFERSON HWY",
    # Harvard/Children's Boston
    "300 LONGWOOD AVE",
    # UCSD
    "200 W ARBOR DR",
    # Plymouth Meeting PA (likely health system campus)
    "2250 HICKORY RD",
    # Prestonsburg KY (ARH/health system)
    "104 S FRONT AVE",
    # VA San Antonio
    "7400 MERTON MINTER ST",
    # Twin Oaks NJ (community services)
    "770 WOODLANE RD",

    # Additional major AMCs/teaching hospitals commonly in NPPES
    # Johns Hopkins
    "600 N WOLFE ST",
    "733 N BROADWAY",
    "1800 ORLEANS ST",
    # Duke
    "ERWIN RD",
    "2301 ERWIN RD",
    # Vanderbilt
    "1211 MEDICAL CENTER DR",
    "1161 21ST AVE S",
    # Emory
    "1364 CLIFTON RD",
    "1365 CLIFTON RD NE",
    # University of Michigan
    "1500 E MEDICAL CENTER DR",
    # Columbia/NYP
    "630 W 168TH ST",
    "177 FORT WASHINGTON AVE",
    # Mount Sinai
    "1 GUSTAVE L LEVY PL",
    # NYU
    "550 1ST AVE",
    "560 1ST AVE",
    # University of Pittsburgh
    "200 LOTHROP ST",
    # Yale
    "20 YORK ST",
    "333 CEDAR ST",
    # University of Chicago
    "5841 S MARYLAND AVE",
    # Northwestern
    "251 E HURON ST",
    "675 N ST CLAIR ST",
    # Washington University St. Louis
    "660 S EUCLID AVE",
    # University of Colorado
    "12401 E 17TH AVE",
    # USC
    "1510 SAN PABLO ST",
    "1520 SAN PABLO ST",
    # UCLA
    "757 WESTWOOD PLZ",
    "10833 LE CONTE AVE",
    # UCSF
    "505 PARNASSUS AVE",
    "400 PARNASSUS AVE",
    # Oregon Health Sciences
    "3303 SW BOND AVE",
    # Penn
    "3400 SPRUCE ST",
    "3600 SPRUCE ST",
    # Cornell/Weill
    "525 E 68TH ST",
    # Mass General Brigham
    "75 FRANCIS ST",
    # University of Minnesota
    "420 DELAWARE ST SE",
    # University of Alabama Birmingham
    "1802 6TH AVE S",
    "619 19TH ST S",
    # University of Kansas
    "3901 RAINBOW BLVD",
    # University of Kentucky
    "800 ROSE ST",
    # University of Virginia
    "1215 LEE ST",
    # University of Maryland
    "22 S GREENE ST",
    # Wake Forest/Atrium
    "MEDICAL CENTER BLVD",
    # Baylor College of Medicine
    "7200 CAMBRIDGE ST",
    "1 BAYLOR PLZ",
    # VA Medical Centers (common addresses)
    "3801 MIRANDA AVE",  # VA Palo Alto
    "1000 LOCUST ST",  # VA Des Moines
    "50 IRVING ST NW",  # VA DC
    "130 W KINGSBRIDGE RD",  # VA Bronx
    "423 E 23RD ST",  # VA Manhattan
    "800 POLY PL",  # VA Brooklyn
]

# Normalize for matching
AMC_ADDRESSES_NORM = set(addr.upper().strip() for addr in AMC_ADDRESSES)

print("=" * 70)
print("STEP 3: ACADEMIC MEDICAL CENTER SCRUB")
print("=" * 70)

start = time.time()

print("\nLoading prosecutable_layer.csv...")
df = pd.read_csv(os.path.join(BASE, "prosecutable_layer.csv"), dtype=str, low_memory=False)
print(f"  Loaded {len(df):,} rows")

# Normalize addresses for matching
df['addr_norm'] = df['Street_Address'].str.upper().str.strip()

# Match against AMC addresses
amc_mask = df['addr_norm'].isin(AMC_ADDRESSES_NORM)

# Also catch anything with "MEDICAL CENTER" or "UNIVERSITY" in the address
# that has cluster_size > 10 (individual docs at university campuses)
df['Cluster_Size_int'] = pd.to_numeric(df['Cluster_Size'], errors='coerce').fillna(0).astype(int)

university_pattern = df['addr_norm'].str.contains(
    r'MEDICAL CENTER|UNIVERSITY|CHILDRENS HOSPITAL|VETERANS AFFAIRS|VA MEDICAL',
    regex=True, na=False
) & (df['Cluster_Size_int'] > 10)

# Combine masks
remove_mask = amc_mask | university_pattern

removed = df[remove_mask].copy()
kept = df[~remove_mask].copy()

# Drop helper columns
for col in ['addr_norm', 'Cluster_Size_int']:
    if col in removed.columns:
        removed.drop(columns=[col], inplace=True)
    if col in kept.columns:
        kept.drop(columns=[col], inplace=True)

# Save outputs
print(f"\nRemoved {len(removed):,} AMC-associated NPIs")
print(f"Remaining prosecutable: {len(kept):,}")

kept.to_csv(os.path.join(BASE, "prosecutable_layer_clean.csv"), index=False)
removed.to_csv(os.path.join(BASE, "amc_removed.csv"), index=False)

# Summary
elapsed = time.time() - start
summary = f"""======================================================================
STEP 3: AMC SCRUB SUMMARY
======================================================================

Input:  prosecutable_layer.csv ({len(df):,} rows)
Output: prosecutable_layer_clean.csv ({len(kept):,} rows)
        amc_removed.csv ({len(removed):,} rows)

AMC NPIs removed: {len(removed):,}
  - Direct address match: {amc_mask.sum():,}
  - University/medical center pattern: {university_pattern.sum():,}
  - Overlap (both): {(amc_mask & university_pattern).sum():,}

Top removed addresses:
"""

if len(removed) > 0:
    top_removed = removed.groupby('Street_Address').size().sort_values(ascending=False).head(20)
    for addr, count in top_removed.items():
        summary += f"  {addr}: {count:,}\n"

summary += f"""
Remaining risk tier breakdown:
"""

if 'Risk_Tier' in kept.columns:
    for tier, count in kept['Risk_Tier'].value_counts().items():
        summary += f"  {tier}: {count:,}\n"

summary += f"""
Runtime: {elapsed:.1f} seconds
"""

with open(os.path.join(BASE, "amc_scrub_summary.txt"), "w") as f:
    f.write(summary)

print(summary)
print("STEP 3 COMPLETE")
