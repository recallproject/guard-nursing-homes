import jsPDFModule from 'jspdf';
import { BRIEF_PAGE_COUNT } from './facilityBriefContent.js';
import { buildFamilyReportModel, FAMILY_REPORT_PAGE_COUNT } from './familyReportContent.js';

const jsPDF = jsPDFModule.jsPDF || jsPDFModule;

const C = {
  ink: [31, 41, 55],
  muted: [107, 114, 128],
  line: [229, 231, 235],
  bg: [250, 250, 248],
  card: [255, 255, 255],
  teal: [13, 148, 136],
  tealSoft: [204, 251, 241],
  tealLine: [94, 234, 212],
  tealText: [15, 118, 110],
  tealDeep: [19, 78, 74],
  amber: [180, 83, 9],
  amberSoft: [254, 243, 199],
  amberLine: [252, 211, 77],
  red: [185, 28, 28],
  redSoft: [254, 226, 226],
  redLine: [252, 165, 165],
  navy: [15, 23, 42],
  white: [255, 255, 255],
  meansInk: [55, 65, 81],
};

const TONE = {
  urgent: { border: C.redLine, fill: C.redSoft, text: C.red },
  warn: { border: C.amberLine, fill: C.amberSoft, text: C.amber },
  ok: { border: C.tealLine, fill: C.tealSoft, text: C.tealText },
  good: { border: C.tealLine, fill: C.card, text: C.tealText },
  bad: { border: C.redLine, fill: C.card, text: C.red },
  amber: { border: C.amberLine, fill: C.card, text: C.amber },
  neutral: { border: C.line, fill: C.card, text: C.navy },
};

function cleanFilename(name) {
  return String(name || 'Facility').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
}

function fillStar(doc, cx, cy, r, color) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    const a2 = a + Math.PI / 5;
    pts.push([cx + r * 0.38 * Math.cos(a2), cy + r * 0.38 * Math.sin(a2)]);
  }
  const rest = [];
  for (let i = 1; i < pts.length; i++) {
    rest.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
  }
  rest.push([pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]]);
  doc.setFillColor(...color);
  doc.lines(rest, pts[0][0], pts[0][1], [1, 1], 'F', true);
}

/**
 * Free 1-page Family Report (approved mock). Same public API as before:
 * generatePDF(facility, options).
 *
 * @param {object} facility
 * @param {object} [options]
 * @param {boolean} [options.isSample]
 * @param {string|null} [options.dataAsOf]
 * @param {Date} [options.reportDate]
 * @param {boolean} [options.returnDoc]
 */
export function generatePDF(facility, options = {}) {
  const model = buildFamilyReportModel(facility, {
    dataAsOf: options.dataAsOf,
    reportDate: options.reportDate,
    isSample: options.isSample,
  });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  doc.setProperties({
    title: `The Oversight Report — ${model.productLabel}`,
    author: 'Robert Benard, NP — DataLink Clinical LLC',
    creator: 'oversightreports.com — provenance dlc-prov-2026q2-9c4f5b3a',
    subject: `${model.productLabel} for ${model.name}. Provenance fingerprint dlc-prov-2026q2-9c4f5b3a. © DataLink Clinical LLC.`,
    keywords: 'nursing home, CMS, oversight, family report, dlc-prov-2026q2, dlc-prov-2026q2-9c4f5b3a, DataLink Clinical',
  });

  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const MX = 14;
  const W = PW - MX * 2;
  const FOOTER_Y = PH - 11.2;
  let y = 11.5;

  function setFill(rgb) { doc.setFillColor(...rgb); }
  function setDraw(rgb) { doc.setDrawColor(...rgb); }
  function setText(rgb) { doc.setTextColor(...rgb); }

  function wrap(text, width, size) {
    doc.setFontSize(size);
    return doc.splitTextToSize(String(text || ''), width);
  }

  setFill(C.bg);
  doc.rect(0, 0, PW, PH, 'F');

  if (model.isSample) {
    setFill(C.amberSoft);
    doc.rect(0, 0, PW, 7.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(C.amber);
    doc.text(
      'SAMPLE REPORT — fictional names and figures. Search a real facility at oversightreports.com',
      PW / 2,
      4.8,
      { align: 'center' }
    );
    y = 11;
  }

  // Brand row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(C.teal);
  doc.text('FAMILY REPORT', MX, y);

  const kickerW = doc.getTextWidth('FAMILY REPORT');
  const pillLabel = 'FREE';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const pillW = doc.getTextWidth(pillLabel) + 6;
  const pillH = 4.6;
  const pillX = MX + kickerW + 2.4;
  const pillY = y - 3.3;
  setFill(C.tealSoft);
  setDraw(C.tealLine);
  doc.setLineWidth(0.28);
  doc.roundedRect(pillX, pillY, pillW, pillH, 2.3, 2.3, 'FD');
  setText(C.tealText);
  doc.text(pillLabel, pillX + pillW / 2, pillY + 3.2, { align: 'center' });

  const rightX = PW - MX;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setText(C.muted);
  doc.text('Report date:', rightX - 52, y);
  doc.setFont('helvetica', 'bold');
  setText(C.ink);
  doc.text(model.reportDateLabel, rightX, y, { align: 'right' });

  y += 5.2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setText(C.navy);
  doc.text('The Oversight Report', MX, y);
  const brandW = doc.getTextWidth('The Oversight Report');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  setText(C.muted);
  doc.text('  · oversightreports.com', MX + brandW, y);

  doc.setFontSize(8.5);
  doc.text('CMS data as of:', rightX - 52, y);
  doc.setFont('helvetica', 'bold');
  setText(C.ink);
  doc.text(model.dataAsOfLabel, rightX, y, { align: 'right' });

  y += 3.2;
  setDraw(C.navy);
  doc.setLineWidth(0.7);
  doc.line(MX, y, MX + W, y);

  y += 8.2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  setText(C.navy);
  const nameLines = wrap(model.name, W, 24);
  doc.text(nameLines, MX, y, { lineHeightFactor: 1.12 });
  y += nameLines.length * 8.8 + 1.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  setText(C.muted);
  const metaLines = wrap(model.metaLine, W, 10.5);
  doc.text(metaLines, MX, y, { lineHeightFactor: 1.35 });
  y += metaLines.length * 4.4 + 3.2;

  // Star cards
  const starItems = [model.stars.overall, model.stars.inspection, model.stars.staffing, model.stars.quality];
  const starGap = 2.4;
  const starW = (W - starGap * 3) / 4;
  const starH = 17.4;
  starItems.forEach((item, i) => {
    const xx = MX + i * (starW + starGap);
    const tone = TONE[item.tone] || TONE.neutral;
    setFill(C.card);
    setDraw(C.line);
    doc.setLineWidth(0.32);
    doc.roundedRect(xx, y, starW, starH, 2.2, 2.2, 'FD');
    const starColor = tone.text;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14.5);
    const value = String(item.value);
    const tw = doc.getTextWidth(value);
    const cluster = tw + 6.4;
    const startX = xx + (starW - cluster) / 2;
    fillStar(doc, startX + 2.15, y + 6.8, 2.15, starColor);
    setText(starColor);
    doc.text(value, startX + 5.8, y + 8.3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(C.muted);
    const lbl = wrap(String(item.label).toUpperCase(), starW - 4, 7);
    doc.text(lbl, xx + starW / 2, y + 12.6, { align: 'center', lineHeightFactor: 1.15 });
  });
  y += starH + 2.8;

  // Alert chips
  let cx = MX;
  let cy = y;
  const chipH = 11.4;
  const chipGap = 2.2;
  model.chips.forEach((item) => {
    const t = TONE[item.tone] || TONE.neutral;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    const lw = doc.getTextWidth(String(item.label).toUpperCase());
    doc.setFontSize(10);
    const vw = doc.getTextWidth(String(item.value));
    const cw = Math.max(lw, vw) + 8;
    if (cx + cw > MX + W && cx > MX) {
      cx = MX;
      cy += chipH + chipGap;
    }
    setFill(item.tone === 'urgent' ? C.redSoft : item.tone === 'warn' ? C.amberSoft : C.card);
    setDraw(t.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, cy, cw, chipH, 1.6, 1.6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    setText(C.muted);
    doc.text(String(item.label).toUpperCase(), cx + 3.4, cy + 3.8);
    doc.setFontSize(10);
    setText(t.text);
    doc.text(String(item.value), cx + 3.4, cy + 8.8);
    cx += cw + chipGap;
  });
  y = cy + chipH + 3;

  // Bottom line
  const blLines = wrap(model.bottomLine, W - 10, 12.5);
  const blH = blLines.length * 5.35 + 13;
  setFill(C.card);
  setDraw(C.navy);
  doc.setLineWidth(0.5);
  doc.roundedRect(MX, y, W, blH, 2.2, 2.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  setText(C.teal);
  doc.text('BOTTOM LINE', MX + 5, y + 5.6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12.5);
  setText(C.ink);
  doc.text(blLines, MX + 5, y + 11.8, { lineHeightFactor: 1.38 });
  y += blH + 3.8;

  // What this means
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  setText(C.navy);
  doc.text('WHAT THIS MEANS', MX, y);
  y += 1.8;
  setDraw(C.navy);
  doc.setLineWidth(0.42);
  doc.line(MX, y, MX + W, y);
  y += 4.2;

  const meansGap = 2.4;
  const meansW = (W - meansGap * 2) / 3;
  const meansPads = 3.6;
  const meansBodies = model.means.map((m) => wrap(m.detail, meansW - meansPads * 2, 10));
  const meansH = Math.max(
    ...meansBodies.map((lines) => 16.5 + lines.length * 4.05),
    34
  );
  model.means.forEach((m, i) => {
    const xx = MX + i * (meansW + meansGap);
    const tone = TONE[m.tone] || TONE.neutral;
    setFill(C.card);
    setDraw(C.line);
    doc.setLineWidth(0.32);
    doc.roundedRect(xx, y, meansW, meansH, 2.2, 2.2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    setText(C.muted);
    doc.text(String(m.title).toUpperCase(), xx + meansPads, y + 5);
    doc.setFontSize(11.5);
    setText(tone.text);
    doc.text(String(m.value), xx + meansPads, y + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setText(C.meansInk);
    doc.text(meansBodies[i], xx + meansPads, y + 16.4, { lineHeightFactor: 1.32 });
  });
  y += meansH + 3.5;

  // Watch for + questions
  const colGap = 3.2;
  const leftW = W * 0.52;
  const rightW = W - leftW - colGap;
  const listSize = 10;
  const listLh = 3.95;

  function measureLabeled(items, width) {
    let h = 0;
    items.forEach((item) => {
      const block = measureLabeledBlock(item.label, item.text, width - 8);
      h += block + 1.6;
    });
    return h;
  }

  function measureLabeledBlock(label, text, width) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(listSize);
    const lead = `${label}: `;
    const leadW = doc.getTextWidth(lead);
    const firstW = Math.max(18, width - leadW);
    const { lines } = wrapAfterPrefix(lead, text, width, firstW);
    return 2.2 + Math.max(1, lines.length) * listLh;
  }

  function wrapAfterPrefix(lead, text, fullW, firstW) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(listSize);
    const words = String(text || '').split(/\s+/).filter(Boolean);
    let first = '';
    let i = 0;
    while (i < words.length) {
      const trial = first ? `${first} ${words[i]}` : words[i];
      if (doc.getTextWidth(trial) <= firstW) {
        first = trial;
        i += 1;
      } else {
        break;
      }
    }
    const rest = words.slice(i).join(' ');
    const more = rest ? wrap(rest, fullW, listSize) : [];
    return { first, lines: [first, ...more].filter((line, idx) => line || idx === 0) };
  }

  function drawLabeledList(items, x, yy, width) {
    let cy = yy;
    items.forEach((item) => {
      setFill(C.navy);
      doc.circle(x + 1.15, cy + 1.15, 0.55, 'F');
      const textX = x + 4.2;
      const innerW = width - 6.2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(listSize);
      setText(C.ink);
      const lead = `${item.label}: `;
      const leadW = doc.getTextWidth(lead);
      doc.text(lead, textX, cy + 1.5);
      const packed = wrapAfterPrefix(lead, item.text, innerW, Math.max(18, innerW - leadW));
      doc.setFont('helvetica', 'normal');
      if (packed.first) doc.text(packed.first, textX + leadW, cy + 1.5);
      if (packed.lines.length > 1) {
        doc.text(packed.lines.slice(1), textX, cy + 1.5 + listLh, { lineHeightFactor: 1.28 });
      }
      cy += 2.2 + packed.lines.length * listLh;
    });
    return cy;
  }

  function measureQuestions(items, width) {
    let h = 0;
    items.forEach((q, idx) => {
      const prefix = `${idx + 1}. `;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const pw = doc.getTextWidth(prefix);
      const lines = wrap(q, width - 6 - pw, 11);
      h += Math.max(1, lines.length) * 4.4 + 1.3;
    });
    return h;
  }

  function drawQuestions(items, x, yy, width) {
    let cy = yy;
    items.forEach((q, idx) => {
      const prefix = `${idx + 1}. `;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      setText(C.ink);
      const pw = doc.getTextWidth(prefix);
      const lines = wrap(q, width - 6 - pw, 11);
      doc.text(prefix, x + 3.2, cy + 1.6);
      doc.text(lines, x + 3.2 + pw, cy + 1.6, { lineHeightFactor: 1.32 });
      cy += Math.max(1, lines.length) * 4.4 + 1.3;
    });
    return cy;
  }

  const leftInnerH = 11 + measureLabeled(model.watchFors, leftW);
  const rightInnerH = 11 + measureQuestions(model.questions, rightW);
  const colH = Math.max(leftInnerH, rightInnerH, 42);

  setFill([255, 250, 250]);
  setDraw(C.redLine);
  doc.setLineWidth(0.32);
  doc.roundedRect(MX, y, leftW, colH, 2.2, 2.2, 'FD');
  setFill(C.red);
  doc.rect(MX, y + 1.4, 0.9, colH - 2.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  setText(C.navy);
  doc.text('Watch for · plain English', MX + 5.5, y + 6.5);
  drawLabeledList(model.watchFors, MX + 4.5, y + 11.2, leftW - 6);

  const rx = MX + leftW + colGap;
  setFill(C.card);
  setDraw(C.teal);
  doc.setLineWidth(0.32);
  doc.roundedRect(rx, y, rightW, colH, 2.2, 2.2, 'FD');
  setFill(C.teal);
  doc.rect(rx, y + 1.4, 0.9, colH - 2.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  setText(C.navy);
  doc.text('Questions to ask on a visit', rx + 5.5, y + 6.5);
  drawQuestions(model.questions, rx + 2.5, y + 11.2, rightW - 5);
  y += colH + 3.2;

  // CTA
  const priceW = 34;
  const ctaLines = wrap(model.ctaBody, W - priceW - 14, 10.5);
  const ctaH = Math.max(19, 12.5 + ctaLines.length * 4.35);
  setFill(C.tealSoft);
  setDraw(C.tealLine);
  doc.setLineWidth(0.32);
  doc.roundedRect(MX, y, W, ctaH, 2.2, 2.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setText(C.tealText);
  doc.text(model.ctaTitle, MX + 4.5, y + 5.8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  setText(C.tealDeep);
  doc.text(ctaLines, MX + 4.5, y + 11.4, { lineHeightFactor: 1.32 });

  const priceH = ctaH - 5;
  const priceX = MX + W - priceW - 3.2;
  const priceY = y + 2.5;
  setFill(C.card);
  setDraw([153, 246, 228]);
  doc.setLineWidth(0.3);
  doc.roundedRect(priceX, priceY, priceW, priceH, 1.6, 1.6, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setText(C.navy);
  doc.text(model.ctaPrice, priceX + priceW / 2, priceY + 7.2, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  setText(C.muted);
  doc.text(`Facility Brief`, priceX + priceW / 2, priceY + 12.2, { align: 'center' });
  doc.text(`${BRIEF_PAGE_COUNT} pages`, priceX + priceW / 2, priceY + 15.6, { align: 'center' });
  y += ctaH + 3.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(C.muted);
  const noteLines = wrap(model.note, W, 8);
  doc.text(noteLines, MX, y, { lineHeightFactor: 1.32 });

  // Footer
  setDraw(C.line);
  doc.setLineWidth(0.25);
  doc.line(MX, FOOTER_Y, MX + W, FOOTER_Y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(C.muted);
  doc.text(model.footerLeft, MX, FOOTER_Y + 4.6);
  doc.text(`1 / ${FAMILY_REPORT_PAGE_COUNT}`, rightX, FOOTER_Y + 4.6, { align: 'right' });

  // Invisible canary token (white-on-white)
  doc.setFontSize(4);
  setText(C.white);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'DLC-PROVENANCE: dlc-prov-2026q2-9c4f5b3a — © DataLink Clinical LLC — oversightreports.com',
    PW / 2,
    PH - 2.2,
    { align: 'center' }
  );

  const filename = `Family_Report_${cleanFilename(model.name)}${model.ccn ? `_${model.ccn}` : ''}.pdf`;
  if (options.returnDoc) return doc;
  doc.save(filename);
  return filename;
}
