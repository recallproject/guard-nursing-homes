import { useState } from 'react';
import { generatePDF } from '../utils/generatePDF';

// Promo period: unlimited downloads through March 31, 2026
const PROMO_END = new Date('2026-04-01');
const DAILY_LIMIT = 3;

function isPromoActive() {
  return new Date() < PROMO_END;
}

function getDownloadsToday() {
  const key = `pdf_downloads_${new Date().toISOString().slice(0, 10)}`;
  try {
    const val = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(val) ? val : [];
  } catch { return []; }
}

function recordDownload(ccn) {
  const key = `pdf_downloads_${new Date().toISOString().slice(0, 10)}`;
  const downloads = getDownloadsToday();
  downloads.push({ ccn, time: Date.now() });
  localStorage.setItem(key, JSON.stringify(downloads));
}

function getRemainingDownloads() {
  if (isPromoActive()) return Infinity;
  return Math.max(0, DAILY_LIMIT - getDownloadsToday().length);
}

export function DownloadButton({ facility, nearbyFacilities = [], allFacilities = [], label = "Download PDF Report", className = "", variant = "default" }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [limitHit, setLimitHit] = useState(false);

  const remaining = getRemainingDownloads();

  const handleDownload = async () => {
    if (!facility || isGenerating) return;

    if (remaining <= 0) {
      setLimitHit(true);
      return;
    }

    try {
      setIsGenerating(true);
      setTimeout(() => {
        try {
          generatePDF(facility, { nearbyFacilities, allFacilities });
          recordDownload(facility.ccn);
        } catch (error) {
          console.error('PDF generation failed:', error);
          alert('Failed to generate PDF. Please try again.');
        } finally {
          setIsGenerating(false);
        }
      }, 100);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
      setIsGenerating(false);
    }
  };

  if (limitHit || remaining <= 0) {
    return (
      <div className={`download-limit-msg ${className}`}>
        <span>You've downloaded {DAILY_LIMIT} reports today. Come back tomorrow for more.</span>
      </div>
    );
  }

  const btnClass = variant === 'prominent'
    ? `download-btn download-btn--prominent ${isGenerating ? 'loading' : ''} ${className}`
    : `download-btn ${isGenerating ? 'loading' : ''} ${className}`;

  const icon = isGenerating ? '' : '\u2193 ';

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className={btnClass}
      aria-label={label}
    >
      {isGenerating ? 'Generating report...' : `${icon}${label}`}
    </button>
  );
}
