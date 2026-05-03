// Build hospice chain rollups from CMS hospice owners disclosure (Oct 2025).
//
// Inputs (read from data/raw/hospice/):
//   - hospice_all_owners_20251001.csv      latest quarterly owners snapshot
//   - hospice_enrollments_20250102.csv     ENROLLMENT ID -> CCN lookup
//
// Outputs (written to public/data/hospice/):
//   - chains.json                  flat list of all chain rollups (display + summary)
//   - chains/{slug}.json           per-chain detail with member CCN list and per-member metadata
//
// Method (defamation-disciplined):
//   - We aggregate organizational owners (TYPE - OWNER == 'O') across hospice provider enrollments.
//   - We retain rows whose ROLE TEXT - OWNER indicates an OWNERSHIP / MANAGERIAL CONTROL relationship
//     (per CMS disclosure categories) — NOT individual board members or W-2 managing employees.
//   - Owner names are normalized (lowercase, strip legal suffixes, strip punctuation) so that
//     "Big Org Inc", "BIG ORG, LLC" and "Big Org" group as one chain.
//   - Display name is the most common original casing for a normalized key.
//   - Metrics are aggregated from the per-state hospice JSON files already published on the site.
//   - Singletons (member_count < 2) are dropped.
//
// All language describing the rollup must say "facilities under common disclosed ownership"
// — the data is a disclosure filing, not a finding of fact about consolidated control.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW = join(__dirname, '..', '..', 'data', 'raw', 'hospice');
const OUT = join(__dirname, '..', 'public', 'data', 'hospice');
const OUT_CHAINS_DIR = join(OUT, 'chains');
const STATES_DIR = join(OUT, 'states');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
if (!existsSync(OUT_CHAINS_DIR)) mkdirSync(OUT_CHAINS_DIR, { recursive: true });

// ───────────────────────────────────────────────
// CSV parser — handles quoted fields, embedded commas, escaped quotes
// ───────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cur += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* skip */ }
      else { cur += c; }
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function csvToObjects(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).filter(r => r.length === headers.length).map(r => {
    const o = {};
    for (let i = 0; i < headers.length; i++) o[headers[i]] = r[i];
    return o;
  });
}

// ───────────────────────────────────────────────
// Owner-name normalization
// ───────────────────────────────────────────────
const LEGAL_SUFFIXES = [
  'incorporated', 'corporation', 'corp', 'company', 'limited', 'plc',
  'lllp', 'llp', 'lp', 'llc', 'inc', 'co', 'ltd',
  'pllc', 'pa', 'pc',
  'holdings', 'holding',
];

function normalizeOwnerName(raw) {
  if (!raw) return '';
  let s = String(raw).toLowerCase();
  s = s.replace(/&/g, ' and ');
  // Strip punctuation except spaces
  s = s.replace(/[.,'"/\\()\[\]{}#!?:;*+@]/g, ' ');
  s = s.replace(/-/g, ' ');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  // Iteratively peel trailing legal-suffix tokens (handles "Inc Corp" / "LLC Holdings")
  let changed = true;
  while (changed) {
    changed = false;
    for (const suf of LEGAL_SUFFIXES) {
      const re = new RegExp(`(?:^|\\s)${suf}$`);
      if (re.test(s)) {
        s = s.replace(re, '').trim();
        changed = true;
      }
    }
  }
  return s.replace(/\s+/g, ' ').trim();
}

function toSlug(s) {
  return String(s)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Roles indicating organizational ownership/control we want to roll up.
// Excludes board-member / W-2 employee / contracted-employee categories.
const KEEP_ROLES = new Set([
  '5% OR GREATER DIRECT OWNERSHIP INTEREST',
  '5% OR GREATER INDIRECT OWNERSHIP INTEREST',
  '5% OR GREATER MORTGAGE INTEREST',
  '5% OR GREATER SECURITY INTEREST',
  'GENERAL PARTNERSHIP INTEREST',
  'LIMITED PARTNERSHIP INTEREST',
  'OPERATIONAL/MANAGERIAL CONTROL',
]);

// ───────────────────────────────────────────────
// Step 1 — load enrollments to map ENROLLMENT ID -> CCN
// ───────────────────────────────────────────────
console.log('Reading hospice enrollments (ENROLLMENT ID -> CCN)...');
const enrollText = readFileSync(join(RAW, 'hospice_enrollments_20250102.csv'), 'utf-8');
const enrollRows = csvToObjects(enrollText);
const enrollIdToCcn = new Map();
for (const row of enrollRows) {
  const eid = row['ENROLLMENT ID'];
  const ccn = (row['CCN'] || '').trim();
  if (eid && ccn) enrollIdToCcn.set(eid, ccn);
}
console.log(`  ${enrollIdToCcn.size.toLocaleString()} enrollment->CCN mappings`);

// ───────────────────────────────────────────────
// Step 2 — load owners CSV; pick org-owner rows; group by normalized name
// ───────────────────────────────────────────────
console.log('Reading hospice all-owners disclosure (this is the big one)...');
const ownersText = readFileSync(join(RAW, 'hospice_all_owners_20251001.csv'), 'utf-8');
const ownerRows = csvToObjects(ownersText);
console.log(`  ${ownerRows.length.toLocaleString()} owner rows total`);

// chainsByKey: norm_key -> { displayCounts, ccnsSet, enrollIdsSet,
//                           pctSum, pctCount, oldestAssoc, newestAssoc,
//                           flags: { pe, reit, hold, mgmt }, rawNames: Set }
const chainsByKey = new Map();
let droppedNonOrg = 0;
let droppedRole = 0;
let droppedNoName = 0;
let droppedNoCcn = 0;
let kept = 0;

for (const r of ownerRows) {
  const type = r['TYPE - OWNER'];
  if (type !== 'O') { droppedNonOrg++; continue; }
  const role = r['ROLE TEXT - OWNER'] || '';
  if (!KEEP_ROLES.has(role)) { droppedRole++; continue; }
  const ownerName = (r['ORGANIZATION NAME - OWNER'] || '').trim();
  if (!ownerName) { droppedNoName++; continue; }
  const eid = r['ENROLLMENT ID'];
  const ccn = enrollIdToCcn.get(eid);
  if (!ccn) { droppedNoCcn++; continue; }

  const key = normalizeOwnerName(ownerName);
  if (!key) { droppedNoName++; continue; }

  let entry = chainsByKey.get(key);
  if (!entry) {
    entry = {
      key,
      displayCounts: new Map(),
      ccnsSet: new Set(),
      enrollIdsSet: new Set(),
      pctSum: 0,
      pctCount: 0,
      oldestAssoc: null,
      newestAssoc: null,
      flags: { pe: false, reit: false, hold: false, mgmt: false, forProfit: 0, nonProfit: 0 },
      rawNames: new Set(),
    };
    chainsByKey.set(key, entry);
  }
  entry.displayCounts.set(ownerName, (entry.displayCounts.get(ownerName) || 0) + 1);
  entry.ccnsSet.add(ccn);
  entry.enrollIdsSet.add(eid);
  entry.rawNames.add(ownerName);

  const pct = parseFloat(r['PERCENTAGE OWNERSHIP']);
  if (!Number.isNaN(pct) && pct > 0) {
    entry.pctSum += pct;
    entry.pctCount++;
  }

  const assoc = (r['ASSOCIATION DATE - OWNER'] || '').trim(); // MM/DD/YYYY
  if (assoc) {
    const parsed = parseDateMDY(assoc);
    if (parsed) {
      if (!entry.oldestAssoc || parsed < entry.oldestAssoc) entry.oldestAssoc = parsed;
      if (!entry.newestAssoc || parsed > entry.newestAssoc) entry.newestAssoc = parsed;
    }
  }

  if (r['PRIVATE EQUITY COMPANY - OWNER'] === 'Y') entry.flags.pe = true;
  if (r['REIT - OWNER'] === 'Y') entry.flags.reit = true;
  if (r['HOLDING COMPANY - OWNER'] === 'Y') entry.flags.hold = true;
  if (r['MANAGEMENT SERVICES COMPANY - OWNER'] === 'Y') entry.flags.mgmt = true;
  if (r['FOR PROFIT - OWNER'] === 'Y') entry.flags.forProfit++;
  if (r['NON PROFIT - OWNER'] === 'Y') entry.flags.nonProfit++;

  kept++;
}

function parseDateMDY(s) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const [_, mo, da, yr] = m;
  const d = new Date(Number(yr), Number(mo) - 1, Number(da));
  return Number.isNaN(d.getTime()) ? null : d;
}

console.log(`  kept rows: ${kept.toLocaleString()}`);
console.log(`  dropped: non-org=${droppedNonOrg.toLocaleString()}, non-ownership-role=${droppedRole.toLocaleString()}, no-name=${droppedNoName.toLocaleString()}, ccn-not-found=${droppedNoCcn.toLocaleString()}`);
console.log(`  distinct normalized owner-names: ${chainsByKey.size.toLocaleString()}`);

// ───────────────────────────────────────────────
// Step 3 — load per-state hospice JSON to enrich members with metrics
// ───────────────────────────────────────────────
console.log('Loading per-state hospice provider files for metric aggregation...');
const ccnToProvider = new Map();
let providerCount = 0;
if (existsSync(STATES_DIR)) {
  const files = readdirSync(STATES_DIR).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const stateData = JSON.parse(readFileSync(join(STATES_DIR, f), 'utf-8'));
    if (Array.isArray(stateData.providers)) {
      for (const p of stateData.providers) {
        if (p && p.ccn) {
          ccnToProvider.set(p.ccn, p);
          providerCount++;
        }
      }
    }
  }
}
console.log(`  loaded ${providerCount.toLocaleString()} hospice providers from per-state files`);

// ───────────────────────────────────────────────
// Step 4 — finalize chain records (drop singletons, compute metrics)
// ───────────────────────────────────────────────
function pickDisplayName(displayCounts) {
  let best = null;
  let bestCount = -1;
  for (const [name, count] of displayCounts.entries()) {
    if (count > bestCount) { best = name; bestCount = count; }
  }
  return best || '';
}

function avg(values) {
  const filtered = values.filter(v => v !== null && v !== undefined && !Number.isNaN(v));
  if (!filtered.length) return null;
  const sum = filtered.reduce((a, b) => a + b, 0);
  return Math.round((sum / filtered.length) * 100) / 100;
}

const chainsList = [];
const chainsBySlug = new Map();
let droppedSingleton = 0;
let totalCcnsCovered = new Set();

for (const entry of chainsByKey.values()) {
  if (entry.ccnsSet.size < 2) { droppedSingleton++; continue; }

  const displayName = pickDisplayName(entry.displayCounts);
  const slug = toSlug(displayName) || toSlug(entry.key);

  // Aggregate metrics across member CCNs that we have provider data for
  const memberCcns = [...entry.ccnsSet];
  const members = [];
  const states = new Set();
  const cmsRatings = [];
  const hciScores = [];
  const cahpsScores = [];
  let flaggedCount = 0;
  let withFlags = 0;

  for (const ccn of memberCcns) {
    const p = ccnToProvider.get(ccn);
    if (!p) {
      members.push({ ccn, name: null, city: null, state: null, missing: true });
      continue;
    }
    if (p.state) states.add(p.state);

    const cms = p.cms_overall_rating;
    if (cms !== null && cms !== undefined && cms !== '' && !Number.isNaN(Number(cms))) {
      cmsRatings.push(Number(cms));
    }
    const hci = p.metrics?.hci_composite;
    if (hci !== null && hci !== undefined && !Number.isNaN(Number(hci))) {
      hciScores.push(Number(hci));
    }
    const overallRating = p.cahps?.overall_rating_pct;
    if (overallRating !== null && overallRating !== undefined && !Number.isNaN(Number(overallRating))) {
      cahpsScores.push(Number(overallRating));
    }
    const fc = p.flags?.flagged_count || 0;
    if (fc > 0) {
      flaggedCount += fc;
      withFlags++;
    }

    members.push({
      ccn,
      name: p.name || null,
      city: p.city || null,
      state: p.state || null,
      zip: p.zip || null,
      ownership_type: p.ownership_type || null,
      cms_overall_rating: cms ?? null,
      hci_composite: hci ?? null,
      cahps_overall_rating_pct: overallRating ?? null,
      flagged_count: fc,
      ownership_flags: p.ownership_flags || null,
    });
  }

  for (const ccn of memberCcns) totalCcnsCovered.add(ccn);

  const facilityCount = memberCcns.length;
  const flaggedPct = facilityCount > 0 ? Math.round((withFlags / facilityCount) * 1000) / 10 : 0;

  const summary = {
    chain_name: displayName,
    chain_slug: slug,
    norm_key: entry.key,
    facility_count: facilityCount,
    state_count: states.size,
    states: [...states].sort(),
    avg_cms_rating: avg(cmsRatings),
    avg_hci_composite: avg(hciScores),
    avg_cahps_overall: avg(cahpsScores),
    flagged_facility_count: withFlags,
    flagged_pattern_count: flaggedCount,
    flagged_pct: flaggedPct,
    oldest_association: entry.oldestAssoc ? entry.oldestAssoc.toISOString().slice(0, 10) : null,
    newest_association: entry.newestAssoc ? entry.newestAssoc.toISOString().slice(0, 10) : null,
    is_pe_disclosed: entry.flags.pe,
    is_reit_disclosed: entry.flags.reit,
    is_holding_co_disclosed: entry.flags.hold,
    is_mgmt_co_disclosed: entry.flags.mgmt,
    for_profit_disclosure_count: entry.flags.forProfit,
    non_profit_disclosure_count: entry.flags.nonProfit,
    avg_disclosed_ownership_pct: entry.pctCount > 0 ? Math.round((entry.pctSum / entry.pctCount) * 100) / 100 : null,
  };

  chainsList.push(summary);

  // Per-chain detail file
  const detail = {
    ...summary,
    member_count: facilityCount,
    members: members.sort((a, b) => {
      // Sort by state, then by name
      const sa = (a.state || '~~') + (a.name || '~~');
      const sb = (b.state || '~~') + (b.name || '~~');
      return sa.localeCompare(sb);
    }),
    raw_owner_names_in_disclosure: [...entry.rawNames].sort(),
    source_note: 'Aggregated from CMS hospice owners disclosure (Oct 2025). "Common disclosed ownership" reflects publicly filed CMS forms — not an independent finding of fact about consolidated control.',
    generated_at: new Date().toISOString(),
  };
  chainsBySlug.set(slug, detail);
}

// Resolve slug collisions by appending a hash-ish disambiguator if needed
function disambiguateSlugs(list, byMap) {
  const seen = new Map();
  for (const c of list) {
    let s = c.chain_slug;
    if (seen.has(s)) {
      const base = s;
      let i = 2;
      while (seen.has(`${base}-${i}`)) i++;
      s = `${base}-${i}`;
      c.chain_slug = s;
      const detail = byMap.get(base);
      if (detail) {
        // If the previous slug is still ours but for a different chain, leave it; new chain takes new slug
      }
      const orig = byMap.get(base);
      // We leave the original under base, write new under s
      byMap.delete(base);
      byMap.set(base, orig);
    }
    seen.set(s, true);
  }
}
// Actually, the simplest correct dedupe: walk list, track slug usage, mutate list and byMap together.
{
  const used = new Set();
  const newByMap = new Map();
  for (const c of chainsList) {
    let s = c.chain_slug || 'chain';
    if (used.has(s)) {
      let i = 2;
      while (used.has(`${s}-${i}`)) i++;
      s = `${s}-${i}`;
    }
    used.add(s);
    const old = chainsBySlug.get(c.chain_slug);
    c.chain_slug = s;
    if (old) {
      old.chain_slug = s;
      newByMap.set(s, old);
    }
  }
  chainsBySlug.clear();
  for (const [k, v] of newByMap) chainsBySlug.set(k, v);
}

console.log(`  dropped singletons (member_count < 2): ${droppedSingleton.toLocaleString()}`);
console.log(`  final chains: ${chainsList.length.toLocaleString()}`);
console.log(`  CCNs covered by chain rollup: ${totalCcnsCovered.size.toLocaleString()}`);

// Sort the master list by facility count desc
chainsList.sort((a, b) => b.facility_count - a.facility_count || a.chain_name.localeCompare(b.chain_name));

// ───────────────────────────────────────────────
// Step 5 — write outputs
// ───────────────────────────────────────────────
writeFileSync(join(OUT, 'chains.json'), JSON.stringify(chainsList, null, 2));
console.log(`Wrote ${join(OUT, 'chains.json')} (${chainsList.length} chains)`);

let written = 0;
for (const [slug, detail] of chainsBySlug.entries()) {
  writeFileSync(join(OUT_CHAINS_DIR, `${slug}.json`), JSON.stringify(detail, null, 2));
  written++;
}
console.log(`Wrote ${written} per-chain detail files to ${OUT_CHAINS_DIR}/`);

// ───────────────────────────────────────────────
// Summary log
// ───────────────────────────────────────────────
const top3 = chainsList.slice(0, 3);
console.log('\nTop 3 chains by facility count:');
for (const c of top3) {
  console.log(`  ${c.facility_count.toString().padStart(4)}  ${c.chain_name}  (${c.state_count} states)`);
}
console.log('\nDone.');
