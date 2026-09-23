/**
 * Crawlable After Care HTML for generate-seo-pages.js.
 * Replaces the homepage shell inside <div id="root"> on /after-care.
 */

import {
  AFTER_CARE_NEEDS,
  AFTER_CARE_PAGE_DISCLOSURE,
  AFTER_CARE_PRIMARY_CTA,
  productsForNeed,
} from '../src/data/afterCare.js';

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function productArticle(pick) {
  const href = pick.kind === 'vive' ? pick.affiliateUrl : pick.coverageUrl;
  const rel = pick.kind === 'vive' ? 'noopener noreferrer sponsored' : 'noopener noreferrer';
  return `
        <article>
          <p style="margin:0 0 8px 0;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#9a7b49;">${escapeHtml(pick.label)}</p>
          <img src="${escapeAttr(pick.image)}" alt="${escapeAttr(pick.imageAlt)}" width="240" height="240" />
          <p style="margin:12px 0 4px 0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#1d9c92;">${escapeHtml(pick.category)}</p>
          <h3 style="font-size:22px;margin:0 0 8px 0;">${escapeHtml(pick.title)}</h3>
          <p style="margin:0 0 8px 0;font-weight:700;">${escapeHtml(pick.price)}</p>
          <p style="margin:0 0 8px 0;">${escapeHtml(pick.copy)}</p>
          <p style="margin:0 0 8px 0;">${escapeHtml(pick.fit)}. ${escapeHtml(pick.medicareLabel)}.</p>
          ${pick.comfortNote ? `<p style="margin:0 0 8px 0;">${escapeHtml(pick.comfortNote)}</p>` : ''}
          ${pick.safetyNote ? `<p style="margin:0 0 8px 0;">${escapeHtml(pick.safetyNote)}</p>` : ''}
          <p style="margin:0 0 8px 0;">${escapeHtml(pick.why)}</p>
          <p style="margin:0;"><a href="${escapeAttr(href)}" rel="${rel}">${escapeHtml(AFTER_CARE_PRIMARY_CTA)}</a> <span>${escapeHtml(pick.merchantLine)}</span></p>
        </article>`;
}

export function afterCareBodyContent() {
  const needsHtml = AFTER_CARE_NEEDS.map((need) => {
    const [primary, alt] = productsForNeed(need.id);
    return `
      <section style="margin-top:28px;">
        <h2 style="font-size:22px;margin:0 0 8px 0;">
          <a href="/after-care?need=${encodeURIComponent(need.id)}">${escapeHtml(need.label)}</a>
        </h2>
        <p style="margin:0 0 12px 0;">${escapeHtml(need.hint)}. ${escapeHtml(need.editSub)}</p>
        ${productArticle(primary)}
        ${productArticle(alt)}
      </section>`;
  }).join('');

  return `
    <main style="font-family:Georgia,Times New Roman,serif;max-width:800px;margin:0 auto;padding:32px 24px;color:#182c4d;line-height:1.6;">
      <p style="font-family:system-ui,sans-serif;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1d9c92;margin:0 0 8px 0;">After Care / The Edit</p>
      <h1 style="font-size:2.4rem;line-height:1.05;margin:0 0 12px 0;">We searched the options so you don’t have to.</h1>
      <p style="margin:0 0 14px 0;">Tell us what your loved one needs help with. We’ll narrow the field to a few practical products, show what they cost, and explain whether Medicare may cover that type of equipment. Curated for families heading home after rehab, hospitalization, or a change in care needs. Not a catalog.</p>
      <p style="margin:0 0 14px 0;">${escapeHtml(AFTER_CARE_PAGE_DISCLOSURE)}</p>
      ${needsHtml}
      <section style="margin-top:28px;">
        <h2 style="font-size:22px;margin:0 0 8px 0;">Need hands-on help at home too?</h2>
        <p style="margin:0 0 8px 0;">Illustrative part-time private-pay support: $2,000–$3,200 per month. Local rates vary.</p>
        <p style="margin:0;"><a href="/home-health">Estimate caregiver support</a></p>
      </section>
    </main>`;
}
