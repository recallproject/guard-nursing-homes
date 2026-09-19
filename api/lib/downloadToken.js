/**
 * HMAC download tokens for paid PDFs.
 *
 * Facility Brief:  payload = "{ccn}:{expiry}"
 * Compare Brief:   payload = "cb:{ccn},{ccn}[,{ccn}]:{expiry}"
 */

import crypto from 'crypto';

const TTL_MS = 72 * 60 * 60 * 1000;

export function signPayload(payloadBody, secret, now = Date.now()) {
  const expiry = now + TTL_MS;
  const payload = `${payloadBody}:${expiry}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const token = Buffer.from(payload).toString('base64url') + '.' + signature;
  return { token, expiry, payload };
}

export function generateFacilityBriefToken(ccn, secret, now) {
  return signPayload(String(ccn), secret, now);
}

export function generateCompareBriefToken(ccns, secret, now) {
  return signPayload(`cb:${ccns.join(',')}`, secret, now);
}

export function readSignedToken(token, secret) {
  if (!token || !secret) {
    return { error: 'Missing token or secret', status: 400 };
  }
  const parts = String(token).split('.');
  if (parts.length !== 2) {
    return { error: 'Invalid token format', status: 400, valid: false };
  }
  const [encodedPayload, signature] = parts;
  let payload;
  try {
    payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
  } catch {
    return { error: 'Invalid token encoding', status: 400, valid: false };
  }

  const lastColon = payload.lastIndexOf(':');
  if (lastColon < 0) {
    return { error: 'Invalid token payload', status: 400, valid: false };
  }
  const body = payload.slice(0, lastColon);
  const expiry = parseInt(payload.slice(lastColon + 1), 10);

  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      return { error: 'Invalid token signature', status: 403, valid: false };
    }
  } catch {
    return { error: 'Invalid token signature', status: 403, valid: false };
  }

  if (Date.now() > expiry) {
    return { error: 'Token has expired', status: 403, valid: false };
  }

  if (body.startsWith('cb:')) {
    const ccns = body.slice(3).split(',').filter(Boolean);
    return { valid: true, product: 'compare_brief', ccns, expiry };
  }

  return { valid: true, product: 'facility_brief', ccn: body, expiry };
}
