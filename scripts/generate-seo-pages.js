import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '..', 'dist');
const publicDir = join(__dirname, '..', 'public');

const BASE_URL = 'https://oversightreports.com';

// Read the built index.html as our template
const template = readFileSync(join(distDir, 'index.html'), 'utf8');

// Load facility data
const facilityData = JSON.parse(readFileSync(join(publicDir, 'facilities_map_data.json'), 'utf8'));
const chainData = JSON.parse(readFileSync(join(publicDir, 'data', 'chain_performance.json'), 'utf8'));

let pageCount = 0;

function createPage(route, title, description, canonical) {
  let html = template;

  // Replace title
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(title)}</title>`
  );

  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${escapeAttr(description)}"`
  );

  // Replace OG tags
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${escapeAttr(title)}"`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${escapeAttr(description)}"`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${BASE_URL}${canonical}"`
  );

  // Replace Twitter tags
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${escapeAttr(title)}"`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${escapeAttr(description)}"`
  );

  // Add canonical link (insert before </head>)
  html = html.replace(
    '</head>',
    `  <link rel="canonical" href="${BASE_URL}${canonical}" />\n  </head>`
  );

  // Write to dist/{route}/index.html
  const dir = join(distDir, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  pageCount++;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Static pages ──
const staticPages = [
  {
    route: 'pricing',
    title: 'Pricing — Evidence Packages & Professional Plans | The Oversight Report',
    description: 'Nursing home evidence packages for families and attorneys. Professional monitoring tools for journalists and care managers.'
  },
  {
    route: 'methodology',
    title: 'Methodology — Data Sources & Methods | The Oversight Report',
    description: 'How we calculate nursing home safety scores. Data sources include CMS inspections, PBJ staffing, penalties, HCRIS cost reports, and ownership filings.'
  },
  {
    route: 'chains',
    title: 'Nursing Home Chain Rankings — Safety Performance by Owner | The Oversight Report',
    description: 'Compare nursing home chains by safety record. See average star ratings, fines, deficiencies, and staffing data for the largest operators in America.'
  },
  {
    route: 'high-risk',
    title: 'High-Risk Nursing Homes — Facilities with Immediate Jeopardy Citations | The Oversight Report',
    description: 'Nursing homes cited for immediate jeopardy — imminent risk of serious harm or death. Search by state, see inspection details and penalty history.'
  },
  {
    route: 'ag-toolkit',
    title: 'State AG Toolkit — Nursing Home Enforcement Data | The Oversight Report',
    description: 'Data tools for state attorneys general investigating nursing home safety. Facility screening, ownership analysis, and enforcement evidence.'
  },
  {
    route: 'screening',
    title: 'Nursing Home Screening Reports — State-Level Safety Data | The Oversight Report',
    description: 'Generate nursing home screening reports by state. Inspection citations, staffing levels, fines, and risk scores for all Medicare-certified facilities.'
  },
  {
    route: 'discrepancies',
    title: 'Staffing Discrepancies — Reported vs Payroll Hours | The Oversight Report',
    description: 'Nursing homes reporting more staff than payroll records support. Compare self-reported staffing to PBJ payroll data for all Medicare facilities.'
  },
  {
    route: 'ownership',
    title: 'Nursing Home Ownership Network — Who Owns America\'s Nursing Homes | The Oversight Report',
    description: 'Explore nursing home ownership networks. See which companies, private equity firms, and REITs control facilities and how their portfolios perform.'
  },
  {
    route: 'trends',
    title: 'National Nursing Home Trends — Safety Data Over Time | The Oversight Report',
    description: 'National trends in nursing home safety. Staffing levels, deficiency rates, penalty trends, and ownership changes across all Medicare-certified facilities.'
  },
  {
    route: 'watchlist',
    title: 'Your Watchlist — Track Nursing Home Safety | The Oversight Report',
    description: 'Track nursing homes you care about. Get updates on inspections, staffing changes, penalties, and ownership changes.'
  },
  {
    route: 'referral-scorecard',
    title: 'Referral Scorecard — Nursing Home Placement Intelligence | The Oversight Report',
    description: 'Data-driven nursing home referral scorecard for healthcare professionals. Compare facilities side-by-side with staffing, inspection, and penalty data.'
  },
  {
    route: 'compare',
    title: 'Compare Nursing Homes — Side-by-Side Safety Data | The Oversight Report',
    description: 'Compare nursing homes side by side. See star ratings, staffing, deficiencies, fines, and ownership data for any two Medicare-certified facilities.'
  },
  {
    route: 'about',
    title: 'About — The Oversight Report',
    description: 'The Oversight Report provides independent nursing home safety data for families, journalists, and attorneys. Built by a nurse practitioner using federal CMS data.'
  },
  {
    route: 'professionals',
    title: 'Professional Tools — Nursing Home Data for Case Managers & Attorneys | The Oversight Report',
    description: 'Professional nursing home data tools for case managers, discharge planners, attorneys, and journalists. Evidence reports, chain analysis, and ownership data.'
  },
  {
    route: 'ask-a-clinician',
    title: 'Ask a Clinician — Get Help Understanding Nursing Home Data | The Oversight Report',
    description: 'Have questions about nursing home safety data? Ask a clinician for help understanding inspection results, staffing data, and what it means for your loved one.'
  },
  {
    route: 'terms',
    title: 'Terms of Service | The Oversight Report',
    description: 'Terms of service for The Oversight Report nursing home safety data platform.'
  },
  {
    route: 'privacy',
    title: 'Privacy Policy | The Oversight Report',
    description: 'Privacy policy for The Oversight Report. We use privacy-friendly analytics and never sell your data.'
  },
];

console.log('Generating SEO pages...');

for (const page of staticPages) {
  createPage(page.route, page.title, page.description, `/${page.route}`);
}
console.log(`  ✓ ${staticPages.length} static pages`);

// ── Facility pages ──
let facilityCount = 0;
for (const [stateCode, stateData] of Object.entries(facilityData.states)) {
  if (stateData.facilities) {
    for (const f of stateData.facilities) {
      const stars = f.stars != null ? `${f.stars}/5 stars` : 'Unrated';
      const defCount = f.total_deficiencies || 0;
      const city = f.city || '';
      const state = f.state || stateCode;

      createPage(
        `facility/${f.ccn}`,
        `${f.name} — Safety Report | The Oversight Report`,
        `${f.name} in ${city}, ${state}. ${stars}. ${defCount} inspection deficiencies. See staffing levels, fines, ownership, and safety data.`,
        `/facility/${f.ccn}`
      );
      facilityCount++;
    }
  }
}
console.log(`  ✓ ${facilityCount} facility pages`);

// ── Chain pages ──
let chainCount = 0;
for (const chain of chainData) {
  const chainName = chain.affiliatedEntity;
  if (chainName) {
    const numFacilities = chain.numberOfFacilities || 0;
    const numStates = chain.numberOfStatesAndTerritoriesWithOperations || 0;
    const encoded = encodeURIComponent(chainName);

    createPage(
      `chain/${encoded}`,
      `${chainName} — Chain Performance | The Oversight Report`,
      `${chainName} nursing home chain: ${numFacilities} facilities across ${numStates} states. See average ratings, fines, staffing, and inspection data.`,
      `/chain/${encoded}`
    );
    chainCount++;
  }
}
console.log(`  ✓ ${chainCount} chain pages`);

console.log(`\nSEO pages generated: ${pageCount} total (${staticPages.length} static + ${facilityCount} facilities + ${chainCount} chains)`);
