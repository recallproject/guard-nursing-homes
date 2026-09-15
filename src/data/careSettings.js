// Canonical care-setting IA for families.
// Primary UI always uses familyLabel. nerdLabel (IRF / LTACH / SNF) is optional
// subtitle only — never the chip, nav, or page title on its own.

import { STATE_NAME, formatSettingCount } from './postAcuteCatalog.js';
import { POST_ACUTE_CMS_COUNTS } from './postAcuteCounts.js';

export const CMS_SNF_AS_OF_ISO = '2026-08-26';
export const CMS_SNF_COUNT = 14690;

export const POPULAR_SNF_STATES = ['TX', 'CA', 'FL', 'OH', 'NY', 'IL', 'PA'];

/** CMS Special Focus Facility counts shown on popular-state cards (from Care Compare watchlist). */
export const SNF_WATCHLIST_COUNTS = {
  AL: 7,
  CA: 12,
  FL: 9,
  GA: 6,
  IL: 9,
  LA: 5,
  MS: 8,
  NY: 11,
  OH: 10,
  TX: 14,
};

export const CARE_SETTINGS = [
  {
    id: 'snf',
    route: '/skilled-nursing',
    statePath: (abbr) => `/state/${String(abbr).toUpperCase()}`,
    providerPath: (ccn) => `/facility/${ccn}`,
    familyLabel: 'Skilled nursing',
    nerdLabel: null,
    pageTitle: 'Nursing home safety data',
    pageSub:
      'Medicare-certified skilled nursing facilities. See stars, inspections, staffing hours, fines, and ownership — then download a free summary or a $29 Facility Brief.',
    stateTitle: (stateName) => `${stateName} nursing homes`,
    noun: 'nursing homes',
    singular: 'nursing home',
    countUnit: 'homes',
    searchWhereLabel: 'City, ZIP, or state',
    searchNameLabel: 'Facility name (optional)',
    searchNamePlaceholder: (n) =>
      Number.isFinite(n) && n > 0 ? `Search ${n.toLocaleString('en-US')} homes` : 'Facility name',
    hubNamePlaceholder: 'e.g. Avir at Overton',
    dataDir: null,
    extraLinks: [
      { to: '/methodology', label: 'How we score' },
      { to: '/watchlist', label: 'Favorites' },
    ],
    howToRead: (asOfLabel) => [
      'Stars are signals, not a guarantee of care.',
      'Immediate Jeopardy and Special Focus flags mean dig deeper on a visit.',
      `Always check the CMS as-of date (currently ${asOfLabel}).`,
      'Facility Brief = printable pack for families — not a referral.',
    ],
  },
  {
    id: 'hospice',
    route: '/hospice',
    statePath: (abbr) => `/hospice/state/${String(abbr).toUpperCase()}`,
    providerPath: (ccn) => `/hospice/${ccn}`,
    familyLabel: 'Hospice',
    nerdLabel: null,
    pageTitle: 'Hospice quality data',
    pageSub:
      'Medicare-certified hospice providers. See CMS ratings, family survey scores, and public enforcement context — independent facts, not a referral.',
    stateTitle: (stateName) => `${stateName} hospice providers`,
    noun: 'hospice providers',
    singular: 'hospice',
    countUnit: 'providers',
    searchWhereLabel: 'City, ZIP, or state',
    searchNameLabel: 'Provider name (optional)',
    searchNamePlaceholder: (n) =>
      Number.isFinite(n) && n > 0 ? `Search ${n.toLocaleString('en-US')} providers` : 'Provider name',
    hubNamePlaceholder: 'e.g. agency name',
    dataDir: 'hospice',
    extraLinks: [
      { to: '/hospice/news', label: 'News & enforcement feed' },
      { to: '/hospice/compare', label: 'Compare hospices' },
    ],
    howToRead: (asOfLabel) => [
      'CMS and family-survey scores are signals, not a guarantee of care.',
      'Live-discharge and GIP outliers mean dig deeper before you choose.',
      `Always check the CMS as-of date (currently ${asOfLabel}).`,
      'This is independent public data — not a referral broker.',
    ],
  },
  {
    id: 'home-health',
    route: '/home-health',
    statePath: (abbr) => `/home-health/state/${String(abbr).toUpperCase()}`,
    providerPath: (ccn) => `/home-health/${ccn}`,
    familyLabel: 'Home health',
    nerdLabel: null,
    pageTitle: 'Home health quality data',
    pageSub:
      'Medicare-certified home health agencies. See quality-of-care stars and family survey (HHCAHPS) scores from CMS Home Health Compare.',
    stateTitle: (stateName) => `${stateName} home health agencies`,
    noun: 'home health agencies',
    singular: 'home health agency',
    countUnit: 'agencies',
    searchWhereLabel: 'City, ZIP, or state',
    searchNameLabel: 'Agency name (optional)',
    searchNamePlaceholder: (n) =>
      Number.isFinite(n) && n > 0 ? `Search ${n.toLocaleString('en-US')} agencies` : 'Agency name',
    hubNamePlaceholder: 'e.g. VNA',
    dataDir: 'home-health',
    extraLinks: [],
    howToRead: (asOfLabel) => [
      'Quality-of-care stars and family surveys are signals, not a guarantee.',
      'Home health does not publish nursing-home-style staffing hours.',
      `Always check the CMS as-of date (currently ${asOfLabel}).`,
      'Independent facts only — no paid “best match.”',
    ],
  },
  {
    id: 'irf',
    route: '/irf',
    statePath: (abbr) => `/irf/state/${String(abbr).toUpperCase()}`,
    providerPath: (ccn) => `/irf/${ccn}`,
    familyLabel: 'Inpatient rehab',
    nerdLabel: 'IRF',
    pageTitle: 'Inpatient rehab quality data',
    pageSub:
      'Medicare-certified inpatient rehabilitation facilities. Intensive rehab after stroke, hip fracture, or major surgery — CMS quality measures from IRF Compare.',
    stateTitle: (stateName) => `${stateName} inpatient rehab facilities`,
    noun: 'inpatient rehab facilities',
    singular: 'inpatient rehab facility',
    countUnit: 'facilities',
    searchWhereLabel: 'City, ZIP, or state',
    searchNameLabel: 'Facility name (optional)',
    searchNamePlaceholder: (n) =>
      Number.isFinite(n) && n > 0 ? `Search ${n.toLocaleString('en-US')} facilities` : 'Facility name',
    hubNamePlaceholder: 'e.g. Encompass',
    dataDir: 'irf',
    extraLinks: [],
    howToRead: (asOfLabel) => [
      'Return-to-community and readmission rates are signals, not a guarantee.',
      'Ask how many hours of therapy a typical day actually includes.',
      `Always check the CMS as-of date (currently ${asOfLabel}).`,
      'Independent facts only — not a referral.',
    ],
  },
  {
    id: 'ltach',
    route: '/ltach',
    statePath: (abbr) => `/ltach/state/${String(abbr).toUpperCase()}`,
    providerPath: (ccn) => `/ltach/${ccn}`,
    familyLabel: 'Long-term acute care',
    nerdLabel: 'LTACH',
    pageTitle: 'Long-term acute care quality data',
    pageSub:
      'Medicare-certified long-term acute care hospitals. Hospital-level care for medically complex, long-stay patients — CMS measures from LTCH Compare.',
    stateTitle: (stateName) => `${stateName} long-term acute care hospitals`,
    noun: 'long-term acute care hospitals',
    singular: 'long-term acute care hospital',
    countUnit: 'hospitals',
    searchWhereLabel: 'City, ZIP, or state',
    searchNameLabel: 'Hospital name (optional)',
    searchNamePlaceholder: (n) =>
      Number.isFinite(n) && n > 0 ? `Search ${n.toLocaleString('en-US')} hospitals` : 'Hospital name',
    hubNamePlaceholder: 'e.g. Kindred',
    dataDir: 'ltach',
    extraLinks: [],
    howToRead: (asOfLabel) => [
      'Infection ratios and community-discharge rates are signals, not a guarantee.',
      'These hospitals care for people who need weeks of hospital-level support.',
      `Always check the CMS as-of date (currently ${asOfLabel}).`,
      'Independent facts only — not a referral.',
    ],
  },
];

const BY_ID = Object.fromEntries(CARE_SETTINGS.map((s) => [s.id, s]));
const BY_ROUTE = Object.fromEntries(CARE_SETTINGS.map((s) => [s.route, s]));

export function getCareSetting(id) {
  return BY_ID[id] || null;
}

export function careSettingFromPath(pathname) {
  if (!pathname) return BY_ID.snf;
  if (pathname === '/' || pathname === '') return null;
  const hit = CARE_SETTINGS.find(
    (s) => pathname === s.route || pathname.startsWith(`${s.route}/`)
  );
  if (hit) return hit;
  if (pathname.startsWith('/state/') || pathname.startsWith('/facility/')) return BY_ID.snf;
  return BY_ROUTE[pathname] || null;
}

export function familyLabel(id) {
  return BY_ID[id]?.familyLabel || '';
}

export function settingCount(id) {
  if (id === 'snf') return CMS_SNF_COUNT;
  if (id === 'hospice') return 6669;
  const n = POST_ACUTE_CMS_COUNTS?.[id];
  return typeof n === 'number' ? n : 0;
}

export function settingCountLabel(id) {
  if (id === 'snf') return CMS_SNF_COUNT.toLocaleString('en-US');
  if (id === 'hospice') return '6,669';
  return formatSettingCount(id);
}

export { STATE_NAME };
