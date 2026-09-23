import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../data/contact';
import '../styles/about.css';

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About / Why trust us — The Oversight Report</title>
        <meta
          name="description"
          content="Who built The Oversight Report, where the CMS data comes from, how the work is funded, and how to contact us."
        />
        <meta property="og:title" content="About / Why trust us — The Oversight Report" />
        <meta
          property="og:description"
          content="Who built The Oversight Report, where the CMS data comes from, how the work is funded, and how to contact us."
        />
        <link rel="canonical" href="https://www.oversightreports.com/about" />
      </Helmet>

      <div className="about-page">

        <div className="about-hero">
          <div className="about-label">About / Why trust us</div>
          <h1 className="about-title">Public records, explained by a clinician</h1>
          <p className="about-subtitle">
            The Oversight Report makes federal nursing home safety data readable for families.
            It is independent of any facility or chain. It is not a rating service.
          </p>
        </div>

        <div className="about-profile">
          <div className="about-photo" aria-hidden="true">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="24" r="12" fill="#D7E0EA"/>
              <path d="M8 58c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="#D7E0EA"/>
            </svg>
          </div>
          <div className="about-profile-info">
            <div className="about-profile-kicker">Who built this</div>
            <div className="about-profile-name">Robert Benard, NP</div>
            <div className="about-profile-title">Nurse Practitioner · AGACNP-BC, PMHNP-BC</div>
            <div className="about-credentials">
              <div className="about-credential">
                <div className="about-credential-marker"></div>
                <span>Founder, DataLink Clinical LLC</span>
              </div>
              <div className="about-credential">
                <div className="about-credential-marker"></div>
                <span>20+ years of bedside clinical experience — acute, critical, and psychiatric care</span>
              </div>
            </div>
          </div>
        </div>

        <div className="about-section">
          <h2>Why this exists</h2>
          <p>
            Discharge conversations often end with the same question: <em>“Is this place any good?”</em>
            The inspection, staffing, penalty, and ownership records already exist in federal files.
            They are built for regulators, not for a family member trying to read them at 2 a.m.
          </p>
          <p>
            This site puts those public files in one place and explains them in plain language.
            The data says what it says. Families decide what to do with it.
          </p>
        </div>

        <div className="about-pullquote">
          <p>“Families shouldn’t need a research team to figure out if a nursing home is safe. The data is public. It should act like it.”</p>
          <div className="about-pullquote-attr">— Robert Benard, NP</div>
        </div>

        <div className="about-trust-grid">
          <div className="about-trust-card">
            <h2>Why trust the analysis</h2>
            <p>
              A licensed nurse practitioner frames the questions and the language.
              Source numbers come from CMS files — not from interviews, marketing, or paid listings.
              How scores and comparisons are built is documented on the{' '}
              <Link to="/methodology">Methodology</Link> page.
            </p>
          </div>
          <div className="about-trust-card">
            <h2>Where the data comes from</h2>
            <p>
              Public Centers for Medicare &amp; Medicaid Services datasets: inspections,
              penalties, payroll-based staffing (PBJ), ownership, and quality measures.
              We assemble and explain. We do not change the source numbers.
            </p>
          </div>
          <div className="about-trust-card">
            <h2>Independence and funding</h2>
            <p>
              No facility pays to be listed. No chain sponsors content.
              Facility pages and the 1-page Family Report are free.
              The optional $29 Facility Brief is how the research is funded.
              After Care may include affiliate links to home equipment.
              OversightReports may earn a commission from qualifying purchases. Commercial relationships never affect facility scores, rankings, or safety data.
            </p>
          </div>
          <div className="about-trust-card">
            <h2>What this is not</h2>
            <p>
              Not a letter-grade rating system, not medical advice, and not affiliated with CMS or HHS.
              It does not create a provider-patient relationship.
              CMS files can lag real-time conditions — visit in person and verify on Medicare Care Compare.
            </p>
          </div>
        </div>

        <div className="about-section about-section--compact">
          <h2>Credentials and citations</h2>
          <p className="about-section-lead">
            Board-certified as an Adult-Gerontology Acute Care NP (AGACNP-BC) and a Psychiatric-Mental Health NP (PMHNP-BC).
          </p>
          <ul className="about-cite-list">
            <li>
              Quoted in <a href="https://hdsr.mitpress.mit.edu/pub/m4mz70zp/release/5" target="_blank" rel="noopener noreferrer">Harvard Data Science Review, “Navigating the AI Safari”</a> (Issue 8.1, Winter 2026).
            </li>
            <li>
              Harvard Data Science Initiative — Agentic AI: Contextualized and Applied (Certificate of Attendance).
            </li>
            <li>
              Contributing author (data collection and clinical patient care), AMERSA National Conference 2024:
              high-dose fentanyl and buprenorphine continuation; extended-release buprenorphine in ED and inpatient settings.
            </li>
          </ul>
        </div>

        <div className="about-contact">
          <h2>How to contact us</h2>
          <p>
            Questions about a facility page, a report, or the data — email{' '}
            <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>.
          </p>
          <a href={CONTACT_MAILTO} className="about-contact-btn">
            Email {CONTACT_EMAIL}
          </a>
        </div>

      </div>
    </>
  );
}
