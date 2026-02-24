import React from 'react';

/**
 * BenchmarkBar Component
 * Shows a horizontal bar comparing facility value to state and national averages
 */
export function BenchmarkBar({
  value,
  stateAvg,
  nationalAvg,
  label,
  lowerIsBetter = true,
  format = 'number'
}) {
  // Handle missing data
  if (value === null || value === undefined) {
    return null;
  }

  // Format values
  const formatValue = (val) => {
    if (val === null || val === undefined) return 'N/A';

    switch (format) {
      case 'currency':
        return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'hours':
        return `${val.toFixed(2)} hrs`;
      default:
        return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
    }
  };

  // Determine if facility is better, similar, or worse than averages
  const compareToAverage = (facilityVal, avgVal) => {
    if (avgVal === null || avgVal === undefined) return 'unknown';

    const diff = lowerIsBetter
      ? (facilityVal - avgVal) / Math.max(avgVal, 1)
      : (avgVal - facilityVal) / Math.max(avgVal, 1);

    if (diff < -0.15) return 'better';  // 15% better
    if (diff > 0.15) return 'worse';    // 15% worse
    return 'similar';
  };

  const stateComparison = compareToAverage(value, stateAvg);
  const nationalComparison = compareToAverage(value, nationalAvg);

  // Overall status (use worse of the two if either is worse)
  let status = 'better';
  if (stateComparison === 'worse' || nationalComparison === 'worse') {
    status = 'worse';
  } else if (stateComparison === 'similar' || nationalComparison === 'similar') {
    status = 'similar';
  }

  // Color mapping
  const colorMap = {
    better: '#16A34A',   // Green
    similar: '#F59E0B',  // Yellow/Amber
    worse: '#DC2626',    // Red
  };

  const barColor = colorMap[status];

  // Calculate bar position (0-100%)
  // Show a 0-200% range where 100% = average
  const getBarPosition = (val, avg) => {
    if (avg === null || avg === undefined || avg === 0) return 50;

    const ratio = val / avg;
    const position = Math.min(Math.max(ratio * 50, 0), 100);
    return position;
  };

  const statePosition = getBarPosition(value, stateAvg);
  const nationalPosition = getBarPosition(value, nationalAvg);

  // Use state average for primary comparison, fallback to national
  const primaryAvg = stateAvg !== null && stateAvg !== undefined ? stateAvg : nationalAvg;
  const barPosition = stateAvg !== null && stateAvg !== undefined ? statePosition : nationalPosition;

  return (
    <div className="benchmark-bar-wrapper">
      <div className="benchmark-bar-label">{label}</div>

      <div className="benchmark-bar-track">
        <div
          className="benchmark-bar-marker"
          style={{ left: `${barPosition}%` }}
        >
          <div className="benchmark-bar-dot" style={{ backgroundColor: barColor }}></div>
          <div className="benchmark-bar-value" style={{ color: barColor }}>
            {formatValue(value)}
          </div>
        </div>

        {stateAvg !== null && stateAvg !== undefined && (
          <div
            className="benchmark-bar-avg-line benchmark-bar-avg-state"
            style={{ left: '50%' }}
            title={`State Average: ${formatValue(stateAvg)}`}
          ></div>
        )}

        {nationalAvg !== null && nationalAvg !== undefined && primaryAvg !== nationalAvg && (
          <div
            className="benchmark-bar-avg-line benchmark-bar-avg-national"
            style={{ left: `${nationalPosition}%` }}
            title={`National Average: ${formatValue(nationalAvg)}`}
          ></div>
        )}
      </div>

      <div className="benchmark-bar-text">
        <strong>This facility: {formatValue(value)}</strong>
        {stateAvg !== null && stateAvg !== undefined && (
          <> · State avg: {formatValue(stateAvg)}</>
        )}
        {nationalAvg !== null && nationalAvg !== undefined && (
          <> · National avg: {formatValue(nationalAvg)}</>
        )}
      </div>
    </div>
  );
}
