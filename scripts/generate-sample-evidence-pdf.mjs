/**
 * Generate a fictional sample Evidence Report PDF.
 * Run: node scripts/generate-sample-evidence-pdf.mjs
 * Output: public/samples/OversightReport_Sample_Evidence_Report.pdf
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { writeFileSync } from 'fs';

const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 20;
const contentWidth = pageWidth - margin * 2;
let currentY = margin;
let pageNumber = 1;

// ======================== COLOUR PALETTE ========================
const NAVY = [15, 22, 41];
const STEEL = [74, 85, 104];
const BODY = [55, 65, 81];
const LIGHT_BG = [248, 249, 250];
const RED_BG = [255, 245, 245];
const AMBER_BG = [255, 251, 235];
const BLUE_BG = [235, 248, 255];
const GREEN = [22, 101, 52];
const AMBER = [161, 98, 7];
const RED = [185, 28, 28];
const WHITE = [255, 255, 255];
const TABLE_ALT = [245, 247, 250];
const TABLE_HEADER = [15, 22, 41];
const DIVIDER = [209, 213, 219];

// ======================== NATIONAL AVERAGES ========================
const NATIONAL_AVG = {
  total_hprd: 3.82, rn_hprd: 0.54, lpn_hprd: 0.79, cna_hprd: 2.18,
  zero_rn_pct: 8.0, composite: 32.1, total_fines: 28000, stars: 3.2,
  total_deficiencies: 8.5, contractor_pct: 12.0,
};

// ======================== FICTIONAL FACILITY ========================
const F = {
  name: 'Sample Facility Name',
  ccn: '000000',
  city: 'Springfield',
  state: 'IL',
  zip: '62704',
  beds: 120,
  stars: 1,
  composite: 87.4,
  total_deficiencies: 23,
  total_fines: 284500,
  fine_count: 4,
  denial_count: 1,
  jeopardy_count: 2,
  harm_count: 5,
  zero_rn_pct: 31,
  rn_hprd: 0.15,
  lpn_hprd: 0.47,
  cna_hprd: 1.58,
  total_hprd: 2.35,
  weekend_total_hprd: 1.82,
  weekend_rn_hprd: 0.04,
  avg_census: 98.3,
  pct_contract: 28,
  contractor_pct: 28,
  rn_gap_pct: 42,
  staffing_stars: 1,
  ownership_type: 'For Profit - Corporation',
  worst_owner: 'Sample Holdings LLC',
  owner_portfolio_count: 4,
  owner_avg_stars: 1.3,
  chain_name: 'Sample Healthcare Group',
  self_report_rn: 0.26,
  top_categories: [
    ['Infection Control', 6], ['Fall Prevention', 4], ['Medication Errors', 3],
    ['Nutrition/Dietary', 3], ['Resident Rights', 2],
  ],
};

const SIBLINGS = [
  { name: 'Lakeview Manor', city: 'Joliet', state: 'IL', stars: 1, composite: 82.1, total_deficiencies: 19, total_fines: 195000, ccn: '100001', worst_owner: 'Sample Holdings LLC', total_hprd: 2.51 },
  { name: 'Sunrise Care of Peoria', city: 'Peoria', state: 'IL', stars: 1, composite: 78.5, total_deficiencies: 17, total_fines: 172000, ccn: '100002', worst_owner: 'Sample Holdings LLC', total_hprd: 2.68 },
  { name: 'Valley Ridge Health', city: 'Gary', state: 'IN', stars: 2, composite: 71.3, total_deficiencies: 14, total_fines: 134000, ccn: '100003', worst_owner: 'Sample Holdings LLC', total_hprd: 2.89 },
];

const NEARBY = [
  { name: 'Oakwood Care Center', city: 'Springfield', state: 'IL', distance: 2.3, composite: 22.1, stars: 4, beds: 95, total_hprd: 4.12, total_fines: 12000 },
  { name: 'Lincoln Meadows Nursing', city: 'Springfield', state: 'IL', distance: 4.1, composite: 18.5, stars: 4, beds: 110, total_hprd: 4.35, total_fines: 8500 },
  { name: 'Heritage Health Center', city: 'Chatham', state: 'IL', distance: 5.7, composite: 35.2, stars: 3, beds: 80, total_hprd: 3.78, total_fines: 22000 },
];

const DEFICIENCY_DETAILS = [
  { survey_date: '2025-09-15', ftag: 'F0880', scope_severity: 'K', severity_label: 'Immediate Jeopardy', description: 'Failure to establish and maintain an infection prevention and control program. Facility failed to implement proper hand hygiene protocols, exposing multiple residents to infectious agents.' },
  { survey_date: '2025-06-02', ftag: 'F0689', scope_severity: 'J', severity_label: 'Immediate Jeopardy', description: 'Failure to ensure residents receive adequate supervision and assistance to prevent accidents. Two fall incidents within 48 hours involving the same resident without updated care plan.' },
  { survey_date: '2025-09-15', ftag: 'F0684', scope_severity: 'H', severity_label: 'Actual Harm', description: 'Failure to provide care and services to maintain the highest practicable well-being. Resident developed a Stage 3 pressure ulcer due to inadequate repositioning and wound care.' },
  { survey_date: '2025-03-20', ftag: 'F0760', scope_severity: 'H', severity_label: 'Actual Harm', description: 'Failure to ensure each resident\'s drug regimen is free from unnecessary drugs. Resident received incorrect medication dosage for 6 consecutive days.' },
  { survey_date: '2024-11-08', ftag: 'F0812', scope_severity: 'H', severity_label: 'Actual Harm', description: 'Failure to procure food from sources approved or considered satisfactory and store, prepare, distribute, and serve food in accordance with professional standards.' },
  { survey_date: '2024-11-08', ftag: 'F0686', scope_severity: 'G', severity_label: 'Harm - No Jeopardy', description: 'Failure to ensure that a resident who has a pressure ulcer receives necessary treatment and services consistent with professional standards of practice.' },
  { survey_date: '2025-06-02', ftag: 'F0585', scope_severity: 'G', severity_label: 'Harm - No Jeopardy', description: 'Failure to establish a grievance policy and make prompt efforts to resolve grievances. Multiple resident complaints about call light response times went unaddressed for weeks.' },
  { survey_date: '2025-03-20', ftag: 'F0657', scope_severity: 'F', severity_label: 'No Harm - Potential', description: 'Failure to develop a comprehensive care plan for each resident that includes measurable objectives and timetables.' },
];

const PENALTY_TIMELINE = [
  { date: '2023-04-15', amount: 42500, type: 'Fine' },
  { date: '2023-11-28', amount: 0, type: 'Payment Denial', denial_start_date: '2023-12-01', denial_length_days: 30 },
  { date: '2024-06-10', amount: 68000, type: 'Fine' },
  { date: '2024-12-03', amount: 85000, type: 'Fine' },
  { date: '2025-07-22', amount: 89000, type: 'Fine' },
];

// ======================== FORMATTERS ========================
const fmt = (v) => { if (!v && v !== 0) return 'N/A'; return '$' + Math.round(v).toLocaleString(); };
const pct = (v) => v === null || v === undefined ? 'N/A' : v.toFixed(1) + '%';
const num = (v) => v === null || v === undefined ? 'N/A' : v.toFixed(2);

// ======================== LAYOUT HELPERS ========================
function addNewPage() { doc.addPage(); pageNumber++; currentY = margin + 5; }
function checkPageBreak(requiredSpace) {
  if (currentY + requiredSpace > pageHeight - 22) { addNewPage(); return true; }
  return false;
}
function ensureNewSection() {
  if (currentY > margin + 15 && currentY > pageHeight * 0.8) addNewPage();
}

function addSectionHeader(number, title) {
  if (currentY > margin + 20) currentY += 8;
  ensureNewSection();
  doc.setFillColor(...NAVY);
  doc.rect(margin, currentY, contentWidth, 10, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(number + '. ' + title, margin + 4, currentY + 7);
  doc.setTextColor(...BODY);
  currentY += 10;
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 4;
}

function addSubHeading(text) {
  checkPageBreak(14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(text, margin, currentY);
  currentY += 1;
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY + 3, margin + contentWidth, currentY + 3);
  currentY += 7;
}

function addDataRow(label, value) {
  checkPageBreak(7);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...STEEL);
  doc.text(label, margin + 2, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BODY);
  doc.text(String(value), pageWidth - margin - 2, currentY, { align: 'right' });
  currentY += 6;
}

function addAlertBox(text, type) {
  checkPageBreak(20);
  const bgColor = type === 'critical' ? RED_BG : type === 'warning' ? AMBER_BG : BLUE_BG;
  const borderColor = type === 'critical' ? RED : type === 'warning' ? AMBER : NAVY;
  const lines = doc.splitTextToSize(text, contentWidth - 12);
  const boxHeight = lines.length * 4.5 + 6;
  doc.setFillColor(...bgColor);
  doc.rect(margin, currentY, contentWidth, boxHeight, 'F');
  doc.setFillColor(...borderColor);
  doc.rect(margin, currentY, 3, boxHeight, 'F');
  doc.setTextColor(...BODY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(lines, margin + 6, currentY + 4.5);
  currentY += boxHeight + 4;
}

function drawMetricCard(label, value, natAvg, unit, x, y, w) {
  const h = 28;
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...STEEL);
  doc.text(label, x + w / 2, y + 6, { align: 'center' });
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BODY);
  const display = value !== null && value !== undefined ? value + unit : 'N/A';
  doc.text(display, x + w / 2, y + 17, { align: 'center' });
  if (natAvg !== null && natAvg !== undefined) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...STEEL);
    doc.text("Nat'l avg: " + natAvg + unit, x + w / 2, y + 23, { align: 'center' });
  }
  return h;
}

function addRedFlagCard(metric, explanation, type) {
  checkPageBreak(22);
  const borderColor = type === 'critical' ? RED : type === 'warning' ? AMBER : STEEL;
  const bgColor = type === 'critical' ? RED_BG : type === 'warning' ? AMBER_BG : LIGHT_BG;
  const explLines = doc.splitTextToSize(explanation, contentWidth - 14);
  const boxH = 8 + explLines.length * 4 + 4;
  doc.setFillColor(...bgColor);
  doc.rect(margin, currentY, contentWidth, boxH, 'F');
  doc.setFillColor(...borderColor);
  doc.rect(margin, currentY, 3, boxH, 'F');
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(type === 'critical' ? RED : type === 'warning' ? AMBER : BODY));
  doc.text(metric, margin + 7, currentY + 6);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BODY);
  doc.text(explLines, margin + 7, currentY + 12);
  currentY += boxH + 4;
}

// ======================== DATE ========================
const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const dateStr = new Date().toISOString().split('T')[0];
const mw = (contentWidth - 10) / 3;

// ================================================================
//   PAGE 1 — COVER
// ================================================================

// SAMPLE BANNER at very top
doc.setFillColor(220, 38, 38);
doc.rect(0, 0, pageWidth, 10, 'F');
doc.setTextColor(...WHITE);
doc.setFont('helvetica', 'bold');
doc.setFontSize(7);
doc.text('SAMPLE EVIDENCE REPORT \u2014 Fictional facility for demonstration purposes. Search a real facility at oversightreports.com', pageWidth / 2, 6.5, { align: 'center' });

// Top navy bar
doc.setFillColor(...NAVY);
doc.rect(0, 10, pageWidth, 22, 'F');
doc.setTextColor(...WHITE);
doc.setFont('helvetica', 'bold');
doc.setFontSize(14);
doc.text('THE OVERSIGHT REPORT', pageWidth / 2, 24, { align: 'center' });

currentY = 52;

// Title
doc.setTextColor(...NAVY);
doc.setFontSize(26);
doc.setFont('helvetica', 'bold');
doc.text('EVIDENCE REPORT', pageWidth / 2, currentY, { align: 'center' });
currentY += 4;
doc.setDrawColor(...RED);
doc.setLineWidth(0.8);
doc.line(pageWidth / 2 - 30, currentY, pageWidth / 2 + 30, currentY);
currentY += 12;

// Facility name
doc.setFontSize(17);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...BODY);
doc.text(F.name, pageWidth / 2, currentY, { align: 'center' });
currentY += 9;

// Address
doc.setFontSize(10);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...STEEL);
doc.text(F.city + ', ' + F.state + ' ' + F.zip, pageWidth / 2, currentY, { align: 'center' });
currentY += 5;
doc.setFont('courier', 'normal');
doc.setFontSize(9);
doc.text('CCN: ' + F.ccn + '  \u00B7  ' + F.beds + ' Beds', pageWidth / 2, currentY, { align: 'center' });
currentY += 16;

// Three metric cards
const cardW = (contentWidth - 10) / 3;
const cardY = currentY;

// Risk Score
doc.setFillColor(...LIGHT_BG);
doc.setDrawColor(...DIVIDER);
doc.setLineWidth(0.3);
doc.rect(margin, cardY, cardW, 30, 'FD');
doc.setFontSize(7.5);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...STEEL);
doc.text('RISK SCORE', margin + cardW / 2, cardY + 6, { align: 'center' });
doc.setFontSize(20);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...RED);
doc.text('87.4', margin + cardW / 2, cardY + 19, { align: 'center' });
doc.setFontSize(7);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...STEEL);
doc.text("Nat'l avg: 32.1", margin + cardW / 2, cardY + 26, { align: 'center' });

// CMS Stars
const starsX = margin + cardW + 5;
doc.setFillColor(...LIGHT_BG);
doc.rect(starsX, cardY, cardW, 30, 'FD');
doc.setFontSize(7.5);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...STEEL);
doc.text('CMS STARS', starsX + cardW / 2, cardY + 6, { align: 'center' });
doc.setFontSize(20);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...BODY);
doc.text('1/5', starsX + cardW / 2, cardY + 19, { align: 'center' });
doc.setFontSize(7);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...STEEL);
doc.text("Nat'l avg: 3.2/5", starsX + cardW / 2, cardY + 26, { align: 'center' });

// Total Fines
const finesX = margin + (cardW + 5) * 2;
doc.setFillColor(...LIGHT_BG);
doc.rect(finesX, cardY, cardW, 30, 'FD');
doc.setFontSize(7.5);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...STEEL);
doc.text('TOTAL FINES', finesX + cardW / 2, cardY + 6, { align: 'center' });
doc.setFontSize(18);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...BODY);
doc.text('$285K', finesX + cardW / 2, cardY + 19, { align: 'center' });
doc.setFontSize(7);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...STEEL);
doc.text("Nat'l avg: $28K", finesX + cardW / 2, cardY + 26, { align: 'center' });

currentY = cardY + 38;

// Key Findings box
const findings = [
  'High risk score: 87.4 (national avg: 32.1)',
  '2 immediate jeopardy citations',
  'Zero-RN coverage on 31.0% of days',
  '$284,500 in federal fines',
  '5 actual-harm citations',
];
const kfBoxH = 10 + findings.length * 6 + 2;
doc.setFillColor(...LIGHT_BG);
doc.rect(margin + 3, currentY, contentWidth - 3, kfBoxH, 'F');
doc.setFillColor(...NAVY);
doc.rect(margin, currentY, 3, kfBoxH, 'F');
doc.setFontSize(9.5);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...NAVY);
doc.text('KEY FINDINGS', margin + 7, currentY + 6);
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...BODY);
let fy = currentY + 13;
findings.forEach((f) => { doc.text('  ' + f, margin + 7, fy); fy += 6; });
currentY += kfBoxH + 12;

// Report ID + Date
const reportId = 'Report #OR-000000-' + dateStr.replace(/-/g, '');
doc.setFontSize(9);
doc.setTextColor(...STEEL);
doc.setFont('courier', 'normal');
doc.text(reportId, pageWidth / 2, currentY, { align: 'center' });
currentY += 6;
doc.setFont('helvetica', 'normal');
doc.text('Generated: ' + today, pageWidth / 2, currentY, { align: 'center' });
currentY += 5;
doc.text('Data through: Q3 2025 (staffing) \u00B7 Dec 2025 (inspections) \u00B7 Jan 2026 (ownership)', pageWidth / 2, currentY, { align: 'center' });
currentY += 5;
doc.text('oversightreports.com', pageWidth / 2, currentY, { align: 'center' });
currentY += 8;

// Prepared for
doc.setFontSize(8.5);
doc.text('Prepared for: ___________________________________________', pageWidth / 2, currentY, { align: 'center' });
currentY += 10;

// Confidential banner
doc.setDrawColor(...RED);
doc.setLineWidth(0.6);
doc.rect(margin + 30, currentY - 3, contentWidth - 60, 9);
doc.setFontSize(8.5);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...RED);
doc.text('CONFIDENTIAL \u2014 Prepared for authorized use', pageWidth / 2, currentY + 2, { align: 'center' });

// ================================================================
//   PAGE 2 — TABLE OF CONTENTS
// ================================================================
addNewPage();

doc.setFontSize(20);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...NAVY);
doc.text('Table of Contents', pageWidth / 2, currentY + 5, { align: 'center' });
currentY += 18;
doc.setDrawColor(...DIVIDER);
doc.setLineWidth(0.3);
doc.line(margin, currentY, margin + contentWidth, currentY);
currentY += 10;

const tocEntries = [
  ['1.', 'Executive Summary', '3'],
  ['2.', 'Ownership Portfolio', '3'],
  ['3.', 'Staffing Analysis', '4'],
  ['4.', 'Inspection History', '5'],
  ['5.', 'Financial Penalties', '7'],
  ['6.', 'Red Flags & Accountability Indicators', '8'],
  ['7.', 'Comparison Context', '8'],
  ['8.', 'Nearby Alternatives', '9'],
  ['9.', 'Data Sources & Methodology', '10'],
  ['10.', 'Disclaimer', '11'],
];
tocEntries.forEach(([n, title, page]) => {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(n, margin + 4, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BODY);
  doc.text(title, margin + 16, currentY);
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.15);
  const titleW = doc.getTextWidth(title);
  const pageW = doc.getTextWidth(page);
  const lineStart = margin + 16 + titleW + 2;
  const lineEnd = pageWidth - margin - pageW - 4;
  for (let x = lineStart; x < lineEnd; x += 2) doc.line(x, currentY, x + 0.5, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BODY);
  doc.text(page, pageWidth - margin, currentY, { align: 'right' });
  currentY += 8;
});

currentY += 10;
doc.setDrawColor(...DIVIDER);
doc.setLineWidth(0.3);
doc.line(margin, currentY, margin + contentWidth, currentY);
currentY += 10;

doc.setFontSize(11);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...NAVY);
doc.text('About This Report', margin, currentY);
currentY += 7;
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...BODY);
const aboutText = 'This report compiles data from 6 federal databases maintained by the Centers for Medicare & Medicaid Services (CMS). It is designed to support families evaluating care options, attorneys conducting discovery, journalists investigating patterns, and regulators monitoring compliance. All data is publicly available and independently verifiable against original sources.';
const aboutLines = doc.splitTextToSize(aboutText, contentWidth);
doc.text(aboutLines, margin, currentY);
currentY += aboutLines.length * 4.5 + 8;

doc.setFontSize(9);
doc.setTextColor(...STEEL);
doc.text('Verify facilities on Medicare.gov:', margin, currentY);
currentY += 5;
doc.setTextColor(41, 98, 168);
doc.text('https://www.medicare.gov/care-compare/', margin, currentY);

// ================================================================
//   PAGE 3 — SECTION 1: EXECUTIVE SUMMARY
// ================================================================
addNewPage();
addSectionHeader(1, 'Executive Summary');

drawMetricCard('RISK SCORE', '87.4', NATIONAL_AVG.composite, '', margin, currentY, mw);
drawMetricCard('CMS STARS', '1', NATIONAL_AVG.stars + '', '/5', margin + mw + 5, currentY, mw);
drawMetricCard('TOTAL FINES', '$285K', '$' + Math.round(NATIONAL_AVG.total_fines / 1000) + 'K', '', margin + (mw + 5) * 2, currentY, mw);
currentY += 34;

addSubHeading('Assessment');
doc.setFontSize(9.5);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...BODY);
const summaryText = 'This facility has an overall CMS star rating of 1 out of 5. It has been assessed $284,500 in federal penalties across 4 enforcement actions since 2023. It reported zero registered nurse hours on 29 days (31.0% of Q3 2025), a potential violation of 42 CFR \u00A7483.35. State inspectors documented 2 instances of immediate jeopardy and 5 instances of actual harm \u2014 conditions posing serious danger to residents. The facility is operated by Sample Holdings LLC, who controls 4 facilities in CMS data averaging 1.3 CMS stars. Total staffing of 2.35 hours per resident per day is 32% below the 3.48 HPRD threshold cited by 18 state Attorneys General. Penalties have escalated from $42,500 (2023) to $89,000 (2025), indicating a worsening compliance trajectory.';
const summaryLines = doc.splitTextToSize(summaryText, contentWidth);
doc.text(summaryLines, margin, currentY);
currentY += summaryLines.length * 4.5 + 4;

// ================================================================
//   SECTION 2 — OWNERSHIP PORTFOLIO
// ================================================================
addSectionHeader(2, 'Ownership Portfolio');

addDataRow('Owner Name:', 'Sample Holdings LLC');
addDataRow('Chain Name:', 'Sample Healthcare Group');
addDataRow('Ownership Type:', 'For Profit - Corporation');
addDataRow('Portfolio Size:', '4 facilities in our dataset');
currentY += 4;

addSubHeading('Portfolio-Wide Performance');
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...BODY);
const pIntro = 'This facility is operated by Sample Holdings LLC, who controls 4 facilities nationwide. Portfolio averages: 1.3 CMS stars, $196,375 in fines per facility, 79.8 risk score.';
const pLines = doc.splitTextToSize(pIntro, contentWidth);
doc.text(pLines, margin, currentY);
currentY += pLines.length * 4.5 + 6;

addSubHeading('Worst-Performing Siblings');

const allPortfolio = [F, ...SIBLINGS];
const ptd = allPortfolio.map((f) => {
  const marker = f.ccn === '000000' ? '>> ' : '';
  return [marker + f.name, f.city + ', ' + f.state, (f.stars || 0) + '/5', (f.composite || 0).toFixed(1), String(f.total_deficiencies || 0), fmt(f.total_fines || 0)];
});
const avgComp = allPortfolio.reduce((s, f) => s + (f.composite || 0), 0) / allPortfolio.length;
const avgStars = allPortfolio.reduce((s, f) => s + (f.stars || 0), 0) / allPortfolio.length;
const avgFines = allPortfolio.reduce((s, f) => s + (f.total_fines || 0), 0) / allPortfolio.length;
ptd.push(['PORTFOLIO AVERAGE', '', avgStars.toFixed(1), avgComp.toFixed(1), '', fmt(avgFines)]);
ptd.push(['NATIONAL AVERAGE', '', NATIONAL_AVG.stars.toFixed(1), NATIONAL_AVG.composite.toFixed(1), NATIONAL_AVG.total_deficiencies.toFixed(1), fmt(NATIONAL_AVG.total_fines)]);

autoTable(doc, {
  startY: currentY,
  head: [['Facility', 'Location', 'Stars', 'Risk', 'Defs', 'Total Fines']],
  body: ptd,
  theme: 'grid',
  styles: { fontSize: 7.5, cellPadding: 4, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
  headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
  alternateRowStyles: { fillColor: TABLE_ALT },
  columnStyles: {
    0: { cellWidth: 48 }, 1: { cellWidth: 28 }, 2: { cellWidth: 18, halign: 'center' },
    3: { cellWidth: 16, halign: 'center' }, 4: { cellWidth: 14, halign: 'right' }, 5: { cellWidth: 28, halign: 'right' },
  },
  didParseCell(data) {
    if (data.row.section === 'body') {
      if (data.row.index >= ptd.length - 2) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = LIGHT_BG; }
      if (data.cell.raw && typeof data.cell.raw === 'string' && data.cell.raw.startsWith('>> ')) { data.cell.styles.fillColor = [255, 250, 205]; data.cell.styles.fontStyle = 'bold'; }
    }
  },
  margin: { left: margin, right: margin },
});
currentY = doc.lastAutoTable.finalY + 6;

// ================================================================
//   SECTION 3 — STAFFING ANALYSIS
// ================================================================
addSectionHeader(3, 'Staffing Analysis');

drawMetricCard('TOTAL HPRD', num(F.total_hprd), NATIONAL_AVG.total_hprd.toFixed(2), ' hrs', margin, currentY, mw);
drawMetricCard('RN HPRD', num(F.rn_hprd), NATIONAL_AVG.rn_hprd.toFixed(2), ' hrs', margin + mw + 5, currentY, mw);
drawMetricCard('ZERO-RN DAYS', F.zero_rn_pct.toFixed(1), NATIONAL_AVG.zero_rn_pct.toFixed(1), '%', margin + (mw + 5) * 2, currentY, mw);
currentY += 34;

addSubHeading('Staffing Breakdown vs National Benchmarks');

const staffRows = [
  ['Registered Nurse (RN)', num(F.rn_hprd) + ' hrs', NATIONAL_AVG.rn_hprd + ' hrs', ((F.rn_hprd - NATIONAL_AVG.rn_hprd) / NATIONAL_AVG.rn_hprd * 100).toFixed(0) + '%'],
  ['Licensed Practical Nurse', num(F.lpn_hprd) + ' hrs', NATIONAL_AVG.lpn_hprd + ' hrs', ((F.lpn_hprd - NATIONAL_AVG.lpn_hprd) / NATIONAL_AVG.lpn_hprd * 100).toFixed(0) + '%'],
  ['Certified Nursing Asst', num(F.cna_hprd) + ' hrs', NATIONAL_AVG.cna_hprd + ' hrs', ((F.cna_hprd - NATIONAL_AVG.cna_hprd) / NATIONAL_AVG.cna_hprd * 100).toFixed(0) + '%'],
  ['Total Nursing HPRD', num(F.total_hprd) + ' hrs', NATIONAL_AVG.total_hprd + ' hrs', ((F.total_hprd - NATIONAL_AVG.total_hprd) / NATIONAL_AVG.total_hprd * 100).toFixed(0) + '%'],
  ['Zero-RN Day %', pct(F.zero_rn_pct), NATIONAL_AVG.zero_rn_pct + '%', (F.zero_rn_pct - NATIONAL_AVG.zero_rn_pct).toFixed(1) + '%'],
  ['Contract Staffing %', pct(F.contractor_pct), NATIONAL_AVG.contractor_pct + '%', (F.contractor_pct - NATIONAL_AVG.contractor_pct).toFixed(1) + '%'],
  ['CMS Stars (Staffing)', F.staffing_stars + '/5', 'N/A', 'N/A'],
  ['CMS Stars (Overall)', F.stars + '/5', NATIONAL_AVG.stars + '/5', (F.stars - NATIONAL_AVG.stars).toFixed(1)],
];

autoTable(doc, {
  startY: currentY,
  head: [['Metric', 'This Facility', 'National Avg', 'Difference']],
  body: staffRows,
  theme: 'grid',
  styles: { fontSize: 8.5, cellPadding: 4, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
  headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
  alternateRowStyles: { fillColor: TABLE_ALT },
  columnStyles: {
    0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 35, halign: 'right' },
    2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
  },
  didParseCell(data) {
    if (data.column.index === 3 && data.row.section === 'body') {
      const diff = data.row.raw[3];
      if (typeof diff === 'string' && diff.includes('%')) {
        const v = parseFloat(diff);
        if (!isNaN(v)) {
          const lowerIsBetter = data.row.index === 4 || data.row.index === 5;
          if (lowerIsBetter) { if (v > 0) data.cell.styles.textColor = RED; else if (v < 0) data.cell.styles.textColor = GREEN; }
          else { if (v < 0) data.cell.styles.textColor = RED; else if (v > 0) data.cell.styles.textColor = GREEN; }
        }
      }
    }
  },
  margin: { left: margin, right: margin },
});
currentY = doc.lastAutoTable.finalY + 6;

addDataRow('Weekend Total HPRD:', num(F.weekend_total_hprd) + ' hrs');
addDataRow('Weekend RN HPRD:', num(F.weekend_rn_hprd) + ' hrs');
addDataRow('Average Census:', F.avg_census.toFixed(1));
currentY += 4;

addSubHeading('Staffing Verification');
addDataRow('Self-Reported RN Hours:', num(F.self_report_rn) + ' hrs');
addDataRow('Verified RN Hours (Payroll):', num(F.rn_hprd) + ' hrs');
addDataRow('Discrepancy:', pct(F.rn_gap_pct));
currentY += 4;

addAlertBox('Regulatory Context (42 CFR \u00A7483.35): Federal law requires a registered nurse on site for at least 8 consecutive hours per day, 7 days per week. This facility reported zero RN hours on 31.0% of days, which may indicate a violation of this federal requirement.', 'info');
addAlertBox('Staffing Standard Context: In February 2026, 18 state Attorneys General urged CMS to adopt a minimum staffing standard of 3.48 hours per resident per day. This facility provides 2.35 HPRD, which is 32% below the proposed threshold.', 'warning');
addAlertBox('Verification Discrepancy: This facility shows a 42.0% discrepancy between self-reported and verified staffing levels, which may warrant further investigation.', 'warning');
addAlertBox('Contract Staffing Context: Research in Health Affairs has linked high contract staffing rates to quality concerns. This facility reports 28.0% contract staffing, above the national average of 12.0%.', 'info');

// ================================================================
//   SECTION 4 — INSPECTION HISTORY
// ================================================================
addSectionHeader(4, 'Inspection History');

addDataRow('Total Deficiencies:', '23');
addDataRow('Immediate Jeopardy Citations:', '2');
addDataRow('Actual Harm Citations:', '5');
currentY += 4;

addSubHeading('Top Deficiency Categories');
F.top_categories.forEach(([cat, count]) => addDataRow(cat + ':', String(count)));
currentY += 4;

addSubHeading('Individual Deficiency Details');
doc.setFontSize(8.5);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...BODY);
doc.text('Top 8 most serious deficiencies (sorted by severity \u2014 immediate jeopardy first):', margin, currentY);
currentY += 6;

const defRows = DEFICIENCY_DETAILS.map((def) => {
  const date = new Date(def.survey_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const sev = def.scope_severity + ' (' + def.severity_label + ')';
  return [date, def.ftag, sev, def.description];
});

autoTable(doc, {
  startY: currentY,
  head: [['Date', 'Tag Code', 'Scope / Severity', 'Description']],
  body: defRows,
  theme: 'grid',
  styles: { fontSize: 7.5, cellPadding: 4, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15, overflow: 'linebreak' },
  headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
  alternateRowStyles: { fillColor: TABLE_ALT },
  columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 18 }, 2: { cellWidth: 32, fontStyle: 'bold' }, 3: { cellWidth: 98 } },
  didParseCell(data) {
    if (data.row.section === 'body') {
      const sev = data.row.raw[2] || '';
      if (sev.includes('Immediate Jeopardy') || sev.startsWith('J') || sev.startsWith('K') || sev.startsWith('L'))
        data.cell.styles.fillColor = RED_BG;
      else if (sev.includes('Actual Harm') || sev.includes('Harm') || sev.startsWith('H') || sev.startsWith('I'))
        data.cell.styles.fillColor = AMBER_BG;
    }
  },
  margin: { left: margin, right: margin },
});
currentY = doc.lastAutoTable.finalY + 5;

addAlertBox('Immediate Jeopardy Context (42 CFR \u00A7488.301): Immediate jeopardy citations indicate conditions that have caused, or are likely to cause, serious injury, harm, impairment, or death to a resident. This facility has received 2 such citations.', 'critical');

// ================================================================
//   SECTION 5 — FINANCIAL PENALTIES
// ================================================================
addSectionHeader(5, 'Financial Penalties');

addDataRow('Total Fines:', fmt(F.total_fines));
addDataRow('Number of Fines:', String(F.fine_count));
addDataRow('Payment Denials:', String(F.denial_count));
currentY += 4;

addSubHeading('Penalty Timeline');
doc.setFontSize(8.5);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...BODY);
doc.text('Chronological record of all federal penalties:', margin, currentY);
currentY += 6;

let running = 0;
const penRows = PENALTY_TIMELINE.map((p) => {
  const date = new Date(p.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  if (p.amount > 0) running += p.amount;
  let desc = '';
  if (p.type === 'Payment Denial') desc = 'Payment denial starting ' + new Date(p.denial_start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) + ' for ' + p.denial_length_days + ' days';
  else desc = 'Civil monetary penalty';
  return [date, fmt(p.amount), p.type, desc];
});
penRows.push(['TOTAL', fmt(running), '', '']);

autoTable(doc, {
  startY: currentY,
  head: [['Date', 'Amount', 'Type', 'Description']],
  body: penRows,
  theme: 'grid',
  styles: { fontSize: 8.5, cellPadding: 4, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
  headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
  alternateRowStyles: { fillColor: TABLE_ALT },
  columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }, 2: { cellWidth: 30 }, 3: { cellWidth: 84 } },
  didParseCell(data) {
    if (data.row.section === 'body' && data.row.index === penRows.length - 1) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = LIGHT_BG; }
  },
  margin: { left: margin, right: margin },
});
currentY = doc.lastAutoTable.finalY + 5;

addAlertBox('Civil Monetary Penalties (42 CFR \u00A7488.438): CMS imposes civil monetary penalties on facilities that fail to meet federal requirements. Penalties range from $1,000 to $21,393 per day depending on severity. This facility has been assessed $284,500 in total penalties.', 'info');
addAlertBox('Payment Denials (42 CFR \u00A7488.417): CMS can deny payment for new admissions when facilities are out of compliance. This facility has 1 payment denial on record.', 'warning');

// ================================================================
//   SECTION 6 — RED FLAGS
// ================================================================
addSectionHeader(6, 'Red Flags & Accountability Indicators');

addRedFlagCard('Immediate Jeopardy: 2 citations', 'Immediate jeopardy citations (42 CFR \u00A7488.301) indicate the most serious form of noncompliance \u2014 conditions that have caused, or are likely to cause, serious injury, harm, impairment, or death.', 'critical');
addRedFlagCard('Actual Harm: 5 citations', 'Actual harm citations indicate residents were directly and negatively affected by facility practices or conditions.', 'critical');
addRedFlagCard('Total Staffing Below 3.48 HPRD: 2.35 hours', 'In February 2026, 18 state Attorneys General called 3.48 HPRD the minimum safe staffing level. This facility is 32% below that threshold.', 'warning');
addRedFlagCard('High Zero-RN Days: 31.0%', 'Federal law (42 CFR \u00A7483.35) requires an RN on site at least 8 hours per day, 7 days per week.', 'warning');
addRedFlagCard('Staffing Verification Gap: 42.0%', 'Large discrepancies between self-reported and payroll-verified staffing may warrant investigation.', 'warning');
addRedFlagCard('High Financial Penalties: $284,500', 'Repeated or severe violations resulted in substantial civil monetary penalties.', 'warning');
addRedFlagCard('High Contract Staffing: 28.0%', 'Research links high contract staffing rates to continuity of care concerns.', 'info');

// ================================================================
//   SECTION 7 — COMPARISON CONTEXT
// ================================================================
addSectionHeader(7, 'Comparison Context');

addSubHeading('How This Facility Compares');
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...BODY);
const ctxIntro = 'Key metrics for Sample Facility Name compared against national averages. Percentile rankings are estimated relative to all 14,713 nursing homes nationwide.';
const ctxLines = doc.splitTextToSize(ctxIntro, contentWidth);
doc.text(ctxLines, margin, currentY);
currentY += ctxLines.length * 4.5 + 6;

const cmpRows = [
  ['CMS Stars', '1/5', NATIONAL_AVG.stars + '/5', '10th'],
  ['Risk Score', '87.4', NATIONAL_AVG.composite.toFixed(1), '10th'],
  ['Total Staffing HPRD', num(F.total_hprd), NATIONAL_AVG.total_hprd.toFixed(2), '10th'],
  ['RN Staffing HPRD', num(F.rn_hprd), NATIONAL_AVG.rn_hprd.toFixed(2), '10th'],
  ['Zero-RN Day %', pct(F.zero_rn_pct), NATIONAL_AVG.zero_rn_pct + '%', '10th'],
  ['Total Deficiencies', '23', NATIONAL_AVG.total_deficiencies.toFixed(1), '10th'],
  ['Total Fines', fmt(F.total_fines), fmt(NATIONAL_AVG.total_fines), '10th'],
  ['Contract Staffing %', pct(F.contractor_pct), NATIONAL_AVG.contractor_pct + '%', '10th'],
];

autoTable(doc, {
  startY: currentY,
  head: [['Metric', 'This Facility', 'National Avg', 'Percentile']],
  body: cmpRows,
  theme: 'grid',
  styles: { fontSize: 8.5, cellPadding: 4, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
  headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
  alternateRowStyles: { fillColor: TABLE_ALT },
  columnStyles: {
    0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 35, halign: 'right' },
    2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
  },
  didParseCell(data) {
    if (data.column.index === 3 && data.row.section === 'body') {
      const p = data.row.raw[3];
      if (typeof p === 'string' && p.includes('th')) {
        const v = parseInt(p);
        if (!isNaN(v)) { if (v >= 70) data.cell.styles.textColor = GREEN; else if (v <= 30) data.cell.styles.textColor = RED; }
      }
    }
  },
  margin: { left: margin, right: margin },
});
currentY = doc.lastAutoTable.finalY + 8;

// ================================================================
//   SECTION 8 — NEARBY ALTERNATIVES
// ================================================================
addSectionHeader(8, 'Nearby Alternatives');

doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...BODY);
const altIntro = 'The following facilities within a reasonable distance have lower risk scores than Sample Facility Name. This comparison is provided for reference purposes only and does not constitute a recommendation.';
const altLines = doc.splitTextToSize(altIntro, contentWidth);
doc.text(altLines, margin, currentY);
currentY += altLines.length * 4.5 + 6;

const altBody = NEARBY.map((a) => [a.name, a.distance.toFixed(1) + ' mi', a.city + ', ' + a.state, (a.stars || 0) + '/5', a.composite.toFixed(1), num(a.total_hprd), fmt(a.total_fines)]);

autoTable(doc, {
  startY: currentY,
  head: [['Facility', 'Distance', 'City', 'Stars', 'Risk', 'HPRD', 'Fines']],
  body: altBody,
  theme: 'grid',
  styles: { fontSize: 7.5, cellPadding: 4, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
  headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
  alternateRowStyles: { fillColor: TABLE_ALT },
  columnStyles: {
    0: { cellWidth: 46 }, 1: { cellWidth: 22, halign: 'right' }, 2: { cellWidth: 30 },
    3: { cellWidth: 14, halign: 'center' }, 4: { cellWidth: 14, halign: 'center' },
    5: { cellWidth: 18, halign: 'right' }, 6: { cellWidth: 24, halign: 'right' },
  },
  margin: { left: margin, right: margin },
});
currentY = doc.lastAutoTable.finalY + 5;

// ================================================================
//   SECTION 9 — METHODOLOGY
// ================================================================
addNewPage();
addSectionHeader(9, 'Data Sources & Methodology');

addSubHeading('Data Sources');
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...BODY);
doc.text('All data sourced from publicly available federal databases:', margin, currentY);
currentY += 5;

const sources = [
  'CMS Care Compare (Provider Information, Star Ratings)',
  'CMS Payroll-Based Journal (Daily Nurse Staffing through Q3 2025)',
  'CMS Health Deficiencies (State Survey Inspections 2017-December 2025)',
  'CMS Penalties (Civil Monetary Penalties, Payment Denials 2023-2025)',
  'CMS Ownership Database (Corporate Structure, January 2026)',
  'CMS HCRIS Cost Reports (FY2024 related-party transactions)',
];
sources.forEach((s) => {
  checkPageBreak(8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BODY);
  doc.text('    \u2022 ' + s, margin + 2, currentY);
  currentY += 6;
});
currentY += 4;

addSubHeading('Composite Risk Score Formula');
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.text('Weighted composite of multiple factors (scale: 0-100):', margin, currentY);
currentY += 5;
const weights = [
  'Staffing Levels: 30% (verified payroll vs. self-reported, zero-RN days)',
  'Inspection Results: 25% (deficiencies, serious danger, harm citations)',
  'Financial Penalties: 20% (civil monetary penalties, payment denials)',
  'Ownership History: 15% (portfolio performance, ownership changes)',
  'Quality Measures: 10% (CMS star rating components)',
];
weights.forEach((w) => { checkPageBreak(6); doc.text('    \u2022 ' + w, margin + 2, currentY); currentY += 5; });
currentY += 4;

doc.setFontSize(8.5);
const methodNote = 'Higher scores indicate greater patterns of concern. Thresholds: 0-40 (Low), 40-60 (Moderate), 60+ (High).';
const mLines = doc.splitTextToSize(methodNote, contentWidth - 4);
doc.text(mLines, margin + 2, currentY);
currentY += mLines.length * 4.5 + 8;

addSubHeading('Regulatory References');
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...BODY);
doc.text('Federal regulations cited in this report:', margin, currentY);
currentY += 5;
const cfrRefs = [
  '42 CFR \u00A7483.35 \u2014 Nursing Services (RN staffing requirements)',
  '42 CFR \u00A7488.301 \u2014 Definitions (Immediate Jeopardy)',
  '42 CFR \u00A7488.417 \u2014 Denial of Payment (New Admissions)',
  '42 CFR \u00A7488.438 \u2014 Civil Monetary Penalties',
];
cfrRefs.forEach((r) => { checkPageBreak(8); doc.text('    \u2022 ' + r, margin + 2, currentY); currentY += 6; });

// ================================================================
//   SECTION 10 — DISCLAIMER
// ================================================================
addNewPage();
addSectionHeader(10, 'Disclaimer');

const disclaimers = [
  'This report is generated from publicly available federal data and is provided for informational purposes only.',
  'This document does not constitute legal advice, medical advice, or a recommendation for or against any specific facility. Risk scores represent patterns in federal data that may warrant further investigation.',
  'Facilities should be evaluated through personal visits, consultation with healthcare professionals, and review of current inspection reports. Conditions may have changed since data collection.',
  'If you have concerns about a nursing home, contact: Your state survey agency (health department), HHS Office of Inspector General (tips.hhs.gov), or National Eldercare Locator (1-800-677-1116).',
];
disclaimers.forEach((para) => {
  checkPageBreak(20);
  const lines = doc.splitTextToSize(para, contentWidth - 8);
  const bh = lines.length * 4.5 + 6;
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.3);
  doc.rect(margin, currentY, contentWidth, bh, 'FD');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BODY);
  doc.text(lines, margin + 4, currentY + 4.5);
  currentY += bh + 3;
});

// ================================================================
//   FOOTERS
// ================================================================
const totalPages = doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFontSize(7.5);
  doc.setTextColor(...STEEL);
  doc.setFont('helvetica', 'normal');
  doc.text('Sample Facility Name  |  CCN: 000000', margin, pageHeight - 10);
  doc.text('Page ' + i + ' of ' + totalPages, pageWidth - margin, pageHeight - 10, { align: 'right' });
  doc.setFontSize(7);
  doc.text('Source: CMS Provider Data  |  Generated by The Oversight Report  |  oversightreports.com', pageWidth / 2, pageHeight - 5, { align: 'center' });
}

// ================================================================
//   SAVE
// ================================================================
const buf = doc.output('arraybuffer');
writeFileSync('public/samples/OversightReport_Sample_Evidence_Report.pdf', Buffer.from(buf));
console.log('Written: public/samples/OversightReport_Sample_Evidence_Report.pdf');
console.log('Pages:', totalPages);
