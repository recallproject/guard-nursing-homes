/**
 * Compare Brief checkout helpers.
 *
 * Unlike the $29 Facility Brief (Stripe Payment Link + one CCN in
 * client_reference_id), Compare Brief creates a Checkout Session so
 * metadata can carry every CCN in the 2–3 home set.
 */

import {
  COMPARE_BRIEF_PRODUCT,
  comparingTitle,
  normalizeCompareCcns,
  selectCompareBriefOffer,
  selectCompareBriefPriceId,
  serializeCompareCcns,
} from './compareBriefPricing.js';

export {
  COMPARE_BRIEF_PRODUCT,
  comparingTitle,
  normalizeCompareCcns,
  selectCompareBriefOffer,
  selectCompareBriefPriceId,
  serializeCompareCcns,
};

export const COMPARE_BRIEF_SUCCESS_PATH = '/compare-brief-success';
export const COMPARE_BRIEF_DOWNLOAD_PATH = '/compare-brief-download';
export const PENDING_COMPARE_BRIEF_KEY = 'pending_compare_brief';

export function isCompareBriefProduct(value) {
  return String(value || '').trim() === COMPARE_BRIEF_PRODUCT;
}

/**
 * Fields written onto the Stripe Checkout Session.
 * Tests lock metadata.ccns + client_reference_id to the full compare set.
 */
export function buildCompareBriefSessionFields(ccns, options = {}) {
  const normalized = normalizeCompareCcns(ccns);
  const offer = selectCompareBriefOffer(normalized.length);
  if (!offer) return null;

  const siteUrl = String(options.siteUrl || 'https://www.oversightreports.com').replace(/\/$/, '');
  const serialized = serializeCompareCcns(normalized);
  const priceId = options.priceId || selectCompareBriefPriceId(normalized.length, options.env || {});

  return {
    mode: 'payment',
    client_reference_id: serialized,
    metadata: {
      product: COMPARE_BRIEF_PRODUCT,
      ccns: serialized,
      ccn_count: String(normalized.length),
      price_usd: String(offer.priceUsd),
    },
    line_items: priceId ? [{ price: priceId, quantity: 1 }] : [],
    success_url: `${siteUrl}${COMPARE_BRIEF_SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/watchlist?compare=1&ccns=${encodeURIComponent(serialized)}`,
    offer,
    ccns: normalized,
  };
}

export function parseCompareCcnsFromSession(session) {
  const meta = session?.metadata || {};
  if (isCompareBriefProduct(meta.product) && meta.ccns) {
    return normalizeCompareCcns(meta.ccns);
  }
  const fromRef = normalizeCompareCcns(session?.client_reference_id);
  if (fromRef.length >= 2) return fromRef;
  if (meta.ccns) return normalizeCompareCcns(meta.ccns);
  return [];
}

export function isCompareBriefSession(session) {
  if (isCompareBriefProduct(session?.metadata?.product)) return true;
  return parseCompareCcnsFromSession(session).length >= 2;
}

export function compareBriefCheckoutRequestBody(ccns) {
  const normalized = normalizeCompareCcns(ccns);
  return { ccns: normalized, product: COMPARE_BRIEF_PRODUCT };
}
