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
const CAHPS_MEASURES = [
  { code: 'SYMPTOMS_TBV',    label: 'Help for pain & symptoms' },
  { code: 'TIMELY_CARE_TBV', label: 'Getting timely care' },
  { code: 'TRAINING_TBV',    label: 'Training family to care' },
  { code: 'EMO_REL_TBV',     label: 'Emotional & spiritual support' },
  { code: 'RATING_TBV',      label: 'Overall rating of hospice' },
  { code: 'TEAM_COMM_TBV',   label: 'Communication with family' },
  { code: 'RECOMMEND_TBV',   label: 'Would recommend this hospice' },
  { code: 'RESPECT_TBV',     label: 'Treating patient with respect' },
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

    return CAHPS_MEASURES.map(({ code, label }) => {
      const stateRow = stateByCode[code];
      const natRow = nationalByCode[code];
      const stateScore = stateRow?.Score && stateRow.Score !== 'Not Applicable'
        ? Number(stateRow.Score)
        : null;
      const natScore = natRow?.Score && natRow.Score !== 'Not Applicable'
        ? Number(natRow.Score)
        : null;
      // Provider-level CAHPS isn't yet joined in the per-provider record.
      // Until it is, we surface state vs national, with provider score null.
      // Phase 2 will add provider-specific TBV scores.
      return {
        code,
        label,
        provider: null,
        state: stateScore,
        national: natScore,
        delta: null, // delta vs state, set when provider score lands
      };
    });
  }, [cahpsBenchmarks, provider]);

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
  // Derive an "at home" residual since the source covers home + nursing
  // facility + inpatient hospice + inpatient hospital.
  const careLocs = [
    {
      pct: pctNum(metrics.care_provided_home_pct),
      label: 'At home',
    },
    {
      pct: null, // nursing facility share isn't published per-provider in this slice
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

  // Star rating: provider record doesn't carry CMS overall stars yet.
  // We surface a proxy and clearly label its source. Phase 2: pull stars.
  const starNum = deriveStarProxy(provider);
  const starsFilled = '★'.repeat(Math.round(starNum));
  const starsEmpty = '☆'.repeat(Math.max(0, 5 - Math.round(starNum)));

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
            <div className="hp-star-num">{starNum.toFixed(1)}</div>
            <div className="hp-star-symbols">{starsFilled}{starsEmpty}</div>
            <div className="hp-star-label">composite proxy</div>
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

          <div className="hp-cahps-headline">
            <div className="h1">Family-experience benchmarks for {stateName}.</div>
            <div className="h2">
              Per-hospice CAHPS scores aren't yet wired into this report. Below are the{' '}
              <strong>{stateName} state averages</strong> on each of the 8 CMS Hospice CAHPS top-box
              measures, alongside the national average. Per-hospice CAHPS comparisons are coming in
              Phase 2.
            </div>
          </div>

          <div className="hp-cahps-table">
            <button
              type="button"
              className="hp-cahps-toggle"
              onClick={() => setShowCahpsTable((v) => !v)}
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
            {/* Phase 1 data-feed status bar */}
            <div className="hp-pubrec-feeds">
              <div className="hp-pubrec-feeds-head">
                <span>
                  <span className="hp-live-dot"></span>
                  Phase 1: 2 of 8 sources live · 6 more coming
                </span>
                <span>0 items found for this hospice</span>
              </div>
              <div className="hp-pubrec-feeds-grid">
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name">OIG Exclusions (LEIE)</span>
                  <span className="hp-pubrec-feed-time">live · daily</span>
                </div>
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name">CMS deficiency citations</span>
                  <span className="hp-pubrec-feed-time">live · weekly</span>
                </div>
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name pending">DOJ press releases</span>
                  <span className="hp-pubrec-feed-time pending">Phase 2</span>
                </div>
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name pending">CourtListener · federal</span>
                  <span className="hp-pubrec-feed-time pending">Phase 2</span>
                </div>
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name pending">State AG MFCU</span>
                  <span className="hp-pubrec-feed-time pending">Phase 2</span>
                </div>
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name pending">Hospice News</span>
                  <span className="hp-pubrec-feed-time pending">Phase 2</span>
                </div>
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name pending">KFF Health News</span>
                  <span className="hp-pubrec-feed-time pending">Phase 2</span>
                </div>
                <div className="hp-pubrec-feed-item">
                  <span className="hp-pubrec-feed-name pending">ProPublica</span>
                  <span className="hp-pubrec-feed-time pending">Phase 2</span>
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

            {/* Phase 1 sample items: 1 OIG placeholder + 1 CMS placeholder, both
                clearly marked as not yet wired to live feeds. */}
            <ul className="hp-pubrec-list">
              <li className="hp-pubrec-item">
                <div className="hp-pubrec-date">Pending</div>
                <div className="hp-pubrec-content">
                  <h4>OIG Exclusions check (LEIE) — no items found</h4>
                  <p>
                    The HHS Office of Inspector General publishes the List of Excluded
                    Individuals/Entities (LEIE). When a person tied to this hospice's medical
                    director, ownership, or billing is excluded, the item will appear here with the
                    OIG citation and effective date. As of the most recent snapshot, no LEIE items
                    are linked to this CCN.
                  </p>
                  <span className="hp-pubrec-source">Source: HHS OIG LEIE database →</span>
                </div>
                <span className="hp-pubrec-tag hp-tag-oig">OIG · Phase 1</span>
              </li>

              <li className="hp-pubrec-item">
                <div className="hp-pubrec-date">Pending</div>
                <div className="hp-pubrec-content">
                  <h4>CMS deficiency citations — survey records</h4>
                  <p>
                    CMS publishes hospice survey deficiency citations under 42 CFR §418. When this
                    hospice has cleared or open citations from a recent survey, the item will appear
                    here with the F-tag, scope &amp; severity, and a link to the CMS Form 2567. The
                    underlying ingest is wired; per-CCN items are loading in Phase 2.
                  </p>
                  <span className="hp-pubrec-source">Source: CMS QCOR survey reports →</span>
                </div>
                <span className="hp-pubrec-tag hp-tag-cms">CMS · Phase 1</span>
              </li>
            </ul>

            <div className="hp-pubrec-empty">
              <strong>No item here?</strong> If you're aware of public-record items about this
              hospice not listed above, send us a citation (DOJ press release, AG release, court
              docket number, or news article URL). We add only items with a citable government or
              court source.
            </div>
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
            <Link to={`/hospice/compare?ccns=${provider.ccn}`} className="hp-btn">
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
