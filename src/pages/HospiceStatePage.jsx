import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/hospice-state.css';

// State abbreviation → display name (covers all 50 + DC + territories used in CMS hospice data).
const STATE_NAME = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin',
  WY: 'Wyoming', PR: 'Puerto Rico', VI: 'U.S. Virgin Islands',
  GU: 'Guam', MP: 'Northern Mariana Islands',
};

const ROWS_PER_PAGE = 50;

// Toggle hospice star badge (re-uses palette logic from SNF state page but light theme).
function StarBadge({ stars }) {
  if (!stars && stars !== 0) return <span className="hs-stars-badge hs-stars-na">N/A</span>;
  const n = Number(stars);
  if (!n) return <span className="hs-stars-badge hs-stars-na">N/A</span>;
  const cls = n <= 2 ? 'hs-stars-low' : n === 3 ? 'hs-stars-mid' : 'hs-stars-high';
  return <span className={`hs-stars-badge ${cls}`}>{n.toFixed(0)} ★</span>;
}

function FlagBadge({ count }) {
  if (!count) return <span className="hs-flag-clear">—</span>;
  return (
    <span className="hs-flag-badge" title="CMS-published outlier on at least one Hospice Care Index measure">
      {count} flagged
    </span>
  );
}

function ownershipLabel(provider) {
  const t = (provider.ownership_type || '').trim();
  if (!t) return '—';
  return t;
}

export default function HospiceStatePage() {
  const { stateCode } = useParams();
  const navigate = useNavigate();
  const code = (stateCode || '').toUpperCase();
  const stateName = STATE_NAME[code];

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [view, setView] = useState('list'); // 'list' | 'cards'
  const [page, setPage] = useState(1);

  // Debounce search input — 300ms
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handle);
  }, [search]);

  // Plausible: search-used (after debounce settles to a non-empty value).
  useEffect(() => {
    if (!debouncedSearch.trim() || !code) return;
    if (window.plausible) {
      window.plausible('Hospice-State-Search-Used', {
        props: { state: code, query_length: debouncedSearch.length }
      });
    }
  }, [debouncedSearch, code]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!stateName) {
      setError(`Unknown state code: ${code}`);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/data/hospice/states/${code}.json`)
      .then(r => {
        if (!r.ok) throw new Error(`No hospice data found for ${code}`);
        return r.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
        if (window.plausible) {
          window.plausible('Hospice-State-View', {
            props: { state: code, count: json && json.count ? json.count : 0 }
          });
        }
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [code, stateName]);

  const providers = data && Array.isArray(data.providers) ? data.providers : [];

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q)
    );
  }, [providers, debouncedSearch]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let av, bv;
      switch (sortCol) {
        case 'name':
          av = a.name || ''; bv = b.name || '';
          return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        case 'city':
          av = a.city || ''; bv = b.city || '';
          return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        case 'rating':
          av = a.cms_overall_rating ?? -1;
          bv = b.cms_overall_rating ?? -1;
          return sortDir === 'asc' ? av - bv : bv - av;
        case 'cahps': {
          av = (a.cahps && a.cahps.overall_rating_pct != null) ? a.cahps.overall_rating_pct : -1;
          bv = (b.cahps && b.cahps.overall_rating_pct != null) ? b.cahps.overall_rating_pct : -1;
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        case 'flagged':
          av = (a.flags && a.flags.flagged_count) || 0;
          bv = (b.flags && b.flags.flagged_count) || 0;
          return sortDir === 'asc' ? av - bv : bv - av;
        default:
          return 0;
      }
    });
    return copy;
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
  const paginated = useMemo(() =>
    sorted.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE),
    [sorted, page]
  );

  // Reset pagination when filter/sort changes
  useEffect(() => { setPage(1); }, [debouncedSearch, sortCol, sortDir]);

  // State CAHPS averages (only providers with non-null overall_rating_pct).
  const cahpsAvg = useMemo(() => {
    if (!providers.length) return null;
    const vals = providers
      .map(p => (p.cahps && p.cahps.overall_rating_pct != null) ? Number(p.cahps.overall_rating_pct) : null)
      .filter(v => v != null && !Number.isNaN(v));
    if (!vals.length) return null;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }, [providers]);

  const handleSort = (col) => {
    if (sortCol === col) {
      const nextDir = sortDir === 'asc' ? 'desc' : 'asc';
      setSortDir(nextDir);
      if (window.plausible) {
        window.plausible('Hospice-State-Sort-Changed', { props: { state: code, column: col, direction: nextDir } });
      }
    } else {
      setSortCol(col);
      const nextDir = (col === 'rating' || col === 'cahps') ? 'desc' : 'asc';
      setSortDir(nextDir);
      if (window.plausible) {
        window.plausible('Hospice-State-Sort-Changed', { props: { state: code, column: col, direction: nextDir } });
      }
    }
  };

  const sortIcon = (col) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const handleRowClick = (p) => {
    if (window.plausible) {
      window.plausible('Hospice-State-Row-Click', { props: { state: code, ccn: p.ccn } });
    }
    navigate(`/hospice/${p.ccn}`);
  };

  // Bad route guard
  if (!stateName && !loading) {
    return <Navigate to="/hospice" replace />;
  }

  if (loading) {
    return (
      <div className="hospice-state">
        <div className="hs-container">
          <div className="hs-loading">
            <div className="hs-spinner" />
            <p>Loading {stateName || code} hospice providers…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hospice-state">
        <div className="hs-container">
          <div className="hs-error">
            <h2>Hospice data unavailable</h2>
            <p>{error}</p>
            <button className="hs-back-btn" onClick={() => navigate('/hospice')}>← Back to Hospice</button>
          </div>
        </div>
      </div>
    );
  }

  const count = data?.count ?? providers.length;
  const flaggedCount = data?.flagged_count ?? providers.reduce((s, p) => s + ((p.flags && p.flags.flagged_count) || 0 > 0 ? 1 : 0), 0);
  const flaggedPct = data?.flagged_pct;

  return (
    <div className="hospice-state">
      <Helmet>
        <title>{`${stateName} Hospice Providers — The Oversight Report`}</title>
        <meta
          name="description"
          content={`${count.toLocaleString()} Medicare-certified hospice providers in ${stateName}. CMS quality scores, family-experience ratings, and patterns flagged for review. Free, sourced.`}
        />
        <link rel="canonical" href={`https://www.oversightreports.com/hospice/state/${code}`} />
      </Helmet>

      {/* HERO */}
      <section className="hs-hero">
        <div className="hs-container">
          <div className="hs-crumb">
            <Link to="/">Home</Link>
            <span className="hs-crumb-sep">/</span>
            <Link to="/hospice">Hospice</Link>
            <span className="hs-crumb-sep">/</span>
            <span>{stateName}</span>
          </div>
          <div className="hs-eyebrow">// hospice providers · sourced from CMS</div>
          <h1 className="hs-headline">
            Hospice providers in <em>{stateName}</em>
          </h1>
          <p className="hs-sub">
            Every Medicare-certified hospice in {stateName}. CMS overall star rating, family-experience scores, and
            patterns flagged for review when this provider's rates exceed the national 90th percentile.
          </p>

          <div className="hs-stat-row">
            <div className="hs-stat">
              <div className="hs-stat-val">{count.toLocaleString()}</div>
              <div className="hs-stat-lbl">Providers</div>
            </div>
            <div className="hs-stat">
              <div className="hs-stat-val">{flaggedCount.toLocaleString()}</div>
              <div className="hs-stat-lbl">Flagged for review{flaggedPct != null ? ` · ${Number(flaggedPct).toFixed(1)}%` : ''}</div>
            </div>
            <div className="hs-stat">
              <div className="hs-stat-val">{cahpsAvg != null ? `${cahpsAvg.toFixed(0)}%` : '—'}</div>
              <div className="hs-stat-lbl">Avg CAHPS overall</div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTROLS */}
      <section className="hs-section">
        <div className="hs-container">
          <div className="hs-controls">
            <div className="hs-search-wrap">
              <input
                type="text"
                className="hs-search"
                placeholder="Search by name or city"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search hospice providers"
              />
              <div className="hs-result-count">
                {filtered.length < providers.length
                  ? `${filtered.length.toLocaleString()} of ${providers.length.toLocaleString()} providers`
                  : `${providers.length.toLocaleString()} providers`}
              </div>
            </div>
            <div className="hs-view-toggle" role="tablist" aria-label="View mode">
              <button
                role="tab"
                aria-selected={view === 'list'}
                className={`hs-view-btn ${view === 'list' ? 'is-active' : ''}`}
                onClick={() => setView('list')}
              >
                List
              </button>
              <button
                role="tab"
                aria-selected={view === 'cards'}
                className={`hs-view-btn ${view === 'cards' ? 'is-active' : ''}`}
                onClick={() => setView('cards')}
              >
                Cards
              </button>
            </div>
          </div>

          {view === 'list' && (
            <div className="hs-table-wrap">
              <table className="hs-table">
                <thead>
                  <tr>
                    <th className="hs-th-sortable" onClick={() => handleSort('name')}>
                      Provider{sortIcon('name')}
                    </th>
                    <th className="hs-th-sortable" onClick={() => handleSort('city')}>
                      City{sortIcon('city')}
                    </th>
                    <th>Ownership</th>
                    <th className="hs-th-sortable hs-th-center" onClick={() => handleSort('rating')}>
                      CMS rating{sortIcon('rating')}
                    </th>
                    <th className="hs-th-sortable hs-th-center" onClick={() => handleSort('cahps')}>
                      CAHPS overall{sortIcon('cahps')}
                    </th>
                    <th className="hs-th-sortable hs-th-center" onClick={() => handleSort('flagged')}>
                      Flags{sortIcon('flagged')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(p => {
                    const flagCount = (p.flags && p.flags.flagged_count) || 0;
                    return (
                      <tr key={p.ccn} className="hs-row" onClick={() => handleRowClick(p)}>
                        <td className="hs-name-cell">
                          <Link
                            to={`/hospice/${p.ccn}`}
                            className="hs-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.plausible) {
                                window.plausible('Hospice-State-Row-Click', { props: { state: code, ccn: p.ccn } });
                              }
                            }}
                          >
                            {p.name}
                          </Link>
                        </td>
                        <td className="hs-city-cell">{p.city || '—'}</td>
                        <td className="hs-own-cell">{ownershipLabel(p)}</td>
                        <td className="hs-stars-cell">
                          <StarBadge stars={p.cms_overall_rating} />
                        </td>
                        <td className="hs-cahps-cell">
                          {p.cahps && p.cahps.overall_rating_pct != null
                            ? `${Number(p.cahps.overall_rating_pct).toFixed(0)}%`
                            : <span className="hs-muted">—</span>}
                        </td>
                        <td className="hs-flag-cell">
                          <FlagBadge count={flagCount} />
                        </td>
                      </tr>
                    );
                  })}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan="6" className="hs-empty">No providers match your search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {view === 'cards' && (
            <div className="hs-card-grid">
              {paginated.map(p => {
                const flagCount = (p.flags && p.flags.flagged_count) || 0;
                return (
                  <div
                    key={p.ccn}
                    className="hs-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleRowClick(p)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick(p); }}
                  >
                    <div className="hs-card-head">
                      <Link
                        to={`/hospice/${p.ccn}`}
                        className="hs-card-name"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.plausible) {
                            window.plausible('Hospice-State-Row-Click', { props: { state: code, ccn: p.ccn } });
                          }
                        }}
                      >
                        {p.name}
                      </Link>
                      {flagCount > 0 && <FlagBadge count={flagCount} />}
                    </div>
                    <div className="hs-card-meta">
                      <span>{p.city || '—'}, {p.state || code}</span>
                      <span className="hs-card-sep">·</span>
                      <span>{ownershipLabel(p)}</span>
                    </div>
                    <div className="hs-card-grid-stats">
                      <div className="hs-card-stat">
                        <div className="hs-card-stat-lbl">CMS rating</div>
                        <div className="hs-card-stat-val"><StarBadge stars={p.cms_overall_rating} /></div>
                      </div>
                      <div className="hs-card-stat">
                        <div className="hs-card-stat-lbl">CAHPS overall</div>
                        <div className="hs-card-stat-val">
                          {p.cahps && p.cahps.overall_rating_pct != null
                            ? `${Number(p.cahps.overall_rating_pct).toFixed(0)}%`
                            : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {paginated.length === 0 && (
                <div className="hs-empty">No providers match your search.</div>
              )}
            </div>
          )}

          {totalPages > 1 && (
            <div className="hs-pagination">
              <button
                className="hs-page-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Previous
              </button>
              <span className="hs-page-info">Page {page} of {totalPages}</span>
              <button
                className="hs-page-btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}

          <div className="hs-footnote">
            <strong>"Flagged for review"</strong> means this provider's rate on a CMS-published Hospice Care Index measure
            (live discharges or general inpatient utilization) is above the national 90th percentile. It is a starting
            point for closer review, not a regulatory finding. Source: CMS Hospice Care Compare · Hospice Item Set ·
            CAHPS Hospice Survey.
          </div>
        </div>
      </section>
    </div>
  );
}
