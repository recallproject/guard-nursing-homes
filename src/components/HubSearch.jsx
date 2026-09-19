import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CARE_SETTINGS, getCareSetting } from '../data/careSettings';
import { buildSettingSearchPath } from '../utils/parseWhere';
import { watchlistComparePath } from '../utils/watchlistCompare';

let cachedSearchIndex = null;

async function loadSearchIndex() {
  if (cachedSearchIndex) return cachedSearchIndex;
  try {
    const res = await fetch('/data/search-index.json');
    if (!res.ok) return null;
    cachedSearchIndex = await res.json();
    return cachedSearchIndex;
  } catch {
    return null;
  }
}

export function CareTypeChip({ setting, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`ia-chip ${selected ? 'ia-chip--on' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(setting.id)}
    >
      <span className="ia-chip-label">{setting.familyLabel}</span>
      {setting.nerdLabel ? (
        <span className="ia-chip-nerd">{setting.nerdLabel}</span>
      ) : null}
    </button>
  );
}

export function HubSearch({
  initialSettingId = 'snf',
  lockSetting = false,
  compact = false,
  defaultWhere = '',
  defaultName = '',
}) {
  const navigate = useNavigate();
  const whereId = useId();
  const nameId = useId();
  const [settingId, setSettingId] = useState(initialSettingId);
  const [where, setWhere] = useState(defaultWhere);
  const [name, setName] = useState(defaultName);
  const whereRef = useRef(null);
  const setting = getCareSetting(settingId) || getCareSetting('snf');

  useEffect(() => {
    setSettingId(initialSettingId);
  }, [initialSettingId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const index = await loadSearchIndex();
    const path = buildSettingSearchPath(setting, { where, name }, index);
    navigate(path);
  }

  const browseLabel = `Browse ${setting.familyLabel.toLowerCase()} by state`;

  return (
    <form className={`ia-search-card ${compact ? 'ia-search-card--compact' : ''}`} onSubmit={handleSubmit}>
      {!lockSetting && (
        <div className="ia-chips" role="group" aria-label="Care type">
          {CARE_SETTINGS.map((s) => (
            <CareTypeChip
              key={s.id}
              setting={s}
              selected={s.id === settingId}
              onSelect={setSettingId}
            />
          ))}
        </div>
      )}

      <div className="ia-fields">
        <label className="ia-field" htmlFor={whereId}>
          <span className="ia-field-lbl">{setting.searchWhereLabel}</span>
          <input
            id={whereId}
            ref={whereRef}
            className="ia-field-input"
            type="search"
            name="where"
            autoComplete="off"
            placeholder="Overton, TX or 75684"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
          />
        </label>
        <label className="ia-field" htmlFor={nameId}>
          <span className="ia-field-lbl">{setting.searchNameLabel}</span>
          <input
            id={nameId}
            className="ia-field-input"
            type="search"
            name="name"
            autoComplete="off"
            placeholder={compact ? setting.searchNamePlaceholder(null) : setting.hubNamePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button type="submit" className="ia-go">
          Search
        </button>
      </div>

      {!compact && (
        <p className="ia-browse-row">
          or{' '}
          <Link to={`${setting.route}#browse-states`}>{browseLabel}</Link>
          {' · '}
          <Link to={watchlistComparePath()}>Compare your favorites</Link>
        </p>
      )}
    </form>
  );
}
