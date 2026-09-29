import { buildSingleReportCheckoutUrl, isValidFacilityCcn, normalizeFacilityCcn } from './facilityBriefCheckout.js';
import {
  buildCompareBriefCheckoutUrl,
  compareBriefOfferForCcns,
  compareBriefPaymentLink,
  parseCompareCcnList,
} from './compareBriefOffer.js';
import { trackCheckoutStarted } from './analytics.js';

/**
 * Stripe Payment Links (LIVE)
 *
 * IMPORTANT — MANUAL SETUP REQUIRED FOR SECURE PAYMENT VERIFICATION:
 *
 * Each Payment Link below must be configured in Stripe Dashboard with:
 *
 * 1. Success URL including {CHECKOUT_SESSION_ID}:
 *    - Subscription links: https://www.oversightreports.com/success?session_id={CHECKOUT_SESSION_ID}
 *    - Single report link: https://www.oversightreports.com/evidence-success?session_id={CHECKOUT_SESSION_ID}
 *    - Compare Brief links ($49 / $69): same evidence-success URL
 *
 * Compare Brief Payment Links are not hardcoded. Set these at build time:
 *    VITE_STRIPE_COMPARE_BRIEF_2_LINK  ($49, 2 homes)
 *    VITE_STRIPE_COMPARE_BRIEF_3_LINK  ($69, 3 homes)
 * Optional server checks (runtime):
 *    STRIPE_COMPARE_BRIEF_2_PRICE_ID / STRIPE_COMPARE_BRIEF_3_PRICE_ID
 *    STRIPE_COMPARE_BRIEF_2_LINK_ID / STRIPE_COMPARE_BRIEF_3_LINK_ID
 * Fulfillment rejects a payment whose amount_subtotal is not 4900 or 6900
 * cents for the CCN count on client_reference_id.
 *
 * 2. Metadata on each subscription Payment Link:
 *    - Key: "tier"  Value: "pro" (for Pro links) or "professional" (for Professional links)
 *
 * Without {CHECKOUT_SESSION_ID} in the success URL, the payment verification
 * falls back to the insecure localStorage-based flow. The session_id is what
 * allows the server to verify with Stripe that payment actually occurred.
 *
 * To update: Stripe Dashboard > Payment Links > [link] > After payment > Success page URL
 */
const PAYMENT_LINKS = {
  pro_monthly: 'https://buy.stripe.com/aFacN54V26yhca05pt0x203',
  pro_annual: 'https://buy.stripe.com/eVq7sLdry2i12zq5pt0x202',
  professional_monthly: 'https://buy.stripe.com/7sY3cv2MU3m54Hy2dh0x200',
  professional_annual: 'https://buy.stripe.com/aFa14ncnu4q96PG6tx0x201',
};

// Map price keys to subscription tiers
const PRICE_TO_TIER = {
  pro_monthly: 'pro',
  pro_annual: 'pro',
  professional_monthly: 'professional',
  professional_annual: 'professional',
};

// Monthly amounts match the prices shown in getTierInfo. Annual Payment Links
// have no dollar amount in this repo, so those events omit price.
const SUBSCRIPTION_PRICE = {
  pro_monthly: 14,
  professional_monthly: 59,
};

/**
 * Redirect to Stripe Payment Link for a subscription.
 * Not wired from the pricing page today; still tracked if a caller uses it.
 * @param {'pro_monthly'|'pro_annual'|'professional_monthly'|'professional_annual'} priceKey
 * @param {{ placement?: string }} [options]
 */
export async function checkout(priceKey, { placement = 'subscription' } = {}) {
  const url = PAYMENT_LINKS[priceKey];
  if (!url) {
    alert('Payment is not yet configured. Please check back soon.');
    return;
  }
  // Store the tier they're purchasing so success page can activate it
  const tier = PRICE_TO_TIER[priceKey] || 'pro';
  localStorage.setItem('pending_tier', tier);
  // Stripe Payment Links don't support dynamic success URLs,
  // so we store the pending tier in localStorage before redirect.
  // The success page (configured in Stripe dashboard) reads it.
  try {
    await trackCheckoutStarted({
      product: priceKey,
      price: SUBSCRIPTION_PRICE[priceKey],
      placement,
    });
  } catch {
    // Checkout must proceed even if analytics fails.
  }
  window.location.href = url;
}

// Single report purchase — $29 one-time
const SINGLE_REPORT_LINK = 'https://buy.stripe.com/00wfZh5Z63m53DubNR0x204';

// Ask a Clinician — $49 one-time
const CLINICIAN_REPORT_LINK = 'https://buy.stripe.com/28EaEX1IQ4q92zqbNR0x205';

/**
 * Redirect to Stripe for a Facility Brief purchase.
 *
 * CCN is attached as Stripe `client_reference_id` so /evidence-success can
 * recover it from the paid Checkout Session. localStorage is only a helper
 * and fails across www vs apex (different origins).
 *
 * @param {string} ccn - Facility CCN for post-payment PDF delivery
 * @param {{ placement?: string }} [options]
 */
export async function checkoutSingleReport(ccn, { placement = 'facility-brief' } = {}) {
  if (!SINGLE_REPORT_LINK) {
    alert('Single report purchase is coming soon. Subscribe to Professional for immediate access.');
    return;
  }

  const normalized = normalizeFacilityCcn(ccn);
  if (!isValidFacilityCcn(normalized)) {
    alert('This facility is missing a valid CMS ID, so checkout cannot start. Please try another facility or contact support.');
    return;
  }

  const checkoutUrl = buildSingleReportCheckoutUrl(SINGLE_REPORT_LINK, normalized);
  if (!checkoutUrl) {
    alert('Checkout could not be started. Please contact support.');
    return;
  }

  // Optional helper for same-origin returns. Not required for fulfillment.
  try {
    localStorage.setItem('pending_single_report', normalized);
    localStorage.removeItem('pending_compare_ccns');
  } catch {
    // Private mode / storage blocked — Stripe session still has the CCN.
  }

  try {
    await trackCheckoutStarted({
      product: 'facility_brief',
      price: 29,
      ccn: normalized,
      placement,
    });
  } catch {
    // Checkout must proceed even if analytics fails.
  }
  window.location.href = checkoutUrl;
}

/**
 * Redirect to Stripe for one combined Compare Brief ($49 for 2 homes, $69 for 3).
 * CCNs are sent as a comma-separated client_reference_id, in tray order.
 * Does not start checkout when the Payment Link env var is missing.
 *
 * @param {string[]} ccns
 * @param {{ placement?: string }} [options]
 */
export async function checkoutCompareBrief(ccns, { placement = 'watchlist-compare' } = {}) {
  const list = parseCompareCcnList(ccns);
  const offer = compareBriefOfferForCcns(list);
  if (!offer) {
    alert('A Compare Brief is for 2 or 3 homes. Add homes to compare, or download the free comparison.');
    return;
  }

  const checkoutUrl = buildCompareBriefCheckoutUrl(compareBriefPaymentLink(list.length), list);
  if (!checkoutUrl) {
    alert('Compare Brief checkout is not set up yet. You can still download the free comparison. If you already paid, email contact@oversightreports.com.');
    return;
  }

  try {
    localStorage.setItem('pending_compare_ccns', list.join(','));
    localStorage.removeItem('pending_single_report');
  } catch {
    // Private mode / storage blocked — Stripe session still has the CCN list.
  }

  try {
    await trackCheckoutStarted({
      product: offer.product,
      price: offer.price,
      ccns: list,
      homeCount: list.length,
      placement,
    });
  } catch {
    // Checkout must proceed even if analytics fails.
  }
  window.location.href = checkoutUrl;
}

/**
 * Redirect to Stripe for Ask a Clinician report
 * @param {string} email - Customer email to prefill
 * @param {{ placement?: string }} [options]
 */
export async function checkoutClinicianReport(email, { placement = 'ask-a-clinician' } = {}) {
  const url = email
    ? `${CLINICIAN_REPORT_LINK}?prefilled_email=${encodeURIComponent(email)}`
    : CLINICIAN_REPORT_LINK;
  try {
    await trackCheckoutStarted({
      product: 'clinician_report',
      price: 49,
      placement,
    });
  } catch {
    // Checkout must proceed even if analytics fails.
  }
  window.location.href = url;
}

export { PAYMENT_LINKS };
