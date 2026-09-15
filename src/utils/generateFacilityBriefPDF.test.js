import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateFacilityBriefPDF } from './generateFacilityBriefPDF.js';
import { haversineDistance } from './haversine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

function loadAvir() {
  const tx = JSON.parse(fs.readFileSync(path.join(root, 'public/data/states/TX.json'), 'utf8'));
  const facility = tx.facilities.find((f) => f.ccn === '675408');
  const defsFile = JSON.parse(fs.readFileSync(path.join(root, 'public/deficiency_details/TX.json'), 'utf8'));
  facility.deficiency_details = defsFile['675408']?.deficiency_details || [];
  const nearby = tx.facilities
    .filter((f) => f.ccn !== facility.ccn && f.lat && f.lon && (f.composite || 100) < (facility.composite || 0))
    .map((f) => ({ ...f, distance: haversineDistance(facility.lat, facility.lon, f.lat, f.lon) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
  return { facility, nearby, dataAsOf: tx._metadata?.data_as_of };
}

describe('generateFacilityBriefPDF', () => {
  it('renders a 9-page Facility Brief from live Avir JSON without a reportType picker', () => {
    const { facility, nearby, dataAsOf } = loadAvir();
    assert.ok(facility, 'Avir 675408 should exist in TX.json');
    assert.equal(dataAsOf, '2026-08-26');

    const doc = generateFacilityBriefPDF(
      facility,
      nearby,
      [],
      null,
      dataAsOf,
      { returnDoc: true, reportDate: new Date('2026-09-15T12:00:00') }
    );

    assert.equal(doc.internal.getNumberOfPages(), 9);
    const raw = doc.output();
    assert.match(raw, /Facility Brief/);
    assert.match(raw, /August 2026/);
    assert.match(raw, /Avir at Overton/);
    assert.match(raw, /Bottom line/i);
    assert.doesNotMatch(raw, /FAMILY FACILITY REVIEW/);
    assert.doesNotMatch(raw, /Table of Contents/);
    assert.doesNotMatch(raw, /ATTORNEY EVIDENCE REPORT/);
    assert.doesNotMatch(raw, /nurse-to-resident ratio/i);
    assert.doesNotMatch(raw, /April 2026/);
    assert.doesNotMatch(raw, /CONFIDENTIAL/);
    assert.doesNotMatch(raw, /PREPARED FOR AUTHORIZED/);
    assert.doesNotMatch(raw, /→/);
    assert.doesNotMatch(raw, /!'/);
    assert.match(raw, /->/);
    assert.match(raw, /Staffing/);
    assert.match(raw, /Ownership/);
  });
});
