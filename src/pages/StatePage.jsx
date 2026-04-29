import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/state-detail.css';
import '../styles/state-page.css';

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia', PR: 'Puerto Rico', GU: 'Guam', VI: 'U.S. Virgin Islands',
};

const ROWS_PER_PAGE = 25;

function StarBadge({ stars }) {
  if (!stars) return <span className="sd-stars-badge sd-stars-na">N/A</span>;
  const cls = stars <= 1 ? 'sd-stars-1' : stars === 2 ? 'sd-stars-2' : stars >= 4 ? 'sd-stars-4' : 'sd-stars-3';
  return <span className={`sd-stars-badge ${cls}`}>{stars} ★</span>;
}

export default function StatePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const stateCode = code ? code.toUpperCase() : '';
  const stateName = STATE_NAMES[stateCode] || stateCode;

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = stateName
      ? `${stateName} Nursing Homes | The Oversight Report`
      : 'State Browser | The Oversight Report';
    if (!stateCode || !STATE_NAMES[stateCode]) {
      setError(`Unknown state code: ${stateCode}`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/data/states/${stateCode}.json`)
      .then(res => {
        if (!res.ok) throw new Error(`No data found for ${stateCode}`);
        return res.json();
      })
      .then(data => {
        setFacilities(Array.isArray(data) ? data : data.facilities || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [stateCode]);

  const filtered = useMemo(() => {
    if (!search.trim()) return facilities;
    const q = search.toLowerCase();
    return facilities.filter(f =>
      (f.name || '').toLowerCase().includes(q) ||
      (f.city || '').toLowerCase().includes(q)
    );
  }, [facilities, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let av, bv;
      switch (sortCol) {
        case 'name': av = a.name || ''; bv = b.name || ''; return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        case 'city': av = a.city || ''; bv = b.city || ''; return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        case 'stars': av = a.stars || 0; bv = b.stars || 0; return sortDir === 'asc' ? av - bv : bv - av;
        case 'total_hprd': av = a.total_hprd || 0; bv = b.total_hprd || 0; return sortDir === 'asc' ? av - bv : bv - av;
        case 'total_deficiencies': av = a.total_deficiencies || 0; bv = b.total_deficiencies || 0; return sortDir === 'asc' ? av - bv : bv - av;
        default: return 0;
      }
    });
    return copy;
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / ROWS_PER_PAGE);
  const paginated = sorted.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const stats = useMemo(() => {
    if (!facilities.length) return null;
    const withStars = facilities.filter(f => f.stars);
    const avgStars = withStars.length ? withStars.reduce((s, f) => s + f.stars, 0) / withStars.length : 0;
    const withHprd = facilities.filter(f => f.total_hprd);
    const avgHprd = withHprd.length ? withHprd.reduce((s, f) => s + f.total_hprd, 0) / withHprd.length : 0;
    return { count: facilities.length, avgStars, avgHprd };
  }, [facilities]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setCurrentPage(1);
  };

  const sortIcon = (col) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ⇅';

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="sd-page">
        <div className="sd-loading">
          <div className="sd-spinner"></div>
          <p>Loading {stateName} facilities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sd-page">
        <div className="sd-error">
          <h2>Data not available</h2>
          <p>{error}</p>
          <button className="sd-back-btn" onClick={() => navigate(-1)}>← Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-page">
      <Helmet>
        <title>{stateName} Nursing Homes | The Oversight Report</title>
        <meta name="description" content={`Safety data for ${stats?.count || ''} nursing homes in ${stateName}. Star ratings, staffing hours, and deficiency counts from CMS federal data.`} />
        <link rel="canonical" href={`https://www.oversightreports.com/state/${stateCode}`} />
      </Helmet>

      <div className="sd-container">
        {/* Header */}
        <div className="sd-header">
          <div className="sd-breadcrumb">
            <Link to="/">Home</Link> <span>/</span> <span>{stateName}</span>
          </div>
          <h1 className="sd-title">{stateName}</h1>
          <p className="sd-subtitle">Nursing home safety data from CMS federal records</p>

          {stats && (
            <div className="sd-stats-row">
              <div className="sd-stat">
                <div className="sd-stat-value">{stats.count.toLocaleString()}</div>
                <div className="sd-stat-label">Facilities</div>
              </div>
              <div className="sd-stat">
                <div className="sd-stat-value">{stats.avgStars.toFixed(1)} ★</div>
                <div className="sd-stat-label">Avg Star Rating</div>
              </div>
              <div className="sd-stat">
                <div className="sd-stat-value">{stats.avgHprd.toFixed(2)}</div>
                <div className="sd-stat-label">Avg HPRD</div>
              </div>
            </div>
          )}
        </div>

        {/* Search + count */}
        <div className="sd-controls">
          <input
            className="sd-search"
            type="text"
            placeholder="Search by name or city..."
            value={search}
            onChange={handleSearchChange}
            aria-label="Search facilities"
          />
          <div className="sd-result-count">
            {filtered.length < facilities.length
              ? `${filtered.length} of ${facilities.length} facilities`
              : `${facilities.length} facilities`}
          </div>
        </div>

        {/* Table */}
        <div className="sd-table-container">
          <table className="sd-table">
            <thead>
              <tr>
                <th className="sd-th-sortable" onClick={() => handleSort('name')}>
                  Facility{sortIcon('name')}
                </th>
                <th className="sd-th-sortable" onClick={() => handleSort('city')}>
                  City{sortIcon('city')}
                </th>
                <th className="sd-th-sortable sd-th-center" onClick={() => handleSort('stars')}>
                  Stars{sortIcon('stars')}
                </th>
                <th className="sd-th-sortable" onClick={() => handleSort('total_hprd')}>
                  HPRD{sortIcon('total_hprd')}
                </th>
                <th className="sd-th-sortable" onClick={() => handleSort('total_deficiencies')}>
                  Deficiencies{sortIcon('total_deficiencies')}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(f => (
                <tr key={f.ccn} className="sd-row" onClick={() => navigate(`/facility/${f.ccn}`)}>
                  <td className="sd-name-cell">
                    <Link to={`/facility/${f.ccn}`} className="sd-facility-link" onClick={e => e.stopPropagation()}>
                      {f.name}
                    </Link>
                  </td>
                  <td className="sd-city-cell">{f.city || '—'}</td>
                  <td className="sd-stars-cell">
                    <StarBadge stars={f.stars} />
                  </td>
                  <td className={`sd-hprd-cell ${(f.total_hprd || 0) < 3.5 ? 'sd-warn' : ''}`}>
                    {f.total_hprd ? f.total_hprd.toFixed(2) : '—'}
                  </td>
                  <td className={`sd-def-cell ${(f.total_deficiencies || 0) >= 15 ? 'sd-warn' : ''}`}>
                    {f.total_deficiencies ?? '—'}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan="5" className="sd-empty">No facilities match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="sd-pagination">
            <button
              className="sd-page-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ← Previous
            </button>
            <span className="sd-page-info">Page {currentPage} of {totalPages}</span>
            <button
              className="sd-page-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        )}

        <div className="sd-data-note">
          Data: CMS Five-Star Ratings, CMS PBJ Staffing, CMS Health Deficiencies — via data.cms.gov
        </div>
      </div>
    </div>
  );
}
