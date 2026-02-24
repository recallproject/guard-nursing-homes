import { useState, useEffect, useMemo, useRef } from 'react';
import { useFacilityData } from '../hooks/useFacilityData';
import RiskBadge from '../components/RiskBadge';
import ComingSoonPage from '../components/ComingSoonPage';
import '../styles/ownership.css';
import gsap from 'gsap';

export default function OwnershipPage() {
  const COMING_SOON = true;
  const { getAllFacilities, loading, error } = useFacilityData();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [leaderboardTab, setLeaderboardTab] = useState('lowStars'); // lowStars, fines, danger
  const [sortColumn, setSortColumn] = useState('composite');
  const [sortDirection, setSortDirection] = useState('desc');

  const headerRef = useRef(null);
  const searchRef = useRef(null);
  const leaderboardRef = useRef(null);

  // Pre-compute owner aggregations
  const ownerStats = useMemo(() => {
    const facilities = getAllFacilities;
    if (!facilities || facilities.length === 0) return [];

    const ownerMap = {};

    facilities.forEach(f => {
      const owner = f.worst_owner;
      if (!owner) return;

      if (!ownerMap[owner]) {
        ownerMap[owner] = {
          name: owner,
          facilities: [],
          states: new Set(),
          chainName: f.chain_name || null,
          ownershipType: f.ownership_type || 'Unknown',
        };
      }

      ownerMap[owner].facilities.push(f);
      if (f.state) ownerMap[owner].states.add(f.state);
    });

    // Compute stats for each owner
    const stats = Object.values(ownerMap).map(owner => {
      const facilities = owner.facilities;
      const count = facilities.length;

      const avgComposite = facilities.reduce((sum, f) => sum + (f.composite || 0), 0) / count;
      const avgStars = facilities.reduce((sum, f) => sum + (f.stars || 0), 0) / count;
      const totalFines = facilities.reduce((sum, f) => sum + (f.total_fines || 0), 0);
      const jeopardyCount = facilities.filter(f => (f.jeopardy_count || 0) > 0).length;
      const belowTwoStars = facilities.filter(f => (f.stars || 0) < 2).length;
      const staffingDiscrepancies = facilities.filter(f => (f.rn_gap_pct || 0) > 25).length;

      // Star distribution
      const starDist = [0, 0, 0, 0, 0];
      facilities.forEach(f => {
        if (f.stars >= 1 && f.stars <= 5) {
          starDist[f.stars - 1]++;
        }
      });

      return {
        name: owner.name,
        count,
        states: Array.from(owner.states).sort(),
        chainName: owner.chainName,
        ownershipType: owner.ownershipType,
        avgComposite: Math.round(avgComposite * 10) / 10,
        avgStars: Math.round(avgStars * 10) / 10,
        totalFines,
        jeopardyCount,
        belowTwoStars,
        staffingDiscrepancies,
        starDist,
        facilities,
      };
    });

    return stats.sort((a, b) => b.count - a.count);
  }, [getAllFacilities]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      const query = searchQuery.toLowerCase().trim();
      const matches = ownerStats.filter(owner => {
        const nameMatch = owner.name.toLowerCase().includes(query);
        const chainMatch = owner.chainName?.toLowerCase().includes(query);
        return nameMatch || chainMatch;
      });

      setSearchResults(matches.slice(0, 20));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, ownerStats]);

  // Get leaderboard data based on active tab
  const leaderboardData = useMemo(() => {
    if (!ownerStats || ownerStats.length === 0) return [];

    let sorted = [...ownerStats];

    switch (leaderboardTab) {
      case 'lowStars':
        sorted.sort((a, b) => b.belowTwoStars - a.belowTwoStars);
        break;
      case 'fines':
        sorted.sort((a, b) => b.totalFines - a.totalFines);
        break;
      case 'danger':
        sorted.sort((a, b) => b.jeopardyCount - a.jeopardyCount);
        break;
      default:
        sorted.sort((a, b) => b.belowTwoStars - a.belowTwoStars);
    }

    return sorted.slice(0, 25);
  }, [ownerStats, leaderboardTab]);

  // Handle owner selection
  const handleSelectOwner = (owner) => {
    setSelectedOwner(owner);
    setSearchQuery('');
    setSearchResults([]);

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sort facilities in owner detail view
  const sortedFacilities = useMemo(() => {
    if (!selectedOwner) return [];

    const facilities = [...selectedOwner.facilities];

    facilities.sort((a, b) => {
      let aVal = a[sortColumn] || 0;
      let bVal = b[sortColumn] || 0;

      if (sortColumn === 'name' || sortColumn === 'city' || sortColumn === 'state') {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return facilities;
  }, [selectedOwner, sortColumn, sortDirection]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!selectedOwner) return;

    const headers = ['CCN', 'Name', 'City', 'State', 'Risk Score', 'Stars', 'Total Staffing (min/day)', 'Total Fines', 'Jeopardy Count'];
    const rows = selectedOwner.facilities.map(f => [
      f.ccn,
      f.name,
      f.city,
      f.state,
      f.composite || 0,
      f.stars || 0,
      f.total_hprd ? (f.total_hprd * 60).toFixed(0) : 'N/A',
      f.total_fines || 0,
      f.jeopardy_count || 0,
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OversightReport_${selectedOwner.name.replace(/[^a-zA-Z0-9]/g, '_')}_facilities.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!selectedOwner) return;

    const content = `
THE OVERSIGHT REPORT - OWNERSHIP REPORT: ${selectedOwner.name}
Generated: ${new Date().toLocaleDateString()}

PORTFOLIO SUMMARY
Total facilities: ${selectedOwner.count}
States: ${selectedOwner.states.join(', ')}
Average risk score: ${selectedOwner.avgComposite}
Average star rating: ${selectedOwner.avgStars} / 5
Total fines (3yr): $${selectedOwner.totalFines.toLocaleString()}
Serious danger citations: ${selectedOwner.jeopardyCount} facilities
Staffing discrepancies: ${selectedOwner.staffingDiscrepancies} facilities

STAR DISTRIBUTION
5 stars: ${selectedOwner.starDist[4]} (${Math.round((selectedOwner.starDist[4] / selectedOwner.count) * 100)}%)
4 stars: ${selectedOwner.starDist[3]} (${Math.round((selectedOwner.starDist[3] / selectedOwner.count) * 100)}%)
3 stars: ${selectedOwner.starDist[2]} (${Math.round((selectedOwner.starDist[2] / selectedOwner.count) * 100)}%)
2 stars: ${selectedOwner.starDist[1]} (${Math.round((selectedOwner.starDist[1] / selectedOwner.count) * 100)}%)
1 star: ${selectedOwner.starDist[0]} (${Math.round((selectedOwner.starDist[0] / selectedOwner.count) * 100)}%)

ALL FACILITIES
${selectedOwner.facilities.map(f => `${f.name} - ${f.city}, ${f.state} - Risk: ${f.composite || 0} - Stars: ${f.stars || 0}`).join('\n')}

DISCLAIMER
The Oversight Report identifies patterns and discrepancies in publicly available federal data. These indicators do not constitute evidence of wrongdoing. If you have concerns about a facility, contact your state survey agency or the HHS Office of Inspector General at tips.hhs.gov.
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OversightReport_${selectedOwner.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // GSAP animations
  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      );
    }
    if (searchRef.current) {
      gsap.fromTo(searchRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.2, ease: 'power3.out' }
      );
    }
    if (leaderboardRef.current) {
      gsap.fromTo(leaderboardRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.4, ease: 'power3.out' }
      );
    }
  }, []);

  // Animate owner card expansion
  useEffect(() => {
    if (selectedOwner) {
      const ownerCard = document.querySelector('.owner-detail');
      if (ownerCard) {
        gsap.fromTo(ownerCard,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' }
        );
      }
    }
  }, [selectedOwner]);

  if (loading) {
    return (
      <div className="ownership-page">
        <div className="ownership-loading">
          <div className="loading-spinner" />
          <p className="loading-text">Loading ownership data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ownership-page">
        <div className="ownership-error">
          <h3>Error loading data</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (COMING_SOON) {
    return (
      <ComingSoonPage
        title="Ownership Network Explorer"
        description="Trace who owns what across the nursing home industry. See how corporate chains perform across their entire portfolio — and which owners have patterns of violations, fines, and low staffing."
        tier="professional"
        features={[
          'Search any owner or management company',
          'Portfolio-wide performance statistics',
          'Leaderboards: lowest stars, highest fines, most danger citations',
          'Cross-state ownership pattern detection',
          'Owner accountability scoring',
        ]}
      />
    );
  }

  return (
    <div className="ownership-page">
      {/* Header */}
      <div className="ownership-header" ref={headerRef}>
        <h1>Ownership Network Explorer</h1>
        <p className="ownership-subtitle">
          See every facility an owner operates — and what their track record looks like
        </p>
      </div>

      {/* Search Bar */}
      <div className="ownership-search-container" ref={searchRef}>
        <input
          type="text"
          className="ownership-search-input"
          placeholder="Search by owner or management company"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {searchResults.length > 0 && (
          <div className="ownership-search-results">
            {searchResults.map((owner) => (
              <div
                key={owner.name}
                className="ownership-search-result"
                onClick={() => handleSelectOwner(owner)}
              >
                <div className="ownership-search-result-info">
                  <div className="ownership-search-result-name">{owner.name}</div>
                  <div className="ownership-search-result-meta">
                    {owner.count} facilities • Avg risk: {owner.avgComposite}
                  </div>
                </div>
                <RiskBadge score={owner.avgComposite} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Owner Detail View */}
      {selectedOwner ? (
        <div className="owner-detail">
          <button className="owner-back-btn" onClick={() => setSelectedOwner(null)}>
            ← Back to Leaderboard
          </button>

          {/* Owner Header */}
          <div className="owner-header-card">
            <h2>{selectedOwner.name}</h2>
            <p className="owner-header-meta">
              {selectedOwner.count} facilities across {selectedOwner.states.length} state{selectedOwner.states.length !== 1 ? 's' : ''}
            </p>
            <p className="owner-header-type">Ownership type: {selectedOwner.ownershipType}</p>
            {selectedOwner.chainName && (
              <p className="owner-header-chain">Management company: {selectedOwner.chainName}</p>
            )}
          </div>

          {/* Portfolio Stats */}
          <div className="owner-stats-grid">
            <div className="owner-stat-card">
              <div className="owner-stat-label">Total Facilities</div>
              <div className="owner-stat-value">{selectedOwner.count}</div>
            </div>
            <div className="owner-stat-card">
              <div className="owner-stat-label">Average Risk Score</div>
              <div className="owner-stat-value">{selectedOwner.avgComposite}</div>
            </div>
            <div className="owner-stat-card">
              <div className="owner-stat-label">Average Star Rating</div>
              <div className="owner-stat-value">{selectedOwner.avgStars} / 5</div>
            </div>
            <div className="owner-stat-card">
              <div className="owner-stat-label">Total Fines (3yr)</div>
              <div className="owner-stat-value">${(selectedOwner.totalFines / 1000000).toFixed(2)}M</div>
            </div>
            <div className="owner-stat-card">
              <div className="owner-stat-label">Serious Danger Citations</div>
              <div className="owner-stat-value">
                {selectedOwner.jeopardyCount} ({Math.round((selectedOwner.jeopardyCount / selectedOwner.count) * 100)}%)
              </div>
            </div>
            <div className="owner-stat-card">
              <div className="owner-stat-label">Staffing Discrepancies</div>
              <div className="owner-stat-value">
                {selectedOwner.staffingDiscrepancies} ({Math.round((selectedOwner.staffingDiscrepancies / selectedOwner.count) * 100)}%)
              </div>
            </div>
          </div>

          {/* Star Distribution */}
          <div className="owner-star-distribution">
            <h3>Star Distribution</h3>
            <div className="owner-stars-grid">
              {[5, 4, 3, 2, 1].map(star => {
                const count = selectedOwner.starDist[star - 1];
                const pct = Math.round((count / selectedOwner.count) * 100);
                return (
                  <div className="owner-star-row" key={star}>
                    <span className="owner-star-label">{'⭐'.repeat(star)}</span>
                    <div className="owner-star-bar-track">
                      <div
                        className={`owner-star-bar-fill star-${star}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="owner-star-count">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* State Breakdown */}
          <div className="owner-state-breakdown">
            <h3>State Breakdown</h3>
            <div className="owner-state-grid">
              {selectedOwner.states.map(state => {
                const count = selectedOwner.facilities.filter(f => f.state === state).length;
                return (
                  <div className="owner-state-item" key={state}>
                    <span className="owner-state-code">{state}</span>
                    <span className="owner-state-count">{count} {count === 1 ? 'facility' : 'facilities'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Export Buttons */}
          <div className="owner-export-buttons">
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              Download CSV
            </button>
            <button className="btn btn-secondary" onClick={handleExportPDF}>
              Download Report
            </button>
          </div>

          {/* Facility Table */}
          <div className="owner-facility-table-container">
            <h3>All Facilities ({selectedOwner.count})</h3>
            <div className="owner-facility-table-wrapper">
              <table className="owner-facility-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')}>
                      Facility {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('state')}>
                      State {sortColumn === 'state' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('city')}>
                      City {sortColumn === 'city' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('composite')}>
                      Risk {sortColumn === 'composite' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('stars')}>
                      Stars {sortColumn === 'stars' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('total_hprd')}>
                      Staffing (min/day) {sortColumn === 'total_hprd' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('total_fines')}>
                      Fines {sortColumn === 'total_fines' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('jeopardy_count')}>
                      Jeopardy {sortColumn === 'jeopardy_count' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFacilities.map((f) => (
                    <tr key={f.ccn}>
                      <td className="facility-name-cell">
                        <a href={`/facility/${f.ccn}`} className="facility-link">
                          {f.name}
                        </a>
                      </td>
                      <td>{f.state}</td>
                      <td>{f.city}</td>
                      <td>
                        <RiskBadge score={f.composite} />
                      </td>
                      <td className="stars-cell">
                        {f.stars ? `${f.stars} ⭐` : 'N/A'}
                      </td>
                      <td className="mono">
                        {f.total_hprd ? (f.total_hprd * 60).toFixed(0) : 'N/A'}
                      </td>
                      <td className="mono">
                        ${(f.total_fines || 0).toLocaleString()}
                      </td>
                      <td className={`mono ${(f.jeopardy_count || 0) > 0 ? 'text-danger' : ''}`}>
                        {f.jeopardy_count || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="ownership-disclaimer">
            <h4>ABOUT THIS DATA</h4>
            <p>
              The Oversight Report identifies patterns and discrepancies in publicly available federal data.
              These indicators do not constitute evidence of wrongdoing. If you have concerns
              about a facility, contact your state survey agency or the HHS Office of Inspector
              General at <a href="https://tips.hhs.gov" target="_blank" rel="noopener noreferrer">tips.hhs.gov</a>.
            </p>
          </div>
        </div>
      ) : (
        /* Leaderboard View */
        <div className="ownership-leaderboard" ref={leaderboardRef}>
          <h2>Worst Owners</h2>

          {/* Tabs */}
          <div className="leaderboard-tabs">
            <button
              className={`leaderboard-tab ${leaderboardTab === 'lowStars' ? 'active' : ''}`}
              onClick={() => setLeaderboardTab('lowStars')}
            >
              Most Facilities Below 2 Stars
            </button>
            <button
              className={`leaderboard-tab ${leaderboardTab === 'fines' ? 'active' : ''}`}
              onClick={() => setLeaderboardTab('fines')}
            >
              Highest Total Fines
            </button>
            <button
              className={`leaderboard-tab ${leaderboardTab === 'danger' ? 'active' : ''}`}
              onClick={() => setLeaderboardTab('danger')}
            >
              Most Serious Danger Citations
            </button>
          </div>

          {/* Leaderboard Cards */}
          <div className="leaderboard-cards">
            {leaderboardData.map((owner, index) => (
              <div
                key={owner.name}
                className="leaderboard-card"
                onClick={() => handleSelectOwner(owner)}
              >
                <div className="leaderboard-card-rank">#{index + 1}</div>
                <div className="leaderboard-card-content">
                  <h3 className="leaderboard-card-name">{owner.name}</h3>
                  <p className="leaderboard-card-meta">
                    {owner.count} facilities across {owner.states.length} state{owner.states.length !== 1 ? 's' : ''}
                  </p>
                  <div className="leaderboard-card-stats">
                    <span>Avg rating: {owner.avgStars} ⭐</span>
                    <span>Avg risk: {owner.avgComposite}</span>
                  </div>
                  <div className="leaderboard-card-stats">
                    <span>Total fines: ${(owner.totalFines / 1000000).toFixed(2)}M</span>
                    <span>Serious danger: {owner.jeopardyCount} facilities</span>
                  </div>
                </div>
                <div className="leaderboard-card-arrow">→</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
