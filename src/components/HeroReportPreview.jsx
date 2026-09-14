import { Link } from 'react-router-dom';

const SAMPLE_PDF = '/samples/OversightReport_Sample_Evidence_Report.pdf';

function StarRow({ value }) {
  return (
    <span className="pa-preview-stars" aria-label={`${value} out of 5 CMS stars`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.min(1, Math.max(0, value - i));
        const clipId = `pa-v3-star-${i}`;
        return (
          <svg key={i} width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
            <defs>
              <clipPath id={clipId}>
                <rect x="0" y="0" width={20 * fill} height="20" />
              </clipPath>
            </defs>
            <path
              d="M10 1.8l2.3 4.7 5.2.8-3.8 3.6.9 5.2L10 13.7 5.4 16.1l.9-5.2L2.5 7.3l5.2-.8L10 1.8z"
              fill="#D7DEE8"
            />
            <path
              d="M10 1.8l2.3 4.7 5.2.8-3.8 3.6.9 5.2L10 13.7 5.4 16.1l.9-5.2L2.5 7.3l5.2-.8L10 1.8z"
              fill="#1D3557"
              clipPath={`url(#${clipId})`}
            />
          </svg>
        );
      })}
    </span>
  );
}

function RiskRing({ score }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);

  return (
    <div className="pa-preview-ring" aria-label={`Risk score ${score} out of 100`}>
      <svg viewBox="0 0 108 108" width="108" height="108" aria-hidden="true">
        <circle cx="54" cy="54" r={r} fill="none" stroke="#E8EDF2" strokeWidth="10" />
        <circle
          cx="54"
          cy="54"
          r={r}
          fill="none"
          stroke="#E07A3D"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 54 54)"
        />
      </svg>
      <div className="pa-preview-ring-label">
        <span className="pa-preview-ring-score">{score}</span>
        <span className="pa-preview-ring-caption">Risk score</span>
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
            <RiskRing score={42} />
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
