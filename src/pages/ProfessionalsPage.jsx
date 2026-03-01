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
    <div className="professionals-page" style={{ paddingTop: '5rem' }}>
      <Helmet>
        <title>Professional Tools — The Oversight Report</title>
        <meta name="description" content="Advanced tools for attorneys, journalists, regulators, and healthcare professionals. State screening, staffing discrepancies, ownership networks, and more." />
      </Helmet>

      {/* Professional Tools Grid — includes its own header */}
      <ComingSoon />

      {/* Who This Is For */}
      <WhoThisIsFor />

      {/* Footer */}
      <Footer />
    </div>
  );
}
