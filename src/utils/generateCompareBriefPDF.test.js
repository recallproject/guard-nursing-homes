import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateCompareBriefPDF } from './generateCompareBriefPDF.js';
import { decodeJsPdfContent } from './pdfSafeText.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

function loadHomes(count = 3) {
  const tx = JSON.parse(fs.readFileSync(path.join(root, 'public/data/states/TX.json'), 'utf8'));
  const avir = tx.facilities.find((f) => f.ccn === '675408');
  const rest = tx.facilities.filter((f) => f.ccn !== '675408').slice(0, count - 1);
  return { homes: [avir, ...rest].filter(Boolean), dataAsOf: tx._metadata?.data_as_of };
}

describe('generateCompareBriefPDF', () => {
  it('renders a paid Compare Brief from live TX JSON without dumping deficiency lists', () => {
    const { homes, dataAsOf } = loadHomes(3);
    assert.equal(homes.length, 3);

    const doc = generateCompareBriefPDF(homes, {
      returnDoc: true,
      dataAsOf,
      reportDate: new Date('2026-09-19T12:00:00'),
    });

    const pages = doc.internal.getNumberOfPages();
    assert.equal(pages, 6, `expected 6 pages (cover through appendix), got ${pages}`);
    const raw = doc.output();
    const text = decodeJsPdfContent(raw);
    assert.match(raw, /Compare Brief/);
    assert.match(text, /Comparing /);
    assert.match(text, /Inside this packet|INSIDE THIS PACKET/i);
    assert.match(text, /August 2026/);
    assert.match(text, /Side-by-side scorecard|SCORECARD/i);
    assert.match(text, /What stands out|WHAT STANDS OUT/i);
    assert.match(text, /Visit checklist|VISIT CHECKLIST/i);
    assert.match(text, /Decision worksheet|DECISION WORKSHEET/i);
    assert.match(text, /not medical or legal advice/i);
    assert.doesNotMatch(text, /buy\.stripe\.com/);
    assert.doesNotMatch(text, /ATTORNEY EVIDENCE/);
    const defMentions = (text.match(/deficiency_details|Full CMS deficiency list/gi) || []).length;
    assert.equal(defMentions, 0);
    assert.match(raw, /LiberationSans/);
  });
});
