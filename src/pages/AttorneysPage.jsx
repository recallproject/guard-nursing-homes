import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/attorneys.css';

export default function AttorneysPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Nursing Home Attorney Evidence Reports | OversightReports';
    window.plausible && window.plausible('Attorneys-Page-View');
  }, []);

  return (
    <div className="attorneys-page">
      <Helmet>
        <title>Nursing Home Attorney Evidence Reports | OversightReports</title>
        <meta name="description" content="Court-ready nursing home negligence data. Inspection history, staffing failures, penalty patterns, and ownership analysis — all cited to CMS federal databases. Evidence reports in minutes." />
        <meta property="og:title" content="Nursing Home Negligence Data — Court-Ready in Minutes" />
        <meta property="og:description" content="Inspection citations, payroll-verified staffing, federal penalties, and ownership networks. Sourced from CMS. Cited and ready for litigation." />
        <meta property="og:url" content="https://www.oversightreports.com/attorneys" />
        <link rel="canonical" href="https://www.oversightreports.com/attorneys" />
      </Helmet>

      {/* HERO */}
      <section className="attorneys-hero">
        <div className="attorneys-hero-content">
          <div className="attorneys-hero-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            For Elder Abuse Attorneys
          </div>
          <h1>Nursing Home Negligence Data —<br />Court-Ready in Minutes</h1>
          <p className="attorneys-hero-subtitle">
            Every facility's complete federal safety record — inspection citations, payroll-verified staffing,
            financial penalties, and ownership networks. Sourced directly from CMS. Cited and ready for litigation.
          </p>
          <div className="attorneys-hero-actions">
            <Link to="/evidence-sample" className="attorneys-cta-primary">Preview Sample Brief</Link>
            <Link to="/" className="attorneys-cta-secondary">Find a Facility →</Link>
          </div>
          <div className="attorneys-hero-trust">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Federal CMS data
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              14,713 facilities
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Numbered source citations
            </span>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="attorneys-stats">
        <div className="attorneys-stat">
          <div className="attorneys-stat-num">14,713</div>
          <div className="attorneys-stat-label">Facilities Covered</div>
        </div>
        <div className="attorneys-stat">
          <div className="attorneys-stat-num">16</div>
          <div className="attorneys-stat-label">CMS Data Sources</div>
        </div>
        <div className="attorneys-stat">
          <div className="attorneys-stat-num">695</div>
          <div className="attorneys-stat-label">Critical Risk Facilities</div>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="attorneys-section attorneys-features">
        <div className="attorneys-container">
          <h2 className="attorneys-section-title">What the Evidence Report covers</h2>
          <p className="attorneys-section-subtitle">
            Every data point cites the specific CMS dataset, date, and record. Built for discovery responses and demand letters.
          </p>
          <div className="attorneys-feature-grid">
            <div className="attorneys-feature-card">
              <div className="attorneys-feature-icon attorneys-icon-orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <h3>Inspection History &amp; Deficiencies</h3>
              <p>Complete inspection citation history with severity tags — actual harm, immediate jeopardy, and scope classifications. Shows the facility's regulatory track record over time.</p>
              <span className="attorneys-feature-cite">Source: CMS Health Deficiency datasets</span>
            </div>

            <div className="attorneys-feature-card">
              <div className="attorneys-feature-icon attorneys-icon-blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <h3>Payroll-Verified Staffing Failures</h3>
              <p>Not self-reported — actual payroll data from CMS Payroll-Based Journal records. RN hours per resident day, zero-RN staffing days, and quarterly trends vs. state and national benchmarks.</p>
              <span className="attorneys-feature-cite">Source: CMS Payroll-Based Journal (PBJ)</span>
            </div>

            <div className="attorneys-feature-card">
              <div className="attorneys-feature-icon attorneys-icon-red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8l5 5-5 5"/></svg>
              </div>
              <h3>Federal Penalty Patterns</h3>
              <p>Complete fine history with amounts, dates, and violation types. Timeline view shows patterns of non-compliance. Large fines typically correspond to jeopardy-level citations.</p>
              <span className="attorneys-feature-cite">Source: CMS Penalty &amp; Fine records</span>
            </div>

            <div className="attorneys-feature-card">
              <div className="attorneys-feature-icon attorneys-icon-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <h3>Ownership &amp; Corporate Structure</h3>
              <p>Who actually owns this facility? Full ownership chain — parent company, management company, related facilities, and the safety records of other facilities in the same network.</p>
              <span className="attorneys-feature-cite">Source: CMS Ownership &amp; Provider datasets</span>
            </div>

            <div className="attorneys-feature-card">
              <div className="attorneys-feature-icon attorneys-icon-teal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3>Antipsychotic Prescribing Flags</h3>
              <p>Facilities flagged for prescribing patterns above the 14.6% national average — the same chemical restraint indicators identified in HHS OIG reports. Cross-referenced with schizophrenia diagnosis rates.</p>
              <span className="attorneys-feature-cite">Source: CMS Quality Measures, LTCFocus</span>
            </div>

            <div className="attorneys-feature-card">
              <div className="attorneys-feature-icon attorneys-icon-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <h3>Multi-Year Trend Analysis</h3>
              <p>Staffing trends, citation patterns, and quality measure trajectories over multiple years. Establishes whether a facility was deteriorating before the incident in question.</p>
              <span className="attorneys-feature-cite">Source: CMS Quality Rating datasets</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="attorneys-section attorneys-how" id="how-it-works">
        <div className="attorneys-container">
          <h2 className="attorneys-section-title">How it works</h2>
          <p className="attorneys-section-subtitle">
            From search to cited PDF in under a minute.
          </p>
          <div className="attorneys-steps">
            <div className="attorneys-step">
              <div className="attorneys-step-num">1</div>
              <div className="attorneys-step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <h3>Search Facility</h3>
              <p>Search by name, city, state, or CMS provider number. All 14,713 Medicare-certified nursing homes are covered.</p>
            </div>
            <div className="attorneys-step">
              <div className="attorneys-step-num">2</div>
              <div className="attorneys-step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </div>
              <h3>Review Data</h3>
              <p>Inspect staffing, citations, penalties, ownership, and quality measures. Every data point sourced from federal CMS databases.</p>
            </div>
            <div className="attorneys-step">
              <div className="attorneys-step-num">3</div>
              <div className="attorneys-step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </div>
              <h3>Download Evidence PDF</h3>
              <p>Get a cited, court-ready PDF with numbered source references. Ready for depositions, demand letters, and discovery.</p>
            </div>
          </div>
        </div>
      </section>

      {/* REPORT PREVIEW */}
      <section className="attorneys-section attorneys-preview">
        <div className="attorneys-container">
          <h2 className="attorneys-section-title">Inside the Evidence Report</h2>
          <p className="attorneys-section-subtitle">
            11 sections. Every claim cited. Built for depositions and demand letters.
          </p>
          <div className="attorneys-report-sections">
            <div className="attorneys-report-section"><span className="attorneys-report-num">01</span><span>Facility Overview &amp; CMS Profile</span></div>
            <div className="attorneys-report-section"><span className="attorneys-report-num">02</span><span>Star Rating Breakdown &amp; Risk Score</span></div>
            <div className="attorneys-report-section"><span className="attorneys-report-num">03</span><span>Staffing Analysis (Payroll-Verified)</span></div>
            <div className="attorneys-report-section"><span className="attorneys-report-num">04</span><span>Zero-RN Staffing Days</span></div>
            <div className="attorneys-report-section"><span className="attorneys-report-num">05</span><span>Inspection &amp; Deficiency History</span></div>
            <div className="attorneys-report-section"><span className="attorneys-report-num">06</span><span>Federal Penalties &amp; Fines</span></div>
            <div className="attorneys-report-section"><span className="attorneys-report-num">07</span><span>Ownership &amp; Corporate Structure</span></div>
            <div className="attorneys-report-section"><span className="attorneys-report-num">08</span><span>Quality Measures vs. Benchmarks</span></div>
            <div className="attorneys-report-section"><span className="attorneys-report-num">09</span><span>Antipsychotic Prescribing Analysis</span></div>
            <div className="attorneys-report-section"><span className="attorneys-report-num">10</span><span>Complaint &amp; Incident Reporting</span></div>
            <div className="attorneys-report-section"><span className="attorneys-report-num">11</span><span>Regulatory Citations &amp; References</span></div>
          </div>
          <div className="attorneys-preview-cta">
            <Link to="/evidence-sample" className="attorneys-cta-primary">Preview a Sample Report</Link>
          </div>
        </div>
      </section>

      {/* PRICING — replaced with free-for-attorneys callout */}
      <section className="attorneys-section attorneys-pricing" id="pricing">
        <div className="attorneys-container">
          <div className="attorneys-trust-card" style={{ textAlign: 'center' }}>
            <h2 className="attorneys-section-title" style={{ marginBottom: '0.75rem' }}>Free for Attorneys. Always.</h2>
            <p className="attorneys-section-subtitle" style={{ marginBottom: '1.5rem' }}>
              Every Facility Brief is downloadable for free from any facility page. No paywall, no login,
              no email gate. Numbered CMS source citations on every claim.
            </p>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto 1.5rem' }}>
              We charge for human work, not for data. If you have an active case and need a clinician-signed
              evidence memo, that&apos;s a separate paid service handled directly with Robert Benard, NP.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/" className="attorneys-cta-primary">Find a Facility →</Link>
              <Link to="/ask-a-clinician" className="attorneys-cta-secondary">Ask a Clinician — $49</Link>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST SIGNALS */}
      <section className="attorneys-section attorneys-trust">
        <div className="attorneys-container">
          <div className="attorneys-trust-card">
            <h3>Data sourced from CMS Medicare federal databases</h3>
            <p>
              All data is sourced from the Centers for Medicare &amp; Medicaid Services (CMS): the Five-Star
              Quality Rating System, Payroll-Based Journal (PBJ) staffing records, Health Deficiency inspection
              reports, CMS Penalty data, and Provider Ownership datasets. Data is updated as CMS releases new
              datasets, typically quarterly. Every claim in the Evidence Report includes a numbered citation
              referencing the specific CMS source.
            </p>
            <Link to="/methodology" className="attorneys-trust-link">Read our full methodology &rarr;</Link>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="attorneys-bottom-cta">
        <h2>20 hours of discovery research.<br />Done in 30 seconds.</h2>
        <p>Search any facility. Review the data. Download a cited Evidence Report.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/evidence-sample" className="attorneys-cta-primary">Preview Sample Brief</Link>
          <Link to="/ask-a-clinician" className="attorneys-cta-secondary">Ask a Clinician — $49</Link>
        </div>
      </section>

      {/* DISCLAIMER */}
      <section className="attorneys-section">
        <div className="attorneys-container">
          <div className="attorneys-disclaimer">
            <p>
              <strong>The Oversight Report aggregates publicly available federal data from CMS.</strong> Evidence
              Reports compile and cite this data but do not constitute legal advice, expert testimony, or a
              substitute for independent verification. Attorneys should verify all data against primary CMS
              sources before use in legal proceedings. Data is updated as CMS releases new datasets.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
