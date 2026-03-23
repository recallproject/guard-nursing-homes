import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { track } from '../../utils/analytics';
import '../../styles/antipsychotic-alert.css';

// Module-level cache so we only fetch once across all facility pages
let _cache = null;
let _fetchPromise = null;

export function fetchAlertData() {
  if (_cache) return Promise.resolve(_cache);
  if (_fetchPromise) return _fetchPromise;
  _fetchPromise = fetch('/data/antipsychotic_alerts.json')
    .then(r => {
      if (!r.ok) return null;
      return r.json();
    })
    .then(data => {
      _cache = data;
      return data;
    })
    .catch(() => {
      _fetchPromise = null; // allow retry on error
      return null;
    });
  return _fetchPromise;
}

const RISK_STYLES = {
  elevated: { className: 'ap-alert--elevated', label: 'Elevated' },
  high:     { className: 'ap-alert--high',     label: 'High' },
  critical: { className: 'ap-alert--critical',  label: 'Critical' },
};

export default function AntipsychoticAlert({ ccn }) {
  const [alert, setAlert] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const trackedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchAlertData().then(data => {
      if (cancelled) return;
      if (data && data[ccn]) {
        setAlert(data[ccn]);
      }
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [ccn]);

  // Track view once per mount when alert renders
  useEffect(() => {
    if (alert && !trackedRef.current) {
      trackedRef.current = true;
      track('antipsychotic_alert_viewed', {
        ccn,
        risk_level: alert.risk_level,
        rate: alert.rate,
      });
      if (window.plausible) {
        window.plausible('antipsychotic_alert_viewed', {
          props: { ccn, risk_level: alert.risk_level },
        });
      }
    }
  }, [alert, ccn]);

  // Nothing to show: data missing, still loading, or no alert for this facility
  if (!loaded || !alert) return null;

  const risk = RISK_STYLES[alert.risk_level] || RISK_STYLES.elevated;
  const riskFactors = alert.risk_factors || [];
  const rate = alert.rate != null ? alert.rate : null;

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      track('antipsychotic_alert_expanded', { ccn, risk_level: alert.risk_level });
      if (window.plausible) {
        window.plausible('antipsychotic_alert_expanded', {
          props: { ccn, risk_level: alert.risk_level },
        });
      }
    }
  };

  return (
    <div className={`ap-alert ${risk.className}`} role="alert">
      <button
        className="ap-alert-header"
        onClick={handleToggle}
        aria-expanded={expanded}
        type="button"
      >
        <span className="ap-alert-icon" aria-hidden="true">&#9888;</span>
        <span className="ap-alert-title">
          Antipsychotic Alert &mdash; {risk.label}
        </span>
        <svg
          className={`ap-alert-chevron${expanded ? ' open' : ''}`}
          width="18" height="18" viewBox="0 0 20 20"
          fill="none" xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="ap-alert-summary">
        {rate != null && (
          <p>
            This facility's antipsychotic medication rate is <strong>{rate}%</strong>,
            compared to the national average of 14.6%.
            {' '}This may indicate a pattern that warrants further review.
          </p>
        )}
      </div>

      {expanded && (
        <div className="ap-alert-details">
          {riskFactors.length > 0 && (
            <>
              <p className="ap-alert-factors-label">Contributing factors identified:</p>
              <ul className="ap-alert-factors">
                {riskFactors.map((factor, i) => (
                  <li key={i}>{factor}</li>
                ))}
              </ul>
            </>
          )}
          <p className="ap-alert-methodology">
            <Link to="/methodology">
              Learn more about antipsychotic use in nursing homes &rarr;
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
