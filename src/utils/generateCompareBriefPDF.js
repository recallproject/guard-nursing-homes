import jsPDFModule from 'jspdf';
import { PRODUCT_LABEL, buildCompareBriefModel } from './compareBriefContent.js';
import { pdfSafeDeep, pdfSafeText } from './pdfSafeText.js';
import { BRIEF_PDF_FONT, registerBriefPdfFonts } from './briefPdfFonts.js';

const jsPDF = jsPDFModule.jsPDF || jsPDFModule;
const FONT = BRIEF_PDF_FONT;

const C = {
  ink: [31, 41, 55],
  muted: [71, 85, 105],
  faint: [148, 163, 184],
  line: [226, 232, 240],
  bg: [248, 250, 252],
  teal: [13, 148, 136],
  navy: [15, 23, 42],
  white: [255, 255, 255],
};

function cleanFilename(name) {
  return String(name || 'Home').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 24);
}

/**
 * Paid Compare Brief: one combined PDF for 2 or 3 homes.
 * @param {object[]} facilities
 * @param {{ dataAsOf?: string, reportDate?: Date, returnDoc?: boolean }} [options]
 */
export function generateCompareBriefPDF(facilities, options = {}) {
  const model = pdfSafeDeep(buildCompareBriefModel(facilities, {
    dataAsOf: options.dataAsOf,
    reportDate: options.reportDate,
  }));
  if (model.count < 2) {
    throw new Error('Compare Brief requires 2 or 3 homes');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
    putOnlyUsedFonts: true,
  });
  registerBriefPdfFonts(doc);

  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const MX = 14;
  const W = PW - MX * 2;
  const FLOOR = PH - 16;
  const overflows = [];
  const rawText = doc.text.bind(doc);
  doc.text = (text, x, y, textOptions) => {
    doc.setCharSpace(0);
    const safe = Array.isArray(text) ? text.map((line) => pdfSafeText(line)) : pdfSafeText(text);
    const opts = textOptions || {};
    const lines = Array.isArray(safe) ? safe : String(safe).split('\n');
    const size = doc.getFontSize();
    const lh = size * (opts.lineHeightFactor || 1.15) / doc.internal.scaleFactor;
    const align = opts.align || 'left';
    const page = doc.internal.getCurrentPageInfo().pageNumber;
    lines.forEach((line, index) => {
      const width = doc.getTextWidth(String(line));
      let left = x;
      if (align === 'center') left = x - width / 2;
      if (align === 'right') left = x - width;
      const yy = y + index * lh;
      if (left + width > PW - MX + 1.2) {
        overflows.push({ page, kind: 'right', line: String(line).slice(0, 80), y: Number(yy.toFixed(1)) });
      }
      if (yy > PH - 12) {
        overflows.push({ page, kind: 'bottom', line: String(line).slice(0, 80), y: Number(yy.toFixed(1)) });
      }
    });
    return rawText(safe, x, y, textOptions);
  };
  doc.__briefOverflows = overflows;

  const homeNames = model.homes.map((home) => home.shortName || home.name).join(', ');
  doc.setProperties({
    title: `The Oversight Report — ${PRODUCT_LABEL}`,
    author: 'Robert Benard, NP — DataLink Clinical LLC',
    creator: 'oversightreports.com',
    subject: `${PRODUCT_LABEL} for ${homeNames}`,
    keywords: 'nursing home, CMS, compare brief, oversight',
  });

  let y = 16;

  function setFill(rgb) { doc.setFillColor(...rgb); }
  function setDraw(rgb) { doc.setDrawColor(...rgb); }
  function setText(rgb) { doc.setTextColor(...rgb); }

  function wrap(text, width, size = 10, style = 'normal') {
    doc.setFont(FONT, style);
    doc.setFontSize(size);
    const safe = pdfSafeText(String(text ?? ''));
    if (!safe) return [''];
    return doc.splitTextToSize(safe, width);
  }

  function newPage() {
    doc.addPage();
    y = 16;
  }

  function need(height) {
    if (y + height > FLOOR) newPage();
  }

  function paragraph(text, { size = 10, style = 'normal', color = C.ink, gap = 2.2, width = W } = {}) {
    const lines = wrap(text, width, size, style);
    const lh = size * 0.42;
    need(lines.length * lh + gap);
    setText(color);
    doc.setFont(FONT, style);
    doc.setFontSize(size);
    doc.text(lines, MX, y);
    y += lines.length * lh + gap;
  }

  function heading(text) {
    need(12);
    setText(C.teal);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(12);
    doc.text(pdfSafeText(text), MX, y);
    y += 6;
    setDraw(C.line);
    doc.setLineWidth(0.3);
    doc.line(MX, y, MX + W, y);
    y += 5;
  }

  function bullet(text) {
    const lines = wrap(text, W - 6, 9.5, 'normal');
    const lh = 4;
    need(lines.length * lh + 1.5);
    setFill(C.teal);
    doc.circle(MX + 1.2, y - 1, 0.7, 'F');
    setText(C.ink);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9.5);
    doc.text(lines, MX + 5, y);
    y += lines.length * lh + 1.4;
  }

  function drawTable(rows) {
    const labelW = 42;
    const colW = (W - labelW) / Math.max(1, model.count);
    rows.forEach((row, index) => {
      doc.setFont(FONT, 'bold');
      doc.setFontSize(8);
      const labelLines = wrap(row.label, labelW - 3, 8, 'bold');
      const dirLines = wrap(row.direction, labelW - 3, 7, 'normal');
      const cellLines = row.cells.map((cell) => wrap(cell, colW - 3, 8, 'normal'));
      const lineCount = Math.max(
        labelLines.length + dirLines.length,
        ...cellLines.map((lines) => lines.length),
        1,
      );
      const h = 4 + lineCount * 3.5;
      need(h + 1);
      if (index % 2 === 0) {
        setFill(C.bg);
        doc.rect(MX, y - 3.2, W, h, 'F');
      }
      setText(C.navy);
      doc.setFont(FONT, 'bold');
      doc.setFontSize(8);
      doc.text(labelLines, MX + 1.5, y);
      setText(C.muted);
      doc.setFont(FONT, 'normal');
      doc.setFontSize(7);
      doc.text(dirLines, MX + 1.5, y + labelLines.length * 3.4);
      row.cells.forEach((cell, cellIndex) => {
        const lines = cellLines[cellIndex];
        setText(C.ink);
        doc.setFont(FONT, 'normal');
        doc.setFontSize(8);
        doc.text(lines, MX + labelW + cellIndex * colW + 1.5, y);
      });
      y += h;
    });
  }

  // Cover
  setText(C.muted);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  doc.text('The Oversight Report', MX, y);
  y += 8;
  setText(C.navy);
  doc.setFont(FONT, 'bold');
  doc.setFontSize(22);
  doc.text(PRODUCT_LABEL, MX, y);
  y += 7;
  paragraph(
    `One decision document for ${model.count} nursing homes. CMS data as of ${model.dataAsOfLabel}. Generated ${model.reportDateLabel}.`,
    { size: 10.5, color: C.muted, gap: 4 },
  );

  model.homes.forEach((home) => {
    need(14);
    setFill(C.bg);
    doc.roundedRect(MX, y - 4, W, 12, 1.2, 1.2, 'F');
    setText(C.navy);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(11);
    const nameLines = wrap(home.name, W - 8, 11, 'bold').slice(0, 1);
    doc.text(nameLines, MX + 3, y);
    setText(C.muted);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8.5);
    doc.text(pdfSafeText(`${home.place}  ·  CCN ${home.ccn}  ·  Overall ${home.starsLabel}`), MX + 3, y + 5);
    y += 14;
  });

  paragraph('What is inside', { size: 11, style: 'bold', gap: 2 });
  bullet('A scorecard of the same public CMS measures, side by side.');
  bullet('Plain-language notes on differences the records actually support.');
  bullet('Seven shared tour questions, plus a few follow-ups for each home.');
  bullet('A notes page for your visit. You decide. This PDF does not.');

  paragraph('What this is not', { size: 11, style: 'bold', gap: 2 });
  bullet('Not a ranking, and not a recommendation of one home.');
  bullet('Not live bed availability or a private-pay price.');
  bullet('Not a substitute for a visit or for Medicare Care Compare.');

  y += 1;
  paragraph(model.independence, { size: 8.5, color: C.muted, gap: 1.6 });
  paragraph(model.paymentDisclosure, { size: 8.5, color: C.muted, gap: 2 });

  // Scorecard
  newPage();
  heading('Scorecard');
  paragraph('Same public fields as the free comparison. Direction labels are CMS meanings, not a verdict.', {
    size: 9, color: C.muted, gap: 3,
  });
  setFill(C.navy);
  doc.rect(MX, y - 3.5, W, 8, 'F');
  setText(C.white);
  doc.setFont(FONT, 'bold');
  doc.setFontSize(8);
  doc.text('Measure', MX + 1.5, y);
  const labelW = 42;
  const colW = (W - labelW) / model.count;
  model.homes.forEach((home, index) => {
    const lines = wrap(home.shortName || home.name, colW - 3, 7.5, 'bold').slice(0, 1);
    doc.text(lines, MX + labelW + index * colW + 1.5, y);
  });
  y += 10;
  drawTable(model.scorecard);
  if (model.extraScorecard?.length) {
    y += 3;
    paragraph('More measures on the same extract', { size: 10, style: 'bold', gap: 2 });
    drawTable(model.extraScorecard);
  }

  // Differences
  newPage();
  heading('Material differences');
  paragraph('Only gaps large enough to ask about are written out. If a figure is missing, or the records are too close to treat as a difference, the page says so.', {
    size: 9, color: C.muted, gap: 3,
  });
  if (model.noMaterialDifference) {
    paragraph(model.noMaterialDifference, { size: 10.5, gap: 3 });
  }
  model.differences.forEach((item) => {
    const lines = wrap(item.text, W - 6, 10, 'normal');
    const h = lines.length * 4.3 + 4;
    need(h + 2);
    setFill(item.status === 'insufficient' ? [255, 251, 235] : C.bg);
    doc.roundedRect(MX, y - 3.5, W, h, 1, 1, 'F');
    setText(C.ink);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(10);
    doc.text(lines, MX + 3, y);
    y += h + 2;
  });

  // Questions
  newPage();
  heading('Questions for your visit');
  paragraph('Shared questions', { size: 11, style: 'bold', gap: 2 });
  model.sharedQuestions.forEach((question, index) => {
    bullet(`${index + 1}. ${question}`);
  });
  y += 2;
  model.facilityQuestions.forEach((home) => {
    paragraph(`Follow-ups for ${home.name}`, { size: 11, style: 'bold', gap: 2 });
    home.questions.forEach((question) => bullet(question));
  });

  // Notes + sources
  newPage();
  heading('Notes and decision');
  paragraph('Write what you saw and what still matters. Distance, specialty care, and the people you met can outweigh a higher star rating. This page is not a score.', {
    size: 9.5, color: C.muted, gap: 3,
  });
  model.homes.forEach((home) => {
    need(36);
    setText(C.navy);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(11);
    doc.text(pdfSafeText(home.shortName || home.name), MX, y);
    y += 6;
    model.worksheetPrompts.forEach((prompt) => {
      need(8);
      setText(C.muted);
      doc.setFont(FONT, 'normal');
      doc.setFontSize(9);
      doc.text(pdfSafeText(prompt), MX, y);
      const labelWidth = Math.min(doc.getTextWidth(pdfSafeText(prompt)) + 3, W - 20);
      setDraw(C.line);
      doc.setLineWidth(0.25);
      doc.line(MX + labelWidth, y + 1, MX + W, y + 1);
      y += 7;
    });
    y += 2;
  });

  need(20);
  heading('Sources, dates, and limits');
  model.sources.forEach((line) => bullet(line));
  y += 1;
  model.limits.forEach((line) => paragraph(line, { size: 8.5, color: C.muted, gap: 1.5 }));
  paragraph(model.independence, { size: 8.5, color: C.muted, gap: 1.4 });
  paragraph(model.paymentDisclosure, { size: 8.5, color: C.muted, gap: 2 });

  const pageCount = doc.getNumberOfPages();
  const footer = 'oversightreports.com  -  Compare Brief  -  Not affiliated with or endorsed by HHS/CMS. Facilities cannot pay to change this presentation.';
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    const footerLines = wrap(footer, W - 28, 7, 'normal');
    setText(C.faint);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7);
    rawText(footerLines.map((line) => pdfSafeText(line)), MX, PH - 11);
    rawText(pdfSafeText(`Page ${page} of ${pageCount}`), MX + W, PH - 8, { align: 'right' });
  }

  if (options.returnDoc) return doc;
  const names = model.homes.map((home) => cleanFilename(home.name)).join('_');
  doc.save(`OversightReport_Compare_Brief_${names || 'homes'}.pdf`);
  return doc;
}
