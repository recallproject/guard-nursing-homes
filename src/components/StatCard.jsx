import React from 'react';

/**
 * Stat card component for displaying key metrics
 * Shows a large value with a label below
 */
export function StatCard({ value, label, color = 'teal', icon = null, className = '' }) {
  const colorClass = color === 'danger' ? 'danger' :
                     color === 'warning' ? 'warning' :
                     color === 'success' ? 'success' : '';

  return (
    <div className={`stat-box ${colorClass} ${className}`}>
      <div className="stat-value">
        {icon && <span style={{ marginRight: '0.5rem' }}>{icon}</span>}
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
