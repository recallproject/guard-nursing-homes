import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FAMILY_REPORT_PAGE_COUNT,
  FAMILY_REPORT_LABEL,
  formatDataAsOfFull,
  buildFamilyReportModel,
} from './familyReportContent.js';

const avir = {
  name: 'Avir at Overton',
  ccn: '675408',
  address: '1110 HWY 135 S',
  city: 'OVERTON',
  state: 'TX',
  zip: '75684',
  beds: 100,
  stars: 2,
  staffing_stars: 3,
  quality_stars: 5,
  inspection_stars: 1,
  rn_hprd: 0.28,
  zero_rn_pct: 42.4,
  rn_gap_pct: 52,
  jeopardy_count: 13,
  total_fines: 340621,
  chain_name: 'AVIR HEALTH GROUP',
  flags: [
    'SPECIAL FOCUS FACILITY (CMS flagged)',
    'ABUSE ICON active',
  ],
};

describe('familyReportContent', () => {
  it('formats CMS as-of with day, matching the approved mock', () => {
    assert.equal(formatDataAsOfFull('2026-08-26'), 'August 26, 2026');
  });

  it('builds Avir copy that follows the approved 1-page mock', () => {
    const model = buildFamilyReportModel(avir, {
      dataAsOf: '2026-08-26',
      reportDate: new Date('2026-09-15T12:00:00'),
    });

    assert.equal(model.productLabel, FAMILY_REPORT_LABEL);
    assert.equal(model.pageCount, FAMILY_REPORT_PAGE_COUNT);
    assert.equal(model.dataAsOfLabel, 'August 26, 2026');
    assert.equal(model.reportDateLabel, 'September 15, 2026');
    assert.equal(model.metaLine.includes('CCN 675408'), true);
    assert.equal(model.stars.overall.value, '2 of 5');
    assert.equal(model.stars.inspection.value, '1 of 5');
    assert.equal(model.stars.staffing.value, '3 of 5');
    assert.equal(model.stars.quality.value, '5 of 5');

    assert.equal(model.chips.some((c) => c.label === 'Immediate Jeopardy' && c.value === '13 citations'), true);
    assert.equal(model.chips.some((c) => c.label === 'Special Focus'), true);
    assert.equal(model.chips.some((c) => c.label === 'Abuse icon' && c.value === 'Active'), true);
    assert.equal(model.chips.some((c) => c.label === 'Fines (reported)' && /\$340,621/.test(c.value)), true);

    assert.match(model.bottomLine, /Special Focus/i);
    assert.match(model.bottomLine, /abuse icon/i);
    assert.match(model.bottomLine, /thirteen Immediate Jeopardy/i);
    assert.match(model.bottomLine, /stars alone are not enough/i);

    assert.equal(model.means[0].value, 'High concern');
    assert.equal(model.means[1].value, 'Thin RN coverage');
    assert.match(model.means[1].detail, /0\.28/);
    assert.match(model.means[1].detail, /~42%/);
    assert.equal(model.means[2].value, 'Stronger signal');
    assert.match(model.means[2].detail, /does not erase inspection or Special Focus flags/);

    assert.equal(model.watchFors.some((w) => w.label === 'Special Focus Facility'), true);
    assert.equal(model.watchFors.some((w) => /Immediate Jeopardy \(13\)/.test(w.label)), true);
    assert.equal(model.watchFors.some((w) => /52% gap/.test(w.text)), true);
    assert.equal(model.watchFors.some((w) => /About \$341,000/.test(w.text)), true);

    assert.equal(model.questions[0].includes('RN on duty'), true);
    assert.equal(model.questions.some((q) => /Special Focus Facility plan/.test(q)), true);
    assert.equal(model.questions.some((q) => /Immediate Jeopardy issues corrected/.test(q)), true);
    assert.equal(model.questions.some((q) => /abuse or neglect/.test(q)), true);
    assert.equal(model.questions.some((q) => /mealtime/.test(q)), true);
    assert.match(model.ctaBody, /Facility Brief/);
    assert.doesNotMatch(model.bottomLine, /nurse-to-resident ratio/i);
  });

  it('does not invent SFF or abuse flags for a quieter home', () => {
    const model = buildFamilyReportModel({
      name: 'Peaceful Pines',
      ccn: '675000',
      city: 'Austin',
      state: 'TX',
      stars: 5,
      inspection_stars: 5,
      staffing_stars: 4,
      quality_stars: 5,
      rn_hprd: 0.8,
      zero_rn_pct: 2,
      jeopardy_count: 0,
      total_fines: 0,
      flags: [],
    });
    assert.equal(model.sff, false);
    assert.equal(model.abuse, false);
    assert.equal(model.ijCount, 0);
    assert.equal(model.chips.some((c) => c.label === 'Special Focus'), false);
    assert.doesNotMatch(model.bottomLine, /Special Focus/i);
  });
});
