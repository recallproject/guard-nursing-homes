import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { track } from '../../utils/analytics';

const DISMISS_KEY = 'ca_banner_dismissed_v1';

export default function CaliforniaBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
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

  if (dismissed) return null;

  return (
    <div className="ca-banner">
      <Link to="/states/california" className="ca-banner-link" onClick={handleClick}>
        <span className="ca-banner-flag">CA</span>
        <span className="ca-banner-text">
          <strong>California:</strong> $267M Medi-Cal hospice fraud uncovered.
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
