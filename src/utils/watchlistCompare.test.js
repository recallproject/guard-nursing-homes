import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_COMPARE_FACILITIES,
  parseCcnList,
  resolveCompareSelection,
  watchlistComparePath,
} from './watchlistCompare.js';

describe('parseCcnList', () => {
  it('splits, trims, dedupes, and caps at 3', () => {
    assert.deepEqual(parseCcnList('675408, 675123,675408, 999001, 111'), [
      '675408',
      '675123',
      '999001',
    ]);
    assert.deepEqual(parseCcnList(['a', 'b', 'a']), ['a', 'b']);
    assert.deepEqual(parseCcnList(''), []);
    assert.deepEqual(parseCcnList(null), []);
  });
});

describe('watchlistComparePath', () => {
  it('always sets compare=1 and optional ccns', () => {
    assert.equal(watchlistComparePath(), '/watchlist?compare=1');
    assert.equal(
      watchlistComparePath({ ccns: ['675408', '675123'] }),
      '/watchlist?compare=1&ccns=675408%2C675123'
    );
  });
});

describe('resolveCompareSelection', () => {
  const favorites = ['aaa', 'bbb', 'ccc', 'ddd'];

  it('opens compare with all favorites when there are 2–3 and compare=1', () => {
    const two = resolveCompareSelection({
      favoriteCcns: ['aaa', 'bbb'],
      queryCompare: '1',
    });
    assert.deepEqual(two.selected, ['aaa', 'bbb']);
    assert.equal(two.openCompare, true);
    assert.equal(two.preselect, true);

    const three = resolveCompareSelection({
      favoriteCcns: ['aaa', 'bbb', 'ccc'],
      queryCompare: '1',
    });
    assert.deepEqual(three.selected, ['aaa', 'bbb', 'ccc']);
    assert.equal(three.openCompare, true);
  });

  it('preselects 2–3 favorites without opening when compare is not requested', () => {
    const result = resolveCompareSelection({
      favoriteCcns: ['aaa', 'bbb'],
      queryCompare: null,
    });
    assert.deepEqual(result.selected, ['aaa', 'bbb']);
    assert.equal(result.openCompare, false);
    assert.equal(result.preselect, true);
  });

  it('does not preselect when there are 4+ favorites and no compare intent', () => {
    const result = resolveCompareSelection({
      favoriteCcns: favorites,
      queryCompare: null,
    });
    assert.deepEqual(result.selected, []);
    assert.equal(result.openCompare, false);
  });

  it('uses the most recently added favorites when compare=1 and the list is long', () => {
    const result = resolveCompareSelection({
      favoriteCcns: favorites,
      queryCompare: '1',
    });
    assert.deepEqual(result.selected, ['bbb', 'ccc', 'ddd']);
    assert.equal(result.selected.length, MAX_COMPARE_FACILITIES);
    assert.equal(result.openCompare, true);
  });

  it('prefers explicit ?ccns= that are in the favorites list', () => {
    const result = resolveCompareSelection({
      favoriteCcns: favorites,
      queryCompare: '1',
      queryCcns: 'ccc,aaa,missing',
      sessionCcns: ['bbb', 'ddd'],
    });
    assert.deepEqual(result.selected, ['ccc', 'aaa']);
    assert.equal(result.openCompare, true);
  });

  it('falls back to session picks when compare=1 and no usable query ccns', () => {
    const result = resolveCompareSelection({
      favoriteCcns: favorites,
      queryCompare: '1',
      queryCcns: 'not-a-favorite',
      sessionCcns: ['ddd', 'aaa'],
    });
    assert.deepEqual(result.selected, ['ddd', 'aaa']);
    assert.equal(result.openCompare, true);
  });

  it('ignores session picks unless compare=1', () => {
    const result = resolveCompareSelection({
      favoriteCcns: favorites,
      queryCompare: null,
      sessionCcns: ['ddd', 'aaa'],
    });
    assert.deepEqual(result.selected, []);
    assert.equal(result.openCompare, false);
  });

  it('does not open compare with fewer than two valid facilities', () => {
    const result = resolveCompareSelection({
      favoriteCcns: ['aaa'],
      queryCompare: '1',
      queryCcns: 'aaa',
    });
    assert.deepEqual(result.selected, []);
    assert.equal(result.openCompare, false);
  });

  it('honors explicit compare CCNs when favorites have not hydrated yet', () => {
    const fromQuery = resolveCompareSelection({
      favoriteCcns: [],
      queryCompare: '1',
      queryCcns: '056435,555117',
    });
    assert.deepEqual(fromQuery.selected, ['056435', '555117']);
    assert.equal(fromQuery.openCompare, true);

    const fromSession = resolveCompareSelection({
      favoriteCcns: [],
      queryCompare: '1',
      sessionCcns: ['056435', '555117'],
    });
    assert.deepEqual(fromSession.selected, ['056435', '555117']);
    assert.equal(fromSession.openCompare, true);
  });
});
