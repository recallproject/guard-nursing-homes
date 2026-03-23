import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/families.css';

export default function FamiliesPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'For Families — Nursing Home Safety Data | The Oversight Report';
    window.plausible && window.plausible('Families-Page-View');
  }, []);

  return (
    <div className="families-page">
      <Helmet>
        <title>For Families — Nursing Home Safety Data | The Oversight Report</title>
        <meta name="description" content="Free nursing home safety data for families and caregivers. Search 14,000+ facilities, check staffing levels, review citations, and download safety reports before you visit." />
        <meta property="og:title" content="Find a Safe Nursing Home for Your Family" />
        <meta property="og:description" content="Search 14,000+ nursing homes. Check staffing, citations, and penalties — free safety reports for families." />
        <meta property="og:url" content="https://www.oversightreports.com/families" />
        <link rel="canonical" href="https://www.oversightreports.com/families" />
      </Helmet>

      {/* HERO */}
      <section className="families-hero">
        <div className="families-hero-content">
          <div className="families-hero-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            For Families &amp; Caregivers
          </div>
          <h1>Make an informed choice<br />for your loved one</h1>
          <p className="families-hero-subtitle">
            Free access to federal safety data on 14,713 Medicare-certified nursing homes.
            Check staffing levels, citations, fines, and inspection history before you visit.
          </p>
          <div className="families-hero-actions">
            <Link to="/" className="families-cta-primary">Search Facilities</Link>
            <a href="#how-it-works" className="families-cta-secondary">How It Works</a>
          </div>
          <div className="families-hero-trust">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              No account required
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Federal CMS data
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              14,713 facilities covered
            </span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="families-section families-how" id="how-it-works">
        <div className="families-container">
          <h2 className="families-section-title">4 steps to finding a safe facility</h2>
          <p className="families-section-subtitle">
            Use this data alongside in-person visits and conversations with staff.
          </p>
          <div className="families-steps">
            <div className="families-step">
              <div className="families-step-number">1</div>
              <div className="families-step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <h3>Search</h3>
              <p>Search by facility name, city, or zip code. Filter by state to browse all facilities in your area.</p>
            </div>
            <div className="families-step-arrow">→</div>
            <div className="families-step">
              <div className="families-step-number">2</div>
              <div className="families-step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </div>
              <h3>Compare</h3>
              <p>Review star ratings, staffing hours per resident, registered nurse coverage, and deficiency counts side by side.</p>
            </div>
            <div className="families-step-arrow">→</div>
            <div className="families-step">
              <div className="families-step-number">3</div>
              <div className="families-step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <h3>Download Report</h3>
              <p>Get a free safety report with inspection history, penalty records, ownership details, and staffing trends.</p>
            </div>
            <div className="families-step-arrow">→</div>
            <div className="families-step">
              <div className="families-step-number">4</div>
              <div className="families-step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <h3>Visit</h3>
              <p>Bring your report to the facility tour. Know what questions to ask and what red flags to look for in person.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WARNING SIGNS */}
      <section className="families-section families-warnings">
        <div className="families-container">
          <h2 className="families-section-title">Warning signs to look for</h2>
          <p className="families-section-subtitle">
            These data points are associated with higher rates of adverse events and regulatory violations.
          </p>
          <div className="families-warning-grid">
            <div className="families-warning-card families-warning-red">
              <div className="families-warning-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3>Low Staffing Hours</h3>
              <p>Below 3.5 total hours per resident per day (HPRD) means residents spend less time with care staff. Look for facilities at or above the federal minimum.</p>
              <div className="families-warning-threshold">Watch: &lt; 3.5 HPRD</div>
            </div>
            <div className="families-warning-card families-warning-orange">
              <div className="families-warning-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h3>Zero-RN Days</h3>
              <p>Days where no registered nurse was on site. Federal law requires an RN for at least 8 hours daily. Facilities with zero-RN days have violated this requirement.</p>
              <div className="families-warning-threshold">Watch: Any zero-RN days</div>
            </div>
            <div className="families-warning-card families-warning-yellow">
              <div className="families-warning-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8l5 5-5 5"/></svg>
              </div>
              <h3>High Penalty Amounts</h3>
              <p>Large fines from CMS often indicate serious care violations. A single fine over $50,000 typically corresponds to a jeopardy-level citation affecting resident safety.</p>
              <div className="families-warning-threshold">Watch: &gt; $50,000 in fines</div>
            </div>
            <div className="families-warning-card families-warning-purple">
              <div className="families-warning-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <h3>Many Deficiencies</h3>
              <p>CMS inspection citations — especially those tagged as "actual harm" or "immediate jeopardy" — indicate care quality and safety failures found during surveys.</p>
              <div className="families-warning-threshold">Watch: 15+ deficiencies or IJ tags</div>
            </div>
          </div>
        </div>
      </section>

      {/* FREE REPORT CTA */}
      <section className="families-section families-report-cta">
        <div className="families-container">
          <div className="families-report-card">
            <div className="families-report-card-content">
              <h2>Free Safety Report for Any Facility</h2>
              <p>
                Download a complete safety profile — star ratings, staffing data, inspection history,
                penalties, and ownership — for any of the 14,713 facilities in our database.
                No account required.
              </p>
              <ul className="families-report-features">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Staffing hours per resident (HPRD) vs. state and national averages
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Inspection deficiencies with severity tags
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  CMS penalty history and fine amounts
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Ownership chain and parent company
                </li>
              </ul>
              <Link to="/" className="families-cta-primary">Search Facilities Now</Link>
            </div>
            <div className="families-report-card-visual">
              <div className="families-report-preview">
                <div className="families-report-preview-label">Sample Report</div>
                <div className="families-report-preview-row">
                  <span>Overall Rating</span>
                  <span className="families-preview-stars">★★★☆☆</span>
                </div>
                <div className="families-report-preview-row">
                  <span>Total HPRD</span>
                  <span className="families-preview-value warn">3.12</span>
                </div>
                <div className="families-report-preview-row">
                  <span>Zero-RN Days</span>
                  <span className="families-preview-value bad">14 days</span>
                </div>
                <div className="families-report-preview-row">
                  <span>Total Fines</span>
                  <span className="families-preview-value bad">$184,500</span>
                </div>
                <div className="families-report-preview-row">
                  <span>Deficiencies</span>
                  <span className="families-preview-value warn">22</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DISCLAIMER */}
      <section className="families-section">
        <div className="families-container">
          <div className="families-disclaimer">
            <p>
              <strong>The Oversight Report aggregates publicly available federal data from CMS.</strong> This
              information does not constitute medical advice or a recommendation to select or avoid any specific
              facility. Always conduct in-person visits and consult with your healthcare provider when making
              placement decisions. Data is updated as CMS releases new datasets.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
