import React from 'react';
import '../styles/facility.css';

/**
 * Horizontal metric bar with optional average marker
 * Shows value as a filled proportion of max
 */
export default function MetricBar({ value, max, label, color, average }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const avgPercentage = average ? Math.min(Math.max((average / max) * 100, 0), 100) : null;

  return (
    <div className="metric-bar-container">
      {label && <div className="metric-bar-label">{label}</div>}
      <div className="metric-bar-track">
        <div
          className="metric-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: color || 'var(--teal)'
          }}
        />
        {avgPercentage !== null && (
          <div
            className="metric-bar-average-marker"
            style={{ left: `${avgPercentage}%` }}
            title={`Average: ${average}`}
          >
            <div className="average-triangle" />
          </div>
        )}
      </div>
    </div>
  );
}
