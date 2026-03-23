import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { useStateData } from '../hooks/useFacilityData';
import { useSubscription, canAccess } from '../hooks/useSubscription';
import { UpgradePrompt } from '../components/UpgradePrompt';
import '../styles/screening.css';

const US_STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
};

const PAGE_SIZE = 25;

export function ScreeningPage() {
  const navigate = useNavigate();
  const { tier } = useSubscription();

  const [selectedState, setSelectedState] = useState('');
  const [sortBy, setSortBy] = useState('risk');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterOwnership, setFilterOwnership] = useState('all');
  const [filterStars, setFilterStars] = useState('all');
  const [filterZeroRN, setFilterZeroRN] = useState(false);
  const [filterJeopardy, setFilterJeopardy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const headerRef = useRef(null);
  const dashboardRef = useRef(null);

  // Only load data for the selected state on demand
  const { stateData, loading, error } = useStateData(selectedState);

  // Entrance animation
  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      );
    }
  }, []);

  // Animate stats + table when state loads
  useEffect(() => {
    if (stateData && dashboardRef.current) {
      gsap.fromTo(
        dashboardRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      );
    }
  }, [stateData]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedState, searchQuery, filterRisk, filterOwnership, filterStars, filterZeroRN, filterJeopardy, sortBy, sortOrder]);

  const allFacilities = stateData?.facilities || [];

  // Compute summary stats from facility data
  const stats = useMemo(() => {
    if (!allFacilities.length) return null;
    const count = allFacilities.length;
    const highRisk = allFacilities.filter(f => (f.composite || 0) >= 60);
    const zeroRN = allFacilities.filter(f => (f.zero_rn_pct || 0) > 0);
    const jeopardy = allFacilities.filter(f => (f.jeopardy_count || 0) > 0);
    const staffingGap = allFacilities.filter(f => (f.rn_gap_pct || 0) > 25);
    const avgStars = (allFacilities.reduce((s, f) => s + (f.stars || 0), 0) / count).toFixed(1);
    const avgHprd = (allFacilities.reduce((s, f) => s + (f.total_hprd || 0), 0) / count).toFixed(1);
    const totalFines = allFacilities.reduce((s, f) => s + (f.total_fines || 0), 0);
    return {
      count,
      highRiskCount: highRisk.length,
      highRiskPct: ((highRisk.length / count) * 100).toFixed(1),
      zeroRNCount: zeroRN.length,
      jeopardyCount: jeopardy.length,
      staffingGapCount: staffingGap.length,
      avgStars,
      avgHprd,
      totalFines,
    };
  }, [allFacilities]);

  // Unique ownership types for filter
  const ownershipTypes = useMemo(() => {
    const types = new Set(allFacilities.map(f => f.ownership_type).filter(Boolean));
    // Group into simple buckets
    return ['For profit', 'Non profit', 'Government'];
  }, [allFacilities]);

  // Apply filters + search + sort
  const filteredFacilities = useMemo(() => {
    let list = [...allFacilities];

    // Search by name or city
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(f =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.city || '').toLowerCase().includes(q)
      );
    }

    // Risk filter
    if (filterRisk === 'high') {
      list = list.filter(f => (f.composite || 0) >= 40);
    } else if (filterRisk === 'critical') {
      list = list.filter(f => (f.composite || 0) >= 60);
    }

    // Ownership filter
    if (filterOwnership !== 'all') {
      list = list.filter(f => (f.ownership_type || '').includes(filterOwnership));
    }

    // Star filter
    if (filterStars !== 'all') {
      const minStars = parseInt(filterStars);
      list = list.filter(f => (f.stars || 0) <= minStars);
    }

    // Zero-RN filter
    if (filterZeroRN) {
      list = list.filter(f => (f.zero_rn_pct || 0) > 0);
    }

    // Jeopardy filter
    if (filterJeopardy) {
      list = list.filter(f => (f.jeopardy_count || 0) > 0);
    }

    // Sort
    list.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'risk':
          aVal = a.composite || 0; bVal = b.composite || 0; break;
        case 'name':
          return sortOrder === 'asc'
            ? (a.name || '').localeCompare(b.name || '')
            : (b.name || '').localeCompare(a.name || '');
        case 'city':
          return sortOrder === 'asc'
            ? (a.city || '').localeCompare(b.city || '')
            : (b.city || '').localeCompare(a.city || '');
        case 'stars':
          aVal = a.stars || 0; bVal = b.stars || 0; break;
        case 'staffing':
          aVal = a.total_hprd || 0; bVal = b.total_hprd || 0; break;
        case 'deficiencies':
          aVal = a.total_deficiencies || 0; bVal = b.total_deficiencies || 0; break;
        case 'fines':
          aVal = a.total_fines || 0; bVal = b.total_fines || 0; break;
        default:
          return 0;
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return list;
  }, [allFacilities, searchQuery, filterRisk, filterOwnership, filterStars, filterZeroRN, filterJeopardy, sortBy, sortOrder]);

  const visibleFacilities = filteredFacilities.slice(0, visibleCount);
  const hasMore = visibleCount < filteredFacilities.length;

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'name' || column === 'city' ? 'asc' : 'desc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return ' ⇅';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const getRiskBadgeClass = (score) => {
    if (score >= 60) return 'risk-critical';
    if (score >= 40) return 'risk-high';
    if (score >= 20) return 'risk-moderate';
    return 'risk-low';
  };

  const getRiskLabel = (score) => {
    if (score >= 60) return 'Critical';
    if (score >= 40) return 'High';
    if (score >= 20) return 'Moderate';
    return 'Low';
  };

  const renderStars = (count) => {
    const filled = Math.round(count || 0);
    return (
      <span className="screening-star-display">
        {[1,2,3,4,5].map(i => (
          <span key={i} className={i <= filled ? 'star-filled' : 'star-empty'}>★</span>
        ))}
      </span>
    );
  };

  const downloadCSV = () => {
    if (!filteredFacilities.length) return;
    const headers = ['Rank','Facility','CCN','City','State','Owner','Risk Score','Stars','Total HPRD','RN Gap %','Total Fines','Jeopardy Count','Total Deficiencies','Ownership Type'];
    const rows = filteredFacilities.map((f, i) => [
      i + 1, f.name, f.ccn, f.city, f.state,
      f.worst_owner || '',
      (f.composite || 0).toFixed(1), f.stars || 0,
      (f.total_hprd || 0).toFixed(1),
      (f.rn_gap_pct || 0).toFixed(1),
      f.total_fines || 0,
      f.jeopardy_count || 0,
      f.total_deficiencies || 0,
      f.ownership_type || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OversightReport_Screening_${US_STATES[selectedState]}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    if (!filteredFacilities.length) return;
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text(`STATE SCREENING REPORT: ${US_STATES[selectedState]}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated: ${today}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text('Source: CMS data via The Oversight Report', pageWidth / 2, y, { align: 'center' });
    y += 15;

    if (stats) {
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('SUMMARY', margin, y); y += 7;
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.text(`• ${stats.count} facilities | ${stats.highRiskCount} critical risk (${stats.highRiskPct}%)`, margin + 3, y); y += 5;
      doc.text(`• Avg star rating: ${stats.avgStars} | Avg staffing HPRD: ${stats.avgHprd}`, margin + 3, y); y += 5;
      doc.text(`• ${formatCurrency(stats.totalFines)} total fines | ${stats.jeopardyCount} serious harm citations`, margin + 3, y); y += 12;
    }

    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('TOP 50 HIGHEST RISK FACILITIES', margin, y); y += 7;

    const top50 = filteredFacilities.slice(0, 50);
    doc.autoTable({
      startY: y,
      head: [['Rank','Facility','City','Owner','Risk','Stars','Staffing Gap','Serious Harm']],
      body: top50.map((f, i) => [
        i + 1, f.name, f.city, f.worst_owner || '',
        (f.composite || 0).toFixed(1), f.stars || 0,
        (f.rn_gap_pct || 0) > 25 ? 'Yes' : '', (f.jeopardy_count || 0) > 0 ? 'Yes' : ''
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 12;
    if (y > 240) { doc.addPage(); y = margin; }

    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    const disclaimer = doc.splitTextToSize('The Oversight Report identifies patterns in publicly available federal data. These indicators do not constitute evidence of wrongdoing.', pageWidth - margin * 2);
    doc.text(disclaimer, margin, y);

    doc.save(`OversightReport_Screening_${US_STATES[selectedState].replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const hasActiveFilters = filterRisk !== 'all' || filterOwnership !== 'all' || filterStars !== 'all' || filterZeroRN || filterJeopardy || searchQuery.trim();

  return (
    <div className="screening-page">
      <Helmet>
        <title>State Screening Reports — Nursing Home Safety by State | The Oversight Report</title>
        <meta name="description" content="State-level nursing home screening reports. Identify high-risk facilities by state — designed for AG offices, Medicaid Control Units, and investigative journalists." />
        <link rel="canonical" href="https://www.oversightreports.com/screening" />
      </Helmet>

      {/* Header */}
      <div className="screening-header" ref={headerRef}>
        <div className="screening-header__tag">Professional Tool</div>
        <h1>State Screening Report</h1>
        <p className="screening-subtitle">
          Rank, filter, and export every nursing home in a state by risk score, staffing,
          penalties, and deficiencies — built for investigators, attorneys, and regulators.
        </p>
      </div>

      {/* State Selector — prominent, centered */}
      <div className="screening-state-selector">
        <div className="screening-state-selector__inner">
          <label htmlFor="state-select" className="screening-state-selector__label">
            Select a state to begin
          </label>
          <select
            id="state-select"
            className="screening-select"
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSearchQuery('');
              setFilterRisk('all');
              setFilterOwnership('all');
              setFilterStars('all');
              setFilterZeroRN(false);
              setFilterJeopardy(false);
            }}
          >
            <option value="">Choose a state...</option>
            {Object.entries(US_STATES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Intro content — shown before a state is selected */}
      {!selectedState && (
        <div className="screening-intro">
          <div className="screening-intro-stats">
            <div className="screening-intro-stat">
              <div className="screening-intro-stat-value">50</div>
              <div className="screening-intro-stat-label">States covered</div>
            </div>
            <div className="screening-intro-stat">
              <div className="screening-intro-stat-value">14,713</div>
              <div className="screening-intro-stat-label">Medicare-certified facilities</div>
            </div>
            <div className="screening-intro-stat">
              <div className="screening-intro-stat-value">CMS</div>
              <div className="screening-intro-stat-label">Federal data source</div>
            </div>
          </div>

          <div className="screening-intro-features">
            <div className="screening-intro-feature">
              <div className="screening-intro-feature-icon">⚠</div>
              <div>
                <strong>Risk Score</strong>
                <p>Composite score based on staffing, deficiencies, penalties, and zero-RN days</p>
              </div>
            </div>
            <div className="screening-intro-feature">
              <div className="screening-intro-feature-icon">⇅</div>
              <div>
                <strong>Sort &amp; Filter</strong>
                <p>Filter by risk level, ownership type, star rating, or specific red flags</p>
              </div>
            </div>
            <div className="screening-intro-feature">
              <div className="screening-intro-feature-icon">↓</div>
              <div>
                <strong>Export</strong>
                <p>Download the full state report as CSV or PDF for documentation</p>
              </div>
            </div>
          </div>

          <p className="screening-intro-note">
            Select a state above to load facilities ranked by risk score. Built for investigators,
            attorneys, discharge planners, and regulators.
          </p>
        </div>
      )}

      {/* Loading */}
      {selectedState && loading && (
        <div className="screening-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading {US_STATES[selectedState]} facilities...</div>
        </div>
      )}

      {/* Error */}
      {selectedState && error && (
        <div className="screening-error">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
        </div>
      )}

      {/* Dashboard — shown when data is ready */}
      {selectedState && stateData && stats && (
        <div ref={dashboardRef}>

          {/* Summary Stats Cards */}
          <div className="screening-stats">
            <div className="screening-stat-card screening-stat-card--primary">
              <div className="screening-stat-value">{stats.count.toLocaleString()}</div>
              <div className="screening-stat-label">Total Facilities</div>
            </div>
            <div className="screening-stat-card">
              <div className="screening-stat-value screening-stat-danger">{stats.highRiskCount}</div>
              <div className="screening-stat-label">Critical Risk ({stats.highRiskPct}%)</div>
              <div className="screening-stat-sub">Score ≥ 60</div>
            </div>
            <div className="screening-stat-card">
              <div className="screening-stat-value">{stats.avgStars}</div>
              <div className="screening-stat-label">Avg Star Rating</div>
              <div className="screening-stat-sub">State average</div>
            </div>
            <div className="screening-stat-card">
              <div className="screening-stat-value">{stats.avgHprd}</div>
              <div className="screening-stat-label">Avg Staffing HPRD</div>
              <div className="screening-stat-sub">Hours per resident day</div>
            </div>
            <div className="screening-stat-card">
              <div className="screening-stat-value">{stats.zeroRNCount}</div>
              <div className="screening-stat-label">Zero-RN Day Facilities</div>
              <div className="screening-stat-sub">Days without an RN</div>
            </div>
            <div className="screening-stat-card">
              <div className="screening-stat-value">{formatCurrency(stats.totalFines)}</div>
              <div className="screening-stat-label">Total Fines (3yr)</div>
            </div>
          </div>

          {/* Search + Filter Bar */}
          <div className="screening-search-filter">
            <div className="screening-search-wrap">
              <input
                type="text"
                className="screening-search-input"
                placeholder="Search by facility name or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search facilities"
              />
              {searchQuery && (
                <button className="screening-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">×</button>
              )}
            </div>

            <div className="screening-filter-row">
              <div className="screening-filter-group">
                <label>Risk:</label>
                <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}>
                  <option value="all">All</option>
                  <option value="high">High Risk (40+)</option>
                  <option value="critical">Critical (60+)</option>
                </select>
              </div>

              <div className="screening-filter-group">
                <label>Stars:</label>
                <select value={filterStars} onChange={(e) => setFilterStars(e.target.value)}>
                  <option value="all">All</option>
                  <option value="1">1 star only</option>
                  <option value="2">≤ 2 stars</option>
                  <option value="3">≤ 3 stars</option>
                </select>
              </div>

              <div className="screening-filter-group">
                <label>Ownership:</label>
                <select value={filterOwnership} onChange={(e) => setFilterOwnership(e.target.value)}>
                  <option value="all">All</option>
                  <option value="For profit">For-profit</option>
                  <option value="Non profit">Nonprofit</option>
                  <option value="Government">Government</option>
                </select>
              </div>

              <div className="screening-filter-chips">
                <button
                  className={`screening-chip ${filterJeopardy ? 'screening-chip--active' : ''}`}
                  onClick={() => setFilterJeopardy(v => !v)}
                >
                  Serious Harm Citations
                </button>
                <button
                  className={`screening-chip ${filterZeroRN ? 'screening-chip--active' : ''}`}
                  onClick={() => setFilterZeroRN(v => !v)}
                >
                  Zero-RN Days
                </button>
              </div>

              {hasActiveFilters && (
                <button
                  className="screening-clear-all"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterRisk('all');
                    setFilterOwnership('all');
                    setFilterStars('all');
                    setFilterZeroRN(false);
                    setFilterJeopardy(false);
                  }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>

          {/* Result count + export */}
          <div className="screening-table-header">
            <div className="screening-result-count">
              Showing <strong>{visibleFacilities.length}</strong> of <strong>{filteredFacilities.length}</strong> facilities
              {filteredFacilities.length !== stats.count && ` (${stats.count} total in ${US_STATES[selectedState]})`}
            </div>
            <div className="screening-export-buttons">
              {canAccess(tier, 'professional') ? (
                <>
                  <button className="btn btn-secondary" onClick={downloadCSV}>Download CSV</button>
                  <button className="btn btn-secondary" onClick={downloadPDF}>Download PDF</button>
                </>
              ) : (
                <UpgradePrompt requiredTier="professional" featureName="Bulk CSV Export" />
              )}
            </div>
          </div>

          {/* Results Table */}
          {filteredFacilities.length > 0 ? (
            <>
              <div className="screening-table-wrapper">
                <table className="screening-table">
                  <thead>
                    <tr>
                      <th className="col-rank">#</th>
                      <th className="sortable" onClick={() => handleSort('name')}>
                        Facility{getSortIcon('name')}
                      </th>
                      <th className="sortable" onClick={() => handleSort('city')}>
                        City{getSortIcon('city')}
                      </th>
                      <th className="sortable" onClick={() => handleSort('stars')}>
                        Stars{getSortIcon('stars')}
                      </th>
                      <th className="sortable" onClick={() => handleSort('staffing')}>
                        HPRD{getSortIcon('staffing')}
                      </th>
                      <th className="sortable" onClick={() => handleSort('deficiencies')}>
                        Deficiencies{getSortIcon('deficiencies')}
                      </th>
                      <th className="sortable" onClick={() => handleSort('risk')}>
                        Risk Score{getSortIcon('risk')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleFacilities.map((facility, index) => {
                      const score = facility.composite || 0;
                      const isZeroRN = (facility.zero_rn_pct || 0) > 0;
                      const hasJeopardy = (facility.jeopardy_count || 0) > 0;
                      return (
                        <tr
                          key={facility.ccn}
                          className={isZeroRN ? 'screening-row--zero-rn' : ''}
                        >
                          <td className="screening-rank col-rank">{index + 1}</td>
                          <td className="col-facility">
                            <button
                              className="screening-facility-link"
                              onClick={() => navigate(`/facility/${facility.ccn}`)}
                            >
                              {facility.name}
                            </button>
                            <div className="screening-facility-meta">
                              {facility.ownership_type && (
                                <span className="screening-ownership-tag">
                                  {facility.ownership_type.startsWith('For') ? 'For-profit' :
                                   facility.ownership_type.startsWith('Non') ? 'Nonprofit' :
                                   facility.ownership_type.startsWith('Gov') ? 'Government' :
                                   facility.ownership_type.split(' - ')[0]}
                                </span>
                              )}
                              {isZeroRN && <span className="screening-flag-tag screening-flag-tag--zero-rn">Zero-RN Days</span>}
                              {hasJeopardy && (
                                <span className="screening-flag-tag screening-flag-tag--jeopardy">
                                  {facility.jeopardy_count} Serious Harm
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="col-city">{facility.city}</td>
                          <td className="col-stars">{renderStars(facility.stars || 0)}</td>
                          <td className={`col-hprd mono ${(facility.total_hprd || 0) < 3.5 ? 'text-warning' : ''}`}>
                            {(facility.total_hprd || 0).toFixed(1)}
                          </td>
                          <td className={`col-def mono ${(facility.total_deficiencies || 0) > 20 ? 'text-danger' : ''}`}>
                            {facility.total_deficiencies || 0}
                          </td>
                          <td className="col-risk">
                            <span className={`screening-risk-badge ${getRiskBadgeClass(score)}`}>
                              <span className="risk-score">{score.toFixed(1)}</span>
                              <span className="risk-label">{getRiskLabel(score)}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Show More */}
              {hasMore && (
                <div className="screening-show-more">
                  <button
                    className="screening-show-more__btn"
                    onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  >
                    Show {Math.min(PAGE_SIZE, filteredFacilities.length - visibleCount)} More Facilities
                    <span className="screening-show-more__count">
                      {filteredFacilities.length - visibleCount} remaining
                    </span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="screening-empty">
              <p>No facilities match your filters.</p>
              {hasActiveFilters && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterRisk('all');
                    setFilterOwnership('all');
                    setFilterStars('all');
                    setFilterZeroRN(false);
                    setFilterJeopardy(false);
                  }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="screening-data-source">
            Data: CMS Care Compare, Payroll-Based Journal (PBJ), Health Deficiencies, Penalties, Ownership — via data.cms.gov
          </div>
          <div className="screening-disclaimer">
            The Oversight Report identifies patterns and discrepancies in publicly available federal data.
            These indicators do not constitute evidence of wrongdoing. If you have concerns, contact your
            state survey agency or HHS OIG at tips.hhs.gov.
          </div>
        </div>
      )}
    </div>
  );
}
