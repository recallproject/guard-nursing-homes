import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generates a litigation-ready Evidence Package PDF
 * B&W printer-friendly, professional formatting
 *
 * @param {Object} facility - The facility data object
 * @param {Array} nearbyAlternatives - Array of nearby facilities with better scores
 */
export function generateEvidencePDF(facility, nearbyAlternatives = []) {
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
  const num = (v) => (v === null || v === undefined) ? 'N/A' : v.toFixed(1);

  // Footer on every page
  const addFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${facility.name} | CCN: ${facility.ccn}`,
      margin,
      pageHeight - 10
    );
    doc.text(
      `Page ${pageNumber}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
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
    if (currentY + requiredSpace > pageHeight - 25) {
      addNewPage();
      return true;
    }
    return false;
  };

  // Section header helper
  const addSectionHeader = (number, title) => {
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`${number}. ${title}`, margin, currentY);
    currentY += 3;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;
  };

  // Data row helper
  const addDataRow = (label, value) => {
    checkPageBreak(10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(label, margin + 2, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(value.toString(), pageWidth - margin - 2, currentY, { align: 'right' });
    currentY += 6;
  };

  // Red flags logic
  const redFlags = [];
  if (facility.jeopardy_count > 0) {
    redFlags.push(`Serious danger citations: ${facility.jeopardy_count}`);
  }
  if (facility.harm_count > 0) {
    redFlags.push(`Residents hurt: ${facility.harm_count}`);
  }
  if (facility.rn_gap_pct > 30) {
    redFlags.push(`Staffing discrepancy: ${pct(facility.rn_gap_pct)} gap`);
  }
  if (facility.zero_rn_pct > 25) {
    redFlags.push(`Zero-RN days: ${pct(facility.zero_rn_pct)}`);
  }
  if (facility.total_fines > 100000) {
    redFlags.push(`High financial penalties: ${fmt(facility.total_fines)}`);
  }

  // Executive summary generator
  const getExecutiveSummary = () => {
    const parts = [];
    const score = facility.composite || 0;

    if (score >= 70) {
      parts.push('This facility shows significant patterns of concern in federal data.');
    } else if (score >= 50) {
      parts.push('This facility shows some patterns of concern in federal data.');
    } else {
      parts.push('This facility shows relatively few concerns in federal data.');
    }

    if (facility.jeopardy_count > 0 || facility.harm_count > 0) {
      parts.push(`Inspectors documented serious safety issues including ${facility.jeopardy_count > 0 ? 'conditions posing serious danger to residents' : 'actual harm to residents'}.`);
    }

    if (facility.total_fines > 50000) {
      parts.push(`Federal regulators have imposed ${fmt(facility.total_fines)} in financial penalties.`);
    } else if (facility.total_fines === 0) {
      parts.push('No federal financial penalties recorded in recent data.');
    }

    return parts.join(' ');
  };

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // ============= PAGE 1: COVER PAGE =============

  // Logo
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('THE OVERSIGHT REPORT', pageWidth / 2, 50, { align: 'center' });
  currentY = 65;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('EVIDENCE PACKAGE', pageWidth / 2, currentY, { align: 'center' });
  currentY += 20;

  // Facility name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const nameLines = doc.splitTextToSize(facility.name, contentWidth - 40);
  doc.text(nameLines, pageWidth / 2, currentY, { align: 'center' });
  currentY += (nameLines.length * 8) + 5;

  // Address
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  if (facility.address) {
    doc.text(facility.address, pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;
  }
  doc.text(`${facility.city}, ${facility.state} ${facility.zip || ''}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`CMS CCN: ${facility.ccn}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 25;

  // Confidential notice
  doc.setDrawColor(200, 0, 0);
  doc.setLineWidth(1);
  doc.rect(margin + 30, currentY - 8, contentWidth - 60, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 0, 0);
  doc.text('CONFIDENTIAL — Prepared for authorized use', pageWidth / 2, currentY, { align: 'center' });
  currentY += 20;

  // Date generated
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${today}`, pageWidth / 2, currentY, { align: 'center' });

  addFooter();

  // ============= PAGE 2: EXECUTIVE SUMMARY =============

  addNewPage();
  addSectionHeader(1, 'Executive Summary');

  // Key metrics box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, contentWidth / 2 - 5, 30, 'FD');
  doc.rect(margin + contentWidth / 2 + 5, currentY, contentWidth / 2 - 5, 30, 'FD');

  // Risk score
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('RISK SCORE', margin + (contentWidth / 4) - 2.5, currentY + 8, { align: 'center' });
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text((facility.composite?.toFixed(1) || 'N/A'), margin + (contentWidth / 4) - 2.5, currentY + 20, { align: 'center' });

  // Star rating
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('CMS STAR RATING', margin + contentWidth / 2 + 5 + (contentWidth / 4) - 2.5, currentY + 8, { align: 'center' });
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${facility.stars || 0}/5`, margin + contentWidth / 2 + 5 + (contentWidth / 4) - 2.5, currentY + 20, { align: 'center' });

  currentY += 38;

  // Assessment text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Assessment:', margin, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  const summaryText = doc.splitTextToSize(getExecutiveSummary(), contentWidth);
  doc.text(summaryText, margin, currentY);
  currentY += (summaryText.length * 5) + 10;

  // ============= PAGE 3: OWNERSHIP PROFILE =============

  checkPageBreak(60);
  addSectionHeader(2, 'Ownership Profile');

  addDataRow('Owner Name:', facility.worst_owner || facility.chain_name || 'N/A');
  addDataRow('Chain Name:', facility.chain_name || 'N/A');
  addDataRow('Ownership Type:', facility.ownership_type || 'N/A');
  addDataRow('Portfolio Size:', facility.owner_portfolio_count > 1 ? `${facility.owner_portfolio_count} facilities` : '1 facility');

  currentY += 5;

  // ============= STAFFING ANALYSIS =============

  checkPageBreak(80);
  addSectionHeader(3, 'Staffing Analysis');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Hours Per Resident Per Day (HPRD)', margin, currentY);
  currentY += 7;

  addDataRow('Registered Nurse (RN):', `${num(facility.rn_hprd)} hrs`);
  addDataRow('Licensed Practical Nurse (LPN):', `${num(facility.lpn_hprd)} hrs`);
  addDataRow('Certified Nursing Assistant (CNA):', `${num(facility.cna_hprd)} hrs`);
  addDataRow('Total Nursing:', `${num(facility.total_hprd)} hrs`);

  currentY += 5;
  checkPageBreak(40);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Staffing Verification', margin, currentY);
  currentY += 7;

  addDataRow('Self-Reported RN Hours:', `${num(facility.self_report_rn)} hrs`);
  addDataRow('Verified RN Hours (Payroll):', `${num(facility.rn_hprd)} hrs`);
  addDataRow('Discrepancy:', pct(facility.rn_gap_pct));
  addDataRow('Days Without RN:', pct(facility.zero_rn_pct));
  addDataRow('Weekend Staffing:', `${num(facility.weekend_total_hprd)} hrs`);

  if (facility.rn_gap_pct > 20) {
    currentY += 5;
    checkPageBreak(15);
    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, currentY - 5, contentWidth, 12, 'FD');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Note: Significant discrepancy between self-reported and verified staffing data.', margin + 2, currentY);
    currentY += 10;
  }

  currentY += 5;

  // ============= INSPECTION HISTORY =============

  checkPageBreak(80);
  addSectionHeader(4, 'Inspection History');

  addDataRow('Total Deficiencies:', (facility.total_deficiencies || 0).toString());
  addDataRow('Serious Danger Citations:', (facility.jeopardy_count || 0).toString());
  addDataRow('Residents Hurt:', (facility.harm_count || 0).toString());

  currentY += 5;
  checkPageBreak(60);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Deficiency Categories', margin, currentY);
  currentY += 7;

  addDataRow('Infection Control:', (facility.infection_control_count || 0).toString());
  addDataRow('Quality of Care:', (facility.quality_of_care_count || 0).toString());
  addDataRow('Resident Rights:', (facility.resident_rights_count || 0).toString());
  addDataRow('Administration:', (facility.admin_count || 0).toString());
  addDataRow('Nutrition:', (facility.nutrition_count || 0).toString());
  addDataRow('Environment:', (facility.environment_count || 0).toString());
  addDataRow('Pharmacy Services:', (facility.pharmacy_count || 0).toString());
  addDataRow('Abuse Prevention:', (facility.abuse_count || 0).toString());
  addDataRow('Other:', (facility.other_count || 0).toString());

  currentY += 5;

  // ============= FINANCIAL PENALTIES =============

  checkPageBreak(40);
  addSectionHeader(5, 'Financial Penalties');

  addDataRow('Total Fines:', fmt(facility.total_fines || 0));
  addDataRow('Number of Fines:', (facility.fine_count || 0).toString());
  addDataRow('Payment Denials:', (facility.denial_count || 0).toString());

  currentY += 5;

  // ============= RED FLAGS =============

  checkPageBreak(40);
  addSectionHeader(6, 'Red Flags / Accountability Indicators');

  if (redFlags.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    redFlags.forEach(flag => {
      checkPageBreak(10);
      doc.text(`• ${flag}`, margin + 3, currentY);
      currentY += 6;
    });
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('No major red flags identified in available data.', margin, currentY);
    currentY += 6;
  }

  currentY += 5;

  // ============= NEARBY ALTERNATIVES =============

  checkPageBreak(40);
  addSectionHeader(7, 'Nearby Alternatives');

  if (nearbyAlternatives.length > 0) {
    nearbyAlternatives.forEach((alt, idx) => {
      checkPageBreak(20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${idx + 1}. ${alt.name}`, margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(`${alt.distance.toFixed(1)} mi`, pageWidth - margin, currentY, { align: 'right' });
      currentY += 6;

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`${alt.city}, ${alt.state}`, margin + 5, currentY);
      currentY += 5;

      doc.text(`Risk Score: ${alt.composite?.toFixed(1) || 'N/A'}  |  Stars: ${alt.stars || 0}/5`, margin + 5, currentY);
      currentY += 8;
    });
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('No nearby facilities with better scores found within search radius.', margin, currentY);
    currentY += 6;
  }

  currentY += 5;

  // ============= METHODOLOGY =============

  checkPageBreak(80);
  addSectionHeader(8, 'Methodology');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Data Sources', margin, currentY);
  currentY += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('All data sourced from publicly available federal databases:', margin, currentY);
  currentY += 6;

  const sources = [
    'CMS Care Compare (Provider Information, Star Ratings)',
    'CMS Payroll-Based Journal (Daily Nurse Staffing)',
    'CMS Health Deficiencies (State Survey Agency Inspections)',
    'CMS Penalties (Fines and Payment Denials)',
    'CMS Ownership Database (Corporate Structure)'
  ];

  sources.forEach(source => {
    checkPageBreak(8);
    doc.text(`  • ${source}`, margin + 2, currentY);
    currentY += 5;
  });

  currentY += 5;
  checkPageBreak(40);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Composite Score Formula', margin, currentY);
  currentY += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Weighted composite of multiple factors:', margin, currentY);
  currentY += 6;

  const weights = [
    'Staffing Levels: 30% (verified payroll vs. self-reported)',
    'Inspection Results: 25% (deficiencies, serious danger, harm)',
    'Financial Penalties: 20% (fines, payment denials)',
    'Ownership History: 15% (portfolio performance, patterns)',
    'Quality Measures: 10% (CMS star rating components)'
  ];

  weights.forEach(weight => {
    checkPageBreak(8);
    doc.text(`  • ${weight}`, margin + 2, currentY);
    currentY += 5;
  });

  currentY += 3;
  const methodNote = doc.splitTextToSize('Higher scores indicate greater patterns of concern in federal data.', contentWidth - 4);
  doc.text(methodNote, margin + 2, currentY);
  currentY += (methodNote.length * 5) + 5;

  // ============= DISCLAIMER =============

  checkPageBreak(60);
  addSectionHeader(9, 'Disclaimer');

  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(248, 248, 248);
  doc.rect(margin, currentY - 3, contentWidth, 50, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const disclaimerParagraphs = [
    'This report is generated from publicly available federal data and is provided for informational purposes only.',
    'This document does not constitute legal advice, medical advice, or a recommendation for or against any specific facility. Risk scores represent patterns in federal data that may warrant further investigation.',
    'Facilities should be evaluated through personal visits, consultation with healthcare professionals, and review of current inspection reports. Conditions may have changed since data collection.',
    'If you have concerns about a nursing home, contact: Your state survey agency (health department), HHS Office of Inspector General (tips.hhs.gov), or National Eldercare Locator (1-800-677-1116).'
  ];

  let disclaimerY = currentY + 2;
  disclaimerParagraphs.forEach(para => {
    const lines = doc.splitTextToSize(para, contentWidth - 6);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, margin + 3, disclaimerY);
    disclaimerY += (lines.length * 4.5) + 2;
  });

  // Generate filename and trigger download
  const facilityNameClean = facility.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `OversightReport_Evidence_${facilityNameClean}_${dateStr}.pdf`;

  doc.save(filename);
}
