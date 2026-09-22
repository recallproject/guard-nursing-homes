import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { hasSffFlag } from './facilityFlags.js';
import {
  applySffToFacility,
  facilityMatchesQuery,
  formatSffDate,
  sffCompareValue,
  sffDetailRows,
  sffStatusOf,
  sffSummarySentence,
} from './sffStatus.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const posting = JSON.parse(readFileSync(join(root, 'public/data/sff_posting.json'), 'utf8'));

function loadStored(ccn, stateCode) {
  const data = JSON.parse(readFileSync(join(root, `public/data/states/${stateCode}.json`), 'utf8'));
  const facility = (data.facilities || []).find((row) => row.ccn === ccn);
  assert.ok(facility, `missing ${ccn}`);
  return facility;
}

describe('SFF posting status', () => {
  it('classifies CCN 345529 as graduated, not an active SFF', () => {
    const stored = loadStored('345529', 'NC');
    assert.match(stored.flags.join(' '), /SPECIAL FOCUS/);
    const facility = applySffToFacility(stored, posting);

    assert.equal(facilityMatchesQuery(facility, 'Universal Health Care/North Raleigh'), true);
    assert.equal(facilityMatchesQuery(facility, 'Perry Creek'), true);
    assert.equal(facility.sff_status, 'graduated');
    assert.equal(sffStatusOf(facility), 'graduated');
    assert.equal(hasSffFlag(facility), false);
    assert.equal(facility.sff.graduation_date, '2026-06-08');
    assert.equal(facility.sff.months_in_program, 15);
    assert.equal(formatSffDate(facility.sff.graduation_date), 'June 8, 2026');
    assert.match(facility.name, /Perry Creek Health and Rehabilitation Center/);
    assert.deepEqual(facility.former_names, ['Universal Health Care/North Raleigh']);
    assert.equal(facility.flags.some((flag) => /special focus/i.test(flag)), false);

    const rows = sffDetailRows(facility);
    assert.equal(rows[0].value, 'Graduated from SFF program');
    assert.equal(rows.find((row) => row.label === 'Graduation date').value, 'June 8, 2026');
    assert.equal(rows.find((row) => row.label === 'Time in SFF program').value, '15 months');

    const summary = sffSummarySentence(facility);
    assert.match(summary, /graduated from the Special Focus Facility program on June 8, 2026/);
    assert.match(summary, /15 months/);
    assert.match(summary, /not a current SFF designation/);
    assert.doesNotMatch(summary, /or candidate/i);
    assert.doesNotMatch(summary, /CMS-flagged/);
    assert.doesNotMatch(sffCompareValue(facility), /Yes — on the list|Yes — CMS-flagged/);
  });

  it('keeps a current Table A home active and distinct from candidates', () => {
    const active = applySffToFacility(
      { ccn: '015463', name: 'Knollwood Healthcare', flags: ['SPECIAL FOCUS FACILITY (CMS flagged)'] },
      posting
    );
    const candidate = applySffToFacility(
      { ccn: '015019', name: 'MERRY WOOD LODGE', flags: ['SPECIAL FOCUS FACILITY (CMS flagged)'] },
      posting
    );

    assert.equal(active.sff_status, 'active');
    assert.equal(hasSffFlag(active), true);
    assert.equal(active.sff.most_recent_inspection, '2026-03-06');
    assert.equal(active.sff.met_survey_criteria, true);
    assert.equal(active.sff.months_in_program, 24);
    assert.match(sffDetailRows(active).map((row) => row.value).join(' '), /Current Special Focus Facility/);
    assert.match(sffSummarySentence(active), /current Special Focus Facility/);
    assert.doesNotMatch(sffSummarySentence(active), /graduated/i);

    assert.equal(candidate.sff_status, 'candidate');
    assert.equal(hasSffFlag(candidate), false);
    assert.notEqual(candidate.sff_status, active.sff_status);
    assert.match(sffDetailRows(candidate)[0].value, /SFF candidate/);
    assert.match(sffSummarySentence(candidate), /not as a current Special Focus Facility/);
    assert.doesNotMatch(sffCompareValue(candidate), /Current Special Focus Facility/);
  });

  it('classifies Table C separately from graduated and active', () => {
    const facility = applySffToFacility({ ccn: '295029', name: 'WHITE PINE CARE CENTER', flags: [] }, posting);
    assert.equal(facility.sff_status, 'terminated');
    assert.equal(hasSffFlag(facility), false);
    assert.equal(facility.sff.termination_date, '2026-03-01');
    assert.match(sffDetailRows(facility).map((row) => `${row.label}: ${row.value}`).join('\n'), /Termination date: March 1, 2026/);
    assert.match(sffSummarySentence(facility), /no longer participating in Medicare and Medicaid/);
  });

  it('does not let a stale special-focus flag override an explicit graduated status', () => {
    const facility = {
      ccn: '345529',
      sff_status: 'graduated',
      flags: ['SPECIAL FOCUS FACILITY (CMS flagged)'],
      sff: { status: 'graduated', graduation_date: '2026-06-08', months_in_program: 15 },
    };
    assert.equal(sffStatusOf(facility), 'graduated');
    assert.equal(hasSffFlag(facility), false);
  });

  it('still treats a legacy flag as active when no structured status was applied', () => {
    const facility = { flags: ['SPECIAL FOCUS FACILITY (CMS flagged)'] };
    assert.equal(sffStatusOf(facility), 'active');
    assert.equal(hasSffFlag(facility), true);
  });
});
