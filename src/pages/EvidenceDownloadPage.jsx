import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { EvidencePage } from './EvidencePage';
import '../styles/design.css';

export default function EvidenceDownloadPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const ccn = searchParams.get('ccn') || '';
  const [status, setStatus] = useState('verifying'); // verifying | valid | invalid | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);

    if (!token || !ccn) {
      setStatus('invalid');
      setErrorMsg('Missing download token or facility ID.');
      return;
    }

    async function verify() {
      try {
        const res = await fetch('/api/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, ccn }),
        });
        const data = await res.json();
        if (res.ok && data.valid) {
          setStatus('valid');
        } else {
          setStatus('invalid');
          setErrorMsg(
            data.error === 'Token has expired'
              ? 'This download link has expired. Links are valid for 72 hours after purchase.'
              : 'This download link is invalid or has been tampered with.'
          );
        }
      } catch {
        setStatus('error');
        setErrorMsg('Could not verify your download link. Please try again.');
      }
    }

    verify();
  }, [token, ccn]);

  if (status === 'verifying') {
    return (
      <>
        <Helmet>
          <title>Verifying Download | The Oversight Report</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-deep)',
        }}>
          <p style={{ color: 'var(--text-cream)', fontSize: '1.1rem' }}>
            Verifying your download link...
          </p>
        </div>
      </>
    );
  }

  if (status === 'valid') {
    return <EvidencePage tokenVerified ccnOverride={ccn} />;
  }

  // Invalid or error
  return (
    <>
      <Helmet>
        <title>Link Expired | The Oversight Report</title>
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
          textAlign: 'center',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '3rem 2rem',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#8987;</div>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            color: 'var(--text-white)',
            fontSize: '1.75rem',
            marginBottom: '1rem',
          }}>
            {status === 'error' ? 'Verification Error' : 'Link Expired'}
          </h1>
          <p style={{
            color: 'var(--text-cream)',
            fontSize: '1rem',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}>
            {errorMsg}
          </p>
          <p style={{ color: 'var(--text-cream)', marginBottom: '1.5rem' }}>
            Need help? Contact <a href="mailto:support@oversightreports.com" style={{ color: 'var(--accent-teal)' }}>support@oversightreports.com</a>
          </p>
          <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
