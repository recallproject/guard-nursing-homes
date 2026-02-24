import React from 'react';
import '../styles/facility.css';

/**
 * Warning callout box for important alerts
 * severity: "danger" (red) or "warning" (amber)
 */
export default function WarningCallout({ severity, message, detail }) {
  const icon = severity === 'danger' ? '🚨' : '⚠️';
  const className = `warning-callout warning-${severity}`;

  return (
    <div className={className}>
      <div className="warning-icon">{icon}</div>
      <div className="warning-content">
        <div className="warning-message">{message}</div>
        {detail && <div className="warning-detail">{detail}</div>}
      </div>
    </div>
  );
}
