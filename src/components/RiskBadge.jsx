/**
 * Risk badge component that displays a colored badge based on composite risk score
 * Score >= 60: Critical (red)
 * Score 40-59: High Risk (orange)
 * Score 20-39: Elevated (amber)
 * Score < 20: Low Risk (teal)
 */
export default function RiskBadge({ score, showScore = true, size = 'normal' }) {
  // Determine risk level
  const getRiskLevel = (score) => {
    if (score >= 60) return { level: 'high', label: 'High Risk' };
    if (score >= 40) return { level: 'elevated', label: 'Elevated Risk' };
    if (score >= 20) return { level: 'moderate', label: 'Moderate Risk' };
    return { level: 'low', label: 'Low Risk' };
  };

  const safeScore = typeof score === 'number' ? score : 0;
  const { level, label } = getRiskLevel(safeScore);

  const sizeClass = size === 'small' ? 'risk-badge-small' : size === 'large' ? 'risk-badge-large' : '';

  return (
    <span className={`risk-badge ${level} ${sizeClass}`}>
      {showScore && (
        <span className="score">{safeScore.toFixed(1)}</span>
      )}
      {size !== 'large' && <span>{label}</span>}
    </span>
  );
}
