/**
 * Compare Brief success page.
 *
 * After Stripe Checkout, user lands here with ?session_id=cs_xxx.
 * This page calls /api/send-evidence, which verifies payment and
 * resolves every CCN from session metadata.
 */
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { PENDING_COMPARE_BRIEF_KEY } from '../utils/compareBriefCheckout.js';
import '../styles/design.css';

function readOptionalStoredCcns() {
  try {
    return localStorage.getItem(PENDING_COMPARE_BRIEF_KEY) || '';
  } catch {
    return '';
  }
}

function clearOptionalStoredCcns() {
  try {
    localStorage.removeItem(PENDING_COMPARE_BRIEF_KEY);
  } catch {
    // Storage may be blocked; fulfillment does not depend on it.
  }
}

export default function CompareBriefSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const ccnsFromUrl = searchParams.get('ccns') || '';

  const [status, setStatus] = useState('loading');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [ccns, setCcns] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!sessionId) return;

    const hintCcns = readOptionalStoredCcns() || ccnsFromUrl;
    let cancelled = false;

    async function getDownloadLink() {
      try {
        const body = { checkout_session_id: sessionId };
        if (hintCcns) body.ccns = hintCcns;

        const res = await fetch('/api/send-evidence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success) {
          if (data.product === 'facility_brief' && data.downloadUrl) {
            window.location.replace(data.downloadUrl);
            return;
          }
          clearOptionalStoredCcns();
          const resolved = data.ccns || String(hintCcns || '').split(',').filter(Boolean);
          setDownloadUrl(data.downloadUrl);
          setCcns(resolved);
          setStatus('ready');
          window.plausible && window.plausible('Compare-Brief-Purchase-Complete', {
            props: { count: String(resolved.length), ccns: resolved.join(',') },
          });
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
  }, [sessionId, ccnsFromUrl]);

  const displayStatus = sessionId ? status : 'error';
  const displayError = sessionId
    ? errorMsg
    : 'No payment session found. If you just completed payment, please check your email or contact support.';

  return (
    <>
      <Helmet>
        <title>Your Compare Brief | The Oversight Report</title>
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
              Preparing your Compare Brief...
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
                Your Compare Brief{ccns.length ? <> for {ccns.length} homes</> : ''} is ready.
                This link expires in 72 hours.
              </p>
              <a
                href={downloadUrl}
                className="btn btn-primary"
                style={{ display: 'inline-block', padding: '14px 28px', fontSize: '1rem', textDecoration: 'none' }}
              >
                Download Compare Brief
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
                Contact <a href="mailto:contact@oversightreports.com" style={{ color: 'var(--accent-teal)' }}>contact@oversightreports.com</a>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
