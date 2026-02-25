import { Helmet } from 'react-helmet-async';
import ComingSoon from '../components/landing/ComingSoon';
import WhoThisIsFor from '../components/landing/WhoThisIsFor';
import Footer from '../components/landing/Footer';
import '../styles/design.css';
import '../styles/landing-sections.css';

/**
 * Professional Tools page — moved from homepage
 * Shows the Professional Tools grid and Who This Is For section
 */
export function ProfessionalsPage() {
  return (
    <div className="professionals-page">
      <Helmet>
        <title>Professional Tools — The Oversight Report</title>
        <meta name="description" content="Advanced tools for attorneys, journalists, regulators, and healthcare professionals. State screening, staffing discrepancies, ownership networks, and more." />
      </Helmet>

      {/* Page Header */}
      <section className="landing-section section-dark" style={{ paddingTop: '8rem' }}>
        <div className="container">
          <div className="section-header">
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '1rem', color: 'var(--text-white)' }}>
              Professional Tools
            </h1>
            <p style={{ fontSize: '1.25rem', maxWidth: '700px', margin: '0 auto', color: 'var(--text-muted)' }}>
              Advanced analytics and reporting for attorneys, journalists, regulators, and healthcare professionals
            </p>
          </div>
        </div>
      </section>

      {/* Professional Tools Grid */}
      <ComingSoon />

      {/* Who This Is For */}
      <WhoThisIsFor />

      {/* Footer */}
      <Footer />
    </div>
  );
}
