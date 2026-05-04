// Shared facility-type config used by state hub pages and (future) type pages.
// Keep this file the single source of truth so adding a new state is config-only.

export const FACILITY_TYPES = {
  'skilled-nursing': {
    slug: 'skilled-nursing',
    name: 'Skilled Nursing',
    shortName: 'SNF',
    accentColor: 'primary',
    description: 'Long-term care and post-hospital recovery. Most-regulated post-acute setting — full inspection, staffing, and ownership data.',
    dataPoints: [
      { label: '★ Star ratings', have: true },
      { label: 'PBJ staffing', have: true },
      { label: 'Inspections', have: true },
      { label: 'Penalties', have: true },
      { label: 'Ownership', have: true },
    ],
    sources: ['Care Compare', 'PBJ Q3 2025', 'Deficiencies 2017–Dec 2025', 'HCRIS FY2024'],
  },
  'hospice': {
    slug: 'hospice',
    name: 'Hospice',
    shortName: 'Hospice',
    accentColor: 'red',
    description: 'End-of-life care. California has been a major hospice fraud-enforcement focus, with recent federal and state cases centered in Los Angeles County.',
    dataPoints: [
      { label: 'CAHPS', have: true },
      { label: 'Ownership', have: true },
      { label: 'Complaints', have: true },
      { label: '⚠ No star ratings', have: false },
      { label: '⚠ No PBJ', have: false },
    ],
    sources: ['Care Compare', 'CAHPS Hospice Survey', 'Hospice owners 2025', 'CASPER complaints'],
  },
  'home-health': {
    slug: 'home-health',
    name: 'Home Health',
    shortName: 'HHA',
    accentColor: 'teal',
    description: 'In-home skilled nursing and therapy. Star ratings published, but staffing-level data is not collected.',
    dataPoints: [
      { label: '★ Star ratings', have: true },
      { label: 'CAHPS', have: true },
      { label: 'Quality measures', have: true },
      { label: 'Ownership', have: true },
      { label: '⚠ No staffing', have: false },
    ],
    sources: ['Care Compare', 'CAHPS Home Health', 'OASIS quality', 'PECOS ownership'],
  },
  'rehab-ltach': {
    slug: 'rehab-ltach',
    name: 'Rehab & LTACH',
    shortName: 'IRF/LTACH',
    accentColor: 'orange',
    description: 'Inpatient rehab hospitals (IRF) and long-term acute care (LTACH). Smaller segment, narrower data — ownership and Medicare cost reports available.',
    dataPoints: [
      { label: 'Ownership', have: true },
      { label: 'Cost reports', have: true },
      { label: 'Quality reporting', have: true },
      { label: 'Penalties', have: true },
    ],
    sources: ['Care Compare', 'HCRIS cost reports', 'IRF/LTACH QRP', 'PECOS ownership'],
  },
};

export const TYPE_ORDER = ['skilled-nursing', 'hospice', 'home-health', 'rehab-ltach'];

export function getTypeBySlug(slug) {
  return FACILITY_TYPES[slug] || null;
}
