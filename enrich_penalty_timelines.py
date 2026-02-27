#!/usr/bin/env python3
"""
Parse CMS penalties CSV and add penalty_timeline to facilities_map_data.json
"""

import json
import csv
from collections import defaultdict
from datetime import datetime

# File paths
PENALTIES_CSV = '/Users/moltbot/Desktop/RB7-Project/healthcare_fraud/nursing_home/penalties.csv'
FACILITIES_JSON = '/Users/moltbot/Desktop/RB7-Project/healthcare_fraud/nursing_home/frontend/public/facilities_map_data.json'
OUTPUT_JSON = '/Users/moltbot/Desktop/RB7-Project/healthcare_fraud/nursing_home/frontend/public/facilities_map_data.json'

print("Step 1: Reading penalties CSV...")
penalties_by_ccn = defaultdict(list)

with open(PENALTIES_CSV, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        ccn = row['CMS Certification Number (CCN)'].strip()
        penalty_date = row['Penalty Date'].strip()
        penalty_type = row['Penalty Type'].strip()
        fine_amount = row['Fine Amount'].strip()
        denial_start = row['Payment Denial Start Date'].strip()
        denial_days = row['Payment Denial Length in Days'].strip()
        
        # Build penalty record
        penalty = {
            'date': penalty_date if penalty_date else None,
            'type': penalty_type
        }
        
        # Add amount for fines
        if fine_amount:
            try:
                penalty['amount'] = float(fine_amount)
            except ValueError:
                penalty['amount'] = 0
        
        # Add denial details for payment denials
        if penalty_type == 'Payment Denial':
            if denial_start:
                penalty['denial_start'] = denial_start
            if denial_days:
                try:
                    penalty['denial_days'] = int(denial_days)
                except ValueError:
                    pass
        
        penalties_by_ccn[ccn].append(penalty)

print(f"  Found penalties for {len(penalties_by_ccn)} unique CCNs")
print(f"  Total penalty records: {sum(len(p) for p in penalties_by_ccn.values())}")

print("\nStep 2: Reading facilities_map_data.json...")
with open(FACILITIES_JSON, 'r', encoding='utf-8') as f:
    facilities_data = json.load(f)

print(f"  Loaded data for {len(facilities_data['states'])} states")

print("\nStep 3: Enriching facilities with penalty timelines...")
total_facilities = 0
facilities_with_penalties = 0

for state_code, state_data in facilities_data['states'].items():
    for facility in state_data['facilities']:
        total_facilities += 1
        ccn = facility['ccn']
        
        if ccn in penalties_by_ccn:
            # Sort penalties by date (newest first)
            timeline = penalties_by_ccn[ccn]
            timeline.sort(key=lambda x: x['date'] if x['date'] else '', reverse=True)
            facility['penalty_timeline'] = timeline
            facilities_with_penalties += 1

print(f"  Processed {total_facilities} total facilities")
print(f"  Added penalty timelines to {facilities_with_penalties} facilities ({facilities_with_penalties/total_facilities*100:.1f}%)")

print("\nStep 4: Saving enriched JSON...")
with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(facilities_data, f, separators=(',', ':'))

print(f"  Saved to {OUTPUT_JSON}")

print("\nStep 5: Sample penalty timelines:")
# Show a few examples
sample_count = 0
for state_code, state_data in facilities_data['states'].items():
    for facility in state_data['facilities']:
        if 'penalty_timeline' in facility and len(facility['penalty_timeline']) > 0:
            print(f"\n{facility['name']} ({facility['ccn']})")
            print(f"  Total penalties: {len(facility['penalty_timeline'])}")
            print("  Most recent 3:")
            for penalty in facility['penalty_timeline'][:3]:
                if penalty['type'] == 'Fine':
                    print(f"    {penalty['date']}: ${penalty.get('amount', 0):,.0f} fine")
                else:
                    print(f"    {penalty['date']}: {penalty['type']}")
            sample_count += 1
            if sample_count >= 5:
                break
    if sample_count >= 5:
        break

print("\n✓ Done!")
