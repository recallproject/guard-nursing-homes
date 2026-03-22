import { useState, useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import '../styles/antipsychotic-trends.css';

const OIG_REPORT_URL = 'https://oig.hhs.gov/reports-and-publications/workplan/summary/wp-summary-0000708.asp';
const NATIONAL_AVG_RATE = 9.3;

function getRiskBadgeClass(level) {
  if (!level) return 'ap-risk-badge--moderate';
  const l = level.toLowerCase();
  if (l === 'critical') return 'ap-risk-badge--critical';
  if (l === 'high') return 'ap-risk-badge--high';
  if (l === 'elevated') return 'ap-risk-badge--elevated';
  if (l === 'moderate') return 'ap-risk-badge--moderate';
  return 'ap-risk-badge--low';
}

function getRateColorClass(rate) {
  if (rate >= 25) return 'ap-rate-critical';
  if (rate >= 18) return 'ap-rate-high';
  if (rate >= 12) return 'ap-rate-elevated';
  return 'ap-rate-moderate';
}

export function AntipsychoticTrendsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortColumn, setSortColumn] = useState('risk_score');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageRef = useRef(null);

  const ROWS_PER_PAGE = 25;

  // Fetch data
  useEffect(() => {
    fetch('/data/antipsychotic_alerts.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Entrance animation
  useEffect(() => {
    if (pageRef.current && !loading) {
      gsap.fromTo(
        pageRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, [loading]);

  // Plausible tracking
  useEffect(() => {
    window.plausible && window.plausible('Antipsychotic-Trends-View');
  }, []);

  // Extract facilities array — handle various data shapes
  const facilities = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.facilities && Array.isArray(data.facilities)) return data.facilities;
    if (data.alerts && Array.isArray(data.alerts)) return data.alerts;
    if (data.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [data]);

  // Metadata from data file, with fallbacks
  const metadata = useMemo(() => {
    if (!data || Array.isArray(data)) return {};
    return data.metadata || data.meta || {};
  }, [data]);

  // National stats
  const nationalStats = useMemo(() => {
    if (facilities.length === 0) return null;

    const riskCounts = { critical: 0, high: 0, elevated: 0, moderate: 0, low: 0 };
    facilities.forEach(f => {
      const level = (f.risk_level || f.riskLevel || '').toLowerCase();
      if (riskCounts[level] !== undefined) {
        riskCounts[level]++;
      }
    });

    const avgRate = metadata.national_average_rate
      || metadata.nationalAverageRate
      || NATIONAL_AVG_RATE;

    return {
      totalFlagged: facilities.length,
      riskCounts,
      nationalAvgRate: avgRate,
    };
  }, [facilities, metadata]);

  // Top 50 by risk score, with sorting
  const top50 = useMemo(() => {
    const sorted = [...facilities].sort((a, b) => {
      const scoreA = a.risk_score ?? a.riskScore ?? 0;
      const scoreB = b.risk_score ?? b.riskScore ?? 0;
      return scoreB - scoreA;
    });
    return sorted.slice(0, 50);
  }, [facilities]);

  // Sorted table data
  const sortedTop50 = useMemo(() => {
    const list = [...top50];
    list.sort((a, b) => {
      let aVal, bVal;
      switch (sortColumn) {
        case 'name':
          aVal = (a.facility_name || a.name || '').toLowerCase();
          bVal = (b.facility_name || b.name || '').toLowerCase();
          return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case 'state':
          aVal = a.state || '';
          bVal = b.state || '';
          return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case 'antipsychotic_rate':
          aVal = a.antipsychotic_rate ?? a.antipsychoticRate ?? a.ap_rate ?? 0;
          bVal = b.antipsychotic_rate ?? b.antipsychoticRate ?? b.ap_rate ?? 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        case 'risk_score':
          aVal = a.risk_score ?? a.riskScore ?? 0;
          bVal = b.risk_score ?? b.riskScore ?? 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        case 'risk_level':
          const order = { critical: 5, high: 4, elevated: 3, moderate: 2, low: 1 };
          aVal = order[(a.risk_level || a.riskLevel || '').toLowerCase()] || 0;
          bVal = order[(b.risk_level || b.riskLevel || '').toLowerCase()] || 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        default:
          return 0;
      }
    });
    return list;
  }, [top50, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedTop50.length / ROWS_PER_PAGE);
  const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
  const paginatedFacilities = sortedTop50.slice(startIdx, startIdx + ROWS_PER_PAGE);

  // State breakdown
  const stateBreakdown = useMemo(() => {
    const counts = {};
    facilities.forEach(f => {
      const st = f.state;
      if (st) counts[st] = (counts[st] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);
  }, [facilities]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) return '\u21C5';
    return sortDirection === 'asc' ? '\u2191' : '\u2193';
  };

  const getFacilityName = (f) => f.facility_name || f.name || 'Unknown';
  const getRate = (f) => f.antipsychotic_rate ?? f.antipsychoticRate ?? f.ap_rate ?? null;
  const getScore = (f) => f.risk_score ?? f.riskScore ?? null;
  const getLevel = (f) => f.risk_level || f.riskLevel || '';

  // Loading state
  if (loading) {
    return (
      <div className="ap-trends-page">
        <div className="ap-trends-loading">
          <div className="loading-spinner"></div>
          <p>Loading antipsychotic data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="ap-trends-page">
        <div className="ap-trends-error">
          <p>Unable to load data: {error}</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            The antipsychotic alerts data file may still be generating. Check back shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ap-trends-page" ref={pageRef}>
      <Helmet>
        <title>Antipsychotic Use in Nursing Homes — National Trends | The Oversight Report</title>
        <meta
          name="description"
          content="National data on antipsychotic medication use in nursing homes. Facility-level rates, risk scores, and state-by-state breakdowns based on CMS data and OIG findings."
        />
        <link rel="canonical" href="https://www.oversightreports.com/antipsychotic-trends" />
        <meta property="og:title" content="Antipsychotic Use in Nursing Homes — National Trends" />
        <meta property="og:description" content="Facility-level antipsychotic rates, risk scores, and state breakdowns. Based on CMS data and March 2026 OIG report findings." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.oversightreports.com/antipsychotic-trends" />
      </Helmet>

      <div className="container-wide">
        {/* Hero */}
        <div className="ap-trends-hero">
          <div className="ap-trends-hero__tag">OIG Report Analysis</div>
          <h1 className="ap-trends-hero__title">Antipsychotic Use in Nursing Homes</h1>
          <p className="ap-trends-hero__subtitle">
            On March 19, 2026, the HHS Office of Inspector General released findings on
            antipsychotic medication use in nursing homes, highlighting facilities with rates
            far above the national average of {nationalStats?.nationalAvgRate || NATIONAL_AVG_RATE}%.
            This page surfaces the facility-level data behind those findings.
          </p>
          <p className="ap-trends-hero__source">
            Source: CMS Nursing Home Compare &amp; HHS OIG —{' '}
            <a href={OIG_REPORT_URL} target="_blank" rel="noopener noreferrer">
              View OIG Report
            </a>
          </p>
        </div>

        {/* National Statistics */}
        {nationalStats && (
          <div className="ap-trends-stats-grid">
            <div className="ap-trends-stat-card ap-trends-stat-card--highlight">
              <div className="ap-trends-stat__value">
                {nationalStats.nationalAvgRate}%
              </div>
              <div className="ap-trends-stat__label">National Average Rate</div>
              <div className="ap-trends-stat__subtext">Antipsychotic use without dementia diagnosis</div>
            </div>
            <div className="ap-trends-stat-card">
              <div className="ap-trends-stat__value">
                {nationalStats.totalFlagged.toLocaleString()}
              </div>
              <div className="ap-trends-stat__label">Facilities Flagged</div>
              <div className="ap-trends-stat__subtext">Above threshold for review</div>
            </div>
            <div className="ap-trends-stat-card">
              <div className="ap-trends-stat__value" style={{ color: 'var(--accent-red)' }}>
                {nationalStats.riskCounts.critical}
              </div>
              <div className="ap-trends-stat__label">Critical Risk</div>
              <div className="ap-trends-stat__subtext">Highest concern facilities</div>
            </div>
            <div className="ap-trends-stat-card">
              <div className="ap-trends-stat__value" style={{ color: 'var(--risk-high)' }}>
                {nationalStats.riskCounts.high}
              </div>
              <div className="ap-trends-stat__label">High Risk</div>
              <div className="ap-trends-stat__subtext">Significantly above average</div>
            </div>
            <div className="ap-trends-stat-card">
              <div className="ap-trends-stat__value" style={{ color: 'var(--accent-orange)' }}>
                {nationalStats.riskCounts.elevated}
              </div>
              <div className="ap-trends-stat__label">Elevated Risk</div>
              <div className="ap-trends-stat__subtext">Above national average</div>
            </div>
          </div>
        )}

        {/* Top 50 Facilities Table */}
        <div className="ap-trends-section">
          <h2 className="ap-trends-section__title">Top 50 Facilities by Risk Score</h2>
          <p className="ap-trends-section__desc">
            Facilities ranked by composite risk score, incorporating antipsychotic prescribing rate,
            deviation from national average, and related quality indicators.
          </p>

          {sortedTop50.length > 0 ? (
            <>
              <div className="ap-trends-result-count">
                Showing {startIdx + 1}–{Math.min(startIdx + ROWS_PER_PAGE, sortedTop50.length)} of {sortedTop50.length} facilities
              </div>

              <div className="ap-trends-table-container">
                <table className="ap-trends-table">
                  <thead>
                    <tr>
                      <th className="ap-col-rank">#</th>
                      <th className="sortable" onClick={() => handleSort('name')}>
                        Facility {getSortIcon('name')}
                      </th>
                      <th className="sortable" onClick={() => handleSort('state')}>
                        State {getSortIcon('state')}
                      </th>
                      <th className="sortable" onClick={() => handleSort('antipsychotic_rate')}>
                        AP Rate {getSortIcon('antipsychotic_rate')}
                      </th>
                      <th className="sortable" onClick={() => handleSort('risk_score')}>
                        Risk Score {getSortIcon('risk_score')}
                      </th>
                      <th className="sortable" onClick={() => handleSort('risk_level')}>
                        Risk Level {getSortIcon('risk_level')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFacilities.map((f, idx) => {
                      const rate = getRate(f);
                      const score = getScore(f);
                      const level = getLevel(f);
                      const globalRank = startIdx + idx + 1;

                      return (
                        <tr key={f.ccn || f.provider_id || idx}>
                          <td className="ap-col-rank">{globalRank}</td>
                          <td className="ap-col-name">{getFacilityName(f)}</td>
                          <td className="ap-col-state">{f.state || '—'}</td>
                          <td className={`ap-col-rate ${rate !== null ? getRateColorClass(rate) : ''}`}>
                            {rate !== null ? `${rate.toFixed(1)}%` : '—'}
                          </td>
                          <td className="ap-col-score">
                            {score !== null ? score.toFixed(1) : '—'}
                          </td>
                          <td className="ap-col-risk">
                            {level ? (
                              <span className={`ap-risk-badge ${getRiskBadgeClass(level)}`}>
                                {level}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="ap-trends-pagination">
                  <button
                    className="ap-trends-pagination__btn"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    &larr; Previous
                  </button>
                  <span className="ap-trends-pagination__info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="ap-trends-pagination__btn"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="ap-about-section">
              <p>No facility-level data available yet. The data file may still be generating.</p>
            </div>
          )}
        </div>

        {/* State-by-State Breakdown */}
        {stateBreakdown.length > 0 && (
          <div className="ap-trends-section">
            <h2 className="ap-trends-section__title">Flagged Facilities by State</h2>
            <p className="ap-trends-section__desc">
              Number of facilities flagged for elevated antipsychotic prescribing in each state.
            </p>
            <div className="ap-state-breakdown">
              <div className="ap-state-grid">
                {stateBreakdown.map(({ state, count }) => (
                  <div key={state} className="ap-state-card">
                    <span className="ap-state-card__name">{state}</span>
                    <span className="ap-state-card__count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* About This Data */}
        <div className="ap-trends-section">
          <h2 className="ap-trends-section__title">About This Data</h2>
          <div className="ap-about-section">
            <h3>Background</h3>
            <p>
              The HHS Office of Inspector General (OIG) has identified antipsychotic medication use
              in nursing homes as a persistent patient safety concern. The March 19, 2026 OIG report
              found that a significant number of nursing home residents are prescribed antipsychotic
              medications without an appropriate diagnosis of schizophrenia, Huntington's disease,
              or Tourette syndrome — the only FDA-approved indications for these drugs in this population.
            </p>

            <h3>Methodology</h3>
            <p>
              Facility-level antipsychotic prescribing rates are derived from CMS Nursing Home Compare
              quality measures. The national average rate ({nationalStats?.nationalAvgRate || NATIONAL_AVG_RATE}%)
              represents the percentage of long-stay residents receiving antipsychotic medications
              without one of the three qualifying diagnoses.
            </p>
            <ul>
              <li>
                <strong>Risk scores</strong> are calculated based on deviation from the national average,
                absolute prescribing rate, and related quality indicators.
              </li>
              <li>
                <strong>Risk levels</strong> (Critical, High, Elevated, Moderate, Low) reflect
                composite assessment of prescribing patterns relative to peer facilities.
              </li>
              <li>
                Facilities with rates significantly above the national average may warrant
                further review by regulators, families, and advocacy organizations.
              </li>
            </ul>

            <h3>OIG Report</h3>
            <p>
              The full OIG report and work plan are available at{' '}
              <a href={OIG_REPORT_URL} target="_blank" rel="noopener noreferrer">
                oig.hhs.gov
              </a>. The OIG has recommended increased oversight and enforcement to reduce
              inappropriate antipsychotic use in nursing facilities.
            </p>

            <h3>Limitations</h3>
            <ul>
              <li>
                Prescribing rates reflect self-reported data submitted by facilities to CMS.
              </li>
              <li>
                Some facilities may have clinically appropriate reasons for higher rates
                (e.g., specialized dementia units with off-label use under physician oversight).
              </li>
              <li>
                This analysis does not account for all potential confounding factors.
                A high rate alone does not prove inappropriate prescribing.
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="ap-trends-disclaimer">
          <p>
            <strong>The Oversight Report surfaces patterns in publicly available federal data.</strong> Elevated
            antipsychotic prescribing rates do not by themselves constitute evidence of wrongdoing. Clinical
            decisions involve individual patient factors that aggregate data cannot capture. If you have
            concerns about a resident's medications, contact the facility's attending physician, your
            state's Long-Term Care Ombudsman, or the HHS OIG hotline at 1-800-HHS-TIPS.
          </p>
        </div>

        {/* Footer */}
        <div className="ap-trends-footer">
          <p>
            Data: CMS Nursing Home Compare Quality Measures, HHS Office of Inspector General — via data.cms.gov and oig.hhs.gov
          </p>
        </div>
      </div>
    </div>
  );
}

export default AntipsychoticTrendsPage;
