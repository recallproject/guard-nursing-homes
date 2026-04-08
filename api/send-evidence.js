/**
 * Generate Evidence Report Download Link
 *
 * SECURITY MODEL:
 * Before generating an HMAC-signed download token, this endpoint verifies
 * that the user actually paid by checking the Stripe checkout session.
 *
 * Flow:
 * 1. User pays via Stripe Payment Link -> redirected to /evidence-success?session_id=cs_xxx&ccn=055559
 * 2. Frontend calls POST /api/send-evidence with { ccn, checkout_session_id }
 * 3. This endpoint calls Stripe API to verify payment_status === 'paid'
 * 4. Only then generates the HMAC download token
 * 5. The download token is verified by verify-token.js (unchanged)
 *
 * STRIPE PAYMENT LINK SETUP (MANUAL STEP):
 * The single-report Payment Link success URL must be set to:
 *   https://www.oversightreports.com/evidence-success?session_id={CHECKOUT_SESSION_ID}
 * The frontend appends &ccn=XXXXXX from localStorage before calling this API.
 *
 * ENV VARS REQUIRED:
 * - EVIDENCE_SECRET: For HMAC token generation (existing)
 * - STRIPE_SECRET_KEY: For verifying checkout sessions with Stripe
 */

import crypto from 'crypto';
import Stripe from 'stripe';

const EVIDENCE_SECRET = process.env.EVIDENCE_SECRET;
const SITE_URL = process.env.SITE_URL || 'https://www.oversightreports.com';
const FORMSPREE_ID = process.env.FORMSPREE_ID || '';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

function generateToken(ccn) {
  const expiry = Date.now() + 72 * 60 * 60 * 1000; // 72 hours
  const payload = `${ccn}:${expiry}`;
  const signature = crypto
    .createHmac('sha256', EVIDENCE_SECRET)
    .update(payload)
    .digest('hex');
  const token = Buffer.from(payload).toString('base64url') + '.' + signature;
  return { token, expiry };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!EVIDENCE_SECRET) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { ccn, checkout_session_id } = req.body || {};

  if (!ccn || typeof ccn !== 'string' || !/^\d{6}$/.test(ccn)) {
    return res.status(400).json({ error: 'Invalid facility CCN' });
  }

  // ── Payment verification ─────────────────────────────────────────
  // Require a Stripe checkout session ID and verify payment with Stripe.
  // This prevents anyone from getting a download link without paying.
  if (!checkout_session_id || typeof checkout_session_id !== 'string') {
    return res.status(400).json({ error: 'Missing checkout_session_id. Payment verification required.' });
  }

  if (!checkout_session_id.startsWith('cs_')) {
    return res.status(400).json({ error: 'Invalid session ID format' });
  }

  if (!stripe) {
    console.error('STRIPE_SECRET_KEY is not configured — cannot verify payment');
    return res.status(500).json({ error: 'Payment verification not configured' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(checkout_session_id);

    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Payment not completed. Please complete checkout first.' });
    }

    // Verify this is a one-time payment (not a subscription checkout used to bypass)
    if (session.mode !== 'payment') {
      return res.status(400).json({ error: 'Invalid checkout type for single report' });
    }
  } catch (err) {
    console.error('Stripe session verification failed:', err.message);
    if (err.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Invalid checkout session' });
    }
    return res.status(500).json({ error: 'Payment verification failed' });
  }
  // ── End payment verification ─────────────────────────────────────

  const { token } = generateToken(ccn);
  const downloadUrl = `${SITE_URL}/evidence-download?token=${token}&ccn=${ccn}`;

  // Notify Rob via Formspree that a report was purchased (verified)
  if (FORMSPREE_ID) {
    fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _subject: `Evidence Report Purchase — ${ccn}`,
        message: `Verified purchase (session: ${checkout_session_id}) for CCN ${ccn}`,
      }),
    }).catch(() => {});
  }

  return res.status(200).json({
    success: true,
    downloadUrl,
  });
}
