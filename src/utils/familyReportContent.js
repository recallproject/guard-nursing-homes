/**
 * Free Family Report — 1-page content model.
 *
 * Turns live CMS facility fields into the approved 1-page mock structure.
 * Voice: plain language. Do not hardcode a single facility.
 */

import {
  BRIEF_PAGE_COUNT,
  fmtMoney,
  fmtNum,
  fmtPct,
  formatReportDate,
  hasAbuseIcon,
  hasSpecialFocus,
  titleCase,
} from './facilityBriefContent.js';
import { CMS_SNF_AS_OF_ISO } from '../data/careSettings.js';

export const FAMILY_REPORT_PAGE_COUNT = 1;
export const FAMILY_REPORT_LABEL = 'Family Report';
export const FAMILY_BRIEF_PRICE = '$29';

const NUMBER_WORDS = {
  1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six',
  7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve',
  13: 'thirteen', 14: 'fourteen', 15: 'fifteen', 16: 'sixteen',
  17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty',
};

function wordNumber(n) {
  if (NUMBER_WORDS[n]) return NUMBER_WORDS[n];
  return String(n);
}

function joinAnd(parts) {
  const list = parts.filter(Boolean);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, and ${list.slice(-1)[0]}`;
}

function displayName(value) {
  if (!value) return '';
  const s = String(value);
  if (s === s.toUpperCase()) return titleCase(s);
  return s;
}

/** Full calendar date for the Family Report header (matches the approved mock). */
export function formatDataAsOfFull(isoDate) {
  if (!isoDate) return 'Current';
  try {
    const d = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return String(isoDate);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(isoDate);
  }
}

export function starTone(stars) {
  if (stars == null || Number.isNaN(Number(stars))) return 'neutral';
  const n = Number(stars);
  if (n <= 1) return 'bad';
  if (n <= 2) return 'amber';
  if (n >= 4) return 'good';
  return 'amber';
}

function starCard(label, stars) {
  if (stars == null || stars === '' || Number.isNaN(Number(stars))) {
    return { label, value: 'Not rated', tone: 'neutral' };
  }
  const n = Number(stars);
  return { label, value: `${n} of 5`, tone: starTone(n), stars: n };
}

function aboutFines(value) {
  if (value == null || Number.isNaN(Number(value)) || Number(value) <= 0) return null;
  const n = Math.round(Number(value));
  if (n >= 10000) {
    const rounded = Math.round(n / 1000) * 1000;
    return `About $${rounded.toLocaleString('en-US')}`;
  }
  return fmtMoney(n);
}

function thinRn(facility) {
  return (facility.rn_hprd != null && facility.rn_hprd < 0.45)
    || (facility.zero_rn_pct != null && facility.zero_rn_pct > 20);
}

function buildBottomLine(facility, ctx) {
  const concerns = [];
  if (ctx.sff) concerns.push('CMS Special Focus status');
  if (ctx.abuse) concerns.push('an active abuse icon');
  if (ctx.ijCount > 0) {
    concerns.push(`${wordNumber(ctx.ijCount)} Immediate Jeopardy citation${ctx.ijCount === 1 ? '' : 's'}`);
  }
  if (thinRn(facility)) concerns.push('thin registered-nurse coverage on many days');

  const insp = facility.inspection_stars;
  const staff = facility.staffing_stars;
  const qm = facility.quality_stars;
  const starMismatch = insp != null && (
    (staff != null && staff > insp) || (qm != null && qm > insp)
  );

  if (concerns.length >= 2) {
    let text = `Public records show serious concerns: ${joinAnd(concerns)}.`;
    if (starMismatch) {
      text += ' Staffing and quality stars look better than the inspection record — stars alone are not enough.';
    }
    text += ' Visit in person and ask hard questions before deciding.';
    return text;
  }

  const parts = [];
  if (facility.stars != null) {
    parts.push(`CMS rates this home ${facility.stars} of 5 stars overall`);
  }
  if (ctx.ijCount > 0) {
    parts.push(`inspectors have cited Immediate Jeopardy ${ctx.ijCount} time${ctx.ijCount === 1 ? '' : 's'}`);
  } else if ((facility.total_deficiencies || 0) > 0) {
    parts.push(`${facility.total_deficiencies} health deficiencies are on the public record`);
  }
  if ((facility.total_fines || 0) > 0) {
    parts.push(`reported fines total ${fmtMoney(facility.total_fines)}`);
  }
  if (thinRn(facility) && !parts.some((p) => /nurse/i.test(p))) {
    parts.push('registered-nurse coverage is thin on some days');
  }
  if (parts.length === 0) {
    return 'This one-page summary uses public CMS Care Compare data. Visit in person and ask how care looks on nights and weekends before deciding.';
  }
  return `${parts.join('. ')}. Visit in person and ask hard questions before deciding.`.replace(/\.\./g, '.');
}

function buildInspectionMeans(facility, ctx) {
  if (ctx.ijCount > 0 || (facility.inspection_stars != null && facility.inspection_stars <= 1)) {
    return {
      title: 'Inspection',
      value: 'High concern',
      tone: 'bad',
      detail: 'Inspectors cited problems so serious they put residents at risk of harm. Ask what was fixed and how they check it still works.',
    };
  }
  if (facility.inspection_stars != null && facility.inspection_stars <= 2) {
    return {
      title: 'Inspection',
      value: 'Elevated concern',
      tone: 'amber',
      detail: 'Health-inspection stars are at the low end of the CMS scale. Ask what the last survey found and what changed afterward.',
    };
  }
  if (facility.inspection_stars != null && facility.inspection_stars >= 4) {
    return {
      title: 'Inspection',
      value: 'Stronger signal',
      tone: 'good',
      detail: `Health inspection rates ${facility.inspection_stars} of 5. That is encouraging — still ask about the most recent survey and complaint investigations.`,
    };
  }
  return {
    title: 'Inspection',
    value: 'Check the record',
    tone: 'neutral',
    detail: 'Read the public inspection history and ask what was corrected after the last survey. Stars alone are not a visit.',
  };
}

function buildStaffingMeans(facility) {
  const rn = fmtNum(facility.rn_hprd);
  const zero = facility.zero_rn_pct != null ? Math.round(Number(facility.zero_rn_pct)) : null;
  if (thinRn(facility)) {
    const bits = [];
    if (rn) bits.push(`About ${rn} RN hours per resident per day`);
    if (zero != null) bits.push(`on ~${zero}% of days there was no RN in the building`);
    const lead = bits.length ? `${bits.join('; ')}.` : 'Registered-nurse coverage is thin in the public payroll data.';
    return {
      title: 'Staffing',
      value: 'Thin RN coverage',
      tone: 'amber',
      detail: `${lead} Ask about nights and weekends.`,
    };
  }
  if (facility.staffing_stars != null && facility.staffing_stars >= 4) {
    return {
      title: 'Staffing',
      value: 'Stronger coverage',
      tone: 'good',
      detail: `Staffing rates ${facility.staffing_stars} of 5. Averages still hide thin nights — ask who the RN is on this shift and on weekends.`,
    };
  }
  return {
    title: 'Staffing',
    value: 'Check coverage',
    tone: 'neutral',
    detail: 'Ask who the registered nurse is today, on nights, and on weekends. Posted schedules can differ from payroll-based figures.',
  };
}

function buildQualityMeans(facility, ctx) {
  const qm = facility.quality_stars;
  if (qm != null && qm >= 4) {
    const caveats = [];
    if ((facility.inspection_stars != null && facility.inspection_stars <= 2) || ctx.ijCount > 0) {
      caveats.push('inspection');
    }
    if (ctx.sff) caveats.push('Special Focus');
    const caveat = caveats.length === 1
      ? ` That is encouraging — it does not erase ${caveats[0]} flags.`
      : caveats.length > 1
        ? ` That is encouraging — it does not erase ${caveats.slice(0, -1).join(', ')} or ${caveats.slice(-1)[0]} flags.`
        : ' That is encouraging — still confirm daily care on a visit.';
    return {
      title: 'Quality measures',
      value: 'Stronger signal',
      tone: 'good',
      detail: `Selected clinical scores rate ${qm} of 5.${caveat}`,
    };
  }
  if (qm != null && qm <= 2) {
    return {
      title: 'Quality measures',
      value: 'Weaker signal',
      tone: 'bad',
      detail: `Selected clinical scores rate ${qm} of 5. Ask how they prevent falls, pressure ulcers, and unexplained decline.`,
    };
  }
  return {
    title: 'Quality measures',
    value: qm != null ? `${qm} of 5` : 'See Care Compare',
    tone: qm != null && qm <= 3 ? 'amber' : 'neutral',
    detail: 'Quality-measure stars are selected clinical scores — not a full picture of daily care. Ask what they track for residents like yours.',
  };
}

function buildWatchFors(facility, ctx) {
  const items = [];
  if (ctx.sff) {
    items.push({
      label: 'Special Focus Facility',
      text: 'CMS flagged this home for ongoing quality problems.',
    });
  }
  if (ctx.abuse) {
    items.push({
      label: 'Abuse icon',
      text: 'Active on Care Compare — ask how abuse is prevented and reported.',
    });
  }
  if (ctx.ijCount > 0) {
    items.push({
      label: `Immediate Jeopardy (${ctx.ijCount})`,
      text: 'Conditions that could cause serious injury or death.',
    });
  }
  if (facility.rn_gap_pct != null && facility.rn_gap_pct > 25) {
    items.push({
      label: 'Staffing gap',
      text: `Self-reported RN hours were much higher than payroll-based figures (~${Math.round(facility.rn_gap_pct)}% gap).`,
    });
  } else if (thinRn(facility) && facility.zero_rn_pct > 10) {
    items.push({
      label: 'Zero-RN days',
      text: `On ${fmtPct(facility.zero_rn_pct, 0)} of days the payroll journal showed no registered nurse hours.`,
    });
  }
  if ((facility.total_fines || 0) > 0) {
    const about = aboutFines(facility.total_fines);
    items.push({
      label: 'Fines',
      text: `${about} in reported CMS fines across recent years.`,
    });
  }
  if (items.length === 0) {
    items.push({
      label: 'Still verify',
      text: 'Public data lags real life. Ask about current staffing, the last survey, and how families are notified after hours.',
    });
  }
  return items.slice(0, 5);
}

function buildVisitQuestions(facility, ctx) {
  const qs = [];
  qs.push('Who is the RN on duty today — and on nights and weekends?');
  if (ctx.sff) {
    qs.push('What does your Special Focus Facility plan require right now?');
  }
  if (ctx.ijCount > 0) {
    qs.push('How were the Immediate Jeopardy issues corrected — can I see proof?');
  }
  if (ctx.abuse) {
    qs.push('How do you prevent and respond to abuse or neglect allegations?');
  }
  if (!ctx.sff && facility.rn_gap_pct != null && facility.rn_gap_pct > 25) {
    qs.push('Which RN-hours figure do you stand behind — self-report or payroll — and why the gap?');
  }
  if (!ctx.ijCount && (facility.total_fines || 0) > 50000) {
    qs.push('What changed after the CMS fines — and how do you show it is still working?');
  }
  qs.push('May I visit at mealtime and on a weekend?');
  return qs.slice(0, 5);
}

function buildChips(facility, ctx) {
  return [
    ctx.ijCount > 0 ? {
      label: 'Immediate Jeopardy',
      value: `${ctx.ijCount} citation${ctx.ijCount === 1 ? '' : 's'}`,
      tone: 'urgent',
    } : null,
    ctx.sff ? { label: 'Special Focus', value: 'SFF · CMS flagged', tone: 'urgent' } : null,
    ctx.abuse ? { label: 'Abuse icon', value: 'Active', tone: 'urgent' } : null,
    (facility.total_fines || 0) > 0 ? {
      label: 'Fines (reported)',
      value: fmtMoney(facility.total_fines),
      tone: 'warn',
    } : null,
    !ctx.ijCount && !ctx.sff && !ctx.abuse && !(facility.total_fines > 0) && facility.stars != null
      ? { label: 'CMS overall', value: `${facility.stars} of 5`, tone: facility.stars <= 2 ? 'urgent' : 'neutral' }
      : null,
  ].filter(Boolean);
}

function buildMetaLine(facility) {
  const city = titleCase(facility.city);
  const address = titleCase(facility.address || '');
  const location = [address, city, [facility.state, facility.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [
    location,
    facility.ccn ? `CCN ${facility.ccn}` : null,
    facility.beds ? `${facility.beds} beds` : null,
    facility.chain_name ? displayName(facility.chain_name) : (facility.ownership_type || null),
  ].filter(Boolean).join(' · ');
}

/**
 * @param {object} facility
 * @param {object} [opts]
 * @param {string|null} [opts.dataAsOf]
 * @param {Date} [opts.reportDate]
 * @param {boolean} [opts.isSample]
 */
export function buildFamilyReportModel(facility = {}, opts = {}) {
  const reportDate = opts.reportDate instanceof Date ? opts.reportDate : new Date();
  const dataAsOf = opts.dataAsOf || CMS_SNF_AS_OF_ISO;
  const ctx = {
    sff: hasSpecialFocus(facility),
    abuse: hasAbuseIcon(facility),
    ijCount: facility.jeopardy_count || 0,
  };

  return {
    productLabel: FAMILY_REPORT_LABEL,
    pageCount: FAMILY_REPORT_PAGE_COUNT,
    isSample: Boolean(opts.isSample),
    reportDateLabel: formatReportDate(reportDate),
    dataAsOfLabel: formatDataAsOfFull(dataAsOf),
    name: facility.name || 'Nursing facility',
    ccn: facility.ccn || '',
    metaLine: buildMetaLine(facility),
    stars: {
      overall: starCard('CMS overall', facility.stars),
      inspection: starCard('Health inspection', facility.inspection_stars),
      staffing: starCard('Staffing', facility.staffing_stars),
      quality: starCard('Quality measures', facility.quality_stars),
    },
    chips: buildChips(facility, ctx),
    bottomLine: buildBottomLine(facility, ctx),
    means: [
      buildInspectionMeans(facility, ctx),
      buildStaffingMeans(facility),
      buildQualityMeans(facility, ctx),
    ],
    watchFors: buildWatchFors(facility, ctx),
    questions: buildVisitQuestions(facility, ctx),
    ctaTitle: 'Want the deeper read?',
    ctaBody: 'The Facility Brief adds a scorecard, staffing & ownership detail, inspection story, F-tag table, visit checklist, and decision worksheet — same plain language, more pages.',
    ctaPrice: FAMILY_BRIEF_PRICE,
    ctaPriceLabel: `Facility Brief\n${BRIEF_PAGE_COUNT} pages`,
    note: 'Source: CMS public Care Compare data · Not an HHS/CMS endorsement · For families — not medical or legal advice. Always verify on medicare.gov/care-compare.',
    footerLeft: 'Family Report · Free · oversightreports.com',
    sff: ctx.sff,
    abuse: ctx.abuse,
    ijCount: ctx.ijCount,
  };
}
