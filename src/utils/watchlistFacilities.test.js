import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ccnLookupKeys,
  collectWatchlistCcns,
  extractFacilities,
  findFacilityByCcn,
  formatMetricNumber,
  lookupStateForCcn,
  normalizeCcn,
} from './watchlistFacilities.js';

describe('normalizeCcn / ccnLookupKeys', () => {
  it('trims and offers padded/stripped numeric variants', () => {
    assert.equal(normalizeCcn(' 056435 '), '056435');
    assert.deepEqual(ccnLookupKeys('56435'), ['56435', '056435']);
    assert.deepEqual(ccnLookupKeys('056435'), ['056435', '56435']);
  });
});

describe('lookupStateForCcn', () => {
  const index = { '056435': 'CA', '555117': 'CA' };

  it('finds a state by exact or unpadded CCN', () => {
    assert.equal(lookupStateForCcn(index, '056435'), 'CA');
    assert.equal(lookupStateForCcn(index, '56435'), 'CA');
    assert.equal(lookupStateForCcn(index, 'missing'), null);
    assert.equal(lookupStateForCcn(null, '056435'), null);
  });
});

describe('extractFacilities / findFacilityByCcn', () => {
  const facilities = [{ ccn: '056435', name: 'Hyde Park' }, null, { ccn: '555117' }];

  it('reads both wrapped and raw state payloads', () => {
    assert.deepEqual(extractFacilities({ facilities }).map((f) => f.ccn), ['056435', '555117']);
    assert.deepEqual(extractFacilities(facilities).map((f) => f.ccn), ['056435', '555117']);
    assert.deepEqual(extractFacilities(null), []);
  });

  it('matches a CCN even when leading zeros differ', () => {
    assert.equal(findFacilityByCcn(facilities, '56435')?.name, 'Hyde Park');
    assert.equal(findFacilityByCcn(facilities, 'nope'), null);
  });
});

describe('collectWatchlistCcns', () => {
  it('unions favorites, query, and session without requiring favorites first', () => {
    assert.deepEqual(
      collectWatchlistCcns({
        favoriteCcns: [],
        queryCcns: '056435,555117',
        sessionCcns: ['056435', '999001'],
      }),
      ['056435', '555117', '999001']
    );
  });
});

describe('formatMetricNumber', () => {
  it('never calls toFixed on non-numeric values', () => {
    assert.equal(formatMetricNumber(73.5, 1), '73.5');
    assert.equal(formatMetricNumber('0.39', 2), '0.39');
    assert.equal(formatMetricNumber(''), '—');
    assert.equal(formatMetricNumber(null), '—');
    assert.equal(formatMetricNumber('n/a'), '—');
  });
});
