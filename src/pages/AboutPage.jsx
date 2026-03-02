import { Helmet } from 'react-helmet-async';
import '../styles/about.css';

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About — The Oversight Report</title>
        <meta name="description" content="Built by Robert Benard, NP — a nurse practitioner with 20+ years at the bedside. The Oversight Report makes federal nursing home safety data readable." />
        <link rel="canonical" href="https://oversightreports.com/about" />
      </Helmet>

      <div className="about-page">

        {/* HERO */}
        <div className="about-hero">
          <div className="about-label">About the Builder</div>
          <h1 className="about-title">The Data Exists. Finding It<br />Shouldn't Be This Hard.</h1>
          <p className="about-subtitle">
            Inspections, penalties, staffing records, ownership networks — the federal government collects all of it.
            But it's spread across multiple databases, buried in spreadsheets, and formatted for regulators.
            So a nurse practitioner with 20 years at the bedside built something that makes it readable.
            This platform brings it together.
          </p>
        </div>

        {/* PROFILE */}
        <div className="about-profile">
          <div className="about-photo">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="24" r="12" fill="#D7E0EA"/>
              <path d="M8 58c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="#D7E0EA"/>
            </svg>
          </div>
          <div className="about-profile-info">
            <div className="about-profile-name">Robert Benard, NP</div>
            <div className="about-profile-title">Nurse Practitioner · AGACNP-BC, PMHNP-BC</div>
            <div className="about-credentials">
              <div className="about-credential">
                <div className="about-credential-marker"></div>
                <span>Addiction Medicine Consult Service — Highland Hospital, Oakland</span>
              </div>
              <div className="about-credential">
                <div className="about-credential-marker"></div>
                <span>Critical Care & Neurocritical Care — Sutter Health, San Francisco</span>
              </div>
              <div className="about-credential">
                <div className="about-credential-marker"></div>
                <span>20+ years of bedside clinical experience</span>
              </div>
              <div className="about-credential">
                <div className="about-credential-marker"></div>
                <span>Founder, DataLink Clinical LLC</span>
              </div>
            </div>
          </div>
        </div>

        {/* WHY THIS EXISTS */}
        <div className="about-section">
          <h2>Why This Exists</h2>
          <p>I've spent 20+ years in acute care — ICU beds, trauma bays, psych emergencies, and now addiction medicine. The one thing that connects all of it is what happens at discharge. A patient stabilizes, and then somebody has to figure out where they go next.</p>
          <p>For nursing homes, home health, dialysis, hospice — the question is always the same. A family member at the bedside, exhausted, scared, asks: <em>"Is this place any good?"</em></p>
          <p>I never had a good answer. The data existed — scattered across half a dozen government websites, buried in spreadsheets nobody reads, formatted for regulators instead of families. So I built the tool I wished I'd had for the last 20 years.</p>
        </div>

        {/* PULLQUOTE */}
        <div className="about-pullquote">
          <p>"Families shouldn't need a research team to figure out if a nursing home is safe. The data is public. It should act like it."</p>
          <div className="about-pullquote-attr">— Robert Benard, NP</div>
        </div>

        {/* WHAT IT DOES */}
        <div className="about-section">
          <h2>What The Oversight Report Does</h2>
          <p>The platform integrates multiple federal datasets from the Centers for Medicare & Medicaid Services to provide a complete safety picture of every Medicare-certified nursing facility in the country — 14,713 and counting. That includes staffing verified against actual payroll records, inspection deficiency histories, federal penalties, ownership network mapping, and financial transparency data that no other consumer tool surfaces.</p>
          <p>Every data point is sourced from public federal records. No industry funding. No facility sponsorship. No advertising. The data says what it says.</p>
        </div>

        {/* FEATURED & CITED */}
        <div className="about-featured">
          <div className="about-featured-label">Featured & Cited</div>
          <div className="about-featured-item">
            <div className="about-featured-icon">HDSR</div>
            <div className="about-featured-text">
              <strong>Harvard Data Science Review</strong> — Quoted in <a href="https://hdsr.mitpress.mit.edu/pub/m4mz70zp/release/5" target="_blank" rel="noopener noreferrer">"Navigating the AI Safari"</a> (Issue 8.1, Winter 2026)
              <br /><span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Endorsement cited by Editor-in-Chief Prof. Xiao-Li Meng · MIT Press</span>
            </div>
          </div>
          <div className="about-featured-item">
            <div className="about-featured-icon">EDU</div>
            <div className="about-featured-text">
              <strong>Harvard Data Science Initiative</strong> — Agentic AI: Contextualized and Applied
              <br /><span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>2.5-week intensive · AGENT Framework for healthcare workflow redesign · Certificate of Attendance</span>
            </div>
          </div>
        </div>

        {/* RESEARCH */}
        <div className="about-research">
          <h2>Research & Presentations</h2>
          <p className="about-section-note">Contributing author — data collection and clinical patient care.</p>
          <div className="about-citation">
            <div className="about-citation-badge">AMERSA 2024</div>
            <div className="about-citation-text">
              Heeney M, Anderson E, Lind K, Sirey L, Ullal M, Liang A, <span className="author-highlight">Benard R</span>, Herring A. "High-Dose Fentanyl and Buprenorphine Continuation as Support for the Treatment of Buprenorphine Precipitated Withdrawal."
            </div>
            <div className="about-citation-venue">
              Alameda Health System, Division of Addiction Medicine. Presented at AMERSA National Conference, 2024.
            </div>
          </div>
          <div className="about-citation">
            <div className="about-citation-badge">AMERSA 2024</div>
            <div className="about-citation-text">
              Heeney M, Anderson E, Sirey L, Ullal M, Liang A, <span className="author-highlight">Benard R</span>, Lind K, Herring A. "Evaluation of Outcomes of Extended-Release Buprenorphine Administered During Emergency Department and Inpatient Visits."
            </div>
            <div className="about-citation-venue">
              Alameda Health System, Division of Addiction Medicine. Presented at AMERSA National Conference, 2024.
            </div>
          </div>
        </div>

        {/* EDUCATION & TRAINING */}
        <div className="about-section">
          <h2>Education & Training</h2>
          <div className="about-training-grid">
            <div className="about-training-card">
              <div className="about-training-institution">Highland Hospital, Oakland</div>
              <div className="about-training-detail">Addiction Medicine Consult Service<br />Nurse Practitioner</div>
            </div>
            <div className="about-training-card">
              <div className="about-training-institution">Sutter Health, San Francisco</div>
              <div className="about-training-detail">Critical Care & Neurocritical Care<br />Nurse Practitioner</div>
            </div>
            <div className="about-training-card">
              <div className="about-training-institution">Harvard Data Science Initiative</div>
              <div className="about-training-detail">Agentic AI: Contextualized and Applied<br />AGENT Framework · Certificate of Attendance</div>
            </div>
            <div className="about-training-card">
              <div className="about-training-institution">Clinical Experience</div>
              <div className="about-training-detail">20+ years across acute care, critical care, psychiatry, and addiction medicine</div>
            </div>
          </div>
        </div>

        {/* DATA PRINCIPLES */}
        <div className="about-section">
          <h2>Data Principles</h2>
          <p>Every decision about this platform starts from one question: does this help the person at the bedside make a safer choice?</p>
          <div className="about-principles">
            <div className="about-principle">
              <div className="about-principle-number">01</div>
              <div className="about-principle-title">Public Data, Properly Shown</div>
              <div className="about-principle-desc">Every number on this site comes from publicly available CMS datasets. We don't create scores — we surface what the government already collected and make it readable.</div>
            </div>
            <div className="about-principle">
              <div className="about-principle-number">02</div>
              <div className="about-principle-title">No Industry Funding</div>
              <div className="about-principle-desc">No facility pays to be listed. No chain sponsors content. No advertising. The data has no financial relationship with the facilities it describes.</div>
            </div>
            <div className="about-principle">
              <div className="about-principle-number">03</div>
              <div className="about-principle-title">Cross-Referenced, Not Summarized</div>
              <div className="about-principle-desc">Star ratings hide more than they reveal. We cross-reference staffing against payroll, ownership against quality patterns, and financial flows against outcomes.</div>
            </div>
            <div className="about-principle">
              <div className="about-principle-number">04</div>
              <div className="about-principle-title">Clinician-Led</div>
              <div className="about-principle-desc">This platform is designed by someone who's made discharge referrals, not by someone who's studied them from a desk. The questions it answers are the ones clinicians actually ask.</div>
            </div>
          </div>
        </div>

        {/* WHAT THIS ISN'T */}
        <div className="about-callout">
          <h2>What This Isn't</h2>
          <p>The Oversight Report is not a rating system. It doesn't assign letter grades or tell families what to do. It gives them the same data that regulators, attorneys, and journalists use — in a format that a family member at 2 a.m. can actually understand. What they do with it is their decision. But it should be an informed one.</p>
        </div>

        {/* CONTACT */}
        <div className="about-contact">
          <h2>Get in Touch</h2>
          <p>Media inquiries, institutional partnerships, professional subscriptions, or questions about the data — I read everything.</p>
          <a href="mailto:contact@oversightreports.com" className="about-contact-btn">
            ✉ &ensp;contact@oversightreports.com
          </a>
        </div>

      </div>
    </>
  );
}
