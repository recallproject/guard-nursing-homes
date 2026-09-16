/**
 * Embedded vector fonts for the paid Facility Brief PDF.
 *
 * jsPDF's built-in Helvetica is a Standard-14 name that is NOT embedded.
 * Viewers substitute their own Helvetica/Arial, which looks thin, uneven,
 * and "sloppy" at small sizes. Liberation Sans is a hinted TrueType family
 * (SIL OFL) we subset to Latin-1 and embed as FontFile2 outlines.
 */
import {
  LIBERATION_SANS_BOLD_B64,
  LIBERATION_SANS_REGULAR_B64,
} from './briefPdfFontData.js';

export const BRIEF_PDF_FONT = 'LiberationSans';

function b64ToBinaryString(b64) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('latin1');
  }
  const binary = atob(b64);
  return binary;
}

let cachedRegular;
let cachedBold;

function regularBinary() {
  if (!cachedRegular) cachedRegular = b64ToBinaryString(LIBERATION_SANS_REGULAR_B64);
  return cachedRegular;
}

function boldBinary() {
  if (!cachedBold) cachedBold = b64ToBinaryString(LIBERATION_SANS_BOLD_B64);
  return cachedBold;
}

/**
 * Register Regular + Bold on a jsPDF document and select Regular.
 * @param {import('jspdf').jsPDF} doc
 */
export function registerBriefPdfFonts(doc) {
  doc.addFileToVFS('LiberationSans-Regular.ttf', regularBinary());
  doc.addFileToVFS('LiberationSans-Bold.ttf', boldBinary());
  // Identity-H embeds CID TrueType with correct glyph widths. WinAnsiEncoding
  // on a custom TTF uses the raw hmtx array as character widths, so letters
  // overlap ("INPECTIONSOY" instead of INSPECTION STORY).
  doc.addFont('LiberationSans-Regular.ttf', BRIEF_PDF_FONT, 'normal', 'Identity-H');
  doc.addFont('LiberationSans-Bold.ttf', BRIEF_PDF_FONT, 'bold', 'Identity-H');
  doc.setFont(BRIEF_PDF_FONT, 'normal');
}
