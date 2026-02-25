import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useFacilityData } from '../hooks/useFacilityData';
import { EmailCaptureModal } from '../components/EmailCaptureModal';
import '../styles/ag-toolkit.css';

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

const TABS = [
  { id: 'staffing', label: 'Staffing Failures' },
  { id: 'zero-rn', label: 'Zero-RN Violators' },
  { id: 'ownership', label: 'Ownership Red Flags' },
];

const AG_THRESHOLDS = {
  totalHprd: 3.48,
  rnHprd: 0.55,
  cnaHprd: 2.45,
};

export function AGToolkitPage() {
  const { data, loading, error } = useFacilityData();
  const navigate = useNavigate();

  const [selectedState, setSelectedState] = useState('');
  const [activeTab, setActiveTab] = useState('staffing');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [filterOwnership, setFilterOwnership] = useState('all');
  const [filterMinRisk, setFilterMinRisk] = useState('');
  const [filterJeopardy, setFilterJeopardy] = useState(false);
  const [filterMinFines, setFilterMinFines] = useState('all');

  const headerRef = useRef(null);
  const statsRef = useRef(null);

  // Animate header on mount
  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
    }
  }, []);

  // Animate stats when state selected
  useEffect(() => {
    if (selectedState && statsRef.current) {
      gsap.fromTo(statsRef.current.children, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' });
    }
  }, [selectedState]);

  // Reset sort when changing tabs
  useEffect(() => {
    setSortBy('');
    setSortOrder('desc');
  }, [activeTab]);

  // All facilities for selected state
  const stateFacilities = useMemo(() => {
    if (!data || !data.states || !selectedState) return [];
    const stateData = data.states[selectedState];
    return stateData?.facilities || [];
  }, [data, selectedState]);

  // Summary stats for the 6 cards
  const stats = useMemo(() => {
    if (!stateFacilities.length) return null;

    const total = stateFacilities.length;
    const belowThreshold = stateFacilities.filter(f => (f.total_hprd || 0) < AG_THRESHOLDS.totalHprd).length;
    const zeroRn = stateFacilities.filter(f => (f.zero_rn_pct || 0) > 0).length;
    const forProfitJeopardy = stateFacilities.filter(f =>
      f.ownership_type === 'For profit' && (f.jeopardy_count || 0) > 0
    ).length;

    // Portfolio risk: owners with 5+ facilities where 50%+ below 3 stars
    // Group by owner, count facilities and low-star ones
    const ownerMap = {};
    for (const f of stateFacilities) {
      const owner = f.worst_owner || f.chain_name;
      if (!owner) continue;
      if (!ownerMap[owner]) ownerMap[owner] = { total: 0, lowStar: 0 };
      ownerMap[owner].total++;
      if ((f.stars || 0) < 3) ownerMap[owner].lowStar++;
    }
    const portfolioRiskCount = Object.values(ownerMap).filter(o => o.total >= 5 && (o.lowStar / o.total) >= 0.5).length;

    const totalFines = stateFacilities.reduce((sum, f) => sum + (f.total_fines || 0), 0);

    return { total, belowThreshold, zeroRn, forProfitJeopardy, portfolioRiskCount, totalFines };
  }, [stateFacilities]);

  // Tab-specific facility subsets (before shared filters)
  const tabFacilities = useMemo(() => {
    if (!stateFacilities.length) return [];

    switch (activeTab) {
      case 'staffing':
        return stateFacilities.filter(f => (f.total_hprd || 0) < AG_THRESHOLDS.totalHprd);
      case 'zero-rn':
        return stateFacilities.filter(f => (f.zero_rn_pct || 0) > 0);
      case 'ownership': {
        // for-profit AND portfolio 5+ AND (jeopardy > 0 OR fines > $50K OR total_hprd < 3.48)
        return stateFacilities.filter(f => {
          if (f.ownership_type !== 'For profit') return false;
          if ((f.owner_portfolio_count || 0) < 5) return false;
          return (f.jeopardy_count || 0) > 0 || (f.total_fines || 0) > 50000 || (f.total_hprd || 0) < AG_THRESHOLDS.totalHprd;
        });
      }
      default:
        return [];
    }
  }, [stateFacilities, activeTab]);

  // Apply shared filters
  const filteredFacilities = useMemo(() => {
    let result = [...tabFacilities];

    if (filterOwnership !== 'all') {
      result = result.filter(f => f.ownership_type === filterOwnership);
    }

    if (filterMinRisk !== '' && !isNaN(Number(filterMinRisk))) {
      const minRisk = Number(filterMinRisk);
      result = result.filter(f => (f.composite || 0) >= minRisk);
    }

    if (filterJeopardy) {
      result = result.filter(f => (f.jeopardy_count || 0) > 0);
    }

    if (filterMinFines !== 'all') {
      const threshold = Number(filterMinFines);
      result = result.filter(f => (f.total_fines || 0) >= threshold);
    }

    return result;
  }, [tabFacilities, filterOwnership, filterMinRisk, filterJeopardy, filterMinFines]);

  // Sort
  const sortedFacilities = useMemo(() => {
    const list = [...filteredFacilities];

    // Default sort per tab if no explicit sort
    const effectiveSortBy = sortBy || getDefaultSort(activeTab);

    list.sort((a, b) => {
      let aVal, bVal;

      switch (effectiveSortBy) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case 'city':
          aVal = a.city || '';
          bVal = b.city || '';
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case 'owner':
          aVal = a.worst_owner || a.chain_name || '';
          bVal = b.worst_owner || b.chain_name || '';
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case 'total_hprd':
          aVal = a.total_hprd || 0; bVal = b.total_hprd || 0; break;
        case 'hprd_gap':
          aVal = AG_THRESHOLDS.totalHprd - (a.total_hprd || 0);
          bVal = AG_THRESHOLDS.totalHprd - (b.total_hprd || 0);
          break;
        case 'rn_hprd':
          aVal = a.rn_hprd || 0; bVal = b.rn_hprd || 0; break;
        case 'cna_hprd':
          aVal = a.cna_hprd || 0; bVal = b.cna_hprd || 0; break;
        case 'stars':
          aVal = a.stars || 0; bVal = b.stars || 0; break;
        case 'jeopardy':
          aVal = a.jeopardy_count || 0; bVal = b.jeopardy_count || 0; break;
        case 'fines':
          aVal = a.total_fines || 0; bVal = b.total_fines || 0; break;
        case 'zero_rn_pct':
          aVal = a.zero_rn_pct || 0; bVal = b.zero_rn_pct || 0; break;
        case 'weekend_rn_hprd':
          aVal = a.weekend_rn_hprd || 0; bVal = b.weekend_rn_hprd || 0; break;
        case 'composite':
          aVal = a.composite || 0; bVal = b.composite || 0; break;
        case 'portfolio':
          aVal = a.owner_portfolio_count || 0; bVal = b.owner_portfolio_count || 0; break;
        default:
          return 0;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return list;
  }, [filteredFacilities, sortBy, sortOrder, activeTab]);

  // Tab counts (unfiltered per-tab)
  const tabCounts = useMemo(() => {
    if (!stateFacilities.length) return { staffing: 0, 'zero-rn': 0, ownership: 0 };
    return {
      staffing: stateFacilities.filter(f => (f.total_hprd || 0) < AG_THRESHOLDS.totalHprd).length,
      'zero-rn': stateFacilities.filter(f => (f.zero_rn_pct || 0) > 0).length,
      ownership: stateFacilities.filter(f =>
        f.ownership_type === 'For profit' && (f.owner_portfolio_count || 0) >= 5 &&
        ((f.jeopardy_count || 0) > 0 || (f.total_fines || 0) > 50000 || (f.total_hprd || 0) < AG_THRESHOLDS.totalHprd)
      ).length,
    };
  }, [stateFacilities]);

  function getDefaultSort(tab) {
    switch (tab) {
      case 'staffing': return 'hprd_gap';
      case 'zero-rn': return 'zero_rn_pct';
      case 'ownership': return 'composite';
      default: return 'composite';
    }
  }

  function handleSort(column) {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'name' || column === 'city' || column === 'owner' ? 'asc' : 'desc');
    }
  }

  function sortIndicator(column) {
    if (sortBy !== column) return '';
    return sortOrder === 'asc' ? ' \u2191' : ' \u2193';
  }

  // Format helpers
  function formatCurrency(amount) {
    if (!amount) return '$0';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
    return `$${amount.toLocaleString()}`;
  }

  function renderStars(count) {
    const s = [];
    for (let i = 0; i < 5; i++) s.push(i < count ? '\u2605' : '\u2606');
    return s.join('');
  }

  function hprdClass(actual, target) {
    return actual >= target ? 'ag-toolkit-hprd-pass' : 'ag-toolkit-hprd-fail';
  }

  // CSV export
  function triggerCSVDownload() {
    if (!sortedFacilities.length) return;

    let headers, rows;
    const tabLabel = TABS.find(t => t.id === activeTab)?.label || activeTab;

    switch (activeTab) {
      case 'staffing':
        headers = ['Rank', 'Facility', 'CCN', 'City', 'Owner', 'Total HPRD', 'Target HPRD', 'RN HPRD', 'RN Target', 'CNA HPRD', 'CNA Target', 'Stars', 'Jeopardy Count', 'Total Fines'];
        rows = sortedFacilities.map((f, i) => [
          i + 1, f.name, f.ccn, f.city, f.worst_owner || '', (f.total_hprd || 0).toFixed(2), AG_THRESHOLDS.totalHprd,
          (f.rn_hprd || 0).toFixed(2), AG_THRESHOLDS.rnHprd, (f.cna_hprd || 0).toFixed(2), AG_THRESHOLDS.cnaHprd,
          f.stars || 0, f.jeopardy_count || 0, f.total_fines || 0
        ]);
        break;
      case 'zero-rn':
        headers = ['Rank', 'Facility', 'CCN', 'City', 'Owner', 'Zero-RN Days %', 'Weekend RN HPRD', 'Total HPRD', 'Jeopardy Count', 'Stars', 'Total Fines'];
        rows = sortedFacilities.map((f, i) => [
          i + 1, f.name, f.ccn, f.city, f.worst_owner || '', (f.zero_rn_pct || 0).toFixed(1),
          (f.weekend_rn_hprd || 0).toFixed(2), (f.total_hprd || 0).toFixed(2),
          f.jeopardy_count || 0, f.stars || 0, f.total_fines || 0
        ]);
        break;
      case 'ownership':
        headers = ['Rank', 'Facility', 'CCN', 'Owner', 'Portfolio Size', 'Risk Score', 'Stars', 'Total HPRD', 'Zero-RN %', 'Jeopardy Count', 'Total Fines'];
        rows = sortedFacilities.map((f, i) => [
          i + 1, f.name, f.ccn, f.worst_owner || '', f.owner_portfolio_count || 0,
          (f.composite || 0).toFixed(1), f.stars || 0, (f.total_hprd || 0).toFixed(2),
          (f.zero_rn_pct || 0).toFixed(1), f.jeopardy_count || 0, f.total_fines || 0
        ]);
        break;
      default:
        return;
    }

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AGToolkit_${US_STATES[selectedState].replace(/\s/g, '_')}_${tabLabel.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportClick() {
    setShowModal(true);
  }

  function handleModalSubmit() {
    setShowModal(false);
    triggerCSVDownload();
  }

  // Loading / error states
  if (loading) {
    return (
      <div className="ag-toolkit-page">
        <div className="ag-toolkit-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading facility data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ag-toolkit-page">
        <div className="ag-toolkit-error">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Render table rows based on active tab
  function renderTableHead() {
    switch (activeTab) {
      case 'staffing':
        return (
          <tr>
            <th>Rank</th>
            <th className="sortable" onClick={() => handleSort('name')}>Facility{sortIndicator('name')}</th>
            <th className="sortable hide-mobile" onClick={() => handleSort('city')}>City{sortIndicator('city')}</th>
            <th className="sortable hide-mobile" onClick={() => handleSort('owner')}>Owner{sortIndicator('owner')}</th>
            <th className="sortable" onClick={() => handleSort('total_hprd')}>Total HPRD{sortIndicator('total_hprd')}</th>
            <th className="sortable" onClick={() => handleSort('rn_hprd')}>RN HPRD{sortIndicator('rn_hprd')}</th>
            <th className="sortable hide-mobile" onClick={() => handleSort('cna_hprd')}>CNA HPRD{sortIndicator('cna_hprd')}</th>
            <th className="sortable" onClick={() => handleSort('stars')}>Stars{sortIndicator('stars')}</th>
            <th className="sortable hide-mobile" onClick={() => handleSort('jeopardy')}>Jeopardy{sortIndicator('jeopardy')}</th>
            <th className="sortable" onClick={() => handleSort('fines')}>Fines{sortIndicator('fines')}</th>
          </tr>
        );
      case 'zero-rn':
        return (
          <tr>
            <th>Rank</th>
            <th className="sortable" onClick={() => handleSort('name')}>Facility{sortIndicator('name')}</th>
            <th className="sortable hide-mobile" onClick={() => handleSort('city')}>City{sortIndicator('city')}</th>
            <th className="sortable hide-mobile" onClick={() => handleSort('owner')}>Owner{sortIndicator('owner')}</th>
            <th className="sortable" onClick={() => handleSort('zero_rn_pct')}>Zero-RN Days{sortIndicator('zero_rn_pct')}</th>
            <th className="sortable hide-mobile" onClick={() => handleSort('weekend_rn_hprd')}>Wknd RN HPRD{sortIndicator('weekend_rn_hprd')}</th>
            <th className="sortable" onClick={() => handleSort('total_hprd')}>Total HPRD{sortIndicator('total_hprd')}</th>
            <th className="sortable hide-mobile" onClick={() => handleSort('jeopardy')}>Jeopardy{sortIndicator('jeopardy')}</th>
            <th className="sortable" onClick={() => handleSort('stars')}>Stars{sortIndicator('stars')}</th>
            <th className="sortable" onClick={() => handleSort('fines')}>Fines{sortIndicator('fines')}</th>
          </tr>
        );
      case 'ownership':
        return (
          <tr>
            <th>Rank</th>
            <th className="sortable" onClick={() => handleSort('name')}>Facility{sortIndicator('name')}</th>
            <th className="sortable hide-mobile" onClick={() => handleSort('owner')}>Owner{sortIndicator('owner')}</th>
            <th className="sortable" onClick={() => handleSort('portfolio')}>Portfolio{sortIndicator('portfolio')}</th>
            <th className="sortable" onClick={() => handleSort('composite')}>Risk Score{sortIndicator('composite')}</th>
            <th className="sortable" onClick={() => handleSort('stars')}>Stars{sortIndicator('stars')}</th>
            <th className="sortable" onClick={() => handleSort('total_hprd')}>Total HPRD{sortIndicator('total_hprd')}</th>
            <th className="sortable hide-mobile" onClick={() => handleSort('zero_rn_pct')}>Zero-RN %{sortIndicator('zero_rn_pct')}</th>
            <th className="sortable hide-mobile" onClick={() => handleSort('jeopardy')}>Jeopardy{sortIndicator('jeopardy')}</th>
            <th className="sortable" onClick={() => handleSort('fines')}>Fines{sortIndicator('fines')}</th>
          </tr>
        );
      default:
        return null;
    }
  }

  function renderTableRow(f, index) {
    switch (activeTab) {
      case 'staffing':
        return (
          <tr key={f.ccn}>
            <td className="ag-toolkit-rank">{index + 1}</td>
            <td>
              <button className="ag-toolkit-facility-link" onClick={() => navigate(`/facility/${f.ccn}`)}>
                {f.name}
              </button>
            </td>
            <td className="hide-mobile">{f.city}</td>
            <td className="ag-toolkit-owner hide-mobile">{f.worst_owner || f.chain_name || '\u2014'}</td>
            <td className="ag-toolkit-hprd-cell">
              <span className={hprdClass(f.total_hprd || 0, AG_THRESHOLDS.totalHprd)}>
                {(f.total_hprd || 0).toFixed(2)}
              </span>
              <span className="ag-toolkit-flag-no"> / {AG_THRESHOLDS.totalHprd}</span>
            </td>
            <td className="ag-toolkit-hprd-cell">
              <span className={hprdClass(f.rn_hprd || 0, AG_THRESHOLDS.rnHprd)}>
                {(f.rn_hprd || 0).toFixed(2)}
              </span>
              <span className="ag-toolkit-flag-no"> / {AG_THRESHOLDS.rnHprd}</span>
            </td>
            <td className="ag-toolkit-hprd-cell hide-mobile">
              <span className={hprdClass(f.cna_hprd || 0, AG_THRESHOLDS.cnaHprd)}>
                {(f.cna_hprd || 0).toFixed(2)}
              </span>
              <span className="ag-toolkit-flag-no"> / {AG_THRESHOLDS.cnaHprd}</span>
            </td>
            <td className="ag-toolkit-stars">{renderStars(f.stars || 0)}</td>
            <td className="hide-mobile">
              {(f.jeopardy_count || 0) > 0 ? (
                <span className="ag-toolkit-flag-yes">{f.jeopardy_count}</span>
              ) : (
                <span className="ag-toolkit-flag-no">{'\u2014'}</span>
              )}
            </td>
            <td className="ag-toolkit-fines">{formatCurrency(f.total_fines || 0)}</td>
          </tr>
        );
      case 'zero-rn':
        return (
          <tr key={f.ccn}>
            <td className="ag-toolkit-rank">{index + 1}</td>
            <td>
              <button className="ag-toolkit-facility-link" onClick={() => navigate(`/facility/${f.ccn}`)}>
                {f.name}
              </button>
            </td>
            <td className="hide-mobile">{f.city}</td>
            <td className="ag-toolkit-owner hide-mobile">{f.worst_owner || f.chain_name || '\u2014'}</td>
            <td>
              <div className="ag-toolkit-zero-rn-bar">
                <div className="ag-toolkit-zero-rn-track">
                  <div className="ag-toolkit-zero-rn-fill" style={{ width: `${Math.min(f.zero_rn_pct || 0, 100)}%` }} />
                </div>
                <span className="ag-toolkit-zero-rn-value">{(f.zero_rn_pct || 0).toFixed(1)}%</span>
              </div>
            </td>
            <td className="ag-toolkit-hprd-cell hide-mobile">{(f.weekend_rn_hprd || 0).toFixed(2)}</td>
            <td className="ag-toolkit-hprd-cell">
              <span className={hprdClass(f.total_hprd || 0, AG_THRESHOLDS.totalHprd)}>
                {(f.total_hprd || 0).toFixed(2)}
              </span>
            </td>
            <td className="hide-mobile">
              {(f.jeopardy_count || 0) > 0 ? (
                <span className="ag-toolkit-flag-yes">{f.jeopardy_count}</span>
              ) : (
                <span className="ag-toolkit-flag-no">{'\u2014'}</span>
              )}
            </td>
            <td className="ag-toolkit-stars">{renderStars(f.stars || 0)}</td>
            <td className="ag-toolkit-fines">{formatCurrency(f.total_fines || 0)}</td>
          </tr>
        );
      case 'ownership':
        return (
          <tr key={f.ccn}>
            <td className="ag-toolkit-rank">{index + 1}</td>
            <td>
              <button className="ag-toolkit-facility-link" onClick={() => navigate(`/facility/${f.ccn}`)}>
                {f.name}
              </button>
            </td>
            <td className="ag-toolkit-owner hide-mobile">{f.worst_owner || f.chain_name || '\u2014'}</td>
            <td className="ag-toolkit-mono">{f.owner_portfolio_count || 0}</td>
            <td>
              <span className={`screening-risk-badge ${getRiskBadgeClass(f.composite || 0)}`}>
                {(f.composite || 0).toFixed(1)}
              </span>
            </td>
            <td className="ag-toolkit-stars">{renderStars(f.stars || 0)}</td>
            <td className="ag-toolkit-hprd-cell">
              <span className={hprdClass(f.total_hprd || 0, AG_THRESHOLDS.totalHprd)}>
                {(f.total_hprd || 0).toFixed(2)}
              </span>
            </td>
            <td className="hide-mobile">
              {(f.zero_rn_pct || 0) > 0 ? (
                <span className="ag-toolkit-flag-yes">{(f.zero_rn_pct || 0).toFixed(1)}%</span>
              ) : (
                <span className="ag-toolkit-flag-no">{'\u2014'}</span>
              )}
            </td>
            <td className="hide-mobile">
              {(f.jeopardy_count || 0) > 0 ? (
                <span className="ag-toolkit-flag-yes">{f.jeopardy_count}</span>
              ) : (
                <span className="ag-toolkit-flag-no">{'\u2014'}</span>
              )}
            </td>
            <td className="ag-toolkit-fines">{formatCurrency(f.total_fines || 0)}</td>
          </tr>
        );
      default:
        return null;
    }
  }

  function getRiskBadgeClass(score) {
    if (score >= 60) return 'risk-critical';
    if (score >= 40) return 'risk-high';
    if (score >= 20) return 'risk-moderate';
    return 'risk-low';
  }

  return (
    <div className="ag-toolkit-page">
      {/* Header */}
      <div className="ag-toolkit-header" ref={headerRef}>
        <h1>Attorney General Screening Toolkit</h1>
        <p className="ag-toolkit-subtitle">
          Enforcement-ready analysis of nursing home staffing violations
        </p>
        <div className="ag-toolkit-context">
          On February 2, 2026, <strong>18 state Attorneys General</strong> wrote to CMS urging minimum staffing
          standards of <strong>3.48 hours per resident day (HPRD)</strong> for for-profit nursing homes, after CMS
          repealed the federal staffing mandate. This toolkit identifies facilities in your state that fail
          that threshold, have zero-RN days, or show systemic ownership patterns requiring enforcement attention.
        </div>
      </div>

      {/* State Selector */}
      <div className="ag-toolkit-selector">
        <label htmlFor="ag-state-select" className="ag-toolkit-label">Select State:</label>
        <select
          id="ag-state-select"
          className="ag-toolkit-select"
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
          {/* 6 Summary Stats */}
          <div className="ag-toolkit-stats" ref={statsRef}>
            <div className="ag-toolkit-stat-card">
              <div className="ag-toolkit-stat-value">{stats.total}</div>
              <div className="ag-toolkit-stat-label">Total Facilities</div>
            </div>
            <div className="ag-toolkit-stat-card">
              <div className="ag-toolkit-stat-value stat-danger">{stats.belowThreshold}</div>
              <div className="ag-toolkit-stat-label">Below 3.48 HPRD</div>
            </div>
            <div className="ag-toolkit-stat-card">
              <div className="ag-toolkit-stat-value stat-danger">{stats.zeroRn}</div>
              <div className="ag-toolkit-stat-label">Zero-RN Violators</div>
            </div>
            <div className="ag-toolkit-stat-card">
              <div className="ag-toolkit-stat-value stat-warning">{stats.forProfitJeopardy}</div>
              <div className="ag-toolkit-stat-label">For-Profit + Jeopardy</div>
            </div>
            <div className="ag-toolkit-stat-card">
              <div className="ag-toolkit-stat-value stat-warning">{stats.portfolioRiskCount}</div>
              <div className="ag-toolkit-stat-label">Portfolio Risk Operators</div>
            </div>
            <div className="ag-toolkit-stat-card">
              <div className="ag-toolkit-stat-value">{formatCurrency(stats.totalFines)}</div>
              <div className="ag-toolkit-stat-label">Total Fines</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="ag-toolkit-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`ag-toolkit-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                <span className="ag-toolkit-tab-count">{tabCounts[tab.id]}</span>
              </button>
            ))}
          </div>

          {/* Shared Filters */}
          <div className="ag-toolkit-filters">
            <div className="ag-toolkit-filter-group">
              <label>Ownership:</label>
              <select value={filterOwnership} onChange={(e) => setFilterOwnership(e.target.value)}>
                <option value="all">All</option>
                <option value="For profit">For-profit</option>
                <option value="Non profit">Non-profit</option>
                <option value="Government">Government</option>
              </select>
            </div>

            <div className="ag-toolkit-filter-group">
              <label>Min Risk:</label>
              <input
                type="number"
                value={filterMinRisk}
                onChange={(e) => setFilterMinRisk(e.target.value)}
                placeholder="0"
                min="0"
                max="100"
              />
            </div>

            <div className="ag-toolkit-filter-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={filterJeopardy}
                  onChange={(e) => setFilterJeopardy(e.target.checked)}
                />
                <span>Jeopardy citations</span>
              </label>
            </div>

            <div className="ag-toolkit-filter-group">
              <label>Min Fines:</label>
              <select value={filterMinFines} onChange={(e) => setFilterMinFines(e.target.value)}>
                <option value="all">All</option>
                <option value="10000">$10K+</option>
                <option value="50000">$50K+</option>
                <option value="100000">$100K+</option>
                <option value="500000">$500K+</option>
              </select>
            </div>
          </div>

          {/* Result Count + Export */}
          <div className="ag-toolkit-table-header">
            <div className="ag-toolkit-result-count">
              Showing {sortedFacilities.length} of {tabCounts[activeTab]} facilities
            </div>
            <button className="ag-toolkit-export-btn" onClick={handleExportClick} disabled={!sortedFacilities.length}>
              Export State Report
            </button>
          </div>

          {/* Table */}
          {sortedFacilities.length > 0 ? (
            <div className="ag-toolkit-table-wrapper">
              <table className="ag-toolkit-table">
                <thead>{renderTableHead()}</thead>
                <tbody>
                  {sortedFacilities.map((f, i) => renderTableRow(f, i))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ag-toolkit-empty">
              <p>No facilities match your current filters.</p>
            </div>
          )}

          {/* Data Source */}
          <div className="ag-toolkit-data-source">
            Data: CMS Payroll-Based Journal (PBJ) Q3 2025 | Health Deficiencies 2017-2025 | Penalties Jan 2023-Dec 2025 | Provider Info Jan 1, 2026
          </div>

          {/* Disclaimer */}
          <div className="ag-toolkit-disclaimer">
            This toolkit is for informational purposes only and does not constitute legal advice. All data is derived
            from publicly available CMS sources. Verify all information through official channels before taking
            enforcement action. Contact your state survey agency or HHS OIG at tips.hhs.gov for additional guidance.
          </div>
        </>
      )}

      {/* Email Capture Modal */}
      {showModal && (
        <EmailCaptureModal
          state={US_STATES[selectedState] || ''}
          onSubmit={handleModalSubmit}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
