import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { useFacilityData } from '../hooks/useFacilityData';
import { useSubscription, canAccess } from '../hooks/useSubscription';
import { UpgradePrompt } from '../components/UpgradePrompt';
import '../styles/chain-detail.css';

export function ChainDetailPage() {
  const { chainName } = useParams();
  const decodedChainName = decodeURIComponent(chainName);

  const [chainData, setChainData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('stars');
  const [sortDirection, setSortDirection] = useState('asc');
  const [ahcaData, setAhcaData] = useState(null);

  const { data: facilityData, loading: facilityLoading } = useFacilityData();
  const { tier } = useSubscription();

  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const tableRef = useRef(null);

  // Plausible: track chain page view
  useEffect(() => {
    if (chainData) {
      window.plausible && window.plausible('Chain-Page-View', {props: {chain: decodedChainName, facilityCount: String(chainData.facilityCount || '')}});
    }
  }, [chainData?.affiliatedEntity]);

  // Load AHCA data
  useEffect(() => {
    fetch('/data/ahca_board_chains.json')
      .then(r => r.json())
      .then(d => setAhcaData(d))
      .catch(() => {});
  }, []);

  // Load chain data
  useEffect(() => {
    fetch('/data/chain_performance.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load chain data');
        return res.json();
      })
      .then(data => {
        const chain = data.find(c => c.affiliatedEntity === decodedChainName);
        if (!chain) {
          throw new Error('Chain not found');
        }
        setChainData(chain);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [decodedChainName]);

  // Get all facilities belonging to this chain
  const chainFacilities = useMemo(() => {
    if (!facilityData || !chainData) return [];

    const facilities = [];
    for (const stateData of Object.values(facilityData.states || {})) {
      if (!stateData.facilities) continue;

      for (const facility of stateData.facilities) {
        if (facility.chain_name === decodedChainName) {
          facilities.push(facility);
        }
      }
    }

    return facilities;
  }, [facilityData, chainData, decodedChainName]);

  // Sort facilities
  const sortedFacilities = useMemo(() => {
    const sorted = [...chainFacilities];

    sorted.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        case 'city':
          aVal = a.city || '';
          bVal = b.city || '';
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        case 'state':
          aVal = a.state || '';
          bVal = b.state || '';
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        case 'stars':
          aVal = a.stars || 0;
          bVal = b.stars || 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        case 'hprd':
          aVal = a.total_hprd || 0;
          bVal = b.total_hprd || 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        case 'zero_rn':
          aVal = a.zero_rn_pct || 0;
          bVal = b.zero_rn_pct || 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        case 'fines':
          aVal = a.total_fines || 0;
          bVal = b.total_fines || 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        default:
          return 0;
      }
    });

    return sorted;
  }, [chainFacilities, sortBy, sortDirection]);

  // Compute chain summary stats
  const chainStats = useMemo(() => {
    if (chainFacilities.length === 0) {
      return {
        starDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        totalFines: 0,
        avgHPRD: 0,
        worstFacility: null,
        avgZeroRN: 0,
      };
    }

    const starDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalFines = 0;
    let totalHPRD = 0;
    let hprdCount = 0;
    let totalZeroRN = 0;
    let zeroRNCount = 0;
    let worstFacility = chainFacilities[0];

    for (const f of chainFacilities) {
      // Star distribution
      const stars = Math.round(f.stars || 0);
      if (stars >= 1 && stars <= 5) {
        starDist[stars]++;
      }

      // Total fines
      totalFines += f.total_fines || 0;

      // Avg HPRD
      if (f.total_hprd) {
        totalHPRD += f.total_hprd;
        hprdCount++;
      }

      // Avg Zero RN
      if (f.zero_rn_pct !== null && f.zero_rn_pct !== undefined) {
        totalZeroRN += f.zero_rn_pct;
        zeroRNCount++;
      }

      // Worst facility (lowest stars, highest fines)
      if ((f.stars || 0) < (worstFacility.stars || 0)) {
        worstFacility = f;
      } else if ((f.stars || 0) === (worstFacility.stars || 0) &&
                 (f.total_fines || 0) > (worstFacility.total_fines || 0)) {
        worstFacility = f;
      }
    }

    return {
      starDistribution: starDist,
      totalFines,
      avgHPRD: hprdCount > 0 ? totalHPRD / hprdCount : 0,
      worstFacility,
      avgZeroRN: zeroRNCount > 0 ? totalZeroRN / zeroRNCount : 0,
    };
  }, [chainFacilities]);

  // Animate on mount
  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    }
    if (statsRef.current && chainData) {
      gsap.fromTo(
        statsRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out', delay: 0.2 }
      );
    }
  }, [chainData]);

  // Animate table when sort changes
  useEffect(() => {
    if (tableRef.current) {
      const rows = tableRef.current.querySelectorAll('.facility-row');
      if (rows.length > 0) {
        gsap.fromTo(
          rows,
          { opacity: 0, x: -10 },
          { opacity: 1, x: 0, duration: 0.3, stagger: 0.01, ease: 'power2.out' }
        );
      }
    }
  }, [sortBy, sortDirection]);

  // Format currency
  const formatCurrency = (val) => {
    if (!val) return '$0';
    return '$' + Math.round(val).toLocaleString();
  };

  // Format percentage
  const pct = (val) => {
    if (val === null || val === undefined) return 'N/A';
    return val.toFixed(1) + '%';
  };

  // Render stars
  const renderStars = (rating) => {
    if (!rating) return <span className="stars-na">N/A</span>;
    const stars = Math.round(rating);
    const filled = '★'.repeat(stars);
    const empty = '☆'.repeat(5 - stars);
    return (
      <span className={`stars stars-${stars}`}>
        {filled}{empty} <span className="stars-num">{rating.toFixed(1)}</span>
      </span>
    );
  };

  // Get star color class
  const getStarClass = (stars) => {
    if (!stars || stars <= 2) return 'risk-critical';
    if (stars === 3) return 'risk-elevated';
    return 'risk-low';
  };

  // Get HPRD color class
  const getHPRDClass = (hprd) => {
    if (!hprd) return '';
    if (hprd < 3.5) return 'risk-critical';
    if (hprd < 4.1) return 'risk-elevated';
    return 'risk-low';
  };

  // Handle column header click
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection(column === 'stars' || column === 'hprd' ? 'asc' : 'desc');
    }
  };

  // Chain detail pages are free — data is public CMS records
  // Pro features (CSV export, alerts, bulk analysis) can be gated later
  const hasAccess = true;

  if (loading || facilityLoading) {
    return (
      <div className="chain-detail-page">
        <div className="chain-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading chain details...</div>
        </div>
      </div>
    );
  }

  if (error || !chainData) {
    return (
      <div className="chain-detail-page">
        <div className="chain-error">
          <h2>Chain Not Found</h2>
          <p>{error || 'Could not find chain data'}</p>
          <Link to="/chains" className="back-link">← Back to Chain Rankings</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="chain-detail-page">
      <Helmet>
        <title>{decodedChainName} — Chain Performance | The Oversight Report</title>
        <meta name="description" content={`${decodedChainName} nursing home chain performance data. ${chainData.numberOfFacilities} facilities across ${chainData.numberOfStatesAndTerritoriesWithOperations} states.`} />
        <link rel="canonical" href={`https://oversightreports.com/chain/${chainName}`} />
      </Helmet>
      {/* Breadcrumb */}
      <div className="chain-breadcrumb">
        <Link to="/chains">Chain Rankings</Link>
        <span className="breadcrumb-sep">/</span>
        <span>{decodedChainName}</span>
      </div>

      {/* Header */}
      <div className="chain-header" ref={headerRef}>
        <h1>{decodedChainName}</h1>
        <p className="chain-subtitle">
          Detailed performance analysis across all {chainFacilities.length} facilities
        </p>
      </div>

      {/* AHCA Board Connection */}
      {ahcaInfo && (
        <div className="ahca-callout">
          <div className="ahca-callout-header">
            <span className="ahca-icon">🏛</span>
            <strong>Industry Lobbying Connection</strong>
          </div>
          <p className="ahca-callout-body">
            <strong>{ahcaInfo.board_member}</strong> ({ahcaInfo.position}) serves on the Board of Governors of the American Health Care Association (AHCA), the nursing home industry's largest trade and lobbying organization.
          </p>
          <p className="ahca-callout-body">
            AHCA has spent over $17 million since 2020 lobbying on nursing home policy, including against federal staffing requirements.
          </p>
          <div className="ahca-metrics">
            <div className="ahca-metric">
              <span className="ahca-metric-label">This chain's RN staffing:</span>
              <span className="ahca-metric-value">{ahcaInfo.rn_hprd} hrs/resident/day</span>
            </div>
            <div className="ahca-metric">
              <span className="ahca-metric-label">National average:</span>
              <span className="ahca-metric-value">{ahcaInfo.national_avg_rn_hprd} hrs/resident/day</span>
            </div>
            <div className="ahca-metric">
              <span className="ahca-metric-label">Percentile:</span>
              <span className="ahca-metric-value">{ahcaInfo.rn_percentile}th among major chains</span>
            </div>
          </div>
          <p className="ahca-callout-source">
            Sources: {ahcaInfo.source} ·{' '}
            <a href="https://www.opensecrets.org/federal-lobbying/clients/summary?id=D000074188" target="_blank" rel="noopener noreferrer">OpenSecrets.org</a> ·{' '}
            <a href="https://www.fec.gov/data/committee/C00040998/" target="_blank" rel="noopener noreferrer">FEC.gov PAC records</a> ·{' '}
            <a href="https://data.cms.gov/provider-data/topics/nursing-homes/payroll-based-journal-daily-nurse-staffing" target="_blank" rel="noopener noreferrer">CMS PBJ staffing data</a>
          </p>
        </div>
      )}

      {/* Key Stats */}
      <div className="chain-stats" ref={statsRef}>
        <div className="stat-card">
          <div className="stat-label">Total Facilities</div>
          <div className="stat-value">{chainData.numberOfFacilities}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Stars</div>
          <div className={`stat-value ${getStarClass(chainData.averageOverall5StarRating)}`}>
            {chainData.averageOverall5StarRating?.toFixed(1) || 'N/A'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Fines</div>
          <div className="stat-value risk-critical">
            {formatCurrency(chainData.totalAmountOfFinesInDollars)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Abuse Citation %</div>
          <div className="stat-value risk-elevated">
            {chainData.percentageOfFacilitiesWithAnAbuseIcon?.toFixed(1) || 0}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Total HPRD</div>
          <div className={`stat-value ${getHPRDClass(chainData.averageTotalNurseHoursPerResidentDay)}`}>
            {chainData.averageTotalNurseHoursPerResidentDay?.toFixed(2) || 'N/A'}
          </div>
        </div>
      </div>

      {/* Chain Summary Section */}
      <div className="chain-summary">
        <h2>Chain Summary</h2>

        <div className="summary-grid">
          {/* Star Distribution */}
          <div className="summary-card">
            <h3>Star Rating Distribution</h3>
            <div className="distribution-chart">
              {[5, 4, 3, 2, 1].map(star => (
                <div key={star} className="distribution-row">
                  <span className={`stars stars-${star}`}>
                    {'★'.repeat(star)}{'☆'.repeat(5 - star)}
                  </span>
                  <div className="distribution-bar">
                    <div
                      className={`distribution-fill stars-${star}`}
                      style={{
                        width: `${chainFacilities.length > 0
                          ? (chainStats.starDistribution[star] / chainFacilities.length) * 100
                          : 0}%`
                      }}
                    ></div>
                  </div>
                  <span className="distribution-count">
                    {chainStats.starDistribution[star]} ({chainFacilities.length > 0
                      ? ((chainStats.starDistribution[star] / chainFacilities.length) * 100).toFixed(0)
                      : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="summary-card">
            <h3>Performance Metrics</h3>
            <div className="metric-list">
              <div className="metric-row">
                <span>Total Fines (All Facilities):</span>
                <span className="risk-critical">{formatCurrency(chainStats.totalFines)}</span>
              </div>
              <div className="metric-row">
                <span>Average Staffing (HPRD):</span>
                <span className={getHPRDClass(chainStats.avgHPRD)}>
                  {chainStats.avgHPRD.toFixed(2)}
                </span>
              </div>
              <div className="metric-row">
                <span>Average Zero-RN %:</span>
                <span className="risk-elevated">{chainStats.avgZeroRN.toFixed(1)}%</span>
              </div>
              <div className="metric-row">
                <span>States/Territories:</span>
                <span>{chainData.numberOfStatesAndTerritoriesWithOperations}</span>
              </div>
            </div>
          </div>

          {/* Worst Facility */}
          <div className="summary-card">
            <h3>Lowest Performing Facility</h3>
            {chainStats.worstFacility && (
              <div className="worst-facility">
                <Link
                  to={`/facility/${chainStats.worstFacility.ccn}`}
                  className="facility-link"
                >
                  <div className="worst-facility-name">{chainStats.worstFacility.name}</div>
                  <div className="worst-facility-location">
                    {chainStats.worstFacility.city}, {chainStats.worstFacility.state}
                  </div>
                </Link>
                <div className="worst-facility-stats">
                  <div className="worst-stat">
                    <span>Stars:</span>
                    <span className={getStarClass(chainStats.worstFacility.stars)}>
                      {renderStars(chainStats.worstFacility.stars)}
                    </span>
                  </div>
                  <div className="worst-stat">
                    <span>Fines:</span>
                    <span className="risk-critical">
                      {formatCurrency(chainStats.worstFacility.total_fines)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* All Facilities Table */}
      <div className="chain-facilities">
        <div className="facilities-header">
          <h2>All Facilities ({chainFacilities.length})</h2>
          <div className="facilities-hint">
            Click column headers to sort
          </div>
        </div>

        <div className="facilities-table-container" ref={tableRef}>
          <table className="facilities-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="sortable">
                  Facility Name {sortBy === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('city')} className="sortable hide-mobile">
                  City {sortBy === 'city' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('state')} className="sortable">
                  State {sortBy === 'state' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('stars')} className="sortable">
                  Stars {sortBy === 'stars' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('hprd')} className="sortable hide-mobile">
                  Total HPRD {sortBy === 'hprd' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('zero_rn')} className="sortable hide-mobile">
                  Zero-RN % {sortBy === 'zero_rn' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('fines')} className="sortable">
                  Fines {sortBy === 'fines' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedFacilities.map((facility) => (
                <tr key={facility.ccn} className="facility-row">
                  <td className="facility-name-cell">
                    <Link to={`/facility/${facility.ccn}`} className="facility-link">
                      {facility.name}
                    </Link>
                  </td>
                  <td className="hide-mobile">{facility.city}</td>
                  <td>{facility.state}</td>
                  <td className={getStarClass(facility.stars)}>
                    {renderStars(facility.stars)}
                  </td>
                  <td className={`hide-mobile ${getHPRDClass(facility.total_hprd)}`}>
                    {facility.total_hprd ? facility.total_hprd.toFixed(2) : 'N/A'}
                  </td>
                  <td className="hide-mobile">
                    {pct(facility.zero_rn_pct)}
                  </td>
                  <td className={facility.total_fines > 0 ? 'risk-critical' : ''}>
                    {formatCurrency(facility.total_fines)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Sources */}
      <div className="chain-disclaimer">
        <p className="chain-disclaimer-title">Data Sources</p>
        <p>
          Chain-level data from{' '}
          <a href="https://data.cms.gov/provider-data/dataset/4pq5-n9py" target="_blank" rel="noopener noreferrer">CMS Affiliated Entity Performance Measures</a> (February 2025).{' '}
          Facility-level staffing from{' '}
          <a href="https://data.cms.gov/provider-data/topics/nursing-homes/payroll-based-journal-daily-nurse-staffing" target="_blank" rel="noopener noreferrer">CMS Payroll-Based Journal</a>.{' '}
          Inspection and enforcement data from{' '}
          <a href="https://data.cms.gov/provider-data/topics/nursing-homes/health-deficiencies" target="_blank" rel="noopener noreferrer">CMS Health Deficiencies</a> and{' '}
          <a href="https://data.cms.gov/provider-data/topics/nursing-homes/penalties" target="_blank" rel="noopener noreferrer">CMS Penalties</a>.{' '}
          Star ratings from{' '}
          <a href="https://data.cms.gov/provider-data/topics/nursing-homes" target="_blank" rel="noopener noreferrer">CMS Care Compare</a>.{' '}
          Individual facility quality may vary significantly within a chain.
        </p>
      </div>
    </div>
  );
}
