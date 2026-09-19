import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/save-toast.css';

/**
 * Short confirmation after favoriting. No compare-arrow CTA — the list-page
 * Compare dock and Favorites page are the intentional next steps.
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
        {facilityName ? `${facilityName} saved to favorites` : 'Saved to favorites'}
      </span>
      <button type="button" className="save-toast__dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
