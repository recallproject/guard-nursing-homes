import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/legal.css';

export function TermsPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="legal-page">
      <Helmet>
        <title>Terms of Use | The Oversight Report</title>
        <meta name="description" content="Terms of use for The Oversight Report nursing home safety data platform." />
        <link rel="canonical" href="https://oversightreports.com/terms" />
      </Helmet>
      <div className="legal-container">
        <h1>Terms of Use</h1>
        <p className="legal-updated">Last updated: February 24, 2026</p>

        <h2>1. About This Site</h2>
        <p>
          The Oversight Report is operated by <strong>DataLink Clinical LLC</strong>. We compile, analyze,
          and present publicly available data from the Centers for Medicare &amp; Medicaid Services (CMS)
          to help families, professionals, and policymakers evaluate nursing home quality and safety.
        </p>

        <h2>2. Data Sources</h2>
        <p>
          All data on this site is sourced from publicly available CMS datasets, including:
        </p>
        <ul>
          <li>Payroll-Based Journal (PBJ) Daily Nurse Staffing</li>
          <li>Health Deficiencies (survey results)</li>
          <li>Civil Money Penalties</li>
          <li>Provider Information</li>
          <li>CMS Care Compare (star ratings)</li>
        </ul>
        <p>
          We do not collect, create, or fabricate data. All information presented on this site
          originates from CMS or other government sources and is available for independent verification.
        </p>

        <h2>3. Risk Scores and Indicators</h2>
        <p>
          Risk scores, composite indicators, and accountability flags displayed on this site are
          <strong> computational analyses of public data</strong>. They are not professional opinions,
          legal determinations, clinical assessments, or accusations of wrongdoing. They represent
          patterns identified in federal data and should be interpreted accordingly.
        </p>

        <h2>4. Not Professional Advice</h2>
        <p>
          This site does not provide medical, legal, or financial advice. Nothing on this site
          constitutes a recommendation to select, avoid, or take action regarding any specific
          nursing home. Users should verify all information independently and consult appropriate
          professionals before making decisions about care placement or legal matters.
        </p>

        <h2>5. Data Accuracy</h2>
        <p>
          We make reasonable efforts to ensure accuracy, but we do not guarantee that data is
          error-free or complete. CMS data is updated quarterly and may not reflect current
          conditions at any given facility. Staffing data is self-reported by facilities to CMS
          and has not been independently audited by The Oversight Report.
        </p>

        <h2>6. No Affiliation</h2>
        <p>
          The Oversight Report is not affiliated with, endorsed by, or partnered with CMS,
          the Centers for Medicare &amp; Medicaid Services, Medicare, ProPublica, or any government
          agency. References to these entities are for source attribution only.
        </p>

        <h2>7. User Responsibility</h2>
        <p>
          Users are responsible for their own decisions based on information presented on this
          site. The Oversight Report is not responsible for actions taken, or not taken, in
          reliance on information provided here. If you have concerns about a facility, contact
          your state survey agency or the HHS Office of Inspector General
          at <a href="https://tips.hhs.gov" target="_blank" rel="noopener noreferrer">tips.hhs.gov</a>.
        </p>

        <h2>8. PDF Reports</h2>
        <p>
          PDF reports are generated client-side in your browser. Report data is not transmitted
          to or stored on our servers.
        </p>

        <h2>9. Intellectual Property</h2>
        <p>
          The Oversight Report's analysis methodology, risk scoring algorithms, interface design,
          and original content are the property of DataLink Clinical LLC. Underlying CMS data
          is public domain.
        </p>

        <h2>10. Changes to These Terms</h2>
        <p>
          We may update these terms from time to time. Continued use of the site after changes
          constitutes acceptance of the revised terms.
        </p>

        <div className="legal-contact">
          <p><strong>Contact</strong></p>
          <p>
            DataLink Clinical LLC<br />
            <a href="mailto:contact@oversightreports.com">contact@oversightreports.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
