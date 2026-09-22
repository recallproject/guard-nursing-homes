import { Link } from 'react-router-dom';
import { useWatchlist } from '../hooks/useWatchlist';
import { hasAbuseFlag } from '../utils/facilityFlags';
import { formerNamesLabel, sffStatusOf } from '../utils/sffStatus';

function formatFines(amount) {
  if (!amount) return null;
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

function StarRow({ stars }) {
  const n = Math.max(0, Math.min(5, Number(stars) || 0));
  const filled = Math.round(n);
  return (
    <span className="ia-stars" aria-label={`${filled} out of 5 stars`}>
      {'★'.repeat(filled)}{'☆'.repeat(5 - filled)} {filled}/5
    </span>
  );
}

function titleCity(city) {
  if (!city) return '';
  return String(city)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function FacilityResultCard({
  facility,
  viewTo,
  compareSelected,
  onToggleCompare,
  compareFull = false,
}) {
  const { addFacility, removeFacility, isWatched } = useWatchlist();
  const watched = isWatched(facility.ccn);
  const sffStatus = sffStatusOf(facility);
  const sff = sffStatus === 'active';
  const sffCandidate = sffStatus === 'candidate';
  const abuse = hasAbuseFlag(facility);
  const aboveStaffing = (facility.total_hprd || 0) >= 4 || (facility.staffing_stars || 0) >= 4;
  const fines = formatFines(facility.total_fines);
  const compareBlocked = compareFull && !compareSelected;

  function handleSave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (watched) removeFacility(facility.ccn);
    else addFacility(facility.ccn, facility.name);
  }

  function handleCompare(e) {
    e.preventDefault();
    e.stopPropagation();
    if (compareBlocked) return;
    onToggleCompare?.(facility);
  }

  return (
    <article className="ia-fac">
      <div className="ia-fac-main">
        <h3 className="ia-fac-name">
          <Link to={viewTo}>{facility.name}</Link>
          {sff && <span className="ia-badge">SFF</span>}
          {sffCandidate && <span className="ia-badge">SFF candidate</span>}
          {abuse && <span className="ia-badge">Abuse icon</span>}
          {!sff && !abuse && aboveStaffing && (
            <span className="ia-badge ia-badge--ok">Above avg staffing</span>
          )}
        </h3>
        <p className="ia-fac-bits">
          {titleCity(facility.city)}
          {facility.ccn ? ` · CCN ${facility.ccn}` : ''}
          {facility.stars != null && (
            <>
              {' · '}
              <StarRow stars={facility.stars} />
            </>
          )}
          {facility.jeopardy_count > 0 ? ` · ${facility.jeopardy_count} IJ` : ''}
          {fines ? ` · ${fines} fines` : ''}
          {facility.rn_hprd != null ? ` · RN ${Number(facility.rn_hprd).toFixed(2)} HPRD` : ''}
          {formerNamesLabel(facility) ? ` · ${formerNamesLabel(facility)}` : ''}
        </p>
      </div>
      <div className="ia-fac-actions">
        <button
          type="button"
          className={`ia-btn ${watched ? 'ia-btn--on' : ''}`}
          onClick={handleSave}
          aria-pressed={watched}
          aria-label={watched ? `Remove ${facility.name} from saved homes` : `Save ${facility.name} to your shortlist`}
        >
          {watched ? 'Saved' : 'Save'}
        </button>
        <button
          type="button"
          className={`ia-btn ${compareSelected ? 'ia-btn--on' : ''}`}
          onClick={handleCompare}
          aria-pressed={!!compareSelected}
          disabled={compareBlocked}
          title={compareBlocked ? 'Compare is full (3 of 3). Remove a home first.' : 'Add this home to a 2–3 home comparison'}
          aria-label={
            compareSelected
              ? `Remove ${facility.name} from compare`
              : `Add ${facility.name} to compare`
          }
        >
          {compareSelected ? 'In compare' : 'Add to compare'}
        </button>
        <Link to={viewTo} className="ia-fac-view">
          View report
        </Link>
      </div>
    </article>
  );
}
