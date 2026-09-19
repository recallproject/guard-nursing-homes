/**
 * Create a Stripe Checkout Session for the paid Compare Brief.
 *
 * ENV VARS (set in Vercel after creating Prices in Stripe Dashboard):
 * - STRIPE_SECRET_KEY
 * - STRIPE_PRICE_COMPARE_2   ($49, 2 homes)  — or VITE_STRIPE_PRICE_COMPARE_2
 * - STRIPE_PRICE_COMPARE_3   ($69, 3 homes)  — or VITE_STRIPE_PRICE_COMPARE_3
 * - SITE_URL (optional; defaults to https://www.oversightreports.com)
 */

import Stripe from 'stripe';
import { buildCompareBriefSessionFields } from '../src/utils/compareBriefCheckout.js';
import { normalizeCompareCcns, selectCompareBriefPriceId } from '../src/utils/compareBriefPricing.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const SITE_URL = process.env.SITE_URL || 'https://www.oversightreports.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ccns = normalizeCompareCcns(req.body?.ccns);
  const fields = buildCompareBriefSessionFields(ccns, {
    siteUrl: SITE_URL,
    env: process.env,
  });

  if (!fields) {
    return res.status(400).json({
      error: 'Compare Brief is available for 2 or 3 homes. Add another home to the compare tray.',
    });
  }

  const priceId = selectCompareBriefPriceId(fields.ccns.length, process.env);
  if (!priceId) {
    console.error('Compare Brief price ID is not configured for', fields.ccns.length, 'homes');
    return res.status(503).json({
      error: 'Compare Brief checkout is not configured yet. Please try again shortly or contact support.',
    });
  }

  if (!stripe) {
    console.error('STRIPE_SECRET_KEY is not configured — cannot start Compare Brief checkout');
    return res.status(500).json({ error: 'Payment is not configured' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: fields.success_url,
      cancel_url: fields.cancel_url,
      client_reference_id: fields.client_reference_id,
      metadata: fields.metadata,
      allow_promotion_codes: true,
    });

    if (!session?.url) {
      return res.status(500).json({ error: 'Checkout could not be started. Please contact support.' });
    }

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      ccns: fields.ccns,
      priceUsd: fields.offer.priceUsd,
    });
  } catch (err) {
    console.error('Compare Brief checkout session failed:', err.message);
    return res.status(500).json({ error: 'Checkout could not be started. Please contact support.' });
  }
}
