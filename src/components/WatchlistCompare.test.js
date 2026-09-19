import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readSrc(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

describe('Favorites compare UX wiring', () => {
  it('auto-selects favorites from compare=1 / ccns instead of only scrolling', () => {
    const page = readSrc('pages/WatchlistPage.jsx');
    assert.match(page, /resolveCompareSelection/);
    assert.match(page, /WatchlistCompareView/);
    assert.match(page, /queryCompare: searchParams.get\('compare'\)/);
    assert.match(page, /queryCcns: searchParams.get\('ccns'\)/);
    assert.doesNotMatch(page, /getElementById\('compare'\)\?\.scrollIntoView/);
  });

  it('surfaces Free Family Report and $29 Brief on compare results', () => {
    const view = readSrc('components/WatchlistCompareView.jsx');
    assert.match(view, /import \{ generatePDF \} from '\.\.\/utils\/generatePDF'/);
    assert.match(view, /import \{ checkoutSingleReport \} from '\.\.\/utils\/stripe'/);
    assert.match(view, /FREE_VS_PAID_COPY/);
    assert.match(view, /Download Family Report \(Free\)/);
    assert.match(view, /Buy Facility Brief \(\$29\)/);
    assert.match(view, /View Full Report/);
    assert.doesNotMatch(view, /buy\.stripe\.com/);
  });

  it('uses stacked cards on phones and keeps a desktop table', () => {
    const css = readSrc('styles/watchlist.css');
    assert.match(css, /\.watchlist-compare-cards \{\s*display: none;/);
    assert.match(css, /@media \(max-width: 768px\)/);
    assert.match(css, /\.watchlist-compare-cards \{\s*display: block;/);
    assert.match(css, /\.watchlist-compare-table-panel \{\s*display: none;/);
    assert.match(css, /position: sticky;/);
    const view = readSrc('components/WatchlistCompareView.jsx');
    assert.match(view, /Swipe or scroll sideways to see the next home/);
    assert.match(view, /Same metrics for each home/);
  });

  it('renames nav Compare tools so it is not confused with Favorites compare', () => {
    const header = readSrc('components/Header.jsx');
    assert.match(header, /How tools compare/);
    assert.doesNotMatch(header, /Compare tools/);
    assert.match(header, /Favorites\{watchlistCount >= 2 \? ' — compare homes' : ''\}/);

    const comparePage = readSrc('pages/ComparePage.jsx');
    assert.match(comparePage, /search websites/);
    assert.match(comparePage, /Compare your favorites/);
    assert.match(comparePage, /\/watchlist\?compare=1/);
  });

  it('sends facility and search compare actions through watchlistComparePath', () => {
    const facility = readSrc('pages/FacilityPage.jsx');
    assert.match(facility, /watchlistComparePath\(\{ ccns: watchlist.map/);
    const toast = readSrc('components/SaveToast.jsx');
    assert.match(toast, /watchlistComparePath\(\)/);
    const state = readSrc('pages/StatePage.jsx');
    assert.match(state, /watchlistComparePath\(\{ ccns: compareCcns \}\)/);
  });
});
