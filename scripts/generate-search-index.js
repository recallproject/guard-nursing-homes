// Generate a slim, client-loadable search index covering all four entity types
// the homepage search bar suggests: places (city + state), facilities, chains, states.
//
// Output: public/data/search-index.json (one file, lazy-loaded on first search focus).

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySffToFacility } from '../src/utils/sffStatus.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DATA = join(__dirname, '..', 'public', 'data');

// Load all state files and merge facilities.
const sffPosting = JSON.parse(readFileSync(join(PUBLIC_DATA, 'sff_posting.json'), 'utf8'));
const stateFiles = readdirSync(join(PUBLIC_DATA, 'states')).filter(f => f.endsWith('.json'));
const facilities = [];
for (const file of stateFiles) {
  const stateData = JSON.parse(readFileSync(join(PUBLIC_DATA, 'states', file), 'utf-8'));
  if (Array.isArray(stateData.facilities)) {
    for (const f of stateData.facilities) {
      const enriched = applySffToFacility(f, sffPosting);
      const entry = {
        ccn: enriched.ccn,
        name: enriched.name,
        city: enriched.city,
        state: enriched.state,
        zip: enriched.zip,
      };
      if (enriched.former_names?.length) entry.aliases = enriched.former_names.join(' ');
      facilities.push(entry);
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

// Post-acute providers (home health, IRF, LTACH, hospice) — homepage search
// routes these to their SPA detail pages instead of /facility/:ccn.
const POSTACUTE_SOURCES = [
  { setting: 'home-health', file: 'home-health/index.json' },
  { setting: 'irf', file: 'irf/index.json' },
  { setting: 'ltach', file: 'ltach/index.json' },
  { setting: 'hospice', file: 'hospice/index.json' },
];
const postacute = [];
for (const src of POSTACUTE_SOURCES) {
  try {
    const rows = JSON.parse(readFileSync(join(PUBLIC_DATA, src.file), 'utf-8'));
    if (!Array.isArray(rows)) continue;
    for (const p of rows) {
      if (!p?.ccn || !p?.name) continue;
      postacute.push({
        ccn: p.ccn,
        name: p.name,
        city: p.city,
        state: p.state,
        zip: p.zip,
        setting: src.setting,
      });
    }
  } catch (err) {
    console.warn(`  ⚠ postacute index skipped (${src.setting}): ${err.message}`);
  }
}

const out = {
  generated: new Date().toISOString(),
  counts: {
    facilities: facilities.length,
    cities: cities.length,
    chains: chains.length,
    states: states.length,
    postacute: postacute.length,
  },
  facilities,
  cities,
  chains,
  states,
  postacute,
};

const outPath = join(PUBLIC_DATA, 'search-index.json');
writeFileSync(outPath, JSON.stringify(out));
const bytes = readFileSync(outPath).length;
console.log(`  ✓ search-index.json: ${facilities.length.toLocaleString()} SNF · ${postacute.length.toLocaleString()} post-acute · ${cities.length.toLocaleString()} cities · ${chains.length} chains · ${states.length} states · ${(bytes / 1024).toFixed(0)}KB`);
