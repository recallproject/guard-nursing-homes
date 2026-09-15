// Config for the post-acute care setting tiles on the new homepage.
// Status drives card behavior:
//   - 'live'   : clickable, links to its route
//   - 'next'   : clickable, links to a "coming soon" page (lead capture)
//   - 'coming' : not clickable, badge only
//
// Home Health / IRF / LTACH counts come from scripts/build-postacute-data.js.

import { formatSettingCount } from './postAcuteCatalog';

export const POST_ACUTE_SETTINGS = [
  {
    id: 'snf',
    label: 'Skilled nursing',
    sub: 'Skilled nursing facilities',
    iconCode: 'SN',
    desc: 'Inpatient rehab and long-term care after a hospital stay.',
    count: '14,690',
    countUnit: 'facilities',
    hook: '34% had a zero-RN day in Q3 2025',
    route: '/skilled-nursing',
    status: 'live',
    statusLabel: 'Live',
  },
  {
    id: 'hospice',
    label: 'Hospice',
    sub: 'End-of-life care · home or facility',
    iconCode: 'HS',
    desc: 'Verify a referral, compare options, or browse the national public-record feed for every Medicare-certified hospice in America.',
    count: '6,943',
    countUnit: 'providers',
    hook: 'CA Auditor framework · applied nationally',
    route: '/hospice',
    status: 'live',
    statusLabel: 'Live',
  },
  {
    id: 'home-health',
    label: 'Home health',
    sub: 'Home health agencies (HHA)',
    iconCode: 'HH',
    desc: 'Nurses and therapists who come to the home.',
    count: formatSettingCount('home-health'),
    countUnit: 'agencies',
    hook: 'CMS Star + OASIS outcomes',
    route: '/home-health',
    status: 'live',
    statusLabel: 'Live',
  },
  {
    id: 'irf',
    label: 'Inpatient rehab',
    sub: 'IRF · 3-hr/day intensive rehab',
    iconCode: 'IR',
    desc: 'Recovery after stroke, hip, or major surgery.',
    count: formatSettingCount('irf'),
    countUnit: 'facilities',
    hook: 'IRF Compare data',
    route: '/irf',
    status: 'live',
    statusLabel: 'Live',
  },
  {
    id: 'ltach',
    label: 'Long-term acute care',
    sub: 'LTACH · long-term acute care hospitals',
    iconCode: 'LT',
    desc: 'Long-stay hospital care for medically complex patients.',
    count: formatSettingCount('ltach'),
    countUnit: 'hospitals',
    hook: 'LTCH Compare data',
    route: '/ltach',
    status: 'live',
    statusLabel: 'Live',
  },
];

function countNumber(count) {
  const n = parseInt(String(count).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export function liveProviderTotal() {
  return POST_ACUTE_SETTINGS.reduce((sum, s) => sum + countNumber(s.count), 0);
}
