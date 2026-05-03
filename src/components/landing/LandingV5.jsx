import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { submitLead } from '../../utils/submitLead';
import { track } from '../../utils/analytics';
import '../../styles/landing-v5.css';

// ISO 8601 timestamp of the most recent CMS data refresh. Update when new data is pulled.
const LAST_REFRESH_ISO = '2026-04-29T02:00:00Z';

function formatRefreshAgo(iso) {
  const last = new Date(iso);
  if (Number.isNaN(last.getTime())) return 'recently';
  const diffMs = Date.now() - last.getTime();
  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (hrs < 24) return `${hrs} hr ago`;
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ═══════════════════════════════════════════
   INLINE SEARCH — Reused from LandingV4
   ═══════════════════════════════════════════ */
function InlineSearch({ searchFacilities, placeholder, onFallbackSearch, large }) {
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
    track('facility_searched', { query: query.slice(0, 100), facility_name: facility.name, ccn: facility.ccn });
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
    <div className={`v5-search-container ${large ? 'v5-search-container--large' : ''}`} ref={wrapperRef}>
      <div className={`v5-search-box ${large ? 'v5-search-box--large' : ''} ${isOpen ? 'v5-search-box--active' : ''}`}>
        <svg className="v5-search-icon" width={large ? "24" : "20"} height={large ? "24" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          ref={inputRef}
          className={`v5-search-input ${large ? 'v5-search-input--large' : ''}`}
          type="text"
          placeholder={placeholder || "Search by facility name, city, state, or ZIP code"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {query.length > 0 && (
          <button className="v5-search-clear" onClick={() => { setQuery(''); setResults([]); setIsOpen(false); inputRef.current?.focus(); }} aria-label="Clear search">&times;</button>
        )}
        {large && (
          <button className="v5-search-btn" onClick={() => { if (query.trim().length < 2 && onFallbackSearch) onFallbackSearch(); }}>
            Search
          </button>
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="v5-search-dropdown">
          {results.map((facility, i) => (
            <div key={facility.ccn} className={`v5-search-result ${i === activeIndex ? 'v5-search-result--active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => handleSelect(facility)} onMouseEnter={() => setActiveIndex(i)}>
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
   EMAIL CAPTURE — Inline form
   ═══════════════════════════════════════════ */
function EmailCapture() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return;

    setStatus('submitting');
    try {
      await submitLead({
        email: email.trim(),
        name: '',
        source: 'homepage_email_capture',
      });
      window.plausible && window.plausible('Email-Capture', { props: { source: 'homepage' } });
      track('email_signup_submitted', { source: 'homepage' });
      setStatus('success');
      setEmail('');
    } catch (err) {
      console.warn('Email capture failed:', err.message);
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="v5-email-capture">
        <div className="v5-email-success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          <span>You're on the list. We'll send updates when new data drops or features launch.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="v5-email-capture">
      <div className="v5-email-capture-inner">
        <div className="v5-email-capture-text">
          <h3>Get notified when we add new data or features</h3>
          <p>Home health, hospice, and dialysis reports are in development. Be the first to know.</p>
        </div>
        <form className="v5-email-form" onSubmit={handleSubmit}>
          <div className="v5-email-input-row">
            <input
              type="email"
              className="v5-email-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              className="v5-email-submit"
              disabled={status === 'submitting' || !email.trim()}
              onClick={() => track('email_signup_clicked', { source: 'homepage' })}
            >
              {status === 'submitting' ? 'Sending...' : 'Subscribe'}
            </button>
          </div>
          <div className="v5-email-fine-print">No spam. Unsubscribe anytime. We never share your email.</div>
          {status === 'error' && <div className="v5-email-error">Something went wrong. Your email was saved locally.</div>}
        </form>
      </div>
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
   FEATURED FACILITIES DATA
   ═══════════════════════════════════════════ */
const FEATURED_FACILITIES = [
  { ccn: '145639', name: 'Chicago Ridge SNF', city: 'Chicago', state: 'IL', risk: 'critical', riskLabel: 'SFF -- Federal Watch', citations: 125, fines: '$588K', rn: '0.2 hrs/day' },
  { ccn: '676381', name: 'West Houston Rehabilitation', city: 'Houston', state: 'TX', risk: 'high', riskLabel: 'Elevated Citations', citations: 32, fines: '$205K', rn: 'N/A' },
  { ccn: '555608', name: 'Sunrise Senior Living', city: 'McLean', state: 'VA', risk: 'moderate', riskLabel: 'Under Review', citations: 18, fines: '$42K', rn: '0.8 hrs/day' },
  { ccn: '385274', name: 'Mirabella Portland', city: 'Portland', state: 'OR', risk: 'good', riskLabel: 'Top Performer', citations: 14, fines: '$0', rn: '1.2 hrs/day' },
  { ccn: '055267', name: 'Laguna Honda Hospital', city: 'San Francisco', state: 'CA', risk: 'critical', riskLabel: 'SFF -- Federal Watch', citations: 89, fines: '$1.2M', rn: '0.6 hrs/day' },
  { ccn: '335313', name: 'Sapphire Center for Rehabilitation', city: 'Flushing', state: 'NY', risk: 'high', riskLabel: 'Elevated Citations', citations: 44, fines: '$180K', rn: '0.5 hrs/day' },
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

      {/* ═══════ HERO — Masthead treatment matching Hospice landing ═══════ */}
      <section className="v5-hero dlc-prov-2026q2">
        <div className="v5-hero-eyebrow">Free · Clinician-built · Sourced from CMS</div>
        <h1 className="v5-masthead">
          The <span className="v5-masthead-accent">Oversight</span> Report
        </h1>
        <div className="v5-masthead-sub">Nursing home safety data.</div>
        <hr className="v5-masthead-rule" />
        <p className="v5-hero-sub">
          Free safety reports with inspections, staffing, fines, and ownership data for{' '}
          <strong>every Medicare-certified nursing home in America.</strong>
        </p>
        <InlineSearch searchFacilities={searchFacilities} onFallbackSearch={onSearch} large />
        <div className="v5-or-browse">
          or <a href="#v5-state-grid" onClick={(e) => { e.preventDefault(); onExplore && onExplore(); }}>Browse by State</a>
          {' '}&middot;{' '}
          <Link to="/attorneys">For Attorneys</Link>
        </div>

        {/* Live status ticker */}
        <div className="v5-ticker">
          <div className="v5-ticker-row">
            <span className="v5-ticker-pulse" aria-hidden="true"></span>
            <span className="v5-ticker-live">Live</span>
            <span className="v5-ticker-sep">·</span>
            <span className="v5-ticker-muted">data refreshed</span>&nbsp;
            <span className="v5-ticker-strong">{formatRefreshAgo(LAST_REFRESH_ISO)}</span>
            <span className="v5-ticker-sep">·</span>
            <span className="v5-ticker-strong">14,713</span>&nbsp;
            <span className="v5-ticker-muted">facilities</span>
            <span className="v5-ticker-sep">·</span>
            <span className="v5-ticker-strong">50 states</span>
          </div>
          <div className="v5-ticker-secondary">no operator funding</div>
          <div className="v5-ticker-links">
            <Link to="/methodology">METHODOLOGY <span className="v5-ticker-arrow" aria-hidden="true">↗</span></Link>
            <span className="v5-ticker-sep-thin">·</span>
            <Link to="/data-transparency">DATA SOURCES <span className="v5-ticker-arrow" aria-hidden="true">↗</span></Link>
            <span className="v5-ticker-sep-thin">·</span>
            <Link to="/refresh-log">REFRESH LOG <span className="v5-ticker-arrow" aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      {/* ═══════ CMS ALERT CARD ═══════ */}
      {!cmsAlertDismissed && (
        <div className="v5-cms-alert-card">
          <div className="v5-cms-alert-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="v5-cms-alert-text">
            <div className="v5-cms-alert-headline">Complaint investigation data is no longer available on Care Compare as of 2/25/26.</div>
            <div className="v5-cms-alert-body">The Oversight Report preserves this information by reconstructing complaint counts, investigation outcomes, and patterns over time from federal inspection records.</div>
            <Link to="/data-transparency" className="v5-cms-alert-link">Learn how we maintain data continuity &rarr;</Link>
          </div>
          <button className="v5-cms-alert-dismiss" onClick={() => setCmsAlertDismissed(true)} aria-label="Dismiss">&times;</button>
        </div>
      )}

      {/* ═══════ HOW IT WORKS — 3 Steps ═══════ */}
      <div className="v5-section">
        <div className="v5-section-header">
          <div className="v5-section-label">3 Simple Steps</div>
          <h2 className="v5-section-title">How It Works</h2>
        </div>
        <div className="v5-steps-grid">
          <div className="v5-step-card v5-fade-in">
            <div className="v5-step-number">1</div>
            <div className="v5-step-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <h3 className="v5-step-title">Search</h3>
            <p className="v5-step-desc">Type a facility name, city, state, or ZIP code. We cover every Medicare-certified nursing home in the country.</p>
          </div>
          <div className="v5-step-arrow v5-fade-in">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
          <div className="v5-step-card v5-fade-in">
            <div className="v5-step-number">2</div>
            <div className="v5-step-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <h3 className="v5-step-title">Read the Report</h3>
            <p className="v5-step-desc">See inspections, staffing, fines, ownership chains, quality measures, and complaint history -- all in one place.</p>
          </div>
          <div className="v5-step-arrow v5-fade-in">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
          <div className="v5-step-card v5-fade-in">
            <div className="v5-step-number">3</div>
            <div className="v5-step-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h3 className="v5-step-title">Make Your Decision</h3>
            <p className="v5-step-desc">Compare facilities, download a PDF, or order an Evidence Report with clinician-reviewed analysis for $29.</p>
          </div>
        </div>
      </div>

      {/* ═══════ SOCIAL PROOF / STATS STRIP ═══════ */}
      <div className="v5-stats-strip" ref={statsRef}>
        <div className="v5-stat-card v5-fade-in">
          <div className="v5-stat-accent"></div>
          <div className="v5-stat-body">
            <div className="v5-stat-value" data-target="14713">0</div>
            <div className="v5-stat-label">Facilities analyzed with full safety reports</div>
          </div>
        </div>
        <div className="v5-stat-card v5-fade-in">
          <div className="v5-stat-accent"></div>
          <div className="v5-stat-body">
            <div className="v5-stat-value" data-target="18">0</div>
            <div className="v5-stat-label">Federal databases cross-referenced per facility</div>
          </div>
        </div>
        <div className="v5-stat-card v5-fade-in">
          <div className="v5-stat-accent orange"></div>
          <div className="v5-stat-body">
            <div className="v5-stat-value" data-target="492" data-prefix="$" data-suffix="M">$0M</div>
            <div className="v5-stat-label">In federal fines exposed -- searchable by facility</div>
          </div>
        </div>
      </div>

      {/* ═══════ KNOW BEFORE YOU CHOOSE ═══════ */}
      <div className="v5-section">
        <div className="v5-section-header">
          <h2 className="v5-section-title">Know Before You Choose</h2>
          <p className="v5-section-sub">These are real facilities. This is what your report looks like.</p>
        </div>
        <div className="v5-flagged-grid">
          {/* Card 1: Critical — Real SFF facility */}
          <div className="v5-flagged-card v5-fade-in">
            <div className="v5-flagged-accent critical"></div>
            <div className="v5-flagged-body">
              <div className="v5-flagged-header">
                <div>
                  <div className="v5-flagged-name">Chicago Ridge SNF</div>
                  <div className="v5-flagged-location">Chicago, IL</div>
                </div>
                <span className="v5-risk-pill critical">SFF -- FEDERAL WATCH*</span>
              </div>
              <div className="v5-flagged-stats">
                <div className="v5-flagged-stat"><strong>125</strong> citations</div>
                <div className="v5-flagged-stat"><strong>$588K</strong> fines</div>
                <div className="v5-flagged-stat"><strong>0.2</strong> RN hrs/day</div>
              </div>
              <div className="v5-qm-pills">
                <span className="v5-qm-pill alert">10 immediate jeopardy deficiencies</span>
                <span className="v5-qm-pill alert">18 actual-harm deficiencies</span>
              </div>
              <div className="v5-flagged-bottom">
                CMS Special Focus Facility. 5 payment denials (233 days). Part of a chain whose owner controls 16 facilities averaging $279K in fines each.
              </div>
            </div>
            <Link to="/facility/145639" className="v5-flagged-cta">See full report for Chicago Ridge SNF &rarr;</Link>
          </div>

          {/* Card 2: Warning — Real high-risk chain facility */}
          <div className="v5-flagged-card v5-fade-in">
            <div className="v5-flagged-accent warn"></div>
            <div className="v5-flagged-body">
              <div className="v5-flagged-header">
                <div>
                  <div className="v5-flagged-name">West Houston Rehabilitation</div>
                  <div className="v5-flagged-location">Houston, TX</div>
                </div>
                <span className="v5-risk-pill high">ELEVATED CITATIONS</span>
              </div>
              <div className="v5-flagged-stats">
                <div className="v5-flagged-stat"><strong>32</strong> citations</div>
                <div className="v5-flagged-stat"><strong>$205K</strong> fines</div>
                <div className="v5-flagged-stat"><strong>6</strong> sister facilities</div>
              </div>
              <div className="v5-qm-pills">
                <span className="v5-qm-pill alert">7 immediate jeopardy deficiencies</span>
                <span className="v5-qm-pill">RN turnover: 70%</span>
              </div>
              <div className="v5-flagged-bottom">
                Part of Momentum Skilled Services chain (6 facilities, avg 1.8 stars). Owner entity controls 96 facilities averaging $107K in fines.
              </div>
            </div>
            <div className="v5-flagged-cta-split">
              <Link to="/facility/676381" className="v5-flagged-cta v5-flagged-cta--half">Full report &rarr;</Link>
              <Link to="/chains" className="v5-flagged-cta v5-flagged-cta--half v5-flagged-cta--chain">View all 6 chain facilities &rarr;</Link>
            </div>
          </div>

          {/* Card 3: Top Performer — Real high-performing facility */}
          <div className="v5-flagged-card v5-fade-in">
            <div className="v5-flagged-accent good"></div>
            <div className="v5-flagged-body">
              <div className="v5-flagged-header">
                <div>
                  <div className="v5-flagged-name">Mirabella Portland</div>
                  <div className="v5-flagged-location">Portland, OR</div>
                </div>
                <span className="v5-risk-pill good">TOP PERFORMER</span>
              </div>
              <div className="v5-flagged-stats">
                <div className="v5-flagged-stat"><strong>14</strong> citations</div>
                <div className="v5-flagged-stat"><strong>$0</strong> fines</div>
                <div className="v5-flagged-stat"><strong>1.2</strong> RN hrs/day</div>
              </div>
              <div className="v5-qm-pills">
                <span className="v5-qm-pill good">0 harm deficiencies</span>
                <span className="v5-qm-pill good">0 jeopardy deficiencies</span>
              </div>
              <div className="v5-flagged-bottom">
                Nonprofit, 5-star rated. Part of Pacific Retirement Services (10 facilities, avg 4.5 stars, 0% abuse rate). Zero fines, zero payment denials.
              </div>
            </div>
            <Link to="/facility/385274" className="v5-flagged-cta v5-flagged-cta--good">See full report for Mirabella Portland &rarr;</Link>
          </div>
        </div>
        <div className="v5-section-footnote" style={{textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#7a8399', lineHeight: '1.6'}}>
          <div>*SFF = Special Focus Facility -- a CMS designation for nursing homes with a pattern of serious quality issues. These facilities receive twice the normal inspection frequency.</div>
          <div style={{marginTop: '6px'}}>All data sourced from CMS Medicare.gov federal records. Updated March 2026.</div>
        </div>
      </div>

      {/* ═══════ EMAIL CAPTURE — Prominent, above the fold for scrollers ═══════ */}
      <EmailCapture />

      {/* ═══════ FEATURED FACILITIES ═══════ */}
      <div className="v5-section">
        <div className="v5-section-header">
          <div className="v5-section-label">Recently Reviewed</div>
          <h2 className="v5-section-title">Featured Facility Reports</h2>
          <p className="v5-section-sub">Real reports you can view right now -- from high-risk to top performers</p>
        </div>
        <div className="v5-featured-grid">
          {FEATURED_FACILITIES.map(f => (
            <Link
              key={f.ccn}
              to={`/facility/${f.ccn}`}
              className="v5-featured-card v5-fade-in"
              onClick={() => window.plausible && window.plausible('Featured-Facility-Click', { props: { ccn: f.ccn, name: f.name } })}
            >
              <div className={`v5-featured-accent ${f.risk}`}></div>
              <div className="v5-featured-body">
                <div className="v5-featured-header">
                  <div className="v5-featured-name">{f.name}</div>
                  <span className={`v5-risk-pill ${f.risk}`}>{f.riskLabel}</span>
                </div>
                <div className="v5-featured-location">{f.city}, {f.state}</div>
                <div className="v5-featured-stats">
                  <span>{f.citations} citations</span>
                  <span>{f.fines} fines</span>
                  <span>{f.rn} RN</span>
                </div>
              </div>
              <div className="v5-featured-cta-link">View full report &rarr;</div>
            </Link>
          ))}
        </div>
        <div className="v5-featured-browse-all">
          <button className="v5-browse-all-btn" onClick={() => onSearch && onSearch()}>
            Search all 14,713 facilities &rarr;
          </button>
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
              "Families used to ask me, 'Is this place any good?' -- and I didn't have a good answer. The data existed, but it was buried in government files no one could read. So I built something that finally makes it accessible."
            </blockquote>
            <cite>Robert Benard, NP <span>-- Board-Certified Nurse Practitioner</span></cite>
          </div>
          <div className="v5-trust-badges">
            <div className="v5-trust-badge"><span className="v5-badge-icon" style={{color: 'var(--navy)'}}>&#9670;</span> Cited: Harvard Data Science Review</div>
            <div className="v5-trust-badge"><span className="v5-badge-icon" style={{color: 'var(--orange)'}}>&#9650;</span> 418 upvotes on r/nursing</div>
            <div className="v5-trust-badge"><span className="v5-badge-icon" style={{color: 'var(--blue)'}}>&#9632;</span> 14,713 facilities analyzed</div>
          </div>
        </div>
      </div>

      {/* ═══════ WHAT YOU'LL SEE INSIDE ═══════ */}
      <div className="v5-section">
        <div className="v5-section-header">
          <h2 className="v5-section-title">What You'll See Inside</h2>
          <p className="v5-section-sub">Every facility report includes data most sites don't show you</p>
        </div>
        <div className="v5-features-grid">
          <div className="v5-feature-tile v5-fade-in">
            <div className="v5-feature-icon red">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div className="v5-feature-name">Complaint History</div>
            <div className="v5-feature-desc">Investigation counts, outcomes, and patterns over time</div>
            <span className="v5-feature-tag rebuilt">PRESERVED -- NO LONGER ON CARE COMPARE</span>
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
            <div className="v5-feature-desc">RN, LPN, CNA hours per resident -- weekday vs. weekend, plus RN turnover rates</div>
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
            <div className="v5-feature-desc">Follow chains across facilities -- see if problems are isolated or systemic</div>
            <span className="v5-feature-tag chain">EXPLORE CHAINS</span>
          </div>
        </div>
      </div>

      {/* ═══════ WHO USES THIS — with clear pricing path ═══════ */}
      <div className="v5-section">
        <div className="v5-section-header">
          <h2 className="v5-section-title">Who Uses This</h2>
        </div>
        <div className="v5-personas-grid">
          <div className="v5-persona-card v5-fade-in">
            <div className="v5-persona-accent families"></div>
            <div className="v5-persona-body">
              <div className="v5-persona-badge">Families</div>
              <div className="v5-persona-quote">"My mom needs skilled nursing after her hip replacement. I need to know which facilities are actually safe -- not just which ones have the nicest lobby."</div>
              <button type="button" className="v5-persona-action" onClick={() => onSearch && onSearch()}>Search any facility &rarr; Free safety report</button>
            </div>
          </div>
          <div className="v5-persona-card v5-fade-in">
            <div className="v5-persona-accent attorneys"></div>
            <div className="v5-persona-body">
              <div className="v5-persona-badge">Attorneys</div>
              <div className="v5-persona-quote">"I need documented evidence of a pattern -- deficiencies, fines, staffing failures -- in a format I can attach to a filing."</div>
              <button type="button" className="v5-persona-action" onClick={() => onSearch && onSearch()}>Find any facility &rarr; Free Brief</button>
            </div>
          </div>
          <div className="v5-persona-card v5-fade-in">
            <div className="v5-persona-accent hospitals"></div>
            <div className="v5-persona-body">
              <div className="v5-persona-badge">Hospitals &amp; Discharge Planners</div>
              <div className="v5-persona-quote">"We discharge 200+ patients per month to post-acute care. We need a fast, data-driven way to compare facilities for each patient."</div>
              <button type="button" className="v5-persona-action" onClick={() => navigate('/referral-scorecard')}>Referral Scorecard &rarr; Free tool</button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing banner removed — everything except Ask a Clinician is free; banner no longer needed */}

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
        <div className="v5-footer-sub">The Oversight Report -- oversightreports.com</div>
        <div className="v5-footer-links">
          <Link to="/compare" className="v5-footer-link">Compare Tools</Link>
          <Link to="/methodology" className="v5-footer-link">Methodology</Link>
          <Link to="/pricing" className="v5-footer-link">Pricing</Link>
          <Link to="/ask-a-clinician" className="v5-footer-link">Ask a Clinician</Link>
          <Link to="/about" className="v5-footer-link">About</Link>
          <a href="mailto:contact@oversightreports.com" className="v5-footer-link">Contact</a>
        </div>
      </footer>

      {/* ═══════ STICKY CTA — Desktop ═══════ */}
      <div className={`v5-sticky-cta ${showSticky ? 'v5-sticky-visible' : ''}`}>
        <button className="v5-sticky-btn primary" onClick={() => onSearch && onSearch()}>Search a Facility</button>
        <Link to="/ask-a-clinician" className="v5-sticky-btn secondary">Ask a Clinician</Link>
        <button className="v5-sticky-btn tertiary" onClick={() => onExplore && onExplore()}>Browse by State</button>
      </div>

      {/* ═══════ MOBILE STICKY CTA BAR — visible only on mobile (md:hidden via CSS) ═══════ */}
      <div className={`v5-mobile-cta-bar ${showSticky ? 'v5-sticky-visible' : ''}`}>
        <button className="v5-mobile-cta-btn primary" onClick={() => onSearch && onSearch()}>Search a Facility</button>
        <Link to="/ask-a-clinician" className="v5-mobile-cta-btn secondary">Ask a Clinician</Link>
      </div>

    </div>
  );
}
