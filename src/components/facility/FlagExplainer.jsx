import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/flag-explainer.css';

const FLAG_CRITERIA = [
  { num: 1, name: 'CMS Star Rating', field: 'stars', threshold: '= 1 star', format: v => `${v} star${v !== 1 ? 's' : ''}`, barPct: v => (v / 5) * 100 },
  { num: 2, name: 'Total Staffing', field: 'total_hprd', threshold: '< 3.5 HPRD', format: v => `${v?.toFixed(2) || '—'} HPRD`, barPct: v => Math.min(100, (v / 5) * 100) },
  { num: 3, name: 'Zero RN Days', field: 'zero_rn_pct', threshold: '> 0%', format: v => `${v?.toFixed(1) || '0'}% of days`, barPct: v => Math.min(100, v * 2) },
  { num: 4, name: 'Health Deficiencies', field: 'total_deficiencies', threshold: '≥ 15', format: v => `${v} deficiencies`, barPct: v => Math.min(100, (v / 60) * 100) },
];

export function isHighRisk(facility) {
  return (
    facility.stars === 1 &&
    (facility.total_hprd || 0) < 3.5 &&
    (facility.zero_rn_pct || 0) > 0 &&
    (facility.total_deficiencies || 0) >= 15
  );
}

export default function FlagExplainer({ facility }) {
  const [open, setOpen] = useState(false);

  if (!isHighRisk(facility)) return null;

  return (
    <div className="flag-explainer">
      <button
        className="flag-explainer-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className="flag-explainer-toggle-left">
          <div className="flag-explainer-toggle-icon">!</div>
          <span className="flag-explainer-toggle-text">
            Why was this facility flagged? See the 4 federal data points
          </span>
        </div>
        <svg
          className={`flag-explainer-chevron${open ? ' open' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="flag-explainer-content">
          <div className="flag-explainer-intro">
            This facility meets <strong>all 4 criteria</strong> of our risk algorithm.
            Flags are based exclusively on CMS quality and staffing data — penalty
            history is not used as an input.{' '}
            <Link to="/methodology#scoring">Read the full methodology →</Link>
          </div>

          <div className="flag-criteria-grid">
            {FLAG_CRITERIA.map(c => {
              const val = facility[c.field] || 0;
              return (
                <div className="flag-criterion" key={c.num}>
                  <div className="flag-criterion-header">
                    <span className="flag-criterion-num">{c.num}</span>
                    <span className="flag-criterion-name">{c.name}</span>
                  </div>
                  <div className="flag-criterion-row">
                    <span className="flag-criterion-label">This facility</span>
                    <span className="flag-criterion-value fail">{c.format(val)}</span>
                  </div>
                  <div className="flag-criterion-row">
                    <span className="flag-criterion-label">Threshold</span>
                    <span className="flag-criterion-value threshold">{c.threshold}</span>
                  </div>
                  <div className="flag-criterion-bar">
                    <div
                      className="flag-criterion-bar-fill"
                      style={{ width: `${c.barPct(val)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flag-explainer-note">
            <strong>How this was validated:</strong> Facilities meeting all 4 criteria
            were 3.3x more likely to receive new CMS penalties in 2025
            (OR&nbsp;=&nbsp;3.32, 95%&nbsp;CI:&nbsp;2.90–3.80, p&nbsp;&lt;&nbsp;0.001).
            Penalty data was not used in the flagging criteria.{' '}
            <Link to="/methodology#validation">Read the validation study →</Link>
          </div>

          <div className="flag-explainer-footer">
            <span className="flag-explainer-source">
              Sources:{' '}
              <a href="https://www.medicare.gov/care-compare/" target="_blank" rel="noopener noreferrer">CMS Care Compare</a>
              {' · '}
              <a href="https://data.cms.gov/provider-data/topics/nursing-homes" target="_blank" rel="noopener noreferrer">CMS Provider Data</a>
              {' · '}
              <a href="https://data.cms.gov/provider-data/dataset/xcdc-v8bm" target="_blank" rel="noopener noreferrer">PBJ Staffing</a>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
