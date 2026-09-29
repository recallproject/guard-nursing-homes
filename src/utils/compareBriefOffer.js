/**
 * Compare Brief launch SKUs.
 *
 * One combined PDF for the homes on the compare tray:
 *   compare_brief_2 — $49
 *   compare_brief_3 — $69
 *
 * The $29 Facility Brief stays a separate single-home product.
 * Prices are launch hypotheses, not a claim that willingness to pay is proven.
 */

export const COMPARE_BRIEF_SAMPLE_CCNS = ['195381', '195180', '195312'];

export const COMPARE_BRIEF_OFFERS = {
  2: { count: 2, product: 'compare_brief_2', price: 49, cents: 4900 },
  3: { count: 3, product: 'compare_brief_3', price: 69, cents: 6900 },
};

const CCN_RE = /^\d{6}$/;

export function normalizeFacilityCcn(value) {
  if (value == null) return '';
  return String(value).trim();
}

/**
 * Parse a compare set. Returns [] for a single CCN, a bad id, duplicates, or 4+ homes.
 * Order is preserved (tray order), not sorted.
 * @param {string|string[]|null|undefined} value
 * @returns {string[]}
 */
export function parseCompareCcnList(value) {
  const parts = Array.isArray(value)
    ? value.map(normalizeFacilityCcn).filter(Boolean)
    : String(value == null ? '' : value)
      .split(/[,\s]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  if (parts.length < 2 || parts.length > 3) return [];
  if (!parts.every((part) => CCN_RE.test(part))) return [];
  if (new Set(parts).size !== parts.length) return [];
  return parts;
}

export function compareBriefOfferForCount(count) {
  return COMPARE_BRIEF_OFFERS[count] || null;
}

export function compareBriefOfferForCcns(ccns) {
  const list = Array.isArray(ccns) && ccns.every((part) => CCN_RE.test(normalizeFacilityCcn(part)))
    ? ccns.map(normalizeFacilityCcn)
    : parseCompareCcnList(ccns);
  return compareBriefOfferForCount(list.length);
}

export function isCompareBriefProduct(product) {
  return product === 'compare_brief_2' || product === 'compare_brief_3';
}

/**
 * Payment Link URL for a SKU. Client builds must set:
 *   VITE_STRIPE_COMPARE_BRIEF_2_LINK
 *   VITE_STRIPE_COMPARE_BRIEF_3_LINK
 * Pass `env` in tests. Defaults to Vite's import.meta.env in the app.
 */
export function compareBriefPaymentLink(count, env) {
  const source = env ?? import.meta.env ?? {};
  if (count === 2) return source.VITE_STRIPE_COMPARE_BRIEF_2_LINK || '';
  if (count === 3) return source.VITE_STRIPE_COMPARE_BRIEF_3_LINK || '';
  return '';
}

/**
 * Stripe copies client_reference_id onto the Checkout Session.
 * Compare sessions use a comma-separated CCN list. A single 6-digit id stays the Facility Brief.
 */
export function buildCompareBriefCheckoutUrl(paymentLink, ccns) {
  const list = Array.isArray(ccns) ? parseCompareCcnList(ccns) : parseCompareCcnList(ccns);
  const offer = compareBriefOfferForCcns(list);
  if (!paymentLink || !offer) return '';
  let url;
  try {
    url = new URL(paymentLink);
  } catch {
    return '';
  }
  url.searchParams.set('client_reference_id', list.join(','));
  return url.toString();
}

function lineItemPriceIds(session) {
  const raw = session?.line_items?.data || session?.line_items;
  const items = Array.isArray(raw) ? raw : [];
  return items.map((item) => item?.price?.id).filter(Boolean);
}

/**
 * Cents actually charged before tax when Stripe sends amount_subtotal.
 * Falls back to amount_total for older session payloads.
 */
export function paidAmountCents(session) {
  if (typeof session?.amount_subtotal === 'number') return session.amount_subtotal;
  if (typeof session?.amount_total === 'number') return session.amount_total;
  return null;
}

/**
 * A $29 Facility Brief payment must not unlock a Compare Brief, and a 2-home
 * payment must not unlock 3 homes. Optional env checks (set by Robert):
 *   STRIPE_COMPARE_BRIEF_2_PRICE_ID / STRIPE_COMPARE_BRIEF_3_PRICE_ID
 *   STRIPE_COMPARE_BRIEF_2_LINK_ID / STRIPE_COMPARE_BRIEF_3_LINK_ID
 *
 * @returns {{ ok: true, offer: object, ccns: string[] } | { error: string, status: number }}
 */
export function assertCompareBriefPayment(session, ccns, env = {}) {
  const list = parseCompareCcnList(ccns);
  const offer = compareBriefOfferForCcns(list);
  if (!offer) {
    return { error: 'Compare Brief requires 2 or 3 facilities.', status: 400 };
  }
  if (!session || session.payment_status !== 'paid') {
    return {
      error: 'Payment not completed. Please complete checkout first.',
      status: 402,
    };
  }
  if (session.mode !== 'payment') {
    return { error: 'Invalid checkout type for Compare Brief', status: 400 };
  }
  if (session.currency && String(session.currency).toLowerCase() !== 'usd') {
    return { error: 'Compare Brief payments must be in USD.', status: 400 };
  }
  const cents = paidAmountCents(session);
  if (cents !== offer.cents) {
    return {
      error: `This payment does not match the Compare Brief price ($${offer.price} for ${offer.count} homes).`,
      status: 402,
    };
  }

  const priceKey = offer.count === 2
    ? 'STRIPE_COMPARE_BRIEF_2_PRICE_ID'
    : 'STRIPE_COMPARE_BRIEF_3_PRICE_ID';
  const expectedPrice = env?.[priceKey];
  if (expectedPrice) {
    const priceIds = lineItemPriceIds(session);
    if (priceIds.length && !priceIds.includes(expectedPrice)) {
      return { error: 'This payment does not match the Compare Brief price.', status: 402 };
    }
  }

  const linkKey = offer.count === 2
    ? 'STRIPE_COMPARE_BRIEF_2_LINK_ID'
    : 'STRIPE_COMPARE_BRIEF_3_LINK_ID';
  const expectedLink = env?.[linkKey];
  if (expectedLink && session.payment_link && session.payment_link !== expectedLink) {
    return { error: 'This payment does not match the Compare Brief payment link.', status: 402 };
  }

  return { ok: true, offer, ccns: list };
}

/**
 * CCNs for a Compare Brief, preferring the paid Checkout Session.
 * A single-facility client_reference_id returns [] so the $29 path stays unchanged.
 * Client-supplied CCNs are ignored when the session already has an id, so a paid
 * session cannot be reused for a different set of homes.
 */
export function resolveCompareCcns(session, requested) {
  const fromRef = parseCompareCcnList(session?.client_reference_id);
  if (fromRef.length) return fromRef;

  const fromMeta = parseCompareCcnList(session?.metadata?.ccns);
  if (fromMeta.length) return fromMeta;

  const attached = String(session?.client_reference_id || session?.metadata?.ccn || session?.metadata?.ccns || '').trim();
  if (attached) return [];

  return parseCompareCcnList(requested);
}
