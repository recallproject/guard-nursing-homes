import { STATE_NAME } from '../data/postAcuteCatalog';

const CCN_RE = /^[A-Za-z0-9]{4,12}$/;
const ZIP_RE = /^[0-9]{5}(-[0-9]{4})?$/;

export function sanitizeCcn(raw) {
  if (raw == null) return '';
  return String(raw).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

export function isValidCcn(raw) {
  return CCN_RE.test(sanitizeCcn(raw));
}

export function looksLikeZip(value) {
  return ZIP_RE.test(String(value || '').trim());
}

export function looksLikeCcn(value) {
  const s = String(value || '').trim();
  if (!CCN_RE.test(s)) return false;
  // Pure 5-digit is more likely a ZIP than a CCN.
  if (/^[0-9]{5}$/.test(s)) return false;
  return true;
}

export function formatPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return String(raw).trim();
}

export function toTitleCase(s) {
  if (!s) return s;
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bLlc\b/g, 'LLC')
    .replace(/\bInc\b/g, 'Inc')
    .replace(/\bLp\b/g, 'LP')
    .replace(/\bLtac\b/g, 'LTAC')
    .replace(/\bLtach\b/g, 'LTACH')
    .replace(/\bLtch\b/g, 'LTCH')
    .replace(/\bIrf\b/g, 'IRF')
    .replace(/\bHh\b/g, 'HH');
}

export function stateLabel(code) {
  if (!code) return '';
  return STATE_NAME[code] || code;
}

export function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

export function formatMetric(value, format) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (format === 'stars') {
    if (!Number.isFinite(n)) return null;
    return `${n.toFixed(n % 1 === 0 ? 0 : 1)} ★`;
  }
  if (format === 'pct') {
    if (!Number.isFinite(n)) return null;
    return `${n.toFixed(n % 1 === 0 ? 0 : 1)}%`;
  }
  if (format === 'number') {
    if (!Number.isFinite(n)) return String(value);
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return String(value);
}

export function formatDateYear(d) {
  if (!d) return null;
  const parts = String(d).split('/');
  if (parts.length === 3) return parts[2];
  return d;
}

export const SETTING_ROUTE = {
  snf: (ccn) => `/facility/${ccn}`,
  hospice: (ccn) => `/hospice/${ccn}`,
  'home-health': (ccn) => `/home-health/${ccn}`,
  irf: (ccn) => `/irf/${ccn}`,
  ltach: (ccn) => `/ltach/${ccn}`,
};

export const SETTING_LABEL = {
  snf: 'Nursing home',
  hospice: 'Hospice',
  'home-health': 'Home health',
  irf: 'Inpatient rehab',
  ltach: 'LTACH',
};
