import jsPDFModule from 'jspdf';
import autoTable from 'jspdf-autotable';

const jsPDF = jsPDFModule.jsPDF || jsPDFModule;

/**
 * Generates a professional, litigation-ready Evidence Package PDF.
 *
 * @param {Object} facility - The facility data object
 * @param {Array} nearbyAlternatives - Array of nearby facilities with better scores
 * @param {Array} allFacilities - All facilities for ownership portfolio analysis
 */
export function generateEvidencePDF(facility, nearbyAlternatives = [], allFacilities = []) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

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
    total_hprd: 3.82,
    rn_hprd: 0.54,
    cna_hprd: 2.18,
    zero_rn_pct: 8.0,
    composite: 32.1,
    total_fines: 28000,
    stars: 3.2,
    total_deficiencies: 8.5,
    contractor_pct: 12.0,
  };

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
      if (currentY + (minSpace || 60) > pageHeight - 22) {
        addNewPage();
      }
    }
  }

  /** Numbered navy-bar section header. */
  function addSectionHeader(number, title) {
    ensureNewSection(50);
    doc.setFillColor(...NAVY);
    doc.rect(margin, currentY, contentWidth, 10, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(number + '. ' + title, margin + 4, currentY + 7);
    doc.setTextColor(...BODY);
    currentY += 14;
  }

  /** A thin rule under sub-headings. */
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

  /** Data row: label left, value right. */
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

  /** Alert box with coloured left border. Returns new Y. */
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

  /** Metric card (label / big value / national average). */
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

  /** Red-flag card block with coloured left accent. */
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
        facility.zero_rn_pct.toFixed(1) + '% of Q3 2025), a potential violation of 42 CFR §483.35.'
      );
    }
    if (facility.jeopardy_count > 0 || facility.harm_count > 0) {
      const bits = [];
      if (facility.jeopardy_count > 0)
        bits.push(facility.jeopardy_count + ' instance' + (facility.jeopardy_count > 1 ? 's' : '') + ' of immediate jeopardy');
      if (facility.harm_count > 0)
        bits.push(facility.harm_count + ' instance' + (facility.harm_count > 1 ? 's' : '') + ' of actual harm');
      parts.push('State inspectors documented ' + bits.join(' and ') + ' — conditions posing serious danger to residents.');
    }
    if (facility.worst_owner && facility.owner_portfolio_count > 1) {
      parts.push(
        'The facility is operated by ' + facility.worst_owner +
        ', whose portfolio of ' + facility.owner_portfolio_count +
        ' facilities averages ' + (facility.owner_avg_stars || 'N/A') + ' CMS stars.'
      );
    }
    if (facility.total_hprd && facility.total_hprd < 3.48) {
      const gap = ((1 - facility.total_hprd / 3.48) * 100).toFixed(0);
      parts.push(
        'Total staffing of ' + num(facility.total_hprd) +
        ' hours per resident per day is ' + gap + '% below the 3.48 HPRD threshold cited by 18 state Attorneys General.'
      );
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

  // ======================== TODAY STRING ========================

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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

  // Three metric cards
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

  // Key Findings box
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

  // Date & confidential
  doc.setFontSize(9);
  doc.setTextColor(...STEEL);
  doc.setFont('helvetica', 'normal');
  doc.text('Generated: ' + today, pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.text('Data through: Q3 2025 (staffing) · Dec 2025 (inspections) · Jan 2026 (ownership)', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.text('oversightreports.com', pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  doc.setDrawColor(...RED);
  doc.setLineWidth(0.6);
  doc.rect(margin + 30, currentY - 3, contentWidth - 60, 9);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('CONFIDENTIAL — Prepared for authorized use', pageWidth / 2, currentY + 2, { align: 'center' });
  currentY += 14;

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
  const tocEntries = [
    ['1.', 'Executive Summary'],
    ['2.', 'Ownership Portfolio'],
    ['3.', 'Staffing Analysis'],
    ['4.', 'Inspection History'],
    ['5.', 'Financial Penalties'],
    ['6.', 'Red Flags & Accountability Indicators'],
    ['7.', 'Comparison Context'],
    ['8.', 'Nearby Alternatives'],
    ['9.', 'Data Sources & Methodology'],
    ['10.', 'Disclaimer'],
  ];

  tocEntries.forEach(([num, title]) => {
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
    const lineStart = margin + 16 + titleW + 2;
    const lineEnd = pageWidth - margin;
    for (let x = lineStart; x < lineEnd; x += 2) {
      doc.line(x, currentY, x + 0.5, currentY);
    }

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
  const aboutText = 'This report compiles data from 6 federal databases maintained by the Centers for Medicare & Medicaid Services (CMS). It is designed to support families evaluating care options, attorneys conducting discovery, journalists investigating patterns, and regulators monitoring compliance. All data is publicly available and independently verifiable against original sources.';
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
  //   PAGE 3 — SECTION 1: EXECUTIVE SUMMARY
  // ================================================================

  addNewPage();
  addSectionHeader(1, 'Executive Summary');

  // Metric row
  const mw = (contentWidth - 10) / 3;
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
  currentY += summaryLines.length * 4.5 + 10;

  // ================================================================
  //   SECTION 2 — OWNERSHIP PORTFOLIO
  // ================================================================

  addSectionHeader(2, 'Ownership Portfolio');

  addDataRow('Owner Name:', facility.worst_owner || 'N/A');
  if (facility.chain_name) addDataRow('Chain Name:', facility.chain_name);
  addDataRow('Ownership Type:', facility.ownership_type || 'N/A');

  if (facility.pe_owned && facility.pe_owner_name) addDataRow('Private Equity Owner:', facility.pe_owner_name);
  if (facility.reit_owned && facility.reit_owner_name) addDataRow('REIT Owner:', facility.reit_owner_name);
  if (facility.ownership_changed_recently && facility.ownership_change_date) {
    addDataRow('Ownership Change:', facility.ownership_change_date);
    if (facility.new_owner_name) addDataRow('New Owner:', facility.new_owner_name);
  }

  currentY += 4;

  const portfolio = buildOwnershipPortfolio();

  if (portfolio) {
    // Use the ACTUAL counted facilities from our dataset, not the provider_info field
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

    addSubHeading('Worst-Performing Siblings');

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
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
      headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: TABLE_ALT },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 30 },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 14, halign: 'center' },
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

  // ================================================================
  //   SECTION 3 — STAFFING ANALYSIS
  // ================================================================

  addSectionHeader(3, 'Staffing Analysis');

  // Metric row
  drawMetricCard('TOTAL HPRD', facility.total_hprd ? num(facility.total_hprd) : null, NATIONAL_AVG.total_hprd.toFixed(2), ' hrs', margin, currentY, mw);
  drawMetricCard('RN HPRD', facility.rn_hprd ? num(facility.rn_hprd) : null, NATIONAL_AVG.rn_hprd.toFixed(2), ' hrs', margin + mw + 5, currentY, mw);
  drawMetricCard('ZERO-RN DAYS', facility.zero_rn_pct !== null ? facility.zero_rn_pct.toFixed(1) : null, NATIONAL_AVG.zero_rn_pct.toFixed(1), '%', margin + (mw + 5) * 2, currentY, mw);
  currentY += 34;

  addSubHeading('Staffing Breakdown vs National Benchmarks');

  const staffRows = [
    ['Registered Nurse (RN)', num(facility.rn_hprd) + ' hrs', NATIONAL_AVG.rn_hprd + ' hrs', facility.rn_hprd ? ((facility.rn_hprd - NATIONAL_AVG.rn_hprd) / NATIONAL_AVG.rn_hprd * 100).toFixed(0) + '%' : 'N/A'],
    ['Licensed Practical Nurse', num(facility.lpn_hprd) + ' hrs', 'N/A', 'N/A'],
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
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
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

  addDataRow('Weekend Total HPRD:', num(facility.weekend_total_hprd) + ' hrs');
  addDataRow('Weekend RN HPRD:', num(facility.weekend_rn_hprd) + ' hrs');
  addDataRow('Average Census:', facility.avg_census ? facility.avg_census.toFixed(1) : 'N/A');
  currentY += 4;

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

  // ================================================================
  //   SECTION 4 — INSPECTION HISTORY
  // ================================================================

  addSectionHeader(4, 'Inspection History');

  addDataRow('Total Deficiencies:', String(facility.total_deficiencies || 0));
  addDataRow('Immediate Jeopardy Citations:', String(facility.jeopardy_count || 0));
  addDataRow('Actual Harm Citations:', String(facility.harm_count || 0));
  if (facility.severity_score !== null && facility.severity_score !== undefined)
    addDataRow('Severity Score:', facility.severity_score.toFixed(1));
  currentY += 4;

  // Top categories
  if (facility.top_categories && facility.top_categories.length > 0) {
    addSubHeading('Top Deficiency Categories');
    facility.top_categories.slice(0, 5).forEach(([cat, count]) => {
      addDataRow(cat + ':', String(count));
    });
    currentY += 4;
  }

  // Individual deficiency table
  if (facility.deficiency_details && facility.deficiency_details.length > 0) {
    addSubHeading('Individual Deficiency Details');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    doc.text('Top 15 most serious deficiencies (sorted by severity — immediate jeopardy first):', margin, currentY);
    currentY += 6;

    const sevOrder = { L: 0, K: 1, J: 2, I: 3, H: 4, G: 5, F: 6, E: 7, D: 8, C: 9, B: 10, A: 11 };
    const sorted = [...facility.deficiency_details]
      .sort((a, b) => {
        const aS = a.scope_severity ? a.scope_severity.charAt(0) : 'Z';
        const bS = b.scope_severity ? b.scope_severity.charAt(0) : 'Z';
        const d = (sevOrder[aS] ?? 99) - (sevOrder[bS] ?? 99);
        if (d !== 0) return d;
        return new Date(b.survey_date || 0) - new Date(a.survey_date || 0);
      })
      .slice(0, 15);

    const defRows = sorted.map((def) => {
      const date = def.survey_date
        ? new Date(def.survey_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'N/A';
      const sev = def.scope_severity || 'N/A';
      const sevLabel = def.severity_label ? ' (' + def.severity_label + ')' : '';
      const desc = (def.description || 'No description').substring(0, 250) + ((def.description || '').length > 250 ? '...' : '');
      return [date, def.ftag || 'N/A', sev + sevLabel, desc];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Tag Code', 'Scope / Severity', 'Description']],
      body: defRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15, overflow: 'linebreak' },
      headStyles: { fillColor: TABLE_HEADER, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: TABLE_ALT },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 18 },
        2: { cellWidth: 32, fontStyle: 'bold' },
        3: { cellWidth: 98 },
      },
      didParseCell(data) {
        if (data.row.section === 'body') {
          const sev = data.row.raw[2] || '';
          if (sev.includes('Immediate Jeopardy') || sev.startsWith('J') || sev.startsWith('K') || sev.startsWith('L'))
            data.cell.styles.fillColor = RED_BG;
          else if (sev.includes('Harm') || sev.startsWith('H') || sev.startsWith('I'))
            data.cell.styles.fillColor = AMBER_BG;
        }
      },
      margin: { left: margin, right: margin },
    });
    currentY = doc.lastAutoTable.finalY + 5;
  } else {
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

  if (facility.jeopardy_count > 0) {
    addAlertBox(
      'Immediate Jeopardy Context (42 CFR §488.301): Immediate jeopardy citations indicate conditions that have caused, or are likely to cause, serious injury, harm, impairment, or death to a resident. This facility has received ' +
      facility.jeopardy_count + ' such citation' + (facility.jeopardy_count > 1 ? 's' : '') + '.',
      'critical'
    );
  }

  // ================================================================
  //   SECTION 5 — FINANCIAL PENALTIES
  // ================================================================

  addSectionHeader(5, 'Financial Penalties');

  addDataRow('Total Fines:', fmt(facility.total_fines || 0));
  addDataRow('Number of Fines:', String(facility.fine_count || 0));
  addDataRow('Payment Denials:', String(facility.denial_count || 0));
  currentY += 4;

  if (facility.penalty_timeline && facility.penalty_timeline.length > 0) {
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
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
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
      'Civil Monetary Penalties (42 CFR §488.438): CMS imposes civil monetary penalties on facilities that fail to meet federal requirements. Penalties range from $1,000 to $21,393 per day depending on severity. This facility has been assessed ' +
      fmt(facility.total_fines) + ' in total penalties.',
      'info'
    );
  }
  if (facility.denial_count > 0) {
    addAlertBox(
      'Payment Denials (42 CFR §488.417): CMS can deny payment for new admissions when facilities are out of compliance. This facility has ' +
      facility.denial_count + ' payment denial' + (facility.denial_count > 1 ? 's' : '') + ' on record.',
      'warning'
    );
  }

  // ================================================================
  //   SECTION 6 — RED FLAGS
  // ================================================================

  addSectionHeader(6, 'Red Flags & Accountability Indicators');

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

  // ================================================================
  //   SECTION 7 — COMPARISON CONTEXT
  // ================================================================

  addSectionHeader(7, 'Comparison Context');

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
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
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
  //   SECTION 8 — NEARBY ALTERNATIVES
  // ================================================================

  addSectionHeader(8, 'Nearby Alternatives');

  if (nearbyAlternatives && nearbyAlternatives.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const altIntro = 'The following facilities within a reasonable distance have lower risk scores than ' +
      facility.name + '. This comparison is provided for reference purposes only and does not constitute a recommendation.';
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
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: BODY, lineColor: DIVIDER, lineWidth: 0.15 },
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

  // ================================================================
  //   SECTION 9 — METHODOLOGY
  // ================================================================

  addSectionHeader(9, 'Data Sources & Methodology');

  addSubHeading('Data Sources');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BODY);
  doc.text('All data sourced from publicly available federal databases:', margin, currentY);
  currentY += 5;

  const sources = [
    ['CMS Care Compare (Provider Information, Star Ratings)', 'https://data.cms.gov/provider-data/'],
    ['CMS Payroll-Based Journal (Daily Nurse Staffing through Q3 2025)', 'https://data.cms.gov/quality-of-care/payroll-based-journal-daily-nurse-staffing/'],
    ['CMS Health Deficiencies (State Survey Inspections 2017-December 2025)', 'https://data.cms.gov/provider-data/dataset/r5ix-sfxw'],
    ['CMS Penalties (Civil Monetary Penalties, Payment Denials 2023-2025)', 'https://data.cms.gov/provider-data/dataset/g6vv-ecav'],
    ['CMS Ownership Database (Corporate Structure, January 2026)', 'https://data.cms.gov/provider-data/dataset/y2hd-n93e'],
    ['CMS HCRIS Cost Reports (FY2024 related-party transactions)', 'https://www.cms.gov/Research-Statistics-Data-and-Systems/Downloadable-Public-Use-Files/Cost-Reports'],
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

  // ================================================================
  //   SECTION 10 — DISCLAIMER
  // ================================================================

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
  }

  // ================================================================
  //   SAVE
  // ================================================================

  const cleanName = facility.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save('OversightReport_Evidence_' + cleanName + '_' + dateStr + '.pdf');
}
