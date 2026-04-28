import { useState } from 'react';
import { Link } from 'react-router-dom';
import { generatePDF } from '../utils/generatePDF';
import { generateEvidencePDF } from '../utils/generateEvidencePDF';
import '../styles/facility-downloads.css';

export default function FacilityDownloads({
  facility,
  nearbyFacilities = [],
  allFacilities = [],
  antipsychoticData = null,
}) {
  const [familyLoading, setFamilyLoading] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);

  const trackEvent = (name, props) => {
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible(name, { props });
    }
  };

  const downloadFamilyReport = async () => {
    if (!facility || familyLoading) return;
    trackEvent('Free-PDF-Download', {
      ccn: facility.ccn || facility.provider_number || '',
      state: facility.state,
      report: 'family',
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

  const downloadFacilityBrief = async () => {
    if (!facility || briefLoading) return;
    trackEvent('Free-PDF-Download', {
      ccn: facility.ccn || facility.provider_number || '',
      state: facility.state,
      report: 'brief',
      composite_score: String(facility.composite || ''),
    });
    setBriefLoading(true);
    setTimeout(() => {
      try {
        generateEvidencePDF(facility, nearbyFacilities, allFacilities, antipsychoticData, null, 'attorney');
      } catch (err) {
        console.error('Facility Brief PDF failed:', err);
        alert('Failed to generate brief. Please try again.');
      } finally {
        setBriefLoading(false);
      }
    }, 100);
  };

  return (
    <div className="section" id="s-downloads">
      <div className="section-header-row">
        <div className="section-number">10</div>
        <div className="section-title">Take this with you</div>
      </div>
      <p className="section-subtitle">Two free reports built from federal CMS data, formatted for different needs. No login. No paywall.</p>

      <div className="fd-grid">
        {/* FAMILY REPORT */}
        <div className="fd-card fd-card--family">
          <div className="fd-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="fd-title">Family Report</div>
          <div className="fd-audience">For families · plain-language</div>
          <p className="fd-desc">A scannable summary you can read in 5 minutes. Designed for placement decisions and conversations with the facility.</p>
          <ul className="fd-bullets">
            <li>Safety score and key alerts</li>
            <li>Top concerns in plain English</li>
            <li>Questions to ask the facility</li>
            <li>Comparable nearby facilities</li>
          </ul>
          <div className="fd-stats">
            <div className="fd-stat"><span className="fd-stat-num">12</span><span className="fd-stat-label">Pages</span></div>
            <div className="fd-stat-divider"></div>
            <div className="fd-stat"><span className="fd-stat-num">5 min</span><span className="fd-stat-label">Read time</span></div>
          </div>
          <button className="fd-btn" onClick={downloadFamilyReport} disabled={familyLoading} aria-label="Download Family Report">
            {familyLoading ? (
              <span>Generating…</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Family Report
              </>
            )}
          </button>
          <div className="fd-pills">
            <span className="fd-pill">Free</span>
            <span className="fd-pill">No login</span>
            <span className="fd-pill">No email</span>
          </div>
        </div>

        {/* FACILITY BRIEF */}
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
          <div className="fd-audience">For attorneys · journalists · AGs</div>
          <p className="fd-desc">Detailed inspection, penalty, ownership, and quality data with full federal regulatory citations. Designed for case evaluation.</p>
          <ul className="fd-bullets">
            <li>Full inspection citation history</li>
            <li>Federal regulation references (42 CFR)</li>
            <li>Ownership chain and related-party data</li>
            <li>Discovery angle for every citation</li>
          </ul>
          <div className="fd-stats">
            <div className="fd-stat"><span className="fd-stat-num">22</span><span className="fd-stat-label">Pages</span></div>
            <div className="fd-stat-divider"></div>
            <div className="fd-stat"><span className="fd-stat-num">12 min</span><span className="fd-stat-label">Read time</span></div>
          </div>
          <button className="fd-btn" onClick={downloadFacilityBrief} disabled={briefLoading} aria-label="Download Facility Brief">
            {briefLoading ? (
              <span>Generating…</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Facility Brief
              </>
            )}
          </button>
          <div className="fd-pills">
            <span className="fd-pill">Free</span>
            <span className="fd-pill">No login</span>
            <span className="fd-pill">No email</span>
          </div>
        </div>
      </div>

      {/* Ask a Clinician panel */}
      <div className="fd-clinician">
        <div className="fd-clinician-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className="fd-clinician-text">
          <div className="fd-clinician-tag">Optional · Personalized</div>
          <div className="fd-clinician-headline">Not sure what this data means for your family?</div>
          <div className="fd-clinician-sub">A nurse practitioner reviews this facility's safety record and answers the questions families actually ask.</div>
        </div>
        <Link
          to="/ask-a-clinician"
          state={{ ccn: facility?.ccn, facilityName: facility?.name }}
          className="fd-clinician-cta"
          onClick={() => trackEvent('Ask-Clinician-CTA-Click', { ccn: facility?.ccn || '', placement: 'downloads-section' })}
        >
          Ask a Clinician<span className="fd-clinician-price"> · $49</span>
        </Link>
      </div>
    </div>
  );
}
