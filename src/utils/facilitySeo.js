import { hasAbuseFlag } from './facilityFlags.js';
import { formerNamesLabel, sffSeoPhrase } from './sffStatus.js';

function clean(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text;
}

function locationLabel(facility) {
  const city = clean(facility?.city);
  const state = clean(facility?.state);
  if (city && state) return `${city}, ${state}`;
  return city || state;
}

function starsLabel(facility) {
  const stars = facility?.stars;
  if (stars == null || stars === '') return 'Unrated by CMS';
  return `${stars}/5 CMS stars`;
}

export function facilitySeoTitle(facility = {}) {
  const name = clean(facility.name) || 'Nursing home';
  const former = formerNamesLabel(facility);
  const nameWithFormer = former ? `${name}, ${former}` : name;
  const location = locationLabel(facility);
  const nameWithPlace = location ? `${nameWithFormer} (${location})` : nameWithFormer;
  const parts = [`${nameWithPlace} — ${starsLabel(facility)}`];
  const ccn = clean(facility.ccn);
  if (ccn) parts.push(`CCN ${ccn}`);
  parts.push('The Oversight Report');
  return parts.join(' | ');
}

export function facilitySeoDescription(facility = {}) {
  const name = clean(facility.name) || 'This nursing home';
  const location = locationLabel(facility);
  const lead = location ? `${name} in ${location}.` : `${name}.`;
  const bits = [lead, `${starsLabel(facility)}.`];

  const ccn = clean(facility.ccn);
  if (ccn) bits.push(`CCN ${ccn}.`);
  const former = formerNamesLabel(facility);
  if (former) bits.push(`${former}.`);

  const deficiencies = Number(facility.total_deficiencies) || 0;
  const jeopardy = Number(facility.jeopardy_count) || 0;
  if (deficiencies > 0) {
    bits.push(
      jeopardy > 0
        ? `${deficiencies} inspection deficiencies, including immediate jeopardy.`
        : `${deficiencies} inspection deficiencies.`
    );
  } else {
    bits.push('No inspection deficiencies in the current extract.');
  }

  const flags = [];
  const sffPhrase = sffSeoPhrase(facility);
  if (sffPhrase) flags.push(sffPhrase);
  if (hasAbuseFlag(facility)) flags.push('CMS abuse icon');
  if (facility.pe_owned) flags.push('private equity ownership');
  if (facility.reit_owned) flags.push('REIT ownership');
  if (flags.length) bits.push(`Flags: ${flags.join(', ')}.`);

  bits.push('Independent nursing home safety data from federal CMS records.');
  return bits.join(' ');
}
