import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { facilitySeoDescription, facilitySeoTitle } from './facilitySeo.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readSrc(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

const sample = {
  name: 'LEBANON CENTER, GENESIS HEALTHCARE',
  city: 'LEBANON',
  state: 'NH',
  ccn: '305050',
  stars: 1,
  total_deficiencies: 30,
  jeopardy_count: 1,
  reit_owned: true,
};

describe('facilitySeoTitle', () => {
  it('includes city/state, CMS stars, CCN, and the Oversight brand', () => {
    assert.equal(
      facilitySeoTitle(sample),
      'LEBANON CENTER, GENESIS HEALTHCARE (LEBANON, NH) — 1/5 CMS stars | CCN 305050 | The Oversight Report'
    );
  });

  it('handles unrated facilities without a city', () => {
    assert.equal(
      facilitySeoTitle({ name: 'Example SNF', state: 'TX', ccn: '675408' }),
      'Example SNF (TX) — Unrated by CMS | CCN 675408 | The Oversight Report'
    );
  });
});

describe('facilitySeoDescription', () => {
  it('stays factual: location, stars, CCN, deficiencies, and key flags', () => {
    const description = facilitySeoDescription(sample);
    assert.match(description, /LEBANON, NH/);
    assert.match(description, /1\/5 CMS stars/);
    assert.match(description, /CCN 305050/);
    assert.match(description, /30 inspection deficiencies, including immediate jeopardy/);
    assert.match(description, /REIT ownership/);
    assert.match(description, /federal CMS records/);
  });
});

describe('facility and About SEO wiring', () => {
  it('uses the shared helper on facility SPA pages', () => {
    const page = readSrc('pages/FacilityPage.jsx');
    assert.match(page, /facilitySeoTitle\(facility\)/);
    assert.match(page, /facilitySeoDescription\(facility\)/);
  });

  it('uses the shared helper in the static SEO page generator', () => {
    const generator = readFileSync(join(root, '..', 'scripts', 'generate-seo-pages.js'), 'utf8');
    assert.match(generator, /facilitySeoTitle/);
    assert.match(generator, /facilitySeoDescription/);
  });

  it('keeps About titles aligned with the trust-page copy', () => {
    const about = readSrc('pages/AboutPage.jsx');
    const generator = readFileSync(join(root, '..', 'scripts', 'generate-seo-pages.js'), 'utf8');
    assert.match(about, /<title>About \/ Why trust us — The Oversight Report<\/title>/);
    assert.match(generator, /title: 'About \/ Why trust us — The Oversight Report'/);
  });
});
