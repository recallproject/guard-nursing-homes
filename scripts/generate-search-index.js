// Generate a slim, client-loadable search index covering all four entity types
// the homepage search bar suggests: places (city + state), facilities, chains, states.
//
// Output: public/data/search-index.json (one file, lazy-loaded on first search focus).

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DATA = join(__dirname, '..', 'public', 'data');

// Load all state files and merge facilities.
const stateFiles = readdirSync(join(PUBLIC_DATA, 'states')).filter(f => f.endsWith('.json'));
const facilities = [];
for (const file of stateFiles) {
  const stateData = JSON.parse(readFileSync(join(PUBLIC_DATA, 'states', file), 'utf-8'));
  if (Array.isArray(stateData.facilities)) {
    for (const f of stateData.facilities) {
      facilities.push({
        ccn: f.ccn,
        name: f.name,
        city: f.city,
        state: f.state,
        zip: f.zip,
      });
    }
  }
}

// Derive city index: unique city|state pairs with facility counts.
const cityCounts = new Map();
for (const f of facilities) {
  if (!f.city || !f.state) continue;
  const key = `${f.city}|${f.state}`;
  cityCounts.set(key, (cityCounts.get(key) || 0) + 1);
}
const cities = Array.from(cityCounts.entries())
  .map(([key, count]) => {
    const [name, state] = key.split('|');
    return { name, state, count };
  })
  .sort((a, b) => b.count - a.count); // most facilities first

// Load chains.
const chainsRaw = JSON.parse(readFileSync(join(PUBLIC_DATA, 'chain_performance.json'), 'utf-8'));
const chains = chainsRaw
  .filter(c => c.affiliatedEntity && c.numberOfFacilities)
  .map(c => ({
    slug: c.affiliatedEntity.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    name: c.affiliatedEntity,
    count: c.numberOfFacilities,
    states: c.numberOfStatesAndTerritoriesWithOperations,
  }))
  .sort((a, b) => b.count - a.count);

// State list (50 + DC + territories).
const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia', PR: 'Puerto Rico', GU: 'Guam',
};
const stateCounts = new Map();
for (const f of facilities) {
  if (f.state) stateCounts.set(f.state, (stateCounts.get(f.state) || 0) + 1);
}
const states = Array.from(stateCounts.entries())
  .map(([code, count]) => ({
    code,
    name: STATE_NAMES[code] || code,
    count,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const out = {
  generated: new Date().toISOString(),
  counts: {
    facilities: facilities.length,
    cities: cities.length,
    chains: chains.length,
    states: states.length,
  },
  facilities,
  cities,
  chains,
  states,
};

const outPath = join(PUBLIC_DATA, 'search-index.json');
writeFileSync(outPath, JSON.stringify(out));
const bytes = readFileSync(outPath).length;
console.log(`  ✓ search-index.json: ${facilities.length.toLocaleString()} facilities · ${cities.length.toLocaleString()} cities · ${chains.length} chains · ${states.length} states · ${(bytes / 1024).toFixed(0)}KB`);
