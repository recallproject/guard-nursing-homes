import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">${bodyContent}</div>`
    );
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

// ── Helper: format currency ──
function formatMoney(n) {
  if (!n || n === 0) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

// ── Helper: format number ──
function formatNum(n) {
  if (n == null) return 'N/A';
  return n.toLocaleString();
}

// ── Helper: risk level from composite score ──
function riskLevel(composite) {
  if (composite == null) return { label: 'Unknown', color: '#6B7280' };
  if (composite >= 70) return { label: 'Critical Risk', color: '#DC2626' };
  if (composite >= 50) return { label: 'High Risk', color: '#EA580C' };
  if (composite >= 30) return { label: 'Elevated Risk', color: '#D97706' };
  return { label: 'Lower Risk', color: '#0D9488' };
}

// ── Helper: star display ──
function starDisplay(stars) {
  if (stars == null) return 'Unrated';
  const full = Math.floor(stars);
  return '★'.repeat(full) + '☆'.repeat(5 - full) + ` ${stars}/5`;
}

// ══════════════════════════════════════════════════════════════
// Generate static HTML content for a facility page
// This is what Googlebot sees — real data, no JS required
// ══════════════════════════════════════════════════════════════
function facilityBodyContent(f, stateCode) {
  const risk = riskLevel(f.composite);
  const city = f.city || '';
  const state = f.state || stateCode;
  const zip = f.zip || '';

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <nav style="margin-bottom:16px;font-size:14px;color:#6B7280;">
        <a href="/" style="color:#4F46E5;text-decoration:none;">The Oversight Report</a>
        <span> › </span>
        <a href="/#state-${stateCode}" style="color:#4F46E5;text-decoration:none;">${state}</a>
        <span> › </span>
        <span>${escapeHtml(f.name)}</span>
      </nav>

      <header>
        <h1 style="font-size:28px;font-weight:800;margin:0 0 8px 0;">${escapeHtml(f.name)}</h1>
        <p style="font-size:16px;color:#4B5563;margin:0 0 4px 0;">${escapeHtml(city)}, ${state} ${zip}</p>
        <p style="font-size:14px;color:#6B7280;margin:0 0 16px 0;">CCN: ${f.ccn} · ${f.beds || 'N/A'} beds</p>
      </header>

      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px;">
        <div style="background:${risk.color};color:white;padding:16px 24px;border-radius:12px;text-align:center;min-width:140px;">
          <div style="font-size:36px;font-weight:900;">${f.composite != null ? f.composite : 'N/A'}</div>
          <div style="font-size:13px;font-weight:600;opacity:0.9;">${risk.label}</div>
          <div style="font-size:11px;opacity:0.8;">Composite Score</div>
        </div>
        <div style="background:#F3F4F6;padding:16px 24px;border-radius:12px;text-align:center;min-width:120px;">
          <div style="font-size:24px;font-weight:700;color:#F59E0B;">${starDisplay(f.stars)}</div>
          <div style="font-size:13px;color:#6B7280;">CMS Star Rating</div>
        </div>
      </div>

      <section style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px 0;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">Safety Summary</h2>
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Total Deficiencies</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${formatNum(f.total_deficiencies)}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Harm Citations</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;${(f.harm_count || 0) > 0 ? 'color:#DC2626;' : ''}">${formatNum(f.harm_count || 0)}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Immediate Jeopardy Citations</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;${(f.jeopardy_count || 0) > 0 ? 'color:#DC2626;' : ''}">${formatNum(f.jeopardy_count || 0)}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Total Fines</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;${(f.total_fines || 0) > 0 ? 'color:#DC2626;' : ''}">${formatMoney(f.total_fines)}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Fine Count</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${formatNum(f.fine_count || 0)}</td>
          </tr>
        </table>
      </section>

      <section style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px 0;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">Staffing Data</h2>
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">RN Hours Per Resident Day</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${f.rn_hprd != null ? f.rn_hprd.toFixed(2) : 'N/A'}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Total Staffing Hours Per Resident Day</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${f.total_hprd != null ? f.total_hprd.toFixed(2) : 'N/A'}</td>
          </tr>
          ${f.zero_rn_pct != null ? `<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Days with Zero RN Hours</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;${f.zero_rn_pct > 0 ? 'color:#DC2626;' : ''}">${f.zero_rn_pct.toFixed(1)}%</td>
          </tr>` : ''}
        </table>
      </section>

      <section style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px 0;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">Risk Score Breakdown</h2>
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          ${f.deficiency_score != null ? `<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Deficiency Score</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${f.deficiency_score}</td>
          </tr>` : ''}
          ${f.staffing_score != null ? `<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Staffing Score</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${f.staffing_score}</td>
          </tr>` : ''}
          ${f.penalty_score != null ? `<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Penalty Score</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${f.penalty_score}</td>
          </tr>` : ''}
          ${f.quality_score != null ? `<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Quality Score</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${f.quality_score}</td>
          </tr>` : ''}
          ${f.ownership_score != null ? `<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Ownership Score</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${f.ownership_score}</td>
          </tr>` : ''}
        </table>
      </section>

      ${f.chain_name ? `<section style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px 0;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">Ownership</h2>
        <p style="font-size:15px;color:#1a1a1a;">Chain: <strong>${escapeHtml(f.chain_name)}</strong></p>
        ${f.owner_portfolio_count ? `<p style="font-size:14px;color:#6B7280;">This owner operates ${f.owner_portfolio_count} facilities.</p>` : ''}
      </section>` : ''}

      <footer style="margin-top:32px;padding-top:16px;border-top:2px solid #E5E7EB;font-size:13px;color:#9CA3AF;">
        <p>Data sourced from CMS Medicare inspections, PBJ staffing reports, and penalty records. Updated regularly.</p>
        <p>© ${new Date().getFullYear()} The Oversight Report — Independent nursing home safety data.</p>
      </footer>
    </div>`;
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
    description: 'National trends in antipsychotic prescribing across nursing homes. Facility-level data on chemical restraint use and CMS quality measures.'
  },
  {
    route: 'states/california',
    title: 'California Nursing Homes, Hospice, Home Health & Rehab — The Oversight Report',
    description: 'Federal CMS oversight data on every California nursing home, hospice, home health agency, and rehab facility. Inspections, ownership, staffing, complaints. Free, no paywall.'
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
    title: 'Evidence Request Received — The Oversight Report',
    description: 'Your evidence report request was received.'
  },
  {
    route: 'evidence-download',
    title: 'Download Evidence Report — The Oversight Report',
    description: 'Download your evidence report from The Oversight Report.'
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

// ── Facility pages (with body content for Googlebot) ──
let facilityCount = 0;
for (const [stateCode, stateData] of Object.entries(facilityData.states)) {
  if (stateData.facilities) {
    for (const f of stateData.facilities) {
      const stars = f.stars != null ? `${f.stars}/5 stars` : 'Unrated';
      const defCount = f.total_deficiencies || 0;
      const city = f.city || '';
      const state = f.state || stateCode;

      const body = facilityBodyContent(f, stateCode);

      createPage(
        `facility/${f.ccn}`,
        `${f.name} — Safety Report | The Oversight Report`,
        `${f.name} in ${city}, ${state}. ${stars}. ${defCount} inspection deficiencies. See staffing levels, fines, ownership, and safety data.`,
        `/facility/${f.ccn}`,
        body
      );
      facilityCount++;
    }
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

console.log(`\nSEO pages generated: ${pageCount} total (${staticPages.length} static + ${utilityPages.length} utility + ${blogCount} blog + ${facilityCount} facilities + ${chainCount} chains)`);
console.log('✅ Indexable SEO pages now include a single canonical and static HTML for crawlers.');
