/**
 * Stripe Webhook Handler
 *
 * SECURITY MODEL:
 * This is the server-side source of truth for payment verification.
 * Stripe sends signed webhook events here after successful payments.
 * We verify the signature using STRIPE_WEBHOOK_SECRET to ensure
 * the event actually came from Stripe (not a spoofed request).
 *
 * For subscriptions: We don't persist state here (no DB). Instead,
 * the verify-subscription.js endpoint checks Stripe directly.
 * This webhook is here for future use (e.g., Vercel KV, email notifications,
 * cancellation handling) and as a receipt log.
 *
 * For single reports: Same — send-evidence.js verifies payment
 * directly with Stripe using the checkout session ID.
 *
 * ENV VARS REQUIRED:
 * - STRIPE_SECRET_KEY: Stripe secret key (sk_live_... or sk_test_...)
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret (whsec_...)
 *
 * SETUP:
 * 1. In Stripe Dashboard > Developers > Webhooks, add endpoint:
 *    https://www.oversightreports.com/api/stripe-webhook
 * 2. Select events: checkout.session.completed, customer.subscription.deleted
 * 3. Copy the signing secret to STRIPE_WEBHOOK_SECRET env var in Vercel
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Vercel serverless functions need raw body for signature verification.
// Export this config to disable Vercel's automatic body parsing.
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Read the raw request body as a Buffer.
 * Stripe webhook signature verification requires the raw body bytes,
 * not a parsed JSON object.
 */
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let event;
  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('Checkout completed:', {
        id: session.id,
        mode: session.mode,               // 'subscription' or 'payment'
        customer: session.customer,
        customerEmail: session.customer_email || session.customer_details?.email,
        paymentStatus: session.payment_status,
        metadata: session.metadata,
      });

      // For subscriptions: metadata.tier should be set on the Payment Link
      // in Stripe Dashboard (e.g., tier=professional)
      if (session.mode === 'subscription') {
        // Future: write to Vercel KV or database
        // For now, verify-subscription.js checks Stripe directly
        console.log('Subscription activated:', session.metadata?.tier || 'unknown tier');
      }

      // For one-time payments (evidence reports):
      // send-evidence.js verifies the session directly with Stripe
      if (session.mode === 'payment') {
        console.log('One-time payment received:', session.id);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      console.log('Subscription cancelled:', {
        id: subscription.id,
        customer: subscription.customer,
      });
      // Future: invalidate cached subscription state
      break;
    }

    default:
      console.log('Unhandled event type:', event.type);
  }

  // Always return 200 to acknowledge receipt — Stripe will retry on non-2xx
  return res.status(200).json({ received: true });
}
