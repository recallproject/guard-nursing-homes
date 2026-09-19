import jsPDFModule from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BRIEF_PDF_FONT, registerBriefPdfFonts } from './briefPdfFonts.js';
import { buildCompareBriefModel } from './compareBriefContent.js';
import { pdfSafeDeep, pdfSafeText } from './pdfSafeText.js';

const jsPDF = jsPDFModule.jsPDF || jsPDFModule;
const FONT = BRIEF_PDF_FONT;

const C = {
  ink: [31, 41, 55],
  muted: [107, 114, 128],
  line: [229, 231, 235],
  bg: [250, 250, 248],
  card: [255, 255, 255],
  teal: [13, 148, 136],
  tealSoft: [204, 251, 241],
  navy: [15, 23, 42],
  white: [255, 255, 255],
};

function cleanFilename(name) {
  return String(name || 'Home').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 28);
}

function pdfStars(text) {
  return pdfSafeText(String(text || '')
    .replace(/★/g, '*')
    .replace(/☆/g, '.')
    .replace(/·/g, ' - '));
}

/**
 * Paid Compare Brief — deeper than the free 1-page snapshot, one packet for 2-3 homes.
 */
export function generateCompareBriefPDF(facilities, options = {}) {
  const model = pdfSafeDeep(buildCompareBriefModel(facilities, options));
  const homes = model.homes || [];

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
  const FLOOR = PH - 18;
  const PT_MM = 1 / doc.internal.scaleFactor;
  const lineMm = (sizePt, factor = 1.35) => sizePt * PT_MM * factor;

  const overflows = [];
  const rawText = doc.text.bind(doc);
  doc.text = (text, x, y, opts) => {
    doc.setCharSpace(0);
    const safe = Array.isArray(text) ? text.map((line) => pdfSafeText(line)) : pdfSafeText(text);
    const options = opts || {};
    const lines = Array.isArray(safe) ? safe : String(safe).split('\n');
    const size = doc.getFontSize();
    const factor = options.lineHeightFactor || 1.15;
    const lh = lineMm(size, factor);
    const align = options.align || 'left';
    const page = doc.internal.getCurrentPageInfo().pageNumber;
    lines.forEach((line, i) => {
      const tw = doc.getTextWidth(String(line));
      let left = x;
      if (align === 'center') left = x - tw / 2;
      if (align === 'right') left = x - tw;
      const yy = y + i * lh;
      if (rightOverflow(left + tw, yy, page, line)) overflows.push({ page, kind: 'right', line: String(line).slice(0, 80) });
      if (yy > PH - 12) overflows.push({ page, kind: 'bottom', line: String(line).slice(0, 80) });
    });
    return rawText(safe, x, y, opts);
  };
  function rightOverflow(right, _y, _page, _line) {
    return right > PW - MX + 1.2;
  }
  doc.__briefOverflows = overflows;

  doc.setProperties({
    title: `The Oversight Report — ${model.productLabel}`,
    author: 'Robert Benard, NP — DataLink Clinical LLC',
    creator: 'oversightreports.com — provenance dlc-prov-2026q2-9c4f5b3a',
    subject: `${model.productLabel}: ${model.title}. Provenance fingerprint dlc-prov-2026q2-9c4f5b3a.`,
    keywords: 'nursing home, CMS, oversight, compare brief, dlc-prov-2026q2-9c4f5b3a, DataLink Clinical',
  });

  function paintBg() {
    doc.setFillColor(...C.bg);
    doc.rect(0, 0, PW, PH, 'F');
  }
  function setText(rgb) { doc.setTextColor(...rgb); }
  function setDraw(rgb) { doc.setDrawColor(...rgb); }

  function wrap(text, width, size = 11, font = 'normal') {
    doc.setFont(FONT, font);
    doc.setFontSize(size);
    return doc.splitTextToSize(pdfSafeText(String(text ?? '')), width);
  }

  function footer(pageNo) {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7.5);
    setText(C.muted);
    doc.text('The Oversight Report  ·  Compare Brief  ·  oversightreports.com', MX, PH - 10);
    doc.text(String(pageNo), PW - MX, PH - 10, { align: 'right' });
  }

  function pageHead(title) {
    paintBg();
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, PW, 11, 'F');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(8);
    setText(C.white);
    doc.text('THE OVERSIGHT REPORT', MX, 7);
    doc.setFont(FONT, 'normal');
    doc.text(model.productLabel, PW - MX, 7, { align: 'right' });
    if (title) {
      doc.setFont(FONT, 'bold');
      doc.setFontSize(14);
      setText(C.navy);
      doc.text(pdfSafeText(title), MX, 20);
      return 26;
    }
    return 16;
  }

  // ── Cover ──────────────────────────────────────────────
  paintBg();
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, 42, 'F');
  doc.setFillColor(...C.teal);
  doc.rect(0, 42, PW, 2.2, 'F');
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  setText(C.tealSoft);
  doc.text('THE OVERSIGHT REPORT', MX, 14);
  doc.setFont(FONT, 'bold');
  doc.setFontSize(22);
  setText(C.white);
  const titleLines = wrap(model.title, W, 22, 'bold');
  doc.text(titleLines.slice(0, 3), MX, 26, { lineHeightFactor: 1.15 });

  let y = 54;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  setText(C.teal);
  doc.text(model.productLabel.toUpperCase(), MX, y);
  y += 7;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  setText(C.muted);
  doc.text(pdfSafeText(`CMS data as of ${model.dataAsOfLabel}  ·  Report ${model.reportDateLabel}`), MX, y);
  y += 10;

  homes.forEach((home, i) => {
    const col = model.columns[i];
    doc.setFillColor(...C.card);
    setDraw(C.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(MX, y, W, 16, 1.5, 1.5, 'FD');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(11);
    setText(C.navy);
    doc.text(pdfSafeText(col.name), MX + 4, y + 6.5);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8.5);
    setText(C.muted);
    doc.text(pdfSafeText(`${col.location}  ·  CCN ${home.ccn}`), MX + 4, y + 12);
    y += 18;
  });

  y += 4;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  setText(C.navy);
  doc.text('Inside this packet', MX, y);
  y += 6;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  setText(C.ink);
  wrap(model.inside, W, 10).forEach((line) => {
    doc.text(line, MX, y);
    y += 5;
  });

  y += 4;
  doc.setFillColor(...C.tealSoft);
  const disc = wrap(
    'This is the deeper multi-home packet — not the free one-page snapshot. Same public CMS facts, plus what stands out, one shared visit checklist, and one decision worksheet. Not a recommendation to choose any home.',
    W - 8,
    9
  );
  const discH = 8 + disc.length * 4.2;
  doc.roundedRect(MX, y, W, discH, 1.5, 1.5, 'F');
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  setText(C.ink);
  doc.text(disc, MX + 4, y + 6, { lineHeightFactor: 1.35 });
  y += discH + 8;

  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  setText(C.muted);
  doc.text(wrap(model.disclaimer, W, 8), MX, y, { lineHeightFactor: 1.35 });
  footer(1);

  // ── Scorecard ──────────────────────────────────────────
  y = pageHead('Side-by-side scorecard');
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9.5);
  setText(C.muted);
  doc.text('Same metric family as the free comparison. Stars are signals, not guarantees.', MX, y);
  y += 6;

  const head = ['Metric', ...model.columns.map((c) => c.short)];
  const body = model.scorecard.map((row) => [
    `${row.label}\n${row.direction}`,
    ...row.values.map((v) => pdfStars(v)),
  ]);
  autoTable(doc, {
    startY: y,
    margin: { left: MX, right: MX, bottom: 20 },
    tableWidth: W,
    head: [head],
    body,
    theme: 'plain',
    styles: {
      font: FONT,
      fontSize: 8.5,
      textColor: C.ink,
      cellPadding: { top: 2, bottom: 2, left: 1.4, right: 1.4 },
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: { fontStyle: 'bold', fontSize: 8, textColor: C.white, fillColor: C.navy },
    columnStyles: Object.fromEntries(
      head.map((_, i) => [i, { cellWidth: i === 0 ? W * 0.28 : W * (0.72 / Math.max(1, homes.length)) }])
    ),
    didParseCell: (data) => {
      if (data.section === 'body') {
        data.cell.styles.lineColor = C.line;
        data.cell.styles.lineWidth = { bottom: 0.12 };
        if (data.row.index % 2 === 0) data.cell.styles.fillColor = [248, 250, 252];
      }
    },
  });
  footer(2);

  // ── What stands out ────────────────────────────────────
  doc.addPage();
  y = pageHead('What stands out');
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9.5);
  setText(C.muted);
  const intro = wrap(
    'Rule-based notes from the public record already shown in the scorecard. These are tour prompts, not clinical advice and not a ranking.',
    W,
    9.5
  );
  doc.text(intro, MX, y, { lineHeightFactor: 1.35 });
  y += intro.length * 4.4 + 4;

  const colW = homes.length === 3 ? (W - 6) / 3 : (W - 4) / 2;
  const cardTops = [];
  model.columns.forEach((col, i) => {
    const x = MX + i * (colW + (homes.length === 3 ? 3 : 4));
    const bullets = col.standsOut.map((b) => `• ${b}`);
    const lines = bullets.flatMap((b) => wrap(b, colW - 8, 8.5));
    const h = Math.min(FLOOR - y, 14 + lines.length * 4.2);
    doc.setFillColor(...C.card);
    setDraw(C.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, colW, h, 1.5, 1.5, 'FD');
    doc.setFillColor(...C.teal);
    doc.rect(x, y, 2.2, h, 'F');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(9);
    setText(C.navy);
    const nameLines = wrap(col.name, colW - 8, 9, 'bold');
    doc.text(nameLines.slice(0, 2), x + 5, y + 6, { lineHeightFactor: 1.15 });
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8.5);
    setText(C.ink);
    doc.text(lines.slice(0, 12), x + 5, y + 14, { lineHeightFactor: 1.3 });
    cardTops.push(h);
  });
  y += Math.max(...cardTops, 40) + 8;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  setText(C.muted);
  doc.text(wrap(model.limitation, W, 8), MX, Math.min(y, FLOOR - 10), { lineHeightFactor: 1.3 });
  footer(3);

  // ── Shared visit checklist ─────────────────────────────
  doc.addPage();
  y = pageHead('Shared visit checklist');
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9.5);
  setText(C.muted);
  doc.text('One list for the set — not three copies. Write who answered at each home.', MX, y);
  y += 7;

  model.checklist.forEach((q, idx) => {
    const qLines = wrap(`${idx + 1}. ${q}`, W, 10, 'bold');
    const qH = qLines.length * 4.4;
    if (y + qH + 16 > FLOOR) return;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    setText(C.ink);
    doc.text(qLines, MX, y, { lineHeightFactor: 1.3 });
    y += qH + 5;
    setDraw([203, 213, 225]);
    doc.setLineWidth(0.25);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    setText(C.muted);
    model.columns.forEach((col, i) => {
      const x = MX + i * (W / Math.max(1, homes.length));
      doc.text(pdfSafeText(col.short), x, y);
      doc.line(x, y + 5, x + (W / homes.length) - 4, y + 5);
    });
    y += 12;
  });
  footer(4);

  // ── Decision worksheet ─────────────────────────────────
  doc.addPage();
  y = pageHead('Decision worksheet');
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9.5);
  setText(C.ink);
  const hint = wrap(model.mustHavesHint, W, 9.5);
  doc.text(hint, MX, y, { lineHeightFactor: 1.35 });
  y += hint.length * 4.4 + 6;

  doc.setFont(FONT, 'bold');
  doc.setFontSize(10);
  setText(C.navy);
  doc.text('Our must-haves', MX, y);
  y += 5;
  setDraw(C.line);
  doc.setLineWidth(0.3);
  for (let i = 0; i < 3; i += 1) {
    doc.line(MX, y + i * 7, MX + W, y + i * 7);
  }
  y += 26;

  const wsHead = ['Question', ...model.columns.map((c) => c.short)];
  const wsBody = model.worksheet.map((row) => [row.label, ...homes.map(() => '')]);
  autoTable(doc, {
    startY: y,
    margin: { left: MX, right: MX, bottom: 20 },
    tableWidth: W,
    head: [wsHead],
    body: wsBody,
    theme: 'plain',
    styles: {
      font: FONT,
      fontSize: 9,
      textColor: C.ink,
      minCellHeight: 14,
      cellPadding: { top: 3, bottom: 3, left: 1.6, right: 1.6 },
      overflow: 'linebreak',
    },
    headStyles: { fontStyle: 'bold', fontSize: 8, textColor: C.white, fillColor: C.navy, minCellHeight: 8 },
    columnStyles: Object.fromEntries(
      wsHead.map((_, i) => [i, { cellWidth: i === 0 ? W * 0.34 : W * (0.66 / Math.max(1, homes.length)) }])
    ),
    didParseCell: (data) => {
      data.cell.styles.lineColor = C.line;
      data.cell.styles.lineWidth = 0.2;
    },
  });
  y = doc.lastAutoTable.finalY + 8;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(10);
  setText(C.navy);
  doc.text('Next step', MX, y);
  y += 5;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9.5);
  setText(C.ink);
  doc.text(wrap(model.nextStep, W, 9.5), MX, y, { lineHeightFactor: 1.35 });
  footer(5);

  // ── Appendix ───────────────────────────────────────────
  doc.addPage();
  y = pageHead('Appendix — deeper rows');
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  setText(C.muted);
  doc.text('Extra CMS fields already used on the compare screen. Not a full deficiency dump.', MX, y);
  y += 6;

  model.appendix.forEach((group) => {
    if (y > FLOOR - 28) return;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    setText(C.navy);
    doc.text(pdfSafeText(group.title), MX, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      margin: { left: MX, right: MX, bottom: 16 },
      tableWidth: W,
      head: [['Measure', ...model.columns.map((c) => c.short)]],
      body: group.rows.map((row) => [row.label, ...row.values.map((v) => pdfStars(v))]),
      theme: 'plain',
      styles: {
        font: FONT,
        fontSize: 7.5,
        textColor: C.ink,
        cellPadding: { top: 1.2, bottom: 1.2, left: 1.2, right: 1.2 },
        overflow: 'linebreak',
      },
      headStyles: { fontStyle: 'bold', fontSize: 7, textColor: C.muted, fillColor: [241, 245, 249] },
      columnStyles: Object.fromEntries(
        ['', ...homes].map((_, i) => [i, { cellWidth: i === 0 ? W * 0.3 : W * (0.7 / Math.max(1, homes.length)) }])
      ),
      didParseCell: (data) => {
        if (data.section === 'body') {
          data.cell.styles.lineColor = C.line;
          data.cell.styles.lineWidth = { bottom: 0.1 };
        }
      },
    });
    y = doc.lastAutoTable.finalY + 5;
  });

  if (y < FLOOR - 16) {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    setText(C.muted);
    doc.text(wrap(model.sources, W, 8), MX, y, { lineHeightFactor: 1.3 });
  }
  footer(6);

  if (options.returnDoc) return doc;

  const names = homes.map((f) => cleanFilename(f.name)).join('_');
  doc.save(`OversightReport_CompareBrief_${names || 'homes'}.pdf`);
  return doc;
}
