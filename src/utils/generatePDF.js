import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Color palette — print-optimized with high contrast
 */
const C = {
  brand:      [79, 70, 229],     // indigo
  brandLight: [238, 242, 255],   // indigo-50
  danger:     [185, 28, 28],     // red-700
  dangerBg:   [254, 242, 242],   // red-50
  dangerBar:  [220, 38, 38],     // red-600
  warning:    [146, 64, 14],     // amber-800
  warningBg:  [255, 251, 235],   // amber-50
  warningBar: [245, 158, 11],    // amber-400
  good:       [22, 101, 52],     // green-800
  goodBg:     [240, 253, 244],   // green-50
  goodBar:    [34, 197, 94],     // green-500
  dark:       [30, 41, 59],      // slate-800 (navy headers)
  text:       [30, 41, 59],      // slate-800
  muted:      [100, 116, 139],   // slate-500
  light:      [248, 250, 252],   // slate-50
  white:      [255, 255, 255],
  border:     [226, 232, 240],   // slate-200
  headerBg:   [30, 41, 59],      // slate-800
  trackGray:  [209, 213, 219],   // gray-300
};

/**
 * Generates a 7-page premium consulting-grade PDF report.
 *
 * @param {Object} facility - Facility data
 * @param {Object} options - { nearbyFacilities: [], allFacilities: [] }
 */
export function generatePDF(facility, options = {}) {
  const { nearbyFacilities = [], allFacilities = [], isSample = false, samplePercentiles = null } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = 18; // margin
  const W = pw - M * 2; // content width
  let y = M;
  let page = 1;

  // ── Formatting Helpers ──
  const fmt = (v) => (!v && v !== 0) ? 'N/A' : `$${Number(v).toLocaleString()}`;
  const pct = (v) => (v == null) ? 'N/A' : `${Number(v).toFixed(0)}%`;
  const num = (v) => (v == null) ? 'N/A' : Number(v).toLocaleString();
  const rnMin = facility.rn_hprd ? Math.round(facility.rn_hprd * 60) : 0;
  const stars = Math.max(0, Math.min(5, facility.stars || 0));
  const starStr = '*'.repeat(stars) + '-'.repeat(5 - stars);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const hasPercentiles = allFacilities.length >= 100 || samplePercentiles != null;

  // ── Percentile Computation ──
  // For "higher is worse" metrics: % of facilities with LOWER values = how bad this one is
  // For "higher is better" metrics: % of facilities with HIGHER values = how lacking this one is
  let percentiles = {};
  if (samplePercentiles) {
    // Use hardcoded percentiles for sample report
    percentiles = { ...samplePercentiles };
  } else if (hasPercentiles) {
    const computePercentile = (metric, higherIsWorse = true) => {
      const vals = allFacilities
        .map(f => f[metric])
        .filter(v => v != null && !isNaN(v));
      if (vals.length === 0) return null;
      const facilityVal = facility[metric];
      if (facilityVal == null || isNaN(facilityVal)) return null;
      const sorted = vals.slice().sort((a, b) => a - b);
      if (higherIsWorse) {
        const below = sorted.filter(v => v < facilityVal).length;
        return Math.round((below / sorted.length) * 100);
      } else {
        const above = sorted.filter(v => v > facilityVal).length;
        return Math.round((above / sorted.length) * 100);
      }
    };

    percentiles.composite = computePercentile('composite', true);
    percentiles.total_deficiencies = computePercentile('total_deficiencies', true);
    percentiles.total_fines = computePercentile('total_fines', true);
    percentiles.zero_rn_pct = computePercentile('zero_rn_pct', true);
    percentiles.harm_count = computePercentile('harm_count', true);
    percentiles.jeopardy_count = computePercentile('jeopardy_count', true);
    percentiles.rn_hprd = computePercentile('rn_hprd', false);
    percentiles.stars = computePercentile('stars', false);
  }

  const interpretPercentile = (pctVal, metric, higherIsWorse = true) => {
    if (pctVal == null) return '';
    if (higherIsWorse) {
      if (pctVal >= 90) return 'Among the worst nationally';
      if (pctVal >= 75) return 'Worse than most facilities';
      if (pctVal >= 50) return 'Worse than average';
      if (pctVal >= 25) return 'Better than average';
      return 'Among the best nationally';
    } else {
      if (pctVal >= 90) return 'Among the lowest nationally';
      if (pctVal >= 75) return 'Lower than most facilities';
      if (pctVal >= 50) return 'Below average';
      if (pctVal >= 25) return 'Above average';
      return 'Among the best nationally';
    }
  };

  // ── Ownership Portfolio ──
  let ownerSiblings = [];
  let ownerGroup = [];
  let ownerStarDist = [0, 0, 0, 0, 0];
  let ownerAvgStars = 0;
  let ownerAvgFines = 0;
  let ownerBelowAvgPct = 0;

  if (facility.worst_owner && allFacilities.length > 0) {
    ownerSiblings = allFacilities.filter(f =>
      f.worst_owner && f.worst_owner === facility.worst_owner && f.ccn !== facility.ccn
    );
    ownerGroup = [facility, ...ownerSiblings];
    ownerGroup.forEach(f => {
      if (f.stars >= 1 && f.stars <= 5) ownerStarDist[f.stars - 1]++;
    });
    ownerAvgStars = ownerGroup.length > 0
      ? (ownerGroup.reduce((s, f) => s + (f.stars || 0), 0) / ownerGroup.length)
      : 0;
    const fineVals = ownerGroup.filter(f => f.total_fines != null).map(f => f.total_fines);
    ownerAvgFines = fineVals.length > 0 ? fineVals.reduce((a, b) => a + b, 0) / fineVals.length : 0;
    ownerBelowAvgPct = ownerGroup.length > 0
      ? Math.round(((ownerStarDist[0] + ownerStarDist[1]) / ownerGroup.length) * 100)
      : 0;
  }

  // National average fines for comparison
  const natAvgFines = allFacilities.length > 0
    ? allFacilities.filter(f => f.total_fines != null).reduce((s, f) => s + f.total_fines, 0) / allFacilities.filter(f => f.total_fines != null).length
    : 0;

  // ── Layout Helpers ──
  const footer = () => {
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text(`The Oversight Report  |  oversightreports.com  |  Data: CMS Medicare.gov  |  Generated ${today}  |  Page ${page}`, pw / 2, ph - 8, { align: 'center' });
  };

  const newPage = () => { doc.addPage(); page++; y = M; footer(); };

  const needsPage = (space) => {
    if (y + space > ph - 20) { newPage(); return true; }
    return false;
  };

  const calloutBox = (text, type = 'info', width = W) => {
    const colors = {
      danger:  { bg: C.dangerBg,  bar: C.dangerBar,  text: C.danger },
      warning: { bg: C.warningBg, bar: C.warningBar,  text: C.warning },
      good:    { bg: C.goodBg,    bar: C.goodBar,     text: C.good },
      info:    { bg: C.brandLight, bar: C.brand,      text: C.text },
    };
    const c = colors[type] || colors.info;
    const lines = doc.splitTextToSize(text, width - 14);
    const boxH = Math.max(lines.length * 4.5 + 6, 12);

    needsPage(boxH + 2);
    doc.setFillColor(...c.bg);
    doc.roundedRect(M, y, width, boxH, 2, 2, 'F');
    doc.setFillColor(...c.bar);
    doc.rect(M, y, 3, boxH, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...c.text);
    doc.text(lines, M + 7, y + 5);
    y += boxH + 3;
  };

  const sectionHeader = (title, color = C.dark) => {
    needsPage(14);
    doc.setFillColor(...color);
    doc.roundedRect(M, y, W, 9, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text(title, M + 4, y + 6.5);
    y += 12;
  };

  const subHeader = (title) => {
    needsPage(10);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text(title, M, y);
    y += 6;
  };

  const bodyText = (text, indent = 0, maxW = W) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    const lines = doc.splitTextToSize(text, maxW - indent);
    needsPage(lines.length * 4.5);
    doc.text(lines, M + indent, y);
    y += lines.length * 4.5 + 1;
  };

  const sourceText = (text) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.muted);
    const lines = doc.splitTextToSize(text, W);
    doc.text(lines, M, y);
    y += lines.length * 3.5 + 2;
  };

  const statPill = (x, yPos, label, value, color = C.text) => {
    const pillW = (W - 6) / 3;
    doc.setFillColor(...C.light);
    doc.roundedRect(x, yPos, pillW, 18, 2, 2, 'F');

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(String(value), x + pillW / 2, yPos + 8, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(label, x + pillW / 2, yPos + 14, { align: 'center' });
  };

  const divider = () => {
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(M, y, pw - M, y);
    y += 4;
  };

  // Percentile dot-on-line bar
  const percentileBar = (x, yPos, width, pctValue, color, label, sublabel) => {
    const barY = yPos + 4;
    // Label
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text(label, x, yPos);

    // Sublabel (percentile text)
    if (sublabel) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text(sublabel, x + width, yPos, { align: 'right' });
    }

    // Track line
    doc.setDrawColor(...C.trackGray);
    doc.setLineWidth(1.5);
    doc.line(x, barY + 3, x + width, barY + 3);

    // Dot
    const dotX = x + (pctValue / 100) * width;
    doc.setFillColor(...color);
    doc.circle(dotX, barY + 3, 2.5, 'F');

    // Scale labels
    doc.setFontSize(6);
    doc.setTextColor(...C.muted);
    doc.text('Best', x, barY + 8);
    doc.text('Worst', x + width, barY + 8, { align: 'right' });
  };

  // ═══════════════════════════════════════════════════
  //  PAGE 1: COVER + BOTTOM LINE
  // ═══════════════════════════════════════════════════

  // Brand header bar
  doc.setFillColor(...C.headerBg);
  doc.rect(0, 0, pw, 24, 'F');
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('THE OVERSIGHT REPORT', pw / 2, 10, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Clinical Analysis & Family Decision Support', pw / 2, 16, { align: 'center' });
  doc.setFontSize(7);
  doc.text('oversightreports.com', pw / 2, 21, { align: 'center' });
  y = 26;

  // Sample banner
  if (isSample) {
    doc.setFillColor(...C.warningBg);
    doc.rect(0, 24, pw, 8, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.warning);
    doc.text('SAMPLE REPORT -- Fictional facility for demonstration purposes. Search a real facility at oversightreports.com', pw / 2, 29, { align: 'center' });
    y = 35;
  } else {
    y = 32;
  }

  // Facility name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  const nameLines = doc.splitTextToSize(facility.name, W);
  doc.text(nameLines, pw / 2, y, { align: 'center' });
  y += nameLines.length * 8 + 2;

  // Location + beds + stars
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(`${facility.city}, ${facility.state} ${facility.zip || ''}  |  ${facility.beds || '--'} beds  |  CMS Rating: ${stars}/5 ${starStr}`, pw / 2, y, { align: 'center' });
  y += 5;

  // CCN
  doc.setFontSize(8);
  doc.text(`CMS Certification #${facility.ccn}`, pw / 2, y, { align: 'center' });
  y += 8;

  // Risk Score Badge
  const riskScore = facility.composite || 0;
  const riskColor = riskScore >= 60 ? C.dangerBar : riskScore >= 40 ? C.warningBar : riskScore >= 20 ? [234, 179, 8] : C.goodBar;
  const riskLabel = riskScore >= 60 ? 'HIGH RISK' : riskScore >= 40 ? 'ELEVATED RISK' : riskScore >= 20 ? 'MODERATE RISK' : 'LOW RISK';

  doc.setFillColor(...riskColor);
  doc.roundedRect(pw / 2 - 30, y, 60, 16, 3, 3, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(riskScore.toFixed(1), pw / 2, y + 7, { align: 'center' });
  doc.setFontSize(7);
  doc.text(riskLabel, pw / 2, y + 13, { align: 'center' });
  y += 22;

  // Bottom Line
  sectionHeader('BOTTOM LINE');

  const bottomParts = [];
  if (facility.jeopardy_count > 0)
    bottomParts.push(`Government inspectors found SERIOUS DANGER to residents ${facility.jeopardy_count} time${facility.jeopardy_count !== 1 ? 's' : ''} -- conditions so severe that residents faced risk of serious injury or death.`);
  else if (facility.harm_count > 0)
    bottomParts.push(`Residents were HURT ${facility.harm_count} time${facility.harm_count !== 1 ? 's' : ''} according to official inspection reports.`);
  if (facility.total_fines > 0)
    bottomParts.push(`This facility has been fined ${fmt(facility.total_fines)} by CMS.`);
  if (facility.zero_rn_pct > 25)
    bottomParts.push(`On ${pct(facility.zero_rn_pct)} of days, there was NO registered nurse in the building.`);
  if (facility.owner_portfolio_count > 1)
    bottomParts.push(`The same company runs ${facility.owner_portfolio_count} other facilities${facility.owner_avg_fines ? ` with average fines of ${fmt(facility.owner_avg_fines)} each` : ''}.`);
  if (bottomParts.length === 0)
    bottomParts.push('This facility has no major issues recorded in recent CMS data.');

  const bottomType = facility.jeopardy_count > 0 ? 'danger' : facility.harm_count > 0 ? 'warning' : (facility.total_fines > 50000 || facility.zero_rn_pct > 25) ? 'warning' : 'good';
  calloutBox(bottomParts.join(' '), bottomType);

  // Quick Stats Grid (3x2)
  y += 2;
  const pillW = (W - 6) / 3;
  const row1Y = y;
  statPill(M, row1Y, 'TOTAL DEFICIENCIES', facility.total_deficiencies || 0, (facility.total_deficiencies || 0) >= 15 ? C.danger : C.text);
  statPill(M + pillW + 3, row1Y, 'TOTAL FINES', fmt(facility.total_fines || 0), (facility.total_fines || 0) > 50000 ? C.danger : C.text);
  statPill(M + (pillW + 3) * 2, row1Y, 'CMS STARS', `${stars}/5`, stars <= 2 ? C.danger : stars <= 3 ? C.warning : C.good);
  y = row1Y + 22;

  const row2Y = y;
  statPill(M, row2Y, 'SERIOUS DANGER', facility.jeopardy_count || 0, (facility.jeopardy_count || 0) > 0 ? C.danger : C.good);
  statPill(M + pillW + 3, row2Y, 'RESIDENTS HURT', facility.harm_count || 0, (facility.harm_count || 0) > 0 ? [...C.warningBar] : C.good);
  statPill(M + (pillW + 3) * 2, row2Y, 'DAYS W/O RN', pct(facility.zero_rn_pct || 0), (facility.zero_rn_pct || 0) > 20 ? C.danger : C.good);
  y = row2Y + 22;

  // Verify links
  y += 2;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.brand);
  doc.text('VERIFY THIS DATA:', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(`ProPublica: projects.propublica.org/nursing-homes/homes/h-${facility.ccn}`, M + 30, y);
  y += 4;
  doc.text(`Medicare Compare: medicare.gov/care-compare/details/nursing-home/${facility.ccn}`, M + 30, y);
  y += 6;

  sourceText(`Report generated: ${today}  |  Data: CMS Provider Data, Health Deficiencies, Penalties, Ownership, PBJ Staffing`);

  footer();

  // ═══════════════════════════════════════════════════
  //  PAGE 2: CLINICAL CONTEXT — What This Means
  // ═══════════════════════════════════════════════════

  newPage();

  sectionHeader('WHAT THIS MEANS FOR YOUR LOVED ONE', C.brand);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...C.muted);
  doc.text('Clinical context -- what the data means in practice', M, y);
  y += 6;

  let clinicalSections = 0;

  // Zero-RN clinical implications
  if (facility.zero_rn_pct > 20) {
    clinicalSections++;
    needsPage(30);
    subHeader('Registered Nurse Absence');
    const rnPctVal = Number(facility.zero_rn_pct).toFixed(0);
    calloutBox(
      `On ${rnPctVal}% of days, this facility had NO registered nurse on site. ` +
      'Without an RN present, certain critical functions cannot be performed: IV medications cannot be administered, ' +
      'complex wound care cannot be managed, acute changes in condition may not be recognized promptly, ' +
      'and physician orders requiring RN assessment cannot be carried out. ' +
      'LPNs and CNAs provide valuable care, but there are clinical tasks that only an RN is licensed to perform.',
      'danger'
    );
  }

  // Immediate jeopardy explanation
  if (facility.jeopardy_count > 0) {
    clinicalSections++;
    needsPage(25);
    subHeader('Immediate Jeopardy Citations');
    calloutBox(
      `This facility received ${facility.jeopardy_count} "Immediate Jeopardy" citation${facility.jeopardy_count !== 1 ? 's' : ''}. ` +
      'This is the most severe finding a government inspection can produce. It means inspectors determined that ' +
      'conditions posed an immediate risk of serious injury or death to residents. Facilities must submit a corrective ' +
      'action plan within days or face escalating penalties including potential loss of Medicare/Medicaid certification.',
      'danger'
    );
  }

  // Actual harm documentation
  if (facility.harm_count > 0) {
    clinicalSections++;
    needsPage(25);
    subHeader('Documented Harm to Residents');
    calloutBox(
      `Inspectors documented ${facility.harm_count} instance${facility.harm_count !== 1 ? 's' : ''} where facility practices ` +
      'caused actual harm to residents -- not just risk of harm, but documented injury or negative health outcome. ' +
      'This is the second-most severe inspection finding and indicates that residents were directly affected ' +
      'by care failures or unsafe conditions.',
      'warning'
    );
  }

  // Staffing data discrepancy
  if (facility.rn_gap_pct > 25) {
    clinicalSections++;
    needsPage(25);
    subHeader('Staffing Data Discrepancy');
    calloutBox(
      `This facility self-reports ${Math.round(facility.rn_gap_pct)}% more RN hours than verified payroll records show. ` +
      'CMS requires facilities to submit payroll-based staffing data quarterly. When the numbers a facility advertises ' +
      'differ significantly from what payroll records confirm, it raises questions about the accuracy of their staffing claims. ' +
      'Ask to see the posted daily staffing schedule and compare it to what you observe during visits.',
      'warning'
    );
  }

  // Owner with multiple low-rated facilities
  if (ownerSiblings.length >= 2 && (ownerAvgStars < 2.5 || ownerBelowAvgPct > 40)) {
    clinicalSections++;
    needsPage(25);
    subHeader('Ownership Pattern');
    calloutBox(
      `This facility is operated by ${facility.worst_owner}, which runs ${ownerGroup.length} facilities total. ` +
      `Their portfolio averages ${ownerAvgStars.toFixed(1)} stars (national average: 3.2) and ${ownerBelowAvgPct}% of their facilities ` +
      'are rated below average. Research shows that ownership patterns are one of the strongest predictors of care quality -- ' +
      'operators who underperform across multiple facilities often have systemic issues with staffing budgets, training, or oversight.',
      'warning'
    );
  }

  // Infection control citations
  const hasInfection = facility.top_categories && facility.top_categories.some(([cat]) =>
    cat.toLowerCase().includes('infection')
  );
  if (hasInfection) {
    clinicalSections++;
    needsPage(25);
    subHeader('Infection Control Citations');
    const infCount = facility.top_categories.find(([cat]) => cat.toLowerCase().includes('infection'));
    calloutBox(
      `This facility received ${infCount ? infCount[1] : 'multiple'} citation(s) related to infection control. ` +
      'Infection control failures in nursing homes can lead to outbreaks of influenza, COVID-19, MRSA, C. diff, and urinary tract infections. ' +
      'When visiting, observe whether staff wash hands between residents, whether hand sanitizer is available, ' +
      'and whether the facility smells clean. These are basic indicators of infection control practices.',
      'warning'
    );
  }

  // If NONE apply — positive assessment
  if (clinicalSections === 0) {
    calloutBox(
      'Based on available CMS data, this facility does not trigger any of our clinical concern indicators. ' +
      'No immediate jeopardy citations, no documented harm to residents, acceptable RN staffing levels, ' +
      'and no significant data discrepancies. This is a positive finding -- but we always recommend visiting ' +
      'in person and talking to current residents and their families before making a decision.',
      'good'
    );
  }

  y += 3;
  divider();

  // Attribution
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...C.muted);
  doc.text('Clinical perspective by Robert Benard, NP -- 20+ years in acute care and psychiatry', M, y);
  y += 5;

  sourceText('Sources: CMS Health Deficiencies, PBJ Staffing, Penalties, Ownership Data');

  // ═══════════════════════════════════════════════════
  //  PAGE 3: HOW THIS FACILITY COMPARES (Percentiles)
  // ═══════════════════════════════════════════════════

  newPage();

  sectionHeader('HOW THIS FACILITY COMPARES', C.brand);

  if (hasPercentiles) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.muted);
    const compareCount = isSample ? '14,713' : num(allFacilities.length);
    doc.text(`Comparing to all ${compareCount} Medicare-certified nursing homes`, M, y);
    y += 7;

    const barWidth = W - 10;
    const barSpacing = 20;

    // Composite Risk Score
    if (percentiles.composite != null) {
      needsPage(barSpacing);
      const color = percentiles.composite >= 75 ? C.dangerBar : percentiles.composite >= 50 ? C.warningBar : C.goodBar;
      percentileBar(M + 5, y, barWidth, percentiles.composite, color,
        `Risk Score: ${riskScore.toFixed(1)}`,
        `Worse than ${percentiles.composite}% of facilities`
      );
      y += barSpacing;
    }

    // Total Deficiencies
    if (percentiles.total_deficiencies != null) {
      needsPage(barSpacing);
      const val = facility.total_deficiencies || 0;
      const color = percentiles.total_deficiencies >= 75 ? C.dangerBar : percentiles.total_deficiencies >= 50 ? C.warningBar : C.goodBar;
      percentileBar(M + 5, y, barWidth, percentiles.total_deficiencies, color,
        `Total Deficiencies: ${val}`,
        `Worse than ${percentiles.total_deficiencies}% of facilities`
      );
      y += barSpacing;
    }

    // Total Fines
    if (percentiles.total_fines != null) {
      needsPage(barSpacing);
      const val = facility.total_fines || 0;
      const color = percentiles.total_fines >= 75 ? C.dangerBar : percentiles.total_fines >= 50 ? C.warningBar : C.goodBar;
      percentileBar(M + 5, y, barWidth, percentiles.total_fines, color,
        `Total Fines: ${fmt(val)}`,
        `Worse than ${percentiles.total_fines}% of facilities`
      );
      y += barSpacing;
    }

    // RN Staffing (higher is better — flip display)
    if (percentiles.rn_hprd != null) {
      needsPage(barSpacing);
      const color = percentiles.rn_hprd >= 75 ? C.dangerBar : percentiles.rn_hprd >= 50 ? C.warningBar : C.goodBar;
      percentileBar(M + 5, y, barWidth, percentiles.rn_hprd, color,
        `RN Time: ${rnMin} min/resident/day`,
        `Less than ${percentiles.rn_hprd}% of facilities`
      );
      y += barSpacing;
    }

    // Zero-RN Days
    if (percentiles.zero_rn_pct != null && (facility.zero_rn_pct || 0) > 0) {
      needsPage(barSpacing);
      const color = percentiles.zero_rn_pct >= 75 ? C.dangerBar : percentiles.zero_rn_pct >= 50 ? C.warningBar : C.goodBar;
      percentileBar(M + 5, y, barWidth, percentiles.zero_rn_pct, color,
        `Zero-RN Days: ${pct(facility.zero_rn_pct)}`,
        `Worse than ${percentiles.zero_rn_pct}% of facilities`
      );
      y += barSpacing;
    }

    // Harm Citations (only if > 0)
    if (percentiles.harm_count != null && (facility.harm_count || 0) > 0) {
      needsPage(barSpacing);
      percentileBar(M + 5, y, barWidth, percentiles.harm_count, C.dangerBar,
        `Harm Citations: ${facility.harm_count}`,
        `Worse than ${percentiles.harm_count}% of facilities`
      );
      y += barSpacing;
    }

    // Jeopardy Citations (only if > 0)
    if (percentiles.jeopardy_count != null && (facility.jeopardy_count || 0) > 0) {
      needsPage(barSpacing);
      percentileBar(M + 5, y, barWidth, percentiles.jeopardy_count, C.dangerBar,
        `Serious Danger: ${facility.jeopardy_count}`,
        `Worse than ${percentiles.jeopardy_count}% of facilities`
      );
      y += barSpacing;
    }

    // CMS Stars
    if (percentiles.stars != null) {
      needsPage(barSpacing);
      const color = percentiles.stars >= 75 ? C.dangerBar : percentiles.stars >= 50 ? C.warningBar : C.goodBar;
      percentileBar(M + 5, y, barWidth, percentiles.stars, color,
        `CMS Stars: ${stars}/5`,
        `Lower than ${percentiles.stars}% of facilities`
      );
      y += barSpacing;
    }

    // Overall Assessment
    y += 3;
    needsPage(20);
    const avgPct = [percentiles.composite, percentiles.total_deficiencies, percentiles.total_fines, percentiles.rn_hprd, percentiles.stars]
      .filter(v => v != null);
    const overallPct = avgPct.length > 0 ? Math.round(avgPct.reduce((a, b) => a + b, 0) / avgPct.length) : null;

    if (overallPct != null) {
      let assessType, assessText;
      if (overallPct >= 75) {
        assessType = 'danger';
        assessText = `Overall, this facility falls in the bottom quartile nationally. Across key metrics, it performs worse than approximately ${overallPct}% of all Medicare-certified nursing homes. This pattern of below-average performance across multiple measures warrants serious consideration.`;
      } else if (overallPct >= 50) {
        assessType = 'warning';
        assessText = `This facility shows mixed results across national comparisons. Some metrics are above average while others fall below. It performs worse than approximately ${overallPct}% of facilities overall. Review each metric individually to understand the specific strengths and weaknesses.`;
      } else {
        assessType = 'good';
        assessText = `This facility performs better than average across most national comparisons. It ranks above approximately ${100 - overallPct}% of all Medicare-certified nursing homes on key metrics. This is a positive indicator, though we always recommend in-person visits.`;
      }
      subHeader('Overall Assessment');
      calloutBox(assessText, assessType);
    }
  } else {
    // Not enough data for percentiles
    calloutBox(
      'National percentile rankings are not available in this sample report. Full reports generated from the facility page include rankings against all 14,713 Medicare-certified nursing homes.',
      'info'
    );
  }

  sourceText('Source: CMS Provider Information, Health Deficiencies, PBJ Staffing, Penalties  |  Percentiles computed from all active facilities');

  // ═══════════════════════════════════════════════════
  //  PAGE 4: STAFFING DEEP DIVE
  // ═══════════════════════════════════════════════════

  y += 4;
  needsPage(60) || (y += 4);

  sectionHeader('STAFFING DEEP DIVE', C.dark);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...C.muted);
  doc.text('How much direct care do residents actually receive?', M, y);
  y += 6;

  // Staffing breakdown table
  const staffingRows = [
    [
      'Registered Nurse (RN)',
      facility.rn_hprd != null ? `${(facility.rn_hprd * 60).toFixed(0)} min` : 'N/A',
      facility.rn_hprd != null ? facility.rn_hprd.toFixed(2) : 'N/A',
      'Highest-level bedside nurse. Can administer IV meds, assess acute changes, carry out physician orders.'
    ],
    [
      'Licensed Practical Nurse (LPN)',
      facility.lpn_hprd != null ? `${(facility.lpn_hprd * 60).toFixed(0)} min` : 'N/A',
      facility.lpn_hprd != null ? facility.lpn_hprd.toFixed(2) : 'N/A',
      'Medication administration, wound care, vital signs under RN supervision.'
    ],
    [
      'Certified Nursing Asst (CNA)',
      facility.cna_hprd != null ? `${(facility.cna_hprd * 60).toFixed(0)} min` : 'N/A',
      facility.cna_hprd != null ? facility.cna_hprd.toFixed(2) : 'N/A',
      'Bathing, dressing, feeding, toileting, mobility -- most direct resident contact.'
    ],
    [
      'TOTAL',
      facility.total_hprd != null ? `${(facility.total_hprd * 60).toFixed(0)} min` : 'N/A',
      facility.total_hprd != null ? facility.total_hprd.toFixed(2) : 'N/A',
      'Total nursing care hours per resident per day.'
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Role', 'Minutes/Day', 'Hours/Day', 'What They Do']],
    body: staffingRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, textColor: C.text },
    headStyles: { fillColor: C.headerBg, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38 },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 22 },
    },
    alternateRowStyles: { fillColor: C.light },
    margin: { left: M, right: M },
  });
  y = (doc.lastAutoTable?.finalY ?? doc.previousAutoTable?.finalY ?? y) + 6;

  // RN Time callout with percentile context
  const rnCompare = rnMin < 30 ? 'critically low' : rnMin < 45 ? 'below the research standard of 45 minutes' : rnMin < 60 ? 'adequate but below ideal' : 'meeting research standards';
  const rnType = rnMin < 30 ? 'danger' : rnMin < 45 ? 'warning' : 'good';
  let rnCalloutText = `RN Time Per Resident Per Day: ${rnMin} minutes -- ${rnCompare}.`;
  if (hasPercentiles && percentiles.rn_hprd != null) {
    rnCalloutText += ` This is less than ${percentiles.rn_hprd}% of all nursing homes nationally.`;
  }
  calloutBox(rnCalloutText, rnType);

  // Zero-RN days callout
  if (facility.zero_rn_pct > 10) {
    let zeroText = `On ${pct(facility.zero_rn_pct)} of days, there was NO registered nurse in the building. Residents had no access to RN-level care during these periods.`;
    if (hasPercentiles && percentiles.zero_rn_pct != null) {
      zeroText += ` This is worse than ${percentiles.zero_rn_pct}% of facilities nationally.`;
    }
    calloutBox(zeroText, facility.zero_rn_pct > 25 ? 'danger' : 'warning');
  }

  // Data mismatch callout
  if (facility.rn_gap_pct > 20) {
    calloutBox(
      `DATA MISMATCH: This facility reports ${facility.rn_gap_pct?.toFixed(0)}% more RN hours than payroll records show. The actual staffing may be significantly lower than advertised. Ask to see real schedules.`,
      'warning'
    );
  }

  // Weekend vs weekday comparison
  if (facility.weekend_total_hprd != null && facility.total_hprd != null) {
    needsPage(18);
    const weekdayMin = Math.round(facility.total_hprd * 60);
    const weekendMin = Math.round(facility.weekend_total_hprd * 60);
    const dropPct = facility.total_hprd > 0 ? Math.round(((facility.total_hprd - facility.weekend_total_hprd) / facility.total_hprd) * 100) : 0;
    if (dropPct > 10) {
      calloutBox(
        `WEEKEND STAFFING: Total nursing time drops from ${weekdayMin} to ${weekendMin} minutes per resident on weekends (-${dropPct}%). Weekends are when many families visit -- but also when staffing is often at its lowest.`,
        'warning'
      );
    }
  }

  // Contractor percentage
  if (facility.pct_contract != null && facility.pct_contract > 15) {
    needsPage(14);
    calloutBox(
      `${Math.round(facility.pct_contract)}% of nursing hours come from contract (agency) staff. Research shows that heavy reliance on temporary staff is associated with lower care continuity and more medication errors, as agency nurses are less familiar with individual residents.`,
      'warning'
    );
  }

  sourceText('Source: CMS Payroll-Based Journal (PBJ) Daily Staffing Data  |  PBJ is mandatory -- facilities submit actual payroll hours quarterly');

  // ═══════════════════════════════════════════════════
  //  PAGE 5: THE OWNER PICTURE
  // ═══════════════════════════════════════════════════

  y += 4;
  needsPage(60) || (y += 4);

  sectionHeader('THE OWNER PICTURE', C.dark);

  const ownerName = facility.worst_owner || facility.chain_name || 'Not Available';
  const ownerType = facility.ownership_type || 'N/A';

  // Owner info
  subHeader('Owner Information');
  bodyText(`Owner: ${ownerName}`);
  bodyText(`Ownership Type: ${ownerType}`);
  bodyText(`Portfolio Size: ${ownerGroup.length > 1 ? `${ownerGroup.length} facilities` : 'Single facility (independently owned)'}`);
  y += 2;

  if (ownerGroup.length >= 3) {
    // Star distribution
    subHeader('Portfolio Star Distribution');

    needsPage(40);
    const maxCount = Math.max(...ownerStarDist, 1);
    const barMaxW = W * 0.5;

    for (let s = 5; s >= 1; s--) {
      const count = ownerStarDist[s - 1];
      const pctOfTotal = ownerGroup.length > 0 ? Math.round((count / ownerGroup.length) * 100) : 0;
      const barW = maxCount > 0 ? (count / maxCount) * barMaxW : 0;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.dark);
      const label = `${s} star${s !== 1 ? 's' : ' '}`;
      doc.text(label, M + 14, y + 3, { align: 'right' });

      // Bar
      const barX = M + 16;
      if (barW > 0) {
        const barColor = s >= 4 ? C.goodBar : s === 3 ? C.warningBar : C.dangerBar;
        doc.setFillColor(...barColor);
        doc.roundedRect(barX, y, barW, 5, 1, 1, 'F');
      }

      // Count label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text(`${count} (${pctOfTotal}%)`, barX + barMaxW + 2, y + 3);

      y += 7;
    }

    y += 3;

    // Average fines comparison
    bodyText(`Average rating across portfolio: ${ownerAvgStars.toFixed(1)} / 5 stars (national average: 3.2)`);

    if (ownerAvgFines > 0) {
      bodyText(`Average fines across portfolio: ${fmt(Math.round(ownerAvgFines))} per facility (national average: ${fmt(Math.round(natAvgFines))})`);
    }

    // Pattern assessment
    if (ownerBelowAvgPct > 50) {
      y += 2;
      calloutBox(
        `SYSTEMIC CONCERN: ${ownerBelowAvgPct}% of facilities under this operator are rated below average (1-2 stars). This pattern suggests systemic issues with care quality across the organization -- not isolated problems at a single location.`,
        'danger'
      );
    } else if (ownerBelowAvgPct > 30) {
      y += 2;
      calloutBox(
        `${ownerBelowAvgPct}% of this operator's facilities are rated below average. While not the worst pattern, it suggests the organization may have systemic challenges with maintaining consistent quality.`,
        'warning'
      );
    }

    // Top 3 worst + top 3 best in portfolio
    if (ownerGroup.length >= 4) {
      y += 3;
      needsPage(40);
      const sorted = ownerGroup.slice().sort((a, b) => (b.composite || 0) - (a.composite || 0));
      const worst3 = sorted.slice(0, 3);
      const best3 = sorted.slice(-3).reverse();

      subHeader('Highest-Risk Facilities in Portfolio');
      autoTable(doc, {
        startY: y,
        head: [['Facility', 'State', 'Risk Score', 'Stars']],
        body: worst3.map(f => [
          f.name?.substring(0, 40) || 'N/A',
          f.state || 'N/A',
          f.composite != null ? f.composite.toFixed(1) : 'N/A',
          `${f.stars || 0}/5`,
        ]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: C.text },
        headStyles: { fillColor: C.dangerBar, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 65 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
        },
        alternateRowStyles: { fillColor: C.dangerBg },
        margin: { left: M, right: M },
      });
      y = (doc.lastAutoTable?.finalY ?? doc.previousAutoTable?.finalY ?? y) + 5;

      needsPage(30);
      subHeader('Lowest-Risk Facilities in Portfolio');
      autoTable(doc, {
        startY: y,
        head: [['Facility', 'State', 'Risk Score', 'Stars']],
        body: best3.map(f => [
          f.name?.substring(0, 40) || 'N/A',
          f.state || 'N/A',
          f.composite != null ? f.composite.toFixed(1) : 'N/A',
          `${f.stars || 0}/5`,
        ]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: C.text },
        headStyles: { fillColor: C.goodBar, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 65 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
        },
        alternateRowStyles: { fillColor: C.goodBg },
        margin: { left: M, right: M },
      });
      y = (doc.lastAutoTable?.finalY ?? doc.previousAutoTable?.finalY ?? y) + 4;
    }
  } else if (ownerGroup.length <= 1) {
    // Single-owner / independent
    y += 2;
    calloutBox(
      'This facility appears to be independently owned or part of a very small organization. ' +
      'While independent ownership doesn\'t guarantee better or worse care, it often means more direct owner involvement in day-to-day operations. ' +
      'When visiting, ask who the administrator is and how often ownership visits the facility.',
      'info'
    );
  } else {
    // Small portfolio (2 facilities)
    bodyText(`This owner operates ${ownerGroup.length} facilities. Average star rating: ${ownerAvgStars.toFixed(1)}/5.`);
  }

  sourceText('Source: CMS Ownership Data, CMS Care Compare  |  Ownership records track 5%+ interests');

  // ═══════════════════════════════════════════════════
  //  PAGE 6: QUESTIONS + VISIT CHECKLIST
  // ═══════════════════════════════════════════════════

  y += 4;
  needsPage(50) || (y += 4);

  sectionHeader('QUESTIONS TO ASK WHEN YOU VISIT', C.brand);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...C.muted);
  doc.text('These questions are tailored to this facility\'s specific record:', M, y);
  y += 5;

  const questions = [];
  if (facility.zero_rn_pct > 10) {
    questions.push({
      q: 'How many registered nurses are on duty right now? What is your weekend staffing like?',
      why: `This facility had zero RN days ${pct(facility.zero_rn_pct)} of the time.`
    });
  }
  if (facility.jeopardy_count > 0) {
    questions.push({
      q: 'What corrective actions were taken after the serious danger citation?',
      why: `Inspectors found serious danger to residents ${facility.jeopardy_count} time(s).`
    });
  }
  if (facility.rn_gap_pct > 30) {
    questions.push({
      q: 'Can I see your actual staffing schedules for the past month?',
      why: `Facility reports ${pct(facility.rn_gap_pct)} more RN hours than payroll shows.`
    });
  }
  if (facility.total_fines > 50000) {
    questions.push({
      q: 'What changes have you made since being fined by the government?',
      why: `Total fines: ${fmt(facility.total_fines)}`
    });
  }
  if (facility.owner_portfolio_count > 10) {
    questions.push({
      q: 'How does staffing here compare to the owner\'s other facilities?',
      why: `This owner operates ${facility.owner_portfolio_count} facilities.`
    });
  }
  if (hasInfection) {
    questions.push({
      q: 'What infection control measures are in place? When was the last outbreak?',
      why: 'This facility has received citations for infection control deficiencies.'
    });
  }
  questions.push({
    q: 'Can I visit at different times -- evenings, weekends, mealtimes?',
    why: 'Care quality and staffing can vary dramatically by time of day.'
  });

  questions.forEach((item, idx) => {
    needsPage(16);

    doc.setFillColor(...C.light);
    const qLines = doc.splitTextToSize(`${idx + 1}. ${item.q}`, W - 12);
    const whyLines = doc.splitTextToSize(`Why: ${item.why}`, W - 16);
    const boxH = qLines.length * 4 + whyLines.length * 3.5 + 8;

    doc.roundedRect(M, y, W, boxH, 2, 2, 'F');
    doc.setFillColor(...C.brand);
    doc.rect(M, y, 2.5, boxH, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text(qLines, M + 6, y + 5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.muted);
    doc.text(whyLines, M + 8, y + 5 + qLines.length * 4 + 1);

    y += boxH + 3;
  });

  // ── Printable Visit Checklist ──
  y += 4;
  needsPage(30);
  sectionHeader('VISIT CHECKLIST', C.dark);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...C.muted);
  doc.text('Print this page and bring it with you when you visit:', M, y);
  y += 5;

  const checklistItems = [];

  // Always-included items
  checklistItems.push('Count the staff you see on each hall -- note the ratio of staff to residents');
  checklistItems.push('Press a call light and time how long it takes for someone to respond');
  checklistItems.push('Ask: "Is there a registered nurse on duty right now? What is their name?"');
  checklistItems.push('Visit at different times of day -- mornings, evenings, and weekends');
  checklistItems.push('Talk to at least two current residents or family members about their experience');
  checklistItems.push('Walk the halls: observe cleanliness, odors, lighting, and resident engagement');
  checklistItems.push('Check the posted daily staffing schedule (required to be posted near entrance)');
  checklistItems.push('Ask about the activities program -- are residents engaged or sitting idle?');

  // Conditional items
  if (facility.zero_rn_pct > 10) {
    checklistItems.push('(!!) Ask: "Is there an RN on site right now?" (This facility has had days with no RN)');
  }
  if (hasInfection) {
    checklistItems.push('(!!) Check for hand sanitizer at entrances and in hallways (infection control citations on record)');
    checklistItems.push('(!!) Watch whether staff wash/sanitize hands between residents');
  }
  if (facility.total_fines > 50000) {
    checklistItems.push('(!!) Ask the administrator: "What corrective actions were taken after your recent fines?"');
  }
  if (facility.jeopardy_count > 0) {
    checklistItems.push('(!!) Ask to see the corrective action plan filed after the serious danger citation');
  }

  checklistItems.forEach(item => {
    needsPage(8);
    const isConditional = item.startsWith('(!!) ');
    const displayText = isConditional ? item.slice(5) : item;

    const textColor = isConditional ? C.danger : C.text;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);

    // Checkbox square
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.4);
    doc.rect(M + 2, y - 3, 3.5, 3.5);

    // Show (!!) prefix separately for conditional items
    if (isConditional) {
      doc.setFont('helvetica', 'bold');
      doc.text('(!!)', M + 8, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(displayText, W - 20);
      doc.text(lines, M + 16, y);
      y += lines.length * 4.5 + 2;
    } else {
      const lines = doc.splitTextToSize(displayText, W - 12);
      doc.text(lines, M + 8, y);
      y += lines.length * 4.5 + 2;
    }
  });

  // ═══════════════════════════════════════════════════
  //  PAGE 7: RESOURCES + DATA SOURCES + DISCLAIMER
  // ═══════════════════════════════════════════════════

  y += 4;
  needsPage(50) || (y += 4);

  // Nearby Better Alternatives (if available)
  if (nearbyFacilities && nearbyFacilities.length > 0) {
    sectionHeader('NEARBY BETTER-RATED ALTERNATIVES', C.goodBar);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.muted);
    doc.text('Facilities within 15 miles with equal or better safety scores:', M, y);
    y += 5;

    const nearbyData = nearbyFacilities.slice(0, 5).map(f => [
      f.name,
      `${f.city}, ${f.state}`,
      f.distance != null ? `${f.distance.toFixed(1)} mi` : '--',
      f.composite != null ? f.composite.toFixed(1) : '--',
      `${f.stars || 0}/5`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Facility', 'Location', 'Distance', 'Risk Score', 'Stars']],
      body: nearbyData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5, textColor: C.text },
      headStyles: { fillColor: C.goodBar, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 22 },
        4: { halign: 'center', cellWidth: 18 },
      },
      alternateRowStyles: { fillColor: C.goodBg },
      margin: { left: M, right: M },
    });
    y = (doc.lastAutoTable?.finalY ?? doc.previousAutoTable?.finalY ?? y) + 6;
  }

  // Resources & Helplines
  sectionHeader('RESOURCES & HELPLINES');

  const resources = [
    ['National Eldercare Locator', '1-800-677-1116', 'Free referrals to local aging services'],
    ['Long-Term Care Ombudsman', 'ltcombudsman.org', 'Advocates for residents in nursing homes'],
    ['Medicare Care Compare', 'medicare.gov/care-compare', 'Official CMS facility ratings and data'],
    ['ProPublica Nursing Home Inspect', 'projects.propublica.org/nursing-homes', 'Searchable inspection report database'],
    ['State Survey Agency', 'Contact your state health dept', 'File complaints about facility conditions'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Resource', 'Contact', 'Description']],
    body: resources,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3, textColor: C.text },
    headStyles: { fillColor: C.brand, textColor: C.white, fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { cellWidth: 48 },
    },
    alternateRowStyles: { fillColor: C.brandLight },
    margin: { left: M, right: M },
  });
  y = (doc.lastAutoTable?.finalY ?? doc.previousAutoTable?.finalY ?? y) + 6;

  // Data Sources
  needsPage(40);
  sectionHeader('DATA SOURCES');

  const sources = [
    ['CMS Provider Information', '14,713 facilities', 'Star ratings, beds, ownership, location'],
    ['CMS Health Deficiencies', '417,293 citations', 'Standard surveys, complaint investigations'],
    ['CMS Penalties Data', '18,060 actions', 'Fines and payment denials'],
    ['CMS Ownership Data', '157,839 records', 'Tracks 5%+ ownership interests'],
    ['Payroll-Based Journal (PBJ)', '1.3M+ daily records', 'Mandatory payroll staffing data by shift'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Dataset', 'Records', 'What It Contains']],
    body: sources,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, textColor: C.text },
    headStyles: { fillColor: C.headerBg, textColor: C.white, fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { halign: 'center', cellWidth: 30 },
    },
    alternateRowStyles: { fillColor: C.light },
    margin: { left: M, right: M },
  });
  y = (doc.lastAutoTable?.finalY ?? doc.previousAutoTable?.finalY ?? y) + 6;

  // Glossary
  needsPage(50);
  subHeader('Glossary');

  const glossary = [
    ['RN', 'Registered Nurse -- highest-level bedside nurse'],
    ['LPN', 'Licensed Practical Nurse'],
    ['CNA', 'Certified Nursing Assistant'],
    ['Hrs/resident/day', 'Total nursing hours divided by residents per day'],
    ['PBJ', 'Payroll-Based Journal -- mandatory payroll records submitted to CMS'],
    ['Serious Danger', 'Most severe citation -- risk of serious injury or death'],
    ['Residents Hurt', 'Second-most severe -- actual harm documented'],
    ['CCN', 'CMS Certification Number -- unique facility ID'],
    ['SFF', 'Special Focus Facility -- flagged by CMS for serious quality history'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Term', 'Definition']],
    body: glossary,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, textColor: C.text },
    headStyles: { fillColor: C.headerBg, textColor: C.white, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } },
    alternateRowStyles: { fillColor: C.light },
    margin: { left: M, right: M },
  });
  y = (doc.lastAutoTable?.finalY ?? doc.previousAutoTable?.finalY ?? y) + 6;

  // Disclaimer
  needsPage(25);
  doc.setFillColor(...C.warningBg);
  doc.setDrawColor(...C.warningBar);
  doc.roundedRect(M, y, W, 22, 2, 2, 'FD');
  doc.setFillColor(...C.warningBar);
  doc.rect(M, y, 3, 22, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.warning);
  doc.text('Educational Use Disclaimer', M + 6, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const disc = doc.splitTextToSize(
    'This analysis is for informational purposes only. Risk scores indicate areas warranting further investigation, not confirmed issues. All data sourced from publicly available CMS datasets. Always visit facilities in person and consult with healthcare professionals before making decisions.',
    W - 12
  );
  doc.text(disc, M + 6, y + 10);
  y += 26;

  // About footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text('The Oversight Report -- Making nursing home data accessible for families.', pw / 2, y, { align: 'center' });
  y += 4;
  doc.text('Built by Robert Benard, NP  |  DataLink Clinical LLC  |  contact@oversightreports.com', pw / 2, y, { align: 'center' });

  footer();

  // ── Save ──
  const clean = facility.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`OversightReport_${clean}_${dateStr}.pdf`);
}
