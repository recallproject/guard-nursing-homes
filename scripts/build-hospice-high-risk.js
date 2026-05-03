#!/usr/bin/env node
/**
 * build-hospice-high-risk.js
 *
 * Pre-compute the hospice high-risk dataset shown on /hospice/high-risk.
 * Reads per-state CMS hospice JSONs, scores each provider on six axes
 * (California State Auditor 2024 framework lens), and outputs the top 200
 * by composite risk score.
 *
 * Output: public/data/hospice/high-risk.json
 *
 * Node stdlib only — no third-party deps.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');
const hospiceDataDir = join(publicDir, 'data', 'hospice');
const statesDir = join(hospiceDataDir, 'states');

const METHODOLOGY_VERSION = '2026-05-02';
const FRAMEWORK_LABEL = 'California State Auditor (Report 2024-126, Hospice Licensure)';
const PUBLIC_RECORD_LOOKBACK_DAYS = 730; // 24 months

// ── helpers ─────────────────────────────────────────────────────────────
function safeReadJSON(p, fallback = null) {
  try {
    if (!existsSync(p)) return fallback;
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (err) {
    console.warn(`  ⚠ failed to read ${p}: ${err.message}`);
    return fallback;
  }
}

function quantile(sortedAsc, q) {
  if (!sortedAsc.length) return null;
  const pos = (sortedAsc.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedAsc[base + 1] !== undefined) {
    return sortedAsc[base] + rest * (sortedAsc[base + 1] - sortedAsc[base]);
  }
  return sortedAsc[base];
}

function isPositiveNumber(v) {
  return typeof v === 'number' && !Number.isNaN(v) && v >= 0;
}

function withinLookback(dateStr) {
  if (!dateStr) return false;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return false;
  return (Date.now() - t) / (1000 * 60 * 60 * 24) <= PUBLIC_RECORD_LOOKBACK_DAYS;
}

// ── load all provider rows ──────────────────────────────────────────────
console.log('[hospice-high-risk] loading state files…');
const stateFiles = readdirSync(statesDir).filter((f) => f.endsWith('.json'));

const allProviders = [];
const stateAvgCAHPS = {}; // { state: avg_overall_rating_pct }

for (const f of stateFiles) {
  const stateCode = f.replace('.json', '');
  const data = safeReadJSON(join(statesDir, f));
  if (!data || !Array.isArray(data.providers)) continue;

  // Per-state avg CAHPS overall rating (for outlier comparison)
  const cahpsValues = data.providers
    .map((p) => p?.cahps?.overall_rating_pct)
    .filter((v) => isPositiveNumber(v));
  stateAvgCAHPS[stateCode] = cahpsValues.length
    ? cahpsValues.reduce((a, b) => a + b, 0) / cahpsValues.length
    : null;

  for (const p of data.providers) {
    if (!p || !p.ccn) continue;
    allProviders.push(p);
  }
}

console.log(`[hospice-high-risk] loaded ${allProviders.length} providers from ${stateFiles.length} states`);

// ── load public-record sources ──────────────────────────────────────────
const oig = safeReadJSON(join(hospiceDataDir, 'oig-exclusions.json'), { items_by_ccn: {} });
const doj = safeReadJSON(join(hospiceDataDir, 'doj-actions.json'), { items_by_ccn: {} });
const news = safeReadJSON(join(hospiceDataDir, 'news-feed.json'), { items_by_ccn: {} });
const courts = safeReadJSON(join(hospiceDataDir, 'courtlistener-actions.json'), { items_by_ccn: {} });
const mfcu = safeReadJSON(join(hospiceDataDir, 'mfcu-actions.json'), { items_by_ccn: {} });
const chainsRaw = safeReadJSON(join(hospiceDataDir, 'chains.json'), null);

// Load chains — if structure has per-chain CCN lists, build a CCN→chain index.
// Best-effort: schema may include `chain_slug` and a `members`/`ccns` array.
const ccnToChain = {};
const chainFlaggedShare = {};
if (Array.isArray(chainsRaw)) {
  for (const ch of chainsRaw) {
    const slug = ch.chain_slug || ch.norm_key;
    if (!slug) continue;
    const ccns = ch.ccns || ch.members || ch.facility_ccns || [];
    if (!Array.isArray(ccns)) continue;
    for (const ccn of ccns) {
      ccnToChain[ccn] = { slug, name: ch.chain_name };
    }
  }
  // Compute % flagged per chain
  const byChainTotal = {};
  const byChainFlagged = {};
  for (const p of allProviders) {
    const ch = ccnToChain[p.ccn];
    if (!ch) continue;
    byChainTotal[ch.slug] = (byChainTotal[ch.slug] || 0) + 1;
    if (p.flagged_for_review || (p.flags && p.flags.flagged_count > 0)) {
      byChainFlagged[ch.slug] = (byChainFlagged[ch.slug] || 0) + 1;
    }
  }
  for (const slug of Object.keys(byChainTotal)) {
    chainFlaggedShare[slug] = (byChainFlagged[slug] || 0) / byChainTotal[slug];
  }
}

// ── national benchmarks ─────────────────────────────────────────────────
const hvldlValues = allProviders
  .map((p) => p?.metrics?.hvldl_pct)
  .filter((v) => isPositiveNumber(v))
  .sort((a, b) => a - b);
const hciValues = allProviders
  .map((p) => p?.metrics?.hci_composite)
  .filter((v) => isPositiveNumber(v))
  .sort((a, b) => a - b);
const cahpsValues = allProviders
  .map((p) => p?.cahps?.overall_rating_pct)
  .filter((v) => isPositiveNumber(v))
  .sort((a, b) => a - b);

const benchmarks = {
  hvldl_pct_p10: quantile(hvldlValues, 0.10),
  hvldl_pct_median: quantile(hvldlValues, 0.50),
  hci_composite_p10: quantile(hciValues, 0.10),
  hci_composite_median: quantile(hciValues, 0.50),
  cahps_overall_rating_pct_national_avg:
    cahpsValues.length ? cahpsValues.reduce((a, b) => a + b, 0) / cahpsValues.length : null,
  cahps_overall_rating_pct_p10: quantile(cahpsValues, 0.10),
  total_providers_with_hvldl: hvldlValues.length,
  total_providers_with_hci: hciValues.length,
  total_providers_with_cahps: cahpsValues.length,
};

console.log('[hospice-high-risk] benchmarks:', benchmarks);

// ── per-provider scoring ────────────────────────────────────────────────
function scoreProvider(p) {
  const m = p.metrics || {};
  const cahps = p.cahps || {};
  const ccn = p.ccn;

  // axis 1: live discharge / HVLDL (lower hvldl = worse — fewer end-of-life visits)
  let liveDischarge = 0;
  let liveDischargeFlag = null;
  if (isPositiveNumber(m.hvldl_pct) && benchmarks.hvldl_pct_p10 != null) {
    if (m.hvldl_pct <= benchmarks.hvldl_pct_p10) {
      // worst 10% on visits in last days of life
      liveDischarge = 22;
      liveDischargeFlag = `Bottom 10% nationally on visits in last days of life (${m.hvldl_pct.toFixed(1)}%)`;
    }
  }

  // axis 2: HCI composite (lower = worse)
  let hci = 0;
  let hciFlag = null;
  if (isPositiveNumber(m.hci_composite) && benchmarks.hci_composite_p10 != null) {
    if (m.hci_composite <= benchmarks.hci_composite_p10) {
      hci = 18;
      hciFlag = `Bottom 10% nationally on Hospice Care Index (${m.hci_composite.toFixed(1)})`;
    }
  }

  // axis 3: care-mix red flag — zero CHC AND zero GIP
  // CHC = continuous home care, GIP = general inpatient
  // Both being zero means hospice is skipping the high-acuity care types
  let careMix = 0;
  let careMixFlag = null;
  const hasCHC = isPositiveNumber(m.care_provided_inpatient_hospice_pct) && m.care_provided_inpatient_hospice_pct > 0;
  const hasGIP = isPositiveNumber(m.gip_pct) && m.gip_pct > 0;
  // gip_pct is the % of GIP days; care_provided_inpatient_hospice_pct is GIP location share.
  // CHC is not directly exposed — use gip_pct as primary inpatient signal.
  // If both gip_pct === 0 AND inpatient_hospice_pct === 0, treat as care-mix flag.
  const gipZero = m.gip_pct === 0 || m.gip_pct == null;
  const inpatientZero = m.care_provided_inpatient_hospice_pct === 0 || m.care_provided_inpatient_hospice_pct == null;
  // require at least one of the two to be a real (non-null) zero AND the other to be zero/null
  const knownZeroGIP = m.gip_pct === 0;
  const knownZeroINP = m.care_provided_inpatient_hospice_pct === 0;
  if ((knownZeroGIP || knownZeroINP) && gipZero && inpatientZero) {
    careMix = 14;
    careMixFlag = 'Zero general-inpatient + zero inpatient-hospice care provided';
  }

  // axis 4: CAHPS outlier — overall_rating_pct < (state avg − 10) AND < national avg
  let cahpsAxis = 0;
  let cahpsFlag = null;
  if (
    isPositiveNumber(cahps.overall_rating_pct) &&
    isPositiveNumber(benchmarks.cahps_overall_rating_pct_national_avg) &&
    isPositiveNumber(stateAvgCAHPS[p.state])
  ) {
    const stateAvg = stateAvgCAHPS[p.state];
    const natAvg = benchmarks.cahps_overall_rating_pct_national_avg;
    if (
      cahps.overall_rating_pct < stateAvg - 10 &&
      cahps.overall_rating_pct < natAvg
    ) {
      cahpsAxis = 14;
      cahpsFlag = `CAHPS overall rating ${cahps.overall_rating_pct.toFixed(0)}% — more than 10 points below state avg ${stateAvg.toFixed(0)}%`;
    }
  }

  // axis 5: public-record items (any source, last 24mo OR currently any-source matched)
  let publicRecord = 0;
  let publicRecordFlag = null;
  const sources = [];
  const recentItems = [];
  function probeSource(label, container) {
    if (!container || typeof container !== 'object') return;
    const items = container[ccn];
    if (!Array.isArray(items) || items.length === 0) return;
    sources.push(label);
    // any item in lookback window?
    const recent = items.find((it) => withinLookback(it.date || it.published || it.exclusion_date || it.action_date));
    if (recent) recentItems.push({ source: label, item: recent });
  }
  probeSource('OIG', oig.items_by_ccn);
  probeSource('DOJ', doj.items_by_ccn);
  probeSource('Court', courts.items_by_ccn);
  probeSource('MFCU', mfcu.items_by_ccn);
  probeSource('News', news.items_by_ccn);

  if (sources.length > 0) {
    // Severity: any in lookback OR any source at all
    publicRecord = recentItems.length > 0 ? 22 : 12;
    publicRecordFlag = `Public-record items in: ${sources.join(', ')}${recentItems.length > 0 ? ' (within last 24 months)' : ''}`;
  }

  // axis 6: chain risk — best effort
  let chain = 0;
  let chainFlag = null;
  const chainInfo = ccnToChain[ccn];
  if (chainInfo && chainFlaggedShare[chainInfo.slug] != null) {
    if (chainFlaggedShare[chainInfo.slug] > 0.5) {
      chain = 10;
      chainFlag = `Chain "${chainInfo.name}" has >50% of members flagged`;
    }
  }

  const risk_score = liveDischarge + hci + careMix + cahpsAxis + publicRecord + chain;

  const flags = [liveDischargeFlag, hciFlag, careMixFlag, cahpsFlag, publicRecordFlag, chainFlag].filter(Boolean);

  return {
    ccn,
    name: p.name,
    city: p.city || '',
    state: p.state || '',
    ownership_type: p.ownership_type || '',
    parent: p.parent || null,
    risk_score: Math.round(risk_score * 10) / 10,
    axes: {
      live_discharge: liveDischarge,
      hci,
      care_mix: careMix,
      cahps: cahpsAxis,
      public_record: publicRecord,
      chain,
    },
    metrics: {
      cms_overall_rating: p.cms_overall_rating ?? null,
      hvldl_pct: m.hvldl_pct ?? null,
      hci_composite: m.hci_composite ?? null,
      gip_pct: m.gip_pct ?? null,
      care_provided_inpatient_hospice_pct: m.care_provided_inpatient_hospice_pct ?? null,
      cahps_overall_rating_pct: cahps.overall_rating_pct ?? null,
      cahps_would_recommend_pct: cahps.would_recommend_pct ?? null,
      total_patients: m.avg_daily_census ?? null,
    },
    public_record_sources: sources,
    public_record_recent_count: recentItems.length,
    flags,
    summary: buildSummary(p, flags),
  };
}

function buildSummary(p, flags) {
  if (!flags.length) return `${p.name} appears in this list as a borderline case based on chain or public-record signals only.`;
  const f = flags.slice(0, 2).join('; ');
  return `${f}.`;
}

// ── score everything, keep only those with risk_score > 0 ───────────────
const scored = allProviders
  .map(scoreProvider)
  .filter((r) => r.risk_score > 0)
  .sort((a, b) => b.risk_score - a.risk_score);

// Top 200
const top = scored.slice(0, 200);

// Per-axis breakdown for the entire scored set (used by UI for chip counts)
function axisCount(rows, axis) {
  return rows.filter((r) => r.axes[axis] > 0).length;
}

const axisBreakdown = {
  live_discharge: axisCount(top, 'live_discharge'),
  hci: axisCount(top, 'hci'),
  care_mix: axisCount(top, 'care_mix'),
  cahps: axisCount(top, 'cahps'),
  public_record: axisCount(top, 'public_record'),
  chain: axisCount(top, 'chain'),
};

const out = {
  generated_at: new Date().toISOString(),
  methodology_version: METHODOLOGY_VERSION,
  framework: FRAMEWORK_LABEL,
  citation_url: 'https://www.auditor.ca.gov/reports/2024-126/summary.html',
  summary: {
    total_scored_with_any_flag: scored.length,
    total_in_list: top.length,
    axis_breakdown: axisBreakdown,
    universe_total: allProviders.length,
    chain_data_available: Object.keys(chainFlaggedShare).length > 0,
  },
  national_benchmarks: benchmarks,
  scoring_weights: {
    live_discharge: 22,
    hci: 18,
    care_mix: 14,
    cahps: 14,
    public_record_recent: 22,
    public_record_any: 12,
    chain_majority_flagged: 10,
    max_possible: 100,
  },
  hospices: top,
};

const outPath = join(hospiceDataDir, 'high-risk.json');
writeFileSync(outPath, JSON.stringify(out));
console.log(`[hospice-high-risk] wrote ${outPath}`);
console.log(`[hospice-high-risk] total flagged providers: ${scored.length}`);
console.log('[hospice-high-risk] axis breakdown (top 200):', axisBreakdown);
console.log('[hospice-high-risk] top 3 by risk:');
for (const r of top.slice(0, 3)) {
  console.log(`  ${r.risk_score}  ${r.name} (${r.city}, ${r.state})`);
}
