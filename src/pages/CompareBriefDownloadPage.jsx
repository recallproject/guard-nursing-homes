import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { useWatchlistFacilities } from '../hooks/useFacilityData';
import { CMS_SNF_AS_OF_ISO } from '../data/careSettings';
import { parseCompareCcns } from '../utils/compareBriefPricing.js';
import { generateCompareBriefPDF } from '../utils/generateCompareBriefPDF.js';
import '../styles/design.css';

export default function CompareBriefDownloadPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const ccnsParam = searchParams.get('ccns') || '';
  const wanted = useMemo(() => parseCompareCcns(ccnsParam), [ccnsParam]);

  const [status, setStatus] = useState('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [verifiedCcns, setVerifiedCcns] = useState(wanted);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { getFacility, loading, error } = useWatchlistFacilities(verifiedCcns);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!token || wanted.length < 2) {
      setStatus('invalid');
      setErrorMsg('Missing download token or compare-set facility IDs.');
      return;
    }

    let cancelled = false;
    async function verify() {
      try {
        const res = await fetch('/api/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, ccns: wanted }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.valid && data.product === 'compare_brief') {
          setVerifiedCcns(data.ccns || wanted);
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
        if (cancelled) return;
        setStatus('error');
        setErrorMsg('Could not verify your download link. Please try again.');
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [token, wanted]);

  const homes = verifiedCcns.map((ccn) => getFacility(ccn)).filter(Boolean);
  const dataAsOf = CMS_SNF_AS_OF_ISO;

  const handleDownload = () => {
    if (pdfLoading || homes.length < 2) return;
    setPdfLoading(true);
    setTimeout(() => {
      try {
        generateCompareBriefPDF(homes, { dataAsOf });
        window.plausible && window.plausible('PDF-Download', {
          props: { reportType: 'compare-brief', count: String(homes.length) },
        });
      } catch (err) {
        console.error('Compare Brief PDF failed:', err);
        alert('Failed to generate the Compare Brief. Please try again.');
      } finally {
        setPdfLoading(false);
      }
    }, 50);
  };

  if (status === 'verifying') {
    return (
      <StatusShell title="Verifying Download | The Oversight Report">
        <p style={{ color: 'var(--text-cream)', fontSize: '1.1rem' }}>
          Verifying your Compare Brief download...
        </p>
      </StatusShell>
    );
  }

  if (status === 'valid') {
    if (loading) {
      return (
        <StatusShell title="Your Compare Brief | The Oversight Report">
          <p style={{ color: 'var(--text-cream)', fontSize: '1.1rem' }}>
            Loading the homes in your comparison...
          </p>
        </StatusShell>
      );
    }
    if (error || homes.length < 2) {
      return (
        <ErrorShell
          title="Homes Not Found"
          message="We verified payment but could not load every facility in this comparison. Please contact support with your receipt."
        />
      );
    }
    return (
      <>
        <Helmet>
          <title>Download Compare Brief | The Oversight Report</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <StatusShell title="Download Compare Brief | The Oversight Report" card>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            color: 'var(--text-white)',
            fontSize: '1.75rem',
            marginBottom: '0.75rem',
          }}>
            Your Compare Brief
          </h1>
          <p style={{ color: 'var(--text-cream)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {homes.map((h) => h.name).join(' · ')}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownload}
            disabled={pdfLoading}
            style={{ padding: '14px 28px', fontSize: '1rem' }}
          >
            {pdfLoading ? 'Generating PDF...' : 'Download Compare Brief'}
          </button>
          <p style={{ marginTop: '1.5rem' }}>
            <Link to="/watchlist?compare=1" style={{ color: 'var(--accent-teal)', textDecoration: 'none' }}>
              Back to comparison
            </Link>
          </p>
        </StatusShell>
      </>
    );
  }

  return (
    <ErrorShell
      title={status === 'error' ? 'Verification Error' : 'Link Expired'}
      message={errorMsg}
    />
  );
}

function StatusShell({ title, children, card = false }) {
  return (
    <>
      <Helmet>
        <title>{title}</title>
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
        {card ? (
          <div style={{
            maxWidth: '520px',
            width: '100%',
            textAlign: 'center',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '3rem 2rem',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {children}
          </div>
        ) : children}
      </div>
    </>
  );
}

function ErrorShell({ title, message }) {
  return (
    <StatusShell title={`${title} | The Oversight Report`} card>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#8987;</div>
      <h1 style={{
        fontFamily: "'DM Serif Display', serif",
        color: 'var(--text-white)',
        fontSize: '1.75rem',
        marginBottom: '1rem',
      }}>
        {title}
      </h1>
      <p style={{ color: 'var(--text-cream)', lineHeight: 1.6, marginBottom: '2rem' }}>
        {message}
      </p>
      <p style={{ color: 'var(--text-cream)', marginBottom: '1.5rem' }}>
        Need help? Contact <a href="mailto:contact@oversightreports.com" style={{ color: 'var(--accent-teal)' }}>contact@oversightreports.com</a>
      </p>
      <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
        Back to Home
      </Link>
    </StatusShell>
  );
}
