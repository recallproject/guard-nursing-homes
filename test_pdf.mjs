import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import jspdfModule from 'jspdf';
import 'jspdf-autotable';

const { jsPDF } = jspdfModule;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load facility data
const data = JSON.parse(readFileSync(join(__dirname, 'public/facilities_map_data.json'), 'utf8'));

const targetCCN = process.argv[2] || '145995';
let facility = null;
let allFacilities = [];

for (const [state, stateData] of Object.entries(data.states)) {
  if (stateData.facilities) {
    for (const f of stateData.facilities) {
      allFacilities.push(f);
      if (f.ccn === targetCCN) facility = f;
    }
  }
}

if (!facility) { console.error(`Facility ${targetCCN} not found`); process.exit(1); }
console.log(`Generating PDF for: ${facility.name} (${facility.ccn})`);
console.log(`  Stars: ${facility.stars} | Fines: $${facility.total_fines?.toLocaleString()} | Deficiencies: ${facility.total_deficiencies}`);

// Monkey-patch save to write to disk
const origSave = jsPDF.prototype.save;
jsPDF.prototype.save = function(filename) {
  const outPath = join(__dirname, filename || 'evidence_report.pdf');
  const buffer = Buffer.from(this.output('arraybuffer'));
  writeFileSync(outPath, buffer);
  console.log(`PDF saved to: ${outPath}`);
  console.log(`File size: ${(buffer.length / 1024).toFixed(1)} KB`);
  console.log(`Pages: ${this.internal.getNumberOfPages()}`);
};

// Find nearby alternatives
const nearby = allFacilities
  .filter(f => f.state === facility.state && f.ccn !== facility.ccn && (f.composite || 100) < (facility.composite || 0))
  .sort((a, b) => (a.composite || 100) - (b.composite || 100))
  .slice(0, 5);

// Generate
const { generateEvidencePDF } = await import('./src/utils/generateEvidencePDF.js');
try {
  generateEvidencePDF(facility, nearby, allFacilities);
  console.log('Done!');
} catch (err) {
  console.error('Error generating PDF:', err.message);
  console.error(err.stack);
}

jsPDF.prototype.save = origSave;
