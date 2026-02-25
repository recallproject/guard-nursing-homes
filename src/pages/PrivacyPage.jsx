import { useEffect } from 'react';
import '../styles/legal.css';

export function PrivacyPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: February 24, 2026</p>

        <h2>Who We Are</h2>
        <p>
          The Oversight Report is operated by <strong>DataLink Clinical LLC</strong>.
          This privacy policy explains how we handle information when you use our site.
        </p>

        <h2>Data We Collect</h2>
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

        <h2>Data We Do Not Sell</h2>
        <p>
          We do not sell, rent, or share personal data with third parties.
        </p>

        <h2>No Advertising or Sponsored Content</h2>
        <p>
          We do not accept advertising, sponsored placements, or payments from nursing home
          operators, insurers, healthcare companies, or any entity that could create a
          conflict of interest with our mission.
        </p>

        <h2>No Industry Financial Relationships</h2>
        <p>
          DataLink Clinical LLC has no financial relationships with nursing home operators,
          long-term care chains, insurance companies, private equity firms, or healthcare
          industry trade associations.
        </p>

        <h2>PDF Reports</h2>
        <p>
          PDF reports and CSV exports are generated entirely in your browser (client-side).
          The data is not transmitted to or stored on our servers.
        </p>

        <h2>Third-Party Services</h2>
        <p>
          This site is hosted on GitHub Pages. Please refer
          to <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">GitHub's privacy statement</a> for
          information about their data practices. We load fonts from Google Fonts, which
          is subject to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's privacy policy</a>.
        </p>

        <h2>Children's Privacy</h2>
        <p>
          This site is not directed at children under 13. We do not knowingly collect
          personal information from children.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this policy as we add features. Check the "last updated" date
          at the top of this page. Continued use of the site after changes constitutes
          acceptance of the revised policy.
        </p>

        <div className="legal-contact">
          <p><strong>Contact</strong></p>
          <p>
            For privacy questions or data deletion requests:<br />
            DataLink Clinical LLC<br />
            <a href="mailto:contact@oversightreports.com">contact@oversightreports.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
