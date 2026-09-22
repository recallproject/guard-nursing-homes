/**
 * Crawlable facility summary HTML for Vite prerender (generate-seo-pages.js).
 * Citation-ready facts only — React still hydrates the full interactive page.
 */

import { hasAbuseFlag } from '../src/utils/facilityFlags.js';
import { formerNamesLabel, sffDetailRows, sffSummarySentence } from '../src/utils/sffStatus.js';

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin',
  WY: 'Wyoming', PR: 'Puerto Rico', GU: 'Guam', VI: 'U.S. Virgin Islands',
  MP: 'Northern Mariana Islands',
};

export function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeAttr(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Replace <div id="root">…</div> even when the Vite template already has crawlable children. */
export function injectRootContent(html, bodyContent) {
  const startToken = '<div id="root">';
  const start = html.indexOf(startToken);
  if (start === -1) {
    if (html.includes('<div id="root"></div>')) {
      return html.replace('<div id="root"></div>', `<div id="root">${bodyContent}</div>`);
    }
    return html;
  }

  let i = start + startToken.length;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
      continue;
    }
    depth -= 1;
    if (depth === 0) {
      return `${html.slice(0, start)}<div id="root">${bodyContent}</div>${html.slice(nextClose + 6)}`;
    }
    i = nextClose + 6;
  }
  return html;
}

export function stateDisplayName(code) {
  const key = String(code || '').toUpperCase();
  return STATE_NAMES[key] || key;
}

export function formatMoney(n) {
  if (n == null || n === 0) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Number(n).toLocaleString()}`;
}

export function formatNum(n) {
  if (n == null) return 'N/A';
  return Number(n).toLocaleString();
}

export function formatDisplayDate(iso) {
  if (!iso) return '';
  const raw = String(iso).slice(0, 10);
  const [year, month, day] = raw.split('-').map(Number);
  if (!year || !month || !day) return raw;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function starDisplay(stars) {
  if (stars == null || stars === '') return 'Unrated';
  const full = Math.floor(Number(stars));
  if (Number.isNaN(full)) return 'Unrated';
  return `${'★'.repeat(Math.max(0, Math.min(5, full)))}${'☆'.repeat(Math.max(0, 5 - full))} ${stars}/5`;
}

function riskLevel(composite) {
  if (composite == null) return { label: 'Unknown', color: '#6B7280' };
  if (composite >= 70) return { label: 'Critical Risk', color: '#DC2626' };
  if (composite >= 50) return { label: 'High Risk', color: '#EA580C' };
  if (composite >= 30) return { label: 'Elevated Risk', color: '#D97706' };
  return { label: 'Lower Risk', color: '#0D9488' };
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Pick a few nearby facilities in the same state for crawlable internal links. */
export function pickNearbyFacilities(facility, peers, { limit = 5, maxMiles = 25 } = {}) {
  if (facility?.lat == null || facility?.lon == null || !Array.isArray(peers)) return [];
  return peers
    .filter((p) => p && p.ccn && p.ccn !== facility.ccn && p.lat != null && p.lon != null)
    .map((p) => ({
      ...p,
      distance: haversineMiles(facility.lat, facility.lon, p.lat, p.lon),
    }))
    .filter((p) => p.distance <= maxMiles)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/** Most recent survey_date from deficiency detail rows, when present. */
export function mostRecentSurveyDate(deficiencyDetails) {
  if (!Array.isArray(deficiencyDetails) || !deficiencyDetails.length) return null;
  let best = null;
  for (const row of deficiencyDetails) {
    const d = row?.survey_date ? String(row.survey_date).slice(0, 10) : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && (!best || d > best)) best = d;
  }
  return best;
}

export function buildWhatThisRecordShows(facility, { mostRecentSurveyDate: surveyDate } = {}) {
  const name = facility?.name || 'This nursing home';
  const former = formerNamesLabel(facility);
  const named = former ? `${name} (${former})` : name;
  const city = facility?.city;
  const state = facility?.state;
  const place = city && state ? `${city}, ${state}` : state || city || '';
  const parts = [];

  parts.push(
    place
      ? `${named} is a Medicare-certified nursing home in ${place}`
      : `${named} is a Medicare-certified nursing home`
  );

  if (facility?.ccn) parts[0] += ` (CMS Certification Number ${facility.ccn})`;
  parts[0] += '.';

  if (facility?.stars != null && facility.stars !== '') {
    parts.push(`CMS rates it ${facility.stars} out of 5 stars overall`);
    const bits = [];
    if (facility.inspection_stars != null) bits.push(`health inspection ${facility.inspection_stars}/5`);
    if (facility.staffing_stars != null) bits.push(`staffing ${facility.staffing_stars}/5`);
    if (facility.quality_stars != null) bits.push(`quality measures ${facility.quality_stars}/5`);
    if (bits.length) parts[parts.length - 1] += ` (${bits.join(', ')})`;
    parts[parts.length - 1] += '.';
  } else {
    parts.push('CMS has not published an overall star rating for this facility in the current extract.');
  }

  const defs = Number(facility?.total_deficiencies) || 0;
  const ij = Number(facility?.jeopardy_count) || 0;
  const serious = Number(facility?.serious_deficiency_count) || 0;
  if (defs > 0) {
    let defLine = `Federal inspection records list ${defs} health deficiencies`;
    if (ij > 0) defLine += `, including ${ij} immediate jeopardy citation${ij === 1 ? '' : 's'}`;
    else if (serious > 0) defLine += `, including ${serious} serious deficiency flag${serious === 1 ? '' : 's'}`;
    if (surveyDate) defLine += `. The most recent survey date on record is ${formatDisplayDate(surveyDate)}`;
    defLine += '.';
    parts.push(defLine);
  } else {
    parts.push('No health deficiencies appear in the current CMS extract for this facility.');
  }

  if ((Number(facility?.total_fines) || 0) > 0) {
    parts.push(
      `Federal civil monetary penalties on record total ${formatMoney(facility.total_fines)}` +
        (facility.fine_count ? ` across ${facility.fine_count} fine${facility.fine_count === 1 ? '' : 's'}` : '') +
        '.'
    );
  }

  const sffSentence = sffSummarySentence(facility);
  if (sffSentence) parts.push(sffSentence);

  if (facility?.chain_name) {
    parts.push(`Ownership / chain affiliation in CMS records: ${facility.chain_name}.`);
  }

  parts.push(
    'This page summarizes public CMS inspection, staffing, penalty, and ownership data so families can research a nursing home before choosing care. It is not medical advice or a recommendation.'
  );

  return parts.join(' ');
}

/**
 * @param {object} f facility record
 * @param {object} [opts]
 * @param {string} [opts.stateCode]
 * @param {string} [opts.dataAsOf] ISO date from state _metadata
 * @param {Set<string>|string[]} [opts.knownChains] chain names with /chain/ pages
 * @param {object[]} [opts.nearby] nearby facility stubs {ccn,name,city,distance?}
 * @param {string|null} [opts.mostRecentSurveyDate]
 */
export function facilityBodyContent(f, opts = {}) {
  const stateCode = (opts.stateCode || f.state || '').toUpperCase();
  const stateName = stateDisplayName(stateCode);
  const city = f.city || '';
  const state = f.state || stateCode;
  const zip = f.zip || '';
  const risk = riskLevel(f.composite);
  const surveyDate = opts.mostRecentSurveyDate || null;
  const dataAsOf = opts.dataAsOf || null;
  const knownChains = opts.knownChains instanceof Set
    ? opts.knownChains
    : new Set(opts.knownChains || []);
  const nearby = Array.isArray(opts.nearby) ? opts.nearby : [];
  const sffRows = sffDetailRows(f);
  const abuse = hasAbuseFlag(f);
  const whatShows = buildWhatThisRecordShows(f, { mostRecentSurveyDate: surveyDate });

  const chainHref =
    f.chain_name && knownChains.has(f.chain_name)
      ? `/chain/${encodeURIComponent(f.chain_name)}`
      : null;

  const cityHref =
    city && stateCode
      ? `/state/${stateCode}?q=${encodeURIComponent(city)}`
      : null;
  const stateHref = stateCode ? `/state/${stateCode}` : null;

  const starRows = [
    ['Overall CMS rating', f.stars],
    ['Health inspection', f.inspection_stars],
    ['Staffing', f.staffing_stars],
    ['Quality measures', f.quality_stars],
  ]
    .filter(([, v]) => v != null && v !== '')
    .map(
      ([label, v]) => `<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">${escapeHtml(label)}</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${escapeHtml(starDisplay(v))}</td>
          </tr>`
    )
    .join('');

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <nav style="margin-bottom:16px;font-size:14px;color:#6B7280;">
        <a href="/" style="color:#4F46E5;text-decoration:none;">The Oversight Report</a>
        <span> › </span>
        <a href="/skilled-nursing" style="color:#4F46E5;text-decoration:none;">Nursing homes</a>
        ${stateHref ? `<span> › </span><a href="${escapeAttr(stateHref)}" style="color:#4F46E5;text-decoration:none;">${escapeHtml(stateName)}</a>` : ''}
        <span> › </span>
        <span>${escapeHtml(f.name)}</span>
      </nav>

      <header>
        <h1 style="font-size:28px;font-weight:800;margin:0 0 8px 0;">${escapeHtml(f.name)}</h1>
        ${formerNamesLabel(f) ? `<p style="font-size:16px;color:#4B5563;margin:0 0 4px 0;">${escapeHtml(formerNamesLabel(f))}</p>` : ''}
        <p style="font-size:16px;color:#4B5563;margin:0 0 4px 0;">${escapeHtml(city)}${city ? ', ' : ''}${escapeHtml(state)} ${escapeHtml(zip)}</p>
        <p style="font-size:14px;color:#6B7280;margin:0 0 16px 0;">CMS Certification Number (CCN): ${escapeHtml(f.ccn)}${f.beds != null ? ` · ${formatNum(f.beds)} beds` : ''}</p>
      </header>

      <section style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px 0;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">What this record shows</h2>
        <p style="font-size:16px;line-height:1.65;color:#1a1a1a;margin:0;">${escapeHtml(whatShows)}</p>
      </section>

      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px;">
        <div style="background:${risk.color};color:white;padding:16px 24px;border-radius:12px;text-align:center;min-width:140px;">
          <div style="font-size:36px;font-weight:900;">${f.composite != null ? escapeHtml(f.composite) : 'N/A'}</div>
          <div style="font-size:13px;font-weight:600;opacity:0.9;">${escapeHtml(risk.label)}</div>
          <div style="font-size:11px;opacity:0.8;">Composite Score</div>
        </div>
        <div style="background:#F3F4F6;padding:16px 24px;border-radius:12px;text-align:center;min-width:120px;">
          <div style="font-size:24px;font-weight:700;color:#F59E0B;">${escapeHtml(starDisplay(f.stars))}</div>
          <div style="font-size:13px;color:#6B7280;">CMS Star Rating</div>
        </div>
      </div>

      ${starRows ? `<section style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px 0;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">CMS star ratings</h2>
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          ${starRows}
        </table>
      </section>` : ''}

      <section style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px 0;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">Inspections &amp; deficiencies</h2>
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Total health deficiencies</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${formatNum(f.total_deficiencies)}</td>
          </tr>
          ${surveyDate ? `<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Most recent inspection / survey date</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${escapeHtml(formatDisplayDate(surveyDate))}</td>
          </tr>` : ''}
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Serious deficiency flags</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;${(f.serious_deficiency_count || 0) > 0 ? 'color:#DC2626;' : ''}">${formatNum(f.serious_deficiency_count || 0)}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Harm citations</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;${(f.harm_count || 0) > 0 ? 'color:#DC2626;' : ''}">${formatNum(f.harm_count || 0)}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Immediate jeopardy citations</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;${(f.jeopardy_count || 0) > 0 ? 'color:#DC2626;' : ''}">${formatNum(f.jeopardy_count || 0)}</td>
          </tr>
          ${sffRows.map((row) => `<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">${escapeHtml(row.label)}</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${escapeHtml(row.value)}</td>
          </tr>`).join('')}
          ${abuse ? `<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">CMS abuse icon</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;color:#DC2626;">Yes</td>
          </tr>` : ''}
        </table>
      </section>

      <section style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px 0;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">Federal fines &amp; penalties</h2>
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Total federal fines</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;${(f.total_fines || 0) > 0 ? 'color:#DC2626;' : ''}">${formatMoney(f.total_fines)}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Fine count</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${formatNum(f.fine_count || 0)}</td>
          </tr>
          ${(f.denial_count || 0) > 0 ? `<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Payment denials</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;color:#DC2626;">${formatNum(f.denial_count)}</td>
          </tr>` : ''}
        </table>
      </section>

      <section style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px 0;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">Staffing summary</h2>
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          ${f.staffing_stars != null ? `<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Staffing star rating</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${escapeHtml(starDisplay(f.staffing_stars))}</td>
          </tr>` : ''}
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">RN hours per resident day</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${f.rn_hprd != null ? Number(f.rn_hprd).toFixed(2) : 'N/A'}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Total nurse staffing hours per resident day</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;">${f.total_hprd != null ? Number(f.total_hprd).toFixed(2) : 'N/A'}</td>
          </tr>
          ${f.zero_rn_pct != null ? `<tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:10px 0;color:#4B5563;">Days with zero RN hours</td>
            <td style="padding:10px 0;font-weight:700;text-align:right;${f.zero_rn_pct > 0 ? 'color:#DC2626;' : ''}">${Number(f.zero_rn_pct).toFixed(1)}%</td>
          </tr>` : ''}
        </table>
      </section>

      ${(f.chain_name || f.ownership_type || f.pe_owned || f.reit_owned) ? `<section style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px 0;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">Ownership &amp; chain</h2>
        ${f.chain_name ? `<p style="font-size:15px;color:#1a1a1a;margin:0 0 8px 0;">Chain / affiliated entity: <strong>${
          chainHref
            ? `<a href="${escapeAttr(chainHref)}" style="color:#4F46E5;text-decoration:none;">${escapeHtml(f.chain_name)}</a>`
            : escapeHtml(f.chain_name)
        }</strong></p>` : ''}
        ${f.ownership_type ? `<p style="font-size:14px;color:#4B5563;margin:0 0 8px 0;">Ownership type: ${escapeHtml(f.ownership_type)}</p>` : ''}
        ${f.owner_portfolio_count ? `<p style="font-size:14px;color:#6B7280;margin:0 0 8px 0;">This owner operates ${formatNum(f.owner_portfolio_count)} facilities in the current extract.</p>` : ''}
        ${f.pe_owned ? `<p style="font-size:14px;color:#4B5563;margin:0;">Private equity ownership signal in CMS / related records.</p>` : ''}
        ${f.reit_owned ? `<p style="font-size:14px;color:#4B5563;margin:0;">REIT ownership signal in CMS / related records.</p>` : ''}
      </section>` : ''}

      <section style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px 0;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">Explore related pages</h2>
        <ul style="font-size:15px;line-height:1.7;margin:0;padding-left:20px;">
          ${cityHref ? `<li><a href="${escapeAttr(cityHref)}" style="color:#4F46E5;">Nursing homes in ${escapeHtml(city)}, ${escapeHtml(state)}</a></li>` : ''}
          ${stateHref ? `<li><a href="${escapeAttr(stateHref)}" style="color:#4F46E5;">Nursing homes in ${escapeHtml(stateName)}</a></li>` : ''}
          ${chainHref ? `<li><a href="${escapeAttr(chainHref)}" style="color:#4F46E5;">Facilities owned by ${escapeHtml(f.chain_name)}</a></li>` : ''}
          <li><a href="/skilled-nursing" style="color:#4F46E5;">Browse all skilled nursing facilities</a></li>
          <li><a href="/families" style="color:#4F46E5;">Guide for families choosing care</a></li>
          <li><a href="/methodology" style="color:#4F46E5;">How we read CMS ratings, staffing, and deficiencies</a></li>
          <li><a href="/data-transparency" style="color:#4F46E5;">Data sources &amp; transparency</a></li>
          <li><a href="/know-your-rights" style="color:#4F46E5;">Know your rights in a nursing home</a></li>
          <li><a href="/compare" style="color:#4F46E5;">Compare nursing homes</a></li>
        </ul>
      </section>

      ${nearby.length ? `<section style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px 0;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">Nearby facilities</h2>
        <ul style="font-size:15px;line-height:1.7;margin:0;padding-left:20px;">
          ${nearby.map((n) => {
            const dist = n.distance != null ? ` (${n.distance.toFixed(1)} mi)` : '';
            const place = [n.city, n.state].filter(Boolean).join(', ');
            return `<li><a href="/facility/${escapeAttr(n.ccn)}" style="color:#4F46E5;">${escapeHtml(n.name)}</a>${place ? ` — ${escapeHtml(place)}` : ''}${escapeHtml(dist)}</li>`;
          }).join('')}
        </ul>
      </section>` : ''}

      <footer style="margin-top:32px;padding-top:16px;border-top:2px solid #E5E7EB;font-size:13px;color:#6B7280;">
        <p style="margin:0 0 8px 0;"><strong>Source:</strong> Public Centers for Medicare &amp; Medicaid Services (CMS) records — Care Compare / Provider Data Catalog inspections, Payroll-Based Journal (PBJ) staffing, federal penalties, and ownership disclosures. Independent compilation by The Oversight Report (DataLink Clinical LLC). Not affiliated with CMS or HHS.</p>
        ${dataAsOf ? `<p style="margin:0 0 8px 0;">CMS data as of ${escapeHtml(formatDisplayDate(dataAsOf))}.</p>` : '<p style="margin:0 0 8px 0;">Updated regularly as CMS republishes provider data.</p>'}
        <p style="margin:0;">© ${new Date().getFullYear()} The Oversight Report — Independent nursing home safety data for families.</p>
      </footer>
    </div>`;
}
