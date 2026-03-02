import { useState, useEffect, useRef } from 'react';
import '../../styles/facility-typeahead.css';

/**
 * FacilityTypeahead — inline search-as-you-type for facility selection
 * Searches by name, city, or CCN using the same data as the main site search.
 */
export default function FacilityTypeahead({ searchFacilities, value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef(null);

  // Sync external value changes
  useEffect(() => { setQuery(value || ''); }, [value]);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2 || !searchFacilities) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      const r = searchFacilities(query);
      setResults(r.slice(0, 8));
      setOpen(r.length > 0);
      setActiveIdx(-1);
    }, 200);
    return () => clearTimeout(t);
  }, [query, searchFacilities]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (facility) => {
    const display = `${facility.name} — ${facility.city}, ${facility.state} (${facility.ccn})`;
    setQuery(display);
    onChange(display);
    if (onSelect) onSelect(facility);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="ft-wrap" ref={wrapRef}>
      <div className="ac-search-wrap">
        <svg className="ac-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          type="text"
          placeholder="Search by facility name, city, or CCN..."
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="ft-dropdown">
          {results.map((f, i) => (
            <li
              key={f.ccn}
              className={`ft-item ${i === activeIdx ? 'ft-active' : ''}`}
              onMouseDown={() => handleSelect(f)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span className="ft-name">{f.name}</span>
              <span className="ft-meta">{f.city}, {f.state} · CCN: {f.ccn}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
