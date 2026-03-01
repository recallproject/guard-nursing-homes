import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

const STEPS = [
  { num: 'Step 1', title: 'Start with any facility', url: '' },
  { num: 'Step 2', title: 'We cross-reference the federal record', url: '/facility/355065' },
  { num: 'Step 3', title: 'See what matters — verified to the source', url: '/facility/355065' },
  { num: '', title: '', url: '' },
];

const CHECK_ITEMS = [
  { name: 'Health inspection records', desc: 'Deficiency citations from federal and state surveys', count: '417,391' },
  { name: 'Payroll-verified staffing', desc: 'Daily nurse hours from CMS Payroll-Based Journal', count: '1,260,847' },
  { name: 'Federal penalties & fines', desc: 'Civil monetary penalties, payment denials', count: '18,234' },
  { name: 'Ownership & chain networks', desc: 'Corporate affiliations, ownership changes', count: '14,713' },
  { name: 'Cost report financials', desc: 'Revenue, expenses, related-party transactions', count: '13,324' },
];

const METRICS = [
  { target: 64, prefix: '', suffix: '', label: 'Total Deficiencies', ctx: 'State avg: 16.6 · National: 28.4', cls: 'val-red' },
  { target: 1, prefix: '', suffix: '', label: 'Serious Danger', ctx: 'State avg: 0.5 · National: 0.7', cls: 'val-red' },
  { target: 63925, prefix: '$', suffix: '', label: 'Total Fines', ctx: 'State avg: $28,541', cls: 'val-red' },
  { target: 0, prefix: '', suffix: '%', label: 'Zero-RN Days', ctx: 'Days with no registered nurse on site', cls: 'val-green' },
];

function CountUp({ target, prefix = '', suffix = '', duration = 600 }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const elRef = useRef(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration]);

  return <span ref={elRef}>{prefix}{target > 1000 ? val.toLocaleString() : val}{suffix}</span>;
}

export default function HowItWorks() {
  const scrollRef = useRef(null);
  const [activeScene, setActiveScene] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const builtRef = useRef([false, false, false, false]);

  // Typed text state
  const [typedText, setTypedText] = useState('');
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);

  // Animation states
  const [s1In, setS1In] = useState({ eyebrow: false, heading: false, sub: false, pill: false, browse: false, source: false });
  const [evIn, setEvIn] = useState({ header: false, rows: [false,false,false,false,false], findings: [false,false] });
  const [rptIn, setRptIn] = useState({ topbar: false, header: false, bl: false, sec1: false, cards: [false,false,false,false], sec2: false, insps: [false,false] });
  const [ctaIn, setCtaIn] = useState({ num: false, sub: false, head: false, btn: false, link: false });

  const buildScene = useCallback((idx) => {
    if (builtRef.current[idx]) return;
    builtRef.current[idx] = true;

    if (idx === 0) {
      setTimeout(() => setS1In(p => ({...p, eyebrow: true})), 150);
      setTimeout(() => setS1In(p => ({...p, heading: true})), 300);
      setTimeout(() => setS1In(p => ({...p, sub: true})), 450);
      setTimeout(() => setS1In(p => ({...p, pill: true})), 600);
      setTimeout(() => setS1In(p => ({...p, browse: true})), 750);
      setTimeout(() => setS1In(p => ({...p, source: true})), 850);
      setTimeout(() => {
        setShowPlaceholder(false);
        setSearchFocused(true);
        const text = 'Sunset Drive Care';
        let i = 0;
        const iv = setInterval(() => {
          if (i < text.length) { setTypedText(text.substring(0, ++i)); }
          else clearInterval(iv);
        }, 55);
      }, 1000);
    }

    if (idx === 1) {
      setTimeout(() => setEvIn(p => ({...p, header: true})), 150);
      for (let i = 0; i < 5; i++) {
        setTimeout(() => setEvIn(p => {
          const rows = [...p.rows]; rows[i] = true; return {...p, rows};
        }), 400 + i * 180);
      }
      setTimeout(() => setEvIn(p => { const f = [...p.findings]; f[0] = true; return {...p, findings: f}; }), 1400);
      setTimeout(() => setEvIn(p => { const f = [...p.findings]; f[1] = true; return {...p, findings: f}; }), 1700);
    }

    if (idx === 2) {
      setTimeout(() => setRptIn(p => ({...p, topbar: true})), 150);
      setTimeout(() => setRptIn(p => ({...p, header: true})), 350);
      setTimeout(() => setRptIn(p => ({...p, bl: true})), 600);
      setTimeout(() => setRptIn(p => ({...p, sec1: true})), 900);
      for (let i = 0; i < 4; i++) {
        setTimeout(() => setRptIn(p => {
          const cards = [...p.cards]; cards[i] = true; return {...p, cards};
        }), 1000 + i * 180);
      }
      setTimeout(() => setRptIn(p => ({...p, sec2: true})), 1800);
      setTimeout(() => setRptIn(p => { const insps = [...p.insps]; insps[0] = true; return {...p, insps}; }), 2000);
      setTimeout(() => setRptIn(p => { const insps = [...p.insps]; insps[1] = true; return {...p, insps}; }), 2250);
    }

    if (idx === 3) {
      setTimeout(() => setCtaIn(p => ({...p, num: true})), 150);
      setTimeout(() => setCtaIn(p => ({...p, sub: true})), 300);
      setTimeout(() => setCtaIn(p => ({...p, head: true})), 450);
      setTimeout(() => setCtaIn(p => ({...p, btn: true})), 600);
      setTimeout(() => setCtaIn(p => ({...p, link: true})), 700);
    }
  }, []);

  useEffect(() => {
    function onScroll() {
      if (!scrollRef.current) return;
      const rect = scrollRef.current.getBoundingClientRect();
      const scrolled = -rect.top;
      const total = scrollRef.current.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      
      // Don't activate until the scroll container is at least partially in view
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      
      const p = Math.max(0, Math.min(1, scrolled / total));
      setScrollProgress(p);
      let s;
      if (p < 0.18) s = 0;
      else if (p < 0.38) s = 1;
      else if (p < 0.75) s = 2;
      else s = 3;
      setActiveScene(prev => {
        if (prev !== s) buildScene(s);
        return s;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    // Fire once on mount
    setTimeout(onScroll, 100);
    return () => window.removeEventListener('scroll', onScroll);
  }, [buildScene]);

  const step = STEPS[activeScene];

  return (
    <div className="hiw-wrapper">
      <div className="v4-section-header">
        <div className="v4-section-label">How It Works</div>
        <div className="v4-section-title">Five Federal Databases. One Report Card.</div>
        <div className="v4-section-sub">We cross-reference millions of CMS records so you don't have to.</div>
      </div>

      <div className="hiw-scroll" ref={scrollRef}>
        <div className="hiw-sticky">
          <div className={`hiw-step-label ${step.num ? 'visible' : ''}`}>
            <div className="hiw-step-num">{step.num}</div>
            <div className="hiw-step-title">{step.title}</div>
          </div>

          <div className="hiw-browser-wrap">
            <div className="hiw-browser">
              <div className="hiw-browser-bar">
                <div className="hiw-dots"><span /><span /><span /></div>
                <div className="hiw-url">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#A0AEC0" style={{verticalAlign: '-1px', marginRight: '4px'}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  <strong>oversightreports.com</strong><span className="hiw-url-path">{step.url}</span>
                </div>
              </div>
              <div className="hiw-viewport">

                {/* SCENE 1: SEARCH */}
                <div className={`hiw-scene ${activeScene === 0 ? 'active' : ''}`}>
                  <div className="hiw-search-page">
                    <div className={`hiw-s1-eyebrow ${s1In.eyebrow ? 'in' : ''}`}>
                      Nursing home safety data, independently reviewed
                    </div>
                    <div className={`hiw-s1-heading ${s1In.heading ? 'in' : ''}`}>
                      Search any nursing home in America.
                    </div>
                    <div className={`hiw-s1-sub ${s1In.sub ? 'in' : ''}`}>
                      Inspections, staffing, fines, and ownership for all 14,713 Medicare-certified facilities.
                    </div>
                    <div className={`hiw-search-pill ${s1In.pill ? 'in' : ''} ${searchFocused ? 'focused' : ''}`}>
                      <svg className="hiw-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0AEC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <div className="hiw-search-text">
                        <span>{typedText}</span>
                        {showPlaceholder && <span className="hiw-placeholder">Search by facility name, city, or ZIP code</span>}
                        <span className="hiw-cursor" />
                      </div>
                    </div>
                    <div className={`hiw-s1-browse ${s1In.browse ? 'in' : ''}`}>
                      or <Link to="/states">Browse by State</Link>
                    </div>
                    <div className={`hiw-s1-source ${s1In.source ? 'in' : ''}`}>
                      Based on CMS data through Q3 2025 · <Link to="/methodology">How we calculate these numbers</Link>
                    </div>
                  </div>
                </div>

                {/* SCENE 2: EVIDENCE */}
                <div className={`hiw-scene ${activeScene === 1 ? 'active' : ''}`}>
                  <div className="hiw-evidence-page">
                    <div className={`hiw-ev-header ${evIn.header ? 'in' : ''}`}>
                      Cross-referencing federal records for CCN 355065
                    </div>
                    {CHECK_ITEMS.map((item, i) => (
                      <div className={`hiw-chk-row ${evIn.rows[i] ? 'in' : ''}`} key={i}>
                        <div className="hiw-chk-icon">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div className="hiw-chk-info">
                          <div className="hiw-chk-name">{item.name}</div>
                          <div className="hiw-chk-desc">{item.desc}</div>
                        </div>
                        <div className="hiw-chk-count">{item.count}</div>
                      </div>
                    ))}
                    <div className={`hiw-finding hiw-finding-red ${evIn.findings[0] ? 'in' : ''}`}>
                      <strong>Staffing discrepancy:</strong> This facility reports adequate staffing but payroll records show <strong>8 min/resident/day</strong> of RN time — 80% below the national average.
                    </div>
                    <div className={`hiw-finding hiw-finding-amber ${evIn.findings[1] ? 'in' : ''}`}>
                      <strong>Ownership flag:</strong> Operated by a 64-facility chain with average fines of <strong>$62,530 per facility</strong> — 5x the national average.
                    </div>
                  </div>
                </div>

                {/* SCENE 3: REPORT CARD */}
                <div className={`hiw-scene ${activeScene === 2 ? 'active' : ''}`}>
                  <div className="hiw-report-page">
                    <div className={`hiw-rpt-topbar ${rptIn.topbar ? 'in' : ''}`}>
                      <div className="hiw-rpt-topbar-left">
                        <span className="hiw-rpt-back">&#8592; Back to Map</span>
                        <span className="hiw-rpt-label">Facility Report Card</span>
                      </div>
                      <div className="hiw-rpt-topbar-right">
                        <span className="hiw-rpt-fav">&#9734; Favorite</span>
                        <span className="hiw-rpt-pdf">&#8595; Download PDF Report</span>
                      </div>
                    </div>

                    <div className={`hiw-rpt-header ${rptIn.header ? 'in' : ''}`}>
                      <div className="hiw-rpt-name">Sunset Drive – A Prospera Community</div>
                      <div className="hiw-rpt-meta">
                        MANDAN, ND | 128 beds | CMS Rating: 1 <span style={{color: '#D69E2E'}}>&#9733;</span> · <a href="#">ProPublica Report</a> · <a href="#">Medicare Compare</a>
                      </div>
                      <div className="hiw-rpt-ccn">CMS CCN: 355065</div>
                    </div>

                    <div className={`hiw-rpt-bl ${rptIn.bl ? 'in' : ''}`}>
                      <div className="hiw-rpt-bl-label">&#9650; BOTTOM LINE</div>
                      <p>Inspectors found <strong>serious danger to residents 1 time</strong> — risk of serious injury or death. This facility has been fined <strong>$63,925</strong>. The same company runs <strong>93 other facilities</strong> with average fines of $42,796 among those penalized.</p>
                      <div className="hiw-bl-source">Source: CMS Provider Data · Verify: <a href="#">ProPublica</a> · <a href="#">Medicare Care Compare</a></div>
                    </div>

                    <div className={`hiw-rpt-sec ${rptIn.sec1 ? 'in' : ''}`}>
                      <div className="hiw-rpt-sec-num">01</div>
                      <div className="hiw-rpt-sec-title">Safety Score</div>
                    </div>
                    <div className="hiw-rpt-grid">
                      {METRICS.map((m, i) => (
                        <div className={`hiw-rpt-card ${rptIn.cards[i] ? 'in' : ''}`} key={i}>
                          <div className={`hiw-rpt-val ${m.cls}`}>
                            {rptIn.cards[i] ? <CountUp target={m.target} prefix={m.prefix} suffix={m.suffix} /> : `${m.prefix}0${m.suffix}`}
                          </div>
                          <div className="hiw-rpt-card-label">{m.label}</div>
                          <div className="hiw-rpt-card-ctx">{m.ctx}</div>
                        </div>
                      ))}
                    </div>

                    <div className={`hiw-rpt-sec ${rptIn.sec2 ? 'in' : ''}`}>
                      <div className="hiw-rpt-sec-num">02</div>
                      <div className="hiw-rpt-sec-title">What Did Inspectors Find?</div>
                    </div>
                    <div className={`hiw-insp-item ${rptIn.insps[0] ? 'in' : ''}`}>
                      <div className="hiw-insp-badge badge-red">Immediate Jeopardy</div>
                      <div className="hiw-insp-desc">Failed to provide medications as ordered — insulin given at wrong time, wrong dose. Found during standard survey.</div>
                      <div className="hiw-insp-meta">Survey: Nov 2024 · Scope: Pattern · Corrected: Dec 2024</div>
                    </div>
                    <div className={`hiw-insp-item ${rptIn.insps[1] ? 'in' : ''}`}>
                      <div className="hiw-insp-badge badge-amber">Actual Harm</div>
                      <div className="hiw-insp-desc">Resident fell from wheelchair due to inadequate safety positioning. No fall risk reassessment conducted after prior incident.</div>
                      <div className="hiw-insp-meta">Survey: Aug 2024 · Scope: Isolated · Corrected: Sep 2024</div>
                    </div>
                  </div>
                </div>

                {/* SCENE 4: CTA */}
                <div className={`hiw-scene ${activeScene === 3 ? 'active' : ''}`}>
                  <div className="hiw-cta-page">
                    <div className={`hiw-cta-num ${ctaIn.num ? 'in' : ''}`}>14,713</div>
                    <div className={`hiw-cta-sub ${ctaIn.sub ? 'in' : ''}`}>Every Medicare nursing home in America</div>
                    <div className={`hiw-cta-head ${ctaIn.head ? 'in' : ''}`}>We ran this analysis for every facility in the country.</div>
                    <Link to="/" className={`hiw-cta-btn ${ctaIn.btn ? 'in' : ''}`}>Search a facility &#8594;</Link>
                    <div className={`hiw-cta-link ${ctaIn.link ? 'in' : ''}`}><Link to="/methodology">Read our methodology</Link></div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Scroll hint */}
          <div className={`hiw-scroll-hint ${scrollProgress > 0.05 ? 'hidden' : ''}`}>
            <div className="hiw-scroll-hint-text">Scroll to see how</div>
            <svg className="hiw-scroll-hint-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
          </div>

        </div>
      </div>
    </div>
  );
}
