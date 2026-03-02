import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import '../styles/evidence-sample.css';

export default function EvidenceSamplePage() {
  return (
    <>
      <Helmet>
        <title>Evidence Report Sample — The Oversight Report</title>
        <meta name="description" content="Download a sample Evidence Report showing what families, attorneys, and journalists receive — 8+ pages of federal safety data, inspection history, penalties, staffing analysis, and ownership networks." />
        <link rel="canonical" href="https://oversightreports.com/evidence-sample" />
      </Helmet>

      <div className="ev-sample-page">

        {/* HERO */}
        <div className="ev-sample-hero">
          <div className="ev-sample-label">Evidence Report</div>
          <h1 className="ev-sample-title">See Exactly What<br />You'll Get</h1>
          <p className="ev-sample-subtitle">
            This is a real Evidence Report generated for a 1-star Chicago nursing home with $800K in federal fines.
            Every report pulls live data from 6 CMS databases — inspections, penalties, staffing, ownership — and
            formats it into a professional document you can share with your family, your attorney, or your team.
          </p>
        </div>

        {/* DOWNLOAD SECTION */}
        <div className="ev-sample-download-section">
          <div className="ev-sample-download-card">
            <div className="ev-sample-download-header">
              <div className="ev-sample-badge">SAMPLE</div>
              <h2 className="ev-sample-facility-name">Archer Heights Healthcare</h2>
              <div className="ev-sample-facility-meta">Chicago, IL · CCN: 145995 · CMS Rating: 1/5</div>
            </div>
            <div className="ev-sample-metrics">
              <div className="ev-sample-metric">
                <div className="ev-sample-metric-value ev-sample-red">70.7</div>
                <div className="ev-sample-metric-label">Risk Score</div>
              </div>
              <div className="ev-sample-metric">
                <div className="ev-sample-metric-value ev-sample-red">1/5</div>
                <div className="ev-sample-metric-label">CMS Stars</div>
              </div>
              <div className="ev-sample-metric">
                <div className="ev-sample-metric-value ev-sample-red">$800K</div>
                <div className="ev-sample-metric-label">Total Fines</div>
              </div>
              <div className="ev-sample-metric">
                <div className="ev-sample-metric-value ev-sample-red">3</div>
                <div className="ev-sample-metric-label">IJ Citations</div>
              </div>
            </div>
            <a
              href="/samples/evidence-report-sample.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="ev-sample-download-btn"
            >
              ↓ Download Sample Report (PDF)
            </a>
            <div className="ev-sample-download-note">8 pages · No email required · Watermarked sample</div>
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
                <p>Who owns this facility, how many others they operate, and how the entire chain performs — with a ranked table of siblings.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">3</div>
              <div className="ev-sample-item-content">
                <h3>Staffing Analysis</h3>
                <p>Payroll-verified hours per resident per day, zero-RN days, turnover rates, and self-reported vs. verified discrepancies.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">4</div>
              <div className="ev-sample-item-content">
                <h3>Inspection History</h3>
                <p>Every serious deficiency citation — Immediate Jeopardy, actual harm — with dates, tag codes, and plain-language descriptions.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">5</div>
              <div className="ev-sample-item-content">
                <h3>Financial Penalties</h3>
                <p>Complete timeline of every civil monetary penalty and payment denial, with amounts, dates, and legal citations.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">6</div>
              <div className="ev-sample-item-content">
                <h3>Red Flags</h3>
                <p>Accountability indicators that highlight the most concerning patterns — staffing crises, repeat violations, financial extraction.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">7</div>
              <div className="ev-sample-item-content">
                <h3>Comparison Context</h3>
                <p>Side-by-side comparison against state and national averages on every key metric, with percentile rankings.</p>
              </div>
            </div>
            <div className="ev-sample-item">
              <div className="ev-sample-item-number">8</div>
              <div className="ev-sample-item-content">
                <h3>Nearby Alternatives</h3>
                <p>Lower-risk facilities within driving distance, ranked by safety data — with stars, risk scores, staffing, and fines.</p>
              </div>
            </div>
          </div>
        </div>

        {/* WHO IT'S FOR */}
        <div className="ev-sample-audience">
          <h2 className="ev-sample-section-title">Who Uses Evidence Reports</h2>
          <div className="ev-sample-audience-grid">
            <div className="ev-sample-audience-card">
              <div className="ev-sample-audience-icon">👨‍👩‍👧</div>
              <h3>Families</h3>
              <p>Evaluating a nursing home for a parent or loved one. Get the full picture before you visit — or share it with siblings who need to see the data.</p>
            </div>
            <div className="ev-sample-audience-card">
              <div className="ev-sample-audience-icon">⚖️</div>
              <h3>Attorneys</h3>
              <p>Building a case or conducting discovery. Every data point is sourced and verifiable against original CMS records.</p>
            </div>
            <div className="ev-sample-audience-card">
              <div className="ev-sample-audience-icon">📰</div>
              <h3>Journalists</h3>
              <p>Investigating patterns of neglect or ownership networks. Evidence Reports connect the dots across federal databases.</p>
            </div>
            <div className="ev-sample-audience-card">
              <div className="ev-sample-audience-icon">🏥</div>
              <h3>Case Managers</h3>
              <p>Making placement decisions under pressure. Compare facilities quickly with standardized metrics and risk scores.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="ev-sample-cta">
          <h2>Ready to Pull a Report?</h2>
          <p>Search any of 14,713 Medicare nursing facilities and generate an Evidence Report instantly.</p>
          <div className="ev-sample-cta-buttons">
            <Link to="/" className="ev-sample-cta-btn-primary">Search Facilities</Link>
            <Link to="/pricing" className="ev-sample-cta-btn-secondary">View Pricing</Link>
          </div>
        </div>

      </div>
    </>
  );
}
