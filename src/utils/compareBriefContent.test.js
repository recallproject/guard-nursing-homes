import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCompareBriefModel, SHARED_TOUR_QUESTIONS } from './compareBriefContent.js';

const BANNED = /\b(best|safest|winner|tie)\b/i;

function home(overrides) {
  return {
    ccn: '111111',
    name: 'Alpha Home',
    city: 'Austin',
    state: 'TX',
    stars: 4,
    inspection_stars: 4,
    staffing_stars: 4,
    quality_stars: 4,
    total_deficiencies: 10,
    jeopardy_count: 0,
    total_fines: 0,
    rn_hprd: 0.6,
    weekend_rn_hprd: 0.4,
    zero_rn_pct: 5,
    chain_name: 'Same Operator',
    ...overrides,
  };
}

function prose(model) {
  return JSON.stringify(model);
}

describe('buildCompareBriefModel', () => {
  it('describes a real gap without ranking a home', () => {
    const model = buildCompareBriefModel([
      home({ ccn: '111111', name: 'Alpha Home', stars: 5, rn_hprd: 0.8, jeopardy_count: 0 }),
      home({
        ccn: '222222',
        name: 'Beta Home',
        city: 'Dallas',
        stars: 1,
        inspection_stars: 1,
        staffing_stars: 1,
        rn_hprd: 0.2,
        jeopardy_count: 4,
        total_fines: 80000,
        total_deficiencies: 40,
      }),
    ], { dataAsOf: '2026-08-26', reportDate: new Date('2026-09-29T12:00:00') });

    assert.equal(model.product, 'compare_brief_2');
    assert.equal(model.price, 49);
    assert.equal(model.sharedQuestions.length, 7);
    assert.equal(SHARED_TOUR_QUESTIONS.length, 7);
    const text = prose(model);
    assert.match(text, /Alpha Home/);
    assert.match(text, /Beta Home/);
    assert.match(text, /registered-nurse hours/);
    assert.match(text, /Immediate Jeopardy/);
    assert.match(text, /not affiliated with/i);
    assert.match(text, /cannot pay OversightReports/i);
    assert.doesNotMatch(text, BANNED);
    assert.equal(model.facilityQuestions.length, 2);
    assert.ok(model.facilityQuestions[1].questions.length >= 1);
  });

  it('says not enough comparable information when a required figure is missing', () => {
    const model = buildCompareBriefModel([
      home({ ccn: '111111', stars: null }),
      home({ ccn: '222222', name: 'Beta Home', stars: 4 }),
    ], { dataAsOf: '2026-08-26', reportDate: new Date('2026-09-29T12:00:00') });
    const overall = model.differences.find((item) => item.id === 'overall');
    assert.equal(overall.status, 'insufficient');
    assert.match(overall.text, /Not enough comparable information/);
    assert.doesNotMatch(prose(model), BANNED);
  });

  it('does not call a small gap a tie', () => {
    const model = buildCompareBriefModel([
      home({ ccn: '111111' }),
      home({ ccn: '222222', name: 'Beta Home', rn_hprd: 0.62, stars: 4 }),
    ], { dataAsOf: '2026-08-26', reportDate: new Date('2026-09-29T12:00:00') });
    assert.equal(model.differences.find((item) => item.id === 'overall'), undefined);
    assert.equal(model.differences.find((item) => item.id === 'rn'), undefined);
    assert.match(model.noMaterialDifference, /Not enough comparable information/);
    assert.doesNotMatch(model.noMaterialDifference, /\btie\b/i);
    assert.equal(model.product, 'compare_brief_2');
  });

  it('uses the $69 SKU for three homes', () => {
    const model = buildCompareBriefModel([
      home({ ccn: '111111' }),
      home({ ccn: '222222', name: 'Beta Home' }),
      home({ ccn: '333333', name: 'Gamma Home', city: 'Waco' }),
    ], { dataAsOf: '2026-08-26', reportDate: new Date('2026-09-29T12:00:00') });
    assert.equal(model.product, 'compare_brief_3');
    assert.equal(model.price, 69);
    assert.equal(model.scorecard[0].cells.length, 3);
    assert.doesNotMatch(prose(model), BANNED);
  });
});
