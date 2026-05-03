import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { POST_ACUTE_SETTINGS } from '../data/postAcuteSettings';
import HeroSearchDropdown from '../components/HeroSearchDropdown';
import '../styles/post-acute-home.css';

// ISO 8601 UTC timestamp of the most recent CMS data refresh. Update when you pull new data.
const LAST_REFRESH_ISO = '2026-04-29T02:00:00Z';

function formatAgo(iso) {
  const last = new Date(iso);
  if (Number.isNaN(last.getTime())) return 'recently';
  const diffMs = Date.now() - last.getTime();
  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (hrs < 24) return `${hrs} hr ago`;
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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

  // Compute "X ago" once on mount.
  useEffect(() => {
    const el = document.getElementById('pa-ticker-ago');
    if (el) el.textContent = formatAgo(LAST_REFRESH_ISO);
  }, []);

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
            <strong>nursing homes, hospice, home health, inpatient rehab, and{' '}LTACH.</strong>
          </p>

          <HeroSearchDropdown />

          {/* Live ticker + receipts row */}
          <div className="pa-ticker">
            <div className="pa-ticker-row">
              <span className="pa-ticker-pulse" aria-hidden="true"></span>
              <span className="pa-ticker-live">Live</span>
              <span className="pa-ticker-sep">·</span>
              <span className="pa-ticker-muted">data refreshed</span>{' '}
              <span className="pa-ticker-strong" id="pa-ticker-ago" data-iso={LAST_REFRESH_ISO}>recently</span>
              <span className="pa-ticker-sep">·</span>
              <span className="pa-ticker-strong">33,800</span>{' '}
              <span className="pa-ticker-muted">providers</span>
              <span className="pa-ticker-sep">·</span>
              <span className="pa-ticker-strong">50</span>{' '}
              <span className="pa-ticker-muted">states</span>
            </div>
            <div className="pa-ticker-secondary">no operator funding</div>
            <div className="pa-ticker-links">
              <Link to="/methodology">METHODOLOGY <span className="pa-ticker-arrow" aria-hidden="true">↗</span></Link>
              <span className="pa-ticker-sep-thin">·</span>
              <Link to="/data-transparency">DATA SOURCES <span className="pa-ticker-arrow" aria-hidden="true">↗</span></Link>
              <span className="pa-ticker-sep-thin">·</span>
              <Link to="/refresh-log">REFRESH LOG <span className="pa-ticker-arrow" aria-hidden="true">↗</span></Link>
            </div>
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

        {/* TRUST STRIP */}
        <section className="pa-trust-strip">
          <div className="pa-trust-inner">
            <div className="pa-trust-cell"><div className="pa-trust-num">$492M</div><div className="pa-trust-lbl">Federal fines tracked (3 yr)</div></div>
            <div className="pa-trust-cell"><div className="pa-trust-num">$3.04B</div><div className="pa-trust-lbl">Related-party costs (HCRIS)</div></div>
            <div className="pa-trust-cell"><div className="pa-trust-num">14.5M</div><div className="pa-trust-lbl">Daily staffing records (PBJ)</div></div>
            <div className="pa-trust-cell"><div className="pa-trust-num">18</div><div className="pa-trust-lbl">Federal databases · sourced</div></div>
          </div>
        </section>

        {/* AUTHOR — mission only; bio + credentials live on /about */}
        <section className="pa-author">
          <div className="pa-author-inner pa-author-inner--single">
            <h2>Why this exists.</h2>
            <p>33,800 Medicare-certified post-acute providers sit at the center of one of the country's largest hidden cost drivers and most chronic patient-safety failures. CMS publishes the data; almost nobody connects it.</p>
            <p>The Oversight Report is the integration: clinical interpretation, ownership networks, related-party financial flows, and federal enforcement history — sourced, signed, and free for families.</p>
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
