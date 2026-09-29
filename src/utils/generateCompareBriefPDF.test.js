import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateCompareBriefPDF } from './generateCompareBriefPDF.js';
import { decodeJsPdfContent } from './pdfSafeText.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const BANNED = /\b(best|safest|winner|tie)\b/i;

function loadLa(ccns) {
  const la = JSON.parse(fs.readFileSync(path.join(root, 'public/data/states/LA.json'), 'utf8'));
  return {
    homes: ccns.map((ccn) => la.facilities.find((facility) => facility.ccn === ccn)),
    dataAsOf: la._metadata?.data_as_of,
  };
}

function render(ccns) {
  const { homes, dataAsOf } = loadLa(ccns);
  assert.equal(homes.filter(Boolean).length, ccns.length);
  const doc = generateCompareBriefPDF(homes, {
    returnDoc: true,
    dataAsOf,
    reportDate: new Date('2026-09-29T12:00:00'),
  });
  const text = decodeJsPdfContent(doc.output());
  return { doc, text, dataAsOf };
}

describe('generateCompareBriefPDF', () => {
  it('renders one combined PDF for three Louisiana homes', () => {
    const { doc, text, dataAsOf } = render(['195381', '195180', '195312']);
    const pages = doc.internal.getNumberOfPages();
    assert.equal(dataAsOf, '2026-08-26');
    assert.ok(pages >= 4 && pages <= 8, `expected 4-8 pages, got ${pages}`);
    assert.match(text, /Compare Brief/);
    assert.match(text, /Christwood/);
    assert.match(text, /Pierremont/);
    assert.match(text, /August 2026/);
    assert.match(text, /Scorecard/);
    assert.match(text, /Material differences/);
    assert.match(text, /Questions for your visit/);
    assert.match(text, /Notes and decision/);
    assert.match(text, /Not affiliated with/);
    assert.match(text, /cannot pay to change this presentation/);
    assert.match(text, /Not enough comparable information/);
    assert.doesNotMatch(text, BANNED);
    assert.doesNotMatch(text, /buy\.stripe\.com/);
    assert.doesNotMatch(text, /nurse-to-resident ratio/i);
    const overflows = doc.__briefOverflows || [];
    assert.equal(overflows.length, 0, `layout overflow: ${JSON.stringify(overflows.slice(0, 8), null, 2)}`);
  });

  it('renders a two-home brief on the $49 path without a third column of facts', () => {
    const { doc, text } = render(['195381', '195312']);
    const pages = doc.internal.getNumberOfPages();
    assert.ok(pages >= 4 && pages <= 8, `expected 4-8 pages, got ${pages}`);
    assert.match(text, /2 nursing homes/);
    assert.match(text, /Christwood/);
    assert.match(text, /Pierremont/);
    assert.doesNotMatch(text, /Ochsner/);
    assert.doesNotMatch(text, BANNED);
    assert.equal((doc.__briefOverflows || []).length, 0);
  });
});
