// Build Home Health, IRF, and LTACH data for SPA search hubs + provider detail pages.
//
// Fetches current CMS Provider Data Catalog (Care Compare) records and writes
// compact JSON under public/data/{home-health,irf,ltach}/ plus a generated
// counts module used by the homepage tiles.
//
// Usage:
//   node scripts/build-postacute-data.js
//
// Does NOT generate per-provider HTML. Detail pages are client-rendered SPA routes.
//
// Datasets (https://data.cms.gov/provider-data/):
//   Home Health agencies     6jpm-sxkc
//   Home Health HHCAHPS      ccn4-8vby   (patient-survey stars)
//   IRF general info         7t8x-u3ir
//   IRF provider quality     v9e4-nwhh
//   IRF national benchmarks  nasn-k89k
//   LTCH general info        azum-44iv
//   LTCH provider quality    fp6g-2gsn
//   LTCH national benchmarks 5zdx-ny2x

import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public', 'data');
const CMS_QUERY = 'https://data.cms.gov/provider-data/api/1/datastore/query';
const PAGE_SIZE = 1500;
const UA = 'OversightReports/1.0 (https://www.oversightreports.com; CMS public data rebuild)';

const DATASETS = {
  homeHealth: { id: '6jpm-sxkc', title: 'Home Health Care Agencies' },
  hhCahps: { id: 'ccn4-8vby', title: 'Home Health Care - Patient Survey (HHCAHPS)' },
  irfGeneral: { id: '7t8x-u3ir', title: 'Inpatient Rehabilitation Facility - General Information' },
  irfQuality: { id: 'v9e4-nwhh', title: 'Inpatient Rehabilitation Facility - Provider Data' },
  irfNational: { id: 'nasn-k89k', title: 'Inpatient Rehabilitation Facility - National Data' },
  ltchGeneral: { id: 'azum-44iv', title: 'Long-Term Care Hospital - General Information' },
  ltchQuality: { id: 'fp6g-2gsn', title: 'Long-Term Care Hospital - Provider Data' },
  ltchNational: { id: '5zdx-ny2x', title: 'Long-Term Care Hospital - National Data' },
};

function blankToNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === '-' || s === '.' || /^not (available|applicable)$/i.test(s)) return null;
  return s;
}

function parseNum(v) {
  const s = blankToNull(v);
  if (s == null) return null;
  const n = Number(String(s).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseYes(v) {
  const s = blankToNull(v);
  if (s == null) return null;
  const u = s.toLowerCase();
  if (u === 'yes' || u === 'y' || u === 'true') return true;
  if (u === 'no' || u === 'n' || u === 'false') return false;
  return null;
}

function cleanAddr(v) {
  const s = blankToNull(v);
  if (!s) return '';
  return s;
}

function padCcn(raw) {
  const s = blankToNull(raw);
  if (!s) return null;
  return s.toUpperCase();
}

async function fetchJson(url, attempt = 1) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) {
    if (attempt < 5 && (res.status === 429 || res.status >= 500)) {
      const wait = attempt * 1500;
      console.warn(`  retry ${attempt} after HTTP ${res.status} (${wait}ms) ${url}`);
      await new Promise((r) => setTimeout(r, wait));
      return fetchJson(url, attempt + 1);
    }
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

async function fetchAll(datasetId, label) {
  const rows = [];
  let offset = 0;
  let total = null;
  console.log(`Fetching ${label} (${datasetId})…`);
  while (true) {
    const url = `${CMS_QUERY}/${datasetId}/0?limit=${PAGE_SIZE}&offset=${offset}`;
    const body = await fetchJson(url);
    const batch = Array.isArray(body.results) ? body.results : [];
    if (total == null && typeof body.count === 'number') total = body.count;
    rows.push(...batch);
    process.stdout.write(`  ${rows.length.toLocaleString()}${total != null ? ` / ${total.toLocaleString()}` : ''}\r`);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    if (total != null && rows.length >= total) break;
  }
  console.log(`  ${rows.length.toLocaleString()} rows`);
  return rows;
}

function ensureDir(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, 'states'), { recursive: true });
}

function writeSetting(outDir, { providers, source, extraSummary = {} }) {
  ensureDir(outDir);
  const byState = new Map();
  for (const p of providers) {
    const st = p.state || 'XX';
    if (!byState.has(st)) byState.set(st, []);
    byState.get(st).push(p);
  }

  const stateSummary = [];
  for (const [state, list] of byState.entries()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
    writeFileSync(join(outDir, 'states', `${state}.json`), JSON.stringify({
      state,
      count: list.length,
      providers: list,
    }));
    stateSummary.push({ state, count: list.length });
  }
  stateSummary.sort((a, b) => a.state.localeCompare(b.state));

  const searchIndex = providers.map((p) => ({
    ccn: p.ccn,
    name: p.name,
    city: p.city,
    state: p.state,
    zip: p.zip,
    star: p.quality?.patient_care_star ?? p.survey?.summary_star ?? null,
  }));
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(searchIndex));

  const summary = {
    generated_at: new Date().toISOString(),
    source,
    total_providers: providers.length,
    total_states: byState.size,
    by_state: stateSummary,
    ...extraSummary,
  };
  writeFileSync(join(outDir, 'national-summary.json'), JSON.stringify(summary, null, 2));

  return summary;
}

function nationalByCode(rows) {
  const out = {};
  for (const row of rows) {
    const code = blankToNull(row.measure_code);
    if (!code) continue;
    out[code] = parseNum(row.score) ?? blankToNull(row.score);
  }
  return out;
}

function pivotMeasures(rows, keep) {
  const byCcn = new Map();
  for (const row of rows) {
    const code = row.measure_code;
    if (!keep.has(code)) continue;
    const ccn = padCcn(row.cms_certification_number_ccn);
    if (!ccn) continue;
    if (!byCcn.has(ccn)) byCcn.set(ccn, {});
    const scoreNum = parseNum(row.score);
    byCcn.get(ccn)[code] = scoreNum != null ? scoreNum : blankToNull(row.score);
  }
  return byCcn;
}

function buildHomeHealth(agencies, surveys) {
  const surveyByCcn = new Map();
  for (const row of surveys) {
    const ccn = padCcn(row.cms_certification_number_ccn);
    if (!ccn) continue;
    surveyByCcn.set(ccn, {
      summary_star: parseNum(row.hhcahps_survey_summary_star_rating),
      overall_care_star: parseNum(row.star_rating_for_how_patients_rated_overall_care_from_agency),
      professional_care_star: parseNum(row.star_rating_for_health_team_gave_care_in_a_professional_way),
      communication_star: parseNum(row.star_rating_for_health_team_communicated_well_with_them),
      overall_rating_9or10_pct: parseNum(row.percent_of_patients_who_gave_their_home_health_agency_a_rat_187c),
      would_recommend_pct: parseNum(row.percent_of_patients_who_reported_yes_they_would_definitely__2707),
      completed_surveys: parseNum(row.number_of_completed_surveys),
      response_rate_pct: parseNum(row.survey_response_rate),
    });
  }

  const providers = [];
  for (const g of agencies) {
    const ccn = padCcn(g.cms_certification_number_ccn);
    if (!ccn) continue;
    providers.push({
      ccn,
      name: blankToNull(g.provider_name) || '',
      address: cleanAddr(g.address),
      city: blankToNull(g.citytown) || '',
      state: blankToNull(g.state) || '',
      zip: blankToNull(g.zip_code) || '',
      phone: blankToNull(g.telephone_number) || '',
      ownership_type: blankToNull(g.type_of_ownership) || '',
      certification_date: blankToNull(g.certification_date) || '',
      services: {
        nursing: parseYes(g.offers_nursing_care_services),
        physical_therapy: parseYes(g.offers_physical_therapy_services),
        occupational_therapy: parseYes(g.offers_occupational_therapy_services),
        speech: parseYes(g.offers_speech_pathology_services),
        medical_social: parseYes(g.offers_medical_social_services),
        home_health_aide: parseYes(g.offers_home_health_aide_services),
      },
      quality: {
        patient_care_star: parseNum(g.quality_of_patient_care_star_rating),
        timely_care_pct: parseNum(g.how_often_the_home_health_team_began_their_patients_care_in_d440),
        walking_improvement_pct: parseNum(g.how_often_patients_got_better_at_walking_or_moving_around),
        bed_transfer_improvement_pct: parseNum(g.how_often_patients_got_better_at_getting_in_and_out_of_bed),
        bathing_improvement_pct: parseNum(g.how_often_patients_got_better_at_bathing),
        breathing_improvement_pct: parseNum(g.how_often_patients_breathing_improved),
        medication_improvement_pct: parseNum(g.how_often_patients_got_better_at_taking_their_drugs_correct_bd88),
        discharge_function_score: parseNum(g.discharge_function_score),
        dtc_risk_standardized_pct: parseNum(g.dtc_riskstandardized_rate),
        ppr_risk_standardized_pct: parseNum(g.ppr_riskstandardized_rate),
        pph_risk_standardized_pct: parseNum(g.pph_riskstandardized_rate),
      },
      survey: surveyByCcn.get(ccn) || {
        summary_star: null,
        overall_care_star: null,
        professional_care_star: null,
        communication_star: null,
        overall_rating_9or10_pct: null,
        would_recommend_pct: null,
        completed_surveys: null,
        response_rate_pct: null,
      },
    });
  }
  return providers;
}

function buildIrf(general, qualityRows, nationalRows) {
  const keep = new Set([
    'I_019_02_DTC_RS_RATE',
    'I_017_01_PPR_PD_RSRR',
    'I_011_05_OBS_RATE',
    'I_013_01_OBS_RATE',
    'I_022_01_OBS_RATE',
    'I_006_01_SIR',
  ]);
  const measures = pivotMeasures(qualityRows, keep);
  const providers = [];
  for (const g of general) {
    const ccn = padCcn(g.cms_certification_number_ccn);
    if (!ccn) continue;
    const m = measures.get(ccn) || {};
    providers.push({
      ccn,
      name: blankToNull(g.provider_name) || '',
      address: cleanAddr(g.address_line_1),
      city: blankToNull(g.citytown) || '',
      state: blankToNull(g.state) || '',
      zip: blankToNull(g.zip_code) || '',
      phone: blankToNull(g.telephone_number) || '',
      county: blankToNull(g.countyparish) || '',
      cms_region: blankToNull(g.cms_region) || '',
      ownership_type: blankToNull(g.ownership_type) || '',
      certification_date: blankToNull(g.certification_date) || '',
      quality: {
        dtc_risk_standardized_pct: parseNum(m.I_019_02_DTC_RS_RATE),
        ppr_30day_pct: parseNum(m.I_017_01_PPR_PD_RSRR),
        discharge_function_score: parseNum(m.I_011_05_OBS_RATE),
        falls_major_injury_pct: parseNum(m.I_013_01_OBS_RATE),
        pressure_ulcer_pct: parseNum(m.I_022_01_OBS_RATE),
        cauti_sir: parseNum(m.I_006_01_SIR),
      },
    });
  }
  return { providers, national: nationalByCode(nationalRows) };
}

function buildLtch(general, qualityRows, nationalRows) {
  const keep = new Set([
    'L_018_02_DTC_RS_RATE',
    'L_017_01_PPR_PD_RSRR',
    'L_006_01_SIR',
    'L_007_01_SIR',
    'L_014_01_SIR',
    'L_011_05_ADJ_CHG_MOBL_SCORE',
  ]);
  const measures = pivotMeasures(qualityRows, keep);
  const providers = [];
  for (const g of general) {
    const ccn = padCcn(g.cms_certification_number_ccn);
    if (!ccn) continue;
    const m = measures.get(ccn) || {};
    providers.push({
      ccn,
      name: blankToNull(g.provider_name) || '',
      address: cleanAddr(g.address_line_1),
      city: blankToNull(g.citytown) || '',
      state: blankToNull(g.state) || '',
      zip: blankToNull(g.zip_code) || '',
      phone: blankToNull(g.telephone_number) || '',
      county: blankToNull(g.countyparish) || '',
      cms_region: blankToNull(g.cms_region) || '',
      ownership_type: blankToNull(g.ownership_type) || '',
      certification_date: blankToNull(g.certification_date) || '',
      beds: parseNum(g.total_number_of_beds),
      quality: {
        dtc_risk_standardized_pct: parseNum(m.L_018_02_DTC_RS_RATE),
        ppr_30day_pct: parseNum(m.L_017_01_PPR_PD_RSRR),
        cauti_sir: parseNum(m.L_006_01_SIR),
        clabsi_sir: parseNum(m.L_007_01_SIR),
        cdi_sir: parseNum(m.L_014_01_SIR),
        mobility_change_score: parseNum(m.L_011_05_ADJ_CHG_MOBL_SCORE),
      },
    });
  }
  return { providers, national: nationalByCode(nationalRows) };
}

function writeCountsModule(counts) {
  const path = join(ROOT, 'src', 'data', 'postAcuteCounts.js');
  const body = `// Generated by scripts/build-postacute-data.js — do not edit by hand.
export const POST_ACUTE_CMS_COUNTS = ${JSON.stringify(counts, null, 2)};
`;
  writeFileSync(path, body);
  console.log(`Wrote ${path}`);
}

function sampleLinks(setting, providers) {
  const withName = providers.filter((p) => p.name && p.state);
  const pick = withName[0] || providers[0];
  if (!pick) return null;
  return { setting, ccn: pick.ccn, name: pick.name, city: pick.city, state: pick.state };
}

async function main() {
  const hhAgencies = await fetchAll(DATASETS.homeHealth.id, DATASETS.homeHealth.title);
  const hhSurveys = await fetchAll(DATASETS.hhCahps.id, DATASETS.hhCahps.title);
  const irfGeneral = await fetchAll(DATASETS.irfGeneral.id, DATASETS.irfGeneral.title);
  const irfQuality = await fetchAll(DATASETS.irfQuality.id, DATASETS.irfQuality.title);
  const irfNational = await fetchAll(DATASETS.irfNational.id, DATASETS.irfNational.title);
  const ltchGeneral = await fetchAll(DATASETS.ltchGeneral.id, DATASETS.ltchGeneral.title);
  const ltchQuality = await fetchAll(DATASETS.ltchQuality.id, DATASETS.ltchQuality.title);
  const ltchNational = await fetchAll(DATASETS.ltchNational.id, DATASETS.ltchNational.title);

  const hhProviders = buildHomeHealth(hhAgencies, hhSurveys);
  const irf = buildIrf(irfGeneral, irfQuality, irfNational);
  const ltch = buildLtch(ltchGeneral, ltchQuality, ltchNational);

  const hhSummary = writeSetting(join(PUBLIC, 'home-health'), {
    providers: hhProviders,
    source: {
      window: 'CMS Home Health Care Compare',
      datasets: [DATASETS.homeHealth, DATASETS.hhCahps],
    },
    extraSummary: {
      coverage: {
        patient_care_star: hhProviders.filter((p) => p.quality.patient_care_star != null).length,
        survey_summary_star: hhProviders.filter((p) => p.survey.summary_star != null).length,
      },
    },
  });

  const irfSummary = writeSetting(join(PUBLIC, 'irf'), {
    providers: irf.providers,
    source: {
      window: 'CMS Inpatient Rehabilitation Facility Compare',
      datasets: [DATASETS.irfGeneral, DATASETS.irfQuality, DATASETS.irfNational],
    },
    extraSummary: { national: irf.national },
  });

  const ltchSummary = writeSetting(join(PUBLIC, 'ltach'), {
    providers: ltch.providers,
    source: {
      window: 'CMS Long-Term Care Hospital Compare',
      datasets: [DATASETS.ltchGeneral, DATASETS.ltchQuality, DATASETS.ltchNational],
    },
    extraSummary: { national: ltch.national },
  });

  const counts = {
    generated_at: new Date().toISOString(),
    'home-health': hhSummary.total_providers,
    irf: irfSummary.total_providers,
    ltach: ltchSummary.total_providers,
  };
  writeCountsModule(counts);

  const samples = [
    sampleLinks('home-health', hhProviders),
    sampleLinks('irf', irf.providers),
    sampleLinks('ltach', ltch.providers),
  ];
  writeFileSync(join(PUBLIC, 'postacute-build-meta.json'), JSON.stringify({ counts, samples }, null, 2));

  console.log('\n✓ Post-acute data build complete');
  console.log(`  Home Health: ${hhSummary.total_providers.toLocaleString()} agencies · ${hhSummary.total_states} states`);
  console.log(`  IRF:         ${irfSummary.total_providers.toLocaleString()} facilities · ${irfSummary.total_states} states`);
  console.log(`  LTACH:       ${ltchSummary.total_providers.toLocaleString()} hospitals · ${ltchSummary.total_states} states`);
  console.log('  Sample deep links:');
  for (const s of samples) {
    if (!s) continue;
    console.log(`    /${s.setting}/${s.ccn}  ${s.name} (${s.city}, ${s.state})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
