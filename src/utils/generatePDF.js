import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generates a professional PDF report for a nursing home facility.
 * This PDF is designed to be courtroom-ready, black-and-white printer friendly,
 * and suitable for family meetings or hospital chart inclusion.
 *
 * @param {Object} facility - The facility data object
 */
export function generatePDF(facility) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let currentY = margin;
  let pageNumber = 1;

  // Helper functions
  const fmt = (v) => (!v && v !== 0) ? 'N/A' : `$${v.toLocaleString()}`;
  const pct = (v) => (v === null || v === undefined) ? 'N/A' : `${v.toFixed(0)}%`;
  const rnMin = facility.rn_hprd ? Math.round(facility.rn_hprd * 60) : 0;

  // Footer on every page
  const addFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      'GUARD - Nursing Home Risk Data | guardnursinghomes.com',
      pageWidth / 2,
      pageHeight - 15,
      { align: 'center' }
    );
    doc.text(
      'Data: CMS Provider Data, processed 2026-02-23',
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `Page ${pageNumber}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  };

  // Add new page helper
  const addNewPage = () => {
    doc.addPage();
    pageNumber++;
    currentY = margin;
    addFooter();
  };

  // Check if we need a new page
  const checkPageBreak = (requiredSpace) => {
    if (currentY + requiredSpace > pageHeight - 30) {
      addNewPage();
      return true;
    }
    return false;
  };

  // Safety level helper
  const getSafetyLevel = () => {
    if (facility.jeopardy_count > 0) return 'CONCERNING';
    if (facility.harm_count > 0) return 'SOME ISSUES';
    return 'GOOD';
  };

  // Bottom line helper
  const getBottomLine = () => {
    const parts = [];
    if (facility.jeopardy_count > 0)
      parts.push(`Inspectors found serious danger to residents ${facility.jeopardy_count} time${facility.jeopardy_count !== 1 ? 's' : ''} — risk of serious injury or death.`);
    else if (facility.harm_count > 0)
      parts.push(`Residents were hurt ${facility.harm_count} time${facility.harm_count !== 1 ? 's' : ''} according to inspection reports.`);
    if (facility.total_fines > 0)
      parts.push(`This facility has been fined ${fmt(facility.total_fines)}.`);
    if (facility.zero_rn_pct > 25)
      parts.push(`On ${pct(facility.zero_rn_pct)} of days, there was no registered nurse in the building.`);
    if (facility.owner_portfolio_count > 1)
      parts.push(`The same company runs ${facility.owner_portfolio_count} other facilities${facility.owner_avg_fines ? ` with average fines of ${fmt(facility.owner_avg_fines)} each` : ''}.`);
    if (parts.length === 0)
      parts.push('This facility has no major issues recorded in recent CMS data.');
    return parts.join(' ');
  };

  // Generate questions
  const getQuestions = () => {
    const questions = [];

    if (facility.zero_rn_pct > 10) {
      questions.push({
        q: 'How many registered nurses are on duty right now? What is your weekend staffing like?',
        context: `This facility had zero RN days ${pct(facility.zero_rn_pct)} of the time.`
      });
    }

    if (facility.jeopardy_count > 0) {
      questions.push({
        q: 'What corrective actions were taken after the serious danger citation?',
        context: `Government inspectors found serious danger to residents ${facility.jeopardy_count} time(s).`
      });
    }

    if (facility.rn_gap_pct > 30) {
      questions.push({
        q: 'Can I see your actual staffing schedules for the past month?',
        context: `Facility reports ${pct(facility.rn_gap_pct)} more RN hours than payroll records show.`
      });
    }

    if (facility.total_fines > 50000) {
      questions.push({
        q: 'What changes have you made since being fined by the government?',
        context: `Total fines: ${fmt(facility.total_fines)}`
      });
    }

    if (facility.owner_portfolio_count > 10) {
      questions.push({
        q: 'How does this facility\'s staffing compare to the owner\'s other facilities?',
        context: `This owner operates ${facility.owner_portfolio_count} facilities.`
      });
    }

    questions.push({
      q: 'Can I visit at different times of day, including evenings and weekends?',
      context: 'Staffing levels and care quality can vary dramatically by time and day.'
    });

    return questions;
  };

  // ============= PAGE 1: COVER/SUMMARY =============

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('GUARD SAFETY REPORT', pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  // Facility name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const nameLines = doc.splitTextToSize(facility.name, contentWidth);
  doc.text(nameLines, pageWidth / 2, currentY, { align: 'center' });
  currentY += (nameLines.length * 7) + 3;

  // Address
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${facility.city}, ${facility.state} ${facility.zip || ''}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  // Summary box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, contentWidth, 55, 'FD');

  currentY += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('KEY STATISTICS', margin + 5, currentY);
  currentY += 7;

  doc.setFont('helvetica', 'normal');
  const stats = [
    `CMS Star Rating: ${facility.stars || 0}/5`,
    `GUARD Risk Score: ${facility.composite || 'N/A'}`,
    `Total Deficiencies: ${facility.total_deficiencies || 0}`,
    `Total Fines: ${fmt(facility.total_fines || 0)}`,
    `Serious Danger Citations: ${facility.jeopardy_count || 0}`,
    `Days Without RN: ${pct(facility.zero_rn_pct || 0)}`
  ];

  stats.forEach(stat => {
    doc.text(stat, margin + 7, currentY);
    currentY += 5;
  });

  currentY += 8;

  // Bottom line summary
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BOTTOM LINE SUMMARY', margin, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  const bottomLineText = doc.splitTextToSize(getBottomLine(), contentWidth);
  doc.text(bottomLineText, margin, currentY);
  currentY += (bottomLineText.length * 5) + 8;

  // External links
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EXTERNAL RESOURCES', margin, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  const propublica = `ProPublica Report: projects.propublica.org/nursing-homes/homes/h-${facility.ccn}`;
  const medicare = `Medicare Compare: medicare.gov/care-compare/details/nursing-home/${facility.ccn}`;

  doc.text(propublica, margin, currentY);
  currentY += 5;
  doc.text(medicare, margin, currentY);
  currentY += 10;

  // Report date
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Report generated: ${today}`, margin, currentY);

  addFooter();

  // ============= PAGE 2: SAFETY & INSPECTION DETAILS =============

  addNewPage();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Safety & Inspection Details', margin, currentY);
  currentY += 10;

  // Safety assessment
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Safety Assessment', margin, currentY);
  currentY += 7;

  const safetyLevel = getSafetyLevel();
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Overall Safety: ${safetyLevel}`, margin + 5, currentY);
  currentY += 7;

  doc.setFont('helvetica', 'normal');
  if (facility.jeopardy_count > 0) {
    const jeopText = doc.splitTextToSize(
      `SERIOUS DANGER: Government inspectors found serious danger to residents ${facility.jeopardy_count} time(s). These are conditions so serious that residents faced risk of serious injury or death.`,
      contentWidth - 10
    );
    doc.text(jeopText, margin + 5, currentY);
    currentY += (jeopText.length * 5) + 5;
  } else if (facility.harm_count > 0) {
    const harmText = doc.splitTextToSize(
      `RESIDENTS HURT: Residents were hurt ${facility.harm_count} time(s) according to inspection reports. Inspectors found that facility practices caused actual harm to residents.`,
      contentWidth - 10
    );
    doc.text(harmText, margin + 5, currentY);
    currentY += (harmText.length * 5) + 5;
  } else {
    doc.text('No serious safety issues found in recent inspections.', margin + 5, currentY);
    currentY += 7;
  }

  // Deficiency breakdown table
  checkPageBreak(40);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Deficiency Breakdown', margin, currentY);
  currentY += 7;

  const minorCount = Math.max(0, (facility.total_deficiencies || 0) - (facility.harm_count || 0) - (facility.jeopardy_count || 0));

  doc.autoTable({
    startY: currentY,
    head: [['Category', 'Count', 'Description']],
    body: [
      ['Minor Issues', minorCount.toString(), 'Technical violations, no harm to residents'],
      ['Residents Hurt', (facility.harm_count || 0).toString(), 'Actual harm documented by inspectors'],
      ['Serious Danger', (facility.jeopardy_count || 0).toString(), 'Risk of serious injury or death']
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [248, 250, 252], textColor: [0, 0, 0], fontStyle: 'bold' },
    margin: { left: margin, right: margin }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // Top problem areas
  if (facility.top_categories && facility.top_categories.length > 0) {
    checkPageBreak(50);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Problem Areas', margin, currentY);
    currentY += 7;

    const topProblemsData = facility.top_categories.slice(0, 10).map(([category, count]) => [
      category,
      count.toString()
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['Problem Category', 'Citations']],
      body: topProblemsData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [248, 250, 252], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: margin, right: margin }
    });

    currentY = doc.lastAutoTable.finalY + 10;
  }

  // Source
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Source: CMS Health Deficiencies Data, processed 2026-02-23', margin, currentY);

  // ============= PAGE 3: STAFFING & FINES =============

  addNewPage();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Staffing & Financial Penalties', margin, currentY);
  currentY += 10;

  // Staffing section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Staffing Levels', margin, currentY);
  currentY += 7;

  const rnCompare = rnMin < 45 ? 'below the research standard of 45 minutes' : rnMin < 60 ? 'below the ideal of 1 hour' : 'meeting research standards';

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`RN Minutes Per Resident Per Day: ${rnMin} minutes (${rnCompare})`, margin + 5, currentY);
  currentY += 6;
  doc.text(`Days With Zero RN: ${pct(facility.zero_rn_pct || 0)}`, margin + 5, currentY);
  currentY += 6;

  if (facility.rn_gap_pct > 20) {
    const gapText = doc.splitTextToSize(
      `STAFFING DATA MISMATCH: This facility reports ${facility.rn_gap_pct?.toFixed(0)}% more RN hours than payroll records show. The actual staffing may be lower than advertised.`,
      contentWidth - 10
    );
    doc.text(gapText, margin + 5, currentY);
    currentY += (gapText.length * 5) + 3;
  }

  currentY += 5;

  // Fines section
  checkPageBreak(30);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Penalties', margin, currentY);
  currentY += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Fines: ${fmt(facility.total_fines || 0)}`, margin + 5, currentY);
  currentY += 6;
  doc.text(`Number of Fines: ${facility.fine_count || 0}`, margin + 5, currentY);
  currentY += 6;
  doc.text(`Payment Denials: ${facility.denial_count || 0}`, margin + 5, currentY);
  currentY += 10;

  // Ownership section
  checkPageBreak(30);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Ownership Information', margin, currentY);
  currentY += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Owner: ${facility.worst_owner || facility.chain_name || 'N/A'}`, margin + 5, currentY);
  currentY += 6;

  if (facility.owner_portfolio_count > 1) {
    doc.text(`Portfolio Size: ${facility.owner_portfolio_count} facilities`, margin + 5, currentY);
    currentY += 6;
    if (facility.owner_avg_fines > 0) {
      doc.text(`Average Fines Per Facility: ${fmt(facility.owner_avg_fines)}`, margin + 5, currentY);
      currentY += 6;
    }
  }

  doc.text(`Ownership Type: ${facility.ownership_type || 'N/A'}`, margin + 5, currentY);
  currentY += 10;

  // Source
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Sources: CMS Payroll-Based Journal, Penalties Data, Ownership Data', margin, currentY);

  // ============= PAGE 4: QUESTIONS & RESOURCES =============

  addNewPage();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Questions & Resources', margin, currentY);
  currentY += 10;

  // Questions to ask
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Questions to Ask When You Visit', margin, currentY);
  currentY += 7;

  doc.setFontSize(9);
  const questions = getQuestions();

  questions.forEach((item, idx) => {
    checkPageBreak(20);

    doc.setFont('helvetica', 'bold');
    doc.text(`${idx + 1}. ${item.q}`, margin + 3, currentY, { maxWidth: contentWidth - 6 });
    const qHeight = doc.splitTextToSize(`${idx + 1}. ${item.q}`, contentWidth - 6).length * 4;
    currentY += qHeight + 2;

    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    const contextText = doc.splitTextToSize(`Context: ${item.context}`, contentWidth - 10);
    doc.text(contextText, margin + 5, currentY);
    currentY += (contextText.length * 4) + 5;
    doc.setTextColor(0, 0, 0);
  });

  currentY += 5;

  // What you can do
  checkPageBreak(40);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('What You Can Do', margin, currentY);
  currentY += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const actions = [];
  if (facility.jeopardy_count > 0 || facility.harm_count > 0 || facility.total_fines > 50000) {
    actions.push('File a complaint with your state survey agency if you observe concerning conditions.');
  }
  actions.push('Visit at different times of day, including evenings and weekends.');
  actions.push('Talk to residents and families currently at the facility.');
  actions.push('Review recent inspection reports online before making a decision.');

  actions.forEach(action => {
    const actionText = doc.splitTextToSize(`- ${action}`, contentWidth - 10);
    doc.text(actionText, margin + 5, currentY);
    currentY += (actionText.length * 4.5) + 2;
  });

  currentY += 5;

  // National resources
  checkPageBreak(25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('National Resources', margin, currentY);
  currentY += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('National Eldercare Locator: 1-800-677-1116', margin + 5, currentY);
  currentY += 5;
  doc.text(`ProPublica Nursing Home Inspect: projects.propublica.org/nursing-homes/`, margin + 5, currentY);
  currentY += 5;
  doc.text(`Medicare Care Compare: medicare.gov/care-compare/`, margin + 5, currentY);
  currentY += 10;

  // Disclaimer
  checkPageBreak(25);

  doc.setDrawColor(245, 158, 11);
  doc.setFillColor(254, 243, 199);
  doc.rect(margin, currentY, contentWidth, 25, 'FD');

  currentY += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Educational Use Disclaimer', margin + 3, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  const disclaimerText = doc.splitTextToSize(
    'This analysis is for informational purposes only. Risk scores indicate areas warranting further investigation, not confirmed issues. All data sourced from publicly available CMS datasets. Always visit facilities in person and consult with healthcare professionals.',
    contentWidth - 6
  );
  doc.text(disclaimerText, margin + 3, currentY);

  // Generate filename and trigger download
  const facilityNameClean = facility.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `GUARD_Report_${facilityNameClean}_${dateStr}.pdf`;

  doc.save(filename);
}
