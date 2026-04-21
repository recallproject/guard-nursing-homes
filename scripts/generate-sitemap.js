import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

const BASE_URL = 'https://www.oversightreports.com';
const today = new Date().toISOString().split('T')[0];

// Load facility data from split state files (public/data/states/*.json)
const statesDir = join(publicDir, 'data', 'states');
const facilityData = { states: {} };
for (const file of readdirSync(statesDir).filter(f => f.endsWith('.json'))) {
  const stateCode = file.replace('.json', '');
  const stateData = JSON.parse(readFileSync(join(statesDir, file), 'utf8'));
  facilityData.states[stateCode] = stateData;
}
const chainData = JSON.parse(readFileSync(join(publicDir, 'data', 'chain_performance.json'), 'utf8'));

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
];

staticPages.forEach(p => {
  urls.push({ loc: p.path, priority: p.priority, changefreq: 'monthly' });
});

// Legal pages
urls.push({ loc: '/terms', priority: '0.3', changefreq: 'yearly' });
urls.push({ loc: '/privacy', priority: '0.3', changefreq: 'yearly' });

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

// Generate sitemap XML
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

writeFileSync(join(publicDir, 'sitemap.xml'), xml);
console.log(`Sitemap generated: ${urls.length} URLs (${facilityCount} facilities, ${chainCount} chains)`);

// Generate robots.txt
const robots = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;

writeFileSync(join(publicDir, 'robots.txt'), robots);
console.log('robots.txt generated');
