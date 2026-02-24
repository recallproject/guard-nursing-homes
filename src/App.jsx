import { Routes, Route } from 'react-router-dom';
import { MapPage } from './pages/MapPage';
import { FacilityPage } from './pages/FacilityPage';
import PricingPage from './pages/PricingPage';
import './styles/design.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MapPage />} />
      <Route path="/facility/:ccn" element={<FacilityPage />} />
      <Route path="/pricing" element={<PricingPage />} />
    </Routes>
  );
}

export default App;
