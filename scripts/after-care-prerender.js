/**
 * Crawlable After Care HTML for generate-seo-pages.js.
 * Replaces the homepage shell inside <div id="root"> on /after-care.
 */

import {
  AFTER_CARE_DISCLOSURE,
  AFTER_CARE_NEEDS,
  AFTER_CARE_PRIMARY_CTA,
  AFTER_CARE_PRODUCTS,
  AFTER_CARE_SECONDARY_CTA,
  MEDICARE_BADGE_LABEL,
  productsForNeed,
} from '../src/data/afterCare.js';

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function productArticle(product, index) {
  const badge = MEDICARE_BADGE_LABEL[product.medicareStatus] || '';
  const role = index === 0 ? 'Start here' : 'Other option';
  return `
        <article>
          <p style="margin:0 0 8px 0;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#0f766e;">${escapeHtml(role)}</p>
          <img src="${escapeAttr(product.image)}" alt="${escapeAttr(product.imageAlt)}" width="240" height="240" />
          <h3 style="font-size:22px;margin:12px 0 8px 0;">${escapeHtml(product.title)}</h3>
          <p style="margin:0 0 8px 0;">${escapeHtml(product.whyPicked)}</p>
          <p style="margin:0 0 8px 0;">Best for: ${escapeHtml(product.bestFor)}</p>
          ${product.typicalPriceLabel ? `<p style="margin:0 0 8px 0;">Typical price: ${escapeHtml(product.typicalPriceLabel)}</p>` : ''}
          <p style="margin:0 0 8px 0;">${escapeHtml(badge)}</p>
          <p style="margin:0 0 8px 0;"><a href="${escapeAttr(product.affiliateUrl)}" rel="noopener noreferrer sponsored">${escapeHtml(AFTER_CARE_PRIMARY_CTA)}</a></p>
          <p style="margin:0;"><a href="${escapeAttr(product.coverageUrl)}" rel="noopener noreferrer">${escapeHtml(AFTER_CARE_SECONDARY_CTA)}</a></p>
        </article>`;
}

export function afterCareBodyContent() {
  const needsHtml = AFTER_CARE_NEEDS.map((need) => {
    const products = productsForNeed(need.id);
    const cards = products.map((product, index) => productArticle(product, index)).join('');
    return `
      <section style="margin-top:28px;">
        <h2 style="font-size:20px;margin:0 0 12px 0;">
          <a href="/after-care?need=${encodeURIComponent(need.id)}">${escapeHtml(need.label)}</a>
        </h2>
        ${cards}
      </section>`;
  }).join('');

  const titles = AFTER_CARE_PRODUCTS.map((product) => product.title);

  return `
    <main style="font-family:Plus Jakarta Sans,system-ui,sans-serif;max-width:800px;margin:0 auto;padding:32px 24px;color:#0f172a;line-height:1.6;">
      <p style="font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#0d9488;margin:0 0 8px 0;">After care</p>
      <h1 style="font-size:2rem;line-height:1.15;margin:0 0 12px 0;">What does your loved one need help with?</h1>
      <p style="margin:0 0 14px 0;">Choose the task that’s hardest right now. You’ll see a few options for heading home, not a catalog. These are general setup ideas, not a clinical assessment.</p>
      <p style="margin:0 0 14px 0;">${escapeHtml(AFTER_CARE_DISCLOSURE)}</p>
      <p style="margin:0;">Home setup options: ${escapeHtml(titles.join(', '))}.</p>
      ${needsHtml}
    </main>`;
}
