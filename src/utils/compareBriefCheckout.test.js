import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPARE_BRIEF_PRODUCT,
  buildCompareBriefSessionFields,
  compareBriefCheckoutRequestBody,
  isCompareBriefSession,
  parseCompareCcnsFromSession,
} from './compareBriefCheckout.js';

describe('compareBriefCheckout metadata', () => {
  it('puts every CCN on client_reference_id and metadata', () => {
    const fields = buildCompareBriefSessionFields(['675408', '055559', '345179'], {
      siteUrl: 'https://www.oversightreports.com',
      priceId: 'price_compare_3',
    });
    assert.equal(fields.mode, 'payment');
    assert.equal(fields.client_reference_id, '675408,055559,345179');
    assert.deepEqual(fields.metadata, {
      product: COMPARE_BRIEF_PRODUCT,
      ccns: '675408,055559,345179',
      ccn_count: '3',
      price_usd: '69',
    });
    assert.deepEqual(fields.line_items, [{ price: 'price_compare_3', quantity: 1 }]);
    assert.match(fields.success_url, /compare-brief-success\?session_id=\{CHECKOUT_SESSION_ID\}/);
    assert.match(fields.cancel_url, /ccns=675408%2C055559%2C345179/);
    assert.equal(fields.offer.priceUsd, 69);
  });

  it('selects the $49 price metadata for two homes', () => {
    const fields = buildCompareBriefSessionFields(['675408', '055559'], {
      env: { STRIPE_PRICE_COMPARE_2: 'price_compare_2' },
    });
    assert.equal(fields.metadata.price_usd, '49');
    assert.equal(fields.metadata.ccn_count, '2');
    assert.deepEqual(fields.line_items, [{ price: 'price_compare_2', quantity: 1 }]);
  });

  it('returns null when the set is not 2 or 3 valid CCNs', () => {
    assert.equal(buildCompareBriefSessionFields(['675408']), null);
    assert.equal(buildCompareBriefSessionFields([]), null);
  });

  it('reads CCNs back from a paid session, preferring metadata', () => {
    const session = {
      client_reference_id: '111111,222222',
      metadata: { product: 'compare_brief', ccns: '675408,055559' },
    };
    assert.equal(isCompareBriefSession(session), true);
    assert.deepEqual(parseCompareCcnsFromSession(session), ['675408', '055559']);
    assert.deepEqual(
      parseCompareCcnsFromSession({ client_reference_id: '675408,345179', metadata: {} }),
      ['675408', '345179']
    );
  });

  it('builds the checkout request body the client posts', () => {
    assert.deepEqual(compareBriefCheckoutRequestBody(['675408', 'bad', '055559']), {
      ccns: ['675408', '055559'],
      product: 'compare_brief',
    });
  });
});
