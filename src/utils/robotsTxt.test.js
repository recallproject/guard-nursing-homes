import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  it('lets GPTBot, ChatGPT search, Claude, and Google-Extended read consumer pages', () => {
    for (const agent of ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'anthropic-ai', 'Google-Extended']) {
      const rules = rulesFor(agent);
      assert.match(rules, /^Allow: \/$/m, `${agent} should Allow: /`);
      assert.doesNotMatch(rules, /^Disallow: \/$/m, `${agent} should not be sitewide-blocked`);
    }
  });

  it('keeps bulk dumps closed for those assistant crawlers', () => {
    const gpt = rulesFor('GPTBot');
    assert.match(gpt, /^Disallow: \/data\/$/m);
    assert.match(gpt, /^Disallow: \/api\/$/m);
    assert.match(gpt, /^Disallow: \/deficiency_details\/$/m);
    assert.match(gpt, /^Disallow: \/facilities_map_data$/m);
    assert.match(gpt, /^Disallow: \/postacute_facility_data\.json$/m);
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
});
