import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/hospitals.css';

export default function HospitalsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    window.plausible && window.plausible('Hospitals-Page-View');
  }, []);

  return (
    <div className="hospitals-page">
      <Helmet>
        <title>Nursing Home Data for Discharge Planners &amp; Case Managers | The Oversight Report</title>
        <meta name="description" content="Staffing discrepancy index, state screening reports, and chain rankings to support safe nursing home discharge planning. Federal CMS data on 14,713 facilities." />
        <meta property="og:title" content="Nursing Home Tools for Discharge Planners & Case Managers" />
        <meta property="og:description" content="State screening reports, staffing discrepancy data, and chain rankings to support safe discharge planning." />
        <meta property="og:url" content="https://www.oversightreports.com/hospitals" />
        <link rel="canonical" href="https://www.oversightreports.com/hospitals" />
      </Helmet>

      {/* HERO */}
      <section className="hospitals-hero">
        <div className="hospitals-hero-content">
          <div className="hospitals-hero-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            For Discharge Planners &amp; Case Managers
          </div>
          <h1>Data-backed nursing home<br />placement support</h1>
          <p className="hospitals-hero-subtitle">
            Screen facilities before discharge. Staffing discrepancy index, state-level safety reports,
            and chain ownership data — all from federal CMS sources, covering 14,713 facilities.
          </p>
          <div className="hospitals-hero-actions">
            <Link to="/professionals" className="hospitals-cta-primary">View Professional Tools</Link>
            <Link to="/screening" className="hospitals-cta-secondary">State Screening Reports</Link>
          </div>
          <div className="hospitals-hero-trust">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Federal PBJ staffing data
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Updated quarterly
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              50 states covered
            </span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="hospitals-section hospitals-features">
        <div className="hospitals-container">
          <h2 className="hospitals-section-title">Tools built for placement decisions</h2>
          <p className="hospitals-section-subtitle">
            Designed for clinicians who need to move fast — without compromising on patient safety.
          </p>
          <div className="hospitals-feature-grid">
            <div className="hospitals-feature-card">
              <div className="hospitals-feature-icon hospitals-icon-blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              </div>
              <h3>State Screening Reports</h3>
              <p>
                One-click screening for all facilities in any state. See stars, staffing, deficiencies,
                and penalty totals in a sortable table. Ideal for rapid multi-facility evaluation when
                your patient has geographic flexibility.
              </p>
              <Link to="/screening" className="hospitals-feature-link">
                Open State Screener →
              </Link>
            </div>

            <div className="hospitals-feature-card">
              <div className="hospitals-feature-icon hospitals-icon-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <h3>Staffing Discrepancy Index</h3>
              <p>
                Identifies facilities where self-reported staffing diverges from CMS Payroll-Based Journal
                records. High discrepancy scores indicate possible reporting irregularities — a red flag
                for discharge placement.
              </p>
              <Link to="/discrepancies" className="hospitals-feature-link">
                View Discrepancy Data →
              </Link>
            </div>

            <div className="hospitals-feature-card">
              <div className="hospitals-feature-icon hospitals-icon-teal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <h3>Chain Rankings</h3>
              <p>
                Aggregate quality scores across multi-facility chains and ownership networks. Quickly identify
                whether a facility belongs to a corporate chain with a history of quality or compliance issues
                across its portfolio.
              </p>
              <Link to="/chains" className="hospitals-feature-link">
                View Chain Rankings →
              </Link>
            </div>

            <div className="hospitals-feature-card">
              <div className="hospitals-feature-icon hospitals-icon-orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <h3>Facility Safety Reports</h3>
              <p>
                Printable one-page safety profiles for any facility. Staffing HPRD vs. state average,
                zero-RN days, inspection deficiency list, penalty history, and ownership chain.
                Shareable with patients and families.
              </p>
              <Link to="/" className="hospitals-feature-link">
                Search Facilities →
              </Link>
            </div>

            <div className="hospitals-feature-card">
              <div className="hospitals-feature-icon hospitals-icon-red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h3>High-Risk Watch List</h3>
              <p>
                A curated national list of facilities meeting all five high-risk criteria simultaneously:
                1-star rating, understaffing, zero-RN days, high fines, and excess deficiencies.
                Avoid these placements when alternatives exist.
              </p>
              <Link to="/high-risk" className="hospitals-feature-link">
                View High-Risk List →
              </Link>
            </div>

            <div className="hospitals-feature-card">
              <div className="hospitals-feature-icon hospitals-icon-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <h3>Trends &amp; Antipsychotic Data</h3>
              <p>
                Quarterly staffing trends and antipsychotic prescribing rates. Facilities with
                unexplained spikes in antipsychotic use — a known chemical restraint concern —
                are flagged for clinical review.
              </p>
              <Link to="/antipsychotic-trends" className="hospitals-feature-link">
                View Antipsychotic Trends →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT SUPPORTS WORKFLOW */}
      <section className="hospitals-section hospitals-workflow">
        <div className="hospitals-container">
          <h2 className="hospitals-section-title">How it fits your discharge workflow</h2>
          <div className="hospitals-workflow-steps">
            <div className="hospitals-workflow-step">
              <div className="hospitals-workflow-num">1</div>
              <div className="hospitals-workflow-content">
                <h3>Identify candidates</h3>
                <p>Use the state screener to pull all facilities in a geographic area. Sort by staffing HPRD or star rating to build a shortlist.</p>
              </div>
            </div>
            <div className="hospitals-workflow-step">
              <div className="hospitals-workflow-num">2</div>
              <div className="hospitals-workflow-content">
                <h3>Screen for red flags</h3>
                <p>Check the shortlisted facilities for high-risk indicators: low HPRD, zero-RN days, IJ citations, or high-discrepancy staffing reports.</p>
              </div>
            </div>
            <div className="hospitals-workflow-step">
              <div className="hospitals-workflow-num">3</div>
              <div className="hospitals-workflow-content">
                <h3>Check ownership</h3>
                <p>Look up chain affiliations and ownership networks. A facility may look acceptable in isolation but belong to a chain with systemic quality issues.</p>
              </div>
            </div>
            <div className="hospitals-workflow-step">
              <div className="hospitals-workflow-num">4</div>
              <div className="hospitals-workflow-content">
                <h3>Share with family</h3>
                <p>Download and share a safety report with the patient and family. Transparent data supports shared decision-making and informed consent.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DATA NOTE */}
      <section className="hospitals-section">
        <div className="hospitals-container">
          <div className="hospitals-data-note">
            <h3>About the Data</h3>
            <p>
              All data is sourced from CMS federal databases: the Five-Star Quality Rating System,
              Payroll-Based Journal (PBJ) staffing records, Health Deficiency inspection reports,
              and CMS Penalty data. Data is updated as CMS releases new datasets, typically quarterly.
              This tool is intended to supplement — not replace — clinical judgment and direct facility
              evaluation.
            </p>
            <Link to="/methodology" className="hospitals-feature-link">Read the full methodology →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
