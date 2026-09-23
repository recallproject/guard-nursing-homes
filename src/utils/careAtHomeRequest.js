import { CONTACT_EMAIL } from '../data/contact.js';
import { splitRecipients } from '../data/careAtHome.js';

export function formspreeEndpoint(env = import.meta.env) {
  const id = String(env?.VITE_FORMSPREE_ID || '').trim();
  if (!/^[a-z0-9]+$/i.test(id)) return '';
  return `https://formspree.io/f/${id}`;
}

export function requestMessage(draft, list) {
  const { recipients, outside } = splitRecipients(list, draft);
  const names = recipients.map((agency) => agency.name);
  const lines = [
    'Care at home request',
    `County: ${draft.county}`,
    `ZIP: ${draft.zip}`,
    `Support: ${draft.support}`,
    `Hours: ${draft.hours}`,
    `Timing: ${draft.timing}`,
    `Budget: ${draft.budget}`,
    `Email: ${String(draft.email || '').trim()}`,
    `Agencies to consider: ${names.join('; ') || '(none)'}`,
  ];
  if (draft.includeOutside && outside.length) {
    lines.push(`Included even though they are listed under another county: ${outside.map((agency) => agency.name).join('; ')}. Confirm coverage for the care address.`);
  }
  lines.push('Please review service area and availability before contacting any agency.');
  lines.push('This message does not book a caregiver.');
  return lines.join('\n');
}

export function buildRequestMailto(draft, list, email = CONTACT_EMAIL) {
  const subject = `Care at home request (${draft.county || 'local pilot'})`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(requestMessage(draft, list))}`;
}

export function buildClaimMailto(agency, questionnaire, email = CONTACT_EMAIL) {
  const subject = agency?.name
    ? `Care at home profile reply: ${agency.name}`
    : 'Care at home profile reply';
  const body = [
    questionnaire,
    '',
    agency?.id ? `Profile: https://www.oversightreports.com/care-at-home#agency-${agency.id}` : 'Profile: https://www.oversightreports.com/care-at-home',
  ].join('\n');
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function requestPayload(draft, list) {
  const { recipients } = splitRecipients(list, draft);
  return {
    _subject: `Care at home request (${draft.county})`,
    _replyto: String(draft.email || '').trim(),
    email: String(draft.email || '').trim(),
    county: draft.county,
    zip: draft.zip,
    support: draft.support,
    hours: draft.hours,
    timing: draft.timing,
    budget: draft.budget,
    agencies: recipients.map((agency) => agency.name).join(', '),
    agency_ids: recipients.map((agency) => agency.id).join(', '),
    include_outside_county: draft.includeOutside ? 'yes' : 'no',
    source: 'care-at-home',
    delivery_note: 'Received by the OversightReports team. Not forwarded to agencies until a person reviews it.',
  };
}

/**
 * Posts to the existing Formspree form when VITE_FORMSPREE_ID is set.
 * A non-OK response is a failure. Callers must not show a received state for failures.
 */
export async function submitCareAtHomeRequest(draft, list, { endpoint, fetchImpl = fetch } = {}) {
  if (!endpoint) return { ok: false, mode: 'unconfigured' };
  const payload = requestPayload(draft, list);
  if (!payload.agency_ids) return { ok: false, mode: 'error', message: 'Select at least one agency before sending.' };
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    if (!response.ok || body?.ok !== true) {
      const detail = typeof body?.error === 'string' ? body.error : 'The form service did not accept this request.';
      return { ok: false, mode: 'error', message: `${detail} Nothing was sent. Your details are still on this screen.` };
    }
    return { ok: true, mode: 'formspree', agencyCount: payload.agency_ids.split(', ').filter(Boolean).length };
  } catch {
    return {
      ok: false,
      mode: 'error',
      message: 'The request could not be delivered. Nothing was sent. Your details are still on this screen.',
    };
  }
}
