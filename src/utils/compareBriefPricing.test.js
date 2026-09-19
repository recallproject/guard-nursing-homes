import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPARE_BRIEF_PRICE_USD,
  comparingTitle,
  normalizeCompareCcns,
  selectCompareBriefOffer,
  selectCompareBriefPriceId,
  serializeCompareCcns,
} from './compareBriefPricing.js';

describe('compareBriefPricing', () => {
  it('prices 2 homes at $49 and 3 homes at $69', () => {
    assert.equal(COMPARE_BRIEF_PRICE_USD[2], 49);
    assert.equal(COMPARE_BRIEF_PRICE_USD[3], 69);
    assert.deepEqual(selectCompareBriefOffer(2), {
      product: 'compare_brief',
      count: 2,
      priceUsd: 49,
      priceLabel: '$49',
      ctaLabel: 'Get the $49 Compare Brief (2 homes)',
      shortLabel: '$49 Compare Brief (2 homes)',
      envKeys: ['STRIPE_PRICE_COMPARE_2', 'VITE_STRIPE_PRICE_COMPARE_2'],
    });
    assert.equal(selectCompareBriefOffer(3).priceUsd, 69);
    assert.equal(selectCompareBriefOffer(3).ctaLabel, 'Get the $69 Compare Brief (3 homes)');
    assert.equal(selectCompareBriefOffer(1), null);
    assert.equal(selectCompareBriefOffer(4), null);
  });

  it('normalizes unique valid CCNs and caps at 3', () => {
    assert.deepEqual(
      normalizeCompareCcns(['675408', '055559', '345179', '111111']),
      ['675408', '055559', '345179']
    );
    assert.deepEqual(normalizeCompareCcns('675408, 055559, 675408'), ['675408', '055559']);
    assert.deepEqual(normalizeCompareCcns(['nope', '67540', '675408']), ['675408']);
    assert.equal(serializeCompareCcns([' 055559 ', '675408']), '055559,675408');
  });

  it('selects Stripe Price IDs from server or VITE env names', () => {
    assert.equal(
      selectCompareBriefPriceId(2, { STRIPE_PRICE_COMPARE_2: 'price_2home' }),
      'price_2home'
    );
    assert.equal(
      selectCompareBriefPriceId(3, { VITE_STRIPE_PRICE_COMPARE_3: 'price_3home' }),
      'price_3home'
    );
    assert.equal(selectCompareBriefPriceId(2, {}), '');
    assert.equal(selectCompareBriefPriceId(1, { STRIPE_PRICE_COMPARE_2: 'price_2home' }), '');
  });

  it('builds Comparing A vs B (vs C) titles', () => {
    assert.equal(
      comparingTitle([{ name: 'Alpha Care' }, { name: 'Beta House' }]),
      'Comparing Alpha Care vs Beta House'
    );
    assert.equal(
      comparingTitle([{ name: 'A' }, { name: 'B' }, { name: 'C' }]),
      'Comparing A vs B vs C'
    );
  });
});
