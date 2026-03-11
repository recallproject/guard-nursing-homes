import crypto from 'crypto';

const EVIDENCE_SECRET = process.env.EVIDENCE_SECRET;
const SITE_URL = process.env.SITE_URL || 'https://oversightreports.com';
const FORMSPREE_ID = process.env.FORMSPREE_ID || '';

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

  const { ccn } = req.body || {};

  if (!ccn || typeof ccn !== 'string' || !/^\d{6}$/.test(ccn)) {
    return res.status(400).json({ error: 'Invalid facility CCN' });
  }

  const { token } = generateToken(ccn);
  const downloadUrl = `${SITE_URL}/evidence-download?token=${token}&ccn=${ccn}`;

  // Notify Rob via Formspree that a report was purchased
  if (FORMSPREE_ID) {
    fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _subject: `Evidence Report Purchase — ${ccn}`,
        message: `Someone purchased evidence report for CCN ${ccn}`,
      }),
    }).catch(() => {});
  }

  return res.status(200).json({
    success: true,
    downloadUrl,
  });
}
