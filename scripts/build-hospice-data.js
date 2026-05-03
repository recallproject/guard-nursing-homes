// Build hospice data files for the /hospice page and /hospice/:ccn report cards.
//
// Inputs (read from data/raw/hospice/):
//   - hospice_general_info.csv                     provider directory (CCN, name, address, ownership)
//   - hospice_provider_data.csv                    long-form provider × CMS Hospice Care Index measures
//   - provider_cahps_hospice_survey_nov2025.csv    long-form per-provider CAHPS family-experience scores
//                                                  (CMS distribution: Provider_CAHPS_Hospice_Survey_Data_Feb2026.csv)
//   - hospice_state_cahps.csv                      state-level CAHPS family-experience benchmarks
//   - hospice_national_cahps.csv                   national CAHPS benchmarks
//   - hospice_all_owners_20251001.csv              quarterly ownership disclosure (most recent)
//
// Outputs (written to public/data/hospice/):
//   - states/{XX}.json                 per-state provider list with screening flags + clinical metrics + CAHPS
//   - index.json                       flat list for search (slim record per provider)
//   - national-summary.json            counts, thresholds, top-state-flagged, CAHPS coverage
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

// Measure codes pulled from hospice_provider_data.csv (long-form: one row per CCN × measure).
// Two groups:
//   1. Screening-framework measures — used to compute live-discharge / GIP flags.
//   2. Clinical-quality + utilization measures — surfaced on the per-provider report card
//      and the comparison table so empty cells get filled.
//
// NOTE on requested-but-absent codes (verified against actual CSV — 67 distinct codes):
//   - H_011_01_OBSERVED is "Hospice Visits in the Last Days of Life" (HVLDL), NOT
//     "Hospice Care Index composite". The HCI composite is H_012_00_OBSERVED.
//     We capture both and use H_012_00_OBSERVED for cms_overall_rating derivation.
//   - H_011_01_PERCENTILE, H_001_02_OBSERVED, H_002_02_OBSERVED, Total_Beneficiaries
//     do NOT exist in the CMS Provider file. They are intentionally not extracted.
const KEEP_MEASURES = new Set([
  // ── Screening framework (Pattern 1 + Pattern 2) ─────────────────────────────
  'H_012_03_OBSERVED',  // Early live discharges (% live discharges) — Pattern 1
  'H_012_03_DENOMINATOR',
  'H_012_04_OBSERVED',  // Late live discharges
  'H_012_01_OBSERVED',  // CHC/GIP provided (% days) — Pattern 2
  'H_012_01_DENOMINATOR',
  'H_012_05_OBSERVED',  // Burdensome transitions T1
  'H_012_06_OBSERVED',  // Burdensome transitions T2
  'H_012_08_OBSERVED',  // Nurse care minutes per RHC day

  // ── Hospice Care Index — composite + percentile ─────────────────────────────
  'H_012_00_OBSERVED',   // HCI composite (0-10 scale) — derives cms_overall_rating
  'H_011_01_OBSERVED',   // HVLDL — Hospice Visits in the Last Days of Life
  'H_011_01_DENOMINATOR',

  // ── Process-of-care quality measures (HQRP / HOPE) ──────────────────────────
  'H_001_01_OBSERVED',   // Treatment Preferences
  'H_002_01_OBSERVED',   // Beliefs & Values Addressed (if desired by patient)
  'H_003_01_OBSERVED',   // Pain Screening
  'H_004_01_OBSERVED',   // Pain Assessment
  'H_005_01_OBSERVED',   // Dyspnea Screening (CSV label)
  'H_006_01_OBSERVED',   // Dyspnea Treatment
  'H_007_01_OBSERVED',   // Patients Treated with an Opioid Receiving Bowel Regimen
  'H_008_01_OBSERVED',   // Composite Process Measure

  // ── Census / utilization ────────────────────────────────────────────────────
  'Average_Daily_Census',

  // ── Setting-of-care % days ──────────────────────────────────────────────────
  'Care_Provided_Home',
  'Care_Provided_Inpatient_Hospital',
  'Care_Provided_Inpatient_Hospice',
  'Care_Provided_Nursing_Facility',
  'Care_Provided_Skilled_Nursing',
  'Care_Provided_Assisted_Living',
  'Care_Provided_other_locations',
  'Provided_Home_Care_only',

  // ── Beneficiary mix ─────────────────────────────────────────────────────────
  'Bene_MA_Pct',         // % Medicare Advantage beneficiaries
  'Bene_Dual_Pct',       // % Medicare/Medicaid dual-eligible
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

// === Load per-provider CAHPS family-experience scores ===
//
// Source: CMS "Hospice care - Provider CAHPS Hospice Survey Data" (dataset id gxki-hrr8).
// Local file: provider_cahps_hospice_survey_nov2025.csv (~173K rows, 6,943 distinct CCNs).
// Long-form: one row per CCN × measure × box. We pivot to per-CCN.
//
// Eight H-CAHPS measure families × 3 variants (BBV / MBV / TBV) + SUMMARY_STAR_RATING:
//   RATING       overall rating of the hospice
//   RECOMMEND    would-recommend
//   TEAM_COMM    communication with team
//   TIMELY_CARE  getting timely care
//   RESPECT      treating patient with respect
//   EMO_REL      emotional & spiritual support
//   SYMPTOMS     getting help for symptoms (pain management proxy)
//   TRAINING     training family to care for patient
// We surface the TBV (top-box, % positive) variant for each — the consumer-facing %
// that CMS shows on Care Compare. BBV/MBV are dropped from per-provider output to
// keep file size down (still available in raw CSV if we ever need them).
//
// CAHPS footnote codes (CMS standard):
//   1   = "The number of cases/patients is too few to report"
//   2   = "Data submitted were based on a sample size of fewer than 100 patients"
//   6   = "Fewer than 50 completed surveys"
//   7   = "No data are available from the provider for this period"
//   9   = "Not Applicable"
//   10  = "Score is suppressed because the response rate was less than the minimum"
//   11  = "Results are not comparable to other providers"
//   15  = "Different methodology was used"
// When the Score field is "Not Applicable" / "Not Available" or non-numeric, we set null.
console.log('Reading per-provider CAHPS data...');
const cahpsByCcn = new Map();
let cahpsRowsTotal = 0;
const CAHPS_PATH = join(RAW, 'provider_cahps_hospice_survey_nov2025.csv');
try {
  const cahpsText = readFileSync(CAHPS_PATH, 'utf-8');
  // Quick sanity check — the file in this folder was previously a 404 HTML page.
  if (cahpsText.startsWith('<!DOCTYPE')) {
    throw new Error('CAHPS file is HTML (404 page), not CSV. Re-download from CMS dataset gxki-hrr8.');
  }
  const cahpsRows = csvToObjects(cahpsText);
  cahpsRowsTotal = cahpsRows.length;
  console.log(`  ${cahpsRowsTotal.toLocaleString()} CAHPS measure rows`);

  // Map CMS measure code → output field name on provider.cahps
  const CAHPS_FIELD_MAP = {
    RATING_TBV:       'overall_rating_pct',
    RECOMMEND_TBV:    'would_recommend_pct',
    TEAM_COMM_TBV:    'communication_pct',
    TIMELY_CARE_TBV:  'timely_care_pct',
    RESPECT_TBV:      'respect_pct',
    EMO_REL_TBV:      'emotional_support_pct',
    SYMPTOMS_TBV:     'pain_management_pct',
    TRAINING_TBV:     'training_family_pct',
  };

  for (const row of cahpsRows) {
    const ccn = row['CMS Certification Number (CCN)'];
    if (!ccn) continue;
    const code = row['Measure Code'];
    if (!cahpsByCcn.has(ccn)) {
      cahpsByCcn.set(ccn, {
        overall_rating_pct: null,
        would_recommend_pct: null,
        communication_pct: null,
        timely_care_pct: null,
        respect_pct: null,
        emotional_support_pct: null,
        pain_management_pct: null,
        training_family_pct: null,
        summary_star_rating: null,
        // The Provider CAHPS distribution does NOT publish per-provider response_count
        // or response_rate_pct. We keep the keys in the schema (= null) so the React
        // table doesn't have to handle missing properties, and so the columns can be
        // wired-in later if CMS adds the file.
        response_count: null,
        response_rate_pct: null,
      });
    }
    const bucket = cahpsByCcn.get(ccn);

    if (code === 'SUMMARY_STAR_RATING') {
      const stars = parseFloat(row['Star Rating']);
      bucket.summary_star_rating = Number.isNaN(stars) ? null : stars;
      continue;
    }
    const field = CAHPS_FIELD_MAP[code];
    if (!field) continue; // skip BBV/MBV variants
    const score = parseFloat(row['Score']);
    // CMS withholds via footnote OR via "Not Applicable" / "Not Available" string in Score
    if (Number.isNaN(score)) {
      // leave null
      continue;
    }
    bucket[field] = score;
  }
  console.log(`  ${cahpsByCcn.size.toLocaleString()} CCNs with at least one CAHPS row`);
} catch (err) {
  console.warn(`  ⚠ Could not load CAHPS (${err.message}). Per-provider CAHPS will be null.`);
}

// === Helpers for per-provider records ===
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

// Derive a 1-5 star CMS overall rating from the Hospice Care Index composite score
// (H_012_00_OBSERVED, 0-10 scale). CMS does not publish a single "overall rating"
// for hospices in any of the public Provider distributions — only the HCI composite
// and the CAHPS Summary Star Rating. We bucket the HCI composite into stars per the
// rubric provided in the task spec. If CMS later publishes an explicit rating in a
// separate file, this function should be replaced with a direct lookup.
function deriveCmsOverallRating(hciComposite) {
  if (hciComposite == null || Number.isNaN(hciComposite)) return null;
  if (hciComposite >= 9.0)  return 5;
  if (hciComposite >= 8.0)  return 4;
  if (hciComposite >= 7.0)  return 3;
  if (hciComposite >= 6.0)  return 2;
  return 1;
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

  const careInpatientHospicePct = measures.Care_Provided_Inpatient_Hospice ?? null;
  const hciComposite = measures.H_012_00_OBSERVED ?? null;

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

    // Derived: 1-5 star rating from HCI composite (H_012_00_OBSERVED).
    // See deriveCmsOverallRating() docstring above.
    cms_overall_rating: deriveCmsOverallRating(hciComposite),

    // Derived: any reported inpatient-hospice care = facility operates an IPU.
    inpatient_unit_available: careInpatientHospicePct != null && careInpatientHospicePct > 0,

    metrics: {
      // ── Screening framework ─────────────────────────────────────────────
      live_discharge_pct: liveDischarge,
      gip_pct: gipPct,
      late_live_discharge_pct: measures.H_012_04_OBSERVED ?? null,
      burdensome_transitions_t1_pct: measures.H_012_05_OBSERVED ?? null,
      burdensome_transitions_t2_pct: measures.H_012_06_OBSERVED ?? null,
      nurse_care_minutes_per_rhc_day: measures.H_012_08_OBSERVED ?? null,

      // ── Hospice Care Index ──────────────────────────────────────────────
      hci_composite: hciComposite,                              // 0-10 scale, source for cms_overall_rating
      hvldl_pct: measures.H_011_01_OBSERVED ?? null,            // % patients with hospice visits in last days of life

      // ── Process-of-care quality measures ────────────────────────────────
      treatment_preferences_pct: measures.H_001_01_OBSERVED ?? null,
      beliefs_values_addressed_pct: measures.H_002_01_OBSERVED ?? null,
      pain_screening_pct: measures.H_003_01_OBSERVED ?? null,
      pain_assessment_pct: measures.H_004_01_OBSERVED ?? null,
      dyspnea_screening_pct: measures.H_005_01_OBSERVED ?? null,
      dyspnea_treatment_pct: measures.H_006_01_OBSERVED ?? null,
      opioid_bowel_regimen_pct: measures.H_007_01_OBSERVED ?? null,
      composite_process_pct: measures.H_008_01_OBSERVED ?? null,

      // ── Census / utilization ────────────────────────────────────────────
      avg_daily_census: measures.Average_Daily_Census ?? null,

      // ── Setting-of-care % days ──────────────────────────────────────────
      care_provided_home_pct: measures.Care_Provided_Home ?? null,
      care_provided_inpatient_hospital_pct: measures.Care_Provided_Inpatient_Hospital ?? null,
      care_provided_inpatient_hospice_pct: careInpatientHospicePct,
      care_provided_nursing_facility_pct: measures.Care_Provided_Nursing_Facility ?? null,
      care_provided_skilled_nursing_pct: measures.Care_Provided_Skilled_Nursing ?? null,
      care_provided_assisted_living_pct: measures.Care_Provided_Assisted_Living ?? null,
      care_provided_other_pct: measures.Care_Provided_other_locations ?? null,
      provided_home_care_only_pct: measures.Provided_Home_Care_only ?? null,

      // ── Beneficiary mix ─────────────────────────────────────────────────
      bene_ma_pct: measures.Bene_MA_Pct ?? null,
      bene_dual_pct: measures.Bene_Dual_Pct ?? null,
    },

    // CAHPS family-experience scores (top-box %, 0-100). null if CMS withheld
    // (e.g. < 50 surveys, footnote 6/7/9/10/11/15) or no CAHPS row at all.
    cahps: cahpsByCcn.get(ccn) || {
      overall_rating_pct: null,
      would_recommend_pct: null,
      communication_pct: null,
      timely_care_pct: null,
      respect_pct: null,
      emotional_support_pct: null,
      pain_management_pct: null,
      training_family_pct: null,
      summary_star_rating: null,
      response_count: null,
      response_rate_pct: null,
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

// CAHPS coverage stats — % of providers with at least overall_rating_pct populated
const cahpsCoverageOverall = providers.filter(p => p.cahps?.overall_rating_pct != null).length;
const cahpsCoverageAny = providers.filter(p => {
  const c = p.cahps;
  if (!c) return false;
  return ['overall_rating_pct','would_recommend_pct','communication_pct','timely_care_pct',
          'respect_pct','emotional_support_pct','pain_management_pct','training_family_pct']
    .some(k => c[k] != null);
}).length;
const cmsRatingCoverage = providers.filter(p => p.cms_overall_rating != null).length;

const summary = {
  generated_at: new Date().toISOString(),
  source_window: 'CMS Hospice Care Compare · most recent provider data',
  total_providers: providers.length,
  total_states: byState.size,
  total_flagged: totalFlagged,
  total_flagged_pct: (totalFlagged / providers.length) * 100,
  thresholds: THRESHOLDS,
  coverage: {
    cms_overall_rating: cmsRatingCoverage,
    cms_overall_rating_pct: (cmsRatingCoverage / providers.length) * 100,
    cahps_overall_rating: cahpsCoverageOverall,
    cahps_overall_rating_pct: (cahpsCoverageOverall / providers.length) * 100,
    cahps_any_measure: cahpsCoverageAny,
    cahps_any_measure_pct: (cahpsCoverageAny / providers.length) * 100,
  },
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
console.log(`  CMS overall rating populated: ${cmsRatingCoverage.toLocaleString()} (${(cmsRatingCoverage / providers.length * 100).toFixed(1)}%)`);
console.log(`  CAHPS overall_rating_pct populated: ${cahpsCoverageOverall.toLocaleString()} (${(cahpsCoverageOverall / providers.length * 100).toFixed(1)}%)`);
console.log(`  CAHPS any measure populated: ${cahpsCoverageAny.toLocaleString()} (${(cahpsCoverageAny / providers.length * 100).toFixed(1)}%)`);
