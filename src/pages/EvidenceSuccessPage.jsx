/**
 * Facility Brief Success Page
 *
 * SECURITY MODEL:
 * After Stripe payment, user is redirected here with ?session_id=cs_xxx.
 * This page calls /api/send-evidence with the session ID. The API:
 * 1. Verifies payment with Stripe
 * 2. Resolves CCN from the paid session (client_reference_id / metadata)
 * 3. Generates the HMAC download token
 *
 * localStorage (`pending_single_report`) and ?ccn= are optional hints only.
 * They fail across www vs apex (different origins) and when storage is
 * blocked. The paid Checkout Session is the source of truth for CCN.
 *
 * STRIPE PAYMENT LINK SETUP (MANUAL STEP):
 * The single-report Payment Link success URL must be:
 *   https://www.oversightreports.com/evidence-success?session_id={CHECKOUT_SESSION_ID}
 * Stripe will replace {CHECKOUT_SESSION_ID} with the real session ID on redirect.
 */
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/design.css';

function readOptionalStoredCcn() {
  try {
    return localStorage.getItem('pending_single_report') || '';
  } catch {
    return '';
  }
}

function clearOptionalStoredCcn() {
  try {
    localStorage.removeItem('pending_single_report');
  } catch {
    // Storage may be blocked; fulfillment does not depend on it.
  }
}

export default function EvidenceSuccessPage() {
  const [searchParams] = useSearchParams();

  // session_id comes from Stripe redirect URL (server-verified, secure)
  const sessionId = searchParams.get('session_id') || '';

  // Optional CCN hints — never required for a paid session
  const ccnFromUrl = searchParams.get('ccn') || '';

  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [downloadUrl, setDownloadUrl] = useState('');
  const [ccn, setCcn] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!sessionId) return;

    const hintCcn = readOptionalStoredCcn() || ccnFromUrl;
    clearOptionalStoredCcn();

    let cancelled = false;

    async function getDownloadLink() {
      try {
        const body = { checkout_session_id: sessionId };
        if (hintCcn) body.ccn = hintCcn;

        const res = await fetch('/api/send-evidence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success) {
          const resolvedCcn = data.ccn || hintCcn;
          setDownloadUrl(data.downloadUrl);
          setCcn(resolvedCcn);
          setStatus('ready');
          window.plausible && window.plausible('Evidence-Purchase-Complete', { props: { ccn: resolvedCcn } });
        } else if (res.status === 402) {
          setErrorMsg('Payment has not been completed. Please complete checkout and try again.');
          setStatus('error');
        } else {
          setErrorMsg(data.error || 'Something went wrong verifying your payment. Please contact support.');
          setStatus('error');
        }
      } catch {
        if (cancelled) return;
        setErrorMsg('Network error. Please try again.');
        setStatus('error');
      }
    }

    getDownloadLink();
    return () => { cancelled = true; };
  }, [sessionId, ccnFromUrl]);

  const displayStatus = sessionId ? status : 'error';
  const displayError = sessionId
    ? errorMsg
    : 'No payment session found. If you just completed payment, please check your email or contact support.';

  return (
    <>
      <Helmet>
        <title>Your Facility Brief | The Oversight Report</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-deep)',
        padding: '2rem',
      }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '3rem 2rem',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {displayStatus === 'loading' && (
            <p style={{ color: 'var(--text-cream)', fontSize: '1.1rem' }}>
              Preparing your Facility Brief...
            </p>
          )}

          {displayStatus === 'ready' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#10003;</div>
              <h1 style={{
                fontFamily: "'DM Serif Display', serif",
                color: 'var(--text-white)',
                fontSize: '1.75rem',
                marginBottom: '0.75rem',
              }}>
                Payment Received
              </h1>
              <p style={{
                color: 'var(--text-cream)',
                fontSize: '1rem',
                lineHeight: 1.6,
                marginBottom: '2rem',
              }}>
                Your Facility Brief{ccn ? <> for facility <strong>{ccn}</strong></> : ''} is ready.
                This link expires in 72 hours.
              </p>
              <a
                href={downloadUrl}
                className="btn btn-primary"
                style={{ display: 'inline-block', padding: '14px 28px', fontSize: '1rem', textDecoration: 'none' }}
              >
                Download Facility Brief
              </a>
              <p style={{ marginTop: '1.5rem' }}>
                <Link to="/" style={{ color: 'var(--accent-teal)', textDecoration: 'none' }}>
                  Back to Home
                </Link>
              </p>
            </>
          )}

          {displayStatus === 'error' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#9888;</div>
              <h2 style={{
                fontFamily: "'DM Serif Display', serif",
                color: 'var(--text-white)',
                fontSize: '1.5rem',
                marginBottom: '1rem',
              }}>
                Something Went Wrong
              </h2>
              <p style={{ color: 'var(--text-cream)', marginBottom: '1.5rem' }}>
                {displayError}
              </p>
              <p style={{ color: 'var(--text-cream)' }}>
                Contact <a href="mailto:support@oversightreports.com" style={{ color: 'var(--accent-teal)' }}>support@oversightreports.com</a>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
