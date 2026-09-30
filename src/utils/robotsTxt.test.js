import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { ROBOTS_TXT } from '../../scripts/robots-txt.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function rulesFor(userAgent) {
  const groups = [];
  let agents = [];
  let rules = [];

  const flush = () => {
    if (agents.length) groups.push({ agents, rules: rules.join('\n') });
    agents = [];
    rules = [];
  };

  for (const line of ROBOTS_TXT.split('\n')) {
    if (line.startsWith('User-agent:')) {
      if (rules.length) flush();
      agents.push(line.slice('User-agent:'.length).trim());
      continue;
    }
    if (line.startsWith('#') || line.trim() === '') {
      if (agents.length && rules.length) flush();
      continue;
    }
    rules.push(line);
  }
  flush();

  return groups.filter((group) => group.agents.includes(userAgent)).map((group) => group.rules).join('\n');
}

describe('robots.txt assistant policy', () => {
  it('lets GPTBot, ChatGPT search/ads, Claude, and Google-Extended read consumer pages', () => {
    for (const agent of ['GPTBot', 'OAI-SearchBot', 'OAI-AdsBot', 'ChatGPT-User', 'ClaudeBot', 'anthropic-ai', 'Google-Extended']) {
      const rules = rulesFor(agent);
      assert.match(rules, /^Allow: \/$/m, `${agent} should Allow: /`);
      assert.doesNotMatch(rules, /^Disallow: \/$/m, `${agent} should not be sitewide-blocked`);
    }
  });

  it('keeps bulk dumps closed for those assistant crawlers', () => {
    for (const agent of ['GPTBot', 'OAI-SearchBot', 'OAI-AdsBot']) {
      const rules = rulesFor(agent);
      assert.match(rules, /^Disallow: \/data\/$/m, `${agent} should block /data/`);
      assert.match(rules, /^Disallow: \/api\/$/m, `${agent} should block /api/`);
      assert.match(rules, /^Disallow: \/deficiency_details\/$/m, `${agent} should block deficiency dumps`);
      assert.match(rules, /^Disallow: \/facilities_map_data$/m, `${agent} should block map dumps`);
      assert.match(rules, /^Disallow: \/postacute_facility_data\.json$/m, `${agent} should block postacute dumps`);
    }
  });

  it('closes the same bulk dumps for every other crawler without blocking human pages', () => {
    const rules = rulesFor('*');
    assert.match(rules, /^Allow: \/$/m);
    assert.doesNotMatch(rules, /^Disallow: \/$/m);
    assert.match(rules, /^Disallow: \/data\/$/m);
    assert.match(rules, /^Disallow: \/api\/$/m);
    assert.match(rules, /^Disallow: \/deficiency_details\/$/m);
    assert.match(rules, /^Disallow: \/facilities_map_data$/m);
    assert.match(rules, /^Disallow: \/postacute_facility_data\.json$/m);
    assert.match(rules, /^Disallow: \/ag-toolkit$/m);
    assert.match(rules, /^Disallow: \/screening$/m);
    const disallowAt = rules.indexOf('Disallow: /data/');
    const allowAt = rules.indexOf('Allow: /');
    assert.ok(disallowAt !== -1 && allowAt !== -1 && disallowAt < allowAt);
  });

  it('still blocks Common Crawl, Bytespider, and PetalBot sitewide', () => {
    for (const agent of ['CCBot', 'Bytespider', 'PetalBot']) {
      const rules = rulesFor(agent);
      assert.match(rules, /^Disallow: \/$/m, `${agent} should remain Disallow: /`);
      assert.doesNotMatch(rules, /^Allow: \/$/m, `${agent} should not get a sitewide Allow`);
    }
  });

  it('keeps a sitemap line and stays the source of the public file', () => {
    assert.match(ROBOTS_TXT, /^Sitemap: https:\/\/www\.oversightreports\.com\/sitemap\.xml$/m);
    const publicFile = readFileSync(join(root, 'public/robots.txt'), 'utf8');
    assert.equal(publicFile, ROBOTS_TXT);
    const sitemapScript = readFileSync(join(root, 'scripts/generate-sitemap.js'), 'utf8');
    assert.match(sitemapScript, /ROBOTS_TXT/);
  });

  it('does not ship the unused public monoliths', () => {
    for (const file of [
      'public/facilities_map_data.json',
      'public/facilities_map_data_backup_20260301.json',
      'public/postacute_facility_data.json',
    ]) {
      assert.equal(existsSync(join(root, file)), false, `${file} should not be deployed`);
    }
    const hook = readFileSync(join(root, 'src/hooks/useFacilityData.js'), 'utf8');
    assert.doesNotMatch(hook, /fetch\([^)]*facilities_map_data/);
    assert.match(hook, /data\/states\//);
    const clientSrc = readFileSync(join(root, 'src/pages/ReferralScorecardPage.jsx'), 'utf8');
    assert.doesNotMatch(clientSrc, /postacute_facility_data\.json/);
  });
});
