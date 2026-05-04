// State hub config. Adding a state = adding an entry here.
// Counts pulled from public/data/states/CA.json + public/postacute_facility_data.json (verified 2026-04-28).

export const STATE_HUBS = {
  california: {
    code: 'CA',
    slug: 'california',
    name: 'California',
    enabled: true,
    eyebrow: 'California · Post-Acute Care Oversight',
    headline: 'Every nursing home, hospice, home health agency, and rehab facility in California.',
    subheadline:
      'Inspections, ownership, staffing, penalties, complaints — pulled directly from federal CMS data. Free, no email gate, no paywall.',
    counts: {
      'skilled-nursing': 1163,
      'hospice': 2155,
      'home-health': 3034,
      'rehab-ltach': 104,
    },
    totalFacilities: 6456,
    sourceCount: 16,
    lastUpdated: 'Q4 2025',
    newsBlock: {
      label: 'Why this matters now',
      title: 'The hospice fraud capital of the country',
      paragraphs: [
        'Federal prosecutors charged Southern California hospice operators in Operation "Never Say Die," involving more than $50 million in alleged Medicare fraud. One week later, California announced Operation "Skip Trace," a state case alleging $267 million in Medi-Cal hospice fraud centered on Los Angeles County.',
        'CMS publishes only fragments of hospice oversight data publicly. We surface what is available — provider info, ownership, complaints, CAHPS surveys — and flag the gaps.',
      ],
    },
    hospiceGap: {
      title: 'The hospice data gap',
      intro:
        'CMS regulates hospices but publishes far less data on them than on nursing homes. Here is exactly what we have and what is missing — so you can read our pages with the right context.',
      items: [
        {
          kind: 'have',
          label: '✓ What we have',
          text: 'Provider directory, ownership records, CAHPS family surveys, complaint counts, certification dates, services offered.',
        },
        {
          kind: 'missing',
          label: '⚠ What is missing',
          text: 'No star ratings published. No payroll-based staffing (PBJ does not apply to hospice). Limited deficiency detail.',
        },
        {
          kind: 'have',
          label: '✓ What we infer',
          text: 'Ownership chains, geographic clustering, service mix patterns — public-data signals worth examining.',
        },
        {
          kind: 'missing',
          label: '⚠ What we do not claim',
          text: 'We do not label individual facilities as fraudulent. We surface oversight signals from public data — interpretation is yours.',
        },
      ],
    },
    methodology: [
      { source: 'Provider Information', detail: 'CMS Care Compare (all 4 facility types)' },
      { source: 'Health Inspections', detail: 'CMS deficiency data, 2017–Dec 2025 (SNF only)' },
      { source: 'Penalties', detail: 'Civil monetary penalties + payment denials, Jan 2023–Dec 2025' },
      { source: 'Ownership', detail: 'CMS PECOS provider enrollment + HCRIS Worksheet S-2' },
      { source: 'Cost Reports', detail: 'HCRIS FY2024 (related-party transactions)' },
      { source: 'CAHPS Surveys', detail: 'Hospice and home health family experience surveys' },
      { source: 'Quality Measures', detail: 'QRP outcomes, claims-based readmissions, MDS quality indicators' },
    ],
  },
};

export function getStateHub(slug) {
  return STATE_HUBS[slug] || null;
}

export function listEnabledStateHubs() {
  return Object.values(STATE_HUBS).filter((s) => s.enabled);
}
