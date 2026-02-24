import { Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { MapPage } from './pages/MapPage';
import { FacilityPage } from './pages/FacilityPage';
import PricingPage from './pages/PricingPage';
import { ScreeningPage } from './pages/ScreeningPage';
import DiscrepanciesPage from './pages/DiscrepanciesPage';
import OwnershipPage from './pages/OwnershipPage';
import { ReferralScorecardPage } from './pages/ReferralScorecardPage';
import { EvidencePage } from './pages/EvidencePage';
import { WatchlistPage } from './pages/WatchlistPage';
import { TrendsPage } from './pages/TrendsPage';
import { MethodologyPage } from './pages/MethodologyPage';
import './styles/design.css';

function App() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <>
      <Header transparent={isLandingPage} />
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/facility/:ccn" element={<FacilityPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/screening" element={<ScreeningPage />} />
        <Route path="/discrepancies" element={<DiscrepanciesPage />} />
        <Route path="/ownership" element={<OwnershipPage />} />
        <Route path="/referral-scorecard" element={<ReferralScorecardPage />} />
        <Route path="/evidence/:ccn" element={<EvidencePage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
      </Routes>
    </>
  );
}

export default App;
