import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getCareSetting, CMS_SNF_AS_OF_ISO } from '../data/careSettings';
import { formatDataAsOf } from '../utils/facilityBriefContent';
import { FacilityResultCard } from '../components/FacilityResultCard';
import { CompareTray } from '../components/CompareTray';
import { hasSffFlag } from '../utils/facilityFlags';
import { facilityMatchesQuery } from '../utils/sffStatus';
import { StickyFamilyActions } from '../components/StickyFamilyActions';
import { useCompareTray } from '../hooks/useCompareTray';
import { loadStateData } from '../hooks/useFacilityData';
import USAMap from '../components/USAMap';
import '../styles/family-ia.css';
import '../styles/map.css';

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

export default function StatePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const snf = getCareSetting('snf');
  const stateCode = code ? code.toUpperCase() : '';
  const stateName = STATE_NAMES[stateCode] || stateCode;
  const filterRef = useRef(null);
  const { toggle, isInCompare, atCap, count: compareCount } = useCompareTray();

  const [facilities, setFacilities] = useState([]);
  const [meta, setMeta] = useState(null);
  const [mapSummary, setMapSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [view, setView] = useState(searchParams.get('view') === 'map' ? 'map' : 'list');
  const [highRisk, setHighRisk] = useState(false);
  const [sffOnly, setSffOnly] = useState(false);
  const [sortCol, setSortCol] = useState('risk');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSticky, setShowSticky] = useState(false);

  const unknownState = !stateCode || !STATE_NAMES[stateCode];

  useEffect(() => {
    window.scrollTo(0, 0);
    if (unknownState) return undefined;

    let cancelled = false;
    loadStateData(stateCode)
      .then((data) => {
        if (cancelled) return;
        setFacilities(Array.isArray(data) ? data : data.facilities || []);
        setMeta(data._metadata || null);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || `No data found for ${stateCode}`);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stateCode, unknownState]);

  useEffect(() => {
    if (view !== 'map' || mapSummary) return undefined;
    let cancelled = false;
    fetch('/data/index.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setMapSummary(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [view, mapSummary]);

  useEffect(() => {
    function onScroll() {
      setShowSticky(window.scrollY > 200);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const asOf = formatDataAsOf(meta?.data_as_of || CMS_SNF_AS_OF_ISO);

  const filtered = useMemo(() => {
    let list = facilities;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((f) => facilityMatchesQuery(f, q));
    if (highRisk) list = list.filter((f) => (f.composite || 0) >= 60);
    if (sffOnly) list = list.filter((f) => hasSffFlag(f));
    const copy = [...list];
    copy.sort((a, b) => {
      if (sortCol === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortCol === 'stars') return (b.stars || 0) - (a.stars || 0);
      return (b.composite || 0) - (a.composite || 0);
    });
    return copy;
  }, [facilities, search, highRisk, sffOnly, sortCol]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    setCurrentPage(1);
    const next = new URLSearchParams(searchParams);
    if (value) next.set('q', value);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  function focusFilter() {
    filterRef.current?.focus();
    filterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (unknownState) {
    return (
      <div className="ia-page">
        <div className="ia-state-head">
          <h1>Data not available</h1>
          <p className="ia-sub">Unknown state code: {stateCode}</p>
          <button className="ia-btn" onClick={() => navigate(-1)}>Go back</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ia-page">
        <div className="ia-state-head">
          <p className="ia-meta-row">Loading {stateName} facilities…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ia-page">
        <div className="ia-state-head">
          <h1>Data not available</h1>
          <p className="ia-sub">{error}</p>
          <button className="ia-btn" onClick={() => navigate(-1)}>Go back</button>
        </div>
      </div>
    );
  }

  const mapData = mapSummary
    ? { state_summary: mapSummary.state_summary, states: mapSummary.state_summary }
    : null;

  return (
    <div className="ia-page">
      <Helmet>
        <title>{`${stateName} nursing homes | The Oversight Report`}</title>
        <meta
          name="description"
          content={`${facilities.length.toLocaleString('en-US')} Medicare-certified nursing homes in ${stateName}. Stars, inspections, staffing, and fines from CMS. As of ${asOf}.`}
        />
        <link rel="canonical" href={`https://www.oversightreports.com/state/${stateCode}`} />
      </Helmet>

      <div className="ia-state-wrap">
        <div className="ia-state-head">
          <nav className="ia-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true"> / </span>
            <Link to={snf.route}>{snf.familyLabel}</Link>
            <span aria-hidden="true"> / </span>
            <b>{stateName}</b>
          </nav>
          <h1>{snf.stateTitle(stateName)}</h1>
          <div className="ia-meta-row">
            {facilities.length.toLocaleString('en-US')} Medicare-certified facilities · CMS data as of {asOf}
          </div>
          <p className="ia-sub">
            Save homes while you look around. Add up to 3 to compare side-by-side — saving does not start a comparison.
          </p>
          <div className="ia-toolbar" role="toolbar" aria-label="List filters">
            <button
              type="button"
              className={`ia-pill ${view === 'list' ? 'ia-pill--on' : ''}`}
              onClick={() => setView('list')}
            >
              List
            </button>
            <button
              type="button"
              className={`ia-pill ${view === 'map' ? 'ia-pill--on' : ''}`}
              onClick={() => setView('map')}
            >
              Map
            </button>
            <button
              type="button"
              className={`ia-pill ${highRisk ? 'ia-pill--on' : ''}`}
              aria-pressed={highRisk}
              onClick={() => { setHighRisk((v) => !v); setCurrentPage(1); }}
            >
              High risk
            </button>
            <button
              type="button"
              className={`ia-pill ${sffOnly ? 'ia-pill--on' : ''}`}
              aria-pressed={sffOnly}
              onClick={() => { setSffOnly((v) => !v); setCurrentPage(1); }}
            >
              Special Focus
            </button>
            <label className="ia-pill">
              Sort:{' '}
              <select
                value={sortCol}
                onChange={(e) => { setSortCol(e.target.value); setCurrentPage(1); }}
                aria-label="Sort facilities"
                style={{ border: 0, background: 'transparent', font: 'inherit', color: 'inherit' }}
              >
                <option value="risk">risk</option>
                <option value="name">name</option>
                <option value="stars">stars</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="ia-state-results">
        {view === 'map' && (
          <div className="ia-map-wrap">
            {mapData ? (
              <USAMap
                data={mapData}
                onStateSelect={(abbr) => navigate(`/state/${abbr}`)}
              />
            ) : (
              <p className="ia-page-note">Loading map…</p>
            )}
            <p className="ia-page-note">Tap a state to open its facility list.</p>
          </div>
        )}

        {view === 'list' && (
          <>
            <div className="ia-filter">
              <input
                ref={filterRef}
                type="search"
                value={search}
                onChange={handleSearchChange}
                placeholder="Filter by name, city, ZIP, or CCN"
                aria-label="Filter facilities"
              />
            </div>
            <div className="ia-compare-inline">
              <CompareTray />
            </div>
            {paginated.map((f) => (
              <FacilityResultCard
                key={f.ccn}
                facility={f}
                viewTo={`/facility/${f.ccn}`}
                compareSelected={isInCompare(f.ccn)}
                compareFull={atCap}
                onToggleCompare={toggle}
              />
            ))}
            {paginated.length === 0 && (
              <p className="ia-empty">No skilled nursing facilities match that filter. Try a city, ZIP, or a shorter name.</p>
            )}
            {totalPages > 1 && (
              <div className="ia-pagination">
                <button
                  type="button"
                  className="ia-btn"
                  disabled={page === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="ia-meta-row">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  className="ia-btn"
                  disabled={page === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {compareCount > 0 && <CompareTray docked />}

      {compareCount === 0 && (
        <StickyFamilyActions
          visible={showSticky}
          primaryLabel="Filter"
          secondaryLabel="Saved homes"
          onPrimary={focusFilter}
          secondaryTo="/watchlist"
        />
      )}
    </div>
  );
}
