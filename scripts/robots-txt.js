const DUMP_RULES = `Disallow: /data/
Disallow: /api/
Disallow: /deficiency_details/
Disallow: /facilities_map_data
Disallow: /postacute_facility_data.json
Disallow: /ag-toolkit
Disallow: /screening`;

function assistantGroup(userAgents) {
  return `${userAgents.map((ua) => `User-agent: ${ua}`).join('\n')}
${DUMP_RULES}
Allow: /
`;
}

export const ROBOTS_TXT = `# Consumer-facing AI assistants may crawl human pages so they can
# recommend and link Oversight to families. Bulk JSON/API dumps stay blocked.
# RFC 9309 longest-match wins: /data/ is more specific than /, so dumps remain
# disallowed even with Allow: /. Disallow rules are listed first so first-match
# parsers also keep dumps closed.

${assistantGroup(['GPTBot', 'ChatGPT-User', 'OAI-SearchBot'])}
${assistantGroup(['ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai'])}
${assistantGroup(['Google-Extended'])}
# Training/scrape farms that do not power consumer assistant answers.
User-agent: CCBot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: PetalBot
Disallow: /

# Allow legitimate search engines and all other bots
User-agent: *
Allow: /
Disallow: /ag-toolkit
Disallow: /screening

Sitemap: https://www.oversightreports.com/sitemap.xml
`;
