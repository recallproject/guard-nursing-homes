import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';

// Autocomplete dropdown for the hospice "Verify a referral" lane.
// - Loads /data/hospice/index.json on first focus
// - Fuzzy matches by name + city + state
// - Smart routing on submit:
//     5-digit ZIP → /hospice/compare?zip=
//     6+ digit numeric → treat as CCN, /hospice/:ccn
//     name match → /hospice/:ccn for the top result
// - Keyboard navigation with arrow keys + Enter

function looksLikeZip(value) {
  return /^[0-9]{5}(-[0-9]{4})?$/.test(value.trim());
}

function looksLikeCcn(value) {
  // Hospice CCNs are typically 6 digits, sometimes alphanumeric.
  // We treat 6+ digit numeric input as a CCN attempt.
  return /^[0-9]{6,10}$/.test(value.trim());
}

export default function HospiceSearchDropdown() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [index, setIndex] = useState(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Lazy-load the hospice search index on first focus.
  const loadIndex = useCallback(async () => {
    if (index) return;
    try {
      const res = await fetch('/data/hospice/index.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIndex(data);
    } catch (e) {
      console.error('Failed to load hospice search index', e);
    }
  }, [index]);

  // Build a Fuse instance once the index loads.
  const fuse = useMemo(() => {
    if (!index) return null;
    return new Fuse(index, {
      keys: ['name', 'city', 'state', 'zip'],
      threshold: 0.32,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }, [index]);

  // Compute matches for the current query.
  const results = useMemo(() => {
    if (!fuse || !query.trim()) return null;
    const q = query.trim();

    // ZIP query — show hospices in that ZIP first if any
    if (looksLikeZip(q)) {
      const zipMatches = (index || []).filter(p => p.zip && p.zip.startsWith(q));
      if (zipMatches.length > 0) return zipMatches.slice(0, 8);
    }

    return fuse.search(q).slice(0, 8).map(r => r.item);
  }, [query, fuse, index]);

  useEffect(() => { setActiveIndex(-1); }, [query]);

  // Plausible: debounced "search returned ≥1 result" tracking. Fires once
  // the user pauses typing and the current query has at least one match.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !results || results.length === 0) return undefined;
    const timer = setTimeout(() => {
      if (window.plausible) {
        window.plausible('Hospice-Search-Used', {
          props: { resultCount: results.length, queryLength: trimmed.length },
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, results]);

  // Click-outside closes the dropdown.
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const navigateToCcn = (ccn) => {
    setOpen(false);
    navigate(`/hospice/${encodeURIComponent(ccn)}`);
  };

  const navigateToCompare = (zip) => {
    setOpen(false);
    navigate(`/hospice/compare?zip=${encodeURIComponent(zip)}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    const resultCount = results ? results.length : 0;

    // If a result is highlighted, navigate to it.
    if (activeIndex >= 0 && results && results[activeIndex]) {
      if (window.plausible) {
        window.plausible('Hospice-Search-Submit', { props: { queryType: 'name', resultCount } });
      }
      navigateToCcn(results[activeIndex].ccn);
      return;
    }

    // ZIP → compare page (the natural place for area-based searches).
    if (looksLikeZip(q)) {
      if (window.plausible) {
        window.plausible('Hospice-Search-Submit', { props: { queryType: 'zip', resultCount } });
      }
      navigateToCompare(q);
      return;
    }

    // 6+ digit numeric → CCN.
    if (looksLikeCcn(q)) {
      if (window.plausible) {
        window.plausible('Hospice-Search-Submit', { props: { queryType: 'ccn', resultCount } });
      }
      navigateToCcn(q);
      return;
    }

    // Otherwise: top fuzzy match if any, else fall through to compare-by-city.
    if (results && results.length > 0) {
      if (window.plausible) {
        window.plausible('Hospice-Search-Submit', { props: { queryType: 'name', resultCount } });
      }
      navigateToCcn(results[0].ccn);
      return;
    }

    if (window.plausible) {
      window.plausible('Hospice-Search-Submit', { props: { queryType: 'name', resultCount: 0 } });
    }
    navigate(`/hospice/compare?city=${encodeURIComponent(q)}`);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, (results?.length || 1) - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const itemIsActive = (i) => i === activeIndex;
  const showZipHint = query.trim() && looksLikeZip(query.trim());

  return (
    <div ref={containerRef} className="hsd">
      <form className="hsd-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="hsd-input"
          placeholder="Hospice name, CCN, or ZIP — like &quot;Compassus&quot; or &quot;94608&quot;"
          aria-label="Search for a hospice"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { loadIndex(); setOpen(true); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button type="submit" className="hsd-submit">Look it up</button>
      </form>

      {open && (
        <div className="hsd-dropdown" role="listbox">
          {!index && <div className="hsd-loading">Loading…</div>}

          {index && !query.trim() && (
            <div className="hsd-empty">
              <div className="hsd-empty-title">Try one of these</div>
              <ul className="hsd-empty-tips">
                <li>Type a <strong>hospice name</strong> — fuzzy match handles spelling</li>
                <li>Type a <strong>5-digit ZIP</strong> — opens the compare view for your area</li>
                <li>Type a <strong>CCN</strong> — opens that hospice directly</li>
              </ul>
            </div>
          )}

          {index && query.trim() && results && results.length === 0 && (
            <div className="hsd-empty">
              <div className="hsd-empty-title">No matches.</div>
              <div style={{ fontSize: 13, color: 'var(--muted, #64748B)', marginTop: 6 }}>
                Try a different spelling, or compare hospices in your ZIP →
              </div>
            </div>
          )}

          {index && results && results.length > 0 && (
            <>
              {showZipHint && (
                <button
                  type="button"
                  className="hsd-zip-bar"
                  onClick={() => navigateToCompare(query.trim())}
                >
                  See all hospices in ZIP <strong>{query.trim()}</strong> · compare side by side →
                </button>
              )}
              <div className="hsd-group-label">Hospices</div>
              {results.map((p, i) => (
                <button
                  key={p.ccn}
                  type="button"
                  className={`hsd-result ${itemIsActive(i) ? 'hsd-result--active' : ''}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => navigateToCcn(p.ccn)}
                >
                  <span className="hsd-result-main">{p.name}</span>
                  <span className="hsd-result-meta">
                    {p.city}, {p.state}
                    {p.flagged_count > 0 && (
                      <span className="hsd-result-flag">
                        {' · '}
                        {p.flagged_count} pattern{p.flagged_count === 1 ? '' : 's'} flagged
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      <style>{`
        .hsd { position: relative; }
        .hsd-form { display: flex; border: 1px solid #D7E0EA; border-radius: 8px; background: #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,.05), 0 6px 16px rgba(29,53,87,.07); overflow: hidden; }
        .hsd-form:focus-within { border-color: #2B6CB0; }
        .hsd-input { flex: 1; border: 0; outline: 0; background: transparent; padding: 16px 18px; font-size: 15px; color: #1D3557; font-family: inherit; min-width: 0; }
        .hsd-input::placeholder { color: #94A3B8; }
        .hsd-submit { padding: 0 26px; border: 0; background: #0D9488; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; font-family: inherit; }
        .hsd-submit:hover { background: #0a7a72; }

        .hsd-dropdown { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #FFFFFF; border: 1px solid #D7E0EA; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,.06), 0 12px 28px rgba(29,53,87,.09); max-height: 460px; overflow-y: auto; z-index: 60; padding: 8px 0; }
        .hsd-loading, .hsd-empty { padding: 16px 22px; font-family: "Plus Jakarta Sans", sans-serif; font-size: 13.5px; color: #334155; }
        .hsd-empty-title { font-size: 13px; font-weight: 700; color: #1D3557; letter-spacing: 0.04em; margin-bottom: 6px; }
        .hsd-empty-tips { font-size: 13px; color: #334155; list-style: disc; padding-left: 18px; margin: 0; line-height: 1.6; }
        .hsd-empty-tips strong { color: #1D3557; }
        .hsd-group-label { font-family: "JetBrains Mono", monospace; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #94A3B8; font-weight: 700; padding: 8px 22px 4px; }
        .hsd-result { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; width: 100%; padding: 10px 22px; background: transparent; border: 0; text-align: left; cursor: pointer; font-family: "Plus Jakarta Sans", sans-serif; transition: background-color 80ms ease; }
        .hsd-result:hover, .hsd-result--active { background: #F0F4F8; }
        .hsd-result-main { font-size: 14.5px; color: #1D3557; font-weight: 600; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hsd-result-meta { font-family: "JetBrains Mono", monospace; font-size: 11.5px; color: #64748B; white-space: nowrap; flex-shrink: 0; }
        .hsd-result-flag { color: #D97706; font-weight: 700; }
        .hsd-zip-bar { width: 100%; padding: 12px 22px; background: rgba(217,119,6,0.08); border: 0; border-bottom: 1px solid #D7E0EA; font-family: "Plus Jakarta Sans", sans-serif; font-size: 13.5px; color: #1D3557; text-align: left; cursor: pointer; }
        .hsd-zip-bar:hover { background: rgba(217,119,6,0.14); }
        .hsd-zip-bar strong { color: #B45309; font-family: "JetBrains Mono", monospace; }
      `}</style>
    </div>
  );
}
