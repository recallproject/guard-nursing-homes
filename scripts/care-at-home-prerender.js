import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const agencies = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/data/careAtHomeAgencies.json'),
  'utf8',
));

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function careAtHomeBodyContent() {
  const items = agencies.map((agency) => (
    `<li>${escapeHtml(agency.name)} — ${escapeHtml(agency.city)}</li>`
  )).join('');
  return `<main style="font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:32px 24px;color:#182c4d;line-height:1.6;">
    <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#157b73;">Care at home</p>
    <h1>Know what it should cost. Know what to ask.</h1>
    <p>Compare local agencies before you call. This is a pilot of ${agencies.length} home-care profiles in Orange County and San Diego. It is not a care-quality ranking, and no agency has confirmed a profile.</p>
    <ul>${items}</ul>
    <p>Published rates for Genki HomeCare and Coast Care are starting points, not a quote or a county average. Other operational details stay “Not provided” until a sourced answer is added.</p>
  </main>`;
}
