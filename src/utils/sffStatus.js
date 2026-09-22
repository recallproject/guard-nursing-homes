/**
 * Special Focus Facility status from the monthly CMS posting (tables A–D).
 *
 * Provider Information only stores "SFF" or "SFF Candidate". Graduated (Table B)
 * and terminated (Table C) homes are blank there, so a boolean flag marks
 * graduates as if they were still on the watch list.
 *
 * status: none | candidate | active | graduated | terminated
 */

const STATUSES = new Set(['none', 'candidate', 'active', 'graduated', 'terminated']);

const PROVIDER_STATUS = {
  SFF: 'active',
  'SFF Candidate': 'candidate',
};

export const SFF_STATUS_LABEL = {
  none: 'Not listed on the current SFF posting',
  candidate: 'SFF candidate',
  active: 'Current Special Focus Facility',
  graduated: 'Graduated from SFF program',
  terminated: 'No longer participating in Medicare/Medicaid',
};

export const SFF_STATUS_EXPLAIN = {
  candidate:
    'CMS has placed this home on the SFF candidate list. A candidate is not a current Special Focus Facility. States choose current SFF homes from this list.',
  active:
    'CMS lists this home as a current Special Focus Facility — one of the nursing homes with a persistent pattern of serious quality problems. Current SFF homes are inspected more often. This is a federal designation, not our assessment.',
  graduated:
    'CMS lists this home as graduated from the Special Focus Facility program. Graduates stay on the public list for about three years so people can see the change. Graduation is not a current SFF designation.',
  terminated:
    'CMS lists this home as no longer participating in Medicare and Medicaid after time in the SFF program. Many of these homes have closed.',
};

export function normalizeFacilityName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function namesDiffer(a, b) {
  const left = normalizeFacilityName(a);
  const right = normalizeFacilityName(b);
  return Boolean(left && right && left !== right);
}

export function formatSffDate(iso) {
  if (!iso) return '';
  const [year, month, day] = String(iso).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return String(iso);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatMonths(value) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return `${num} month${num === 1 ? '' : 's'}`;
}

export function lookupSffRecord(posting, ccn) {
  if (!posting || !ccn) return null;
  const direct = posting.by_ccn?.[ccn];
  if (direct?.status && STATUSES.has(direct.status) && direct.status !== 'none') {
    return direct;
  }
  const provider = posting.provider_status?.[ccn];
  const status = PROVIDER_STATUS[provider];
  if (!status) return null;
  return { ccn, status, source: 'provider_info' };
}

export function cmsDisplayName(record) {
  return String(record?.provider_name || record?.name || '').trim();
}

/**
 * Overlay posting status + Care Compare name onto a facility record.
 * No-ops when the posting file is missing so a failed fetch does not wipe data.
 */
export function applySffToFacility(facility, posting) {
  if (!facility || typeof facility !== 'object') return facility;
  if (!posting?.by_ccn) return facility;

  const rec = lookupSffRecord(posting, facility.ccn);
  const status = rec?.status || 'none';
  const flags = (facility.flags || []).filter((flag) => {
    const text = String(flag);
    if (/special focus/i.test(text)) return false;
    if (/^sff candidate/i.test(text)) return false;
    return true;
  });
  if (status === 'active') {
    flags.push('SPECIAL FOCUS FACILITY (current SFF)');
  }

  let name = facility.name;
  let former = Array.isArray(facility.former_names) ? facility.former_names.filter(Boolean) : [];
  const cmsName = cmsDisplayName(rec);
  if (cmsName && namesDiffer(cmsName, name)) {
    if (name && !former.some((item) => !namesDiffer(item, name))) former = [name, ...former];
    name = cmsName;
  }
  former = former.filter((item) => namesDiffer(item, name));

  return {
    ...facility,
    name,
    former_names: former,
    flags,
    sff_status: status,
    sff: status === 'none' ? null : { ...rec, status },
  };
}

export function sffStatusOf(facility) {
  const explicit = facility?.sff_status;
  if (STATUSES.has(explicit)) return explicit;
  if (facility?.sff && typeof facility.sff === 'object' && STATUSES.has(facility.sff.status)) {
    return facility.sff.status;
  }
  if (facility?.sff === true || facility?.special_focus === true) return 'active';
  const flags = facility?.flags || [];
  if (flags.some((flag) => /sff candidate/i.test(String(flag)) && !/special focus/i.test(String(flag)))) {
    return 'candidate';
  }
  if (flags.some((flag) => /special focus/i.test(String(flag)))) return 'active';
  return 'none';
}

export function isActiveSff(facility) {
  return sffStatusOf(facility) === 'active';
}

function sffRecord(facility) {
  return facility?.sff && typeof facility.sff === 'object' ? facility.sff : {};
}

export function sffDetailRows(facility) {
  const status = sffStatusOf(facility);
  if (status === 'none') return [];
  const rec = sffRecord(facility);
  const rows = [{ label: 'Special Focus Facility status', value: SFF_STATUS_LABEL[status] }];

  if (status === 'graduated') {
    if (rec.graduation_date) rows.push({ label: 'Graduation date', value: formatSffDate(rec.graduation_date) });
    const months = formatMonths(rec.months_in_program);
    if (months) rows.push({ label: 'Time in SFF program', value: months });
  } else if (status === 'active') {
    if (rec.most_recent_inspection) {
      rows.push({ label: 'Most recent inspection', value: formatSffDate(rec.most_recent_inspection) });
    }
    if (rec.met_survey_criteria === true) {
      rows.push({ label: 'Graduation criteria on latest survey', value: 'Met' });
    } else if (rec.met_survey_criteria === false) {
      rows.push({ label: 'Graduation criteria on latest survey', value: 'Not met' });
    }
    const months = formatMonths(rec.months_in_program);
    if (months) rows.push({ label: 'Time in SFF program', value: months });
  } else if (status === 'candidate') {
    const months = formatMonths(rec.months_as_candidate);
    if (months) rows.push({ label: 'Time on the candidate list', value: months });
  } else if (status === 'terminated') {
    if (rec.termination_date) rows.push({ label: 'Termination date', value: formatSffDate(rec.termination_date) });
    const months = formatMonths(rec.months_in_program);
    if (months) rows.push({ label: 'Time in SFF program', value: months });
  }

  return rows;
}

export function sffSummarySentence(facility) {
  const status = sffStatusOf(facility);
  const rec = sffRecord(facility);
  if (status === 'graduated') {
    const when = rec.graduation_date ? ` on ${formatSffDate(rec.graduation_date)}` : '';
    const months = rec.months_in_program != null ? ` after ${formatMonths(rec.months_in_program)} in the program` : '';
    return `CMS lists this home as graduated from the Special Focus Facility program${when}${months}. That is not a current SFF designation.`;
  }
  if (status === 'active') {
    const months = rec.months_in_program != null ? ` Time in the SFF program: ${formatMonths(rec.months_in_program)}.` : '';
    return `CMS lists this home as a current Special Focus Facility. Current SFF homes are inspected more often than other nursing homes.${months}`;
  }
  if (status === 'candidate') {
    const months = rec.months_as_candidate != null ? ` Time on the candidate list: ${formatMonths(rec.months_as_candidate)}.` : '';
    return `CMS lists this home as an SFF candidate, not as a current Special Focus Facility.${months}`;
  }
  if (status === 'terminated') {
    const when = rec.termination_date ? ` Termination date: ${formatSffDate(rec.termination_date)}.` : '';
    const months = rec.months_in_program != null ? ` Time in the SFF program: ${formatMonths(rec.months_in_program)}.` : '';
    return `CMS lists this home as no longer participating in Medicare and Medicaid after the SFF program.${when}${months}`;
  }
  return '';
}

export function sffCompareValue(facility) {
  const status = sffStatusOf(facility);
  if (status === 'none') return 'No';
  const extra = sffDetailRows(facility).slice(1).map((row) => row.value);
  return extra.length ? `${SFF_STATUS_LABEL[status]} · ${extra.join(' · ')}` : SFF_STATUS_LABEL[status];
}

export function sffSeoPhrase(facility) {
  const status = sffStatusOf(facility);
  if (status === 'active') return 'current Special Focus Facility';
  if (status === 'candidate') return 'SFF candidate, not a current Special Focus Facility';
  if (status === 'graduated') return 'graduated from the SFF program';
  if (status === 'terminated') return 'no longer in Medicare/Medicaid after the SFF program';
  return '';
}

export function formerNamesLabel(facility) {
  const names = (facility?.former_names || []).filter(Boolean);
  if (!names.length) return '';
  return `Formerly ${names.join('; ')}`;
}
