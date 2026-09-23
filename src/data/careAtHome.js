import agencies from './careAtHomeAgencies.json' with { type: 'json' };

/** Consumer seed only. Outreach priority and internal research notes are not imported. */
export const CARE_AT_HOME_AGENCIES = agencies;

export const STATUS_LABELS = {
  verified: 'Agency verified',
  public: 'Publicly sourced',
  missing: 'Not provided',
};

export const COMPARISON_ROWS = [
  ['rate', 'Hourly rate', 'Private-pay care'],
  ['minimum', 'Minimum shift', 'Per scheduled visit'],
  ['backup', 'Backup / no-show policy', 'If your caregiver cannot come'],
  ['continuity', 'Same-caregiver continuity', 'Who you can expect to see'],
  ['dementia', 'Dementia experience', 'Experience and training'],
  ['checks', 'Background checks', 'Agency-reported screening'],
  ['languages', 'Languages', 'Subject to caregiver availability'],
  ['cancellation', 'Cancellation terms', 'Ask for the written policy'],
  ['response', 'Response-time commitment', 'Stated callback target'],
  ['surcharges', 'Extra charges', 'Holidays, travel and other fees'],
  ['registry', 'License information', 'Public statements; current status unchecked'],
];

export const CARD_FACTS = [
  ['languages', 'Languages'],
  ['backup', 'Backup plan'],
  ['continuity', 'Familiar faces'],
  ['response', 'Response time'],
];

const NOT_PROVIDED = /^not provided$/i;

export function isProvidedValue(value) {
  const text = String(value ?? '').trim();
  return text.length > 0 && !NOT_PROVIDED.test(text);
}

/** Card-face rate. Null when the profile has no published number. */
export function publishedRate(agency) {
  if (agency?.rateLow == null || !isProvidedValue(agency.rateLabel)) return null;
  return String(agency.rateLabel).trim();
}

/** Card-face minimum. Null when the profile has no published minimum. */
export function publishedMinimum(agency) {
  if (!isProvidedValue(agency?.minimumLabel)) return null;
  return String(agency.minimumLabel).trim();
}

/** Filled comparison facts for the card chip row. Missing fields stay off the card. */
export function cardFactChips(agency) {
  return CARD_FACTS.flatMap(([key, label]) => {
    const field = agency?.fields?.[key];
    if (!field || field.status === 'missing' || !isProvidedValue(field.value)) return [];
    return [{ key, label, value: String(field.value).trim() }];
  });
}

export const INITIAL_VISIBLE = 8;
export const PAGE_STEP = 6;
export const MAX_COMPARE = 3;

export const SUPPORT_OPTIONS = [
  'Companionship & meals',
  'Bathing & dressing',
  'Dementia support',
  'A mix of everyday needs',
];

export const HOURS_OPTIONS = [
  '4–10 hours',
  '10–20 hours',
  '20–40 hours',
  '40+ hours',
  'Not sure yet',
];

export const TIMING_OPTIONS = [
  'Within a few days',
  'Within 2 weeks',
  'Within a month',
  'Just exploring',
];

export const BUDGET_OPTIONS = [
  'Under $35',
  '$35–$45',
  '$45+',
  'Not sure yet',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatCheckedDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!match) return '';
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return '';
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

export function formatDollars(amount) {
  const rounded = Math.round(Number(amount) || 0);
  const sign = rounded < 0 ? '-' : '';
  return sign + Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function latestChecked(list = CARE_AT_HOME_AGENCIES) {
  return list.reduce((max, agency) => (agency.checked > max ? agency.checked : max), list[0]?.checked || '');
}

export function pilotStats(list = CARE_AT_HOME_AGENCIES) {
  return {
    total: list.length,
    enriched: list.filter((agency) => agency.enriched).length,
    oc: list.filter((agency) => agency.counties.includes('oc')).length,
    sd: list.filter((agency) => agency.counties.includes('sd')).length,
    verifiedFields: list.reduce(
      (count, agency) => count + Object.values(agency.fields).filter((field) => field.status === 'verified').length,
      0,
    ),
  };
}

export function confirmationLabel(stats) {
  if (!stats.verifiedFields) return 'Agency confirmations pending';
  const noun = stats.verifiedFields === 1 ? 'field' : 'fields';
  return `${stats.verifiedFields} ${noun} agency verified`;
}

export function findAgency(id, list = CARE_AT_HOME_AGENCIES) {
  return list.find((agency) => agency.id === id) || null;
}

/**
 * Daytime base-rate example. Genki rateLow is the 4+ hour daytime rate.
 * Coast rateLow is the published nonmedical hourly rate.
 * This is a scenario, not a quote or a county average.
 */
export function getBudgetScenario(list = CARE_AT_HOME_AGENCIES) {
  const genki = findAgency('genki', list);
  const coast = findAgency('coast', list);
  return {
    minHours: 4,
    maxHours: 60,
    defaultHours: 20,
    low: genki?.rateLow ?? null,
    high: coast?.rateLow ?? null,
    genkiShortOrNight: genki?.rateHigh ?? null,
    genkiName: 'Genki',
    coastName: coast?.name || 'Coast Care',
    checked: latestChecked(list),
  };
}

export function weeklyBudget(hours, scenario) {
  const count = Number(hours);
  return {
    low: count * scenario.low,
    high: count * scenario.high,
    label: `${count} hours × $${scenario.low}–$${scenario.high}/hour`,
  };
}

export function budgetFineprint(scenario = getBudgetScenario()) {
  return `Assumes daytime visits of at least ${scenario.minHours} hours: ${scenario.genkiName} $${scenario.low}/hour; ${scenario.coastName} $${scenario.high}/hour. ${scenario.genkiName} lists $${scenario.genkiShortOrNight}/hour for shorter visits and nights. Excludes holidays and extra charges. Your schedule must meet each agency’s minimums. Not a quote or a county average.`;
}

export function filterAgencies(list, { county = 'all', query = '', pricingOnly = false } = {}) {
  const needle = String(query || '').trim().toLowerCase().slice(0, 80);
  return list.filter((agency) => (
    (county === 'all' || agency.counties.includes(county))
    && (!pricingOnly || agency.rateLow != null)
    && (!needle || `${agency.name} ${agency.city} ${agency.area}`.toLowerCase().includes(needle))
  ));
}

export function comparisonRows(active, differencesOnly) {
  return COMPARISON_ROWS.filter(([key]) => {
    if (!differencesOnly || active.length < 2) return true;
    const signatures = new Set(active.map((agency) => {
      const field = agency.fields[key];
      return field.status === 'missing'
        ? 'missing'
        : JSON.stringify([field.value, field.note, field.status]);
    }));
    return signatures.size > 1;
  });
}

export function toggleCompare(selectedIds, id, max = MAX_COMPARE) {
  const selected = new Set(selectedIds);
  if (selected.has(id)) {
    selected.delete(id);
    return { selected: [...selected], rejected: false };
  }
  if (selected.size >= max) {
    return { selected: [...selected], rejected: true };
  }
  selected.add(id);
  return { selected: [...selected], rejected: false };
}

export function countyLabel(key) {
  if (key === 'oc') return 'Orange County';
  if (key === 'sd') return 'San Diego';
  return '';
}

export function countyKeyFromLabel(label) {
  if (label === 'Orange County') return 'oc';
  if (label === 'San Diego') return 'sd';
  return null;
}

export function defaultRequestCounty({ explicitId, selectedIds = [], browseCounty = 'all', agencies: list = CARE_AT_HOME_AGENCIES }) {
  if (explicitId) return findAgency(explicitId, list)?.counties[0] || 'sd';
  const selected = selectedIds.map((id) => findAgency(id, list)).filter(Boolean);
  if (browseCounty === 'all' && selected.length && selected.every((agency) => agency.counties.includes('sd'))) {
    return 'sd';
  }
  if (browseCounty === 'oc' || browseCounty === 'sd') return browseCounty;
  return 'sd';
}

export function createRequestDraft({ explicitId = '', selectedIds = [], browseCounty = 'all', agencies: list = CARE_AT_HOME_AGENCIES } = {}) {
  const countyKey = defaultRequestCounty({ explicitId, selectedIds, browseCounty, agencies: list });
  const preselected = explicitId ? [explicitId] : selectedIds;
  return {
    county: countyLabel(countyKey),
    zip: '',
    support: SUPPORT_OPTIONS[0],
    hours: HOURS_OPTIONS[1],
    timing: TIMING_OPTIONS[1],
    budget: BUDGET_OPTIONS[1],
    email: '',
    agencies: preselected.filter((id) => findAgency(id, list)),
    includeOutside: false,
  };
}

export function validateRequest(draft) {
  const errors = {};
  if (!/^\d{5}$/.test(draft.zip || '')) errors.zip = 'Enter a 5-digit ZIP code.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(draft.email || '').trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!draft.agencies?.length) errors.agencies = 'Select at least one agency to review.';
  if (!countyKeyFromLabel(draft.county)) errors.county = 'Choose Orange County or San Diego.';
  return errors;
}

export function splitRecipients(list, draft) {
  const countyKey = countyKeyFromLabel(draft.county);
  const chosen = (draft.agencies || []).map((id) => findAgency(id, list)).filter(Boolean);
  const inCounty = chosen.filter((agency) => countyKey && agency.counties.includes(countyKey));
  const outside = chosen.filter((agency) => !countyKey || !agency.counties.includes(countyKey));
  const recipients = draft.includeOutside ? chosen : inCounty;
  return { inCounty, outside, recipients };
}

export function safeHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function sourceLinkLabel(source) {
  if (source?.title) return source.title;
  const href = safeHttpUrl(source?.url);
  if (!href) return 'Source';
  return new URL(href).hostname;
}

export function telHref(phone) {
  const digits = String(phone || '').replace(/[^+0-9]/g, '');
  return digits ? `tel:${digits}` : null;
}

export function claimQuestionnaire(agency) {
  const name = agency?.name || '';
  return [
    `Agency: ${name}`,
    'Your name and role:',
    '',
    'Current hourly rates and effective date:',
    'Minimum visit and weekly hours:',
    'Weekend, holiday, night and travel charges:',
    'Backup / no-show policy:',
    'Same-caregiver continuity:',
    'Dementia experience and training:',
    'Background screening:',
    'Available languages:',
    'Cancellation terms:',
    'Response-time commitment:',
    'Service areas and current HCO license number:',
    '',
    'Please confirm that you are authorized to supply these details for publication.',
    'OversightReports reviews the reply before any field is marked Agency verified.',
    'There is no agency login. Reply by email to contact@oversightreports.com.',
  ].join('\n');
}

export function normalizeStatus(status) {
  if (status === 'verified' || status === 'public' || status === 'missing') return status;
  return 'missing';
}
