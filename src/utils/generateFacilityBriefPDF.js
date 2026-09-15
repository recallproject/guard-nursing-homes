import jsPDFModule from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BRIEF_PAGE_COUNT, PRODUCT_LABEL, buildFacilityBriefModel } from './facilityBriefContent.js';
import { haversineDistance } from './haversine.js';
import { pdfSafeDeep, pdfSafeText } from './pdfSafeText.js';

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
  amber: [180, 83, 9],
  amberSoft: [254, 243, 199],
  amberLine: [252, 211, 77],
  red: [185, 28, 28],
  redSoft: [254, 226, 226],
  redLine: [252, 165, 165],
  navy: [15, 23, 42],
  note: [243, 244, 246],
  white: [255, 255, 255],
};

const TONE = {
  urgent: { border: C.redLine, fill: C.redSoft, text: C.red, bar: C.red },
  warn: { border: C.amberLine, fill: C.amberSoft, text: C.amber, bar: C.amber },
  ok: { border: C.tealLine, fill: C.tealSoft, text: C.teal, bar: C.teal },
  good: { border: C.tealLine, fill: C.tealSoft, text: C.teal, bar: C.teal },
  soft: { border: C.teal, fill: C.card, text: C.navy, bar: C.teal },
  neutral: { border: C.line, fill: C.card, text: C.navy, bar: C.navy },
  bad: { border: C.redLine, fill: C.card, text: C.red, bar: C.red },
  amber: { border: C.amberLine, fill: C.card, text: C.amber, bar: C.amber },
};

function fallbackNearby(facility, allFacilities) {
  if (!facility?.lat || !facility?.lon || !Array.isArray(allFacilities) || allFacilities.length === 0) {
    return [];
  }
  return allFacilities
    .filter((f) => f.ccn !== facility.ccn && f.lat && f.lon && (f.composite || 100) < (facility.composite || 0))
    .map((f) => ({ ...f, distance: haversineDistance(facility.lat, facility.lon, f.lat, f.lon) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
}

function cleanFilename(name) {
  return String(name || 'Facility').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
}

/**
 * 9-page family Facility Brief (approved v6 architecture).
 *
 * @param {object} facility
 * @param {Array} nearbyAlternatives
 * @param {Array} [_allFacilities] unused; kept for call-site compatibility
 * @param {object|null} [_antipsychoticData]
 * @param {string|null} dataAsOf ISO date from state `_metadata.data_as_of`
 * @param {object} [options]
 * @param {boolean} [options.returnDoc]
 * @param {Date} [options.reportDate]
 * @returns {import('jspdf').jsPDF|string}
 */
export function generateFacilityBriefPDF(
  facility,
  nearbyAlternatives = [],
  allFacilities = [],
  antipsychoticData = null,
  dataAsOf = null,
  options = {}
) {
  const nearby = (nearbyAlternatives && nearbyAlternatives.length)
    ? nearbyAlternatives
    : fallbackNearby(facility, allFacilities);
  const model = pdfSafeDeep(buildFacilityBriefModel(facility, {
    deficiencyDetails: facility.deficiency_details || [],
    nearbyAlternatives: nearby,
    dataAsOf,
    reportDate: options.reportDate,
    antipsychoticData,
  }));

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const rawText = doc.text.bind(doc);
  doc.text = (text, x, y, options) => {
    doc.setCharSpace(0);
    const safe = Array.isArray(text) ? text.map((line) => pdfSafeText(line)) : pdfSafeText(text);
    return rawText(safe, x, y, options);
  };
  doc.setProperties({
    title: `The Oversight Report — ${PRODUCT_LABEL}`,
    author: 'Robert Benard, NP — DataLink Clinical LLC',
    creator: 'oversightreports.com — provenance dlc-prov-2026q2-9c4f5b3a',
    subject: `${PRODUCT_LABEL} for ${model.name}. Provenance fingerprint dlc-prov-2026q2-9c4f5b3a.`,
    keywords: 'nursing home, CMS, oversight, facility brief, dlc-prov-2026q2-9c4f5b3a, DataLink Clinical',
  });

  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const MX = 14;
  const W = PW - MX * 2;
  // Absolute footers collided with page 8/9 in mock iteration — keep a hard floor.
  const FLOOR = PH - 18;
  let y = 12;

  function paintBg() {
    doc.setFillColor(...C.bg);
    doc.rect(0, 0, PW, PH, 'F');
  }

  function setFill(rgb) { doc.setFillColor(...rgb); }
  function setDraw(rgb) { doc.setDrawColor(...rgb); }
  function setText(rgb) { doc.setTextColor(...rgb); }

  function wrap(text, width, size = 11.5) {
    doc.setFontSize(size);
    return doc.splitTextToSize(pdfSafeText(text), width);
  }

  function textBlock(text, x, yy, width, opts = {}) {
    const size = opts.size || 11.5;
    const lh = opts.lh || size * 0.42;
    const font = opts.font || 'normal';
    const color = opts.color || C.ink;
    const lines = wrap(text, width, size);
    doc.setFont('helvetica', font);
    doc.setFontSize(size);
    setText(color);
    doc.text(lines, x, yy, { lineHeightFactor: opts.factor || 1.45 });
    return yy + lines.length * lh;
  }

  function card(x, yy, w, h, variant = 'neutral') {
    const t = TONE[variant] || TONE.neutral;
    setFill(variant === 'urgent' || variant === 'warn' || variant === 'ok' || variant === 'soft' ? t.fill : C.card);
    if (variant === 'urgent') setFill([255, 250, 250]);
    if (variant === 'warn') setFill([255, 251, 235]);
    if (variant === 'ok' || variant === 'soft') setFill(C.card);
    setDraw(t.border);
    doc.setLineWidth(0.35);
    doc.roundedRect(x, yy, w, h, 2.2, 2.2, 'FD');
    if (variant === 'urgent' || variant === 'warn' || variant === 'soft') {
      setFill(t.bar);
      doc.rect(x, yy + 1.2, 0.9, h - 2.4, 'F');
    }
  }

  function measureBullets(items, width, size = 10.5) {
    let h = 0;
    doc.setFontSize(size);
    for (const item of items) {
      const lines = wrap(item, width - 5, size);
      h += Math.max(1, lines.length) * (size * 0.42) + 1.2;
    }
    return h;
  }

  function drawBullets(items, x, yy, width, size = 10.5) {
    let cy = yy;
    doc.setFontSize(size);
    for (const item of items) {
      const lines = wrap(item, width - 5, size);
      const lh = size * 0.42;
      setFill(C.navy);
      doc.circle(x + 1.2, cy + 1.1, 0.55, 'F');
      doc.setFont('helvetica', 'normal');
      setText(C.ink);
      doc.text(lines, x + 4, cy + 1.4, { lineHeightFactor: 1.4 });
      cy += lines.length * lh + 1.3;
    }
    return cy;
  }

  function drawChips(items, x, yy, maxW) {
    let cx = x;
    let cy = yy;
    const h = 11.5;
    const gap = 2.2;
    for (const item of items) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const lw = doc.getTextWidth(String(item.label).toUpperCase());
      doc.setFontSize(10);
      const vw = doc.getTextWidth(String(item.value));
      const w = Math.max(lw, vw) + 8;
      if (cx + w > x + maxW && cx > x) {
        cx = x;
        cy += h + gap;
      }
      const t = TONE[item.tone] || TONE.neutral;
      setFill(item.tone === 'urgent' ? C.redSoft : item.tone === 'warn' ? C.amberSoft : C.card);
      setDraw(t.border);
      doc.setLineWidth(0.3);
      doc.roundedRect(cx, cy, w, h, 1.6, 1.6, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      setText(C.muted);
      doc.text(String(item.label).toUpperCase(), cx + 3.5, cy + 3.8);
      doc.setFontSize(10);
      setText(t.text);
      doc.text(String(item.value), cx + 3.5, cy + 8.8);
      cx += w + gap;
    }
    return cy + h;
  }

  function metricGrid(items, x, yy, width) {
    const n = items.length || 1;
    const gap = 2.6;
    const mw = (width - gap * (n - 1)) / n;
    const h = 18;
    items.forEach((m, i) => {
      const xx = x + i * (mw + gap);
      setFill(C.card);
      setDraw(C.line);
      doc.setLineWidth(0.3);
      doc.roundedRect(xx, yy, mw, h, 2, 2, 'FD');
      const tone = TONE[m.tone] || TONE.neutral;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      setText(tone.text);
      doc.text(String(m.v || '-'), xx + mw / 2, yy + 8.2, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setText(C.muted);
      const lines = wrap(String(m.l || '').toUpperCase(), mw - 4, 7);
      doc.text(lines, xx + mw / 2, yy + 12.2, { align: 'center', lineHeightFactor: 1.2 });
    });
    return yy + h;
  }

  function sectionHead(title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    setText(C.navy);
    doc.text(String(title).toUpperCase(), MX, y);
    y += 2;
    setDraw(C.navy);
    doc.setLineWidth(0.45);
    doc.line(MX, y, MX + W, y);
    y += 6;
  }

  function pageHead(pageNo) {
    paintBg();
    y = 11;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setText(C.muted);
    doc.setFont('helvetica', 'bold');
    setText(C.ink);
    doc.text(`${PRODUCT_LABEL} - ${model.name} - CCN ${model.ccn}`, MX, y);
    doc.setFont('helvetica', 'normal');
    setText(C.muted);
    doc.text(`${pageNo} / ${BRIEF_PAGE_COUNT}`, PW - MX, y, { align: 'right' });
    y += 2.5;
    setDraw(C.line);
    doc.setLineWidth(0.25);
    doc.line(MX, y, MX + W, y);
    y += 7;
  }

  function noteBox(text, yy) {
    const lines = wrap(text, W - 8, 9.5);
    const h = lines.length * 4.1 + 8;
    setFill(C.note);
    doc.roundedRect(MX, yy, W, h, 1.8, 1.8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setText(C.muted);
    doc.text(lines, MX + 4, yy + 5.5, { lineHeightFactor: 1.4 });
    return yy + h;
  }

  function h3(text, x, yy, color = C.navy) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    setText(color);
    doc.text(text, x, yy);
    return yy + 5.5;
  }

  // ───────────────────────── PAGE 1 ─────────────────────────
  paintBg();
  y = 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(C.teal);
  doc.text(PRODUCT_LABEL.toUpperCase(), MX, y);
  y += 5.5;
  doc.setFontSize(12);
  setText(C.navy);
  doc.text('The Oversight Report', MX, y);
  const brandW = doc.getTextWidth('The Oversight Report');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setText(C.muted);
  doc.text('  - oversightreports.com', MX + brandW + 1, y);

  const rightX = PW - MX;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setText(C.muted);
  doc.text('Report date:', rightX - 48, 12);
  doc.setFont('helvetica', 'bold');
  setText(C.ink);
  doc.text(model.reportDateLabel, rightX, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  setText(C.muted);
  doc.text('CMS data as of:', rightX - 48, 16.6);
  doc.setFont('helvetica', 'bold');
  setText(C.ink);
  doc.text(model.dataAsOfLabel, rightX, 16.6, { align: 'right' });

  y = 21;
  setDraw(C.navy);
  doc.setLineWidth(0.7);
  doc.line(MX, y, MX + W, y);

  y = 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  setText(C.navy);
  const nameLines = wrap(model.name, W, 24);
  doc.text(nameLines, MX, y, { lineHeightFactor: 1.15 });
  y += nameLines.length * 9 + 2;

  y = textBlock(model.metaLine, MX, y, W, { size: 10.5, color: C.muted, lh: 4.6 });
  y += 3;
  y = drawChips(model.chips, MX, y, W) + 5;

  // Bottom line
  const blLines = wrap(model.bottomLine, W - 10, 12);
  const blH = blLines.length * 5.4 + 14;
  setFill(C.card);
  setDraw(C.navy);
  doc.setLineWidth(0.5);
  doc.roundedRect(MX, y, W, blH, 2.2, 2.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(C.teal);
  doc.text('BOTTOM LINE', MX + 5, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  setText(C.ink);
  doc.text(blLines, MX + 5, y + 12.5, { lineHeightFactor: 1.4 });
  y += blH + 5;

  const colW = (W - 4) / 2;
  const leftH = 10 + measureBullets(model.strengths, colW - 8, 10.2);
  const rightH = 10 + measureBullets(model.concerns, colW - 8, 10.2);
  const colH = Math.max(leftH, rightH, 38);
  card(MX, y, colW, colH, 'soft');
  h3('Comparatively less alarming', MX + 5, y + 6);
  drawBullets(model.strengths, MX + 4, y + 11, colW - 8, 10.2);
  card(MX + colW + 4, y, colW, colH, 'urgent');
  h3('Questions & concerns', MX + colW + 9, y + 6);
  drawBullets(model.concerns, MX + colW + 8, y + 11, colW - 8, 10.2);
  y += colH + 5;

  const nextLines = wrap(model.nextAction, W - 10, 11.5);
  const nextH = nextLines.length * 5 + 14;
  setFill(C.tealSoft);
  setDraw(C.tealLine);
  doc.setLineWidth(0.3);
  doc.roundedRect(MX, y, W, nextH, 2.2, 2.2, 'FD');
  h3('What to do next', MX + 5, y + 6, [15, 118, 110]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.5);
  setText(C.ink);
  doc.text(nextLines, MX + 5, y + 12.5, { lineHeightFactor: 1.4 });
  y += nextH + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setText(C.ink);
  doc.text('Inside this brief: ', MX, y);
  const prefixW = doc.getTextWidth('Inside this brief: ');
  doc.setFont('helvetica', 'normal');
  setText(C.muted);
  const insideLines = wrap(model.inside, W - prefixW, 9.5);
  doc.text(insideLines, MX + prefixW, y, { lineHeightFactor: 1.4 });

  // ───────────────────────── PAGE 2 ─────────────────────────
  doc.addPage();
  pageHead(2);
  sectionHead('Scorecard - How to read these ratings');
  y = textBlock(
    `CMS data as of ${model.dataAsOfLabel} - Report prepared ${model.reportDateLabel} - Oversight composite uses public CMS inputs (higher = more concern in this model)`,
    MX, y, W, { size: 9.5, color: C.muted, lh: 4.2 }
  ) + 3;

  y = metricGrid([
    { v: model.stars.overall.value, l: model.stars.overall.label, tone: model.stars.overall.tone },
    { v: model.stars.inspection.value, l: model.stars.inspection.label, tone: model.stars.inspection.tone },
    { v: model.stars.staffing.value, l: model.stars.staffing.label, tone: model.stars.staffing.tone },
    { v: model.stars.quality.value, l: model.stars.quality.label, tone: model.stars.quality.tone === 'good' ? 'good' : model.stars.quality.tone },
  ], MX, y, W) + 4;

  y = drawChips([
    { label: 'Oversight composite', value: model.composite ? `${model.composite} - ${model.compositeLabel}` : 'n/a', tone: 'warn' },
    { label: 'Deficiencies on record', value: `${model.deficiencyCount} health`, tone: 'neutral' },
    { label: 'Complaint investigations', value: String(model.complaintInvestigations || 0), tone: 'neutral' },
  ], MX, y, W) + 4;

  const interpItems = model.interpretations.map((i) => `${i.title}: ${i.text}`);
  const interpH = 10 + measureBullets(interpItems, W - 10, 10.2);
  card(MX, y, W, interpH, 'neutral');
  h3('What each signal means (plain English)', MX + 5, y + 6);
  drawBullets(interpItems, MX + 4, y + 11, W - 10, 10.2);
  y += interpH + 4;

  const lcH = 10 + measureBullets(model.lookCloser, colW - 8, 10);
  const dnH = 10 + measureBullets(model.doesNotTell, colW - 8, 10);
  const pairH = Math.max(lcH, dnH);
  card(MX, y, colW, pairH, 'warn');
  h3('Look closer', MX + 5, y + 6);
  drawBullets(model.lookCloser, MX + 4, y + 11, colW - 8, 10);
  card(MX + colW + 4, y, colW, pairH, 'neutral');
  h3('What this does not tell you', MX + colW + 9, y + 6);
  drawBullets(model.doesNotTell, MX + colW + 8, y + 11, colW - 8, 10);
  y += pairH + 5;
  noteBox('Stars are signals, not guarantees. CMS updates Care Compare on a schedule; always confirm the "last updated" date on medicare.gov when you verify.', y);

  // ───────────────────────── PAGE 3 ─────────────────────────
  doc.addPage();
  pageHead(3);
  sectionHead('Staffing & ownership');
  y = textBlock(model.staffingIntro, MX, y, W, { size: 11.5, lh: 5 }) + 3;
  y = metricGrid(model.staffingMetrics, MX, y, W) + 4;

  const three = model.staffingHighlights;
  const tw = (W - 5.2) / 3;
  const threeHeights = three.map((h) => {
    const noteLines = wrap(h.note, tw - 8, 8.5);
    return Math.max(28, 18 + noteLines.length * 3.6);
  });
  const threeH = Math.max(...threeHeights, 28);
  three.forEach((h, i) => {
    const xx = MX + i * (tw + 2.6);
    card(xx, y, tw, threeH, h.tone === 'urgent' ? 'urgent' : h.tone === 'warn' ? 'warn' : 'neutral');
    h3(h.title, xx + 4, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setText((TONE[h.tone] || TONE.neutral).text);
    doc.text(String(h.value), xx + 4, y + 13.5);
    textBlock(h.note, xx + 4, y + 17.5, tw - 8, { size: 8.5, color: C.muted, lh: 3.6 });
  });
  y += threeH + 4;

  const ctxH = 12 + measureBullets(model.staffingContext.length ? model.staffingContext : ['No extra staffing context in this extract.'], colW - 8, 10);
  const ownItems = model.ownership.map((b) => (b.label ? `${b.label}: ${b.value}` : b.value));
  const ownH = 12 + measureBullets(ownItems, colW - 8, 10);
  const soH = Math.max(ctxH, ownH, 40);
  card(MX, y, colW, soH, 'neutral');
  h3('More staffing context', MX + 5, y + 6);
  drawBullets(model.staffingContext.length ? model.staffingContext : ['No extra staffing context in this extract.'], MX + 4, y + 11, colW - 8, 10);
  card(MX + colW + 4, y, colW, soH, 'neutral');
  h3('Ownership', MX + colW + 9, y + 6);
  drawBullets(ownItems, MX + colW + 8, y + 11, colW - 8, 10);
  y += soH + 4;
  noteBox(`Why it matters: ${model.staffingWhy}`, y);

  // ───────────────────────── PAGE 4 ─────────────────────────
  doc.addPage();
  pageHead(4);
  sectionHead('Care fit - Who this profile speaks to');
  y = textBlock(model.careFitIntro, MX, y, W, { size: 11.5, lh: 5 }) + 3;
  y = metricGrid(model.careFitMetrics, MX, y, W) + 4;

  const longLines = wrap(model.longStayNote, colW - 8, 9.5);
  const shortLines = wrap(model.shortStayNote, colW - 8, 9.5);
  const fitH = Math.max(28, 14 + Math.max(longLines.length, shortLines.length) * 4.1);
  card(MX, y, colW, fitH, 'soft');
  h3('Long-stay relevance', MX + 5, y + 6);
  textBlock(model.longStayNote, MX + 4, y + 11.5, colW - 8, { size: 9.5, color: C.muted, lh: 4.1 });
  card(MX + colW + 4, y, colW, fitH, 'neutral');
  h3('Short-stay note', MX + colW + 9, y + 6);
  textBlock(model.shortStayNote, MX + colW + 8, y + 11.5, colW - 8, { size: 9.5, color: C.muted, lh: 4.1 });
  y += fitH + 5;

  h3('Selected long-stay quality measures (real values only)', MX, y);
  y += 1;
  y = textBlock('Lower is generally better unless noted. These are facility-reported rates CMS publishes — not a complete clinical chart.', MX, y, W, { size: 9.5, color: C.muted, lh: 4 });

  if (model.careFitRows.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: MX, right: MX, bottom: 20 },
      tableWidth: W,
      head: [['Measure', 'Facility rate', 'Reading tip']],
      body: model.careFitRows.map((r) => [r.name, r.rate, r.tip]),
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9.5, textColor: C.ink, cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 }, overflow: 'linebreak', minCellHeight: 7 },
      headStyles: { fontStyle: 'bold', fontSize: 8, textColor: C.muted, fillColor: C.bg, cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 } },
      columnStyles: { 0: { cellWidth: W * 0.42 }, 1: { cellWidth: W * 0.18, fontStyle: 'bold' }, 2: { cellWidth: W * 0.4 } },
      didParseCell: (data) => {
        if (data.section === 'body') {
          data.cell.styles.lineColor = C.line;
          data.cell.styles.lineWidth = { bottom: 0.15 };
        }
      },
    });
    y = doc.lastAutoTable.finalY + 4;
  } else {
    y = textBlock('No long-stay quality-measure rates appear in this extract.', MX, y, W, { size: 10.5, color: C.muted }) + 3;
  }

  const ctxBits = model.careFitContext.length
    ? model.careFitContext
    : ['No additional quality-measure context in this extract.'];
  const cH = Math.max(10 + measureBullets(ctxBits, colW - 8, 10), 10 + measureBullets(model.fitChecklist, colW - 8, 10), 32);
  if (y + cH < FLOOR) {
    card(MX, y, colW, cH, 'neutral');
    h3('Also reported (context)', MX + 5, y + 6);
    drawBullets(ctxBits, MX + 4, y + 11, colW - 8, 10);
    card(MX + colW + 4, y, colW, cH, 'warn');
    h3('Fit checklist for your visit', MX + colW + 9, y + 6);
    drawBullets(model.fitChecklist, MX + colW + 8, y + 11, colW - 8, 10);
  }

  // ───────────────────────── PAGE 5 ─────────────────────────
  doc.addPage();
  pageHead(5);
  sectionHead('Inspection story');
  y = textBlock(model.inspectionIntro, MX, y, W, { size: 11.5, lh: 5 }) + 3;

  const cats = model.categories.slice(0, 4);
  const cw = (W - 3 * 2.5) / Math.max(cats.length, 1);
  cats.forEach((c, i) => {
    const xx = MX + i * (cw + 2.5);
    setFill(C.card);
    setDraw(C.line);
    doc.roundedRect(xx, y, cw, 18, 1.8, 1.8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setText(C.navy);
    doc.text(String(c.n), xx + cw / 2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    setText(C.muted);
    const tl = wrap(c.t, cw - 4, 7.2);
    doc.text(tl, xx + cw / 2, y + 12, { align: 'center', lineHeightFactor: 1.15 });
  });
  y += 22;

  for (const story of model.stories) {
    const finding = wrap(`Finding: ${story.finding}`, W - 10, 11);
    const why = wrap(`Why it matters: ${story.why}`, W - 10, 10);
    const status = wrap(`Status: ${story.status}`, W - 10, 10);
    const ask = wrap(`Ask: "${story.ask}"`, W - 10, 10);
    const sh = 8 + finding.length * 4.8 + why.length * 4.3 + status.length * 4.3 + ask.length * 4.3 + 8;
    if (y + sh > FLOOR - 18) break;
    setFill(C.card);
    setDraw(C.line);
    doc.roundedRect(MX, y, W, sh, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText(C.muted);
    doc.text(story.tag, MX + 5, y + 5.5);
    let sy = y + 11;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setText(C.ink);
    doc.text(finding, MX + 5, sy, { lineHeightFactor: 1.35 });
    sy += finding.length * 4.8 + 1;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setText([55, 65, 81]);
    doc.text(why, MX + 5, sy, { lineHeightFactor: 1.4 });
    sy += why.length * 4.3 + 1;
    doc.text(status, MX + 5, sy, { lineHeightFactor: 1.4 });
    sy += status.length * 4.3 + 1;
    doc.setFont('helvetica', 'bold');
    setText([15, 118, 110]);
    doc.text(ask, MX + 5, sy, { lineHeightFactor: 1.4 });
    y += sh + 3;
  }
  if (y < FLOOR - 16) noteBox(model.alsoOnRecord, y);

  // ───────────────────────── PAGE 6 ─────────────────────────
  doc.addPage();
  pageHead(6);
  sectionHead('F-tag table - Decision-relevant deficiencies');
  y = textBlock(model.ftagIntro, MX, y, W, { size: 11.2, lh: 4.9 }) + 2;

  if (model.ftagRows.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: MX, right: MX, bottom: 22 },
      tableWidth: W,
      head: [['Date', 'F-tag', 'Plain label', 'Scope / severity', 'Status']],
      body: model.ftagRows.map((r) => [r.date, r.ftag, r.label, r.scope, r.status]),
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9, textColor: C.ink, cellPadding: { top: 1.6, bottom: 1.6, left: 1.2, right: 1.2 }, overflow: 'linebreak' },
      headStyles: { fontStyle: 'bold', fontSize: 7.5, textColor: C.muted, fillColor: C.bg },
      columnStyles: {
        0: { cellWidth: W * 0.14 },
        1: { cellWidth: W * 0.12, fontStyle: 'bold' },
        2: { cellWidth: W * 0.34 },
        3: { cellWidth: W * 0.22 },
        4: { cellWidth: W * 0.18 },
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const row = model.ftagRows[data.row.index];
        if (row?.ij) data.cell.styles.fillColor = [255, 245, 245];
        data.cell.styles.lineColor = C.line;
        data.cell.styles.lineWidth = { bottom: 0.12 };
      },
    });
    y = doc.lastAutoTable.finalY + 4;
  } else {
    y = textBlock('No individual deficiency rows were available to tabulate.', MX, y, W, { size: 11 }) + 3;
  }
  if (y < FLOOR - 10) noteBox(model.ftagNote, y);

  // ───────────────────────── PAGE 7 ─────────────────────────
  doc.addPage();
  pageHead(7);
  sectionHead('Penalties & safety extras');
  y = textBlock(model.penaltyIntro, MX, y, W, { size: 11.5, lh: 5 }) + 3;
  y = drawChips(model.penaltyChips, MX, y, W) + 5;
  h3('Penalty timeline', MX, y);
  y += 1;

  if (model.penaltyRows.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: MX, right: MX, bottom: 22 },
      tableWidth: W,
      head: [['Date', 'Type', 'Detail']],
      body: model.penaltyRows.map((r) => [r.date, r.type, r.detail]),
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 10, textColor: C.ink, cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 } },
      headStyles: { fontStyle: 'bold', fontSize: 8, textColor: C.muted, fillColor: C.bg },
      columnStyles: { 0: { cellWidth: W * 0.18 }, 1: { cellWidth: W * 0.24 }, 2: { cellWidth: W * 0.58, fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.section === 'body') {
          data.cell.styles.lineColor = C.line;
          data.cell.styles.lineWidth = { bottom: 0.12 };
        }
      },
    });
    y = doc.lastAutoTable.finalY + 5;
  } else {
    y = textBlock('No penalty timeline rows appear in this extract.', MX, y, W, { size: 11, color: C.muted }) + 4;
  }

  if (model.sffCard || model.abuseCard) {
    if (model.sffCard && model.abuseCard) {
      const sffLines = wrap(model.sffCard, colW - 8, 9.5);
      const abuseLines = wrap(model.abuseCard, colW - 8, 9.5);
      const alertH = Math.max(32, 16 + Math.max(sffLines.length, abuseLines.length) * 4.1);
      card(MX, y, colW, alertH, 'urgent');
      h3('Special Focus Facility (SFF)', MX + 5, y + 6);
      textBlock(model.sffCard, MX + 4, y + 12, colW - 8, { size: 9.5, lh: 4.1 });
      card(MX + colW + 4, y, colW, alertH, 'urgent');
      h3('Abuse icon - active', MX + colW + 9, y + 6);
      textBlock(model.abuseCard, MX + colW + 8, y + 12, colW - 8, { size: 9.5, lh: 4.1 });
      y += alertH + 4;
    } else {
      const text = model.sffCard || model.abuseCard;
      const title = model.sffCard ? 'Special Focus Facility (SFF)' : 'Abuse icon - active';
      const lines = wrap(text, W - 8, 10);
      const boxH = Math.max(26, 14 + lines.length * 4.2);
      card(MX, y, W, boxH, 'urgent');
      h3(title, MX + 5, y + 6);
      textBlock(text, MX + 4, y + 12, W - 8, { size: 10, lh: 4.2 });
      y += boxH + 4;
    }
  }

  if (model.fireCard && y + 28 < FLOOR) {
    const fh = 10 + measureBullets(model.fireCard, W - 10, 10);
    card(MX, y, W, fh, 'neutral');
    h3('Fire safety (when present)', MX + 5, y + 6);
    drawBullets(model.fireCard, MX + 4, y + 11, W - 10, 10);
    y += fh + 4;
  }
  if (y < FLOOR - 12) noteBox(model.penaltyNote, y);

  // ───────────────────────── PAGE 8 ─────────────────────────
  doc.addPage();
  pageHead(8);
  sectionHead('Visit checklist - Questions tied to this facility');
  y = textBlock(model.visitIntro, MX, y, W, { size: 11.2, lh: 4.9 }) + 2;

  const qMax = model.questions.length;
  const remaining = FLOOR - 16 - y;
  const slot = remaining / Math.max(qMax, 1);
  const compact = slot < 18;
  model.questions.forEach((q, i) => {
    const qLines = wrap(`${i + 1}. ${q}`, W, compact ? 10 : 10.5);
    const block = qLines.length * 4.2 + (compact ? 9 : 11);
    if (y + block > FLOOR - 8) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(compact ? 10 : 10.5);
    setText(C.ink);
    doc.text(qLines, MX, y, { lineHeightFactor: 1.35 });
    y += qLines.length * 4.2 + 1.5;
    setDraw([203, 213, 225]);
    doc.setLineWidth(0.25);
    doc.line(MX, y + 3.5, MX + W, y + 3.5);
    y += 5.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setText(C.muted);
    doc.text('Answered by:', MX, y);
    doc.line(MX + 22, y + 0.6, MX + 78, y + 0.6);
    doc.text('Role / date:', MX + 84, y);
    doc.line(MX + 104, y + 0.6, MX + W, y + 0.6);
    y += compact ? 4.2 : 5;
  });
  if (y < FLOOR - 8) noteBox(model.visitTip, y);

  // ───────────────────────── PAGE 9 ─────────────────────────
  doc.addPage();
  pageHead(9);
  sectionHead('Decision worksheet & sources');
  y = textBlock('After the tour, capture what must be true for your family — then verify on Care Compare.', MX, y, W, { size: 11.5, lh: 5 }) + 2;
  h3('Nearby alternatives to compare', MX, y);
  y += 1;

  if (model.nearby.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: MX, right: MX, bottom: 22 },
      tableWidth: W,
      head: [['Facility', 'City', 'Stars', 'Composite', 'Fines', 'IJ']],
      body: model.nearby.map((n) => [n.name, n.city, n.stars, n.composite, n.fines, n.ij]),
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9.5, textColor: C.ink, cellPadding: { top: 1.6, bottom: 1.6, left: 1.2, right: 1.2 }, overflow: 'linebreak' },
      headStyles: { fontStyle: 'bold', fontSize: 7.5, textColor: C.muted, fillColor: C.bg },
      columnStyles: {
        0: { cellWidth: W * 0.38 },
        1: { cellWidth: W * 0.16 },
        2: { cellWidth: W * 0.1 },
        3: { cellWidth: W * 0.12 },
        4: { cellWidth: W * 0.14 },
        5: { cellWidth: W * 0.1 },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          data.cell.styles.lineColor = C.line;
          data.cell.styles.lineWidth = { bottom: 0.12 };
        }
      },
    });
    y = doc.lastAutoTable.finalY + 2;
  } else {
    y = textBlock('No lower-composite nearby homes were available to list in this extract.', MX, y, W, { size: 10, color: C.muted }) + 2;
  }
  y = textBlock(model.nearbyNote, MX, y, W, { size: 9, color: C.muted, lh: 3.9 }) + 3;

  const boxW = (W - 3) / 2;
  const boxH = 28;
  const boxes = [
    { title: 'Must-haves', hint: model.mustHavesHint },
    { title: 'Tradeoffs we can accept', hint: 'Imperfect but workable for your situation' },
    { title: 'People to call', hint: 'Admissions · DON · social work · ombudsman' },
    { title: 'Compare & follow-up', hint: 'Other facilities / dates to re-check' },
  ];
  boxes.forEach((b, i) => {
    const xx = MX + (i % 2) * (boxW + 3);
    const yy = y + Math.floor(i / 2) * (boxH + 3);
    setFill(C.card);
    setDraw(C.line);
    doc.roundedRect(xx, yy, boxW, boxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setText(C.navy);
    doc.text(b.title, xx + 3.5, yy + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setText(C.muted);
    doc.text(wrap(b.hint, boxW - 7, 8), xx + 3.5, yy + 10, { lineHeightFactor: 1.25 });
    setDraw([203, 213, 225]);
    doc.setLineWidth(0.25);
    doc.line(xx + 3.5, yy + 16.5, xx + boxW - 3.5, yy + 16.5);
    doc.line(xx + 3.5, yy + 21.5, xx + boxW - 3.5, yy + 21.5);
    doc.line(xx + 3.5, yy + 26, xx + boxW - 3.5, yy + 26);
  });
  y += boxH * 2 + 8;

  if (y + 18 < FLOOR) {
    const srcLines = wrap(model.sources, W - 8, 9.5);
    const srcH = srcLines.length * 4.1 + 10;
    card(MX, y, W, srcH, 'neutral');
    h3('Sources', MX + 5, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setText(C.ink);
    doc.text(srcLines, MX + 5, y + 11, { lineHeightFactor: 1.35 });
    y += srcH + 3;
  }
  if (y + 14 < FLOOR) {
    const lim = wrap(`Limitation: ${model.limitation}  · The Oversight Report · oversightreports.com · DataLink Clinical LLC`, W - 8, 10);
    const lh = lim.length * 4.2 + 8;
    setFill(C.card);
    setDraw(C.line);
    doc.roundedRect(MX, y, W, lh, 1.8, 1.8, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setText([55, 65, 81]);
    doc.text(lim, MX + 4, y + 5.5, { lineHeightFactor: 1.4 });
  }

  // Footers last so page count is accurate and content never sits on the line.
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const fy = PH - 10.5;
    setDraw(C.line);
    doc.setLineWidth(0.25);
    doc.line(MX, fy, MX + W, fy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setText(C.muted);
    doc.text('Source: CMS public data · oversightreports.com', MX, fy + 4.5);
    doc.text(`${i} / ${total}`, PW - MX, fy + 4.5, { align: 'right' });
  }

  const filename = `OversightReport_FacilityBrief_${cleanFilename(model.name)}_${model.ccn || 'facility'}.pdf`;
  if (options.returnDoc) return doc;
  doc.save(filename);
  return filename;
}
