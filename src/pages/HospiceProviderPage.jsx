import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/hospice-provider.css';

// State abbreviation -> display name (covers all 50 + DC + territories used in data).
const STATE_NAME = {
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

// In-memory cache of state files (keyed by state code) so navigating between
// providers in the same state doesn't refetch the (potentially multi-MB) blob.
const stateFileCache = new Map();
let indexCache = null;

// Module-level cache for public-record feeds. Each entry is `{ data, loadedAt }`.
const pubRecCache = {
  oig: null,
  news: null,
  doj: null,
  court: null,
  mfcu: null,
};

async function fetchPubRecFeeds() {
  const fetchJson = (url) => fetch(url).then((res) => (res.ok ? res.json() : null)).catch(() => null);
  const [oig, news, doj, court, mfcu] = await Promise.all([
    fetchJson('/data/hospice/oig-exclusions.json'),
    fetchJson('/data/hospice/news-feed.json'),
    fetchJson('/data/hospice/doj-actions.json'),
    fetchJson('/data/hospice/courtlistener-actions.json'),
    fetchJson('/data/hospice/mfcu-actions.json'),
  ]);
  const loadedAt = Date.now();
  pubRecCache.oig = { data: oig, loadedAt };
  pubRecCache.news = { data: news, loadedAt };
  pubRecCache.doj = { data: doj, loadedAt };
  pubRecCache.court = { data: court, loadedAt };
  pubRecCache.mfcu = { data: mfcu, loadedAt };
  return { oig, news, doj, court, mfcu };
}

// Format an ISO timestamp like "2 hr ago" / "12 min ago" / "Apr 27".
function relTime(iso) {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diffMin = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format a date string ("YYYY-MM-DD" or ISO) for the date column.
function fmtItemDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TEN_QUESTIONS = [
  "What's your CMS overall star rating, and how does it compare to others in our area?",
  'How is pain managed at home — and who do I call at 2 a.m.?',
  'How often will the nurse, social worker, and chaplain visit?',
  'If symptoms get worse, can my loved one come into a hospice facility, and what does that cost?',
  'What happens if my loved one stabilizes — would they be discharged from hospice?',
  'Will the same nurse and team visit consistently, or does it rotate?',
  'How do you train family members to give medications and provide care?',
  "What's your average length of stay, and how often do patients leave hospice alive?",
  'What bereavement support is available for family after the death?',
  'Who owns this hospice — is it a non-profit, for-profit chain, or PE-backed?',
];

// Display labels for the 8 CAHPS top-box (TBV) measures.
// `field` maps to the per-provider `cahps` object keys. `code` maps to the
// CAHPS benchmark file (national / by_state) for state + national averages.
const CAHPS_MEASURES = [
  { code: 'SYMPTOMS_TBV',    field: 'pain_management_pct',     label: 'Help for pain & symptoms' },
  { code: 'TIMELY_CARE_TBV', field: 'timely_care_pct',         label: 'Getting timely care' },
  { code: 'TRAINING_TBV',    field: 'training_family_pct',     label: 'Training family to care' },
  { code: 'EMO_REL_TBV',     field: 'emotional_support_pct',   label: 'Emotional & spiritual support' },
  { code: 'RATING_TBV',      field: 'overall_rating_pct',      label: 'Overall rating of hospice' },
  { code: 'TEAM_COMM_TBV',   field: 'communication_pct',       label: 'Communication with family' },
  { code: 'RECOMMEND_TBV',   field: 'would_recommend_pct',     label: 'Would recommend this hospice' },
  { code: 'RESPECT_TBV',     field: 'respect_pct',             label: 'Treating patient with respect' },
];

function toTitleCase(s) {
  if (!s) return s;
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bLlc\b/g, 'LLC')
    .replace(/\bInc\b/g, 'Inc')
    .replace(/\bLp\b/g, 'LP');
}

function fmtDate(d) {
  if (!d) return null;
  // Provider certification_date format: "MM/DD/YYYY"
  const parts = d.split('/');
  if (parts.length === 3) {
    const yr = parts[2];
    return yr;
  }
  return d;
}

function pctNum(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  return Number(v);
}

// Compute a coarse star rating proxy from flagged_count when CMS overall stars
// aren't on the provider record. (CMS overall hospice star rating isn't yet
// joined into the per-provider record — surfaced in Phase 2.)
function deriveStarProxy(provider) {
  // If both flags are clean, lean higher; if both flagged, lean lower.
  const f = provider?.flags?.flagged_count ?? 0;
  if (f >= 2) return 2.5;
  if (f === 1) return 3.5;
  return 4.0;
}

export default function HospiceProviderPage() {
  const { ccn } = useParams();
  const [provider, setProvider] = useState(null);
  const [stateData, setStateData] = useState(null);
  const [thresholds, setThresholds] = useState(null);
  const [cahpsBenchmarks, setCahpsBenchmarks] = useState(null);
  const [showCahpsTable, setShowCahpsTable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Public-record feeds. Loaded once on mount and re-fetched when the tab regains focus.
  const [pubRec, setPubRec] = useState({
    oig: pubRecCache.oig?.data ?? null,
    news: pubRecCache.news?.data ?? null,
    doj: pubRecCache.doj?.data ?? null,
    court: pubRecCache.court?.data ?? null,
    mfcu: pubRecCache.mfcu?.data ?? null,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProvider(null);

    async function load() {
      try {
        // 1. Index lookup — find which state this CCN lives in.
        if (!indexCache) {
          const idxRes = await fetch('/data/hospice/index.json');
          if (!idxRes.ok) throw new Error('Could not load hospice index.');
          indexCache = await idxRes.json();
        }
        const indexEntry = indexCache.find((p) => String(p.ccn) === String(ccn));
        if (!indexEntry) {
          if (!cancelled) {
            setError('not-found');
            setLoading(false);
          }
          return;
        }
        const stateCode = indexEntry.state;

        // 2. Load the state file (cached).
        let st = stateFileCache.get(stateCode);
        if (!st) {
          const stRes = await fetch(`/data/hospice/states/${stateCode}.json`);
          if (!stRes.ok) throw new Error('Could not load hospice state file.');
          st = await stRes.json();
          stateFileCache.set(stateCode, st);
        }
        const match = (st.providers || []).find((p) => String(p.ccn) === String(ccn));
        if (!match) {
          if (!cancelled) {
            setError('not-found');
            setLoading(false);
          }
          return;
        }

        // 3. Parallel: national thresholds + CAHPS benchmarks.
        const [nsRes, cahpsRes] = await Promise.all([
          fetch('/data/hospice/national-summary.json'),
          fetch('/data/hospice/cahps-benchmarks.json'),
        ]);
        const ns = nsRes.ok ? await nsRes.json() : null;
        const cahps = cahpsRes.ok ? await cahpsRes.json() : null;

        if (cancelled) return;
        setProvider(match);
        setStateData(st);
        setThresholds(ns?.thresholds ?? null);
        setCahpsBenchmarks(cahps);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.error('HospiceProviderPage load error', err);
          setError('error');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ccn]);

  // Plausible: provider page view (fires once provider data is loaded so that
  // we have ccn / state / flagged in the props).
  useEffect(() => {
    if (!provider) return;
    if (window.plausible) {
      window.plausible('Hospice-Provider-View', {
        props: {
          ccn: String(provider.ccn || ''),
          state: provider.state || '',
          flagged: provider.flags?.flagged_count ?? 0,
        },
      });
    }
  }, [provider]);

  // Public-record feeds: load once on mount (or read from module-level cache),
  // then re-fetch when the tab regains focus. Backend pipelines run daily, so
  // continuous polling is wasted bandwidth.
  useEffect(() => {
    let cancelled = false;

    async function loadFeeds() {
      if (pubRecCache.oig && pubRecCache.news && pubRecCache.doj && pubRecCache.court && pubRecCache.mfcu) {
        if (!cancelled) {
          setPubRec({
            oig: pubRecCache.oig.data,
            news: pubRecCache.news.data,
            doj: pubRecCache.doj.data,
            court: pubRecCache.court.data,
            mfcu: pubRecCache.mfcu.data,
          });
        }
      }
      try {
        const fresh = await fetchPubRecFeeds();
        if (!cancelled) setPubRec(fresh);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Public-record feed fetch failed', e);
      }
    }

    loadFeeds();
    const onFocus = () => {
      if (document.visibilityState === 'visible') loadFeeds();
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  // Derived: state CAHPS averages + national CAHPS averages, keyed by code.
  const cahpsRows = useMemo(() => {
    if (!cahpsBenchmarks || !provider) return [];
    const stateRows = (cahpsBenchmarks.by_state || []).filter(
      (r) => r.State === provider.state,
    );
    const stateByCode = {};
    for (const r of stateRows) stateByCode[r['Measure Code']] = r;
    const nationalByCode = {};
    for (const r of cahpsBenchmarks.national || []) {
      nationalByCode[r['Measure Code']] = r;
    }

    const providerCahps = provider.cahps || {};
    return CAHPS_MEASURES.map(({ code, field, label }) => {
      const stateRow = stateByCode[code];
      const natRow = nationalByCode[code];
      const stateScore = stateRow?.Score && stateRow.Score !== 'Not Applicable'
        ? Number(stateRow.Score)
        : null;
      const natScore = natRow?.Score && natRow.Score !== 'Not Applicable'
        ? Number(natRow.Score)
        : null;
      const provScoreRaw = providerCahps[field];
      const provScore = provScoreRaw == null || Number.isNaN(Number(provScoreRaw))
        ? null
        : Number(provScoreRaw);
      const delta = provScore != null && stateScore != null ? provScore - stateScore : null;
      return {
        code,
        field,
        label,
        provider: provScore,
        state: stateScore,
        national: natScore,
        delta,
      };
    });
  }, [cahpsBenchmarks, provider]);

  // Best / worst measure for the CAHPS headline highlight.
  const cahpsHighlight = useMemo(() => {
    const scored = cahpsRows.filter((r) => r.delta != null);
    if (scored.length === 0) return null;
    const sorted = [...scored].sort((a, b) => b.delta - a.delta);
    return { best: sorted[0], worst: sorted[sorted.length - 1] };
  }, [cahpsRows]);

  // Nearby = up to 3 other in-state hospices that aren't this one.
  const nearby = useMemo(() => {
    if (!stateData || !provider) return [];
    const others = (stateData.providers || []).filter(
      (p) => String(p.ccn) !== String(provider.ccn),
    );
    // Stable-ish sample: prefer ones in the same city, then any.
    const sameCity = others.filter(
      (p) => (p.city || '').trim().toUpperCase() === (provider.city || '').trim().toUpperCase(),
    );
    const pool = sameCity.length >= 3 ? sameCity : others;
    return pool.slice(0, 3);
  }, [stateData, provider]);

  if (loading) {
    return (
      <div className="hospice-provider">
        <div className="hp-state">Loading hospice report…</div>
      </div>
    );
  }

  if (error === 'not-found' || !provider) {
    return (
      <div className="hospice-provider">
        <div className="hp-state">
          <h2>Hospice not found.</h2>
          <p>
            We couldn't find a Medicare-certified hospice with CCN <strong>{ccn}</strong>.
            It may have been deactivated or the CCN may be mistyped.
          </p>
          <Link to="/hospice" className="hp-state-cta">
            Back to hospice search
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hospice-provider">
        <div className="hp-state">
          <h2>Couldn't load this hospice report.</h2>
          <p>Try refreshing the page. If the problem persists, contact us.</p>
          <Link to="/hospice" className="hp-state-cta">
            Back to hospice search
          </Link>
        </div>
      </div>
    );
  }

  // Derived display values.
  const displayName = toTitleCase(provider.name || '');
  const displayCity = toTitleCase((provider.city || '').trim());
  const stateName = STATE_NAME[provider.state] || provider.state;
  const certYear = fmtDate(provider.certification_date);
  const ofs = provider.ownership_flags || {};
  const metrics = provider.metrics || {};
  const flags = provider.flags || {};
  const flagCount = flags.flagged_count ?? 0;

  // Care-locations are stored as percentages (0–100) on the provider record.
  const careLocs = [
    {
      pct: pctNum(metrics.care_provided_home_pct),
      label: 'At home',
    },
    {
      pct: pctNum(metrics.care_provided_nursing_facility_pct),
      label: 'In a nursing facility',
    },
    {
      pct: pctNum(metrics.care_provided_inpatient_hospice_pct),
      label: 'In an inpatient hospice unit',
    },
    {
      pct: pctNum(metrics.care_provided_inpatient_hospital_pct),
      label: 'In an inpatient hospital',
    },
  ];

  // CMS overall star rating (1–5). May be null if CMS hasn't published one
  // for this hospice — we then fall back to a coarse composite proxy from
  // flagged_count so the page still has a number to anchor on, and label it.
  const cmsStars = provider.cms_overall_rating;
  const hasCmsStars = cmsStars != null && !Number.isNaN(Number(cmsStars));
  const starNum = hasCmsStars ? Number(cmsStars) : deriveStarProxy(provider);
  const starsFilled = '★'.repeat(Math.round(starNum));
  const starsEmpty = '☆'.repeat(Math.max(0, 5 - Math.round(starNum)));

  // Inpatient unit available pill (yes/no, with green/muted styling).
  const inpatientUnitYes = !!provider.inpatient_unit_available;

  // Hospice Visits in Last Days of Life — recommended-care metric.
  const hvldlPct = pctNum(metrics.hvldl_pct);

  // Care-in-nursing-facility share (used as a quick stat).
  const nursingFacilityPct = pctNum(metrics.care_provided_nursing_facility_pct);

  // Pattern flag values + thresholds.
  const liveDischarge = pctNum(metrics.live_discharge_pct);
  const gip = pctNum(metrics.gip_pct);
  const ldP90 = thresholds?.live_discharge_p90 ?? 14.6;
  const ldMedian = thresholds?.live_discharge_median ?? 6.5;
  const gipP90 = thresholds?.gip_p90 ?? 1.3;
  const gipMedian = thresholds?.gip_median ?? 0;

  const ldFlagged = !!flags.live_discharge_high;
  const gipFlagged = !!flags.gip_high;

  // Ownership badge classification.
  const isPe = !!ofs.pe;
  const isReit = !!ofs.reit;
  const isForProfit = (provider.ownership_type || '').toLowerCase().includes('for-profit')
    || (provider.ownership_type || '').toLowerCase().includes('for profit')
    || !!ofs.forProfit;
  const isNonProfit = (provider.ownership_type || '').toLowerCase().includes('non-profit')
    || (provider.ownership_type || '').toLowerCase().includes('non profit')
    || !!ofs.nonProfit;
  const isChain = !!ofs.chain || !!provider.parent;

  // Headline summary builder.
  const summarySentences = [];
  if (flagCount === 0) {
    summarySentences.push(
      <span key="ok">
        No CMS-published patterns are flagged at this hospice in the most recent reporting window.
        That doesn't mean it's the right fit for your family — it means published rates fall inside
        the national distribution.
      </span>,
    );
  } else {
    const which = [];
    if (ldFlagged) which.push('early live discharge rate');
    if (gipFlagged) which.push('CHC/GIP utilization');
    summarySentences.push(
      <span key="flagged">
        {which.length} CMS-published pattern{which.length !== 1 ? 's' : ''} flagged for closer review:{' '}
        <strong>{which.join(' and ')}</strong>. Above the national 90th percentile. Neither finding
        is an allegation of misconduct — both are starting points for a conversation with the
        provider.
      </span>,
    );
  }

  // Public-record items: pull this CCN's items from each loaded feed, tag
  // each with its source, and merge into a single date-desc array.
  const ccnKey = String(provider.ccn);
  const oigItems = ((pubRec.oig?.items_by_ccn || {})[ccnKey] || []).map((it) => ({
    source: 'oig',
    date: it.exclusion_date,
    headline: `OIG exclusion (LEIE) — ${it.individual_name || it.entity_name || 'individual'}${
      it.individual_role ? ` (${it.individual_role})` : ''
    }`,
    summary: `Exclusion type ${it.exclusion_type || '—'}. ${
      it.match_basis ? `Matched to this hospice on ${it.match_basis}. ` : ''
    }${it.match_confidence ? `Match confidence: ${it.match_confidence}.` : ''}`.trim(),
    url: 'https://oig.hhs.gov/exclusions/exclusions_list.asp',
    raw: it,
  }));
  const newsItems = ((pubRec.news?.items_by_ccn || {})[ccnKey] || []).map((it) => ({
    source: 'news',
    date: it.date,
    headline: it.headline,
    summary: it.summary,
    url: it.url,
    sourceName: it.source,
    raw: it,
  }));
  const dojItems = ((pubRec.doj?.items_by_ccn || {})[ccnKey] || []).map((it) => ({
    source: 'doj',
    date: it.date,
    headline: it.headline,
    summary: `${it.summary || ''}${
      it.settlement_amount_dollars
        ? ` Settlement: $${Number(it.settlement_amount_dollars).toLocaleString()}.`
        : ''
    }`.trim(),
    url: it.url,
    raw: it,
  }));
  const courtItems = ((pubRec.court?.items_by_ccn || {})[ccnKey] || []).map((it) => ({
    source: 'court',
    date: it.date_filed,
    headline: it.case_caption,
    summary: `${it.court || 'Federal court'}. ${it.summary || ''}`.trim(),
    url: it.docket_url,
    raw: it,
  }));
  const mfcuItems = ((pubRec.mfcu?.items_by_ccn || {})[ccnKey] || []).map((it) => ({
    source: 'mfcu',
    date: it.date,
    headline: it.headline,
    summary: `${it.ag_state || 'State'} AG (${it.action_type || 'action'}). ${it.summary || ''}`.trim(),
    url: it.source_url,
    raw: it,
  }));
  const mergedPubRec = [...dojItems, ...mfcuItems, ...courtItems, ...oigItems, ...newsItems].sort((a, b) => {
    const da = new Date(a.date || 0).getTime();
    const db = new Date(b.date || 0).getTime();
    return db - da;
  });

  // Per-source counts for the data-feed status bar.
  const oigCount = oigItems.length;
  const newsCount = newsItems.length;
  const dojCount = dojItems.length;
  const courtCount = courtItems.length;
  const mfcuCount = mfcuItems.length;
  const totalPubRec = mergedPubRec.length;

  // Per-source last-update timestamps.
  const oigGeneratedAt = pubRec.oig?.generated_at;
  const newsGeneratedAt = pubRec.news?.generated_at;
  const dojGeneratedAt = pubRec.doj?.generated_at;
  const courtGeneratedAt = pubRec.court?.generated_at;
  const mfcuGeneratedAt = pubRec.mfcu?.generated_at;

  return (
    <div className="hospice-provider">
      <Helmet>
        <title>{`${displayName} | The Oversight Report`}</title>
        <meta
          name="description"
          content={`${displayName} in ${displayCity}, ${provider.state}. Independent Medicare-certified hospice safety report. CAHPS family-experience scores, live-discharge and GIP utilization patterns, ownership disclosure, and complaint routing.`}
        />
        <link rel="canonical" href={`https://www.oversightreports.com/hospice/${provider.ccn}`} />
      </Helmet>

      <div className="hp-crumb">
        <Link to="/">Home</Link>
        <span className="sep">›</span>
        <Link to="/hospice">Hospice</Link>
        <span className="sep">›</span>
        <Link to={`/hospice?state=${provider.state}`}>{stateName}</Link>
        <span className="sep">›</span>
        {displayName}
      </div>

      {/* PAGE HEAD */}
      <section className="hp-page-head">
        <div>
          <div className="hp-eyebrow">// hospice provider report</div>
          <h1 className="hp-title">{displayName}</h1>
          <p className="hp-loc">
            {provider.address}
            {' · '}
            {displayCity}, {provider.state} {provider.zip}
            {provider.phone ? <> · {provider.phone}</> : null}
          </p>
          <div className="hp-meta">
            CCN {provider.ccn}
            {certYear ? <> · Medicare-certified since {certYear}</> : null}
            {' · '}Last refreshed{' '}
            {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>
          <div className="hp-flags">
            {isForProfit && <span className="hp-flag hp-flag-fp">For-profit</span>}
            {isNonProfit && <span className="hp-flag hp-flag-np">Non-profit</span>}
            {isChain && <span className="hp-flag hp-flag-chain">Chain-affiliated</span>}
            {isPe && <span className="hp-flag hp-flag-pe">PE-backed</span>}
            {isReit && <span className="hp-flag hp-flag-reit">REIT-affiliated</span>}
          </div>
        </div>
        <div className="hp-qi">
          <div className="hp-qi-row">
            <span className="k">Avg daily census</span>
            <span className="v">
              {metrics.avg_daily_census != null ? Number(metrics.avg_daily_census).toLocaleString() : '—'}
            </span>
          </div>
          <div className="hp-qi-row">
            <span className="k">Live discharge rate</span>
            <span className={`v${ldFlagged ? ' amber' : ''}`}>
              {liveDischarge != null ? `${liveDischarge.toFixed(1)}%` : '—'}
            </span>
          </div>
          <div className="hp-qi-row">
            <span className="k">CHC/GIP utilization</span>
            <span className={`v${gipFlagged ? ' amber' : ''}`}>
              {gip != null ? `${gip.toFixed(1)}%` : '—'}
            </span>
          </div>
          <div className="hp-qi-row">
            <span className="k">Patterns flagged</span>
            <span className={`v${flagCount > 0 ? ' amber' : ''}`}>{flagCount} of 2</span>
          </div>
          <div className="hp-qi-row" title="% of patients who received a recommended visit during their last 3 days of life.">
            <span className="k">Recommended care · last days</span>
            <span className="v">
              {hvldlPct != null ? `${hvldlPct.toFixed(1)}%` : '—'}
            </span>
          </div>
          <div className="hp-qi-row">
            <span className="k">% in nursing facility</span>
            <span className="v">
              {nursingFacilityPct != null ? `${Math.round(nursingFacilityPct)}%` : '—'}
            </span>
          </div>
          <div className="hp-qi-row">
            <span className="k">Inpatient hospice unit available</span>
            <span className="v">
              <span className={inpatientUnitYes ? 'hp-pill-yes' : 'hp-pill-no'}>
                {inpatientUnitYes ? 'Yes' : 'No'}
              </span>
            </span>
          </div>
          <div className="hp-qi-row">
            <span className="k">Parent operator</span>
            <span className="v">{provider.parent ? toTitleCase(provider.parent) : '—'}</span>
          </div>
        </div>
      </section>

      {/* RATING + SUMMARY */}
      <section className="hp-rating-block">
        <div className="hp-rating-card">
          <div className="hp-star-block">
            {hasCmsStars ? (
              <>
                <div className="hp-star-num">{Number(cmsStars).toFixed(1)} / 5</div>
                <div className="hp-star-symbols">{starsFilled}{starsEmpty}</div>
                <div className="hp-star-label">CMS overall star rating</div>
              </>
            ) : (
              <>
                <div className="hp-star-num">—</div>
                <div className="hp-star-symbols">{'☆☆☆☆☆'}</div>
                <div className="hp-star-label">
                  CMS hasn't published a rating for this hospice
                </div>
              </>
            )}
          </div>
          <div className="hp-summary">
            <h2>What the data says about {displayName}.</h2>
            <p>{summarySentences}</p>
            <p>
              Published patterns are starting points for asking why — not findings of misconduct.
              The data below is sourced from CMS Hospice Care Compare, the CMS Hospice Care Index,
              and CMS Hospice CAHPS family surveys.
            </p>
          </div>
        </div>
      </section>

      {/* FAMILY EXPERIENCE — CAHPS */}
      <section className="hp-section">
        <div className="hp-section-inner">
          <div className="hp-section-eyebrow">// what other families said</div>
          <h2 className="hp-section-title">Family experience at hospices in {stateName}.</h2>
          <p className="hp-section-desc">
            CMS surveys family caregivers 1–3 months after the patient passed away. Each score below
            is the <strong>percentage of families who gave the top rating (9 or 10 out of 10)</strong>{' '}
            on that measure — so a higher score means more families said the hospice did well on
            that question.
          </p>

          {provider.cahps && provider.cahps.overall_rating_pct != null ? (
            <>
              <div className={`hp-cahps-headline${
                cahpsHighlight && cahpsHighlight.best && cahpsHighlight.best.delta >= 0 ? ' good' : ''
              }`}>
                <div className="h1">
                  {provider.cahps.overall_rating_pct}% of families rated {displayName} at the top
                  of the scale (9 or 10 out of 10).
                </div>
                <div className="h2">
                  {stateName} state average is{' '}
                  <strong>
                    {(() => {
                      const r = cahpsRows.find((x) => x.code === 'RATING_TBV');
                      return r?.state != null ? `${r.state}%` : '—';
                    })()}
                  </strong>
                  ; national average is{' '}
                  <strong>
                    {(() => {
                      const r = cahpsRows.find((x) => x.code === 'RATING_TBV');
                      return r?.national != null ? `${r.national}%` : '—';
                    })()}
                  </strong>
                  . Scores reflect CMS Hospice CAHPS surveys returned by family caregivers 1–3 months
                  after the patient's death.
                </div>
              </div>

              {cahpsHighlight && (
                <div className="hp-cahps-highlights">
                  <div className={`hp-cahps-card ${cahpsHighlight.best.delta >= 0 ? 'good' : 'bad'}`}>
                    <span className={`hp-cahps-pill ${cahpsHighlight.best.delta >= 0 ? 'good' : 'bad'}`}>
                      Best vs state avg
                    </span>
                    <h3>{cahpsHighlight.best.label}</h3>
                    <ul className="hp-cahps-list">
                      <li>
                        <span className="measure">This hospice</span>
                        <span className="num">{cahpsHighlight.best.provider}%</span>
                      </li>
                      <li>
                        <span className="measure">{provider.state} state avg</span>
                        <span className="num">
                          {cahpsHighlight.best.state != null ? `${cahpsHighlight.best.state}%` : '—'}
                        </span>
                      </li>
                      <li>
                        <span className="measure">Δ vs state</span>
                        <span className={`delta ${cahpsHighlight.best.delta >= 0 ? 'good' : 'bad'}`}>
                          {cahpsHighlight.best.delta >= 0 ? '+' : ''}
                          {cahpsHighlight.best.delta} pts
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className={`hp-cahps-card ${cahpsHighlight.worst.delta >= 0 ? 'good' : 'bad'}`}>
                    <span className={`hp-cahps-pill ${cahpsHighlight.worst.delta >= 0 ? 'good' : 'bad'}`}>
                      Worst vs state avg
                    </span>
                    <h3>{cahpsHighlight.worst.label}</h3>
                    <ul className="hp-cahps-list">
                      <li>
                        <span className="measure">This hospice</span>
                        <span className="num">{cahpsHighlight.worst.provider}%</span>
                      </li>
                      <li>
                        <span className="measure">{provider.state} state avg</span>
                        <span className="num">
                          {cahpsHighlight.worst.state != null ? `${cahpsHighlight.worst.state}%` : '—'}
                        </span>
                      </li>
                      <li>
                        <span className="measure">Δ vs state</span>
                        <span className={`delta ${cahpsHighlight.worst.delta >= 0 ? 'good' : 'bad'}`}>
                          {cahpsHighlight.worst.delta >= 0 ? '+' : ''}
                          {cahpsHighlight.worst.delta} pts
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="hp-cahps-table">
                <button
                  type="button"
                  className="hp-cahps-toggle"
                  onClick={() => setShowCahpsTable((v) => {
                    if (!v && window.plausible) {
                      window.plausible('Hospice-Provider-CAHPS-Expanded');
                    }
                    return !v;
                  })}
                >
                  <span>// All 8 family-experience scores · click to expand</span>
                  <span>{showCahpsTable ? '↑' : '↓'}</span>
                </button>
                {showCahpsTable && (
                  <div className="hp-cahps-content">
                    <table>
                      <thead>
                        <tr>
                          <th>Measure</th>
                          <th className="right">This hospice</th>
                          <th className="right">{provider.state} avg</th>
                          <th className="right">National avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cahpsRows.map((row) => (
                          <tr key={row.code}>
                            <td className="measure">{row.label}</td>
                            <td className={`right num${
                              row.delta != null && row.delta < 0 ? ' bad' : ''
                            }`}>
                              {row.provider != null ? `${row.provider}%` : '—'}
                            </td>
                            <td className="right num muted">
                              {row.state != null ? `${row.state}%` : '—'}
                            </td>
                            <td className="right num muted">
                              {row.national != null ? `${row.national}%` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="hp-cahps-headline">
                <div className="h1">Family-experience scores for this hospice are suppressed.</div>
                <div className="h2">
                  CMS suppressed family-experience scores for this hospice — typically because fewer
                  than 50 family surveys were returned. State and national averages on each of the 8
                  CMS Hospice CAHPS top-box measures are shown below.
                </div>
              </div>

              <div className="hp-cahps-table">
                <button
                  type="button"
                  className="hp-cahps-toggle"
                  onClick={() => setShowCahpsTable((v) => {
                    if (!v && window.plausible) {
                      window.plausible('Hospice-Provider-CAHPS-Expanded');
                    }
                    return !v;
                  })}
                >
                  <span>// All 8 family-experience scores · click to expand</span>
                  <span>{showCahpsTable ? '↑' : '↓'}</span>
                </button>
                {showCahpsTable && (
                  <div className="hp-cahps-content">
                    <table>
                      <thead>
                        <tr>
                          <th>Measure</th>
                          <th className="right">{provider.state} avg</th>
                          <th className="right">National avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cahpsRows.map((row) => (
                          <tr key={row.code}>
                            <td className="measure">{row.label}</td>
                            <td className="right num">
                              {row.state != null ? `${row.state}%` : '—'}
                            </td>
                            <td className="right num muted">
                              {row.national != null ? `${row.national}%` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          <p className="hp-cahps-foot">
            Top-box scoring per CMS Hospice CAHPS methodology — % of families rating 9 or 10 out of
            10 on each measure. State averages are the published CMS state-level CAHPS aggregates.
            Sample sizes vary by hospice; CMS suppresses results where the response count is below
            their reporting threshold.
          </p>
        </div>
      </section>

      {/* PATTERN FLAGS */}
      <section className="hp-section hp-section-light">
        <div className="hp-section-inner">
          <div className="hp-section-eyebrow">// patterns flagged for review</div>
          <h2 className="hp-section-title">CMS metrics outside the national distribution.</h2>
          <p className="hp-section-desc">
            When a hospice's published rates are higher than 9 out of 10 hospices nationally, we
            flag them. It's not an accusation — it's a starting point for asking why.
          </p>

          <div className="hp-pattern-cards">
            {/* Live discharge */}
            <div className={`hp-pattern-card${ldFlagged ? '' : ' ok'}`}>
              <span className={`hp-pattern-pill ${ldFlagged ? 'flagged' : 'ok'}`}>
                {ldFlagged ? 'Pattern 1 · flagged' : 'Pattern 1 · within range'}
              </span>
              <h3>Early live discharge rate</h3>
              <div className="hp-pattern-row">
                <div>
                  <div className="lbl">This hospice</div>
                  <div className={`val${ldFlagged ? ' flagged' : ''}`}>
                    {liveDischarge != null ? `${liveDischarge.toFixed(1)}%` : '—'}
                  </div>
                </div>
                <div>
                  <div className="lbl">National median</div>
                  <div className="val">{ldMedian.toFixed(1)}%</div>
                </div>
              </div>
              <div className="hp-pattern-row">
                <div>
                  <div className="lbl">90th-pct threshold</div>
                  <div className="val">{ldP90.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="lbl">Flag fires above</div>
                  <div className="val">{ldP90.toFixed(1)}%</div>
                </div>
              </div>
              <div className="hp-pattern-explainer">
                The share of live discharges happening within the first 7 days of admission. Above
                the 90th-percentile threshold means this hospice is in the top 10% nationally for
                this metric — the level where peer review is warranted. CMS Hospice Care Index
                measure H_012_03.
              </div>
            </div>

            {/* GIP */}
            <div className={`hp-pattern-card${gipFlagged ? '' : ' ok'}`}>
              <span className={`hp-pattern-pill ${gipFlagged ? 'flagged' : 'ok'}`}>
                {gipFlagged ? 'Pattern 2 · flagged' : 'Pattern 2 · within range'}
              </span>
              <h3>CHC / GIP utilization</h3>
              <div className="hp-pattern-row">
                <div>
                  <div className="lbl">This hospice</div>
                  <div className={`val${gipFlagged ? ' flagged' : ''}`}>
                    {gip != null ? `${gip.toFixed(1)}%` : '—'}
                  </div>
                </div>
                <div>
                  <div className="lbl">National median</div>
                  <div className="val">{gipMedian.toFixed(1)}%</div>
                </div>
              </div>
              <div className="hp-pattern-row">
                <div>
                  <div className="lbl">90th-pct threshold</div>
                  <div className="val">{gipP90.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="lbl">Flag fires above</div>
                  <div className="val">{gipP90.toFixed(1)}%</div>
                </div>
              </div>
              <div className="hp-pattern-explainer">
                The share of patient days billed at the highest-paid hospice levels (Continuous Home
                Care or General Inpatient — about 5× the routine home-care rate). Above the national
                90th percentile. CMS Hospice Care Index measure H_012_01.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CARE LOCATIONS */}
      <section className="hp-section">
        <div className="hp-section-inner">
          <div className="hp-section-eyebrow">// where care is delivered</div>
          <h2 className="hp-section-title">Where this hospice provides care.</h2>
          <p className="hp-section-desc">
            Share of patient days delivered in each setting. Useful for understanding what your
            loved one's daily care will actually look like.
          </p>
          <div className="hp-care-locs">
            {careLocs.map((c) => (
              <div className="hp-care-loc" key={c.label}>
                <div className="pct">{c.pct != null ? `${Math.round(c.pct)}%` : '—'}</div>
                <div className="lbl">{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PUBLIC RECORD & ENFORCEMENT */}
      <section className="hp-section hp-section-light">
        <div className="hp-section-inner">
          <div className="hp-section-eyebrow">// public record &amp; enforcement</div>
          <h2 className="hp-section-title">What's in the public record about this hospice.</h2>
          <p className="hp-section-desc">
            DOJ press releases, state AG actions, OIG exclusions, CMS deficiency citations, federal
            court filings, and dated news coverage — aggregated from public sources, every item
            linked to its origin.
          </p>

          <div className="hp-pubrec">
            {/* Live data-feed status bar */}
            <div className="hp-pubrec-feeds">
              <div className="hp-pubrec-feeds-head">
                <span>
                  <span className="hp-live-dot"></span>
                  8 sources monitored · refreshed daily
                </span>
                <span>
                  {totalPubRec} item{totalPubRec === 1 ? '' : 's'} found for this hospice
                </span>
              </div>
              <div className="hp-pubrec-feeds-grid">
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name">OIG Exclusions (LEIE)</span>
                  <span className="hp-pubrec-feed-time">
                    OIG · {oigGeneratedAt ? relTime(oigGeneratedAt) : 'pending'}
                  </span>
                </div>
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name">DOJ press releases</span>
                  <span className="hp-pubrec-feed-time">
                    DOJ · {dojGeneratedAt ? relTime(dojGeneratedAt) : 'pending'}
                  </span>
                </div>
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name">Hospice News</span>
                  <span className="hp-pubrec-feed-time">
                    News · {newsGeneratedAt ? relTime(newsGeneratedAt) : 'pending'}
                  </span>
                </div>
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name">KFF Health News</span>
                  <span className="hp-pubrec-feed-time">
                    News · {newsGeneratedAt ? relTime(newsGeneratedAt) : 'pending'}
                  </span>
                </div>
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name">ProPublica</span>
                  <span className="hp-pubrec-feed-time">
                    News · {newsGeneratedAt ? relTime(newsGeneratedAt) : 'pending'}
                  </span>
                </div>
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name pending">CMS deficiency citations</span>
                  <span className="hp-pubrec-feed-time pending">live · weekly</span>
                </div>
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name">CourtListener · federal</span>
                  <span className="hp-pubrec-feed-time">
                    Court · {courtGeneratedAt ? relTime(courtGeneratedAt) : 'pending'}
                  </span>
                </div>
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name">State AG MFCU</span>
                  <span className="hp-pubrec-feed-time">
                    AG · {mfcuGeneratedAt ? relTime(mfcuGeneratedAt) : 'pending'}
                  </span>
                </div>
              </div>
            </div>

            <div className="hp-pubrec-disclaimer">
              <strong>How to read this section.</strong> Items below are aggregated from publicly
              published government sources and reputable news outlets. Each item is dated and linked
              to its origin so you can verify it directly. Inclusion of an item does not constitute
              a finding by The Oversight Report — these are factual records of what other parties
              have published. Settlements typically include language stating they are not admissions
              of wrongdoing.
            </div>

            {totalPubRec === 0 ? (
              <div className="hp-pubrec-empty">
                <strong>No public-record items found for this hospice in our data sources.</strong>{' '}
                Have a citation? Submit a tip below — we add only items with a citable government,
                court, or reputable-news source.
              </div>
            ) : (
              <>
                <ul className="hp-pubrec-list">
                  {mergedPubRec.map((item, idx) => {
                    const tagClass =
                      item.source === 'doj'
                        ? 'hp-tag-doj'
                        : item.source === 'oig'
                          ? 'hp-tag-oig'
                          : 'hp-tag-news';
                    const tagLabel =
                      item.source === 'doj'
                        ? 'DOJ'
                        : item.source === 'oig'
                          ? 'OIG'
                          : (item.sourceName || 'News');
                    const handlePubRecItemClick = () => {
                      if (window.plausible) {
                        window.plausible('Hospice-Provider-PubRec-Item-Click', {
                          props: { source: item.source, ccn: ccnKey },
                        });
                      }
                    };
                    const handleVerifyLinkClick = () => {
                      if (window.plausible) {
                        let destination = item.url || '';
                        try { destination = new URL(item.url).hostname; } catch { /* keep raw */ }
                        window.plausible('Hospice-Provider-Verify-Link-Click', {
                          props: { destination },
                        });
                      }
                    };
                    return (
                      <li
                        className="hp-pubrec-item"
                        key={`${item.source}-${idx}-${item.headline}`}
                        onClick={handlePubRecItemClick}
                      >
                        <div className="hp-pubrec-date">{fmtItemDate(item.date)}</div>
                        <div className="hp-pubrec-content">
                          <h4>{item.headline}</h4>
                          {item.summary && <p>{item.summary}</p>}
                          {item.url && (
                            <a
                              className="hp-pubrec-link"
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={handleVerifyLinkClick}
                            >
                              Read original →
                            </a>
                          )}
                        </div>
                        <span className={`hp-pubrec-tag ${tagClass}`}>{tagLabel}</span>
                      </li>
                    );
                  })}
                </ul>

                <div className="hp-pubrec-empty">
                  <strong>Have another item to add?</strong> If you're aware of public-record items
                  about this hospice not listed above, send us a citation (DOJ press release, AG
                  release, court docket number, or news article URL). We add only items with a
                  citable government or court source.
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* OWNERSHIP */}
      <section className="hp-section">
        <div className="hp-section-inner">
          <div className="hp-section-eyebrow">// ownership disclosure</div>
          <h2 className="hp-section-title">Who owns this hospice.</h2>
          <p className="hp-section-desc">
            Sourced from CMS Hospice Ownership Disclosure (most recent quarterly snapshot). Changes
            of ownership are tracked.
          </p>

          <div className="hp-owner">
            <div className="hp-owner-row">
              <span className="k">Parent operator</span>
              <span className="v">
                {provider.parent ? toTitleCase(provider.parent) : 'Independent (no listed parent)'}
              </span>
            </div>
            <div className="hp-owner-row">
              <span className="k">Operator type</span>
              <span className="v">
                {provider.ownership_type || '—'}
                {isChain ? ' · Chain-affiliated' : ''}
              </span>
            </div>
            <div className="hp-owner-row">
              <span className="k">PE / REIT flag</span>
              <span className={`v ${isPe ? 'purple' : isReit ? 'amber' : 'teal'}`}>
                {isPe ? 'PE-backed' : isReit ? 'REIT-affiliated' : 'No PE / REIT flag'}
              </span>
            </div>
            <div className="hp-owner-row">
              <span className="k">For-profit / non-profit</span>
              <span className="v">
                {isForProfit ? 'For-profit' : isNonProfit ? 'Non-profit' : '—'}
              </span>
            </div>
            <div className="hp-owner-row">
              <span className="k">Medicare-certified since</span>
              <span className="v">{certYear || '—'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 10 QUESTIONS — moved to bottom per Robert's instruction */}
      <section className="hp-section hp-section-light">
        <div className="hp-section-inner">
          <div className="hp-section-eyebrow">// before you sign the admission form</div>
          <h2 className="hp-section-title">10 questions to ask {displayName}.</h2>
          <p className="hp-section-desc">
            Now that you've seen the data — print this checklist and bring it to the admission
            meeting. Ask any hospice you're considering, even one your hospital recommended.
          </p>

          <div className="hp-ask">
            <ol className="hp-ask-list">
              {TEN_QUESTIONS.map((q, idx) => (
                <li className="hp-ask-item" key={idx}>
                  <span className="hp-ask-num">{idx + 1}</span>
                  <span className="hp-ask-q">{q}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* COMPLAINT ROUTING */}
      <section className="hp-help">
        <div className="hp-help-inner">
          <div className="hp-help-eyebrow">// concerned about something at this hospice?</div>
          <h2 className="hp-help-title">Where to file a complaint.</h2>
          <p className="hp-help-sub">
            If your loved one received care that concerns you, these are the channels that can act
            on it. Reports here generate the paper trail that future investigators rely on.
          </p>
          <div className="hp-help-channels">
            <div className="hp-help-card">
              <div className="lbl">// 1</div>
              <div className="ttl">{provider.state} state survey agency</div>
              <div className="desc">
                The body that conducts hospice surveys under CMS contract. Generates the official
                paper trail.
              </div>
            </div>
            <div className="hp-help-card">
              <div className="lbl">// 2</div>
              <div className="ttl">CMS hospice complaint</div>
              <div className="desc">
                Federal channel. Goes to your CMS regional office for review.
              </div>
            </div>
            <div className="hp-help-card">
              <div className="lbl">// 3</div>
              <div className="ttl">{provider.state} AG · Medicaid Fraud</div>
              <div className="desc">
                For suspected billing fraud or abuse. The state Attorney General's MFCU.
              </div>
            </div>
            <div className="hp-help-card">
              <div className="lbl">// 4</div>
              <div className="ttl">{provider.state} Long-Term Care Ombudsman</div>
              <div className="desc">
                Independent advocate for residents and families. Free and confidential.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ACTION BAR */}
      <section className="hp-action">
        <div className="hp-action-inner">
          <div className="label">// take this with you</div>
          <div className="actions">
            <button type="button" className="hp-btn" onClick={() => window.print()}>
              Print this page
            </button>
            <Link
              to={`/hospice/compare?ccns=${provider.ccn}`}
              className="hp-btn"
              onClick={() => {
                if (window.plausible) {
                  window.plausible('Hospice-Provider-Compare-Link-Click', {
                    props: { ccn: ccnKey },
                  });
                }
              }}
            >
              Compare to nearby hospices
            </Link>
            <Link to="/methodology" className="hp-btn">
              Read methodology
            </Link>
          </div>
        </div>
      </section>

      {/* NEARBY */}
      <section className="hp-section">
        <div className="hp-section-inner">
          <div className="hp-section-eyebrow">
            // nearby hospices · {stateName}
          </div>
          <h2 className="hp-section-title">Other options to consider.</h2>
          <p className="hp-section-desc">
            Medicare-certified hospices serving the same area. Click any to see their full report.
          </p>

          {nearby.length === 0 ? (
            <p className="hp-cahps-foot">
              No other Medicare-certified hospices found in {stateName} for this view.
            </p>
          ) : (
            <div className="hp-nearby-grid">
              {nearby.map((n) => (
                <Link key={n.ccn} to={`/hospice/${n.ccn}`} className="hp-nearby-card">
                  <div className="name">{toTitleCase(n.name || '')}</div>
                  <div className="loc">
                    {toTitleCase((n.city || '').trim())}, {n.state}
                  </div>
                  <div className="quick">
                    <span className="stars">
                      {(n.flags?.flagged_count ?? 0) === 0 ? '★★★★' : '★★★'}
                    </span>
                    <span
                      className={`flag${(n.flags?.flagged_count ?? 0) > 0 ? ' amber' : ''}`}
                    >
                      {(n.flags?.flagged_count ?? 0) > 0
                        ? `${n.flags.flagged_count} pattern${n.flags.flagged_count > 1 ? 's' : ''} flagged`
                        : 'No patterns flagged'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="hp-footnote">
        <strong>Author.</strong> Robert Benard, NP (AGACNP-BC, PMHNP-BC) · DataLink Clinical LLC.
        Data sourced from CMS Hospice Care Compare, CMS Hospice Care Index, CMS Hospice CAHPS, and
        CMS Hospice Ownership Disclosure. All numbers traceable to source. Last refreshed{' '}
        {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}.
      </div>
    </div>
  );
}
