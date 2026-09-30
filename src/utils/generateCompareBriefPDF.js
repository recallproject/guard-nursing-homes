import jsPDFModule from 'jspdf';
import { PRODUCT_LABEL, buildCompareBriefModel } from './compareBriefContent.js';
import { pdfSafeDeep, pdfSafeText } from './pdfSafeText.js';
import { BRIEF_PDF_FONT, registerBriefPdfFonts } from './briefPdfFonts.js';

const jsPDF = jsPDFModule.jsPDF || jsPDFModule;
const FONT = BRIEF_PDF_FONT;

const C = {
  ink: [31, 41, 55],
  muted: [107, 114, 128],
  faint: [148, 163, 184],
  line: [229, 231, 235],
  bg: [248, 250, 252],
  teal: [13, 148, 136],
  tealDeep: [15, 118, 110],
  navy: [15, 22, 41],
  white: [255, 255, 255],
  amberBg: [255, 251, 235],
  amber: [180, 83, 9],
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
  const MX = 16;
  const W = PW - MX * 2;
  const FLOOR = PH - 18;
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

  function rule(at) {
    setDraw(C.line);
    doc.setLineWidth(0.3);
    doc.line(MX, at, MX + W, at);
  }

  function newPage() {
    doc.addPage();
    y = 20;
    setText(C.faint);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.text(PRODUCT_LABEL, MX, 12);
    doc.text(pdfSafeText(`${model.count} nursing homes`), MX + W, 12, { align: 'right' });
    rule(14.5);
  }

  function need(height) {
    if (y + height > FLOOR) newPage();
  }

  function heading(text) {
    need(16);
    y += 2;
    setText(C.navy);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(15);
    doc.text(pdfSafeText(text), MX, y);
    y += 2.2;
    setDraw(C.navy);
    doc.setLineWidth(0.45);
    doc.line(MX, y, MX + W, y);
    y += 6;
  }

  function paintScoreHeader() {
    const labelW = 46;
    const colW = (W - labelW) / model.count;
    const nameLines = model.homes.map((home) => (
      wrap(home.tableName || home.shortName || home.name, colW - 5, 8, 'bold').slice(0, 2)
    ));
    const lineCount = Math.max(1, ...nameLines.map((lines) => lines.length));
    const h = 5.5 + lineCount * 3.6;
    need(h + 12);
    setFill(C.navy);
    doc.rect(MX, y, W, h, 'F');
    setText(C.white);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(8);
    doc.text('Measure', MX + 2.5, y + 4.2);
    nameLines.forEach((lines, index) => {
      doc.text(lines, MX + labelW + index * colW + 2, y + 4.2);
    });
    y += h;
    return { labelW, colW };
  }

  function drawTable(rows) {
    if (!rows?.length) return;
    let cols = paintScoreHeader();
    rows.forEach((row, index) => {
      doc.setFont(FONT, 'bold');
      doc.setFontSize(8.5);
      const labelLines = wrap(row.label, cols.labelW - 5, 8.5, 'bold');
      const dirLines = wrap(row.direction, cols.labelW - 5, 7, 'normal');
      const cellLines = row.cells.map((cell) => wrap(cell, cols.colW - 5, 8.5, 'normal'));
      const lineCount = Math.max(
        labelLines.length + dirLines.length,
        ...cellLines.map((lines) => lines.length),
        1,
      );
      const h = 5.2 + lineCount * 3.7;
      if (y + h > FLOOR) {
        newPage();
        cols = paintScoreHeader();
      }
      if (index % 2 === 0) {
        setFill(C.bg);
        doc.rect(MX, y, W, h, 'F');
      }
      setText(C.navy);
      doc.setFont(FONT, 'bold');
      doc.setFontSize(8.5);
      doc.text(labelLines, MX + 2.5, y + 4.4);
      setText(C.muted);
      doc.setFont(FONT, 'normal');
      doc.setFontSize(7);
      doc.text(dirLines, MX + 2.5, y + 4.4 + labelLines.length * 3.6);
      row.cells.forEach((cell, cellIndex) => {
        setText(C.ink);
        doc.setFont(FONT, 'normal');
        doc.setFontSize(8.5);
        doc.text(cellLines[cellIndex], MX + cols.labelW + cellIndex * cols.colW + 2, y + 4.4);
      });
      y += h;
    });
    y += 2;
  }

  function homeCard(home) {
    const nameWidth = W - 38;
    const nameLines = wrap(home.name, nameWidth, 12, 'bold');
    const meta = `${home.place}  ·  CCN ${home.ccn}`;
    const metaLines = wrap(meta, nameWidth, 9, 'normal');
    const h = 7 + nameLines.length * 5.2 + metaLines.length * 4.2;
    need(h + 3.5);
    setFill(C.bg);
    doc.roundedRect(MX, y, W, h, 1.6, 1.6, 'F');
    setText(C.muted);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7.5);
    doc.text('Overall', MX + W - 6, y + 6, { align: 'right' });
    setText(C.navy);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(12);
    doc.text(pdfSafeText(home.starsLabel), MX + W - 6, y + 11.2, { align: 'right' });
    setText(C.navy);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(12);
    doc.text(nameLines, MX + 4, y + 7);
    setText(C.muted);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.text(metaLines, MX + 4, y + 7 + nameLines.length * 5.2);
    y += h + 3.2;
  }

  function labelCase(text) {
    const value = String(text || '');
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function differenceCard(item) {
    const inner = W - 12;
    const labelLines = item.label ? wrap(labelCase(item.label), inner, 8.5, 'bold') : [];
    const factLines = wrap(item.fact || item.text, inner, 10.5, 'normal');
    const askLines = item.ask ? wrap(item.ask, inner, 10, 'normal') : [];
    const h = 5
      + labelLines.length * 3.8
      + factLines.length * 4.6
      + (askLines.length ? 1.6 + askLines.length * 4.4 : 0)
      + 4.5;
    need(h + 3);
    const top = y;
    setFill(item.status === 'insufficient' ? C.amberBg : C.bg);
    doc.roundedRect(MX, top, W, h, 1.4, 1.4, 'F');
    setFill(item.status === 'insufficient' ? C.amber : C.teal);
    doc.rect(MX, top, 1.3, h, 'F');
    let cursor = top + 5.2;
    if (labelLines.length) {
      setText(item.status === 'insufficient' ? C.amber : C.tealDeep);
      doc.setFont(FONT, 'bold');
      doc.setFontSize(8.5);
      doc.text(labelLines, MX + 5, cursor);
      cursor += labelLines.length * 3.8 + 1.2;
    }
    setText(C.ink);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(10.5);
    doc.text(factLines, MX + 5, cursor);
    cursor += factLines.length * 4.6;
    if (askLines.length) {
      cursor += 1.6;
      setText(C.muted);
      doc.setFontSize(10);
      doc.text(askLines, MX + 5, cursor);
    }
    y = top + h + 3;
  }

  // Page 1: homes, then the scorecard. No cover essay.
  setText(C.tealDeep);
  doc.setFont(FONT, 'bold');
  doc.setFontSize(8.5);
  doc.text(PRODUCT_LABEL.toUpperCase(), MX, y);
  setText(C.muted);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(8.5);
  doc.text(pdfSafeText(`CMS data as of ${model.dataAsOfLabel}`), MX + W, y, { align: 'right' });
  y += 8;
  setText(C.navy);
  doc.setFont(FONT, 'bold');
  doc.setFontSize(22);
  doc.text(pdfSafeText(`${model.count} nursing homes`), MX, y);
  y += 6;
  setText(C.muted);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  const lede = wrap(
    `Generated ${model.reportDateLabel}. A scorecard and visit questions. This document does not pick a home.`,
    W,
    10,
    'normal',
  );
  doc.text(lede, MX, y);
  y += lede.length * 4.4 + 5;

  model.homes.forEach(homeCard);

  heading('Scorecard');
  drawTable(model.scorecard);
  if (model.extraScorecard?.length) {
    const extraGuess = 18 + model.extraScorecard.length * 14;
    if (y + extraGuess > FLOOR) newPage();
    setText(C.navy);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(11);
    doc.text('More from the same extract', MX, y);
    y += 5;
    drawTable(model.extraScorecard);
  }

  heading('Differences to ask about');
  if (model.noMaterialDifference) {
    differenceCard({
      id: 'none',
      status: 'insufficient',
      label: 'Thin evidence',
      fact: model.noMaterialDifference,
      ask: '',
    });
  }
  model.differences.forEach(differenceCard);

  if (y + 36 > FLOOR) newPage();
  heading('Questions for your visit');
  model.sharedQuestions.forEach((question, index) => {
    const lines = wrap(question, W - 10, 10.5, 'normal');
    const h = lines.length * 4.6 + 3.2;
    need(h + 1);
    setText(C.tealDeep);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10.5);
    doc.text(String(index + 1), MX, y);
    setText(C.ink);
    doc.setFont(FONT, 'normal');
    doc.text(lines, MX + 8, y);
    y += h;
  });

  model.facilityQuestions.forEach((home) => {
    need(16);
    y += 2;
    setText(C.navy);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(12);
    doc.text(pdfSafeText(home.name), MX, y);
    y += 5.5;
    home.questions.forEach((question) => {
      const lines = wrap(question, W - 8, 10, 'normal');
      const h = lines.length * 4.4 + 2.4;
      need(h);
      setFill(C.teal);
      doc.circle(MX + 1.1, y - 1.1, 0.7, 'F');
      setText(C.ink);
      doc.setFont(FONT, 'normal');
      doc.setFontSize(10);
      doc.text(lines, MX + 5, y);
      y += h;
    });
  });

  newPage();
  heading('Notes and decision');
  const noteIntro = wrap(
    'Write what you saw. Distance, the care you need, and the people you met can matter more than a higher star rating.',
    W,
    10,
    'normal',
  );
  setText(C.muted);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.text(noteIntro, MX, y);
  y += noteIntro.length * 4.4 + 5;

  model.homes.forEach((home) => {
    const block = 8 + model.worksheetPrompts.length * 8;
    need(Math.min(block, 40));
    setText(C.navy);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(12);
      doc.text(pdfSafeText(home.tableName || home.shortName || home.name), MX, y);
      y += 6.5;
      model.worksheetPrompts.forEach((prompt) => {
        need(8);
        setText(C.muted);
        doc.setFont(FONT, 'normal');
        doc.setFontSize(9);
        const safePrompt = pdfSafeText(prompt);
        doc.text(safePrompt, MX, y);
        const labelWidth = Math.min(doc.getTextWidth(safePrompt) + 4, W - 24);
        setDraw(C.line);
        doc.setLineWidth(0.25);
        doc.line(MX + labelWidth, y + 1.1, MX + W, y + 1.1);
        y += 7;
      });
      y += 2.5;
    });

  heading('Sources and limits');
  model.sources.forEach((line) => {
    const lines = wrap(line, W - 6, 9, 'normal');
    const h = lines.length * 4 + 1.6;
    need(h);
    setFill(C.teal);
    doc.circle(MX + 1.1, y - 1, 0.65, 'F');
    setText(C.ink);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.text(lines, MX + 5, y);
    y += h;
  });
  y += 1.5;
  model.limits.forEach((line) => {
    const lines = wrap(line, W, 8.5, 'normal');
    need(lines.length * 3.8 + 1.6);
    setText(C.muted);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8.5);
    doc.text(lines, MX, y);
    y += lines.length * 3.8 + 1.8;
  });
  [model.independence, model.paymentDisclosure].forEach((line) => {
    const lines = wrap(line, W, 8.5, 'normal');
    need(lines.length * 3.8 + 1.6);
    setText(C.muted);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8.5);
    doc.text(lines, MX, y);
    y += lines.length * 3.8 + 1.6;
  });

  const pageCount = doc.getNumberOfPages();
  const footerLead = 'oversightreports.com  -  Compare Brief  -  Not affiliated with or endorsed by HHS/CMS.';
  const footerPay = 'Facilities cannot pay to change this presentation.';
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    setText(C.faint);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7.5);
    rawText(pdfSafeText(footerLead), MX, PH - 11);
    rawText(pdfSafeText(footerPay), MX, PH - 7.5);
    rawText(pdfSafeText(`Page ${page} of ${pageCount}`), MX + W, PH - 11, { align: 'right' });
  }

  if (options.returnDoc) return doc;
  const names = model.homes.map((home) => cleanFilename(home.name)).join('_');
  doc.save(`OversightReport_Compare_Brief_${names || 'homes'}.pdf`);
  return doc;
}
