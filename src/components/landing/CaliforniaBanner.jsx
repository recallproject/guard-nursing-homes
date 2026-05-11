import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { track } from '../../utils/analytics';

const DISMISS_KEY = 'ca_banner_dismissed_v1';

// Routes where the CA banner should NOT appear. Hospice page is positioned
// nationally; the CA banner conflicts with the "framework applies to all 50
// states" framing.
const HIDE_ON_PREFIXES = ['/hospice'];

export default function CaliforniaBanner() {
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();
  const isHidden = HIDE_ON_PREFIXES.some(p => location.pathname.startsWith(p));

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') {
        setDismissed(true);
      }
    } catch {}
  }, []);

  const handleClick = () => {
    window.plausible && window.plausible('CA-Banner-Click');
    track('ca_banner_click');
  };

  const handleDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setDismissed(true);
    window.plausible && window.plausible('CA-Banner-Dismiss');
  };

  if (dismissed || isHidden) return null;

  return (
    <div className="ca-banner">
      <Link to="/states/california" className="ca-banner-link" onClick={handleClick}>
        <span className="ca-banner-flag">CA</span>
        <span className="ca-banner-text">
          <strong>California:</strong> CA AG announced alleged $267M Medi-Cal hospice fraud case.
        </span>
        <span className="ca-banner-cta">See every CA facility →</span>
      </Link>
      <button
        className="ca-banner-close"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
      >
        ×
      </button>
    </div>
  );
}
