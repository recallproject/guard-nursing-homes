import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  AFTER_CARE_DISCLOSURE,
  AFTER_CARE_NEEDS,
  AFTER_CARE_PRODUCTS,
  MEDICARE_BADGE_LABEL,
  MEDICARE_COVERAGE_HELPER,
  productsForNeed,
} from './afterCare.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readSrc(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

const EXPECTED_AFFILIATE_URLS = [
  'https://www.vivehealth.com/products/shower-chair?aff=745',
  'https://www.vivehealth.com/products/tub-transfer-bench?aff=745',
  'https://www.vivehealth.com/products/commode?aff=745',
  'https://www.vivehealth.com/products/core-shower-commode-transport-wheelchair?aff=745',
  'https://www.vivehealth.com/products/lightweight-rollator?aff=745',
  'https://www.vivehealth.com/products/rollator-walker-with-seat?aff=745',
  'https://www.vivehealth.com/products/gait-belt?aff=745',
  'https://www.vivehealth.com/products/wheelchair-cushions-gel?aff=745',
];

describe('after care catalog', () => {
  it('keeps eight Vive affiliate links with aff=745', () => {
    assert.equal(AFTER_CARE_PRODUCTS.length, 8);
    assert.deepEqual(
      AFTER_CARE_PRODUCTS.map((product) => product.affiliateUrl),
      EXPECTED_AFFILIATE_URLS,
    );
    for (const product of AFTER_CARE_PRODUCTS) {
      assert.equal(product.merchant, 'vive');
      assert.match(product.affiliateUrl, /[?&]aff=745(?:&|$)/);
      assert.equal(product.coverageUrl.includes('aff=745'), false);
      assert.match(product.coverageUrl, /^https:\/\/www\.medicare\.gov\/coverage\//);
      assert.ok(MEDICARE_BADGE_LABEL[product.medicareStatus]);
    }
  });

  it('maps each need to the specified products', () => {
    assert.deepEqual(productsForNeed('shower').map((p) => p.id), ['shower-chair', 'tub-transfer-bench']);
    assert.deepEqual(productsForNeed('toilet').map((p) => p.id), ['bedside-commode', 'core-3-in-1']);
    assert.deepEqual(productsForNeed('walking').map((p) => p.id), ['lightweight-rollator', 'wheelchair-rollator']);
    assert.deepEqual(productsForNeed('transfer').map((p) => p.id), ['gait-belt']);
    assert.deepEqual(productsForNeed('wheelchair-sitting').map((p) => p.id), ['gel-cushion']);
    for (const need of AFTER_CARE_NEEDS) {
      const products = productsForNeed(need.id);
      assert.ok(products.length >= 1 && products.length <= 3);
    }
  });

  it('uses careful Medicare wording and avoids treatment claims', () => {
    assert.equal(MEDICARE_BADGE_LABEL['may-cover'], 'Medicare may cover this type of equipment');
    assert.equal(MEDICARE_BADGE_LABEL['self-pay'], 'Usually self-pay');
    assert.match(MEDICARE_COVERAGE_HELPER, /Buying this retail item may not be reimbursed/);

    const byId = Object.fromEntries(AFTER_CARE_PRODUCTS.map((product) => [product.id, product]));
    assert.equal(byId['bedside-commode'].medicareStatus, 'may-cover');
    assert.equal(byId['lightweight-rollator'].medicareStatus, 'may-cover');
    assert.equal(byId['wheelchair-rollator'].medicareStatus, 'may-cover');
    assert.equal(byId['shower-chair'].medicareStatus, 'self-pay');
    assert.equal(byId['tub-transfer-bench'].medicareStatus, 'self-pay');
    assert.equal(byId['core-3-in-1'].medicareStatus, 'self-pay');
    assert.equal(byId['gait-belt'].medicareStatus, 'self-pay');
    assert.equal(byId['gel-cushion'].medicareStatus, 'self-pay');

    assert.match(byId['gait-belt'].safetyNote, /aren't for every person or every transfer/i);
    assert.match(byId['gait-belt'].safetyNote, /physical therapy, occupational therapy, or caregiver training/i);

    assert.match(byId['gel-cushion'].bestFor, /comfort and positioning/i);
    assert.doesNotMatch(byId['gel-cushion'].bestFor, /pressure|ulcer|bedsore|prevent|treat/i);
    assert.match(byId['gel-cushion'].coverageDetail, /not as prevention or treatment of pressure injuries/i);

    assert.equal(byId['bedside-commode'].coverageUrl, 'https://www.medicare.gov/coverage/commode-chairs');
    assert.equal(byId['lightweight-rollator'].coverageUrl, 'https://www.medicare.gov/coverage/walkers');
    assert.equal(byId['wheelchair-rollator'].coverageUrl, 'https://www.medicare.gov/coverage/walkers');
  });

  it('keeps the disclosure and route out of a shop nav', () => {
    assert.equal(
      AFTER_CARE_DISCLOSURE,
      'OversightReports may earn a commission from qualifying purchases. Commercial relationships never affect facility scores, rankings, or safety data.',
    );

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
    assert.match(page, /What does your loved one need help with\?/);
    assert.match(page, /AFTER_CARE_DISCLOSURE|AfterCareDisclosure/);
    assert.match(app, /path="\/after-care"/);
    assert.match(footer, /to="\/after-care"/);
    assert.match(footer, /After care/);
    assert.doesNotMatch(header, /\/after-care/);
    assert.match(readSrc('pages/FacilityPage.jsx'), /s-after-care/);
    assert.match(readSrc('pages/AboutPage.jsx'), /Commercial relationships never affect facility scores/);
  });
});
