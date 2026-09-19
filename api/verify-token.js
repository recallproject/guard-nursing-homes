import { readSignedToken } from './lib/downloadToken.js';
import { normalizeCompareCcns } from './lib/resolveCompareBrief.js';
import { normalizeFacilityCcn } from './lib/resolveFacilityCcn.js';

const EVIDENCE_SECRET = process.env.EVIDENCE_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!EVIDENCE_SECRET) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { token, ccn, ccns } = req.body || {};

  if (!token) {
    return res.status(400).json({ valid: false, error: 'Missing token or CCN' });
  }

  const read = readSignedToken(token, EVIDENCE_SECRET);
  if (!read.valid) {
    return res.status(read.status || 400).json({ valid: false, error: read.error });
  }

  if (read.product === 'compare_brief') {
    const requested = normalizeCompareCcns(ccns || ccn);
    if (requested.length && requested.join(',') !== read.ccns.join(',')) {
      return res.status(403).json({ valid: false, error: 'Token does not match facility' });
    }
    return res.status(200).json({
      valid: true,
      product: 'compare_brief',
      ccns: read.ccns,
    });
  }

  const requestedCcn = normalizeFacilityCcn(ccn);
  if (!requestedCcn) {
    return res.status(400).json({ valid: false, error: 'Missing token or CCN' });
  }
  if (read.ccn !== requestedCcn) {
    return res.status(403).json({ valid: false, error: 'Token does not match facility' });
  }

  return res.status(200).json({ valid: true, product: 'facility_brief', ccn: read.ccn });
}
