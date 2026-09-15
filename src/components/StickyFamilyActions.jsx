import { Link } from 'react-router-dom';

/**
 * Sticky family actions: Search + Browse by state on hub/setting,
 * Filter + Compare on state lists. Never includes Ask a Clinician.
 */
export function StickyFamilyActions({
  primaryLabel = 'Search',
  secondaryLabel = 'Browse by state',
  onPrimary,
  onSecondary,
  secondaryTo,
  visible = true,
}) {
  if (!visible) return null;

  return (
    <div className="ia-sticky" role="region" aria-label="Quick actions">
      <button type="button" className="ia-sticky-btn ia-sticky-btn--primary" onClick={onPrimary}>
        {primaryLabel}
      </button>
      {secondaryTo ? (
        <Link to={secondaryTo} className="ia-sticky-btn ia-sticky-btn--secondary">
          {secondaryLabel}
        </Link>
      ) : (
        <button type="button" className="ia-sticky-btn ia-sticky-btn--secondary" onClick={onSecondary}>
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}
