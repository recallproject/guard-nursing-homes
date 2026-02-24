import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { useFacilityData } from '../hooks/useFacilityData';
import ComingSoonPage from '../components/ComingSoonPage';
import '../styles/referral-scorecard.css';

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

export function ReferralScorecardPage() {
  const COMING_SOON = true;

  const [searchParams, setSearchParams] = useSearchParams();
  const { getAllFacilities, loading, error } = useFacilityData();

  // Input method: 'location' or 'ccn'
  const [inputMethod, setInputMethod] = useState('location');

  // Location search state
  const [selectedState, setSelectedState] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [radius, setRadius] = useState(25);

  // CCN paste state
  const [ccnInput, setCcnInput] = useState('');

  // Results
  const [facilities, setFacilities] = useState([]);
  const [sortBy, setSortBy] = useState('composite'); // composite, name, stars, staffing, fines
  const [sortOrder, setSortOrder] = useState('asc');

  const headerRef = useRef(null);
  const resultsRef = useRef(null);

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

  // Animate results on appear
  useEffect(() => {
    if (facilities.length > 0 && resultsRef.current) {
      gsap.fromTo(
        resultsRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, [facilities]);

  // Load from URL params on mount
  useEffect(() => {
    const ccnParam = searchParams.get('ccns');
    if (ccnParam && getAllFacilities.length > 0) {
      const ccnList = ccnParam.split(',').map(c => c.trim());
      setCcnInput(ccnList.join('\n'));
      setInputMethod('ccn');
      handleCcnSearch(ccnList);
    }
  }, [searchParams, getAllFacilities]);

  // Haversine distance in miles
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Handle location search
  const handleLocationSearch = () => {
    if (!selectedState || !cityInput.trim()) {
      alert('Please select a state and enter a city name');
      return;
    }

    const allFacs = getAllFacilities;

    // Find facilities in the selected city to get center coordinates
    const cityFacs = allFacs.filter(f =>
      f.state === selectedState &&
      f.city?.toLowerCase().includes(cityInput.toLowerCase().trim())
    );

    if (cityFacs.length === 0) {
      alert('No facilities found in that city. Try a different city name.');
      return;
    }

    // Use the first facility's coordinates as center
    const centerLat = cityFacs[0].latitude;
    const centerLon = cityFacs[0].longitude;

    if (!centerLat || !centerLon) {
      alert('Location data not available for this city');
      return;
    }

    // Find all facilities within radius in this state
    const nearby = allFacs
      .filter(f => f.state === selectedState && f.latitude && f.longitude)
      .map(f => ({
        ...f,
        distance: haversineDistance(centerLat, centerLon, f.latitude, f.longitude)
      }))
      .filter(f => f.distance <= radius)
      .sort((a, b) => a.composite - b.composite); // Sort by risk (best first)

    setFacilities(nearby);
  };

  // Handle CCN paste search
  const handleCcnSearch = (ccnList = null) => {
    const ccns = ccnList || ccnInput.split(/[\n,]+/).map(c => c.trim()).filter(c => c.length > 0);

    if (ccns.length === 0) {
      alert('Please paste at least one CCN number');
      return;
    }

    const allFacs = getAllFacilities;
    const matched = allFacs
      .filter(f => ccns.includes(f.ccn))
      .sort((a, b) => a.composite - b.composite); // Sort by risk (best first)

    if (matched.length === 0) {
      alert('No facilities found with those CCN numbers');
      return;
    }

    setFacilities(matched);
  };

  // Handle sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'name' || column === 'city' ? 'asc' : 'desc');
    }
  };

  // Apply sorting
  const sortedFacilities = [...facilities].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'composite':
        aVal = a.composite || 0;
        bVal = b.composite || 0;
        break;
      case 'name':
        aVal = a.name || '';
        bVal = b.name || '';
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'city':
        aVal = a.city || '';
        bVal = b.city || '';
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
      default:
        return 0;
    }

    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  // Calculate overall grade
  const getOverallGrade = () => {
    if (facilities.length === 0) return null;
    const avgScore = facilities.reduce((sum, f) => sum + (f.composite || 0), 0) / facilities.length;
    const dangerCount = facilities.filter(f => (f.jeopardy_count || 0) > 0).length;

    let grade = 'F';
    if (avgScore < 20) grade = 'A';
    else if (avgScore < 40) grade = 'B';
    else if (avgScore < 60) grade = 'C';
    else if (avgScore < 80) grade = 'D';

    return { grade, avgScore, dangerCount, total: facilities.length };
  };

  // Get risk info
  const getRiskInfo = (score) => {
    if (score >= 60) return { label: 'CRITICAL', className: 'risk-critical' };
    if (score >= 40) return { label: 'HIGH RISK', className: 'risk-high' };
    if (score >= 20) return { label: 'ELEVATED', className: 'risk-elevated' };
    return { label: 'LOW RISK', className: 'risk-low' };
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toLocaleString()}`;
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

    const headers = ['Rank', 'Facility', 'CCN', 'City', 'State', 'Risk Score', 'Stars', 'Staffing (min/day)', 'Total Deficiencies', 'Fines', 'Serious Danger', 'Zero-RN Days %'];
    const rows = sortedFacilities.map((f, i) => [
      i + 1,
      f.name,
      f.ccn,
      f.city,
      f.state,
      (f.composite || 0).toFixed(1),
      f.stars || 0,
      Math.round((f.total_hprd || 0) * 60),
      f.total_deficiencies || 0,
      f.total_fines || 0,
      f.jeopardy_count || 0,
      (f.zero_rn_pct || 0).toFixed(1)
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Referral_Scorecard_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download PDF
  const downloadPDF = async () => {
    if (!facilities.length) return;

    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

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
    doc.text('Referral Scorecard - Nursing Home Comparison', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated: ${today}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    doc.text('Source: CMS data via The Oversight Report', pageWidth / 2, currentY, { align: 'center' });
    currentY += 12;

    // Overall grade
    const gradeInfo = getOverallGrade();
    if (gradeInfo) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Overall Assessment', margin, currentY);
      currentY += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Average Risk Score: ${gradeInfo.avgScore.toFixed(1)} (Grade: ${gradeInfo.grade})`, margin + 3, currentY);
      currentY += 5;
      doc.text(`${gradeInfo.dangerCount} of ${gradeInfo.total} facilities have serious safety concerns`, margin + 3, currentY);
      currentY += 10;
    }

    // Comparison table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Facility Comparison', margin, currentY);
    currentY += 7;

    const tableData = sortedFacilities.map((f, i) => [
      i + 1,
      f.name,
      f.city + ', ' + f.state,
      (f.composite || 0).toFixed(1),
      f.stars || 0,
      Math.round((f.total_hprd || 0) * 60),
      f.total_deficiencies || 0,
      formatCurrency(f.total_fines || 0),
      f.jeopardy_count || 0,
      (f.zero_rn_pct || 0).toFixed(0) + '%'
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['Rank', 'Facility', 'Location', 'Risk', 'Stars', 'Staff', 'Def', 'Fines', 'Danger', 'Zero-RN']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 65 },
        2: { cellWidth: 40 },
        3: { cellWidth: 15 },
        4: { cellWidth: 12 },
        5: { cellWidth: 12 },
        6: { cellWidth: 12 },
        7: { cellWidth: 18 },
        8: { cellWidth: 15 },
        9: { cellWidth: 18 }
      }
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // Disclaimer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    const disclaimerText = doc.splitTextToSize(
      'This scorecard is for informational purposes only. Risk scores indicate areas warranting further investigation. Always visit facilities in person and consult with healthcare professionals before making placement decisions.',
      pageWidth - (margin * 2)
    );
    doc.text(disclaimerText, margin, currentY);

    // Save
    const filename = `Referral_Scorecard_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  // Share with family (generate URL)
  const shareWithFamily = () => {
    if (!facilities.length) return;

    const ccns = sortedFacilities.map(f => f.ccn).join(',');
    const url = `${window.location.origin}/referral-scorecard?ccns=${ccns}`;

    navigator.clipboard.writeText(url).then(() => {
      alert('Shareable link copied to clipboard!');
    }).catch(() => {
      prompt('Copy this link to share:', url);
    });
  };

  if (loading) {
    return (
      <div className="referral-scorecard-page">
        <div className="referral-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading facility data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="referral-scorecard-page">
        <div className="referral-error">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (COMING_SOON) {
    return (
      <ComingSoonPage
        title="Referral Scorecard"
        description="For discharge planners and care coordination teams. Rank the skilled nursing facilities your hospital sends patients to — by safety score, staffing, outcomes, and distance. Make data-driven referral decisions."
        tier="institutional"
        features={[
          'Rank SNFs by composite risk score within your referral radius',
          'Compare facilities your hospital actually sends patients to',
          'Staffing and quality benchmarks for each facility',
          'Shareable report links for patient families',
          'Custom branding on shared reports',
        ]}
      />
    );
  }

  const overallGrade = getOverallGrade();

  return (
    <div className="referral-scorecard-page">
      {/* Header */}
      <div className="referral-header" ref={headerRef}>
        <h1>Referral Scorecard</h1>
        <p className="referral-subtitle">
          Compare nursing homes side-by-side for discharge planning
        </p>
      </div>

      {/* Input Method Tabs */}
      <div className="referral-tabs">
        <button
          className={`referral-tab ${inputMethod === 'location' ? 'active' : ''}`}
          onClick={() => setInputMethod('location')}
        >
          Search by Location
        </button>
        <button
          className={`referral-tab ${inputMethod === 'ccn' ? 'active' : ''}`}
          onClick={() => setInputMethod('ccn')}
        >
          Paste CCNs
        </button>
      </div>

      {/* Input Section */}
      <div className="referral-input-section">
        {inputMethod === 'location' ? (
          <div className="referral-location-search">
            <div className="referral-input-group">
              <label htmlFor="state-select">State:</label>
              <select
                id="state-select"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="referral-select"
              >
                <option value="">Choose a state...</option>
                {Object.entries(US_STATES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>

            <div className="referral-input-group">
              <label htmlFor="city-input">City:</label>
              <input
                id="city-input"
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="e.g., Chicago"
                className="referral-input"
              />
            </div>

            <div className="referral-input-group">
              <label htmlFor="radius-slider">Radius: {radius} miles</label>
              <input
                id="radius-slider"
                type="range"
                min="5"
                max="50"
                step="5"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="referral-slider"
              />
            </div>

            <button onClick={handleLocationSearch} className="btn btn-primary">
              Search Facilities
            </button>
          </div>
        ) : (
          <div className="referral-ccn-search">
            <div className="referral-input-group">
              <label htmlFor="ccn-input">Paste CCN numbers (one per line or comma-separated):</label>
              <textarea
                id="ccn-input"
                value={ccnInput}
                onChange={(e) => setCcnInput(e.target.value)}
                placeholder="145678&#10;234567&#10;345678"
                className="referral-textarea"
                rows={6}
              />
            </div>

            <button onClick={() => handleCcnSearch()} className="btn btn-primary">
              Compare Facilities
            </button>
          </div>
        )}
      </div>

      {/* Results Section */}
      {facilities.length > 0 && (
        <div className="referral-results" ref={resultsRef}>
          {/* Overall Grade Card */}
          {overallGrade && (
            <div className="referral-grade-card">
              <div className="referral-grade-header">
                <h2>Overall Assessment</h2>
              </div>
              <div className="referral-grade-body">
                <div className={`referral-grade-letter grade-${overallGrade.grade.toLowerCase()}`}>
                  {overallGrade.grade}
                </div>
                <div className="referral-grade-stats">
                  <div className="referral-grade-stat">
                    <span className="referral-grade-stat-value">{overallGrade.avgScore.toFixed(1)}</span>
                    <span className="referral-grade-stat-label">Average Risk Score</span>
                  </div>
                  <div className="referral-grade-stat">
                    <span className="referral-grade-stat-value danger">{overallGrade.dangerCount}</span>
                    <span className="referral-grade-stat-label">Serious Safety Concerns</span>
                  </div>
                  <div className="referral-grade-stat">
                    <span className="referral-grade-stat-value">{overallGrade.total}</span>
                    <span className="referral-grade-stat-label">Facilities Compared</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Export Options */}
          <div className="referral-export-section">
            <h3>Export Options</h3>
            <div className="referral-export-buttons">
              <button className="btn btn-secondary" onClick={downloadPDF}>
                Download PDF
              </button>
              <button className="btn btn-secondary" onClick={downloadCSV}>
                Download CSV
              </button>
              <button className="btn btn-secondary" onClick={shareWithFamily}>
                Share with Family
              </button>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="referral-table-wrapper">
            <table className="referral-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th onClick={() => handleSort('name')} className="sortable">
                    Facility {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('city')} className="sortable">
                    Location {sortBy === 'city' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('composite')} className="sortable">
                    Risk Score {sortBy === 'composite' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('stars')} className="sortable">
                    Stars {sortBy === 'stars' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('staffing')} className="sortable">
                    Staffing (min/day) {sortBy === 'staffing' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Deficiencies</th>
                  <th onClick={() => handleSort('fines')} className="sortable">
                    Fines {sortBy === 'fines' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Serious Danger</th>
                  <th>Zero-RN Days</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {sortedFacilities.map((facility, index) => {
                  const riskInfo = getRiskInfo(facility.composite || 0);
                  return (
                    <tr key={facility.ccn}>
                      <td className="referral-rank">{index + 1}</td>
                      <td className="referral-facility-name">{facility.name}</td>
                      <td>{facility.city}, {facility.state}</td>
                      <td>
                        <span className={`referral-risk-badge ${riskInfo.className}`}>
                          {(facility.composite || 0).toFixed(1)}
                        </span>
                      </td>
                      <td className="referral-stars">{renderStars(facility.stars || 0)}</td>
                      <td className="mono">{Math.round((facility.total_hprd || 0) * 60)}</td>
                      <td className="mono">{facility.total_deficiencies || 0}</td>
                      <td className="mono">{formatCurrency(facility.total_fines || 0)}</td>
                      <td>
                        {(facility.jeopardy_count || 0) > 0 ? (
                          <span className="referral-flag-danger">{facility.jeopardy_count}</span>
                        ) : (
                          <span className="referral-flag-no">—</span>
                        )}
                      </td>
                      <td className="mono">{(facility.zero_rn_pct || 0).toFixed(0)}%</td>
                      <td>
                        <div className="referral-quick-flags">
                          {(facility.jeopardy_count || 0) > 0 && (
                            <span className="referral-quick-flag flag-red" title="Serious danger citations">⚠</span>
                          )}
                          {(facility.rn_gap_pct || 0) > 25 && (
                            <span className="referral-quick-flag flag-orange" title="Staffing discrepancy >25%">📊</span>
                          )}
                          {(facility.zero_rn_pct || 0) > 20 && (
                            <span className="referral-quick-flag flag-yellow" title="Zero-RN days >20%">👨‍⚕️</span>
                          )}
                          {(facility.total_fines || 0) > 100000 && (
                            <span className="referral-quick-flag flag-orange" title="Fines >$100K">💰</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Data Source Footer */}
          <div className="referral-data-source">
            Data: CMS Care Compare, Payroll-Based Journal (PBJ), Health Deficiencies, Penalties — via data.cms.gov
          </div>

          {/* Disclaimer */}
          <div className="referral-disclaimer">
            This scorecard is for informational purposes only. Risk scores indicate areas warranting further investigation, not confirmed issues. Always visit facilities in person and consult with healthcare professionals before making placement decisions.
          </div>
        </div>
      )}
    </div>
  );
}
