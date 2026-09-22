/**
 * Family Facility Brief — content model.
 *
 * Turns live CMS facility JSON + deficiency details into the 9-page
 * architecture approved in the v6 mock. Voice: translate, do not dilute.
 * Never uses "nurse-to-resident ratio".
 */

import { sffStatusOf } from './sffStatus.js';

export const BRIEF_PAGE_COUNT = 9;
export const PRODUCT_LABEL = 'Facility Brief';

const NUMBER_WORDS = {
  1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six',
  7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve',
};

const PLAIN_FTAG = {
  F550: 'Resident rights / dignity',
  F580: 'Immediate family / physician notification',
  F584: 'Safe, clean, homelike environment',
  F600: 'Protect residents from abuse / neglect',
  F607: 'Abuse-prevention policies & procedures',
  F609: 'Timely report suspected abuse / neglect',
  F610: 'Investigate and prevent further abuse',
  F655: 'Immediate care-plan after admission',
  F678: 'Basic life support / CPR before EMS',
  F684: 'Quality of care',
  F686: 'Treatment to prevent / heal pressure ulcers',
  F687: 'Appropriate foot care',
  F689: 'Accident hazards / adequate supervision',
  F690: 'Incontinence, catheter, UTI care',
  F695: 'Safe respiratory care',
  F725: 'Sufficient nursing staff',
  F726: 'Competent nursing staff',
  F727: 'RN on duty 8 hrs/day; full-time DON',
  F760: 'Residents free of significant med errors',
  F812: 'Food safety / sanitation',
  F880: 'Infection prevention and control',
  F921: 'Safe, easy-to-use, clean environment',
  F925: 'Pest control program',
  F926: 'Smoking policies',
};

const WHY_IT_MATTERS = {
  F580: 'Families cannot advocate or consent if nobody is called when a resident declines — especially after hours.',
  F600: 'Immediate Jeopardy means inspectors judged residents at risk of serious harm. An active CMS abuse icon signals ongoing concern, not a closed chapter.',
  F607: 'Written policies only protect residents if staff know them and they are used after every allegation.',
  F609: 'Delayed reporting lets harm continue and hides patterns from families and regulators.',
  F678: 'Emergency response competence is non-negotiable for medically complex residents.',
  F689: 'Supervision gaps show up as falls, wandering, and equipment hazards — especially on thin RN shifts.',
  F727: 'Federal rules require an RN on duty 8 hours a day. Coverage gaps leave LPNs/CNAs without that clinical backup.',
};

const QM_TABLE = [
  { code: '410', stay: 'ls', name: 'Falls with major injury (long-stay)', tip: 'Ask how call lights and fall huddles work on nights/weekends' },
  { code: '479', stay: 'ls', name: 'Pressure ulcers (long-stay)', tip: 'Ask about turning schedules and wound-care nurse coverage' },
  { code: '401', stay: 'ls', name: 'Need for help with daily activities increased', tip: 'Tracks functional decline — ask how care plans are updated' },
  { code: '451', stay: 'ls', name: 'Ability to walk independently worsened', tip: 'Relevant if mobility is a goal' },
  { code: '481', stay: 'ls', name: 'Antipsychotic medication (long-stay)', tip: 'Ask about non-drug approaches and consent' },
  { code: '404', stay: 'ls', name: 'Significant weight loss (long-stay)', tip: 'Ask how dining assistance is staffed' },
  { code: '480', stay: 'ls', name: 'New or worsened incontinence (long-stay)', tip: 'Ask about toileting schedules and response time' },
  { code: '452', stay: 'ls', name: 'Antianxiety / hypnotic medication (long-stay)', tip: 'Sedatives raise fall risk — ask about review and consent' },
];

const QM_CONTEXT = [
  { code: '404', stay: 'ls', label: 'Weight loss' },
  { code: '480', stay: 'ls', label: 'New/worsened incontinence' },
  { code: '452', stay: 'ls', label: 'Antianxiety / hypnotic meds' },
  { code: '415', stay: 'ls', label: 'Pneumococcal vaccine given', higherBetter: true },
  { code: '406', stay: 'ls', label: 'Catheter left in' },
  { code: '407', stay: 'ls', label: 'UTI' },
  { code: '409', stay: 'ls', label: 'Restraints' },
  { code: '408', stay: 'ls', label: 'Depressive symptoms' },
];

const IJ_LETTERS = new Set(['J', 'K', 'L']);
const SCOPE_WORD = {
  A: 'Isolated', B: 'Pattern', C: 'Widespread',
  D: 'Isolated', E: 'Pattern', F: 'Widespread',
  G: 'Isolated', H: 'Pattern', I: 'Widespread',
  J: 'Isolated', K: 'Pattern', L: 'Widespread',
};

export function titleCase(value) {
  if (value == null || value === '') return '';
  return String(value)
    .toLowerCase()
    .replace(/(^|[\s/,-])\w/g, (m) => m.toUpperCase());
}

function displayName(value) {
  if (!value) return '';
  const s = String(value);
  if (s === s.toUpperCase()) return titleCase(s);
  return s;
}

export function formatDataAsOf(isoDate) {
  if (!isoDate) return 'Current';
  try {
    const d = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return String(isoDate);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return String(isoDate);
  }
}

export function formatReportDate(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function fmtMoney(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return 'N/A';
  return '$' + Math.round(Number(value)).toLocaleString('en-US');
}

export function fmtNum(value, digits = 2) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return null;
  return Number(value).toFixed(digits);
}

export function fmtPct(value, digits = 1) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return null;
  return `${Number(value).toFixed(digits)}%`;
}

export function normalizeFtag(ftag) {
  if (!ftag) return '';
  const cleaned = String(ftag).replace(/^F-?0*/i, '');
  return 'F' + cleaned;
}

export function formatFtagDisplay(ftag) {
  const n = normalizeFtag(ftag);
  if (!n) return '';
  const num = n.slice(1).padStart(4, '0');
  return 'F-' + num;
}

export function isImmediateJeopardy(def) {
  if (!def) return false;
  const letter = String(def.scope_severity || '').toUpperCase().slice(0, 1);
  if (IJ_LETTERS.has(letter)) return true;
  return String(def.severity_label || '').toLowerCase().includes('immediate jeopardy');
}

export function hasSpecialFocus(facility) {
  return sffStatusOf(facility) === 'active';
}

export function hasAbuseIcon(facility) {
  if (facility?.abuse_icon) return true;
  return (facility?.flags || []).some((f) => /abuse icon/i.test(f));
}

function joinAnd(parts) {
  const list = parts.filter(Boolean);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
}

function wordNumber(n) {
  if (NUMBER_WORDS[n]) return NUMBER_WORDS[n];
  return String(n);
}

function letterOf(def) {
  return String(def?.scope_severity || '').toUpperCase().slice(0, 1);
}

export function formatScopeSeverity(def) {
  const letter = letterOf(def);
  const scope = def?.scope_label || SCOPE_WORD[letter] || '';
  if (!letter) return def?.severity_label || 'See CMS extract';
  if (IJ_LETTERS.has(letter)) return `${letter} · IJ · ${scope || 'Immediate Jeopardy'}`;
  if ('GHI'.includes(letter)) return `${letter} · Actual harm · ${scope}`;
  return `${letter} · ${scope || 'Cited'}`;
}

export function formatCorrectionStatus(def) {
  if (!def) return 'See extract';
  if (def.corrected === false || def.corrected === 'false' || def.corrected === 'N') {
    return 'Not corrected*';
  }
  if (def.correction_date) return `Corrected ${def.correction_date}`;
  if (def.corrected === true || def.corrected === 'true' || def.corrected === 'Y') {
    return 'Corrected';
  }
  return 'See extract';
}

export function plainFtagLabel(def) {
  const key = normalizeFtag(def?.ftag);
  if (PLAIN_FTAG[key]) return PLAIN_FTAG[key];
  const desc = String(def?.description || '').replace(/\s+/g, ' ').trim();
  if (desc.length > 72) return desc.slice(0, 69) + '…';
  return desc || key || 'CMS health deficiency';
}

function qmValue(facility, stay, code) {
  const cell = facility?.quality_measures?.mds?.[stay]?.[code];
  if (!cell || cell.s == null || Number.isNaN(Number(cell.s))) return null;
  return Number(cell.s);
}

function severityRank(def) {
  if (isImmediateJeopardy(def)) return 3;
  const letter = letterOf(def);
  if ('GHI'.includes(letter) || /actual harm/i.test(def?.severity_label || '')) return 2;
  return 1;
}

function sortDefs(details) {
  return [...details].sort((a, b) => {
    const r = severityRank(b) - severityRank(a);
    if (r) return r;
    return String(b.survey_date || '').localeCompare(String(a.survey_date || ''));
  });
}

function ftagMentions(details, code) {
  const key = normalizeFtag(code);
  return details.filter((d) => normalizeFtag(d.ftag) === key);
}

export function compositeConcernLabel(score) {
  if (score == null) return 'not scored';
  if (score >= 75) return 'elevated concern';
  if (score >= 55) return 'moderate concern';
  if (score >= 35) return 'some concern';
  return 'lower aggregated concern';
}

function buildBottomLine(facility, ctx) {
  const flags = [];
  if (ctx.sff) flags.push('Special Focus Facility status');
  if (ctx.abuse) flags.push('an active abuse icon');
  if (ctx.ijCount > 0) {
    flags.push(`${wordNumber(ctx.ijCount)} Immediate Jeopardy citation${ctx.ijCount === 1 ? '' : 's'}`);
  }
  if ((facility.total_fines || 0) > 0) {
    flags.push(`more than ${fmtMoney(facility.total_fines)} in fines`);
  }

  const staffingBits = [];
  if (facility.rn_hprd != null && facility.rn_hprd < 0.45) {
    staffingBits.push('RN staffing still thin');
  }
  if (facility.zero_rn_pct > 20) {
    staffingBits.push(`${fmtPct(facility.zero_rn_pct, 0)} of days showing zero RN hours`);
  }
  if (facility.rn_gap_pct > 30) {
    staffingBits.push('a large gap between self-reported and payroll-based hours');
  }

  if (flags.length >= 2) {
    let text = `Public CMS records show a high-risk pattern: ${joinAnd(flags)}`;
    if (staffingBits.length) text += ` — with ${joinAnd(staffingBits)}`;
    text += '. Visit carefully and press for current corrections before deciding.';
    return text;
  }

  const stars = facility.stars;
  const parts = [];
  if (stars != null) {
    parts.push(`CMS rates this home ${stars} of 5 stars overall`);
  }
  if (ctx.ijCount > 0) {
    parts.push(`inspectors have cited Immediate Jeopardy ${ctx.ijCount} time${ctx.ijCount === 1 ? '' : 's'}`);
  } else if ((facility.total_deficiencies || 0) > 0) {
    parts.push(`${facility.total_deficiencies} health deficiencies are on the public extract`);
  }
  if ((facility.total_fines || 0) > 0) {
    parts.push(`reported fines total ${fmtMoney(facility.total_fines)}`);
  }
  if (staffingBits.length) parts.push(staffingBits[0]);
  if (parts.length === 0) {
    return 'This brief summarizes the public CMS record for this home. Use the scorecard and visit checklist to verify current conditions before deciding.';
  }
  return `${parts.join(', with ')}. Read the inspection story, tour with the checklist, and compare nearby options before signing anything.`;
}

function buildStrengths(facility, ctx) {
  const items = [];
  const qm = facility.quality_stars;
  const insp = facility.inspection_stars;
  const staff = facility.staffing_stars;
  if (qm != null && (insp == null || qm > insp) && (staff == null || qm >= staff)) {
    items.push(`Quality-measure star rating is ${qm} of 5 — better than inspection${staff != null && qm > staff ? ' and staffing stars' : ' stars'} on selected clinical measures.`);
  } else if (qm != null && qm >= 4) {
    items.push(`Quality-measure star rating is ${qm} of 5 on selected clinical measures.`);
  }
  if (staff != null && insp != null && staff > insp) {
    items.push(`Staffing stars (${staff} of 5) are higher than health-inspection stars (${insp} of 5) — still verify weekend and night RN coverage on tour.`);
  }

  const zeroList = ['406', '407', '409', '408']
    .map((code) => {
      const v = qmValue(facility, 'ls', code);
      return v === 0 ? code : null;
    })
    .filter(Boolean);
  if (zeroList.length >= 2) {
    items.push('Several long-stay measures show low reported rates for catheters, UTIs, restraints, and/or depressive symptoms (0% in this extract).');
  }

  if (facility.beds && facility.avg_census != null && facility.avg_census < facility.beds * 0.7) {
    items.push(`Average daily census (~${Math.round(facility.avg_census)} of ${facility.beds} beds) is well below capacity, which can mean more space — ask how that affects staffing on the floor.`);
  }

  if ((facility.total_fines || 0) === 0 && ctx.ijCount === 0) {
    items.push('No federal fines and no Immediate Jeopardy citations appear in this extract.');
  }

  if (items.length === 0 && facility.stars >= 4) {
    items.push(`Overall CMS rating is ${facility.stars} of 5 — still confirm staffing on evenings and weekends.`);
  }
  if (items.length === 0) {
    items.push('Use the quality-measure table on page 4 for any selected clinical rates CMS published for this home.');
  }
  return items.slice(0, 3);
}

function buildConcerns(facility, ctx, details) {
  const items = [];
  const f600 = ftagMentions(details, 'F600');
  if (ctx.ijCount > 0 || ctx.abuse || f600.length) {
    const years = [...new Set(f600.map((d) => (d.survey_date || '').slice(0, 4)).filter(Boolean))].sort();
    const yearSpan = years.length ? ` across ${years[0]}–${years[years.length - 1]}` : '';
    items.push(`Immediate Jeopardy + abuse: Repeated F-0600 abuse citations${yearSpan}${f600.some((d) => d.is_complaint) ? ', including complaint surveys' : ''}.`);
  }
  if (ctx.sff) {
    items.push('Special Focus Facility: CMS has flagged this home for persistent quality problems — ask what the current SFF plan requires.');
  }
  const staffBits = [];
  if (facility.rn_hprd != null) staffBits.push(`RN hours ~${fmtNum(facility.rn_hprd)}/day`);
  if (facility.zero_rn_pct > 10) staffBits.push(`${fmtPct(facility.zero_rn_pct, 0)} of days with zero RN`);
  if (facility.rn_gap_pct > 25) staffBits.push(`self-report vs PBJ gap ~${fmtPct(facility.rn_gap_pct, 0)}`);
  let ownerBit = '';
  if (facility.ownership_changed_recently && facility.ownership_change_date) {
    ownerBit = ` Ownership changed ${facility.ownership_change_date}`;
    if (facility.new_owner_name) ownerBit += ` (${titleCase(facility.new_owner_name)})`;
    ownerBit += '.';
  }
  if (facility.worst_owner && (facility.owner_avg_fines || 0) > 40000) {
    ownerBit += ` ${titleCase(facility.worst_owner.split(',')[0])} portfolio averages high fines.`;
  }
  if (staffBits.length || ownerBit) {
    items.push(`Staffing & ownership: ${staffBits.join('; ')}.${ownerBit}`);
  }
  if ((facility.total_fines || 0) > 100000 && items.length < 3) {
    items.push(`Federal fines on record total ${fmtMoney(facility.total_fines)} — enforcement, not just paperwork findings.`);
  }
  if (items.length === 0 && (facility.inspection_stars || 5) <= 2) {
    items.push('Health-inspection stars are at the low end of the CMS scale — read the inspection story before the F-tag table.');
  }
  if (items.length === 0) {
    items.push('Confirm current RN coverage, how families are notified after hours, and what has changed since the last survey.');
  }
  return items.slice(0, 3);
}

function buildLookCloser(facility, ctx) {
  const items = [];
  const qm = facility.quality_stars;
  const insp = facility.inspection_stars;
  const staff = facility.staffing_stars;
  if (insp != null && qm != null && Math.abs(qm - insp) >= 2) {
    items.push(`Inspection stars (${insp}) and quality-measure stars (${qm}) diverge — dig into why, don’t average them away.`);
  }
  if (staff != null && insp != null && staff === 1 && qm >= 4) {
    items.push('Staffing stars are at the floor while quality stars are high — ask how selected measures can look strong when RN coverage is thin.');
  }
  if (ctx.sff || ctx.abuse) {
    items.push('Special Focus Facility and/or the abuse icon are separate CMS alerts beyond the star rating.');
  }
  if ((facility.total_fines || 0) > 0) {
    const denial = facility.denial_count > 0 ? ` and ${facility.denial_count} payment denial${facility.denial_count === 1 ? '' : 's'}` : '';
    items.push(`Fines totaling ${fmtMoney(facility.total_fines)}${denial} show federal enforcement, not just paperwork findings.`);
  }
  if (items.length === 0) {
    items.push('Stars combine three different CMS domains — read each one, then verify current conditions on a visit.');
  }
  return items.slice(0, 3);
}

function starLine(label, stars, extra) {
  if (stars == null) return { label, value: 'N/A', tone: 'neutral', blurb: extra };
  const tone = stars <= 1 ? 'bad' : stars <= 2 ? 'amber' : stars >= 4 ? 'good' : 'neutral';
  return { label, value: `${stars} of 5`, tone, blurb: extra };
}

function buildScoreInterpretations(facility, ctx) {
  const overall = facility.stars;
  const insp = facility.inspection_stars;
  const staff = facility.staffing_stars;
  const qm = facility.quality_stars;
  const composite = facility.composite;
  return [
    {
      title: `Overall (${overall != null ? overall + ' of 5' : 'n/a'})`,
      text: 'CMS combines inspection, staffing, and quality-measure results. The overall star is a blend — not a prediction for any one resident.',
    },
    {
      title: `Health inspection (${insp != null ? insp + ' of 5' : 'n/a'})`,
      text: ctx.ijCount > 0
        ? `Driven by standard surveys plus recent complaint and infection-control findings. ${ctx.ijCount} Immediate Jeopardy citation${ctx.ijCount === 1 ? '' : 's'} weigh heavily here.`
        : 'Driven by standard surveys plus recent complaint and infection-control findings. A count of citations is not the same as severity.',
    },
    {
      title: `Staffing (${staff != null ? staff + ' of 5' : 'n/a'})`,
      text: facility.zero_rn_pct > 10
        ? `Based on payroll-based journal (PBJ) hours per resident day and related measures. Thin RN coverage and many zero-RN days pull this down.`
        : 'Based on payroll-based journal (PBJ) hours per resident day, turnover, and related measures — averages still hide thin nights and weekends.',
    },
    {
      title: `Quality measures (${qm != null ? qm + ' of 5' : 'n/a'})`,
      text: 'Selected clinical indicators (long-stay and/or short-stay). Stronger or weaker than other domains — still not a full picture of daily care.',
    },
    {
      title: `Oversight composite (${composite != null ? Number(composite).toFixed(1) : 'n/a'})`,
      text: `Our summary of public risk signals (deficiencies, penalties, ownership, staffing, quality). ${composite != null ? Number(composite).toFixed(1) + ' = ' + compositeConcernLabel(composite) + '.' : ''} Use it as a conversation starter, not a verdict.`,
    },
  ];
}

function buildStaffingContext(facility, details) {
  const bullets = [];
  if (facility.adj_total_hprd != null || facility.adj_rn_hprd != null) {
    bullets.push(`Case-mix adjusted total HPRD: ${fmtNum(facility.adj_total_hprd) || 'n/a'} · adjusted RN: ${fmtNum(facility.adj_rn_hprd) || 'n/a'}`);
  }
  if (facility.total_turnover != null) {
    const admin = facility.admin_turnover != null ? ` (admin turnover reported as ${facility.admin_turnover})` : '';
    bullets.push(`Total nurse turnover: ${fmtPct(facility.total_turnover)}${admin}`);
  }
  const trend = facility.staffing_trend;
  if (trend?.rn_hprd?.length && trend.zero_rn_pct?.length) {
    const rn = trend.rn_hprd.map((v) => fmtNum(v)).join(' -> ');
    const z = trend.zero_rn_pct[trend.zero_rn_pct.length - 1];
    bullets.push(`Recent trend (PBJ quarters): RN hours moved ${rn}; zero-RN days ${z != null ? fmtPct(z) : ''} in the latest quarter shown.`);
  }
  const f727 = sortDefs(details).find((d) => normalizeFtag(d.ftag) === 'F727');
  if (f727) {
    bullets.push(`${(f727.survey_date || '').slice(0, 7)} survey cited ${formatFtagDisplay(f727.ftag)}: registered nurse not on duty as required (scope/severity ${f727.scope_severity || 'n/a'}) — ${formatCorrectionStatus(f727).toLowerCase()} on paper.`);
  }
  return bullets.slice(0, 4);
}

function buildOwnershipBullets(facility) {
  const bullets = [];
  if (facility.ownership_type) bullets.push({ label: 'Type', value: facility.ownership_type });
  if (facility.chain_name) bullets.push({ label: 'Chain', value: titleCase(facility.chain_name) });
  const owners = facility.num_owners || facility.owner_count;
  if (owners) bullets.push({ label: 'Owners on record', value: String(owners) });
  if (facility.ownership_change_date) {
    const who = facility.new_owner_name ? ` -> ${titleCase(facility.new_owner_name)}` : '';
    bullets.push({ label: 'Change', value: `${facility.ownership_change_date}${who}` });
  }
  if (facility.worst_owner && facility.owner_portfolio_count > 1) {
    const below = facility.owner_pct_below_avg != null
      ? `; ${fmtPct(facility.owner_pct_below_avg)} of that portfolio below average stars`
      : '';
    bullets.push({
      label: 'Worst linked owner',
      value: `${titleCase(facility.worst_owner)} - controls ${facility.owner_portfolio_count} facilities; portfolio avg fines ${fmtMoney(facility.owner_avg_fines)}; avg stars ${facility.owner_avg_stars != null ? Number(facility.owner_avg_stars).toFixed(2) : 'n/a'}${below}`,
    });
  }
  if (facility.related_party_costs) {
    bullets.push({
      label: 'Related-party costs',
      value: `${fmtMoney(facility.related_party_costs)}${facility.related_party_year ? ` (${facility.related_party_year})` : ''}`,
    });
  }
  if (!facility.pe_owned && !facility.reit_owned) {
    bullets.push({ label: null, value: 'No PE / REIT flags in this extract' });
  } else {
    if (facility.pe_owned) bullets.push({ label: 'PE', value: facility.pe_owner_name || 'Flagged in extract' });
    if (facility.reit_owned) bullets.push({ label: 'REIT', value: facility.reit_owner_name || 'Flagged in extract' });
  }
  return bullets;
}

function buildCareFitMeasures(facility) {
  const rows = [];
  for (const m of QM_TABLE) {
    const v = qmValue(facility, m.stay, m.code);
    if (v == null) continue;
    rows.push({
      name: m.name,
      rate: `${v.toFixed(2)}%`,
      tip: m.tip,
    });
  }
  return rows.slice(0, 6);
}

function buildCareFitContext(facility) {
  const bits = [];
  const named = [];
  const zeros = [];
  for (const m of QM_CONTEXT) {
    const v = qmValue(facility, m.stay, m.code);
    if (v == null) continue;
    if (m.higherBetter) {
      named.push(`${m.label}: ${v.toFixed(2)}% (higher is better)`);
    } else if (v === 0) {
      zeros.push(m.label.replace(/ \(long-stay\)/, ''));
    } else {
      named.push(`${m.label}: ${v.toFixed(2)}%`);
    }
  }
  if (named.length) bits.push(named.slice(0, 3).join(' · '));
  if (zeros.length) bits.push(`${zeros.join(', ')}: 0% in this extract`);
  return bits;
}

function categoryCounts(details, facility) {
  if (Array.isArray(facility.top_categories) && facility.top_categories.length) {
    return facility.top_categories.slice(0, 3).map(([name, count]) => ({
      n: count,
      t: String(name).replace(/\s+Deficiencies$/i, ''),
    }));
  }
  const map = {};
  for (const d of details) {
    const cat = (d.category || 'Other').replace(/\s+Deficiencies$/i, '');
    map[cat] = (map[cat] || 0) + 1;
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t, n]) => ({ n, t }));
}

function whyFor(def) {
  const key = normalizeFtag(def.ftag);
  if (WHY_IT_MATTERS[key]) return WHY_IT_MATTERS[key];
  if (isImmediateJeopardy(def)) {
    return 'Immediate Jeopardy means inspectors judged residents at risk of serious harm, impairment, or death if the problem is not fixed.';
  }
  return 'This citation is on the public extract — ask what changed, who owns the fix, and how recurrence is monitored.';
}

function askFor(def, facility) {
  const key = normalizeFtag(def.ftag);
  if (key === 'F600' || key === 'F607' || key === 'F609') {
    return 'Walk me through the current abuse-prevention policy, who investigates allegations, and what changed after each IJ.';
  }
  if (key === 'F689') {
    return 'How are fall and hazard huddles run on evenings and weekends, and who is the RN on duty today?';
  }
  if (key === 'F678') {
    return 'Show me current CPR/BLS coverage by shift and how drills are documented.';
  }
  if (key === 'F580') {
    return 'What is your after-hours standard if my relative declines — who calls the family, and how fast?';
  }
  if (key === 'F727') {
    return `Who is the registered nurse covering this shift and this coming weekend? About ${fmtPct(facility.zero_rn_pct, 0) || 'some'} of days show zero RN hours in PBJ data.`;
  }
  return 'What changed after this citation, when did it change, and how do you know it has not come back?';
}

function storyTag(def, index, isPattern) {
  if (isPattern) return 'PATTERN · IMMEDIATE JEOPARDY / ABUSE';
  const date = def.survey_date
    ? new Date(`${def.survey_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
    : 'CMS EXTRACT';
  const sev = letterOf(def);
  const ij = isImmediateJeopardy(def) ? ' (IJ)' : '';
  return `${date} · ${formatFtagDisplay(def.ftag)} · SCOPE ${sev || '—'}${ij}`;
}

function buildInspectionStories(facility, details, ctx) {
  const stories = [];
  const f600 = ftagMentions(details, 'F600');
  if (f600.length >= 2 || (ctx.abuse && f600.length)) {
    const years = [...new Set(f600.map((d) => (d.survey_date || '').slice(0, 4)).filter(Boolean))].sort();
    const uncorrected = f600.filter((d) => d.corrected === false);
    const latest = sortDefs(f600)[0];
    stories.push({
      tag: 'PATTERN · IMMEDIATE JEOPARDY / ABUSE',
      finding: `Multiple ${formatFtagDisplay('F600')} “protect from abuse” citations${years.length ? ` in ${years.join(' and ')}` : ''}${uncorrected.length ? ' — plus at least one item not marked corrected in this extract' : ''}.`,
      why: WHY_IT_MATTERS.F600,
      status: uncorrected.length
        ? 'Newer complaint items need verbal confirmation on your visit; older IJ items may show correction dates in the extract.'
        : `Several items show correction dates in the extract; confirm live status on Care Compare and during your visit. Latest row: ${formatCorrectionStatus(latest)}.`,
      ask: askFor({ ftag: 'F600' }, facility),
    });
  }

  const used = new Set(stories.length ? f600.map((d) => `${d.survey_date}|${normalizeFtag(d.ftag)}`) : []);
  const ranked = sortDefs(details).filter((d) => {
    const id = `${d.survey_date}|${normalizeFtag(d.ftag)}`;
    if (used.has(id)) return false;
    // Prefer IJ and recent serious items for the narrative cards
    return isImmediateJeopardy(d) || severityRank(d) >= 2;
  });

  for (const def of ranked) {
    if (stories.length >= 3) break;
    stories.push({
      tag: storyTag(def),
      finding: def.description
        ? def.description.replace(/\s+/g, ' ').trim()
        : plainFtagLabel(def),
      why: whyFor(def),
      status: formatCorrectionStatus(def) === 'See extract'
        ? 'Status not listed for this row in the extract.'
        : `${formatCorrectionStatus(def)} per CMS extract.`,
      ask: askFor(def, facility),
    });
  }

  if (stories.length === 0 && details[0]) {
    const def = sortDefs(details)[0];
    stories.push({
      tag: storyTag(def),
      finding: def.description || plainFtagLabel(def),
      why: whyFor(def),
      status: formatCorrectionStatus(def),
      ask: askFor(def, facility),
    });
  }
  if (stories.length === 0) {
    stories.push({
      tag: 'CMS EXTRACT',
      finding: 'No individual health-deficiency rows were loaded for this facility in the current extract.',
      why: 'The inspection star still comes from CMS surveys. Ask the facility for the last standard survey and any complaint investigations.',
      status: 'Confirm on medicare.gov Care Compare.',
      ask: 'May I see the most recent survey results and plan of correction?',
    });
  }
  return stories.slice(0, 3);
}

function alsoOnRecordNote(details) {
  const extras = sortDefs(details).filter((d) => isImmediateJeopardy(d));
  const leftover = extras.find((d) => normalizeFtag(d.ftag) === 'F580');
  if (leftover) {
    return `Also on record: ${(leftover.survey_date || '').slice(0, 7)} Immediate Jeopardy for late family/physician notification (${formatFtagDisplay('F580')}${leftover.correction_date ? `, corrected ${leftover.correction_date}` : ''}) — ask for today’s written after-hours call standard. Category counts above are top CMS deficiency categories; a count is not the same as severity. Full ledger continues on page 6.`;
  }
  return 'Category counts above are top CMS deficiency categories; a count is not the same as severity. Full ledger continues on page 6.';
}

export function selectDecisionDefs(details) {
  const sorted = sortDefs(details);
  const picked = [];
  const seen = new Set();
  const take = (def) => {
    const id = `${def.survey_date}|${def.ftag}|${def.scope_severity}`;
    if (seen.has(id)) return;
    seen.add(id);
    picked.push(def);
  };
  sorted.filter((d) => isImmediateJeopardy(d)).forEach(take);
  sorted.filter((d) => d.corrected === false).forEach(take);
  sorted.filter((d) => normalizeFtag(d.ftag) === 'F727' || normalizeFtag(d.ftag) === 'F580').forEach(take);
  sorted.forEach(take);
  return picked.slice(0, 12);
}

function buildVisitQuestions(facility, details, ctx) {
  const qs = [];
  if (ctx.sff || ctx.abuse) {
    qs.push(
      `You are ${ctx.sff ? 'a Special Focus Facility' : 'this facility'}${ctx.abuse ? ' with an active abuse icon' : ''} — what does the current ${ctx.sff ? 'SFF plan' : 'improvement plan'} require, and what has improved since the last revisit?`
    );
  }
  const f600 = ftagMentions(details, 'F600');
  if (f600.length) {
    const years = [...new Set(f600.map((d) => (d.survey_date || '').slice(0, 4)).filter(Boolean))].sort();
    qs.push(
      `F-0600 abuse citations recur${years.length ? ` from ${years[0]} into ${years[years.length - 1]}` : ''} — who investigates allegations today, and may I see the written prevention policy?`
    );
  }
  if (facility.zero_rn_pct > 10) {
    qs.push(
      `About ${fmtPct(facility.zero_rn_pct, 0)} of days show zero RN hours — who is the registered nurse covering this shift and this coming weekend?`
    );
  }
  if (facility.rn_gap_pct > 25) {
    qs.push(
      `Self-reported RN hours differ from PBJ by roughly ${fmtPct(facility.rn_gap_pct, 0)} — which figure do you stand behind, and why the gap?`
    );
  }
  const f689 = details.find((d) => normalizeFtag(d.ftag) === 'F689' && isImmediateJeopardy(d))
    || details.find((d) => normalizeFtag(d.ftag) === 'F689');
  if (f689) {
    qs.push(
      `After the ${formatFtagDisplay('F689')} accident-hazard${isImmediateJeopardy(f689) ? ' Immediate Jeopardy' : ' citation'}, how do you review call lights and falls on evenings and weekends?`
    );
  }
  const f580 = details.find((d) => normalizeFtag(d.ftag) === 'F580' && isImmediateJeopardy(d))
    || details.find((d) => normalizeFtag(d.ftag) === 'F580');
  if (f580) {
    qs.push(
      `Family notification was cited${isImmediateJeopardy(f580) ? ' at Immediate Jeopardy' : ''} (${formatFtagDisplay('F580')}) — what is your after-hours standard if my relative declines?`
    );
  }
  if (facility.ownership_changed_recently && facility.ownership_change_date) {
    const owner = facility.new_owner_name ? titleCase(facility.new_owner_name) : 'the new owner';
    const chain = facility.chain_name ? `, and how does ${titleCase(facility.chain_name)} relate` : '';
    qs.push(
      `Ownership changed to ${owner} on ${facility.ownership_change_date} — who is accountable on-site day to day${chain}?`
    );
  }
  qs.push(
    'When a CNA or RN calls out, do you limit new admissions or use agency staff — and may I speak with a family-council contact?'
  );
  return qs.slice(0, 8);
}

function pickNearby(nearbyAlternatives) {
  return (nearbyAlternatives || []).slice(0, 3).map((f) => ({
    name: displayName(f.name),
    city: titleCase(f.city),
    stars: f.stars != null ? String(f.stars) : '—',
    composite: f.composite != null ? Number(f.composite).toFixed(1) : '—',
    fines: fmtMoney(f.total_fines || 0),
    ij: String(f.jeopardy_count || 0),
  }));
}

function mustHaveHint(ctx, facility) {
  const bits = [];
  if (facility.zero_rn_pct > 10) bits.push('weekend RN');
  if (ctx.abuse) bits.push('abuse-reporting path');
  if (ctx.sff) bits.push('SFF progress');
  if (bits.length === 0) bits.push('weekend RN coverage', 'how families are notified');
  return `Non-negotiables (${bits.slice(0, 3).join(', ')})`;
}

/**
 * @param {object} facility
 * @param {object} [opts]
 * @param {Array} [opts.deficiencyDetails]
 * @param {Array} [opts.nearbyAlternatives]
 * @param {string|null} [opts.dataAsOf] ISO date from state _metadata.data_as_of
 * @param {Date} [opts.reportDate]
 */
export function buildFacilityBriefModel(facility, opts = {}) {
  const details = Array.isArray(opts.deficiencyDetails)
    ? opts.deficiencyDetails
    : (facility.deficiency_details || []);
  const reportDate = opts.reportDate instanceof Date ? opts.reportDate : new Date();
  const dataAsOfLabel = formatDataAsOf(opts.dataAsOf || null);
  const reportDateLabel = formatReportDate(reportDate);

  const ijFromDetails = details.filter(isImmediateJeopardy).length;
  const ctx = {
    sff: hasSpecialFocus(facility),
    abuse: hasAbuseIcon(facility),
    ijCount: ijFromDetails || facility.jeopardy_count || 0,
  };

  const city = titleCase(facility.city);
  const address = titleCase(facility.address || '');
  const location = [address, city, [facility.state, facility.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const metaParts = [
    location,
    facility.ccn ? `CCN ${facility.ccn}` : null,
    facility.beds ? `${facility.beds} beds` : null,
    facility.ownership_type ? `${facility.ownership_type} ownership` : null,
    facility.chain_name ? titleCase(facility.chain_name) : null,
  ].filter(Boolean);

  const chips = [
    {
      label: 'CMS overall',
      value: facility.stars != null ? `${facility.stars} of 5` : 'Not rated',
      tone: facility.stars != null && facility.stars <= 2 ? 'urgent' : 'neutral',
    },
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
  ].filter(Boolean);

  const ls = facility.quality_measures?.mds?.ls || {};
  const ss = facility.quality_measures?.mds?.ss || {};
  const hasLongStay = Object.keys(ls).length > 0;
  const hasShortStay = Object.keys(ss).some((code) => code !== '430');

  const stories = buildInspectionStories(facility, details, ctx);
  const tableDefs = selectDecisionDefs(details).map((d) => ({
    date: d.survey_date || '—',
    ftag: formatFtagDisplay(d.ftag),
    label: plainFtagLabel(d),
    scope: formatScopeSeverity(d),
    status: formatCorrectionStatus(d),
    ij: isImmediateJeopardy(d),
  }));

  const penalties = [...(facility.penalty_timeline || [])]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const fire = Array.isArray(facility.fire_deficiencies) ? facility.fire_deficiencies : [];
  const fireExample = fire[0] || null;

  const pbjRn = facility.rn_hprd != null && facility.rn_gap_pct != null
    ? facility.rn_hprd * (1 - facility.rn_gap_pct / 100)
    : null;

  return {
    productLabel: PRODUCT_LABEL,
    pageCount: BRIEF_PAGE_COUNT,
    dataAsOfLabel,
    reportDateLabel,
    name: facility.name || 'Nursing facility',
    ccn: facility.ccn || '',
    locationLine: location,
    metaLine: metaParts.join(' · '),
    chips,
    bottomLine: buildBottomLine(facility, ctx),
    strengths: buildStrengths(facility, ctx),
    concerns: buildConcerns(facility, ctx, details),
    nextAction: '1) Read the inspection story and F-tag table (pages 5–6). 2) Tour with the visit checklist and ask about weekend RN coverage, abuse policies, and SFF status. 3) Fill the visit checklist (page 8), then compare nearby options and use the decision worksheet before signing anything.',
    inside: 'Scorecard · Staffing & ownership · Care fit · Inspection story · F-tag table · Penalties & safety · Visit checklist · Decision worksheet & sources',
    stars: {
      overall: starLine('Overall CMS', facility.stars),
      inspection: starLine('Health inspection', facility.inspection_stars),
      staffing: starLine('Staffing', facility.staffing_stars),
      quality: starLine('Quality measures', facility.quality_stars),
    },
    composite: facility.composite != null ? Number(facility.composite).toFixed(1) : null,
    compositeLabel: compositeConcernLabel(facility.composite),
    deficiencyCount: facility.total_deficiencies || details.length || 0,
    complaintInvestigations: facility.complaint_investigations || 0,
    interpretations: buildScoreInterpretations(facility, ctx),
    lookCloser: buildLookCloser(facility, ctx),
    doesNotTell: [
      'Whether a specific nurse or shift will be good for your family member.',
      'Whether corrections after an Immediate Jeopardy citation are still working today.',
      'Private-pay pricing, room availability, or therapy schedules.',
      'Everything that happens between surveys — public data lags real life.',
    ],
    staffingIntro: 'Staffing figures are hours of nursing care per resident per day (HPRD) from CMS sources. Higher hours generally mean more care time available — averages still hide thin nights and weekends.',
    staffingMetrics: [
      { v: fmtNum(facility.total_hprd), l: 'Total nurse HPRD', tone: 'neutral' },
      { v: fmtNum(facility.rn_hprd), l: 'RN HPRD', tone: facility.rn_hprd != null && facility.rn_hprd < 0.4 ? 'amber' : 'neutral' },
      { v: fmtNum(facility.lpn_hprd), l: 'LPN HPRD', tone: 'neutral' },
      { v: fmtNum(facility.cna_hprd), l: 'CNA / aide HPRD', tone: 'neutral' },
    ],
    staffingHighlights: [
      {
        title: 'Weekend RN',
        value: fmtNum(facility.weekend_rn_hprd) || 'n/a',
        tone: facility.weekend_rn_hprd != null && facility.rn_hprd != null && facility.weekend_rn_hprd < facility.rn_hprd ? 'warn' : 'neutral',
        note: `HPRD on weekends${facility.weekend_total_hprd != null ? ` — weekend total nurse HPRD: ${fmtNum(facility.weekend_total_hprd)}` : '.'}`,
      },
      {
        title: 'Days with zero RN',
        value: fmtPct(facility.zero_rn_pct) || 'n/a',
        tone: facility.zero_rn_pct > 20 ? 'urgent' : facility.zero_rn_pct > 5 ? 'warn' : 'neutral',
        note: 'Share of days with no registered nurse hours in recent PBJ data.',
      },
      {
        title: 'Self-report vs PBJ',
        value: facility.rn_gap_pct != null ? `${Math.round(facility.rn_gap_pct)}% gap` : 'n/a',
        tone: facility.rn_gap_pct > 30 ? 'warn' : 'neutral',
        note: facility.self_report_rn != null
          ? `Self-reports ~${fmtNum(facility.self_report_rn)} RN HPRD; PBJ is lower when a gap is flagged. Ask which number they stand behind.`
          : 'Ask which RN-hours figure they stand behind.',
      },
    ],
    staffingContext: buildStaffingContext(facility, details),
    ownership: buildOwnershipBullets(facility),
    staffingWhy: 'Thin RN coverage and many zero-RN days affect clinical oversight nights and weekends. Ownership changes and large multi-facility portfolios can shift priorities — ask who is accountable on-site today and how any improvement plan is funded.',
    careFitIntro: hasLongStay && !hasShortStay
      ? 'Use this page to match the home’s published profile to your family member’s needs. Short-stay (rehab) and long-stay (custodial) experiences can differ — this extract has long-stay quality measures primarily.'
      : 'Use this page to match the home’s published profile to your family member’s needs. Short-stay (rehab) and long-stay (custodial) experiences can differ.',
    careFitMetrics: [
      { v: facility.beds != null ? String(facility.beds) : '—', l: 'Certified beds' },
      { v: facility.avg_census != null ? Number(facility.avg_census).toFixed(1) : '—', l: 'Avg daily census' },
      { v: facility.quality_stars != null ? `${facility.quality_stars} of 5` : '—', l: 'QM domain stars', tone: facility.quality_stars >= 4 ? 'good' : 'neutral' },
    ],
    longStayNote: hasLongStay
      ? 'Most published quality measures here are long-stay. If your loved one may remain months or longer, these indicators matter more than a short rehab stay. Still verify therapies, physician visits, and activities on tour.'
      : 'Long-stay quality-measure values are limited in this extract. Ask admissions for current outcomes.',
    shortStayNote: hasShortStay
      ? 'Short-stay measures appear in this extract — still ask admissions about therapy staffing and discharge outcomes.'
      : 'No short-stay quality-measure values appear in this extract (beyond vaccine rates, if any). If the stay is for post-hospital rehab, ask the admissions team for their short-stay outcomes and therapy staffing directly — don’t rely on long-stay QM stars alone.',
    careFitRows: buildCareFitMeasures(facility),
    careFitContext: buildCareFitContext(facility),
    fitChecklist: [
      'Is the need short rehab or long-term residence?',
      ctx.abuse || ctx.sff
        ? 'Are memory-care / behavioral needs present? (abuse & antipsychotic flags matter more)'
        : 'Are memory-care or behavioral needs present?',
      facility.zero_rn_pct > 10
        ? 'Can family visit evenings and weekends when RN hours are thinner?'
        : 'Can family visit evenings and weekends?',
      facility.avg_census && facility.beds && facility.avg_census < facility.beds * 0.7
        ? 'Does census (well below capacity) feel calm or under-staffed on the floor?'
        : 'How does the unit feel on a typical evening shift?',
    ],
    inspectionIntro: ctx.ijCount > 0
      ? `Inspectors and complaint investigators have returned repeatedly. The pattern below is the story behind the ${facility.inspection_stars || facility.stars || 'low'}-star inspection rating — read it before the F-tag table on the next page.`
      : 'Read the pattern below before the F-tag table on the next page. A citation count is not the same as severity.',
    categories: [
      ...categoryCounts(details, facility),
      { n: ctx.ijCount, t: 'Immediate Jeopardy total' },
    ],
    stories,
    alsoOnRecord: alsoOnRecordNote(details),
    ftagIntro: `Most serious and recent health deficiencies from the public extract${ctx.ijCount ? ' (prioritizing Immediate Jeopardy)' : ''}. Plain labels paraphrase official CMS text; F-tag codes stay official. Full CMS record may contain more rows.`,
    ftagRows: tableDefs,
    ftagNote: `* “Not corrected” reflects the correction flag in the public extract as of the report build — confirm live status on Care Compare and with the facility. IJ = Immediate Jeopardy. This table is a curated subset of ${facility.total_deficiencies || details.length || 0} health deficiencies on record; complaint-driven surveys are common in this file.`,
    penaltyIntro: 'Federal money penalties and payment denials are separate from star ratings. They show CMS used enforcement tools — amounts and dates below come from the public penalty timeline.',
    penaltyChips: [
      (facility.total_fines || 0) > 0 ? {
        label: 'Total fines',
        value: `${fmtMoney(facility.total_fines)}${facility.fine_count ? ` · ${facility.fine_count} fine${facility.fine_count === 1 ? '' : 's'}` : ''}`,
        tone: 'warn',
      } : { label: 'Total fines', value: 'None in extract', tone: 'neutral' },
      {
        label: 'Payment denials',
        value: facility.denial_count
          ? `${facility.denial_count} · ${facility.denial_days || '?'} days`
          : 'None in extract',
        tone: 'neutral',
      },
      (ctx.sff || ctx.abuse) ? {
        label: 'CMS alerts',
        value: [ctx.sff ? 'SFF' : null, ctx.abuse ? 'Abuse icon' : null].filter(Boolean).join(' + '),
        tone: 'urgent',
      } : null,
    ].filter(Boolean),
    penaltyRows: penalties.map((p) => ({
      date: p.date || '—',
      type: p.type || (p.amount ? 'Fine' : 'Action'),
      detail: p.amount
        ? fmtMoney(p.amount)
        : [p.start_date ? `Started ${p.start_date}` : null, p.days ? `${p.days} days` : null].filter(Boolean).join(' · ') || 'See extract',
    })),
    sffCard: ctx.sff
      ? 'CMS has placed this home on the Special Focus Facility list for persistent quality problems. SFF homes receive more frequent oversight. Ask for the current SFF action plan, recent revisit results, and whether CMS has moved them toward graduation or deeper enforcement.'
      : null,
    abuseCard: ctx.abuse
      ? 'Care Compare displays an abuse icon when certain abuse-related criteria are met. Combined with abuse-related citations, treat this as a must-ask topic on every tour — policies, training, reporting timelines, and family communication.'
      : null,
    fireCard: (facility.fire_deficiency_count || fire.length)
      ? [
        `${facility.fire_deficiency_count || fire.length} fire-safety deficiencies on record${facility.fire_safety_score != null ? ` · fire safety score ${facility.fire_safety_score}` : ''}${facility.fire_jeopardy_count ? ` · ${facility.fire_jeopardy_count} fire Immediate Jeopardy count in extract` : ''}`,
        fireExample
          ? `Example (${fireExample.survey_date || 'date n/a'}, tag ${fireExample.tag_number || 'n/a'}, scope ${fireExample.scope_severity || 'n/a'}): ${(fireExample.description || '').replace(/\s+/g, ' ')}${fireExample.corrected === false ? ' — not marked corrected in extract' : ''}`
          : null,
        'Ask facilities staff to show recent fire-drill logs and any open Life Safety Code plans of correction',
      ].filter(Boolean)
      : null,
    penaltyNote: 'Fine totals on marketing pages sometimes round differently than the detailed timeline. This brief uses the facility total_fines field from the CMS extract.',
    visitIntro: 'Bring this page on the tour. Every question links to a real flag in the CMS record. Write who answered you. Nearby facilities to compare are on the decision worksheet.',
    questions: buildVisitQuestions(facility, details, ctx),
    visitTip: 'Tip: photograph any written policy they hand you, and note the staff member’s name on each line above before you leave.',
    nearby: pickNearby(opts.nearbyAlternatives),
    nearbyNote: 'Not recommendations — starting points for Care Compare. Lower composite = less aggregated concern in this model.',
    mustHavesHint: mustHaveHint(ctx, facility),
    sources: `CMS Care Compare / Provider Data Catalog (stars, ownership, SFF, abuse icon) · CMS PBJ (nursing hours, weekend RN, zero-RN days) · CMS deficiencies & penalties (F-tags, fines, denials, fire safety). ${facility.name || 'Facility'} · CCN ${facility.ccn || '—'} · CMS as of ${dataAsOfLabel} · Report ${reportDateLabel}.`,
    limitation: 'This report summarizes public data and cannot predict an individual resident’s experience. Confirm current conditions during a visit.',
    sff: ctx.sff,
    abuse: ctx.abuse,
    ijCount: ctx.ijCount,
    pbjRnEstimate: pbjRn,
  };
}
