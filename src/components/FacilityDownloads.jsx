import { useState } from 'react';
import { generatePDF } from '../utils/generatePDF';
import { checkoutSingleReport } from '../utils/stripe';
import '../styles/facility-downloads.css';

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function facilityCcn(facility) {
  return facility?.ccn || facility?.provider_number || '';
}

function useFacilityReportActions(facility, nearbyFacilities, allFacilities, antipsychoticData, placement) {
  const [familyLoading, setFamilyLoading] = useState(false);

  const trackEvent = (name, props) => {
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible(name, { props });
    }
  };

  const downloadFamilyReport = () => {
    if (!facility || familyLoading) return;
    trackEvent('Free-PDF-Download', {
      ccn: facilityCcn(facility),
      state: facility.state,
      report: 'family',
      placement,
      composite_score: String(facility.composite || ''),
    });
    setFamilyLoading(true);
    setTimeout(() => {
      try {
        generatePDF(facility, { nearbyFacilities, allFacilities, antipsychoticData });
      } catch (err) {
        console.error('Family Report PDF failed:', err);
        alert('Failed to generate report. Please try again.');
      } finally {
        setFamilyLoading(false);
      }
    }, 100);
  };

  const buyFacilityBrief = () => {
    if (!facility) return;
    const ccn = facilityCcn(facility);
    if (!ccn) {
      alert('This facility is missing a CMS ID, so checkout cannot start. Please try another facility or contact support.');
      return;
    }
    trackEvent('Facility-Brief-Checkout', {
      ccn,
      state: facility.state,
      placement,
      composite_score: String(facility.composite || ''),
    });
    checkoutSingleReport(ccn);
  };

  return { familyLoading, downloadFamilyReport, buyFacilityBrief };
}

const MEDICARE_COMPARE = 'https://www.medicare.gov/care-compare/';

/** Compact sticky Downloads rail — two primary CTAs only. */
export function FacilityCtaRail({
  facility,
  nearbyFacilities = [],
  allFacilities = [],
  antipsychoticData = null,
}) {
  const { familyLoading, downloadFamilyReport, buyFacilityBrief } = useFacilityReportActions(
    facility,
    nearbyFacilities,
    allFacilities,
    antipsychoticData,
    'cta-rail'
  );

  return (
    <aside className="fp-cta-rail" aria-label="Downloads">
      <div className="fp-cta-rail-card">
        <h2 className="fp-cta-rail-title">Downloads</h2>
        <p className="fp-cta-rail-note">Everything on this page is free to browse. PDFs below are optional.</p>

        <div className="fp-cta-item">
          <div className="fp-cta-item-kicker">1 · Family Report · Free</div>
          <p className="fp-cta-item-desc">1-page plain-language summary for families.</p>
          <button
            type="button"
            className="fp-cta-btn fp-cta-btn--free"
            onClick={downloadFamilyReport}
            disabled={familyLoading}
            aria-label="Download Family Report (Free)"
          >
            {familyLoading ? 'Generating…' : (
              <>
                <DownloadIcon />
                Download Family Report (Free)
              </>
            )}
          </button>
        </div>

        <div className="fp-cta-item fp-cta-item--paid">
          <div className="fp-cta-item-kicker">2 · Facility Brief · $29</div>
          <ul className="fp-cta-item-bullets">
            <li>Scannable 9-page brief (not a text wall)</li>
            <li>Inspection story · visit checklist · worksheet</li>
            <li>Same public facts — packaged to share</li>
          </ul>
          <button
            type="button"
            className="fp-cta-btn fp-cta-btn--paid"
            onClick={buyFacilityBrief}
            aria-label="Buy Facility Brief ($29)"
          >
            Buy Facility Brief ($29)
          </button>
        </div>

        <p className="fp-cta-disclaimer">
          Always verify on <a href={MEDICARE_COMPARE} target="_blank" rel="noopener noreferrer">Medicare Care Compare</a>.
          Not affiliated with or endorsed by HHS/CMS.
        </p>
      </div>
    </aside>
  );
}

export default function FacilityDownloads({
  facility,
  nearbyFacilities = [],
  allFacilities = [],
  antipsychoticData = null,
}) {
  const { familyLoading, downloadFamilyReport, buyFacilityBrief } = useFacilityReportActions(
    facility,
    nearbyFacilities,
    allFacilities,
    antipsychoticData,
    'downloads-section'
  );

  return (
    <div className="section" id="s-downloads">
      <div className="section-header-row">
        <div className="section-number">10</div>
        <div className="section-title">Take this with you</div>
      </div>
      <p className="section-subtitle">All facility data on this page is free. Optional PDFs if you want a copy to share.</p>

      <div className="fd-grid">
        <div className="fd-card fd-card--family">
          <div className="fd-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="fd-title">Family Report</div>
          <div className="fd-audience">Free · for families · plain-language</div>
          <p className="fd-desc">A short summary you can read before a visit or share with relatives. Same public CMS facts as this page.</p>
          <ul className="fd-bullets">
            <li>Safety score and key alerts</li>
            <li>Top concerns in plain English</li>
            <li>Questions to ask the facility</li>
            <li>Comparable nearby facilities</li>
          </ul>
          <button
            type="button"
            className="fd-btn"
            onClick={downloadFamilyReport}
            disabled={familyLoading}
            aria-label="Download Family Report (Free)"
          >
            {familyLoading ? (
              <span>Generating…</span>
            ) : (
              <>
                <DownloadIcon />
                Download Family Report (Free)
              </>
            )}
          </button>
        </div>

        <div className="fd-card fd-card--brief">
          <div className="fd-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="fd-title">Facility Brief</div>
          <div className="fd-audience">$29 · printable · for families</div>
          <p className="fd-desc">A 9-page printable brief of this facility’s public record — decision snapshot, inspection story, staffing hours, and a visit checklist with answer lines.</p>
          <ul className="fd-bullets">
            <li>Decision snapshot and inspection story</li>
            <li>Staffing hours per resident day (HPRD)</li>
            <li>Visit checklist with blank answer lines</li>
            <li>Nearby comparison + decision worksheet</li>
          </ul>
          <button
            type="button"
            className="fd-btn fd-btn--paid"
            onClick={buyFacilityBrief}
            aria-label="Buy Facility Brief ($29)"
          >
            Buy Facility Brief ($29)
          </button>
        </div>
      </div>
    </div>
  );
}
