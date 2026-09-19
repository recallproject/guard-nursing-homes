/**
 * Resolve which homes a paid Compare Brief Checkout Session belongs to.
 *
 * Preference order:
 * 1. session.metadata.ccns when metadata.product === compare_brief
 * 2. session.client_reference_id (comma-separated CCNs)
 * 3. client-supplied CCNs only when the session has none
 */

import { isValidFacilityCcn, normalizeFacilityCcn } from './resolveFacilityCcn.js';

export const COMPARE_BRIEF_PRODUCT = 'compare_brief';

export function normalizeCompareCcns(ccns) {
  const list = Array.isArray(ccns)
    ? ccns
    : String(ccns || '').split(/[,\s]+/);
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const ccn = normalizeFacilityCcn(raw);
    if (!isValidFacilityCcn(ccn) || seen.has(ccn)) continue;
    seen.add(ccn);
    out.push(ccn);
    if (out.length >= 3) break;
  }
  return out;
}

export function isCompareBriefSession(session) {
  const product = String(session?.metadata?.product || '').trim();
  if (product === COMPARE_BRIEF_PRODUCT) return true;
  return normalizeCompareCcns(session?.client_reference_id).length >= 2;
}

export function assertPaidCompareBriefSession(session) {
  if (!session || session.payment_status !== 'paid') {
    return {
      error: 'Payment not completed. Please complete checkout first.',
      status: 402,
    };
  }
  if (session.mode !== 'payment') {
    return { error: 'Invalid checkout type for Compare Brief', status: 400 };
  }
  return { ok: true };
}

export function resolveCompareCcns(session, requestedCcns) {
  const fromMeta = normalizeCompareCcns(session?.metadata?.ccns);
  const fromRef = normalizeCompareCcns(session?.client_reference_id);
  const sessionCcns = fromMeta.length >= 2 ? fromMeta : fromRef;
  const fromRequest = normalizeCompareCcns(requestedCcns);

  if (sessionCcns.length >= 2 && sessionCcns.length <= 3) {
    if (fromRequest.length && fromRequest.join(',') !== sessionCcns.join(',')) {
      console.warn(
        `Ignoring client CCNs ${fromRequest.join(',')} — session is for ${sessionCcns.join(',')}`
      );
    }
    return { ccns: sessionCcns };
  }

  if (fromRequest.length >= 2 && fromRequest.length <= 3) {
    return { ccns: fromRequest };
  }

  return {
    error: 'No compare-set facility IDs on this payment. Please contact support with your payment confirmation.',
    status: 400,
  };
}
