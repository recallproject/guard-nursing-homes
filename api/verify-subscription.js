/**
 * Verify Subscription Payment
 *
 * SECURITY MODEL:
 * Called after Stripe redirects the user to /success?session_id=cs_xxx.
 * This endpoint:
 * 1. Calls Stripe API to verify the checkout session is actually paid
 * 2. Extracts the subscription tier from session metadata
 * 3. Sets a signed httpOnly cookie as the server-side source of truth
 * 4. Returns the tier info so the frontend can cache it in localStorage
 *
 * The signed cookie is what check-subscription.js reads to gate features.
 * localStorage is just a UI convenience — it cannot grant access.
 *
 * ENV VARS REQUIRED:
 * - STRIPE_SECRET_KEY: Stripe secret key
 * - SUBSCRIPTION_SECRET: Secret for signing the subscription cookie
 *   (falls back to EVIDENCE_SECRET if not set)
 *
 * STRIPE PAYMENT LINK SETUP (MANUAL STEP):
 * In Stripe Dashboard, each subscription Payment Link must:
 * 1. Have metadata key "tier" set to "pro" or "professional"
 * 2. Have the success URL set to:
 *    https://www.oversightreports.com/success?session_id={CHECKOUT_SESSION_ID}
 *    (Stripe replaces {CHECKOUT_SESSION_ID} with the actual session ID)
 */

import Stripe from 'stripe';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const COOKIE_SECRET = process.env.SUBSCRIPTION_SECRET || process.env.EVIDENCE_SECRET;

// Valid tiers — reject anything else
const VALID_TIERS = new Set(['pro', 'professional', 'institutional']);

/**
 * Sign subscription data into a tamper-proof cookie value.
 * Format: base64url(JSON payload).HMAC-SHA256 signature
 */
function signCookie(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', COOKIE_SECRET)
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY || !COOKIE_SECRET) {
    console.error('Missing STRIPE_SECRET_KEY or SUBSCRIPTION_SECRET');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { checkout_session_id } = req.body || {};

  if (!checkout_session_id || typeof checkout_session_id !== 'string') {
    return res.status(400).json({ verified: false, error: 'Missing checkout_session_id' });
  }

  // Basic format check — Stripe session IDs start with cs_
  if (!checkout_session_id.startsWith('cs_')) {
    return res.status(400).json({ verified: false, error: 'Invalid session ID format' });
  }

  try {
    // Fetch the checkout session from Stripe — this is the source of truth
    const session = await stripe.checkout.sessions.retrieve(checkout_session_id);

    // Verify this is a completed subscription checkout
    if (session.payment_status !== 'paid') {
      return res.status(402).json({
        verified: false,
        error: 'Payment not completed',
      });
    }

    if (session.mode !== 'subscription') {
      return res.status(400).json({
        verified: false,
        error: 'Not a subscription checkout',
      });
    }

    // Extract tier from session metadata (set on the Payment Link in Stripe Dashboard)
    // Falls back to line_items price metadata if session metadata is empty
    let tier = session.metadata?.tier;

    if (!tier || !VALID_TIERS.has(tier)) {
      // Try to get tier from the subscription's price metadata
      try {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = subscription.items.data[0]?.price?.id;
        if (priceId) {
          const price = await stripe.prices.retrieve(priceId);
          tier = price.metadata?.tier;
        }
      } catch {
        // Subscription lookup failed — continue with what we have
      }
    }

    // Final fallback: default to 'pro' if no tier metadata found
    if (!tier || !VALID_TIERS.has(tier)) {
      console.warn(`No valid tier metadata on session ${checkout_session_id}, defaulting to pro`);
      tier = 'pro';
    }

    // Subscription expiry: 30 days from now (cookie expiry, not billing expiry).
    // The cookie will need to be refreshed — check-subscription.js handles validation.
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const cookieData = {
      tier,
      email: session.customer_details?.email || '',
      stripeCustomerId: session.customer || '',
      subscriptionId: session.subscription || '',
      expiresAt,
      issuedAt: new Date().toISOString(),
    };

    const signedValue = signCookie(cookieData);

    // Set httpOnly cookie — not accessible via JavaScript, only sent to /api/ routes
    // SameSite=Lax allows the cookie to be sent on top-level navigations (redirects from Stripe)
    res.setHeader('Set-Cookie', [
      `oversight_sub=${signedValue}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=${30 * 24 * 60 * 60}`,
    ]);

    return res.status(200).json({
      verified: true,
      tier,
      expiresAt,
    });
  } catch (err) {
    console.error('Stripe session verification failed:', err.message);

    // Don't expose Stripe error details to the client
    if (err.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ verified: false, error: 'Invalid checkout session' });
    }

    return res.status(500).json({ verified: false, error: 'Verification failed' });
  }
}
