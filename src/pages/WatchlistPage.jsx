import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { useWatchlistFacilities } from '../hooks/useFacilityData';
import { useWatchlist } from '../hooks/useWatchlist';
import { useCompareTray } from '../hooks/useCompareTray';
import { WatchlistCompareView } from '../components/WatchlistCompareView';
import { WatchlistErrorBoundary } from '../components/WatchlistErrorBoundary';
import { CompareTray } from '../components/CompareTray';
import { collectWatchlistCcns } from '../utils/watchlistFacilities';
import { parseCompareItems, resolveCompareSelection } from '../utils/watchlistCompare';
import { CMS_SNF_AS_OF_ISO } from '../data/careSettings';
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
  const { watchlist, removeFacility, clearWatchlist } = useWatchlist();
  const { items: compareItems, ccns: compareCcns, toggle, isInCompare, atCap, replace } = useCompareTray();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryCcns = searchParams.get('ccns') || '';
  const hydrateCcns = collectWatchlistCcns({
    favoriteCcns: watchlist.map((item) => item.ccn),
    queryCcns,
    sessionCcns: compareCcns,
  });
  const { getFacility, loading, error } = useWatchlistFacilities(hydrateCcns);

  const [sortBy, setSortBy] = useState('date'); // date, risk, name, state
  const [filterState, setFilterState] = useState('all');
  const [showConfirmRemove, setShowConfirmRemove] = useState(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const comparisonRef = useRef(null);
  const headerRef = useRef(null);
  const contentRef = useRef(null);
  const trackedAutoCompareRef = useRef('');
  const hydratedQueryRef = useRef('');

  const queryKey = `${searchParams.get('compare')}|${searchParams.get('ccns') || ''}`;
  const autoCompare = resolveCompareSelection({
    queryCompare: searchParams.get('compare'),
    queryCcns: searchParams.get('ccns'),
    sessionCcns: compareCcns,
  });

  useEffect(() => {
    const queryCcns = searchParams.get('ccns');
    if (!queryCcns || hydratedQueryRef.current === queryKey) return;
    hydratedQueryRef.current = queryKey;
    const fromQuery = parseCompareItems(queryCcns);
    if (fromQuery.length) replace(fromQuery);
  }, [queryKey, replace, searchParams]);

  const showCompare = autoCompare.openCompare && compareCcns.length >= 2;

  // Plausible: track watchlist page view
  useEffect(() => {
    window.plausible && window.plausible('Watchlist-Page-View');
  }, []);

  // Animate on mount
  useEffect(() => {
    if (!headerRef.current) return undefined;
    try {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    } catch {
      /* animation is optional */
    }
    return undefined;
  }, []);

  // Animate content when watchlist changes
  useEffect(() => {
    if (!contentRef.current || watchlist.length === 0) return undefined;
    try {
      gsap.fromTo(
        contentRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
      );
    } catch {
      /* animation is optional */
    }
    return undefined;
  }, [watchlist, sortBy, filterState]);

  useEffect(() => {
    if (!showCompare) return;
    const key = `${queryKey}|${compareCcns.join(',')}`;
    if (trackedAutoCompareRef.current === key) return;
    trackedAutoCompareRef.current = key;
    window.plausible && window.plausible('Compare-Used', {
      props: { count: String(compareCcns.length), source: 'compare-now' },
    });
  }, [showCompare, compareCcns, queryKey]);

  useEffect(() => {
    if (!showCompare) return;
    const timer = setTimeout(() => {
      comparisonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(timer);
  }, [showCompare]);

  if (loading) {
    return (
      <div className="watchlist-page">
        <div className="watchlist-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">
            {showCompare ? 'Loading comparison…' : 'Loading saved homes…'}
          </div>
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

  const selectedFacilities = compareCcns
    .map((ccn) => {
      const fromWatch = facilities.find((fac) => fac.ccn === ccn);
      if (fromWatch) return fromWatch;
      const loaded = getFacility(ccn);
      if (loaded) return loaded;
      const chip = compareItems.find((item) => item.ccn === ccn);
      return chip ? { ...chip } : null;
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
    jeopardyCitations: facilities.reduce((sum, f) => sum + (f.jeopardy_count || 0), 0),
    jeopardyFacilities: facilities.filter(f => (f.jeopardy_count || 0) > 0).length,
    staffingIssues: facilities.filter(f => (f.rn_gap_pct || 0) > 25).length
  };

  // Get unique states in watchlist
  const statesInWatchlist = [...new Set(facilities.map(f => f.state))].sort();

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${Math.round(amount).toLocaleString()}`;
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

    const headers = ['Facility', 'CCN', 'City', 'State', 'Risk Score', 'Stars', 'Total Fines', 'Jeopardy Citations', 'Total Deficiencies', 'Staffing Discrepancy', 'Date Added'];
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
    a.download = `OversightReport_Favorites_${new Date().toISOString().split('T')[0]}.csv`;
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

  const toggleCompareSelect = (facility) => {
    toggle(facility);
  };

  const closeCompareView = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('compare');
    setSearchParams(next, { replace: true });
    setTimeout(() => {
      document.getElementById('favorites-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <WatchlistErrorBoundary resetKey={queryKey}>
    <div className="watchlist-page">
      <Helmet>
        <title>Saved homes — Compare when you are ready | The Oversight Report</title>
        <meta name="description" content="Save nursing homes on this device, then add up to 3 to compare side-by-side. Saving does not start a comparison." />
        <link rel="canonical" href="https://www.oversightreports.com/watchlist" />
      </Helmet>
      {/* Header */}
      <div className="watchlist-header" ref={headerRef}>
        <div className="watchlist-header-top">
          <h1>
            <span className="watchlist-title-text">Saved homes</span>
            {facilities.length > 0 && (
              <span className="watchlist-count-badge" aria-label={`${facilities.length} saved`}>
                {facilities.length}
              </span>
            )}
          </h1>
        </div>
        <p className="watchlist-subtitle">
          Save homes while you explore. Add up to 3 to compare side-by-side — saving does not add them to compare. Stored on this device only; no account needed.
        </p>
      </div>

      {showCompare && selectedFacilities.length >= 2 && (
        <div ref={comparisonRef}>
          <WatchlistCompareView
            facilities={selectedFacilities}
            dataAsOf={CMS_SNF_AS_OF_ISO}
            onChangeHomes={closeCompareView}
          />
        </div>
      )}

      {/* Empty State */}
      {facilities.length === 0 ? (
        <div className="watchlist-empty">
          <div className="watchlist-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
          <h2>No saved homes yet</h2>
          <p>
            Tap Save on a facility card. When you are ready, add 2–3 homes to compare. Saving and comparing are separate.
          </p>
          {!showCompare && <CompareTray />}
          <Link to="/skilled-nursing#browse-states" className="btn btn-primary">
            Explore the Map
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
              <div className="watchlist-stat-label">Avg Risk Score</div>
              <div className="watchlist-stat-context">out of 100 · higher = worse</div>
            </div>
            <div className="watchlist-stat-card">
              <div className="watchlist-stat-value watchlist-stat-danger">{stats.jeopardyCitations}</div>
              <div className="watchlist-stat-label">Jeopardy Citations</div>
              {stats.jeopardyFacilities > 0 && (
                <div className="watchlist-stat-context">across {stats.jeopardyFacilities} {stats.jeopardyFacilities === 1 ? 'facility' : 'facilities'}</div>
              )}
            </div>
            <div className="watchlist-stat-card">
              <div className="watchlist-stat-value watchlist-stat-warning">{stats.staffingIssues}</div>
              <div className="watchlist-stat-label">Staffing Flags</div>
              <div className="watchlist-stat-context">gap &gt; 25% between reported &amp; payroll</div>
            </div>
          </div>

          {!showCompare && (
            <div id="compare">
              <CompareTray />
            </div>
          )}

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

            <div className="watchlist-actions">
              <div className="watchlist-export">
                <button className="btn btn-secondary" onClick={downloadCSV}>
                  Export Spreadsheet
                </button>
                <span className="watchlist-export-hint">Opens in Excel, Google Sheets, or Numbers</span>
              </div>
              <button className="watchlist-clear-btn" onClick={() => setShowConfirmClear(true)}>
                Clear All
              </button>
            </div>
          </div>

          {/* Facility List */}
          <div className="watchlist-grid" ref={contentRef} id="favorites-list">
            {filteredFacilities.map(facility => (
              <div key={facility.ccn} className={`watchlist-card ${isInCompare(facility.ccn) ? 'watchlist-card--selected' : ''}`}>
                <div className="watchlist-card-header">
                  <button
                    type="button"
                    className={`watchlist-compare-check${isInCompare(facility.ccn) ? ' watchlist-compare-check--on' : ''}`}
                    onClick={() => toggleCompareSelect(facility)}
                    disabled={!isInCompare(facility.ccn) && atCap}
                    title={atCap && !isInCompare(facility.ccn) ? 'Compare is full (3 of 3). Remove a home first.' : 'Add this home to a 2–3 home comparison'}
                  >
                    {isInCompare(facility.ccn) ? 'In compare' : 'Add to compare'}
                  </button>
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
                      <span className="watchlist-stat-text">jeopardy citations</span>
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
                    <div className="watchlist-stat-item stat-flag">
                      <span className="watchlist-stat-num">⚠</span>
                      <span className="watchlist-stat-text">staffing discrepancy flagged</span>
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
            <h3>Remove from Favorites?</h3>
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

      {/* Clear All Confirmation Modal */}
      {showConfirmClear && (
        <div className="watchlist-modal-overlay" onClick={() => setShowConfirmClear(false)}>
          <div className="watchlist-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Clear All Favorites?</h3>
            <p>This will remove all {facilities.length} facilities from your list.</p>
            <div className="watchlist-modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowConfirmClear(false)}>
                Cancel
              </button>
              <button className="btn btn-primary watchlist-clear-confirm" onClick={() => { clearWatchlist(); setShowConfirmClear(false); }}>
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {!showCompare && <CompareTray docked />}
    </div>
    </WatchlistErrorBoundary>
  );
}
