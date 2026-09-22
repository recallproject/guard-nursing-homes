import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  buildWhatThisRecordShows,
  facilityBodyContent,
  injectRootContent,
  mostRecentSurveyDate,
  pickNearbyFacilities,
} from '../../scripts/facility-prerender.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function loadFacility(ccn, stateCode = 'NC') {
  const data = JSON.parse(
    readFileSync(join(root, `public/data/states/${stateCode}.json`), 'utf8')
  );
  const facility = (data.facilities || []).find((f) => f.ccn === ccn);
  assert.ok(facility, `expected facility ${ccn} in ${stateCode}`);
  return { facility, data };
}

describe('facility prerender enrichment', () => {
  it('builds a citation-ready summary for CCN 345529', () => {
    const { facility, data } = loadFacility('345529', 'NC');
    const defFile = JSON.parse(
      readFileSync(join(root, 'public/deficiency_details/NC.json'), 'utf8')
    );
    const rows = defFile['345529']?.deficiency_details || [];
    const surveyDate = mostRecentSurveyDate(rows);
    assert.equal(surveyDate, '2026-03-03');

    const nearby = pickNearbyFacilities(facility, data.facilities, { limit: 3 });
    const html = facilityBodyContent(facility, {
      stateCode: 'NC',
      dataAsOf: data._metadata?.data_as_of,
      knownChains: new Set(['LIFE CARE CENTERS OF AMERICA']),
      nearby,
      mostRecentSurveyDate: surveyDate,
    });

    assert.match(html, /Universal Health Care\/North Raleigh/);
    assert.match(html, /Number \(CCN\): 345529/);
    assert.match(html, /Raleigh/);
    assert.match(html, /What this record shows/);
    assert.match(html, /Overall CMS rating/);
    assert.match(html, /132 beds/);
    assert.match(html, /Staffing summary/);
    assert.match(html, /Immediate jeopardy/i);
    assert.match(html, /Special Focus Facility/i);
    assert.match(html, /Federal fines/);
    assert.match(html, /Centers for Medicare/);
    assert.match(html, /data as of/i);
    assert.match(html, /Most recent inspection/);
    assert.match(html, /March 3, 2026/);
    assert.match(html, /href="\/state\/NC"/);
    assert.match(html, /href="\/state\/NC\?q=Raleigh"/);
    assert.match(html, /href="\/methodology"/);
    assert.match(html, /href="\/families"/);
    assert.match(html, /href="\/skilled-nursing"/);
    assert.match(html, /Nearby facilities/);
    assert.ok(nearby.length > 0);
    assert.match(html, new RegExp(`/facility/${nearby[0].ccn}`));
  });

  it('summarizes serious flags in plain English', () => {
    const text = buildWhatThisRecordShows({
      name: 'Example Home',
      city: 'Raleigh',
      state: 'NC',
      ccn: '345529',
      stars: 1,
      inspection_stars: 1,
      staffing_stars: 2,
      quality_stars: 3,
      total_deficiencies: 85,
      jeopardy_count: 5,
      total_fines: 326170,
      fine_count: 3,
      flags: ['SPECIAL FOCUS FACILITY (CMS flagged)'],
      chain_name: 'LIFEWORKS REHAB',
    }, { mostRecentSurveyDate: '2026-03-03' });

    assert.match(text, /Example Home/);
    assert.match(text, /1 out of 5 stars/);
    assert.match(text, /immediate jeopardy/);
    assert.match(text, /Special Focus Facility/);
    assert.match(text, /LIFEWORKS REHAB/);
    assert.match(text, /March 3, 2026/);
  });

  it('only links chain pages when the chain exists in the chain index', () => {
    const htmlLinked = facilityBodyContent(
      { name: 'A', city: 'X', state: 'NC', ccn: '1', chain_name: 'KNOWN CHAIN' },
      { stateCode: 'NC', knownChains: new Set(['KNOWN CHAIN']) }
    );
    assert.match(htmlLinked, /href="\/chain\/KNOWN%20CHAIN"/);

    const htmlPlain = facilityBodyContent(
      { name: 'A', city: 'X', state: 'NC', ccn: '1', chain_name: 'UNKNOWN CHAIN' },
      { stateCode: 'NC', knownChains: new Set(['KNOWN CHAIN']) }
    );
    assert.doesNotMatch(htmlPlain, /href="\/chain\/UNKNOWN/);
    assert.match(htmlPlain, /UNKNOWN CHAIN/);
  });
});

describe('homepage crawlable shell', () => {
  it('ships consumer paragraphs and real internal links in index.html', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    assert.match(html, /Research a nursing home before you choose/);
    assert.match(html, /families/i);
    assert.match(html, /CMS/);
    assert.match(html, /href="\/facility\/345529"/);
    assert.match(html, /href="\/skilled-nursing"/);
    assert.match(html, /href="\/state\/NC"/);
    assert.match(html, /href="\/families"/);
    assert.match(html, /href="\/methodology"/);
  });

  it('lets facility prerender replace nested homepage root content', () => {
    const template = readFileSync(join(root, 'index.html'), 'utf8');
    const out = injectRootContent(template, '<p id="facility-seo">Facility summary</p>');
    assert.match(out, /id="facility-seo"/);
    assert.doesNotMatch(out, /Research a nursing home before you choose/);
    assert.match(out, /<div id="root"><p id="facility-seo">Facility summary<\/p><\/div>/);
  });
});
