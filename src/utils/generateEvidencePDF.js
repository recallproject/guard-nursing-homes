import jsPDFModule from 'jspdf';
import autoTable from 'jspdf-autotable';
import ftagReference from '../data/ftag-reference.json';
import nationalAveragesData from '../../public/data/national_averages.json';

const jsPDF = jsPDFModule.jsPDF || jsPDFModule;

/**
 * Generates a professional, documented Evidence Package PDF.
 *
 * @param {Object} facility - The facility data object
 * @param {Array} nearbyAlternatives - Array of nearby facilities with better scores
 * @param {Array} allFacilities - All facilities for ownership portfolio analysis
 */
export function generateEvidencePDF(facility, nearbyAlternatives = [], allFacilities = [], antipsychoticData = null, dataAsOf = null, reportType = 'consumer') {
  const isAttorney = reportType === 'attorney';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  // ======================== PROVENANCE / CANARY METADATA ========================
  // Canary fingerprint: dlc-prov-2026q2-9c4f5b3a — used to detect unauthorized reproduction.
  // Mirrors the canary token deployed in the live site HTML.
  doc.setProperties({
    title: 'The Oversight Report — Facility Brief',
    author: 'Robert Benard, NP — DataLink Clinical LLC',
    creator: 'oversightreports.com — provenance dlc-prov-2026q2-9c4f5b3a',
    subject: 'Facility data report. Provenance fingerprint dlc-prov-2026q2-9c4f5b3a. © DataLink Clinical LLC.',
    keywords: 'nursing home, CMS, oversight, evidence, dlc-prov-2026q2, dlc-prov-2026q2-9c4f5b3a, DataLink Clinical',
  });

  // Dynamic "data as of" label — pulled from state JSON _metadata
  const formatDataDate = (isoDate) => {
    if (!isoDate) return 'Current';
    try {
      const d = new Date(isoDate + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch { return isoDate; }
  };
  const DATA_DATE = formatDataDate(dataAsOf);

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
  const YELLOW_BG = [254, 252, 232];
  const GREEN_BG = [240, 253, 244];
  const TEAL = [5, 150, 105];
  const BLUE_BG = [235, 248, 255];
  const GREEN = [22, 101, 52];
  const AMBER = [161, 98, 7];
  const RED = [185, 28, 28];
  const WHITE = [255, 255, 255];
  const TABLE_ALT = [245, 247, 250];
  const TABLE_HEADER = [15, 22, 41];
  const DIVIDER = [209, 213, 219];

  // ======================== NATIONAL AVERAGES ========================
  // Computed from dataset by scripts/compute_national_averages.py — no more hardcoded values
  const NATIONAL_AVG = nationalAveragesData.national;

  // State-level averages for contextual comparison
  const STATE_AVG = nationalAveragesData.by_state || {};

  // ======================== FORMATTERS ========================

  const fmt = (v) => {
    if (!v && v !== 0) return 'N/A';
    return '$' + Math.round(v).toLocaleString();
  };
  const pct = (v) =>
    v === null || v === undefined ? 'N/A' : v.toFixed(1) + '%';
  const num = (v) =>
    v === null || v === undefined ? 'N/A' : v.toFixed(2);

  // ======================== HAVERSINE ========================

  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 3959;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  // ======================== LAYOUT HELPERS ========================

  function addNewPage() {
    doc.addPage();
    pageNumber++;
    currentY = margin + 5;
  }

  function checkPageBreak(requiredSpace) {
    if (currentY + requiredSpace > pageHeight - 22) {
      addNewPage();
      return true;
    }
    return false;
  }

  /** Force a new page for a new section (unless we're already near the top). */
  function ensureNewSection(minSpace) {
    if (currentY > margin + 15) {
      // More aggressive: force new page if in bottom 20% of page
      if (currentY > pageHeight * 0.8) {
        addNewPage();
      }
    }
  }

  /** Numbered navy-bar section header. */
  function addSectionHeader(number, title) {
    // Add breathing room before each section header
    if (currentY > margin + 20) currentY += 8;
    ensureNewSection(50);
    doc.setFillColor(...NAVY);
    doc.rect(margin, currentY, contentWidth, 10, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(number + '. ' + title, margin + 4, currentY + 7);
    doc.setTextColor(...BODY);
    currentY += 10;
    // Add thin horizontal rule under section header
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, margin + contentWidth, currentY);
    currentY += 4;
  }

  /** A thin rule under sub-headings. */
  function addSubHeading(text) {
    checkPageBreak(14);
    doc.setCharSpace(0);
    if (doc.internal) doc.internal.write('0 Tc');
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

  /** Data row: label left, value right. */
  function addDataRow(label, value) {
    checkPageBreak(7);
    doc.setCharSpace(0);
    if (doc.internal) doc.internal.write('0 Tc');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...STEEL);
    doc.text(label, margin + 2, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BODY);
    doc.text(String(value), pageWidth - margin - 2, currentY, { align: 'right' });
    currentY += 6;
  }

  /** Alert box with coloured left border. Returns new Y. */
  function addAlertBox(text, type) {
    doc.setCharSpace(0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const textWidth = contentWidth - 16;
    const lines = doc.splitTextToSize(text, textWidth);
    const lineHeight = 4;
    const paddingTop = 6;
    const paddingBottom = 6;
    const boxHeight = (lines.length * lineHeight) + paddingTop + paddingBottom;
    checkPageBreak(boxHeight + 10);
    currentY += 4;

    const bgColor = type === 'critical' ? RED_BG : type === 'warning' ? AMBER_BG : BLUE_BG;
    const borderColor = type === 'critical' ? RED : type === 'warning' ? AMBER : NAVY;

    // Clear area
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, currentY, contentWidth, boxHeight, 'F');
    // Background offset from left border
    doc.setFillColor(...bgColor);
    doc.rect(margin + 4, currentY, contentWidth - 4, boxHeight, 'F');
    // Left border bar
    doc.setFillColor(...borderColor);
    doc.rect(margin, currentY, 3, boxHeight, 'F');
    // White gap between bar and background
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + 3, currentY, 1, boxHeight, 'F');
    // Text
    doc.setTextColor(...BODY);
    doc.setCharSpace(0);
    doc.text(lines, margin + 8, currentY + paddingTop, { lineHeightFactor: 1.4 });
    currentY += boxHeight + 8;
    doc.setFillColor(255, 255, 255);
  }

  /** Metric card (label / big value / national average). */
  function drawMetricCard(label, value, natAvg, unit, x, y, w) {
    doc.setCharSpace(0);
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

  /** Red-flag card block with coloured left accent. */
  function addRedFlagCard(metric, explanation, type) {
    checkPageBreak(22);
    doc.setCharSpace(0);
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
    doc.setFillColor(255, 255, 255);
  }

  /** Subtle "Verify" line with a clickable hyperlink. */
  function addVerifyLink(label, url) {
    checkPageBreak(14);
    doc.setCharSpace(0);
    if (doc.internal) doc.internal.write('0 Tc');
    currentY += 3;
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.2);
    // dashed line
    const segLen = 1.5;
    const gapLen = 1.5;
    let x = margin;
    while (x < margin + contentWidth) {
      doc.line(x, currentY, Math.min(x + segLen, margin + contentWidth), currentY);
      x += segLen + gapLen;
    }
    currentY += 4;
    // Label line (not a link)
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('Verify: ' + label, margin, currentY);
    currentY += 4;
    // Clickable URL line
    doc.setFontSize(7);
    doc.setTextColor(20, 184, 166); // teal
    doc.textWithLink(url, margin, currentY, { url });
    currentY += 5;
  }

  // ======================== DATA GENERATORS ========================

  function generateExecutiveSummary() {
    const parts = [];
    if (facility.stars !== null && facility.stars !== undefined) {
      parts.push('This facility has an overall CMS star rating of ' + facility.stars + ' out of 5.');
    }
    if (facility.total_fines > 0 && facility.fine_count) {
      parts.push(
        'It has been assessed ' + fmt(facility.total_fines) + ' in federal penalties across ' +
        facility.fine_count + ' enforcement action' + (facility.fine_count > 1 ? 's' : '') + ' since 2023.'
      );
    }
    if (facility.zero_rn_pct > 0 && facility.avg_census) {
      const zeroDays = Math.round((facility.zero_rn_pct / 100) * 92);
      parts.push(
        'It reported zero registered nurse hours on ' + zeroDays + ' days (' +
        facility.zero_rn_pct.toFixed(1) + '% of Q3 2025), which warrants review against 42 CFR §483.35 nursing-services requirements.'
      );
    }
    if (facility.jeopardy_count > 0 || facility.harm_count > 0) {
      const bits = [];
      if (facility.jeopardy_count > 0)
        bits.push(facility.jeopardy_count + ' instance' + (facility.jeopardy_count > 1 ? 's' : '') + ' of immediate jeopardy');
      if (facility.harm_count > 0)
        bits.push(facility.harm_count + ' instance' + (facility.harm_count > 1 ? 's' : '') + ' of actual harm');
      parts.push('State inspectors documented ' + bits.join(' and ') + ' — conditions posing serious harm to residents.');
    }
    if (facility.worst_owner && facility.owner_portfolio_count > 1) {
      // Use computed portfolio data for consistency (matches Section 2)
      const pf = allFacilities.filter((f) => f.worst_owner === facility.worst_owner);
      const pfCount = pf.length > 1 ? pf.length : facility.owner_portfolio_count;
      const pfStars = pf.length > 1
        ? (pf.reduce((s, f) => s + (f.stars || 0), 0) / pf.length).toFixed(1)
        : (facility.owner_avg_stars ? facility.owner_avg_stars.toFixed(1) : null);
      const starsText = pfStars ? pfStars : 'unavailable';
      parts.push(
        'The facility is operated by ' + facility.worst_owner +
        ', who controls ' + pfCount + ' facilities in CMS data' +
        (pfStars ? ' averaging ' + starsText + ' CMS stars.' : '.')
      );
    }
    if (facility.total_hprd && facility.total_hprd < 3.48) {
      const gap = ((1 - facility.total_hprd / 3.48) * 100).toFixed(0);
      parts.push(
        'Total staffing of ' + num(facility.total_hprd) +
        ' hours per resident per day is ' + gap + '% below the 3.48 HPRD threshold cited by 18 state Attorneys General.'
      );
    }
    // Escalation pattern from penalty timeline
    if (facility.penalty_timeline && facility.penalty_timeline.length >= 2) {
      const byYear = {};
      facility.penalty_timeline.forEach((p) => {
        if (p.amount > 0 && p.date) {
          const yr = new Date(p.date).getFullYear();
          byYear[yr] = (byYear[yr] || 0) + p.amount;
        }
      });
      const years = Object.keys(byYear).sort();
      if (years.length >= 2) {
        const first = years[0];
        const last = years[years.length - 1];
        if (byYear[last] > byYear[first] * 1.3) {
          parts.push(
            'Penalties have escalated from ' + fmt(byYear[first]) + ' (' + first + ') to ' +
            fmt(byYear[last]) + ' (' + last + '), indicating a worsening compliance trajectory.'
          );
        }
      }
    }
    return parts.length > 0 ? parts.join(' ') : 'This facility shows mixed performance in federal data.';
  }

  function generateKeyFindings() {
    const findings = [];
    if (facility.composite >= 60)
      findings.push('High risk score: ' + facility.composite.toFixed(1) + ' (national avg: ' + NATIONAL_AVG.composite + ')');
    if (facility.jeopardy_count > 0)
      findings.push(facility.jeopardy_count + ' immediate jeopardy citation' + (facility.jeopardy_count > 1 ? 's' : ''));
    if (facility.zero_rn_pct > 10)
      findings.push('Zero-RN coverage on ' + facility.zero_rn_pct.toFixed(1) + '% of days');
    if (facility.total_fines > 50000)
      findings.push(fmt(facility.total_fines) + ' in federal fines');
    if (facility.harm_count > 0)
      findings.push(facility.harm_count + ' actual-harm citation' + (facility.harm_count > 1 ? 's' : ''));
    if (facility.owner_portfolio_count > 10 && facility.owner_avg_stars && facility.owner_avg_stars < 3.0)
      findings.push('Large portfolio (' + facility.owner_portfolio_count + ' facilities) with low average stars');
    if (findings.length === 0)
      findings.push('No major red flags identified in available federal data');
    return findings;
  }

  function buildOwnershipPortfolio() {
    if (!facility.worst_owner || !allFacilities || allFacilities.length === 0) return null;
    const pf = allFacilities.filter((f) => f.worst_owner === facility.worst_owner);
    if (pf.length <= 1) return null;
    const sorted = [...pf].sort((a, b) => (b.composite || 0) - (a.composite || 0)).slice(0, 10);
    return {
      facilities: sorted,
      count: pf.length,
      avgComposite: pf.reduce((s, f) => s + (f.composite || 0), 0) / pf.length,
      avgStars: pf.reduce((s, f) => s + (f.stars || 0), 0) / pf.length,
      avgFines: pf.reduce((s, f) => s + (f.total_fines || 0), 0) / pf.length,
    };
  }

  // ======================== FAMILY "WHAT STANDS OUT" ========================

  function generateFamilyFindings() {
    const findings = [];
    if (facility.composite >= 60)
      findings.push('This facility scores higher than most on our risk indicators, which combine staffing, inspection, penalty, and quality data. This may warrant closer review.');
    if (facility.jeopardy_count > 0)
      findings.push('State inspectors found conditions serious enough to be classified as "immediate jeopardy" — the most severe type of inspection finding — on ' + facility.jeopardy_count + ' occasion' + (facility.jeopardy_count > 1 ? 's' : '') + '.');
    if (facility.harm_count > 0)
      findings.push('Inspectors confirmed that residents were directly harmed by facility conditions on ' + facility.harm_count + ' occasion' + (facility.harm_count > 1 ? 's' : '') + '.');
    if (facility.total_hprd && facility.total_hprd < 3.48)
      findings.push('Staffing levels (' + num(facility.total_hprd) + ' total nursing hours per resident per day) are below the level that many experts consider a minimum safe threshold.');
    if (facility.zero_rn_pct > 10)
      findings.push('The facility reported no registered nurse on duty for ' + facility.zero_rn_pct.toFixed(0) + '% of days in the reporting period, which may affect the quality of care.');
    if (facility.total_fines > 50000)
      findings.push('The facility has been fined ' + fmt(facility.total_fines) + ' by the federal government for regulatory violations.');
    if (facility.contractor_pct && facility.contractor_pct > 20)
      findings.push('A higher-than-average share of nursing staff (' + facility.contractor_pct.toFixed(0) + '%) comes from temporary agencies, which may affect continuity of care.');
    if (facility.worst_owner && facility.owner_portfolio_count > 10) {
      const pf = allFacilities.filter((f) => f.worst_owner === facility.worst_owner);
      const pfStars = pf.length > 1 ? (pf.reduce((s, f) => s + (f.stars || 0), 0) / pf.length).toFixed(1) : null;
      findings.push('This facility is part of a larger chain (' + facility.worst_owner + ', ' + (pf.length || facility.owner_portfolio_count) + ' facilities)' + (pfStars ? ' with an average rating of ' + pfStars + ' out of 5 stars.' : '.'));
    }
    if (findings.length === 0)
      findings.push('No major concerns were identified in the public data reviewed. This does not guarantee quality of care — families should still visit and ask questions.');
    return findings;
  }

  // ======================== QUESTIONS TO ASK ========================

  function generateQuestionsToAsk() {
    const questions = [];
    // Always include these core questions
    questions.push('How has the facility addressed its most recent inspection findings?');
    questions.push('What is the current nurse and aide staffing on day, evening, and weekend shifts?');
    questions.push('How often does the facility rely on agency or temporary staff?');
    // Conditional questions based on facility data
    if (facility.total_fines > 0 || facility.jeopardy_count > 0 || facility.harm_count > 0)
      questions.push('What steps has the facility taken after recent penalties, complaint findings, or safety concerns?');
    if (facility.antipsychotic_pct > 15 || (facility.zero_rn_pct > 10))
      questions.push('How are residents monitored for falls, pressure ulcers, antipsychotic use, mood changes, or other quality concerns noted in this report?');
    else
      questions.push('How does the facility monitor residents for falls, pressure ulcers, and mood changes?');
    questions.push('How are families informed when concerns about a resident arise?');
    if (facility.worst_owner && facility.owner_portfolio_count > 5)
      questions.push('What is the relationship between the facility\'s local management and its corporate ownership?');
    return questions;
  }

  // ======================== TODAY STRING ========================

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dateStr = new Date().toISOString().split('T')[0];

  // ================================================================
  //   PAGE 1 — COVER
  // ================================================================

  // Top navy bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('THE OVERSIGHT REPORT', pageWidth / 2, 14, { align: 'center' });

  // Centre the rest vertically in the remaining space
  const coverContentStart = 42;
  currentY = coverContentStart;

  // Title
  doc.setTextColor(...NAVY);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text(isAttorney ? 'ATTORNEY EVIDENCE REPORT' : 'FAMILY FACILITY REVIEW', pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 30, currentY, pageWidth / 2 + 30, currentY);
  currentY += 12;

  // Facility name
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BODY);
  const nameLines = doc.splitTextToSize(facility.name, contentWidth - 30);
  doc.text(nameLines, pageWidth / 2, currentY, { align: 'center' });
  currentY += nameLines.length * 7 + 4;

  // Address
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...STEEL);
  if (facility.address)
    doc.text(facility.address, pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.text(
    (facility.city || '') + ', ' + (facility.state || '') + ' ' + (facility.zip || ''),
    pageWidth / 2,
    currentY,
    { align: 'center' }
  );
  currentY += 5;
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.text('CCN: ' + facility.ccn, pageWidth / 2, currentY, { align: 'center' });
  currentY += 16;

  // Cover metric cards — attorney version leads with IJ/Harm/Deficiencies/Fines (4 cards)
  // Consumer version keeps Risk Score / Stars / Fines (3 cards)
  if (isAttorney) {
    const cardCount = 4;
    const cardW = (contentWidth - 5 * (cardCount - 1)) / cardCount;
    const cardY = currentY;

    // IJ Citations card
    doc.setFillColor(...(facility.jeopardy_count > 0 ? RED_BG : LIGHT_BG));
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.3);
    doc.rect(margin, cardY, cardW, 30, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...STEEL);
    doc.text('IMMEDIATE JEOPARDY', margin + cardW / 2, cardY + 6, { align: 'center' });
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(facility.jeopardy_count > 0 ? RED : BODY));
    doc.text(String(facility.jeopardy_count || 0), margin + cardW / 2, cardY + 19, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...STEEL);
    doc.text('citations', margin + cardW / 2, cardY + 26, { align: 'center' });

    // Actual Harm card
    const harmX = margin + cardW + 5;
    doc.setFillColor(...(facility.harm_count > 0 ? AMBER_BG : LIGHT_BG));
    doc.rect(harmX, cardY, cardW, 30, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...STEEL);
    doc.text('ACTUAL HARM', harmX + cardW / 2, cardY + 6, { align: 'center' });
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(facility.harm_count > 0 ? AMBER : BODY));
    doc.text(String(facility.harm_count || 0), harmX + cardW / 2, cardY + 19, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...STEEL);
    doc.text('citations', harmX + cardW / 2, cardY + 26, { align: 'center' });

    // Total Deficiencies card
    const defX = margin + (cardW + 5) * 2;
    doc.setFillColor(...LIGHT_BG);
    doc.rect(defX, cardY, cardW, 30, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...STEEL);
    doc.text('TOTAL DEFICIENCIES', defX + cardW / 2, cardY + 6, { align: 'center' });
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BODY);
    doc.text(String(facility.total_deficiencies || 0), defX + cardW / 2, cardY + 19, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...STEEL);
    doc.text("nat'l avg: " + NATIONAL_AVG.total_deficiencies.toFixed(0), defX + cardW / 2, cardY + 26, { align: 'center' });

    // Total Fines card
    const finesX = margin + (cardW + 5) * 3;
    doc.setFillColor(...LIGHT_BG);
    doc.rect(finesX, cardY, cardW, 30, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...STEEL);
    doc.text('TOTAL FINES', finesX + cardW / 2, cardY + 6, { align: 'center' });
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BODY);
    const fineStr = facility.total_fines > 999
      ? '$' + Math.round(facility.total_fines / 1000) + 'K'
      : fmt(facility.total_fines || 0);
    doc.text(fineStr, finesX + cardW / 2, cardY + 19, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...STEEL);
    doc.text("nat'l avg: $" + Math.round(NATIONAL_AVG.total_fines / 1000) + 'K', finesX + cardW / 2, cardY + 26, { align: 'center' });

    currentY = cardY + 38;
  } else {
    // Consumer version: Risk Score / Stars / Fines
    const cardW = (contentWidth - 10) / 3;
    const cardY = currentY;

    // Risk Score card
    const riskVal = (facility.composite || 0).toFixed(1);
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
    const riskC = facility.composite >= 60 ? RED : facility.composite >= 40 ? AMBER : GREEN;
    doc.setTextColor(...riskC);
    doc.text(riskVal, margin + cardW / 2, cardY + 19, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...STEEL);
    doc.text("Nat'l avg: " + NATIONAL_AVG.composite, margin + cardW / 2, cardY + 26, { align: 'center' });

    // CMS Stars card
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
    doc.text((facility.stars || 0) + '/5', starsX + cardW / 2, cardY + 19, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...STEEL);
    doc.text("Nat'l avg: " + NATIONAL_AVG.stars + '/5', starsX + cardW / 2, cardY + 26, { align: 'center' });

    // Total Fines card
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
    const fineStr = facility.total_fines > 999
      ? '$' + Math.round(facility.total_fines / 1000) + 'K'
      : fmt(facility.total_fines || 0);
    doc.text(fineStr, finesX + cardW / 2, cardY + 19, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...STEEL);
    doc.text("Nat'l avg: $" + Math.round(NATIONAL_AVG.total_fines / 1000) + 'K', finesX + cardW / 2, cardY + 26, { align: 'center' });

    currentY = cardY + 38;
  }

  // Key Findings box
  if (isAttorney) {
    const findings = generateKeyFindings();
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
    findings.forEach((f) => {
      doc.text('  ' + f, margin + 7, fy);
      fy += 6;
    });
    currentY += kfBoxH + 12;
  } else {
    // Consumer: simple one-line summary instead of data dump
    currentY += 4;
  }

  // Report ID + Date + Data currency
  const reportId = 'Report #OR-' + facility.ccn + '-' + dateStr.replace(/-/g, '');
  doc.setFontSize(9);
  doc.setTextColor(...STEEL);
  doc.setFont('courier', 'normal');
  doc.text(reportId, pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('Generated: ' + today, pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.text('CMS data as of: ' + DATA_DATE, pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.text('oversightreports.com', pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // "Prepared for" blank line (attorney only) + confidential banner
  doc.setFontSize(8.5);
  doc.setTextColor(...STEEL);
  if (isAttorney) {
    doc.text('Prepared for: ___________________________________________', pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;
    doc.text('Matter: ________________________________________________', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
    doc.setDrawColor(...RED);
    doc.setLineWidth(0.6);
    doc.rect(margin + 30, currentY - 3, contentWidth - 60, 9);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RED);
    doc.text('CONFIDENTIAL — Prepared for authorized use', pageWidth / 2, currentY + 2, { align: 'center' });
    currentY += 14;
  } else {
    // Consumer: no "prepared for", no confidential banner — just a soft note
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...STEEL);
    doc.text('A public-data review to help families make informed decisions', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
  }

  // Verification link
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...STEEL);
  const verifyUrl = 'https://www.medicare.gov/care-compare/details/nursing-home/' + facility.ccn;
  doc.text('Verify this facility on Medicare.gov:', pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;
  doc.setTextColor(41, 98, 168);
  doc.textWithLink(verifyUrl, pageWidth / 2 - doc.getTextWidth(verifyUrl) / 2, currentY, { url: verifyUrl });

  // ================================================================
  //   PAGE 2 — TABLE OF CONTENTS
  // ================================================================

  addNewPage();

  // TOC title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('Table of Contents', pageWidth / 2, currentY + 5, { align: 'center' });
  currentY += 18;
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 10;

  // TOC entries — page numbers are approximate, will vary by content
  const tocEntries = isAttorney ? [
    ['1.', 'Executive Summary & Attorney Takeaways', '3'],
    ['2.', 'Ownership Portfolio', '4'],
    ['3.', 'Staffing Analysis', '6'],
    ['4.', 'Inspection History', '8'],
    ['5.', 'Financial Penalties', '10'],
    ['6.', 'Clinical Outcomes (Quality Measures)', '11'],
    ['7.', 'Antipsychotic Prescribing & Chemical Restraint Risk', '12'],
    ['8.', 'Red Flags & Accountability Indicators', '13'],
    ['9.', 'Comparison Context', '14'],
    ['10.', 'Suggested Records to Request', '15'],
    ['11.', 'Data Sources & Methodology', '16'],
    ['12.', 'Disclaimer', '17'],
  ] : [
    ['1.', 'What Stands Out', '3'],
    ['2.', 'Facility Snapshot & Ownership', '4'],
    ['3.', 'Staffing Overview', '5'],
    ['4.', 'Inspection & Penalty History', '7'],
    ['5.', 'Financial Penalties', '9'],
    ['6.', 'Quality & Resident Safety', '10'],
    ['7.', 'Questions to Ask the Facility', '11'],
    ['8.', 'Comparison Context', '12'],
    ['9.', 'Nearby Alternatives', '13'],
    ['10.', 'Data Sources & Methodology', '14'],
    ['11.', 'Disclaimer', '15'],
  ];

  tocEntries.forEach(([num, title, page]) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(num, margin + 4, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    doc.text(title, margin + 16, currentY);

    // Dotted leader line
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.15);
    const titleW = doc.getTextWidth(title);
    const pageW = doc.getTextWidth(page);
    const lineStart = margin + 16 + titleW + 2;
    const lineEnd = pageWidth - margin - pageW - 4;
    for (let x = lineStart; x < lineEnd; x += 2) {
      doc.line(x, currentY, x + 0.5, currentY);
    }

    // Right-aligned page number
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

  // About This Report section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('About This Report', margin, currentY);
  currentY += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BODY);
  const aboutText = isAttorney
    ? 'This Attorney Evidence Report compiles data from federal databases maintained by the Centers for Medicare & Medicaid Services (CMS). It is designed to support attorneys conducting case evaluation, discovery planning, and regulatory compliance analysis for nursing home litigation. All data is publicly available, independently verifiable, and cited to original federal sources.'
    : 'This report helps families review public information about a nursing home in one place. It brings together public data on staffing, inspections, penalties, ownership, and quality signals so you can better understand what stands out and what questions to ask. This report is a starting point, not the only basis for a decision. Families should combine this information with facility visits, direct questions, and advice from trusted professionals.';
  const aboutLines = doc.splitTextToSize(aboutText, contentWidth);
  doc.text(aboutLines, margin, currentY);
  currentY += aboutLines.length * 4.5 + 8;

  // Verify link on TOC page
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...STEEL);
  doc.text('Verify this facility on Medicare.gov:', margin, currentY);
  currentY += 5;
  doc.setTextColor(41, 98, 168);
  doc.textWithLink(verifyUrl, margin, currentY, { url: verifyUrl });
  currentY += 6;

  doc.setTextColor(...STEEL);
  doc.text('All data can be verified at CMS Care Compare:', margin, currentY);
  currentY += 5;
  const cmsUrl = 'https://www.medicare.gov/care-compare/';
  doc.setTextColor(41, 98, 168);
  doc.textWithLink(cmsUrl, margin, currentY, { url: cmsUrl });

  // ================================================================
  //   PAGE 3 — SECTION 1: WHAT STANDS OUT / EXECUTIVE SUMMARY
  // ================================================================

  addNewPage();
  const mw = (contentWidth - 10) / 3;

  if (isAttorney) {
    addSectionHeader(1, 'Executive Summary');

    // Metric row
    drawMetricCard(
      'RISK SCORE',
      facility.composite ? facility.composite.toFixed(1) : null,
      NATIONAL_AVG.composite, '', margin, currentY, mw
    );
    drawMetricCard(
      'CMS STARS',
      (facility.stars || 0) + '', NATIONAL_AVG.stars + '', '/5',
      margin + mw + 5, currentY, mw
    );
    drawMetricCard(
      'TOTAL FINES',
      facility.total_fines ? '$' + Math.round(facility.total_fines / 1000) + 'K' : '$0',
      '$' + Math.round(NATIONAL_AVG.total_fines / 1000) + 'K', '',
      margin + (mw + 5) * 2, currentY, mw
    );
    currentY += 34;

    // Assessment
    addSubHeading('Assessment');
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const summaryText = generateExecutiveSummary();
    const summaryLines = doc.splitTextToSize(summaryText, contentWidth);
    doc.text(summaryLines, margin, currentY);
    currentY += summaryLines.length * 4.5 + 4;
  } else {
    // ── FAMILY VERSION: "What Stands Out" ──
    addSectionHeader(1, 'What Stands Out');

    // Metric row (same cards, family-friendly)
    drawMetricCard(
      'RISK SCORE',
      facility.composite ? facility.composite.toFixed(1) : null,
      NATIONAL_AVG.composite, '', margin, currentY, mw
    );
    drawMetricCard(
      'CMS STARS',
      (facility.stars || 0) + '', NATIONAL_AVG.stars + '', '/5',
      margin + mw + 5, currentY, mw
    );
    drawMetricCard(
      'TOTAL FINES',
      facility.total_fines ? '$' + Math.round(facility.total_fines / 1000) + 'K' : '$0',
      '$' + Math.round(NATIONAL_AVG.total_fines / 1000) + 'K', '',
      margin + (mw + 5) * 2, currentY, mw
    );
    currentY += 34;

    // Plain-language intro
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const familyIntro = 'Based on public records, here are the areas that may deserve your attention. A concerning pattern does not prove poor care in every case, but it may suggest topics to discuss directly with the facility.';
    const familyIntroLines = doc.splitTextToSize(familyIntro, contentWidth);
    doc.text(familyIntroLines, margin, currentY);
    currentY += familyIntroLines.length * 4.5 + 6;

    // Auto-generated plain-language findings
    const familyFindings = generateFamilyFindings();
    familyFindings.forEach((finding, i) => {
      checkPageBreak(14);
      // Navy left-bar callout style
      const fLines = doc.splitTextToSize(finding, contentWidth - 12);
      const fBoxH = fLines.length * 4.5 + 6;
      doc.setFillColor(...LIGHT_BG);
      doc.rect(margin + 3, currentY - 1, contentWidth - 3, fBoxH, 'F');
      const barColor = (i === 0 && facility.composite >= 60) ? RED : NAVY;
      doc.setFillColor(...barColor);
      doc.rect(margin, currentY - 1, 3, fBoxH, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BODY);
      doc.text(fLines, margin + 7, currentY + 4);
      currentY += fBoxH + 3;
    });
    currentY += 4;

    // Data dates note
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...STEEL);
    const dateNote = 'All findings are drawn from public CMS and state records as of ' + DATA_DATE + '. See Data Dates & Limitations at the end of this report.';
    const dateNoteLines = doc.splitTextToSize(dateNote, contentWidth);
    doc.text(dateNoteLines, margin, currentY);
    currentY += dateNoteLines.length * 4 + 6;
  }

  // ================================================================
  //   ATTORNEY TAKEAWAYS (attorney mode only, after executive summary)
  // ================================================================

  if (isAttorney) {
    checkPageBreak(60);
    addSubHeading('Attorney Takeaways');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const takeawayIntro = 'The following findings from federal data may be most relevant to case evaluation:';
    doc.text(takeawayIntro, margin, currentY);
    currentY += 7;

    const takeaways = [];
    if (facility.jeopardy_count > 0)
      takeaways.push('Immediate Jeopardy: ' + facility.jeopardy_count + ' IJ citation' + (facility.jeopardy_count > 1 ? 's' : '') + ' documented by state surveyors — the highest severity level under 42 CFR §488.301, indicating conditions likely to cause serious harm or death.');
    if (facility.harm_count > 0)
      takeaways.push('Actual Harm: ' + facility.harm_count + ' actual-harm citation' + (facility.harm_count > 1 ? 's' : '') + ' — inspectors confirmed residents were directly harmed by facility conditions or practices.');
    if (facility.total_hprd && facility.total_hprd < 3.48)
      takeaways.push('Understaffing: Total staffing of ' + num(facility.total_hprd) + ' HPRD is ' + ((1 - facility.total_hprd / 3.48) * 100).toFixed(0) + '% below the 3.48 HPRD threshold cited by 18 state AGs as minimum safe staffing.');
    if (facility.zero_rn_pct > 0)
      takeaways.push('Zero-RN Days: Facility reported zero registered nurse hours on ' + facility.zero_rn_pct.toFixed(1) + '% of days — this warrants review against 42 CFR §483.35 nursing-services requirements.');
    if (facility.total_fines > 0)
      takeaways.push('Financial Penalties: ' + fmt(facility.total_fines) + ' in federal civil monetary penalties across ' + (facility.fine_count || 0) + ' enforcement action' + ((facility.fine_count || 0) > 1 ? 's' : '') + ', documenting the facility enforcement history.');
    if (facility.denial_count > 0)
      takeaways.push('Payment Denials: ' + facility.denial_count + ' CMS payment denial' + (facility.denial_count > 1 ? 's' : '') + ' — the most severe enforcement action short of facility closure.');
    if (facility.worst_owner && facility.owner_portfolio_count > 5)
      takeaways.push('Corporate Oversight: Operated by ' + facility.worst_owner + ' (' + facility.owner_portfolio_count + ' facilities). Portfolio-wide patterns may warrant review of corporate-level oversight.');
    if (facility.contractor_pct && facility.contractor_pct > 20)
      takeaways.push('Contract Staffing Reliance: ' + facility.contractor_pct.toFixed(1) + '% contract RN staffing (national avg: ' + NATIONAL_AVG.contractor_pct + '%). High reliance on temporary staff can affect care continuity.');

    if (takeaways.length === 0)
      takeaways.push('No major red flags identified in available federal data. This does not preclude facility-specific concerns outside the scope of CMS datasets.');

    takeaways.forEach((t, i) => {
      checkPageBreak(14);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      const bullet = (i + 1) + '. ';
      const tLines = doc.splitTextToSize(bullet + t, contentWidth - 4);
      doc.text(tLines, margin + 2, currentY);
      currentY += tLines.length * 4 + 3;
    });
    currentY += 6;
  }

  // ================================================================
  //   SECTION 2 — OWNERSHIP PORTFOLIO / FACILITY SNAPSHOT
  // ================================================================

  addSectionHeader(2, isAttorney ? 'Ownership Portfolio' : 'Facility Snapshot');

  if (!isAttorney) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const ownerIntro = 'Ownership and management structure can matter because staffing practices, accountability, and responsiveness may vary across different owners and chains. Here are the basic facts about who operates this facility.';
    const ownerIntroLines = doc.splitTextToSize(ownerIntro, contentWidth);
    doc.text(ownerIntroLines, margin, currentY);
    currentY += ownerIntroLines.length * 4.5 + 4;
  }

  addDataRow('Owner Name:', facility.worst_owner || 'N/A');
  if (facility.chain_name) addDataRow('Chain Name:', facility.chain_name);
  addDataRow('Ownership Type:', facility.ownership_type || 'N/A');

  if (facility.pe_owned && facility.pe_owner_name) {
    addDataRow('Private Equity Owner:', facility.pe_owner_name);
    if (facility.pe_detection_method) {
      const peDetectionLabel = facility.pe_detection_method === 'cms_flag'
        ? 'CMS self-reported flag'
        : facility.pe_detection_method === 'name_match'
        ? 'Matched to known PE firm database'
        : facility.pe_detection_method === 'investment_firm'
        ? 'Investment firm entity identified'
        : facility.pe_detection_method;
      addDataRow('PE Detection Method:', peDetectionLabel);
    }
  }
  if (facility.reit_owned && facility.reit_owner_name) {
    addDataRow('REIT Owner:', facility.reit_owner_name);
    if (facility.reit_detection_method) {
      const reitDetectionLabel = facility.reit_detection_method === 'cms_flag'
        ? 'CMS self-reported flag'
        : facility.reit_detection_method === 'name_match'
        ? 'Matched to known REIT database'
        : facility.reit_detection_method === 'investment_firm'
        ? 'Investment firm entity identified'
        : facility.reit_detection_method;
      addDataRow('REIT Detection Method:', reitDetectionLabel);
    }
  }
  if (facility.investment_firm_involved) {
    addDataRow('Investment Firm Involved:', 'Yes');
  }

  // Ownership Churn
  if (facility.ownership_changed_recently && facility.ownership_change_date) {
    addDataRow('Ownership Change:', facility.ownership_change_date);
    if (facility.new_owner_name) addDataRow('New Owner:', facility.new_owner_name);
    addAlertBox(
      'Recent Ownership Change: This facility changed ownership on ' + facility.ownership_change_date + '. ' +
      'Research shows care quality often dips during ownership transitions — new operators may reduce staffing or ' +
      'defer maintenance while assuming operational control.',
      'warning'
    );
  }
  if (facility.num_owners !== null && facility.num_owners !== undefined && facility.num_owners > 3) {
    addAlertBox(
      'Frequent Ownership Changes: This facility has had ' + facility.num_owners + ' different owners in CMS records. ' +
      'Frequent ownership changes can indicate financial instability, operational dysfunction, or a pattern of ' +
      'distressed-asset transactions that disrupt continuity of care.',
      'warning'
    );
  } else if (facility.num_owners !== null && facility.num_owners !== undefined) {
    addDataRow('Total Owners on Record:', String(facility.num_owners));
  }

  // Chain-Wide Performance + Portfolio Table — attorney only (too dense for families)
  if (isAttorney) {
    if (facility.chain_name && (facility.chain_avg_stars !== null || facility.chain_avg_hprd !== null || facility.chain_abuse_pct !== null)) {
      checkPageBreak(45);
      addSubHeading('Chain-Wide Performance');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BODY);
      const chainCount = facility.owner_portfolio_count || 'multiple';
      const chainIntro = 'This facility is part of ' + facility.chain_name +
        ', which operates ' + chainCount + ' facilit' + (chainCount === 1 ? 'y' : 'ies') +
        ' in CMS data. Chain-wide averages are shown below for context.';
      const chainLines = doc.splitTextToSize(chainIntro, contentWidth);
      doc.text(chainLines, margin, currentY);
      currentY += chainLines.length * 4.5 + 4;

      if (facility.chain_avg_stars !== null && facility.chain_avg_stars !== undefined)
        addDataRow('Chain Average Star Rating:', facility.chain_avg_stars.toFixed(1) + ' / 5');
      if (facility.chain_avg_hprd !== null && facility.chain_avg_hprd !== undefined)
        addDataRow('Chain Average Total HPRD:', facility.chain_avg_hprd.toFixed(2) + ' hrs');
      if (facility.chain_abuse_pct !== null && facility.chain_abuse_pct !== undefined) {
        addDataRow('Chain Facilities with Abuse Citations:', pct(facility.chain_abuse_pct));
        if (facility.chain_abuse_pct > 20) {
          addAlertBox(
            'Chain-Wide Abuse Pattern: ' + pct(facility.chain_abuse_pct) + ' of facilities in the ' +
            facility.chain_name + ' chain have abuse-related citations. ' +
            'A high chain-wide rate suggests a systemic pattern rather than isolated incidents.',
            'warning'
          );
        }
      }
      currentY += 4;
    }

    currentY += 4;

    const portfolio = buildOwnershipPortfolio();

    if (portfolio) {
      addDataRow('Portfolio Size:', portfolio.count + ' facilities in our dataset');

      currentY += 3;
      addSubHeading('Portfolio-Wide Performance');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BODY);
      const pIntro =
        'This facility is operated by ' + facility.worst_owner +
        ', who controls ' + portfolio.count +
        ' facilities nationwide. Portfolio averages: ' +
        portfolio.avgStars.toFixed(1) + ' CMS stars, ' +
        fmt(portfolio.avgFines) + ' in fines per facility, ' +
        portfolio.avgComposite.toFixed(1) + ' risk score.';
      const pLines = doc.splitTextToSize(pIntro, contentWidth);
      doc.text(pLines, margin, currentY);
      currentY += pLines.length * 4.5 + 6;

      addSubHeading('Lowest-Performing Facilities in Portfolio');

      const ptd = portfolio.facilities.map((f) => {
        const marker = f.ccn === facility.ccn ? '>> ' : '';
        return [
          marker + f.name,
          f.city + ', ' + f.state,
          (f.stars || 0) + '/5',
          (f.composite || 0).toFixed(1),
          String(f.total_deficiencies || 0),
          fmt(f.total_fines || 0),
        ];
      });
      ptd.push([
        'PORTFOLIO AVERAGE', '', portfolio.avgStars.toFixed(1),
        portfolio.avgComposite.toFixed(1), '',
        fmt(portfolio.avgFines),
      ]);
      ptd.push([
        'NATIONAL AVERAGE', '', NATIONAL_AVG.stars.toFixed(1),
        NATIONAL_AVG.composite.toFixed(1),
        NATIONAL_AVG.total_deficiencies.toFixed(1),
        fmt(NATIONAL_AVG.total_fines),
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Facility', 'Location', 'Stars', 'Risk', 'Defs', 'Total Fines']],
        body: ptd,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 4, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
        headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: TABLE_ALT },
        columnStyles: {
          0: { cellWidth: 48 },
          1: { cellWidth: 28 },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 14, halign: 'right' },
          5: { cellWidth: 28, halign: 'right' },
        },
        didParseCell(data) {
          if (data.row.section === 'body') {
            if (data.row.index >= ptd.length - 2) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = LIGHT_BG;
            }
            if (data.cell.raw && typeof data.cell.raw === 'string' && data.cell.raw.startsWith('>> ')) {
              data.cell.styles.fillColor = [255, 250, 205];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        margin: { left: margin, right: margin },
      });
      currentY = doc.lastAutoTable.finalY + 6;
    } else {
      addDataRow('Portfolio Size:', '1 facility');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...STEEL);
      doc.text('Single-facility operator. No portfolio analysis available.', margin, currentY);
      currentY += 8;
    }
  } else {
    // Consumer: brief portfolio summary (one line, no table)
    const portfolio = buildOwnershipPortfolio();
    if (portfolio && portfolio.count > 1) {
      addDataRow('Portfolio Size:', portfolio.count + ' facilities');
      addDataRow('Portfolio Avg Stars:', portfolio.avgStars.toFixed(1) + ' / 5');
      addDataRow('Portfolio Avg Fines:', fmt(portfolio.avgFines));
    }
    currentY += 4;
  }

  addVerifyLink(
    'Medicare Care Compare — Ownership & Facility Info',
    'https://www.medicare.gov/care-compare/details/nursing-home/' + facility.ccn
  );

  // ================================================================
  //   SECTION 3 — STAFFING ANALYSIS
  // ================================================================

  addSectionHeader(3, isAttorney ? 'Staffing Analysis' : 'Staffing Overview');

  if (!isAttorney) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const staffIntro = 'Staffing is one of the strongest public signals families can review. Lower staffing or higher turnover may affect how consistently residents are monitored, assisted, and supported. The numbers below come from data facilities report to CMS and may not fully capture day-to-day variation across shifts.';
    const staffIntroLines = doc.splitTextToSize(staffIntro, contentWidth);
    doc.text(staffIntroLines, margin, currentY);
    currentY += staffIntroLines.length * 4.5 + 4;
  }

  // Source note
  doc.setFontSize(7.5);
  doc.setTextColor(...STEEL);
  doc.text('Source: CMS NH Provider Info (Reported Staffing) — ' + (nationalAveragesData.national._computed_on || 'March 2026') + '  |  National averages computed from ' + (nationalAveragesData.national._computed_from || '14,699') + ' facilities', margin, currentY);
  currentY += 6;

  // Metric row
  drawMetricCard('TOTAL HPRD', facility.total_hprd ? num(facility.total_hprd) : null, NATIONAL_AVG.total_hprd.toFixed(2), ' hrs', margin, currentY, mw);
  drawMetricCard('RN HPRD', facility.rn_hprd ? num(facility.rn_hprd) : null, NATIONAL_AVG.rn_hprd.toFixed(2), ' hrs', margin + mw + 5, currentY, mw);
  drawMetricCard('ZERO-RN DAYS', facility.zero_rn_pct !== null ? facility.zero_rn_pct.toFixed(1) : null, NATIONAL_AVG.zero_rn_pct.toFixed(1), '%', margin + (mw + 5) * 2, currentY, mw);
  currentY += 34;

  addSubHeading('Staffing Breakdown vs National Benchmarks');

  const staffRows = [
    ['Registered Nurse (RN)', num(facility.rn_hprd) + ' hrs', NATIONAL_AVG.rn_hprd + ' hrs', facility.rn_hprd ? ((facility.rn_hprd - NATIONAL_AVG.rn_hprd) / NATIONAL_AVG.rn_hprd * 100).toFixed(0) + '%' : 'N/A'],
    ['Licensed Practical Nurse', num(facility.lpn_hprd) + ' hrs', NATIONAL_AVG.lpn_hprd + ' hrs', facility.lpn_hprd ? ((facility.lpn_hprd - NATIONAL_AVG.lpn_hprd) / NATIONAL_AVG.lpn_hprd * 100).toFixed(0) + '%' : 'N/A'],
    ['Certified Nursing Asst', num(facility.cna_hprd) + ' hrs', NATIONAL_AVG.cna_hprd + ' hrs', facility.cna_hprd ? ((facility.cna_hprd - NATIONAL_AVG.cna_hprd) / NATIONAL_AVG.cna_hprd * 100).toFixed(0) + '%' : 'N/A'],
    ['Total Nursing HPRD', num(facility.total_hprd) + ' hrs', NATIONAL_AVG.total_hprd + ' hrs', facility.total_hprd ? ((facility.total_hprd - NATIONAL_AVG.total_hprd) / NATIONAL_AVG.total_hprd * 100).toFixed(0) + '%' : 'N/A'],
    ['Zero-RN Day %', pct(facility.zero_rn_pct), NATIONAL_AVG.zero_rn_pct + '%', facility.zero_rn_pct !== null ? (facility.zero_rn_pct - NATIONAL_AVG.zero_rn_pct).toFixed(1) + '%' : 'N/A'],
    ['Contract Staffing %', pct(facility.contractor_pct), NATIONAL_AVG.contractor_pct + '%', facility.contractor_pct !== null ? (facility.contractor_pct - NATIONAL_AVG.contractor_pct).toFixed(1) + '%' : 'N/A'],
    ['CMS Stars (Staffing)', (facility.staffing_stars || 'N/A') + '/5', 'N/A', 'N/A'],
    ['CMS Stars (Overall)', (facility.stars || 'N/A') + '/5', NATIONAL_AVG.stars + '/5', facility.stars ? (facility.stars - NATIONAL_AVG.stars).toFixed(1) : 'N/A'],
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
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 35, halign: 'right' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell(data) {
      if (data.column.index === 3 && data.row.section === 'body') {
        const diff = data.row.raw[3];
        if (typeof diff === 'string' && diff.includes('%')) {
          const v = parseFloat(diff);
          if (!isNaN(v)) {
            // For zero-RN and contract staffing, higher = worse
            const lowerIsBetter = data.row.index === 4 || data.row.index === 5;
            if (lowerIsBetter) {
              if (v > 0) data.cell.styles.textColor = RED;
              else if (v < 0) data.cell.styles.textColor = GREEN;

    } else {
              if (v < 0) data.cell.styles.textColor = RED;
              else if (v > 0) data.cell.styles.textColor = GREEN;
            }
          }
        }
      }
    },
    margin: { left: margin, right: margin },
  });
  currentY = doc.lastAutoTable.finalY + 6;

  addDataRow('Average Census:', facility.avg_census ? facility.avg_census.toFixed(1) : 'N/A');
  currentY += 4;

  // ---- Weekend, Contract, Verification, Alerts — attorney only (too granular for families) ----
  if (isAttorney) {
    // ---- Weekend Staffing Drop ----
    if (facility.weekend_total_hprd !== null && facility.weekend_total_hprd !== undefined) {
      checkPageBreak(50);
      addSubHeading('Weekend vs. Weekday Staffing');

      addDataRow('Weekday Total HPRD:', num(facility.total_hprd) + ' hrs');
      addDataRow('Weekend Total HPRD:', num(facility.weekend_total_hprd) + ' hrs');
      if (facility.rn_hprd !== null && facility.rn_hprd !== undefined) {
        addDataRow('Weekday RN HPRD:', num(facility.rn_hprd) + ' hrs');
        addDataRow('Weekend RN HPRD:', num(facility.weekend_rn_hprd) + ' hrs');
      }

      if (facility.total_hprd > 0) {
        const totalDrop = ((facility.total_hprd - facility.weekend_total_hprd) / facility.total_hprd * 100);
        addDataRow('Weekend Total Drop:', totalDrop.toFixed(1) + '%');
        if (totalDrop > 20) {
          addAlertBox(
            'Weekend Staffing Gap: Weekend staffing drops ' + totalDrop.toFixed(1) + '% below weekday levels. ' +
            'Research indicates residents receive substantially fewer hours of nursing care on weekends, ' +
            'increasing risk of undetected deterioration and delayed response to medical events.',
            'warning'
          );
        }
      }
      if (facility.rn_hprd > 0 && facility.weekend_rn_hprd !== null && facility.weekend_rn_hprd !== undefined) {
        const rnDrop = ((facility.rn_hprd - facility.weekend_rn_hprd) / facility.rn_hprd * 100);
        if (rnDrop > 20) {
          addAlertBox(
            'Weekend RN Coverage Gap: Registered nurse hours drop ' + rnDrop.toFixed(1) + '% on weekends ' +
            '(' + num(facility.rn_hprd) + ' hrs weekday vs. ' + num(facility.weekend_rn_hprd) + ' hrs weekend). ' +
            'Reduced RN presence on weekends limits clinical assessment and medication management oversight.',
            'warning'
          );
        }
      }
      currentY += 4;
    }

    // ---- Contract Staffing Reliance ----
    if (facility.contractor_pct !== null && facility.contractor_pct !== undefined) {
      checkPageBreak(40);
      addSubHeading('Contract Staffing Reliance');

      addDataRow('Contract/Agency RN Hours (%):', pct(facility.contractor_pct));
      addDataRow('National Average:', NATIONAL_AVG.contractor_pct + '%');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BODY);
      const contractNote = 'Contract or agency staff are temporary workers hired through staffing agencies. ' +
        'High reliance on contract staff reduces continuity of care — temporary nurses are unfamiliar with ' +
        'residents\' individual needs, care plans, and histories.';
      const cnLines = doc.splitTextToSize(contractNote, contentWidth);
      doc.text(cnLines, margin, currentY);
      currentY += cnLines.length * 4.5 + 4;

      if (facility.contractor_pct > 20) {
        addAlertBox(
          'High Contract Staffing: ' + pct(facility.contractor_pct) + ' of RN hours are provided by temporary contract staff — ' +
          'above the 20% threshold associated with continuity-of-care concerns in Health Affairs research. ' +
          'National average is ' + NATIONAL_AVG.contractor_pct + '%. Contract staff lack familiarity with individual residents\' care plans.',
          'warning'
        );
      }
      currentY += 4;
    }

    // Verification
    addSubHeading('Staffing Verification');
    if (facility.self_report_rn !== null && facility.self_report_rn !== undefined)
      addDataRow('Self-Reported RN Hours:', num(facility.self_report_rn) + ' hrs');
    addDataRow('Verified RN Hours (Payroll):', num(facility.rn_hprd) + ' hrs');
    if (facility.rn_gap_pct !== null && facility.rn_gap_pct !== undefined)
      addDataRow('Discrepancy:', pct(facility.rn_gap_pct));
    currentY += 4;

    // Alerts
    if (facility.zero_rn_pct > 0) {
      addAlertBox(
        'Regulatory Context (42 CFR §483.35): Federal law requires a registered nurse on site for at least 8 consecutive hours per day, 7 days per week. This facility reported zero RN hours on ' +
        facility.zero_rn_pct.toFixed(1) + '% of days, which may indicate a violation of this federal requirement.',
        'info'
      );
    }
    if (facility.total_hprd && facility.total_hprd < 3.48) {
      const gap = ((1 - facility.total_hprd / 3.48) * 100).toFixed(0);
      addAlertBox(
        'Staffing Standard Context: In February 2026, 18 state Attorneys General urged CMS to adopt a minimum staffing standard of 3.48 hours per resident per day. This facility provides ' +
        num(facility.total_hprd) + ' HPRD, which is ' + gap + '% below the proposed threshold.',
        'warning'
      );
    }
    if (facility.rn_gap_pct && facility.rn_gap_pct > 20) {
      addAlertBox(
        'Verification Discrepancy: This facility shows a ' + pct(facility.rn_gap_pct) +
        ' discrepancy between self-reported and verified staffing levels, which may warrant further investigation.',
        'warning'
      );
    }
    if (facility.contractor_pct && facility.contractor_pct > 20) {
      addAlertBox(
        'Contract Staffing Context: Research in Health Affairs has linked high contract staffing rates to quality concerns. This facility reports ' +
        pct(facility.contractor_pct) + ' contract staffing, above the national average of ' + NATIONAL_AVG.contractor_pct + '%.',
        'info'
      );
    }
  } else {
    // Consumer: highlight only the most important staffing signals
    if (facility.zero_rn_pct > 0) {
      addAlertBox(
        'This facility reported zero registered nurse hours on ' + facility.zero_rn_pct.toFixed(1) + '% of days. Federal law requires an RN on site at least 8 hours every day.',
        'warning'
      );
    }
    if (facility.total_hprd && facility.total_hprd < 3.48) {
      addAlertBox(
        'Total staffing is ' + num(facility.total_hprd) + ' hours per resident per day, which is below the 3.48-hour standard recommended by 18 state Attorneys General.',
        'warning'
      );
    }
    if (facility.contractor_pct && facility.contractor_pct > 20) {
      addAlertBox(
        pct(facility.contractor_pct) + ' of nursing hours come from temporary contract staff (national average: ' + NATIONAL_AVG.contractor_pct + '%). High reliance on temporary staff can affect continuity of care.',
        'info'
      );
    }
    currentY += 4;
  }

  // ---- Workforce Stability (Turnover) — attorney gets full table, consumer gets key flags ----
  if (isAttorney && (
    facility.total_turnover !== null && facility.total_turnover !== undefined ||
    facility.rn_turnover !== null && facility.rn_turnover !== undefined ||
    facility.admin_turnover !== null && facility.admin_turnover !== undefined
  )) {
    checkPageBreak(60);
    addSubHeading('Workforce Stability (Turnover)');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const turnoverIntro =
      'CMS collects turnover data from Payroll-Based Journal (PBJ) submissions. ' +
      'High turnover is an evidence marker of institutional instability — ' +
      'research consistently links elevated nurse turnover to lower care quality and increased adverse events.';
    const tiLines = doc.splitTextToSize(turnoverIntro, contentWidth);
    doc.text(tiLines, margin, currentY);
    currentY += tiLines.length * 4.5 + 5;

    const turnoverRows = [];
    if (facility.total_turnover !== null && facility.total_turnover !== undefined)
      turnoverRows.push([
        'Total Staff Turnover Rate',
        pct(facility.total_turnover),
        NATIONAL_AVG.total_turnover + '%',
        facility.total_turnover > NATIONAL_AVG.total_turnover
          ? '+' + (facility.total_turnover - NATIONAL_AVG.total_turnover).toFixed(1) + '%'
          : (facility.total_turnover - NATIONAL_AVG.total_turnover).toFixed(1) + '%',
      ]);
    if (facility.rn_turnover !== null && facility.rn_turnover !== undefined)
      turnoverRows.push([
        'Registered Nurse (RN) Turnover Rate',
        pct(facility.rn_turnover),
        NATIONAL_AVG.rn_turnover + '%',
        facility.rn_turnover > NATIONAL_AVG.rn_turnover
          ? '+' + (facility.rn_turnover - NATIONAL_AVG.rn_turnover).toFixed(1) + '%'
          : (facility.rn_turnover - NATIONAL_AVG.rn_turnover).toFixed(1) + '%',
      ]);
    if (facility.admin_turnover !== null && facility.admin_turnover !== undefined)
      turnoverRows.push([
        'Administrator Turnover (count)',
        String(facility.admin_turnover),
        String(NATIONAL_AVG.admin_turnover),
        facility.admin_turnover > NATIONAL_AVG.admin_turnover
          ? '+' + (facility.admin_turnover - NATIONAL_AVG.admin_turnover).toFixed(1)
          : (facility.admin_turnover - NATIONAL_AVG.admin_turnover).toFixed(1),
      ]);

    if (turnoverRows.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Metric', 'This Facility', 'National Avg', 'Difference']],
        body: turnoverRows,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 4, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
        headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: TABLE_ALT },
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: 30, halign: 'right' },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
        },
        didParseCell(data) {
          if (data.column.index === 3 && data.row.section === 'body') {
            const raw = data.row.raw[3];
            if (typeof raw === 'string') {
              const v = parseFloat(raw);
              if (!isNaN(v)) {
                if (v > 0) data.cell.styles.textColor = RED;
                else if (v < 0) data.cell.styles.textColor = GREEN;
              }
            }
          }
        },
        margin: { left: margin, right: margin },
      });
      currentY = doc.lastAutoTable.finalY + 5;
    }

    if (facility.rn_turnover !== null && facility.rn_turnover !== undefined && facility.rn_turnover > 60) {
      addAlertBox(
        'High RN Turnover: At ' + pct(facility.rn_turnover) + ', this facility\'s RN turnover exceeds 60% — ' +
        'a threshold associated with significantly higher rates of adverse events in peer-reviewed literature. ' +
        'High RN turnover disrupts care continuity and institutional knowledge, directly affecting resident safety.',
        'warning'
      );
    }
    if (facility.admin_turnover !== null && facility.admin_turnover !== undefined && facility.admin_turnover > 1) {
      addAlertBox(
        'Administrator Turnover: ' + facility.admin_turnover + ' administrator' +
        (facility.admin_turnover > 1 ? 's have' : ' has') +
        ' left this facility — above the national average of ' + NATIONAL_AVG.admin_turnover +
        '. Frequent leadership changes signal management dysfunction and can impair regulatory compliance.',
        'warning'
      );
    }
  } else if (!isAttorney) {
    // Consumer: brief turnover note if elevated
    if (facility.rn_turnover !== null && facility.rn_turnover !== undefined && facility.rn_turnover > 60) {
      addAlertBox(
        'Nurse turnover at this facility is ' + pct(facility.rn_turnover) + ', which is high. Frequent staff changes can affect the quality and consistency of care residents receive.',
        'warning'
      );
    }
    if (facility.admin_turnover !== null && facility.admin_turnover !== undefined && facility.admin_turnover > 1) {
      addAlertBox(
        'This facility has had ' + facility.admin_turnover + ' administrator change' + (facility.admin_turnover > 1 ? 's' : '') + ', which is above the national average. Leadership turnover can affect facility stability.',
        'info'
      );
    }
  }

  // ---- Staffing Trend Over Time — attorney only ----
  if (isAttorney && facility.staffing_trend && facility.staffing_trend.quarters?.length > 0) {
    const trend = facility.staffing_trend;
    checkPageBreak(60);
    addSubHeading('Staffing Trend Over Time');

    const qCount = trend.quarters.length;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const trendDir = trend.direction || 'stable';
    const trendIntro =
      'Staffing has been ' + trendDir + ' over the past ' + qCount + ' quarter' + (qCount > 1 ? 's' : '') + '. ' +
      'The table below shows quarterly staffing levels from CMS Payroll-Based Journal data.';
    const tiLines = doc.splitTextToSize(trendIntro, contentWidth);
    doc.text(tiLines, margin, currentY);
    currentY += tiLines.length * 4.5 + 5;

    const trendRows = trend.quarters.map((q, i) => [
      q,
      trend.total_hprd && trend.total_hprd[i] !== undefined ? trend.total_hprd[i].toFixed(2) : 'N/A',
      trend.rn_hprd && trend.rn_hprd[i] !== undefined ? trend.rn_hprd[i].toFixed(2) : 'N/A',
      trend.zero_rn_pct && trend.zero_rn_pct[i] !== undefined ? trend.zero_rn_pct[i].toFixed(1) + '%' : 'N/A',
      trend.contractor_pct && trend.contractor_pct[i] !== undefined ? trend.contractor_pct[i].toFixed(1) + '%' : 'N/A',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Quarter', 'Total HPRD', 'RN HPRD', 'Zero-RN Days', 'Contract %']],
      body: trendRows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3.5, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
      headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: TABLE_ALT },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' },
        1: { cellWidth: 28, halign: 'right' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });
    currentY = doc.lastAutoTable.finalY + 5;

    if (trendDir === 'declining' && trend.total_hprd && trend.total_hprd.length >= 2) {
      const firstVal = trend.total_hprd[0];
      const lastVal = trend.total_hprd[trend.total_hprd.length - 1];
      addAlertBox(
        'Declining Staffing Trend: Staffing levels are declining — total HPRD dropped from ' +
        firstVal.toFixed(2) + ' (' + trend.quarters[0] + ') to ' +
        lastVal.toFixed(2) + ' (' + trend.quarters[trend.quarters.length - 1] + '). ' +
        'A declining trend suggests the facility is reducing staffing investment over time.',
        'warning'
      );
    }
  }

  addVerifyLink(
    'Medicare Care Compare — Staffing & Stars',
    'https://www.medicare.gov/care-compare/details/nursing-home/' + facility.ccn
  );

  // ================================================================
  //   SECTION 4 — INSPECTION HISTORY
  // ================================================================

  addSectionHeader(4, isAttorney ? 'Inspection History' : 'Inspection & Penalty History');
  const isCA = facility.state === 'CA';

  if (!isAttorney) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const inspIntro = 'Inspection findings and penalties can help families understand whether regulators identified repeated or serious concerns. A higher number does not prove unsafe care in every case, but it may suggest areas to ask about directly.';
    const inspIntroLines = doc.splitTextToSize(inspIntro, contentWidth);
    doc.text(inspIntroLines, margin, currentY);
    currentY += inspIntroLines.length * 4.5 + 4;
  }

  // Attorney mode: surface complaint investigation data prominently at the top
  if (isAttorney) {
    const complaintDatesEarly = new Set();
    if (facility.deficiency_details && facility.deficiency_details.length > 0) {
      facility.deficiency_details.forEach((d) => {
        if (d.is_complaint === true && d.survey_date) complaintDatesEarly.add(d.survey_date);
      });
    }
    const complaintCountEarly = complaintDatesEarly.size;
    const complaintCitationsEarly = (facility.deficiency_details || []).filter(d => d.is_complaint === true).length;

    if (complaintCountEarly > 0) {
      checkPageBreak(30);
      doc.setFillColor(...AMBER_BG);
      doc.setDrawColor(...DIVIDER);
      doc.setLineWidth(0.3);
      const cBoxH = 22;
      doc.rect(margin, currentY, contentWidth, cBoxH, 'FD');
      doc.setFillColor(...AMBER);
      doc.rect(margin, currentY, 3, cBoxH, 'F');
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...AMBER);
      doc.text('COMPLAINT INVESTIGATIONS: ' + complaintCountEarly + ' investigations yielding ' + complaintCitationsEarly + ' citations', margin + 7, currentY + 7);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BODY);
      const yieldEarly = complaintCountEarly > 0 ? (complaintCitationsEarly / complaintCountEarly).toFixed(1) : '0';
      doc.text(yieldEarly + ' citations per investigation (national avg complaints: ' + NATIONAL_AVG.complaint_investigations + '). See Complaint-Driven Investigations below for detail.', margin + 7, currentY + 14);
      currentY += cBoxH + 6;
    }
  }

  // CMS-2567 source note
  checkPageBreak(20);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  const srcBoxEstH = 22;
  doc.rect(margin, currentY, contentWidth, srcBoxEstH, 'FD');
  doc.setFillColor(43, 108, 176);
  doc.rect(margin, currentY, 1.5, srcBoxEstH, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Data Source:', margin + 4, currentY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const sourceText = 'Inspection deficiencies documented on CMS Form 2567 (Statement of Deficiencies and Plan of Correction), issued by state survey agencies under contract with CMS. Each deficiency cites a specific federal regulation under 42 CFR Part 483 — Requirements for States and Long Term Care Facilities.';
  const sourceLines = doc.splitTextToSize(sourceText, contentWidth - 8);
  doc.text(sourceLines, margin + 4, currentY + 8);
  const sourceBoxH = Math.max(20, sourceLines.length * 4 + 12);
  currentY += sourceBoxH + 4;

  // CA Title 22 note for California facilities
  if (facility.state === 'CA') {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(5, 150, 105);
    doc.text('California facilities are additionally subject to Title 22, Division 5 of the California Code of Regulations.', margin + 4, currentY);
    currentY += 10;
  }

  addDataRow('Total Deficiencies:', String(facility.total_deficiencies || 0));
  addDataRow('Immediate Jeopardy Citations:', String(facility.jeopardy_count || 0));
  addDataRow('Actual Harm Citations:', String(facility.harm_count || 0));
  if (facility.severity_score !== null && facility.severity_score !== undefined)
    addDataRow('Severity Score:', facility.severity_score.toFixed(1));
  currentY += 4;

  // Top categories
  if (facility.top_categories && facility.top_categories.length > 0) {
    addSubHeading('Top Deficiency Categories');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const catFrame = 'The most frequently cited problem areas indicate where this facility consistently fails to meet federal standards. Categories reflect the type of care or operational area cited in health deficiency inspections.';
    const catLines = doc.splitTextToSize(catFrame, contentWidth);
    doc.text(catLines, margin, currentY);
    currentY += catLines.length * 4.5 + 4;

    facility.top_categories.slice(0, 3).forEach(([cat, count]) => {
      addDataRow('Most common: ' + cat, count + ' citation' + (count !== 1 ? 's' : ''));
    });
    currentY += 4;
  }

  // Individual deficiency table + Regulatory Reference — attorney only (consumers get top categories above)
  if (isAttorney && facility.deficiency_details && facility.deficiency_details.length > 0) {
    addSubHeading('Individual Deficiency Details');

    const totalDefCount = facility.deficiency_details.length;
    const defLimit = Math.min(50, totalDefCount);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const defCountText =
      'Showing ' + defLimit + ' of ' + totalDefCount + ' total citation' + (totalDefCount !== 1 ? 's' : '') +
      ' (sorted by date — most recent first). Red = Immediate Jeopardy, Amber = Actual Harm.';
    const defCountLines = doc.splitTextToSize(defCountText, contentWidth);
    doc.text(defCountLines, margin, currentY);
    currentY += defCountLines.length * 4.5 + 3;

        const sorted = [...facility.deficiency_details]
      .sort((a, b) => new Date(b.survey_date || 0) - new Date(a.survey_date || 0))
      .slice(0, defLimit);

    // Build F-tag citation counts
    const ftagCounts = {};
    facility.deficiency_details.forEach(d => {
      if (d.ftag) {
        const clean = d.ftag.replace('F-0', 'F').replace('F-', 'F');
        ftagCounts[clean] = (ftagCounts[clean] || 0) + 1;
      }
    });

    const headRow = isCA
      ? ['F-Tag / CFR', 'Regulation', 'Scope', 'Severity', 'Cited', 'Most Recent']
      : ['F-Tag / CFR', 'Regulation', 'Scope', 'Severity', 'Cited', 'Most Recent'];

    const defRows = sorted.map((def) => {
      const date = def.survey_date
        ? new Date(def.survey_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
        : 'N/A';
      const ftagClean = def.ftag ? def.ftag.replace('F-0', 'F').replace('F-', 'F') : '';
      const ref = ftagClean ? ftagReference[ftagClean] : null;
      const ftagCell = ftagClean + (ref ? '\n' + ref.cfr : '');
      const regTitle = ref ? ref.title : (def.description || 'No description');
      const regCell = regTitle + (ref ? '\n' + ref.category : '') + (isCA && ref && ref.ca_title22 ? '\nCA: ' + ref.ca_title22 : '');
      const scopeMap = { 'J': 'Isolated', 'K': 'Pattern', 'L': 'Widespread', 'G': 'Isolated', 'H': 'Pattern', 'I': 'Widespread', 'D': 'Isolated', 'E': 'Pattern', 'F': 'Widespread', 'A': 'Isolated', 'B': 'Pattern', 'C': 'Widespread' };
      const scope = def.scope_severity ? (scopeMap[def.scope_severity] || (def.scope_severity.includes('Wide') ? 'Widespread' : def.scope_severity.includes('Pattern') ? 'Pattern' : 'Isolated')) : 'N/A';
      const sevLabelMap = { 'Immediate Jeopardy': 'Immediate Jeopardy', 'Actual Harm': 'Actual Harm', 'Potential for More Than Minimal Harm': 'Potential Harm', 'Potential for Minimal Harm': 'Minimal Harm' };
      const severity = sevLabelMap[def.severity_label] || def.severity_label || 'N/A';
      const count = ftagClean ? (ftagCounts[ftagClean] || 1) + 'x' : '1x';
      return [ftagCell, regCell, scope, severity, count, date];
    });

    autoTable(doc, {
      startY: currentY,
      head: [headRow],
      body: defRows,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 3, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15, overflow: 'linebreak' },
      headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: TABLE_ALT },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold' },
        1: { cellWidth: 62 },
        2: { cellWidth: 18 },
        3: { cellWidth: 24 },
        4: { cellWidth: 14 },
        5: { cellWidth: 18 },
      },
      didParseCell(data) {
        if (data.row.section === 'body') {
          const sev = data.row.raw[3] || '';
          if (sev.includes('Immediate Jeopardy'))
            data.cell.styles.fillColor = RED_BG;
          else if (sev.includes('Actual Harm'))
            data.cell.styles.fillColor = AMBER_BG;
          else if (sev.includes('More Than Minimal'))
            data.cell.styles.fillColor = YELLOW_BG;
          else if (sev.includes('Minimal'))
            data.cell.styles.fillColor = GREEN_BG;
          // Color the F-tag/CFR column
          if (data.column.index === 0 && data.row.section === 'body') {
            data.cell.styles.textColor = [15, 22, 41];
          }
          // Color CA Title 22 references in green
          if (data.column.index === 1 && data.row.section === 'body') {
            // Can't do per-line coloring in autoTable, but the text will include CA reference
          }
        }
      },
      margin: { left: margin, right: margin },
    });
    currentY = doc.lastAutoTable.finalY + 5;
        
    // ---- Regulatory Reference Summary Table ----
    checkPageBreak(40);
    addSubHeading('Regulatory Reference Summary');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...STEEL);
    doc.text('Quick reference for demand letters and discovery requests. All citations reference 42 CFR Part 483.', margin, currentY);
    currentY += 5;

    const uniqueFtags = {};
    facility.deficiency_details.forEach(d => {
      const ftagClean = d.ftag ? d.ftag.replace('F-0', 'F').replace('F-', 'F') : null;
      if (!ftagClean) return;
      if (!uniqueFtags[ftagClean]) {
        uniqueFtags[ftagClean] = { count: 0, highestSeverity: 'No Harm', severityRank: 0 };
      }
      uniqueFtags[ftagClean].count++;
      const sevRank = d.severity_label === 'Immediate Jeopardy' ? 3 : d.severity_label === 'Actual Harm' ? 2 : (d.severity_label && d.severity_label.includes('More Than Minimal')) ? 1 : 0;
      if (sevRank > uniqueFtags[ftagClean].severityRank) {
        uniqueFtags[ftagClean].severityRank = sevRank;
        const sevDisplay = d.severity_label === 'Immediate Jeopardy' ? 'Immediate Jeopardy' : d.severity_label === 'Actual Harm' ? 'Actual Harm' : (d.severity_label && d.severity_label.includes('More Than Minimal')) ? 'Potential Harm' : 'Minimal Harm';
        uniqueFtags[ftagClean].highestSeverity = sevDisplay;
      }
    });

    // Discovery angle mapping — common F-tag categories to discovery suggestions
    const discoveryAngleMap = {
      'F600': 'Abuse investigation records, incident reports',
      'F602': 'Abuse prevention program docs, training records',
      'F603': 'Abuse reporting logs, state agency notifications',
      'F609': 'Reporting timelines, incident investigation files',
      'F610': 'Investigation completion records, corrective actions',
      'F656': 'Comprehensive care plans, MDS assessments',
      'F657': 'Care plan revision history, IDT meeting minutes',
      'F677': 'ADL care records, nursing notes',
      'F684': 'Treatment records, physician orders',
      'F686': 'Wound care protocols, pressure ulcer staging records',
      'F688': 'Restorative nursing programs, physical therapy records',
      'F689': 'Fall prevention program, incident/accident reports',
      'F690': 'Bowel/bladder retraining programs',
      'F692': 'Nutrition assessments, dietary plans, weight records',
      'F693': 'Tube feeding orders, nutritional monitoring',
      'F695': 'Respiratory care records, oxygen therapy logs',
      'F696': 'Medication pass records, pharmacy reviews',
      'F697': 'Pain assessments, PRN medication administration',
      'F698': 'Dialysis coordination records',
      'F699': 'Trauma assessments, transfer records',
      'F700': 'Bedrail assessments, restraint reduction records',
      'F725': 'Staffing schedules, PBJ submissions',
      'F726': 'Competency evaluations, in-service training records',
      'F740': 'Behavioral health treatment plans',
      'F741': 'Psychotropic medication consents, reduction attempts',
      'F755': 'Pharmacy consultant reports, medication error logs',
      'F756': 'Unnecessary drug reviews, gradual dose reduction records',
      'F757': 'Psychotropic PRN orders, clinical justifications',
      'F758': 'Antipsychotic medication records, diagnosis documentation',
      'F759': 'Medication reconciliation records',
      'F760': 'Medication error reports, adverse event tracking',
      'F761': 'Pharmacy labeling records, storage audits',
      'F775': 'QAPI meeting minutes, quality improvement plans',
      'F800': 'Infection control logs, antibiotic stewardship records',
      'F835': 'QAPI program documentation, performance metrics',
      'F838': 'Facility assessment, staffing plan documentation',
      'F867': 'QAPI corrective action plans',
      'F880': 'Infection prevention program, outbreak response records',
      'F921': 'Maintenance work orders, safety inspection logs',
      'F944': 'Grievance logs, resident council minutes',
    };
    const getDiscoveryAngle = (ftag) => discoveryAngleMap[ftag] || 'Request CMS-2567, POC';

    // Build header and rows conditionally based on attorney mode and CA
    let regHead, regColStyles;
    if (isAttorney) {
      regHead = isCA
        ? [['F-Tag', 'CFR', 'Regulation', 'Cited', 'Severity', 'Discovery Angle', 'CA T22']]
        : [['F-Tag', 'CFR', 'Regulation', 'Cited', 'Severity', 'Discovery Angle']];
    } else {
      regHead = isCA
        ? [['F-Tag', 'Federal Regulation', 'Regulation Title', 'Times Cited', 'Highest Severity', 'CA Title 22']]
        : [['F-Tag', 'Federal Regulation', 'Regulation Title', 'Times Cited', 'Highest Severity']];
    }

    const regRows = Object.entries(uniqueFtags)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([ftag, data]) => {
        const ref = ftagReference[ftag];
        const row = [
          ftag,
          ref ? ref.cfr : '—',
          ref ? ref.title : '—',
          String(data.count),
          data.highestSeverity,
        ];
        if (isAttorney) row.push(getDiscoveryAngle(ftag));
        if (isCA) row.push(ref && ref.ca_title22 ? ref.ca_title22.replace('Title 22 ', '') : '—');
        return row;
      });

    // Column styles vary by mode
    let regColStylesFinal;
    if (isAttorney && isCA) {
      regColStylesFinal = {
        0: { cellWidth: 14, fontStyle: 'bold' },
        1: { cellWidth: 24 },
        2: { cellWidth: 30 },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 22 },
        5: { cellWidth: 38 },
        6: { cellWidth: 18, textColor: TEAL },
      };
    } else if (isAttorney) {
      regColStylesFinal = {
        0: { cellWidth: 16, fontStyle: 'bold' },
        1: { cellWidth: 28 },
        2: { cellWidth: 36 },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 24 },
        5: { cellWidth: 44 },
      };
    } else if (isCA) {
      regColStylesFinal = {
        0: { cellWidth: 16, fontStyle: 'bold' },
        1: { cellWidth: 32 },
        2: { cellWidth: 46 },
        3: { cellWidth: 13, halign: 'center' },
        4: { cellWidth: 26 },
        5: { cellWidth: 21, textColor: TEAL },
      };
    } else {
      regColStylesFinal = {
        0: { cellWidth: 18, fontStyle: 'bold' },
        1: { cellWidth: 38 },
        2: { cellWidth: 58 },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 30 },
      };
    }

    autoTable(doc, {
      startY: currentY,
      head: regHead,
      body: regRows,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2.5, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 58, 95], textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: TABLE_ALT },
      columnStyles: regColStylesFinal,
      didParseCell(data) {
        if (data.row.section === 'body' && data.column.index === 4) {
          const sev = data.cell.raw || '';
          if (sev.includes('Immediate Jeopardy')) { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; }
          else if (sev.includes('Actual Harm')) { data.cell.styles.textColor = [194, 65, 12]; data.cell.styles.fontStyle = 'bold'; }
          else if (sev.includes('Potential')) { data.cell.styles.textColor = [161, 98, 7]; }
          else if (sev.includes('Minimal')) { data.cell.styles.textColor = [21, 128, 61]; }
          else data.cell.styles.textColor = [21, 128, 61];
        }
        if (data.row.section === 'body' && data.column.index === 3) {
          const count = parseInt(data.cell.raw) || 0;
          if (count >= 3) { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; }
        }
      },
      margin: { left: margin, right: margin },
    });
    currentY = doc.lastAutoTable.finalY + 5;

    // Footer note
    checkPageBreak(12);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...STEEL);
    const footerNote = 'Federal regulations cited under 42 CFR Part 483. ' +
      (isCA ? 'California state regulations cited under Title 22, Division 5, California Code of Regulations. ' : '') +
      'Citation counts reflect available inspection data. Source: CMS Form 2567.';
    const footLines = doc.splitTextToSize(footerNote, contentWidth);
    doc.text(footLines, margin, currentY);
    currentY += footLines.length * 4 + 4;
  } else if (isAttorney) {
    // Attorney mode but no deficiency details loaded
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...STEEL);
    doc.text('Individual deficiency details not available in this report. Summary counts shown above.', margin, currentY);
    currentY += 8;
    addAlertBox(
      'Tip: Deficiency details are loaded on-demand when generating this PDF from the website. ' +
      'Visit oversightreports.com/evidence/' + facility.ccn + ' to generate the full report with detailed inspection records.',
      'info'
    );
  }
  // Consumer: no deficiency details table — top categories + summary counts above are sufficient

  if (facility.jeopardy_count > 0) {
    addAlertBox(
      'Immediate Jeopardy Context (42 CFR §488.301): Immediate jeopardy citations indicate conditions that have caused, or are likely to cause, serious injury, harm, impairment, or death to a resident. This facility has received ' +
      facility.jeopardy_count + ' such citation' + (facility.jeopardy_count > 1 ? 's' : '') + '.',
      'critical'
    );
  }

  // ---- Complaint Investigations ----
  {
    const complaintDates = new Set();
    if (facility.deficiency_details && facility.deficiency_details.length > 0) {
      facility.deficiency_details.forEach((d) => {
        if (d.is_complaint === true && d.survey_date) {
          complaintDates.add(d.survey_date);
        }
      });
    }
    const complaintCount = complaintDates.size;

    checkPageBreak(30);
    addSubHeading('Complaint-Driven Investigations');

    addDataRow('Complaint Investigations (3-year window):', String(complaintCount));
    addDataRow('National Average:', String(NATIONAL_AVG.complaint_investigations));

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const complaintNote =
      complaintCount > 0
        ? complaintCount + ' complaint-driven investigation' + (complaintCount > 1 ? 's' : '') +
          ' indicate a pattern of reported concerns from residents, families, or staff. ' +
          'Each complaint investigation was triggered by a formal complaint filed with the state survey agency.'
        : 'No complaint-driven investigations identified in the available deficiency records.';
    const cnLines = doc.splitTextToSize(complaintNote, contentWidth);
    doc.text(cnLines, margin, currentY);
    currentY += cnLines.length * 4.5 + 3;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...STEEL);
    const cmsCaveat =
      'Note: Complaint investigation data is no longer available on Care Compare as of 2/25/2026. ' +
      'This count is reconstructed from CMS Health Deficiency inspection records (2017-Dec 2025).';
    const cavLines = doc.splitTextToSize(cmsCaveat, contentWidth);
    doc.text(cavLines, margin, currentY);
    currentY += cavLines.length * 4.5 + 4;

    if (complaintCount > NATIONAL_AVG.complaint_investigations) {
      addAlertBox(
        'Above-Average Complaint Activity: ' + complaintCount + ' complaint investigations exceed the national average of ' +
        NATIONAL_AVG.complaint_investigations + ' over a 3-year period. ' +
        'Elevated complaint activity can indicate systemic care deficiencies not captured by routine inspections alone.',
        'warning'
      );
    }

    // ---- Complaint Investigation Yield (citations per investigation) — attorney only ----
    if (isAttorney && complaintCount > 0) {
      const complaintCitations = (facility.deficiency_details || []).filter(d => d.is_complaint === true).length;
      const yieldRate = (complaintCitations / complaintCount).toFixed(1);

      checkPageBreak(25);
      addSubHeading('Complaint Investigation Yield');

      addDataRow('Citations from Complaint Investigations:', String(complaintCitations));
      addDataRow('Complaint Investigations:', String(complaintCount));
      addDataRow('Citations per Investigation:', yieldRate);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BODY);
      const yieldNote =
        'When complaint investigations produce ' + yieldRate + ' citation' + (parseFloat(yieldRate) !== 1 ? 's' : '') +
        ' per investigation on average, it indicates that formal complaints filed against this facility are ' +
        (parseFloat(yieldRate) >= 2.0 ? 'highly substantiated — inspectors consistently find multiple violations per visit.' :
         parseFloat(yieldRate) >= 1.0 ? 'substantiated — inspectors typically confirm at least one violation per investigation.' :
         'partially substantiated — some investigations do not result in citations.');
      const ylLines = doc.splitTextToSize(yieldNote, contentWidth);
      doc.text(ylLines, margin, currentY);
      currentY += ylLines.length * 4.5 + 3;

      if (parseFloat(yieldRate) >= 2.0) {
        addAlertBox(
          'High Complaint Investigation Yield: ' + yieldRate + ' citations per complaint investigation. ' +
          'When inspectors consistently find multiple violations per complaint visit, it suggests the concerns ' +
          'driving complaints reflect real, systemic care deficiencies — not isolated incidents.',
          'warning'
        );
      }
    }
  }

  // ---- Fire Safety Violations ----
  if (facility.fire_deficiency_count !== null && facility.fire_deficiency_count !== undefined) {
    checkPageBreak(30);
    addSubHeading('Fire Safety Violations');

    addDataRow('Life Safety Code Violations:', String(facility.fire_deficiency_count));
    addDataRow('National Average:', String(NATIONAL_AVG.fire_deficiency_count));

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const fireNote =
      'Life Safety Code violations are cited during separate fire safety inspections conducted under NFPA 101. ' +
      'K-level violations — the most serious — indicate conditions that could impair evacuation or emergency response for a largely non-ambulatory resident population.';
    const fnLines = doc.splitTextToSize(fireNote, contentWidth);
    doc.text(fnLines, margin, currentY);
    currentY += fnLines.length * 4.5 + 4;

    if (facility.fire_deficiency_count > NATIONAL_AVG.fire_deficiency_count * 1.5) {
      addAlertBox(
        'Elevated Fire Safety Violations: ' + facility.fire_deficiency_count +
        ' Life Safety Code violations are ' +
        ((facility.fire_deficiency_count / NATIONAL_AVG.fire_deficiency_count - 1) * 100).toFixed(0) +
        '% above the national average of ' + NATIONAL_AVG.fire_deficiency_count +
        '. Serious K-level violations may indicate structural or procedural deficiencies that place residents at increased risk during emergencies.',
        'warning'
      );
    }
  }

  addVerifyLink(
    'ProPublica Nursing Home Inspect — Deficiencies & Inspections',
    'https://projects.propublica.org/nursing-homes/homes/h-' + facility.ccn
  );

  // ================================================================
  //   SECTION 5 — FINANCIAL PENALTIES
  // ================================================================

  addSectionHeader(5, 'Financial Penalties');

  addDataRow('Total Fines:', fmt(facility.total_fines || 0));
  addDataRow('Number of Fines:', String(facility.fine_count || 0));
  addDataRow('Payment Denials:', String(facility.denial_count || 0));
  currentY += 4;

  if (isAttorney && facility.penalty_timeline && facility.penalty_timeline.length > 0) {
    addSubHeading('Penalty Timeline');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    doc.text('Chronological record of all federal penalties:', margin, currentY);
    currentY += 6;

    const sortedPen = [...facility.penalty_timeline].sort(
      (a, b) => new Date(a.date || 0) - new Date(b.date || 0)
    );

    let running = 0;
    const penRows = sortedPen.map((p) => {
      const date = p.date
        ? new Date(p.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'N/A';
      const amt = p.amount || 0;
      if (amt > 0) running += amt;
      let desc = '';
      if (p.type === 'Payment Denial' && p.denial_start_date && p.denial_length_days) {
        desc = 'Payment denial starting ' +
          new Date(p.denial_start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) +
          ' for ' + p.denial_length_days + ' days';
      } else if (p.type === 'Fine') {
        desc = 'Civil monetary penalty';
      } else {
        desc = p.type || '';
      }
      return [date, fmt(amt), p.type || 'N/A', desc];
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
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 30 },
        3: { cellWidth: 84 },
      },
      didParseCell(data) {
        if (data.row.section === 'body' && data.row.index === penRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = LIGHT_BG;
        }
      },
      margin: { left: margin, right: margin },
    });
    currentY = doc.lastAutoTable.finalY + 5;
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...STEEL);
    doc.text('No penalties on record in CMS data (2023-2025).', margin, currentY);
    currentY += 8;
  }

  if (facility.total_fines > 0) {
    addAlertBox(
      isAttorney
        ? 'Civil Monetary Penalties (42 CFR §488.438): CMS imposes civil monetary penalties on facilities that fail to meet federal requirements. Penalties range from $1,000 to $21,393 per day depending on severity. This facility has been assessed ' +
          fmt(facility.total_fines) + ' in total penalties.'
        : 'This facility has been fined ' + fmt(facility.total_fines) + ' by the federal government for failing to meet care standards.',
      'info'
    );
  }
  if (facility.denial_count > 0) {
    addAlertBox(
      isAttorney
        ? 'Payment Denials (42 CFR §488.417): CMS can deny payment for new admissions when facilities are out of compliance. This facility has ' +
          facility.denial_count + ' payment denial' + (facility.denial_count > 1 ? 's' : '') + ' on record.'
        : 'Medicare stopped paying for new admissions ' + facility.denial_count + ' time' + (facility.denial_count > 1 ? 's' : '') + ' due to serious compliance failures.',
      'warning'
    );
  }

  // ---- Payment Denial Details — attorney only ----
  if (isAttorney && (facility.denial_days > 0 || facility.denial_start_date)) {
    checkPageBreak(40);
    addSubHeading('Payment Denial Details');

    if (facility.denial_days !== null && facility.denial_days !== undefined)
      addDataRow('Total Days Under Payment Denial:', String(facility.denial_days) + ' days');
    if (facility.denial_start_date)
      addDataRow('Most Recent Denial Start:', facility.denial_start_date);
    if (facility.denial_length_days !== null && facility.denial_length_days !== undefined)
      addDataRow('Most Recent Denial Duration:', String(facility.denial_length_days) + ' days');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const denialNote =
      'A CMS payment denial means the facility\'s problems were so severe that Medicare stopped paying for new admissions. ' +
      'During a denial period, the facility cannot bill Medicare or Medicaid for any newly admitted patient. ' +
      'Denial of payment is one of the most serious enforcement actions available to CMS short of facility closure.';
    const dnLines = doc.splitTextToSize(denialNote, contentWidth);
    doc.text(dnLines, margin, currentY);
    currentY += dnLines.length * 4.5 + 4;

    if (facility.denial_days > 0) {
      addAlertBox(
        'Severe Enforcement Action: CMS denied payment for new admissions for ' + facility.denial_days +
        ' total day' + (facility.denial_days > 1 ? 's' : '') + '. This is a significant regulatory action reserved for ' +
        'facilities with serious, ongoing compliance failures that pose risk to resident health and safety.',
        'critical'
      );
    }
    currentY += 4;
  }

  addVerifyLink(
    'ProPublica Nursing Home Inspect — Penalties',
    'https://projects.propublica.org/nursing-homes/homes/h-' + facility.ccn
  );

  // ================================================================
  //   SECTION 6 — CLINICAL OUTCOMES (Quality Measures)
  // ================================================================

  addSectionHeader(6, isAttorney ? 'Clinical Outcomes (Quality Measures)' : 'Quality & Resident Safety');

  if (!isAttorney) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const qualIntro = 'These measures reflect patterns in resident care that may be worth understanding, especially if they are notably different from common comparison points. Quality measures may be updated on different schedules and should be interpreted carefully.';
    const qualIntroLines = doc.splitTextToSize(qualIntro, contentWidth);
    doc.text(qualIntroLines, margin, currentY);
    currentY += qualIntroLines.length * 4.5 + 4;
  }

  if (isAttorney) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const qmIntro = 'Quality measures use actual Medicare billing data and clinical outcomes to assess facility performance — ' +
      'readmissions, infections, and successful discharges. These outcomes measure what actually happens to patients, ' +
      'not just what facilities report about their processes.';
    const qmLines = doc.splitTextToSize(qmIntro, contentWidth);
    doc.text(qmLines, margin, currentY);
    currentY += qmLines.length * 4.5 + 6;
  }

  // ---- QRP Outcomes ----
  if (facility.quality_measures?.qrp) {
    checkPageBreak(50);
    addSubHeading('SNF Quality Reporting Program (QRP) Outcomes');

    const qrp = facility.quality_measures.qrp;
    const qrpColorMap = { better: GREEN, same: AMBER, worse: RED };

    const qrpRows = [];
    if (qrp.ppr !== undefined && qrp.ppr !== null)
      qrpRows.push(['Potentially Preventable Readmissions (PPR)', qrp.ppr]);
    if (qrp.dtc !== undefined && qrp.dtc !== null)
      qrpRows.push(['Discharge to Community (DTC)', qrp.dtc]);
    if (qrp.hai !== undefined && qrp.hai !== null)
      qrpRows.push(['Healthcare-Associated Infections (HAI)', qrp.hai]);

    const qrpDisplayMap = { better: 'Better Than Average', same: 'At National Average', worse: 'Worse Than Average' };
    qrpRows.forEach(([label, value]) => {
      checkPageBreak(7);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...STEEL);
      doc.text(label, margin + 2, currentY);
      doc.setFont('helvetica', 'bold');
      const col = qrpColorMap[value] || BODY;
      doc.setTextColor(...col);
      const display = qrpDisplayMap[value] || value || 'N/A';
      doc.text(display, pageWidth - margin - 2, currentY, { align: 'right' });
      doc.setTextColor(...BODY);
      currentY += 6;
    });

    if (qrp.covid_res !== null && qrp.covid_res !== undefined)
      addDataRow('Resident COVID Vaccination Rate:', pct(qrp.covid_res));
    if (qrp.covid_staff !== null && qrp.covid_staff !== undefined)
      addDataRow('Staff COVID Vaccination Rate:', pct(qrp.covid_staff));

    currentY += 4;
  }

  // ---- VBP Performance — attorney only (too technical for families) ----
  if (isAttorney && facility.quality_measures?.vbp) {
    checkPageBreak(50);
    addSubHeading('SNF Value-Based Purchasing (VBP) Performance');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const vbpNote = 'The SNF Value-Based Purchasing program adjusts Medicare payment rates based on readmission performance. ' +
      'Lower rankings receive payment reductions; higher-performing facilities receive bonuses.';
    const vbpLines = doc.splitTextToSize(vbpNote, contentWidth);
    doc.text(vbpLines, margin, currentY);
    currentY += vbpLines.length * 4.5 + 4;

    const vbp = facility.quality_measures.vbp;
    if (vbp.r !== null && vbp.r !== undefined)
      addDataRow('VBP Ranking (percentile):', String(vbp.r));
    if (vbp.rr !== null && vbp.rr !== undefined)
      addDataRow('Readmission Rate:', (vbp.rr * 100).toFixed(2) + '%');
    if (vbp.ach !== null && vbp.ach !== undefined)
      addDataRow('Achievement Score:', String(vbp.ach));
    if (vbp.imp !== null && vbp.imp !== undefined)
      addDataRow('Improvement Score:', String(vbp.imp));

    if (vbp.r !== null && vbp.r !== undefined && vbp.r <= 25) {
      addAlertBox(
        'Bottom-Quartile VBP Ranking: This facility ranks in the bottom 25% of SNFs on Value-Based Purchasing ' +
        'performance (rank: ' + vbp.r + '). Facilities in the bottom quartile receive Medicare payment reductions. ' +
        'Poor VBP performance indicates elevated readmission rates relative to peers.',
        'warning'
      );
    }
    currentY += 4;
  }

  // ---- Claims-Based Measures — attorney only ----
  if (isAttorney && facility.quality_measures?.claims) {
    checkPageBreak(50);
    addSubHeading('Claims-Based Quality Measures');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const claimsNote = 'Claims-based measures use actual Medicare billing data — not facility self-reports — ' +
      'to calculate adjusted rates for rehospitalization and emergency department visits.';
    const claimsLines = doc.splitTextToSize(claimsNote, contentWidth);
    doc.text(claimsLines, margin, currentY);
    currentY += claimsLines.length * 4.5 + 4;

    const claimsMap = { '521': 'Rehospitalized within 30 days', '522': 'Emergency Room visits' };
    const claims = facility.quality_measures.claims;
    const claimsRows = [];
    Object.entries(claims).forEach(([code, vals]) => {
      if (vals && (vals.adj !== undefined || vals.obs !== undefined)) {
        const label = claimsMap[code] || ('Measure ' + code);
        claimsRows.push([
          label,
          vals.adj != null ? vals.adj.toFixed(2) + '%' : 'N/A',
          vals.obs != null ? vals.obs.toFixed(2) + '%' : 'N/A',
          vals.exp != null ? vals.exp.toFixed(2) + '%' : 'N/A',
        ]);
      }
    });

    if (claimsRows.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Measure', 'Adjusted Rate', 'Observed Rate', 'Expected Rate']],
        body: claimsRows,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 4, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
        headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: TABLE_ALT },
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: 32, halign: 'right' },
          2: { cellWidth: 28, halign: 'right' },
          3: { cellWidth: 28, halign: 'right' },
        },
        margin: { left: margin, right: margin },
      });
      currentY = doc.lastAutoTable.finalY + 5;
      doc.setCharSpace(0);
      if (doc.internal) doc.internal.write('0 Tc');
    } else {
      doc.setCharSpace(0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...STEEL);
      doc.text('Claims-based measure data not available for this facility.', margin, currentY);
      currentY += 8;
    }
  }

  if (!facility.quality_measures?.qrp && !facility.quality_measures?.vbp && !facility.quality_measures?.claims) {
    doc.setCharSpace(0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...STEEL);
    doc.text('Quality measure data not available for this facility.', margin, currentY);
    currentY += 8;
  }

  addVerifyLink(
    'Medicare Care Compare — Quality Measures',
    'https://www.medicare.gov/care-compare/details/nursing-home/' + facility.ccn + '?id=' + facility.ccn + '&measures=quality'
  );

  // ================================================================
  //   SECTION 7 — ANTIPSYCHOTIC PRESCRIBING & CHEMICAL RESTRAINT
  // ================================================================

  if (isAttorney) {
    addSectionHeader(7, 'Antipsychotic Prescribing & Chemical Restraint Risk');
  }
  // Consumer: antipsychotic data is folded into Quality & Resident Safety — skip section header
  if (!isAttorney) {
    checkPageBreak(30);
    addSubHeading('Antipsychotic Medication Use');
  }

  if (antipsychoticData) {
    const ap = antipsychoticData;
    const riskColor = ap.risk_level === 'critical' ? RED : ap.risk_level === 'high' ? AMBER : ap.risk_level === 'elevated' ? AMBER : STEEL;
    const riskBg = ap.risk_level === 'critical' ? RED_BG : ap.risk_level === 'high' ? AMBER_BG : ap.risk_level === 'elevated' ? AMBER_BG : LIGHT_BG;

    // Intro paragraph
    doc.setCharSpace(0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const apIntro = isAttorney
      ? 'Antipsychotic medications (e.g., haloperidol, quetiapine, risperidone) are powerful sedating drugs that carry FDA black-box warnings ' +
        'when used in elderly patients. Their use as "chemical restraints" — to sedate residents rather than treat a documented psychiatric condition — is a ' +
        'federally recognized patient rights violation (42 CFR §483.12). The March 2026 OIG report "Nursing Home Use of Antipsychotic Drugs" identified ' +
        'widespread overuse and flagged facilities with rates significantly exceeding national norms as priorities for federal investigation.'
      : 'Antipsychotic medications are powerful sedating drugs that carry FDA warnings when used in elderly patients. ' +
        'These drugs are sometimes used appropriately for psychiatric conditions, but overuse can be a sign of "chemical restraint" — ' +
        'sedating residents for convenience rather than medical need.';
    const apLines = doc.splitTextToSize(apIntro, contentWidth);
    doc.text(apLines, margin, currentY);
    currentY += apLines.length * 4.5 + 6;

    // Key metrics box
    checkPageBreak(50);
    addSubHeading('Prescribing Metrics');

    // Rate comparison row
    addDataRow('Antipsychotic Prescribing Rate:', ap.antipsychotic_rate.toFixed(1) + '%');
    addDataRow('National Average:', ap.national_avg.toFixed(1) + '%');
    const rateRatio = (ap.antipsychotic_rate / ap.national_avg).toFixed(1);
    addDataRow('Relative to National Average:', rateRatio + 'x the national rate');

    if (ap.yoy_trend) {
      const trendText = ap.yoy_trend === 'increasing' ? 'Increasing year-over-year' :
        ap.yoy_trend === 'decreasing' ? 'Decreasing year-over-year' : 'Stable year-over-year';
      addDataRow('Year-Over-Year Trend:', trendText);
    }

    if (ap.prescriber_concentration != null && ap.prescriber_concentration >= 0.9) {
      addDataRow('Prescriber Concentration:', Math.round(ap.prescriber_concentration * 100) + '% of claims from one prescriber');
    }

    currentY += 4;

    // Risk level callout
    checkPageBreak(20);
    const riskText = ap.risk_level === 'critical'
      ? 'CRITICAL RISK: This facility\'s antipsychotic prescribing rate is severely elevated and meets federal criteria for priority investigation.'
      : ap.risk_level === 'high'
      ? 'HIGH RISK: This facility\'s antipsychotic prescribing rate significantly exceeds national norms and warrants clinical scrutiny.'
      : 'ELEVATED RISK: This facility\'s antipsychotic prescribing rate is above expected levels.';

    doc.setCharSpace(0);
    const riskLines = doc.splitTextToSize('Risk Level: ' + ap.risk_level.toUpperCase() + ' — ' + riskText, contentWidth - 12);
    const riskBoxH = riskLines.length * 4.5 + 6;
    doc.setFillColor(...riskBg);
    doc.rect(margin, currentY, contentWidth, riskBoxH, 'F');
    doc.setFillColor(...riskColor);
    doc.rect(margin, currentY, 3, riskBoxH, 'F');
    doc.setTextColor(...riskColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(riskLines, margin + 6, currentY + 4.5);
    currentY += riskBoxH + 4;
    doc.setFillColor(255, 255, 255);

    // Chemical restraint flag
    if (ap.chemical_restraint_flag) {
      checkPageBreak(20);
      addAlertBox(
        'CHEMICAL RESTRAINT FLAG: This facility meets criteria for potential chemical restraint use — ' +
        'a combination of low RN staffing and high antipsychotic prescribing. Chemical restraint (sedating residents ' +
        'for staff convenience rather than clinical need) is prohibited under 42 CFR §483.12(a)(2) and constitutes ' +
        'a violation of residents\' right to be free from unnecessary restraint.',
        'critical'
      );
    }

    // Schizophrenia/Bipolar diagnosis rate — attorney only
    if (isAttorney && ap.schizophrenia_dx_rate != null && ap.schizophrenia_state_avg != null) {
      checkPageBreak(30);
      addSubHeading('Psychiatric Diagnosis Context');
      doc.setCharSpace(0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BODY);
      const dxNote = 'Antipsychotic use is clinically appropriate for residents with documented schizophrenia or bipolar disorder. ' +
        'A high schizophrenia/bipolar diagnosis rate relative to state norms may indicate legitimate clinical need — or may indicate ' +
        'that diagnoses are being used to justify antipsychotic prescribing that would otherwise require justification.';
      const dxLines = doc.splitTextToSize(dxNote, contentWidth);
      doc.text(dxLines, margin, currentY);
      currentY += dxLines.length * 4.5 + 4;

      addDataRow('Schizophrenia/Bipolar Dx Rate:', ap.schizophrenia_dx_rate.toFixed(1) + '%');
      addDataRow('State Average Dx Rate:', ap.schizophrenia_state_avg.toFixed(1) + '%');
      if (ap.schizophrenia_yoy_change != null) {
        const changeStr = (ap.schizophrenia_yoy_change >= 0 ? '+' : '') + ap.schizophrenia_yoy_change.toFixed(1) + 'pp year-over-year';
        addDataRow('Dx Rate Change (YOY):', changeStr);
      }
      currentY += 4;
    }

    // Documented risk factors — attorney only
    if (isAttorney && Array.isArray(ap.factors) && ap.factors.length > 0) {
      checkPageBreak(30);
      addSubHeading('Documented Risk Factors');
      ap.factors.forEach((factor) => {
        checkPageBreak(8);
        doc.setCharSpace(0);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BODY);
        doc.text('\u2022  ' + factor, margin + 4, currentY);
        currentY += 5.5;
      });
      currentY += 2;
    }

    addVerifyLink(
      'CMS Medicare Part D Prescriber Data — antipsychotic claims by facility',
      'https://data.cms.gov/provider-data/dataset/v6jf-q476'
    );
  } else {
    // Force-reset charSpace via both API and raw PDF operator
    doc.setCharSpace(0);
    if (doc.internal) doc.internal.write('0 Tc');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...STEEL);
    const apNote = 'Antipsychotic medications carry FDA black-box warnings in elderly patients and are a known tool of chemical restraint ' +
      '(42 CFR §483.12). The March 2026 OIG report identified facilities with rates exceeding national norms as enforcement priorities. ' +
      'This facility\'s antipsychotic prescribing rate did not reach the elevated threshold (risk score >= 3) that triggers inclusion ' +
      'in our alert dataset, suggesting prescribing patterns are within expected ranges. This finding should be verified directly ' +
      'with CMS Part D data for the most current information.';
    const apLines = doc.splitTextToSize(apNote, contentWidth);
    doc.setCharSpace(0);
    if (doc.internal) doc.internal.write('0 Tc');
    doc.text(apLines, margin, currentY);
    currentY += apLines.length * 4.5 + 8;
  }

  // ================================================================
  //   SECTION 8 — RED FLAGS
  // ================================================================

  if (isAttorney) {
    addSectionHeader(8, 'Red Flags & Accountability Indicators');
  } else {
    checkPageBreak(30);
    addSubHeading('Areas of Concern');
  }

  const redFlags = [];

  if (facility.jeopardy_count > 0)
    redFlags.push({ metric: 'Immediate Jeopardy: ' + facility.jeopardy_count + ' citation' + (facility.jeopardy_count > 1 ? 's' : ''), detail: 'Immediate jeopardy citations (42 CFR §488.301) indicate the most serious form of noncompliance — conditions that have caused, or are likely to cause, serious injury, harm, impairment, or death.', type: 'critical' });
  if (facility.harm_count > 0)
    redFlags.push({ metric: 'Actual Harm: ' + facility.harm_count + ' citation' + (facility.harm_count > 1 ? 's' : ''), detail: 'Actual harm citations indicate residents were directly and negatively affected by facility practices or conditions.', type: 'critical' });
  if (facility.total_hprd && facility.total_hprd < 3.48)
    redFlags.push({ metric: 'Total Staffing Below 3.48 HPRD: ' + num(facility.total_hprd) + ' hours', detail: 'In February 2026, 18 state Attorneys General called 3.48 HPRD the minimum safe staffing level. This facility is ' + ((1 - facility.total_hprd / 3.48) * 100).toFixed(0) + '% below that threshold.', type: 'warning' });
  if (facility.zero_rn_pct > 25)
    redFlags.push({ metric: 'High Zero-RN Days: ' + pct(facility.zero_rn_pct), detail: 'Federal law (42 CFR §483.35) requires an RN on site at least 8 hours per day, 7 days per week.', type: 'warning' });
  if (facility.rn_gap_pct > 30)
    redFlags.push({ metric: 'Staffing Verification Gap: ' + pct(facility.rn_gap_pct), detail: 'Large discrepancies between self-reported and payroll-verified staffing may warrant investigation.', type: 'warning' });
  if (facility.total_fines > 100000)
    redFlags.push({ metric: 'High Financial Penalties: ' + fmt(facility.total_fines), detail: 'Repeated or severe violations resulted in substantial civil monetary penalties.', type: 'warning' });
  if (facility.contractor_pct && facility.contractor_pct > 30)
    redFlags.push({ metric: 'High Contract Staffing: ' + pct(facility.contractor_pct), detail: 'Research links high contract staffing rates to continuity of care concerns.', type: 'info' });

  if (redFlags.length > 0) {
    redFlags.forEach((flag) => addRedFlagCard(flag.metric, flag.detail, flag.type));
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...STEEL);
    doc.text('No major red flags identified in available federal data.', margin, currentY);
    currentY += 8;
  }

  // ---- Component Scores Breakdown — attorney only ----
  if (isAttorney) {
    const scoreComponents = [];
    if (facility.staffing_score !== null && facility.staffing_score !== undefined)
      scoreComponents.push(['Staffing', facility.staffing_score.toFixed(1)]);
    if (facility.quality_score !== null && facility.quality_score !== undefined)
      scoreComponents.push(['Quality Measures', facility.quality_score.toFixed(1)]);
    if (facility.ownership_score !== null && facility.ownership_score !== undefined)
      scoreComponents.push(['Ownership', facility.ownership_score.toFixed(1)]);
    if (facility.penalty_score !== null && facility.penalty_score !== undefined)
      scoreComponents.push(['Financial Penalties', facility.penalty_score.toFixed(1)]);
    if (facility.fire_safety_score !== null && facility.fire_safety_score !== undefined)
      scoreComponents.push(['Fire Safety', facility.fire_safety_score.toFixed(1)]);

    if (scoreComponents.length > 0) {
      checkPageBreak(45);
      addSubHeading('Risk Score Component Breakdown');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BODY);
      const compNote = 'The composite risk score is built from component sub-scores. ' +
        'This breakdown shows which areas drive the overall score, useful for identifying the primary basis for legal or regulatory action.';
      const compLines = doc.splitTextToSize(compNote, contentWidth);
      doc.text(compLines, margin, currentY);
      currentY += compLines.length * 4.5 + 4;

      scoreComponents.push(['COMPOSITE SCORE', (facility.composite || 0).toFixed(1)]);

      autoTable(doc, {
        startY: currentY,
        head: [['Risk Component', 'Score (0–100)']],
        body: scoreComponents,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
        headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 9.5 },
        alternateRowStyles: { fillColor: TABLE_ALT },
        columnStyles: {
          0: { cellWidth: 100, fontStyle: 'bold' },
          1: { cellWidth: 58, halign: 'right', fontStyle: 'bold' },
        },
        didParseCell(data) {
          if (data.row.section === 'body') {
            if (data.row.index === scoreComponents.length - 1) {
              data.cell.styles.fillColor = LIGHT_BG;
              data.cell.styles.fontStyle = 'bold';
            } else if (data.column.index === 1) {
              const v = parseFloat(data.row.raw[1]);
              if (!isNaN(v)) {
                if (v >= 60) data.cell.styles.textColor = RED;
                else if (v >= 40) data.cell.styles.textColor = AMBER;
                else data.cell.styles.textColor = GREEN;
              }
            }
          }
        },
        margin: { left: margin, right: margin },
      });
      currentY = doc.lastAutoTable.finalY + 6;
    }
  }

  // ================================================================
  //   SECTION — QUESTIONS TO ASK (consumer only)
  // ================================================================

  if (!isAttorney) {
    addSectionHeader(7, 'Questions to Ask the Facility');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const qIntro = 'These questions are based on the data in this report. They are designed to help you have informed conversations with the facility\'s staff and administration.';
    const qIntroLines = doc.splitTextToSize(qIntro, contentWidth);
    doc.text(qIntroLines, margin, currentY);
    currentY += qIntroLines.length * 4.5 + 6;

    const questions = generateQuestionsToAsk();
    questions.forEach((q, i) => {
      checkPageBreak(16);
      // Numbered question with callout styling
      const qLines = doc.splitTextToSize(q, contentWidth - 14);
      const qBoxH = qLines.length * 4.5 + 6;
      doc.setFillColor(...LIGHT_BG);
      doc.rect(margin + 3, currentY - 1, contentWidth - 3, qBoxH, 'F');
      doc.setFillColor(...TEAL);
      doc.rect(margin, currentY - 1, 3, qBoxH, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEAL);
      doc.text((i + 1) + '.', margin + 6, currentY + 4);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BODY);
      doc.text(qLines, margin + 12, currentY + 4);
      currentY += qBoxH + 3;
    });
    currentY += 6;

    // Reminder note
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...STEEL);
    const qNote = 'Tip: You can bring a copy of this report when visiting the facility. Staff should be willing to discuss any of these topics openly.';
    const qNoteLines = doc.splitTextToSize(qNote, contentWidth);
    doc.text(qNoteLines, margin, currentY);
    currentY += qNoteLines.length * 4 + 6;
  }

  // ================================================================
  //   SECTION — COMPARISON CONTEXT
  // ================================================================

  addSectionHeader(isAttorney ? 9 : 8, 'Comparison Context');

  addSubHeading('How This Facility Compares');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BODY);
  const ctxIntro = 'Key metrics for ' + facility.name + ' compared against national averages. Percentile rankings are estimated relative to all ' + allFacilities.length.toLocaleString() + ' nursing homes nationwide.';
  const ctxLines = doc.splitTextToSize(ctxIntro, contentWidth);
  doc.text(ctxLines, margin, currentY);
  currentY += ctxLines.length * 4.5 + 6;

  const estPercentile = (val, avg, lowerBetter) => {
    if (val === null || val === undefined) return 'N/A';
    const r = val / avg;
    let p;
    if (lowerBetter) p = r < 0.5 ? 90 : r < 0.8 ? 70 : r < 1.2 ? 50 : r < 2 ? 30 : 10;
    else p = r > 2 ? 90 : r > 1.2 ? 70 : r > 0.8 ? 50 : r > 0.5 ? 30 : 10;
    return p + 'th';
  };

  const cmpRows = [
    ['CMS Stars', (facility.stars || 0) + '/5', NATIONAL_AVG.stars + '/5', estPercentile(facility.stars, NATIONAL_AVG.stars, false)],
    ['Risk Score', (facility.composite || 0).toFixed(1), NATIONAL_AVG.composite.toFixed(1), estPercentile(facility.composite, NATIONAL_AVG.composite, true)],
    ['Total Staffing HPRD', num(facility.total_hprd), NATIONAL_AVG.total_hprd.toFixed(2), estPercentile(facility.total_hprd, NATIONAL_AVG.total_hprd, false)],
    ['RN Staffing HPRD', num(facility.rn_hprd), NATIONAL_AVG.rn_hprd.toFixed(2), estPercentile(facility.rn_hprd, NATIONAL_AVG.rn_hprd, false)],
    ['Zero-RN Day %', pct(facility.zero_rn_pct), NATIONAL_AVG.zero_rn_pct + '%', estPercentile(facility.zero_rn_pct, NATIONAL_AVG.zero_rn_pct, true)],
    ['Total Deficiencies', String(facility.total_deficiencies || 0), NATIONAL_AVG.total_deficiencies.toFixed(1), estPercentile(facility.total_deficiencies, NATIONAL_AVG.total_deficiencies, true)],
    ['Total Fines', fmt(facility.total_fines || 0), fmt(NATIONAL_AVG.total_fines), estPercentile(facility.total_fines, NATIONAL_AVG.total_fines, true)],
    ['Contract Staffing %', pct(facility.contractor_pct), NATIONAL_AVG.contractor_pct + '%', estPercentile(facility.contractor_pct, NATIONAL_AVG.contractor_pct, true)],
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
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 35, halign: 'right' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell(data) {
      if (data.column.index === 3 && data.row.section === 'body') {
        const p = data.row.raw[3];
        if (typeof p === 'string' && p.includes('th')) {
          const v = parseInt(p);
          if (!isNaN(v)) {
            if (v >= 70) data.cell.styles.textColor = GREEN;
            else if (v <= 30) data.cell.styles.textColor = RED;
          }
        }
      }
    },
    margin: { left: margin, right: margin },
  });
  currentY = doc.lastAutoTable.finalY + 8;

  // ================================================================
  //   SECTION 10 — NEARBY ALTERNATIVES (consumer only)
  // ================================================================

  if (!isAttorney) {
  addSectionHeader(9, 'Nearby Alternatives');

  if (nearbyAlternatives && nearbyAlternatives.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    // Check how many are genuinely better (3+ stars or risk < 40)
    const goodAlts = nearbyAlternatives.filter((a) => (a.stars >= 3) || (a.composite && a.composite < 40));
    const qualityNote = goodAlts.length < nearbyAlternatives.length
      ? ' Note: limited higher-rated alternatives are available in this area; some listed facilities also have significant concerns.'
      : '';
    const altIntro = 'The following facilities within a reasonable distance have lower risk scores than ' +
      facility.name + '. This comparison is provided for reference purposes only and does not constitute a recommendation.' + qualityNote;
    const altLines = doc.splitTextToSize(altIntro, contentWidth);
    doc.text(altLines, margin, currentY);
    currentY += altLines.length * 4.5 + 6;

    // Compute distances if not already present, using haversine
    const hasCoords = facility.lat && facility.lon;
    const altsWithDist = nearbyAlternatives.slice(0, 10).map((alt) => {
      let dist = alt.distance;
      if ((dist === undefined || dist === null) && hasCoords && alt.lat && alt.lon) {
        dist = haversineDistance(facility.lat, facility.lon, alt.lat, alt.lon);
      }
      return { ...alt, _dist: dist };
    });

    // Decide whether to show distance column based on data availability
    const anyDist = altsWithDist.some((a) => a._dist !== null && a._dist !== undefined);

    let altHead, altBody, altColStyles;
    if (anyDist) {
      altHead = [['Facility', 'Distance', 'City', 'Stars', 'Risk', 'HPRD', 'Fines']];
      altBody = altsWithDist.map((a) => [
        a.name,
        a._dist !== null && a._dist !== undefined ? a._dist.toFixed(1) + ' mi' : 'N/A',
        (a.city || '') + ', ' + (a.state || ''),
        (a.stars || 0) + '/5',
        a.composite ? a.composite.toFixed(1) : 'N/A',
        a.total_hprd ? num(a.total_hprd) : 'N/A',
        fmt(a.total_fines || 0),
      ]);
      altColStyles = {
        0: { cellWidth: 46 },
        1: { cellWidth: 22, halign: 'right' },
        2: { cellWidth: 30 },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 18, halign: 'right' },
        6: { cellWidth: 24, halign: 'right' },
      };
    } else {
      // No distance data — omit column
      altHead = [['Facility', 'City', 'Stars', 'Risk Score', 'Total HPRD', 'Total Fines']];
      altBody = altsWithDist.map((a) => [
        a.name,
        (a.city || '') + ', ' + (a.state || ''),
        (a.stars || 0) + '/5',
        a.composite ? a.composite.toFixed(1) : 'N/A',
        a.total_hprd ? num(a.total_hprd) : 'N/A',
        fmt(a.total_fines || 0),
      ]);
      altColStyles = {
        0: { cellWidth: 52 },
        1: { cellWidth: 35 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
      };
    }

    autoTable(doc, {
      startY: currentY,
      head: altHead,
      body: altBody,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 4, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
      headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: TABLE_ALT },
      columnStyles: altColStyles,
      margin: { left: margin, right: margin },
    });
    currentY = doc.lastAutoTable.finalY + 5;
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...STEEL);
    doc.text('No nearby facilities with better scores found within search radius.', margin, currentY);
    currentY += 8;
  }
  } // end if (!isAttorney) — skip Nearby Alternatives for attorney reports

  // ================================================================
  //   SUGGESTED RECORDS TO REQUEST (attorney mode only)
  // ================================================================

  if (isAttorney) {
    addNewPage();
    addSectionHeader(10, 'Suggested Records to Request');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const recIntro = 'Based on this facility\'s deficiency patterns and enforcement history, the following records may be relevant to discovery or pre-litigation case evaluation. All items are standard records that Medicare-certified facilities are required to maintain.';
    const recLines = doc.splitTextToSize(recIntro, contentWidth);
    doc.text(recLines, margin, currentY);
    currentY += recLines.length * 4.5 + 6;

    const recordCategories = [
      ['Staffing Records', [
        'Payroll-Based Journal (PBJ) daily nurse staffing submissions',
        'Staff schedules (all shifts) for relevant time period',
        'Agency/contract staffing invoices and assignments',
        'RN coverage logs and on-call records',
        'Staff competency evaluations and in-service training records',
      ]],
      ['Inspection & Compliance', [
        'CMS Form 2567 — Statement of Deficiencies and Plan of Correction',
        'State survey agency correspondence and revisit reports',
        'Facility\'s written Plans of Correction for all cited deficiencies',
        'Internal compliance audit reports',
      ]],
      ['Clinical Records', [
        'Comprehensive care plans and MDS assessments for affected resident(s)',
        'Incident/accident reports for relevant time period',
        'Medication administration records (MARs)',
        'Physician orders (including PRN psychotropic medications)',
        'Nursing notes and shift reports',
      ]],
      ['Quality Assurance', [
        'QAPI meeting minutes and quality improvement plans',
        'Abuse investigation records and state agency notifications',
        'Grievance logs and resident/family complaint records',
        'Resident council meeting minutes',
      ]],
      ['Corporate & Financial', [
        'Management agreements and related-party transaction disclosures',
        'Ownership change documentation (if applicable)',
        'Insurance policies (general liability, professional liability)',
        'Cost report filings (CMS-2540)',
      ]],
    ];

    recordCategories.forEach(([category, items]) => {
      checkPageBreak(20 + items.length * 6);
      addSubHeading(category);
      items.forEach((item) => {
        checkPageBreak(7);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BODY);
        const itemLines = doc.splitTextToSize('\u2022  ' + item, contentWidth - 8);
        doc.text(itemLines, margin + 4, currentY);
        currentY += itemLines.length * 4 + 2;
      });
      currentY += 4;
    });
  }

  // ================================================================
  //   METHODOLOGY SECTION (always starts on a new page)
  // ================================================================

  const methodSectionNum = isAttorney ? 11 : 10;

  addNewPage();
  addSectionHeader(methodSectionNum, 'Data Sources & Methodology');

  addSubHeading('Data Sources');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BODY);
  doc.text('All data sourced from publicly available federal databases:', margin, currentY);
  currentY += 5;

  const sources = [
    ['CMS Care Compare — Provider Information & Star Ratings (' + DATA_DATE + ')', 'https://data.cms.gov/provider-data/'],
    ['CMS NH Provider Info — Reported Staffing HPRD & Turnover (' + DATA_DATE + ')', 'https://data.cms.gov/provider-data/dataset/4pq5-n9py'],
    ['CMS Health Deficiencies — State Survey Inspections (2017–2025)', 'https://data.cms.gov/provider-data/dataset/r5ix-sfxw'],
    ['CMS Penalties — Civil Monetary Penalties & Payment Denials (' + DATA_DATE + ')', 'https://data.cms.gov/provider-data/dataset/g6vv-u9sr'],
    ['CMS Ownership Database — Corporate Structure (January 2026)', 'https://data.cms.gov/provider-data/dataset/y2hd-n93e'],
    ['CMS HCRIS Cost Reports (FY2024 related-party transactions)', 'https://www.cms.gov/Research-Statistics-Data-and-Systems/Downloadable-Public-Use-Files/Cost-Reports'],
    ['CMS Medicare Part D Prescriber Data (Antipsychotic Claims, 2023)', 'https://data.cms.gov/provider-data/dataset/v6jf-q476'],
    ['OIG Report: Nursing Home Use of Antipsychotic Drugs (March 2026)', 'https://oig.hhs.gov/reports/'],
  ];
  sources.forEach(([label, url]) => {
    checkPageBreak(10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BODY);
    doc.text('    ' + label, margin + 2, currentY);
    currentY += 4;
    doc.setFontSize(7.5);
    doc.setTextColor(41, 98, 168);
    doc.textWithLink('    ' + url, margin + 2, currentY, { url: url });
    currentY += 6;
  });
  currentY += 4;

  // Data Freshness Table
  checkPageBreak(50);
  addSubHeading('Data Freshness');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BODY);
  doc.text('Each data source has a different update cadence. This table shows the most recent data available at report generation.', margin, currentY);
  currentY += 6;

  const freshnessRows = [
    ['Provider Information & Stars', DATA_DATE, 'Monthly'],
    ['Reported Staffing (HPRD)', DATA_DATE, 'Quarterly'],
    ['Health Deficiencies (CMS-2567)', '2017 – Dec 2025', 'Ongoing (inspection-triggered)'],
    ['Penalties & Payment Denials', DATA_DATE, 'Monthly'],
    ['Ownership Database', 'January 2026', 'Quarterly'],
    ['Part D Prescriber (Antipsychotics)', '2023', 'Annual'],
    ['Quality Measures (MDS)', DATA_DATE, 'Quarterly'],
    ['Fire Safety Inspections', DATA_DATE, 'Ongoing (inspection-triggered)'],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Dataset', 'Data As Of', 'Update Cadence']],
    body: freshnessRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
    headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: TABLE_ALT },
    columnStyles: {
      0: { cellWidth: 65, fontStyle: 'bold' },
      1: { cellWidth: 45, halign: 'center' },
      2: { cellWidth: 55 },
    },
    margin: { left: margin, right: margin },
  });
  currentY = doc.lastAutoTable.finalY + 8;

  addSubHeading('Composite Risk Score Formula');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Weighted composite of multiple factors (scale: 0-100):', margin, currentY);
  currentY += 5;

  const weights = [
    'Staffing Levels: 30% (verified payroll vs. self-reported, zero-RN days)',
    'Inspection Results: 25% (deficiencies, serious harm, harm citations)',
    'Financial Penalties: 20% (civil monetary penalties, payment denials)',
    'Ownership History: 15% (portfolio performance, ownership changes)',
    'Quality Measures: 10% (CMS star rating components)',
  ];
  weights.forEach((w) => {
    checkPageBreak(6);
    doc.text('    ' + w, margin + 2, currentY);
    currentY += 5;
  });
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
    ['42 CFR §483.35 — Nursing Services (RN staffing requirements)', 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.35'],
    ['42 CFR §488.301 — Definitions (Immediate Jeopardy)', 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-488/subpart-F/section-488.301'],
    ['42 CFR §488.417 — Denial of Payment (New Admissions)', 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-488/subpart-F/section-488.417'],
    ['42 CFR §488.438 — Civil Monetary Penalties', 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-488/subpart-F/section-488.438'],
  ];
  cfrRefs.forEach(([label, url]) => {
    checkPageBreak(10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BODY);
    doc.text('    ' + label, margin + 2, currentY);
    currentY += 4;
    doc.setFontSize(7.5);
    doc.setTextColor(41, 98, 168);
    doc.textWithLink('    ' + url, margin + 2, currentY, { url: url });
    currentY += 6;
  });
  currentY += 6;

  // ── Methodology & Verification paragraph ──
  checkPageBreak(30);
  addSubHeading('Methodology & Verification');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BODY);
  const methodologyPara = 'The Oversight Report compiles findings from structured public CMS datasets and selected state sources, then normalizes and cross-references those records into a facility-level evidence file with source dates, versioning, and citations. Attorney-facing reports are generated from a frozen evidence bundle and reviewed through a verification workflow that checks data freshness, numeric consistency, citation support, benchmark validity, and language safety before release. Reports that contain unresolved inconsistencies, low-confidence joins, or unsupported claims are held for human review rather than delivered automatically. This approach is designed to make each report traceable, contestable, and defensible.';
  const methLines = doc.splitTextToSize(methodologyPara, contentWidth - 4);
  doc.text(methLines, margin + 2, currentY);
  currentY += methLines.length * 4.5 + 4;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.text('Every substantive claim is tied to a source record, reviewed for consistency, and delivered with clear data dates and limitations.', margin + 2, currentY);
  currentY += 10;

  // ================================================================
  //   SECTION 12 — DISCLAIMER (always starts on a new page)
  // ================================================================

  const disclaimerSectionNum = methodSectionNum + 1;
  addNewPage();
  addSectionHeader(disclaimerSectionNum, 'Disclaimer');

  const disclaimers = [
    'This report is generated from public CMS and state datasets using a structured evidence workflow with source dates, citations, and verification checks for numeric consistency, freshness, and language safety. Attorney-facing outputs undergo human review before release; the report is intended as an evidence-organizing tool, not a substitute for independent legal analysis or case-specific investigation.',
    'This document does not constitute legal advice, medical advice, or a recommendation for or against any specific facility. Risk scores represent patterns in federal data that may warrant further investigation.',
    'Facilities should be evaluated through personal visits, consultation with healthcare professionals, and review of current inspection reports. Conditions may have changed since data collection.',
    'If you have concerns about a nursing home, contact: Your state survey agency (health department), HHS Office of Inspector General (tips.hhs.gov), or National Eldercare Locator (1-800-677-1116).',
    'DataLink Clinical reserves provenance fingerprint dlc-prov-2026q2 for forensic verification of unauthorized reproduction.',
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
  //   FOOTERS — "Page X of Y" on every page
  // ================================================================

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...STEEL);
    doc.setFont('helvetica', 'normal');

    // Left: facility name + CCN
    doc.text(facility.name + '  |  CCN: ' + facility.ccn, margin, pageHeight - 10);

    // Right: Page X of Y
    doc.text('Page ' + i + ' of ' + totalPages, pageWidth - margin, pageHeight - 10, { align: 'right' });

    // Centre: source line
    doc.setFontSize(7);
    doc.text(
      'Source: CMS Provider Data  |  Generated by The Oversight Report  |  oversightreports.com',
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );

    // ── Invisible canary token (white-on-white, ~4pt) ──
    // Travels in the PDF text layer. Findable via grep on extracted text but invisible to readers.
    doc.setFontSize(4);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'DLC-PROVENANCE: dlc-prov-2026q2-9c4f5b3a — © DataLink Clinical LLC — oversightreports.com',
      pageWidth / 2,
      pageHeight - 1,
      { align: 'center' }
    );
  }

  // ================================================================
  //   SAVE
  // ================================================================

  const cleanName = facility.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  const filename = isAttorney
    ? 'OversightReport_Attorney_' + cleanName + '_' + dateStr + '.pdf'
    : 'OversightReport_Family_' + cleanName + '_' + dateStr + '.pdf';

  doc.save(filename);
}
