/**
 * Subscription Success Page
 *
 * SECURITY MODEL:
 * After Stripe subscription payment, user is redirected here with ?session_id=cs_xxx.
 * This page calls /api/verify-subscription with the session ID. The API:
 * 1. Verifies payment with Stripe
 * 2. Sets a signed httpOnly cookie (the real access credential)
 * 3. Returns the tier info
 *
 * localStorage is then set as a UI cache for display purposes only.
 * Actual feature gating reads the signed cookie via /api/check-subscription.
 *
 * STRIPE PAYMENT LINK SETUP (MANUAL STEP):
 * Each subscription Payment Link success URL must be:
 *   https://www.oversightreports.com/success?session_id={CHECKOUT_SESSION_ID}
 * Each Payment Link must have metadata: tier=pro or tier=professional
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getTierName } from '../hooks/useSubscription';
import '../styles/design.css';

export default function SuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';

  const [tierName, setTierName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);

    // If this is a single report purchase, redirect to evidence success page
    // Preserve the session_id so evidence page can verify payment too
    const pendingSingleReport = localStorage.getItem('pending_single_report');
    if (pendingSingleReport) {
      // Don't remove pending_single_report here — EvidenceSuccessPage will read it
      const evidenceUrl = sessionId
        ? `/evidence-success?session_id=${sessionId}`
        : `/evidence-success?ccn=${pendingSingleReport}`;
      navigate(evidenceUrl, { replace: true });
      return;
    }

    // If we have a session_id, verify with server (secure path)
    if (sessionId) {
      verifySubscription(sessionId);
    } else {
      // No session_id — user may have navigated here directly or used an old Payment Link
      // that doesn't include {CHECKOUT_SESSION_ID} in the success URL.
      // Fall back to pending_tier from localStorage (insecure, legacy behavior).
      const pending = localStorage.getItem('pending_tier');
      if (pending) {
        localStorage.setItem('subscription_tier', pending);
        localStorage.removeItem('pending_tier');
        setTierName(getTierName(pending));
        setError('Payment link needs to be updated for secure verification. Subscription activated from cache — contact support if you have issues.');
      } else {
        const existing = localStorage.getItem('subscription_tier');
        if (existing) {
          setTierName(getTierName(existing));
        } else {
          setTierName('Pro');
        }
      }
    }
  }, [navigate, sessionId]);

  async function verifySubscription(sid) {
    setVerifying(true);
    try {
      const res = await fetch('/api/verify-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkout_session_id: sid }),
      });
      const data = await res.json();

      if (res.ok && data.verified) {
        // Server verified payment and set httpOnly cookie.
        // Update localStorage as a UI cache only.
        localStorage.setItem('subscription_tier', data.tier);
        localStorage.removeItem('pending_tier');
        setTierName(getTierName(data.tier));
      } else if (res.status === 402) {
        setError('Payment has not been completed. Please complete checkout and try again.');
        setTierName('');
      } else {
        setError(data.error || 'Could not verify subscription. Please contact support.');
        // Fall back to pending_tier if available
        const pending = localStorage.getItem('pending_tier');
        if (pending) {
          setTierName(getTierName(pending));
        }
      }
    } catch {
      setError('Network error verifying subscription. Please refresh or contact support.');
      const pending = localStorage.getItem('pending_tier');
      if (pending) {
        localStorage.setItem('subscription_tier', pending);
        localStorage.removeItem('pending_tier');
        setTierName(getTierName(pending));
      }
    } finally {
      setVerifying(false);
    }
  }

  return (
    <>
    <Helmet>
      <title>Welcome — Subscription Activated | The Oversight Report</title>
      <meta name="description" content="Your subscription is now active. Access your nursing home safety tools." />
      <link rel="canonical" href="https://www.oversightreports.com/success" />
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
        maxWidth: '560px',
        textAlign: 'center',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '3rem 2rem',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {verifying && (
          <>
            <p style={{ color: 'var(--text-cream)', fontSize: '1.1rem' }}>
              Verifying your payment...
            </p>
          </>
        )}

        {!verifying && tierName && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#10003;</div>
            <h1 style={{
              fontFamily: "'DM Serif Display', serif",
              color: 'var(--text-white)',
              fontSize: '2rem',
              marginBottom: '1rem',
            }}>
              Welcome to {tierName}
            </h1>
            <p style={{
              color: 'var(--text-cream)',
              fontSize: '1.1rem',
              lineHeight: 1.6,
              marginBottom: '2rem',
            }}>
              Your subscription is active. All {tierName}-tier features are now unlocked.
              We'll send a confirmation to your email.
            </p>
            {error && (
              <p style={{
                color: '#f59e0b',
                fontSize: '0.9rem',
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderRadius: '8px',
              }}>
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/')}
              >
                Start Exploring
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/methodology')}
              >
                How We Score Facilities
              </button>
            </div>
          </>
        )}

        {!verifying && !tierName && error && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#9888;</div>
            <h2 style={{
              fontFamily: "'DM Serif Display', serif",
              color: 'var(--text-white)',
              fontSize: '1.5rem',
              marginBottom: '1rem',
            }}>
              Verification Failed
            </h2>
            <p style={{ color: 'var(--text-cream)', marginBottom: '1.5rem' }}>
              {error}
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
