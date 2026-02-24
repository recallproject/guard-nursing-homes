import { useState } from 'react';
import { generatePDF } from '../utils/generatePDF';

/**
 * DownloadButton Component
 *
 * A reusable button that triggers PDF report generation for a facility.
 * Shows loading state during generation and handles errors gracefully.
 *
 * @param {Object} props
 * @param {Object} props.facility - The facility data object to generate PDF for
 * @param {string} [props.label="Download PDF Report"] - Button label text
 * @param {string} [props.className=""] - Additional CSS classes
 */
export function DownloadButton({ facility, label = "Download PDF Report", className = "" }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (!facility || isGenerating) return;

    try {
      setIsGenerating(true);

      // Generate and download the PDF
      // Using setTimeout to ensure the loading state is visible
      setTimeout(() => {
        try {
          generatePDF(facility);
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

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className={`download-btn ${isGenerating ? 'loading' : ''} ${className}`}
      aria-label={label}
    >
      {isGenerating ? 'Generating report...' : label}
    </button>
  );
}
