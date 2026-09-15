import { Link } from 'react-router-dom';
import { useWatchlist } from '../hooks/useWatchlist';
import { hasSffFlag, hasAbuseFlag } from '../utils/facilityFlags';

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
}) {
  const { addFacility, removeFacility, isWatched } = useWatchlist();
  const watched = isWatched(facility.ccn);
  const sff = hasSffFlag(facility);
  const abuse = hasAbuseFlag(facility);
  const aboveStaffing = (facility.total_hprd || 0) >= 4 || (facility.staffing_stars || 0) >= 4;
  const fines = formatFines(facility.total_fines);

  function handleSave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (watched) removeFacility(facility.ccn);
    else addFacility(facility.ccn, facility.name);
  }

  function handleCompare(e) {
    e.preventDefault();
    e.stopPropagation();
    onToggleCompare?.(facility);
  }

  return (
    <article className="ia-fac">
      <div className="ia-fac-main">
        <h3 className="ia-fac-name">
          <Link to={viewTo}>{facility.name}</Link>
          {sff && <span className="ia-badge">SFF</span>}
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
        </p>
      </div>
      <div className="ia-fac-actions">
        <button
          type="button"
          className={`ia-btn ${watched ? 'ia-btn--on' : ''}`}
          onClick={handleSave}
          aria-pressed={watched}
        >
          {watched ? 'Favorited' : 'Favorite'}
        </button>
        <button
          type="button"
          className={`ia-btn ${compareSelected ? 'ia-btn--on' : ''}`}
          onClick={handleCompare}
          aria-pressed={!!compareSelected}
        >
          Compare
        </button>
        <Link to={viewTo} className="ia-btn ia-btn--primary">
          View
        </Link>
      </div>
    </article>
  );
}
