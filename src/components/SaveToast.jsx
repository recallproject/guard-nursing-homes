import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/save-toast.css';

/**
 * Short confirmation after saving. No compare-arrow CTA — Save is a shortlist,
 * Compare is a separate tray on the list and Saved homes pages.
 */
export function SaveToast({ visible, facilityName, onDismiss }) {
  const location = useLocation();
  const hideToast = location.pathname === '/watchlist' || location.pathname.startsWith('/state/');

  useEffect(() => {
    if (!visible) return undefined;
    if (hideToast) {
      onDismiss();
      return undefined;
    }
    const timer = setTimeout(onDismiss, 2800);
    return () => clearTimeout(timer);
  }, [visible, onDismiss, hideToast]);

  if (!visible || hideToast) return null;

  return (
    <div className="save-toast" role="status">
      <span className="save-toast__star" aria-hidden="true">★</span>
      <span className="save-toast__text">
        {facilityName ? `${facilityName} saved` : 'Saved to your shortlist'}
      </span>
      <button type="button" className="save-toast__dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
