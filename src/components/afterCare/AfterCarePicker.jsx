import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AFTER_CARE_NEEDS,
  AFTER_CARE_PRODUCTS,
  getAfterCareNeed,
  isAfterCareNeedId,
  productsForNeed,
} from '../../data/afterCare';
import { track } from '../../utils/analytics';
import { AfterCareProductCard } from './AfterCareProductCard';

export function AfterCarePicker({ surface, labelId, syncUrl = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localNeedId, setLocalNeedId] = useState('');
  const [showAll, setShowAll] = useState(false);

  const urlNeed = searchParams.get('need') || '';
  const selectedId = syncUrl
    ? (isAfterCareNeedId(urlNeed) ? urlNeed : '')
    : localNeedId;
  const selectedNeed = getAfterCareNeed(selectedId);
  const products = showAll
    ? AFTER_CARE_PRODUCTS
    : (selectedNeed ? productsForNeed(selectedNeed.id) : []);

  function selectNeed(needId) {
    setShowAll(false);
    track('after_care_need_selected', { need_id: needId, surface });
    if (syncUrl) {
      const next = new URLSearchParams(searchParams);
      next.set('need', needId);
      setSearchParams(next, { replace: true });
      return;
    }
    setLocalNeedId(needId);
  }

  return (
    <div className="ac-picker">
      <div className="ac-needs" role="group" aria-labelledby={labelId}>
        {AFTER_CARE_NEEDS.map((need) => {
          const pressed = !showAll && selectedId === need.id;
          return (
            <button
              key={need.id}
              type="button"
              className={`ac-need${pressed ? ' ac-need--on' : ''}`}
              aria-pressed={pressed}
              onClick={() => selectNeed(need.id)}
            >
              {need.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="ac-see-all"
        aria-pressed={showAll}
        onClick={() => setShowAll((open) => !open)}
      >
        {showAll ? 'Back to one kind of help' : 'See all home-setup options'}
      </button>

      <div className="ac-results" aria-live="polite">
        {products.length === 0 ? (
          <p className="ac-empty">Select one to see a few options.</p>
        ) : (
          <>
            <h3 className="ac-results-title">
              {showAll ? 'All home-setup options' : selectedNeed.label}
            </h3>
            <div className={`ac-grid${products.length === 1 ? ' ac-grid--single' : ''}`}>
              {products.map((product) => (
                <AfterCareProductCard key={product.id} product={product} surface={surface} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
