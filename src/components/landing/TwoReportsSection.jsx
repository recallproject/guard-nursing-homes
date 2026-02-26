import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { generatePDF } from '../../utils/generatePDF';

gsap.registerPlugin(ScrollTrigger);

// ── Sample facility for Family Report ──
const SAMPLE_FACILITY = {
  name: 'Sample Facility Name',
  ccn: '000000',
  city: 'Springfield',
  state: 'IL',
  zip: '62704',
  beds: 120,
  stars: 1,
  composite: 87.4,
  total_deficiencies: 23,
  total_fines: 284500,
  fine_count: 4,
  denial_count: 1,
  jeopardy_count: 2,
  harm_count: 5,
  zero_rn_pct: 31,
  rn_hprd: 0.15,
  lpn_hprd: 0.47,
  cna_hprd: 1.58,
  total_hprd: 2.35,
  weekend_total_hprd: 1.82,
  pct_contract: 28,
  rn_gap_pct: 42,
  ownership_type: 'For Profit - Corporation',
  worst_owner: 'Sample Holdings LLC',
  owner_portfolio_count: 30,
  owner_avg_fines: 156000,
  chain_name: 'Sample Holdings LLC',
  top_categories: [
    ['Infection Control', 6],
    ['Fall Prevention', 4],
    ['Medication Errors', 3],
    ['Nutrition/Dietary', 3],
    ['Resident Rights', 2],
  ],
};

const SAMPLE_PERCENTILES = {
  composite: 94, total_deficiencies: 87, total_fines: 91,
  zero_rn_pct: 89, harm_count: 92, jeopardy_count: 96, rn_hprd: 93, stars: 88,
};

const SAMPLE_NEARBY = [
  { name: 'Oakwood Care Center', city: 'Springfield', state: 'IL', distance: 2.3, composite: 22.1, stars: 4, beds: 95 },
  { name: 'Lincoln Meadows Nursing', city: 'Springfield', state: 'IL', distance: 4.1, composite: 18.5, stars: 4, beds: 110 },
  { name: 'Heritage Health Center', city: 'Chatham', state: 'IL', distance: 5.7, composite: 35.2, stars: 3, beds: 80 },
];

const SAMPLE_OWNER_PORTFOLIO = [
  { name: 'Lakeview Manor', state: 'IL', stars: 1, composite: 82.1, worst_owner: 'Sample Holdings LLC', ccn: '100001', total_fines: 195000 },
  { name: 'Sunrise Care of Peoria', state: 'IL', stars: 1, composite: 78.5, worst_owner: 'Sample Holdings LLC', ccn: '100002', total_fines: 172000 },
  { name: 'Valley Ridge Health', state: 'IN', stars: 2, composite: 71.3, worst_owner: 'Sample Holdings LLC', ccn: '100003', total_fines: 134000 },
];

export default function TwoReportsSection({ onSearch }) {
  const sectionRef = useRef(null);
  const [generatingFamily, setGeneratingFamily] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.two-reports-col',
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', once: true },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const handleDownloadFamily = () => {
    setGeneratingFamily(true);
    setTimeout(() => {
      try {
        generatePDF(SAMPLE_FACILITY, {
          nearbyFacilities: SAMPLE_NEARBY,
          allFacilities: [SAMPLE_FACILITY, ...SAMPLE_OWNER_PORTFOLIO, ...SAMPLE_NEARBY],
          isSample: true,
          samplePercentiles: SAMPLE_PERCENTILES,
        });
      } catch (err) {
        console.error('Family PDF generation failed:', err);
      } finally {
        setGeneratingFamily(false);
      }
    }, 100);
  };

  return (
    <section className="landing-section section-light two-reports-section" ref={sectionRef}>
      <div className="container">
        <div className="section-header">
          <h2>Two Reports. Two Audiences.</h2>
          <p>Every facility gets a free Family Report. Professionals can unlock the Evidence Report.</p>
        </div>

        <div className="two-reports-grid">
          {/* Family Report */}
          <div className="two-reports-col">
            <div className="two-reports-tag two-reports-tag--free">Family Report — Free</div>
            <div className="two-reports-preview two-reports-preview--family">
              <div className="report-card-mock">
                <div className="report-sample-banner">SAMPLE FAMILY REPORT</div>
                <div className="report-card-header">
                  <div>
                    <h3>Sample Facility Name</h3>
                    <span className="report-card-meta">Springfield, IL · 120 beds · CMS Rating: 1/5</span>
                  </div>
                  <span className="risk-badge high"><span className="score">87.4</span> HIGH RISK</span>
                </div>
                <div className="report-card-body">
                  <div className="report-section">
                    <h4 className="report-section-title">Bottom Line</h4>
                    <div className="report-callout report-callout--red">
                      Inspectors found serious danger to residents 2 times. This facility has been fined $284,500. On 31% of days, there was no registered nurse in the building.
                    </div>
                  </div>
                  <div className="report-section">
                    <h4 className="report-section-title">What This Means For Your Loved One</h4>
                    <div className="report-callout report-callout--red">
                      <strong>Registered Nurse Absence</strong><br />
                      On 31% of days, this facility had NO registered nurse on site. Without an RN present, IV medications cannot be administered and acute changes may not be recognized.
                    </div>
                  </div>
                  <div className="report-section">
                    <h4 className="report-section-title">Questions to Ask When You Visit</h4>
                    <div className="report-question">
                      <strong>Q: How many registered nurses are on duty right now?</strong>
                      <span className="report-question-context">This facility had zero RN days 31% of the time.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="two-reports-tagline">Plain language. Visit checklist. Made for families.</p>
            <button
              className="btn btn-secondary two-reports-download"
              onClick={handleDownloadFamily}
              disabled={generatingFamily}
            >
              {generatingFamily ? 'Generating...' : 'Download Free Sample'}
            </button>
          </div>

          {/* Evidence Report */}
          <div className="two-reports-col">
            <div className="two-reports-tag two-reports-tag--paid">Evidence Report — $29</div>
            <div className="two-reports-preview two-reports-preview--evidence">
              <div className="evidence-preview-mock">
                {/* Navy top bar */}
                <div className="epm-topbar">THE OVERSIGHT REPORT</div>
                {/* Cover area */}
                <div className="epm-cover">
                  <div className="epm-cover-label">EVIDENCE REPORT</div>
                  <div className="epm-cover-rule"></div>
                  <div className="epm-cover-facility">Sample Facility Name</div>
                  <div className="epm-cover-address">Springfield, IL 62704</div>
                  <div className="epm-cover-ccn">CCN: 000000 · 120 Beds</div>
                </div>
                {/* Metric cards row */}
                <div className="epm-body">
                  <div className="epm-section-label">1. Executive Summary</div>
                  <div className="epm-metrics">
                    <div className="epm-metric-card">
                      <span className="epm-mc-value epm-mc-danger">87.4</span>
                      <span className="epm-mc-label">Risk Score</span>
                      <span className="epm-mc-avg">Natl Avg: 32.1</span>
                    </div>
                    <div className="epm-metric-card">
                      <span className="epm-mc-value epm-mc-danger">1 / 5</span>
                      <span className="epm-mc-label">CMS Stars</span>
                      <span className="epm-mc-avg">Natl Avg: 3.1</span>
                    </div>
                    <div className="epm-metric-card">
                      <span className="epm-mc-value epm-mc-danger">$284,500</span>
                      <span className="epm-mc-label">Total Fines</span>
                      <span className="epm-mc-avg">Natl Avg: $33,472</span>
                    </div>
                  </div>
                  {/* Key Findings box */}
                  <div className="epm-findings">
                    <div className="epm-findings-title">Key Findings</div>
                    <ul className="epm-findings-list">
                      <li>2 Immediate Jeopardy citations — imminent risk of serious harm</li>
                      <li>Zero registered nurse on site 31% of days</li>
                      <li>Owner operates 30 facilities with avg fines of $156,000</li>
                    </ul>
                  </div>
                  {/* Ownership table */}
                  <div className="epm-section-label">2. Ownership Portfolio</div>
                  <div className="epm-table-mock">
                    <div className="epm-table-row epm-table-header">
                      <span>Facility</span><span>State</span><span>Stars</span><span>Fines</span>
                    </div>
                    <div className="epm-table-row"><span>Sample Facility Name</span><span>IL</span><span>1</span><span>$284K</span></div>
                    <div className="epm-table-row"><span>Autumn Leaves Care</span><span>IL</span><span>1</span><span>$312K</span></div>
                    <div className="epm-table-row"><span>Cornerstone Living</span><span>IL</span><span>1</span><span>$278K</span></div>
                    <div className="epm-table-row"><span>Lakeview Manor</span><span>IL</span><span>1</span><span>$195K</span></div>
                    <div className="epm-table-row epm-table-more">+ 26 more facilities in portfolio</div>
                  </div>
                </div>
              </div>
            </div>
            <p className="two-reports-tagline">Penalty timelines. Ownership data. Made for professionals.</p>
            <a
              className="btn btn-primary two-reports-download"
              href="/samples/OversightReport_Sample_Evidence_Report.pdf"
              download
            >
              Download Free Sample
            </a>
          </div>
        </div>
        <p className="two-reports-search-cta">Search any of 14,713 facilities to get your personalized reports — free Family Report on every facility page.</p>
      </div>
    </section>
  );
}
