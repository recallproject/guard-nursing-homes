import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { useFacilityData } from '../hooks/useFacilityData';
import CollapsibleSection from '../components/CollapsibleSection';
import '../styles/high-risk.css';

export default function HighRiskPage() {
  const { getAllFacilities, loading, error } = useFacilityData();
  const navigate = useNavigate();

  const [sortColumn, setSortColumn] = useState('total_fines');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const pageRef = useRef(null);
  const ROWS_PER_PAGE = 50;

  // Entrance animation
  useEffect(() => {
    if (pageRef.current) {
      gsap.fromTo(
        pageRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, []);

  // Filter high-risk facilities
  const highRiskFacilities = useMemo(() => {
    if (loading || !getAllFacilities) return [];

    return getAllFacilities.filter(f => {
      // All criteria must be met
      const is1Star = f.stars === 1;
      const highFines = (f.total_fines || 0) > 100000;
      const lowStaffing = (f.total_hprd || 0) < 3.5;
      const hasZeroRN = (f.zero_rn_pct || 0) > 0;
      const highDeficiencies = (f.total_deficiencies || 0) >= 15;

      return is1Star && highFines && lowStaffing && hasZeroRN && highDeficiencies;
    });
  }, [getAllFacilities, loading]);

  // Apply sorting
  const sortedFacilities = useMemo(() => {
    const sorted = [...highRiskFacilities];

    sorted.sort((a, b) => {
      let aVal, bVal;

      switch (sortColumn) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);

        case 'state':
          aVal = a.state || '';
          bVal = b.state || '';
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);

        case 'total_hprd':
          aVal = a.total_hprd || 0;
          bVal = b.total_hprd || 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

        case 'zero_rn_pct':
          aVal = a.zero_rn_pct || 0;
          bVal = b.zero_rn_pct || 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

        case 'total_deficiencies':
          aVal = a.total_deficiencies || 0;
          bVal = b.total_deficiencies || 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

        case 'total_fines':
          aVal = a.total_fines || 0;
          bVal = b.total_fines || 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

        default:
          return 0;
      }
    });

    return sorted;
  }, [highRiskFacilities, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedFacilities.length / ROWS_PER_PAGE);
  const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
  const endIdx = startIdx + ROWS_PER_PAGE;
  const paginatedFacilities = sortedFacilities.slice(startIdx, endIdx);

  // Summary stats
  const summaryStats = useMemo(() => {
    const total = highRiskFacilities.length;
    const totalFines = highRiskFacilities.reduce((sum, f) => sum + (f.total_fines || 0), 0);
    const avgStaffing = total > 0
      ? highRiskFacilities.reduce((sum, f) => sum + (f.total_hprd || 0), 0) / total
      : 0;

    // Count unique states
    const stateSet = new Set(highRiskFacilities.map(f => f.state));
    const statesRepresented = stateSet.size;

    return {
      total,
      totalFines,
      avgStaffing,
      statesRepresented
    };
  }, [highRiskFacilities]);

  // State breakdown
  const stateBreakdown = useMemo(() => {
    const stateCounts = {};
    highRiskFacilities.forEach(f => {
      if (f.state) {
        stateCounts[f.state] = (stateCounts[f.state] || 0) + 1;
      }
    });

    return Object.entries(stateCounts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);
  }, [highRiskFacilities]);

  // Format helpers
  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    if (amount >= 1000000) {
      return '$' + (amount / 1000000).toFixed(1) + 'M';
    }
    if (amount >= 1000) {
      return '$' + (amount / 1000).toFixed(0) + 'K';
    }
    return '$' + amount.toLocaleString();
  };

  const formatCurrencyFull = (amount) => {
    if (!amount) return '$0';
    return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatPercent = (val) => {
    if (val === null || val === undefined) return 'N/A';
    return val.toFixed(1) + '%';
  };

  const getStaffingColor = (hprd) => {
    if (hprd < 2.5) return 'critical';
    if (hprd < 3.5) return 'elevated';
    return 'moderate';
  };

  const getZeroRNColor = (pct) => {
    if (pct > 50) return 'critical';
    if (pct > 20) return 'elevated';
    return 'moderate';
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleFacilityClick = (ccn) => {
    navigate(`/facility/${ccn}`);
  };

  if (loading) {
    return (
      <div className="high-risk-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading facility data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="high-risk-page">
        <div className="error-container">
          <p>Error loading data: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="high-risk-page" ref={pageRef}>
      <Helmet>
        <title>High Risk Nursing Homes — National Watch List | The Oversight Report</title>
        <meta name="description" content="Nursing homes that meet multiple high-risk criteria: jeopardy citations, understaffing, high fines, and low ratings." />
        <link rel="canonical" href="https://oversightreports.com/high-risk" />
      </Helmet>
      <div className="container-wide">
        {/* Header */}
        <div className="high-risk-header">
          <h1 className="high-risk-title">High-Risk Facilities</h1>
          <p className="high-risk-subtitle">
            Nursing homes that simultaneously fail on quality, staffing, safety, and accountability
          </p>
          <div className="high-risk-count-badge">
            {summaryStats.total} facilities identified
          </div>
        </div>

        {/* Summary Stats */}
        <div className="high-risk-stats-grid">
          <div className="stat-card">
            <div className="stat-value">{summaryStats.total}</div>
            <div className="stat-label">High-Risk Facilities</div>
            <div className="stat-subtext">Meet all 5 criteria</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatCurrencyFull(summaryStats.totalFines)}</div>
            <div className="stat-label">Total Fines</div>
            <div className="stat-subtext">Across all high-risk facilities</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summaryStats.avgStaffing.toFixed(2)}</div>
            <div className="stat-label">Average Total HPRD</div>
            <div className="stat-subtext">Critically understaffed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summaryStats.statesRepresented}</div>
            <div className="stat-label">States Represented</div>
            <div className="stat-subtext">Nationwide issue</div>
          </div>
        </div>

        {/* State Breakdown */}
        <div className="high-risk-section">
          <h2 className="section-title">States with Most High-Risk Facilities</h2>
          <div className="state-breakdown">
            {stateBreakdown.slice(0, 10).map(({ state, count }) => {
              const maxCount = stateBreakdown[0]?.count || 1;
              const widthPercent = (count / maxCount) * 100;

              return (
                <div key={state} className="state-breakdown-row">
                  <div className="state-breakdown-label">
                    <span className="state-name">{state}</span>
                    <span className="state-count">{count}</span>
                  </div>
                  <div className="state-breakdown-bar-wrapper">
                    <div
                      className="state-breakdown-bar"
                      style={{ width: `${widthPercent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Facilities Table */}
        <div className="high-risk-section">
          <h2 className="section-title">All High-Risk Facilities</h2>
          <div className="high-risk-result-count">
            Showing {startIdx + 1}-{Math.min(endIdx, sortedFacilities.length)} of {sortedFacilities.length} facilities
          </div>

          <div className="high-risk-table-container">
            <table className="high-risk-table">
              <thead>
                <tr>
                  <th className="rank-col">Rank</th>
                  <th onClick={() => handleSort('name')} className="sortable">
                    Facility {getSortIcon('name')}
                  </th>
                  <th>City</th>
                  <th onClick={() => handleSort('state')} className="sortable">
                    State {getSortIcon('state')}
                  </th>
                  <th className="center-col">Stars</th>
                  <th onClick={() => handleSort('total_hprd')} className="sortable">
                    Total HPRD {getSortIcon('total_hprd')}
                  </th>
                  <th onClick={() => handleSort('zero_rn_pct')} className="sortable">
                    Zero-RN % {getSortIcon('zero_rn_pct')}
                  </th>
                  <th onClick={() => handleSort('total_deficiencies')} className="sortable">
                    Deficiencies {getSortIcon('total_deficiencies')}
                  </th>
                  <th onClick={() => handleSort('total_fines')} className="sortable">
                    Total Fines {getSortIcon('total_fines')}
                  </th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFacilities.map((facility, idx) => {
                  const globalRank = startIdx + idx + 1;
                  const staffingColorClass = getStaffingColor(facility.total_hprd || 0);
                  const zeroRNColorClass = getZeroRNColor(facility.zero_rn_pct || 0);

                  return (
                    <tr key={facility.ccn} className="high-risk-row">
                      <td className="rank-col">{globalRank}</td>
                      <td>
                        <button
                          className="facility-link"
                          onClick={() => handleFacilityClick(facility.ccn)}
                        >
                          {facility.name}
                        </button>
                      </td>
                      <td>{facility.city}</td>
                      <td>{facility.state}</td>
                      <td className="center-col stars-col">
                        <span className="stars-badge stars-1">
                          {facility.stars} ★
                        </span>
                      </td>
                      <td className={`metric-col metric-${staffingColorClass}`}>
                        {(facility.total_hprd || 0).toFixed(2)}
                      </td>
                      <td className={`metric-col metric-${zeroRNColorClass}`}>
                        {formatPercent(facility.zero_rn_pct || 0)}
                      </td>
                      <td className="metric-col">
                        {facility.total_deficiencies || 0}
                      </td>
                      <td className="fines-col">
                        {formatCurrency(facility.total_fines || 0)}
                      </td>
                      <td className="owner-col">
                        {facility.worst_owner || facility.chain_name || 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Explainer */}
        <CollapsibleSection title="What makes a facility 'high risk'?" defaultOpen={false}>
          <div className="explainer-content">
            <p>
              A facility is classified as <strong>high-risk</strong> when it meets <strong>all five</strong> of the following criteria:
            </p>
            <ul>
              <li><strong>1-star overall quality rating</strong> — The lowest rating CMS assigns</li>
              <li><strong>Total fines exceeding $100,000</strong> — Indicates serious violations with financial penalties</li>
              <li><strong>Total staffing below 3.5 hours per resident per day (HPRD)</strong> — Critically understaffed</li>
              <li><strong>Days with zero registered nurses on site</strong> — Federal law requires an RN 8 hours daily, 7 days a week</li>
              <li><strong>15 or more total deficiencies</strong> — A pattern of regulatory violations</li>
            </ul>
            <p>
              These facilities represent a convergence of quality failures, safety violations, staffing shortages, and
              accountability issues. They are not necessarily the worst facilities in isolation — but they fail across
              multiple dimensions simultaneously.
            </p>
            <h3>Data Sources</h3>
            <ul>
              <li><strong>Quality Ratings:</strong> CMS Five-Star Quality Rating System (updated monthly)</li>
              <li><strong>Staffing Data:</strong> CMS Payroll-Based Journal (PBJ), Q3 2025</li>
              <li><strong>Deficiencies:</strong> CMS Health Deficiencies, 2017-2025</li>
              <li><strong>Penalties:</strong> CMS Penalties, January 2023-December 2025</li>
            </ul>
            <h3>Important Notes</h3>
            <p>
              This analysis is based on federal data and does not constitute a recommendation to avoid or select any specific
              facility. Families should conduct their own research, visit facilities in person, and consult with healthcare
              professionals when making placement decisions.
            </p>
          </div>
        </CollapsibleSection>

        {/* Disclaimer */}
        <div className="high-risk-disclaimer">
          <p>
            <strong>The Oversight Report identifies patterns in publicly available federal data.</strong> These
            indicators do not constitute evidence of wrongdoing or a recommendation against any specific facility.
            If you have concerns, contact your state survey agency or HHS OIG at tips.hhs.gov.
          </p>
        </div>

        {/* Data Source Footer */}
        <div className="high-risk-footer">
          <p>
            Data: CMS Five-Star Ratings, CMS Payroll-Based Journal (PBJ), CMS Health Deficiencies, CMS Penalties — via data.cms.gov
          </p>
        </div>
      </div>
    </div>
  );
}
