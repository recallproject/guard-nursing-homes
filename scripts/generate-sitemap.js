import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

const BASE_URL = 'https://oversightreports.com';
const today = new Date().toISOString().split('T')[0];

// Load facility data
const facilityData = JSON.parse(readFileSync(join(publicDir, 'facilities_map_data.json'), 'utf8'));
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
