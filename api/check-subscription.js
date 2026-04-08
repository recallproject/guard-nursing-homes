/**
 * Check Subscription Status
 *
 * SECURITY MODEL:
 * Reads the signed httpOnly cookie set by verify-subscription.js.
 * Verifies the HMAC signature to ensure the cookie wasn't tampered with.
 * Checks expiry to ensure the subscription period hasn't lapsed.
 *
 * This is what the frontend calls on mount to determine if the user
 * has an active subscription. The cookie is httpOnly so JavaScript
 * can't read it directly — this API is the only way to check.
 *
 * ENV VARS REQUIRED:
 * - SUBSCRIPTION_SECRET (or EVIDENCE_SECRET as fallback)
 */

import crypto from 'crypto';

const COOKIE_SECRET = process.env.SUBSCRIPTION_SECRET || process.env.EVIDENCE_SECRET;
const VALID_TIERS = new Set(['pro', 'professional', 'institutional']);

/**
 * Parse cookies from the Cookie header.
 * Vercel doesn't always parse cookies automatically.
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((pair) => {
    const [name, ...rest] = pair.trim().split('=');
    if (name) cookies[name] = rest.join('=');
  });
  return cookies;
}

/**
 * Verify the signed cookie value.
 * Returns the parsed payload if valid, null if invalid.
 */
function verifyCookie(signedValue) {
  if (!signedValue || typeof signedValue !== 'string') return null;

  const parts = signedValue.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', COOKIE_SECRET)
    .update(encodedPayload)
    .digest('hex');

  // Timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;
  } catch {
    return null;
  }

  // Decode and parse the payload
  try {
    const json = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!COOKIE_SECRET) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Parse the subscription cookie
  const cookies = parseCookies(req.headers.cookie);
  const signedValue = cookies['oversight_sub'];

  if (!signedValue) {
    return res.status(200).json({ active: false, reason: 'no_cookie' });
  }

  const data = verifyCookie(signedValue);

  if (!data) {
    // Cookie exists but signature is invalid — possible tampering
    return res.status(200).json({ active: false, reason: 'invalid_signature' });
  }

  // Check if the tier is valid
  if (!data.tier || !VALID_TIERS.has(data.tier)) {
    return res.status(200).json({ active: false, reason: 'invalid_tier' });
  }

  // Check expiry
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
    // Cookie has expired — clear it
    res.setHeader('Set-Cookie', [
      'oversight_sub=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0',
    ]);
    return res.status(200).json({ active: false, reason: 'expired' });
  }

  return res.status(200).json({
    active: true,
    tier: data.tier,
    expiresAt: data.expiresAt,
  });
}
