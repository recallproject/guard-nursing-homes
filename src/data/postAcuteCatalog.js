// Shared config for live post-acute settings (Home Health, IRF, LTACH).
// Data files live at /data/{dataDir}/ — built by scripts/build-postacute-data.js.

import { POST_ACUTE_CMS_COUNTS } from './postAcuteCounts.js';

export const STATE_NAME = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin',
  WY: 'Wyoming', PR: 'Puerto Rico', VI: 'U.S. Virgin Islands',
  GU: 'Guam', MP: 'Northern Mariana Islands',
};

export const POST_ACUTE_CATALOG = {
  'home-health': {
    id: 'home-health',
    route: '/home-health',
    dataDir: 'home-health',
    label: 'Home health',
    singular: 'home health agency',
    plural: 'home health agencies',
    short: 'HHA',
    countUnit: 'agencies',
    heroSub: 'Home health agency data.',
    heroBody: 'Nurses and therapists who come to the home. Look up a Medicare-certified agency by name, city, state, or ZIP — then open the CMS quality and family-survey scores.',
    searchPlaceholder: 'Agency name, CCN, city, or ZIP — like "VNA" or "94608"',
    searchAria: 'Search for a home health agency',
    cmsTitle: 'CMS Home Health Care Compare',
    catalogUrl: 'https://data.cms.gov/provider-data/dataset/6jpm-sxkc',
    whatWeShow: [
      { title: 'Quality of patient care stars', body: 'CMS rates how often patients improve at walking, bathing, and taking medicines, plus how quickly care starts.' },
      { title: 'Family survey (HHCAHPS)', body: 'Star ratings and recommend rates from patients and families who used this agency.' },
      { title: 'Services offered', body: 'Whether the agency reports nursing, PT, OT, speech, medical social work, and home health aide services.' },
    ],
    metricGroups: [
      {
        title: 'Quality of patient care',
        items: [
          { key: 'quality.patient_care_star', label: 'Quality of patient care', format: 'stars', better: 'higher' },
          { key: 'quality.timely_care_pct', label: 'Care started in a timely manner', format: 'pct', better: 'higher' },
          { key: 'quality.walking_improvement_pct', label: 'Patients got better at walking', format: 'pct', better: 'higher' },
          { key: 'quality.bathing_improvement_pct', label: 'Patients got better at bathing', format: 'pct', better: 'higher' },
          { key: 'quality.medication_improvement_pct', label: 'Patients got better at taking medicines', format: 'pct', better: 'higher' },
          { key: 'quality.discharge_function_score', label: 'Discharge function score', format: 'pct', better: 'higher' },
          { key: 'quality.dtc_risk_standardized_pct', label: 'Discharged to community', format: 'pct', better: 'higher' },
          { key: 'quality.pph_risk_standardized_pct', label: 'Preventable hospitalization (risk-std.)', format: 'pct', better: 'lower' },
        ],
      },
      {
        title: 'Patient / family survey (HHCAHPS)',
        items: [
          { key: 'survey.summary_star', label: 'HHCAHPS summary star rating', format: 'stars', better: 'higher' },
          { key: 'survey.overall_care_star', label: 'Overall care star rating', format: 'stars', better: 'higher' },
          { key: 'survey.would_recommend_pct', label: 'Would definitely recommend', format: 'pct', better: 'higher' },
          { key: 'survey.completed_surveys', label: 'Completed surveys', format: 'number', better: null },
        ],
      },
    ],
  },
  irf: {
    id: 'irf',
    route: '/irf',
    dataDir: 'irf',
    label: 'Inpatient rehab',
    singular: 'inpatient rehab facility',
    plural: 'inpatient rehab facilities',
    short: 'IRF',
    countUnit: 'facilities',
    heroSub: 'Inpatient rehabilitation facility data.',
    heroBody: 'Intensive rehab after stroke, hip fracture, or major surgery. Search Medicare-certified IRFs and open CMS quality measures from IRF Compare.',
    searchPlaceholder: 'Facility name, CCN, city, or ZIP — like "Encompass" or "35209"',
    searchAria: 'Search for an inpatient rehab facility',
    cmsTitle: 'CMS Inpatient Rehabilitation Facility Compare',
    catalogUrl: 'https://data.cms.gov/provider-data/dataset/7t8x-u3ir',
    whatWeShow: [
      { title: 'Return to community', body: 'Risk-standardized rate of patients discharged back to home or community from the IRF.' },
      { title: 'Readmissions', body: 'Potentially preventable hospital readmissions in the 30 days after IRF discharge.' },
      { title: 'Safety measures', body: 'Falls with major injury, new or worsened pressure ulcers, and CAUTI infection SIR.' },
    ],
    metricGroups: [
      {
        title: 'Outcomes',
        items: [
          { key: 'quality.dtc_risk_standardized_pct', label: 'Discharged to community (risk-std.)', format: 'pct', better: 'higher' },
          { key: 'quality.ppr_30day_pct', label: '30-day potentially preventable readmission', format: 'pct', better: 'lower' },
          { key: 'quality.discharge_function_score', label: 'Discharge function score', format: 'pct', better: 'higher' },
        ],
      },
      {
        title: 'Safety',
        items: [
          { key: 'quality.falls_major_injury_pct', label: 'Falls with major injury', format: 'pct', better: 'lower' },
          { key: 'quality.pressure_ulcer_pct', label: 'New or worsened pressure ulcers', format: 'pct', better: 'lower' },
          { key: 'quality.cauti_sir', label: 'CAUTI standardized infection ratio', format: 'number', better: 'lower' },
        ],
      },
    ],
  },
  ltach: {
    id: 'ltach',
    route: '/ltach',
    dataDir: 'ltach',
    label: 'Long-term acute care',
    singular: 'long-term acute care hospital',
    plural: 'long-term acute care hospitals',
    short: 'LTCH',
    countUnit: 'hospitals',
    heroSub: 'Long-term acute care hospital data.',
    heroBody: 'Hospital-level care for medically complex, long-stay patients. Search Medicare-certified LTCHs and open CMS quality measures from LTCH Compare.',
    searchPlaceholder: 'Hospital name, CCN, city, or ZIP — like "Kindred" or "36607"',
    searchAria: 'Search for a long-term acute care hospital',
    cmsTitle: 'CMS Long-Term Care Hospital Compare',
    catalogUrl: 'https://data.cms.gov/provider-data/dataset/azum-44iv',
    whatWeShow: [
      { title: 'Return to community', body: 'Risk-standardized rate of patients discharged back to home or community.' },
      { title: 'Infections', body: 'CMS standardized infection ratios for CAUTI, CLABSI, and C. difficile.' },
      { title: 'Readmissions & mobility', body: 'Potentially preventable 30-day readmissions and change in mobility score.' },
    ],
    metricGroups: [
      {
        title: 'Outcomes',
        items: [
          { key: 'quality.dtc_risk_standardized_pct', label: 'Discharged to community (risk-std.)', format: 'pct', better: 'higher' },
          { key: 'quality.ppr_30day_pct', label: '30-day potentially preventable readmission', format: 'pct', better: 'lower' },
          { key: 'quality.mobility_change_score', label: 'Change in mobility score', format: 'number', better: 'higher' },
        ],
      },
      {
        title: 'Infections (standardized infection ratio)',
        items: [
          { key: 'quality.cauti_sir', label: 'CAUTI SIR', format: 'number', better: 'lower' },
          { key: 'quality.clabsi_sir', label: 'CLABSI SIR', format: 'number', better: 'lower' },
          { key: 'quality.cdi_sir', label: 'C. difficile SIR', format: 'number', better: 'lower' },
        ],
      },
    ],
  },
};

export function getPostAcuteSetting(id) {
  return POST_ACUTE_CATALOG[id] || null;
}

export function formatSettingCount(id) {
  const n = POST_ACUTE_CMS_COUNTS?.[id];
  if (typeof n !== 'number') return '—';
  return n.toLocaleString('en-US');
}
