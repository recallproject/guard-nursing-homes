import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateFacilityBriefPDF } from './generateFacilityBriefPDF.js';
import { haversineDistance } from './haversine.js';
import { decodeJsPdfContent } from './pdfSafeText.js';

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
  it('renders a Facility Brief from live Avir JSON without a reportType picker', () => {
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

    const pageCount = doc.internal.getNumberOfPages();
    assert.ok(pageCount === 9 || pageCount === 10, `expected 9-10 pages, got ${pageCount}`);
    const raw = doc.output();
    const text = decodeJsPdfContent(raw);
    assert.match(raw, /Facility Brief/);
    assert.match(text, /August 2026/);
    assert.match(text, /Avir at Overton/);
    assert.match(text, /Bottom line/i);
    assert.doesNotMatch(text, /FAMILY FACILITY REVIEW/);
    assert.doesNotMatch(text, /Table of Contents/);
    assert.doesNotMatch(text, /ATTORNEY EVIDENCE REPORT/);
    assert.doesNotMatch(text, /nurse-to-resident ratio/i);
    assert.doesNotMatch(text, /April 2026/);
    assert.doesNotMatch(text, /CONFIDENTIAL/);
    assert.doesNotMatch(text, /PREPARED FOR AUTHORIZED/);
    assert.doesNotMatch(text, /→/);
    assert.doesNotMatch(text, /!'/);
    assert.match(text, /->/);
    assert.match(text, /Staffing/);
    assert.match(text, /Ownership/);
    assert.match(text, /Questions & concerns/);
    assert.match(text, /Murrell/);
    assert.match(text, /portfolio/);
    assert.match(text, /averages high fines/);
    assert.match(raw, /LiberationSans/);
    assert.match(raw, /\/FontFile2/);
    assert.match(raw, /\/Subtype\s*\/CIDFontType2/);
    assert.match(raw, /Identity-H/);
    assert.match(text, /INSPECTION STORY|Inspection story/i);
    assert.match(text, /VISIT CHECKLIST|Visit checklist/i);
    assert.match(text, /Questions continued/i);
    assert.match(text, /DECISION WORKSHEET|Decision worksheet/i);
    assert.equal(pageCount, 10, 'leftover checklist questions must not share a page with the worksheet');
    assert.match(text, /Special Focus Facility/);
    assert.match(text, /Winnie-Stowell Hospital District/);
    assert.match(text, /Answered by:/);
    const overflows = doc.__briefOverflows || [];
    const page5 = overflows.filter((item) => item.page === 5);
    const page8 = overflows.filter((item) => item.page === 8);
    assert.equal(page5.length, 0, `page 5 overflow: ${JSON.stringify(page5, null, 2)}`);
    assert.equal(page8.length, 0, `page 8 overflow: ${JSON.stringify(page8, null, 2)}`);
    assert.equal(overflows.length, 0, `layout overflow: ${JSON.stringify(overflows, null, 2)}`);
  });

  it('does not show an attorney-toggle debug label on the customer-facing Brief', () => {
    const jsx = fs.readFileSync(path.join(root, 'src/components/FacilityBriefDocument.jsx'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'src/styles/facility-brief.css'), 'utf8');
    assert.doesNotMatch(jsx, /attorney toggle/i);
    assert.doesNotMatch(jsx, /fb-no-dropdown/);
    assert.doesNotMatch(css, /fb-no-dropdown/);
    assert.doesNotMatch(css, /no attorney/i);
    assert.match(jsx, /Download PDF/);
    assert.match(jsx, /Print/);
  });

  it('print CSS uses system fonts and does not print Google webfonts', () => {
    const css = fs.readFileSync(path.join(root, 'src/styles/facility-brief.css'), 'utf8');
    const printBlock = css.split('@media print')[1] || '';
    assert.match(printBlock, /system-ui/);
    assert.match(printBlock, /-webkit-font-smoothing:\s*auto/);
    assert.match(printBlock, /font-synthesis:\s*none/);
    assert.doesNotMatch(printBlock, /font-family:[^;]*Jakarta/);
    assert.doesNotMatch(printBlock, /font-family:[^;]*Serif Display/);
  });
});
