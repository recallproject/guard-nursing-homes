import crypto from 'crypto';

const EVIDENCE_SECRET = process.env.EVIDENCE_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!EVIDENCE_SECRET) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { token, ccn } = req.body || {};

  if (!token || !ccn) {
    return res.status(400).json({ valid: false, error: 'Missing token or CCN' });
  }

  // Token format: base64url(ccn:expiry).hmac_signature
  const parts = token.split('.');
  if (parts.length !== 2) {
    return res.status(400).json({ valid: false, error: 'Invalid token format' });
  }

  const [encodedPayload, signature] = parts;

  let payload;
  try {
    payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
  } catch {
    return res.status(400).json({ valid: false, error: 'Invalid token encoding' });
  }

  const [tokenCcn, expiryStr] = payload.split(':');
  const expiry = parseInt(expiryStr, 10);

  // Verify CCN matches
  if (tokenCcn !== ccn) {
    return res.status(403).json({ valid: false, error: 'Token does not match facility' });
  }

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', EVIDENCE_SECRET)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
    return res.status(403).json({ valid: false, error: 'Invalid token signature' });
  }

  // Check expiry
  if (Date.now() > expiry) {
    return res.status(403).json({ valid: false, error: 'Token has expired' });
  }

  return res.status(200).json({ valid: true, ccn: tokenCcn });
}
