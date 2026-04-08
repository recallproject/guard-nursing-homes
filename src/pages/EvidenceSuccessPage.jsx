/**
 * Evidence Report Success Page
 *
 * SECURITY MODEL:
 * After Stripe payment, user is redirected here with ?session_id=cs_xxx.
 * The CCN is stored in localStorage before checkout (not security-sensitive,
 * just identifies which report they want).
 *
 * This page passes both session_id and ccn to /api/send-evidence, which
 * verifies payment with Stripe before generating the download token.
 * Without a valid paid session_id, no download link is generated.
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

export default function EvidenceSuccessPage() {
  const [searchParams] = useSearchParams();

  // session_id comes from Stripe redirect URL (server-verified, secure)
  const sessionId = searchParams.get('session_id') || '';

  // CCN comes from localStorage (set before checkout) or URL fallback
  // Not security-sensitive — just identifies which facility report to generate.
  // The actual access control is the Stripe session verification.
  const ccnFromUrl = searchParams.get('ccn') || '';
  const ccnFromStorage = typeof window !== 'undefined'
    ? localStorage.getItem('pending_single_report') || ''
    : '';
  const ccn = ccnFromStorage || ccnFromUrl;

  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [downloadUrl, setDownloadUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);

    // Clean up localStorage
    localStorage.removeItem('pending_single_report');

    if (!sessionId) {
      setStatus('error');
      setErrorMsg('No payment session found. If you just completed payment, please check your email or contact support.');
      return;
    }

    if (!ccn) {
      setStatus('error');
      setErrorMsg('No facility ID found. Please contact support with your payment confirmation.');
      return;
    }

    async function getDownloadLink() {
      try {
        const res = await fetch('/api/send-evidence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ccn, checkout_session_id: sessionId }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setDownloadUrl(data.downloadUrl);
          setStatus('ready');
          window.plausible && window.plausible('Evidence-Purchase-Complete', { props: { ccn } });
        } else if (res.status === 402) {
          setErrorMsg('Payment has not been completed. Please complete checkout and try again.');
          setStatus('error');
        } else {
          setErrorMsg(data.error || 'Something went wrong verifying your payment. Please contact support.');
          setStatus('error');
        }
      } catch {
        setErrorMsg('Network error. Please try again.');
        setStatus('error');
      }
    }

    getDownloadLink();
  }, [ccn, sessionId]);

  return (
    <>
      <Helmet>
        <title>Your Evidence Report | The Oversight Report</title>
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
          {status === 'loading' && (
            <p style={{ color: 'var(--text-cream)', fontSize: '1.1rem' }}>
              Preparing your report...
            </p>
          )}

          {status === 'ready' && (
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
                Your Evidence Report for facility <strong>{ccn}</strong> is ready.
                This link expires in 72 hours.
              </p>
              <a
                href={downloadUrl}
                className="btn btn-primary"
                style={{ display: 'inline-block', padding: '14px 28px', fontSize: '1rem', textDecoration: 'none' }}
              >
                Download Evidence Report
              </a>
              <p style={{ marginTop: '1.5rem' }}>
                <Link to="/" style={{ color: 'var(--accent-teal)', textDecoration: 'none' }}>
                  Back to Home
                </Link>
              </p>
            </>
          )}

          {status === 'error' && (
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
                {errorMsg}
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
