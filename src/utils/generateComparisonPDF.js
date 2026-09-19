import jsPDFModule from 'jspdf';
import { CMS_SNF_AS_OF_ISO } from '../data/careSettings.js';
import { cellValue, FIRST_VIEW_ROWS, freshnessLabel } from './compareMetrics.js';
import { pdfSafeText } from './pdfSafeText.js';

const jsPDF = jsPDFModule.jsPDF || jsPDFModule;

function cleanFilename(name) {
  return String(name || 'Facilities').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
}

/**
 * Free multi-home comparison snapshot (1 page). Same public CMS facts as the compare grid.
 */
export function generateComparisonPDF(facilities, options = {}) {
  const homes = Array.isArray(facilities) ? facilities.filter(Boolean).slice(0, 3) : [];
  const dataAsOf = options.dataAsOf || CMS_SNF_AS_OF_ISO;
  const count = homes.length;
  const title = `The Oversight Report — ${count}-home comparison`;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  doc.setProperties({
    title,
    author: 'Robert Benard, NP — DataLink Clinical LLC',
    creator: 'oversightreports.com',
    subject: `Free comparison snapshot for ${homes.map((f) => f.name).join(', ')}`,
  });

  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const MX = 12;
  let y = 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(pdfSafeText(`Compare ${count} nursing home${count === 1 ? '' : 's'}`), MX, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(pdfSafeText(`CMS data as of ${freshnessLabel(dataAsOf)}. Free snapshot — not a paid Facility Brief.`), MX, y);
  y += 8;

  const labelW = 48;
  const colW = (PW - MX * 2 - labelW) / Math.max(1, count);
  const rowH = 12;

  doc.setFillColor(241, 245, 249);
  doc.rect(MX, y, PW - MX * 2, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Metric', MX + 2, y + 6);
  homes.forEach((f, i) => {
    const x = MX + labelW + i * colW;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const name = doc.splitTextToSize(pdfSafeText(f.name || f.ccn), colW - 4);
    doc.text(name.slice(0, 2), x + 2, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(pdfSafeText([f.city, f.state].filter(Boolean).join(', ')), x + 2, y + 13);
  });
  y += 18;

  FIRST_VIEW_ROWS.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(MX, y, PW - MX * 2, rowH, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(pdfSafeText(row.label), MX + 2, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(pdfSafeText(row.direction), MX + 2, y + 9);
    homes.forEach((f, i) => {
      const x = MX + labelW + i * colW;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const lines = doc.splitTextToSize(pdfSafeText(cellValue(row, f)), colW - 4);
      doc.text(lines.slice(0, 2), x + 2, y + 5);
    });
    y += rowH;
  });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const note = doc.splitTextToSize(pdfSafeText(
    'Notes: Stars are signals, not guarantees. Verify on medicare.gov/care-compare before a visit. This free file is a one-page snapshot. The paid Compare Brief is the deeper multi-home packet. Individual $29 Facility Briefs remain available per home.'
  ), PW - MX * 2);
  doc.text(note, MX, y);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(pdfSafeText('oversightreports.com · Not affiliated with or endorsed by HHS/CMS'), MX, PH - 8);

  if (options.returnDoc) return doc;

  const names = homes.map((f) => cleanFilename(f.name)).join('_');
  doc.save(`OversightReport_Compare_${names || 'homes'}.pdf`);
  return doc;
}
