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
  const [notifyEmail, setNotifyEmail] = useState('');

  const headerRef = useRef(null);
  const snapshotRef = useRef(null);
  const stateTableRef = useRef(null);
  const comingSoonRef = useRef(null);

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

    if (comingSoonRef.current) {
      tl.fromTo(
        comingSoonRef.current,
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
  const seriousDangerPct = totalFacilities > 0
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
        seriousDanger: 0,
        totalFines: 0
      };
    }
    stateStats[state].count++;
    stateStats[state].totalRisk += (facility.composite || 0);
    stateStats[state].totalStars += (facility.stars || 0);
    if ((facility.jeopardy_count || 0) > 0) {
      stateStats[state].seriousDanger++;
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
    seriousDangerPct: ((stats.seriousDanger / stats.count) * 100).toFixed(1),
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
        aVal = parseFloat(a.seriousDangerPct);
        bVal = parseFloat(b.seriousDangerPct);
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
    return `$${amount.toLocaleString()}`;
  };

  const handleNotifySubmit = (e) => {
    e.preventDefault();
    window.open('https://docs.google.com/forms/d/e/1FAIpQLSeBTqx33UcwI5WWWpas9b_UifCaSMStQyQZNxtuEsvh-hPg7w/viewform', '_blank');
    setNotifyEmail('');
  };

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
        <p className="trends-subtitle">National nursing home quality snapshot</p>
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
            <div className="trends-snapshot-value trends-stat-danger">{seriousDangerPct}%</div>
            <div className="trends-snapshot-label">Serious Danger Citations</div>
          </div>
          <div className="trends-snapshot-card">
            <div className="trends-snapshot-value trends-stat-warning">{staffingDiscrepancyPct}%</div>
            <div className="trends-snapshot-label">Staffing Discrepancy</div>
          </div>
          <div className="trends-snapshot-card">
            <div className="trends-snapshot-value trends-stat-warning">{zeroRnPct}%</div>
            <div className="trends-snapshot-label">Zero-RN Days (&gt;20%)</div>
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

      {/* State Comparison */}
      <div className="trends-section">
        <h2>State Comparison</h2>
        <p className="trends-section-subtitle">
          Ranked by average risk score — facilities vary widely by state
        </p>
        <div className="trends-table-wrapper" ref={stateTableRef}>
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
                  % Serious Danger {sortBy === 'danger' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('fines')} className="sortable">
                  Avg Fines {sortBy === 'fines' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStates.map(state => (
                <tr
                  key={state.code}
                  className={top5Worst.includes(state.code) ? 'trends-row-highlight' : ''}
                >
                  <td className="trends-state-name">{state.name}</td>
                  <td className="mono">{state.facilities.toLocaleString()}</td>
                  <td>
                    <span className={`trends-risk-badge ${
                      parseFloat(state.avgRisk) >= 40 ? 'risk-high' :
                      parseFloat(state.avgRisk) >= 20 ? 'risk-moderate' :
                      'risk-low'
                    }`}>
                      {state.avgRisk}
                    </span>
                  </td>
                  <td className="trends-stars">{state.avgStars}</td>
                  <td className="mono">{state.seriousDangerPct}%</td>
                  <td className="mono">{formatCurrency(state.avgFines)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coming Soon Section */}
      <div className="trends-section trends-coming-soon" ref={comingSoonRef}>
        <h2>Historical Trends — Coming Soon</h2>
        <p className="trends-section-subtitle">
          Track changes over time to spot emerging patterns and systemic issues
        </p>

        <div className="trends-coming-grid">
          <div className="trends-coming-card">
            <div className="trends-coming-lock">🔒</div>
            <h3>Risk Score Trends Over Time</h3>
            <p>Track facility risk scores month-by-month to identify deteriorating conditions</p>
            <div className="trends-coming-placeholder">
              <div className="trends-coming-chart-lines">
                <div className="trends-coming-line"></div>
                <div className="trends-coming-line"></div>
                <div className="trends-coming-line"></div>
              </div>
            </div>
          </div>

          <div className="trends-coming-card">
            <div className="trends-coming-lock">🔒</div>
            <h3>Staffing Changes by Quarter</h3>
            <p>Monitor staffing levels and gaps across the industry</p>
            <div className="trends-coming-placeholder">
              <div className="trends-coming-chart-bars">
                <div className="trends-coming-bar"></div>
                <div className="trends-coming-bar"></div>
                <div className="trends-coming-bar"></div>
                <div className="trends-coming-bar"></div>
              </div>
            </div>
          </div>

          <div className="trends-coming-card">
            <div className="trends-coming-lock">🔒</div>
            <h3>Penalty Trends by State</h3>
            <p>See how enforcement patterns shift state-by-state</p>
            <div className="trends-coming-placeholder">
              <div className="trends-coming-chart-map">
                <div className="trends-coming-map-dot"></div>
                <div className="trends-coming-map-dot"></div>
                <div className="trends-coming-map-dot"></div>
              </div>
            </div>
          </div>

          <div className="trends-coming-card">
            <div className="trends-coming-lock">🔒</div>
            <h3>Ownership Change Tracking</h3>
            <p>Track private equity acquisitions and ownership transfers</p>
            <div className="trends-coming-placeholder">
              <div className="trends-coming-chart-timeline">
                <div className="trends-coming-timeline-dot"></div>
                <div className="trends-coming-timeline-dot"></div>
                <div className="trends-coming-timeline-dot"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Notify Form */}
        <div className="trends-notify-box">
          <h3>Get notified when trends go live</h3>
          <form className="trends-notify-form" onSubmit={handleNotifySubmit}>
            <input
              type="email"
              className="input"
              placeholder="your@email.com"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary">
              Notify Me
            </button>
          </form>
        </div>
      </div>
      {/* Disclaimer */}
      <div className="screening-disclaimer" style={{ maxWidth: '1000px', margin: '2rem auto 3rem' }}>
        The Oversight Report identifies patterns and discrepancies in publicly available federal data. These indicators do not constitute evidence of wrongdoing. If you have concerns about a facility, contact your state survey agency or the HHS Office of Inspector General at <a href="https://tips.hhs.gov" target="_blank" rel="noopener noreferrer">tips.hhs.gov</a>.
      </div>
    </div>
  );
}
