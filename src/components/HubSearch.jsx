import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CARE_SETTINGS, getCareSetting } from '../data/careSettings';
import { buildSettingSearchPath } from '../utils/parseWhere';
import { suggestFacilities, suggestLocations } from '../utils/searchSuggest';
import { watchlistComparePath } from '../utils/watchlistCompare';
import { SearchTypeahead } from './SearchTypeahead';

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
  const whereRef = useRef(null);
  const [settingId, setSettingId] = useState(initialSettingId);
  const [where, setWhere] = useState(defaultWhere);
  const [name, setName] = useState(defaultName);
  const [index, setIndex] = useState(cachedSearchIndex);
  const [indexStatus, setIndexStatus] = useState(cachedSearchIndex ? 'ready' : 'idle');
  const setting = getCareSetting(settingId) || getCareSetting('snf');

  useEffect(() => {
    setSettingId(initialSettingId);
  }, [initialSettingId]);

  const ensureIndex = useCallback(() => {
    if (cachedSearchIndex) {
      setIndex(cachedSearchIndex);
      setIndexStatus('ready');
      return;
    }
    setIndexStatus((status) => (status === 'ready' ? status : 'loading'));
    loadSearchIndex().then((data) => {
      setIndex(data);
      setIndexStatus(data ? 'ready' : 'error');
    });
  }, []);

  const whereSuggestions = useMemo(
    () => suggestLocations(index, where, { settingId }),
    [index, where, settingId]
  );
  const nameSuggestions = useMemo(
    () => suggestFacilities(index, name, { settingId, where }),
    [index, name, settingId, where]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const loaded = index || await loadSearchIndex();
    if (loaded && loaded !== index) setIndex(loaded);
    const path = buildSettingSearchPath(setting, { where, name }, loaded);
    navigate(path);
  }

  function pickFacility(item) {
    setName(item.value);
    if (!where.trim() && item.city && item.state) {
      setWhere(`${item.city}, ${item.state}`);
    }
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
        <SearchTypeahead
          id={whereId}
          inputRef={whereRef}
          label={setting.searchWhereLabel}
          name="where"
          placeholder="Overton, TX or 75684"
          value={where}
          onValueChange={setWhere}
          suggestions={whereSuggestions}
          loading={indexStatus === 'loading'}
          onFocusField={ensureIndex}
          onPick={(item) => setWhere(item.value)}
          resetKey={settingId}
          emptyText={indexStatus === 'error' ? 'Suggestions unavailable' : 'No matching cities, ZIPs, or states'}
        />
        <SearchTypeahead
          id={nameId}
          label={setting.searchNameLabel}
          name="name"
          placeholder={compact ? setting.searchNamePlaceholder(null) : setting.hubNamePlaceholder}
          value={name}
          onValueChange={setName}
          suggestions={nameSuggestions}
          loading={indexStatus === 'loading'}
          onFocusField={ensureIndex}
          onPick={pickFacility}
          resetKey={`${settingId}|${where}`}
          emptyText={indexStatus === 'error' ? 'Suggestions unavailable' : 'No matching facilities'}
        />
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
