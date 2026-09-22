import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('sitemap organization', () => {
  it('generate-sitemap.js writes an index plus chunked child sitemaps', () => {
    const publicDir = join(root, 'public');
    const sitemapPath = join(publicDir, 'sitemap.xml');
    const sitemapsDir = join(publicDir, 'sitemaps');

    const result = spawnSync(process.execPath, [join(root, 'scripts/generate-sitemap.js')], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const indexXml = readFileSync(sitemapPath, 'utf8');
    assert.match(indexXml, /<sitemapindex/);
    assert.doesNotMatch(indexXml, /<urlset/);
    assert.match(indexXml, /\/sitemaps\/static\.xml/);
    assert.match(indexXml, /\/sitemaps\/facilities-001\.xml/);
    assert.match(indexXml, /\/sitemaps\/hospice\.xml/);
    assert.match(indexXml, /\/sitemaps\/postacute\.xml/);
    assert.match(indexXml, /\/sitemaps\/chains\.xml/);

    assert.ok(existsSync(join(sitemapsDir, 'facilities-001.xml')));
    const facilityChunks = ['facilities-001.xml', 'facilities-002.xml', 'facilities-003.xml']
      .filter((name) => existsSync(join(sitemapsDir, name)))
      .map((name) => readFileSync(join(sitemapsDir, name), 'utf8'));
    assert.ok(facilityChunks.length >= 1);
    assert.match(facilityChunks[0], /<urlset/);
    assert.ok(
      facilityChunks.some((xml) => xml.includes('/facility/345529')),
      'expected CCN 345529 in a facilities sitemap chunk'
    );

    const staticXml = readFileSync(join(sitemapsDir, 'static.xml'), 'utf8');
    assert.match(staticXml, /<loc>https:\/\/www\.oversightreports\.com\/<\/loc>/);
    assert.match(staticXml, /\/skilled-nursing</);
    assert.match(staticXml, /\/methodology</);

    for (const name of [
      'static.xml',
      'chains.xml',
      'hospice.xml',
      'postacute.xml',
      ...facilityChunks.map((_, i) => `facilities-${String(i + 1).padStart(3, '0')}.xml`),
    ]) {
      const xml = readFileSync(join(sitemapsDir, name), 'utf8');
      const urls = (xml.match(/<url>/g) || []).length;
      assert.ok(urls < 50000, `${name} should stay under 50k URLs`);
      assert.ok(Buffer.byteLength(xml, 'utf8') < 50 * 1024 * 1024, `${name} should stay under 50MB`);
    }
  });

  it('keeps robots.txt pointing at the sitemap index', () => {
    const robots = readFileSync(join(root, 'scripts/robots-txt.js'), 'utf8');
    assert.match(robots, /Sitemap: https:\/\/www\.oversightreports\.com\/sitemap\.xml/);
  });
});
