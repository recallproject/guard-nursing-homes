import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cellValue,
  DETAIL_GROUPS,
  FIRST_VIEW_ROWS,
  formatCurrency,
  formatStars,
  freshnessLabel,
  ownershipLabel,
} from './compareMetrics.js';

const facility = {
  name: 'Avir at Overton',
  ccn: '675408',
  city: 'Overton',
  state: 'TX',
  stars: 2,
  inspection_stars: 1,
  staffing_stars: 3,
  quality_stars: 5,
  composite: 87.6,
  total_fines: 340621,
  total_deficiencies: 41,
  jeopardy_count: 13,
  rn_hprd: 0.28,
  chain_name: 'AVIR HEALTH GROUP',
  pe_owned: false,
  reit_owned: true,
  flags: ['SPECIAL FOCUS FACILITY (CMS flagged)', 'ABUSE ICON active'],
  quality_measures: {
    mds: { ls: { 404: { s: 6.06 }, 410: { s: 4.55 } } },
  },
};

describe('compareMetrics first-view rows', () => {
  it('exposes seven decision rows mapped to existing CMS fields', () => {
    assert.equal(FIRST_VIEW_ROWS.length, 7);
    const ids = FIRST_VIEW_ROWS.map((row) => row.id);
    assert.deepEqual(ids, [
      'overall',
      'inspections',
      'staffing',
      'quality',
      'safety',
      'fines',
      'ownership',
    ]);
    assert.match(cellValue(FIRST_VIEW_ROWS[0], facility), /2\/5/);
    assert.match(cellValue(FIRST_VIEW_ROWS[1], facility), /41 citation/);
    assert.match(cellValue(FIRST_VIEW_ROWS[2], facility), /0\.28 HPRD/);
    assert.match(cellValue(FIRST_VIEW_ROWS[4], facility), /Immediate Jeopardy/);
    assert.match(cellValue(FIRST_VIEW_ROWS[4], facility), /SFF/);
    assert.equal(cellValue(FIRST_VIEW_ROWS[5], facility), formatCurrency(340621));
    assert.match(ownershipLabel(facility), /AVIR HEALTH GROUP/);
    assert.match(ownershipLabel(facility), /REIT/);
  });

  it('labels directionality and keeps accordion groups for extra measures', () => {
    assert.ok(FIRST_VIEW_ROWS.every((row) => row.direction && row.why));
    assert.ok(DETAIL_GROUPS.length >= 4);
    const outcomes = DETAIL_GROUPS.find((g) => g.id === 'outcomes');
    assert.match(cellValue(outcomes.rows.find((r) => r.id === 'weight-loss'), facility), /6\.1%/);
    assert.equal(formatStars(null), 'Not rated');
    assert.equal(freshnessLabel('2026-08-26'), 'August 2026');
  });
});
