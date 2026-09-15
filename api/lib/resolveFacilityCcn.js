/**
 * Resolve which facility a paid Facility Brief Checkout Session belongs to.
 *
 * Preference order (Stripe session is source of truth):
 * 1. session.client_reference_id  — set on the Payment Link URL at checkout
 * 2. session.metadata.ccn         — optional Dashboard / API metadata
 * 3. client-supplied CCN          — legacy localStorage / ?ccn= fallback
 *
 * If the session already has a valid CCN, a mismatched client CCN is ignored
 * so a paid session cannot be reused for a different facility.
 */

export const FACILITY_CCN_RE = /^\d{6}$/;

export function normalizeFacilityCcn(value) {
  if (value == null) return '';
  return String(value).trim();
}

export function isValidFacilityCcn(value) {
  return FACILITY_CCN_RE.test(normalizeFacilityCcn(value));
}

function sessionAttachedCcn(session) {
  const fromRef = normalizeFacilityCcn(session?.client_reference_id);
  if (isValidFacilityCcn(fromRef)) return fromRef;

  const fromMeta = normalizeFacilityCcn(session?.metadata?.ccn);
  if (isValidFacilityCcn(fromMeta)) return fromMeta;

  return '';
}

/**
 * Payment checks that must pass before a download token is issued.
 * @returns {{ ok: true } | { error: string, status: number }}
 */
export function assertPaidFacilityBriefSession(session) {
  if (!session || session.payment_status !== 'paid') {
    return {
      error: 'Payment not completed. Please complete checkout first.',
      status: 402,
    };
  }

  if (session.mode !== 'payment') {
    return { error: 'Invalid checkout type for single report', status: 400 };
  }

  return { ok: true };
}

/**
 * @param {object} session Stripe Checkout Session
 * @param {string} [requestedCcn] Optional CCN from the browser
 * @returns {{ ccn: string } | { error: string, status: number }}
 */
export function resolveFacilityCcn(session, requestedCcn) {
  const sessionCcn = sessionAttachedCcn(session);
  const fromRequest = normalizeFacilityCcn(requestedCcn);

  if (sessionCcn) {
    if (fromRequest && fromRequest !== sessionCcn) {
      console.warn(
        `Ignoring client CCN ${fromRequest} — session is for ${sessionCcn}`
      );
    }
    return { ccn: sessionCcn };
  }

  if (isValidFacilityCcn(fromRequest)) {
    return { ccn: fromRequest };
  }

  if (fromRequest) {
    return { error: 'Invalid facility CCN', status: 400 };
  }

  return {
    error: 'No facility ID on this payment. Please contact support with your payment confirmation.',
    status: 400,
  };
}
