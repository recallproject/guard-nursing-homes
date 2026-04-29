import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { POST_ACUTE_SETTINGS } from '../data/postAcuteSettings';
import '../styles/post-acute-home.css';

function Tile({ setting }) {
  const isClickable = setting.status === 'live' || setting.status === 'next';
  const tileClass = [
    'pa-tile',
    isClickable ? 'pa-tile-clickable' : '',
    setting.status === 'live' ? 'pa-tile-live' : '',
    setting.status === 'next' ? 'pa-tile-next' : '',
    setting.status === 'coming' ? 'pa-tile-coming' : '',
  ].filter(Boolean).join(' ');

  const inner = (
    <>
      {setting.status === 'live' && <span className="pa-status-badge pa-status-live">{setting.statusLabel}</span>}
      {setting.status === 'next' && <span className="pa-status-badge pa-status-next">{setting.statusLabel}</span>}
      {setting.status === 'coming' && <span className="pa-status-badge pa-status-coming">{setting.statusLabel}</span>}
      {isClickable && <span className="pa-tile-arrow" aria-hidden="true">›</span>}
      <span className="pa-tile-icon" aria-hidden="true">{setting.iconCode}</span>
      <h3>{setting.label}</h3>
      <div className="pa-tile-sub">{setting.sub}</div>
      <p className="pa-tile-desc">{setting.desc}</p>
      <div className="pa-tile-stat">
        <span className="pa-tile-count">{setting.count}</span>
        <span className="pa-tile-unit">{setting.countUnit}</span>
        <div className="pa-tile-hook">{setting.hook}</div>
      </div>
    </>
  );

  if (isClickable && setting.route) {
    return <Link to={setting.route} className={tileClass}>{inner}</Link>;
  }
  return <div className={tileClass}>{inner}</div>;
}

export default function PostAcuteHomePage() {
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // Search lives on /skilled-nursing for now (where the real SearchOverlay exists).
    // When cross-setting search ships, swap this to a multi-setting search route.
    navigate('/skilled-nursing');
  };

  return (
    <>
      <Helmet>
        <title>Nursing Home & Post-Acute Care Safety Data | The Oversight Report</title>
        <meta name="description" content="Free, sourced reports on every Medicare-certified post-acute care provider in America — nursing homes, hospice, home health, inpatient rehab, and LTACH. Built by a clinician. Refreshed monthly from CMS." />
      </Helmet>

      <div className="pa-home">
        {/* HERO — newspaper masthead structure */}
        <section className="pa-hero">
          <div className="pa-hero-tagline">Free · Clinician-built · Sourced from CMS</div>
          <h1 className="pa-masthead">The <span className="pa-masthead-accent">Oversight</span> Report</h1>
          <div className="pa-masthead-sub">Post-acute care safety data.</div>
          <hr className="pa-masthead-rule" />
          <p className="pa-hero-sub">
            Free, sourced, clinician-built reports on every Medicare-certified post-acute provider in America —{' '}
            <strong>nursing homes, hospice, home health, inpatient rehab, and LTACH.</strong>
            {' '}Signed by Robert Benard, NP.
          </p>

          <form className="pa-hero-search" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              className="pa-hero-search-input"
              placeholder="Address, city, ZIP, or facility name"
              aria-label="Search post-acute care facility"
            />
            <button type="submit" className="pa-hero-search-submit">Search</button>
          </form>

          <div className="pa-hero-proof">
            <span className="pa-hero-proof-item">33,800 providers</span>
            <span className="pa-hero-proof-sep">·</span>
            <span className="pa-hero-proof-item">50 states</span>
            <span className="pa-hero-proof-sep">·</span>
            <span className="pa-hero-proof-item">refreshed monthly</span>
            <span className="pa-hero-proof-sep">·</span>
            <span className="pa-hero-proof-item">no commissions</span>
            <span className="pa-hero-proof-sep">·</span>
            <span className="pa-hero-proof-item">no operator funding</span>
          </div>
        </section>

        {/* TILES */}
        <section className="pa-tiles-section">
          <div className="pa-tiles-header">
            <div>
              <div className="pa-section-eyebrow">// the post-acute continuum</div>
              <h2>Pick a care setting.</h2>
            </div>
            <div className="pa-tiles-meta">5 settings · 33,800+ providers · phased rollout</div>
          </div>

          <div className="pa-tiles">
            {POST_ACUTE_SETTINGS.map((setting) => (
              <Tile key={setting.id} setting={setting} />
            ))}
          </div>
        </section>

        {/* MOAT — cross-setting ownership view teaser */}
        <section className="pa-moat-section">
          <div className="pa-moat-card">
            <div>
              <div className="pa-moat-eyebrow">// in build · launches with hospice</div>
              <h3 className="pa-moat-title">The cross-setting ownership view.</h3>
              <p>The same operators run nursing homes, hospice, and home health — often through commonly-owned management companies that shift money out of resident care and into related parties.</p>
              <p>Top operators by combined facility count across settings, with HCRIS related-party flows, federal CMP totals, and chain-average quality scores.</p>
              <div className="pa-moat-cta">→ free, public, sourced — launching with the Hospice page</div>
            </div>
            <div className="pa-moat-vis">
              <div className="pa-moat-vis-head">Top operators · cross-setting (sample)</div>
              <div><span className="pa-opname">Operator A</span> · SNF 84 · Hospice 41 · HHA 22</div>
              <div><span className="pa-opname">Operator B</span> · SNF 67 · Hospice 38 · HHA 15</div>
              <div><span className="pa-opname">Operator C</span> · SNF 52 · Hospice 29 · HHA 31</div>
              <div><span className="pa-opname">Operator D</span> · SNF 49 · Hospice 24 · HHA 18</div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--pa-border)', color: 'var(--pa-muted)' }}>
                Related-party flows: <span className="pa-num">$3.04B</span> · FY2024
              </div>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="pa-trust-strip">
          <div className="pa-trust-inner">
            <div className="pa-trust-cell"><div className="pa-trust-num">$492M</div><div className="pa-trust-lbl">Federal fines tracked (3 yr)</div></div>
            <div className="pa-trust-cell"><div className="pa-trust-num">$3.04B</div><div className="pa-trust-lbl">Related-party costs (HCRIS)</div></div>
            <div className="pa-trust-cell"><div className="pa-trust-num">14.5M</div><div className="pa-trust-lbl">Daily staffing records (PBJ)</div></div>
            <div className="pa-trust-cell"><div className="pa-trust-num">18</div><div className="pa-trust-lbl">Federal databases · sourced</div></div>
          </div>
        </section>

        {/* AUTHOR */}
        <section className="pa-author">
          <div className="pa-author-inner">
            <div>
              <h2>Why this exists.</h2>
              <p>33,800 Medicare-certified post-acute providers sit at the center of one of the country's largest hidden cost drivers and most chronic patient-safety failures. CMS publishes the data; almost nobody connects it.</p>
              <p>The Oversight Report is the integration: clinical interpretation, ownership networks, related-party financial flows, and federal enforcement history — sourced, signed, and free for families.</p>
            </div>
            <div className="pa-author-card">
              <div className="pa-author-name">Robert Benard, NP</div>
              <div className="pa-author-creds">AGACNP-BC · PMHNP-BC · Highland Hospital · Oakland, CA</div>
              <div className="pa-author-bio">Acute-care and psychiatric nurse practitioner. Builds and signs The Oversight Report independently through DataLink Clinical LLC.</div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
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
