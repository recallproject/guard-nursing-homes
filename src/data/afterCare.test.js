import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { injectRootContent } from '../../scripts/facility-prerender.js';
import { afterCareBodyContent } from '../../scripts/after-care-prerender.js';
import {
  AFTER_CARE_DEFAULT_NEED,
  AFTER_CARE_DISCLOSURE,
  AFTER_CARE_INDEPENDENCE,
  AFTER_CARE_NEEDS,
  AFTER_CARE_PAGE_DISCLOSURE,
  AFTER_CARE_PRIMARY_CTA,
  MEDICARE_COVERAGE_HELPER,
  allAfterCarePicks,
  productsForNeed,
} from './afterCare.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(root, '..');

function readSrc(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

const EXPECTED_VIVE_URLS = [
  'https://www.vivehealth.com/products/shower-chair?aff=745',
  'https://www.vivehealth.com/products/tub-transfer-bench?aff=745',
  'https://www.vivehealth.com/products/lightweight-rollator?aff=745',
  'https://www.vivehealth.com/products/transfer-belt-loops?aff=745',
  'https://www.vivehealth.com/products/electric-patient-lift?aff=745',
  'https://www.vivehealth.com/products/wheelchair-cushions-gel?aff=745',
];

describe('after care edit', () => {
  it('keeps five needs, each with one primary and one alternate', () => {
    assert.deepEqual(AFTER_CARE_NEEDS.map((need) => need.id), ['shower', 'walking', 'transfer', 'lift', 'sitting']);
    assert.equal(AFTER_CARE_DEFAULT_NEED, 'shower');
    assert.deepEqual(productsForNeed('shower').map((p) => p.id), ['shower-chair', 'tub-transfer-bench']);
    assert.deepEqual(productsForNeed('walking').map((p) => p.id), ['lightweight-rollator', 'walkers-coverage']);
    assert.deepEqual(productsForNeed('transfer').map((p) => p.id), ['transfer-belt', 'transfer-lift']);
    assert.deepEqual(productsForNeed('lift').map((p) => p.id), ['patient-lift', 'lift-belt']);
    assert.deepEqual(productsForNeed('sitting').map((p) => p.id), ['gel-cushion', 'pressure-coverage']);
    for (const need of AFTER_CARE_NEEDS) {
      const products = productsForNeed(need.id);
      assert.equal(products.length, 2);
      assert.equal(products[0], need.primary);
      assert.equal(products[1], need.alt);
    }
  });

  it('puts aff=745 on every Vive link and keeps Medicare links clean', () => {
    const picks = allAfterCarePicks();
    const vive = picks.filter((pick) => pick.kind === 'vive');
    const coverage = picks.filter((pick) => pick.kind === 'coverage');
    assert.equal(vive.length, 8);
    assert.equal(coverage.length, 2);
    assert.deepEqual([...new Set(vive.map((pick) => pick.affiliateUrl))].sort(), [...EXPECTED_VIVE_URLS].sort());
    for (const pick of vive) {
      assert.match(pick.affiliateUrl, /[?&]aff=745(?:&|$)/);
      assert.equal(pick.merchantLine, 'Available from Vive Health');
      assert.equal(Boolean(pick.coverageUrl), false);
    }
    for (const pick of coverage) {
      assert.equal(pick.affiliateUrl, undefined);
      assert.match(pick.coverageUrl, /^https:\/\/www\.medicare\.gov\/coverage\//);
      assert.equal(pick.coverageUrl.includes('aff=745'), false);
      assert.equal(pick.merchantLine, 'Coverage information');
    }
    assert.equal(
      coverage.find((pick) => pick.id === 'walkers-coverage').coverageUrl,
      'https://www.medicare.gov/coverage/walkers',
    );
    assert.equal(
      coverage.find((pick) => pick.id === 'pressure-coverage').coverageUrl,
      'https://www.medicare.gov/coverage/pressure-reducing-support-surfaces',
    );
  });

  it('shows visible prices and careful Medicare wording', () => {
    const byId = Object.fromEntries(allAfterCarePicks().map((pick) => [pick.id, pick]));
    assert.equal(byId['shower-chair'].price, '$67.99');
    assert.equal(byId['tub-transfer-bench'].price, '$109.99');
    assert.equal(byId['lightweight-rollator'].price, '$99.99');
    assert.equal(byId['transfer-belt'].price, '$32.99');
    assert.equal(byId['patient-lift'].price, '$824.99');
    assert.equal(byId['gel-cushion'].price, 'From $39.99');
    assert.equal(byId['walkers-coverage'].price, 'May save money');
    assert.equal(byId['pressure-coverage'].price, 'Ask the care team');

    assert.equal(byId['shower-chair'].medicareStatus, 'self-pay');
    assert.equal(byId['lightweight-rollator'].medicareStatus, 'may-cover');
    assert.equal(byId['patient-lift'].medicareStatus, 'may-cover');
    assert.match(MEDICARE_COVERAGE_HELPER, /Buying this retail item may not be reimbursed/);
    assert.match(AFTER_CARE_PAGE_DISCLOSURE, /does not mean Medicare will reimburse it/);

    assert.match(byId['transfer-belt'].safetyNote, /aren't for every person or every transfer/i);
    assert.match(byId['transfer-belt'].safetyNote, /physical therapy, occupational therapy, or caregiver training/i);
    assert.match(byId['lift-belt'].safetyNote, /aren't for every person or every transfer/i);
    assert.match(byId['patient-lift'].safetyNote, /sling is sold separately/i);
    assert.match(byId['transfer-lift'].safetyNote, /sling is sold separately/i);

    assert.match(byId['gel-cushion'].fit, /everyday comfort/i);
    assert.doesNotMatch(byId['gel-cushion'].fit, /ulcer|bedsore|prevent|treat/i);
    assert.doesNotMatch(byId['gel-cushion'].why, /ulcer|bedsore|prevent|treat/i);
    assert.match(byId['gel-cushion'].comfortNote, /not as prevention or treatment of pressure injuries/i);
    assert.match(byId['pressure-coverage'].copy, /clinical plan/i);
  });

  it('uses a local photo for every pick', () => {
    const seen = new Set();
    for (const pick of allAfterCarePicks()) {
      assert.match(pick.image, /^\/after-care\/[a-z0-9-]+\.jpg$/);
      assert.ok(pick.imageAlt.length > 12);
      if (seen.has(pick.image)) continue;
      seen.add(pick.image);
      const filePath = join(repoRoot, 'public', pick.image.slice(1));
      assert.equal(existsSync(filePath), true, pick.image);
      assert.ok(statSync(filePath).size > 5000);
    }
    assert.equal(seen.size, 6);
  });

  it('features one large pick and one alternate with a loud Vive CTA', () => {
    const card = readSrc('components/afterCare/AfterCareProductCard.jsx');
    const picker = readSrc('components/afterCare/AfterCarePicker.jsx');
    assert.equal(AFTER_CARE_PRIMARY_CTA, 'View option →');
    assert.match(card, /AFTER_CARE_PRIMARY_CTA/);
    assert.match(card, /pick\.why/);
    assert.match(card, /pick\.price/);
    assert.match(card, /alt=\{pick\.imageAlt\}/);
    assert.match(card, /rel=\{isVive \? 'noopener noreferrer sponsored' : 'noopener noreferrer'\}/);
    assert.match(card, /Why we chose it|AFTER_CARE_WHY_CTA/);
    assert.doesNotMatch(card, /View recommended option/);
    assert.doesNotMatch(card, /See price on Vive/);
    assert.match(picker, /variant === 'edit'/);
    assert.match(picker, /featured/);
    assert.match(picker, /ac-product-grid/);
    assert.doesNotMatch(picker, /See all home-setup options/);
    assert.equal(productsForNeed('shower')[0].label, 'Our first pick');
    assert.equal(productsForNeed('lift')[0].label, 'Featured option');
  });

  it('prerenders the edit instead of the homepage shell', () => {
    const body = afterCareBodyContent();
    assert.match(body, /We searched the options so you don’t have to\./);
    assert.match(body, /Not a catalog/);
    assert.ok(body.includes(AFTER_CARE_PAGE_DISCLOSURE));
    assert.match(body, /View option →/);
    assert.match(body, /aff=745/);
    assert.match(body, /\$67\.99/);
    assert.match(body, /\$824\.99/);
    assert.match(body, /href="\/home-health"/);
    for (const need of AFTER_CARE_NEEDS) {
      assert.match(body, new RegExp(need.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(body, new RegExp(`href="/after-care\\?need=${need.id}"`));
      assert.match(body, new RegExp(need.primary.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(body, new RegExp(need.alt.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    const medicareHrefs = [...body.matchAll(/href="(https:\/\/www\.medicare\.gov[^"]*)"/g)].map((match) => match[1]);
    assert.deepEqual(medicareHrefs, [
      'https://www.medicare.gov/coverage/walkers',
      'https://www.medicare.gov/coverage/pressure-reducing-support-surfaces',
    ]);
    for (const href of medicareHrefs) {
      assert.equal(href.includes('aff=745'), false);
    }
    const viveHrefs = [...body.matchAll(/href="(https:\/\/www\.vivehealth\.com[^"]*)"/g)].map((match) => match[1]);
    assert.equal(viveHrefs.length, 8);
    for (const href of viveHrefs) {
      assert.match(href, /aff=745/);
    }

    const template = readFileSync(join(repoRoot, 'index.html'), 'utf8');
    const out = injectRootContent(template, body);
    assert.match(out, /Vive Shower Chair/);
    assert.match(out, /Bathing safely/);
    assert.doesNotMatch(out, /Research a nursing home before you choose/);
    assert.doesNotMatch(out, /Folding Bedside Commode/);

    const seo = readFileSync(join(repoRoot, 'scripts/generate-seo-pages.js'), 'utf8');
    assert.match(seo, /afterCareBodyContent/);
    assert.match(seo, /route: 'after-care'[\s\S]{0,500}bodyContent: afterCareBodyContent\(\)/);
    assert.match(seo, /page\.bodyContent \|\| ''/);
  });

  it('keeps the disclosure and route out of a shop nav', () => {
    assert.equal(
      AFTER_CARE_DISCLOSURE,
      `OversightReports may earn a commission from qualifying purchases. ${AFTER_CARE_INDEPENDENCE}`,
    );
    assert.match(AFTER_CARE_PAGE_DISCLOSURE, new RegExp(AFTER_CARE_INDEPENDENCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(AFTER_CARE_INDEPENDENCE, /never affect facility scores, rankings, or safety data/);

    const page = readSrc('pages/AfterCarePage.jsx');
    const picker = readSrc('components/afterCare/AfterCarePicker.jsx');
    const card = readSrc('components/afterCare/AfterCareProductCard.jsx');
    const home = readSrc('components/afterCare/AfterCareHomeLink.jsx');
    const header = readSrc('components/Header.jsx');
    const footer = readSrc('components/landing/Footer.jsx');
    const app = readSrc('App.jsx');

    for (const source of [page, picker, card, home, footer]) {
      assert.doesNotMatch(source, />\s*Shop\s*</);
      assert.doesNotMatch(source, /Marketplace/);
    }
    assert.match(page, /We searched the options so you don’t have to\./);
    assert.match(page, /AfterCareDisclosure/);
    assert.match(page, /to="\/home-health"/);
    assert.match(app, /path="\/after-care"/);
    assert.match(footer, /to="\/after-care"/);
    assert.match(footer, /After care/);
    assert.match(home, /\/after-care\/shower-chair\.jpg/);
    assert.doesNotMatch(home, /bedside-commode/);
    assert.match(card, /View option|AFTER_CARE_PRIMARY_CTA/);
    assert.doesNotMatch(header, /\/after-care/);
    assert.match(readSrc('pages/FacilityPage.jsx'), /s-after-care/);
    assert.match(readSrc('pages/AboutPage.jsx'), /Commercial relationships never affect facility scores/);
  });
});
