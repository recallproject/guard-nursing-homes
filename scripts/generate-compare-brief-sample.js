#!/usr/bin/env node
/**
 * Write the public Compare Brief sample (3 Louisiana homes).
 *
 * Usage: node scripts/generate-compare-brief-sample.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { COMPARE_BRIEF_SAMPLE_CCNS } from '../src/utils/compareBriefOffer.js';
import { generateCompareBriefPDF } from '../src/utils/generateCompareBriefPDF.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const la = JSON.parse(fs.readFileSync(path.join(root, 'public/data/states/LA.json'), 'utf8'));
const homes = COMPARE_BRIEF_SAMPLE_CCNS.map((ccn) => la.facilities.find((facility) => facility.ccn === ccn));
if (homes.some((home) => !home)) {
  console.error('Sample CCNs missing from LA.json', COMPARE_BRIEF_SAMPLE_CCNS);
  process.exit(1);
}

const doc = generateCompareBriefPDF(homes, {
  returnDoc: true,
  dataAsOf: la._metadata?.data_as_of || null,
  reportDate: new Date('2026-09-29T12:00:00'),
});

const outDir = path.join(root, 'public/samples');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'Compare_Brief_Sample_LA.pdf');
fs.writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')));
console.log(`Wrote ${outPath}`);
console.log(`pages=${doc.getNumberOfPages()} homes=${homes.map((home) => home.ccn).join(',')}`);
