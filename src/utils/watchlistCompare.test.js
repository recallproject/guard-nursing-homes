import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addCompareItem,
  MAX_COMPARE_FACILITIES,
  parseCcnList,
  parseCompareItems,
  removeCompareItem,
  resolveCompareSelection,
  toggleCompareItem,
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

  it('accepts tray item objects', () => {
    assert.deepEqual(
      parseCcnList([{ ccn: '111111', name: 'A' }, { ccn: '222222', name: 'B' }]),
      ['111111', '222222']
    );
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

describe('addCompareItem / cap', () => {
  it('adds until 3 and then refuses without dropping existing homes', () => {
    const one = addCompareItem([], { ccn: 'aaa', name: 'A' });
    assert.equal(one.added, true);
    const two = addCompareItem(one.items, { ccn: 'bbb', name: 'B' });
    const three = addCompareItem(two.items, { ccn: 'ccc', name: 'C' });
    assert.equal(three.items.length, MAX_COMPARE_FACILITIES);
    assert.equal(three.atCap, true);

    const blocked = addCompareItem(three.items, { ccn: 'ddd', name: 'D' });
    assert.equal(blocked.added, false);
    assert.equal(blocked.atCap, true);
    assert.deepEqual(blocked.items.map((i) => i.ccn), ['aaa', 'bbb', 'ccc']);
  });

  it('is a no-op when the home is already in the tray', () => {
    const first = addCompareItem([], { ccn: 'aaa', name: 'A' });
    const again = addCompareItem(first.items, { ccn: 'aaa', name: 'A again' });
    assert.equal(again.added, false);
    assert.equal(again.already, true);
    assert.equal(again.items.length, 1);
  });
});

describe('removeCompareItem / toggleCompareItem', () => {
  it('removes by CCN and toggle adds then removes', () => {
    const added = addCompareItem([], { ccn: 'aaa', name: 'A' });
    assert.deepEqual(removeCompareItem(added.items, 'aaa'), []);
    const toggledOn = toggleCompareItem([], { ccn: 'bbb', name: 'B' });
    assert.equal(toggledOn.added, true);
    const toggledOff = toggleCompareItem(toggledOn.items, { ccn: 'bbb' });
    assert.equal(toggledOff.removed, true);
    assert.deepEqual(toggledOff.items, []);
  });
});

describe('parseCompareItems', () => {
  it('keeps names for tray chips', () => {
    const items = parseCompareItems([{ ccn: '111111', name: 'Sunrise', city: 'Austin', state: 'TX' }]);
    assert.equal(items[0].name, 'Sunrise');
    assert.equal(items[0].city, 'Austin');
  });
});

describe('resolveCompareSelection', () => {
  it('does not auto-select favorites when compare is not requested', () => {
    const result = resolveCompareSelection({
      queryCompare: null,
      sessionCcns: [],
    });
    assert.deepEqual(result.selected, []);
    assert.equal(result.openCompare, false);
  });

  it('does not treat a 2–3 favorite list as a compare set', () => {
    const result = resolveCompareSelection({
      queryCompare: null,
      queryCcns: null,
      sessionCcns: [],
    });
    assert.deepEqual(result.selected, []);
    assert.equal(result.openCompare, false);
    assert.equal(result.preselect, false);
  });

  it('opens compare only for explicit tray/query picks of 2+', () => {
    const fromQuery = resolveCompareSelection({
      queryCompare: '1',
      queryCcns: 'aaa,bbb',
    });
    assert.deepEqual(fromQuery.selected, ['aaa', 'bbb']);
    assert.equal(fromQuery.openCompare, true);

    const one = resolveCompareSelection({
      queryCompare: '1',
      queryCcns: 'aaa',
    });
    assert.deepEqual(one.selected, ['aaa']);
    assert.equal(one.openCompare, false);
  });

  it('prefers explicit ?ccns= over the session tray', () => {
    const result = resolveCompareSelection({
      queryCompare: '1',
      queryCcns: 'ccc,aaa',
      sessionCcns: ['bbb', 'ddd'],
    });
    assert.deepEqual(result.selected, ['ccc', 'aaa']);
    assert.equal(result.openCompare, true);
  });

  it('falls back to session picks when compare=1 and no query ccns', () => {
    const result = resolveCompareSelection({
      queryCompare: '1',
      sessionCcns: ['ddd', 'aaa'],
    });
    assert.deepEqual(result.selected, ['ddd', 'aaa']);
    assert.equal(result.openCompare, true);
  });

  it('ignores session picks unless compare=1', () => {
    const result = resolveCompareSelection({
      queryCompare: null,
      sessionCcns: ['ddd', 'aaa'],
    });
    assert.deepEqual(result.selected, []);
    assert.equal(result.openCompare, false);
  });

  it('never opens compare from favorites length alone', () => {
    const result = resolveCompareSelection({
      queryCompare: '1',
      sessionCcns: [],
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
