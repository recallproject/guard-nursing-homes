import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCompareBriefPayment,
  buildCompareBriefCheckoutUrl,
  compareBriefOfferForCcns,
  compareBriefPaymentLink,
  parseCompareCcnList,
  resolveCompareCcns,
} from './compareBriefOffer.js';

const LINK2 = 'https://buy.stripe.com/test_compare_brief_2';
const LINK3 = 'https://buy.stripe.com/test_compare_brief_3';

describe('parseCompareCcnList', () => {
  it('keeps tray order for 2 or 3 CCNs and preserves leading zeros', () => {
    assert.deepEqual(parseCompareCcnList(['055559', '675408']), ['055559', '675408']);
    assert.deepEqual(parseCompareCcnList('195381,195180,195312'), ['195381', '195180', '195312']);
  });

  it('rejects a single home, a fourth home, duplicates, and bad ids', () => {
    assert.deepEqual(parseCompareCcnList('675408'), []);
    assert.deepEqual(parseCompareCcnList('111111,222222,333333,444444'), []);
    assert.deepEqual(parseCompareCcnList('111111,111111'), []);
    assert.deepEqual(parseCompareCcnList('abc,675408'), []);
  });
});

describe('compare brief checkout url', () => {
  it('prices 2 homes at $49 and 3 homes at $69', () => {
    assert.equal(compareBriefOfferForCcns(['111111', '222222']).product, 'compare_brief_2');
    assert.equal(compareBriefOfferForCcns(['111111', '222222']).price, 49);
    assert.equal(compareBriefOfferForCcns(['111111', '222222', '333333']).price, 69);
    assert.equal(compareBriefOfferForCcns(['111111']), null);
  });

  it('attaches the CCN list as client_reference_id', () => {
    const url = buildCompareBriefCheckoutUrl(LINK2, ['055559', '675408']);
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('client_reference_id'), '055559,675408');
    assert.equal(buildCompareBriefCheckoutUrl('', ['055559', '675408']), '');
    assert.equal(buildCompareBriefCheckoutUrl(LINK2, ['675408']), '');
  });

  it('reads the payment link for the home count', () => {
    const env = {
      VITE_STRIPE_COMPARE_BRIEF_2_LINK: LINK2,
      VITE_STRIPE_COMPARE_BRIEF_3_LINK: LINK3,
    };
    assert.equal(compareBriefPaymentLink(2, env), LINK2);
    assert.equal(compareBriefPaymentLink(3, env), LINK3);
    assert.equal(compareBriefPaymentLink(2, {}), '');
  });
});

describe('assertCompareBriefPayment', () => {
  const paid = (cents, extra = {}) => ({
    payment_status: 'paid',
    mode: 'payment',
    currency: 'usd',
    amount_subtotal: cents,
    amount_total: cents,
    ...extra,
  });

  it('accepts $49 for two homes and $69 for three', () => {
    const two = assertCompareBriefPayment(paid(4900), ['111111', '222222']);
    assert.equal(two.ok, true);
    assert.equal(two.offer.product, 'compare_brief_2');
    const three = assertCompareBriefPayment(paid(6900), ['111111', '222222', '333333']);
    assert.equal(three.offer.product, 'compare_brief_3');
  });

  it('rejects a $29 Facility Brief payment used as a Compare Brief', () => {
    const result = assertCompareBriefPayment(paid(2900), ['111111', '222222']);
    assert.equal(result.status, 402);
    assert.match(result.error, /\$49/);
  });

  it('rejects a 2-home price for a 3-home CCN list', () => {
    const result = assertCompareBriefPayment(paid(4900), ['111111', '222222', '333333']);
    assert.equal(result.status, 402);
    assert.match(result.error, /\$69/);
  });

  it('checks optional price and payment link ids when configured', () => {
    const env = {
      STRIPE_COMPARE_BRIEF_2_PRICE_ID: 'price_2',
      STRIPE_COMPARE_BRIEF_2_LINK_ID: 'plink_2',
    };
    const mismatch = assertCompareBriefPayment(paid(4900, {
      line_items: { data: [{ price: { id: 'price_other' } }] },
      payment_link: 'plink_2',
    }), ['111111', '222222'], env);
    assert.equal(mismatch.status, 402);
    const linkMismatch = assertCompareBriefPayment(paid(4900, {
      line_items: { data: [{ price: { id: 'price_2' } }] },
      payment_link: 'plink_other',
    }), ['111111', '222222'], env);
    assert.equal(linkMismatch.status, 402);
    const ok = assertCompareBriefPayment(paid(4900, {
      line_items: { data: [{ price: { id: 'price_2' } }] },
      payment_link: 'plink_2',
    }), ['111111', '222222'], env);
    assert.equal(ok.ok, true);
  });
});

describe('resolveCompareCcns', () => {
  it('prefers the paid session list and ignores a client hint', () => {
    const result = resolveCompareCcns(
      { client_reference_id: '195381,195312', metadata: {} },
      '111111',
    );
    assert.deepEqual(result, ['195381', '195312']);
  });

  it('does not treat a single-facility payment as a compare set', () => {
    const result = resolveCompareCcns(
      { client_reference_id: '675408', metadata: {} },
      '111111,222222',
    );
    assert.deepEqual(result, []);
  });

  it('uses metadata.ccns and then the client hint only when the session has no id', () => {
    assert.deepEqual(
      resolveCompareCcns({ client_reference_id: null, metadata: { ccns: '055559,675408' } }, ''),
      ['055559', '675408'],
    );
    assert.deepEqual(
      resolveCompareCcns({ client_reference_id: null, metadata: {} }, '195381,195180'),
      ['195381', '195180'],
    );
  });
});
