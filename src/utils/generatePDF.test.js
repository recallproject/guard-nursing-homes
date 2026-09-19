import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePDF } from './generatePDF.js';
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

function pdfText(doc) {
  return doc.output();
}

describe('generatePDF Family Report', () => {
  it('renders a 1-page Family Report from live Avir JSON', () => {
    const { facility, dataAsOf } = loadAvir();
    assert.ok(facility, 'Avir 675408 should exist in TX.json');
    assert.equal(dataAsOf, '2026-08-26');

    const doc = generatePDF(facility, {
      returnDoc: true,
      dataAsOf,
      reportDate: new Date('2026-09-15T12:00:00'),
    });

    assert.equal(doc.internal.getNumberOfPages(), 1);
    const raw = pdfText(doc);
    assert.match(raw, /Family Report/);
    assert.match(raw, /FREE/);
    assert.match(raw, /Avir at Overton/);
    assert.match(raw, /August 26, 2026/);
    assert.match(raw, /September 15, 2026/);
    assert.match(raw, /Bottom line/i);
    assert.match(raw, /What this means/i);
    assert.match(raw, /Watch for/i);
    assert.match(raw, /Questions to ask on a visit/);
    assert.match(raw, /\$29/);
    assert.match(raw, /Facility Brief/);
    assert.match(raw, /medicare.gov\/care-compare/);
    assert.doesNotMatch(raw, /Clinical Analysis & Family Decision Support/);
    assert.doesNotMatch(raw, /WORKFORCE STABILITY/);
    assert.doesNotMatch(raw, /THE OWNER PICTURE/);
    assert.doesNotMatch(raw, /nurse-to-resident ratio/i);
  });

  it('keeps the paid Facility Brief to 9-10 pages', () => {
    const { facility, nearby, dataAsOf } = loadAvir();
    const brief = generateFacilityBriefPDF(
      facility,
      nearby,
      [],
      null,
      dataAsOf,
      { returnDoc: true, reportDate: new Date('2026-09-15T12:00:00') }
    );
    const pages = brief.internal.getNumberOfPages();
    assert.ok(pages === 9 || pages === 10, `expected 9-10 pages, got ${pages}`);
    assert.match(brief.output(), /Facility Brief/);
  });
});
