import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AFTER_CARE_DEFAULT_NEED,
  AFTER_CARE_NEEDS,
  getAfterCareNeed,
  isAfterCareNeedId,
  productsForNeed,
} from '../../data/afterCare';
import { track } from '../../utils/analytics';
import { AfterCareProductCard } from './AfterCareProductCard';

export function AfterCarePicker({ surface, labelId, syncUrl = false, variant = 'compact' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localNeedId, setLocalNeedId] = useState('');
  const isEdit = variant === 'edit';

  const urlNeed = searchParams.get('need') || '';
  const fallback = isEdit ? AFTER_CARE_DEFAULT_NEED : '';
  const selectedId = syncUrl
    ? (isAfterCareNeedId(urlNeed) ? urlNeed : fallback)
    : (localNeedId || fallback);
  const selectedNeed = getAfterCareNeed(selectedId);
  const products = selectedNeed ? productsForNeed(selectedNeed.id) : [];
  const [leadProduct, altProduct] = products;

  function selectNeed(needId) {
    track('after_care_need_selected', { need_id: needId, surface });
    if (syncUrl) {
      const next = new URLSearchParams(searchParams);
      next.set('need', needId);
      setSearchParams(next, { replace: true });
    } else {
      setLocalNeedId(needId);
    }
    if (isEdit) {
      window.requestAnimationFrame(() => {
        document.getElementById('ac-edit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  const needButtons = (
    <div className={isEdit ? 'ac-needs' : 'ac-needs ac-needs--compact'} role="group" aria-labelledby={labelId}>
      {AFTER_CARE_NEEDS.map((need) => {
        const pressed = selectedId === need.id;
        if (!isEdit) {
          return (
            <button
              key={need.id}
              type="button"
              className={`ac-need ac-need--chip${pressed ? ' ac-need--on' : ''}`}
              aria-pressed={pressed}
              onClick={() => selectNeed(need.id)}
            >
              {need.label}
            </button>
          );
        }
        return (
          <button
            key={need.id}
            type="button"
            className={`ac-need${pressed ? ' ac-need--on' : ''}`}
            aria-pressed={pressed}
            onClick={() => selectNeed(need.id)}
          >
            <span className="ac-need-image">
              <img src={need.image} alt="" width="700" height="700" />
            </span>
            <span className="ac-need-label">
              <strong>{need.label}</strong>
              <span>{need.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );

  const results = (
    <div className="ac-results">
      {products.length === 0 ? (
        <p className="ac-empty">Select one to see a short edit for that need.</p>
      ) : (
        <>
          {isEdit ? (
            <div className="ac-edit-head">
              <div>
                <p className="ac-edit-tag">The Oversight edit</p>
                <h2 id="ac-edit-title" aria-live="polite">{selectedNeed.editTitle}</h2>
                <p>{selectedNeed.editSub}</p>
              </div>
            </div>
          ) : (
            <h3 className="ac-results-title" aria-live="polite">{selectedNeed.editTitle}</h3>
          )}
          <div className="ac-product-grid">
            {leadProduct ? (
              <AfterCareProductCard key={leadProduct.id} pick={leadProduct} surface={surface} featured />
            ) : null}
            {altProduct ? (
              <AfterCareProductCard key={altProduct.id} pick={altProduct} surface={surface} />
            ) : null}
          </div>
        </>
      )}
    </div>
  );

  if (!isEdit) {
    return (
      <div className="ac-picker">
        {needButtons}
        {results}
      </div>
    );
  }

  return (
    <>
      <section className="ac-intro">
        <div className="ac-wrap">
          <div className="ac-intro-row">
            <div>
              <p className="ac-kicker">Shop by need</p>
              <h2 id={labelId}>What are you trying to make easier?</h2>
            </div>
            <p>No giant catalog. Choose the problem first; we’ll show a short edit of products that make sense for that situation.</p>
          </div>
          {needButtons}
        </div>
      </section>
      <section className="ac-edit" id="ac-edit" aria-labelledby="ac-edit-title">
        <div className="ac-wrap">
          {results}
        </div>
      </section>
    </>
  );
}
