import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/hospice-high-risk.css';

/**
 * /hospice/high-risk
 *
 * Investigation hub. Pre-computed dataset at /data/hospice/high-risk.json.
 * Defamation-disciplined copy — these are CMS-published outliers, not
 * accusations.
 */

const FILTERS = [
  { id: 'all', label: 'All flagged', axis: null },
  { id: 'live_discharge', label: 'High live discharge', axis: 'live_discharge' },
  { id: 'hci', label: 'Bottom-10% HCI', axis: 'hci' },
  { id: 'care_mix', label: 'Care-mix red flag', axis: 'care_mix' },
  { id: 'cahps', label: 'CAHPS outlier', axis: 'cahps' },
  { id: 'public_record', label: 'Public-record items', axis: 'public_record' },
  { id: 'chain', label: 'Chain-flagged', axis: 'chain' },
];

const SORTS = [
  { id: 'risk_score', label: 'Composite risk score' },
  { id: 'live_discharge', label: 'Live discharge (HVLDL)' },
  { id: 'hci', label: 'HCI composite' },
  { id: 'cahps', label: 'CAHPS outlier' },
  { id: 'public_record', label: 'Public-record count' },
];

const AXIS_COPY = {
  live_discharge: {
    title: 'Live discharge / HVLDL',
    desc: 'Bottom 10% nationally on visits in last days of life. The CA State Auditor flagged this as a top hospice oversight risk.',
  },
  hci: {
    title: 'Hospice Care Index',
    desc: 'Bottom 10% nationally on the CMS HCI composite — a 10-indicator score combining service intensity, claim patterns, and care continuity.',
  },
  care_mix: {
    title: 'Care-mix red flag',
    desc: 'Reports zero general-inpatient AND zero inpatient-hospice care. Skipping high-acuity care types is one of the CA Auditor\'s billing-pattern signals.',
  },
  cahps: {
    title: 'CAHPS family outlier',
    desc: 'Family overall-rating score more than 10 points below the state average AND below national average.',
  },
  public_record: {
    title: 'Public-record items',
    desc: 'Indexed in OIG, DOJ, court, MFCU, or news data. Recency boosts severity (last 24 months).',
  },
  chain: {
    title: 'Chain risk',
    desc: 'Belongs to a chain where a majority of members are independently flagged on CMS data.',
  },
};

function formatNum(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US');
}

function formatPercent(v) {
  if (v == null || Number.isNaN(v)) return '—';
  return `${Number(v).toFixed(1)}%`;
}

function formatDate(iso) {
  if (!iso) return 'recently';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'recently';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function pillSeverity(axisKey, axisValue) {
  // map axis value (weight) to severity color. Higher weight = severe
  if (axisKey === 'public_record') return axisValue >= 22 ? 'red' : 'amber';
  if (axisKey === 'live_discharge' || axisKey === 'hci') return axisValue >= 18 ? 'red' : 'amber';
  return 'amber';
}

function pillLabel(axisKey) {
  switch (axisKey) {
    case 'live_discharge': return 'HVLDL · bottom 10%';
    case 'hci': return 'HCI · bottom 10%';
    case 'care_mix': return 'Care-mix · zero GIP/INP';
    case 'cahps': return 'CAHPS · state outlier';
    case 'public_record': return 'Public record';
    case 'chain': return 'Chain risk';
    default: return axisKey;
  }
}

export default function HospiceHighRiskPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk_score');

  useEffect(() => {
    if (window.plausible) window.plausible('Hospice-HighRisk-View');
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/hospice/high-risk.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => { cancelled = true; };
  }, []);

  const handleChipClick = (filterId) => {
    setActiveFilter(filterId);
    if (window.plausible) window.plausible('Hospice-HighRisk-Filter', { props: { filter: filterId } });
  };

  const handleSortChange = (e) => {
    const v = e.target.value;
    setSortBy(v);
    if (window.plausible) window.plausible('Hospice-HighRisk-Sort', { props: { sort: v } });
  };

  const handleRowClick = (ccn) => {
    if (window.plausible) window.plausible('Hospice-HighRisk-Row-Click', { props: { ccn } });
  };

  const handleMethodologyClick = () => {
    if (window.plausible) window.plausible('Hospice-HighRisk-Methodology-Click');
  };

  const visible = useMemo(() => {
    if (!data || !Array.isArray(data.hospices)) return [];
    let rows = data.hospices.slice();
    // filter
    if (activeFilter !== 'all') {
      rows = rows.filter((h) => (h.axes?.[activeFilter] || 0) > 0);
    }
    // sort
    rows.sort((a, b) => {
      if (sortBy === 'risk_score') return b.risk_score - a.risk_score;
      if (sortBy === 'public_record') {
        return (b.public_record_recent_count || 0) - (a.public_record_recent_count || 0)
          || (b.axes?.public_record || 0) - (a.axes?.public_record || 0);
      }
      if (sortBy === 'live_discharge') {
        const av = a.metrics?.hvldl_pct ?? Infinity;
        const bv = b.metrics?.hvldl_pct ?? Infinity;
        return av - bv; // lower hvldl = worse, sort ascending puts worst first
      }
      if (sortBy === 'hci') {
        const av = a.metrics?.hci_composite ?? Infinity;
        const bv = b.metrics?.hci_composite ?? Infinity;
        return av - bv;
      }
      if (sortBy === 'cahps') {
        const av = a.metrics?.cahps_overall_rating_pct ?? Infinity;
        const bv = b.metrics?.cahps_overall_rating_pct ?? Infinity;
        return av - bv;
      }
      return 0;
    });
    return rows;
  }, [data, activeFilter, sortBy]);

  // axis chip counts
  const axisCounts = useMemo(() => {
    if (!data) return {};
    const out = { all: data.hospices?.length || 0 };
    for (const f of FILTERS) {
      if (f.axis) {
        out[f.id] = data.hospices.filter((h) => (h.axes?.[f.axis] || 0) > 0).length;
      }
    }
    return out;
  }, [data]);

  return (
    <>
      <Helmet>
        <title>Hospice Investigation Hub — National Watchlist | The Oversight Report</title>
        <meta
          name="description"
          content="200 hospices the data flags. CMS-published outliers ranked by the California State Auditor framework — for journalists, attorneys, and family investigators."
        />
        <link rel="canonical" href="https://www.oversightreports.com/hospice/high-risk" />
      </Helmet>

      <div className="hospice-hr">
        <nav className="hr-crumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span className="sep">/</span>
          <Link to="/hospice">Hospice</Link>
          <span className="sep">/</span>
          <span>Investigation hub</span>
        </nav>

        {/* HERO */}
        <header className="hr-hero">
          <div className="hr-hero-inner">
            <div className="hr-eyebrow">
              // for journalists · attorneys · family investigators · applied CA auditor framework
            </div>
            <h1 className="hr-hero-title">
              200 hospices the data <span className="accent">flags</span>.
            </h1>
            <p className="hr-hero-sub">
              The California State Auditor's framework, applied to all 6,943 Medicare-certified hospices in America.
            </p>
            <p className="hr-hero-lead">
              <strong>This is not an accusation.</strong> It's a list of hospices whose CMS-published numbers fall in
              the most concerning tail of national distributions — the same tail California's Auditor identified as the
              place to start an investigation. Every score is sourced. Every flag is a question, not a verdict.
            </p>

            <div className="hr-hero-stats">
              <div className="hr-hero-stat">
                <div className="hr-stat-label">// total flagged</div>
                <div className="hr-stat-value">
                  {data ? formatNum(data.summary?.total_in_list) : '—'}
                </div>
                <div className="hr-stat-meta">
                  out of {data ? formatNum(data.summary?.universe_total) : '—'} Medicare-certified
                </div>
              </div>
              <div className="hr-hero-stat">
                <div className="hr-stat-label">// methodology</div>
                <div className="hr-stat-value mono">v{data?.methodology_version || '—'}</div>
                <div className="hr-stat-meta">
                  <Link to="/methodology" className="hr-stat-link" onClick={handleMethodologyClick}>
                    See methodology →
                  </Link>
                </div>
              </div>
              <div className="hr-hero-stat">
                <div className="hr-stat-label">// last refreshed</div>
                <div className="hr-stat-value mono">
                  {data?.generated_at ? formatDate(data.generated_at) : '—'}
                </div>
                <div className="hr-stat-meta">CMS Hospice Care Compare + public-record sources</div>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="hr-main">
          {/* axis explainer cards */}
          {data && (
            <div className="hr-axes" aria-label="Risk axes">
              {Object.entries(AXIS_COPY).map(([key, info]) => (
                <div className="hr-axis-card" key={key}>
                  <div className="hr-axis-name">// axis · {key.replace('_', ' ')}</div>
                  <div className="hr-axis-title">{info.title}</div>
                  <div className="hr-axis-desc">{info.desc}</div>
                  <div className="hr-axis-count">
                    {(data.summary?.axis_breakdown?.[key] ?? 0).toLocaleString()} hospices in list
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* filter strip */}
          <div className="hr-filterbar">
            <div className="hr-chips" role="tablist">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={activeFilter === f.id}
                  className={`hr-chip${activeFilter === f.id ? ' active' : ''}`}
                  onClick={() => handleChipClick(f.id)}
                >
                  <span>{f.label}</span>
                  <span className="hr-chip-count">{(axisCounts[f.id] ?? 0).toLocaleString()}</span>
                </button>
              ))}
            </div>
            <div className="hr-sort">
              <span className="hr-sort-label">// sort</span>
              <select value={sortBy} onChange={handleSortChange} aria-label="Sort by">
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* defamation disclaimer — visible above list */}
          <div className="hr-disclaimer">
            <strong>Inclusion does not constitute a finding by The Oversight Report</strong> or an allegation of misconduct.
            These are CMS-published outliers that, in the California State Auditor's framework, warrant additional
            scrutiny. Always verify findings through CMS Care Compare, deficiency citations, and direct provider contact.
          </div>

          {/* result meta */}
          {data && (
            <div className="hr-result-meta">
              // showing {visible.length.toLocaleString()} of {data.hospices.length.toLocaleString()} listed hospices
              {activeFilter !== 'all' ? ` · filtered: ${FILTERS.find((f) => f.id === activeFilter)?.label}` : ''}
              {' · sorted by '}{SORTS.find((s) => s.id === sortBy)?.label}
            </div>
          )}

          {/* the list */}
          {!data && !error && (
            <div className="hr-loading">
              <div className="hr-loading-spinner" aria-hidden="true" />
              <div>Loading the watchlist…</div>
            </div>
          )}
          {error && (
            <div className="hr-empty">
              Unable to load the watchlist data. ({error})
            </div>
          )}
          {data && visible.length === 0 && (
            <div className="hr-empty">
              No hospices match this filter. Try the "All flagged" chip.
            </div>
          )}

          {data && visible.length > 0 && (
            <div className="hr-list">
              {visible.map((h, idx) => {
                const rank = idx + 1;
                const rankClass = h.risk_score >= 50 ? 'severe' : h.risk_score >= 30 ? 'medium' : '';
                const barClass = h.risk_score >= 50 ? 'severe' : h.risk_score >= 30 ? 'medium' : '';
                const barWidth = Math.min(100, Math.max(0, h.risk_score));
                // Active pills, ordered by weight descending
                const activeAxes = Object.entries(h.axes || {})
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a);

                return (
                  <article className="hr-row" key={h.ccn}>
                    <div className={`hr-rank ${rankClass}`}>{rank}</div>
                    <div className="hr-id">
                      <h3 className="hr-name">
                        <Link to={`/hospice/${h.ccn}`} onClick={() => handleRowClick(h.ccn)}>
                          {h.name}
                        </Link>
                      </h3>
                      <div className="hr-meta">
                        <span className="hr-loc">
                          {h.city ? `${h.city}, ${h.state}` : h.state}
                        </span>
                        {h.ownership_type && (
                          <>
                            <span className="hr-sep">·</span>
                            <span className="hr-owner">{h.ownership_type}</span>
                          </>
                        )}
                        <span className="hr-sep">·</span>
                        <span className="hr-loc">CCN {h.ccn}</span>
                      </div>
                    </div>
                    <div className="hr-pills">
                      {activeAxes.length === 0 && <span className="hr-pill-empty">No axes triggered</span>}
                      {activeAxes.map(([axis, weight]) => (
                        <span
                          key={axis}
                          className={`hr-pill hr-pill-${pillSeverity(axis, weight)}`}
                          title={AXIS_COPY[axis]?.title || axis}
                        >
                          {pillLabel(axis)}
                        </span>
                      ))}
                    </div>
                    <div className="hr-score">
                      <div className="hr-score-row">
                        <span className="hr-score-num">{h.risk_score.toFixed(1)}</span>
                        <Link
                          to={`/hospice/${h.ccn}`}
                          className="hr-score-cta"
                          onClick={() => handleRowClick(h.ccn)}
                        >
                          INVESTIGATE →
                        </Link>
                      </div>
                      <div className="hr-bar" aria-label={`Risk score ${h.risk_score} of 100`}>
                        <div
                          className={`hr-bar-fill ${barClass}`}
                          style={{ transform: `scaleX(${barWidth / 100})` }}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* methodology callout */}
          <section className="hr-method">
            <div className="hr-method-eyebrow">// methodology</div>
            <h2>How this list was built.</h2>
            <p>
              Every Medicare-certified hospice in CMS's Hospice Care Compare dataset is scored on six axes drawn from
              the <a
                href="https://www.auditor.ca.gov/reports/2024-126/summary.html"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleMethodologyClick}
              >California State Auditor Report 2024-126 (Hospice Licensure)</a>:
              live-discharge / HVLDL, the CMS Hospice Care Index composite, care-mix completeness (zero general-inpatient
              and zero inpatient-hospice care), CAHPS family-experience outliers, public-record items in OIG/DOJ/court/MFCU/news
              feeds, and chain-membership risk. Scores are weighted on a 0–100 scale.
            </p>
            <p>
              The top 200 by composite score are listed here. National benchmarks (10th-percentile cutoffs and
              CAHPS averages) are recomputed on every refresh and shown in the methodology JSON.
            </p>
            <p>
              <Link to="/methodology" onClick={handleMethodologyClick}>Read the full methodology →</Link>
            </p>
          </section>

          {/* footer */}
          <footer className="hr-footer">
            <span className="hr-footer-id">
              © 2026 DataLink Clinical LLC · oversightreports.com · Robert Benard, NP — AGACNP-BC, PMHNP-BC
            </span>
            <span className="hr-footer-id">
              Sources: CMS Hospice Care Compare · OIG LEIE · DOJ · CourtListener · State MFCU · CA State Auditor
            </span>
          </footer>
        </main>
      </div>
    </>
  );
}
