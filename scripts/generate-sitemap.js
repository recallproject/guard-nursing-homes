import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ROBOTS_TXT } from './robots-txt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');
const sitemapsDir = join(publicDir, 'sitemaps');

const BASE_URL = 'https://www.oversightreports.com';
const today = new Date().toISOString().split('T')[0];
/** Stay well under the 50k URL / 50MB sitemap limits. */
const FACILITY_CHUNK_SIZE = 5000;

function urlEntry({ loc, priority = '0.5', changefreq = 'monthly', lastmod }) {
  return { loc, priority, changefreq, lastmod: lastmod || today };
}

function renderUrlset(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
}

function renderSitemapIndex(sitemapPaths) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPaths.map((path) => `  <sitemap>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>
`;
}

function writeSitemapFile(relativePath, xml) {
  const full = join(publicDir, relativePath.replace(/^\//, ''));
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, xml);
  return relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
}

// Load facility data from split state files (public/data/states/*.json)
const statesDir = join(publicDir, 'data', 'states');
const facilityData = { states: {} };
for (const file of readdirSync(statesDir).filter((f) => f.endsWith('.json'))) {
  const stateCode = file.replace('.json', '');
  const stateData = JSON.parse(readFileSync(join(statesDir, file), 'utf8'));
  facilityData.states[stateCode] = stateData;
}
const chainData = JSON.parse(readFileSync(join(publicDir, 'data', 'chain_performance.json'), 'utf8'));

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

const staticUrls = [];
const facilityUrls = [];
const chainUrls = [];
const hospiceUrls = [];
const postacuteUrls = [];

// Homepage
staticUrls.push(urlEntry({ loc: '/', priority: '1.0', changefreq: 'weekly' }));

// Static pages
const staticPages = [
  { path: '/chains', priority: '0.6' },
  { path: '/high-risk', priority: '0.6' },
  { path: '/methodology', priority: '0.6' },
  { path: '/pricing', priority: '0.6' },
  { path: '/ownership', priority: '0.6' },
  { path: '/discrepancies', priority: '0.6' },
  { path: '/trends', priority: '0.6' },
  { path: '/watchlist', priority: '0.6' },
  { path: '/referral-scorecard', priority: '0.6' },
  { path: '/know-your-rights', priority: '0.7' },
  { path: '/after-care', priority: '0.5' },
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
  { path: '/skilled-nursing', priority: '0.8' },
  { path: '/states/california', priority: '0.8' },
];

staticPages.forEach((p) => {
  staticUrls.push(urlEntry({ loc: p.path, priority: p.priority, changefreq: 'monthly' }));
});

// Legal pages
staticUrls.push(urlEntry({ loc: '/terms', priority: '0.3', changefreq: 'yearly' }));
staticUrls.push(urlEntry({ loc: '/privacy', priority: '0.3', changefreq: 'yearly' }));

// Blog listing + individual posts
staticUrls.push(urlEntry({ loc: '/blog', priority: '0.7', changefreq: 'monthly' }));
let blogCount = 0;
for (const post of blogPosts) {
  if (post && post.slug) {
    staticUrls.push(urlEntry({
      loc: `/blog/${post.slug}`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: post.updatedDate || post.publishedDate || undefined,
    }));
    blogCount++;
  }
}

// All facility pages
let facilityCount = 0;
for (const stateData of Object.values(facilityData.states)) {
  if (stateData.facilities) {
    for (const facility of stateData.facilities) {
      facilityUrls.push(urlEntry({ loc: `/facility/${facility.ccn}`, priority: '0.8', changefreq: 'monthly' }));
      facilityCount++;
    }
  }
}

// All chain detail pages
let chainCount = 0;
for (const chain of chainData) {
  const chainName = chain.affiliatedEntity;
  if (chainName) {
    chainUrls.push(urlEntry({
      loc: `/chain/${encodeURIComponent(chainName)}`,
      priority: '0.7',
      changefreq: 'monthly',
    }));
    chainCount++;
  }
}

// Hospice section landing pages
hospiceUrls.push(urlEntry({ loc: '/hospice', priority: '0.8', changefreq: 'weekly' }));
hospiceUrls.push(urlEntry({ loc: '/hospice/compare', priority: '0.7', changefreq: 'monthly' }));
hospiceUrls.push(urlEntry({ loc: '/hospice/news', priority: '0.7', changefreq: 'weekly' }));
hospiceUrls.push(urlEntry({ loc: '/hospice/high-risk', priority: '0.8', changefreq: 'weekly' }));

// Hospice state directory pages — one per state JSON
let hospiceStateCount = 0;
const hospiceStatesDir = join(publicDir, 'data', 'hospice', 'states');
try {
  const hospiceStateFiles = readdirSync(hospiceStatesDir).filter((f) => f.endsWith('.json'));
  for (const file of hospiceStateFiles) {
    const stateCode = file.replace('.json', '');
    hospiceUrls.push(urlEntry({
      loc: `/hospice/state/${stateCode}`,
      priority: '0.7',
      changefreq: 'monthly',
    }));
    hospiceStateCount++;
  }
} catch (err) {
  console.warn('Hospice state files not found for sitemap:', err.message);
}

// Hospice provider pages — one per Medicare-certified hospice (CCN-keyed)
let hospiceProviderCount = 0;
try {
  const hospiceStateFiles = readdirSync(hospiceStatesDir).filter((f) => f.endsWith('.json'));
  for (const file of hospiceStateFiles) {
    const stateData = JSON.parse(readFileSync(join(hospiceStatesDir, file), 'utf8'));
    if (Array.isArray(stateData.providers)) {
      for (const p of stateData.providers) {
        if (p && p.ccn) {
          hospiceUrls.push(urlEntry({ loc: `/hospice/${p.ccn}`, priority: '0.6', changefreq: 'monthly' }));
          hospiceProviderCount++;
        }
      }
    }
  }
} catch (err) {
  console.warn('Hospice provider sitemap entries skipped:', err.message);
}

// Hospice chain rollup index + per-chain detail pages
hospiceUrls.push(urlEntry({ loc: '/hospice/chains', priority: '0.7', changefreq: 'monthly' }));
let hospiceChainCount = 0;
try {
  const hospiceChainData = JSON.parse(readFileSync(join(publicDir, 'data', 'hospice', 'chains.json'), 'utf8'));
  for (const c of hospiceChainData) {
    if (c && c.chain_slug) {
      hospiceUrls.push(urlEntry({
        loc: `/hospice/chain/${encodeURIComponent(c.chain_slug)}`,
        priority: '0.6',
        changefreq: 'monthly',
      }));
      hospiceChainCount++;
    }
  }
} catch (err) {
  console.warn('Hospice chain rollup sitemap entries skipped:', err.message);
}

// Home Health / IRF / LTACH — hub + state directory + provider URLs
const POSTACUTE_SITEMAP = [
  { dir: 'home-health', route: '/home-health' },
  { dir: 'irf', route: '/irf' },
  { dir: 'ltach', route: '/ltach' },
];
let postacuteHubCount = 0;
let postacuteStateCount = 0;
let postacuteProviderCount = 0;
for (const src of POSTACUTE_SITEMAP) {
  postacuteUrls.push(urlEntry({ loc: src.route, priority: '0.8', changefreq: 'weekly' }));
  postacuteHubCount++;
  const settingStatesDir = join(publicDir, 'data', src.dir, 'states');
  try {
    const files = readdirSync(settingStatesDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const stateCode = file.replace('.json', '');
      postacuteUrls.push(urlEntry({
        loc: `${src.route}/state/${stateCode}`,
        priority: '0.6',
        changefreq: 'monthly',
      }));
      postacuteStateCount++;
      const stateData = JSON.parse(readFileSync(join(settingStatesDir, file), 'utf8'));
      if (Array.isArray(stateData.providers)) {
        for (const p of stateData.providers) {
          if (p && p.ccn) {
            postacuteUrls.push(urlEntry({
              loc: `${src.route}/${p.ccn}`,
              priority: '0.5',
              changefreq: 'monthly',
            }));
            postacuteProviderCount++;
          }
        }
      }
    }
  } catch (err) {
    console.warn(`${src.dir} sitemap entries skipped:`, err.message);
  }
}

// Fresh sitemaps directory (remove stale facility chunks from prior runs)
if (existsSync(sitemapsDir)) {
  rmSync(sitemapsDir, { recursive: true, force: true });
}
mkdirSync(sitemapsDir, { recursive: true });

const indexPaths = [];

indexPaths.push(writeSitemapFile('sitemaps/static.xml', renderUrlset(staticUrls)));
indexPaths.push(writeSitemapFile('sitemaps/chains.xml', renderUrlset(chainUrls)));
indexPaths.push(writeSitemapFile('sitemaps/hospice.xml', renderUrlset(hospiceUrls)));
indexPaths.push(writeSitemapFile('sitemaps/postacute.xml', renderUrlset(postacuteUrls)));

let facilityChunkCount = 0;
for (let i = 0; i < facilityUrls.length; i += FACILITY_CHUNK_SIZE) {
  facilityChunkCount += 1;
  const chunk = facilityUrls.slice(i, i + FACILITY_CHUNK_SIZE);
  const name = `sitemaps/facilities-${String(facilityChunkCount).padStart(3, '0')}.xml`;
  indexPaths.push(writeSitemapFile(name, renderUrlset(chunk)));
}

const indexXml = renderSitemapIndex(indexPaths.map((p) => (p.startsWith('/') ? p : `/${p}`)));
writeFileSync(join(publicDir, 'sitemap.xml'), indexXml);

const totalUrls =
  staticUrls.length + facilityUrls.length + chainUrls.length + hospiceUrls.length + postacuteUrls.length;

console.log(
  `Sitemap index generated: ${totalUrls} URLs across ${indexPaths.length} child sitemaps ` +
    `(${facilityCount} facilities in ${facilityChunkCount} chunks, ${chainCount} chains, ${blogCount} blog posts, ` +
    `${hospiceStateCount} hospice states, ${hospiceProviderCount} hospice providers, ${hospiceChainCount} hospice chains, ` +
    `${postacuteHubCount} post-acute hubs, ${postacuteStateCount} post-acute states, ${postacuteProviderCount} post-acute providers)`
);

writeFileSync(join(publicDir, 'robots.txt'), ROBOTS_TXT);
console.log('robots.txt generated');
