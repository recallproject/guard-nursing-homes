import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { facilitySeoDescription, facilitySeoTitle } from '../src/utils/facilitySeo.js';
import { applySffToFacility } from '../src/utils/sffStatus.js';
import {
  facilityBodyContent,
  injectRootContent,
  mostRecentSurveyDate,
  pickNearbyFacilities,
} from './facility-prerender.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '..', 'dist');
const publicDir = join(__dirname, '..', 'public');

const BASE_URL = 'https://www.oversightreports.com';

// Read the built index.html as our template
const template = readFileSync(join(distDir, 'index.html'), 'utf8');

// Load facility data from split state files (public/data/states/*.json)
const statesDir = join(publicDir, 'data', 'states');
const facilityData = { states: {} };
for (const file of readdirSync(statesDir).filter(f => f.endsWith('.json'))) {
  const stateCode = file.replace('.json', '');
  const stateData = JSON.parse(readFileSync(join(statesDir, file), 'utf8'));
  facilityData.states[stateCode] = stateData;
}
const chainData = JSON.parse(readFileSync(join(publicDir, 'data', 'chain_performance.json'), 'utf8'));
const sffPosting = JSON.parse(readFileSync(join(publicDir, 'data', 'sff_posting.json'), 'utf8'));
const blogPostsIndex = JSON.parse(readFileSync(join(publicDir, 'data', 'blog', 'posts-index.json'), 'utf8'));
const blogPosts = Array.isArray(blogPostsIndex.posts) ? blogPostsIndex.posts : [];

let pageCount = 0;

function createPage(route, title, description, canonical, bodyContent = '', options = {}) {
  const { ogType = 'website', ogImage, extraHead = '', noindex = false } = options;
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
    /<meta property="og:type" content="[^"]*"/,
    `<meta property="og:type" content="${escapeAttr(ogType)}"`
  );
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
  if (ogImage) {
    html = html.replace(
      /<meta property="og:image" content="[^"]*"/,
      `<meta property="og:image" content="${escapeAttr(ogImage)}"`
    );
    html = html.replace(
      /<meta name="twitter:image" content="[^"]*"/,
      `<meta name="twitter:image" content="${escapeAttr(ogImage)}"`
    );
  }

  // Replace Twitter tags
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${escapeAttr(title)}"`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${escapeAttr(description)}"`
  );

  // Replace the template canonical instead of appending another one.
  html = html.replace(/^\s*<link\b(?=[^>]*rel="canonical")[^>]*>\n?/gmi, '');
  const headTags = [
    `  <link rel="canonical" href="${BASE_URL}${canonical}" data-rh="true" />`,
    noindex ? '  <meta name="robots" content="noindex" data-rh="true" />' : '',
    extraHead.trim(),
  ].filter(Boolean).join('\n');
  html = html.replace(
    '</head>',
    `${headTags}\n  </head>`
  );

  // Inject static body content into <div id="root"> for SEO
  if (bodyContent) {
    html = injectRootContent(html, bodyContent);
  }

  // Write to dist/{route}/index.html
  const dir = join(distDir, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  pageCount++;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeJsonForHtml(json) {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function formatDisplayDate(iso) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function sortedBlogPosts() {
  return [...blogPosts].sort((a, b) => (b.publishedDate || '').localeCompare(a.publishedDate || ''));
}

function readBlogPost(slug) {
  return JSON.parse(readFileSync(join(publicDir, 'data', 'blog', `${slug}.json`), 'utf8'));
}

function blogListBodyContent(posts) {
  return `
    <main style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:960px;margin:0 auto;padding:32px 24px;color:#0F172A;">
      <header style="margin-bottom:32px;">
        <p style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#4F46E5;margin:0 0 8px 0;">Blog</p>
        <h1 style="font-size:36px;line-height:1.1;margin:0 0 12px 0;">Writing on Nursing Home Oversight</h1>
        <p style="font-size:18px;line-height:1.6;color:#475569;margin:0;">Notes on CMS enforcement data, program integrity, and healthcare transparency.</p>
      </header>
      <section>
        ${posts.map(post => `
          <article style="border-top:1px solid #E2E8F0;padding:24px 0;">
            <p style="font-size:13px;color:#64748B;margin:0 0 8px 0;">${escapeHtml(post.category || 'Blog')} · ${escapeHtml(formatDisplayDate(post.publishedDate))}${post.readTime ? ` · ${escapeHtml(post.readTime)}` : ''}</p>
            <h2 style="font-size:24px;line-height:1.25;margin:0 0 8px 0;">
              <a href="/blog/${encodeURIComponent(post.slug)}" style="color:#0F172A;text-decoration:none;">${escapeHtml(post.title)}</a>
            </h2>
            <p style="font-size:16px;line-height:1.6;color:#475569;margin:0;">${escapeHtml(post.excerpt || '')}</p>
          </article>
        `).join('')}
      </section>
    </main>`;
}

function blogPostBodyContent(post) {
  return `
    <main style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:820px;margin:0 auto;padding:32px 24px;color:#0F172A;">
      <nav style="margin-bottom:24px;font-size:14px;">
        <a href="/blog" style="color:#4F46E5;text-decoration:none;">All posts</a>
      </nav>
      <article>
        <header style="margin-bottom:28px;">
          <p style="font-size:13px;color:#64748B;margin:0 0 10px 0;">${escapeHtml(post.category || 'Blog')} · ${escapeHtml(formatDisplayDate(post.publishedDate))}${post.readTime ? ` · ${escapeHtml(post.readTime)}` : ''}</p>
          <h1 style="font-size:40px;line-height:1.08;margin:0 0 12px 0;">${escapeHtml(post.title)}</h1>
          <p style="font-size:16px;color:#475569;margin:0;">By ${escapeHtml(post.author || 'Robert Benard')}</p>
          ${post.excerpt ? `<p style="font-size:18px;line-height:1.6;color:#334155;margin:20px 0 0 0;">${escapeHtml(post.excerpt)}</p>` : ''}
        </header>
        <div style="font-size:17px;line-height:1.75;color:#1E293B;">
          ${post.content || ''}
        </div>
      </article>
    </main>`;
}

function blogPostExtraHead(post, canonicalUrl, metaDescription) {
  const tags = [];
  tags.push(`  <meta property="article:published_time" content="${escapeAttr(post.publishedDate || '')}" data-rh="true" />`);
  if (post.updatedDate) {
    tags.push(`  <meta property="article:modified_time" content="${escapeAttr(post.updatedDate)}" data-rh="true" />`);
  }
  if (post.author) {
    tags.push(`  <meta property="article:author" content="${escapeAttr(post.author)}" data-rh="true" />`);
  }
  if (post.category) {
    tags.push(`  <meta property="article:section" content="${escapeAttr(post.category)}" data-rh="true" />`);
  }
  if (Array.isArray(post.tags)) {
    for (const tag of post.tags) {
      tags.push(`  <meta property="article:tag" content="${escapeAttr(tag)}" data-rh="true" />`);
    }
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || metaDescription,
    datePublished: post.publishedDate,
    dateModified: post.updatedDate || post.publishedDate,
    author: {
      '@type': 'Person',
      name: post.author || 'Robert Benard, NP',
    },
    publisher: {
      '@type': 'Organization',
      name: 'OversightReports.com',
      url: BASE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    articleSection: post.category || undefined,
    keywords: Array.isArray(post.tags) ? post.tags.join(', ') : undefined,
  };
  tags.push(`  <script type="application/ld+json">${escapeJsonForHtml(JSON.stringify(jsonLd))}</script>`);
  return tags.join('\n');
}

// ══════════════════════════════════════════════════════════════
// Generate static HTML content for a chain page
// ══════════════════════════════════════════════════════════════
function chainBodyContent(chain) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <nav style="margin-bottom:16px;font-size:14px;color:#6B7280;">
        <a href="/" style="color:#4F46E5;text-decoration:none;">The Oversight Report</a>
        <span> › </span>
        <a href="/chains" style="color:#4F46E5;text-decoration:none;">Chain Rankings</a>
        <span> › </span>
        <span>${escapeHtml(chain.affiliatedEntity)}</span>
      </nav>
      <h1 style="font-size:28px;font-weight:800;margin:0 0 16px 0;">${escapeHtml(chain.affiliatedEntity)} — Chain Performance</h1>
      <p style="font-size:16px;color:#4B5563;">${chain.numberOfFacilities || 0} facilities across ${chain.numberOfStatesAndTerritoriesWithOperations || 0} states.</p>
      <footer style="margin-top:32px;font-size:13px;color:#9CA3AF;">
        <p>© ${new Date().getFullYear()} The Oversight Report — Independent nursing home safety data.</p>
      </footer>
    </div>`;
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
    title: 'About / Why trust us — The Oversight Report',
    description: 'Who built The Oversight Report, where the CMS data comes from, how the work is funded, and how to contact us.'
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
  {
    route: 'know-your-rights',
    title: 'Know Your Rights — Nursing Home Discharge Appeals & Patient Safety | The Oversight Report',
    description: 'Your rights in a nursing home. Discharge appeal procedures, CMS complaint filing, ombudsman contacts, and free resources for families.'
  },
  {
    route: 'evidence-sample',
    title: 'Sample Evidence Report — Litigation-Ready Nursing Home Documentation | The Oversight Report',
    description: 'Preview a sample evidence report. 17-page litigation-ready documentation with staffing data, inspection citations, penalties, and ownership analysis.'
  },
  {
    route: 'data-transparency',
    title: 'Data Transparency — CMS Dataset Sources & Coverage | The Oversight Report',
    description: 'Full transparency on the 18 CMS datasets powering The Oversight Report. See data sources, update frequencies, and coverage details.'
  },
  {
    route: 'families',
    title: 'For Families — Nursing Home Safety Resources | The Oversight Report',
    description: 'Free nursing home safety tools for families. Look up any facility, check staffing levels, read inspection reports, and understand your rights.'
  },
  {
    route: 'attorneys',
    title: 'For Attorneys — Nursing Home Litigation Evidence & Data | The Oversight Report',
    description: 'Evidence-grade nursing home data for elder abuse and neglect litigation. Staffing records, inspection citations, penalty history, and ownership networks.'
  },
  {
    route: 'hospitals',
    title: 'For Hospitals — Nursing Home Referral & Discharge Data | The Oversight Report',
    description: 'Nursing home safety data for hospital discharge planners and case managers. Compare facilities by staffing, inspections, and readmission risk.'
  },
  {
    route: 'antipsychotic-trends',
    title: 'Antipsychotic Prescribing Trends — Nursing Home Medication Data | The Oversight Report',
    description: 'National trends in antipsychotic prescribing across nursing homes. Facility-level prescribing patterns, staffing context, and CMS quality measures.'
  },
  {
    route: 'states/california',
    title: 'California Nursing Homes, Hospice, Home Health & Rehab — The Oversight Report',
    description: 'Federal CMS oversight data on every California nursing home, hospice, home health agency, and rehab facility. Inspections, ownership, staffing, complaints. Free, no paywall.'
  },
  {
    route: 'post-acute',
    title: 'Post-Acute Care Safety Data | The Oversight Report',
    description: 'Free, sourced safety data on nursing homes, hospice, home health, inpatient rehab, and LTACH providers. Clinician-built and independent, with no operator funding.'
  },
  {
    route: 'skilled-nursing',
    title: 'Nursing Home Safety Data — Every Medicare-Certified SNF | The Oversight Report',
    description: 'Free, sourced safety data on every Medicare-certified skilled nursing facility in America. Inspections, staffing, penalties, ownership networks. No commissions, no operator funding.'
  },
  {
    route: 'hospice',
    title: 'Hospice Safety Data | The Oversight Report',
    description: 'Verify a hospice referral or compare hospices in your area. Free CMS-sourced quality scores, family-experience ratings, and patterns flagged for review for every Medicare-certified hospice in America.'
  },
  {
    route: 'hospice/compare',
    title: 'Compare Hospices Side by Side | The Oversight Report',
    description: 'Compare Medicare-certified hospices in your ZIP code or city head-to-head. Quality scores, family experience, ownership, and patterns flagged for review — built for hospital case managers and discharge planners.'
  },
  {
    route: 'hospice/news',
    title: 'Hospice Public Record · Live Feed | The Oversight Report',
    description: 'Every public-record event involving a Medicare-certified hospice — DOJ settlements, state AG actions, OIG exclusions, CMS deficiencies, news coverage — aggregated and dated.'
  },
  {
    route: 'hospice/chains',
    title: 'Hospice Chain Rollups — Common Disclosed Ownership | The Oversight Report',
    description: 'Hospice operators with multiple Medicare-certified locations under common disclosed ownership. Aggregated CMS quality, family-experience, and pattern-flag metrics. Sourced from CMS hospice owners disclosure.'
  },
  {
    route: 'hospice/high-risk',
    title: 'Hospice Investigation Hub — National Watchlist | The Oversight Report',
    description: '200 Medicare-certified hospices flagged on CMS-published outliers across live discharge, Hospice Care Index, care mix, family experience, and public record — applying the California State Auditor framework. Built for journalists, attorneys, and family investigators.'
  },
  {
    route: 'home-health',
    title: 'Home Health Agency Data | The Oversight Report',
    description: 'Search every Medicare-certified home health agency. CMS quality-of-care stars, HHCAHPS family survey scores, and services offered. Free, sourced from Home Health Care Compare.'
  },
  {
    route: 'irf',
    title: 'Inpatient Rehab Facility Data | The Oversight Report',
    description: 'Search Medicare-certified inpatient rehabilitation facilities. CMS IRF Compare measures including discharge to community, readmissions, and safety. Free.'
  },
  {
    route: 'ltach',
    title: 'LTACH / LTCH Hospital Data | The Oversight Report',
    description: 'Search Medicare-certified long-term acute care hospitals. CMS LTCH Compare measures including infections, readmissions, and discharge to community. Free.'
  },
  {
    route: 'refresh-log',
    title: 'Refresh Log — Public Record of Data Updates | The Oversight Report',
    description: 'A dated, public record of every CMS data refresh, dataset addition, and methodology change on The Oversight Report. Independent. Sourced. Signed.'
  },
];

console.log('Generating SEO pages with static HTML content...');

for (const page of staticPages) {
  createPage(page.route, page.title, page.description, `/${page.route}`);
}
console.log(`  ✓ ${staticPages.length} static pages`);

// ── Utility pages that should be directly reachable but not indexed ──
const utilityPages = [
  {
    route: 'success',
    title: 'Payment Complete — The Oversight Report',
    description: 'Payment confirmation for The Oversight Report.'
  },
  {
    route: 'ask-a-clinician-submitted',
    title: 'Request Received — The Oversight Report',
    description: 'Your Ask a Clinician request was received.'
  },
  {
    route: 'evidence-success',
    title: 'Your Facility Brief — The Oversight Report',
    description: 'Your Facility Brief is ready to download.'
  },
  {
    route: 'evidence-download',
    title: 'Download Facility Brief — The Oversight Report',
    description: 'Download your Facility Brief from The Oversight Report.'
  },
];

for (const page of utilityPages) {
  createPage(page.route, page.title, page.description, `/${page.route}`, '', { noindex: true });
}
console.log(`  ✓ ${utilityPages.length} noindex utility pages`);

// ── Blog pages (with article metadata and static HTML body) ──
const orderedBlogPosts = sortedBlogPosts();
createPage(
  'blog',
  'Blog — The Oversight Report',
  'Writing on nursing home oversight, CMS enforcement data, and healthcare transparency from Robert Benard, NP, founder of DataLink Clinical LLC.',
  '/blog',
  blogListBodyContent(orderedBlogPosts)
);

let blogCount = 0;
for (const summary of orderedBlogPosts) {
  if (!summary.slug) continue;
  const post = readBlogPost(summary.slug);
  const metaTitle = post.seo?.metaTitle || `${post.title} — The Oversight Report`;
  const metaDescription = post.seo?.metaDescription || post.excerpt || '';
  const ogImage = post.seo?.ogImage || `${BASE_URL}/og-image.png?v=3`;
  const canonicalPath = `/blog/${encodeURIComponent(post.slug)}`;
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;

  createPage(
    `blog/${encodeURIComponent(post.slug)}`,
    metaTitle,
    metaDescription,
    canonicalPath,
    blogPostBodyContent(post),
    {
      ogType: 'article',
      ogImage,
      extraHead: blogPostExtraHead(post, canonicalUrl, metaDescription),
    }
  );
  blogCount++;
}
console.log(`  ✓ ${blogCount} blog pages (with static HTML content)`);

// ── Facility pages (enriched crawlable summary for AI/search bots) ──
const knownChains = new Set(
  (Array.isArray(chainData) ? chainData : [])
    .map((c) => c && c.affiliatedEntity)
    .filter(Boolean)
);
const deficiencyDir = join(publicDir, 'deficiency_details');
let facilityCount = 0;
for (const [stateCode, stateData] of Object.entries(facilityData.states)) {
  if (!stateData.facilities) continue;

  let deficiencyByCcn = {};
  const defPath = join(deficiencyDir, `${stateCode}.json`);
  if (existsSync(defPath)) {
    try {
      deficiencyByCcn = JSON.parse(readFileSync(defPath, 'utf8'));
    } catch (err) {
      console.warn(`  ⚠ deficiency details skipped for ${stateCode}: ${err.message}`);
    }
  }

  const dataAsOf = stateData._metadata?.data_as_of || null;
  const peers = stateData.facilities.map((row) => (
    applySffToFacility({ ...row, state: row.state || stateCode }, sffPosting)
  ));

  for (const f of peers) {
    const detailBundle = deficiencyByCcn[f.ccn];
    const detailRows = Array.isArray(detailBundle?.deficiency_details)
      ? detailBundle.deficiency_details
      : Array.isArray(detailBundle)
        ? detailBundle
        : [];
    const body = facilityBodyContent(f, {
      stateCode,
      dataAsOf,
      knownChains,
      nearby: pickNearbyFacilities(f, peers),
      mostRecentSurveyDate: mostRecentSurveyDate(detailRows),
    });

    createPage(
      `facility/${f.ccn}`,
      facilitySeoTitle({ ...f, state: f.state || stateCode }),
      facilitySeoDescription({ ...f, state: f.state || stateCode }),
      `/facility/${f.ccn}`,
      body
    );
    facilityCount++;
  }
}
console.log(`  ✓ ${facilityCount} facility pages (with static HTML content)`);

// ── Chain pages (with body content) ──
let chainCount = 0;
for (const chain of chainData) {
  const chainName = chain.affiliatedEntity;
  if (chainName) {
    const numFacilities = chain.numberOfFacilities || 0;
    const numStates = chain.numberOfStatesAndTerritoriesWithOperations || 0;
    const encoded = encodeURIComponent(chainName);

    const body = chainBodyContent(chain);

    createPage(
      `chain/${encoded}`,
      `${chainName} — Chain Performance | The Oversight Report`,
      `${chainName} nursing home chain: ${numFacilities} facilities across ${numStates} states. See average ratings, fines, staffing, and inspection data.`,
      `/chain/${encoded}`,
      body
    );
    chainCount++;
  }
}
console.log(`  ✓ ${chainCount} chain pages (with static HTML content)`);

// ── Hospice pages — one per Medicare-certified hospice ──
let hospiceCount = 0;
const hospiceStatesDir = join(publicDir, 'data', 'hospice', 'states');
try {
  const hospiceFiles = readdirSync(hospiceStatesDir).filter(f => f.endsWith('.json'));
  for (const file of hospiceFiles) {
    const stateCode = file.replace('.json', '');
    const stateData = JSON.parse(readFileSync(join(hospiceStatesDir, file), 'utf8'));
    if (Array.isArray(stateData.providers)) {
      for (const p of stateData.providers) {
        if (!p.ccn || !p.name) continue;
        const flagged = p.flags && p.flags.flagged_count ? p.flags.flagged_count : 0;
        const flagText = flagged > 0 ? `${flagged} pattern${flagged === 1 ? '' : 's'} flagged for review.` : 'No patterns flagged for review.';
        const desc = `${p.name} in ${p.city || ''}, ${p.state || stateCode}. CMS hospice safety data: family-experience scores, ownership, ${flagText} Sourced from CMS. Free.`;
        createPage(
          `hospice/${p.ccn}`,
          `${p.name} — Hospice Safety Report | The Oversight Report`,
          desc,
          `/hospice/${p.ccn}`
        );
        hospiceCount++;
      }
    }
  }
} catch (err) {
  console.log(`  ⚠ hospice pages skipped: ${err.message}`);
}
console.log(`  ✓ ${hospiceCount} hospice pages (SEO stubs · client-rendered detail)`);

// Intentionally skip per-provider HTML for Home Health / IRF / LTACH.
// Those settings use SPA routes + compact JSON. Generating ~14k extra HTML
// files would bloat Vercel Hobby deployment storage the way SNF SEO pages did.
// Deep links such as /home-health/:ccn are served by the vercel.json SPA
// rewrite to /index.html when no static file exists.

// ── Hospice state directory pages — one stub per CMS-region state file ──
const HOSPICE_STATE_NAMES = {
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

let hospiceStateCount = 0;
try {
  const hospiceStateFiles = readdirSync(hospiceStatesDir).filter(f => f.endsWith('.json'));
  for (const file of hospiceStateFiles) {
    const stateCode = file.replace('.json', '');
    const stateData = JSON.parse(readFileSync(join(hospiceStatesDir, file), 'utf8'));
    const stateName = HOSPICE_STATE_NAMES[stateCode] || stateCode;
    const count = stateData.count != null ? stateData.count : (Array.isArray(stateData.providers) ? stateData.providers.length : 0);
    const flagged = stateData.flagged_count != null ? stateData.flagged_count : 0;
    const flagText = flagged > 0 ? ` ${flagged.toLocaleString()} flagged for review.` : '';
    createPage(
      `hospice/state/${stateCode}`,
      `${stateName} Hospice Providers — The Oversight Report`,
      `${count.toLocaleString()} Medicare-certified hospice providers in ${stateName}. CMS quality scores, family-experience ratings, and patterns flagged for review.${flagText} Sourced from CMS. Free.`,
      `/hospice/state/${stateCode}`
    );
    hospiceStateCount++;
  }
} catch (err) {
  console.log(`  ⚠ hospice state directory pages skipped: ${err.message}`);
}
console.log(`  ✓ ${hospiceStateCount} hospice state directory pages`);

// ── Hospice chain rollup pages — one per chain in chains.json ──
let hospiceChainCount = 0;
try {
  const hospiceChains = JSON.parse(readFileSync(join(publicDir, 'data', 'hospice', 'chains.json'), 'utf8'));
  for (const c of hospiceChains) {
    if (!c.chain_slug || !c.chain_name) continue;
    const fc = c.facility_count || 0;
    const sc = c.state_count || 0;
    const desc = `${c.chain_name}: ${fc} Medicare-certified hospice locations across ${sc} state${sc === 1 ? '' : 's'} under common disclosed ownership. CMS quality, family-experience, and pattern-flag aggregates. Sourced from CMS hospice owners disclosure (Oct 2025).`;
    createPage(
      `hospice/chain/${encodeURIComponent(c.chain_slug)}`,
      `${c.chain_name} — Hospice Chain Rollup | The Oversight Report`,
      desc,
      `/hospice/chain/${encodeURIComponent(c.chain_slug)}`
    );
    hospiceChainCount++;
  }
} catch (err) {
  console.log(`  ⚠ hospice chain rollup pages skipped: ${err.message}`);
}
console.log(`  ✓ ${hospiceChainCount} hospice chain rollup pages (SEO stubs · client-rendered detail)`);

console.log(`\nSEO pages generated: ${pageCount} total (${staticPages.length} static + ${utilityPages.length} utility + ${blogCount} blog + ${facilityCount} facilities + ${chainCount} chains + ${hospiceCount} hospices + ${hospiceStateCount} hospice states + ${hospiceChainCount} hospice chains)`);
console.log('✅ Indexable SEO pages now include a single canonical and static HTML for crawlers.');
