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
import WhatYoullDiscover from '../components/landing/WhatYoullDiscover';
import SampleReportCard from '../components/landing/SampleReportCard';
import WhoThisIsFor from '../components/landing/WhoThisIsFor';
import WhyThisExists from '../components/landing/WhyThisExists';
import OurData from '../components/landing/OurData';
import Footer from '../components/landing/Footer';
import ActionStrip from '../components/landing/ActionStrip';
import ComingSoon from '../components/landing/ComingSoon';
import ComparisonTool from '../components/ComparisonTool';
import '../styles/landing-sections.css';
import '../styles/comparison.css';

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
  const comparisonRef = useRef(null);

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
  useEffect(() => {
    if (view === 'states' && mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (view === 'detail' && stateDetailRef.current) {
      stateDetailRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (view === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [view]);

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
    if (comparisonRef.current) {
      comparisonRef.current.scrollIntoView({ behavior: 'smooth' });
    }
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

      {/* Why This Exists — Section 2 */}
      {(view === 'hero' || view === 'states') && (
        <>
          <WhyThisExists />
          <OurData />
        </>
      )}

      {/* How It Works — Section 3 */}
      {(view === 'hero' || view === 'states') && <HowItWorks />}

      {/* Map Section */}
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

      {/* Comparison Tool */}
      {(view === 'hero' || view === 'states') && (
        <ComparisonTool ref={comparisonRef} searchFacilities={searchFacilities} />
      )}

      {/* Remaining landing sections */}
      {(view === 'hero' || view === 'states') && (
        <>
          <WhatYoullDiscover />
          <SampleReportCard onSearch={handleSearchOpen} />
          <WhoThisIsFor />
          <ComingSoon />
          <Footer onExplore={handleExploreClick} onSearch={handleSearchOpen} />
        </>
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
