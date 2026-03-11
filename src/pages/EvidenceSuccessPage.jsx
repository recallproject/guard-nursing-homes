import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/design.css';

export default function EvidenceSuccessPage() {
  const [searchParams] = useSearchParams();
  const ccn = searchParams.get('ccn') || '';
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [downloadUrl, setDownloadUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!ccn) {
      setStatus('error');
      setErrorMsg('No facility ID found. Please contact support.');
      return;
    }

    async function getDownloadLink() {
      try {
        const res = await fetch('/api/send-evidence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ccn }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setDownloadUrl(data.downloadUrl);
          setStatus('ready');
          window.plausible && window.plausible('Evidence-Purchase-Complete', { props: { ccn } });
        } else {
          setErrorMsg(data.error || 'Something went wrong. Please try again.');
          setStatus('error');
        }
      } catch {
        setErrorMsg('Network error. Please try again.');
        setStatus('error');
      }
    }

    getDownloadLink();
  }, [ccn]);

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
