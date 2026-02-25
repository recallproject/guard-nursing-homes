import { useNavigate } from 'react-router-dom';
import { useWatchlist } from '../hooks/useWatchlist';

export default function FacilityRow({ facility }) {
  const navigate = useNavigate();
  const { addFacility, removeFacility, isWatched } = useWatchlist();
  const watched = isWatched(facility.ccn);

  const getRiskInfo = (score) => {
    if (score >= 60) return { label: 'CRITICAL', color: 'var(--risk-critical)' };
    if (score >= 40) return { label: 'HIGH RISK', color: 'var(--risk-high)' };
    if (score >= 20) return { label: 'ELEVATED', color: 'var(--risk-elevated)' };
    return { label: 'LOW RISK', color: 'var(--risk-low)' };
  };

  const score = facility.composite || 0;
  const riskInfo = getRiskInfo(score);

  const renderStars = (stars) => {
    const starCount = Math.max(0, Math.min(5, stars || 0));
    const filled = Math.floor(starCount);
    const empty = 5 - filled;
    return (
      <>
        {[...Array(filled)].map((_, i) => (
          <span key={`filled-${i}`} className="star-filled">★</span>
        ))}
        {[...Array(empty)].map((_, i) => (
          <span key={`empty-${i}`} className="star-empty">☆</span>
        ))}
      </>
    );
  };

  const formatFines = (amount) => {
    if (!amount) return null;
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
    return '$' + amount.toLocaleString();
  };

  const handleClick = () => {
    navigate(`/facility/${facility.ccn}`);
  };

  const getTrendIndicator = () => {
    if (!facility.trend_direction) return null;

    if (facility.trend_direction === 'improving') {
      return <span className="trend-indicator trend-indicator--improving" title="Staffing trend: Improving">↑</span>;
    } else if (facility.trend_direction === 'declining') {
      return <span className="trend-indicator trend-indicator--declining" title="Staffing trend: Declining">↓</span>;
    } else if (facility.trend_direction === 'stable') {
      return <span className="trend-indicator trend-indicator--stable" title="Staffing trend: Stable">→</span>;
    }
    return null;
  };

  return (
    <div className="facility-row" onClick={handleClick}>
      <div className="facility-row-score" style={{ backgroundColor: riskInfo.color }}>
        <span className="facility-row-score-num">{score.toFixed(0)}</span>
      </div>
      <button
        className={`facility-row-watch ${watched ? 'facility-row-watch--active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          watched ? removeFacility(facility.ccn) : addFacility(facility.ccn);
        }}
        title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        {watched ? '★' : '☆'}
      </button>
      <div className="facility-row-info">
        <div className="facility-row-top">
          <span className="facility-row-name">
            {facility.name}
            {getTrendIndicator()}
          </span>
          <span className="facility-row-city">{facility.city}, {facility.state}</span>
        </div>
        <div className="facility-row-bottom">
          <span className="facility-row-risk-label" style={{ color: riskInfo.color }}>{riskInfo.label}</span>
          <span className="facility-row-stars">{renderStars(facility.stars)}</span>
          {facility.harm_count > 0 && (
            <span className="facility-card-stat stat-danger">{facility.harm_count} residents hurt</span>
          )}
          {facility.jeopardy_count > 0 && (
            <span className="facility-card-stat stat-critical">{facility.jeopardy_count} serious danger</span>
          )}
          {facility.total_fines > 0 && (
            <span className="facility-card-stat stat-fines">{formatFines(facility.total_fines)} fines</span>
          )}
          {facility.total_deficiencies > 0 && (
            <span className="facility-card-stat stat-neutral">{facility.total_deficiencies} deficiencies</span>
          )}
        </div>
      </div>
    </div>
  );
}
