import { useState } from 'react';
import { generatePDF } from '../utils/generatePDF';
import { trackDownload } from '../utils/analytics';

export function DownloadButton({ facility, nearbyFacilities = [], allFacilities = [], antipsychoticData = null, label = "Download PDF Report", className = "", variant = "default" }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (!facility || isGenerating) return;

    trackDownload('family', {
      ccn: facility.ccn || facility.provider_number || '',
      state: facility.state,
      composite_score: String(facility.composite || ''),
      placement: 'download-button',
    }, 'Free-PDF-Download');
    try {
      setIsGenerating(true);
      setTimeout(() => {
        try {
          generatePDF(facility, { nearbyFacilities, allFacilities, antipsychoticData });
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
