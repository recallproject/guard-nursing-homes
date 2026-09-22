/**
 * Compare-grid metrics mapped to existing CMS / Oversight facility fields.
 * Do not invent fields — missing values render as "—".
 */

import { formatDataAsOf } from './facilityBriefContent.js';
import { hasAbuseFlag, hasSffFlag } from './facilityFlags.js';
import { sffCompareValue } from './sffStatus.js';
import { CMS_SNF_AS_OF_ISO } from '../data/careSettings.js';

export function formatCurrency(amount) {
  if (amount == null || amount === '' || Number(amount) === 0) return '$0';
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function formatStars(count) {
  if (count == null || count === '' || Number.isNaN(Number(count))) return 'Not rated';
  const n = Math.max(0, Math.min(5, Number(count)));
  const filled = Math.round(n);
  return `${'★'.repeat(filled)}${'☆'.repeat(5 - filled)} ${filled}/5`;
}

export function formatHours(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(2)} HPRD`;
}

export function formatPct(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '—';
  return `${Math.round(Number(value))}%`;
}

function qmScore(facility, stay, code) {
  const node = facility?.quality_measures?.mds?.[stay]?.[code];
  if (!node || node.s == null || Number.isNaN(Number(node.s))) return null;
  return Number(node.s);
}

export function ownershipLabel(facility) {
  const bits = [];
  if (facility?.chain_name) bits.push(String(facility.chain_name));
  else if (facility?.ownership_type) bits.push(String(facility.ownership_type));
  if (facility?.pe_owned) bits.push('Private equity');
  if (facility?.reit_owned) bits.push('REIT');
  if (facility?.ownership_changed_recently && facility.ownership_change_date) {
    bits.push(`Changed ${facility.ownership_change_date}`);
  }
  return bits.length ? bits.join(' · ') : 'See Care Compare';
}

export function freshnessLabel(dataAsOf) {
  return formatDataAsOf(dataAsOf || CMS_SNF_AS_OF_ISO);
}

export const FIRST_VIEW_ROWS = [
  {
    id: 'overall',
    label: 'Overall rating',
    direction: 'Higher is better',
    why: 'CMS Five-Star overall rating. A fast orientation — never the only signal.',
    group: 'summary',
    value: (f) => formatStars(f?.stars),
  },
  {
    id: 'inspections',
    label: 'Health inspections',
    direction: 'Higher stars are better',
    why: 'Inspection stars plus how many health deficiencies are on the public record.',
    group: 'summary',
    value: (f) => {
      const stars = formatStars(f?.inspection_stars);
      const defs = f?.total_deficiencies || 0;
      return `${stars} · ${defs} citation${defs === 1 ? '' : 's'}`;
    },
  },
  {
    id: 'staffing',
    label: 'Staffing',
    direction: 'Higher is better',
    why: 'Staffing stars and registered-nurse hours per resident per day from payroll (PBJ).',
    group: 'summary',
    value: (f) => `${formatStars(f?.staffing_stars)} · RN ${formatHours(f?.rn_hprd)}`,
  },
  {
    id: 'quality',
    label: 'Quality measures',
    direction: 'Higher is better',
    why: 'Selected clinical scores CMS uses for the quality-measure star. Not a full picture of daily care.',
    group: 'summary',
    value: (f) => formatStars(f?.quality_stars),
  },
  {
    id: 'safety',
    label: 'Serious citations',
    direction: 'Lower is better',
    why: 'Immediate Jeopardy (serious harm) citations and Special Focus / abuse-icon flags.',
    group: 'summary',
    value: (f) => {
      const ij = f?.jeopardy_count || 0;
      const flags = [];
      if (hasSffFlag(f)) flags.push('SFF');
      if (hasAbuseFlag(f)) flags.push('Abuse icon');
      const lead = `${ij} Immediate Jeopardy`;
      return flags.length ? `${lead} · ${flags.join(' · ')}` : lead;
    },
  },
  {
    id: 'fines',
    label: 'Fines',
    direction: 'Lower is better',
    why: 'Reported CMS monetary penalties. Compare the amount, then ask what was fixed.',
    group: 'summary',
    value: (f) => formatCurrency(f?.total_fines),
  },
  {
    id: 'ownership',
    label: 'Ownership',
    direction: 'Context matters',
    why: 'Who operates the home — chain, private equity, REIT, or a recent ownership change.',
    group: 'summary',
    value: (f) => ownershipLabel(f),
  },
];

export const DETAIL_GROUPS = [
  {
    id: 'inspections',
    title: 'Health inspections',
    blurb: 'What surveyors found — not a tour substitute.',
    rows: [
      {
        id: 'insp-stars',
        label: 'Inspection stars',
        direction: 'Higher is better',
        why: 'CMS health-inspection star from the last few standard surveys.',
        value: (f) => formatStars(f?.inspection_stars),
      },
      {
        id: 'defs',
        label: 'Health deficiencies',
        direction: 'Lower is better',
        why: 'Count of health citations on the public extract.',
        value: (f) => String(f?.total_deficiencies || 0),
      },
      {
        id: 'ij',
        label: 'Immediate Jeopardy',
        direction: 'Lower is better',
        why: 'Citations judged serious enough to put residents at risk of harm or death.',
        value: (f) => String(f?.jeopardy_count || 0),
      },
      {
        id: 'harm',
        label: 'Actual harm citations',
        direction: 'Lower is better',
        why: 'Inspectors documented harm to residents.',
        value: (f) => String(f?.harm_count || 0),
      },
      {
        id: 'sff',
        label: 'Special Focus Facility',
        direction: 'Context matters',
        why: 'CMS watch list for homes with persistent quality problems.',
        value: (f) => sffCompareValue(f),
      },
      {
        id: 'abuse',
        label: 'Abuse icon',
        direction: 'Context matters',
        why: 'Care Compare abuse icon when certain abuse-related criteria are met.',
        value: (f) => (hasAbuseFlag(f) ? 'Active' : 'None shown'),
      },
    ],
  },
  {
    id: 'staffing',
    title: 'Staffing',
    blurb: 'Payroll-based hours. Ask about nights and weekends.',
    rows: [
      {
        id: 'staff-stars',
        label: 'Staffing stars',
        direction: 'Higher is better',
        why: 'CMS staffing star from payroll-based journal hours.',
        value: (f) => formatStars(f?.staffing_stars),
      },
      {
        id: 'total-hprd',
        label: 'Total nurse hours',
        direction: 'Higher is better',
        why: 'RN + LPN + CNA hours per resident per day.',
        value: (f) => formatHours(f?.total_hprd),
      },
      {
        id: 'rn-hprd',
        label: 'RN hours',
        direction: 'Higher is better',
        why: 'Registered-nurse hours per resident per day.',
        value: (f) => formatHours(f?.rn_hprd),
      },
      {
        id: 'weekend-rn',
        label: 'Weekend RN hours',
        direction: 'Higher is better',
        why: 'Weekend registered-nurse coverage from PBJ.',
        value: (f) => formatHours(f?.weekend_rn_hprd),
      },
      {
        id: 'zero-rn',
        label: 'Days with no RN',
        direction: 'Lower is better',
        why: 'Share of days the payroll journal showed no registered-nurse hours.',
        value: (f) => formatPct(f?.zero_rn_pct),
      },
      {
        id: 'rn-gap',
        label: 'Reported vs payroll RN gap',
        direction: 'Lower is better',
        why: 'How much higher self-reported RN hours were than payroll-based figures.',
        value: (f) => formatPct(f?.rn_gap_pct),
      },
    ],
  },
  {
    id: 'outcomes',
    title: 'Quality and outcomes',
    blurb: 'Selected MDS measures. Directions differ — read the label.',
    rows: [
      {
        id: 'qm-stars',
        label: 'Quality-measure stars',
        direction: 'Higher is better',
        why: 'Composite of selected clinical quality measures.',
        value: (f) => formatStars(f?.quality_stars),
      },
      {
        id: 'weight-loss',
        label: 'Significant weight loss',
        direction: 'Lower is better',
        why: 'Long-stay residents with unintended weight loss (MDS 404).',
        value: (f) => {
          const n = qmScore(f, 'ls', '404');
          return n == null ? '—' : `${n.toFixed(1)}%`;
        },
      },
      {
        id: 'falls',
        label: 'Falls with major injury',
        direction: 'Lower is better',
        why: 'Long-stay residents with a fall causing major injury (MDS 410).',
        value: (f) => {
          const n = qmScore(f, 'ls', '410');
          return n == null ? '—' : `${n.toFixed(1)}%`;
        },
      },
      {
        id: 'restraints',
        label: 'Physical restraints',
        direction: 'Lower is better',
        why: 'Long-stay residents who were physically restrained (MDS 409).',
        value: (f) => {
          const n = qmScore(f, 'ls', '409');
          return n == null ? '—' : `${n.toFixed(1)}%`;
        },
      },
      {
        id: 'pressure',
        label: 'Pressure ulcers',
        direction: 'Lower is better',
        why: 'Long-stay residents with pressure ulcers (MDS 479).',
        value: (f) => {
          const n = qmScore(f, 'ls', '479');
          return n == null ? '—' : `${n.toFixed(1)}%`;
        },
      },
    ],
  },
  {
    id: 'safety',
    title: 'Safety and penalties',
    blurb: 'Fines and flags are a reason to ask questions, not a verdict.',
    rows: [
      {
        id: 'fines-amt',
        label: 'Total fines',
        direction: 'Lower is better',
        why: 'Sum of reported CMS monetary penalties.',
        value: (f) => formatCurrency(f?.total_fines),
      },
      {
        id: 'fine-count',
        label: 'Penalty records',
        direction: 'Lower is better',
        why: 'Count of penalty records on the public extract.',
        value: (f) => String(f?.fine_count || 0),
      },
      {
        id: 'denials',
        label: 'Payment denials',
        direction: 'Lower is better',
        why: 'CMS payment-denial actions, when present.',
        value: (f) => String(f?.denial_count || 0),
      },
      {
        id: 'risk',
        label: 'Oversight risk score',
        direction: 'Lower is better',
        why: 'Oversight interpretation (0–100) from public CMS fields — not a CMS rating.',
        value: (f) => (f?.composite != null ? Number(f.composite).toFixed(1) : '—'),
      },
    ],
  },
  {
    id: 'details',
    title: 'Facility details',
    blurb: 'Size, location, and who is accountable.',
    rows: [
      {
        id: 'beds',
        label: 'Beds',
        direction: 'Context matters',
        why: 'Certified bed count.',
        value: (f) => (f?.beds != null ? String(f.beds) : '—'),
      },
      {
        id: 'city',
        label: 'City',
        direction: 'Context matters',
        why: 'City and state on the CMS file.',
        value: (f) => [f?.city, f?.state].filter(Boolean).join(', ') || '—',
      },
      {
        id: 'owner-type',
        label: 'Ownership type',
        direction: 'Context matters',
        why: 'CMS ownership category (for-profit, nonprofit, government, organization).',
        value: (f) => f?.ownership_type || '—',
      },
      {
        id: 'chain',
        label: 'Chain / operator',
        direction: 'Context matters',
        why: 'Reported chain or operating group.',
        value: (f) => f?.chain_name || '—',
      },
      {
        id: 'owner-change',
        label: 'Recent ownership change',
        direction: 'Context matters',
        why: 'Care can dip during transitions. Confirm who is on site day to day.',
        value: (f) => (
          f?.ownership_changed_recently
            ? (f.ownership_change_date || 'Yes')
            : 'No recent change flagged'
        ),
      },
    ],
  },
];

export function cellValue(row, facility) {
  try {
    return row.value(facility);
  } catch {
    return '—';
  }
}

export function moreMeasureCount(group) {
  return group.rows.length;
}
