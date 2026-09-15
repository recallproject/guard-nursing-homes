import { Link } from 'react-router-dom';
import { POPULAR_SNF_STATES, SNF_WATCHLIST_COUNTS, STATE_NAME } from '../data/careSettings';

export function PopularStatesGrid({
  setting,
  rows = [],
  popularAbbrs = POPULAR_SNF_STATES,
  showWatchlist = false,
  expanded = false,
  onExpand,
}) {
  const byCode = Object.fromEntries((rows || []).map((r) => [r.state || r.abbr, r]));
  const popular = popularAbbrs
    .map((abbr) => {
      const row = byCode[abbr] || {};
      return {
        abbr,
        count: row.count ?? row.facilities ?? 0,
        watchlist: showWatchlist ? SNF_WATCHLIST_COUNTS[abbr] : row.watchlist || row.flagged_count,
      };
    })
    .filter((s) => s.abbr);

  const rest = expanded
    ? (rows || [])
        .map((r) => ({
          abbr: r.state || r.abbr,
          count: r.count ?? 0,
          watchlist: showWatchlist ? SNF_WATCHLIST_COUNTS[r.state || r.abbr] : r.flagged_count,
        }))
        .filter((s) => s.abbr && !popularAbbrs.includes(s.abbr))
        .sort((a, b) => a.abbr.localeCompare(b.abbr))
    : [];

  const cards = [...popular, ...rest];

  return (
    <div className="ia-state-grid" id="browse-states">
      {cards.map((s) => (
        <Link
          key={s.abbr}
          to={setting.statePath(s.abbr)}
          className="ia-state-card"
        >
          <div className="ia-state-ab">{s.abbr}</div>
          <div className="ia-state-ct">
            {Number(s.count || 0).toLocaleString('en-US')} {Number(s.count) === 1 ? 'facility' : 'facilities'}
          </div>
          {s.watchlist > 0 && (
            <div className="ia-state-note">
              {s.watchlist} on CMS watchlist
            </div>
          )}
          <span className="ia-sr-only">
            {STATE_NAME[s.abbr] || s.abbr} {setting.familyLabel.toLowerCase()}
          </span>
        </Link>
      ))}
      {!expanded && (
        <button type="button" className="ia-state-card ia-state-card--all" onClick={onExpand}>
          <div className="ia-state-ab">All 50 →</div>
          <div className="ia-state-ct">Browse every state</div>
        </button>
      )}
    </div>
  );
}
