import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import FacilityCard from './FacilityCard';
import FacilityRow from './FacilityRow';
import '../styles/state-detail.css';

export default function StateDetail({ stateCode, stateData, stateSummary, onBack }) {
  const [sortBy, setSortBy] = useState('risk'); // risk, name, stars
  const [filterBy, setFilterBy] = useState('all'); // all, high-risk, critical
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('facilityViewMode') || 'list');
  const [visibleCount, setVisibleCount] = useState(25);

  const headerRef = useRef(null);
  const gridRef = useRef(null);

  const handleViewChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('facilityViewMode', mode);
  };

  useEffect(() => {
    // Reset scroll and visible count when state changes
    window.scrollTo(0, 0);
    setVisibleCount(25);
    setSearchQuery('');

    // Animate header entrance
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    }

    // Stagger animate cards
    if (gridRef.current) {
      const cards = gridRef.current.querySelectorAll('.facility-card, .facility-row');
      gsap.fromTo(
        cards,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.03,
          ease: 'power2.out',
          delay: 0.3,
        }
      );
    }
  }, [stateCode]);

  // Re-animate cards when filters change
  useEffect(() => {
    if (gridRef.current) {
      const cards = gridRef.current.querySelectorAll('.facility-card, .facility-row');
      gsap.fromTo(
        cards,
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.3,
          stagger: 0.02,
          ease: 'power2.out',
        }
      );
    }
  }, [sortBy, filterBy, searchQuery]);

  if (!stateData || !stateSummary) {
    return null;
  }

  // Filter facilities
  let facilities = [...stateData.facilities];

  if (filterBy === 'high-risk') {
    facilities = facilities.filter((f) => (f.composite || 0) >= 40);
  } else if (filterBy === 'critical') {
    facilities = facilities.filter((f) => (f.composite || 0) >= 60);
  }

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    facilities = facilities.filter(
      (f) =>
        f.name?.toLowerCase().includes(query) ||
        f.city?.toLowerCase().includes(query) ||
        f.ccn?.includes(query)
    );
  }

  // Sort facilities
  if (sortBy === 'risk') {
    facilities.sort((a, b) => (b.composite || 0) - (a.composite || 0));
  } else if (sortBy === 'name') {
    facilities.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sortBy === 'stars') {
    facilities.sort((a, b) => (a.stars || 0) - (b.stars || 0));
  }

  const visibleFacilities = facilities.slice(0, visibleCount);
  const hasMore = visibleCount < facilities.length;

  // Format fines
  const formatFines = (amount) => {
    if (!amount) return '$0';
    if (amount >= 1000000) {
      return '$' + (amount / 1000000).toFixed(1) + 'M';
    }
    if (amount >= 1000) {
      return '$' + (amount / 1000).toFixed(0) + 'K';
    }
    return '$' + amount.toLocaleString();
  };

  // Get state full name
  const stateNames = {
    AL: 'Alabama',
    AK: 'Alaska',
    AZ: 'Arizona',
    AR: 'Arkansas',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
    DC: 'District of Columbia',
    FL: 'Florida',
    GA: 'Georgia',
    HI: 'Hawaii',
    ID: 'Idaho',
    IL: 'Illinois',
    IN: 'Indiana',
    IA: 'Iowa',
    KS: 'Kansas',
    KY: 'Kentucky',
    LA: 'Louisiana',
    ME: 'Maine',
    MD: 'Maryland',
    MA: 'Massachusetts',
    MI: 'Michigan',
    MN: 'Minnesota',
    MS: 'Mississippi',
    MO: 'Missouri',
    MT: 'Montana',
    NE: 'Nebraska',
    NV: 'Nevada',
    NH: 'New Hampshire',
    NJ: 'New Jersey',
    NM: 'New Mexico',
    NY: 'New York',
    NC: 'North Carolina',
    ND: 'North Dakota',
    OH: 'Ohio',
    OK: 'Oklahoma',
    OR: 'Oregon',
    PA: 'Pennsylvania',
    RI: 'Rhode Island',
    SC: 'South Carolina',
    SD: 'South Dakota',
    TN: 'Tennessee',
    TX: 'Texas',
    UT: 'Utah',
    VT: 'Vermont',
    VA: 'Virginia',
    WA: 'Washington',
    WV: 'West Virginia',
    WI: 'Wisconsin',
    WY: 'Wyoming',
    PR: 'Puerto Rico',
    GU: 'Guam',
  };

  const stateName = stateNames[stateCode] || stateCode;

  // Compute high-risk count from facilities
  const highRiskCount = stateData.facilities.filter((f) => (f.composite || 0) >= 40).length;

  // Compute avg per facility fine
  const avgFinePerFacility = stateSummary.count > 0
    ? stateSummary.total_fines / stateSummary.count
    : 0;

  return (
    <div className="state-detail">
      <div className="state-detail-header" ref={headerRef}>
        <button className="btn-ghost state-detail-back" onClick={onBack}>
          ← Back to Map
        </button>

        <div className="state-detail-title-section">
          <h2 className="state-detail-title">{stateName}</h2>

          {/* 2A: Contextual sentence */}
          <p className="state-detail-context">
            {stateSummary.count} Medicare-certified nursing facilities in {stateName}. {highRiskCount} flagged high-risk based on inspection data, staffing records, and penalty history. Updated Q3 2025.
          </p>

          <div className="state-detail-stats-row">
            <div className="state-detail-stat">
              <span className="state-detail-stat-value">{stateSummary.count}</span>
              <span className="state-detail-stat-label">Facilities</span>
              <span className="state-detail-stat-cta">Search by name or city below</span>
            </div>
            <div className="state-detail-stat">
              <span className="state-detail-stat-value state-detail-stat-danger">
                {stateSummary.high_risk}
              </span>
              <span className="state-detail-stat-label">High Risk</span>
              <button
                className="state-detail-stat-cta state-detail-stat-cta--link"
                onClick={() => setFilterBy('high-risk')}
              >
                View highest-risk facilities →
              </button>
            </div>
            <div className="state-detail-stat">
              <span className="state-detail-stat-value">
                {stateSummary.avg_composite?.toFixed(1) || '0.0'}
              </span>
              <span className="state-detail-stat-label">Avg Score</span>
              <span className="state-detail-stat-cta">National avg: 28.4</span>
            </div>
            <div className="state-detail-stat">
              <span className="state-detail-stat-value">
                {formatFines(stateSummary.total_fines)}
              </span>
              <span className="state-detail-stat-label">Total Fines</span>
              <span className="state-detail-stat-cta">{formatFines(avgFinePerFacility)} per facility</span>
            </div>
          </div>
        </div>

        <div className="state-detail-controls">
          <div className="state-detail-control-group">
            <label className="state-detail-control-label">Sort by:</label>
            <select
              className="state-detail-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="risk">Risk Score (High to Low)</option>
              <option value="name">Name (A-Z)</option>
              <option value="stars">Stars (Low to High)</option>
            </select>
          </div>

          <div className="state-detail-control-group">
            <label className="state-detail-control-label">Filter:</label>
            <select
              className="state-detail-select"
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
            >
              <option value="all">All Facilities</option>
              <option value="high-risk">High Risk (40+)</option>
              <option value="critical">Critical (60+)</option>
            </select>
          </div>

          <div className="state-detail-search-wrapper">
            <input
              type="text"
              className="input state-detail-search"
              placeholder="Search by name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => handleViewChange('list')}
            >
              ☰ List
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => handleViewChange('grid')}
            >
              ⊞ Grid
            </button>
          </div>
        </div>

        <div className="state-detail-result-count">
          Showing {visibleFacilities.length} of {facilities.length} facilities
          <span className="state-detail-hint"> · Click ☆ to add to favorites</span>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="facility-list" ref={gridRef}>
          {visibleFacilities.map((facility) => (
            <FacilityRow key={facility.ccn} facility={facility} />
          ))}
        </div>
      ) : (
        <div className="facility-grid" ref={gridRef}>
          {visibleFacilities.map((facility) => (
            <FacilityCard key={facility.ccn} facility={facility} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="state-detail-load-more">
          <button
            className="btn btn-secondary"
            onClick={() => setVisibleCount((prev) => prev + 25)}
          >
            Load More ({facilities.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {facilities.length === 0 && (
        <div className="state-detail-empty">
          <p>No facilities match your search.</p>
        </div>
      )}
    </div>
  );
}
