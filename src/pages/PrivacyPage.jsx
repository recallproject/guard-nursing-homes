import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/legal.css';

/* ── SVG Icons ─────────────────────────── */
const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const IconInfo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);
const IconDatabase = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
);
const IconSlash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
);
const IconDollar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
);
const IconDoc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
);
const IconScale = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.828L3 3"/><path d="m15 9 6-6"/></svg>
);
const IconServer = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
);
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
);
const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
);

export function PrivacyPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="legal-page">
      <Helmet>
        <title>Privacy Policy | The Oversight Report</title>
        <meta name="description" content="Privacy policy for The Oversight Report. We use privacy-friendly analytics and never sell your data." />
        <link rel="canonical" href="https://www.oversightreports.com/privacy" />
      </Helmet>

      {/* Hero */}
      <div className="legal-hero">
        <div className="legal-hero-badge">
          <IconShield /> Privacy
        </div>
        <h1>Privacy Policy</h1>
        <p className="legal-hero-sub">
          We collect minimal data, never sell it, and have no financial ties to the nursing home industry.
        </p>
        <p className="legal-updated">Last updated: March 25, 2026</p>
      </div>

      {/* Sections */}
      <div className="legal-container">

        <div className="legal-section" data-accent="blue">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconInfo /></div>
            <h2>Who We Are</h2>
          </div>
          <p>
            The Oversight Report is operated by <strong>DataLink Clinical LLC</strong>, a
            sole-member LLC founded by Robert Benard, NP. This privacy policy explains how
            we handle information when you use our site.
          </p>
        </div>

        <div className="legal-section" data-accent="teal">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconDatabase /></div>
            <h2>Data We Collect</h2>
          </div>
          <p>
            Currently, we collect minimal personal data:
          </p>
          <ul>
            <li>
              <strong>AG Toolkit email capture:</strong> If you use the Attorney General Screening
              Toolkit export feature, we collect your name, organization, email, and optional title.
              This data is stored locally in your browser (localStorage) and is not transmitted to
              our servers.
            </li>
            <li>
              <strong>Watchlist data:</strong> Facilities you save to your watchlist are stored
              locally in your browser (localStorage) and are not transmitted to our servers.
            </li>
          </ul>
          <p>
            We do not currently use analytics, tracking cookies, or third-party advertising on this site.
            If we add these in the future, this policy will be updated.
          </p>
        </div>

        <div className="legal-section" data-accent="green">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconSlash /></div>
            <h2>Data We Do Not Sell</h2>
          </div>
          <p>
            We do not sell, rent, or share personal data with third parties.
          </p>
        </div>

        <div className="legal-section" data-accent="green">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconShield /></div>
            <h2>No Advertising or Sponsored Content</h2>
          </div>
          <p>
            We do not accept advertising, sponsored placements, or payments from nursing home
            operators, insurers, healthcare companies, or any entity that could create a
            conflict of interest with our mission.
          </p>
        </div>

        <div className="legal-section" data-accent="purple">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconDollar /></div>
            <h2>No Industry Financial Relationships</h2>
          </div>
          <p>
            DataLink Clinical LLC has no financial relationships with nursing home operators,
            long-term care chains, insurance companies, private equity firms, or healthcare
            industry trade associations.
          </p>
        </div>

        <div className="legal-section" data-accent="teal">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconDoc /></div>
            <h2>PDF Reports</h2>
          </div>
          <p>
            Consumer PDF reports and CSV exports are generated entirely in your browser (client-side).
            The data is not transmitted to or stored on our servers.
          </p>
        </div>

        <div className="legal-section" data-accent="blue">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconScale /></div>
            <h2>Attorney Evidence Reports</h2>
          </div>
          <p>
            If you request an Attorney Evidence Report, we may collect your name, firm name,
            email, and facility of interest through our intake process. This information is used
            solely to prepare and deliver your report. We do not share attorney intake information
            with third parties, nursing home operators, or any other entity.
          </p>
        </div>

        <div className="legal-section" data-accent="orange">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconServer /></div>
            <h2>Third-Party Services</h2>
          </div>
          <p>
            This site is hosted on Vercel. Please refer
            to <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer nofollow">Vercel's privacy policy</a> for
            information about their data practices. We load fonts from Google Fonts, which
            is subject to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer nofollow">Google's privacy policy</a>.
          </p>
        </div>

        <div className="legal-section" data-accent="red">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconUsers /></div>
            <h2>Children's Privacy</h2>
          </div>
          <p>
            This site is not directed at children under 13. We do not knowingly collect
            personal information from children.
          </p>
        </div>

        <div className="legal-section" data-accent="blue">
          <div className="legal-section-header">
            <div className="legal-section-icon"><IconRefresh /></div>
            <h2>Changes to This Policy</h2>
          </div>
          <p>
            We may update this policy as we add features. Check the "last updated" date
            at the top of this page. Continued use of the site after changes constitutes
            acceptance of the revised policy.
          </p>
        </div>

        {/* Contact */}
        <div className="legal-contact">
          <p className="legal-contact-label">Privacy Questions or Data Deletion Requests</p>
          <p className="legal-contact-name">DataLink Clinical LLC</p>
          <a href="mailto:contact@oversightreports.com">contact@oversightreports.com</a>
        </div>

      </div>
    </div>
  );
}
