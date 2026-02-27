import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/save-toast.css';

export function SaveToast({ visible, facilityName, onDismiss }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDismiss, 3500);
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div className="save-toast">
      <span className="save-toast__star">★</span>
      <span className="save-toast__text">
        {facilityName ? `${facilityName} added to favorites` : 'Added to favorites'}
      </span>
      <Link to="/watchlist" className="save-toast__link" onClick={onDismiss}>
        View All →
      </Link>
    </div>
  );
}
