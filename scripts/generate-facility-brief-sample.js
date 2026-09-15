#!/usr/bin/env node
/**
 * Write a before/after-style Facility Brief sample for Avir at Overton (CCN 675408).
 *
 * Usage: node scripts/generate-facility-brief-sample.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateFacilityBriefPDF } from '../src/utils/generateFacilityBriefPDF.js';
import { haversineDistance } from '../src/utils/haversine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const CCN = '675408';

const tx = JSON.parse(fs.readFileSync(path.join(root, 'public/data/states/TX.json'), 'utf8'));
const facility = tx.facilities.find((f) => f.ccn === CCN);
if (!facility) {
  console.error(`Facility ${CCN} not found in TX.json`);
  process.exit(1);
}

const defs = JSON.parse(fs.readFileSync(path.join(root, 'public/deficiency_details/TX.json'), 'utf8'));
facility.deficiency_details = defs[CCN]?.deficiency_details || [];

const nearby = tx.facilities
  .filter((f) => f.ccn !== facility.ccn && f.lat && f.lon && (f.composite || 100) < (facility.composite || 0))
  .map((f) => ({ ...f, distance: haversineDistance(facility.lat, facility.lon, f.lat, f.lon) }))
  .sort((a, b) => a.distance - b.distance)
  .slice(0, 3);

const dataAsOf = tx._metadata?.data_as_of || null;
const doc = generateFacilityBriefPDF(facility, nearby, tx.facilities, null, dataAsOf, {
  returnDoc: true,
  reportDate: new Date('2026-09-15T12:00:00'),
});

const outDir = path.join(root, 'public/samples');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'Facility_Brief_Avir_Overton_675408.pdf');
fs.writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')));

console.log(`Wrote ${outPath}`);
console.log(`pages=${doc.getNumberOfPages()} data_as_of=${dataAsOf} stars=${facility.stars} ij=${facility.jeopardy_count} fines=${facility.total_fines}`);
