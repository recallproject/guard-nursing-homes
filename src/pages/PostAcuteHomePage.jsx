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

function snfTrustLabel() {
  const snf = POST_ACUTE_SETTINGS.find((s) => s.id === 'snf');
  const n = parseInt(String(snf?.count || '').replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(n) || n <= 0) return '15,000+ nursing homes';
  const rounded = Math.round(n / 1000) * 1000;
  return `${rounded.toLocaleString('en-US')}+ nursing homes`;
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

function TrustIcon({ name }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  if (name === 'building') {
    return (
      <svg {...common}>
        <path d="M4 21V7l8-4 8 4v14" />
        <path d="M9 21V12h6v9M9 9h.01M12 9h.01M15 9h.01M9 16h.01M15 16h.01" />
      </svg>
    );
  }
  if (name === 'database') {
    return (
      <svg {...common}>
        <ellipse cx="12" cy="6" rx="7" ry="3" />
        <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
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
                <em>See the risk.</em>
              </h1>
              <p className="pa-hero-v3-sub">
                Composite scores and key metrics from official CMS records. Search any nursing home to see star ratings, staffing, deficiencies, ownership, and more.
              </p>

              <HeroSearchDropdown />

              <ul className="pa-hero-v3-trust">
                <li>
                  <TrustIcon name="building" />
                  {snfTrustLabel()}
                </li>
                <li>
                  <TrustIcon name="database" />
                  CMS source data
                </li>
                <li>
                  <TrustIcon name="lock" />
                  Free to look up
                </li>
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
