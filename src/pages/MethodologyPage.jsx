import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/methodology.css';

/* ── SVG icon helpers ─────────────────────────────── */
const IconDoc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
);
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IconDollar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
);
const IconHome = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const IconPulse = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);
const IconMonitor = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
);
const IconActivity = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);
const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const IconInfo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);
const IconCode = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
);
const IconServer = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
);
const IconHeart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
);
const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);
const IconLink = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
);
const IconShieldLarge = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const ChevronDown = () => (
  <svg className="methodology-accordion-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

/* ── Accordion toggle component ───────────────────── */
function AccordionSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="methodology-metric-block">
      <button className="methodology-accordion-toggle" onClick={() => setOpen(!open)}>
        <h3>{title}</h3>
        <svg className={`methodology-accordion-chevron${open ? ' open' : ''}`} width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div className="methodology-accordion-body">{children}</div>}
    </div>
  );
}

/* ── Sidebar nav items ────────────────────────────── */
const NAV_ITEMS = [
  { id: 'data-sources', num: '01', label: 'Data Sources' },
  { id: 'how-built', num: '02', label: 'How Reports Are Built' },
  { id: 'who-reviews', num: '03', label: 'Who Reviews' },
  { id: 'ai-governance', num: '04', label: 'AI Governance' },
  { id: 'scoring', num: '05', label: 'Risk Scoring' },
  { id: 'key-metrics', num: '06', label: 'Key Metrics' },
  { id: 'validation', num: '06a', label: 'Algorithm Validation' },
  { id: 'limitations', num: '07', label: "What We Don't Do" },
  { id: 'regulatory', num: '08', label: 'Federal Requirements' },
  { id: 'freshness', num: '09', label: 'Data Freshness' },
  { id: 'transparency', num: '10', label: 'Transparency Changes' },
  { id: 'contact', num: '11', label: 'Contact' },
];

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export function MethodologyPage() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('data-sources');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const progressRef = useRef(null);

  /* ── Hash scrolling on mount ─────────────────── */
  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const el = document.getElementById(location.hash.replace('#', ''));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  /* ── Scroll observer for active sidebar + progress bar ── */
  useEffect(() => {
    const handleScroll = () => {
      const h = document.documentElement;
      const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      setScrollProgress(pct);
      setShowBackToTop(h.scrollTop > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll('.methodology-section[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="methodology-page">
      <Helmet>
        <title>Methodology — How We Score Nursing Homes | The Oversight Report</title>
        <meta name="description" content="Our composite risk scoring methodology. How we combine CMS staffing data, inspection citations, penalties, and ownership patterns. Includes our AI governance framework and data integrity safeguards." />
        <link rel="canonical" href="https://www.oversightreports.com/methodology" />
      </Helmet>

      {/* Scroll progress bar */}
      <div className="methodology-progress-bar" style={{ width: `${scrollProgress}%` }} />

      {/* ════════ HERO ════════ */}
      <div className="methodology-hero">
        <div className="methodology-hero-inner">
          <h1>Methodology</h1>
          <p className="methodology-hero-sub">How we calculate every number on this site</p>
          <div className="methodology-hero-trust">
            <span><span className="methodology-trust-dot" /> CMS public data only</span>
            <span><span className="methodology-trust-dot" /> No industry funding</span>
            <span><span className="methodology-trust-dot" /> Every metric reproducible</span>
          </div>
        </div>
      </div>

      {/* ════════ LAYOUT: sidebar + content ════════ */}
      <div className="methodology-layout">
        {/* Sticky sidebar */}
        <nav className="methodology-sidebar">
          <div className="methodology-sidebar-label">On this page</div>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={activeSection === item.id ? 'active' : ''}
            >
              <span className="methodology-sidebar-num">{item.num}</span>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Main content */}
        <div className="methodology-main">

          {/* ═══ 01 DATA SOURCES ═══ */}
          <section id="data-sources" className="methodology-section section-white">
            <h2>Data Sources</h2>
            <p className="methodology-section-intro">
              All data comes from publicly accessible CMS datasets. We download, process, and analyze — but never modify the source.
            </p>

            {/* Core CMS Data */}
            <div className="methodology-source-cluster cluster-blue">
              <div className="methodology-cluster-label">Core CMS Data</div>
              <div className="methodology-source-list">
                <div className="methodology-source-item">
                  <div className="methodology-source-icon s-icon-blue"><IconDoc /></div>
                  <h4>CMS Care Compare</h4>
                  <p>Provider information, inspection results, penalties, and star ratings. Updated quarterly by CMS.</p>
                </div>
                <div className="methodology-source-item">
                  <div className="methodology-source-icon s-icon-blue"><IconUsers /></div>
                  <h4>Payroll-Based Journal (PBJ)</h4>
                  <p>Actual staffing hours from payroll records — the ground truth for staffing. Required by federal law since 2016.</p>
                </div>
                <div className="methodology-source-item">
                  <div className="methodology-source-icon s-icon-pink"><IconDollar /></div>
                  <h4>Penalty Data</h4>
                  <p>Civil monetary penalties (fines) and denial of payment records.</p>
                </div>
                <div className="methodology-source-item">
                  <div className="methodology-source-icon s-icon-amber"><IconHome /></div>
                  <h4>Ownership Data</h4>
                  <p>Corporate chains, management companies, and parent organizations.</p>
                </div>
              </div>
            </div>

            {/* Quality Measures */}
            <div className="methodology-source-cluster cluster-green">
              <div className="methodology-cluster-label">Quality Measures</div>
              <div className="methodology-source-list">
                <div className="methodology-source-item">
                  <div className="methodology-source-icon s-icon-green"><IconPulse /></div>
                  <h4>MDS Quality Measures</h4>
                  <p>Antipsychotic medication rates, pressure ulcers, falls with injury, UTIs, depression — from quarterly resident assessments (MDS 3.0).</p>
                </div>
                <div className="methodology-source-item">
                  <div className="methodology-source-icon s-icon-green"><IconMonitor /></div>
                  <h4>Claims-Based Measures</h4>
                  <p>30-day re-hospitalization rates, ER visits, discharge to community rates from Medicare claims data.</p>
                </div>
                <div className="methodology-source-item">
                  <div className="methodology-source-icon s-icon-green"><IconActivity /></div>
                  <h4>SNF QRP / VBP</h4>
                  <p>IMPACT Act measures, staff turnover, performance scores, and Medicare payment adjustments.</p>
                </div>
              </div>
            </div>

            {/* Regulatory & Safety */}
            <div className="methodology-source-cluster cluster-red">
              <div className="methodology-cluster-label">Regulatory & Safety</div>
              <div className="methodology-source-list">
                <div className="methodology-source-item">
                  <div className="methodology-source-icon s-icon-red"><IconLogout /></div>
                  <h4>State Survey Reports</h4>
                  <p>Inspection deficiency details with scope/severity ratings (A through L).</p>
                </div>
                <div className="methodology-source-item">
                  <div className="methodology-source-icon s-icon-red"><IconAlert /></div>
                  <h4>Fire Safety Deficiencies</h4>
                  <p>Fire code violations, sprinkler system issues, blocked exits, emergency preparedness.</p>
                </div>
                <div className="methodology-source-item">
                  <div className="methodology-source-icon s-icon-red"><IconInfo /></div>
                  <h4>Special Focus Facility (SFF)</h4>
                  <p>CMS designation for approximately 88 of 14,713 facilities with persistent serious quality issues.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ═══ 02 HOW REPORTS ARE BUILT ═══ */}
          <section id="how-built" className="methodology-section section-tinted">
            <h2>How Reports Are Built</h2>
            <p className="methodology-section-intro">
              Built by a nurse practitioner using automated tools. Full transparency about what's human and what's machine.
            </p>
            <div className="methodology-source-list cluster-purple" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              <div className="methodology-source-item">
                <div className="methodology-source-icon s-icon-purple"><IconCode /></div>
                <h4>Data Pipeline (Automated)</h4>
                <p>Raw CSV files from CMS are processed through automated scripts that clean, merge, and structure the data. No data is altered, fabricated, or estimated. Every number traces to a specific CMS source file.</p>
              </div>
              <div className="methodology-source-item">
                <div className="methodology-source-icon s-icon-purple"><IconServer /></div>
                <h4>Report Generation (AI-Assisted)</h4>
                <p>AI-assisted code assembles reports for all 14,713 facilities — calculating comparative metrics (national averages, percentiles) and generating consistent layouts.</p>
              </div>
              <div className="methodology-source-item">
                <div className="methodology-source-icon s-icon-purple"><IconHeart /></div>
                <h4>Clinical Interpretation (Human)</h4>
                <p>Every piece of contextual language — what a metric means, why it matters — is written or reviewed by Robert Benard, NP. The clinical framing comes from bedside experience.</p>
              </div>
            </div>
            <div className="methodology-framework-note">
              <strong>Our approach:</strong> We use automation to do what machines do well — process large datasets quickly. We use clinical expertise to do what machines cannot — interpret data in the context of real patient care. This combination allows a small team to provide transparency across every Medicare-certified nursing home.
            </div>
          </section>

          {/* ═══ 03 WHO REVIEWS ═══ */}
          <section id="who-reviews" className="methodology-section section-white">
            <h2>Who Reviews This Data</h2>
            <div className="methodology-bio-row">
              <div className="methodology-bio-card">
                <div className="methodology-bio-avatar">RB</div>
                <div>
                  <div className="methodology-bio-name">Robert Benard, NP</div>
                  <div className="methodology-bio-creds">AGACNP-BC &middot; PMHNP-BC</div>
                  <div className="methodology-bio-role">Board-certified Nurse Practitioner with over two decades of acute care and psychiatric clinical experience. Every clinical interpretation on this site is written or reviewed by Rob.</div>
                </div>
              </div>
              <div className="methodology-independence-card">
                <h4>
                  <span className="methodology-independence-icon"><IconShieldLarge /></span>
                  Independence
                </h4>
                <p>
                  Operated under DataLink Clinical LLC. No industry funding, no healthcare system ties, no government grants.
                  Revenue comes from optional paid reports — no facility can pay to change their data or how it is presented on this site.
                </p>
              </div>
            </div>
          </section>

          {/* ═══ 04 AI GOVERNANCE ═══ */}
          <section id="ai-governance" className="methodology-section section-tinted">
            <h2>AI Governance &amp; Data Integrity</h2>
            <p className="methodology-section-intro">
              AI tools can produce errors — including "hallucinations." In healthcare, this is unacceptable. Our process is designed to eliminate this risk.
            </p>
            <div className="methodology-source-list cluster-cyan">
              <div className="methodology-source-item">
                <div className="methodology-source-icon s-icon-cyan"><IconShield /></div>
                <h4>Ground Truth Verification</h4>
                <p>AI processes structured government CSV data with defined fields. We never ask AI to generate medical facts. Every number can be verified against original CMS source files.</p>
              </div>
              <div className="methodology-source-item">
                <div className="methodology-source-icon s-icon-cyan"><IconEye /></div>
                <h4>Clinician Oversight (HITL)</h4>
                <p>A board-certified NP reviews all clinical interpretation and risk characterization. AI processes data; a clinician decides what it means.</p>
              </div>
              <div className="methodology-source-item">
                <div className="methodology-source-icon s-icon-cyan"><IconLink /></div>
                <h4>Full Traceability</h4>
                <p>Every metric includes its CMS source and calculation method. Any researcher can download the same data and reproduce results independently.</p>
              </div>
              <div className="methodology-source-item">
                <div className="methodology-source-icon s-icon-cyan"><IconCheck /></div>
                <h4>Quality Checks</h4>
                <p>Automated validation against known constraints before data reaches the site. Discrepancies are flagged, not silently resolved.</p>
              </div>
            </div>
            <div className="methodology-framework-note">
              <strong>Our framework:</strong> Guided by principles from Harvard's Data Science Initiative for responsible AI governance: transparency, accountability, human oversight of high-stakes decisions, and verifiability of results. The clinician whose name is on every report is always accountable.
            </div>
          </section>

          {/* ═══ 05 COMPOSITE RISK SCORE ═══ */}
          <section id="scoring" className="methodology-section section-white">
            <h2>Composite Risk Score (0–100)</h2>
            <p className="methodology-section-intro">
              Our main risk metric combines five dimensions of facility performance. Higher scores indicate higher risk.
            </p>

            <div className="methodology-score-visual">
              <div className="methodology-score-bar">
                <div className="methodology-score-segment seg-staffing">
                  <span className="methodology-score-pct">35%</span>
                  <span className="methodology-score-lbl">Staffing</span>
                </div>
                <div className="methodology-score-segment seg-deficiency">
                  <span className="methodology-score-pct">25%</span>
                  <span className="methodology-score-lbl">Deficiencies</span>
                </div>
                <div className="methodology-score-segment seg-penalty">
                  <span className="methodology-score-pct">20%</span>
                  <span className="methodology-score-lbl">Penalties</span>
                </div>
                <div className="methodology-score-segment seg-quality">
                  <span className="methodology-score-pct">10%</span>
                  <span className="methodology-score-lbl">Quality</span>
                </div>
                <div className="methodology-score-segment seg-ownership">
                  <span className="methodology-score-pct">10%</span>
                  <span className="methodology-score-lbl">Ownership</span>
                </div>
              </div>

              <div className="methodology-score-legend">
                <div className="methodology-legend-item">
                  <h5><span className="methodology-legend-dot" style={{ background: '#2563EB', boxShadow: '0 0 6px rgba(37,99,235,0.4)' }} /> Staffing (35%)</h5>
                  <ul><li>PBJ total nursing HPRD</li><li>RN HPRD specifically</li><li>Weekend staffing levels</li><li>Zero-RN day percentage</li><li>Self-report vs. payroll gap</li></ul>
                </div>
                <div className="methodology-legend-item">
                  <h5><span className="methodology-legend-dot" style={{ background: '#7C3AED', boxShadow: '0 0 6px rgba(124,58,237,0.4)' }} /> Deficiencies (25%)</h5>
                  <ul><li>Total deficiencies</li><li>Harm-level (G+)</li><li>Jeopardy citations (J/K/L)</li><li>Scope/severity distribution</li></ul>
                </div>
                <div className="methodology-legend-item">
                  <h5><span className="methodology-legend-dot" style={{ background: '#DB2777', boxShadow: '0 0 6px rgba(219,39,119,0.4)' }} /> Penalties (20%)</h5>
                  <ul><li>Total fines</li><li>Frequency</li><li>Denial of payment</li><li>Penalty-per-bed ratio</li></ul>
                </div>
                <div className="methodology-legend-item">
                  <h5><span className="methodology-legend-dot" style={{ background: '#059669', boxShadow: '0 0 6px rgba(5,150,105,0.4)' }} /> Quality (10%)</h5>
                  <ul><li>CMS quality measures</li><li>Overall star rating</li><li>QM star rating</li></ul>
                </div>
                <div className="methodology-legend-item">
                  <h5><span className="methodology-legend-dot" style={{ background: '#D97706', boxShadow: '0 0 6px rgba(217,119,6,0.4)' }} /> Ownership (10%)</h5>
                  <ul><li>Portfolio performance</li><li>Contractor staffing %</li><li>Chain risk patterns</li></ul>
                </div>
              </div>
            </div>

            <div className="methodology-note-box">
              <strong>High-Risk threshold:</strong> Facilities scoring &ge; 60 on the composite scale are classified as high-risk. Currently 1,180 of 14,713 facilities meet this threshold.
            </div>
          </section>

          {/* ═══ 06 KEY METRICS ═══ */}
          <section id="key-metrics" className="methodology-section section-tinted">
            <h2>Key Metrics Explained</h2>
            <p className="methodology-section-intro">Every number on the site has a precise definition. Click to expand.</p>

            <AccordionSection title="Facilities Analyzed (14,713)">
              <p>Every Medicare/Medicaid-certified nursing home in the United States. Source: CMS Provider Information dataset.</p>
              <div className="methodology-formula-box">
                <span className="methodology-formula-label">Count</span>
                <span className="methodology-formula-value">All active certified nursing facilities</span>
              </div>
            </AccordionSection>

            <AccordionSection title="Facilities Reported Days With No RN On Site (5,005)">
              <p>
                Count of facilities where <code>zero_rn_pct &gt; 0</code> in PBJ payroll data. At least one day during the reporting quarter where zero registered nurse hours were logged.
              </p>
              <div className="methodology-note-box">
                <strong>Important:</strong> LVNs and CNAs may still have been present — this metric tracks RN absence specifically.
                Federal law requires an RN on duty at least 8 consecutive hours per day, 7 days a week (42 CFR §483.35).
              </div>
              <div className="methodology-formula-box">
                <span className="methodology-formula-label">Calculation</span>
                <span className="methodology-formula-value">COUNT(facilities WHERE zero_rn_pct &gt; 0)</span>
              </div>
            </AccordionSection>

            <AccordionSection title="Star Ratings (1–5)">
              <p>Directly from CMS. We display them but do not modify them. Calculated by CMS from health inspections, staffing, and quality measures.</p>
              <div className="methodology-note-box">
                <strong>Note:</strong> CMS star ratings are widely criticized for being gameable through self-reported data. Our composite score exists because star ratings alone are insufficient for assessing risk.
              </div>
            </AccordionSection>

            <AccordionSection title="Staffing HPRD (Hours Per Resident Day)">
              <p>Total nursing hours divided by resident census. Reported via PBJ payroll data — the most reliable measure of actual staffing levels.</p>
              <div className="methodology-formula-box">
                <span className="methodology-formula-label">Formula</span>
                <span className="methodology-formula-value">Total Nursing Hours &divide; Total Resident Days</span>
              </div>
              <div className="methodology-note-box">
                <strong>Benchmarks:</strong> National median is approximately 3.6 HPRD. Below 3.0 is concerning. Below 2.5 is critical.
              </div>
            </AccordionSection>

            <AccordionSection title="RN Gap Percentage">
              <p>Measures the discrepancy between what a facility claims on CMS surveys versus what their payroll records show.</p>
              <div className="methodology-formula-box">
                <span className="methodology-formula-label">Formula</span>
                <span className="methodology-formula-value">((Self-Reported RN HPRD - PBJ RN HPRD) &divide; Self-Reported RN HPRD) &times; 100</span>
              </div>
              <div className="methodology-note-box">
                <strong>Thresholds:</strong> Gaps above 25% are significant. Gaps above 50% warrant serious scrutiny.
              </div>
            </AccordionSection>

            <AccordionSection title="Zero RN Percentage">
              <p>
                Percentage of days in the reporting quarter where the facility logged zero RN hours in PBJ payroll data.
                LPNs/LVNs and CNAs may still be present, but cannot perform RN-level clinical functions such as IV medication administration,
                complex assessments, or care plan changes.
              </p>
              <div className="methodology-formula-box">
                <span className="methodology-formula-label">Formula</span>
                <span className="methodology-formula-value">(Days with 0 RN Hours &divide; Total Days in Quarter) &times; 100</span>
              </div>
              <div className="methodology-note-box">
                <strong>Note:</strong> CMS PBJ data tracks RN, LPN/LVN, and CNA hours as completely separate categories. When we report zero-RN days, this is based solely on the RN-specific payroll field.
              </div>
            </AccordionSection>
          </section>

          {/* ═══ 06a ALGORITHM VALIDATION ═══ */}
          <section id="validation" className="methodology-section section-white">
            <h2>How We Know the Flags Work</h2>
            <p className="methodology-section-intro">
              We tested whether facilities flagged by our risk algorithm actually receive
              more CMS enforcement actions than non-flagged facilities. This study was
              conducted on all 14,713 Medicare-certified nursing homes using publicly
              available CMS data.
            </p>

            <div className="methodology-validation-summary">
              Facilities flagged by our 4-factor risk algorithm were
              <strong> 3.3 times more likely</strong> to receive new CMS penalties in 2025
              (OR&nbsp;=&nbsp;3.32, 95%&nbsp;CI:&nbsp;2.90&ndash;3.80, p&nbsp;&lt;&nbsp;0.001)
              and accumulated <strong>2.8 times higher</strong> total fines than non-flagged
              facilities. Penalty data was not used in the flagging criteria.
            </div>

            <div className="methodology-stat-row">
              <div className="methodology-stat-pill">
                <span className="methodology-stat-value">3.3x</span>
                <span className="methodology-stat-label">More Likely Penalized (2025)</span>
              </div>
              <div className="methodology-stat-pill">
                <span className="methodology-stat-value">2.8x</span>
                <span className="methodology-stat-label">Higher Total Fines</span>
              </div>
              <div className="methodology-stat-pill">
                <span className="methodology-stat-value">3.3x</span>
                <span className="methodology-stat-label">More Immediate Jeopardy</span>
              </div>
              <div className="methodology-stat-pill">
                <span className="methodology-stat-value">95.3%</span>
                <span className="methodology-stat-label">Specificity (Low False Flags)</span>
              </div>
            </div>

            <div className="methodology-metric-block">
              <h4>Study Design</h4>
              <p>
                We flagged 1,050 facilities (7.1%) using four non-penalty indicators. Fines
                and penalty history were deliberately excluded from the flagging criteria so
                that enforcement outcomes could be measured independently &mdash; eliminating
                the circularity of using penalties to predict penalties.
              </p>
            </div>

            <div className="methodology-metric-block">
              <h4>Flag Criteria</h4>
              <p style={{ marginBottom: '6px', color: '#64748B', fontSize: '0.82rem' }}>All four must be true simultaneously:</p>
              <ul className="methodology-criteria-list">
                <li>
                  <span className="methodology-criteria-num">1</span>
                  <span>CMS overall star rating = <code>1 star</code> (lowest possible)</span>
                </li>
                <li>
                  <span className="methodology-criteria-num">2</span>
                  <span>Total staffing below <code>3.5 HPRD</code> (hours per resident day)</span>
                </li>
                <li>
                  <span className="methodology-criteria-num">3</span>
                  <span>Days with <code>zero RN</code> coverage on record (federal violation under 42&nbsp;CFR&nbsp;&sect;483.35)</span>
                </li>
                <li>
                  <span className="methodology-criteria-num">4</span>
                  <span>Total health deficiencies <code>&ge; 15</code></span>
                </li>
              </ul>
              <div className="methodology-note-box">
                <strong>Why penalties are excluded:</strong> If we used fines to flag
                facilities and then measured whether flagged facilities had high fines,
                the result would be circular and meaningless. By flagging only on quality
                and staffing indicators, the penalty comparison is an independent validation.
              </div>
            </div>

            <div className="methodology-metric-block">
              <h4>Results: Penalty Comparison</h4>
              <table className="methodology-results-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Flagged (n=1,050)</th>
                    <th>Not Flagged (n=13,663)</th>
                    <th>Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Facilities penalized (any fine)</td>
                    <td><span className="val-highlight">78.4%</span></td>
                    <td><span className="val-muted">44.6%</span></td>
                    <td><span className="val-ratio">1.8x</span></td>
                  </tr>
                  <tr>
                    <td>Mean total fines</td>
                    <td><span className="val-highlight">$83,362</span></td>
                    <td><span className="val-muted">$29,613</span></td>
                    <td><span className="val-ratio">2.8x</span></td>
                  </tr>
                  <tr>
                    <td>Penalty records per facility</td>
                    <td><span className="val-highlight">2.59</span></td>
                    <td><span className="val-muted">1.12</span></td>
                    <td><span className="val-ratio">2.3x</span></td>
                  </tr>
                  <tr>
                    <td>Penalized in 2025 (new penalties)</td>
                    <td><span className="val-highlight">35.2%</span></td>
                    <td><span className="val-muted">14.1%</span></td>
                    <td><span className="val-ratio">2.5x</span></td>
                  </tr>
                  <tr>
                    <td>Immediate Jeopardy deficiencies per facility</td>
                    <td><span className="val-highlight">1.95</span></td>
                    <td><span className="val-muted">0.58</span></td>
                    <td><span className="val-ratio">3.3x</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="methodology-metric-block">
              <h4>Statistical Significance</h4>
              <div className="methodology-formula-box">
                <span className="methodology-formula-label">Odds Ratio</span>
                <span className="methodology-formula-value">
                  Penalized (all time): <strong>4.50</strong> (95% CI: 3.87&ndash;5.23) <span className="methodology-sig-badge">p = 1.2 &times; 10&#8315;&#8313;&#8312;</span><br />
                  Penalized (2025 only): <strong>3.32</strong> (95% CI: 2.90&ndash;3.80) <span className="methodology-sig-badge">p = 8.0 &times; 10&#8315;&#8311;&#8308;</span>
                </span>
              </div>
              <div className="methodology-formula-box">
                <span className="methodology-formula-label">Effect Size</span>
                <span className="methodology-formula-value">
                  Cohen&rsquo;s d (fines): <strong>0.75</strong> &mdash; medium-to-large effect<br />
                  Cohen&rsquo;s d (deficiencies): <strong>0.72</strong> &mdash; medium-to-large effect
                </span>
              </div>
            </div>

            <div className="methodology-metric-block">
              <h4>Predictive Performance</h4>
              <p>When we define &ldquo;heavily penalized&rdquo; as receiving over $50,000 in total CMS fines:</p>
              <table className="methodology-results-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Specificity</td>
                    <td><span className="val-highlight">95.3%</span></td>
                    <td>We correctly identify 95% of non-problematic facilities</td>
                  </tr>
                  <tr>
                    <td>Positive Predictive Value</td>
                    <td><span className="val-highlight">46.6%</span></td>
                    <td>When we flag a facility, ~47% have been heavily fined</td>
                  </tr>
                  <tr>
                    <td>Negative Predictive Value</td>
                    <td><span className="val-highlight">83.5%</span></td>
                    <td>When we don&rsquo;t flag, ~84% are not heavily fined</td>
                  </tr>
                  <tr>
                    <td>Sensitivity</td>
                    <td><span className="val-highlight">17.8%</span></td>
                    <td>We catch ~1 in 6 heavily penalized facilities</td>
                  </tr>
                </tbody>
              </table>
              <div className="methodology-note-box">
                <strong>Why sensitivity is low (by design):</strong> Our algorithm requires
                ALL four risk factors to be present simultaneously. This strict convergence
                means we miss many problematic facilities that fail on only 2 or 3 factors.
                We accept this trade-off because falsely flagging a facility carries greater
                reputational and legal risk than missing one. When we do flag, the signal is
                strong.
              </div>
            </div>
          </section>

          {/* ═══ 06b STUDY LIMITATIONS ═══ */}
          <section id="study-limitations" className="methodology-section section-tinted">
            <h2>What This Study Does Not Prove</h2>
            <p className="methodology-section-intro">
              We believe in showing our work &mdash; including where it falls short.
              This validation has real limitations that we want to be transparent about.
            </p>

            <ul className="methodology-limitations-list">
              <li>
                <span className="methodology-limit-icon">&#9679;</span>
                <span><strong>Retrospective, not prospective.</strong> Facility characteristics and penalty data overlap in time. A true prospective study would freeze characteristics at a fixed date and track only future enforcement. The 2025 time-split is our closest approximation.</span>
              </li>
              <li>
                <span className="methodology-limit-icon">&#9679;</span>
                <span><strong>Not fully independent temporal windows.</strong> The facility data reflects a recent snapshot that includes cumulative metrics. Some correlation between characteristics and penalties is expected simply because both accumulate over time.</span>
              </li>
              <li>
                <span className="methodology-limit-icon">&#9679;</span>
                <span><strong>Low sensitivity.</strong> The algorithm catches fewer than 1 in 5 heavily penalized facilities. Many problematic facilities have 2+ stars, adequate staffing, or fewer than 15 deficiencies. We do not claim to identify all dangerous facilities.</span>
              </li>
              <li>
                <span className="methodology-limit-icon">&#9679;</span>
                <span><strong>CMS data is self-reported.</strong> Staffing hours are reported by facilities themselves via the Payroll-Based Journal. Deficiency counts depend on survey timing and surveyor judgment. Neither dataset has been independently audited by us.</span>
              </li>
              <li>
                <span className="methodology-limit-icon">&#9679;</span>
                <span><strong>Deficiency count does not weight severity.</strong> A facility with 15 minor deficiencies and one with 15 immediate jeopardy deficiencies both meet the threshold. Future iterations may incorporate severity weighting.</span>
              </li>
              <li>
                <span className="methodology-limit-icon">&#9679;</span>
                <span><strong>Single snapshot.</strong> This analysis uses one point-in-time dataset. Facility conditions change. We will re-validate with each quarterly CMS data refresh and publish updated results.</span>
              </li>
            </ul>

            <div className="methodology-formula-box">
              <span className="methodology-formula-label">Reproducibility</span>
              <span className="methodology-formula-value">
                Full analysis script and raw results are available upon request.
                All data sourced from publicly available CMS datasets.
                No external funding. No conflicts of interest.
              </span>
            </div>
          </section>

          {/* ═══ 06c VERIFY OUR WORK ═══ */}
          <section id="verify-work" className="methodology-section section-white">
            <h2>Data Sources for This Study</h2>
            <table className="methodology-results-table">
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Coverage</th>
                  <th>Records</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>CMS Provider Information</td>
                  <td>Jan 1, 2026 snapshot</td>
                  <td><span className="val-muted">14,713 facilities</span></td>
                </tr>
                <tr>
                  <td>CMS Penalties</td>
                  <td>Jan 2023 &ndash; Dec 2025</td>
                  <td><span className="val-muted">18,060 records</span></td>
                </tr>
                <tr>
                  <td>CMS Health Deficiencies</td>
                  <td>2017 &ndash; Dec 2025</td>
                  <td><span className="val-muted">417,293 records</span></td>
                </tr>
                <tr>
                  <td>CMS PBJ Staffing (Q3 2025)</td>
                  <td>Quarterly payroll data</td>
                  <td><span className="val-muted">1.26M records</span></td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '16px' }}>
              Statistical tests: Chi-square with Yates&rsquo; correction, Mann-Whitney U (one-sided),
              odds ratios with Woolf logit 95% CI, Cohen&rsquo;s d with pooled SD.
              Software: Python 3.9, pandas, scipy, numpy.
            </p>
          </section>

          {/* ═══ 07 WHAT WE DON'T DO ═══ */}
          <section id="limitations" className="methodology-section section-white">
            <h2>What We Don&rsquo;t Do</h2>
            <div className="methodology-dont-grid">
              <div className="methodology-dont-card">
                <div className="methodology-dont-icon">&times;</div>
                <div>
                  <h4>Rank facilities &ldquo;good&rdquo; or &ldquo;bad&rdquo;</h4>
                  <p>We present risk factors. Families make their own decisions.</p>
                </div>
              </div>
              <div className="methodology-dont-card">
                <div className="methodology-dont-icon">&times;</div>
                <div>
                  <h4>Include subjective reviews</h4>
                  <p>Analysis is based entirely on objective government data.</p>
                </div>
              </div>
              <div className="methodology-dont-card">
                <div className="methodology-dont-icon">&times;</div>
                <div>
                  <h4>Accept advertising</h4>
                  <p>No facility can pay to improve their score or ranking.</p>
                </div>
              </div>
              <div className="methodology-dont-card">
                <div className="methodology-dont-icon">&times;</div>
                <div>
                  <h4>Modify CMS star ratings</h4>
                  <p>Displayed exactly as published by CMS.</p>
                </div>
              </div>
              <div className="methodology-dont-card">
                <div className="methodology-dont-icon">&times;</div>
                <div>
                  <h4>Make clinical recommendations</h4>
                  <p>Our score is a screening tool. Always visit facilities in person.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ═══ 08 FEDERAL REQUIREMENTS ═══ */}
          <section id="regulatory" className="methodology-section section-tinted">
            <h2>Federal Staffing Requirements</h2>
            <p className="methodology-section-intro">Understanding the regulatory framework is critical for interpreting staffing data.</p>

            <div className="methodology-metric-block">
              <h4>Current Federal Law (42 CFR §483.35)</h4>
              <p>All Medicare/Medicaid-certified nursing homes must meet these requirements:</p>
              <ul>
                <li>A registered nurse (RN) on site for at least 8 consecutive hours per day, 7 days per week</li>
                <li>A full-time RN serving as Director of Nursing</li>
                <li>&ldquo;Sufficient numbers&rdquo; of licensed nursing staff 24 hours per day to meet residents&rsquo; needs</li>
              </ul>
              <div className="methodology-note-box">
                <strong>Key gap:</strong> There is currently no federal minimum hours-per-resident-day (HPRD) requirement. The &ldquo;sufficient&rdquo; standard is qualitative, not quantitative.
              </div>
              <div className="methodology-formula-box">
                <span className="methodology-formula-label">Source</span>
                <span className="methodology-formula-value">
                  <a href="https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.35" target="_blank" rel="noopener noreferrer">
                    42 CFR §483.35 (Code of Federal Regulations)
                  </a>
                </span>
              </div>
            </div>

            <div className="methodology-metric-block">
              <h4>Timeline: The 2024 Staffing Rule</h4>
              <div className="methodology-timeline">
                <div className="methodology-tl-item">
                  <div className="methodology-tl-date">May 2024</div>
                  <div className="methodology-tl-text">CMS finalizes first-ever minimum staffing rule: 3.48 total HPRD (0.55 RN + 2.45 CNA) + 24/7 RN coverage</div>
                </div>
                <div className="methodology-tl-item tl-red">
                  <div className="methodology-tl-date">April–June 2025</div>
                  <div className="methodology-tl-text">Federal courts in Texas and Iowa strike down the rule before it takes effect</div>
                </div>
                <div className="methodology-tl-item tl-red">
                  <div className="methodology-tl-date">July 4, 2025</div>
                  <div className="methodology-tl-text">
                    <a href="https://www.congress.gov/bill/119th-congress/house-bill/1/text" target="_blank" rel="noopener noreferrer">One Big Beautiful Bill Act</a> (§71111) blocks enforcement through September 2034
                  </div>
                </div>
                <div className="methodology-tl-item tl-red">
                  <div className="methodology-tl-date">December 2, 2025</div>
                  <div className="methodology-tl-text">
                    CMS formally{' '}
                    <a href="https://www.federalregister.gov/documents/2025/12/03/2025-21792/medicare-and-medicaid-programs-repeal-of-minimum-staffing-standards-for-long-term-care-facilities" target="_blank" rel="noopener noreferrer">
                      repeals the 2024 standards
                    </a>{' '}
                    via interim final rule (effective February 2, 2026)
                  </div>
                </div>
                <div className="methodology-tl-item">
                  <div className="methodology-tl-date">February 2, 2026</div>
                  <div className="methodology-tl-text">
                    <a href="https://oag.ca.gov/system/files/attachments/press-docs/Repeal%20of%20Minimum%20Staffing%20Standards%20for%20LTC%20Facilities%20Comment%20Letter%202026.02.02.pdf" target="_blank" rel="noopener noreferrer">
                      18 state attorneys general
                    </a>{' '}
                    (led by CA, MA, NY) ask CMS for targeted 3.48 HPRD standard for high-risk for-profit operators
                  </div>
                </div>
              </div>
              <div className="methodology-note-box">
                <strong>Critical fact:</strong> The 24/7 RN requirement never took effect at any facility.
              </div>
            </div>

            <div className="methodology-metric-block">
              <h4>State-Level Variation</h4>
              <p>Approximately 14 states have their own staffing requirements that exceed the federal baseline:</p>
              <ul>
                <li>Some states require 24/7 RN coverage (the federal rule only requires 8 hours)</li>
                <li>A few states impose minimum HPRD thresholds (e.g., California requires 3.5 HPRD)</li>
                <li>State requirements remain in effect regardless of federal changes</li>
              </ul>
            </div>

            <AccordionSection title="How Can a Facility Report Zero RN Hours?">
              <p>Federal law requires a registered nurse on site for at least 8 consecutive hours every day. Yet CMS payroll data shows thousands of facilities reporting days with zero RN hours. There are several possible explanations:</p>
              <ul>
                <li>The facility actually had no RN working that day — a potential violation of 42 CFR §483.35(b)(1).</li>
                <li>The facility had an RN present but failed to submit accurate payroll data to CMS — a reporting compliance issue.</li>
                <li>The facility submitted incomplete or erroneous PBJ data — which CMS does not routinely audit.</li>
              </ul>
              <p>All three scenarios are concerning. CMS conducts on-site inspections roughly every 12–15 months. Between inspections, there is no real-time monitoring of whether facilities meet the 8-hour RN requirement.</p>
              <p>Some facilities — particularly small or rural homes — may qualify for a federal waiver of the 8-hour RN requirement (42 CFR §483.35(e)). However, a waiver does not eliminate the requirement for licensed nursing coverage.</p>
              <p>We present this data as reported by facilities to CMS. Families with concerns should contact their state survey agency or CMS regional office.</p>
            </AccordionSection>
          </section>

          {/* ═══ 09 DATA FRESHNESS ═══ */}
          <section id="freshness" className="methodology-section section-white">
            <h2>Data Freshness</h2>
            <div className="methodology-freshness-row">
              <div className="methodology-freshness-card">
                <div className="methodology-freshness-big">Apr 2026</div>
                <div className="methodology-freshness-sub">Current data version</div>
              </div>
              <div className="methodology-freshness-card">
                <div className="methodology-freshness-big">May 3</div>
                <div className="methodology-freshness-sub">Last downloaded</div>
              </div>
              <div className="methodology-freshness-card">
                <div className="methodology-freshness-big">18</div>
                <div className="methodology-freshness-sub">CMS datasets integrated</div>
              </div>
              <div className="methodology-freshness-card">
                <div className="methodology-freshness-big">~Jul 2026</div>
                <div className="methodology-freshness-sub">Next CMS refresh</div>
              </div>
            </div>
            <div className="methodology-note-box" style={{ marginTop: '20px' }}>
              <strong>Important:</strong> Between updates, new inspections, penalties, or ownership changes may have occurred. Always verify current status directly with CMS Care Compare or the facility.
            </div>
          </section>

          {/* ═══ 10 TRANSPARENCY CHANGES ═══ */}
          <section id="transparency" className="methodology-section section-tinted">
            <h2>Government Data Transparency Changes</h2>
            <p className="methodology-section-intro">When CMS removes data from public view, we document it here and explain how it affects what families can see.</p>

            <AccordionSection title="Complaint Counts Removed (Feb 25, 2026)" defaultOpen>
              <p>
                On February 25, 2026, CMS removed complaint investigation counts from the Care Compare website.
                The Oversight Report reconstructed complaint counts from publicly available federal inspection records
                (CMS Health Deficiencies and Inspection Dates files). Each inspection record includes a flag indicating
                whether it was triggered by a complaint investigation.
              </p>
              <p>
                This is not estimated or modeled data — it is a direct count from the same federal records CMS previously
                used. We archived these datasets before the removal and will continue to provide this information as long
                as the underlying inspection records remain publicly available.
              </p>
            </AccordionSection>

            <AccordionSection title="Ownership Disclosure Suspension">
              <p>
                CMS has suspended certain enhanced ownership disclosure requirements that were part of the 2024 regulatory
                package. We continue to report ownership data using the currently available CMS Ownership file, which
                includes owner names, organization types, and ownership percentages. Some previously proposed disclosure
                enhancements (such as detailed private equity and REIT identification) may not be reflected in current CMS data.
              </p>
            </AccordionSection>
          </section>

          {/* ═══ 11 CONTACT ═══ */}
          <section id="contact" className="methodology-section section-white">
            <h2>Contact &amp; Corrections</h2>
            <p className="methodology-section-intro">If you believe any information on this site is incorrect, we want to know.</p>
            <div className="methodology-contact-card">
              <div className="methodology-source-item" style={{ borderTopColor: '#3B82F6' }}>
                <div className="methodology-source-icon s-icon-blue"><IconMail /></div>
                <h4>Report a Data Issue</h4>
                <p>
                  Email <a href="mailto:contact@oversightreports.com">contact@oversightreports.com</a> with facility name/CCN,
                  the specific metric or data point in question, what you believe the correct information should be, and source documentation if available.
                </p>
                <div className="methodology-note-box" style={{ marginTop: '12px' }}>
                  <strong>Our commitment:</strong> We will investigate and correct verified errors within 48 hours. If the error originated in CMS data, we will note the discrepancy and report it to CMS.
                </div>
              </div>
            </div>
  
            <div className="methodology-metric-block">
              <h4>Inspection Deficiency Framework (F-Tags)</h4>
              <p>Every nursing home inspection results in a statement of deficiencies (CMS Form 2567). Each finding is tagged with an &ldquo;F-tag&rdquo; — a standardized reference that maps directly to a specific section of federal regulation.</p>
              
              <div className="methodology-note-box">
                <strong>What F-tags are:</strong> Federal deficiency tag numbers (e.g., F686, F880) assigned during nursing home inspections by state survey agencies. Each F-tag corresponds to a specific section of 42 CFR Part 483 — Requirements for States and Long Term Care Facilities.
              </div>

              <p><strong>CMS Form 2567</strong> (Statement of Deficiencies and Plan of Correction) is the official document issued after every nursing home inspection. It details each deficiency found, the regulation violated, the scope and severity, and the facility&rsquo;s plan to correct the problem.</p>

              <p><strong>Scope levels</strong> indicate how many residents were affected:</p>
              <ul>
                <li><strong>Isolated</strong> — affects one or a very limited number of residents</li>
                <li><strong>Pattern</strong> — affects multiple residents</li>
                <li><strong>Widespread</strong> — affects many residents or is systemic</li>
              </ul>

              <p><strong>Severity levels</strong> indicate the degree of harm:</p>
              <ul>
                <li><strong>No Actual Harm (potential for minimal harm)</strong> — Level 1</li>
                <li><strong>No Actual Harm (potential for more than minimal harm)</strong> — Level 2</li>
                <li><strong>Actual Harm</strong> — Level 3: a resident was harmed</li>
                <li><strong>Immediate Jeopardy</strong> — Level 4: conditions pose serious risk of injury, harm, impairment, or death</li>
              </ul>

              <div className="methodology-note-box">
                <strong>California Title 22:</strong> For California facilities, state regulations under Title 22, Division 5 of the California Code of Regulations provide additional requirements that mirror and supplement federal standards. Where applicable, The Oversight Report displays both the federal CFR citation and the corresponding California Title 22 reference.
              </div>

              <div className="methodology-formula-box">
                <span className="methodology-formula-label">Sources</span>
                <span className="methodology-formula-value">
                  <a href="https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483" target="_blank" rel="noopener noreferrer">
                    42 CFR Part 483 (Code of Federal Regulations)
                  </a>
                  {' · '}
                  <a href="https://www.cms.gov/medicare/health-safety-standards/quality-safety-oversight-general-information/nursing-home-quality/deficiency-tag-number-category-change-log" target="_blank" rel="noopener noreferrer">
                    CMS F-Tag Reference
                  </a>
                </span>
              </div>
            </div>

        </section>

        </div>
      </div>

      {/* Back to Top */}
      <button
        className={`methodology-back-to-top${showBackToTop ? ' visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        &uarr;
      </button>
    </div>
  );
}
