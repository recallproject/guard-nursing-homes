# Claude Code Prompt — $29 Evidence Report Paywall Fix
## Created: March 10, 2026

## Problem
The $29 Evidence Report paywall is client-side only and fully bypassable.
Anyone can open dev tools and type:
  localStorage.setItem('subscription_tier', 'professional')
...and get the full report for free.

The current flow:
1. User clicks "Download Evidence Report — $29"
2. `checkoutSingleReport(ccn)` sets `pending_tier = 'professional'` in localStorage
3. User is redirected to Stripe payment link
4. On return, `SuccessPage` reads `pending_tier` from localStorage and sets `subscription_tier`
5. `EvidencePage` checks `canAccess(tier, 'professional')` — trusts localStorage entirely

## Solution: Email-Based PDF Delivery (No Auth System Needed)

Replace the client-side gate with email delivery. After Stripe payment, the
user receives an email with a time-limited download link. No localStorage trust.
No JWT system. No backend subscription management.

This is appropriate for a one-time $29 purchase — not a subscription.

---

## Implementation Plan

### Step 1 — Stripe: Add success URL with email param

In `src/utils/stripe.js`, update `checkoutSingleReport()`:

Currently:
```js
localStorage.setItem('pending_tier', 'professional');
localStorage.setItem('pending_single_report', ccn);
window.location.href = SINGLE_REPORT_LINK;
```

Change to redirect to a Stripe Payment Link that includes:
- `?success_url=https://oversightreports.com/evidence-success?ccn={ccn}`
- OR use the existing Stripe dashboard to set the success URL

Note: Stripe hosted payment links don't support dynamic success_url injection
unless using Stripe Checkout Sessions via API. For now, keep the redirect but
change what happens on the success page (see Step 3).

### Step 2 — Create Vercel Serverless Function: `/api/send-evidence`

Create file: `api/send-evidence.js`

This function:
- Receives POST with `{ ccn, email }`
- Validates CCN exists in our data
- Generates a signed time-limited token (crypto.randomUUID + expiry timestamp,
  stored in a simple in-memory map or KV store)
- Sends email via Formspree or a simple fetch to an email service
- Returns `{ success: true }`

Since we don't have a database, use a lightweight approach:
- Generate a download token: `${ccn}-${Date.now()}-${crypto.randomUUID()}`
- Store in Vercel KV (if available) OR encode the CCN + expiry in the token
  itself using a HMAC signature with a secret env var

Simple HMAC token approach (no KV needed):
```js
// Token = base64(ccn + ':' + expiry) + '.' + HMAC(secret, ccn + ':' + expiry)
// Verify by recomputing HMAC — no storage needed
```

### Step 3 — Update EvidenceSuccessPage (or SuccessPage)

After Stripe redirects back:
1. Show a form: "Enter your email to receive your report"
2. On submit, call `/api/send-evidence` with `{ ccn, email }`
3. Show confirmation: "Check your email — your report is on its way"

Remove the localStorage `subscription_tier` write from this flow entirely.

### Step 4 — Create Download Route: `/evidence-download?token=xxx`

Create `src/pages/EvidenceDownloadPage.jsx`:
- Reads `?token=xxx&ccn=yyy` from URL
- POSTs to `/api/verify-token` with the token
- If valid: renders the full EvidencePage content (or triggers PDF download)
- If invalid/expired: shows "This link has expired. Please contact support."

Token validation in `api/verify-token.js`:
- Recompute HMAC with the secret
- Check expiry (tokens valid for 72 hours)
- Return `{ valid: true, ccn }` or `{ valid: false }`

### Step 5 — Keep subscription tier gate intact for future use

Do NOT remove `useSubscription` or `canAccess` from EvidencePage. The
subscription tiers (pro, professional) will be used for future recurring
access. Just add the email delivery path as the primary purchase flow.

---

## Environment Variables Needed

Add to `.env` and Vercel dashboard:
```
VITE_EVIDENCE_SECRET=<generate a random 32-char string>
```

This secret is used server-side only to sign/verify tokens. Never expose
in client code.

---

## Files to Create/Modify

| File | Action |
|---|---|
| `api/send-evidence.js` | CREATE — Vercel serverless function |
| `api/verify-token.js` | CREATE — Vercel serverless function |
| `src/pages/EvidenceSuccessPage.jsx` | CREATE — email capture after payment |
| `src/pages/EvidenceDownloadPage.jsx` | CREATE — validates token, renders report |
| `src/utils/stripe.js` | MODIFY — update success redirect for single reports |
| `src/App.jsx` (or router) | MODIFY — add routes for new pages |
| `vercel.json` | VERIFY — ensure `/api/*` routes are not blocked |

---

## What NOT to Change

- Do not remove `useSubscription` or localStorage tier system — needed for future subscriptions
- Do not change the $49 Ask a Clinician flow — that's a service, not a gated page
- Do not change any facility page content or styling
- Do not change the Stripe payment links themselves

---

## After Implementation

Run: `npm run build`
Test the full flow locally:
1. Simulate a purchase by hitting `/evidence-success?ccn=123456` directly
2. Enter a test email
3. Verify the token is generated and email fires (or logs in dev)
4. Visit the download URL with the token
5. Verify expiry works (set a short expiry in dev, wait, confirm rejection)

Report any errors or warnings.
