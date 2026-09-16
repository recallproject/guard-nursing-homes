import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jsPDFModule from 'jspdf';
import { BRIEF_PDF_FONT, registerBriefPdfFonts } from './briefPdfFonts.js';
import { decodeJsPdfContent } from './pdfSafeText.js';

const jsPDF = jsPDFModule.jsPDF || jsPDFModule;

describe('briefPdfFonts', () => {
  it('registers an embedded TrueType family instead of Standard-14 Helvetica', () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', putOnlyUsedFonts: true });
    registerBriefPdfFonts(doc);
    doc.setFont(BRIEF_PDF_FONT, 'bold');
    doc.setFontSize(12);
    doc.text('Ask: Walk me through the current abuse-prevention policy.', 14, 20);
    const raw = doc.output();
    const text = decodeJsPdfContent(raw);
    assert.match(raw, /LiberationSans/);
    assert.match(raw, /\/FontFile2/);
    assert.match(raw, /\/Subtype\s*\/CIDFontType2/);
    assert.match(raw, /Identity-H/);
    assert.match(text, /Ask: Walk me through the current abuse-prevention policy\./);
  });
});
