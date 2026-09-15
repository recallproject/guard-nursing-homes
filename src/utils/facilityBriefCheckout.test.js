import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidFacilityCcn,
  normalizeFacilityCcn,
  buildSingleReportCheckoutUrl,
} from './facilityBriefCheckout.js';

const LINK = 'https://buy.stripe.com/00wfZh5Z63m53DubNR0x204';

describe('facilityBriefCheckout', () => {
  it('accepts 6-digit CCNs including leading zeros', () => {
    assert.equal(isValidFacilityCcn('675408'), true);
    assert.equal(isValidFacilityCcn('055559'), true);
    assert.equal(isValidFacilityCcn(' 675408 '), true);
    assert.equal(normalizeFacilityCcn(' 055559 '), '055559');
  });

  it('rejects empty or malformed CCNs', () => {
    assert.equal(isValidFacilityCcn(''), false);
    assert.equal(isValidFacilityCcn('67540'), false);
    assert.equal(isValidFacilityCcn('6754081'), false);
    assert.equal(isValidFacilityCcn('67-5408'), false);
    assert.equal(isValidFacilityCcn(null), false);
  });

  it('attaches CCN as Stripe client_reference_id', () => {
    const url = buildSingleReportCheckoutUrl(LINK, '675408');
    assert.equal(
      url,
      'https://buy.stripe.com/00wfZh5Z63m53DubNR0x204?client_reference_id=675408'
    );
  });

  it('preserves leading zeros on the Payment Link', () => {
    const url = buildSingleReportCheckoutUrl(LINK, '055559');
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('client_reference_id'), '055559');
  });

  it('returns empty string when CCN or link is invalid', () => {
    assert.equal(buildSingleReportCheckoutUrl(LINK, 'nope'), '');
    assert.equal(buildSingleReportCheckoutUrl('', '675408'), '');
  });
});
