import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { watchlistComparePath } from '../utils/watchlistCompare';
import '../styles/save-toast.css';

export function SaveToast({ visible, facilityName, favoriteCount = 0, onDismiss }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDismiss, 3500);
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  if (!visible) return null;

  const canCompare = favoriteCount >= 2;

  return (
    <div className="save-toast">
      <span className="save-toast__star">★</span>
      <span className="save-toast__text">
        {facilityName ? `${facilityName} added to favorites` : 'Added to favorites'}
      </span>
      <Link
        to={canCompare ? watchlistComparePath() : '/watchlist'}
        className="save-toast__link"
        onClick={onDismiss}
      >
        {canCompare ? 'Compare favorites →' : 'View favorites →'}
      </Link>
    </div>
  );
}
