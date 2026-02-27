import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { useFacilityData } from '../hooks/useFacilityData';
import { useSubscription, canAccess } from '../hooks/useSubscription';
import { UpgradePrompt } from '../components/UpgradePrompt';
import ComingSoonPage from '../components/ComingSoonPage';
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

export function ScreeningPage() {
  const COMING_SOON = true;

  const { data, loading, error } = useFacilityData();
  const { tier } = useSubscription();
  const navigate = useNavigate();

  const [selectedState, setSelectedState] = useState('');
  const [sortBy, setSortBy] = useState('risk'); // risk, name, stars, fines, staffing
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterRisk, setFilterRisk] = useState('all'); // all, high, critical
  const [filterOwnership, setFilterOwnership] = useState('all');
  const [filterStaffingGap, setFilterStaffingGap] = useState(false);
  const [filterDanger, setFilterDanger] = useState(false);
  const [filterZeroRN, setFilterZeroRN] = useState(false);

  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const tableRef = useRef(null);

  // Animate on mount
  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, []);

  // Animate when state selected
  useEffect(() => {
    if (selectedState && statsRef.current) {
      gsap.fromTo(
        statsRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
      );
    }
    if (selectedState && tableRef.current) {
      gsap.fromTo(
        tableRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, delay: 0.3, ease: 'power2.out' }
      );
    }
  }, [selectedState]);

  if (COMING_SOON) {
    return (
      <ComingSoonPage
        title="State Screening Reports"
        description="Filter, rank, and export every nursing home in a state by risk score, staffing gaps, penalties, and more. Built for attorneys conducting discovery, journalists investigating patterns, and regulators monitoring compliance."
        tier="professional"
        features={[
          'Every facility in a state ranked by composite risk score',
          'Filter by risk level, ownership type, and staffing gaps',
          'Sort by fines, deficiencies, star ratings, or staffing',
          'Export filtered results as CSV',
          'Identify patterns across ownership portfolios',
        ]}
      />
    );
  }

  if (loading) {
    return (
      <div className="screening-page">
        <div className="screening-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading facility data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="screening-page">
        <div className="screening-error">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const stateData = selectedState ? data.states[selectedState] : null;
  const stateSummary = selectedState ? data.state_summary[selectedState] : null;

  // Get all facilities for selected state
  let facilities = stateData ? [...stateData.facilities] : [];

  // Apply filters
  if (filterRisk === 'high') {
    facilities = facilities.filter(f => (f.composite || 0) >= 40);
  } else if (filterRisk === 'critical') {
    facilities = facilities.filter(f => (f.composite || 0) >= 60);
  }

  if (filterOwnership !== 'all') {
    facilities = facilities.filter(f => f.ownership_type === filterOwnership);
  }

  if (filterStaffingGap) {
    facilities = facilities.filter(f => (f.rn_gap_pct || 0) > 25);
  }

  if (filterDanger) {
    facilities = facilities.filter(f => (f.jeopardy_count || 0) > 0);
  }

  if (filterZeroRN) {
    facilities = facilities.filter(f => (f.zero_rn_pct || 0) > 0);
  }

  // Apply sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'name' ? 'asc' : 'desc');
    }
  };

  facilities.sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'risk':
        aVal = a.composite || 0;
        bVal = b.composite || 0;
        break;
      case 'name':
        aVal = a.name || '';
        bVal = b.name || '';
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'stars':
        aVal = a.stars || 0;
        bVal = b.stars || 0;
        break;
      case 'staffing':
        aVal = a.total_hprd || 0;
        bVal = b.total_hprd || 0;
        break;
      case 'fines':
        aVal = a.total_fines || 0;
        bVal = b.total_fines || 0;
        break;
      case 'city':
        aVal = a.city || '';
        bVal = b.city || '';
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      default:
        return 0;
    }

    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  // Calculate summary stats
  const stats = stateSummary ? {
    totalFacilities: stateSummary.count,
    highRiskCount: facilities.filter(f => (f.composite || 0) >= 60).length,
    highRiskPct: stateSummary.count > 0 ? ((facilities.filter(f => (f.composite || 0) >= 60).length / stateSummary.count) * 100).toFixed(1) : '0',
    dangerCount: facilities.filter(f => (f.jeopardy_count || 0) > 0).length,
    zeroRnCount: facilities.filter(f => (f.zero_rn_pct || 0) > 0).length,
    totalFines: stateSummary.total_fines,
    staffingGapCount: facilities.filter(f => (f.rn_gap_pct || 0) > 25).length
  } : null;

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${Math.round(amount).toLocaleString()}`;
  };

  // Get risk badge class
  const getRiskBadgeClass = (score) => {
    if (score >= 60) return 'risk-critical';
    if (score >= 40) return 'risk-high';
    if (score >= 20) return 'risk-moderate';
    return 'risk-low';
  };

  // Render stars
  const renderStars = (count) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(i < count ? '★' : '☆');
    }
    return stars.join('');
  };

  // Download CSV
  const downloadCSV = () => {
    if (!facilities.length) return;

    const headers = ['Rank', 'Facility', 'CCN', 'City', 'State', 'Owner', 'Risk Score', 'Stars', 'Staffing (min/day)', 'RN Gap %', 'Total Fines', 'Fine Count', 'Jeopardy Count', 'Harm Count', 'Total Deficiencies', 'Ownership Type'];
    const rows = facilities.map((f, i) => [
      i + 1,
      f.name,
      f.ccn,
      f.city,
      f.state,
      f.worst_owner || '',
      f.composite?.toFixed(1) || '0',
      f.stars || 0,
      Math.round((f.total_hprd || 0) * 60),
      f.rn_gap_pct?.toFixed(1) || '0',
      f.total_fines || 0,
      f.fine_count || 0,
      f.jeopardy_count || 0,
      f.harm_count || 0,
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

  // Download PDF
  const downloadPDF = async () => {
    if (!facilities.length) return;

    // Dynamically import jsPDF
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let currentY = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`STATE SCREENING REPORT: ${US_STATES[selectedState]}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // Generated date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated: ${today}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    doc.text('Source: CMS data via The Oversight Report', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', margin, currentY);
    currentY += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`• ${stats.totalFacilities} facilities, ${stats.highRiskCount} high-risk (${stats.highRiskPct}%)`, margin + 3, currentY);
    currentY += 5;
    doc.text(`• ${formatCurrency(stats.totalFines)} total fines | ${stats.dangerCount} serious danger citations`, margin + 3, currentY);
    currentY += 5;
    doc.text(`• ${stats.staffingGapCount} facilities with staffing discrepancies`, margin + 3, currentY);
    currentY += 12;

    // Top 50 table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOP 50 HIGHEST RISK FACILITIES', margin, currentY);
    currentY += 7;

    const top50 = facilities.slice(0, 50);
    const tableData = top50.map((f, i) => [
      i + 1,
      f.name,
      f.city,
      f.worst_owner || '',
      f.composite?.toFixed(1) || '0',
      (f.rn_gap_pct || 0) > 25 ? 'Yes' : '',
      (f.jeopardy_count || 0) > 0 ? 'Yes' : ''
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['Rank', 'Facility', 'City', 'Owner', 'Risk', 'Staffing Gap', 'Danger']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 55 },
        2: { cellWidth: 30 },
        3: { cellWidth: 40 },
        4: { cellWidth: 15 },
        5: { cellWidth: 20 },
        6: { cellWidth: 15 }
      }
    });

    currentY = doc.lastAutoTable.finalY + 12;

    // Methodology
    if (currentY > 240) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('METHODOLOGY', margin, currentY);
    currentY += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const methodText = doc.splitTextToSize(
      'Risk score combines: Staffing (30%), Deficiencies (25%), Penalties (20%), Ownership (15%), Quality (10%)',
      pageWidth - (margin * 2)
    );
    doc.text(methodText, margin, currentY);
    currentY += (methodText.length * 5) + 10;

    // Disclaimer
    if (currentY > 235) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DISCLAIMER', margin, currentY);
    currentY += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const disclaimerText = doc.splitTextToSize(
      'The Oversight Report identifies patterns and discrepancies in publicly available federal data. These indicators do not constitute evidence of wrongdoing. If you have concerns, contact your state survey agency or HHS OIG at tips.hhs.gov.',
      pageWidth - (margin * 2)
    );
    doc.text(disclaimerText, margin, currentY);

    // Save
    const filename = `OversightReport_Screening_${US_STATES[selectedState].replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="screening-page">
      <Helmet>
        <title>State Screening Reports — Nursing Home Safety by State | The Oversight Report</title>
        <meta name="description" content="State-level nursing home screening reports. Identify high-risk facilities by state — designed for AG offices, Medicaid Control Units, and investigative journalists." />
        <link rel="canonical" href="https://oversightreports.com/screening" />
      </Helmet>
      {/* Header */}
      <div className="screening-header" ref={headerRef}>
        <h1>State Screening Report</h1>
        <p className="screening-subtitle">
          Identify high-risk facilities by state — designed for AG offices, Medicaid Control Units, and investigative journalists
        </p>
      </div>

      {/* State Selector */}
      <div className="screening-selector">
        <label htmlFor="state-select" className="screening-label">Select State:</label>
        <select
          id="state-select"
          className="screening-select"
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
        >
          <option value="">Choose a state...</option>
          {Object.entries(US_STATES).map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </div>

      {selectedState && stats && (
        <>
          {/* Summary Stats */}
          <div className="screening-stats" ref={statsRef}>
            <div className="screening-stat-card">
              <div className="screening-stat-value">{stats.totalFacilities}</div>
              <div className="screening-stat-label">Total Facilities</div>
            </div>
            <div className="screening-stat-card">
              <div className="screening-stat-value screening-stat-danger">{stats.highRiskCount}</div>
              <div className="screening-stat-label">High Risk ({stats.highRiskPct}%)</div>
            </div>
            <div className="screening-stat-card">
              <div className="screening-stat-value screening-stat-danger">{stats.dangerCount}</div>
              <div className="screening-stat-label">Serious Danger Citations</div>
            </div>
            <div className="screening-stat-card">
              <div className="screening-stat-value">{stats.zeroRnCount}</div>
              <div className="screening-stat-label">Zero-RN Days</div>
            </div>
            <div className="screening-stat-card">
              <div className="screening-stat-value">{formatCurrency(stats.totalFines)}</div>
              <div className="screening-stat-label">Total Fines</div>
            </div>
            <div className="screening-stat-card">
              <div className="screening-stat-value">{stats.staffingGapCount}</div>
              <div className="screening-stat-label">Staffing Discrepancies</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="screening-filters">
            <div className="screening-filter-group">
              <label>Risk Level:</label>
              <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}>
                <option value="all">All</option>
                <option value="high">High Risk (40+)</option>
                <option value="critical">Critical (60+)</option>
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

            <div className="screening-filter-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={filterStaffingGap}
                  onChange={(e) => setFilterStaffingGap(e.target.checked)}
                />
                <span>Has staffing discrepancy</span>
              </label>
            </div>

            <div className="screening-filter-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={filterDanger}
                  onChange={(e) => setFilterDanger(e.target.checked)}
                />
                <span>Serious danger citations</span>
              </label>
            </div>

            <div className="screening-filter-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={filterZeroRN}
                  onChange={(e) => setFilterZeroRN(e.target.checked)}
                />
                <span>Zero-RN days</span>
              </label>
            </div>
          </div>

          {/* Export Buttons & Result Count */}
          <div className="screening-table-header">
            <div className="screening-result-count">
              Showing {facilities.length} of {stats.totalFacilities} facilities
            </div>
            <div className="screening-export-buttons">
              {canAccess(tier, 'professional') ? (
                <>
                  <button className="btn btn-secondary" onClick={downloadCSV}>
                    Download CSV
                  </button>
                  <button className="btn btn-secondary" onClick={downloadPDF}>
                    Download PDF
                  </button>
                </>
              ) : (
                <UpgradePrompt
                  requiredTier="professional"
                  featureName="Bulk CSV Export"
                />
              )}
            </div>
          </div>

          {/* Results Table */}
          {facilities.length > 0 ? (
            <div className="screening-table-wrapper" ref={tableRef}>
              <table className="screening-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th onClick={() => handleSort('name')} className="sortable">
                      Facility {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('city')} className="sortable">
                      City {sortBy === 'city' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Owner</th>
                    <th onClick={() => handleSort('risk')} className="sortable">
                      Risk Score {sortBy === 'risk' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('stars')} className="sortable">
                      Stars {sortBy === 'stars' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('staffing')} className="sortable">
                      Staffing (min/day) {sortBy === 'staffing' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Discrepancy</th>
                    <th onClick={() => handleSort('fines')} className="sortable">
                      Fines (3yr) {sortBy === 'fines' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Serious Danger</th>
                  </tr>
                </thead>
                <tbody>
                  {facilities.map((facility, index) => (
                    <tr key={facility.ccn}>
                      <td className="screening-rank">{index + 1}</td>
                      <td>
                        <button
                          className="screening-facility-link"
                          onClick={() => navigate(`/facility/${facility.ccn}`)}
                        >
                          {facility.name}
                        </button>
                      </td>
                      <td>{facility.city}</td>
                      <td className="screening-owner">
                        {facility.worst_owner || facility.chain_name || '—'}
                      </td>
                      <td>
                        <span className={`screening-risk-badge ${getRiskBadgeClass(facility.composite || 0)}`}>
                          {(facility.composite || 0).toFixed(1)}
                        </span>
                      </td>
                      <td className="screening-stars">{renderStars(facility.stars || 0)}</td>
                      <td className="screening-staffing mono">
                        {Math.round((facility.total_hprd || 0) * 60)}
                      </td>
                      <td>
                        {(facility.rn_gap_pct || 0) > 25 ? (
                          <span className="screening-flag-yes">Yes</span>
                        ) : (
                          <span className="screening-flag-no">—</span>
                        )}
                      </td>
                      <td className="screening-fines mono">
                        {formatCurrency(facility.total_fines || 0)}
                      </td>
                      <td>
                        {(facility.jeopardy_count || 0) > 0 ? (
                          <span className="screening-flag-danger">{facility.jeopardy_count}</span>
                        ) : (
                          <span className="screening-flag-no">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="screening-empty">
              <p>No facilities match your filters.</p>
            </div>
          )}

          {/* Data Source Footer */}
          <div className="screening-data-source">
            Data: CMS Care Compare, Payroll-Based Journal (PBJ), Health Deficiencies, Penalties, Ownership — via data.cms.gov
          </div>

          {/* Disclaimer */}
          <div className="screening-disclaimer">
            The Oversight Report identifies patterns and discrepancies in publicly available federal data. These indicators do not constitute evidence of wrongdoing. If you have concerns, contact your state survey agency or HHS OIG at tips.hhs.gov.
          </div>
        </>
      )}
    </div>
  );
}
