import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPARE_BRIEF_DISCLAIMER,
  COMPARE_BRIEF_LABEL,
  buildCompareBriefModel,
  sharedVisitChecklist,
  whatStandsOut,
} from './compareBriefContent.js';

const alpha = {
  ccn: '111111',
  name: 'Alpha Care',
  city: 'Austin',
  state: 'TX',
  stars: 4,
  rn_hprd: 0.8,
  total_fines: 1000,
  total_deficiencies: 4,
  jeopardy_count: 0,
  harm_count: 0,
};
const beta = {
  ccn: '222222',
  name: 'Beta House',
  city: 'Dallas',
  state: 'TX',
  stars: 1,
  rn_hprd: 0.2,
  total_fines: 250000,
  total_deficiencies: 22,
  jeopardy_count: 2,
  harm_count: 3,
  sff: true,
  abuse_icon: true,
  pe_owned: true,
  zero_rn_pct: 18,
};

describe('compareBriefContent', () => {
  it('builds a Compare Brief model with cover title, scorecard, and one worksheet', () => {
    const model = buildCompareBriefModel([alpha, beta], {
      dataAsOf: '2026-08-26',
      reportDate: new Date('2026-09-19T12:00:00'),
    });
    assert.equal(model.productLabel, COMPARE_BRIEF_LABEL);
    assert.equal(model.title, 'Comparing Alpha Care vs Beta House');
    assert.equal(model.count, 2);
    assert.deepEqual(model.ccns, ['111111', '222222']);
    assert.equal(model.offer.priceUsd, 49);
    assert.equal(model.dataAsOfLabel, 'August 2026');
    assert.ok(model.scorecard.some((row) => row.id === 'overall'));
    assert.ok(model.appendix.length >= 3);
    assert.ok(model.checklist.length >= 5);
    assert.equal(model.worksheet.length, 4);
    assert.match(model.disclaimer, /not medical or legal advice/i);
    assert.match(COMPARE_BRIEF_DISCLAIMER, /medicare.gov\/care-compare/);
  });

  it('writes rule-based standouts without inventing clinical advice', () => {
    const notes = whatStandsOut(beta, [alpha, beta]);
    assert.ok(notes.some((n) => /Special Focus/i.test(n)));
    assert.ok(notes.some((n) => /abuse icon/i.test(n)));
    assert.ok(notes.some((n) => /Immediate Jeopardy/i.test(n)));
    assert.ok(notes.length <= 4);
    assert.doesNotMatch(notes.join(' '), /diagnos|prescribe|should choose|I recommend/i);

    const quiet = whatStandsOut(alpha, [alpha]);
    assert.ok(quiet[0]);
    assert.match(quiet.join(' '), /scorecard|tour/i);
  });

  it('keeps one shared checklist, not per-home copies', () => {
    const qs = sharedVisitChecklist([alpha, beta]);
    assert.ok(qs.some((q) => /serious CMS flag/i.test(q)));
    assert.equal(qs.filter((q) => /walk away/i.test(q)).length, 1);
    assert.ok(qs.length <= 7);
  });
});
