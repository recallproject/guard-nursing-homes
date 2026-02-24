import React from 'react';
import '../styles/facility.css';

/**
 * Score breakdown cards showing the 4 main risk categories
 * Each card shows score, label, and a mini horizontal bar
 */
export default function ScoreBreakdown({ staffing, deficiency, penalty, ownership, quality }) {
  const categories = [
    {
      label: 'Staffing',
      score: staffing,
      weight: '30%',
      color: 'var(--teal)',
      description: 'RN hours, zero-RN days, staffing gaps'
    },
    {
      label: 'Inspections',
      score: deficiency,
      weight: '25%',
      color: 'var(--amber)',
      description: 'Deficiencies, harm, serious danger'
    },
    {
      label: 'Penalties',
      score: penalty,
      weight: '20%',
      color: 'var(--red)',
      description: 'Fines, payment denials'
    },
    {
      label: 'Ownership',
      score: ownership,
      weight: '15%',
      color: 'var(--slate, #64748b)',
      description: 'Portfolio performance, chain patterns'
    }
  ];

  return (
    <div className="score-breakdown">
      {categories.map((cat, i) => (
        <div key={i} className="breakdown-card" style={{ '--card-color': cat.color }}>
          <div className="breakdown-header">
            <div className="breakdown-label">{cat.label}</div>
            <div className="breakdown-weight">{cat.weight}</div>
          </div>
          <div className="breakdown-score">{(cat.score || 0).toFixed(1)}</div>
          <div className="breakdown-bar-container">
            <div
              className="breakdown-bar"
              style={{
                width: `${Math.min((cat.score || 0), 100)}%`,
                backgroundColor: cat.color
              }}
            />
          </div>
          <div className="breakdown-description">{cat.description}</div>
        </div>
      ))}
    </div>
  );
}
