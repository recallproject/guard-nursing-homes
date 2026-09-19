import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'url';
import { describe, it } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readSrc(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

describe('Favorites compare UX v2 wiring', () => {
  it('opens compare from explicit tray/query picks instead of auto-selecting favorites', () => {
    const page = readSrc('pages/WatchlistPage.jsx');
    assert.match(page, /resolveCompareSelection/);
    assert.match(page, /WatchlistCompareView/);
    assert.match(page, /useCompareTray/);
    assert.match(page, /queryCompare: searchParams.get\('compare'\)/);
    assert.match(page, /queryCcns: searchParams.get\('ccns'\)/);
    assert.match(page, /collectWatchlistCcns/);
    assert.doesNotMatch(page, /resolveCompareSelection\([\s\S]*favoriteCcns/);
    assert.doesNotMatch(page, /getElementById\('compare'\)\?\.scrollIntoView/);
  });

  it('surfaces free comparison snapshot and Compare Brief without blocking the free path', () => {
    const view = readSrc('components/WatchlistCompareView.jsx');
    assert.match(view, /import\('\.\.\/utils\/generatePDF'\)/);
    assert.match(view, /import \{ generateComparisonPDF \} from '\.\.\/utils\/generateComparisonPDF'/);
    assert.match(view, /checkoutCompareBrief, checkoutSingleReport/);
    assert.match(view, /selectCompareBriefOffer/);
    assert.match(view, /FREE_VS_PAID_COPY/);
    assert.match(view, /Download my \$\{count\}-home comparison/);
    assert.match(view, /Download Family Report \(Free\)/);
    assert.match(view, /Buy Facility Brief \(\$29\)/);
    assert.match(view, /The free comparison is never blocked/);
    assert.match(view, /watchlist-compare-actionbar/);
    assert.match(view, /compareOffer\.ctaLabel/);
    assert.match(view, /deeper multi-home packet/);
    assert.doesNotMatch(view, /buy\.stripe\.com/);
  });

  it('uses a sticky-label side-by-side grid on phones instead of stacked compare cards', () => {
    const css = readSrc('styles/watchlist.css');
    assert.match(css, /\.wcg \{/);
    assert.match(css, /position: sticky;/);
    assert.match(css, /minmax\(62vw/);
    assert.doesNotMatch(css, /\.watchlist-compare-cards \{\s*display: block;/);
    assert.doesNotMatch(css, /\.watchlist-compare-table-panel \{\s*display: none;/);
    const view = readSrc('components/WatchlistCompareView.jsx');
    assert.match(view, /Swipe to see the next home/);
    assert.match(view, /FIRST_VIEW_ROWS/);
    assert.match(view, /DETAIL_GROUPS/);
    assert.doesNotMatch(view, /watchlist-compare-cards/);
  });

  it('keeps Save and Add to compare as separate jobs on list cards', () => {
    const card = readSrc('components/FacilityResultCard.jsx');
    assert.match(card, /\{watched \? 'Saved' : 'Save'\}/);
    assert.match(card, /\{compareSelected \? 'In compare' : 'Add to compare'\}/);
    assert.match(card, /View report/);
    assert.doesNotMatch(card, />Favorited</);
    assert.doesNotMatch(card, />Favorite</);
    assert.doesNotMatch(card, />Compare</);
  });

  it('shows a compare tray with N of 3 and Compare now', () => {
    const tray = readSrc('components/CompareTray.jsx');
    assert.match(tray, /\{count\} of \{max\}/);
    assert.match(tray, /Compare now/);
    assert.match(tray, /watchlistComparePath/);
    assert.match(tray, /Saving a home does not add it here/);
    const state = readSrc('pages/StatePage.jsx');
    assert.match(state, /<CompareTray/);
    assert.match(state, /onToggleCompare=\{toggle\}/);
    assert.doesNotMatch(state, /Compare \(\$\{/);
  });

  it('does not send Save toward an auto-opened favorites compare', () => {
    const toast = readSrc('components/SaveToast.jsx');
    assert.doesNotMatch(toast, /watchlistComparePath/);
    assert.doesNotMatch(toast, /View saved homes/);
    assert.doesNotMatch(toast, /Compare favorites/);
    assert.match(toast, /Saved to your shortlist/);
    const facility = readSrc('pages/FacilityPage.jsx');
    assert.match(facility, /watchlistComparePath\(\{ ccns: compareCcns \}\)/);
    assert.match(facility, /Add to compare/);
  });

  it('renames nav Compare tools so it is not confused with home comparison', () => {
    const header = readSrc('components/Header.jsx');
    assert.match(header, /How tools compare/);
    assert.doesNotMatch(header, /Compare tools/);
    assert.match(header, /Saved homes/);

    const comparePage = readSrc('pages/ComparePage.jsx');
    assert.match(comparePage, /search websites/);
    assert.match(comparePage, /\/watchlist\?compare=1/);
  });

  it('does not mount the CA AG promo banner', () => {
    const app = readSrc('App.jsx');
    assert.doesNotMatch(app, /CaliforniaBanner/);
    const flag = readSrc('utils/californiaBanner.js');
    assert.match(flag, /return false/);
  });

  it('loads favorites plus explicit compare CCNs on the watchlist page', () => {
    const page = readSrc('pages/WatchlistPage.jsx');
    assert.match(page, /useWatchlistFacilities/);
    assert.match(page, /collectWatchlistCcns/);
    assert.match(page, /WatchlistErrorBoundary/);
    assert.doesNotMatch(page, /useFacilityData\(\)/);
  });

  it('sends facility compare through the tray path and keeps Save off compare', () => {
    const facility = readSrc('pages/FacilityPage.jsx');
    assert.match(facility, /watchlistComparePath\(\{ ccns: compareCcns \}\)/);
    const toast = readSrc('components/SaveToast.jsx');
    assert.doesNotMatch(toast, /watchlistComparePath/);
    assert.doesNotMatch(toast, /Compare favorites/);
    const state = readSrc('pages/StatePage.jsx');
    assert.match(state, /<CompareTray/);
    assert.doesNotMatch(state, /watchlistComparePath\(\{ ccns: compareCcns \}\)/);
  });
});
