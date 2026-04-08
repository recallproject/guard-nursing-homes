import { Component } from 'react';

class FacilityErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('FacilityErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Extract CCN from the URL path
    const pathParts = window.location.pathname.split('/');
    const ccn = pathParts[pathParts.indexOf('facility') + 1] || 'unknown';

    const errorMessage = this.state.error?.message || 'Unknown error';
    const mailtoSubject = encodeURIComponent(`Error on facility ${ccn}`);
    const mailtoBody = encodeURIComponent(
      `Facility CCN: ${ccn}\nURL: ${window.location.href}\nError: ${errorMessage}`
    );

    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.5rem',
        background: '#0f172a',
      }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            opacity: 0.6,
          }}>
            &#x26A0;
          </div>
          <h2 style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
            color: '#e2e8f0',
            marginBottom: '1rem',
            lineHeight: 1.2,
          }}>
            Something went wrong loading this facility
          </h2>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '1rem',
            color: '#94a3b8',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}>
            We hit an unexpected error while loading facility <strong style={{ color: '#cbd5e1', fontFamily: "'JetBrains Mono', monospace" }}>{ccn}</strong>. This may be a temporary issue.
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            alignItems: 'center',
          }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.875rem 2rem',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                background: '#2B6CB0',
                color: '#ffffff',
                transition: 'all 0.3s ease',
              }}
            >
              Try Again
            </button>
            <a
              href={`mailto:feedback@nursinghomewatchdog.com?subject=${mailtoSubject}&body=${mailtoBody}`}
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#64748b',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              Report This Issue
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default FacilityErrorBoundary;
