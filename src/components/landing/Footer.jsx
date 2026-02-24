export default function Footer({ onExplore, onSearch }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3>The Oversight Report</h3>
            <p>
              Nursing home risk data, made accessible.
              Because the people you love deserve transparency.
            </p>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <ul>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); onExplore(); }}>
                  State Map
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); onSearch(); }}>
                  Search Facilities
                </a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>About</h4>
            <ul>
              <li><a href="/pricing">Pricing</a></li>
              <li><a href="#methodology">Methodology</a></li>
              <li><a href="#data-sources">Data Sources</a></li>
              <li><a href="mailto:contact@oversightreports.com">Contact Us</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {currentYear} The Oversight Report. All data sourced from CMS Medicare.gov. Built by Robert Benard.</p>
          <div className="footer-bottom-links">
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
