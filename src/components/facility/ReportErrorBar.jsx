import '../../styles/flag-explainer.css';

export default function ReportErrorBar({ facility }) {
  const ccn = facility?.ccn || '';
  const name = facility?.facility_name || '';
  const subject = encodeURIComponent(`Data Error Report - CCN ${ccn}`);
  const body = encodeURIComponent(
    `Facility Name: ${name}\nFacility CCN: ${ccn}\n\nMetric or data point in question:\n\nWhat you believe is correct:\n\nSource documentation (if available):`
  );

  return (
    <div className="report-error-bar">
      <svg className="report-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span className="report-error-text">
        Spot an error in this facility's data?{' '}
        <a href={`mailto:contact@oversightreports.com?subject=${subject}&body=${body}`}>
          Report it
        </a>
        {' — '}we investigate and correct verified errors within 48 hours.
      </span>
    </div>
  );
}
