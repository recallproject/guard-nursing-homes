import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateComparisonPDF } from '../utils/generateComparisonPDF';
import { checkoutSingleReport } from '../utils/stripe';
import { FREE_VS_PAID_COPY } from './facilityReportCopy';
import { CMS_SNF_AS_OF_ISO } from '../data/careSettings';
import {
  cellValue,
  DETAIL_GROUPS,
  FIRST_VIEW_ROWS,
  freshnessLabel,
} from '../utils/compareMetrics';
import { useWatchlist } from '../hooks/useWatchlist';
import { useCompareTray } from '../hooks/useCompareTray';

function MetricSheet({ row, onClose }) {
  if (!row) return null;
  return (
    <div className="wcg-sheet-overlay" onClick={onClose} role="presentation">
      <div
        className="wcg-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wcg-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="wcg-sheet-title">{row.label}</h3>
        <p className="wcg-dir">{row.direction}</p>
        <p>{row.why}</p>
        <p className="wcg-sheet-source">
          Source: CMS Care Compare / Provider Data Catalog.{' '}
          <a href="https://www.medicare.gov/care-compare/" target="_blank" rel="noopener noreferrer">
            Verify on Medicare
          </a>
        </p>
        <button type="button" className="watchlist-compare-cta watchlist-compare-cta--link" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
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
        View full report
      </Link>
    </div>
  );
}

function CompareGrid({ facilities, rows, onExplain }) {
  return (
    <div
      className="wcg-wrap"
      style={{ '--compare-count': facilities.length }}
    >
      {facilities.length > 2 && (
        <p className="watchlist-compare-scroll-cue" aria-hidden="true">
          Swipe to see the next home →
        </p>
      )}
      <div className="wcg" role="table" aria-label="Side-by-side facility comparison">
        <div className="wcg-corner" role="columnheader">Metric</div>
        {facilities.map((facility) => (
          <div key={facility.ccn} className="wcg-head" role="columnheader">
            <div className="wcg-head-name">{facility.name}</div>
            <div className="wcg-head-meta">{facility.city}, {facility.state}</div>
          </div>
        ))}
        {rows.map((row) => (
          <CompareRow key={row.id} row={row} facilities={facilities} onExplain={onExplain} />
        ))}
      </div>
    </div>
  );
}

function CompareRow({ row, facilities, onExplain }) {
  return (
    <>
      <div className="wcg-label" role="rowheader">
        <button type="button" className="wcg-label-btn" onClick={() => onExplain(row)}>
          <span>{row.label}</span>
          <span className="wcg-dir">{row.direction}</span>
        </button>
      </div>
      {facilities.map((facility) => (
        <div key={`${row.id}-${facility.ccn}`} className="wcg-cell" role="cell">
          {cellValue(row, facility)}
        </div>
      ))}
    </>
  );
}

export function WatchlistCompareView({ facilities, onChangeHomes, dataAsOf = CMS_SNF_AS_OF_ISO }) {
  const { isWatched, addFacility, removeFacility } = useWatchlist();
  const { remove } = useCompareTray();
  const [openGroups, setOpenGroups] = useState(() => new Set());
  const [sheetRow, setSheetRow] = useState(null);
  const [snapLoading, setSnapLoading] = useState(false);
  const homes = useMemo(() => (facilities || []).filter(Boolean).slice(0, 3), [facilities]);

  if (!homes.length) return null;

  const asOf = freshnessLabel(dataAsOf);
  const count = homes.length;

  const downloadComparison = () => {
    if (snapLoading) return;
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible('Free-PDF-Download', {
        props: {
          report: 'compare-snapshot',
          placement: 'watchlist-compare',
          count: String(count),
        },
      });
    }
    setSnapLoading(true);
    setTimeout(() => {
      try {
        generateComparisonPDF(homes, { dataAsOf });
      } catch (err) {
        console.error('Comparison PDF failed:', err);
        alert('Failed to generate comparison. Please try again.');
      } finally {
        setSnapLoading(false);
      }
    }, 100);
  };

  const toggleGroup = (id) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="watchlist-compare-view" id="compare-results">
      <div className="watchlist-compare-view-head">
        <h2 className="watchlist-compare-title">Side-by-side comparison</h2>
        <p className="watchlist-compare-lede">
          Same public CMS facts for {count} home{count === 1 ? '' : 's'}. Updated {asOf}.
          Saving a home is separate from this comparison.
        </p>
        <p className="watchlist-compare-fresh">
          CMS data as of {asOf} ·{' '}
          <a href="https://data.cms.gov/provider-data/topics/nursing-homes" target="_blank" rel="noopener noreferrer">
            Source: CMS Provider Data Catalog
          </a>
        </p>
        {onChangeHomes && (
          <button type="button" className="watchlist-compare-change" onClick={onChangeHomes}>
            Change which homes
          </button>
        )}
      </div>

      <div className="wcg-head-actions">
        {homes.map((facility) => {
          const saved = isWatched(facility.ccn);
          return (
            <div key={facility.ccn} className="wcg-head-action">
              <button
                type="button"
                className={`watchlist-compare-check${saved ? ' watchlist-compare-check--on' : ''}`}
                onClick={() => (saved ? removeFacility(facility.ccn) : addFacility(facility.ccn, facility.name))}
              >
                {saved ? 'Saved' : 'Save'}
              </button>
              <button
                type="button"
                className="watchlist-compare-check"
                onClick={() => remove(facility.ccn)}
                aria-label={`Remove ${facility.name} from compare`}
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      <CompareGrid facilities={homes} rows={FIRST_VIEW_ROWS} onExplain={setSheetRow} />

      <div className="wcg-accordions">
        {DETAIL_GROUPS.map((group) => {
          const open = openGroups.has(group.id);
          return (
            <section key={group.id} className="wcg-acc">
              <button
                type="button"
                className="wcg-acc-head"
                aria-expanded={open}
                onClick={() => toggleGroup(group.id)}
              >
                <span>
                  <strong>{group.title}</strong>
                  <span className="wcg-acc-blurb">{group.blurb}</span>
                </span>
                <span className="wcg-acc-count">
                  {group.rows.length} more measure{group.rows.length === 1 ? '' : 's'}
                </span>
              </button>
              {open && (
                <CompareGrid facilities={homes} rows={group.rows} onExplain={setSheetRow} />
              )}
            </section>
          );
        })}
      </div>

      <div className="watchlist-compare-briefs" id="compare-briefs">
        <p className="watchlist-compare-upgrade">
          Want help deciding what to ask on a tour? Get the paid family brief ($29 per home).
          Includes a plain-language packet, questions tailored to the home, and a visit worksheet.
          The free comparison stays available.
        </p>
        <div className="watchlist-compare-table-ctas">
          {homes.map((facility) => (
            <div key={facility.ccn} className="watchlist-compare-table-cta-col">
              <p className="watchlist-compare-table-cta-name">{facility.name}</p>
              <CompareFacilityCtas facility={facility} />
            </div>
          ))}
        </div>
      </div>

      <div className="watchlist-compare-actionbar">
        <button
          type="button"
          className="watchlist-compare-cta watchlist-compare-cta--free"
          onClick={downloadComparison}
          disabled={snapLoading}
        >
          {snapLoading ? 'Generating…' : `Download my ${count}-home comparison`}
        </button>
        <a className="watchlist-compare-actionbar-paid" href="#compare-briefs">
          Get a $29 Facility Brief
        </a>
      </div>

      <MetricSheet row={sheetRow} onClose={() => setSheetRow(null)} />
    </div>
  );
}
