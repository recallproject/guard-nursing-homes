import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { useFacilityData } from '../hooks/useFacilityData';
import '../styles/trends.css';

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

export function TrendsPage() {
  const { data, getAllFacilities, loading, error } = useFacilityData();
  const [sortBy, setSortBy] = useState('risk');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAllStates, setShowAllStates] = useState(false);
  const [stateSearch, setStateSearch] = useState('');

  const headerRef = useRef(null);
  const snapshotRef = useRef(null);
  const stateTableRef = useRef(null);
  const trendsRef = useRef(null);

  // Animate on mount
  useEffect(() => {
    const tl = gsap.timeline();

    if (headerRef.current) {
      tl.fromTo(
        headerRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    }

    if (snapshotRef.current) {
      tl.fromTo(
        snapshotRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' },
        '-=0.3'
      );
    }

    if (stateTableRef.current) {
      tl.fromTo(
        stateTableRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' },
        '-=0.2'
      );
    }

    if (trendsRef.current) {
      tl.fromTo(
        trendsRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
        '-=0.2'
      );
    }
  }, []);

  if (loading) {
    return (
      <div className="trends-page">
        <div className="trends-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading trend data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trends-page">
        <div className="trends-error">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const facilities = getAllFacilities;

  // Calculate national stats
  const totalFacilities = facilities.length;
  const avgRisk = totalFacilities > 0
    ? (facilities.reduce((sum, f) => sum + (f.composite || 0), 0) / totalFacilities).toFixed(1)
    : '0.0';
  const avgStars = totalFacilities > 0
    ? (facilities.reduce((sum, f) => sum + (f.stars || 0), 0) / totalFacilities).toFixed(1)
    : '0.0';
  const seriousHarmPct = totalFacilities > 0
    ? ((facilities.filter(f => (f.jeopardy_count || 0) > 0).length / totalFacilities) * 100).toFixed(1)
    : '0.0';
  const staffingDiscrepancyPct = totalFacilities > 0
    ? ((facilities.filter(f => (f.rn_gap_pct || 0) > 25).length / totalFacilities) * 100).toFixed(1)
    : '0.0';
  const zeroRnPct = totalFacilities > 0
    ? ((facilities.filter(f => (f.zero_rn_pct || 0) > 20).length / totalFacilities) * 100).toFixed(1)
    : '0.0';
  const totalFines = facilities.reduce((sum, f) => sum + (f.total_fines || 0), 0);
  const avgDeficiencies = totalFacilities > 0
    ? (facilities.reduce((sum, f) => sum + (f.total_deficiencies || 0), 0) / totalFacilities).toFixed(1)
    : '0.0';

  // Calculate state-level stats
  const stateStats = {};
  facilities.forEach(facility => {
    const state = facility.state;
    if (!stateStats[state]) {
      stateStats[state] = {
        count: 0,
        totalRisk: 0,
        totalStars: 0,
        seriousHarm: 0,
        totalFines: 0
      };
    }
    stateStats[state].count++;
    stateStats[state].totalRisk += (facility.composite || 0);
    stateStats[state].totalStars += (facility.stars || 0);
    if ((facility.jeopardy_count || 0) > 0) {
      stateStats[state].seriousHarm++;
    }
    stateStats[state].totalFines += (facility.total_fines || 0);
  });

  // Convert to array and calculate averages
  const stateArray = Object.entries(stateStats).map(([code, stats]) => ({
    code,
    name: US_STATES[code] || code,
    facilities: stats.count,
    avgRisk: (stats.totalRisk / stats.count).toFixed(1),
    avgStars: (stats.totalStars / stats.count).toFixed(1),
    seriousHarmPct: ((stats.seriousHarm / stats.count) * 100).toFixed(1),
    avgFines: stats.totalFines > 0 ? (stats.totalFines / stats.count) : 0
  }));

  // Sort state array
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'name' ? 'asc' : 'desc');
    }
  };

  const sortedStates = [...stateArray].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'name':
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      case 'facilities':
        aVal = a.facilities;
        bVal = b.facilities;
        break;
      case 'risk':
        aVal = parseFloat(a.avgRisk);
        bVal = parseFloat(b.avgRisk);
        break;
      case 'stars':
        aVal = parseFloat(a.avgStars);
        bVal = parseFloat(b.avgStars);
        break;
      case 'danger':
        aVal = parseFloat(a.seriousHarmPct);
        bVal = parseFloat(b.seriousHarmPct);
        break;
      case 'fines':
        aVal = a.avgFines;
        bVal = b.avgFines;
        break;
      default:
        return 0;
    }
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  // Identify top 5 worst states by risk
  const top5Worst = [...stateArray]
    .sort((a, b) => parseFloat(b.avgRisk) - parseFloat(a.avgRisk))
    .slice(0, 5)
    .map(s => s.code);

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${Math.round(amount).toLocaleString()}`;
  };

  // Calculate national quarterly trends from facility staffing_trend data
  const quarterLabels = ['Q2 2024', 'Q3 2024', 'Q4 2024', 'Q3 2025'];
  const quarterlyNational = quarterLabels.map(q => {
    const vals = { rn_hprd: [], total_hprd: [], zero_rn_pct: [], contractor_pct: [] };
    facilities.forEach(fac => {
      const trend = fac.staffing_trend;
      if (!trend || !trend.quarters) return;
      const idx = trend.quarters.indexOf(q);
      if (idx === -1) return;
      if (trend.rn_hprd?.[idx] != null) vals.rn_hprd.push(trend.rn_hprd[idx]);
      if (trend.total_hprd?.[idx] != null) vals.total_hprd.push(trend.total_hprd[idx]);
      if (trend.zero_rn_pct?.[idx] != null) vals.zero_rn_pct.push(trend.zero_rn_pct[idx]);
      if (trend.contractor_pct?.[idx] != null) vals.contractor_pct.push(trend.contractor_pct[idx]);
    });
    const avg = arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    return {
      quarter: q,
      n: vals.rn_hprd.length,
      rn_hprd: avg(vals.rn_hprd),
      total_hprd: avg(vals.total_hprd),
      zero_rn_pct: avg(vals.zero_rn_pct),
      contractor_pct: avg(vals.contractor_pct),
    };
  });

  // Calculate staffing direction distribution
  const directionCounts = { improving: 0, stable: 0, declining: 0, unknown: 0 };
  facilities.forEach(fac => {
    const dir = fac.staffing_trend?.direction || fac.trend_direction || 'unknown';
    if (dir === 'improving') directionCounts.improving++;
    else if (dir === 'declining') directionCounts.declining++;
    else if (dir === 'stable') directionCounts.stable++;
    else directionCounts.unknown++;
  });
  const dirTotal = directionCounts.improving + directionCounts.stable + directionCounts.declining;

  // Aggregate penalty trends by year
  const penaltyByYear = {};
  facilities.forEach(fac => {
    if (!fac.penalty_timeline) return;
    fac.penalty_timeline.forEach(p => {
      const yr = p.date?.substring(0, 4);
      if (!yr || yr < '2023') return;
      if (!penaltyByYear[yr]) penaltyByYear[yr] = { count: 0, total: 0 };
      penaltyByYear[yr].count++;
      penaltyByYear[yr].total += (p.amount || 0);
    });
  });
  const penaltyYears = Object.keys(penaltyByYear).sort();
  const maxPenaltyTotal = Math.max(...penaltyYears.map(y => penaltyByYear[y].total), 1);

  // Determine which states to show
  const getDisplayStates = () => {
    // If searching, filter by search
    if (stateSearch.trim()) {
      return sortedStates.filter(s =>
        s.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(stateSearch.toLowerCase())
      );
    }
    // If expanded, show all
    if (showAllStates) return sortedStates;
    // Default: top 5 worst + top 5 best
    const byRisk = [...stateArray].sort((a, b) => parseFloat(b.avgRisk) - parseFloat(a.avgRisk));
    const worst5 = byRisk.slice(0, 5);
    const best5 = byRisk.slice(-5).reverse();
    return { worst5, best5 };
  };

  const displayStates = getDisplayStates();
  const isCompactView = !showAllStates && !stateSearch.trim();

  return (
    <div className="trends-page">
      <Helmet>
        <title>Industry Trends — National Nursing Home Snapshot | The Oversight Report</title>
        <meta name="description" content="National nursing home quality trends. Staffing levels, deficiency patterns, and penalty data across all 14,713 facilities." />
        <link rel="canonical" href="https://oversightreports.com/trends" />
      </Helmet>

      {/* Header */}
      <div className="trends-header" ref={headerRef}>
        <h1>Industry Trends</h1>
        <p className="trends-subtitle">National nursing home quality snapshot across {totalFacilities.toLocaleString()} facilities</p>
      </div>

      {/* Current Snapshot */}
      <div className="trends-section">
        <h2>Current Snapshot</h2>
        <div className="trends-snapshot-grid" ref={snapshotRef}>
          <div className="trends-snapshot-card">
            <div className="trends-snapshot-value">{totalFacilities.toLocaleString()}</div>
            <div className="trends-snapshot-label">Total Facilities</div>
          </div>
          <div className="trends-snapshot-card">
            <div className="trends-snapshot-value">{avgRisk}</div>
            <div className="trends-snapshot-label">Average Risk Score</div>
          </div>
          <div className="trends-snapshot-card">
            <div className="trends-snapshot-value">{avgStars}</div>
            <div className="trends-snapshot-label">Average Star Rating</div>
          </div>
          <div className="trends-snapshot-card">
            <div className="trends-snapshot-value trends-stat-danger">{seriousHarmPct}%</div>
            <div className="trends-snapshot-label">Serious Harm Citations</div>
          </div>
          <div className="trends-snapshot-card">
            <div className="trends-snapshot-value trends-stat-warning">{staffingDiscrepancyPct}%</div>
            <div className="trends-snapshot-label">Staffing Discrepancy</div>
          </div>
          <div className="trends-snapshot-card">
            <div className="trends-snapshot-value trends-stat-warning">{zeroRnPct}%</div>
            <div className="trends-snapshot-label">Zero-RN Days ({'>'}20%)</div>
          </div>
          <div className="trends-snapshot-card">
            <div className="trends-snapshot-value">{formatCurrency(totalFines)}</div>
            <div className="trends-snapshot-label">Total Fines (3yr)</div>
          </div>
          <div className="trends-snapshot-card">
            <div className="trends-snapshot-value">{avgDeficiencies}</div>
            <div className="trends-snapshot-label">Avg Deficiency Count</div>
          </div>
        </div>
      </div>

      {/* ====== TRENDS FIRST ====== */}
      <div className="trends-section" ref={trendsRef}>
        <h2>Staffing Trends by Quarter</h2>
        <p className="trends-section-subtitle">
          National averages across {quarterlyNational[0]?.n?.toLocaleString()}+ facilities with quarterly PBJ data
        </p>

        <div className="trends-charts-grid">
          {/* RN HPRD chart */}
          <div className="trends-chart-card">
            <h3 className="trends-chart-title">RN Hours Per Resident Day</h3>
            <div className="trends-bar-chart">
              {quarterlyNational.map((q, i) => {
                const maxVal = Math.max(...quarterlyNational.map(x => x.rn_hprd));
                const pct = maxVal > 0 ? (q.rn_hprd / maxVal) * 100 : 0;
                const isLatest = i === quarterlyNational.length - 1;
                return (
                  <div key={q.quarter} className="trends-bar-group">
                    <div className="trends-bar-value">{q.rn_hprd.toFixed(3)}</div>
                    <div className="trends-bar-track">
                      <div className={`trends-bar-fill ${isLatest ? 'bar-accent' : ''}`} style={{ height: `${pct}%` }} />
                    </div>
                    <div className="trends-bar-label">{q.quarter}</div>
                  </div>
                );
              })}
            </div>
            <p className="trends-chart-insight">
              +{(((quarterlyNational[quarterlyNational.length - 1]?.rn_hprd - quarterlyNational[0]?.rn_hprd) / quarterlyNational[0]?.rn_hprd) * 100).toFixed(1)}% since Q2 2024
            </p>
          </div>

          {/* Zero-RN chart */}
          <div className="trends-chart-card">
            <h3 className="trends-chart-title">Days with Zero RN Staffing</h3>
            <div className="trends-bar-chart">
              {quarterlyNational.map((q, i) => {
                const maxVal = Math.max(...quarterlyNational.map(x => x.zero_rn_pct));
                const pct = maxVal > 0 ? (q.zero_rn_pct / maxVal) * 100 : 0;
                const isLatest = i === quarterlyNational.length - 1;
                return (
                  <div key={q.quarter} className="trends-bar-group">
                    <div className="trends-bar-value">{q.zero_rn_pct.toFixed(1)}%</div>
                    <div className="trends-bar-track">
                      <div className={`trends-bar-fill bar-danger ${isLatest ? 'bar-accent-green' : ''}`} style={{ height: `${pct}%` }} />
                    </div>
                    <div className="trends-bar-label">{q.quarter}</div>
                  </div>
                );
              })}
            </div>
            <p className="trends-chart-insight">
              Dropped from {quarterlyNational[0]?.zero_rn_pct.toFixed(1)}% to {quarterlyNational[quarterlyNational.length - 1]?.zero_rn_pct.toFixed(1)}%
            </p>
          </div>

          {/* Direction distribution */}
          <div className="trends-chart-card">
            <h3 className="trends-chart-title">Staffing Trajectory</h3>
            <div className="trends-direction-bars">
              <div className="trends-direction-row">
                <span className="trends-direction-label trends-dir-improving">Improving</span>
                <div className="trends-direction-track">
                  <div className="trends-direction-fill dir-green" style={{ width: `${(directionCounts.improving / dirTotal * 100)}%` }} />
                </div>
                <span className="trends-direction-value">{(directionCounts.improving / dirTotal * 100).toFixed(0)}%</span>
              </div>
              <div className="trends-direction-row">
                <span className="trends-direction-label trends-dir-stable">Stable</span>
                <div className="trends-direction-track">
                  <div className="trends-direction-fill dir-amber" style={{ width: `${(directionCounts.stable / dirTotal * 100)}%` }} />
                </div>
                <span className="trends-direction-value">{(directionCounts.stable / dirTotal * 100).toFixed(0)}%</span>
              </div>
              <div className="trends-direction-row">
                <span className="trends-direction-label trends-dir-declining">Declining</span>
                <div className="trends-direction-track">
                  <div className="trends-direction-fill dir-red" style={{ width: `${(directionCounts.declining / dirTotal * 100)}%` }} />
                </div>
                <span className="trends-direction-value">{(directionCounts.declining / dirTotal * 100).toFixed(0)}%</span>
              </div>
            </div>
            <p className="trends-chart-insight">
              {directionCounts.declining.toLocaleString()} facilities declining staffing over 4 quarters
            </p>
          </div>

          {/* Penalty trends */}
          <div className="trends-chart-card">
            <h3 className="trends-chart-title">Penalty Enforcement</h3>
            <div className="trends-bar-chart trends-bar-chart-wide">
              {penaltyYears.map((yr, i) => {
                const pct = (penaltyByYear[yr].total / maxPenaltyTotal) * 100;
                const isLatest = i === penaltyYears.length - 1;
                return (
                  <div key={yr} className="trends-bar-group">
                    <div className="trends-bar-value">{formatCurrency(penaltyByYear[yr].total)}</div>
                    <div className="trends-bar-track">
                      <div className={`trends-bar-fill bar-penalty ${isLatest ? 'bar-accent' : ''}`} style={{ height: `${pct}%` }} />
                    </div>
                    <div className="trends-bar-label">{yr}</div>
                    <div className="trends-bar-sublabel">{penaltyByYear[yr].count.toLocaleString()} penalties</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ====== STATE COMPARISON — COMPACT ====== */}
      <div className="trends-section">
        <h2>State Comparison</h2>
        <p className="trends-section-subtitle">
          How does your state stack up? Top and bottom states by average risk score.
        </p>

        {/* State search */}
        <div className="trends-state-search">
          <input
            type="text"
            className="trends-state-search-input"
            placeholder="Search for a state..."
            value={stateSearch}
            onChange={(e) => { setStateSearch(e.target.value); setShowAllStates(false); }}
          />
        </div>

        <div className="trends-table-wrapper" ref={stateTableRef}>
          {isCompactView ? (
            <>
              {/* Worst 5 */}
              <div className="trends-compact-group">
                <h3 className="trends-compact-label trends-label-worst">Highest Risk States</h3>
                <table className="trends-table trends-table-compact">
                  <thead>
                    <tr>
                      <th>State</th>
                      <th>Facilities</th>
                      <th>Avg Risk</th>
                      <th>Avg Stars</th>
                      <th>% Serious Harm</th>
                      <th>Avg Fines</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayStates.worst5?.map(state => (
                      <tr key={state.code} className="trends-row-highlight">
                        <td className="trends-state-name">{state.name}</td>
                        <td className="mono">{state.facilities.toLocaleString()}</td>
                        <td>
                          <span className={`trends-risk-badge ${parseFloat(state.avgRisk) >= 40 ? 'risk-high' : parseFloat(state.avgRisk) >= 20 ? 'risk-moderate' : 'risk-low'}`}>
                            {state.avgRisk}
                          </span>
                        </td>
                        <td className="trends-stars">{state.avgStars}</td>
                        <td className="mono">{state.seriousHarmPct}%</td>
                        <td className="mono">{formatCurrency(state.avgFines)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Best 5 */}
              <div className="trends-compact-group">
                <h3 className="trends-compact-label trends-label-best">Lowest Risk States</h3>
                <table className="trends-table trends-table-compact">
                  <thead>
                    <tr>
                      <th>State</th>
                      <th>Facilities</th>
                      <th>Avg Risk</th>
                      <th>Avg Stars</th>
                      <th>% Serious Harm</th>
                      <th>Avg Fines</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayStates.best5?.map(state => (
                      <tr key={state.code}>
                        <td className="trends-state-name">{state.name}</td>
                        <td className="mono">{state.facilities.toLocaleString()}</td>
                        <td>
                          <span className={`trends-risk-badge ${parseFloat(state.avgRisk) >= 40 ? 'risk-high' : parseFloat(state.avgRisk) >= 20 ? 'risk-moderate' : 'risk-low'}`}>
                            {state.avgRisk}
                          </span>
                        </td>
                        <td className="trends-stars">{state.avgStars}</td>
                        <td className="mono">{state.seriousHarmPct}%</td>
                        <td className="mono">{formatCurrency(state.avgFines)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                className="trends-show-all-btn"
                onClick={() => setShowAllStates(true)}
              >
                Show all {stateArray.length} states
              </button>
            </>
          ) : (
            <>
              <table className="trends-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} className="sortable">
                      State {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('facilities')} className="sortable">
                      Facilities {sortBy === 'facilities' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('risk')} className="sortable">
                      Avg Risk {sortBy === 'risk' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('stars')} className="sortable">
                      Avg Stars {sortBy === 'stars' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('danger')} className="sortable">
                      % Serious Harm {sortBy === 'danger' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('fines')} className="sortable">
                      Avg Fines {sortBy === 'fines' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(displayStates) ? displayStates : sortedStates).map(state => (
                    <tr
                      key={state.code}
                      className={top5Worst.includes(state.code) ? 'trends-row-highlight' : ''}
                    >
                      <td className="trends-state-name">{state.name}</td>
                      <td className="mono">{state.facilities.toLocaleString()}</td>
                      <td>
                        <span className={`trends-risk-badge ${parseFloat(state.avgRisk) >= 40 ? 'risk-high' : parseFloat(state.avgRisk) >= 20 ? 'risk-moderate' : 'risk-low'}`}>
                          {state.avgRisk}
                        </span>
                      </td>
                      <td className="trends-stars">{state.avgStars}</td>
                      <td className="mono">{state.seriousHarmPct}%</td>
                      <td className="mono">{formatCurrency(state.avgFines)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {showAllStates && (
                <button
                  className="trends-show-all-btn"
                  onClick={() => setShowAllStates(false)}
                >
                  Show top & bottom only
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="screening-disclaimer" style={{ maxWidth: '1000px', margin: '2rem auto 3rem' }}>
        The Oversight Report identifies patterns and discrepancies in publicly available federal data. These indicators do not constitute evidence of wrongdoing. If you have concerns about a facility, contact your state survey agency or the HHS Office of Inspector General at <a href="https://tips.hhs.gov" target="_blank" rel="noopener noreferrer">tips.hhs.gov</a>.
      </div>
    </div>
  );
}
