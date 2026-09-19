import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateComparisonPDF } from './generateComparisonPDF.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

function loadHomes() {
  const tx = JSON.parse(fs.readFileSync(path.join(root, 'public/data/states/TX.json'), 'utf8'));
  return tx.facilities.slice(0, 3);
}

describe('generateComparisonPDF', () => {
  it('renders a 1-page free comparison snapshot from live facility JSON', () => {
    const homes = loadHomes();
    assert.equal(homes.length, 3);
    const doc = generateComparisonPDF(homes, {
      returnDoc: true,
      dataAsOf: '2026-08-26',
    });
    assert.equal(doc.internal.getNumberOfPages(), 1);
    const raw = doc.output();
    assert.match(raw, /3-home comparison|Compare 3 nursing homes/);
    assert.match(raw, /August 2026/);
    assert.match(raw, /Overall rating/);
    assert.match(raw, /\$29/);
    assert.doesNotMatch(raw, /buy\.stripe\.com/);
  });
});
