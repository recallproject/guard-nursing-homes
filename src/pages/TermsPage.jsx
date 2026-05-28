import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/legal.css';

/* ── SVG Icons ─────────────────────────── */
const IconInfo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);
const IconServer = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
);
const IconActivity = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
);
const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IconDoc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
);
const IconScale = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.828L3 3"/><path d="m15 9 6-6"/></svg>
);
const IconLink = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
);
const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);
const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
);
const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
);

export function TermsPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="legal-page">
      <Helmet>
        <title>Terms of Use | The Oversight Report</title>
        <meta name="description" content="Terms of use for The Oversight Report nursing home safety data platform." />
        <link rel="canonical" href="https://www.oversightreports.com/terms" />
      </Helmet>

      {/* Hero */}
      <div className="legal-hero">
        <div className="legal-hero-badge">
          <IconShield /> Legal
        </div>
        <h1>Terms of Use</h1>
        <p className="legal-hero-sub">
          How The Oversight Report works, what it does and doesn't do, and your responsibilities as a user.
        </p>
        <p className="legal-updated">Last updated: March 25, 2026</p>
      </div>

      {/* Sections */}
      <div className="legal-container">

        <div className="legal-section" data-accent="blue">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconInfo /></div>
            <h2>1. About This Site</h2>
          </div>
          <p>
            The Oversight Report is operated by <strong>DataLink Clinical LLC</strong>, a sole-member LLC
            founded by Robert Benard, a dual board-certified nurse practitioner (acute care and psychiatry).
            We compile, analyze, and present publicly available data from the Centers for Medicare &amp;
            Medicaid Services (CMS) and state regulatory agencies to help families, attorneys, journalists,
            and policymakers evaluate nursing home quality and safety.
          </p>
        </div>

        <div className="legal-section" data-accent="teal">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconServer /></div>
            <h2>2. Data Sources</h2>
          </div>
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
        </div>

        <div className="legal-section" data-accent="orange">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconActivity /></div>
            <h2>3. Risk Scores and Indicators</h2>
          </div>
          <p>
            Risk scores, composite indicators, and accountability flags displayed on this site are
            <strong> computational analyses of public data</strong>. They are not professional opinions,
            legal determinations, clinical assessments, or accusations of wrongdoing. They represent
            patterns identified in federal data and should be interpreted accordingly.
          </p>
        </div>

        <div className="legal-section" data-accent="red">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconAlert /></div>
            <h2>4. Not Professional Advice</h2>
          </div>
          <p>
            This site does not provide medical, legal, or financial advice. Nothing on this site
            constitutes a recommendation to select, avoid, or take action regarding any specific
            nursing home. Users should verify all information independently and consult appropriate
            professionals before making decisions about care placement or legal matters.
          </p>
        </div>

        <div className="legal-section" data-accent="orange">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconCheck /></div>
            <h2>5. Data Accuracy</h2>
          </div>
          <p>
            We make reasonable efforts to ensure accuracy, but we do not guarantee that data is
            error-free or complete. CMS data is updated quarterly and may not reflect current
            conditions at any given facility. Staffing data is self-reported by facilities to CMS
            and has not been independently audited by The Oversight Report.
          </p>
        </div>

        <div className="legal-section" data-accent="purple">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconLink /></div>
            <h2>6. No Affiliation</h2>
          </div>
          <p>
            The Oversight Report is not affiliated with, endorsed by, or partnered with CMS,
            the Centers for Medicare &amp; Medicaid Services, Medicare, ProPublica, or any government
            agency. References to these entities are for source attribution only.
          </p>
        </div>

        <div className="legal-section" data-accent="blue">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconUsers /></div>
            <h2>7. User Responsibility</h2>
          </div>
          <p>
            Users are responsible for their own decisions based on information presented on this
            site. The Oversight Report is not responsible for actions taken, or not taken, in
            reliance on information provided here. If you have concerns about a facility, contact
            your state survey agency or the HHS Office of Inspector General
            at <a href="https://tips.hhs.gov" target="_blank" rel="noopener noreferrer nofollow">tips.hhs.gov</a>.
          </p>
        </div>

        <div className="legal-section" data-accent="teal">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconDoc /></div>
            <h2>8. PDF Reports</h2>
          </div>
          <p>
            Consumer PDF reports are generated client-side in your browser. Report data is not transmitted
            to or stored on our servers.
          </p>
        </div>

        <div className="legal-section" data-accent="red">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconScale /></div>
            <h2>9. Attorney Evidence Reports</h2>
          </div>
          <p>
            Attorney Evidence Reports are clinician-reviewed reports prepared from the same public
            CMS and state data as consumer reports, organized for case screening and early factual
            development. These reports are <strong>not legal advice, not expert opinions, and not a
            substitute for independent investigation</strong>. They are intended to organize publicly
            available evidence and do not render legal conclusions. Attorneys are responsible for
            independently verifying all data before relying on it in any legal matter.
          </p>
        </div>

        <div className="legal-section" data-accent="green">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconRefresh /></div>
            <h2>10. Corrections and Contestability</h2>
          </div>
          <p>
            If you believe any data displayed on this site is inaccurate, incomplete, or misleading,
            please contact us at{' '}
            <a href="mailto:contact@oversightreports.com">contact@oversightreports.com</a>.
            We will review the concern, verify against source data, and correct any confirmed
            errors promptly. If a correction affects a previously delivered report, we will
            notify the recipient and issue an updated version.
          </p>
        </div>

        <div className="legal-section" data-accent="purple">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconLock /></div>
            <h2>11. Intellectual Property</h2>
          </div>
          <p>
            The Oversight Report's analysis methodology, risk scoring algorithms, interface design,
            and original content are the property of DataLink Clinical LLC. Underlying CMS data
            is public domain.
          </p>
        </div>

        <div className="legal-section" data-accent="blue">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconRefresh /></div>
            <h2>12. Changes to These Terms</h2>
          </div>
          <p>
            We may update these terms from time to time. Continued use of the site after changes
            constitutes acceptance of the revised terms.
          </p>
        </div>

        {/* Contact */}
        <div className="legal-contact">
          <p className="legal-contact-label">Contact</p>
          <p className="legal-contact-name">DataLink Clinical LLC</p>
          <a href="mailto:contact@oversightreports.com">contact@oversightreports.com</a>
        </div>

      </div>
    </div>
  );
}
