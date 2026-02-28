import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { MapPage } from './pages/MapPage';
import { FacilityPage } from './pages/FacilityPage';
import { ProfessionalsPage } from './pages/ProfessionalsPage';
import PricingPage from './pages/PricingPage';
import { ScreeningPage } from './pages/ScreeningPage';
import DiscrepanciesPage from './pages/DiscrepanciesPage';
import OwnershipPage from './pages/OwnershipPage';
import { ReferralScorecardPage } from './pages/ReferralScorecardPage';
import { EvidencePage } from './pages/EvidencePage';
import { WatchlistPage } from './pages/WatchlistPage';
import { TrendsPage } from './pages/TrendsPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { AGToolkitPage } from './pages/AGToolkitPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ChainsPage } from './pages/ChainsPage';
import { ChainDetailPage } from './pages/ChainDetailPage';
import HighRiskPage from './pages/HighRiskPage';
import SuccessPage from './pages/SuccessPage';
import FeedbackButton from './components/FeedbackButton';
import { SaveToast } from './components/SaveToast';
import { useWatchlist } from './hooks/useWatchlist';
import './styles/design.css';

function App() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/' || location.pathname === '';
  const { lastAdded, clearLastAdded } = useWatchlist();

  return (
    <>
      <Header transparent={isLandingPage} lightMode={isLandingPage} />
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/facility/:ccn" element={<FacilityPage />} />
        <Route path="/professionals" element={<ProfessionalsPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/screening" element={<ScreeningPage />} />
        <Route path="/discrepancies" element={<DiscrepanciesPage />} />
        <Route path="/ownership" element={<OwnershipPage />} />
        <Route path="/referral-scorecard" element={<ReferralScorecardPage />} />
        <Route path="/evidence/:ccn" element={<EvidencePage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="/ag-toolkit" element={<AGToolkitPage />} />
        <Route path="/chains" element={<ChainsPage />} />
        <Route path="/chain/:chainName" element={<ChainDetailPage />} />
        <Route path="/high-risk" element={<HighRiskPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/compare" element={<Navigate to="/watchlist" replace />} />
      </Routes>
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
