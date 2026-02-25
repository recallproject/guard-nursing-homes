import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useFacilityData } from '../hooks/useFacilityData';
import { useWatchlist } from '../hooks/useWatchlist';
import '../styles/watchlist.css';

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

export function WatchlistPage() {
  const { getFacility, loading, error } = useFacilityData();
  const { watchlist, removeFacility } = useWatchlist();
  const navigate = useNavigate();

  const [sortBy, setSortBy] = useState('date'); // date, risk, name, state
  const [filterState, setFilterState] = useState('all');
  const [showConfirmRemove, setShowConfirmRemove] = useState(null);

  const headerRef = useRef(null);
  const contentRef = useRef(null);

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

  // Animate content when watchlist changes
  useEffect(() => {
    if (contentRef.current && watchlist.length > 0) {
      gsap.fromTo(
        contentRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }, [watchlist, sortBy, filterState]);

  if (loading) {
    return (
      <div className="watchlist-page">
        <div className="watchlist-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading watchlist...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="watchlist-page">
        <div className="watchlist-error">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Get full facility data for each watchlist item
  const facilities = watchlist
    .map(item => {
      const facility = getFacility(item.ccn);
      return facility ? { ...facility, addedAt: item.addedAt } : null;
    })
    .filter(Boolean);

  // Apply state filter
  let filteredFacilities = facilities;
  if (filterState !== 'all') {
    filteredFacilities = filteredFacilities.filter(f => f.state === filterState);
  }

  // Apply sorting
  filteredFacilities.sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.addedAt) - new Date(a.addedAt);
      case 'risk':
        return (b.composite || 0) - (a.composite || 0);
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'state':
        return (a.state || '').localeCompare(b.state || '');
      default:
        return 0;
    }
  });

  // Calculate summary stats
  const stats = {
    total: facilities.length,
    avgRisk: facilities.length > 0
      ? (facilities.reduce((sum, f) => sum + (f.composite || 0), 0) / facilities.length).toFixed(1)
      : '0.0',
    seriousConcerns: facilities.filter(f => (f.jeopardy_count || 0) > 0).length,
    staffingIssues: facilities.filter(f => (f.rn_gap_pct || 0) > 25).length
  };

  // Get unique states in watchlist
  const statesInWatchlist = [...new Set(facilities.map(f => f.state))].sort();

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toLocaleString()}`;
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
    if (!filteredFacilities.length) return;

    const headers = ['Facility', 'CCN', 'City', 'State', 'Risk Score', 'Stars', 'Total Fines', 'Serious Danger', 'Total Deficiencies', 'Staffing Discrepancy', 'Date Added'];
    const rows = filteredFacilities.map(f => [
      f.name,
      f.ccn,
      f.city,
      f.state,
      (f.composite || 0).toFixed(1),
      f.stars || 0,
      f.total_fines || 0,
      f.jeopardy_count || 0,
      f.total_deficiencies || 0,
      (f.rn_gap_pct || 0) > 25 ? 'Yes' : 'No',
      new Date(f.addedAt).toLocaleDateString()
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OversightReport_Watchlist_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle remove with confirmation
  const handleRemove = (ccn) => {
    setShowConfirmRemove(ccn);
  };

  const confirmRemove = () => {
    if (showConfirmRemove) {
      removeFacility(showConfirmRemove);
      setShowConfirmRemove(null);
    }
  };

  const cancelRemove = () => {
    setShowConfirmRemove(null);
  };

  return (
    <div className="watchlist-page">
      {/* Header */}
      <div className="watchlist-header" ref={headerRef}>
        <div className="watchlist-header-top">
          <h1>My Watchlist</h1>
          {facilities.length > 0 && (
            <span className="watchlist-count-badge">{facilities.length}</span>
          )}
        </div>
        <p className="watchlist-subtitle">Track facilities you're monitoring</p>
      </div>

      {/* Empty State */}
      {facilities.length === 0 ? (
        <div className="watchlist-empty">
          <div className="watchlist-empty-icon">★</div>
          <h2>No facilities on your watchlist yet</h2>
          <p>
            Start tracking facilities to monitor their risk scores, violations, and staffing levels.
          </p>
          <Link to="/" className="btn btn-primary">
            Search for a facility
          </Link>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="watchlist-stats">
            <div className="watchlist-stat-card">
              <div className="watchlist-stat-value">{stats.total}</div>
              <div className="watchlist-stat-label">Facilities Tracked</div>
            </div>
            <div className="watchlist-stat-card">
              <div className="watchlist-stat-value">{stats.avgRisk}</div>
              <div className="watchlist-stat-label">Average Risk Score</div>
            </div>
            <div className="watchlist-stat-card">
              <div className="watchlist-stat-value watchlist-stat-danger">{stats.seriousConcerns}</div>
              <div className="watchlist-stat-label">Serious Concerns</div>
            </div>
            <div className="watchlist-stat-card">
              <div className="watchlist-stat-value watchlist-stat-warning">{stats.staffingIssues}</div>
              <div className="watchlist-stat-label">Staffing Issues</div>
            </div>
          </div>

          {/* Controls */}
          <div className="watchlist-controls">
            <div className="watchlist-filters">
              <div className="watchlist-filter-group">
                <label>Sort by:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="date">Date Added</option>
                  <option value="risk">Risk Score</option>
                  <option value="name">Name</option>
                  <option value="state">State</option>
                </select>
              </div>

              <div className="watchlist-filter-group">
                <label>State:</label>
                <select value={filterState} onChange={(e) => setFilterState(e.target.value)}>
                  <option value="all">All States</option>
                  {statesInWatchlist.map(state => (
                    <option key={state} value={state}>{US_STATES[state] || state}</option>
                  ))}
                </select>
              </div>
            </div>

            <button className="btn btn-secondary" onClick={downloadCSV}>
              Download CSV
            </button>
          </div>

          {/* Facility List */}
          <div className="watchlist-grid" ref={contentRef}>
            {filteredFacilities.map(facility => (
              <div key={facility.ccn} className="watchlist-card">
                <div className="watchlist-card-header">
                  <h3 className="watchlist-card-name">{facility.name}</h3>
                  <button
                    className="watchlist-remove-btn"
                    onClick={() => handleRemove(facility.ccn)}
                    aria-label="Remove from watchlist"
                  >
                    ×
                  </button>
                </div>

                <p className="watchlist-card-location">
                  {facility.city}, {facility.state}
                </p>

                <div className="watchlist-card-risk">
                  <span className={`watchlist-risk-badge ${getRiskBadgeClass(facility.composite || 0)}`}>
                    {(facility.composite || 0).toFixed(1)}
                  </span>
                  <span className="watchlist-stars">{renderStars(facility.stars || 0)}</span>
                </div>

                <div className="watchlist-card-stats">
                  {(facility.jeopardy_count || 0) > 0 && (
                    <div className="watchlist-stat-item stat-danger">
                      <span className="watchlist-stat-num">{facility.jeopardy_count}</span>
                      <span className="watchlist-stat-text">serious danger</span>
                    </div>
                  )}
                  {(facility.total_deficiencies || 0) > 0 && (
                    <div className="watchlist-stat-item">
                      <span className="watchlist-stat-num">{facility.total_deficiencies}</span>
                      <span className="watchlist-stat-text">deficiencies</span>
                    </div>
                  )}
                  {(facility.total_fines || 0) > 0 && (
                    <div className="watchlist-stat-item stat-warning">
                      <span className="watchlist-stat-num">{formatCurrency(facility.total_fines)}</span>
                      <span className="watchlist-stat-text">fines</span>
                    </div>
                  )}
                  {(facility.rn_gap_pct || 0) > 25 && (
                    <div className="watchlist-stat-item stat-warning">
                      <span className="watchlist-stat-text">staffing discrepancy</span>
                    </div>
                  )}
                </div>

                <div className="watchlist-card-footer">
                  <button
                    className="watchlist-view-btn"
                    onClick={() => navigate(`/facility/${facility.ccn}`)}
                  >
                    View Report →
                  </button>
                  <span className="watchlist-added-date">
                    Added {new Date(facility.addedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredFacilities.length === 0 && filterState !== 'all' && (
            <div className="watchlist-no-results">
              <p>No facilities match your filters.</p>
            </div>
          )}
        </>
      )}

      {/* Disclaimer */}
      <div className="screening-disclaimer" style={{ maxWidth: '1000px', margin: '2rem auto 3rem' }}>
        The Oversight Report identifies patterns and discrepancies in publicly available federal data. These indicators do not constitute evidence of wrongdoing. If you have concerns about a facility, contact your state survey agency or the HHS Office of Inspector General at <a href="https://tips.hhs.gov" target="_blank" rel="noopener noreferrer">tips.hhs.gov</a>.
      </div>

      {/* Remove Confirmation Modal */}
      {showConfirmRemove && (
        <div className="watchlist-modal-overlay" onClick={cancelRemove}>
          <div className="watchlist-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Remove from Watchlist?</h3>
            <p>Are you sure you want to stop tracking this facility?</p>
            <div className="watchlist-modal-buttons">
              <button className="btn btn-secondary" onClick={cancelRemove}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmRemove}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
