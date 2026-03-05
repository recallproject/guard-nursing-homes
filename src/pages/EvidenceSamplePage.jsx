import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import '../styles/evidence-sample.css';

export default function EvidenceSamplePage() {
  return (
    <>
      <Helmet>
        <title>Evidence Report Sample — The Oversight Report</title>
        <meta name="description" content="Download a sample Evidence Report showing what families, attorneys, and journalists receive — 17 pages of federal safety data, inspection history, penalties, staffing analysis, and ownership networks." />
        <link rel="canonical" href="https://oversightreports.com/evidence-sample" />
      </Helmet>

      <div className="ev-sample-page">

        {/* HERO */}
        <div className="ev-sample-hero">
          <div className="ev-sample-label">Evidence Report</div>
          <h1 className="ev-sample-title">See Exactly What<br />You'll Get</h1>
          <p className="ev-sample-subtitle">
            This is a real Evidence Report generated for a 1-star North Carolina nursing home with $315K in federal fines
            and 8 immediate jeopardy citations. Every report pulls live data from 16 federal databases — inspections, penalties,
            staffing, ownership, quality measures, cost reports — and formats it into a professional document you can share with your family, your attorney, or your team.
          </p>
        </div>

        {/* DOWNLOAD SECTION — styled like the actual PDF cover */}
        <div className="ev-sample-download-section">
          <div className="ev-sample-download-card">

            {/* Cover mimicking the actual PDF */}
            <div className="ev-sample-cover">
              <div className="ev-sample-cover-brand">THE OVERSIGHT REPORT</div>
              <div className="ev-sample-badge">SAMPLE</div>
              <h2 className="ev-sample-facility-name">Accordius Health at Mooresville</h2>
              <div className="ev-sample-facility-meta">740 Oakridge Farm Rd, Mooresville, NC 28115</div>
              <div className="ev-sample-facility-meta">CCN: 345179 · CMS Rating: 1/5</div>
            </div>

            {/* Key findings teaser */}
            <div className="ev-sample-findings">
              <div className="ev-sample-findings-label">Key Findings</div>
              <div className="ev-sample-findings-grid">
                <div className="ev-sample-finding">
                  <div className="ev-sample-finding-value">78.8</div>
                  <div className="ev-sample-finding-label">Risk Score<br /><span>Avg: 32.1</span></div>
                </div>
                <div className="ev-sample-finding">
                  <div className="ev-sample-finding-value">$315K</div>
                  <div className="ev-sample-finding-label">Federal Fines<br /><span>Avg: $28K</span></div>
                </div>
                <div className="ev-sample-finding">
                  <div className="ev-sample-finding-value">8</div>
                  <div className="ev-sample-finding-label">Jeopardy<br /><span>Serious harm</span></div>
                </div>
                <div className="ev-sample-finding">
                  <div className="ev-sample-finding-value">53</div>
                  <div className="ev-sample-finding-label">Deficiencies<br /><span>Avg: 8.5</span></div>
                </div>
              </div>

              {/* Red flag teasers */}
              <div className="ev-sample-flags">
                <div className="ev-sample-flag ev-sample-flag-critical">55.8% of nursing hours provided by contract staff</div>
                <div className="ev-sample-flag ev-sample-flag-critical">70% gap between self-reported and verified RN staffing</div>
                <div className="ev-sample-flag ev-sample-flag-warning">Owner controls 63 facilities — declining staffing trend</div>
                <div className="ev-sample-flag ev-sample-flag-warning">3 payment denials — Medicare refused to pay for substandard care</div>
              </div>
            </div>

            {/* CTA */}
            <div className="ev-sample-download-cta">
              <a
                href="/samples/OversightReport_Sample_Evidence_Report.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="ev-sample-download-btn"
              >
                Download Full Sample Report (PDF)
              </a>
              <div className="ev-sample-download-note">17 pages · No email required · Watermarked sample</div>
            </div>

            <div className="ev-sample-confidential">Confidential — Prepared for authorized use</div>
          </div>
        </div>

        {/* WHAT'S INSIDE */}
        <div className="ev-sample-contents">
          <h2 className="ev-sample-section-title">What's Inside Every Evidence Report</h2>
          <div className="ev-sample-grid">
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">1</div>
              <div className="ev-sample-item-content">
                <h3>Executive Summary</h3>
                <p>Risk score, CMS rating, total fines, and a plain-language assessment of where this facility stands nationally.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">2</div>
              <div className="ev-sample-item-content">
                <h3>Ownership Portfolio</h3>
                <p>Who owns this facility, how many others they operate, and how the entire chain performs — with a ranked table.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">3</div>
              <div className="ev-sample-item-content">
                <h3>Staffing Analysis</h3>
                <p>Payroll-verified hours, zero-RN days, weekend gaps, contract reliance, turnover rates, and verification discrepancies.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">4</div>
              <div className="ev-sample-item-content">
                <h3>Inspection History</h3>
                <p>Every deficiency citation with dates, F-tags, severity levels, and scope — plus complaint investigation results.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">5</div>
              <div className="ev-sample-item-content">
                <h3>Financial Penalties</h3>
                <p>Complete timeline of civil monetary penalties and payment denials, with amounts, dates, and legal citations.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">6</div>
              <div className="ev-sample-item-content">
                <h3>Clinical Quality Measures</h3>
                <p>QRP outcomes, VBP performance ranking, claims-based readmission rates, and MDS quality indicators.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">7</div>
              <div className="ev-sample-item-content">
                <h3>Red Flags</h3>
                <p>Accountability indicators highlighting staffing crises, repeat violations, financial extraction, and fire safety.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">8</div>
              <div className="ev-sample-item-content">
                <h3>Comparison Context</h3>
                <p>Side-by-side comparison against national averages on every key metric, color-coded for quick assessment.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">9</div>
              <div className="ev-sample-item-content">
                <h3>Nearby Alternatives</h3>
                <p>Lower-risk facilities within driving distance, ranked by safety data — with stars, risk scores, and staffing.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">10</div>
              <div className="ev-sample-item-content">
                <h3>Verification Links</h3>
                <p>Direct links to Medicare Care Compare, ProPublica, and CMS HCRIS so every data point can be independently verified.</p>
              </div>
            </div>
          </div>
        </div>

        {/* WHO IT'S FOR */}
        <div className="ev-sample-audience">
          <h2 className="ev-sample-section-title">Who Uses Evidence Reports</h2>
          <div className="ev-sample-audience-grid">
            <div className="ev-sample-audience-card">
              <div className="ev-sample-audience-icon" style={{fontFamily: 'serif'}}>F</div>
              <h3>Families</h3>
              <p>Evaluating a nursing home for a parent or loved one. Get the full picture before you visit — or share it with siblings who need to see the data.</p>
            </div>
            <div className="ev-sample-audience-card">
              <div className="ev-sample-audience-icon" style={{fontFamily: 'serif'}}>A</div>
              <h3>Attorneys</h3>
              <p>Building a case or conducting discovery. Every data point is sourced and verifiable against original CMS records.</p>
            </div>
            <div className="ev-sample-audience-card">
              <div className="ev-sample-audience-icon" style={{fontFamily: 'serif'}}>J</div>
              <h3>Journalists</h3>
              <p>Investigating patterns of neglect or ownership networks. Evidence Reports connect the dots across federal databases.</p>
            </div>
            <div className="ev-sample-audience-card">
              <div className="ev-sample-audience-icon" style={{fontFamily: 'serif'}}>CM</div>
              <h3>Case Managers</h3>
              <p>Making placement decisions under pressure. Compare facilities quickly with standardized metrics and risk scores.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="ev-sample-cta">
          <h2>Ready to Pull a Report?</h2>
          <p>Search any of 14,713 Medicare-certified nursing facilities and generate an Evidence Report instantly.</p>
          <div className="ev-sample-cta-buttons">
            <Link to="/" className="ev-sample-cta-btn-primary">Search Facilities</Link>
            <Link to="/pricing" className="ev-sample-cta-btn-secondary">View Pricing</Link>
          </div>
        </div>

      </div>
    </>
  );
}
