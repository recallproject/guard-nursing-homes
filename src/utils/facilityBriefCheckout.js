/**
 * Facility Brief checkout helpers.
 *
 * Stripe Payment Links persist `client_reference_id` on the Checkout Session.
 * That is the durable CCN — not localStorage, which is origin-scoped
 * (www vs apex) and can be cleared by browsers.
 *
 * @see https://docs.stripe.com/payment-links/url-parameters
 */

export const FACILITY_CCN_RE = /^\d{6}$/;

export function normalizeFacilityCcn(value) {
  if (value == null) return '';
  return String(value).trim();
}

export function isValidFacilityCcn(value) {
  return FACILITY_CCN_RE.test(normalizeFacilityCcn(value));
}

/**
 * Append the facility CCN to a Stripe Payment Link as client_reference_id.
 * Stripe copies this onto the resulting Checkout Session.
 */
export function buildSingleReportCheckoutUrl(paymentLink, ccn) {
  const normalized = normalizeFacilityCcn(ccn);
  if (!paymentLink || !isValidFacilityCcn(normalized)) return '';
  const url = new URL(paymentLink);
  url.searchParams.set('client_reference_id', normalized);
  return url.toString();
}
