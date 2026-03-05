import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { useFacilityData } from '../hooks/useFacilityData';
import CollapsibleSection from '../components/CollapsibleSection';
import '../styles/discrepancies.css';

export default function DiscrepanciesPage() {
  const { getAllFacilities, loading, error } = useFacilityData();
  const navigate = useNavigate();

  // Search + UI state
  const [facilitySearch, setFacilitySearch] = useState('');
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [showFullTable, setShowFullTable] = useState(false);

  // Filter state (for full table)
  const [selectedState, setSelectedState] = useState('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState('ALL');
  const [minGap, setMinGap] = useState(25);
  const [hasSeriousHarm, setHasSeriousHarm] = useState(false);
  const [hasZeroRN, setHasZeroRN] = useState(false);
  const [sortColumn, setSortColumn] = useState('rn_gap_pct');
  const [sortDirection, setSortDirection] = useState('desc');

  const pageRef = useRef(null);
  const searchRef = useRef(null);

  // Plausible
  useEffect(() => {
    window.plausible && window.plausible('Discrepancies-Page-View');
  }, []);

  // Entrance animation
  useEffect(() => {
    if (pageRef.current) {
      gsap.fromTo(pageRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
    }
  }, []);

  // All facilities with discrepancies
  const discrepancyFacilities = useMemo(() => {
    if (loading || !getAllFacilities) return [];
    return getAllFacilities.filter(f => {
      const hasRNGap = (f.rn_gap_pct || 0) > 25;
      const hasZeroRNIssue = (f.zero_rn_pct || 0) > 20 && (f.total_hprd || 0) >= 3.0;
      const hasModerateGapWithJeopardy = (f.rn_gap_pct || 0) > 15 && (f.jeopardy_count || 0) > 0;
      return hasRNGap || hasZeroRNIssue || hasModerateGapWithJeopardy;
    });
  }, [getAllFacilities, loading]);

  // Facility search results
  const searchResults = useMemo(() => {
    if (!facilitySearch.trim() || facilitySearch.length < 2) return [];
    const q = facilitySearch.toLowerCase();
    return getAllFacilities
      .filter(f => f.name?.toLowerCase().includes(q) || f.city?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [facilitySearch, getAllFacilities]);

  // Apply filters for full table
  const filteredFacilities = useMemo(() => {
    let filtered = [...discrepancyFacilities];
    if (selectedState !== 'ALL') filtered = filtered.filter(f => f.state === selectedState);
    if (ownershipFilter !== 'ALL') {
      if (ownershipFilter === 'FOR_PROFIT') filtered = filtered.filter(f => f.ownership_type?.toLowerCase().includes('profit'));
      else if (ownershipFilter === 'NONPROFIT') filtered = filtered.filter(f => f.ownership_type?.toLowerCase().includes('non') || f.ownership_type?.toLowerCase().includes('church'));
      else if (ownershipFilter === 'GOVERNMENT') filtered = filtered.filter(f => f.ownership_type?.toLowerCase().includes('government'));
    }
    filtered = filtered.filter(f => (f.rn_gap_pct || 0) >= minGap);
    if (hasSeriousHarm) filtered = filtered.filter(f => (f.jeopardy_count || 0) > 0);
    if (hasZeroRN) filtered = filtered.filter(f => (f.zero_rn_pct || 0) > 0);
    return filtered;
  }, [discrepancyFacilities, selectedState, ownershipFilter, minGap, hasSeriousHarm, hasZeroRN]);

  // Sort
  const sortedFacilities = useMemo(() => {
    const sorted = [...filteredFacilities];
    sorted.sort((a, b) => {
      let aVal, bVal;
      switch (sortColumn) {
        case 'name': return sortDirection === 'asc' ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '');
        case 'state': return sortDirection === 'asc' ? (a.state || '').localeCompare(b.state || '') : (b.state || '').localeCompare(a.state || '');
        case 'rn_gap_pct': aVal = a.rn_gap_pct || 0; bVal = b.rn_gap_pct || 0; break;
        case 'zero_rn_pct': aVal = a.zero_rn_pct || 0; bVal = b.zero_rn_pct || 0; break;
        case 'jeopardy_count': aVal = a.jeopardy_count || 0; bVal = b.jeopardy_count || 0; break;
        case 'total_fines': aVal = a.total_fines || 0; bVal = b.total_fines || 0; break;
        default: return 0;
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [filteredFacilities, sortColumn, sortDirection]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const total = filteredFacilities.length;
    const avgGap = total > 0 ? filteredFacilities.reduce((sum, f) => sum + (f.rn_gap_pct || 0), 0) / total : 0;
    const withJeopardy = filteredFacilities.filter(f => (f.jeopardy_count || 0) > 0).length;
    const totalFines = filteredFacilities.reduce((sum, f) => sum + (f.total_fines || 0), 0);
    return { total, avgGap, withJeopardy, totalFines, percentOfAll: getAllFacilities.length > 0 ? (total / getAllFacilities.length * 100) : 0 };
  }, [filteredFacilities, getAllFacilities]);

  const states = useMemo(() => {
    const stateSet = new Set(discrepancyFacilities.map(f => f.state));
    return Array.from(stateSet).sort();
  }, [discrepancyFacilities]);

  // Helpers
  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
    return '$' + Math.round(amount).toLocaleString();
  };
  const formatPercent = (val) => val == null ? 'N/A' : val.toFixed(0) + '%';
  const getGapSeverity = (gap) => {
    if (gap >= 75) return { label: 'Critical', class: 'severity-critical', desc: 'Payroll records show almost none of the RN staffing this facility claims to CMS.' };
    if (gap >= 50) return { label: 'Severe', class: 'severity-severe', desc: 'Payroll records show less than half the RN staffing this facility reports.' };
    if (gap >= 25) return { label: 'Significant', class: 'severity-significant', desc: 'A meaningful gap between what the facility claims and what payroll records show.' };
    return { label: 'Moderate', class: 'severity-moderate', desc: 'Some difference between reported and verified staffing levels.' };
  };

  const handleSort = (column) => {
    if (sortColumn === column) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(column); setSortDirection('desc'); }
  };
  const getSortIcon = (column) => sortColumn !== column ? '⇅' : sortDirection === 'asc' ? '↑' : '↓';

  const handleDownloadCSV = () => {
    const headers = ['Rank','Facility','CCN','State','City','Owner','Reported RN (min/day)','Verified RN (min/day)','Gap %','Zero-RN Days %','Jeopardy Count','Total Fines','Stars','Risk Score'];
    const rows = sortedFacilities.map((f, idx) => [
      idx + 1, f.name || '', f.ccn || '', f.state || '', f.city || '', f.worst_owner || f.chain_name || 'N/A',
      f.self_report_rn ? (f.self_report_rn * 60).toFixed(0) : '0', f.rn_hprd ? (f.rn_hprd * 60).toFixed(0) : '0',
      f.rn_gap_pct ? f.rn_gap_pct.toFixed(1) : '0', f.zero_rn_pct ? f.zero_rn_pct.toFixed(1) : '0',
      f.jeopardy_count || 0, f.total_fines || 0, f.stars || 0, f.composite || 0
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OversightReport_Discrepancies_${selectedState !== 'ALL' ? selectedState : 'National'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Facility lookup result
  const handleSelectFacility = (facility) => {
    setSelectedFacility(facility);
    setFacilitySearch('');
    window.plausible && window.plausible('Discrepancy-Lookup', { props: { facility: facility.name, gap: facility.rn_gap_pct } });
  };

  if (loading) {
    return (<div className="discrepancies-page"><div className="loading-container"><div className="loading-spinner"></div><p className="loading-text">Loading facility data...</p></div></div>);
  }
  if (error) {
    return (<div className="discrepancies-page"><div className="error-container"><p>Error loading data: {error}</p></div></div>);
  }

  return (
    <div className="discrepancies-page" ref={pageRef}>
      <Helmet>
        <title>Staffing Discrepancy Index — Self-Reported vs. Reality | The Oversight Report</title>
        <meta name="description" content="Check if a nursing home's reported staffing matches payroll records. Compare claimed vs. actual nurse staffing for 14,713 facilities." />
        <link rel="canonical" href="https://oversightreports.com/discrepancies" />
      </Helmet>
      <div className="container-wide">

        {/* ====== SECTION 1: EXPLAINER + SEARCH (Family-First) ====== */}
        <div className="disc-hero">
          <h1 className="disc-hero-title">Is Your Nursing Home Honest About Its Staffing?</h1>
          <p className="disc-hero-subtitle">
            Nursing homes self-report their staffing numbers to the government. We compare those
            claims against actual payroll records. When the numbers don't match, families should know.
          </p>
        </div>

        {/* Facility Search */}
        <div className="disc-search-section" ref={searchRef}>
          <h2 className="disc-search-heading">Check a Facility</h2>
          <div className="disc-search-box">
            <input
              type="text"
              className="disc-search-input"
              placeholder="Type a facility name or city..."
              value={facilitySearch}
              onChange={(e) => { setFacilitySearch(e.target.value); setSelectedFacility(null); }}
              autoComplete="off"
            />
            {searchResults.length > 0 && (
              <div className="disc-search-dropdown">
                {searchResults.map(f => (
                  <button
                    key={f.ccn}
                    className="disc-search-result"
                    onClick={() => handleSelectFacility(f)}
                  >
                    <span className="disc-result-name">{f.name}</span>
                    <span className="disc-result-location">{f.city}, {f.state}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Facility Result Card */}
        {selectedFacility && (() => {
          const f = selectedFacility;
          const gap = f.rn_gap_pct || 0;
          const severity = getGapSeverity(gap);
          const reportedMin = f.self_report_rn ? (f.self_report_rn * 60).toFixed(0) : '0';
          const actualMin = f.rn_hprd ? (f.rn_hprd * 60).toFixed(0) : '0';
          const hasDiscrepancy = gap > 15;
          const zeroRn = f.zero_rn_pct || 0;
          const jeopardy = f.jeopardy_count || 0;

          return (
            <div className={`disc-result-card ${hasDiscrepancy ? 'has-discrepancy' : 'no-discrepancy'}`}>
              <div className="disc-result-header">
                <h3 className="disc-result-facility-name">{f.name}</h3>
                <span className="disc-result-location-tag">{f.city}, {f.state}</span>
              </div>

              {hasDiscrepancy ? (
                <>
                  <div className={`disc-severity-badge ${severity.class}`}>
                    {severity.label} Discrepancy — {formatPercent(gap)} Gap
                  </div>
                  <p className="disc-result-explanation">{severity.desc}</p>

                  <div className="disc-comparison">
                    <div className="disc-comparison-item">
                      <div className="disc-comparison-label">What they report to CMS</div>
                      <div className="disc-comparison-value">{reportedMin} min/day</div>
                      <div className="disc-comparison-sublabel">RN hours (self-reported)</div>
                    </div>
                    <div className="disc-comparison-arrow">→</div>
                    <div className="disc-comparison-item disc-comparison-actual">
                      <div className="disc-comparison-label">What payroll records show</div>
                      <div className="disc-comparison-value">{actualMin} min/day</div>
                      <div className="disc-comparison-sublabel">RN hours (payroll-verified)</div>
                    </div>
                  </div>

                  {(zeroRn > 10 || jeopardy > 0) && (
                    <div className="disc-result-flags">
                      {zeroRn > 10 && (
                        <div className="disc-flag disc-flag-warning">
                          <strong>{zeroRn.toFixed(0)}% of days</strong> had zero registered nurses on site
                        </div>
                      )}
                      {jeopardy > 0 && (
                        <div className="disc-flag disc-flag-danger">
                          <strong>{jeopardy} serious harm citation{jeopardy > 1 ? 's' : ''}</strong> — conditions posing immediate risk to residents
                        </div>
                      )}
                    </div>
                  )}

                  <div className="disc-result-actions">
                    <button className="btn btn-primary" onClick={() => navigate(`/facility/${f.ccn}`)}>
                      View Full Safety Report
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="disc-severity-badge severity-ok">
                    No Significant Discrepancy Detected
                  </div>
                  <p className="disc-result-explanation">
                    This facility's reported staffing is reasonably consistent with payroll records.
                    This doesn't guarantee quality care — check the full report for inspection results, complaints, and penalties.
                  </p>
                  <div className="disc-result-actions">
                    <button className="btn btn-primary" onClick={() => navigate(`/facility/${f.ccn}`)}>
                      View Full Safety Report
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* ====== SECTION 2: WHAT THIS MEANS ====== */}
        <div className="disc-explainer">
          <h2>What is a staffing discrepancy?</h2>
          <div className="disc-explainer-content">
            <p>
              Every nursing home reports its staffing levels to the federal government through
              a system called the <strong>Payroll-Based Journal (PBJ)</strong>. This is supposed to
              reflect actual hours worked by nurses and aides.
            </p>
            <p>
              But there's a problem: some facilities report significantly more nurse staffing
              than their own payroll records support. When a facility claims to have RN
              coverage but payroll shows little or none, that gap can mean residents aren't
              getting the care they're told about.
            </p>
            <p>
              A discrepancy doesn't automatically mean fraud — it can result from reporting
              timing, contractor staffing, or data entry issues. But large, persistent gaps
              are a red flag that regulators, families, and attorneys should investigate further.
            </p>
          </div>
        </div>

        {/* ====== SECTION 3: NATIONAL CONTEXT ====== */}
        <div className="disc-national">
          <h2>The National Picture</h2>
          <p className="disc-national-lead">
            <strong>{discrepancyFacilities.length.toLocaleString()} facilities</strong> — {(discrepancyFacilities.length / getAllFacilities.length * 100).toFixed(0)}% of all nursing homes — show staffing discrepancies.
          </p>
          <div className="disc-stats-grid">
            <div className="disc-stat-card">
              <div className="disc-stat-value">{summaryStats.total.toLocaleString()}</div>
              <div className="disc-stat-label">Facilities Flagged</div>
            </div>
            <div className="disc-stat-card">
              <div className="disc-stat-value">{summaryStats.avgGap.toFixed(0)}%</div>
              <div className="disc-stat-label">Average RN Gap</div>
            </div>
            <div className="disc-stat-card">
              <div className="disc-stat-value">{summaryStats.withJeopardy.toLocaleString()}</div>
              <div className="disc-stat-label">With Serious Harm</div>
            </div>
            <div className="disc-stat-card">
              <div className="disc-stat-value">{formatCurrency(summaryStats.totalFines)}</div>
              <div className="disc-stat-label">Total Fines</div>
            </div>
          </div>
        </div>

        {/* ====== SECTION 4: FULL DATA TABLE (Progressive Disclosure) ====== */}
        <div className="disc-table-section">
          <div className="disc-table-toggle">
            <button
              className={`disc-table-toggle-btn ${showFullTable ? 'active' : ''}`}
              onClick={() => setShowFullTable(!showFullTable)}
            >
              {showFullTable ? 'Hide Full Data Table' : `Browse All ${discrepancyFacilities.length.toLocaleString()} Facilities`}
              <span className="disc-toggle-icon">{showFullTable ? '−' : '+'}</span>
            </button>
            <p className="disc-table-toggle-sub">
              For researchers, journalists, and attorneys investigating staffing patterns
            </p>
          </div>

          {showFullTable && (
            <div className="disc-table-content">
              {/* Filters */}
              <div className="disc-filters">
                <div className="disc-filter-group">
                  <label>State:</label>
                  <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
                    <option value="ALL">All States</option>
                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="disc-filter-group">
                  <label>Ownership:</label>
                  <select value={ownershipFilter} onChange={(e) => setOwnershipFilter(e.target.value)}>
                    <option value="ALL">All</option>
                    <option value="FOR_PROFIT">For-profit</option>
                    <option value="NONPROFIT">Nonprofit</option>
                    <option value="GOVERNMENT">Government</option>
                  </select>
                </div>
                <div className="disc-filter-group">
                  <label>Min Gap %:</label>
                  <input type="number" min="0" max="100" value={minGap} onChange={(e) => setMinGap(Number(e.target.value))} />
                </div>
                <div className="disc-filter-group disc-checkbox">
                  <label><input type="checkbox" checked={hasSeriousHarm} onChange={(e) => setHasSeriousHarm(e.target.checked)} /> Serious Harm</label>
                </div>
                <div className="disc-filter-group disc-checkbox">
                  <label><input type="checkbox" checked={hasZeroRN} onChange={(e) => setHasZeroRN(e.target.checked)} /> Zero-RN Days</label>
                </div>
              </div>

              <div className="disc-table-meta">
                <span>Showing {sortedFacilities.length.toLocaleString()} facilities</span>
                <button className="disc-csv-btn" onClick={handleDownloadCSV}>Download CSV</button>
              </div>

              {/* Table */}
              <div className="disc-table-wrapper">
                <table className="disc-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th onClick={() => handleSort('name')} className="sortable">Facility {getSortIcon('name')}</th>
                      <th onClick={() => handleSort('state')} className="sortable">State {getSortIcon('state')}</th>
                      <th>City</th>
                      <th>Owner</th>
                      <th>Reported</th>
                      <th>Actual</th>
                      <th onClick={() => handleSort('rn_gap_pct')} className="sortable">Gap {getSortIcon('rn_gap_pct')}</th>
                      <th onClick={() => handleSort('zero_rn_pct')} className="sortable">Zero-RN {getSortIcon('zero_rn_pct')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFacilities.map((f, idx) => {
                      const gap = f.rn_gap_pct || 0;
                      const sev = getGapSeverity(gap);
                      return (
                        <tr key={f.ccn} className="disc-table-row" onClick={() => navigate(`/facility/${f.ccn}`)}>
                          <td className="mono">{idx + 1}</td>
                          <td className="disc-table-name">{f.name}</td>
                          <td>{f.state}</td>
                          <td>{f.city}</td>
                          <td className="disc-table-owner">{f.worst_owner || f.chain_name || '—'}</td>
                          <td className="mono">{f.self_report_rn ? (f.self_report_rn * 60).toFixed(0) : '0'} min</td>
                          <td className="mono">{f.rn_hprd ? (f.rn_hprd * 60).toFixed(0) : '0'} min</td>
                          <td><span className={`disc-gap-badge ${sev.class}`}>{formatPercent(gap)}</span></td>
                          <td className="mono">{formatPercent(f.zero_rn_pct || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {sortedFacilities.length === 0 && (
                <div className="disc-empty">No facilities match your current filters.</div>
              )}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="disc-disclaimer">
          <strong>The Oversight Report identifies patterns and discrepancies in publicly available federal data.</strong> These
          indicators do not constitute evidence of wrongdoing. If you have concerns, contact your state survey
          agency or HHS OIG at <a href="https://tips.hhs.gov" target="_blank" rel="noopener noreferrer">tips.hhs.gov</a>.
        </div>

        <div className="disc-footer">
          Data: CMS Payroll-Based Journal (PBJ), CMS Health Deficiencies, Provider Information — via data.cms.gov
        </div>
      </div>
    </div>
  );
}
