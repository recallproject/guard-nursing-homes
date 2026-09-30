import { useEffect, useId, useRef, useState } from 'react';

/**
 * Combobox for one hub-search field. Enter picks a highlighted option.
 * Enter with nothing highlighted leaves the form free to submit.
 */
export function SearchTypeahead({
  id,
  label,
  name,
  placeholder,
  value,
  onValueChange,
  suggestions,
  loading = false,
  onPick,
  onFocusField,
  inputRef,
  resetKey = '',
  emptyText = 'No matches',
}) {
  const reactId = useId().replace(/:/g, '');
  const listId = `${reactId}-list`;
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = String(value || '');
  const resetToken = `${query}\0${resetKey}`;
  const [seenReset, setSeenReset] = useState(resetToken);
  if (seenReset !== resetToken) {
    setSeenReset(resetToken);
    setActiveIndex(-1);
  }
  const showSuggestions = query.trim().length >= 2;
  const optionCount = suggestions.length;
  const safeIndex = activeIndex >= 0 && activeIndex < optionCount ? activeIndex : -1;

  useEffect(() => {
    if (safeIndex < 0) return undefined;
    const el = document.getElementById(`${listId}-opt-${safeIndex}`);
    el?.scrollIntoView({ block: 'nearest' });
    return undefined;
  }, [safeIndex, listId]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  function pick(item) {
    setOpen(false);
    setActiveIndex(-1);
    onPick(item);
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown') {
      if (!showSuggestions || optionCount === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        const base = current >= optionCount ? -1 : current;
        return Math.min(base + 1, optionCount - 1);
      });
      return;
    }
    if (event.key === 'ArrowUp') {
      if (!showSuggestions || optionCount === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.max(current - 1, -1));
      return;
    }
    if (event.key === 'Enter') {
      if (open && safeIndex >= 0 && suggestions[safeIndex]) {
        event.preventDefault();
        pick(suggestions[safeIndex]);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (open) {
        event.stopPropagation();
        setOpen(false);
        setActiveIndex(-1);
      }
    }
  }

  const showList = open && showSuggestions && (loading || optionCount > 0);
  const showEmpty = open && showSuggestions && !loading && optionCount === 0;
  const panelOpen = showList || showEmpty;

  return (
    <div className={`ia-field${panelOpen ? ' ia-field--open' : ''}`} ref={containerRef}>
      <label className="ia-field-lbl" htmlFor={id}>{label}</label>
      <input
        id={id}
        ref={inputRef}
        className="ia-field-input"
        type="search"
        name={name}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList || showEmpty}
        aria-controls={listId}
        aria-activedescendant={showList && safeIndex >= 0 ? `${listId}-opt-${safeIndex}` : undefined}
        onFocus={() => {
          onFocusField?.();
          setOpen(true);
        }}
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={(event) => {
          if (containerRef.current?.contains(event.relatedTarget)) return;
          window.setTimeout(() => {
            if (!containerRef.current?.contains(document.activeElement)) {
              setOpen(false);
            }
          }, 0);
        }}
      />
      {(showList || showEmpty) && (
        <div className="ia-suggest" id={showEmpty ? listId : undefined}>
          {loading && optionCount === 0 && (
            <div className="ia-suggest-status" role="status">Loading suggestions…</div>
          )}
          {showEmpty && (
            <div className="ia-suggest-status" role="status">{emptyText}</div>
          )}
          {optionCount > 0 && (
            <ul className="ia-suggest-list" role="listbox" id={listId} aria-label={label}>
              {suggestions.map((item, index) => {
                const active = index === safeIndex;
                return (
                  <li key={item.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      id={`${listId}-opt-${index}`}
                      className={`ia-suggest-option${active ? ' ia-suggest-option--active' : ''}`}
                      aria-selected={active}
                      onMouseEnter={() => setActiveIndex(index)}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => pick(item)}
                    >
                      <span className="ia-suggest-label">{item.label}</span>
                      {item.meta ? <span className="ia-suggest-meta">{item.meta}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
