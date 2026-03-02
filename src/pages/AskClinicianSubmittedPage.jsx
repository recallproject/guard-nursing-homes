import { useLocation, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/ask-clinician.css';

export default function AskClinicianSubmittedPage() {
  const location = useLocation();
  const { facility, email, formSummary } = location.state || {};

  // Build mailto link as backup notification
  const mailtoHref = `mailto:contact@oversightreports.com?subject=${
    encodeURIComponent(`Ask a Clinician Request: ${facility || 'Unknown'}`)
  }&body=${encodeURIComponent(formSummary || 'Form data not available — please contact customer.')}`;

  return (
    <div className="ac-page">
      <Helmet>
        <title>Request Received — The Oversight Report</title>
      </Helmet>
      <section className="ac-hero" style={{ paddingBottom: '40px' }}>
        <h1 className="ac-hero-title">Request Received</h1>
        <p className="ac-hero-sub">
          {facility
            ? `Your report request for "${facility}" has been submitted.`
            : 'Your report request has been submitted.'}
        </p>
      </section>

      <div style={{ maxWidth: '620px', margin: '-20px auto 60px', padding: '0 24px' }}>
        <div className="ac-form-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>✓</div>
          <h2 className="ac-form-heading" style={{ marginBottom: '16px' }}>What Happens Next</h2>

          <div style={{ textAlign: 'left', fontSize: '0.9rem', color: '#475569', lineHeight: '1.7' }}>
            <p style={{ marginBottom: '14px' }}>
              <strong style={{ color: '#1D3557' }}>1. Confirm your request</strong> — Click the button below to send your request details to our team. This opens your email client with the details pre-filled.
            </p>
            <p style={{ marginBottom: '14px' }}>
              <strong style={{ color: '#1D3557' }}>2. Payment</strong> — We'll send a secure Stripe payment link to <strong>{email || 'your email'}</strong> for $49. Your report begins once payment is confirmed.
            </p>
            <p style={{ marginBottom: '14px' }}>
              <strong style={{ color: '#1D3557' }}>3. Report preparation</strong> — Robert Benard, NP will pull the latest CMS data on your facility and prepare a plain-English interpretation of the safety record.
            </p>
            <p>
              <strong style={{ color: '#1D3557' }}>4. Delivery</strong> — Your report will be delivered to your email as a PDF within 48 hours of payment.
            </p>
          </div>

          <a href={mailtoHref} className="ac-submit-btn" style={{ display: 'block', textDecoration: 'none', marginTop: '24px', textAlign: 'center' }}>
            Send Request Details
            <span className="ac-btn-sub">Opens your email client with your request pre-filled</span>
          </a>

          <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '20px' }}>
            Email not working? Send your request directly to{' '}
            <a href="mailto:contact@oversightreports.com" style={{ color: '#2B6CB0' }}>contact@oversightreports.com</a>
          </p>

          <Link to="/" style={{
            display: 'inline-block',
            marginTop: '20px',
            padding: '10px 24px',
            border: '1px solid #D7E0EA',
            borderRadius: '10px',
            color: '#2B6CB0',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.88rem',
          }}>
            ← Back to The Oversight Report
          </Link>
        </div>
      </div>
    </div>
  );
}
