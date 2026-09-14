import { Link } from 'react-router-dom';

const SAMPLE_PDF = '/samples/OversightReport_Sample_Evidence_Report.pdf';

function StarIcon({ fill, index }) {
  const clipId = `pa-preview-star-${index}`;
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={20 * fill} height="20" />
        </clipPath>
      </defs>
      <path
        d="M10 1.8l2.3 4.7 5.2.8-3.8 3.6.9 5.2L10 13.7 5.4 16.1l.9-5.2L2.5 7.3l5.2-.8L10 1.8z"
        fill="#CBD5E1"
      />
      <path
        d="M10 1.8l2.3 4.7 5.2.8-3.8 3.6.9 5.2L10 13.7 5.4 16.1l.9-5.2L2.5 7.3l5.2-.8L10 1.8z"
        fill="#1D3557"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}

function StarRow({ value }) {
  return (
    <span className="pa-preview-stars" aria-label={`${value} out of 5 CMS stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <StarIcon key={i} index={i} fill={Math.min(1, Math.max(0, value - i))} />
      ))}
    </span>
  );
}

function RiskDonut({ score }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="pa-preview-donut" aria-label={`Risk score ${score} out of 100`}>
      <svg viewBox="0 0 88 88" width="88" height="88" aria-hidden="true">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="#E8EDF2" strokeWidth="9" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="#E07A3D"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
        />
      </svg>
      <div className="pa-preview-donut-label">
        <span className="pa-preview-donut-score">{score}</span>
        <span className="pa-preview-donut-caption">Risk score</span>
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

      <div className="pa-preview-callout pa-preview-callout--map">
        <strong>Ownership map</strong>
        <span>Chain + PE flags visible</span>
      </div>

      <div className="pa-preview-card">
        <div className="pa-preview-header">Facility report preview</div>
        <div className="pa-preview-body">
          <p className="pa-preview-name">Sunrise Care Center</p>
          <p className="pa-preview-meta">Austin, TX · 128 beds · For-profit</p>

          <div className="pa-preview-metrics">
            <RiskDonut score={42} />
            <ul className="pa-preview-rows">
              <li>
                <span>CMS stars</span>
                <StarRow value={3.5} />
              </li>
              <li>
                <span>Staffing</span>
                <strong>Below avg</strong>
              </li>
              <li>
                <span>Deficiencies</span>
                <strong>8 open</strong>
              </li>
              <li>
                <span>Ownership</span>
                <strong>Mapped</strong>
              </li>
            </ul>
          </div>

          <div className="pa-preview-actions">
            <div className="pa-preview-callout pa-preview-callout--citations">
              <strong>3 health citations</strong>
              <span>Last 12 months</span>
            </div>
            <Link to="/evidence-sample" className="pa-preview-btn pa-preview-btn--primary">
              View full report
            </Link>
            <a
              href={SAMPLE_PDF}
              target="_blank"
              rel="noopener noreferrer"
              className="pa-preview-btn pa-preview-btn--ghost"
            >
              Download PDF
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
