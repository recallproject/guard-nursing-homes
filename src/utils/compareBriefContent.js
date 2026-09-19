/**
 * Compare Brief content model — rule-based from existing CMS fields.
 * PDF page composition is DRAFT. Wait for Rob's GO before changing layout.
 */

import { CMS_SNF_AS_OF_ISO } from '../data/careSettings.js';
import { formatDataAsOf, formatReportDate } from './facilityBriefContent.js';
import { hasAbuseFlag, hasSffFlag } from './facilityFlags.js';
import {
  cellValue,
  DETAIL_GROUPS,
  FIRST_VIEW_ROWS,
  formatCurrency,
  formatHours,
} from './compareMetrics.js';
import {
  COMPARE_BRIEF_PRODUCT,
  comparingTitle,
  normalizeCompareCcns,
  selectCompareBriefOffer,
  shortHomeLabel,
} from './compareBriefPricing.js';

export const COMPARE_BRIEF_LABEL = 'Compare Brief';
export const COMPARE_BRIEF_DISCLAIMER =
  'Source: CMS public Care Compare data · Not an HHS/CMS endorsement · For families — not medical or legal advice. Always verify on medicare.gov/care-compare. This packet summarizes public records and cannot predict an individual resident\'s experience.';

export function scorecardRows() {
  return FIRST_VIEW_ROWS;
}

export function appendixGroups() {
  return DETAIL_GROUPS;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function lowestBy(homes, getter) {
  let best = null;
  for (const home of homes) {
    const value = getter(home);
    if (value == null) continue;
    if (!best || value < best.value) best = { home, value };
  }
  return best;
}

function highestBy(homes, getter) {
  let best = null;
  for (const home of homes) {
    const value = getter(home);
    if (value == null) continue;
    if (!best || value > best.value) best = { home, value };
  }
  return best;
}

/**
 * Short plain-language flags from existing metrics. Comparative where it helps.
 */
export function whatStandsOut(home, homes) {
  const bullets = [];
  const peers = (homes || []).filter(Boolean);
  const ccn = home?.ccn;

  if (hasSffFlag(home)) {
    bullets.push('On the CMS Special Focus Facility list for persistent quality problems.');
  }
  if (hasAbuseFlag(home)) {
    bullets.push('Care Compare shows an active abuse icon.');
  }

  const ij = num(home?.jeopardy_count) || 0;
  if (ij > 0) {
    bullets.push(`${ij} Immediate Jeopardy citation${ij === 1 ? '' : 's'} on the public record.`);
  }
  const harm = num(home?.harm_count) || 0;
  if (harm > 0) {
    bullets.push(`${harm} actual-harm citation${harm === 1 ? '' : 's'} in the extract.`);
  }

  const lowRn = lowestBy(peers, (f) => num(f.rn_hprd));
  if (lowRn && lowRn.home.ccn === ccn && peers.length > 1) {
    bullets.push(`Lowest RN hours in this comparison (${formatHours(lowRn.value)}).`);
  }

  const highFines = highestBy(peers, (f) => num(f.total_fines));
  if (highFines && highFines.home.ccn === ccn && highFines.value > 0 && peers.length > 1) {
    bullets.push(`Highest reported CMS fines in this set (${formatCurrency(highFines.value)}).`);
  }

  const mostDefs = highestBy(peers, (f) => num(f.total_deficiencies) || 0);
  if (mostDefs && mostDefs.home.ccn === ccn && mostDefs.value > 0 && peers.length > 1) {
    bullets.push(`Most health deficiencies in this set (${mostDefs.value}).`);
  }

  const lowStars = lowestBy(peers, (f) => num(f.stars));
  const highStars = highestBy(peers, (f) => num(f.stars));
  if (lowStars && highStars && lowStars.value !== highStars.value && lowStars.home.ccn === ccn) {
    bullets.push(`Lowest overall CMS star rating in this set (${lowStars.value} of 5).`);
  }
  if (highStars && lowStars && highStars.value !== lowStars.value && highStars.home.ccn === ccn) {
    bullets.push(`Highest overall CMS star rating in this set (${highStars.value} of 5).`);
  }

  const zeroRn = num(home?.zero_rn_pct);
  if (zeroRn != null && zeroRn > 10) {
    bullets.push(`Payroll data shows days with no RN hours (${Math.round(zeroRn)}%).`);
  }

  if (home?.pe_owned) {
    bullets.push('Reported as private-equity owned.');
  }
  if (home?.reit_owned) {
    bullets.push('Reported REIT ownership.');
  }
  if (home?.ownership_changed_recently) {
    bullets.push(home.ownership_change_date
      ? `Recent ownership change flagged (${home.ownership_change_date}).`
      : 'Recent ownership change flagged.');
  }

  const unique = [];
  const seen = new Set();
  for (const line of bullets) {
    if (seen.has(line)) continue;
    seen.add(line);
    unique.push(line);
    if (unique.length >= 4) break;
  }

  if (!unique.length) {
    unique.push('No extra flags beyond the scorecard. Still verify staffing and recent surveys on a tour.');
  }
  return unique;
}

export function sharedVisitChecklist(homes) {
  const anySff = homes.some((h) => hasSffFlag(h));
  const anyAbuse = homes.some((h) => hasAbuseFlag(h));
  const anyIj = homes.some((h) => (num(h?.jeopardy_count) || 0) > 0);

  const questions = [
    'Ask each admissions team who the on-site nurse leader is on evenings and weekends, and write the name.',
    'Ask how they cover RN hours on nights and weekends. Compare the answers to the payroll numbers in this packet.',
    'Walk a hallway at a meal or shift change. Note how long call lights wait, then write it for each home.',
    'Ask who owns the building versus who runs daily care, and whether ownership changed in the last two years.',
    'Ask whether they can show recent fire-drill and infection-control logs.',
  ];

  if (anySff || anyAbuse || anyIj) {
    questions.splice(2, 0,
      'At least one home in this set has a serious CMS flag (Immediate Jeopardy, Special Focus, or abuse icon). Ask what changed after the last serious citation, and ask to see the current plan.'
    );
  }

  questions.push('Write one thing that would make you walk away from each home.');
  return questions.slice(0, 7);
}

export function worksheetPrompts() {
  return [
    { id: 'tour', label: 'Would we tour again?' },
    { id: 'who', label: 'Who answered us?' },
    { id: 'verify', label: 'What still needs verifying on Care Compare?' },
    { id: 'fit', label: 'Does this match our must-haves?' },
  ];
}

export function buildCompareBriefModel(facilities, options = {}) {
  const homes = (Array.isArray(facilities) ? facilities : [])
    .filter(Boolean)
    .slice(0, 3);
  const ccns = normalizeCompareCcns(homes.map((h) => h.ccn));
  const offer = selectCompareBriefOffer(homes.length);
  const dataAsOf = options.dataAsOf || CMS_SNF_AS_OF_ISO;
  const dataAsOfLabel = formatDataAsOf(dataAsOf);
  const reportDateLabel = formatReportDate(options.reportDate || new Date());

  const columns = homes.map((home, index) => ({
    ccn: home.ccn,
    name: home.name || home.ccn,
    short: shortHomeLabel(home, index),
    location: [home.city, home.state].filter(Boolean).join(', '),
    standsOut: whatStandsOut(home, homes),
  }));

  return {
    product: COMPARE_BRIEF_PRODUCT,
    productLabel: COMPARE_BRIEF_LABEL,
    title: comparingTitle(homes),
    count: homes.length,
    ccns,
    offer,
    dataAsOf,
    dataAsOfLabel,
    reportDateLabel,
    homes,
    columns,
    scorecard: scorecardRows().map((row) => ({
      id: row.id,
      label: row.label,
      direction: row.direction,
      values: homes.map((home) => cellValue(row, home)),
    })),
    appendix: appendixGroups().map((group) => ({
      id: group.id,
      title: group.title,
      rows: group.rows.map((row) => ({
        id: row.id,
        label: row.label,
        direction: row.direction,
        values: homes.map((home) => cellValue(row, home)),
      })),
    })),
    checklist: sharedVisitChecklist(homes),
    worksheet: worksheetPrompts(),
    mustHavesHint: 'Write what must be true for your family (distance, memory care, weekend visits, language, budget). Then check each home against those must-haves — do not rank by stars alone.',
    nextStep: 'Pick which home to tour first. Verify the live record on medicare.gov/care-compare before you sign anything.',
    disclaimer: COMPARE_BRIEF_DISCLAIMER,
    limitation: 'This report summarizes public data and cannot predict an individual resident\'s experience. Confirm current conditions during a visit. Not medical or legal advice.',
    sources: `CMS Care Compare / Provider Data Catalog · CMS PBJ staffing · CMS deficiencies and penalties. CCNs ${ccns.join(', ') || '—'} · CMS as of ${dataAsOfLabel} · Report ${reportDateLabel}.`,
    inside: 'Cover · Side-by-side scorecard · What stands out · Shared visit checklist · Decision worksheet · Appendix',
  };
}
