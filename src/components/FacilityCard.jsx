import { useNavigate } from 'react-router-dom';
import '../styles/cards.css';

export default function FacilityCard({ facility }) {
  const navigate = useNavigate();

  // Determine risk level and color
  const getRiskInfo = (score) => {
    if (score >= 60) return { label: 'CRITICAL', color: 'var(--risk-critical)', class: 'critical' };
    if (score >= 40) return { label: 'HIGH RISK', color: 'var(--risk-high)', class: 'high' };
    if (score >= 20) return { label: 'ELEVATED', color: 'var(--risk-elevated)', class: 'elevated' };
    return { label: 'LOW RISK', color: 'var(--risk-low)', class: 'low' };
  };

  const score = facility.composite || 0;
  const riskInfo = getRiskInfo(score);

  // Format stars
  const renderStars = (stars) => {
    const starCount = Math.max(0, Math.min(5, stars || 0));
    const filled = Math.floor(starCount);
    const empty = 5 - filled;

    return (
      <>
        {[...Array(filled)].map((_, i) => (
          <span key={`filled-${i}`} className="star-filled">
            ★
          </span>
        ))}
        {[...Array(empty)].map((_, i) => (
          <span key={`empty-${i}`} className="star-empty">
            ☆
          </span>
        ))}
      </>
    );
  };

  // Format fines
  const formatFines = (amount) => {
    if (!amount) return null;
    if (amount >= 1000000) {
      return '$' + (amount / 1000000).toFixed(1) + 'M';
    }
    if (amount >= 1000) {
      return '$' + (amount / 1000).toFixed(0) + 'K';
    }
    return '$' + amount.toLocaleString();
  };

  const handleClick = () => {
    navigate(`/facility/${facility.ccn}`);
  };

  return (
    <div className="facility-card" onClick={handleClick}>
      <div
        className="facility-card-risk-band"
        style={{ backgroundColor: riskInfo.color }}
      >
        <span className="facility-card-score">{score.toFixed(0)}</span>
        <span className="facility-card-risk-label">{riskInfo.label}</span>
      </div>

      <div className="facility-card-body">
        <h3 className="facility-card-name">{facility.name}</h3>
        <p className="facility-card-city">
          {facility.city}, {facility.state}
        </p>

        <div className="facility-card-stars">{renderStars(facility.stars)}</div>

        <div className="facility-card-stats">
          {facility.harm_count > 0 && (
            <span className="facility-card-stat stat-danger">
              {facility.harm_count} residents hurt
            </span>
          )}
          {facility.jeopardy_count > 0 && (
            <span className="facility-card-stat stat-critical">
              {facility.jeopardy_count} serious danger
            </span>
          )}
          {facility.total_fines > 0 && (
            <span className="facility-card-stat stat-fines">
              {formatFines(facility.total_fines)} fines
            </span>
          )}
          {facility.fine_count > 0 && !facility.total_fines && (
            <span className="facility-card-stat stat-neutral">
              {facility.fine_count} violations
            </span>
          )}
          {facility.total_deficiencies > 0 && (
            <span className="facility-card-stat stat-neutral">
              {facility.total_deficiencies} deficiencies
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
