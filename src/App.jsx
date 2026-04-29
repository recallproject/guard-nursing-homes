import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { MapPage } from './pages/MapPage';
import FeedbackButton from './components/FeedbackButton';
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
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));

// Redirect /evidence/:ccn -> /facility/:ccn (Facility Brief is now free on every facility page)
function EvidenceRedirect() {
  const { ccn } = useParams();
  return <Navigate to={`/facility/${ccn}`} replace />;
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
  const isLandingPage = location.pathname === '/' || location.pathname === '';
  const { lastAdded, clearLastAdded } = useWatchlist();

  return (
    <>
      <Header transparent={isLandingPage} lightMode={isLandingPage} />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/facility/:ccn" element={<FacilityErrorBoundary><FacilityPage /></FacilityErrorBoundary>} />
          <Route path="/professionals" element={<ProfessionalsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/screening" element={<ScreeningPage />} />
          <Route path="/discrepancies" element={<DiscrepanciesPage />} />
          <Route path="/ownership" element={<OwnershipPage />} />
          <Route path="/referral-scorecard" element={<ReferralScorecardPage />} />
          {/* /evidence/:ccn redirects to /facility/:ccn — Facility Brief is now free on every facility page */}
          <Route path="/evidence/:ccn" element={<EvidenceRedirect />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/ag-toolkit" element={<AGToolkitPage />} />
          <Route path="/chains" element={<ChainsPage />} />
          <Route path="/chain/:chainName" element={<ChainDetailPage />} />
          <Route path="/high-risk" element={<HighRiskPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/ask-a-clinician" element={<AskClinicianPage />} />
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
          <Route path="/california" element={<Navigate to="/states/california" replace />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/favorites" element={<Navigate to="/watchlist" replace />} />
          <Route path="/ask-clinician" element={<Navigate to="/ask-a-clinician" replace />} />
          <Route path="/map" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <FeedbackButton />
      <SaveToast
        visible={!!lastAdded}
        facilityName={lastAdded?.name}
        onDismiss={clearLastAdded}
      />
    </>
  );
}

export default App;
