import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_LABEL,
  BRIEF_PAGE_COUNT,
  formatDataAsOf,
  hasSpecialFocus,
  hasAbuseIcon,
  buildFacilityBriefModel,
  selectDecisionDefs,
} from './facilityBriefContent.js';

const avir = {
  name: 'Avir at Overton',
  ccn: '675408',
  address: '1110 HWY 135 S',
  city: 'OVERTON',
  state: 'TX',
  zip: '75684',
  beds: 100,
  stars: 2,
  composite: 87.6,
  staffing_stars: 3,
  quality_stars: 5,
  inspection_stars: 1,
  rn_hprd: 0.28,
  total_hprd: 3.771,
  lpn_hprd: 0.893,
  cna_hprd: 2.598,
  weekend_rn_hprd: 0.275,
  weekend_total_hprd: 3.624,
  zero_rn_pct: 42.4,
  rn_gap_pct: 52,
  self_report_rn: 0.264,
  avg_census: 49.4,
  total_deficiencies: 41,
  jeopardy_count: 13,
  total_fines: 340621,
  fine_count: 5,
  denial_count: 0,
  complaint_investigations: 24,
  chain_name: 'AVIR HEALTH GROUP',
  ownership_type: 'Organization',
  ownership_changed_recently: true,
  ownership_change_date: '01/01/2024',
  new_owner_name: 'WINNIE-STOWELL HOSPITAL DISTRICT',
  worst_owner: 'MURRELL, EDWARD',
  owner_portfolio_count: 77,
  owner_avg_fines: 95254,
  owner_avg_stars: 2.64,
  owner_pct_below_avg: 46.6,
  adj_total_hprd: 4.443,
  adj_rn_hprd: 0.33,
  total_turnover: 58.3,
  admin_turnover: 1,
  staffing_trend: {
    quarters: ['Q2 2024', 'Q3 2024', 'Q4 2024', 'Q3 2025'],
    rn_hprd: [0.073, 0.171, 0.222, 0.127],
    zero_rn_pct: [69.2, 30.4, 4.3, 42.4],
  },
  flags: [
    'SPECIAL FOCUS FACILITY (CMS flagged)',
    'ABUSE ICON active',
  ],
  top_categories: [
    ['Abuse, Neglect, and Exploitation', 9],
    ['Quality of Life and Care', 8],
    ['Resident Rights', 4],
  ],
  quality_measures: {
    mds: {
      ls: {
        '401': { s: 5.88, d: 'daily activities' },
        '406': { s: 0, d: 'catheter' },
        '407': { s: 0, d: 'UTI' },
        '408': { s: 0, d: 'depression' },
        '409': { s: 0, d: 'restraints' },
        '410': { s: 4.55, d: 'falls' },
        '451': { s: 4.55, d: 'walk' },
        '479': { s: 6.26, d: 'pressure ulcers' },
      },
      ss: {
        '430': { s: 90, d: 'pneumococcal' },
      },
    },
  },
  penalty_timeline: [
    { type: 'Fine', date: '2026-05-20', amount: 19615 },
  ],
};

const details = [
  { survey_date: '2026-05-20', ftag: 'F-0607', scope_severity: 'J', severity_label: 'Immediate Jeopardy', corrected: true, correction_date: '2026-05-27', description: 'Develop and implement policies to prevent abuse', is_complaint: true },
  { survey_date: '2025-08-13', ftag: 'F-0600', scope_severity: 'J', severity_label: 'Immediate Jeopardy', corrected: true, description: 'Protect each resident from all types of abuse', is_complaint: true },
  { survey_date: '2025-08-13', ftag: 'F-0689', scope_severity: 'J', severity_label: 'Immediate Jeopardy', corrected: true, description: 'Ensure that a nursing home area is free from accident hazards' },
  { survey_date: '2025-01-26', ftag: 'F-0678', scope_severity: 'J', severity_label: 'Immediate Jeopardy', corrected: true, correction_date: '2025-02-06', description: 'Provide basic life support, including CPR' },
  { survey_date: '2023-10-26', ftag: 'F-0580', scope_severity: 'J', severity_label: 'Immediate Jeopardy', corrected: true, correction_date: '2023-10-27', description: 'Immediately tell the resident, the resident\'s doctor, and a family member' },
  { survey_date: '2026-04-29', ftag: 'F-0727', scope_severity: 'E', severity_label: 'Potential for More Than Minimal Harm', corrected: true, correction_date: '2026-04-30', description: 'Have a registered nurse on duty 8 hours a day' },
];

describe('facilityBriefContent', () => {
  it('labels CMS as-of from metadata, not a hard-coded April 2026', () => {
    assert.equal(formatDataAsOf('2026-08-26'), 'August 2026');
    assert.notEqual(formatDataAsOf('2026-08-26'), 'April 2026');
  });

  it('detects SFF and abuse icon from flags', () => {
    assert.equal(hasSpecialFocus(avir), true);
    assert.equal(hasAbuseIcon(avir), true);
    assert.equal(hasSpecialFocus({ flags: [] }), false);
  });

  it('builds a Facility Brief model with the approved page map and voice', () => {
    const model = buildFacilityBriefModel(avir, {
      deficiencyDetails: details,
      dataAsOf: '2026-08-26',
      reportDate: new Date('2026-09-15T12:00:00'),
      nearbyAlternatives: [
        { name: 'Henderson Health & Rehabilitation Center', city: 'Henderson', stars: 2, composite: 68.8, total_fines: 10358, jeopardy_count: 3 },
      ],
    });

    assert.equal(model.productLabel, PRODUCT_LABEL);
    assert.equal(model.productLabel, 'Facility Brief');
    assert.equal(model.pageCount, BRIEF_PAGE_COUNT);
    assert.equal(model.dataAsOfLabel, 'August 2026');
    assert.match(model.bottomLine, /Special Focus Facility/i);
    assert.match(model.bottomLine, /abuse icon/i);
    assert.match(model.bottomLine, /Immediate Jeopardy/i);
    assert.doesNotMatch(model.bottomLine, /nurse-to-resident ratio/i);
    assert.doesNotMatch(model.staffingIntro, /nurse-to-resident ratio/i);
    assert.ok(model.strengths.length >= 1);
    assert.ok(model.concerns.length >= 1);
    assert.match(model.inside, /Visit checklist/);
    assert.equal(model.careFitRows.some((r) => /Antipsychotic/i.test(r.name)), false);
    assert.ok(model.careFitRows.some((r) => /Falls/i.test(r.name)));
    assert.ok(model.questions.some((q) => /Special Focus/i.test(q)));
    assert.ok(model.questions.some((q) => /F-0600/i.test(q)));
    assert.ok(model.questions.some((q) => /zero RN/i.test(q)));
    assert.match(model.limitation, /cannot predict an individual resident/i);
    assert.equal(model.nearby.length, 1);
    assert.match(model.sources, /August 2026/);
    assert.ok(model.locationLine.includes('Overton'));
    assert.ok(model.staffingContext.some((line) => line.includes('0.07 -> 0.17')));
    assert.ok(model.ownership.some((b) => /01\/01\/2024 -> Winnie-Stowell/i.test(b.value)));
    assert.ok(model.staffingContext.every((line) => !line.includes('→')));
    assert.ok(model.ownership.every((b) => !String(b.value).includes('→')));
  });

  it('prioritizes Immediate Jeopardy rows in the F-tag subset', () => {
    const rows = selectDecisionDefs(details);
    assert.ok(rows.length > 0);
    assert.equal(rows[0].scope_severity, 'J');
    assert.ok(rows.some((r) => r.ftag.includes('600')));
  });
});
