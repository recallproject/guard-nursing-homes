import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pdfSafeText, pdfSafeDeep } from './pdfSafeText.js';

describe('pdfSafeText', () => {
  it('turns arrows and dashes into ASCII separators', () => {
    assert.equal(
      pdfSafeText('RN hours moved 0.07 → 0.17 → 0.22'),
      'RN hours moved 0.07 -> 0.17 -> 0.22'
    );
    assert.equal(
      pdfSafeText('01/01/2024 → Winnie-Stowell Hospital District'),
      '01/01/2024 -> Winnie-Stowell Hospital District'
    );
    assert.equal(
      pdfSafeText('Murrell, Edward — controls 77 facilities'),
      'Murrell, Edward - controls 77 facilities'
    );
  });

  it('strips smart punctuation that Helvetica cannot draw', () => {
    assert.equal(pdfSafeText('“Not corrected” — confirm today’s status'), '"Not corrected" - confirm today\'s status');
    assert.equal(pdfSafeText('CMS CCN · 675408'), 'CMS CCN - 675408');
    assert.doesNotMatch(pdfSafeText('hours → zero'), /!['’]/);
    assert.doesNotMatch(pdfSafeText('hours → zero'), /→/);
  });

  it('walks nested brief-model objects', () => {
    const sanitized = pdfSafeDeep({
      staffingContext: ['RN hours moved 0.07 → 0.17'],
      ownership: [{ label: 'Change', value: '01/01/2024 → New Owner' }],
    });
    assert.equal(sanitized.staffingContext[0], 'RN hours moved 0.07 -> 0.17');
    assert.equal(sanitized.ownership[0].value, '01/01/2024 -> New Owner');
  });
});
