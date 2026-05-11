import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

// HospiceComparePage — side-by-side hospice comparison.
// Reads URL params (zip, city, state, ccns), resolves ZIP/city through the
// hospice search index, then fetches full state records for real comparison data.

const DEFAULT_CAHPS_AVG = {
  overall: 81,
  recommend: 84,
  pain: 76,
  comm: 79,
};

const DEFAULT_THRESHOLDS = {
  live_discharge_p90: 14.6,
  gip_p90: 1.3,
  burdensome_transitions_t1_p90: 15,
};

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin',
  WY: 'Wyoming', PR: 'Puerto Rico', VI: 'U.S. Virgin Islands',
  GU: 'Guam', MP: 'Northern Mariana Is.',
};

const VALID_STATE_CODES = new Set(Object.keys(STATE_NAMES));
let hospiceIndexPromise = null;
let hospiceSummaryPromise = null;
let cahpsBenchmarksPromise = null;
let oigExclusionsPromise = null;
let newsFeedPromise = null;
let dojActionsPromise = null;
const hospiceStatePromises = new Map();

// Hospice typical length of stay (days) — used to estimate annual patient
// throughput from average daily census. CMS Hospice Statistics Update reports
// an average length of stay around 92 days, but median is around 18; we use a
// conservative ~70-day estimate that matches industry-reported throughput.
const HOSPICE_TYPICAL_LOS_DAYS = 70;

const SAMPLE_PROVIDERS = [
  {
    ccn: 'SAMPLE-1',
    name: '[Sample Hospice A]',
    city: 'Sample City',
    state: 'SC',
    zip: '00000',
    ownership_type: 'Non-Profit',
    certification_date: '01/01/1998',
    parent: '[Sample Parent Organization A]',
    parent_locations: 1,
    distance_mi: 4.2,
    metrics: {
      avg_daily_census: 38,
      patients_fy24: 214,
      cms_star: 4.0,
      recommended_last_days_pct: 94,
      cahps_overall: 86,
      cahps_recommend: 88,
      cahps_pain: 81,
      cahps_comm: 83,
      live_discharge_pct: 4.8,
      gip_pct: 0.4,
      care_provided_home_pct: 82,
      care_provided_nursing_pct: 11,
      inpatient_unit: true,
      public_record_items: 0,
      news_mentions: 0,
    },
    flags: { flagged_count: 0 },
    sample: true,
  },
  {
    ccn: 'SAMPLE-2',
    name: '[Sample Hospice B]',
    city: 'Sample City',
    state: 'SC',
    zip: '00000',
    ownership_type: 'Non-Profit',
    certification_date: '01/01/2002',
    parent: '[Sample Parent Organization B]',
    parent_locations: 2,
    distance_mi: 6.1,
    metrics: {
      avg_daily_census: 52,
      patients_fy24: 318,
      cms_star: 4.0,
      recommended_last_days_pct: 91,
      cahps_overall: 84,
      cahps_recommend: 87,
      cahps_pain: 82,
      cahps_comm: 85,
      live_discharge_pct: 5.2,
      gip_pct: 0.6,
      care_provided_home_pct: 75,
      care_provided_nursing_pct: 17,
      inpatient_unit: true,
      public_record_items: 0,
      news_mentions: 2,
      news_mentions_note: 'positive',
    },
    flags: { flagged_count: 0 },
    sample: true,
  },
  {
    ccn: 'SAMPLE-3',
    name: '[Sample Hospice C]',
    city: 'Sample City',
    state: 'SC',
    zip: '00000',
    ownership_type: 'For-Profit',
    certification_date: '01/01/2008',
    parent: '[Sample Parent Organization C]',
    parent_locations: 8,
    distance_mi: 7.8,
    metrics: {
      avg_daily_census: 29,
      patients_fy24: 187,
      cms_star: 3.5,
      recommended_last_days_pct: 82,
      cahps_overall: 79,
      cahps_recommend: 82,
      cahps_pain: 76,
      cahps_comm: 80,
      live_discharge_pct: 17.4,
      gip_pct: 0.0,
      care_provided_home_pct: 71,
      care_provided_nursing_pct: 22,
      inpatient_unit: false,
      public_record_items: 1,
      public_record_note: 'CMS deficiency',
      news_mentions: 0,
    },
    flags: { flagged_count: 1 },
    sample: true,
  },
  {
    ccn: 'SAMPLE-4',
    name: '[Sample Hospice D]',
    city: 'Sample City',
    state: 'SC',
    zip: '00000',
    ownership_type: 'For-Profit',
    certification_date: '01/01/2014',
    parent: '[Sample Parent Organization D]',
    parent_locations: 12,
    distance_mi: 1.8,
    ownership_flags: { pe: true },
    metrics: {
      avg_daily_census: 42,
      patients_fy24: 287,
      cms_star: 3.0,
      recommended_last_days_pct: 71,
      cahps_overall: 74,
      cahps_recommend: 79,
      cahps_pain: 68,
      cahps_comm: 76,
      live_discharge_pct: 46.2,
      gip_pct: 2.4,
      care_provided_home_pct: 68,
      care_provided_nursing_pct: 21,
      inpatient_unit: true,
      public_record_items: 5,
      public_record_note: 'DOJ + AG + OIG',
      news_mentions: 1,
      news_mentions_note: 'enforcement',
    },
    flags: { flagged_count: 2 },
    sample: true,
  },
];

// --- helpers ----------------------------------------------------------------

function titleCase(s) {
  if (!s) return '';
  return s.toString().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function normalizeZip(s) {
  return String(s || '').replace(/\D/g, '');
}

function normalizeText(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseCityState(input) {
  const raw = String(input || '').trim().replace(/\s+/g, ' ');
  if (!raw) return { city: '', state: '' };

  const commaMatch = raw.match(/^(.+?),\s*([A-Za-z]{2})$/);
  if (commaMatch) {
    const maybeState = commaMatch[2].toUpperCase();
    if (VALID_STATE_CODES.has(maybeState)) {
      return { city: commaMatch[1].trim(), state: maybeState };
    }
  }

  const trailingStateMatch = raw.match(/^(.+?)\s+([A-Za-z]{2})$/);
  if (trailingStateMatch) {
    const maybeState = trailingStateMatch[2].toUpperCase();
    if (VALID_STATE_CODES.has(maybeState)) {
      return { city: trailingStateMatch[1].trim(), state: maybeState };
    }
  }

  return { city: raw, state: '' };
}

async function loadHospiceIndex() {
  if (!hospiceIndexPromise) {
    hospiceIndexPromise = fetch('/data/hospice/index.json').then((res) => {
      if (!res.ok) throw new Error(`Hospice index HTTP ${res.status}`);
      return res.json();
    });
  }
  return hospiceIndexPromise;
}

async function loadHospiceSummary() {
  if (!hospiceSummaryPromise) {
    hospiceSummaryPromise = fetch('/data/hospice/national-summary.json').then((res) => {
      if (!res.ok) throw new Error(`Hospice summary HTTP ${res.status}`);
      return res.json();
    });
  }
  return hospiceSummaryPromise;
}

async function loadCahpsBenchmarks() {
  if (!cahpsBenchmarksPromise) {
    cahpsBenchmarksPromise = fetch('/data/hospice/cahps-benchmarks.json')
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  return cahpsBenchmarksPromise;
}

async function loadOigExclusions() {
  if (!oigExclusionsPromise) {
    oigExclusionsPromise = fetch('/data/hospice/oig-exclusions.json')
      .then((res) => (res.ok ? res.json() : { items_by_ccn: {} }))
      .catch(() => ({ items_by_ccn: {} }));
  }
  return oigExclusionsPromise;
}

async function loadNewsFeed() {
  if (!newsFeedPromise) {
    newsFeedPromise = fetch('/data/hospice/news-feed.json')
      .then((res) => (res.ok ? res.json() : { items_by_ccn: {}, feed_items: [] }))
      .catch(() => ({ items_by_ccn: {}, feed_items: [] }));
  }
  return newsFeedPromise;
}

async function loadDojActions() {
  if (!dojActionsPromise) {
    dojActionsPromise = fetch('/data/hospice/doj-actions.json')
      .then((res) => (res.ok ? res.json() : { items_by_ccn: {} }))
      .catch(() => ({ items_by_ccn: {} }));
  }
  return dojActionsPromise;
}

// Build a per-state CAHPS average map from cahps-benchmarks.json (TBV codes
// are the "top-box" positive responses). Falls back to national average.
function buildCahpsAverages(benchmarks, stateCode) {
  if (!benchmarks) return DEFAULT_CAHPS_AVG;
  const code = String(stateCode || '').toUpperCase();
  const stateRows = Array.isArray(benchmarks.by_state)
    ? benchmarks.by_state.filter((r) => String(r.State || '').toUpperCase() === code)
    : [];
  const nationalRows = Array.isArray(benchmarks.national) ? benchmarks.national : [];

  function pick(measureCode) {
    const fromState = stateRows.find((r) => r['Measure Code'] === measureCode);
    if (fromState && fromState.Score && !Number.isNaN(Number(fromState.Score))) {
      return Number(fromState.Score);
    }
    const fromNat = nationalRows.find((r) => r['Measure Code'] === measureCode);
    if (fromNat && fromNat.Score && !Number.isNaN(Number(fromNat.Score))) {
      return Number(fromNat.Score);
    }
    return null;
  }

  return {
    overall: pick('RATING_TBV') ?? DEFAULT_CAHPS_AVG.overall,
    recommend: pick('RECOMMEND_TBV') ?? DEFAULT_CAHPS_AVG.recommend,
    pain: pick('SYMPTOMS_TBV') ?? DEFAULT_CAHPS_AVG.pain,
    comm: pick('TEAM_COMM_TBV') ?? DEFAULT_CAHPS_AVG.comm,
  };
}

async function loadHospiceState(stateCode) {
  const code = String(stateCode || '').toUpperCase();
  if (!VALID_STATE_CODES.has(code)) {
    throw new Error(`Invalid hospice state: ${stateCode}`);
  }
  if (!hospiceStatePromises.has(code)) {
    hospiceStatePromises.set(
      code,
      fetch(`/data/hospice/states/${code}.json`).then((res) => {
        if (!res.ok) throw new Error(`State ${code} HTTP ${res.status}`);
        return res.json();
      })
    );
  }
  return hospiceStatePromises.get(code);
}

function mostCommonLocation(records) {
  const counts = new Map();
  for (const p of records) {
    if (!p?.city || !p?.state) continue;
    const key = `${normalizeText(p.city)}|${String(p.state).toUpperCase()}`;
    const current = counts.get(key) || { city: p.city, state: p.state, count: 0 };
    current.count += 1;
    counts.set(key, current);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)[0] || null;
}

function locationLabelFromRecords(records, fallback) {
  const loc = mostCommonLocation(records);
  if (!loc) return fallback;
  return `${titleCase(loc.city)}, ${String(loc.state).toUpperCase()}`;
}

function getFlagCount(p) {
  return Number(p?.flags?.flagged_count ?? p?.flagged_count ?? 0);
}

function getProviderCcn(p) {
  return String(p?.ccn || '').toUpperCase();
}

async function hydrateIndexMatches(indexMatches) {
  const states = [...new Set(indexMatches.map((p) => String(p.state || '').toUpperCase()).filter(Boolean))];
  const stateFiles = await Promise.all(states.map(loadHospiceState));
  const fullByCcn = new Map();

  for (const stateData of stateFiles) {
    const providers = Array.isArray(stateData?.providers) ? stateData.providers : [];
    for (const provider of providers) {
      fullByCcn.set(getProviderCcn(provider), provider);
    }
  }

  return indexMatches
    .map((match) => fullByCcn.get(getProviderCcn(match)))
    .filter(Boolean);
}

function getCertYear(d) {
  if (!d) return '—';
  const m = String(d).match(/(19|20)\d{2}/);
  return m ? m[0] : '—';
}

function ownershipFlagPills(p) {
  const flags = [];
  const isFP = (p.ownership_type || '').toLowerCase().includes('for-profit');
  const isNP = (p.ownership_type || '').toLowerCase().includes('non-profit');
  if (isNP) flags.push({ label: 'Non-Profit', cls: 'np' });
  else if (isFP) flags.push({ label: 'For-Profit', cls: 'fp' });
  if (p.ownership_flags?.pe) flags.push({ label: 'PE', cls: 'pe' });
  if (p.ownership_flags?.reit) flags.push({ label: 'REIT', cls: 'pe' });
  return flags;
}

function starsBucket(v) {
  if (v == null) return 's-mid';
  if (v >= 4) return 's-high';
  if (v >= 3) return 's-mid';
  return 's-low';
}

function starsString(v) {
  if (v == null) return '—';
  return `${Number(v).toFixed(1)} / 5`;
}

// Render a 1–5 star rating with filled / empty glyphs for visual scan.
function starsGlyph(v) {
  if (v == null) return '';
  const rounded = Math.round(Number(v) * 2) / 2; // half-stars
  const full = Math.floor(rounded);
  const half = rounded - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

// Resolve the CMS overall rating from either the new top-level field or the
// older nested metric, returning the first non-null match.
function getCmsRating(p) {
  return (
    p?.cms_overall_rating ?? p?.metrics?.cms_star ?? p?.metrics?.cms_rating ?? null
  );
}

// Resolve the inpatient-unit availability from either the new top-level field
// or the older nested metric.
function getInpatientUnit(p) {
  if (typeof p?.inpatient_unit_available === 'boolean') return p.inpatient_unit_available;
  if (typeof p?.metrics?.inpatient_unit === 'boolean') return p.metrics.inpatient_unit;
  return null;
}

// Resolve a CAHPS measure for a provider, preferring the new `cahps` object
// but falling back to the legacy nested fields used by SAMPLE_PROVIDERS.
function getCahps(p, key) {
  const cahps = p?.cahps || {};
  switch (key) {
    case 'overall':
      return cahps.overall_rating_pct ?? p?.metrics?.cahps_overall ?? null;
    case 'recommend':
      return cahps.would_recommend_pct ?? p?.metrics?.cahps_recommend ?? null;
    case 'pain':
      return cahps.pain_management_pct ?? p?.metrics?.cahps_pain ?? null;
    case 'comm':
      return cahps.communication_pct ?? p?.metrics?.cahps_comm ?? null;
    default:
      return null;
  }
}

// Estimate annual patients served from average daily census and a typical
// length of stay. This is an estimate, not an exact CMS-reported number.
function estimateAnnualPatients(avgDailyCensus) {
  if (avgDailyCensus == null || Number.isNaN(Number(avgDailyCensus))) return null;
  return Math.round((Number(avgDailyCensus) * 365) / HOSPICE_TYPICAL_LOS_DAYS);
}

function liveDischargeBucket(v) {
  if (v == null) return { cls: '', pill: '', label: '' };
  if (v >= 30) return { cls: 'bad', pill: 'pill-flagged', label: 'Far above 90th pct' };
  if (v >= 15) return { cls: 'warn', pill: 'pill-flagged', label: 'Above 90th pct' };
  return { cls: 'good', pill: 'pill-ok', label: 'Below threshold' };
}

function gipBucket(v) {
  if (v == null) return { cls: '', pill: '', label: '' };
  if (v >= 2) return { cls: 'bad', pill: 'pill-flagged', label: 'Above 90th pct' };
  if (v >= 1) return { cls: 'warn', pill: 'pill-flagged', label: 'Elevated' };
  return { cls: 'good', pill: 'pill-ok', label: 'Below threshold' };
}

function cahpsCell(pct, stateAvg) {
  if (pct == null) return { cls: '', delta: '' };
  const diff = pct - stateAvg;
  if (Math.abs(diff) < 1) return { cls: '', delta: 'at benchmark' };
  if (diff > 0) return { cls: 'above', delta: `+${diff.toFixed(0)} vs benchmark` };
  return { cls: 'below', delta: `${diff.toFixed(0)} vs benchmark` };
}

function recommendation(p, ctx = {}) {
  const flagCount = getFlagCount(p);
  const publicRecord = ctx.publicRecordCount ?? 0;
  const cahpsAvg = ctx.cahpsAvg || DEFAULT_CAHPS_AVG;

  const overall = getCahps(p, 'overall');
  const recommend = getCahps(p, 'recommend');
  const pain = getCahps(p, 'pain');
  const comm = getCahps(p, 'comm');

  // Bottom-quartile signal: CAHPS values that exist AND are >= 5pts below the
  // state benchmark on at least 2 of 4 measures.
  const cahpsValues = [
    [overall, cahpsAvg.overall],
    [recommend, cahpsAvg.recommend],
    [pain, cahpsAvg.pain],
    [comm, cahpsAvg.comm],
  ];
  let cahpsBelow = 0;
  let cahpsAtOrAbove = 0;
  let cahpsKnown = 0;
  for (const [v, avg] of cahpsValues) {
    if (v == null) continue;
    cahpsKnown += 1;
    if (Number(v) >= Number(avg) - 1) cahpsAtOrAbove += 1;
    if (Number(v) <= Number(avg) - 5) cahpsBelow += 1;
  }
  const cahpsBottomQuartile = cahpsKnown >= 2 && cahpsBelow >= 2;
  const cahpsAtOrAboveAvg = cahpsKnown >= 2 && cahpsAtOrAbove === cahpsKnown;

  if (flagCount >= 2 || publicRecord >= 3 || cahpsBottomQuartile) {
    return { cls: 'rec-avoid', label: 'Closer review' };
  }
  if (flagCount === 1 || publicRecord >= 1) {
    return { cls: 'rec-consider', label: 'Consider with caution' };
  }
  if (cahpsKnown === 0 || cahpsAtOrAboveAvg) {
    return { cls: 'rec-recommend', label: 'Recommend' };
  }
  return { cls: 'rec-consider', label: 'Consider with caution' };
}

function fmtPct(v, digits = 1) {
  if (v == null || Number.isNaN(v)) return '—';
  return `${Number(v).toFixed(digits)}%`;
}

function fmtInt(v) {
  if (v == null || Number.isNaN(v)) return '—';
  return Math.round(Number(v)).toString();
}

function metricPenalty(value, threshold, multiplier) {
  if (value == null || threshold == null || threshold <= 0) return 0;
  return Math.max(0, Number(value) - Number(threshold)) * multiplier;
}

// rough sort: lower flag severity + lower discharge/GIP outlier rates + higher star = better
function compositeRank(p, thresholds = DEFAULT_THRESHOLDS) {
  const m = p.metrics || {};
  const star = getCmsRating(p);
  const flagPenalty = getFlagCount(p) * 50;
  const ldPenalty = metricPenalty(m.live_discharge_pct, thresholds.live_discharge_p90, 1.5);
  const gipPenalty = metricPenalty(m.gip_pct, thresholds.gip_p90, 10);
  const transitionP90 = thresholds.burdensome_transitions_t1_p90 ?? DEFAULT_THRESHOLDS.burdensome_transitions_t1_p90;
  const transitionPenalty = metricPenalty(m.burdensome_transitions_t1_pct, transitionP90, 0.5);
  const starBoost = star == null ? 0 : -Number(star) * 8;
  return flagPenalty + ldPenalty + gipPenalty + transitionPenalty + starBoost;
}

// --- main component ---------------------------------------------------------

export default function HospiceComparePage() {
  const [params] = useSearchParams();
  const zip = params.get('zip') || '';
  const city = params.get('city') || '';
  const state = (params.get('state') || '').toUpperCase();
  const ccnsParam = params.get('ccns') || '';

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingSample, setUsingSample] = useState(false);
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [cahpsAvg, setCahpsAvg] = useState(DEFAULT_CAHPS_AVG);
  const [enforcement, setEnforcement] = useState({
    oig: {},
    news: {},
    doj: {},
  });
  const [resolved, setResolved] = useState({
    label: 'Compare hospices',
    inputLabel: '',
    scopeLabel: '',
    summaryScope: '',
    matchCount: 0,
    hasQuery: false,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Plausible: Hospice-Compare-View — fires once after resolution so that
  // resultCount and query props are populated. Refires when the URL query
  // changes (zip / city / state / ccns), since that's effectively a new view.
  useEffect(() => {
    if (loading) return;
    if (!window.plausible) return;
    const queryStr = zip
      ? `zip:${zip}`
      : city
        ? `city:${city}`
        : state
          ? `state:${state}`
          : ccnsParam
            ? `ccns:${ccnsParam}`
            : '';
    window.plausible('Hospice-Compare-View', {
      props: {
        resultCount: resolved.matchCount ?? 0,
        query: queryStr,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, resolved.matchCount, zip, city, state, ccnsParam]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const ccnList = ccnsParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const hasQuery = Boolean(zip || city || state || ccnList.length > 0);

      if (!hasQuery) {
        setProviders([]);
        setUsingSample(false);
        setError(null);
        setLoading(false);
        setResolved({
          label: 'Compare hospices',
          inputLabel: '',
          scopeLabel: '',
          summaryScope: 'Enter a ZIP code or city to compare real hospices.',
          matchCount: 0,
          hasQuery: false,
        });
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [index, nationalSummary, benchmarks, oigData, newsData, dojData] =
          await Promise.all([
            loadHospiceIndex(),
            loadHospiceSummary().catch(() => ({ thresholds: DEFAULT_THRESHOLDS })),
            loadCahpsBenchmarks(),
            loadOigExclusions(),
            loadNewsFeed(),
            loadDojActions(),
          ]);
        if (cancelled) return;
        const rankThresholds = nationalSummary?.thresholds || DEFAULT_THRESHOLDS;
        setThresholds(rankThresholds);
        setEnforcement({
          oig: oigData?.items_by_ccn || {},
          news: newsData?.items_by_ccn || {},
          doj: dojData?.items_by_ccn || {},
        });

        let filtered = [];
        let label = 'Compare hospices';
        let inputLabel = '';
        let scopeLabel = '';
        let summaryScope = '';

        if (ccnList.length >= 2 && ccnList.length <= 5) {
          const set = new Set(ccnList.map((c) => c.toUpperCase()));
          const indexMatches = index.filter((p) => set.has(getProviderCcn(p)));
          filtered = await hydrateIndexMatches(indexMatches);
          label = locationLabelFromRecords(filtered, 'selected hospices');
          inputLabel = `${ccnList.length} selected CCNs`;
          scopeLabel = 'selected hospices';
          summaryScope = `${filtered.length} selected hospice${filtered.length === 1 ? '' : 's'}`;
        } else if (zip) {
          const digits = normalizeZip(zip);
          const zip3 = digits.slice(0, 3);
          const zip2 = digits.slice(0, 2);
          let indexMatches = index.filter((p) => normalizeZip(p.zip).startsWith(zip3));
          let prefixUsed = zip3;
          if (indexMatches.length === 0 && zip2) {
            indexMatches = index.filter((p) => normalizeZip(p.zip).startsWith(zip2));
            prefixUsed = zip2;
          }
          filtered = await hydrateIndexMatches(indexMatches);
          label = locationLabelFromRecords(filtered, digits ? `ZIP ${digits}` : 'ZIP search');
          inputLabel = digits;
          scopeLabel = prefixUsed.length === 3 ? `ZIP-${prefixUsed}` : `ZIP-${prefixUsed} expanded`;
          summaryScope = filtered.length
            ? `${filtered.length} hospice${filtered.length === 1 ? '' : 's'} matched to ${scopeLabel}`
            : `No hospices matched ZIP ${digits}`;
        } else if (city) {
          const parsed = parseCityState(city);
          const targetCity = normalizeText(parsed.city);
          let indexMatches = index.filter((p) => normalizeText(p.city) === targetCity);

          if (parsed.state) {
            const stateMatches = indexMatches.filter((p) => String(p.state || '').toUpperCase() === parsed.state);
            if (stateMatches.length > 0) indexMatches = stateMatches;
          } else if (indexMatches.length > 0) {
            const grouped = new Map();
            for (const p of indexMatches) {
              const code = String(p.state || '').toUpperCase();
              grouped.set(code, (grouped.get(code) || 0) + 1);
            }
            const preferredState = [...grouped.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
            if (preferredState) {
              indexMatches = indexMatches.filter((p) => String(p.state || '').toUpperCase() === preferredState);
            }
          }

          filtered = await hydrateIndexMatches(indexMatches);
          label = locationLabelFromRecords(filtered, parsed.state ? `${titleCase(parsed.city)}, ${parsed.state}` : titleCase(parsed.city));
          inputLabel = parsed.state ? `${titleCase(parsed.city)}, ${parsed.state}` : titleCase(parsed.city);
          scopeLabel = 'city match';
          summaryScope = filtered.length
            ? `${filtered.length} hospice${filtered.length === 1 ? '' : 's'} matched to ${inputLabel}`
            : `No hospices matched ${inputLabel}`;
        } else {
          const data = await loadHospiceState(state);
          filtered = Array.isArray(data?.providers) ? data.providers : [];
          label = STATE_NAMES[state] || state;
          inputLabel = STATE_NAMES[state] || state;
          scopeLabel = 'statewide';
          summaryScope = `${filtered.length} hospice${filtered.length === 1 ? '' : 's'} statewide`;
        }

        if (cancelled) return;
        const top4 = [...filtered]
          .sort((a, b) => compositeRank(a, rankThresholds) - compositeRank(b, rankThresholds))
          .slice(0, 4);

        // Choose CAHPS benchmark state: explicit `state` param wins, else the
        // most-common state across the filtered providers, else fall back.
        const predominantStateLoc = mostCommonLocation(filtered);
        const benchmarkState =
          state || predominantStateLoc?.state || top4[0]?.state || '';
        setCahpsAvg(buildCahpsAverages(benchmarks, benchmarkState));

        if (top4.length === 0) {
          setProviders(SAMPLE_PROVIDERS);
          setUsingSample(true);
          setResolved({
            label,
            inputLabel,
            scopeLabel,
            summaryScope,
            matchCount: 0,
            hasQuery: true,
          });
        } else {
          setProviders(top4);
          setUsingSample(false);
          setResolved({
            label,
            inputLabel,
            scopeLabel,
            summaryScope,
            matchCount: filtered.length,
            hasQuery: true,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setProviders(SAMPLE_PROVIDERS);
          setUsingSample(true);
          setResolved({
            label: zip ? `ZIP ${zip}` : city ? titleCase(city) : state || 'Compare hospices',
            inputLabel: zip || city || state || '',
            scopeLabel: 'sample fallback',
            summaryScope: 'Real hospice data could not be loaded for this query.',
            matchCount: 0,
            hasQuery: true,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [state, ccnsParam, zip, city]);

  const ranked = useMemo(() => {
    return [...providers].sort((a, b) => compositeRank(a, thresholds) - compositeRank(b, thresholds));
  }, [providers, thresholds]);

  // Summary strip counts
  const total = ranked.length;
  const noFlags = ranked.filter((p) => getFlagCount(p) === 0).length;
  const oneFlag = ranked.filter((p) => getFlagCount(p) === 1).length;
  const multiFlag = ranked.filter((p) => getFlagCount(p) >= 2).length;

  // Display location
  const locLabel = resolved.label || 'Compare hospices';
  const queryInputValue = resolved.inputLabel || zip || city || state || '';
  const summaryScope = resolved.summaryScope || 'Enter a ZIP code or city to compare real hospices.';
  const headerMatchCount = usingSample ? 0 : resolved.matchCount;
  const hasRealResults = ranked.length > 0 && !usingSample;
  const showEmptyState = !loading && !usingSample && ranked.length === 0;

  // Best-in-row helpers
  const bestIdx = (vals, dir = 'high') => {
    let bi = -1;
    let bv = dir === 'high' ? -Infinity : Infinity;
    vals.forEach((v, i) => {
      if (v == null || Number.isNaN(v)) return;
      if (dir === 'high' && v > bv) { bv = v; bi = i; }
      if (dir === 'low' && v < bv) { bv = v; bi = i; }
    });
    return bi;
  };

  const starVals = ranked.map((p) => getCmsRating(p));
  const overallVals = ranked.map((p) => getCahps(p, 'overall'));
  const recVals = ranked.map((p) => getCahps(p, 'recommend'));
  const painVals = ranked.map((p) => getCahps(p, 'pain'));
  const commVals = ranked.map((p) => getCahps(p, 'comm'));
  const hvldlVals = ranked.map((p) => p.metrics?.hvldl_pct ?? p.metrics?.recommended_last_days_pct ?? null);
  const censusVals = ranked.map((p) => p.metrics?.avg_daily_census ?? null);
  const patientsVals = ranked.map((p) => p.metrics?.patients_fy24 ?? p.metrics?.patients ?? estimateAnnualPatients(p.metrics?.avg_daily_census));
  const homeVals = ranked.map((p) => p.metrics?.care_provided_home_pct ?? null);
  const nfVals = ranked.map((p) => p.metrics?.care_provided_nursing_facility_pct ?? p.metrics?.care_provided_nursing_pct ?? null);

  const bestStar = bestIdx(starVals, 'high');
  const bestOverall = bestIdx(overallVals, 'high');
  const bestRec = bestIdx(recVals, 'high');
  const bestPain = bestIdx(painVals, 'high');
  const bestComm = bestIdx(commVals, 'high');
  const bestHvldl = bestIdx(hvldlVals, 'high');
  const bestCensus = bestIdx(censusVals, 'high');
  const bestPatients = bestIdx(patientsVals, 'high');
  const bestHome = bestIdx(homeVals, 'high');

  // Per-provider public-record + news counts wired from aggregator data.
  // Counts oig + news + doj items_by_ccn entries for each provider, and
  // separately tallies news mentions in the past 12 months.
  const oneYearAgoMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const enforcementByCcn = useMemo(() => {
    const map = new Map();
    for (const p of ranked) {
      const ccn = String(p.ccn || '');
      const oig = enforcement.oig?.[ccn] || [];
      const news = enforcement.news?.[ccn] || [];
      const doj = enforcement.doj?.[ccn] || [];
      const sourceLabels = [];
      if (oig.length) sourceLabels.push(`${oig.length} OIG`);
      if (doj.length) sourceLabels.push(`${doj.length} DOJ`);
      if (news.length) sourceLabels.push(`${news.length} news`);

      const newsLast12 = news.filter((item) => {
        const d = item?.date ? Date.parse(item.date) : NaN;
        return Number.isFinite(d) && d >= oneYearAgoMs;
      });

      map.set(ccn, {
        publicRecordCount: oig.length + doj.length + news.length,
        publicRecordNote: sourceLabels.join(' + '),
        newsLast12Count: newsLast12.length,
        newsLast12Note: newsLast12.length
          ? newsLast12.some((n) => /enforce|fraud|indict|settle|charge/i.test(n.headline || ''))
            ? 'enforcement'
            : ''
          : '',
      });
    }
    return map;
  }, [ranked, enforcement, oneYearAgoMs]);

  const handlePrint = () => {
    if (window.plausible) window.plausible('Hospice-Compare-Print-Click');
    window.print();
  };

  const handleCsvDownload = () => {
    if (window.plausible) window.plausible('Hospice-Compare-CSV-Download');
  };

  return (
    <div className="hospice-compare">
      <Helmet>
        <title>Compare Hospices | The Oversight Report</title>
        <meta
          name="description"
          content="Side-by-side comparison of Medicare-certified hospices. Quality ratings, family experience, patterns flagged, and public-record items, sourced from federal CMS data."
        />
      </Helmet>

      <style>{HC_CSS}</style>

      <div className="hc-crumb">
        <a href="/">Home</a>
        <span className="hc-sep">›</span>
        <a href="/hospice">Hospice</a>
        <span className="hc-sep">›</span>
        Compare hospices · {locLabel}
      </div>

      <div className="hc-page-head">
        <div className="hc-eyebrow">// for case managers, discharge planners, and families comparing options</div>
        <h1 className="hc-title">
          {resolved.hasQuery ? `Compare hospices · ${locLabel} area.` : 'Compare hospices.'}
        </h1>
        <p className="hc-sub">
          {hasRealResults
            ? `Showing the top ${total} of ${headerMatchCount} Medicare-certified hospice${headerMatchCount === 1 ? '' : 's'} for this search.`
            : usingSample
              ? 'No real hospice match was found for this search.'
              : 'Enter a ZIP code or city to compare Medicare-certified hospices in that area.'}
          {' '}Data sourced from CMS, refreshed monthly. Print this and bring it to the discharge meeting.
          {usingSample && <span className="hc-sample-tag"> · Sample data shown</span>}
        </p>

        <div className="hc-filter-bar">
          <div className="hc-filter-group">
            <span className="hc-filter-label">ZIP / city</span>
            <input
              className="hc-filter-input"
              value={queryInputValue}
              readOnly
            />
          </div>
          <div className="hc-filter-group">
            <span className="hc-filter-label">Within</span>
            <select className="hc-filter-select" defaultValue="10 miles">
              <option>10 miles</option>
              <option>25 miles</option>
              <option>50 miles</option>
            </select>
          </div>
          <div className="hc-filter-group">
            <span className="hc-filter-label">Setting</span>
            <select className="hc-filter-select" defaultValue="Hospice" disabled>
              <option>Hospice</option>
            </select>
          </div>
          <div className="hc-filter-group">
            <span className="hc-filter-label">Sort by</span>
            <select
              className="hc-filter-select"
              defaultValue="Composite score"
              onChange={(e) => {
                if (window.plausible) {
                  window.plausible('Hospice-Compare-Sort-Changed', {
                    props: { column: e.target.value, direction: 'desc' },
                  });
                }
              }}
            >
              <option>Composite score</option>
              <option>Distance</option>
              <option>CMS rating</option>
              <option>Family experience</option>
            </select>
          </div>
          <div className="hc-filter-actions">
            <button className="hc-btn" type="button">+ Add hospice</button>
            <button className="hc-btn" type="button">Reset</button>
          </div>
        </div>

        {!showEmptyState && (
        <div className="hc-summary-strip">
          <div className="hc-summary-cell teal">
            <div className="lbl">Showing</div>
            <div className="val">{total} hospice{total === 1 ? '' : 's'}</div>
            <div className="sub">{summaryScope}</div>
          </div>
          <div className="hc-summary-cell">
            <div className="lbl">No patterns flagged</div>
            <div className="val">{noFlags}</div>
            <div className="sub">CMS metrics within national norms</div>
          </div>
          <div className="hc-summary-cell amber">
            <div className="lbl">One pattern flagged</div>
            <div className="val">{oneFlag}</div>
            <div className="sub">worth asking questions about</div>
          </div>
          <div className="hc-summary-cell red">
            <div className="lbl">Multiple patterns flagged</div>
            <div className="val">{multiFlag}</div>
            <div className="sub">closer review recommended</div>
          </div>
        </div>
        )}
      </div>

      <section className="hc-compare-wrap">
        {loading && <div className="hc-loading">Loading hospice data…</div>}
        {error && (
          <div className="hc-error">Could not load state data ({error}). Showing sample comparison below.</div>
        )}

        {showEmptyState && (
          <div className="hc-empty-state">
            <div className="hc-empty-eyebrow">// compare real hospices</div>
            <h2>Start with a ZIP code or city.</h2>
            <p>
              Use the compare lane on the hospice page, or add <code>?zip=94608</code> or
              {' '}<code>?city=Oakland</code> to this URL. We will resolve that location against the
              national hospice index and load the matching state records.
            </p>
            <a className="hc-btn hc-btn-primary" href="/hospice">Go back to hospice search</a>
          </div>
        )}

        {!showEmptyState && (
        <div className="hc-compare-table">
          {/* Header row */}
          <div className="hc-row">
            <div className="hc-rlabel hc-fac-hdr row-label">Hospice</div>
            {ranked.map((p, i) => {
              const flags = ownershipFlagPills(p);
              const handleRowClick = () => {
                if (window.plausible) {
                  window.plausible('Hospice-Compare-Row-Click', {
                    props: { ccn: String(p.ccn || '') },
                  });
                }
              };
              return (
                <div
                  key={p.ccn || i}
                  className="hc-cell hc-fac-hdr"
                  onClick={handleRowClick}
                >
                  <div>
                    <div className="hc-fac-rank">#{i + 1} by composite</div>
                    <div className="hc-fac-name">{titleCase(p.name)}</div>
                    <div className="hc-fac-loc">
                      {titleCase(p.city)}, {p.state}
                      {p.distance_mi != null ? ` · ${Number(p.distance_mi).toFixed(1)} mi` : ''}
                      {' · CCN '}
                      {p.ccn}
                    </div>
                    <div className="hc-fac-flags">
                      {flags.map((f, idx) => (
                        <span key={idx} className={`hc-fac-flag flag-${f.cls}`}>{f.label}</span>
                      ))}
                    </div>
                    <div className="hc-fac-remove">remove</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section: Provider basics */}
          <SectionHeader label="Provider basics" />
          <Row
            label="Avg daily census"
            cells={ranked.map((p) => (
              <span className="hc-num">{fmtInt(p.metrics?.avg_daily_census)}</span>
            ))}
            bestIdx={bestCensus}
          />
          <Row
            label="Patients (FY24, est.)"
            cells={ranked.map((p) => {
              const reported = p.metrics?.patients_fy24 ?? p.metrics?.patients;
              if (reported != null) {
                return <span className="hc-num">{fmtInt(reported)}</span>;
              }
              const adc = p.metrics?.avg_daily_census;
              const est = estimateAnnualPatients(adc);
              if (est == null) return <span style={{ color: '#94A3B8' }}>—</span>;
              return (
                <span style={{ display: 'inline-flex', flexDirection: 'column' }}>
                  <span className="hc-num">{fmtInt(est)}</span>
                  <span style={{ fontSize: 10, color: '#64748B' }}>est. from ADC</span>
                </span>
              );
            })}
            bestIdx={bestPatients}
          />
          <Row label="Parent operator" cells={ranked.map((p) => (
            <span style={{ fontSize: 12 }}>
              {p.parent ? `${p.parent}${p.parent_locations ? ` · ${p.parent_locations} location${p.parent_locations === 1 ? '' : 's'}` : ''}` : 'Independent'}
            </span>
          ))} />
          <Row label="Certified since" cells={ranked.map((p) => (
            <span className="hc-num">{getCertYear(p.certification_date)}</span>
          ))} />

          {/* Section: Quality & rating */}
          <SectionHeader label="Quality & rating" />
          <Row
            label="CMS overall rating"
            cells={ranked.map((p) => {
              const v = getCmsRating(p);
              if (v == null) {
                return <span style={{ color: '#94A3B8' }}>—</span>;
              }
              return (
                <span className={`hc-stars ${starsBucket(v)}`}>
                  <span style={{ marginRight: 6 }}>{starsGlyph(v)}</span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>{starsString(v)}</span>
                </span>
              );
            })}
            bestIdx={bestStar}
          />
          <Row
            label="Recommended care · last days"
            cells={ranked.map((p) => {
              const v = p.metrics?.hvldl_pct ?? p.metrics?.recommended_last_days_pct;
              if (v == null) return <span style={{ color: '#94A3B8' }}>—</span>;
              const cls = v >= 90 ? 'good' : v >= 80 ? '' : 'warn';
              return <span className={`hc-num ${cls}`}>{`${Math.round(v)}%`}</span>;
            })}
            bestIdx={bestHvldl}
          />

          {/* Section: Family experience */}
          <SectionHeader label="Family experience (CAHPS) — % of families giving top rating" />
          <Row
            label="Overall rating"
            cells={ranked.map((p) => {
              const v = getCahps(p, 'overall');
              const c = cahpsCell(v, cahpsAvg.overall);
              if (v == null) return <span style={{ color: '#94A3B8' }}>—</span>;
              return (
                <span className={`hc-cahps ${c.cls}`}>
                  <span className="pct">{`${Math.round(v)}%`}</span>
                  <span className="delta">{c.delta}</span>
                </span>
              );
            })}
            bestIdx={bestOverall}
          />
          <Row
            label="Would recommend"
            cells={ranked.map((p) => {
              const v = getCahps(p, 'recommend');
              const c = cahpsCell(v, cahpsAvg.recommend);
              if (v == null) return <span style={{ color: '#94A3B8' }}>—</span>;
              return (
                <span className={`hc-cahps ${c.cls}`}>
                  <span className="pct">{`${Math.round(v)}%`}</span>
                  <span className="delta">{c.delta}</span>
                </span>
              );
            })}
            bestIdx={bestRec}
          />
          <Row
            label="Help for pain & symptoms"
            cells={ranked.map((p) => {
              const v = getCahps(p, 'pain');
              const c = cahpsCell(v, cahpsAvg.pain);
              if (v == null) return <span style={{ color: '#94A3B8' }}>—</span>;
              return (
                <span className={`hc-cahps ${c.cls}`}>
                  <span className="pct">{`${Math.round(v)}%`}</span>
                  <span className="delta">{c.delta}</span>
                </span>
              );
            })}
            bestIdx={bestPain}
          />
          <Row
            label="Communication with family"
            cells={ranked.map((p) => {
              const v = getCahps(p, 'comm');
              const c = cahpsCell(v, cahpsAvg.comm);
              if (v == null) return <span style={{ color: '#94A3B8' }}>—</span>;
              return (
                <span className={`hc-cahps ${c.cls}`}>
                  <span className="pct">{`${Math.round(v)}%`}</span>
                  <span className="delta">{c.delta}</span>
                </span>
              );
            })}
            bestIdx={bestComm}
          />

          {/* Section: Patterns flagged */}
          <SectionHeader label="Patterns flagged for review" />
          <Row
            label="Early live discharge rate"
            cells={ranked.map((p) => {
              const v = p.metrics?.live_discharge_pct;
              const b = liveDischargeBucket(v);
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span className={`hc-num ${b.cls}`}>{fmtPct(v)}</span>
                  {v != null && <span className={`hc-pill ${b.pill}`} style={{ marginLeft: 8 }}>{b.label}</span>}
                </span>
              );
            })}
          />
          <Row
            label="CHC / GIP utilization"
            cells={ranked.map((p) => {
              const v = p.metrics?.gip_pct;
              const b = gipBucket(v);
              const lbl = v === 0 ? 'At median' : b.label;
              const cls = v === 0 ? 'good' : b.cls;
              const pillCls = v === 0 ? 'pill-ok' : b.pill;
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span className={`hc-num ${cls}`}>{fmtPct(v)}</span>
                  {v != null && <span className={`hc-pill ${pillCls}`} style={{ marginLeft: 8 }}>{lbl}</span>}
                </span>
              );
            })}
          />

          {/* Section: Where care is delivered */}
          <SectionHeader label="Where care is delivered" />
          <Row
            label="% care at home"
            cells={ranked.map((p) => {
              const v = p.metrics?.care_provided_home_pct;
              if (v == null) return <span style={{ color: '#94A3B8' }}>—</span>;
              return <span className="hc-num">{fmtPct(v, 0)}</span>;
            })}
            bestIdx={bestHome}
          />
          <Row label="% in nursing facility" cells={ranked.map((p) => {
            const v = p.metrics?.care_provided_nursing_facility_pct ?? p.metrics?.care_provided_nursing_pct;
            if (v == null) return <span style={{ color: '#94A3B8' }}>—</span>;
            return <span className="hc-num">{fmtPct(v, 0)}</span>;
          })} />
          <Row label="Inpatient hospice unit available" cells={ranked.map((p) => {
            const v = getInpatientUnit(p);
            if (v === true) return <span className="hc-pill pill-ok">Yes</span>;
            if (v === false) return <span className="hc-pill pill-neutral">No</span>;
            return <span style={{ color: '#94A3B8' }}>—</span>;
          })} />

          {/* Section: Public record */}
          <SectionHeader label="Public record & enforcement" />
          <Row label="Public-record items (3yr)" cells={ranked.map((p) => {
            // For sample providers (no real CCN match), keep the legacy fields.
            const enforcementCounts = enforcementByCcn.get(String(p.ccn || ''));
            const usingReal = !p.sample;
            const v = usingReal
              ? (enforcementCounts?.publicRecordCount ?? 0)
              : (p.metrics?.public_record_items ?? 0);
            const note = usingReal
              ? enforcementCounts?.publicRecordNote
              : p.metrics?.public_record_note;
            const cls = v === 0 ? 'good' : v >= 3 ? 'bad' : '';
            return (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span className={`hc-num ${cls}`}>{v}</span>
                {note && (
                  <span style={{ fontSize: 11, color: v >= 3 ? '#DC2626' : '#64748B', marginLeft: 8 }}>
                    {note}
                  </span>
                )}
              </span>
            );
          })} />
          <Row label="News mentions (12mo)" cells={ranked.map((p) => {
            const enforcementCounts = enforcementByCcn.get(String(p.ccn || ''));
            const usingReal = !p.sample;
            const v = usingReal
              ? (enforcementCounts?.newsLast12Count ?? 0)
              : (p.metrics?.news_mentions ?? 0);
            const note = usingReal
              ? enforcementCounts?.newsLast12Note
              : p.metrics?.news_mentions_note;
            const isEnf = note && note.toLowerCase().includes('enforce');
            const cls = v === 0 ? 'good' : isEnf ? 'bad' : '';
            return (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span className={`hc-num ${cls}`}>{v}</span>
                {note && (
                  <span style={{ fontSize: 11, color: isEnf ? '#DC2626' : '#64748B', marginLeft: 8 }}>
                    {note}
                  </span>
                )}
              </span>
            );
          })} />

          {/* Section: Bottom line */}
          <SectionHeader label="Bottom line" />
          <Row label="Recommendation" cells={ranked.map((p) => {
            const enforcementCounts = enforcementByCcn.get(String(p.ccn || ''));
            const publicRecordCount = p.sample
              ? (p.metrics?.public_record_items ?? 0)
              : (enforcementCounts?.publicRecordCount ?? 0);
            const r = recommendation(p, { publicRecordCount, cahpsAvg });
            return <span className={`hc-recommend ${r.cls}`}>{r.label}</span>;
          })} />
        </div>
        )}

        {!showEmptyState && (
          <div className="hc-action-bar">
            <div className="hc-action-label">// take this with you</div>
            <div className="hc-actions">
              <button className="hc-btn hc-btn-primary" onClick={handlePrint} type="button">Print this comparison</button>
              <button className="hc-btn" type="button">Download as PDF</button>
              <button className="hc-btn" type="button" onClick={handleCsvDownload}>Export CSV</button>
              <button className="hc-btn" type="button">Email to me</button>
              <button className="hc-btn" type="button">Share link</button>
            </div>
          </div>
        )}
      </section>

      {!showEmptyState && (
      <section className="hc-rec-summary">
        <div className="hc-rec-card">
          <div>
            <h3>What this comparison shows.</h3>
            <p>
              Hospices are ranked by a composite of CMS quality rating, family-experience scores, and patterns
              flagged in federal data. The top of the list pairs the highest CMS rating with the cleanest
              CAHPS scores and the fewest flagged patterns.
            </p>
            <p>
              When a hospice shows multiple flagged patterns — for example a high early live-discharge rate
              alongside elevated CHC/GIP utilization and public-record items — that is a signal to ask harder
              questions during the discharge meeting, not a verdict.
            </p>
          </div>
          <div>
            <h3>What this comparison does NOT show.</h3>
            <p>
              <strong>Bed availability, insurance acceptance, distance from family, language services, and
              specialty capacity</strong> (vent management, complex symptom care, pediatric hospice). These
              vary by patient and should be confirmed with each hospice directly.
            </p>
            <p className="hc-muted">
              Sourced from CMS Care Compare (refreshed monthly), CMS Hospice Item Set, OIG Exclusions Database,
              DOJ press releases, CourtListener, state AG MFCU sites, and reputable health journalism. All
              public-record items linked to their original sources.
            </p>
          </div>
        </div>
      </section>
      )}

      <section className="hc-help-block">
        <div className="hc-help-inner">
          <div className="hc-help-eyebrow">// if you've already had a concerning experience</div>
          <h2 className="hc-help-title">File a complaint with the right channel.</h2>
          <p>
            State survey agency · CMS hospice complaint · State AG Medicaid Fraud Control Unit · State
            Long-Term Care Ombudsman.
          </p>
        </div>
      </section>
    </div>
  );
}

// --- small subcomponents ----------------------------------------------------

function SectionHeader({ label }) {
  return (
    <div className="hc-row">
      <div className="hc-rlabel hc-section-label" style={{ gridColumn: '1 / -1', padding: '8px 16px', fontSize: 10, letterSpacing: '0.14em' }}>
        {label}
      </div>
    </div>
  );
}

function Row({ label, cells, bestIdx = -1 }) {
  // pad cells to 4 so layout stays stable
  const padded = [...cells];
  while (padded.length < 4) padded.push(<span style={{ color: '#94A3B8' }}>—</span>);
  return (
    <div className="hc-row">
      <div className="hc-rlabel">{label}</div>
      {padded.slice(0, 4).map((c, i) => (
        <div key={i} className={`hc-cell ${bestIdx === i ? 'hc-best' : ''}`}>{c}</div>
      ))}
    </div>
  );
}

// --- styles -----------------------------------------------------------------

const HC_CSS = `
.hospice-compare {
  --hc-navy: #1D3557;
  --hc-primary: #2B6CB0;
  --hc-primary-dark: #1D4E7E;
  --hc-amber: #D97706;
  --hc-teal: #0D9488;
  --hc-green: #059669;
  --hc-red: #DC2626;
  --hc-purple: #7C3AED;
  --hc-bg: #EDF1F7;
  --hc-bg-light: #F8FAFC;
  --hc-bg-card: #FFFFFF;
  --hc-bg-elevated: #F0F4F8;
  --hc-text: #334155;
  --hc-muted: #64748B;
  --hc-light-muted: #94A3B8;
  --hc-border: #D7E0EA;
  --hc-border-subtle: #E8EDF2;
  --hc-radius: 8px;
  --hc-radius-lg: 12px;
  --hc-shadow-sm: 0 1px 2px rgba(0,0,0,.04), 0 2px 6px rgba(29,53,87,.04);
  --hc-shadow-md: 0 1px 3px rgba(0,0,0,.05), 0 6px 16px rgba(29,53,87,.07);
  background: var(--hc-bg);
  color: var(--hc-text);
  font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

.hospice-compare a { color: inherit; text-decoration: none; }

.hospice-compare .hc-crumb {
  max-width: 1400px; margin: 0 auto; padding: 40px 32px 0;
  font-family: "JetBrains Mono", monospace; font-size: 11px;
  color: var(--hc-muted); letter-spacing: 0.04em;
}
.hospice-compare .hc-crumb a { color: var(--hc-primary); }
.hospice-compare .hc-sep { color: var(--hc-light-muted); margin: 0 8px; }

.hospice-compare .hc-page-head { max-width: 1400px; margin: 0 auto; padding: 20px 32px 0; }
.hospice-compare .hc-eyebrow {
  font-family: "JetBrains Mono", monospace; font-size: 11px;
  color: var(--hc-primary); letter-spacing: 0.16em;
  text-transform: uppercase; font-weight: 700; margin-bottom: 8px;
}
.hospice-compare .hc-title {
  font-family: "Source Serif 4", Georgia, serif;
  font-size: 36px; line-height: 1.1; color: var(--hc-navy);
  margin: 0 0 6px; font-weight: 700;
}
.hospice-compare .hc-sub { color: var(--hc-muted); margin: 0 0 20px; font-size: 15px; }
.hospice-compare .hc-sample-tag {
  font-family: "JetBrains Mono", monospace; font-size: 11px;
  color: var(--hc-amber); letter-spacing: 0.06em; text-transform: uppercase;
  font-weight: 700;
}

/* Filter bar */
.hospice-compare .hc-filter-bar {
  background: var(--hc-bg-card); border: 1px solid var(--hc-border);
  border-radius: var(--hc-radius); padding: 14px 18px; margin-bottom: 18px;
  box-shadow: var(--hc-shadow-sm);
  display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
}
.hospice-compare .hc-filter-group { display: flex; align-items: center; gap: 6px; }
.hospice-compare .hc-filter-label {
  font-family: "JetBrains Mono", monospace; font-size: 10px;
  color: var(--hc-muted); letter-spacing: 0.12em;
  text-transform: uppercase; font-weight: 700;
}
.hospice-compare .hc-filter-input,
.hospice-compare .hc-filter-select {
  background: var(--hc-bg-light); border: 1px solid var(--hc-border);
  border-radius: 6px; padding: 7px 12px; font-size: 13px;
  color: var(--hc-navy); font-family: inherit; font-weight: 600;
}
.hospice-compare .hc-filter-actions { margin-left: auto; display: flex; gap: 6px; }

.hospice-compare .hc-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 16px; border-radius: var(--hc-radius);
  font-size: 13.5px; font-weight: 600; cursor: pointer;
  transition: 120ms ease; border: 1px solid var(--hc-border);
  background: var(--hc-bg-card); color: var(--hc-text); font-family: inherit;
}
.hospice-compare .hc-btn:hover { border-color: var(--hc-primary); color: var(--hc-primary); }
.hospice-compare .hc-btn-primary {
  background: var(--hc-primary); color: #fff; border-color: var(--hc-primary);
}
.hospice-compare .hc-btn-primary:hover { background: var(--hc-primary-dark); color: #fff; }

/* Summary strip */
.hospice-compare .hc-summary-strip {
  background: var(--hc-bg-card); border: 1px solid var(--hc-border);
  border-radius: var(--hc-radius); padding: 14px 18px; margin-bottom: 18px;
  box-shadow: var(--hc-shadow-sm);
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
}
@media (max-width: 720px) { .hospice-compare .hc-summary-strip { grid-template-columns: repeat(2, 1fr); } }
.hospice-compare .hc-summary-cell .lbl {
  font-family: "JetBrains Mono", monospace; font-size: 9.5px;
  color: var(--hc-muted); letter-spacing: 0.1em;
  text-transform: uppercase; font-weight: 700; margin-bottom: 4px;
}
.hospice-compare .hc-summary-cell .val {
  font-family: "Source Serif 4", Georgia, serif; font-size: 22px;
  color: var(--hc-navy); font-weight: 700; line-height: 1;
}
.hospice-compare .hc-summary-cell .sub { font-size: 11.5px; color: var(--hc-muted); margin-top: 4px; }
.hospice-compare .hc-summary-cell.amber .val { color: var(--hc-amber); }
.hospice-compare .hc-summary-cell.red .val { color: var(--hc-red); }
.hospice-compare .hc-summary-cell.teal .val { color: var(--hc-teal); }

/* Loading / error */
.hospice-compare .hc-loading,
.hospice-compare .hc-error {
  max-width: 1400px; margin: 0 auto 12px; padding: 12px 18px;
  font-family: "JetBrains Mono", monospace; font-size: 12px;
  background: var(--hc-bg-card); border: 1px solid var(--hc-border);
  border-radius: var(--hc-radius); color: var(--hc-muted);
}
.hospice-compare .hc-error { color: var(--hc-amber); border-color: rgba(217,119,6,.3); background: rgba(217,119,6,.05); }

.hospice-compare .hc-empty-state {
  background: var(--hc-bg-card); border: 1px solid var(--hc-border);
  border-radius: var(--hc-radius-lg); box-shadow: var(--hc-shadow-md);
  padding: 36px; margin-bottom: 18px;
}
.hospice-compare .hc-empty-eyebrow {
  font-family: "JetBrains Mono", monospace; font-size: 10px;
  color: var(--hc-primary); letter-spacing: 0.14em;
  text-transform: uppercase; font-weight: 700; margin-bottom: 8px;
}
.hospice-compare .hc-empty-state h2 {
  font-family: "Source Serif 4", Georgia, serif;
  font-size: 28px; line-height: 1.1; color: var(--hc-navy);
  margin: 0 0 10px; font-weight: 700;
}
.hospice-compare .hc-empty-state p {
  color: var(--hc-muted); line-height: 1.6; max-width: 720px;
  margin: 0 0 18px;
}
.hospice-compare .hc-empty-state code {
  background: var(--hc-bg-light); border: 1px solid var(--hc-border);
  border-radius: 4px; padding: 2px 5px;
  font-family: "JetBrains Mono", monospace; font-size: 12px;
}

/* Comparison table */
.hospice-compare .hc-compare-wrap { max-width: 1400px; margin: 0 auto; padding: 0 32px; }
.hospice-compare .hc-compare-table {
  background: var(--hc-bg-card); border: 1px solid var(--hc-border);
  border-radius: var(--hc-radius-lg); box-shadow: var(--hc-shadow-md);
  overflow: hidden;
  display: grid; grid-template-columns: 220px repeat(4, 1fr); gap: 0;
}
@media (max-width: 1100px) {
  .hospice-compare .hc-compare-table { grid-template-columns: 180px repeat(4, 1fr); font-size: 12.5px; }
}
.hospice-compare .hc-row { display: contents; }

.hospice-compare .hc-rlabel,
.hospice-compare .hc-cell,
.hospice-compare .hc-fac-hdr {
  padding: 12px 16px; border-bottom: 1px solid var(--hc-border-subtle);
}
.hospice-compare .hc-rlabel {
  background: var(--hc-bg-light); border-right: 1px solid var(--hc-border-subtle);
  font-family: "JetBrains Mono", monospace; font-size: 10.5px;
  color: var(--hc-muted); letter-spacing: 0.08em; text-transform: uppercase;
  font-weight: 700; display: flex; align-items: center;
}
.hospice-compare .hc-cell {
  border-right: 1px solid var(--hc-border-subtle);
  display: flex; align-items: center;
  font-size: 13.5px; color: var(--hc-text);
}
.hospice-compare .hc-cell:last-child { border-right: 0; }
.hospice-compare .hc-section-label { background: var(--hc-navy); color: #fff; font-weight: 700; }

/* Hospice column header */
.hospice-compare .hc-fac-hdr { background: var(--hc-bg-card); padding: 18px 16px; border-bottom: 2px solid var(--hc-navy); }
.hospice-compare .hc-fac-hdr.row-label { background: var(--hc-navy); color: #fff; }
.hospice-compare .hc-fac-rank {
  font-family: "JetBrains Mono", monospace; font-size: 9.5px;
  color: var(--hc-light-muted); letter-spacing: 0.14em;
  text-transform: uppercase; margin-bottom: 4px;
}
.hospice-compare .hc-fac-name {
  font-family: "Source Serif 4", Georgia, serif; font-size: 15px;
  color: var(--hc-navy); font-weight: 700; line-height: 1.2; margin: 0 0 4px;
}
.hospice-compare .hc-fac-loc { font-size: 11.5px; color: var(--hc-muted); }
.hospice-compare .hc-fac-flags { margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap; }
.hospice-compare .hc-fac-flag {
  font-family: "JetBrains Mono", monospace; font-size: 9px;
  padding: 2px 5px; border-radius: 3px; letter-spacing: 0.06em;
  font-weight: 700; text-transform: uppercase;
}
.hospice-compare .flag-fp { background: rgba(217,119,6,.10); color: var(--hc-amber); border: 1px solid rgba(217,119,6,.3); }
.hospice-compare .flag-np { background: rgba(13,148,136,.10); color: var(--hc-teal); border: 1px solid rgba(13,148,136,.3); }
.hospice-compare .flag-pe { background: rgba(124,58,237,.10); color: var(--hc-purple); border: 1px solid rgba(124,58,237,.3); }
.hospice-compare .hc-fac-remove {
  font-family: "JetBrains Mono", monospace; font-size: 10px;
  color: var(--hc-light-muted); margin-top: 8px; cursor: pointer;
}
.hospice-compare .hc-fac-remove:hover { color: var(--hc-red); }

/* Cell value treatments */
.hospice-compare .hc-num { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 14px; color: var(--hc-navy); }
.hospice-compare .hc-num.bad  { color: var(--hc-red); }
.hospice-compare .hc-num.warn { color: var(--hc-amber); }
.hospice-compare .hc-num.good { color: var(--hc-teal); }

.hospice-compare .hc-stars { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 14px; }
.hospice-compare .hc-stars.s-low  { color: var(--hc-red); }
.hospice-compare .hc-stars.s-mid  { color: var(--hc-amber); }
.hospice-compare .hc-stars.s-high { color: var(--hc-teal); }

.hospice-compare .hc-pill {
  display: inline-block; font-family: "JetBrains Mono", monospace;
  font-size: 10px; padding: 3px 8px; border-radius: 4px;
  letter-spacing: 0.06em; font-weight: 700; text-transform: uppercase;
}
.hospice-compare .pill-flagged { background: rgba(217,119,6,.10); color: var(--hc-amber); border: 1px solid rgba(217,119,6,.3); }
.hospice-compare .pill-ok { background: rgba(13,148,136,.10); color: var(--hc-teal); border: 1px solid rgba(13,148,136,.3); }
.hospice-compare .pill-neutral { background: var(--hc-bg-elevated); color: var(--hc-muted); border: 1px solid var(--hc-border); }

.hospice-compare .hc-cahps {
  display: flex; align-items: center; gap: 6px;
  font-family: "JetBrains Mono", monospace; font-size: 12px;
}
.hospice-compare .hc-cahps .pct { font-weight: 700; }
.hospice-compare .hc-cahps .delta { font-size: 10px; color: var(--hc-muted); }
.hospice-compare .hc-cahps.below .pct { color: var(--hc-red); }
.hospice-compare .hc-cahps.above .pct { color: var(--hc-teal); }

.hospice-compare .hc-recommend {
  font-family: "JetBrains Mono", monospace; font-weight: 700;
  font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 8px 14px; border-radius: 6px; display: inline-block;
}
.hospice-compare .rec-recommend { background: rgba(13,148,136,.12); color: var(--hc-teal); border: 1px solid rgba(13,148,136,.4); }
.hospice-compare .rec-consider  { background: rgba(217,119,6,.12); color: var(--hc-amber); border: 1px solid rgba(217,119,6,.4); }
.hospice-compare .rec-avoid     { background: rgba(220,38,38,.12); color: var(--hc-red);   border: 1px solid rgba(220,38,38,.4); }

/* Best highlight */
.hospice-compare .hc-best { position: relative; }
.hospice-compare .hc-best::before {
  content: 'best'; position: absolute; top: 4px; right: 6px;
  font-family: "JetBrains Mono", monospace; font-size: 8.5px;
  color: var(--hc-teal); font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
}

/* Action bar */
.hospice-compare .hc-action-bar {
  background: var(--hc-bg-card); border: 1px solid var(--hc-border);
  border-radius: var(--hc-radius); padding: 16px 20px; margin: 18px 0;
  box-shadow: var(--hc-shadow-sm);
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}
.hospice-compare .hc-action-label {
  font-family: "JetBrains Mono", monospace; font-size: 11px;
  color: var(--hc-muted); letter-spacing: 0.06em;
  text-transform: uppercase; font-weight: 700;
}
.hospice-compare .hc-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* Recommendation summary */
.hospice-compare .hc-rec-summary { max-width: 1400px; margin: 0 auto; padding: 24px 32px; }
.hospice-compare .hc-rec-card {
  background: var(--hc-bg-card); border: 1px solid var(--hc-border);
  border-radius: var(--hc-radius-lg); padding: 26px 32px;
  box-shadow: var(--hc-shadow-sm);
  display: grid; grid-template-columns: 1fr 1fr; gap: 32px;
}
@media (max-width: 800px) { .hospice-compare .hc-rec-card { grid-template-columns: 1fr; } }
.hospice-compare .hc-rec-card h3 {
  font-family: "Source Serif 4", Georgia, serif; font-size: 18px;
  color: var(--hc-navy); margin: 0 0 8px; font-weight: 700;
}
.hospice-compare .hc-rec-card p { color: var(--hc-text); font-size: 14px; line-height: 1.55; margin: 0 0 8px; }
.hospice-compare .hc-rec-card strong { color: var(--hc-navy); }
.hospice-compare .hc-rec-card .hc-muted { color: var(--hc-muted); font-size: 12.5px; margin-top: 12px; line-height: 1.5; }

/* Help block */
.hospice-compare .hc-help-block { background: var(--hc-navy); color: #fff; padding: 36px 32px; margin-top: 24px; }
.hospice-compare .hc-help-inner { max-width: 1400px; margin: 0 auto; }
.hospice-compare .hc-help-eyebrow {
  font-family: "JetBrains Mono", monospace; font-size: 11px;
  color: var(--hc-amber); letter-spacing: 0.18em;
  text-transform: uppercase; font-weight: 700; margin-bottom: 8px;
}
.hospice-compare .hc-help-title {
  font-family: "Source Serif 4", Georgia, serif; font-size: 22px;
  margin: 0 0 8px; font-weight: 700;
}
.hospice-compare .hc-help-block p { color: rgba(255,255,255,0.8); margin: 0; font-size: 14px; }

@media print {
  .hospice-compare .hc-filter-actions,
  .hospice-compare .hc-action-bar,
  .hospice-compare .hc-help-block { display: none; }
}
`;
