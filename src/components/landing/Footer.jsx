import { Link } from 'react-router-dom';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../../data/contact';
import '../../styles/footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3 className="footer-brand-title">The <span className="footer-brand-accent">Oversight</span> Report</h3>
            <p>
              Nursing home risk data, made accessible.
              Because the people you love deserve transparency.
            </p>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <ul>
              <li><Link to="/">Find a facility</Link></li>
              <li><Link to="/skilled-nursing#browse-states">Browse by state</Link></li>
              <li><Link to="/skilled-nursing">Skilled nursing</Link></li>
              <li><Link to="/after-care">After care</Link></li>
              <li><Link to="/care-at-home">Care at home</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>About</h4>
            <ul>
              <li><Link to="/about">About / Why trust us</Link></li>
              <li><Link to="/methodology">Methodology</Link></li>
              <li><Link to="/pricing">Pricing</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <ul>
              <li>
                <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="footer-disclaimer">Reports are prepared using the professional knowledge of a licensed Nurse Practitioner applied to publicly available CMS regulatory data. The Oversight Report is an independent service with no financial ties to any nursing facility or chain. After Care affiliate links, when shown, are disclosed and do not affect facility scores or safety data. Reports are informational — not medical advice — and do not create a provider-patient relationship.</p>
          <p>&copy; {currentYear} The Oversight Report · DataLink Clinical LLC. All data sourced from CMS Medicare.gov. Built by Robert Benard, NP.</p>
          <div className="footer-bottom-links">
            <Link to="/about">About</Link>
            <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
