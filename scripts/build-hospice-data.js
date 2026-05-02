// Build hospice data files for the /hospice page and /hospice/:ccn report cards.
//
// Inputs (read from data/raw/hospice/):
//   - hospice_general_info.csv         provider directory (CCN, name, address, ownership)
//   - hospice_provider_data.csv        long-form provider × CMS Hospice Care Index measures
//   - hospice_state_cahps.csv          state-level CAHPS family-experience benchmarks
//   - hospice_national_cahps.csv       national CAHPS benchmarks
//   - hospice_all_owners_20251001.csv  quarterly ownership disclosure (most recent)
//
// Outputs (written to public/data/hospice/):
//   - states/{XX}.json                 per-state provider list with screening flags
//   - index.json                       flat list for search (slim record per provider)
//   - national-summary.json            counts, thresholds, top-state-flagged
//   - cahps-benchmarks.json            state + national CAHPS benchmarks
//
// Screening framework (adapted from CA State Auditor Report 2021-123):
//   - Pattern 1: live discharge rate           threshold = 90th percentile nationally
//   - Pattern 2: GIP utilization (CHC/GIP %)   threshold = 90th percentile nationally
//   - (Long-stay >180d is held for Phase 2 — not surfaced from current CMS provider data)
//
// All thresholds are computed from the actual data in this run, not hardcoded.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW = join(__dirname, '..', '..', 'data', 'raw', 'hospice');
const OUT = join(__dirname, '..', 'public', 'data', 'hospice');
const OUT_STATES = join(OUT, 'states');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
if (!existsSync(OUT_STATES)) mkdirSync(OUT_STATES, { recursive: true });

// === minimal CSV parser — handles quoted fields, commas, escaped quotes ===
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

// === Load provider directory ===
console.log('Reading provider directory...');
const generalInfoText = readFileSync(join(RAW, 'hospice_general_info.csv'), 'utf-8');
const generalInfo = csvToObjects(generalInfoText);
console.log(`  ${generalInfo.length.toLocaleString()} providers in directory`);

// === Load provider × measure data, pivot to per-CCN ===
console.log('Reading provider × measure data (this is the big one)...');
const providerDataText = readFileSync(join(RAW, 'hospice_provider_data.csv'), 'utf-8');
const providerRows = csvToObjects(providerDataText);
console.log(`  ${providerRows.length.toLocaleString()} measure rows`);

// We only care about the screening-framework measures + a few related ones.
const KEEP_MEASURES = new Set([
  'H_012_03_OBSERVED',  // Early live discharges (% live discharges) — Pattern 1
  'H_012_03_DENOMINATOR',
  'H_012_04_OBSERVED',  // Late live discharges
  'H_012_01_OBSERVED',  // CHC/GIP provided (% days) — Pattern 2
  'H_012_01_DENOMINATOR',
  'H_012_05_OBSERVED',  // Burdensome transitions T1
  'H_012_06_OBSERVED',  // Burdensome transitions T2
  'H_012_08_OBSERVED',  // Nurse care minutes per RHC day
  'Average_Daily_Census',
  'Care_Provided_Home',
  'Care_Provided_Inpatient_Hospital',
  'Care_Provided_Inpatient_Hospice',
  'Care_Provided_Nursing_Facility',
  'Provided_Home_Care_only',
]);

const measuresByCcn = new Map();
for (const row of providerRows) {
  const code = row['Measure Code'];
  if (!KEEP_MEASURES.has(code)) continue;
  const ccn = row['CMS Certification Number (CCN)'];
  if (!ccn) continue;
  const score = parseFloat(row['Score']);
  if (Number.isNaN(score)) continue;
  if (!measuresByCcn.has(ccn)) measuresByCcn.set(ccn, {});
  measuresByCcn.get(ccn)[code] = score;
}
console.log(`  ${measuresByCcn.size.toLocaleString()} CCNs with at least one screening measure`);

// === Load owners (most recent quarter) ===
console.log('Reading ownership data...');
const ownersText = readFileSync(join(RAW, 'hospice_all_owners_20251001.csv'), 'utf-8');
const ownerRows = csvToObjects(ownersText);
const ownersByCcn = new Map();
for (const row of ownerRows) {
  const ccn = row['ENROLLMENT ID'] || '';
  if (!ccn) continue;
  if (!ownersByCcn.has(ccn)) {
    ownersByCcn.set(ccn, {
      organization: row['ORGANIZATION NAME'] || '',
      flags: { pe: false, reit: false, forProfit: false, nonProfit: false, chain: false },
      ownerNames: new Set(),
    });
  }
  const e = ownersByCcn.get(ccn);
  if ((row['PRIVATE EQUITY COMPANY - OWNER'] || '').toUpperCase() === 'Y') e.flags.pe = true;
  if ((row['REIT - OWNER'] || '').toUpperCase() === 'Y') e.flags.reit = true;
  if ((row['FOR PROFIT - OWNER'] || '').toUpperCase() === 'Y') e.flags.forProfit = true;
  if ((row['NON PROFIT - OWNER'] || '').toUpperCase() === 'Y') e.flags.nonProfit = true;
  if ((row['CHAIN HOME OFFICE - OWNER'] || '').toUpperCase() === 'Y') e.flags.chain = true;
  const ownerName = row['ORGANIZATION NAME - OWNER'] || `${row['LAST NAME - OWNER'] || ''} ${row['FIRST NAME - OWNER'] || ''}`.trim();
  if (ownerName) e.ownerNames.add(ownerName);
}
console.log(`  ${ownersByCcn.size.toLocaleString()} CCNs with ownership records`);

// === Compute national thresholds (90th percentiles) ===
console.log('Computing screening thresholds...');
function percentile(values, p) {
  const sorted = values.filter(v => v != null && !Number.isNaN(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

const liveDischargeValues = [];
const gipValues = [];
for (const m of measuresByCcn.values()) {
  if (m.H_012_03_OBSERVED != null) liveDischargeValues.push(m.H_012_03_OBSERVED);
  if (m.H_012_01_OBSERVED != null) gipValues.push(m.H_012_01_OBSERVED);
}
const THRESHOLDS = {
  live_discharge_p90: percentile(liveDischargeValues, 0.9),
  live_discharge_median: percentile(liveDischargeValues, 0.5),
  gip_p90: percentile(gipValues, 0.9),
  gip_median: percentile(gipValues, 0.5),
};
console.log(`  Live discharge: median=${THRESHOLDS.live_discharge_median?.toFixed(1)}%, P90=${THRESHOLDS.live_discharge_p90?.toFixed(1)}%`);
console.log(`  GIP utilization: median=${THRESHOLDS.gip_median?.toFixed(2)}%, P90=${THRESHOLDS.gip_p90?.toFixed(2)}%`);

// === Build per-provider records ===
console.log('Building provider records...');
function ownershipFlags(ccn) {
  const o = ownersByCcn.get(ccn);
  if (!o) return { pe: false, reit: false, forProfit: false, nonProfit: false, chain: false };
  return o.flags;
}
function parentOrg(ccn) {
  const o = ownersByCcn.get(ccn);
  if (!o) return null;
  const owners = Array.from(o.ownerNames);
  return owners[0] || null;
}

const providers = [];
for (const g of generalInfo) {
  const ccn = g['CMS Certification Number (CCN)'];
  if (!ccn) continue;
  const measures = measuresByCcn.get(ccn) || {};
  const liveDischarge = measures.H_012_03_OBSERVED ?? null;
  const gipPct = measures.H_012_01_OBSERVED ?? null;

  const flags = {
    live_discharge_high: liveDischarge != null && THRESHOLDS.live_discharge_p90 != null && liveDischarge >= THRESHOLDS.live_discharge_p90,
    gip_high: gipPct != null && THRESHOLDS.gip_p90 != null && gipPct >= THRESHOLDS.gip_p90,
  };
  flags.flagged_count = (flags.live_discharge_high ? 1 : 0) + (flags.gip_high ? 1 : 0);

  providers.push({
    ccn,
    name: g['Facility Name'] || '',
    address: g['Address Line 1'] || '',
    city: g['City/Town'] || '',
    state: g['State'] || '',
    zip: g['ZIP Code'] || '',
    phone: g['Telephone Number'] || '',
    ownership_type: g['Ownership Type'] || '',
    certification_date: g['Certification Date'] || '',
    parent: parentOrg(ccn),
    ownership_flags: ownershipFlags(ccn),
    metrics: {
      live_discharge_pct: liveDischarge,
      gip_pct: gipPct,
      late_live_discharge_pct: measures.H_012_04_OBSERVED ?? null,
      burdensome_transitions_t1_pct: measures.H_012_05_OBSERVED ?? null,
      burdensome_transitions_t2_pct: measures.H_012_06_OBSERVED ?? null,
      nurse_care_minutes_per_rhc_day: measures.H_012_08_OBSERVED ?? null,
      avg_daily_census: measures.Average_Daily_Census ?? null,
      care_provided_home_pct: measures.Care_Provided_Home ?? null,
      care_provided_inpatient_hospital_pct: measures.Care_Provided_Inpatient_Hospital ?? null,
      care_provided_inpatient_hospice_pct: measures.Care_Provided_Inpatient_Hospice ?? null,
    },
    flags,
  });
}
console.log(`  ${providers.length.toLocaleString()} provider records built`);

// === Group by state, write per-state files ===
console.log('Writing per-state JSON files...');
const byState = new Map();
for (const p of providers) {
  const st = p.state || 'XX';
  if (!byState.has(st)) byState.set(st, []);
  byState.get(st).push(p);
}

const stateSummary = [];
for (const [state, list] of byState.entries()) {
  // sort by name for stable file content
  list.sort((a, b) => a.name.localeCompare(b.name));
  const flagged = list.filter(p => p.flags.flagged_count > 0);
  const stateData = {
    state,
    count: list.length,
    flagged_count: flagged.length,
    flagged_pct: list.length ? (flagged.length / list.length) * 100 : 0,
    providers: list,
  };
  writeFileSync(join(OUT_STATES, `${state}.json`), JSON.stringify(stateData));
  stateSummary.push({
    state,
    count: list.length,
    flagged_count: flagged.length,
    flagged_pct: stateData.flagged_pct,
  });
}
console.log(`  ${byState.size} state files written`);

// === Write flat search index ===
console.log('Writing flat search index...');
const searchIndex = providers.map(p => ({
  ccn: p.ccn,
  name: p.name,
  city: p.city,
  state: p.state,
  zip: p.zip,
  flagged_count: p.flags.flagged_count,
}));
writeFileSync(join(OUT, 'index.json'), JSON.stringify(searchIndex));
console.log(`  ${searchIndex.length.toLocaleString()} index entries`);

// === Write national summary ===
console.log('Writing national summary...');
const totalFlagged = providers.filter(p => p.flags.flagged_count > 0).length;
const topFlaggedStates = stateSummary
  .filter(s => s.count >= 20) // ignore tiny states for the rank
  .sort((a, b) => b.flagged_pct - a.flagged_pct)
  .slice(0, 10);

const summary = {
  generated_at: new Date().toISOString(),
  source_window: 'CMS Hospice Care Compare · most recent provider data',
  total_providers: providers.length,
  total_states: byState.size,
  total_flagged: totalFlagged,
  total_flagged_pct: (totalFlagged / providers.length) * 100,
  thresholds: THRESHOLDS,
  by_state: stateSummary,
  top_flagged_states: topFlaggedStates,
  framework_source: 'California State Auditor Report 2021-123 (March 2022)',
};
writeFileSync(join(OUT, 'national-summary.json'), JSON.stringify(summary, null, 2));

// === CAHPS benchmarks ===
console.log('Writing CAHPS benchmarks...');
const stateCahpsText = readFileSync(join(RAW, 'hospice_state_cahps.csv'), 'utf-8');
const nationalCahpsText = readFileSync(join(RAW, 'hospice_national_cahps.csv'), 'utf-8');
const stateCahps = csvToObjects(stateCahpsText);
const nationalCahps = csvToObjects(nationalCahpsText);
writeFileSync(join(OUT, 'cahps-benchmarks.json'), JSON.stringify({
  national: nationalCahps,
  by_state: stateCahps,
}));
console.log(`  ${nationalCahps.length} national + ${stateCahps.length} state CAHPS rows`);

console.log('\n✓ Hospice data build complete');
console.log(`  Total providers: ${providers.length.toLocaleString()}`);
console.log(`  Flagged for review: ${totalFlagged.toLocaleString()} (${(totalFlagged / providers.length * 100).toFixed(1)}%)`);
console.log(`  States covered: ${byState.size}`);
