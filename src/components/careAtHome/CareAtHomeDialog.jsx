import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../../data/contact';
import {
  CARE_AT_HOME_AGENCIES,
  COMPARISON_ROWS,
  SUPPORT_OPTIONS,
  HOURS_OPTIONS,
  TIMING_OPTIONS,
  BUDGET_OPTIONS,
  claimQuestionnaire,
  findAgency,
  formatCheckedDate,
  safeHttpUrl,
  sourceLinkLabel,
  splitRecipients,
  telHref,
  validateRequest,
} from '../../data/careAtHome';
import {
  buildClaimMailto,
  buildRequestMailto,
  submitCareAtHomeRequest,
} from '../../utils/careAtHomeRequest';
import { StatusBadge } from './StatusBadge';

function SourceLinks({ sources = [] }) {
  const links = sources
    .map((source) => ({ ...source, href: safeHttpUrl(source.url) }))
    .filter((source) => source.href);
  if (!links.length) return null;
  return (
    <div className="source-list">
      {links.map((source) => (
        <a key={source.href} className="source-link" href={source.href} target="_blank" rel="noopener noreferrer">
          {sourceLinkLabel(source)} <span aria-hidden="true">↗</span>
        </a>
      ))}
    </div>
  );
}

function ProfileBody({ agency, onSource, onRequest, onClaim }) {
  const phone = telHref(agency.phone);
  const website = safeHttpUrl(agency.website);
  return (
    <>
      <p className="eyebrow">LOCAL AGENCY PROFILE · {agency.area}</p>
      <h2 id="cah-dialog-title" tabIndex={-1}>{agency.name}</h2>
      <p>{agency.description}</p>
      <div className="profile-summary">
        <StatusBadge status={agency.status} />
        <span className="little-tag">Checked {formatCheckedDate(agency.checked)}</span>
      </div>
      <div className="profile-contacts">
        {phone && <a href={phone}>{agency.phone}</a>}
        {agency.email && <a href={`mailto:${agency.email}`}>{agency.email}</a>}
        {website && (
          <a href={website} target="_blank" rel="noopener noreferrer">Agency website <span aria-hidden="true">↗</span></a>
        )}
      </div>
      <p className="coverage-note">
        <strong>Published service area: </strong>
        {agency.coverage || agency.area}. Confirm coverage for your address.
      </p>
      {agency.contactSources?.length > 0 && (
        <details className="contact-sources">
          <summary>Contact information sources</summary>
          <SourceLinks sources={agency.contactSources} />
        </details>
      )}
      <dl className="profile-details">
        {COMPARISON_ROWS.map(([key, label]) => {
          const field = agency.fields[key];
          return (
            <div key={key}>
              <dt>{label}</dt>
              <dd>
                {field.value}
                {field.note ? <small>{field.note}</small> : null}
                <button type="button" className="cell-source" onClick={() => onSource(agency.id, key)} aria-label={`Source for ${label}`}>
                  <StatusBadge status={field.status} />
                </button>
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="dialog-note">
        {agency.caveat ? `${agency.caveat} ` : null}
        {agency.status !== 'verified' && 'No agency confirmation has been received. Public website statements do not establish current licensing or availability.'}
      </p>
      <div className="form-actions">
        <button type="button" className="button" onClick={() => onRequest(agency.id)}>
          Request this option <span aria-hidden="true">↗</span>
        </button>
        <button type="button" className="subtle-link" onClick={() => onClaim(agency.id)}>Claim this profile</button>
      </div>
    </>
  );
}

function SourceBody({ agency, fieldKey, onProfile }) {
  const field = agency.fields[fieldKey];
  const label = COMPARISON_ROWS.find((row) => row[0] === fieldKey)?.[1] || 'Detail';
  const checked = formatCheckedDate(field.checked || agency.checked);
  return (
    <>
      <p className="eyebrow">INFORMATION SOURCE</p>
      <h2 id="cah-dialog-title" tabIndex={-1}>{label}</h2>
      <p>{agency.name}</p>
      <div className="profile-summary">
        <strong>{field.value}</strong>
        <StatusBadge status={field.status} />
      </div>
      {field.note ? <p>{field.note}</p> : null}
      {field.status === 'missing' && (
        <p className="dialog-note">
          A sourced answer has not been added to this profile. Ask the agency for its current policy. This does not mean the service is unavailable.
        </p>
      )}
      {field.status === 'public' && (
        <>
          <SourceLinks sources={field.sources} />
          <p className="dialog-note">
            Checked {checked}. Published information may change. The agency has not confirmed this profile directly with OversightReports.
          </p>
        </>
      )}
      {field.status === 'verified' && (
        <p className="dialog-note">
          Confirmed by an authorized representative{checked ? ` on ${checked}` : ''}. This describes a stated policy, not an independent endorsement of care.
        </p>
      )}
      <button type="button" className="button button-outline" onClick={() => onProfile(agency.id)}>Back to agency profile</button>
    </>
  );
}

function RequestBody({ draft, onChange, onReview, error }) {
  const toggleAgency = (id) => {
    const agencies = draft.agencies.includes(id)
      ? draft.agencies.filter((item) => item !== id)
      : [...draft.agencies, id];
    onChange({ ...draft, agencies });
  };

  return (
    <>
      <p className="eyebrow">YOUR NEXT STEP</p>
      <h2 id="cah-dialog-title" tabIndex={-1}>Let’s find your starting point.</h2>
      <p>A few details help narrow your options. You’ll review the recipient and the agencies before anything is shared.</p>
      <p className="dialog-note">
        This sends a request to the OversightReports team at {CONTACT_EMAIL}. It does not contact an agency, book a caregiver, or confirm that someone is available.
      </p>
      <form
        id="request-form"
        className="cah-capture-mask ph-no-capture"
        onSubmit={(event) => {
          event.preventDefault();
          onReview(draft);
        }}
      >
        <div className="form-grid">
          <label>
            County
            <select name="county" value={draft.county} onChange={(event) => onChange({ ...draft, county: event.target.value, includeOutside: false })} required>
              <option value="Orange County">Orange County</option>
              <option value="San Diego">San Diego</option>
            </select>
          </label>
          <label>
            ZIP code
            <input
              name="zip"
              inputMode="numeric"
              pattern="[0-9]{5}"
              maxLength={5}
              placeholder="e.g. 92660"
              autoComplete="postal-code"
              value={draft.zip}
              onChange={(event) => onChange({ ...draft, zip: event.target.value.replace(/\D/g, '').slice(0, 5) })}
              required
            />
          </label>
          <label>
            Support needed
            <select name="support" value={draft.support} onChange={(event) => onChange({ ...draft, support: event.target.value })}>
              {SUPPORT_OPTIONS.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Hours per week
            <select name="hours" value={draft.hours} onChange={(event) => onChange({ ...draft, hours: event.target.value })}>
              {HOURS_OPTIONS.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>
            When is care needed?
            <select name="timing" value={draft.timing} onChange={(event) => onChange({ ...draft, timing: event.target.value })}>
              {TIMING_OPTIONS.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Hourly budget
            <select name="budget" value={draft.budget} onChange={(event) => onChange({ ...draft, budget: event.target.value })}>
              {BUDGET_OPTIONS.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="full">
            Email for your options
            <input
              type="email"
              name="email"
              maxLength={120}
              placeholder="you@example.com"
              autoComplete="email"
              value={draft.email}
              onChange={(event) => onChange({ ...draft, email: event.target.value })}
              required
            />
          </label>
        </div>
        <fieldset>
          <legend>Agencies you want considered</legend>
          {CARE_AT_HOME_AGENCIES.map((agency) => (
            <label className="check-label" key={agency.id}>
              <input
                type="checkbox"
                name="agency"
                value={agency.id}
                checked={draft.agencies.includes(agency.id)}
                onChange={() => toggleAgency(agency.id)}
              />
              {agency.name}
            </label>
          ))}
          <p className="fieldset-note">
            County is a browsing association, not a service-area boundary. OversightReports will confirm the care address rather than treating the county filter as eligibility.
          </p>
        </fieldset>
        {error ? <p id="request-error" className="form-error" role="alert">{error}</p> : null}
        <div className="form-actions">
          <span className="little-tag">You review before anything is shared</span>
          <button className="button" type="submit">Review my options <span aria-hidden="true">→</span></button>
        </div>
      </form>
    </>
  );
}

function ReviewBody({
  draft,
  onEdit,
  onDelivered,
  onDraftChange,
  endpoint,
  submitting,
  setSubmitting,
  error,
  setError,
}) {
  const [consent, setConsent] = useState(false);
  const { inCounty, outside, recipients } = splitRecipients(CARE_AT_HOME_AGENCIES, draft);
  const mailto = buildRequestMailto(draft, CARE_AT_HOME_AGENCIES);
  const canSend = recipients.length > 0 && consent;

  const send = async (event) => {
    event.preventDefault();
    if (!canSend || submitting) return;
    setSubmitting(true);
    setError('');
    const result = await submitCareAtHomeRequest(draft, CARE_AT_HOME_AGENCIES, { endpoint });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message || 'The request was not sent. Your details are still here.');
      return;
    }
    onDelivered({ mode: 'formspree', recipients });
  };

  return (
    <>
      <p className="eyebrow">REVIEW YOUR OPTIONS</p>
      <h2 id="cah-dialog-title" tabIndex={-1}>A shortlist, on your terms.</h2>
      <p className="ph-no-capture">{draft.county} · {draft.zip} · {draft.hours}</p>
      <div className="review-list ph-no-capture">
        <strong>{draft.support}</strong>
        <p>
          Timing: {draft.timing}<br />
          Budget: {draft.budget} / hour<br />
          Email: {draft.email}
        </p>
      </div>
      <div className="review-list">
        <strong>Recipient</strong>
        <p>
          OversightReports ({CONTACT_EMAIL}). The agencies below are who you want considered. They are not emailed by this form.
        </p>
        <strong>
          {inCounty.length} {inCounty.length === 1 ? 'profile is listed' : 'profiles are listed'} in your selected county
        </strong>
        {inCounty.map((agency) => (
          <p key={agency.id}>{agency.name} <StatusBadge status={agency.status} /></p>
        ))}
        {outside.length > 0 && (
          <p className="dialog-note">
            Listed under another county: {outside.map((agency) => agency.name).join(', ')}.
            Their published coverage may still include your address. They are left out unless you choose to include them.
          </p>
        )}
      </div>
      <form id="confirm-request" className="ph-no-capture" onSubmit={endpoint ? send : (event) => event.preventDefault()}>
        {outside.length > 0 && (
          <label className="check-label consent-label">
            <input
              type="checkbox"
              checked={draft.includeOutside}
              onChange={(event) => onDraftChange({ ...draft, includeOutside: event.target.checked })}
            />
            Include the {outside.length === 1 ? 'agency' : 'agencies'} listed under another county. I understand coverage still has to be confirmed for my address.
          </label>
        )}
        {recipients.length === 0 ? (
          <p className="form-error" role="alert">No agency is included yet. Include an agency listed under another county, or edit the request.</p>
        ) : (
          <label className="check-label consent-label">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required={Boolean(endpoint)} />
            I agree to share my email, ZIP code, and care preferences with OversightReports so the team can review this request
            {recipients.length === 1
              ? ` about ${recipients[0].name}`
              : ` about these ${recipients.length} agencies: ${recipients.map((agency) => agency.name).join(', ')}`}
            . I understand it will not be sent to an agency until a person checks service area and availability.
          </label>
        )}
        <p className="dialog-note">
          <Link to="/privacy">Privacy policy</Link>. A received request is not a booked caregiver and not proof an agency can take the schedule.
        </p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="form-actions">
          <button type="button" className="subtle-link" onClick={onEdit}>Edit request</button>
          {endpoint ? (
            <button className="button" type="submit" disabled={!canSend || submitting}>
              {submitting ? 'Sending…' : 'Send to OversightReports'} <span aria-hidden="true">→</span>
            </button>
          ) : (
            <a
              className="button"
              href={canSend ? mailto : undefined}
              aria-disabled={!canSend}
              onClick={(event) => {
                if (!canSend) {
                  event.preventDefault();
                  setError(recipients.length ? 'Confirm what will be shared before opening the email.' : 'Choose at least one agency listed for this request.');
                  return;
                }
                onDelivered({ mode: 'mailto', recipients });
              }}
            >
              Open email to OversightReports <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
      </form>
    </>
  );
}

function DeliveryBody({ mode, draft, recipients, onClose }) {
  const mailto = buildRequestMailto(draft, CARE_AT_HOME_AGENCIES);
  const names = recipients.map((agency) => agency.name).join(', ');
  if (mode === 'formspree') {
    return (
      <>
        <p className="eyebrow">RECEIVED BY OVERSIGHTREPORTS</p>
        <h2 id="cah-dialog-title" tabIndex={-1}>Your request is in the team inbox.</h2>
        <p>
          OversightReports received this request for {names || 'the agencies you selected'}. It has not been delivered to an agency.
          A person still needs to review the care address and availability before anyone is contacted.
        </p>
        <p className="dialog-note">
          <strong>This does not book a caregiver</strong> and does not guarantee a response time. If you need to add something, email {CONTACT_EMAIL}.
        </p>
        <button type="button" className="button" onClick={onClose}>Back to comparing <span aria-hidden="true">↗</span></button>
      </>
    );
  }
  return (
    <>
      <p className="eyebrow">EMAIL DRAFT</p>
      <h2 id="cah-dialog-title" tabIndex={-1}>Finish sending in your email app.</h2>
      <p>
        A draft to {CONTACT_EMAIL} should be open, addressed to the OversightReports team, about {names || 'your selected agencies'}.
      </p>
      <p className="dialog-note">
        <strong>OversightReports has not received this request until you send that email.</strong> No agency has been contacted. If no draft opened, use the link below. This does not book a caregiver.
      </p>
      <div className="delivery-summary ph-no-capture">
        <p><strong>{draft.county}</strong> · {draft.zip} · {draft.support}</p>
        <p>{draft.hours} · {draft.timing} · {draft.budget} / hour · {draft.email}</p>
      </div>
      <div className="form-actions">
        <a className="button" href={mailto}>Open the email draft again <span aria-hidden="true">↗</span></a>
        <button type="button" className="subtle-link" onClick={onClose}>Back to comparing</button>
      </div>
    </>
  );
}

function ClaimBody({ agency, onCopy }) {
  const questionnaire = claimQuestionnaire(agency);
  const mailto = buildClaimMailto(agency, questionnaire);
  return (
    <>
      <p className="eyebrow">FOR HOME-CARE AGENCIES</p>
      <h2 id="cah-dialog-title" tabIndex={-1}>A clearer profile.<br />A simple email reply.</h2>
      <p>
        {agency ? `${agency.name} · ` : null}
        Email the OversightReports team with your current details. The team reviews the reply and updates the profile. There is no agency login or editing portal.
      </p>
      <p className="dialog-note">
        Identity and authority have to be confirmed before any field is marked Agency verified. Sending this checklist does not change the public profile, and no profile is Agency verified today.
      </p>
      <label className="reply-label" htmlFor="claim-reply">
        Information to include in your reply
        <textarea id="claim-reply" readOnly rows={12} value={questionnaire} />
      </label>
      <div className="form-actions">
        <a className="button" href={mailto}>Email this checklist <span aria-hidden="true">↗</span></a>
        <button type="button" className="button button-outline" onClick={() => onCopy(questionnaire)}>Copy reply checklist</button>
      </div>
    </>
  );
}

function DialogBody({
  dialog,
  onClose,
  onProfile,
  onSource,
  onRequest,
  onClaim,
  onCopy,
  endpoint,
}) {
  const [requestError, setRequestError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  let body = null;
  if (dialog.kind === 'profile') {
    const agency = findAgency(dialog.id);
    body = agency ? (
      <ProfileBody agency={agency} onSource={onSource} onRequest={onRequest} onClaim={onClaim} />
    ) : null;
  } else if (dialog.kind === 'source') {
    const agency = findAgency(dialog.id);
    body = agency?.fields[dialog.field] ? (
      <SourceBody agency={agency} fieldKey={dialog.field} onProfile={onProfile} />
    ) : null;
  } else if (dialog.kind === 'request') {
    body = (
      <RequestBody
        draft={dialog.draft}
        error={requestError}
        onChange={(draft) => {
          setRequestError('');
          onRequest(dialog.explicitId, draft);
        }}
        onReview={(draft) => {
          const errors = validateRequest(draft);
          const first = errors.agencies || errors.zip || errors.email || errors.county;
          if (first) {
            setRequestError(first);
            return;
          }
          setRequestError('');
          setReviewError('');
          onRequest(dialog.explicitId, draft, 'review');
        }}
      />
    );
  } else if (dialog.kind === 'review') {
    body = (
      <ReviewBody
        draft={dialog.draft}
        endpoint={endpoint}
        submitting={submitting}
        setSubmitting={setSubmitting}
        error={reviewError}
        setError={setReviewError}
        onEdit={() => onRequest(dialog.explicitId, dialog.draft, 'edit')}
        onDraftChange={(draft) => onRequest(dialog.explicitId, draft, 'review')}
        onDelivered={(result) => onRequest(dialog.explicitId, dialog.draft, 'delivery', result)}
      />
    );
  } else if (dialog.kind === 'delivery') {
    body = (
      <DeliveryBody
        mode={dialog.mode}
        draft={dialog.draft}
        recipients={dialog.recipients}
        onClose={onClose}
      />
    );
  } else if (dialog.kind === 'claim') {
    body = <ClaimBody agency={findAgency(dialog.id)} onCopy={onCopy} />;
  }

  return body;
}

export function CareAtHomeDialog(props) {
  if (!props.dialog) return null;
  const resetKey = `${props.dialog.kind}:${props.dialog.id || props.dialog.explicitId || ''}:${props.dialog.field || ''}`;
  return <DialogBody key={resetKey} {...props} />;
}
