import { Link } from 'react-router-dom';

const SAMPLE_PDF = '/samples/OversightReport_Sample_Evidence_Report.pdf';

function Icon({ name }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  if (name === 'pin') {
    return (
      <svg {...common}>
        <path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.2" />
      </svg>
    );
  }
  if (name === 'clipboard') {
    return (
      <svg {...common}>
        <rect x="6" y="4" width="12" height="16" rx="2" />
        <path d="M9 4.5h6M9 10h6M9 14h4" />
      </svg>
    );
  }
  if (name === 'staff') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 19a7 7 0 0 1 14 0" />
      </svg>
    );
  }
  if (name === 'alert') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16.5h.01" />
      </svg>
    );
  }
  if (name === 'lock') {
    return (
      <svg {...common}>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  if (name === 'doc') {
    return (
      <svg {...common}>
        <path d="M8 3h7l5 5v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
        <path d="M15 3v5h5M9 13h6M9 17h4" />
      </svg>
    );
  }
  if (name === 'download') {
    return (
      <svg {...common}>
        <path d="M12 4v12M7 12l5 5 5-5M5 20h14" />
      </svg>
    );
  }
  if (name === 'arrow') {
    return (
      <svg {...common}>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    );
  }
  return null;
}

function StarRow({ filled }) {
  return (
    <span className="pa-preview-stars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 20 20">
          <path
            d="M10 1.8l2.3 4.7 5.2.8-3.8 3.6.9 5.2L10 13.7 5.4 16.1l.9-5.2L2.5 7.3l5.2-.8L10 1.8z"
            fill={i < filled ? '#1D3557' : '#D7DEE8'}
          />
        </svg>
      ))}
    </span>
  );
}

function RiskGauge({ score }) {
  const r = 78;
  const cx = 110;
  const cy = 104;
  const arcLen = Math.PI * r;
  const filled = (score / 100) * arcLen;
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div className="pa-preview-gauge" aria-label={`Risk score ${score} out of 100, moderate risk`}>
      <svg viewBox="0 0 220 138" width="220" height="138" aria-hidden="true">
        <path d={d} fill="none" stroke="#E6EBF2" strokeWidth="14" strokeLinecap="round" />
        <path
          d={d}
          fill="none"
          stroke="#E8A317"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${arcLen}`}
        />
      </svg>
      <div className="pa-preview-gauge-label">
        <span className="pa-preview-gauge-score">{score}</span>
        <span className="pa-preview-gauge-caption">Risk Score</span>
        <span className="pa-preview-gauge-level">Moderate Risk</span>
      </div>
    </div>
  );
}

export default function HeroReportPreview() {
  return (
    <aside className="pa-preview" aria-label="Sample facility report preview">
      <p className="sr-only">
        Illustrative sample. Buttons open an existing sample report, not a live facility.
      </p>

      <div className="pa-preview-card">
        <div className="pa-preview-header">
          <span>Facility report preview</span>
          <span className="pa-preview-sample">Sample</span>
        </div>

        <div className="pa-preview-body">
          <p className="pa-preview-name">Sunrise Care Center</p>
          <p className="pa-preview-meta">
            <Icon name="pin" />
            <span>Austin, TX</span>
            <span className="pa-preview-dot" aria-hidden="true">·</span>
            <span>Provider ID: 675432</span>
          </p>

          <RiskGauge score={42} />

          <ul className="pa-preview-rows">
            <li>
              <span className="pa-preview-row-label">
                <Icon name="clipboard" />
                CMS Overall Stars
              </span>
              <span className="pa-preview-row-value">2/5</span>
              <StarRow filled={2} />
            </li>
            <li>
              <span className="pa-preview-row-label">
                <Icon name="staff" />
                Staffing
              </span>
              <span className="pa-preview-row-value">Below avg</span>
              <span className="pa-preview-tag pa-preview-tag--danger">Below avg</span>
            </li>
            <li>
              <span className="pa-preview-row-label">
                <Icon name="alert" />
                Deficiencies
              </span>
              <span className="pa-preview-row-value">8 open</span>
              <span className="pa-preview-tag pa-preview-tag--warn">8 open</span>
            </li>
            <li>
              <span className="pa-preview-row-label">
                <Icon name="lock" />
                Ownership
              </span>
              <span className="pa-preview-row-value">Mapped</span>
              <span className="pa-preview-tag pa-preview-tag--ok">Mapped</span>
            </li>
          </ul>

          <div className="pa-preview-actions">
            <Link to="/evidence-sample" className="pa-preview-btn pa-preview-btn--primary">
              View full report
              <Icon name="arrow" />
            </Link>
            <a
              href={SAMPLE_PDF}
              target="_blank"
              rel="noopener noreferrer"
              className="pa-preview-btn pa-preview-btn--ghost"
            >
              <Icon name="download" />
              Download PDF
            </a>
          </div>
        </div>
      </div>

      <div className="pa-preview-float" aria-hidden="true">
        <div className="pa-preview-chip">
          <Icon name="pin" />
          Ownership map
        </div>
        <div className="pa-preview-chip">
          <Icon name="doc" />
          3 health citations
        </div>
      </div>
    </aside>
  );
}
