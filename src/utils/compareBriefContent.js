/**
 * Compare Brief content model.
 *
 * One combined decision aid for 2–3 homes already on the compare tray.
 * Deterministic rules over CMS fields already on the facility record.
 * Does not rank homes, name a winner, or call a small gap a tie.
 */

import { cellValue, DETAIL_GROUPS, FIRST_VIEW_ROWS } from './compareMetrics.js';
import { hasAbuseFlag, hasSffFlag } from './facilityFlags.js';
import { formatDataAsOf, formatReportDate, titleCase } from './facilityBriefContent.js';
import { compareBriefOfferForCount } from './compareBriefOffer.js';
import { pdfSafeText } from './pdfSafeText.js';

export const PRODUCT_LABEL = 'Compare Brief';

export const SHARED_TOUR_QUESTIONS = [
  'How many nurses are on the unit at night and on weekends, and is a registered nurse in the building?',
  'What did the last health inspection find, and what changed afterward?',
  'How do you notify family when a resident falls, loses weight, or goes to the hospital, including after hours?',
  'How do you handle call lights, falls, and pressure injuries?',
  'Who operates the home day to day, and has ownership changed recently?',
  'Can we see the unit, meet the nurse on duty, and review a sample care plan?',
  'What should we verify ourselves on Medicare Care Compare before deciding?',
];

const EXTRA_ROW_IDS = ['weekend-rn', 'zero-rn', 'weight-loss', 'falls', 'pressure', 'beds'];

function displayName(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (!text) return '';
  if (text === text.toUpperCase()) return titleCase(text);
  return text;
}

function num(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function qmPercent(facility, stay, code) {
  const node = facility?.quality_measures?.mds?.[stay]?.[code];
  if (!node || node.s == null || Number.isNaN(Number(node.s))) return null;
  return Number(node.s);
}

function joinNames(names) {
  if (names.length <= 1) return names[0] || 'This home';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function reportsVerb(count) {
  return count === 1 ? 'reports' : 'report';
}

function asciiCell(value) {
  const cleaned = pdfSafeText(String(value ?? '').replace(/[★☆]/g, '')).replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned === '-') return '-';
  return cleaned;
}

function money(value) {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function hours(value) {
  return `${Number(value).toFixed(2)} HPRD`;
}

function starsOfFive(value) {
  return `${value} of 5`;
}

function percent(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function detailList(homes, values, format) {
  return homes.map((home, index) => `${home.shortName} ${format(values[index])}`).join('; ');
}

function narrateSpread(homes, values, format, noun, higherIsBetter, ask) {
  const extreme = higherIsBetter ? Math.max(...values) : Math.min(...values);
  const leaders = homes.filter((_, index) => values[index] === extreme);
  const direction = higherIsBetter ? 'higher' : 'lower';
  const verb = reportsVerb(leaders.length);
  const detail = detailList(homes, values, format);
  return `${joinNames(leaders.map((home) => home.shortName))} ${verb} ${direction} ${noun} (${detail}). ${ask}`;
}

function findDetailRow(id) {
  for (const group of DETAIL_GROUPS) {
    const row = group.rows.find((item) => item.id === id);
    if (row) return row;
  }
  return null;
}

function scorecardFrom(rows, homes) {
  return rows.filter(Boolean).map((row) => ({
    id: row.id,
    label: row.label,
    direction: row.direction,
    cells: homes.map((home) => asciiCell(cellValue(row, home.facility))),
  }));
}

function measure(homes, spec) {
  const values = homes.map((home) => spec.read(home.facility));
  if (values.some((value) => value == null)) {
    if (!spec.required) return null;
    return {
      id: spec.id,
      status: 'insufficient',
      text: `Not enough comparable information on ${spec.label}. At least one home is missing this figure in the CMS extract.`,
    };
  }
  const gap = Math.max(...values) - Math.min(...values);
  if (gap < spec.minGap) return null;
  return {
    id: spec.id,
    status: 'difference',
    text: spec.narrate(homes, values),
  };
}

function flagDifference(homes, id, label, isOn, ask) {
  const flags = homes.map((home) => Boolean(isOn(home.facility)));
  if (flags.every((on) => on === flags[0])) return null;
  const onNames = homes.filter((_, index) => flags[index]).map((home) => home.shortName);
  const offNames = homes.filter((_, index) => !flags[index]).map((home) => home.shortName);
  return {
    id,
    status: 'difference',
    text: `${joinNames(onNames)} ${reportsVerb(onNames.length)} ${label}. ${joinNames(offNames)} ${offNames.length === 1 ? 'does' : 'do'} not, in this extract. ${ask}`,
  };
}

function chainDifference(homes) {
  const chains = homes.map((home) => String(home.facility?.chain_name || '').trim());
  if (chains.some((chain) => !chain)) return null;
  const unique = new Set(chains.map((chain) => chain.toLowerCase()));
  if (unique.size < 2) return null;
  const detail = homes.map((home) => `${home.shortName}: ${displayName(home.facility.chain_name)}`).join('; ');
  return {
    id: 'chain',
    status: 'difference',
    text: `These homes report different operators (${detail}). Ask who manages the building day to day. Operator name is context, not a rating.`,
  };
}

function ownershipChangeDifference(homes) {
  const changed = homes.map((home) => Boolean(home.facility?.ownership_changed_recently));
  if (changed.every((value) => value === changed[0])) return null;
  const yes = homes.filter((_, index) => changed[index]);
  const detail = yes.map((home) => {
    const when = home.facility?.ownership_change_date;
    return when ? `${home.shortName} (${when})` : home.shortName;
  }).join('; ');
  return {
    id: 'ownership-change',
    status: 'difference',
    text: `A recent ownership change is flagged for ${detail}. Ask who is in charge day to day since that change. The other home${homes.length - yes.length === 1 ? ' has' : 's have'} no recent change flagged in this extract.`,
  };
}

function facilityQuestions(facility) {
  const questions = [];
  const ij = num(facility?.jeopardy_count) || 0;
  if (ij > 0) {
    questions.push(`Ask what the ${ij} Immediate Jeopardy citation${ij === 1 ? '' : 's'} referred to and what is different on the unit now.`);
  }
  if (hasSffFlag(facility)) {
    questions.push('Ask about Special Focus Facility status and the current improvement plan.');
  }
  if (hasAbuseFlag(facility)) {
    questions.push('Ask what the Care Compare abuse icon refers to and how the home investigates allegations.');
  }
  if ((num(facility?.total_fines) || 0) >= 20000) {
    questions.push('Ask which penalties are still open and what was corrected after the fines.');
  }
  const rn = num(facility?.rn_hprd);
  const zeroRn = num(facility?.zero_rn_pct);
  if ((rn != null && rn < 0.4) || (zeroRn != null && zeroRn >= 15)) {
    questions.push('Ask which shifts have a registered nurse in the building, including nights and weekends.');
  }
  if (facility?.ownership_changed_recently) {
    questions.push('Ask who is in charge day to day since the ownership change.');
  }
  if (facility?.pe_owned || facility?.reit_owned) {
    questions.push('Ask how the operating company decides staffing levels. Ownership structure is context, not a rating.');
  }
  const weight = qmPercent(facility, 'ls', '404');
  if (weight != null && weight >= 8) {
    questions.push('Ask how dining assistance and weight checks work for residents who are losing weight.');
  }
  if (!questions.length) {
    questions.push('Ask what a usual day looks like for a resident with needs like yours, including nights and weekends.');
  }
  return questions.slice(0, 4);
}

function shortNames(facilities) {
  const labels = facilities.map((facility) => displayName(facility?.name) || `CCN ${facility?.ccn || ''}`.trim());
  const counts = new Map();
  for (const label of labels) counts.set(label, (counts.get(label) || 0) + 1);
  return labels.map((label, index) => {
    if ((counts.get(label) || 0) < 2) return label;
    const city = displayName(facilities[index]?.city);
    return city ? `${label} (${city})` : `${label} (${facilities[index]?.ccn || index + 1})`;
  });
}

/**
 * @param {object[]} facilities 2 or 3 facility records
 * @param {{ dataAsOf?: string, reportDate?: Date }} [options]
 */
export function buildCompareBriefModel(facilities, options = {}) {
  const source = (Array.isArray(facilities) ? facilities : []).filter(Boolean).slice(0, 3);
  const names = shortNames(source);
  const homes = source.map((facility, index) => {
    const stars = num(facility?.stars);
    return {
      facility,
      ccn: String(facility?.ccn || ''),
      name: displayName(facility?.name) || `CCN ${facility?.ccn || ''}`,
      shortName: names[index],
      city: displayName(facility?.city),
      state: facility?.state || '',
      place: [displayName(facility?.city), facility?.state].filter(Boolean).join(', '),
      starsLabel: stars == null ? 'Not rated' : `${stars} of 5`,
    };
  });

  const offer = compareBriefOfferForCount(homes.length);
  const reportDate = options.reportDate instanceof Date ? options.reportDate : new Date();
  const dataAsOfLabel = formatDataAsOf(options.dataAsOf);

  const measures = [
    {
      id: 'overall',
      label: 'overall star rating',
      required: true,
      minGap: 1,
      read: (facility) => {
        const value = num(facility?.stars);
        return value == null || value <= 0 ? null : value;
      },
      narrate: (rows, values) => narrateSpread(
        rows,
        values,
        starsOfFive,
        'overall star ratings',
        true,
        'CMS treats a higher overall star as better. Ask what the stars leave out for your family, including distance and the kind of care you need.',
      ),
    },
    {
      id: 'inspections',
      label: 'health inspection stars',
      required: true,
      minGap: 1,
      read: (facility) => {
        const value = num(facility?.inspection_stars);
        return value == null || value <= 0 ? null : value;
      },
      narrate: (rows, values) => narrateSpread(
        rows,
        values,
        starsOfFive,
        'health inspection stars',
        true,
        'Ask what the last inspection found and what changed afterward.',
      ),
    },
    {
      id: 'staffing-stars',
      label: 'staffing stars',
      required: true,
      minGap: 1,
      read: (facility) => {
        const value = num(facility?.staffing_stars);
        return value == null || value <= 0 ? null : value;
      },
      narrate: (rows, values) => narrateSpread(
        rows,
        values,
        starsOfFive,
        'staffing stars',
        true,
        'Ask how nights and weekends are staffed.',
      ),
    },
    {
      id: 'quality-stars',
      label: 'quality-measure stars',
      required: false,
      minGap: 1,
      read: (facility) => {
        const value = num(facility?.quality_stars);
        return value == null || value <= 0 ? null : value;
      },
      narrate: (rows, values) => narrateSpread(
        rows,
        values,
        starsOfFive,
        'quality-measure stars',
        true,
        'Ask which resident outcomes the home is working on.',
      ),
    },
    {
      id: 'deficiencies',
      label: 'health deficiencies',
      required: false,
      minGap: 8,
      read: (facility) => num(facility?.total_deficiencies),
      narrate: (rows, values) => narrateSpread(
        rows,
        values,
        (value) => String(Math.round(value)),
        'health deficiency counts',
        false,
        'Ask which citations are still open.',
      ),
    },
    {
      id: 'ij',
      label: 'Immediate Jeopardy citations',
      required: true,
      minGap: 1,
      read: (facility) => num(facility?.jeopardy_count),
      narrate: (rows, values) => narrateSpread(
        rows,
        values,
        (value) => String(Math.round(value)),
        'Immediate Jeopardy citation counts',
        false,
        'Ask what those findings were and what is different on the unit now.',
      ),
    },
    {
      id: 'fines',
      label: 'CMS fines',
      required: true,
      minGap: 10000,
      read: (facility) => num(facility?.total_fines),
      narrate: (rows, values) => narrateSpread(
        rows,
        values,
        money,
        'reported CMS fines',
        false,
        'Ask which penalties were paid and what was corrected.',
      ),
    },
    {
      id: 'rn',
      label: 'registered-nurse hours',
      required: true,
      minGap: 0.15,
      read: (facility) => num(facility?.rn_hprd),
      narrate: (rows, values) => narrateSpread(
        rows,
        values,
        hours,
        'registered-nurse hours per resident day',
        true,
        'Ask which shifts have a registered nurse in the building.',
      ),
    },
    {
      id: 'weekend-rn',
      label: 'weekend registered-nurse hours',
      required: false,
      minGap: 0.12,
      read: (facility) => num(facility?.weekend_rn_hprd),
      narrate: (rows, values) => narrateSpread(
        rows,
        values,
        hours,
        'weekend registered-nurse hours',
        true,
        'Ask who covers Saturday and Sunday.',
      ),
    },
    {
      id: 'zero-rn',
      label: 'days with no registered nurse',
      required: false,
      minGap: 10,
      read: (facility) => num(facility?.zero_rn_pct),
      narrate: (rows, values) => narrateSpread(
        rows,
        values,
        percent,
        'shares of days with no registered-nurse hours',
        false,
        'Ask how often payroll shows a day with no RN hours, and what you should expect on a tour.',
      ),
    },
    {
      id: 'weight-loss',
      label: 'significant weight loss',
      required: false,
      minGap: 2,
      read: (facility) => qmPercent(facility, 'ls', '404'),
      narrate: (rows, values) => narrateSpread(
        rows,
        values,
        percent,
        'long-stay significant weight-loss rates',
        false,
        'Ask how the home notices and responds to weight loss.',
      ),
    },
    {
      id: 'falls',
      label: 'falls with major injury',
      required: false,
      minGap: 1,
      read: (facility) => qmPercent(facility, 'ls', '410'),
      narrate: (rows, values) => narrateSpread(
        rows,
        values,
        percent,
        'long-stay falls with major injury',
        false,
        'Ask how call lights and fall huddles work at night.',
      ),
    },
  ];

  const differences = [
    ...measures.map((spec) => measure(homes, spec)).filter(Boolean),
    flagDifference(
      homes,
      'sff',
      'an active Special Focus Facility designation',
      hasSffFlag,
      'Ask what that designation means and what the improvement plan is.',
    ),
    flagDifference(
      homes,
      'abuse',
      'a Care Compare abuse icon',
      hasAbuseFlag,
      'Ask what the icon refers to and how allegations are investigated.',
    ),
    flagDifference(
      homes,
      'pe',
      'private-equity ownership in this extract',
      (facility) => Boolean(facility?.pe_owned),
      'Ask how the operating company makes staffing decisions. Ownership is context, not a rating.',
    ),
    chainDifference(homes),
    ownershipChangeDifference(homes),
  ].filter(Boolean);

  const materialCount = differences.filter((item) => item.status === 'difference').length;

  return {
    productLabel: PRODUCT_LABEL,
    product: offer?.product || '',
    price: offer?.price || null,
    count: homes.length,
    homes: homes.map((home) => ({
      ccn: home.ccn,
      name: home.name,
      shortName: home.shortName,
      city: home.city,
      state: home.state,
      place: home.place,
      starsLabel: home.starsLabel,
    })),
    dataAsOfLabel,
    reportDateLabel: formatReportDate(reportDate),
    scorecard: scorecardFrom(FIRST_VIEW_ROWS, homes),
    extraScorecard: scorecardFrom(EXTRA_ROW_IDS.map(findDetailRow), homes),
    differences,
    noMaterialDifference: materialCount
      ? ''
      : 'Not enough comparable information to describe a material difference across the CMS fields checked. A small gap is left off this page instead of being described as equal.',
    sharedQuestions: SHARED_TOUR_QUESTIONS,
    facilityQuestions: homes.map((home) => ({
      ccn: home.ccn,
      name: home.shortName,
      questions: facilityQuestions(home.facility),
    })),
    independence: 'The Oversight Report is an independent publication of DataLink Clinical LLC. It is not affiliated with, endorsed by, or a contractor of CMS or the U.S. Department of Health and Human Services.',
    paymentDisclosure: 'Nursing homes cannot pay OversightReports to be included, excluded, or presented differently in this Compare Brief. A family payment buys this document. It does not change the facts or how a home is shown.',
    limits: [
      'This Compare Brief is a decision aid for the homes named on the cover. It does not pick a home or assign a rank.',
      'CMS ratings leave out considerations that matter to a particular family, including specialty care and how close the home is.',
      'Staffing hours are payroll-based journal reports. An HHS Office of Inspector General audit found unsupported RN staffing hours in sampled records. Treat hours as reported, then ask what you will see on a tour.',
      'This document does not show live bed availability or private-pay prices.',
      'Missing figures are labeled "Not enough comparable information." A small gap is omitted rather than called equal.',
    ],
    sources: [
      'CMS Care Compare and the Provider Data Catalog: Provider Info, health deficiencies, penalties, Payroll-Based Journal staffing, quality measures, and ownership.',
      `Snapshot date: CMS data as of ${dataAsOfLabel}. Generated ${formatReportDate(reportDate)}.`,
      'Verify current records at https://www.medicare.gov/care-compare/ before a visit.',
      'Long-term care ombudsman help: https://theconsumervoice.org/get-help',
    ],
    worksheetPrompts: [
      'Visit date',
      'Who we met',
      'What we saw',
      'Distance and care needs stars do not show',
      'Questions still open',
    ],
  };
}
