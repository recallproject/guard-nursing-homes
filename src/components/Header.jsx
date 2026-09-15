import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWatchlist } from '../hooks/useWatchlist';
import { CARE_SETTINGS, careSettingFromPath } from '../data/careSettings';
import '../styles/header.css';

/**
 * Global family navigation — same shell on hub, setting, state, and facility.
 */
export function Header() {
  const [isCompact, setIsCompact] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef(null);
  const dropdownTimeoutRef = useRef(null);
  const { watchlist } = useWatchlist();
  const watchlistCount = watchlist.length;
  const currentSetting = careSettingFromPath(location.pathname);

  useEffect(() => {
    const handleScroll = () => setIsCompact(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    function handleKey(e) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mobileOpen]);

  const isActive = (path) => location.pathname === path;
  const settingsActive = Boolean(currentSetting);
  const statesActive = location.pathname.startsWith('/state/') || location.hash === '#browse-states';

  const topLinks = [
    { to: '/', label: 'Find a facility', match: (p) => p === '/' },
    { to: '/compare', label: 'Compare', match: (p) => p === '/compare' },
    { to: '/methodology', label: 'Methodology', match: (p) => p.startsWith('/methodology') },
  ];

  return (
    <>
      <header
        className={`site-header site-header--family ${isCompact ? 'site-header--compact' : ''} ${mobileOpen ? 'site-header--menu-open' : ''}`}
        ref={navRef}
      >
        <div className="site-header__inner site-header__inner--family">
          <Link
            to="/"
            className="site-header__brand"
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                navigate('/', { replace: true });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <span className="site-header__logo-text">The <span className="logo-accent">Oversight</span> Report</span>
          </Link>

          <nav className="site-header__family-nav" aria-label="Main navigation">
            <Link
              to="/"
              className={`site-header__family-link ${isActive('/') ? 'site-header__family-link--active' : ''}`}
            >
              Find a facility
            </Link>

            <div
              className={`site-header__group ${settingsActive ? 'site-header__group--active' : ''}`}
              onMouseEnter={() => {
                clearTimeout(dropdownTimeoutRef.current);
                setSettingsOpen(true);
              }}
              onMouseLeave={() => {
                dropdownTimeoutRef.current = setTimeout(() => setSettingsOpen(false), 150);
              }}
            >
              <button
                type="button"
                className={`site-header__family-link site-header__family-btn ${settingsActive ? 'site-header__family-link--active' : ''}`}
                aria-expanded={settingsOpen}
                aria-haspopup="true"
                onClick={() => setSettingsOpen((v) => !v)}
              >
                Settings
              </button>
              {settingsOpen && (
                <div className="site-header__dropdown" role="menu">
                  {CARE_SETTINGS.map((s) => (
                    <Link
                      key={s.id}
                      to={s.route}
                      className={`site-header__dropdown-item ${isActive(s.route) ? 'site-header__dropdown-item--active' : ''}`}
                      onClick={() => setSettingsOpen(false)}
                    >
                      <span className="site-header__dropdown-label">{s.familyLabel}</span>
                      <span className="site-header__dropdown-desc">
                        {s.nerdLabel ? s.nerdLabel : s.pageTitle}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/skilled-nursing#browse-states"
              className={`site-header__family-link ${statesActive ? 'site-header__family-link--active' : ''}`}
            >
              States
            </Link>

            {topLinks.filter((l) => l.to !== '/').map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`site-header__family-link ${link.match(location.pathname) ? 'site-header__family-link--active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="site-header__actions">
            <Link to="/watchlist" className="site-header__favorites-btn" aria-label={`Saved (${watchlistCount})`}>
              <span className={`site-header__fav-star ${watchlistCount > 0 ? 'site-header__fav-star--filled' : ''}`}>
                {watchlistCount > 0 ? '★' : '☆'}
              </span>
              <span className="site-header__fav-label">Saved</span>
              {watchlistCount > 0 && (
                <span className="site-header__fav-badge">{watchlistCount}</span>
              )}
            </Link>

            <button
              className={`site-header__hamburger ${mobileOpen ? 'site-header__hamburger--open' : ''}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileOpen(false)}>
          <nav
            className="mobile-menu"
            onClick={(e) => e.stopPropagation()}
            aria-label="Mobile navigation"
            aria-modal="true"
            role="dialog"
          >
            <div className="mobile-menu__header">
              <Link to="/" className="site-header__brand" onClick={() => setMobileOpen(false)}>
                <span className="site-header__logo-text">The <span className="logo-accent">Oversight</span> Report</span>
              </Link>
              <button
                className="mobile-menu__close"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                &#x2715;
              </button>
            </div>

            <div className="mobile-menu__body">
              <Link to="/" className={`mobile-menu__standalone-link ${isActive('/') ? 'mobile-menu__standalone-link--active' : ''}`} onClick={() => setMobileOpen(false)}>
                Find a facility
              </Link>
              <div className="mobile-menu__group">
                <div className="mobile-menu__group-label">Settings</div>
                {CARE_SETTINGS.map((s) => (
                  <Link
                    key={s.id}
                    to={s.route}
                    className={`mobile-menu__item ${isActive(s.route) ? 'mobile-menu__item--active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="mobile-menu__item-label">{s.familyLabel}</span>
                    {s.nerdLabel ? (
                      <span className="mobile-menu__item-desc">{s.nerdLabel}</span>
                    ) : (
                      <span className="mobile-menu__item-desc">{s.pageTitle}</span>
                    )}
                  </Link>
                ))}
              </div>
              <Link to="/skilled-nursing#browse-states" className="mobile-menu__standalone-link" onClick={() => setMobileOpen(false)}>
                States
              </Link>
              <Link to="/compare" className={`mobile-menu__standalone-link ${isActive('/compare') ? 'mobile-menu__standalone-link--active' : ''}`} onClick={() => setMobileOpen(false)}>
                Compare
              </Link>
              <Link to="/methodology" className="mobile-menu__standalone-link" onClick={() => setMobileOpen(false)}>
                Methodology
              </Link>
              <Link to="/watchlist" className="mobile-menu__standalone-link" onClick={() => setMobileOpen(false)}>
                Saved
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
