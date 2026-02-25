import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { useFacilityData } from '../hooks/useFacilityData';
import { useSubscription, canAccess } from '../hooks/useSubscription';
import { UpgradePrompt } from '../components/UpgradePrompt';
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

const FACILITY_TYPES = {
  snf: { label: 'Skilled Nursing', abbr: 'SNF', color: '#3B82F6' },
  home_health: { label: 'Home Health', abbr: 'HH', color: '#10B981' },
  hospice: { label: 'Hospice', abbr: 'HSP', color: '#8B5CF6' },
  irf: { label: 'Rehab - IRF', abbr: 'IRF', color: '#F59E0B' },
  ltach: { label: 'Long-Term Acute', abbr: 'LTCH', color: '#EF4444' }
};

export function ReferralScorecardPage() {
  const COMING_SOON = false;

  const [searchParams, setSearchParams] = useSearchParams();
  const { getAllFacilities, loading, error } = useFacilityData();
  const { tier } = useSubscription();

  // Post-acute data
  const [postacuteData, setPostacuteData] = useState(null);
  const [postacuteLoading, setPostacuteLoading] = useState(true);

  // Input method: 'location' or 'ccn'
  const [inputMethod, setInputMethod] = useState('location');

  // Location search state
  const [selectedState, setSelectedState] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [radius, setRadius] = useState(15);

  // Facility type selection
  const [selectedTypes, setSelectedTypes] = useState({
    snf: true,
    home_health: true,
    hospice: true,
    irf: true,
    ltach: true
  });

  // CCN paste state
  const [ccnInput, setCcnInput] = useState('');

  // Results
  const [facilities, setFacilities] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedFacilities, setSelectedFacilities] = useState(new Set());

  const headerRef = useRef(null);
  const resultsRef = useRef(null);

  // Load postacute data
  useEffect(() => {
    async function loadPostacuteData() {
      try {
        setPostacuteLoading(true);
        const response = await fetch(`${import.meta.env.BASE_URL}postacute_facility_data.json`);
        if (!response.ok) {
          throw new Error(`Failed to load postacute data: ${response.status}`);
        }
        const json = await response.json();
        setPostacuteData(json);
      } catch (err) {
        console.error('Error loading postacute data:', err);
      } finally {
        setPostacuteLoading(false);
      }
    }
    loadPostacuteData();
  }, []);

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
    if (ccnParam && getAllFacilities.length > 0 && postacuteData) {
      const ccnList = ccnParam.split(',').map(c => c.trim());
      setCcnInput(ccnList.join('\n'));
      setInputMethod('ccn');
      handleCcnSearch(ccnList);
    }
  }, [searchParams, getAllFacilities, postacuteData]);

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

  // Merge SNF and postacute facilities into unified structure
  const mergeAllFacilities = () => {
    const unified = [];

    // Add SNF facilities
    getAllFacilities.forEach(f => {
      unified.push({
        ccn: f.ccn,
        name: f.name,
        type: 'snf',
        address: f.address,
        city: f.city,
        state: f.state,
        zip: f.zip,
        lat: f.latitude,
        lon: f.longitude,
        ownership_type: f.ownership_type || 'Unknown',
        stars: f.stars,
        composite_risk: f.composite || 0,
        key_metrics: {
          total_hprd: f.total_hprd,
          rn_hprd: f.rn_hprd,
          total_deficiencies: f.total_deficiencies,
          jeopardy_count: f.jeopardy_count,
          zero_rn_pct: f.zero_rn_pct
        },
        flags: [],
        deficiency_count: f.total_deficiencies || 0,
        distance: null
      });
    });

    // Add postacute facilities
    if (postacuteData && postacuteData.facilities) {
      postacuteData.facilities.forEach(f => {
        unified.push({
          ccn: f.ccn,
          name: f.name,
          type: f.type,
          address: f.address,
          city: f.city,
          state: f.state,
          zip: f.zip,
          lat: f.lat,
          lon: f.lon,
          ownership_type: f.ownership_type || 'Unknown',
          stars: f.key_metrics?.quality_of_patient_care_star || null,
          composite_risk: f.composite_risk || 0,
          key_metrics: f.key_metrics || {},
          flags: f.flags || [],
          deficiency_count: f.deficiency_count || 0,
          distance: null
        });
      });
    }

    return unified;
  };

  // Handle location search
  const handleLocationSearch = () => {
    if (!selectedState || !cityInput.trim()) {
      alert('Please select a state and enter a city name');
      return;
    }

    const allFacs = mergeAllFacilities();

    // Find facilities in the selected city to get center coordinates
    const cityFacs = allFacs.filter(f =>
      f.state === selectedState &&
      f.city?.toLowerCase().includes(cityInput.toLowerCase().trim())
    );

    if (cityFacs.length === 0) {
      alert('No facilities found in that city. Try a different city name.');
      return;
    }

    // Use the first facility with coordinates as center
    const centerFac = cityFacs.find(f => f.lat && f.lon);
    if (!centerFac) {
      alert('Location data not available for this city');
      return;
    }

    const centerLat = centerFac.lat;
    const centerLon = centerFac.lon;

    // Get first 3 digits of center zip for proximity estimation
    const centerZipPrefix = centerFac.zip ? centerFac.zip.substring(0, 3) : null;

    // Find all facilities within radius or in same state
    const nearby = allFacs
      .filter(f => {
        // Must be in selected state
        if (f.state !== selectedState) return false;
        // Must match selected facility types
        if (!selectedTypes[f.type]) return false;
        return true;
      })
      .map(f => {
        let distance = null;
        let distanceLabel = 'In state';

        // If facility has coordinates, calculate exact distance
        if (f.lat && f.lon) {
          distance = haversineDistance(centerLat, centerLon, f.lat, f.lon);
          distanceLabel = distance.toFixed(1);
        } else if (centerZipPrefix && f.zip) {
          // Estimate from zip code prefix
          const facZipPrefix = f.zip.substring(0, 3);
          if (facZipPrefix === centerZipPrefix) {
            distanceLabel = '< 50 mi';
            distance = 25; // Arbitrary sort value for zip match
          }
        }

        return { ...f, distance, distanceLabel };
      })
      .filter(f => {
        // If we have exact distance, filter by radius
        if (f.distance !== null && typeof f.distance === 'number') {
          return f.distance <= radius;
        }
        // Otherwise include all in-state facilities
        return true;
      })
      .sort((a, b) => a.composite_risk - b.composite_risk); // Sort by risk (lowest first)

    setFacilities(nearby);
    setActiveFilter('all');
    setSelectedFacilities(new Set());
  };

  // Handle CCN paste search
  const handleCcnSearch = (ccnList = null) => {
    const ccns = ccnList || ccnInput.split(/[\n,]+/).map(c => c.trim()).filter(c => c.length > 0);

    if (ccns.length === 0) {
      alert('Please paste at least one CCN number');
      return;
    }

    const allFacs = mergeAllFacilities();
    const matched = allFacs
      .filter(f => ccns.includes(f.ccn))
      .map(f => ({ ...f, distanceLabel: '—' }))
      .sort((a, b) => a.composite_risk - b.composite_risk); // Sort by risk (lowest first)

    if (matched.length === 0) {
      alert('No facilities found with those CCN numbers');
      return;
    }

    setFacilities(matched);
    setActiveFilter('all');
    setSelectedFacilities(new Set());
  };

  // Toggle facility type selection
  const toggleFacilityType = (type) => {
    setSelectedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // Toggle facility selection
  const toggleFacilitySelection = (ccn) => {
    setSelectedFacilities(prev => {
      const next = new Set(prev);
      if (next.has(ccn)) {
        next.delete(ccn);
      } else {
        next.add(ccn);
      }
      return next;
    });
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

  // Apply filtering
  const filteredFacilities = facilities.filter(f => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'high_risk') return f.composite_risk > 60;
    return f.type === activeFilter;
  });

  // Apply sorting
  const sortedFacilities = [...filteredFacilities].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'risk':
        aVal = a.composite_risk || 0;
        bVal = b.composite_risk || 0;
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
      case 'distance':
        aVal = a.distance !== null ? a.distance : 999999;
        bVal = b.distance !== null ? b.distance : 999999;
        break;
      default:
        return 0;
    }

    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  // Get facility type counts
  const getTypeCounts = () => {
    const counts = { all: facilities.length, high_risk: 0 };
    Object.keys(FACILITY_TYPES).forEach(type => {
      counts[type] = 0;
    });

    facilities.forEach(f => {
      if (f.composite_risk > 60) counts.high_risk++;
      if (counts[f.type] !== undefined) {
        counts[f.type]++;
      }
    });

    return counts;
  };

  // Get key metric display
  const getKeyMetric = (facility) => {
    const m = facility.key_metrics;
    if (!m) return '—';

    switch (facility.type) {
      case 'snf':
        return m.total_hprd ? `${m.total_hprd.toFixed(1)} hrs` : '—';
      case 'home_health':
        return m.quality_of_patient_care_star ? `${m.quality_of_patient_care_star}★ QPC` : '—';
      case 'hospice':
        return m.state_recommend_pct ? `${m.state_recommend_pct}% rec` : '—';
      case 'irf':
        return m.discharge_to_community_pct ? `${m.discharge_to_community_pct.toFixed(0)}% d2c` : '—';
      case 'ltach':
        return m.readmission_rate !== undefined ? `${(m.readmission_rate * 100).toFixed(0)}% readm` : '—';
      default:
        return '—';
    }
  };

  // Get risk info
  const getRiskInfo = (score) => {
    if (score >= 60) return { label: 'CRITICAL', className: 'risk-critical' };
    if (score >= 40) return { label: 'HIGH RISK', className: 'risk-high' };
    if (score >= 20) return { label: 'ELEVATED', className: 'risk-elevated' };
    return { label: 'LOW RISK', className: 'risk-low' };
  };

  // Render stars
  const renderStars = (count) => {
    if (!count) return '—';
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(i < count ? '★' : '☆');
    }
    return stars.join('');
  };

  // Download CSV
  const downloadCSV = () => {
    if (!sortedFacilities.length) return;

    const headers = ['Rank', 'Type', 'Facility', 'CCN', 'City', 'State', 'Distance', 'Risk Score', 'Stars', 'Key Metric', 'Ownership'];
    const rows = sortedFacilities.map((f, i) => [
      i + 1,
      FACILITY_TYPES[f.type]?.abbr || f.type,
      f.name,
      f.ccn,
      f.city,
      f.state,
      f.distanceLabel || '—',
      (f.composite_risk || 0).toFixed(1),
      f.stars || '—',
      getKeyMetric(f),
      f.ownership_type
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
    if (!sortedFacilities.length) return;

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

    // Header - Navy theme matching Evidence PDF
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Discharge Planning Report', pageWidth / 2, currentY + 8, { align: 'center' });
    currentY += 14;

    // Subtitle
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Post-Acute Care Facility Comparison', pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    // Date
    doc.setFontSize(9);
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated: ${today}`, pageWidth / 2, currentY, { align: 'center' });

    currentY = 40;

    // Reset text color for body
    doc.setTextColor(0, 0, 0);

    // Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin, currentY);
    currentY += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const avgScore = (sortedFacilities.reduce((sum, f) => sum + (f.composite_risk || 0), 0) / sortedFacilities.length).toFixed(1);
    const highRiskCount = sortedFacilities.filter(f => (f.composite_risk || 0) > 60).length;

    doc.text(`${sortedFacilities.length} facilities compared`, margin + 3, currentY);
    currentY += 5;
    doc.text(`Average Risk Score: ${avgScore}`, margin + 3, currentY);
    currentY += 5;
    doc.text(`${highRiskCount} facilities with elevated risk (>60)`, margin + 3, currentY);
    currentY += 10;

    // Facility types breakdown
    const counts = getTypeCounts();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Facility Types:', margin, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    Object.entries(FACILITY_TYPES).forEach(([key, info]) => {
      if (counts[key] > 0) {
        doc.text(`• ${info.label}: ${counts[key]}`, margin + 3, currentY);
        currentY += 4;
      }
    });
    currentY += 6;

    // Comparison table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Facility Comparison', margin, currentY);
    currentY += 7;

    const tableData = sortedFacilities.map((f, i) => [
      i + 1,
      FACILITY_TYPES[f.type]?.abbr || f.type,
      f.name,
      f.city + ', ' + f.state,
      f.distanceLabel || '—',
      (f.composite_risk || 0).toFixed(1),
      f.stars || '—',
      getKeyMetric(f)
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['#', 'Type', 'Facility', 'Location', 'Dist', 'Risk', 'Stars', 'Key Metric']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 15 },
        2: { cellWidth: 60 },
        3: { cellWidth: 35 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
        6: { cellWidth: 15 },
        7: { cellWidth: 25 }
      }
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // Disclaimer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    const disclaimerText = doc.splitTextToSize(
      'This report is for informational purposes only. Risk scores indicate areas warranting further investigation. Always visit facilities in person and consult with healthcare professionals before making placement decisions.',
      pageWidth - (margin * 2)
    );
    doc.text(disclaimerText, margin, currentY);

    // Footer
    currentY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Source: CMS data via GUARD Oversight Platform', pageWidth / 2, currentY, { align: 'center' });

    // Save
    const filename = `Discharge_Planning_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  // Share with family (generate URL)
  const shareWithFamily = () => {
    if (!sortedFacilities.length) return;

    const ccns = sortedFacilities.map(f => f.ccn).join(',');
    const url = `${window.location.origin}/referral-scorecard?ccns=${ccns}`;

    navigator.clipboard.writeText(url).then(() => {
      alert('Shareable link copied to clipboard!');
    }).catch(() => {
      prompt('Copy this link to share:', url);
    });
  };

  if (loading || postacuteLoading) {
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
        description="For discharge planners and care coordination teams. Rank skilled nursing facilities, home health, hospice, rehab, and long-term acute care facilities by safety score, staffing, outcomes, and distance. Make data-driven referral decisions across all post-acute settings."
        tier="institutional"
        features={[
          'Compare all post-acute facility types: SNF, Home Health, Hospice, IRF, LTACH',
          'Rank facilities by composite risk score within your referral radius',
          'Type-specific quality metrics for each care setting',
          'Export discharge planning reports with facility comparisons',
          'Shareable report links for patient families',
        ]}
      />
    );
  }

  // Gate check - if not institutional tier, show upgrade prompt
  if (!canAccess(tier, 'institutional')) {
    return (
      <div className="referral-scorecard-page">
        <div className="referral-header">
          <h1>Referral Scorecard</h1>
          <p className="referral-subtitle">
            Compare post-acute care facilities side-by-side for discharge planning
          </p>
        </div>
        <UpgradePrompt
          requiredTier="institutional"
          featureName="Referral Scorecard"
        >
          <div style={{ opacity: 0.4, padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
              Advanced facility comparison and discharge planning tools
            </p>
          </div>
        </UpgradePrompt>
      </div>
    );
  }

  const typeCounts = getTypeCounts();

  // Get total counts from merged data
  const allMerged = mergeAllFacilities();
  const totalCounts = { snf: 0, home_health: 0, hospice: 0, irf: 0, ltach: 0 };
  allMerged.forEach(f => {
    if (totalCounts[f.type] !== undefined) {
      totalCounts[f.type]++;
    }
  });

  return (
    <div className="referral-scorecard-page">
      <Helmet>
        <title>Referral Scorecard — Post-Acute Care Comparison | The Oversight Report</title>
        <meta name="description" content="Compare post-acute care facilities side-by-side for discharge planning. Rank SNFs, home health, hospice, rehab, and LTACH facilities by safety score." />
        <link rel="canonical" href="https://oversightreports.com/referral-scorecard" />
      </Helmet>
      {/* Header */}
      <div className="referral-header" ref={headerRef}>
        <h1>Referral Scorecard</h1>
        <p className="referral-subtitle">
          Find safe post-acute care near any location
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
            <div className="referral-input-row">
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
            </div>

            {/* Radius Button Group */}
            <div className="referral-input-group">
              <label>Radius:</label>
              <div className="referral-radius-buttons">
                {[5, 10, 15, 25, 50].map(r => (
                  <button
                    key={r}
                    className={`referral-radius-btn ${radius === r ? 'active' : ''}`}
                    onClick={() => setRadius(r)}
                  >
                    {r}
                  </button>
                ))}
                <span className="referral-radius-label">miles</span>
              </div>
            </div>

            {/* Facility Type Checkboxes */}
            <div className="referral-input-group">
              <label>Facility Types:</label>
              <div className="referral-type-checkboxes">
                {Object.entries(FACILITY_TYPES).map(([key, info]) => (
                  <label key={key} className="referral-type-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedTypes[key]}
                      onChange={() => toggleFacilityType(key)}
                    />
                    <span>{info.label} ({totalCounts[key]?.toLocaleString() || 0})</span>
                  </label>
                ))}
              </div>
            </div>

            <button onClick={handleLocationSearch} className="btn btn-primary">
              Build Scorecard
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
          {/* Results Header */}
          <div className="referral-results-header">
            <h2>
              Results{selectedState && cityInput && ` near: ${cityInput}, ${selectedState}`}
              {inputMethod === 'location' && ` | Radius: ${radius} mi`}
              {' | '}{facilities.length} facilities
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="referral-filter-tabs">
            <button
              className={`referral-filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All {typeCounts.all}
            </button>
            {Object.entries(FACILITY_TYPES).map(([key, info]) => (
              typeCounts[key] > 0 && (
                <button
                  key={key}
                  className={`referral-filter-tab ${activeFilter === key ? 'active' : ''}`}
                  onClick={() => setActiveFilter(key)}
                >
                  {info.abbr} {typeCounts[key]}
                </button>
              )
            ))}
            {typeCounts.high_risk > 0 && (
              <button
                className={`referral-filter-tab referral-filter-high-risk ${activeFilter === 'high_risk' ? 'active' : ''}`}
                onClick={() => setActiveFilter('high_risk')}
              >
                High Risk ⚠ {typeCounts.high_risk}
              </button>
            )}
          </div>

          {/* Export Options */}
          <div className="referral-export-section">
            <div className="referral-export-buttons">
              <button className="btn btn-secondary" onClick={downloadPDF}>
                Export PDF
              </button>
              <button className="btn btn-secondary" onClick={downloadCSV}>
                Export CSV
              </button>
              <button className="btn btn-secondary" onClick={shareWithFamily}>
                Share Link
              </button>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="referral-table-wrapper">
            <table className="referral-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedFacilities.size === sortedFacilities.length && sortedFacilities.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFacilities(new Set(sortedFacilities.map(f => f.ccn)));
                        } else {
                          setSelectedFacilities(new Set());
                        }
                      }}
                      title="Select all"
                    />
                  </th>
                  <th>Rank</th>
                  <th>Type</th>
                  <th onClick={() => handleSort('name')} className="sortable">
                    Facility {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('distance')} className="sortable">
                    Distance {sortBy === 'distance' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('risk')} className="sortable">
                    Risk Score {sortBy === 'risk' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('stars')} className="sortable">
                    Stars {sortBy === 'stars' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Key Metric</th>
                  <th>Ownership</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {sortedFacilities.map((facility, index) => {
                  const riskInfo = getRiskInfo(facility.composite_risk || 0);
                  const typeInfo = FACILITY_TYPES[facility.type];
                  return (
                    <tr key={facility.ccn}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedFacilities.has(facility.ccn)}
                          onChange={() => toggleFacilitySelection(facility.ccn)}
                        />
                      </td>
                      <td className="referral-rank">{index + 1}</td>
                      <td>
                        <span
                          className="facility-type-badge"
                          style={{ backgroundColor: typeInfo?.color || '#666' }}
                        >
                          {typeInfo?.abbr || facility.type}
                        </span>
                      </td>
                      <td className="referral-facility-name">
                        {facility.type === 'snf' ? (
                          <Link to={`/facility/${facility.ccn}`}>{facility.name}</Link>
                        ) : (
                          <span title={`${facility.address}, ${facility.city}, ${facility.state} ${facility.zip}`}>
                            {facility.name}
                          </span>
                        )}
                      </td>
                      <td className="mono">{facility.distanceLabel || '—'}</td>
                      <td>
                        <span className={`referral-risk-badge ${riskInfo.className}`}>
                          {(facility.composite_risk || 0).toFixed(1)}
                        </span>
                      </td>
                      <td className="referral-stars">{renderStars(facility.stars)}</td>
                      <td className="mono">{getKeyMetric(facility)}</td>
                      <td className="referral-ownership">{facility.ownership_type}</td>
                      <td>
                        <div className="referral-flags">
                          {facility.flags && facility.flags.length > 0 ? (
                            facility.flags.slice(0, 2).map((flag, i) => (
                              <span key={i} className="referral-flag" title={flag}>
                                {flag.substring(0, 3)}
                              </span>
                            ))
                          ) : (
                            <span className="referral-flag-no">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Selected Count */}
          {selectedFacilities.size > 0 && (
            <div className="referral-selected-count">
              {selectedFacilities.size} facilities selected
            </div>
          )}

          {/* Data Source Footer */}
          <div className="referral-data-source">
            Data: CMS Care Compare, Home Health Compare, Hospice Compare, IRF Compare, LTACH Compare — via data.cms.gov
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
