import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useFacilityData } from '../hooks/useFacilityData';
import HeroSection from '../components/HeroSection';
import USAMap from '../components/USAMap';
import StateDetail from '../components/StateDetail';
import SearchOverlay from '../components/SearchOverlay';
import '../styles/design.css';
import '../styles/map.css';
import '../styles/hero.css';
import '../styles/cards.css';
import '../styles/state-detail.css';
import HowItWorks from '../components/landing/HowItWorks';
import TwoReportsSection from '../components/landing/TwoReportsSection';
import WhyThisExists from '../components/landing/WhyThisExists';
import Footer from '../components/landing/Footer';
import ActionStrip from '../components/landing/ActionStrip';
import '../styles/landing-sections.css';

export function MapPage() {
  const { data, loading, error, searchFacilities } = useFacilityData();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const jumpToMap = location.state?.jumpToMap || searchParams.get('view') === 'map';
  const initState = searchParams.get('state') || null;
  const initView = jumpToMap ? 'states' : initState ? 'detail' : 'hero';
  const [view, setView] = useState(initView);
  const [selectedState, setSelectedState] = useState(initState);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMapVisible, setMobileMapVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const mapSectionRef = useRef(null);
  const stateDetailRef = useRef(null);
  const initialScrollDone = useRef(false);

  // Handle URL params and location state for deep-linking
  useEffect(() => {
    const stateParam = searchParams.get('state');
    const viewParam = searchParams.get('view');
    const jump = location.state?.jumpToMap;

    if (stateParam && data?.states?.[stateParam]) {
      setSelectedState(stateParam);
      setView('detail');
      setSearchParams({}, { replace: true });
    } else if (stateParam && data && !data.states?.[stateParam]) {
      setSelectedState(null);
      setView('states');
      setSearchParams({}, { replace: true });
    } else if (viewParam === 'map' || jump) {
      setView('states');
      if (viewParam) setSearchParams({}, { replace: true });
      // Clear location state so back button doesn't re-trigger
      if (jump) window.history.replaceState({}, '');
    }
  }, [searchParams, location.state, data]);

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyPress(e) {
      if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
        } else if (selectedState) {
          setSelectedState(null);
          setView('states');
        } else if (view === 'states') {
          setView('hero');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedState, view, searchOpen]);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Smooth transitions between views
  // Depends on [view, loading] so deep-link scrolls fire after data loads
  useEffect(() => {
    if (loading) return; // Don't scroll while loading — refs aren't in DOM yet
    const isInitial = !initialScrollDone.current;
    initialScrollDone.current = true;
    // Use instant scroll on deep-link arrival so user doesn't see hero flash
    const behavior = isInitial ? 'instant' : 'smooth';

    if (view === 'states' && mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior });
    } else if (view === 'detail' && stateDetailRef.current) {
      stateDetailRef.current.scrollIntoView({ behavior });
    } else if (view === 'hero') {
      window.scrollTo({ top: 0, behavior });
    }
  }, [view, loading]);

  // Handle state selection
  function handleStateSelect(stateCode) {
    setSelectedState(stateCode);
    setView('detail');
  }

  // Handle back navigation
  function handleBackToMap() {
    setSelectedState(null);
    setView('states');
  }

  function handleBackToHero() {
    setSelectedState(null);
    setView('hero');
  }

  // Handle explore button click
  function handleExploreClick() {
    setView('states');
  }

  // Handle search
  function handleSearchOpen() {
    setSearchOpen(true);
  }

  function handleSearchClose() {
    setSearchOpen(false);
  }

  function handleScrollToCompare() {
    // Compare now lives in My Favorites (/watchlist)
  }

  if (loading) {
    return (
      <div className="map-page">
        <div className="map-loading">
          <div className="map-loading-spinner"></div>
          <div className="map-loading-text">Loading facility data...</div>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
            This may take a moment. We're loading data for 14,713 facilities.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-page">
        <div className="map-error">
          <h2 className="map-error-title">Error Loading Data</h2>
          <p className="map-error-message">{error}</p>
          <p className="map-error-message">
            Please ensure the data file exists at <code>/facilities_map_data.json</code>
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="map-page">
        <div className="map-loading">
          <div className="map-loading-text">No data available</div>
        </div>
      </div>
    );
  }

  const stateData = selectedState ? data.states[selectedState] : null;
  const stateSummary = selectedState ? data.state_summary[selectedState] : null;

  return (
    <div className="map-page">
      <Helmet>
        <title>The Oversight Report — Nursing Home Safety Data</title>
        <meta name="description" content="Search 14,713 nursing homes. See inspection citations, staffing levels, fines, and risk scores. Independent safety data for families, journalists, and attorneys." />
        <link rel="canonical" href="https://oversightreports.com/" />
      </Helmet>
      {/* Hero Section */}
      {(view === 'hero' || view === 'states') && (
        <HeroSection
          national={data.national}
          onExploreClick={handleExploreClick}
          onSearch={handleSearchOpen}
        />
      )}

      {/* Action Strip */}
      {(view === 'hero' || view === 'states') && (
        <ActionStrip
          onSearch={handleSearchOpen}
          onCompare={handleScrollToCompare}
          onExplore={handleExploreClick}
        />
      )}

      {/* How It Works */}
      {(view === 'hero' || view === 'states') && <HowItWorks />}

      {/* Map Section — immediate interaction */}
      {(view === 'states' || (view === 'hero' && selectedState === null)) && (
        <section className="map-section" ref={mapSectionRef}>
          <div className="map-section-title">
            <h2>Select Your State</h2>
            <p>Click any state to view nursing homes and risk data</p>
          </div>
          {isMobile && (
            <div className="mobile-state-select">
              <select
                className="mobile-state-dropdown"
                onChange={(e) => e.target.value && handleStateSelect(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Choose a state...</option>
                {Object.keys(data.state_summary || {}).sort().map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <button
                className="btn btn-secondary mobile-map-toggle"
                onClick={() => setMobileMapVisible(!mobileMapVisible)}
              >
                {mobileMapVisible ? 'Hide Map' : 'Show Map'}
              </button>
            </div>
          )}
          {(!isMobile || mobileMapVisible) && (
            <div className="map-inner">
              <USAMap data={data} onStateSelect={handleStateSelect} />
            </div>
          )}
        </section>
      )}

      {/* Two Reports. Two Audiences. */}
      {(view === 'hero' || view === 'states') && (
        <TwoReportsSection onSearch={handleSearchOpen} />
      )}

      {/* Pricing Comparison: Family Report vs Evidence Report */}
      {(view === 'hero' || view === 'states') && (
        <section className="landing-section section-dark">
          <div className="container">
            <div className="pricing-comparison">
              <h2 className="pricing-comparison-title">Simple, Transparent Pricing</h2>
              <p className="pricing-comparison-subtitle">The data is free. Always. Professional documentation is available when you need it.</p>
              <p className="pricing-comparison-justification">Families get everything they need for free — always. The Evidence Report adds formal documentation designed for legal filings, investigations, and regulatory action. Anyone can purchase one.</p>
              <div className="pricing-comparison-grid">
                {/* Free Card */}
                <div className="pricing-compare-card pricing-compare-free">
                  <div className="pricing-compare-badge">Always Free</div>
                  <h3>Family Report</h3>
                  <div className="pricing-compare-price">Free</div>
                  <p className="pricing-compare-subtitle-card">Plain-language safety guide for your loved one</p>
                  <ul className="pricing-compare-features">
                    <li>Risk scores for 14,713 facilities</li>
                    <li>Clinical context in plain English</li>
                    <li>Printable visit checklist &amp; questions to ask</li>
                    <li>Nearby safer alternatives</li>
                    <li>Resources &amp; helplines</li>
                    <li>Compare favorites side-by-side</li>
                  </ul>
                  <button onClick={handleSearchOpen} className="btn btn-secondary pricing-compare-cta">Search Facilities</button>
                  <a href="#two-reports" className="pricing-compare-cta pricing-compare-cta-sample" onClick={(e) => { e.preventDefault(); document.querySelector('.two-reports-section')?.scrollIntoView({ behavior: 'smooth' }); }}>View Sample Report</a>
                  <p className="pricing-compare-fine-print">No login required. No email required. Just search.</p>
                  <p className="pricing-compare-context">Search any facility → get a personalized Family Report on their page</p>
                </div>
                {/* $29 Card */}
                <div className="pricing-compare-card pricing-compare-paid">
                  <div className="pricing-compare-badge pricing-compare-badge-paid">For Professionals</div>
                  <h3>Evidence Report</h3>
                  <div className="pricing-compare-price">$29</div>
                  <p className="pricing-compare-subtitle-card">Per facility &middot; One-time purchase &middot; Litigation-ready</p>
                  <ul className="pricing-compare-features">
                    <li className="pricing-compare-inherits">Everything in the Family Report, plus:</li>
                    <li>11-page downloadable PDF</li>
                    <li>Full penalty timeline with exact dollar amounts &amp; dates</li>
                    <li>Ownership portfolio analysis with sibling facility performance</li>
                    <li>Individual deficiency details sorted by severity</li>
                    <li>Regulatory citations (42 CFR references)</li>
                    <li>Composite risk score methodology</li>
                    <li>Data sources with verification links</li>
                    <li>Formatted for discovery, FOIA, and investigations</li>
                  </ul>
                  <button onClick={handleSearchOpen} className="btn btn-primary pricing-compare-cta">Buy Evidence Report — $29</button>
                  <a href="/samples/OversightReport_Sample_Evidence_Report.pdf" className="pricing-compare-cta pricing-compare-cta-sample" download>Download Sample Evidence Report</a>
                  <p className="pricing-compare-fine-print">Real facility data. Real CMS records. This is exactly what you get.</p>
                  <p className="pricing-compare-context">Available on any facility page → covers one facility with full documentation</p>
                </div>
              </div>
              <p className="pricing-comparison-footer">Need unlimited access? <a href="/pricing">Pro and Business tiers</a> coming soon.</p>
            </div>
          </div>
        </section>
      )}

      {/* Why This Exists */}
      {(view === 'hero' || view === 'states') && (
        <WhyThisExists />
      )}

      {/* Footer */}
      {(view === 'hero' || view === 'states') && (
        <Footer onExplore={handleExploreClick} onSearch={handleSearchOpen} />
      )}

      {/* State Detail Section */}
      {view === 'detail' && selectedState && (
        <section ref={stateDetailRef}>
          <StateDetail
            stateCode={selectedState}
            stateData={stateData}
            stateSummary={stateSummary}
            onBack={handleBackToMap}
          />
        </section>
      )}

      {/* Search Overlay */}
      {searchOpen && (
        <SearchOverlay
          searchFacilities={searchFacilities}
          onClose={handleSearchClose}
        />
      )}
    </div>
  );
}
