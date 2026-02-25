import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { useFacilityData } from '../hooks/useFacilityData';
import { useSubscription, canAccess } from '../hooks/useSubscription';
import { UpgradePrompt } from '../components/UpgradePrompt';
import CollapsibleSection from '../components/CollapsibleSection';
import ComingSoonPage from '../components/ComingSoonPage';
import '../styles/discrepancies.css';

export default function DiscrepanciesPage() {
  const COMING_SOON = true;
  const { getAllFacilities, loading, error } = useFacilityData();
  const { tier } = useSubscription();
  const navigate = useNavigate();

  const [selectedState, setSelectedState] = useState('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState('ALL');
  const [minGap, setMinGap] = useState(25);
  const [hasSeriousDanger, setHasSeriousDanger] = useState(false);
  const [hasZeroRN, setHasZeroRN] = useState(false);
  const [sortColumn, setSortColumn] = useState('rn_gap_pct');
  const [sortDirection, setSortDirection] = useState('desc');

  const pageRef = useRef(null);
  const tableRef = useRef(null);

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

  // Get facilities with discrepancies
  const discrepancyFacilities = useMemo(() => {
    if (loading || !getAllFacilities) return [];

    const facilities = getAllFacilities;

    return facilities.filter(f => {
      // Define discrepancy criteria
      const hasRNGap = (f.rn_gap_pct || 0) > 25;
      const hasZeroRNIssue = (f.zero_rn_pct || 0) > 20 && (f.total_hprd || 0) >= 3.0;
      const hasModerateGapWithJeopardy = (f.rn_gap_pct || 0) > 15 && (f.jeopardy_count || 0) > 0;

      return hasRNGap || hasZeroRNIssue || hasModerateGapWithJeopardy;
    });
  }, [getAllFacilities, loading]);

  // Apply filters
  const filteredFacilities = useMemo(() => {
    let filtered = [...discrepancyFacilities];

    // State filter
    if (selectedState !== 'ALL') {
      filtered = filtered.filter(f => f.state === selectedState);
    }

    // Ownership filter
    if (ownershipFilter !== 'ALL') {
      if (ownershipFilter === 'FOR_PROFIT') {
        filtered = filtered.filter(f => f.ownership_type?.toLowerCase().includes('profit'));
      } else if (ownershipFilter === 'NONPROFIT') {
        filtered = filtered.filter(f => f.ownership_type?.toLowerCase().includes('non') || f.ownership_type?.toLowerCase().includes('church'));
      } else if (ownershipFilter === 'GOVERNMENT') {
        filtered = filtered.filter(f => f.ownership_type?.toLowerCase().includes('government'));
      }
    }

    // Minimum gap filter
    filtered = filtered.filter(f => (f.rn_gap_pct || 0) >= minGap);

    // Serious danger filter
    if (hasSeriousDanger) {
      filtered = filtered.filter(f => (f.jeopardy_count || 0) > 0);
    }

    // Zero RN filter
    if (hasZeroRN) {
      filtered = filtered.filter(f => (f.zero_rn_pct || 0) > 0);
    }

    return filtered;
  }, [discrepancyFacilities, selectedState, ownershipFilter, minGap, hasSeriousDanger, hasZeroRN]);

  // Apply sorting
  const sortedFacilities = useMemo(() => {
    const sorted = [...filteredFacilities];

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

        case 'rn_gap_pct':
          aVal = a.rn_gap_pct || 0;
          bVal = b.rn_gap_pct || 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

        case 'zero_rn_pct':
          aVal = a.zero_rn_pct || 0;
          bVal = b.zero_rn_pct || 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

        case 'jeopardy_count':
          aVal = a.jeopardy_count || 0;
          bVal = b.jeopardy_count || 0;
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
  }, [filteredFacilities, sortColumn, sortDirection]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const total = filteredFacilities.length;
    const avgGap = total > 0
      ? filteredFacilities.reduce((sum, f) => sum + (f.rn_gap_pct || 0), 0) / total
      : 0;
    const withJeopardy = filteredFacilities.filter(f => (f.jeopardy_count || 0) > 0).length;
    const totalFines = filteredFacilities.reduce((sum, f) => sum + (f.total_fines || 0), 0);

    return {
      total,
      avgGap,
      withJeopardy,
      totalFines,
      percentOfAll: getAllFacilities.length > 0
        ? (total / getAllFacilities.length * 100)
        : 0
    };
  }, [filteredFacilities, getAllFacilities]);

  // Get unique states
  const states = useMemo(() => {
    const stateSet = new Set(discrepancyFacilities.map(f => f.state));
    return Array.from(stateSet).sort();
  }, [discrepancyFacilities]);

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

  const formatPercent = (val) => {
    if (val === null || val === undefined) return 'N/A';
    return val.toFixed(0) + '%';
  };

  const getGapColor = (gap) => {
    if (gap > 50) return 'gap-critical';
    if (gap > 25) return 'gap-high';
    return 'gap-moderate';
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

  const handleDownloadCSV = () => {
    const headers = [
      'Rank',
      'Facility',
      'CCN',
      'State',
      'City',
      'Owner',
      'Reported RN (min/day)',
      'Verified RN (min/day)',
      'Gap %',
      'Zero-RN Days %',
      'Total Staffing (min/day)',
      'Jeopardy Count',
      'Harm Count',
      'Total Fines',
      'Stars',
      'Risk Score',
      'Ownership Type'
    ];

    const rows = sortedFacilities.map((f, idx) => [
      idx + 1,
      f.name || '',
      f.ccn || '',
      f.state || '',
      f.city || '',
      f.worst_owner || f.chain_name || 'N/A',
      f.self_report_rn ? (f.self_report_rn * 60).toFixed(0) : '0',
      f.rn_hprd ? (f.rn_hprd * 60).toFixed(0) : '0',
      f.rn_gap_pct ? f.rn_gap_pct.toFixed(1) : '0',
      f.zero_rn_pct ? f.zero_rn_pct.toFixed(1) : '0',
      f.total_hprd ? (f.total_hprd * 60).toFixed(0) : '0',
      f.jeopardy_count || 0,
      f.harm_count || 0,
      f.total_fines || 0,
      f.stars || 0,
      f.composite || 0,
      f.ownership_type || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell =>
        typeof cell === 'string' && cell.includes(',')
          ? `"${cell}"`
          : cell
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedState !== 'ALL'
      ? `OversightReport_Discrepancies_${selectedState}_${new Date().toISOString().split('T')[0]}.csv`
      : `OversightReport_Discrepancies_National_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    // Import jsPDF dynamically
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(() => {
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'letter'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let currentY = margin;

        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        const title = selectedState !== 'ALL'
          ? `THE OVERSIGHT REPORT - STAFFING DISCREPANCY REPORT: ${selectedState}`
          : 'THE OVERSIGHT REPORT - STAFFING DISCREPANCY REPORT';
        doc.text(title, pageWidth / 2, currentY, { align: 'center' });
        currentY += 10;

        // Summary stats
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Facilities with Discrepancies: ${summaryStats.total}`, margin, currentY);
        currentY += 5;
        doc.text(`Average RN Gap: ${summaryStats.avgGap.toFixed(1)}%`, margin, currentY);
        currentY += 5;
        doc.text(`Facilities with Serious Danger: ${summaryStats.withJeopardy}`, margin, currentY);
        currentY += 5;
        doc.text(`Total Fines: ${formatCurrency(summaryStats.totalFines)}`, margin, currentY);
        currentY += 10;

        // Table (top 50)
        const tableData = sortedFacilities.slice(0, 50).map((f, idx) => [
          idx + 1,
          f.name || '',
          f.state || '',
          f.city || '',
          f.worst_owner || f.chain_name || 'N/A',
          f.self_report_rn ? (f.self_report_rn * 60).toFixed(0) : '0',
          f.rn_hprd ? (f.rn_hprd * 60).toFixed(0) : '0',
          f.rn_gap_pct ? f.rn_gap_pct.toFixed(0) + '%' : '0%',
          f.zero_rn_pct ? f.zero_rn_pct.toFixed(0) + '%' : '0%',
          f.jeopardy_count || 0,
          formatCurrency(f.total_fines || 0)
        ]);

        doc.autoTable({
          startY: currentY,
          head: [['#', 'Facility', 'State', 'City', 'Owner', 'Rep. RN', 'Ver. RN', 'Gap', 'Zero-RN', 'Jeopardy', 'Fines']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
          margin: { left: margin, right: margin }
        });

        currentY = doc.lastAutoTable.finalY + 10;

        // Methodology
        if (currentY > 180) {
          doc.addPage();
          currentY = margin;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('WHAT IS A STAFFING DISCREPANCY?', margin, currentY);
        currentY += 7;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const methodologyText = doc.splitTextToSize(
          'Nursing homes self-report their staffing levels to CMS through the Payroll-Based Journal (PBJ) system. Government inspectors independently evaluate actual staffing conditions during surveys. When a facility reports significantly more nursing hours than verified payroll records show, it raises questions about the accuracy of self-reported data. A large gap between reported and verified staffing — especially combined with serious safety citations — is a pattern that warrants investigation.',
          pageWidth - (margin * 2)
        );
        doc.text(methodologyText, margin, currentY);
        currentY += methodologyText.length * 4 + 5;

        // Disclaimer
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('DISCLAIMER', margin, currentY);
        currentY += 5;

        doc.setFont('helvetica', 'normal');
        const disclaimerText = doc.splitTextToSize(
          'The Oversight Report identifies patterns and discrepancies in publicly available federal data. These indicators do not constitute evidence of wrongdoing. This does not prove falsification. Discrepancies can result from timing differences, temporary staffing fluctuations, contractor reporting variations, or other factors. However, consistent large gaps are considered a red flag by CMS and state survey agencies. If you have concerns, contact your state survey agency or HHS OIG at tips.hhs.gov.',
          pageWidth - (margin * 2)
        );
        doc.text(disclaimerText, margin, currentY);
        currentY += disclaimerText.length * 4 + 5;

        // Data source
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Data: CMS Payroll-Based Journal (PBJ), CMS Health Deficiencies, Provider Information — via data.cms.gov', margin, currentY);

        // Save
        const filename = selectedState !== 'ALL'
          ? `OversightReport_Discrepancies_${selectedState}_${new Date().toISOString().split('T')[0]}.pdf`
          : `OversightReport_Discrepancies_National_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
      });
    });
  };

  if (loading) {
    return (
      <div className="discrepancies-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading facility data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="discrepancies-page">
        <div className="error-container">
          <p>Error loading data: {error}</p>
        </div>
      </div>
    );
  }

  if (COMING_SOON) {
    return (
      <ComingSoonPage
        title="Staffing Discrepancy Index"
        description="Find facilities where self-reported staffing numbers don't match payroll records. The gap between what facilities claim and what they actually staff can reveal systemic problems."
        tier="professional"
        features={[
          'RN gap percentage ranked by severity',
          'Filter by state, ownership, and gap threshold',
          'Serious danger detection flags',
          'Side-by-side reported vs. actual staffing comparison',
          'Export discrepancy data for investigation',
        ]}
      />
    );
  }

  return (
    <div className="discrepancies-page" ref={pageRef}>
      <Helmet>
        <title>Staffing Discrepancy Index — Self-Reported vs. Reality | The Oversight Report</title>
        <meta name="description" content="Facilities where self-reported staffing numbers don't match federal inspection findings. Compare claimed vs. observed staffing levels." />
        <link rel="canonical" href="https://oversightreports.com/discrepancies" />
      </Helmet>
      <div className="container-wide">
        {/* Header */}
        <div className="discrepancies-header">
          <h1 className="discrepancies-title">Staffing Discrepancy Index</h1>
          <p className="discrepancies-subtitle">
            Facilities where self-reported staffing numbers don't match federal inspection findings
          </p>
        </div>

        {/* National Summary */}
        <div className="discrepancies-summary">
          <p className="summary-lead">
            <strong>{discrepancyFacilities.length} facilities nationwide</strong> show staffing discrepancies.
          </p>
          <p className="summary-detail">
            These facilities report adequate staffing to CMS but inspection data tells a different story.
          </p>
        </div>

        {/* State Filter */}
        <div className="discrepancies-state-filter">
          <label htmlFor="state-select">Filter by State:</label>
          <select
            id="state-select"
            className="state-select"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            <option value="ALL">All States</option>
            {states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        {/* Summary Stats Cards */}
        <div className="discrepancies-stats-grid">
          <div className="stat-card">
            <div className="stat-value">{summaryStats.total}</div>
            <div className="stat-label">With Discrepancies</div>
            <div className="stat-subtext">{summaryStats.percentOfAll.toFixed(1)}% of all facilities</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summaryStats.avgGap.toFixed(1)}%</div>
            <div className="stat-label">Average RN Gap</div>
            <div className="stat-subtext">Among flagged facilities</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summaryStats.withJeopardy}</div>
            <div className="stat-label">With Serious Danger</div>
            <div className="stat-subtext">Jeopardy citations</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(summaryStats.totalFines)}</div>
            <div className="stat-label">Total Fines</div>
            <div className="stat-subtext">Among flagged facilities</div>
          </div>
        </div>

        {/* Filters */}
        <div className="discrepancies-filters">
          <div className="filter-group">
            <label>Ownership Type:</label>
            <select value={ownershipFilter} onChange={(e) => setOwnershipFilter(e.target.value)}>
              <option value="ALL">All</option>
              <option value="FOR_PROFIT">For-profit</option>
              <option value="NONPROFIT">Nonprofit</option>
              <option value="GOVERNMENT">Government</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Minimum Gap %:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={minGap}
              onChange={(e) => setMinGap(Number(e.target.value))}
            />
          </div>

          <div className="filter-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={hasSeriousDanger}
                onChange={(e) => setHasSeriousDanger(e.target.checked)}
              />
              Has Serious Danger
            </label>
          </div>

          <div className="filter-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={hasZeroRN}
                onChange={(e) => setHasZeroRN(e.target.checked)}
              />
              Has Zero-RN Days
            </label>
          </div>
        </div>

        {/* Result Count */}
        <div className="discrepancies-result-count">
          Showing {sortedFacilities.length} of {discrepancyFacilities.length} facilities with discrepancies
        </div>

        {/* Export Buttons */}
        <div className="discrepancies-export">
          {canAccess(tier, 'professional') ? (
            <>
              <button className="btn btn-secondary" onClick={handleDownloadCSV}>
                Download CSV
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadPDF}>
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

        {/* Data Context Info Box */}
        <div className="discrepancies-info-box">
          <p>
            Staffing data from CMS Payroll-Based Journal, Q3 2025. Federal law (42 CFR §483.35) requires a registered nurse on site for at least 8 consecutive hours per day, 7 days per week. "Zero-RN Days" shows the percentage of days where the facility reported no RN hours at all — based on payroll data submitted to CMS. Days with zero reported RN hours may indicate a violation of this federal requirement, or may reflect a data reporting error. Note: "Total Staff Hrs/Day" includes all staff combined (CNA + LPN + RN) — a high number does not mean RNs were present.
          </p>
        </div>

        {/* Table */}
        <div className="discrepancies-table-container" ref={tableRef}>
          <table className="discrepancies-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th onClick={() => handleSort('name')} className="sortable">
                  Facility {getSortIcon('name')}
                </th>
                <th onClick={() => handleSort('state')} className="sortable">
                  State {getSortIcon('state')}
                </th>
                <th>City</th>
                <th>Owner</th>
                <th>Reported Staffing</th>
                <th>Verified Staffing</th>
                <th onClick={() => handleSort('rn_gap_pct')} className="sortable">
                  Gap {getSortIcon('rn_gap_pct')}
                </th>
                <th onClick={() => handleSort('zero_rn_pct')} className="sortable">
                  Zero-RN Days {getSortIcon('zero_rn_pct')}
                </th>
                <th onClick={() => handleSort('jeopardy_count')} className="sortable">
                  Serious Danger {getSortIcon('jeopardy_count')}
                </th>
                <th onClick={() => handleSort('total_fines')} className="sortable">
                  Fines {getSortIcon('total_fines')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedFacilities.map((facility, idx) => {
                const reportedRN = facility.self_report_rn ? (facility.self_report_rn * 60).toFixed(0) : '0';
                const verifiedRN = facility.rn_hprd ? (facility.rn_hprd * 60).toFixed(0) : '0';
                const gap = facility.rn_gap_pct || 0;
                const gapColorClass = getGapColor(gap);

                return (
                  <tr key={facility.ccn}>
                    <td className="rank-col">{idx + 1}</td>
                    <td>
                      <button
                        className="facility-link"
                        onClick={() => handleFacilityClick(facility.ccn)}
                      >
                        {facility.name}
                      </button>
                    </td>
                    <td>{facility.state}</td>
                    <td>{facility.city}</td>
                    <td className="owner-col">
                      {facility.worst_owner || facility.chain_name || 'N/A'}
                    </td>
                    <td className="staffing-col">{reportedRN} min/day</td>
                    <td className="staffing-col">{verifiedRN} min/day</td>
                    <td className="gap-col">
                      <div className={`gap-value ${gapColorClass}`}>
                        <div className="gap-bar" style={{ width: `${Math.min(gap, 100)}%` }}></div>
                        <span className="gap-text">{formatPercent(gap)}</span>
                      </div>
                    </td>
                    <td className={`zero-rn-col ${(facility.zero_rn_pct || 0) > 20 ? 'warning' : ''}`}>
                      {formatPercent(facility.zero_rn_pct || 0)}
                    </td>
                    <td className={`jeopardy-col ${(facility.jeopardy_count || 0) > 0 ? 'danger' : ''}`}>
                      {facility.jeopardy_count || 0}
                    </td>
                    <td className="fines-col">{formatCurrency(facility.total_fines || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedFacilities.length === 0 && (
          <div className="discrepancies-empty">
            <p>No facilities match your current filters.</p>
          </div>
        )}

        {/* Explainer */}
        <CollapsibleSection title="What is a staffing discrepancy?" defaultOpen={false}>
          <div className="explainer-content">
            <p>
              Nursing homes self-report their staffing levels to CMS through the Payroll-Based Journal (PBJ) system.
              Government inspectors independently evaluate actual staffing conditions during surveys.
            </p>
            <p>
              When a facility reports significantly more nursing hours than verified payroll records show, it raises
              questions about the accuracy of self-reported data. A large gap between reported and verified staffing —
              especially combined with serious safety citations — is a pattern that warrants investigation.
            </p>
            <p>
              <strong>This does not prove falsification.</strong> Discrepancies can result from timing differences,
              temporary staffing fluctuations, contractor reporting variations, or other factors. However, consistent
              large gaps are considered a red flag by CMS and state survey agencies.
            </p>
          </div>
        </CollapsibleSection>

        {/* Disclaimer */}
        <div className="discrepancies-disclaimer">
          <p>
            <strong>The Oversight Report identifies patterns and discrepancies in publicly available federal data.</strong> These
            indicators do not constitute evidence of wrongdoing. If you have concerns, contact your state survey
            agency or HHS OIG at tips.hhs.gov.
          </p>
        </div>

        {/* Data Source Footer */}
        <div className="discrepancies-footer">
          <p>
            Data: CMS Payroll-Based Journal (PBJ), CMS Health Deficiencies, Provider Information — via data.cms.gov
          </p>
        </div>
      </div>
    </div>
  );
}
