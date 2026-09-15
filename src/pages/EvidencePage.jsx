import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useFacilityData } from '../hooks/useFacilityData';
import { haversineDistance } from '../utils/haversine';
import { generateFacilityBriefPDF } from '../utils/generateFacilityBriefPDF';
import { buildFacilityBriefModel } from '../utils/facilityBriefContent';
import { checkoutSingleReport } from '../utils/stripe';
import { useSubscription, canAccess } from '../hooks/useSubscription';
import { FacilityBriefDocument } from '../components/FacilityBriefDocument';

import ComingSoonPage from '../components/ComingSoonPage';
import '../styles/evidence.css';
import '../styles/facility-brief.css';

export function EvidencePage({ tokenVerified = false, ccnOverride = null }) {
  const COMING_SOON = true;  // DATA AUDIT IN PROGRESS — re-enable after verification fixes
  const params = useParams();
  const ccn = ccnOverride || params.ccn;
  const { data, loading, error } = useFacilityData();
  const { tier } = useSubscription();

  const facility = data?.states
    ? Object.values(data.states).flatMap((state) => state.facilities || []).find((f) => f.ccn === ccn)
    : null;

  const allFacilities = useMemo(() => {
    if (!data?.states) return [];
    return Object.values(data.states).flatMap((state) => state.facilities || []);
  }, [data]);

  const nearbyAlternatives = useMemo(() => {
    if (!facility || !facility.lat || !facility.lon || !allFacilities.length) {
      return [];
    }
    return allFacilities
      .filter((f) => f.ccn !== facility.ccn && f.lat && f.lon && (f.composite || 100) < (facility.composite || 0))
      .map((f) => ({
        ...f,
        distance: haversineDistance(facility.lat, facility.lon, f.lat, f.lon),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [facility, allFacilities]);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [deficiencyDetails, setDeficiencyDetails] = useState(null);
  const [antipsychoticAlerts, setAntipsychoticAlerts] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/antipsychotic_alerts.json`)
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((payload) => setAntipsychoticAlerts(payload))
      .catch(() => setAntipsychoticAlerts(null));
  }, []);

  useEffect(() => {
    if (!facility?.state) return;
    fetch(`${import.meta.env.BASE_URL}deficiency_details/${facility.state}.json`)
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((stateData) => {
        if (stateData) {
          const facDetails = stateData[String(facility.ccn)];
          setDeficiencyDetails(facDetails?.deficiency_details || []);
        }
      })
      .catch(() => setDeficiencyDetails(null));
  }, [facility?.state, facility?.ccn]);

  const dataAsOf = useMemo(() => {
    const stateCode = facility?.state?.toUpperCase();
    return (stateCode && data?.states?.[stateCode]?._metadata?.data_as_of) || null;
  }, [facility, data]);

  const briefModel = useMemo(() => {
    if (!facility) return null;
    return buildFacilityBriefModel(facility, {
      deficiencyDetails: deficiencyDetails || facility.deficiency_details || [],
      nearbyAlternatives,
      dataAsOf,
      antipsychoticData: antipsychoticAlerts ? (antipsychoticAlerts[String(facility.ccn)] || null) : null,
    });
  }, [facility, deficiencyDetails, nearbyAlternatives, dataAsOf, antipsychoticAlerts]);

  const handleDownloadPDF = useCallback(async () => {
    setPdfLoading(true);
    try {
      let enrichedFacility = { ...facility };
      if (deficiencyDetails) {
        enrichedFacility.deficiency_details = deficiencyDetails;
      } else if (facility?.state) {
        try {
          const resp = await fetch(`${import.meta.env.BASE_URL}deficiency_details/${facility.state}.json`);
          if (resp.ok) {
            const stateDeficiencies = await resp.json();
            const facDetails = stateDeficiencies[String(facility.ccn)];
            if (facDetails?.deficiency_details) {
              enrichedFacility.deficiency_details = facDetails.deficiency_details;
            }
          }
        } catch (e) {
          console.warn('Could not load deficiency details:', e);
        }
      }
      const facilityAntipsychoticData = antipsychoticAlerts ? (antipsychoticAlerts[String(facility.ccn)] || null) : null;
      generateFacilityBriefPDF(enrichedFacility, nearbyAlternatives, allFacilities, facilityAntipsychoticData, dataAsOf);
      window.plausible && window.plausible('PDF-Download', {
        props: { facility: facility.name, ccn: facility.ccn, state: facility.state, reportType: 'facility-brief' },
      });
    } finally {
      setPdfLoading(false);
    }
  }, [facility, nearbyAlternatives, allFacilities, deficiencyDetails, antipsychoticAlerts, dataAsOf]);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (facility) {
      window.plausible && window.plausible('Evidence-Page-View', { props: { facility: facility.name, ccn: facility.ccn } });
    }
  }, [ccn, facility]);

  // Paid Facility Brief downloads use tokenVerified via /evidence-download.
  // Keep the public evidence route gated, but do not block customers who already paid.
  if (COMING_SOON && !tokenVerified) {
    return (
      <ComingSoonPage
        title="Evidence Reports — Data Verification in Progress"
        description="We are currently conducting a comprehensive data validation audit, cross-checking all facility records against live CMS sources to ensure 100% accuracy. Evidence Reports will return shortly with enhanced verification and updated penalty, staffing, and quality data."
        tier="professional"
        features={[
          'All penalty and fine data verified against CMS Care Compare',
          'Staffing metrics cross-checked with current PBJ submissions',
          'National benchmarks updated to latest CMS figures',
          'Enhanced quality measure comparisons with state averages',
          'Ownership records validated against CMS ownership database',
          'New clinical red flag indicators added',
        ]}
      />
    );
  }

  if (loading) {
    return (
      <div className="ev">
        <div className="ev-loading">Loading facility data...</div>
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="ev">
        <div className="ev-error">
          <h1>Facility Not Found</h1>
          <p>We could not find a facility with CCN: {ccn}</p>
          <Link to="/skilled-nursing">Return to skilled nursing</Link>
        </div>
      </div>
    );
  }

  if (!tokenVerified && !canAccess(tier, 'professional')) {
    return (
      <div className="ev">
        <div className="ev-header no-print">
          <Link to={`/facility/${ccn}`} className="ev-back">Back to Report Card</Link>
          <h2 className="ev-badge">Facility Brief</h2>
        </div>
        <div className="ev-body ev-body--brief" style={{ opacity: 0.4, filter: 'blur(3px)', pointerEvents: 'none' }}>
          <FacilityBriefDocument model={briefModel} />
        </div>
        <div className="ev-purchase-gate">
          <h2>Facility Brief — {facility.name}</h2>
          <p>A 9-page printable brief with a decision snapshot, inspection story, staffing hours, visit checklist, and nearby comparison — built from public CMS records.</p>
          <p className="ev-value-line">Same public facts as the facility page, packaged to take on a tour. Not an attorney evidence report.</p>
          <div className="ev-purchase-options">
            <button className="ev-buy-btn" onClick={() => checkoutSingleReport(ccn)}>
              Download Facility Brief — $29
            </button>
            <p className="ev-or-subscribe">or <Link to="/pricing">subscribe for unlimited access</Link></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ev ev--brief">
      <Helmet>
        <title>{facility?.name || 'Facility'} — Facility Brief | The Oversight Report</title>
        <meta name="description" content={`Facility Brief for ${facility?.name || 'facility'} in ${facility?.city || ''}, ${facility?.state || ''}. A printable CMS-based snapshot for families preparing a visit.`} />
        <link rel="canonical" href={`https://www.oversightreports.com/evidence/${ccn}`} />
      </Helmet>
      <div className="ev-header no-print">
        <Link to={`/facility/${ccn}`} className="ev-back">Back to Report Card</Link>
        <h2 className="ev-badge">Facility Brief</h2>
        <div className="ev-header-actions">
          <button type="button" onClick={handlePrint} className="ev-btn ev-btn-secondary">
            Print Version
          </button>
          <button type="button" onClick={handleDownloadPDF} className="ev-btn ev-btn-primary" disabled={pdfLoading}>
            {pdfLoading ? 'Generating PDF...' : 'Download Facility Brief'}
          </button>
        </div>
      </div>

      <div className="ev-body ev-body--brief">
        <FacilityBriefDocument
          model={briefModel}
          showActions
          onDownload={handleDownloadPDF}
          onPrint={handlePrint}
          pdfLoading={pdfLoading}
        />
      </div>
    </div>
  );
}
