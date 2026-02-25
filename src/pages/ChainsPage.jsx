import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import '../styles/chains.css';

export function ChainsPage() {
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [minFacilities, setMinFacilities] = useState('all');
  const [hasAbuse, setHasAbuse] = useState(false);
  const [forProfitOnly, setForProfitOnly] = useState(false);
  const [sortBy, setSortBy] = useState('totalFines');
  const [expandedRow, setExpandedRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const tableRef = useRef(null);

  const ROWS_PER_PAGE = 50;

  // Load data
  useEffect(() => {
    fetch('/data/chain_performance.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load chain data');
        return res.json();
      })
      .then(data => {
        setChains(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
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
    if (statsRef.current && chains.length > 0) {
      gsap.fromTo(
        statsRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out', delay: 0.2 }
      );
    }
  }, [chains]);

  // Animate table when filters change
  useEffect(() => {
    if (tableRef.current) {
      const rows = tableRef.current.querySelectorAll('.chain-row');
      if (rows.length > 0) {
        gsap.fromTo(
          rows,
          { opacity: 0, x: -10 },
          { opacity: 1, x: 0, duration: 0.3, stagger: 0.02, ease: 'power2.out' }
        );
      }
    }
  }, [searchTerm, minFacilities, hasAbuse, forProfitOnly, sortBy, currentPage]);

  // Filter and sort
  const filteredChains = chains
    .filter(chain => {
      // Search
      if (searchTerm && !chain.affiliatedEntity.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Min facilities
      if (minFacilities !== 'all') {
        const min = parseInt(minFacilities);
        if (chain.numberOfFacilities < min) return false;
      }

      // Has abuse
      if (hasAbuse && chain.percentageOfFacilitiesWithAnAbuseIcon === 0) {
        return false;
      }

      // For-profit only
      if (forProfitOnly && chain.percentOfFacilitiesClassifiedAsForProfit < 50) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'totalFines':
          aVal = a.totalAmountOfFinesInDollars || 0;
          bVal = b.totalAmountOfFinesInDollars || 0;
          return bVal - aVal;
        case 'avgStars':
          aVal = a.averageOverall5StarRating || 0;
          bVal = b.averageOverall5StarRating || 0;
          return aVal - bVal; // Lower stars first
        case 'facilities':
          aVal = a.numberOfFacilities || 0;
          bVal = b.numberOfFacilities || 0;
          return bVal - aVal;
        case 'abusePct':
          aVal = a.percentageOfFacilitiesWithAnAbuseIcon || 0;
          bVal = b.percentageOfFacilitiesWithAnAbuseIcon || 0;
          return bVal - aVal;
        case 'staffingHPRD':
          aVal = a.averageTotalNurseHoursPerResidentDay || 0;
          bVal = b.averageTotalNurseHoursPerResidentDay || 0;
          return aVal - bVal; // Lower staffing first
        default:
          return 0;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredChains.length / ROWS_PER_PAGE);
  const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
  const endIdx = startIdx + ROWS_PER_PAGE;
  const currentChains = filteredChains.slice(startIdx, endIdx);

  // Stats for header
  const totalChains = chains.length;
  const totalFacilities = chains.reduce((sum, c) => sum + (c.numberOfFacilities || 0), 0);
  const worstAvgStars = chains.length > 0
    ? Math.min(...chains.map(c => c.averageOverall5StarRating || 5))
    : 0;
  const highestTotalFines = chains.length > 0
    ? Math.max(...chains.map(c => c.totalAmountOfFinesInDollars || 0))
    : 0;

  // Format currency
  const formatCurrency = (val) => {
    if (!val) return '$0';
    return '$' + Math.round(val).toLocaleString();
  };

  // Format stars
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

  // Risk color class
  const getStarClass = (stars) => {
    if (!stars || stars < 2) return 'risk-critical';
    if (stars < 3) return 'risk-elevated';
    return 'risk-low';
  };

  const getAbuseClass = (pct) => {
    if (!pct) return '';
    if (pct > 20) return 'risk-critical';
    if (pct > 10) return 'risk-elevated';
    return '';
  };

  const getFinesClass = (fines) => {
    if (!fines) return '';
    if (fines > 5000000) return 'risk-critical';
    if (fines > 1000000) return 'risk-elevated';
    return '';
  };

  if (loading) {
    return (
      <div className="chains-page">
        <div className="chains-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading chain performance data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chains-page">
        <div className="chains-error">
          <h2>Error loading data</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chains-page">
      <Helmet>
        <title>Worst Nursing Home Chains — Chain Rankings | The Oversight Report</title>
        <meta name="description" content="Rankings of nursing home chains by safety performance. See which corporate operators have the worst inspection records, lowest staffing, and highest fines." />
        <link rel="canonical" href="https://oversightreports.com/chains" />
      </Helmet>
      {/* Header */}
      <div className="chains-header" ref={headerRef}>
        <h1>Chain Performance Rankings</h1>
        <p className="chains-subtitle">
          How America's largest nursing home operators compare
        </p>
      </div>

      {/* Stats Bar */}
      <div className="chains-stats" ref={statsRef}>
        <div className="stat-card">
          <div className="stat-value">{totalChains}</div>
          <div className="stat-label">Total Chains</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalFacilities.toLocaleString()}</div>
          <div className="stat-label">Facilities Covered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{worstAvgStars.toFixed(1)} ★</div>
          <div className="stat-label">Worst Avg Stars</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(highestTotalFines)}</div>
          <div className="stat-label">Highest Total Fines</div>
        </div>
      </div>

      {/* Filters */}
      <div className="chains-controls">
        <div className="chains-search">
          <input
            type="text"
            placeholder="Search chain name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>

        <div className="chains-filters">
          <div className="filter-group">
            <label>Min Facilities:</label>
            <select
              value={minFacilities}
              onChange={(e) => {
                setMinFacilities(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="5">5+</option>
              <option value="10">10+</option>
              <option value="25">25+</option>
              <option value="50">50+</option>
              <option value="100">100+</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="totalFines">Total Fines</option>
              <option value="avgStars">Avg Stars (worst first)</option>
              <option value="facilities">Number of Facilities</option>
              <option value="abusePct">Abuse Citations %</option>
              <option value="staffingHPRD">Avg Staffing HPRD (lowest first)</option>
            </select>
          </div>

          <div className="filter-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={hasAbuse}
                onChange={(e) => {
                  setHasAbuse(e.target.checked);
                  setCurrentPage(1);
                }}
              />
              Has abuse citations
            </label>
          </div>

          <div className="filter-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={forProfitOnly}
                onChange={(e) => {
                  setForProfitOnly(e.target.checked);
                  setCurrentPage(1);
                }}
              />
              For-profit only
            </label>
          </div>
        </div>

        <div className="chains-count">
          Showing {currentChains.length} of {filteredChains.length} chains
        </div>
      </div>

      {/* Table */}
      <div className="chains-table-container" ref={tableRef}>
        <table className="chains-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Chain Name</th>
              <th>Facilities</th>
              <th className="hide-mobile">States</th>
              <th>Avg Stars</th>
              <th>Total Fines</th>
              <th className="hide-mobile">Avg Fines/Facility</th>
              <th className="hide-mobile">Abuse Citations %</th>
              <th className="hide-mobile">Avg Staffing HPRD</th>
              <th className="hide-mobile">SFF Count</th>
            </tr>
          </thead>
          <tbody>
            {currentChains.map((chain, idx) => {
              const rank = startIdx + idx + 1;
              const isExpanded = expandedRow === chain.affiliatedEntityId;

              return (
                <>
                  <tr
                    key={chain.affiliatedEntityId}
                    className="chain-row"
                    onClick={() => setExpandedRow(isExpanded ? null : chain.affiliatedEntityId)}
                  >
                    <td className="rank-cell">{rank}</td>
                    <td className="name-cell">
                      <Link
                        to={`/chain/${encodeURIComponent(chain.affiliatedEntity)}`}
                        className="chain-name-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {chain.affiliatedEntity}
                      </Link>
                    </td>
                    <td>{chain.numberOfFacilities}</td>
                    <td className="hide-mobile">{chain.numberOfStatesAndTerritoriesWithOperations}</td>
                    <td className={getStarClass(chain.averageOverall5StarRating)}>
                      {renderStars(chain.averageOverall5StarRating)}
                    </td>
                    <td className={getFinesClass(chain.totalAmountOfFinesInDollars)}>
                      {formatCurrency(chain.totalAmountOfFinesInDollars)}
                    </td>
                    <td className="hide-mobile">
                      {formatCurrency(chain.averageAmountOfFinesInDollars)}
                    </td>
                    <td className={`hide-mobile ${getAbuseClass(chain.percentageOfFacilitiesWithAnAbuseIcon)}`}>
                      {chain.percentageOfFacilitiesWithAnAbuseIcon
                        ? chain.percentageOfFacilitiesWithAnAbuseIcon.toFixed(1) + '%'
                        : '0%'}
                    </td>
                    <td className="hide-mobile">
                      {chain.averageTotalNurseHoursPerResidentDay
                        ? chain.averageTotalNurseHoursPerResidentDay.toFixed(2)
                        : 'N/A'}
                    </td>
                    <td className="hide-mobile">
                      {chain.numberOfSpecialFocusFacilitiesSff || 0}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="expanded-row">
                      <td colSpan="10">
                        <div className="expanded-content">
                          <h3>Detailed Metrics for {chain.affiliatedEntity}</h3>

                          <div className="metrics-grid">
                            <div className="metric-section">
                              <h4>Portfolio Overview</h4>
                              <div className="metric-row">
                                <span>Total Facilities:</span>
                                <span>{chain.numberOfFacilities}</span>
                              </div>
                              <div className="metric-row">
                                <span>States/Territories:</span>
                                <span>{chain.numberOfStatesAndTerritoriesWithOperations}</span>
                              </div>
                              <div className="metric-row">
                                <span>Special Focus Facilities:</span>
                                <span>{chain.numberOfSpecialFocusFacilitiesSff || 0}</span>
                              </div>
                              <div className="metric-row">
                                <span>SFF Candidates:</span>
                                <span>{chain.numberOfSffCandidates || 0}</span>
                              </div>
                              <div className="metric-row">
                                <span>For-Profit %:</span>
                                <span>{chain.percentOfFacilitiesClassifiedAsForProfit}%</span>
                              </div>
                            </div>

                            <div className="metric-section">
                              <h4>Quality Ratings</h4>
                              <div className="metric-row">
                                <span>Overall Stars:</span>
                                <span>{chain.averageOverall5StarRating?.toFixed(2) || 'N/A'}</span>
                              </div>
                              <div className="metric-row">
                                <span>Health Inspection:</span>
                                <span>{chain.averageHealthInspectionRating?.toFixed(2) || 'N/A'}</span>
                              </div>
                              <div className="metric-row">
                                <span>Staffing Rating:</span>
                                <span>{chain.averageStaffingRating?.toFixed(2) || 'N/A'}</span>
                              </div>
                              <div className="metric-row">
                                <span>Quality Rating:</span>
                                <span>{chain.averageQualityRating?.toFixed(2) || 'N/A'}</span>
                              </div>
                            </div>

                            <div className="metric-section">
                              <h4>Staffing</h4>
                              <div className="metric-row">
                                <span>Total Nurse HPRD:</span>
                                <span>{chain.averageTotalNurseHoursPerResidentDay?.toFixed(2) || 'N/A'}</span>
                              </div>
                              <div className="metric-row">
                                <span>Weekend Nurse HPRD:</span>
                                <span>{chain.averageTotalWeekendNurseHoursPerResidentDay?.toFixed(2) || 'N/A'}</span>
                              </div>
                              <div className="metric-row">
                                <span>RN HPRD:</span>
                                <span>{chain.averageTotalRegisteredNurseHoursPerResidentDay?.toFixed(2) || 'N/A'}</span>
                              </div>
                              <div className="metric-row">
                                <span>Staff Turnover:</span>
                                <span>{chain.averageTotalNursingStaffTurnoverPercentage?.toFixed(1) || 'N/A'}%</span>
                              </div>
                              <div className="metric-row">
                                <span>RN Turnover:</span>
                                <span>{chain.averageRegisteredNurseTurnoverPercentage?.toFixed(1) || 'N/A'}%</span>
                              </div>
                            </div>

                            <div className="metric-section">
                              <h4>Enforcement</h4>
                              <div className="metric-row">
                                <span>Total Fines:</span>
                                <span>{formatCurrency(chain.totalAmountOfFinesInDollars)}</span>
                              </div>
                              <div className="metric-row">
                                <span>Avg Fines/Facility:</span>
                                <span>{formatCurrency(chain.averageAmountOfFinesInDollars)}</span>
                              </div>
                              <div className="metric-row">
                                <span>Total Fine Count:</span>
                                <span>{chain.totalNumberOfFines || 0}</span>
                              </div>
                              <div className="metric-row">
                                <span>Facilities w/ Abuse Citations:</span>
                                <span>{chain.numberOfFacilitiesWithAnAbuseIcon || 0} ({chain.percentageOfFacilitiesWithAnAbuseIcon?.toFixed(1) || 0}%)</span>
                              </div>
                              <div className="metric-row">
                                <span>Payment Denials:</span>
                                <span>{chain.totalNumberOfPaymentDenials || 0}</span>
                              </div>
                            </div>
                          </div>

                          <div className="expanded-footer">
                            <p className="facility-count-note">
                              This chain operates {chain.numberOfFacilities} facilities across {chain.numberOfStatesAndTerritoriesWithOperations} states/territories.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="chains-pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="pagination-btn"
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <div className="chains-disclaimer">
        <p>
          Chain performance data from CMS Affiliated Entity Performance Measures (February 2025).
          Rankings reflect aggregate metrics across all facilities in each chain.
          Individual facility quality may vary.
          Source: Centers for Medicare & Medicaid Services.
        </p>
      </div>
    </div>
  );
}
