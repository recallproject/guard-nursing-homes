#!/usr/bin/env python3
"""
Convert CMS Affiliated Entity Performance CSV to JSON for the chains page.
Cleans up column names to camelCase and filters out the National summary row.
"""

import csv
import json
import re

def to_camel_case(text):
    """Convert column name to camelCase."""
    # Remove special characters and split
    text = re.sub(r'[^\w\s]', ' ', text)
    words = text.split()
    if not words:
        return ''
    # First word lowercase, rest titlecase
    return words[0].lower() + ''.join(w.capitalize() for w in words[1:])

def clean_value(value):
    """Convert string values to appropriate types."""
    if value == '' or value is None:
        return None
    # Try to convert to number
    try:
        if '.' in value:
            return float(value)
        return int(value)
    except ValueError:
        return value

def main():
    input_path = '/Users/moltbot/Desktop/RB7-Project/healthcare_fraud/nursing_home/data/ownership/Affiliated_Entity_Performance_20250225.csv'
    output_path = '/Users/moltbot/Desktop/RB7-Project/healthcare_fraud/nursing_home/frontend/public/data/chain_performance.json'

    chains = []

    with open(input_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        # Convert headers to camelCase
        camel_headers = {col: to_camel_case(col) for col in reader.fieldnames}

        for row in reader:
            # Skip the National summary row
            if row['Affiliated entity'] == 'National':
                continue

            # Convert to camelCase keys and clean values
            chain = {}
            for old_key, new_key in camel_headers.items():
                chain[new_key] = clean_value(row[old_key])

            chains.append(chain)

    print(f"Processed {len(chains)} chains")
    print(f"Sample chain: {chains[0]['affiliatedEntity']}")
    print(f"Total facilities across all chains: {sum(c['numberOfFacilities'] for c in chains if c['numberOfFacilities'])}")

    # Write JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(chains, f, indent=2)

    print(f"✓ Wrote {output_path}")

if __name__ == '__main__':
    main()
