import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Fixed header with logo, navigation, and search trigger
 * Shrinks on scroll for better UX
 */
export function Header({ onSearchOpen }) {
  const [isCompact, setIsCompact] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Compact header when scrolling down past 100px
      if (currentScrollY > 100) {
        setIsCompact(true);
      } else {
        setIsCompact(false);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`header ${isCompact ? 'compact' : ''}`}>
      <div className="header-inner">
        <div className="header-brand">
          <Link to="/" className="header-logo">
            <span className="icon">🐕</span>
            <span>NURSING HOME WATCHDOG</span>
          </Link>
          {!isCompact && (
            <div className="header-tagline">Every family deserves the truth</div>
          )}
        </div>

        <nav className="header-nav">
          <Link to="/">Map</Link>
          <a href="#about">About</a>
          <a href="#methodology">Methodology</a>
        </nav>

        <div className="header-actions">
          <button
            className="btn-ghost btn-icon"
            onClick={onSearchOpen}
            aria-label="Search facilities"
          >
            🔍
          </button>
        </div>
      </div>
    </header>
  );
}
