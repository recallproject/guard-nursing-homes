// Stripe Payment Links (test mode)
const PAYMENT_LINKS = {
  pro_monthly: 'https://buy.stripe.com/test_14A28k04nds52I14iKb7y03',
  pro_annual: 'https://buy.stripe.com/test_bJe5kwdVd4Vz5Ud3eGb7y02',
  professional_monthly: 'https://buy.stripe.com/test_28EbIU5oH3RvgyR8z0b7y00',
  professional_annual: 'https://buy.stripe.com/test_3cI7sE2cvco12I16qSb7y01',
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
  window.location.href = url;
}

export { PAYMENT_LINKS };
