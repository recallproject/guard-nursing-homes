import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';

const POPULAR_CITIES = ['Houston', 'Los Angeles', 'Chicago', 'Phoenix', 'Brooklyn'];

export default function HeroSearchDropdown() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [index, setIndex] = useState(null); // { facilities, cities, chains, states }
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Lazy-load the search index on first focus.
  const loadIndex = useCallback(async () => {
    if (index) return;
    try {
      const res = await fetch('/data/search-index.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIndex(data);
    } catch (e) {
      console.error('Failed to load search index', e);
    }
  }, [index]);

  // Build Fuse instances once the index is loaded.
  const fuses = useMemo(() => {
    if (!index) return null;
    return {
      facilities: new Fuse(index.facilities, {
        keys: ['name', 'city'],
        threshold: 0.32,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
      cities: new Fuse(index.cities, {
        keys: ['name'],
        threshold: 0.25,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
      chains: new Fuse(index.chains, {
        keys: ['name'],
        threshold: 0.32,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
      states: new Fuse(index.states, {
        keys: ['name', 'code'],
        threshold: 0.25,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    };
  }, [index]);

  // Compute results based on query.
  const results = useMemo(() => {
    if (!index || !fuses) return null;
    const q = query.trim();
    if (!q) return null;

    const places = fuses.cities.search(q).slice(0, 5).map(r => r.item);
    const facilities = fuses.facilities.search(q).slice(0, 6).map(r => r.item);
    const chains = fuses.chains.search(q).slice(0, 4).map(r => r.item);
    const states = fuses.states.search(q).slice(0, 3).map(r => r.item);

    return { places, facilities, chains, states };
  }, [query, index, fuses]);

  // Flatten the rendered list for keyboard navigation.
  const flatItems = useMemo(() => {
    if (!open) return [];
    if (results) {
      return [
        ...results.places.map(c => ({ type: 'city', data: c })),
        ...results.facilities.map(f => ({ type: 'facility', data: f })),
        ...results.chains.map(c => ({ type: 'chain', data: c })),
        ...results.states.map(s => ({ type: 'state', data: s })),
      ];
    }
    // empty state — popular cities + browse-by-state
    if (index) {
      const popular = POPULAR_CITIES
        .map(name => index.cities.find(c => c.name === name))
        .filter(Boolean);
      return popular.map(c => ({ type: 'city', data: c }));
    }
    return [];
  }, [open, results, index]);

  // Reset active index when results change.
  useEffect(() => { setActiveIndex(-1); }, [query, open]);

  // Click-outside closes dropdown.
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Navigate based on item type.
  const handlePick = (item) => {
    if (!item) return;
    setOpen(false);
    if (item.type === 'facility') navigate(`/facility/${item.data.ccn}`);
    else if (item.type === 'chain') navigate(`/chain/${encodeURIComponent(item.data.slug || item.data.name)}`);
    else if (item.type === 'state') navigate(`/states/${item.data.name.toLowerCase().replace(/\s+/g, '-')}`);
    else if (item.type === 'city') {
      const stateCode = item.data.state;
      navigate(`/skilled-nursing?city=${encodeURIComponent(item.data.name)}&state=${stateCode}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && flatItems[activeIndex]) {
        handlePick(flatItems[activeIndex]);
      } else if (query.trim()) {
        // No selection; fall back to skilled-nursing search page with the query.
        navigate(`/skilled-nursing?q=${encodeURIComponent(query)}`);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeIndex >= 0 && flatItems[activeIndex]) {
      handlePick(flatItems[activeIndex]);
    } else if (query.trim()) {
      navigate(`/skilled-nursing?q=${encodeURIComponent(query)}`);
      setOpen(false);
    } else {
      navigate('/skilled-nursing');
    }
  };

  // Helpers for rendering active highlight.
  const itemIsActive = (i) => i === activeIndex;

  let cursor = 0;
  const placeStart = cursor;
  cursor += results?.places.length || 0;
  const facilityStart = cursor;
  cursor += results?.facilities.length || 0;
  const chainStart = cursor;
  cursor += results?.chains.length || 0;
  const stateStart = cursor;

  return (
    <div ref={containerRef} className="pa-search">
      <form className="pa-hero-search" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="pa-hero-search-input"
          placeholder="Address, city, ZIP, or facility name"
          aria-label="Search for a city or post-acute facility"
          value={query}
          onFocus={() => { loadIndex(); setOpen(true); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button type="submit" className="pa-hero-search-submit">Search</button>
      </form>

      {open && (
        <div className="pa-search-dropdown" role="listbox">
          {!index && (
            <div className="pa-search-loading">Loading…</div>
          )}

          {index && !results && (
            <div className="pa-search-empty">
              <div className="pa-search-empty-title">Try one of these</div>
              <ul className="pa-search-empty-tips">
                <li>Search by your <strong>city</strong> — like &ldquo;Oakland&rdquo;</li>
                <li>Search by <strong>ZIP</strong> — like &ldquo;94608&rdquo;</li>
                <li>Type a <strong>facility name</strong> — any spelling, fuzzy matches</li>
              </ul>
              <div className="pa-search-group-label">Popular cities</div>
              {flatItems.map((item, i) => (
                <button
                  key={`empty-${i}`}
                  type="button"
                  className={`pa-search-result ${itemIsActive(i) ? 'pa-search-result--active' : ''}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => handlePick(item)}
                >
                  <span className="pa-search-result-main">{item.data.name}, {item.data.state}</span>
                  <span className="pa-search-result-meta">{item.data.count} facilities</span>
                </button>
              ))}
            </div>
          )}

          {results && flatItems.length === 0 && (
            <div className="pa-search-empty">
              <div className="pa-search-empty-title">No matches.</div>
              <div className="pa-search-empty-tips" style={{ paddingLeft: 0, listStyle: 'none' }}>
                Try a city or check spelling — fuzzy match is on.
              </div>
            </div>
          )}

          {results && results.places.length > 0 && (
            <div className="pa-search-group">
              <div className="pa-search-group-label">Places</div>
              {results.places.map((c, i) => {
                const idx = placeStart + i;
                return (
                  <button
                    key={`p-${c.name}-${c.state}`}
                    type="button"
                    className={`pa-search-result ${itemIsActive(idx) ? 'pa-search-result--active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handlePick({ type: 'city', data: c })}
                  >
                    <span className="pa-search-result-main">{c.name}, {c.state}</span>
                    <span className="pa-search-result-meta">{c.count} facilities</span>
                  </button>
                );
              })}
            </div>
          )}

          {results && results.facilities.length > 0 && (
            <div className="pa-search-group">
              <div className="pa-search-group-label">Facilities</div>
              {results.facilities.map((f, i) => {
                const idx = facilityStart + i;
                return (
                  <button
                    key={`f-${f.ccn}`}
                    type="button"
                    className={`pa-search-result ${itemIsActive(idx) ? 'pa-search-result--active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handlePick({ type: 'facility', data: f })}
                  >
                    <span className="pa-search-result-main">{f.name}</span>
                    <span className="pa-search-result-meta">{f.city}, {f.state}</span>
                  </button>
                );
              })}
            </div>
          )}

          {results && results.chains.length > 0 && (
            <div className="pa-search-group">
              <div className="pa-search-group-label">Chains</div>
              {results.chains.map((c, i) => {
                const idx = chainStart + i;
                return (
                  <button
                    key={`c-${c.slug}`}
                    type="button"
                    className={`pa-search-result ${itemIsActive(idx) ? 'pa-search-result--active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handlePick({ type: 'chain', data: c })}
                  >
                    <span className="pa-search-result-main">{c.name}</span>
                    <span className="pa-search-result-meta">{c.count} facilities · {c.states} states</span>
                  </button>
                );
              })}
            </div>
          )}

          {results && results.states.length > 0 && (
            <div className="pa-search-group">
              <div className="pa-search-group-label">States</div>
              {results.states.map((s, i) => {
                const idx = stateStart + i;
                return (
                  <button
                    key={`s-${s.code}`}
                    type="button"
                    className={`pa-search-result ${itemIsActive(idx) ? 'pa-search-result--active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handlePick({ type: 'state', data: s })}
                  >
                    <span className="pa-search-result-main">{s.name}</span>
                    <span className="pa-search-result-meta">{s.count} facilities</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
