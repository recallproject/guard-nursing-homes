import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CompareBriefDocument } from '../components/CompareBriefDocument';
import { useWatchlistFacilities } from '../hooks/useFacilityData';
import { CMS_SNF_AS_OF_ISO } from '../data/careSettings';
import { buildCompareBriefModel } from '../utils/compareBriefContent';
import { generateCompareBriefPDF } from '../utils/generateCompareBriefPDF';
import '../styles/compare-brief.css';

export function CompareBriefDownload({ ccns, sample = false }) {
  const { getFacility, loading, error } = useWatchlistFacilities(ccns);
  const [pdfLoading, setPdfLoading] = useState(false);
  const facilities = useMemo(
    () => (ccns || []).map((ccn) => getFacility(ccn)).filter(Boolean),
    [ccns, getFacility],
  );
  const missing = (ccns || []).filter((ccn) => !getFacility(ccn));
  const model = useMemo(() => {
    if (facilities.length < 2) return null;
    return buildCompareBriefModel(facilities, {
      dataAsOf: CMS_SNF_AS_OF_ISO,
      reportDate: sample ? new Date('2026-09-29T12:00:00') : new Date(),
    });
  }, [facilities, sample]);

  const download = () => {
    if (pdfLoading || facilities.length < 2) return;
    setPdfLoading(true);
    setTimeout(() => {
      try {
        generateCompareBriefPDF(facilities, {
          dataAsOf: CMS_SNF_AS_OF_ISO,
          reportDate: sample ? new Date('2026-09-29T12:00:00') : new Date(),
        });
      } catch (err) {
        console.error('Compare Brief PDF failed:', err);
        alert('Failed to generate the Compare Brief. Please try again.');
      } finally {
        setPdfLoading(false);
      }
    }, 50);
  };

  return (
    <div className="cb-page">
      <Helmet>
        <title>{sample ? 'Compare Brief sample' : 'Your Compare Brief'} | The Oversight Report</title>
        <meta
          name="description"
          content="Compare Brief: one PDF with a scorecard, material differences, tour questions, and a notes page for 2 or 3 nursing homes."
        />
        {sample ? (
          <link rel="canonical" href="https://www.oversightreports.com/compare-brief-sample" />
        ) : (
          <meta name="robots" content="noindex" />
        )}
      </Helmet>
      <p className="no-print cb-back">
        <Link to="/watchlist?compare=1">Back to compare</Link>
      </p>
      {loading && <p>Loading the homes on this Compare Brief...</p>}
      {!loading && error && <p>Could not load facility records. Please refresh or contact support.</p>}
      {!loading && !error && missing.length > 0 && (
        <p>Could not find {missing.join(', ')} in the current CMS extract.</p>
      )}
      {!loading && model && (
        <CompareBriefDocument
          model={model}
          showActions
          onDownload={download}
          pdfLoading={pdfLoading}
          sample={sample}
        />
      )}
    </div>
  );
}
