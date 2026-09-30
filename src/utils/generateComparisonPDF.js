import jsPDFModule from 'jspdf';
import { CMS_SNF_AS_OF_ISO } from '../data/careSettings.js';
import { cellValue, FIRST_VIEW_ROWS, freshnessLabel } from './compareMetrics.js';
import { titleCase } from './facilityBriefContent.js';
import { pdfSafeText } from './pdfSafeText.js';
import { BRIEF_PDF_FONT, registerBriefPdfFonts } from './briefPdfFonts.js';

const jsPDF = jsPDFModule.jsPDF || jsPDFModule;
const FONT = BRIEF_PDF_FONT;

const C = {
  ink: [31, 41, 55],
  muted: [100, 116, 139],
  faint: [148, 163, 184],
  line: [226, 232, 240],
  bg: [248, 250, 252],
  navy: [15, 23, 42],
  white: [255, 255, 255],
  teal: [15, 118, 110],
};

function cleanFilename(name) {
  return String(name || 'Facilities').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
}

function displayName(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (!text) return '';
  if (text === text.toUpperCase()) return titleCase(text);
  return text;
}

function cellText(row, facility) {
  const cleaned = pdfSafeText(String(cellValue(row, facility) ?? '')).replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned === '-') return '-';
  return cleaned;
}

/**
 * Free multi-home comparison snapshot (1 page). Same public CMS facts as the compare grid.
 * Visually quieter than a raw dump, and labeled as the free snapshot rather than a Compare Brief.
 */
export function generateComparisonPDF(facilities, options = {}) {
  const homes = Array.isArray(facilities) ? facilities.filter(Boolean).slice(0, 3) : [];
  const dataAsOf = options.dataAsOf || CMS_SNF_AS_OF_ISO;
  const count = homes.length;
  const title = `The Oversight Report - ${count}-home comparison`;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  registerBriefPdfFonts(doc);
  doc.setProperties({
    title,
    author: 'Robert Benard, NP — DataLink Clinical LLC',
    creator: 'oversightreports.com',
    subject: `Free comparison snapshot for ${homes.map((f) => displayName(f.name) || f.ccn).join(', ')}`,
  });

  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const MX = 14;
  const W = PW - MX * 2;
  let y = 14;

  doc.setFont(FONT, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.teal);
  doc.text('FREE SNAPSHOT', MX, y);
  doc.setFont(FONT, 'normal');
  doc.setTextColor(...C.muted);
  doc.text('oversightreports.com', MX + W, y, { align: 'right' });
  y += 7;

  doc.setFont(FONT, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...C.navy);
  doc.text(pdfSafeText(`Compare ${count} nursing home${count === 1 ? '' : 's'}`), MX, y);
  y += 6;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...C.muted);
  doc.text(pdfSafeText(`CMS data as of ${freshnessLabel(dataAsOf)}. Not a paid Compare Brief.`), MX, y);
  y += 6;
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.4);
  doc.line(MX, y, MX + W, y);
  y += 5;

  const labelW = 46;
  const colW = (W - labelW) / Math.max(1, count);
  const headerH = 16;

  doc.setFillColor(...C.navy);
  doc.rect(MX, y, W, headerH, 'F');
  doc.setFont(FONT, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text('Measure', MX + 3, y + 7);
  homes.forEach((facility, index) => {
    const x = MX + labelW + index * colW;
    const name = displayName(facility.name) || facility.ccn || 'Home';
    const nameLines = doc.splitTextToSize(pdfSafeText(name), colW - 6).slice(0, 2);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(9);
    doc.text(nameLines, x + 3, y + 6);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7.5);
    const place = [displayName(facility.city), facility.state].filter(Boolean).join(', ');
    doc.text(pdfSafeText(place), x + 3, y + 13);
  });
  y += headerH;

  const rowH = 14;
  FIRST_VIEW_ROWS.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(...C.bg);
      doc.rect(MX, y, W, rowH, 'F');
    }
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.15);
    doc.line(MX, y + rowH, MX + W, y + rowH);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.navy);
    doc.text(pdfSafeText(row.label), MX + 3, y + 5.5);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(pdfSafeText(row.direction), MX + 3, y + 10);
    homes.forEach((facility, index) => {
      const x = MX + labelW + index * colW;
      doc.setFont(FONT, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.ink);
      const lines = doc.splitTextToSize(cellText(row, facility), colW - 6);
      doc.text(lines.slice(0, 2), x + 3, y + 6);
    });
    y += rowH;
  });

  y += 6;
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.line(MX, y, MX + W, y);
  y += 5;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.muted);
  const note = [
    'Stars are signals, not guarantees. Verify on medicare.gov/care-compare before a visit.',
    'Free snapshot, not a paid Compare Brief ($49 for 2 homes, $69 for 3) or a $29 Facility Brief.',
  ];
  note.forEach((line) => {
    doc.text(pdfSafeText(line), MX, y);
    y += 4.2;
  });

  doc.setFont(FONT, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.faint);
  doc.text(pdfSafeText('Not affiliated with or endorsed by HHS/CMS. Facilities cannot pay to change this snapshot.'), MX, PH - 8);

  if (options.returnDoc) return doc;

  const names = homes.map((f) => cleanFilename(displayName(f.name))).join('_');
  doc.save(`OversightReport_Compare_${names || 'homes'}.pdf`);
  return doc;
}
