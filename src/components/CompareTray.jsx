import { Link } from 'react-router-dom';
import { useCompareTray } from '../hooks/useCompareTray';
import { watchlistComparePath } from '../utils/watchlistCompare';
import '../styles/compare-tray.css';

export function CompareTray({ compact = false, docked = false }) {
  const { items, count, max, remove, capNotice, dismissCapNotice } = useCompareTray();

  if (count === 0 && !capNotice) return null;

  const ready = count >= 2;
  const compareTo = watchlistComparePath({ ccns: items.map((item) => item.ccn) });

  return (
    <aside
      className={`compare-tray${compact ? ' compare-tray--compact' : ''}${docked ? ' compare-tray--docked' : ''}`}
      aria-label="Homes to compare"
    >
      <div className="compare-tray__top">
        <p className="compare-tray__count">
          <strong>{count} of {max}</strong>
          <span> in compare</span>
        </p>
        {capNotice && (
          <p className="compare-tray__cap" role="status">
            Compare is full ({max} of {max}). Remove a home to add another.
            <button type="button" className="compare-tray__dismiss" onClick={dismissCapNotice}>
              Dismiss
            </button>
          </p>
        )}
      </div>

      {count > 0 && (
        <ul className="compare-tray__list">
          {items.map((item) => (
            <li key={item.ccn} className="compare-tray__chip">
              <span className="compare-tray__name">{item.name}</span>
              {(item.city || item.state) && (
                <span className="compare-tray__meta">
                  {[item.city, item.state].filter(Boolean).join(', ')}
                </span>
              )}
              <button
                type="button"
                className="compare-tray__remove"
                onClick={() => remove(item.ccn)}
                aria-label={`Remove ${item.name} from compare`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="compare-tray__actions">
        {ready ? (
          <Link to={compareTo} className="compare-tray__cta">
            Compare now
          </Link>
        ) : (
          <button type="button" className="compare-tray__cta compare-tray__cta--disabled" disabled>
            {count === 1 ? 'Add 1 more to compare' : 'Add 2 homes to compare'}
          </button>
        )}
        <p className="compare-tray__hint">
          Saving a home does not add it here. Compare is a short list of {max}.
        </p>
      </div>
    </aside>
  );
}
