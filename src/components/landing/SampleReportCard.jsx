import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { generatePDF } from '../../utils/generatePDF';

gsap.registerPlugin(ScrollTrigger);

// ── Complete sample facility data — every field populated ──
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

// ── Hardcoded percentiles for sample report ──
const SAMPLE_PERCENTILES = {
  composite: 94,
  total_deficiencies: 87,
  total_fines: 91,
  zero_rn_pct: 89,
  harm_count: 92,
  jeopardy_count: 96,
  rn_hprd: 93,
  stars: 88,
};

// ── Nearby facilities ──
const SAMPLE_NEARBY = [
  { name: 'Oakwood Care Center', city: 'Springfield', state: 'IL', distance: 2.3, composite: 22.1, stars: 4, beds: 95 },
  { name: 'Lincoln Meadows Nursing', city: 'Springfield', state: 'IL', distance: 4.1, composite: 18.5, stars: 4, beds: 110 },
  { name: 'Heritage Health Center', city: 'Chatham', state: 'IL', distance: 5.7, composite: 35.2, stars: 3, beds: 80 },
  { name: 'Prairie View Senior Living', city: 'Rochester', state: 'IL', distance: 8.2, composite: 28.9, stars: 3, beds: 140 },
  { name: 'Riverview Gardens', city: 'Sherman', state: 'IL', distance: 11.4, composite: 15.3, stars: 5, beds: 60 },
];

// ── Owner portfolio siblings (29 facilities to make 30 total) ──
const SAMPLE_OWNER_PORTFOLIO = [
  { name: 'Lakeview Manor', state: 'IL', stars: 1, composite: 82.1, worst_owner: 'Sample Holdings LLC', ccn: '100001', total_fines: 195000 },
  { name: 'Sunrise Care of Peoria', state: 'IL', stars: 1, composite: 78.5, worst_owner: 'Sample Holdings LLC', ccn: '100002', total_fines: 172000 },
  { name: 'Valley Ridge Health', state: 'IN', stars: 2, composite: 71.3, worst_owner: 'Sample Holdings LLC', ccn: '100003', total_fines: 134000 },
  { name: 'Meadowbrook Living', state: 'IN', stars: 1, composite: 85.9, worst_owner: 'Sample Holdings LLC', ccn: '100004', total_fines: 241000 },
  { name: 'Pine Hills Nursing', state: 'OH', stars: 2, composite: 68.4, worst_owner: 'Sample Holdings LLC', ccn: '100005', total_fines: 89000 },
  { name: 'Cedar Creek Care', state: 'OH', stars: 1, composite: 79.2, worst_owner: 'Sample Holdings LLC', ccn: '100006', total_fines: 201000 },
  { name: 'Elm Street Health', state: 'MI', stars: 2, composite: 65.7, worst_owner: 'Sample Holdings LLC', ccn: '100007', total_fines: 78000 },
  { name: 'Willowbrook Senior', state: 'MI', stars: 3, composite: 48.2, worst_owner: 'Sample Holdings LLC', ccn: '100008', total_fines: 45000 },
  { name: 'Autumn Leaves Care', state: 'IL', stars: 1, composite: 91.3, worst_owner: 'Sample Holdings LLC', ccn: '100009', total_fines: 312000 },
  { name: 'Grandview Nursing', state: 'IL', stars: 2, composite: 72.8, worst_owner: 'Sample Holdings LLC', ccn: '100010', total_fines: 128000 },
  { name: 'Riverbend Health', state: 'IN', stars: 1, composite: 83.4, worst_owner: 'Sample Holdings LLC', ccn: '100011', total_fines: 189000 },
  { name: 'Shady Oaks Manor', state: 'OH', stars: 2, composite: 69.1, worst_owner: 'Sample Holdings LLC', ccn: '100012', total_fines: 98000 },
  { name: 'Hilltop Care Center', state: 'MI', stars: 1, composite: 88.7, worst_owner: 'Sample Holdings LLC', ccn: '100013', total_fines: 267000 },
  { name: 'Brookside Living', state: 'IL', stars: 3, composite: 42.5, worst_owner: 'Sample Holdings LLC', ccn: '100014', total_fines: 32000 },
  { name: 'Maplewood Health', state: 'IN', stars: 2, composite: 74.6, worst_owner: 'Sample Holdings LLC', ccn: '100015', total_fines: 145000 },
  { name: 'Oakridge Nursing', state: 'OH', stars: 1, composite: 80.1, worst_owner: 'Sample Holdings LLC', ccn: '100016', total_fines: 178000 },
  { name: 'Sunset Terrace', state: 'MI', stars: 2, composite: 66.9, worst_owner: 'Sample Holdings LLC', ccn: '100017', total_fines: 87000 },
  { name: 'Greenfield Manor', state: 'IL', stars: 1, composite: 84.3, worst_owner: 'Sample Holdings LLC', ccn: '100018', total_fines: 223000 },
  { name: 'Country Meadows', state: 'IN', stars: 3, composite: 45.1, worst_owner: 'Sample Holdings LLC', ccn: '100019', total_fines: 28000 },
  { name: 'Birchwood Care', state: 'OH', stars: 2, composite: 70.5, worst_owner: 'Sample Holdings LLC', ccn: '100020', total_fines: 112000 },
  { name: 'Lakewood Senior', state: 'MI', stars: 1, composite: 86.2, worst_owner: 'Sample Holdings LLC', ccn: '100021', total_fines: 245000 },
  { name: 'Prairie Rose Health', state: 'IL', stars: 2, composite: 67.8, worst_owner: 'Sample Holdings LLC', ccn: '100022', total_fines: 91000 },
  { name: 'Highland Park Nursing', state: 'IN', stars: 1, composite: 81.6, worst_owner: 'Sample Holdings LLC', ccn: '100023', total_fines: 198000 },
  { name: 'Woodlands Care', state: 'OH', stars: 3, composite: 51.2, worst_owner: 'Sample Holdings LLC', ccn: '100024', total_fines: 42000 },
  { name: 'Silver Springs', state: 'MI', stars: 2, composite: 73.4, worst_owner: 'Sample Holdings LLC', ccn: '100025', total_fines: 136000 },
  { name: 'Cornerstone Living', state: 'IL', stars: 1, composite: 89.8, worst_owner: 'Sample Holdings LLC', ccn: '100026', total_fines: 278000 },
  { name: 'Blueridge Health', state: 'IN', stars: 2, composite: 76.1, worst_owner: 'Sample Holdings LLC', ccn: '100027', total_fines: 154000 },
  { name: 'Evergreen Manor', state: 'OH', stars: 1, composite: 82.7, worst_owner: 'Sample Holdings LLC', ccn: '100028', total_fines: 203000 },
  { name: 'Whispering Pines', state: 'MI', stars: 4, composite: 28.3, worst_owner: 'Sample Holdings LLC', ccn: '100029', total_fines: 12000 },
];

export default function SampleReportCard({ onSearch }) {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.report-card-mock',
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            once: true,
          },
        }
      );
      gsap.fromTo('.report-cta',
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: 0.3,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            once: true,
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const handleDownloadSample = () => {
    try {
      generatePDF(SAMPLE_FACILITY, {
        nearbyFacilities: SAMPLE_NEARBY,
        allFacilities: [SAMPLE_FACILITY, ...SAMPLE_OWNER_PORTFOLIO, ...SAMPLE_NEARBY],
        isSample: true,
        samplePercentiles: SAMPLE_PERCENTILES,
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF download failed. Please try again.');
    }
  };

  return (
    <section className="landing-section section-light" ref={sectionRef}>
      <div className="container">
        <div className="section-header">
          <h2>What a Report Looks Like</h2>
          <p>Every facility gets a detailed risk profile — not just numbers, but context families can act on</p>
        </div>
        <div className="report-preview">
          <div className="report-card-mock">
            {/* Sample banner */}
            <div className="report-sample-banner">
              SAMPLE REPORT — THIS IS A FICTIONAL FACILITY FOR DEMONSTRATION PURPOSES
            </div>

            {/* Header */}
            <div className="report-card-header">
              <div>
                <h3>Sample Facility Name</h3>
                <span className="report-card-meta">Springfield, IL · 120 beds · CMS Rating: 1/5</span>
              </div>
              <span className="risk-badge high">
                <span className="score">87.4</span> HIGH RISK
              </span>
            </div>

            <div className="report-card-body">
              {/* Bottom Line */}
              <div className="report-section">
                <h4 className="report-section-title">Bottom Line</h4>
                <div className="report-callout report-callout--red">
                  Inspectors found serious danger to residents 2 times — risk of serious injury or death.
                  This facility has been fined $284,500. On 31% of days, there was no registered nurse in the building.
                  The same company runs 30 other facilities with average fines of $156,000 each.
                </div>
              </div>

              {/* Safety Score */}
              <div className="report-section">
                <h4 className="report-section-title">Safety Score</h4>
                <div className="report-callout report-callout--red">
                  <strong>SAFETY: CONCERNING</strong>
                </div>
                <div className="report-stats-row">
                  <div className="report-stat">
                    <span className="report-stat-value report-stat--danger">2</span>
                    <span className="report-stat-label">Serious Danger</span>
                  </div>
                  <div className="report-stat">
                    <span className="report-stat-value report-stat--warning">5</span>
                    <span className="report-stat-label">Residents Hurt</span>
                  </div>
                  <div className="report-stat">
                    <span className="report-stat-value">23</span>
                    <span className="report-stat-label">Total Deficiencies</span>
                  </div>
                  <div className="report-stat">
                    <span className="report-stat-value report-stat--danger">$284,500</span>
                    <span className="report-stat-label">Total Fines</span>
                  </div>
                </div>
              </div>

              {/* Clinical Context — NEW */}
              <div className="report-section">
                <h4 className="report-section-title">What This Means For Your Loved One</h4>
                <div className="report-clinical-items">
                  <div className="report-callout report-callout--red">
                    <strong>Registered Nurse Absence</strong><br />
                    On 31% of days, this facility had NO registered nurse on site. Without an RN present, IV medications cannot be administered, complex wound care cannot be managed, and acute changes in condition may not be recognized promptly.
                  </div>
                  <div className="report-callout report-callout--red">
                    <strong>Immediate Jeopardy Citations</strong><br />
                    This facility received 2 "Immediate Jeopardy" citations — the most severe finding a government inspection can produce. Conditions posed an immediate risk of serious injury or death.
                  </div>
                  <div className="report-callout report-callout--amber">
                    <strong>Staffing Data Discrepancy</strong><br />
                    This facility self-reports 42% more RN hours than verified payroll records show...
                  </div>
                </div>
                <span className="report-clinical-attribution">Clinical perspective by Robert Benard, NP — 20+ years in acute care</span>
              </div>

              {/* Staffing */}
              <div className="report-section">
                <h4 className="report-section-title">Staffing — How Much Care Do Residents Get?</h4>
                <div className="report-stats-row">
                  <div className="report-stat">
                    <span className="report-stat-value report-stat--danger">9 min</span>
                    <span className="report-stat-label">RN Time / Resident / Day</span>
                  </div>
                  <div className="report-stat">
                    <span className="report-stat-value">28 min</span>
                    <span className="report-stat-label">LPN Time</span>
                  </div>
                  <div className="report-stat">
                    <span className="report-stat-value">95 min</span>
                    <span className="report-stat-label">CNA Time</span>
                  </div>
                  <div className="report-stat">
                    <span className="report-stat-value report-stat--danger">31%</span>
                    <span className="report-stat-label">Days With Zero RN</span>
                  </div>
                </div>
                <div className="report-benchmark-preview">
                  <span className="report-benchmark-label">RN Staffing — less than 93% of facilities nationally</span>
                  <div className="report-benchmark-bar">
                    <div className="report-benchmark-fill report-benchmark-fill--bad" style={{ width: '7%' }} />
                    <span className="report-benchmark-marker" style={{ left: '50%' }}>Natl Avg</span>
                  </div>
                </div>
              </div>

              {/* Top Problem Areas */}
              <div className="report-section">
                <h4 className="report-section-title">Top Problem Areas</h4>
                <div className="report-problems">
                  <div className="report-problem">
                    <span className="report-problem-category">Infection Control</span>
                    <span className="report-problem-count">6 citations</span>
                  </div>
                  <div className="report-problem">
                    <span className="report-problem-category">Fall Prevention</span>
                    <span className="report-problem-count">4 citations</span>
                  </div>
                  <div className="report-problem">
                    <span className="report-problem-category">Medication Errors</span>
                    <span className="report-problem-count">3 citations</span>
                  </div>
                </div>
              </div>

              {/* Questions to Ask */}
              <div className="report-section">
                <h4 className="report-section-title">Questions to Ask When You Visit</h4>
                <div className="report-question">
                  <strong>Q: How many registered nurses are on duty right now?</strong>
                  <span className="report-question-context">This facility had zero RN days 31% of the time.</span>
                </div>
                <div className="report-question">
                  <strong>Q: What corrective actions were taken after the serious danger citation?</strong>
                  <span className="report-question-context">Inspectors found serious danger to residents 2 times.</span>
                </div>
              </div>

              {/* Nearby Alternatives */}
              <div className="report-section">
                <h4 className="report-section-title">Nearby Alternatives</h4>
                <div className="report-callout report-callout--green">
                  <strong>Not satisfied with this facility?</strong> Every report shows higher-rated nursing homes
                  within your area — so you always have better options to compare.
                </div>
                <div className="report-nearby-preview">
                  <div className="report-nearby-item">
                    <span className="report-nearby-badge report-nearby-badge--good">4.2</span>
                    <div className="report-nearby-info">
                      <span className="report-nearby-name">Oakwood Care Center</span>
                      <span className="report-nearby-distance">2.3 mi away · Low Risk</span>
                    </div>
                  </div>
                  <div className="report-nearby-item">
                    <span className="report-nearby-badge report-nearby-badge--good">3.8</span>
                    <div className="report-nearby-info">
                      <span className="report-nearby-name">Lincoln Meadows Nursing</span>
                      <span className="report-nearby-distance">4.1 mi away · Low Risk</span>
                    </div>
                  </div>
                  <div className="report-nearby-item">
                    <span className="report-nearby-badge report-nearby-badge--ok">3.1</span>
                    <div className="report-nearby-info">
                      <span className="report-nearby-name">Heritage Health Center</span>
                      <span className="report-nearby-distance">5.7 mi away · Moderate Risk</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* What's included */}
              <div className="report-includes">
                <span className="report-includes-title">The downloadable PDF adds even more:</span>
                <div className="report-includes-list">
                  <span>Clinical Context</span>
                  <span>National Percentile Rankings</span>
                  <span>Ownership Deep Dive</span>
                  <span>Printable Visit Checklist</span>
                  <span>Tailored Questions</span>
                  <span>Nearby Alternatives</span>
                  <span>Resources &amp; Helplines</span>
                </div>
              </div>
            </div>
          </div>

          <div className="report-cta">
            <p>Search for any facility to see its full report — free, no login required</p>
            <div className="report-cta-buttons">
              <button className="btn btn-primary btn-large" onClick={onSearch}>
                Search Facilities
              </button>
              <button className="btn btn-secondary btn-large" onClick={handleDownloadSample}>
                Download Sample PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
