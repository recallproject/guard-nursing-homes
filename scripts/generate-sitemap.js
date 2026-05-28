import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

const BASE_URL = 'https://www.oversightreports.com';
const generatedDate = new Date().toISOString().split('T')[0];

// Load facility data from split state files (public/data/states/*.json)
const statesDir = join(publicDir, 'data', 'states');
const facilityData = { states: {} };
const cmsDataDates = new Set();
for (const file of readdirSync(statesDir).filter(f => f.endsWith('.json'))) {
  const stateCode = file.replace('.json', '');
  const stateData = JSON.parse(readFileSync(join(statesDir, file), 'utf8'));
  facilityData.states[stateCode] = stateData;
  const dataAsOf = stateData?._metadata?.data_as_of;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataAsOf)) {
    cmsDataDates.add(dataAsOf);
  }
}
const chainData = JSON.parse(readFileSync(join(publicDir, 'data', 'chain_performance.json'), 'utf8'));
const defaultLastmod = cmsDataDates.size > 0
  ? [...cmsDataDates].sort().at(-1)
  : generatedDate;

// Load blog posts index (optional)
let blogPosts = [];
try {
  const blogIndex = JSON.parse(
    readFileSync(join(publicDir, 'data', 'blog', 'posts-index.json'), 'utf8')
  );
  blogPosts = Array.isArray(blogIndex.posts) ? blogIndex.posts : [];
} catch (err) {
  console.warn('No blog posts-index.json found or unreadable:', err.message);
}

const urls = [];

// Homepage
urls.push({ loc: '/', priority: '1.0', changefreq: 'weekly' });

// Static pages
const staticPages = [
  { path: '/chains', priority: '0.6' },
  { path: '/ag-toolkit', priority: '0.6' },
  { path: '/high-risk', priority: '0.6' },
  { path: '/methodology', priority: '0.6' },
  { path: '/pricing', priority: '0.6' },
  { path: '/ownership', priority: '0.6' },
  { path: '/screening', priority: '0.6' },
  { path: '/discrepancies', priority: '0.6' },
  { path: '/trends', priority: '0.6' },
  { path: '/watchlist', priority: '0.6' },
  { path: '/referral-scorecard', priority: '0.6' },
  { path: '/know-your-rights', priority: '0.7' },
  { path: '/evidence-sample', priority: '0.7' },
  { path: '/data-transparency', priority: '0.6' },
  { path: '/families', priority: '0.7' },
  { path: '/attorneys', priority: '0.7' },
  { path: '/hospitals', priority: '0.6' },
  { path: '/antipsychotic-trends', priority: '0.6' },
  { path: '/compare', priority: '0.6' },
  { path: '/about', priority: '0.5' },
  { path: '/ask-a-clinician', priority: '0.5' },
  { path: '/post-acute', priority: '0.8' },
  { path: '/states/california', priority: '0.8' },
];

staticPages.forEach(p => {
  urls.push({ loc: p.path, priority: p.priority, changefreq: 'monthly' });
});

// Legal pages
urls.push({ loc: '/terms', priority: '0.3', changefreq: 'yearly' });
urls.push({ loc: '/privacy', priority: '0.3', changefreq: 'yearly' });

// Blog listing + individual posts
urls.push({ loc: '/blog', priority: '0.7', changefreq: 'monthly' });
let blogCount = 0;
for (const post of blogPosts) {
  if (post && post.slug) {
    urls.push({
      loc: `/blog/${post.slug}`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: post.updatedDate || post.publishedDate || undefined,
    });
    blogCount++;
  }
}

// All facility pages
let facilityCount = 0;
for (const [stateCode, stateData] of Object.entries(facilityData.states)) {
  if (stateData.facilities) {
    for (const facility of stateData.facilities) {
      urls.push({ loc: `/facility/${facility.ccn}`, priority: '0.8', changefreq: 'monthly' });
      facilityCount++;
    }
  }
}

// All chain detail pages
let chainCount = 0;
for (const chain of chainData) {
  const chainName = chain.affiliatedEntity;
  if (chainName) {
    urls.push({ loc: `/chain/${encodeURIComponent(chainName)}`, priority: '0.7', changefreq: 'monthly' });
    chainCount++;
  }
}

// Hospice section landing pages
urls.push({ loc: '/hospice', priority: '0.8', changefreq: 'weekly' });
urls.push({ loc: '/hospice/compare', priority: '0.7', changefreq: 'monthly' });
urls.push({ loc: '/hospice/news', priority: '0.7', changefreq: 'weekly' });
urls.push({ loc: '/hospice/high-risk', priority: '0.8', changefreq: 'weekly' });

// Hospice state directory pages — one per state JSON
let hospiceStateCount = 0;
const hospiceStatesDir = join(publicDir, 'data', 'hospice', 'states');
try {
  const hospiceStateFiles = readdirSync(hospiceStatesDir).filter(f => f.endsWith('.json'));
  for (const file of hospiceStateFiles) {
    const stateCode = file.replace('.json', '');
    urls.push({
      loc: `/hospice/state/${stateCode}`,
      priority: '0.7',
      changefreq: 'monthly',
    });
    hospiceStateCount++;
  }
} catch (err) {
  console.warn('Hospice state files not found for sitemap:', err.message);
}

// Hospice provider pages — one per Medicare-certified hospice (CCN-keyed)
let hospiceProviderCount = 0;
try {
  const hospiceStateFiles = readdirSync(hospiceStatesDir).filter(f => f.endsWith('.json'));
  for (const file of hospiceStateFiles) {
    const stateData = JSON.parse(readFileSync(join(hospiceStatesDir, file), 'utf8'));
    if (Array.isArray(stateData.providers)) {
      for (const p of stateData.providers) {
        if (p && p.ccn) {
          urls.push({ loc: `/hospice/${p.ccn}`, priority: '0.6', changefreq: 'monthly' });
          hospiceProviderCount++;
        }
      }
    }
  }
} catch (err) {
  console.warn('Hospice provider sitemap entries skipped:', err.message);
}

// Hospice chain rollup index + per-chain detail pages
urls.push({ loc: '/hospice/chains', priority: '0.7', changefreq: 'monthly' });
let hospiceChainCount = 0;
try {
  const hospiceChainData = JSON.parse(readFileSync(join(publicDir, 'data', 'hospice', 'chains.json'), 'utf8'));
  for (const c of hospiceChainData) {
    if (c && c.chain_slug) {
      urls.push({ loc: `/hospice/chain/${encodeURIComponent(c.chain_slug)}`, priority: '0.6', changefreq: 'monthly' });
      hospiceChainCount++;
    }
  }
} catch (err) {
  console.warn('Hospice chain rollup sitemap entries skipped:', err.message);
}

// Generate sitemap XML
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <lastmod>${u.lastmod || defaultLastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

writeFileSync(join(publicDir, 'sitemap.xml'), xml);
console.log(`Sitemap generated: ${urls.length} URLs (${facilityCount} facilities, ${chainCount} chains, ${blogCount} blog posts, ${hospiceStateCount} hospice states, ${hospiceProviderCount} hospice providers, ${hospiceChainCount} hospice chains)`);

// Generate robots.txt
const robots = `# Block AI/LLM scraping bots
User-agent: CCBot
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: PetalBot
Disallow: /

# Allow legitimate search engines and all other bots
User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;

writeFileSync(join(publicDir, 'robots.txt'), robots);
console.log('robots.txt generated');
