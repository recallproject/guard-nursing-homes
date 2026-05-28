import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');
const distDir = join(rootDir, 'dist');

const failures = [];

function fail(message) {
  failures.push(message);
}

function rel(path) {
  return relative(rootDir, path);
}

function readText(path) {
  return readFileSync(path, 'utf8');
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function htmlCount(html, pattern) {
  return (html.match(pattern) || []).length;
}

function jsonLdBlocks(html, path) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => {
    try {
      return JSON.parse(match[1]);
    } catch (err) {
      fail(`${path}: invalid JSON-LD (${err.message})`);
      return null;
    }
  }).filter(Boolean);
}

function checkCanonical(html, path, expectedPath) {
  const canonicalMatches = [...html.matchAll(/<link\b(?=[^>]*rel="canonical")[^>]*href="([^"]+)"/gi)];
  if (canonicalMatches.length !== 1) {
    fail(`${path}: expected exactly one canonical link, found ${canonicalMatches.length}`);
    return;
  }

  const expected = `https://www.oversightreports.com${expectedPath}`;
  if (canonicalMatches[0][1] !== expected) {
    fail(`${path}: canonical is ${canonicalMatches[0][1]}, expected ${expected}`);
  }
}

function latestCmsDataDate() {
  const dates = new Set();
  const statesDir = join(publicDir, 'data', 'states');
  for (const file of readdirSync(statesDir).filter((name) => name.endsWith('.json'))) {
    const stateData = readJson(join(statesDir, file));
    const dataAsOf = stateData?._metadata?.data_as_of;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataAsOf)) {
      dates.add(dataAsOf);
    }
  }

  if (dates.size === 0) {
    fail('No CMS data_as_of metadata found in public/data/states/*.json');
    return null;
  }

  return [...dates].sort().at(-1);
}

function assertFileMissing(path) {
  if (existsSync(path)) {
    fail(`${rel(path)} should not exist`);
  }
}

function assertFileExists(path) {
  if (!existsSync(path)) {
    fail(`${rel(path)} is missing; run npm run build before npm run seo:check`);
    return false;
  }
  return true;
}

function walkFiles(dir, predicate, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      walkFiles(path, predicate, acc);
    } else if (predicate(path)) {
      acc.push(path);
    }
  }
  return acc;
}

function checkHomeHeadings() {
  const pages = [
    ['dist/index.html', '/', 1, 2],
    ['dist/post-acute/index.html', '/post-acute', 1, 2],
  ];

  for (const [pagePath, canonicalPath, expectedH1, minH2] of pages) {
    const fullPath = join(rootDir, pagePath);
    if (!assertFileExists(fullPath)) continue;
    const html = readText(fullPath);
    const h1Count = htmlCount(html, /<h1\b/gi);
    const h2Count = htmlCount(html, /<h2\b/gi);
    if (h1Count !== expectedH1) {
      fail(`${pagePath}: expected ${expectedH1} h1, found ${h1Count}`);
    }
    if (h2Count < minH2) {
      fail(`${pagePath}: expected at least ${minH2} h2 tags, found ${h2Count}`);
    }
    checkCanonical(html, pagePath, canonicalPath);
  }
}

function checkFacilityPages() {
  const statesDir = join(publicDir, 'data', 'states');
  let checked = 0;

  for (const file of readdirSync(statesDir).filter((name) => name.endsWith('.json'))) {
    const stateData = readJson(join(statesDir, file));
    for (const facility of stateData.facilities || []) {
      const path = `dist/facility/${facility.ccn}/index.html`;
      const fullPath = join(rootDir, path);
      if (!assertFileExists(fullPath)) continue;

      const html = readText(fullPath);
      checkCanonical(html, path, `/facility/${facility.ccn}`);
      if (htmlCount(html, /<h1\b/gi) !== 1) {
        fail(`${path}: expected exactly one h1`);
      }

      const medicalOrg = jsonLdBlocks(html, path).find((block) => block['@type'] === 'MedicalOrganization');
      if (!medicalOrg) {
        fail(`${path}: missing MedicalOrganization JSON-LD`);
      } else if (medicalOrg.url !== `https://www.oversightreports.com/facility/${facility.ccn}`) {
        fail(`${path}: MedicalOrganization url mismatch`);
      }
      checked++;
    }
  }

  console.log(`Facility SEO pages checked: ${checked.toLocaleString()}`);
}

function checkHospicePages() {
  const hospiceStatesDir = join(publicDir, 'data', 'hospice', 'states');
  let checked = 0;

  for (const file of readdirSync(hospiceStatesDir).filter((name) => name.endsWith('.json'))) {
    const stateCode = file.replace('.json', '');
    const stateData = readJson(join(hospiceStatesDir, file));
    for (const provider of stateData.providers || []) {
      if (!provider.ccn) continue;
      const path = `dist/hospice/${provider.ccn}/index.html`;
      const fullPath = join(rootDir, path);
      if (!assertFileExists(fullPath)) continue;

      const html = readText(fullPath);
      checkCanonical(html, path, `/hospice/${provider.ccn}`);
      const medicalOrg = jsonLdBlocks(html, path).find((block) => block['@type'] === 'MedicalOrganization');
      if (!medicalOrg) {
        fail(`${path}: missing MedicalOrganization JSON-LD`);
      } else if (medicalOrg.url !== `https://www.oversightreports.com/hospice/${provider.ccn}`) {
        fail(`${path}: MedicalOrganization url mismatch`);
      } else if (!medicalOrg.address?.addressRegion) {
        fail(`${path}: MedicalOrganization addressRegion missing for state ${stateCode}`);
      }
      checked++;
    }
  }

  console.log(`Hospice SEO pages checked: ${checked.toLocaleString()}`);
}

function checkNoFollow() {
  const sourceFiles = [
    ...walkFiles(join(rootDir, 'src'), (path) => /\.(jsx?|tsx?)$/.test(path)),
    ...walkFiles(publicDir, (path) => path.endsWith('.html')),
  ];

  for (const file of sourceFiles) {
    const text = readText(file);
    for (const match of text.matchAll(/<a\b(?=[^>]*\btarget="_blank")[^>]*>/gi)) {
      if (!/\brel="[^"]*\bnofollow\b[^"]*"/i.test(match[0])) {
        fail(`${rel(file)}: target="_blank" link missing nofollow: ${match[0].slice(0, 160)}`);
      }
    }
  }

  const distHtmlFiles = walkFiles(distDir, (path) => path.endsWith('.html'));
  for (const file of distHtmlFiles) {
    const text = readText(file);
    for (const match of text.matchAll(/<a\b(?=[^>]*\btarget="_blank")[^>]*>/gi)) {
      if (!/\brel="[^"]*\bnofollow\b[^"]*"/i.test(match[0])) {
        fail(`${rel(file)}: generated target="_blank" link missing nofollow: ${match[0].slice(0, 160)}`);
      }
    }
  }
}

function checkSitemapAndSearchIndex(dataDate) {
  if (!dataDate) return;

  const sitemapPath = join(publicDir, 'sitemap.xml');
  if (assertFileExists(sitemapPath)) {
    const sitemap = readText(sitemapPath);
    const homeBlock = sitemap.match(/<url>\s*<loc>https:\/\/www\.oversightreports\.com\/<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/);
    if (!homeBlock) {
      fail('public/sitemap.xml: homepage URL block missing');
    } else if (homeBlock[1] !== dataDate) {
      fail(`public/sitemap.xml: homepage lastmod is ${homeBlock[1]}, expected ${dataDate}`);
    }
  }

  const searchIndexPath = join(publicDir, 'data', 'search-index.json');
  if (assertFileExists(searchIndexPath)) {
    const searchIndex = readJson(searchIndexPath);
    const expectedGenerated = `${dataDate}T00:00:00.000Z`;
    if (searchIndex.generated !== expectedGenerated) {
      fail(`public/data/search-index.json: generated is ${searchIndex.generated}, expected ${expectedGenerated}`);
    }
  }
}

function checkVercelConfig() {
  const vercelPath = join(rootDir, 'vercel.json');
  if (!assertFileExists(vercelPath)) return;

  const config = readJson(vercelPath);
  const redirects = config.redirects || [];
  const headers = config.headers || [];

  const hasApexRedirect = redirects.some((redirect) =>
    redirect.source === '/:path(.*)' &&
    redirect.statusCode === 301 &&
    redirect.destination === 'https://www.oversightreports.com/:path' &&
    redirect.has?.some((condition) => condition.type === 'host' && condition.value === 'oversightreports.com')
  );
  if (!hasApexRedirect) {
    fail('vercel.json: missing apex to www redirect');
  }

  const hasContactRedirect = redirects.some((redirect) =>
    redirect.source === '/contact' &&
    redirect.destination === '/ask-a-clinician' &&
    redirect.statusCode === 301
  );
  if (!hasContactRedirect) {
    fail('vercel.json: missing /contact redirect');
  }

  for (const source of ['/assets/(.*)\\.js', '/assets/(.*)\\.css', '/(.*)\\.woff2']) {
    const entry = headers.find((header) => header.source === source);
    const cacheHeader = entry?.headers?.find((header) => header.key.toLowerCase() === 'cache-control');
    if (cacheHeader?.value !== 'public, max-age=31536000, immutable') {
      fail(`vercel.json: missing immutable Cache-Control for ${source}`);
    }
  }
}

function main() {
  assertFileMissing(join(publicDir, 'about-page-light.html'));
  assertFileMissing(join(distDir, 'about-page-light.html'));

  const dataDate = latestCmsDataDate();
  checkHomeHeadings();
  checkFacilityPages();
  checkHospicePages();
  checkNoFollow();
  checkSitemapAndSearchIndex(dataDate);
  checkVercelConfig();

  if (failures.length > 0) {
    console.error('\nSEO check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('SEO check passed.');
}

main();
