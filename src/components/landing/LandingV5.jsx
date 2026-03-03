import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../../styles/landing-v5.css';

/* ═══════════════════════════════════════════
   INLINE SEARCH — Reused from LandingV4
   ═══════════════════════════════════════════ */
function InlineSearch({ searchFacilities, placeholder, onFallbackSearch }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    const timeout = setTimeout(() => {
      if (searchFacilities) {
        const r = searchFacilities(query);
        setResults(r.slice(0, 8));
        setIsOpen(r.length > 0);
        setActiveIndex(-1);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, searchFacilities]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(facility) {
    window.plausible && window.plausible('Facility-Search', { props: { query: query.slice(0, 100), facility: facility.name, ccn: facility.ccn } });
    navigate(`/facility/${facility.ccn}`);
    setIsOpen(false);
    setQuery('');
  }

  function handleKeyDown(e) {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Enter' && onFallbackSearch) onFallbackSearch();
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(prev => Math.min(prev + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(prev => Math.max(prev - 1, -1)); }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); handleSelect(results[activeIndex]); }
    else if (e.key === 'Escape') { setIsOpen(false); inputRef.current?.blur(); }
  }

  return (
    <div className="v5-search-container" ref={wrapperRef}>
      <div className={`v5-search-box ${isOpen ? 'v5-search-box--active' : ''}`}>
        <svg className="v5-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          ref={inputRef}
          className="v5-search-input"
          type="text"
          placeholder={placeholder || "Search by name, city, state, ZIP, or CCN"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {query.length > 0 && (
          <button className="v5-search-clear" onClick={() => { setQuery(''); setResults([]); setIsOpen(false); inputRef.current?.focus(); }} aria-label="Clear search">&times;</button>
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="v5-search-dropdown">
          {results.map((facility, i) => (
            <div key={facility.ccn} className={`v5-search-result ${i === activeIndex ? 'v5-search-result--active' : ''}`} onClick={() => handleSelect(facility)} onMouseEnter={() => setActiveIndex(i)}>
              <div className="v5-search-result-info">
                <div className="v5-search-result-name">{facility.name}</div>
                <div className="v5-search-result-location">{facility.city}, {facility.state}</div>
              </div>
              <div className="v5-search-result-meta">{facility.state} &middot; {facility.ccn}</div>
            </div>
          ))}
          <div className="v5-search-dropdown-hint">
            {results.length >= 8 ? 'Keep typing to narrow results...' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      )}
      {query.trim().length >= 2 && !isOpen && results.length === 0 && (
        <div className="v5-search-dropdown">
          <div className="v5-search-no-results">No facilities found for &ldquo;{query}&rdquo;</div>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════
   STATE CARDS DATA
   ═══════════════════════════════════════════ */
const STATE_CARDS = [
  { abbr: 'AL', count: '223 facilities', flag: 'flagged', note: '7 on CMS watchlist' },
  { abbr: 'AK', count: '16 facilities' },
  { abbr: 'AZ', count: '148 facilities' },
  { abbr: 'AR', count: '228 facilities' },
  { abbr: 'CA', count: '1,196 facilities', flag: 'flagged', note: '12 on CMS watchlist' },
  { abbr: 'CO', count: '218 facilities' },
  { abbr: 'CT', count: '213 facilities' },
  { abbr: 'DE', count: '45 facilities' },
  { abbr: 'FL', count: '690 facilities', flag: 'flagged', note: '9 on CMS watchlist' },
  { abbr: 'GA', count: '358 facilities', flag: 'flagged', note: '6 on CMS watchlist' },
  { abbr: 'HI', count: '45 facilities' },
  { abbr: 'ID', count: '80 facilities' },
  { abbr: 'IL', count: '717 facilities', flag: 'flagged', note: '9 on CMS watchlist' },
  { abbr: 'IN', count: '536 facilities' },
  { abbr: 'IA', count: '425 facilities' },
  { abbr: 'KS', count: '334 facilities' },
  { abbr: 'KY', count: '283 facilities' },
  { abbr: 'LA', count: '267 facilities', flag: 'flagged', note: '5 on CMS watchlist' },
  { abbr: 'ME', count: '94 facilities', flag: 'top', note: 'Above avg staffing' },
  { abbr: 'MD', count: '228 facilities' },
  { abbr: 'MA', count: '380 facilities' },
  { abbr: 'MI', count: '434 facilities' },
  { abbr: 'MN', count: '358 facilities' },
  { abbr: 'MS', count: '196 facilities', flag: 'flagged', note: '8 on CMS watchlist' },
  { abbr: 'MO', count: '517 facilities' },
  { abbr: 'MT', count: '68 facilities' },
  { abbr: 'NE', count: '207 facilities' },
  { abbr: 'NV', count: '63 facilities' },
  { abbr: 'NH', count: '74 facilities', flag: 'top', note: 'Low citation rate' },
  { abbr: 'NJ', count: '356 facilities' },
  { abbr: 'NM', count: '73 facilities' },
  { abbr: 'NY', count: '615 facilities', flag: 'flagged', note: '11 on CMS watchlist' },
  { abbr: 'NC', count: '423 facilities' },
  { abbr: 'ND', count: '80 facilities', flag: 'top', note: 'Low citation rate' },
  { abbr: 'OH', count: '948 facilities', flag: 'flagged', note: '10 on CMS watchlist' },
  { abbr: 'OK', count: '296 facilities' },
  { abbr: 'OR', count: '131 facilities', flag: 'top', note: 'Above avg staffing' },
  { abbr: 'PA', count: '693 facilities' },
  { abbr: 'RI', count: '80 facilities' },
  { abbr: 'SC', count: '185 facilities' },
  { abbr: 'SD', count: '101 facilities', flag: 'top', note: 'Above avg staffing' },
  { abbr: 'TN', count: '314 facilities' },
  { abbr: 'TX', count: '1,213 facilities', flag: 'flagged', note: '14 on CMS watchlist' },
  { abbr: 'UT', count: '99 facilities' },
  { abbr: 'VT', count: '37 facilities' },
  { abbr: 'VA', count: '286 facilities' },
  { abbr: 'WA', count: '218 facilities' },
  { abbr: 'WV', count: '125 facilities' },
  { abbr: 'WI', count: '367 facilities' },
  { abbr: 'WY', count: '38 facilities' },
];


/* ═══════════════════════════════════════════
   LANDING V5 — Main Component
   ═══════════════════════════════════════════ */
export default function LandingV5({ onSearch, onExplore, searchFacilities }) {
  const navigate = useNavigate();
  const statsRef = useRef(null);
  const countersAnimated = useRef(false);
  const [cmsAlertDismissed, setCmsAlertDismissed] = useState(false);
  const [stateFilter, setStateFilter] = useState('');
  const [showSticky, setShowSticky] = useState(false);

  // Counter animation on scroll
  useEffect(() => {
    if (!statsRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !countersAnimated.current) {
          countersAnimated.current = true;
          statsRef.current.querySelectorAll('[data-target]').forEach(el => {
            animateCounter(el);
          });
        }
      });
    }, { threshold: 0.1 });
    observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const duration = 2000;
    const startTime = performance.now();
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      if (target > 1000) {
        el.textContent = prefix + current.toLocaleString() + suffix;
      } else {
        el.textContent = prefix + current + suffix;
      }
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // Fade-in observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('v5-visible');
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.v5-fade-in').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Sticky CTA visibility
  useEffect(() => {
    function handleScroll() {
      setShowSticky(window.scrollY > 600);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredStates = stateFilter
    ? STATE_CARDS.filter(s => s.abbr.toLowerCase().includes(stateFilter.toLowerCase()) || s.count.toLowerCase().includes(stateFilter.toLowerCase()))
    : STATE_CARDS;

  function handleStateClick(abbr) {
    window.plausible && window.plausible('Browse-State-Clicked', { props: { state: abbr } });
    navigate(`/?state=${abbr}`);
  }

  return (
    <div className="v5-landing">

      {/* ═══════ CMS ALERT CARD ═══════ */}
      {!cmsAlertDismissed && (
        <div className="v5-cms-alert-card">
          <div className="v5-cms-alert-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="v5-cms-alert-text">
            <div className="v5-cms-alert-headline">CMS removed complaint investigation data from Care Compare on 2/25/26.</div>
            <div className="v5-cms-alert-body">Families can no longer see how many complaints were filed against a facility. <strong>We rebuilt it from inspection records.</strong> Every facility on this site still shows complaint counts, investigation outcomes, and patterns over time.</div>
            <Link to="/methodology" className="v5-cms-alert-link">See what CMS removed and what we kept &rarr;</Link>
          </div>
          <button className="v5-cms-alert-dismiss" onClick={() => setCmsAlertDismissed(true)} aria-label="Dismiss">&times;</button>
        </div>
      )}

      {/* ═══════ HERO ═══════ */}
      <section className="v5-hero">
        <div className="v5-hero-tagline">Nursing Home Safety Data, Independently Reviewed</div>
        <h1 className="v5-hero-title">Every nursing home has a record.<br />Here's how to read it.</h1>
        <p className="v5-hero-sub">
          Inspections, staffing, fines, and ownership data for all 14,713 Medicare-certified facilities — cross-referenced from 18 federal databases into one report.
        </p>
        <InlineSearch searchFacilities={searchFacilities} onFallbackSearch={onSearch} />
        <div className="v5-or-browse">
          or <a href="#v5-state-grid" onClick={(e) => { e.preventDefault(); onExplore && onExplore(); }}>Browse by State</a>
        </div>
        <div className="v5-trust-line">
          Based on CMS data through Q3 2025 &middot; <Link to="/methodology">How we calculate these numbers</Link>
        </div>
      </section>

      {/* ═══════ STATS STRIP ═══════ */}
      <div className="v5-stats-strip" ref={statsRef}>
        <div className="v5-stat-card v5-fade-in">
          <div className="v5-stat-accent"></div>
          <div className="v5-stat-body">
            <div className="v5-stat-value" data-target="14713">0</div>
            <div className="v5-stat-label">Facilities reviewed — every Medicare nursing home in America</div>
          </div>
        </div>
        <div className="v5-stat-card v5-fade-in">
          <div className="v5-stat-accent"></div>
          <div className="v5-stat-body">
            <div className="v5-stat-value" data-target="18">0</div>
            <div className="v5-stat-label">Federal databases cross-referenced so you don't have to</div>
          </div>
        </div>
        <div className="v5-stat-card v5-fade-in">
          <div className="v5-stat-accent orange"></div>
          <div className="v5-stat-body">
            <div className="v5-stat-value" data-target="492" data-prefix="$" data-suffix="M">$0M</div>
            <div className="v5-stat-label">In federal fines exposed — searchable by facility</div>
          </div>
        </div>
      </div>

      {/* ═══════ KNOW BEFORE YOU CHOOSE ═══════ */}
      <div className="v5-section">
        <div className="v5-section-header">
          <div className="v5-section-label">Sample Reports</div>
          <h2 className="v5-section-title">Know Before You Choose</h2>
          <p className="v5-section-sub">These are real facilities. This is what your report looks like.</p>
        </div>
        <div className="v5-flagged-grid">
          {/* Card 1: Critical */}
          <div className="v5-flagged-card v5-fade-in">
            <div className="v5-flagged-accent critical"></div>
            <div className="v5-flagged-body">
              <div className="v5-flagged-header">
                <div>
                  <div className="v5-flagged-name">Sunrise Senior Living</div>
                  <div className="v5-flagged-location">Chicago, IL</div>
                </div>
                <span className="v5-risk-pill critical">SFF — FEDERAL WATCH</span>
              </div>
              <div className="v5-flagged-stats">
                <div className="v5-flagged-stat"><strong>47</strong> citations</div>
                <div className="v5-flagged-stat"><strong>$1.2M</strong> fines</div>
                <div className="v5-flagged-stat"><strong>0.8</strong> RN hrs/day</div>
              </div>
              <div className="v5-qm-pills">
                <span className="v5-qm-pill alert">Antipsychotics: 24% (vs 14% avg)</span>
                <span className="v5-qm-pill">Falls: above avg</span>
              </div>
              <div className="v5-flagged-bottom">
                On the CMS Special Focus Facility list since 2023. Persistent staffing shortfalls and repeat deficiencies on immediate jeopardy citations.
              </div>
            </div>
            <a href="#" className="v5-flagged-cta" onClick={(e) => { e.preventDefault(); onSearch && onSearch(); }}>See full report for Sunrise Senior Living &rarr;</a>
          </div>

          {/* Card 2: Warning + Chain */}
          <div className="v5-flagged-card v5-fade-in">
            <div className="v5-flagged-accent warn"></div>
            <div className="v5-flagged-body">
              <div className="v5-flagged-header">
                <div>
                  <div className="v5-flagged-name">Golden Acres Care Center</div>
                  <div className="v5-flagged-location">Houston, TX</div>
                </div>
                <span className="v5-risk-pill high">REVIEW CLOSELY</span>
              </div>
              <div className="v5-flagged-stats">
                <div className="v5-flagged-stat"><strong>22</strong> citations</div>
                <div className="v5-flagged-stat"><strong>$312K</strong> fines</div>
                <div className="v5-flagged-stat"><strong>11</strong> sister facilities</div>
              </div>
              <div className="v5-qm-pills">
                <span className="v5-qm-pill alert">Readmissions: above avg</span>
                <span className="v5-qm-pill">Antipsychotic use: 12%</span>
              </div>
              <div className="v5-flagged-bottom">
                Part of a chain operating 11 other facilities — 4 have above-average citation rates. Weekend RN staffing patterns differ from weekday levels.
              </div>
            </div>
            <div className="v5-flagged-cta-split">
              <a href="#" className="v5-flagged-cta v5-flagged-cta--half" onClick={(e) => { e.preventDefault(); onSearch && onSearch(); }}>Full report &rarr;</a>
              <a href="#" className="v5-flagged-cta v5-flagged-cta--half v5-flagged-cta--chain" onClick={(e) => { e.preventDefault(); navigate('/chains'); }}>View all 11 chain facilities &rarr;</a>
            </div>
          </div>

          {/* Card 3: Top Performer */}
          <div className="v5-flagged-card v5-fade-in">
            <div className="v5-flagged-accent good"></div>
            <div className="v5-flagged-body">
              <div className="v5-flagged-header">
                <div>
                  <div className="v5-flagged-name">Maplewood Care Center</div>
                  <div className="v5-flagged-location">Portland, OR</div>
                </div>
                <span className="v5-risk-pill good">TOP PERFORMER</span>
              </div>
              <div className="v5-flagged-stats">
                <div className="v5-flagged-stat"><strong>2</strong> citations</div>
                <div className="v5-flagged-stat"><strong>$0</strong> fines</div>
                <div className="v5-flagged-stat"><strong>4.2</strong> RN hrs/day</div>
              </div>
              <div className="v5-qm-pills">
                <span className="v5-qm-pill good">Falls: below avg</span>
                <span className="v5-qm-pill good">UTIs: below avg</span>
              </div>
              <div className="v5-flagged-bottom">
                Consistently high staffing, zero fines, minimal deficiencies. This is what a well-run facility looks like in the data.
              </div>
            </div>
            <a href="#" className="v5-flagged-cta v5-flagged-cta--good" onClick={(e) => { e.preventDefault(); onSearch && onSearch(); }}>See full report for Maplewood Care &rarr;</a>
          </div>
        </div>
      </div>

      {/* ═══════ WHAT YOU'LL SEE INSIDE ═══════ */}
      <div className="v5-section">
        <div className="v5-section-header">
          <h2 className="v5-section-title">What You'll See Inside</h2>
        </div>
        <div className="v5-features-grid">
          <div className="v5-feature-tile v5-fade-in">
            <div className="v5-feature-icon red">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div className="v5-feature-name">Complaint History</div>
            <div className="v5-feature-desc">Investigation counts, outcomes, and patterns over time</div>
            <span className="v5-feature-tag rebuilt">REBUILT — CMS REMOVED THIS</span>
          </div>
          <div className="v5-feature-tile v5-fade-in">
            <div className="v5-feature-icon purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div className="v5-feature-name">Quality Measures</div>
            <div className="v5-feature-desc">Antipsychotic use, falls, readmissions, UTIs, pressure ulcers</div>
            <span className="v5-feature-tag new">NEW DATA</span>
          </div>
          <div className="v5-feature-tile v5-fade-in">
            <div className="v5-feature-icon green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="v5-feature-name">Staffing Breakdown</div>
            <div className="v5-feature-desc">RN, LPN, CNA hours per resident — weekday vs. weekend, plus RN turnover rates</div>
          </div>
          <div className="v5-feature-tile v5-fade-in">
            <div className="v5-feature-icon blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <div className="v5-feature-name">Fines &amp; Penalties</div>
            <div className="v5-feature-desc">Federal fines, payment denials, and enforcement timeline</div>
          </div>
          <div className="v5-feature-tile v5-fade-in">
            <div className="v5-feature-icon orange">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </div>
            <div className="v5-feature-name">Ownership Networks</div>
            <div className="v5-feature-desc">Follow chains across facilities — see if problems are isolated or systemic</div>
            <span className="v5-feature-tag chain">INVESTIGATE CHAINS</span>
          </div>
        </div>
      </div>

      {/* ═══════ BROWSE BY STATE ═══════ */}
      <div className="v5-section" id="v5-state-grid">
        <div className="v5-section-header">
          <div className="v5-section-label">50 States + DC</div>
          <h2 className="v5-section-title">Browse by State</h2>
        </div>
        <div className="v5-state-filter">
          <input
            type="text"
            className="v5-state-filter-input"
            placeholder="Filter states..."
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          />
        </div>
        <div className="v5-state-grid">
          {filteredStates.map(s => (
            <a
              key={s.abbr}
              className={`v5-state-card ${s.flag === 'flagged' ? 'v5-state-flagged' : ''} ${s.flag === 'top' ? 'v5-state-top' : ''}`}
              onClick={() => handleStateClick(s.abbr)}
            >
              <div className="v5-state-abbr">{s.abbr}</div>
              <div className="v5-state-count">{s.count}</div>
              {s.flag === 'flagged' && <div className="v5-state-note flagged">{s.note}</div>}
              {s.flag === 'top' && <div className="v5-state-note top">{s.note}</div>}
            </a>
          ))}
        </div>
      </div>

      {/* ═══════ TRUST / SOCIAL PROOF STRIP ═══════ */}
      <div className="v5-trust-quote-strip">
        <div className="v5-trust-quote-inner">
          <div className="v5-trust-quote">
            <blockquote>
              "I built this because I watched the system fail patients — and the data to prove it was public but buried. No one should have to be a data scientist to know if a nursing home is safe."
            </blockquote>
            <cite>Rob Benard, NP <span>— Board-Certified Nurse Practitioner</span></cite>
          </div>
          <div className="v5-trust-badges">
            <div className="v5-trust-badge"><span className="v5-badge-icon" style={{color: 'var(--navy)'}}>&#9670;</span> Cited: Harvard Data Science Review</div>
            <div className="v5-trust-badge"><span className="v5-badge-icon" style={{color: 'var(--orange)'}}>&#9650;</span> 418 upvotes on r/nursing</div>
            <div className="v5-trust-badge"><span className="v5-badge-icon" style={{color: 'var(--blue)'}}>&#9632;</span> 14,713 facilities analyzed</div>
          </div>
        </div>
      </div>

      {/* ═══════ WHO USES THIS ═══════ */}
      <div className="v5-section">
        <div className="v5-section-header">
          <h2 className="v5-section-title">Who Uses This</h2>
        </div>
        <div className="v5-personas-grid">
          <div className="v5-persona-card v5-fade-in">
            <div className="v5-persona-badge">Families</div>
            <div className="v5-persona-quote">"My mom needs skilled nursing after her hip replacement. I need to know which facilities are actually safe — not just which ones have the nicest lobby."</div>
            <div className="v5-persona-action" onClick={() => onSearch && onSearch()}>Search any facility &rarr; Free safety report</div>
          </div>
          <div className="v5-persona-card v5-fade-in">
            <div className="v5-persona-badge">Attorneys</div>
            <div className="v5-persona-quote">"I need documented evidence of a pattern — deficiencies, fines, staffing failures — in a format I can attach to a filing."</div>
            <div className="v5-persona-action" onClick={() => navigate('/pricing')}>Evidence Report &rarr; $29 per facility</div>
          </div>
          <div className="v5-persona-card v5-fade-in">
            <div className="v5-persona-badge">Hospitals</div>
            <div className="v5-persona-quote">"We discharge 200+ patients per month to post-acute care. We need a fast, data-driven way to compare facilities for each patient."</div>
            <div className="v5-persona-action" onClick={() => navigate('/referral-scorecard')}>Referral Scorecard &rarr; Coming soon</div>
          </div>
        </div>
      </div>


      {/* ═══════ HOW IT WORKS ═══════ */}
      <div className="v5-section">
        <div className="v5-how-card v5-fade-in">
          <div className="v5-how-accent"></div>
          <div className="v5-how-label">How It Works</div>
          <h3 className="v5-how-title">18 federal databases. <em>One report card.</em></h3>
          <p className="v5-how-desc">You search a facility. Our system cross-references inspections, staffing, fines, ownership, quality measures, and more — then generates a single, clinician-reviewed report card.</p>
          <div className="v5-how-steps">
            <div className="v5-how-step">
              <div className="v5-how-step-num">1</div>
              <div className="v5-how-step-text">Data Ingest</div>
              <div className="v5-how-step-sub">CMS, CASPER, PBJ, OSCAR, Cost Reports</div>
            </div>
            <div className="v5-how-step">
              <div className="v5-how-step-num">2</div>
              <div className="v5-how-step-text">Cross-Reference</div>
              <div className="v5-how-step-sub">Match, validate, flag discrepancies</div>
            </div>
            <div className="v5-how-step">
              <div className="v5-how-step-num">3</div>
              <div className="v5-how-step-text">Report Card</div>
              <div className="v5-how-step-sub">One page. Every data point. Clinician-reviewed.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ METHODOLOGY BAR ═══════ */}
      <div className="v5-method-bar">
        <div className="v5-method-inner">
          <h3>Transparent Methodology</h3>
          <p>Every number on this site is computed from public federal data. We document our sources, our calculations, and our limitations.</p>
          <div className="v5-method-links">
            <Link to="/methodology" className="v5-method-link">Read full methodology</Link>
            <Link to="/methodology" className="v5-method-link">View data sources</Link>
            <a href="/samples/OversightReport_Sample_Evidence_Report.pdf" className="v5-method-link" download>See a sample report</a>
          </div>
        </div>
      </div>


      {/* ═══════ FINAL CTA ═══════ */}
      <section className="v5-final-cta">
        <h2>Search any nursing facility</h2>
        <p>14,713 Medicare-certified nursing homes. Federal CMS data. Free to search. No login required.</p>
        <div className="v5-final-search">
          <InlineSearch searchFacilities={searchFacilities} placeholder="Facility name, city, or ZIP code" onFallbackSearch={onSearch} />
        </div>
        <div className="v5-final-trust">Public CMS data &middot; No industry funding &middot; No ads &middot; No paywalls on safety data</div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="v5-footer">
        <div className="v5-footer-main">Public CMS data &middot; No industry funding &middot; Built by a bedside clinician</div>
        <div className="v5-footer-sub">The Oversight Report — oversightreports.com</div>
        <div className="v5-footer-links">
          <Link to="/compare" className="v5-footer-link">Compare Tools</Link>
          <Link to="/methodology" className="v5-footer-link">Methodology</Link>
          <Link to="/methodology" className="v5-footer-link">Data Sources</Link>
          <Link to="/pricing" className="v5-footer-link">Evidence PDFs</Link>
          <Link to="/about" className="v5-footer-link">About</Link>
          <a href="mailto:contact@oversightreports.com" className="v5-footer-link">Contact</a>
        </div>
      </footer>

      {/* ═══════ STICKY CTA ═══════ */}
      <div className={`v5-sticky-cta ${showSticky ? 'v5-sticky-visible' : ''}`}>
        <button className="v5-sticky-btn primary" onClick={() => onSearch && onSearch()}>Search a Facility</button>
        <button className="v5-sticky-btn secondary" onClick={() => onExplore && onExplore()}>Browse by State</button>
      </div>

    </div>
  );
}
