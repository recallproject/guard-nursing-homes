import { useState } from 'react';
import { Link } from 'react-router-dom';
import { checkoutSingleReport } from '../utils/stripe';
import { formatMetricNumber } from '../utils/watchlistFacilities';
import { FREE_VS_PAID_COPY } from './facilityReportCopy';

function formatCurrency(amount) {
  if (!amount) return '$0';
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${Math.round(amount).toLocaleString()}`;
}

function renderStars(count) {
  const n = Math.max(0, Math.min(5, Number(count) || 0));
  return `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`;
}

function riskClass(score) {
  if (score >= 60) return 'wct-danger';
  if (score >= 40) return 'wct-warning';
  if (score >= 20) return 'wct-caution';
  return 'wct-good';
}

function metricRows(facility) {
  const score = Number(facility?.composite) || 0;
  const jeopardy = Number(facility?.jeopardy_count) || 0;
  return [
    { label: 'CMS Stars', value: renderStars(facility?.stars), className: '' },
    { label: 'Risk Score', value: formatMetricNumber(facility?.composite, 1), className: riskClass(score) },
    { label: 'Total Fines', value: formatCurrency(facility?.total_fines), className: '' },
    { label: 'Deficiencies', value: facility?.total_deficiencies || 0, className: '' },
    { label: 'Serious Harm', value: jeopardy, className: jeopardy > 0 ? 'wct-danger' : '' },
    { label: 'Total HPRD', value: formatMetricNumber(facility?.total_hprd, 2), className: '' },
    { label: 'RN Hours', value: formatMetricNumber(facility?.rn_hprd, 2), className: '' },
    { label: 'Beds', value: facility?.beds || '—', className: '' },
  ];
}

function CompareFacilityCtas({ facility }) {
  const [familyLoading, setFamilyLoading] = useState(false);
  const ccn = facility?.ccn || '';

  const downloadFamilyReport = () => {
    if (!facility || familyLoading) return;
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible('Free-PDF-Download', {
        props: {
          ccn,
          state: facility.state,
          report: 'family',
          placement: 'watchlist-compare',
          composite_score: String(facility.composite || ''),
        },
      });
    }
    setFamilyLoading(true);
    setTimeout(async () => {
      try {
        const { generatePDF } = await import('../utils/generatePDF');
        generatePDF(facility);
      } catch (err) {
        console.error('Family Report PDF failed:', err);
        alert('Failed to generate report. Please try again.');
      } finally {
        setFamilyLoading(false);
      }
    }, 100);
  };

  const buyFacilityBrief = () => {
    if (!ccn) {
      alert('This facility is missing a CMS ID, so checkout cannot start. Please try another facility or contact support.');
      return;
    }
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible('Facility-Brief-Checkout', {
        props: {
          ccn,
          state: facility.state,
          placement: 'watchlist-compare',
          composite_score: String(facility.composite || ''),
        },
      });
    }
    checkoutSingleReport(ccn);
  };

  return (
    <div className="watchlist-compare-ctas">
      <p className="watchlist-compare-ctas-line">
        <span>{FREE_VS_PAID_COPY.free}</span>
        <span aria-hidden="true"> · </span>
        <span>{FREE_VS_PAID_COPY.paid}</span>
      </p>
      <button
        type="button"
        className="watchlist-compare-cta watchlist-compare-cta--free"
        onClick={downloadFamilyReport}
        disabled={familyLoading}
        aria-label={`Download Family Report (Free) for ${facility.name}`}
      >
        {familyLoading ? 'Generating…' : 'Download Family Report (Free)'}
      </button>
      <button
        type="button"
        className="watchlist-compare-cta watchlist-compare-cta--paid"
        onClick={buyFacilityBrief}
        aria-label={`Buy Facility Brief ($29) for ${facility.name}`}
      >
        Buy Facility Brief ($29)
      </button>
      <Link to={`/facility/${ccn}`} className="watchlist-compare-cta watchlist-compare-cta--link">
        View Full Report
      </Link>
    </div>
  );
}

export function WatchlistCompareView({ facilities, onChangeHomes }) {
  if (!facilities?.length) return null;

  return (
    <div className="watchlist-compare-view" id="compare-results">
      <div className="watchlist-compare-view-head">
        <h2 className="watchlist-compare-title">Side-by-side comparison</h2>
        <p className="watchlist-compare-lede">
          Same public CMS facts for each home you favorited. Download a free 1-page snapshot or a $29 Facility Brief when you want a copy to share.
        </p>
        {onChangeHomes && (
          <button type="button" className="watchlist-compare-change" onClick={onChangeHomes}>
            Change which homes
          </button>
        )}
      </div>

      <div className="watchlist-compare-cards" aria-label="Facility comparison cards">
        <p className="watchlist-compare-cards-cue">
          Same metrics for each home — scroll down to compare.
        </p>
        {facilities.map((facility) => (
          <article key={facility.ccn} className="watchlist-compare-card">
            <header className="watchlist-compare-card-head">
              <h3 className="watchlist-compare-card-name">{facility.name}</h3>
              <p className="watchlist-compare-card-meta">
                {facility.city}, {facility.state}
              </p>
            </header>
            <dl className="watchlist-compare-card-metrics">
              {metricRows(facility).map((row) => (
                <div key={row.label} className="watchlist-compare-card-row">
                  <dt>{row.label}</dt>
                  <dd className={row.className}>{row.value}</dd>
                </div>
              ))}
            </dl>
            <CompareFacilityCtas facility={facility} />
          </article>
        ))}
      </div>

      <div className="watchlist-compare-table-panel">
        <p className="watchlist-compare-scroll-cue" aria-hidden="true">
          Swipe or scroll sideways to see the next home →
        </p>
        <div className="watchlist-compare-table-wrap">
          <table className="watchlist-compare-table">
            <caption className="sr-only">Side-by-side facility comparison</caption>
            <thead>
              <tr>
                <th scope="col">Metric</th>
                {facilities.map((f) => (
                  <th key={f.ccn} scope="col">
                    {f.name}
                    <br />
                    <span className="wct-meta">{f.city}, {f.state}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricRows(facilities[0]).map((row, rowIdx) => (
                <tr key={row.label}>
                  <th className="wct-label" scope="row">{row.label}</th>
                  {facilities.map((f) => {
                    const cell = metricRows(f)[rowIdx];
                    return (
                      <td key={f.ccn} className={cell.className}>{cell.value}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="watchlist-compare-table-ctas">
          {facilities.map((facility) => (
            <div key={facility.ccn} className="watchlist-compare-table-cta-col">
              <p className="watchlist-compare-table-cta-name">{facility.name}</p>
              <CompareFacilityCtas facility={facility} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
