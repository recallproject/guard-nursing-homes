import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Page Not Found | The Oversight Report</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-deep)',
        padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            color: 'var(--text-white)',
            fontSize: '2.5rem',
            marginBottom: '1rem',
          }}>
            Page Not Found
          </h1>
          <p style={{
            color: 'var(--text-cream)',
            fontSize: '1.1rem',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}>
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
