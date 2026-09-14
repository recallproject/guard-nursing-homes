import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { looksLikeCcn, looksLikeZip, toTitleCase } from '../utils/postAcute';

export default function PostAcuteSearchDropdown({ setting, initialQuery = '' }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [index, setIndex] = useState(null);
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const loadIndex = useCallback(async () => {
    if (index) return;
    try {
      const res = await fetch(`/data/${setting.dataDir}/index.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setIndex(await res.json());
    } catch (e) {
      console.error(`Failed to load ${setting.id} search index`, e);
    }
  }, [index, setting.dataDir, setting.id]);

  const fuse = useMemo(() => {
    if (!index) return null;
    return new Fuse(index, {
      keys: ['name', 'city', 'state', 'zip'],
      threshold: 0.32,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }, [index]);

  const results = useMemo(() => {
    if (!fuse || !query.trim()) return null;
    const q = query.trim();
    if (looksLikeZip(q)) {
      const zipMatches = (index || []).filter((p) => p.zip && p.zip.startsWith(q.slice(0, 5)));
      if (zipMatches.length > 0) return zipMatches.slice(0, 8);
    }
    return fuse.search(q).slice(0, 8).map((r) => r.item);
  }, [query, fuse, index]);

  useEffect(() => { setActiveIndex(-1); }, [query]);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const goProvider = (ccn) => {
    setOpen(false);
    navigate(`${setting.route}/${encodeURIComponent(ccn)}`);
  };

  const goSearch = (q) => {
    setOpen(false);
    navigate(`${setting.route}?q=${encodeURIComponent(q)}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (activeIndex >= 0 && results && results[activeIndex]) {
      goProvider(results[activeIndex].ccn);
      return;
    }
    if (looksLikeCcn(q)) {
      goProvider(q.toUpperCase());
      return;
    }
    goSearch(q);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, (results?.length || 1) - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="pas-search">
      <form className="pas-search-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="pas-search-input"
          placeholder={setting.searchPlaceholder}
          aria-label={setting.searchAria}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { loadIndex(); setOpen(true); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button type="submit" className="pas-search-submit">Search</button>
      </form>

      {open && (
        <div className="pas-search-dropdown" role="listbox">
          {!index && <div className="pas-search-loading">Loading…</div>}

          {index && !query.trim() && (
            <div className="pas-search-empty">
              <div className="pas-search-empty-title">Try one of these</div>
              <ul className="pas-search-tips">
                <li>Type a <strong>name</strong> — fuzzy match handles spelling</li>
                <li>Type a <strong>city, state, or ZIP</strong> — lists matching {setting.plural}</li>
                <li>Type a <strong>CCN</strong> — opens that provider directly</li>
              </ul>
            </div>
          )}

          {index && query.trim() && results && results.length === 0 && (
            <div className="pas-search-empty">
              <div className="pas-search-empty-title">No matches.</div>
              <p>Try a different spelling, or search by city or ZIP.</p>
            </div>
          )}

          {index && results && results.length > 0 && (
            <>
              <div className="pas-search-group-label">{setting.label}</div>
              {results.map((p, i) => (
                <button
                  key={p.ccn}
                  type="button"
                  className={`pas-search-result ${i === activeIndex ? 'pas-search-result--active' : ''}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => goProvider(p.ccn)}
                >
                  <span className="pas-search-result-main">{toTitleCase(p.name)}</span>
                  <span className="pas-search-result-meta">
                    {toTitleCase(p.city)}, {p.state}
                    {p.star != null ? ` · ${p.star}★` : ''}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
