// Stripe Payment Links (LIVE)
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

/**
 * Redirect to Stripe Payment Link for a subscription
 * @param {'pro_monthly'|'pro_annual'|'professional_monthly'|'professional_annual'} priceKey
 */
export function checkout(priceKey) {
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
  window.location.href = url;
}

// Single report purchase — $29 one-time
const SINGLE_REPORT_LINK = 'https://buy.stripe.com/00wfZh5Z63m53DubNR0x204';

/**
 * Redirect to Stripe for a single evidence report purchase
 * @param {string} ccn - Facility CCN to store for post-payment PDF delivery
 */
export function checkoutSingleReport(ccn) {
  if (!SINGLE_REPORT_LINK) {
    alert('Single report purchase is coming soon. Subscribe to Professional for immediate access.');
    return;
  }
  localStorage.setItem('pending_tier', 'professional');
  localStorage.setItem('pending_single_report', ccn);
  window.location.href = SINGLE_REPORT_LINK;
}

export { PAYMENT_LINKS };
