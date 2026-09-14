import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { POST_ACUTE_SETTINGS, liveProviderTotal } from '../data/postAcuteSettings';
import HeroSearchDropdown from '../components/HeroSearchDropdown';
import HeroReportPreview from '../components/HeroReportPreview';
import '../styles/post-acute-home.css';

const LIVE_PROVIDER_TOTAL = liveProviderTotal();
const LIVE_PROVIDER_LABEL = LIVE_PROVIDER_TOTAL.toLocaleString('en-US');

const SETTING_CHIP_LABEL = {
  snf: 'Nursing homes',
  hospice: 'Hospice',
  'home-health': 'Home health',
  irf: 'IRF',
  ltach: 'LTACH',
};

function settingLabel(setting) {
  return SETTING_CHIP_LABEL[setting.id] || setting.label;
}

function browseMeta(setting) {
  if (setting.id === 'snf') {
    const n = parseInt(String(setting.count).replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(n) && n > 0) return `~${Math.round(n / 1000)}k SNFs`;
  }
  return setting.statusLabel || 'Live';
}

function BrowseCard({ setting }) {
  if (!setting.route) return null;
  return (
    <Link to={setting.route} className="pa-browse-card">
      <span className="pa-browse-card-title">{settingLabel(setting)}</span>
      <span className="pa-browse-card-meta">{browseMeta(setting)}</span>
    </Link>
  );
}

export default function PostAcuteHomePage() {
  return (
    <>
      <Helmet>
        <title>Nursing Home & Post-Acute Care Safety Data | The Oversight Report</title>
        <meta name="description" content="Free, sourced reports on every Medicare-certified post-acute care provider in America — nursing homes, hospice, home health, inpatient rehab, and LTACH. Built by a clinician. Refreshed monthly from CMS." />
      </Helmet>

      <div className="pa-home">
        <section className="pa-hero pa-hero-v3" aria-labelledby="pa-hero-heading">
          <div className="pa-hero-v3-inner">
            <div className="pa-hero-v3-copy">
              <p className="pa-hero-v3-eyebrow">CMS data · Updated daily</p>
              <h1 id="pa-hero-heading" className="pa-hero-v3-title">
                Look up any facility.
                <em>Get the facts.</em>
              </h1>
              <p className="pa-hero-v3-sub">
                Check before you choose — scores, staffing, deficiencies, and ownership from public CMS records.
              </p>

              <HeroSearchDropdown />

              <p className="pa-hero-v3-chip-label">Or browse a care setting</p>
              <nav className="pa-hero-chips" aria-label="Browse a care setting">
                {POST_ACUTE_SETTINGS.filter((setting) => setting.route).map((setting) => (
                  <Link key={setting.id} to={setting.route} className="pa-hero-chip">
                    {settingLabel(setting)}
                  </Link>
                ))}
              </nav>

              <ul className="pa-hero-v3-trust">
                <li><strong>CMS</strong> public data</li>
                <li><strong>Independent</strong> — not a facility site</li>
                <li><strong>Free</strong> to look up</li>
              </ul>
            </div>

            <HeroReportPreview />
          </div>
        </section>

        <section className="pa-browse-section" aria-labelledby="pa-browse-heading">
          <div className="pa-browse-header">
            <h2 id="pa-browse-heading">Browse by setting</h2>
            <p>Nursing homes, hospice, home health, inpatient rehab, and LTACH.</p>
          </div>
          <div className="pa-browse-cards">
            {POST_ACUTE_SETTINGS.map((setting) => (
              <BrowseCard key={setting.id} setting={setting} />
            ))}
          </div>
        </section>

        <section className="pa-trust-strip">
          <div className="pa-trust-inner">
            <div className="pa-trust-cell"><div className="pa-trust-num">$467M</div><div className="pa-trust-lbl">Federal fines tracked (3 yr)</div></div>
            <div className="pa-trust-cell"><div className="pa-trust-num">$3.04B</div><div className="pa-trust-lbl">Related-party costs (HCRIS)</div></div>
            <div className="pa-trust-cell"><div className="pa-trust-num">14.5M</div><div className="pa-trust-lbl">Daily staffing records (PBJ)</div></div>
            <div className="pa-trust-cell"><div className="pa-trust-num">18</div><div className="pa-trust-lbl">Federal databases · sourced</div></div>
          </div>
        </section>

        <section className="pa-author">
          <div className="pa-author-inner pa-author-inner--single">
            <h2>Why this exists.</h2>
            <p>{LIVE_PROVIDER_LABEL} Medicare-certified post-acute providers sit at the center of one of the country's largest hidden cost drivers and most chronic patient-safety failures. CMS publishes the data; almost nobody connects it.</p>
            <p>The Oversight Report is the integration: clinical interpretation, ownership networks, related-party financial flows, and federal enforcement history — sourced, signed, and free for families.</p>
          </div>
        </section>

        <footer className="pa-footer">
          <div className="pa-footer-inner">
            <span>© 2026 DataLink Clinical LLC · oversightreports.com</span>
            <span>Sources: CMS · HCRIS · PBJ · Care Compare · OIG · BLS · Census</span>
            <span>
              <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link> · <Link to="/methodology">Methodology</Link>
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
