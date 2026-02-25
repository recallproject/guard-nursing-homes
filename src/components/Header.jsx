import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/header.css';

/**
 * Global navigation header with audience-lane dropdowns
 * Families / Professionals / Hospitals
 * Mobile hamburger menu
 */
export function Header({ onSearchOpen, transparent = false }) {
  const [isCompact, setIsCompact] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();
  const navRef = useRef(null);
  const dropdownTimeoutRef = useRef(null);

  // Compact on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsCompact(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleDropdownEnter = (name) => {
    clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(name);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const isActive = (path) => location.pathname === path;
  const isInGroup = (paths) => paths.some(p => location.pathname.startsWith(p));

  const navGroups = [
    {
      label: 'Families',
      paths: ['/', '/facility', '/watchlist', '/trends', '/pricing'],
      items: [
        { to: '/', label: 'Search & Map', desc: 'Find and compare nursing homes' },
        { to: '/watchlist', label: 'My Watchlist', desc: 'Track facilities you\'re monitoring' },
        { to: '/trends', label: 'Industry Trends', desc: 'National quality snapshot' },
      ]
    },
    {
      label: 'Professionals',
      paths: ['/screening', '/discrepancies', '/ownership', '/evidence', '/ag-toolkit', '/chains'],
      items: [
        { to: '/ag-toolkit', label: 'AG Toolkit', desc: 'Enforcement-ready staffing violation analysis' },
        { to: '/screening', label: 'State Screening', desc: 'AG investigation reports by state' },
        { to: '/chains', label: 'Chain Rankings', desc: 'Compare performance across nursing home chains' },
        { to: '/discrepancies', label: 'Staffing Discrepancies', desc: 'Facilities overstating staffing levels' },
        { to: '/ownership', label: 'Ownership Networks', desc: 'Explore multi-facility owner portfolios' },
      ]
    },
    {
      label: 'Hospitals',
      paths: ['/referral-scorecard'],
      items: [
        { to: '/referral-scorecard', label: 'Referral Scorecard', desc: 'Compare facilities for discharge planning' },
      ]
    },
    {
      label: 'About',
      paths: ['/methodology', '/pricing'],
      items: [
        { to: '/methodology', label: 'Methodology', desc: 'How we calculate every number' },
        { to: '/pricing', label: 'Pricing', desc: 'Free for families, Pro for professionals' },
        { to: '/terms', label: 'Terms of Use', desc: 'Legal terms and disclaimers' },
        { to: '/privacy', label: 'Privacy Policy', desc: 'How we handle your data' },
        { href: 'mailto:contact@oversightreports.com', label: 'Contact Us', desc: 'Questions, feedback, or partnerships' },
      ]
    }
  ];

  return (
    <>
      <header className={`site-header ${isCompact ? 'site-header--compact' : ''} ${transparent && !isCompact ? 'site-header--transparent' : ''}`} ref={navRef}>
        <div className="site-header__inner">
          {/* Brand */}
          <Link to="/" className="site-header__brand">
            <span className="site-header__logo-text">The Oversight Report</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="site-header__nav" aria-label="Main navigation">
            {navGroups.map((group) => (
              <div
                key={group.label}
                className={`site-header__group ${isInGroup(group.paths) ? 'site-header__group--active' : ''}`}
                onMouseEnter={() => handleDropdownEnter(group.label)}
                onMouseLeave={handleDropdownLeave}
              >
                <button
                  className="site-header__group-label"
                  onClick={() => setActiveDropdown(activeDropdown === group.label ? null : group.label)}
                  aria-expanded={activeDropdown === group.label}
                >
                  {group.label}
                  <svg className="site-header__chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {activeDropdown === group.label && (
                  <div
                    className="site-header__dropdown"
                    onMouseEnter={() => handleDropdownEnter(group.label)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    {group.items.map((item) => (
                      item.href ? (
                        <a
                          key={item.href}
                          href={item.href}
                          className="site-header__dropdown-item"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <span className="site-header__dropdown-label">{item.label}</span>
                          <span className="site-header__dropdown-desc">{item.desc}</span>
                        </a>
                      ) : (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`site-header__dropdown-item ${isActive(item.to) ? 'site-header__dropdown-item--active' : ''}`}
                          onClick={() => setActiveDropdown(null)}
                        >
                          <span className="site-header__dropdown-label">{item.label}</span>
                          <span className="site-header__dropdown-desc">{item.desc}</span>
                        </Link>
                      )
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Actions */}
          <div className="site-header__actions">
            {onSearchOpen && (
              <button
                className="site-header__search-btn"
                onClick={onSearchOpen}
                aria-label="Search facilities"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <span className="site-header__search-label">Search</span>
                <kbd className="site-header__kbd">&#x2318;K</kbd>
              </button>
            )}

            {/* Hamburger */}
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

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileOpen(false)}>
          <nav className="mobile-menu" onClick={(e) => e.stopPropagation()} aria-label="Mobile navigation">
            <div className="mobile-menu__header">
              <span className="site-header__logo-text">The Oversight Report</span>
              <button
                className="mobile-menu__close"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                &#x2715;
              </button>
            </div>

            {navGroups.map((group) => (
              <div key={group.label} className="mobile-menu__group">
                <div className="mobile-menu__group-label">{group.label}</div>
                {group.items.map((item) => (
                  item.href ? (
                    <a
                      key={item.href}
                      href={item.href}
                      className="mobile-menu__item"
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="mobile-menu__item-label">{item.label}</span>
                      <span className="mobile-menu__item-desc">{item.desc}</span>
                    </a>
                  ) : (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`mobile-menu__item ${isActive(item.to) ? 'mobile-menu__item--active' : ''}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="mobile-menu__item-label">{item.label}</span>
                      <span className="mobile-menu__item-desc">{item.desc}</span>
                    </Link>
                  )
                ))}
              </div>
            ))}

            {onSearchOpen && (
              <button
                className="mobile-menu__search"
                onClick={() => { setMobileOpen(false); onSearchOpen(); }}
              >
                Search Facilities
              </button>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
