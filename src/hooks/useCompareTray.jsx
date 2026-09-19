import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  addCompareItem,
  MAX_COMPARE_FACILITIES,
  parseCompareItems,
  readSessionCompareItems,
  removeCompareItem,
  toggleCompareItem,
  writeSessionCompareItems,
} from '../utils/watchlistCompare';

const CompareTrayContext = createContext(null);

export function CompareTrayProvider({ children }) {
  const [items, setItems] = useState(() => readSessionCompareItems());
  const [capNotice, setCapNotice] = useState(false);

  useEffect(() => {
    writeSessionCompareItems(items);
  }, [items]);

  const add = useCallback((facility) => {
    let result;
    setItems((prev) => {
      result = addCompareItem(prev, facility);
      return result.items;
    });
    setCapNotice(Boolean(result?.atCap && !result.added && !result.already));
    return result;
  }, []);

  const remove = useCallback((ccn) => {
    setItems((prev) => removeCompareItem(prev, ccn));
    setCapNotice(false);
  }, []);

  const toggle = useCallback((facility) => {
    let result;
    setItems((prev) => {
      result = toggleCompareItem(prev, facility);
      return result.items;
    });
    setCapNotice(Boolean(result?.atCap && !result.added && !result.removed));
    return result;
  }, []);

  const replace = useCallback((next) => {
    setItems(parseCompareItems(next));
    setCapNotice(false);
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setCapNotice(false);
  }, []);

  const dismissCapNotice = useCallback(() => setCapNotice(false), []);

  const ccns = useMemo(() => items.map((item) => item.ccn), [items]);
  const ccnSet = useMemo(() => new Set(ccns), [ccns]);
  const isInCompare = useCallback((ccn) => ccnSet.has(ccn), [ccnSet]);

  const value = {
    items,
    ccns,
    count: items.length,
    atCap: items.length >= MAX_COMPARE_FACILITIES,
    capNotice,
    dismissCapNotice,
    add,
    remove,
    toggle,
    replace,
    clear,
    isInCompare,
    max: MAX_COMPARE_FACILITIES,
  };

  return (
    <CompareTrayContext.Provider value={value}>
      {children}
    </CompareTrayContext.Provider>
  );
}

export function useCompareTray() {
  const context = useContext(CompareTrayContext);
  if (!context) {
    throw new Error('useCompareTray must be used within a CompareTrayProvider');
  }
  return context;
}
