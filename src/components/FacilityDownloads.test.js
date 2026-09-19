import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readSrc(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

describe('P0 facility Downloads conversion', () => {
  it('keeps a plain free-vs-paid line for stressed readers', () => {
    const rail = readSrc('components/FacilityDownloads.jsx');
    const copy = readSrc('components/facilityReportCopy.js');
    assert.match(copy, /Free 1-page snapshot/);
    assert.match(copy, /Full decision packet — \$29/);
    assert.match(rail, /FREE_VS_PAID_COPY/);
    assert.match(rail, /fp-cta-compare/);
  });

  it('wires Free Family Report and $29 Brief to existing handlers', () => {
    const rail = readSrc('components/FacilityDownloads.jsx');
    assert.match(rail, /import \{ generatePDF \} from '\.\.\/utils\/generatePDF'/);
    assert.match(rail, /import \{ checkoutSingleReport \} from '\.\.\/utils\/stripe'/);
    assert.match(rail, /generatePDF\(facility/);
    assert.match(rail, /checkoutSingleReport\(ccn\)/);
    assert.match(rail, /Download Family Report \(Free\)/);
    assert.match(rail, /Buy Facility Brief \(\$29\)/);
    assert.doesNotMatch(rail, /buy\.stripe\.com/);
    assert.doesNotMatch(rail, /attorney/i);
    assert.doesNotMatch(rail, /litigation/i);
  });

  it('puts the Downloads rail first in the facility fold for mobile', () => {
    const page = readSrc('pages/FacilityPage.jsx');
    const foldIdx = page.indexOf('className="fp-fold"');
    const railIdx = page.indexOf('<FacilityCtaRail');
    const identityIdx = page.indexOf('fp-fold-identity');
    assert.ok(foldIdx > 0);
    assert.ok(railIdx > foldIdx);
    assert.ok(identityIdx > railIdx);
    assert.match(page, /fp-watchlist-btn/);
    assert.match(page, /fp-compare-cta|fp-compare-hint/);
  });

  it('compacts the mobile rail so both CTAs sit above the fold', () => {
    const css = readSrc('styles/facility-downloads.css');
    assert.match(css, /"rail"\s*\n\s*"identity"/);
    assert.match(css, /fp-cta-compare/);
    assert.match(css, /font-size: 17px/);
    assert.match(css, /min-height: 48px/);
    assert.match(css, /fp-cta-item-bullets,\s*\n\s*\.fp-cta-support/);
  });
});
