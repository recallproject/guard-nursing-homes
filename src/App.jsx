import { Routes, Route, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { MapPage } from './pages/MapPage';
import CaliforniaBanner from './components/landing/CaliforniaBanner';
import FacilityErrorBoundary from './components/FacilityErrorBoundary';
import { SaveToast } from './components/SaveToast';
import { useWatchlist } from './hooks/useWatchlist';
import './styles/design.css';

// Lazy-load all pages except the homepage (MapPage)
const FacilityPage = lazy(() => import('./pages/FacilityPage').then(m => ({ default: m.FacilityPage })));
const ProfessionalsPage = lazy(() => import('./pages/ProfessionalsPage').then(m => ({ default: m.ProfessionalsPage })));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ScreeningPage = lazy(() => import('./pages/ScreeningPage').then(m => ({ default: m.ScreeningPage })));
const DiscrepanciesPage = lazy(() => import('./pages/DiscrepanciesPage'));
const OwnershipPage = lazy(() => import('./pages/OwnershipPage'));
const ReferralScorecardPage = lazy(() => import('./pages/ReferralScorecardPage').then(m => ({ default: m.ReferralScorecardPage })));
const EvidencePage = lazy(() => import('./pages/EvidencePage').then(m => ({ default: m.EvidencePage })));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage').then(m => ({ default: m.WatchlistPage })));
const TrendsPage = lazy(() => import('./pages/TrendsPage').then(m => ({ default: m.TrendsPage })));
const MethodologyPage = lazy(() => import('./pages/MethodologyPage').then(m => ({ default: m.MethodologyPage })));
const AGToolkitPage = lazy(() => import('./pages/AGToolkitPage').then(m => ({ default: m.AGToolkitPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const ChainsPage = lazy(() => import('./pages/ChainsPage').then(m => ({ default: m.ChainsPage })));
const ChainDetailPage = lazy(() => import('./pages/ChainDetailPage').then(m => ({ default: m.ChainDetailPage })));
const HighRiskPage = lazy(() => import('./pages/HighRiskPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const SuccessPage = lazy(() => import('./pages/SuccessPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const AskClinicianPage = lazy(() => import('./pages/AskClinicianPage'));
const AskClinicianSubmittedPage = lazy(() => import('./pages/AskClinicianSubmittedPage'));
const EvidenceSamplePage = lazy(() => import('./pages/EvidenceSamplePage'));
const EvidenceSuccessPage = lazy(() => import('./pages/EvidenceSuccessPage'));
const EvidenceDownloadPage = lazy(() => import('./pages/EvidenceDownloadPage'));
const KnowYourRightsPage = lazy(() => import('./pages/KnowYourRightsPage'));
const DataTransparencyPage = lazy(() => import('./pages/DataTransparencyPage'));
const AntipsychoticTrendsPage = lazy(() => import('./pages/AntipsychoticTrendsPage').then(m => ({ default: m.AntipsychoticTrendsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const FamiliesPage = lazy(() => import('./pages/FamiliesPage'));
const HospitalsPage = lazy(() => import('./pages/HospitalsPage'));
const AttorneysPage = lazy(() => import('./pages/AttorneysPage'));
const StatePage = lazy(() => import('./pages/StatePage'));
const StateHubPage = lazy(() => import('./pages/StateHubPage'));
const StateTypePage = lazy(() => import('./pages/StateTypePage'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const PostAcuteHomePage = lazy(() => import('./pages/PostAcuteHomePage'));
const HospicePage = lazy(() => import('./pages/HospicePage'));
const HospiceProviderPage = lazy(() => import('./pages/HospiceProviderPage'));
const HospiceComparePage = lazy(() => import('./pages/HospiceComparePage'));
const HospiceNewsPage = lazy(() => import('./pages/HospiceNewsPage'));
const HospiceStatePage = lazy(() => import('./pages/HospiceStatePage'));
const HospiceChainsPage = lazy(() => import('./pages/HospiceChainsPage'));
const HospiceChainDetailPage = lazy(() => import('./pages/HospiceChainDetailPage'));
const HospiceHighRiskPage = lazy(() => import('./pages/HospiceHighRiskPage'));
const PostAcuteHubPage = lazy(() => import('./pages/PostAcuteHubPage'));
const PostAcuteStatePage = lazy(() => import('./pages/PostAcuteStatePage'));
const PostAcuteProviderPage = lazy(() => import('./pages/PostAcuteProviderPage'));
const RefreshLogPage = lazy(() => import('./pages/RefreshLogPage'));

// Feature flag: post-acute hub homepage is ON by default. To roll back, set
// VITE_POST_ACUTE_HOME_ENABLED=false in Vercel project env vars and redeploy.
const POST_ACUTE_HOME_ENABLED = import.meta.env.VITE_POST_ACUTE_HOME_ENABLED !== 'false';

// Redirect /evidence/:ccn -> /facility/:ccn (Facility Brief checkout lives on the facility page)
function EvidenceRedirect() {
  const { ccn } = useParams();
  return <Navigate to={`/facility/${ccn}`} replace />;
}

// `/` is the post-acute hub when the flag is on; SNF MapPage lives at /skilled-nursing.
// Preserve old `/?state=`, `/?view=map`, and jumpToMap location-state deep-links.
function RootHome() {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  if (POST_ACUTE_HOME_ENABLED) {
    const snfQuery = searchParams.get('state')
      || searchParams.get('view') === 'map'
      || searchParams.get('q')
      || searchParams.get('city');
    const jumpToMap = location.state?.jumpToMap;
    if (snfQuery || jumpToMap) {
      const qs = searchParams.toString();
      const search = qs ? `?${qs}` : jumpToMap ? '?view=map' : '';
      return <Navigate to={`/skilled-nursing${search}`} replace />;
    }
    return <PostAcuteHomePage />;
  }

  return <MapPage />;
}

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#94a3b8' }}>
      Loading...
    </div>
  );
}

function App() {
  const location = useLocation();
  // Landing-page treatment (transparent header) applies to / and to the SNF page when the
  // post-acute hub is enabled — /skilled-nursing renders MapPage and needs the same header style.
  const isHomePage =
    location.pathname === '/' ||
    location.pathname === '' ||
    location.pathname === '/post-acute';
  const isLandingPage = isHomePage || location.pathname === '/skilled-nursing';
  const { lastAdded, clearLastAdded } = useWatchlist();

  return (
    <>
      <CaliforniaBanner />
      <Header transparent={isLandingPage} lightMode={isLandingPage} simple={isHomePage} />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<RootHome />} />
          <Route path="/post-acute" element={<PostAcuteHomePage />} />
          <Route path="/skilled-nursing" element={<MapPage />} />
          <Route path="/hospice" element={<HospicePage />} />
          <Route path="/hospice/compare" element={<HospiceComparePage />} />
          <Route path="/hospice/news" element={<HospiceNewsPage />} />
          <Route path="/hospice/chains" element={<HospiceChainsPage />} />
          <Route path="/hospice/chain/:slug" element={<HospiceChainDetailPage />} />
          <Route path="/hospice/high-risk" element={<HospiceHighRiskPage />} />
          <Route path="/hospice/state/:stateCode" element={<HospiceStatePage />} />
          <Route path="/hospice/:ccn" element={<HospiceProviderPage />} />
          <Route path="/home-health" element={<PostAcuteHubPage settingId="home-health" />} />
          <Route path="/home-health/state/:stateCode" element={<PostAcuteStatePage settingId="home-health" />} />
          <Route path="/home-health/:ccn" element={<PostAcuteProviderPage settingId="home-health" />} />
          <Route path="/irf" element={<PostAcuteHubPage settingId="irf" />} />
          <Route path="/irf/state/:stateCode" element={<PostAcuteStatePage settingId="irf" />} />
          <Route path="/irf/:ccn" element={<PostAcuteProviderPage settingId="irf" />} />
          <Route path="/ltach" element={<PostAcuteHubPage settingId="ltach" />} />
          <Route path="/ltach/state/:stateCode" element={<PostAcuteStatePage settingId="ltach" />} />
          <Route path="/ltach/:ccn" element={<PostAcuteProviderPage settingId="ltach" />} />
          <Route path="/refresh-log" element={<RefreshLogPage />} />
          <Route path="/facility/:ccn" element={<FacilityErrorBoundary><FacilityPage /></FacilityErrorBoundary>} />
          <Route path="/professionals" element={<ProfessionalsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          {/* Parked: AG Toolkit / screening kept for bookmarks; not linked from primary UI */}
          <Route path="/screening" element={<ScreeningPage />} />
          <Route path="/discrepancies" element={<DiscrepanciesPage />} />
          <Route path="/ownership" element={<OwnershipPage />} />
          <Route path="/referral-scorecard" element={<ReferralScorecardPage />} />
          {/* /evidence/:ccn redirects to /facility/:ccn — Facility Brief is $29 checkout on the facility page */}
          <Route path="/evidence/:ccn" element={<EvidenceRedirect />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/ag-toolkit" element={<AGToolkitPage />} /> {/* Parked: not linked from primary UI */}
          <Route path="/chains" element={<ChainsPage />} />
          <Route path="/chain/:chainName" element={<ChainDetailPage />} />
          <Route path="/high-risk" element={<HighRiskPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/ask-a-clinician" element={<AskClinicianPage />} /> {/* Parked: not linked from primary UI */}
          <Route path="/ask-a-clinician-submitted" element={<AskClinicianSubmittedPage />} />
          <Route path="/evidence-success" element={<EvidenceSuccessPage />} />
          <Route path="/evidence-download" element={<EvidenceDownloadPage />} />
          <Route path="/evidence-sample" element={<EvidenceSamplePage />} />
          <Route path="/know-your-rights" element={<KnowYourRightsPage />} />
          <Route path="/data-transparency" element={<DataTransparencyPage />} />
          <Route path="/antipsychotic-trends" element={<AntipsychoticTrendsPage />} />
          <Route path="/families" element={<FamiliesPage />} />
          <Route path="/hospitals" element={<HospitalsPage />} />
          <Route path="/attorneys" element={<AttorneysPage />} />
          <Route path="/state/:code" element={<StatePage />} />
          <Route path="/states/:stateCode" element={<StateHubPage />} />
          <Route path="/states/:stateCode/:typeSlug" element={<StateTypePage />} />
          <Route path="/california" element={<Navigate to="/states/california" replace />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/favorites" element={<Navigate to="/watchlist" replace />} />
          <Route path="/ask-clinician" element={<Navigate to="/ask-a-clinician" replace />} />
          <Route path="/map" element={<Navigate to="/skilled-nursing" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <SaveToast
        visible={!!lastAdded}
        facilityName={lastAdded?.name}
        onDismiss={clearLastAdded}
      />
    </>
  );
}

export default App;
