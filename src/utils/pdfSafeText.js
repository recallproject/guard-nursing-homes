/**
 * Helvetica in jsPDF is WinAnsi. Unicode punctuation (arrows, em dashes,
 * smart quotes) is encoded as multi-byte garbage — viewers show `!'`,
 * stretched letter-spacing, or overlapping glyphs.
 *
 * Family-facing PDF strings should stay ASCII-safe.
 */

const CHAR_MAP = {
  '\u2014': ' - ', // em dash
  '\u2013': '-', // en dash
  '\u2012': '-',
  '\u2010': '-',
  '\u2212': '-',
  '\u2192': ' -> ',
  '\u2190': ' <- ',
  '\u21D2': ' -> ',
  '\u00B7': ' - ', // middle dot
  '\u2022': '-',
  '\u2023': '-',
  '\u2026': '...',
  '\u201C': '"',
  '\u201D': '"',
  '\u2018': "'",
  '\u2019': "'",
  '\u00A0': ' ',
  '\u202F': ' ',
  '\u2009': ' ',
  '\u200A': ' ',
  '\u200B': '',
  '\u2265': '>=',
  '\u2264': '<=',
  '\u00D7': 'x',
  '\u00A7': 'section ',
};

export function pdfSafeText(text) {
  if (text == null) return '';
  let out = '';
  for (const ch of String(text)) {
    if (Object.prototype.hasOwnProperty.call(CHAR_MAP, ch)) {
      out += CHAR_MAP[ch];
      continue;
    }
    const code = ch.codePointAt(0);
    if (ch === '\t' || ch === '\n' || ch === '\r' || (code >= 0x20 && code <= 0x7e)) {
      out += ch;
      continue;
    }
    // Keep Latin-1 letters/symbols Helvetica can actually draw (accents).
    if (code >= 0xa0 && code <= 0xff) {
      out += ch;
    }
  }
  return out.replace(/[ \t]{2,}/g, ' ');
}

export function pdfSafeDeep(value) {
  if (typeof value === 'string') return pdfSafeText(value);
  if (Array.isArray(value)) return value.map(pdfSafeDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, pdfSafeDeep(val)]));
  }
  return value;
}
