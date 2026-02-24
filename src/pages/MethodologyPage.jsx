import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '../styles/methodology.css';

gsap.registerPlugin(ScrollTrigger);

export function MethodologyPage() {
  const location = useLocation();
  const sectionsRef = useRef([]);
  const tocRef = useRef(null);
  const backToTopRef = useRef(null);

  // Handle hash scrolling on mount and location change
  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const id = location.hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  // GSAP scroll animations
  useEffect(() => {
    const sections = sectionsRef.current.filter(Boolean);

    // Animate sections on scroll
    sections.forEach((section, index) => {
      gsap.fromTo(
        section,
        {
          opacity: 0,
          y: 40
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        }
      );
    });

    // Show/hide back to top button
    if (backToTopRef.current) {
      ScrollTrigger.create({
        start: 'top -200',
        end: 'max',
        onUpdate: (self) => {
          if (self.direction === 1 && self.progress > 0.1) {
            gsap.to(backToTopRef.current, { opacity: 1, pointerEvents: 'auto', duration: 0.3 });
          } else if (self.direction === -1 || self.progress < 0.1) {
            gsap.to(backToTopRef.current, { opacity: 0, pointerEvents: 'none', duration: 0.3 });
          }
        }
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="methodology-page">
      {/* Hero */}
      <div className="methodology-hero">
        <div className="methodology-hero-content">
          <h1>Methodology</h1>
          <p className="methodology-subtitle">How we calculate every number on this site</p>
          <p className="methodology-trust">
            The Oversight Report uses only publicly available data from CMS (Centers for Medicare & Medicaid Services).
            No proprietary data. No industry funding. Every metric is reproducible.
          </p>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="methodology-toc" ref={tocRef}>
        <h3>Quick Navigation</h3>
        <ul>
          <li><a href="#data-sources">Data Sources</a></li>
          <li><a href="#key-metrics">Key Metrics Explained</a></li>
          <li><a href="#what-we-dont-do">What We Don't Do</a></li>
          <li><a href="#data-freshness">Data Freshness</a></li>
          <li><a href="#contact">Contact & Corrections</a></li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="methodology-content">
        {/* Section 1: Data Sources */}
        <section
          id="data-sources"
          className="methodology-section section-light"
          ref={el => sectionsRef.current[0] = el}
        >
          <h2>Data Sources</h2>
          <p className="methodology-intro">
            All data on The Oversight Report comes from publicly accessible CMS datasets. We download, process, and analyze
            this data but never modify the underlying source information.
          </p>

          <div className="methodology-source-grid">
            <div className="methodology-source-card">
              <h4>CMS Care Compare</h4>
              <p>
                Provider information, inspection results, penalties, and star ratings. Updated quarterly by CMS.
                This is the primary dataset for facility-level information.
              </p>
            </div>

            <div className="methodology-source-card">
              <h4>CMS Payroll-Based Journal (PBJ)</h4>
              <p>
                Actual staffing hours reported by facilities via payroll records. This is the ground truth for
                staffing, not self-reported surveys. Required by federal law since 2016.
              </p>
            </div>

            <div className="methodology-source-card">
              <h4>CMS Penalty Data</h4>
              <p>
                Civil monetary penalties (fines) and denial of payment records. Shows which facilities have been
                financially sanctioned for violations of federal standards.
              </p>
            </div>

            <div className="methodology-source-card">
              <h4>CMS Ownership Data</h4>
              <p>
                Who owns each facility, corporate chains, and management companies. Critical for understanding
                patterns of risk across portfolios.
              </p>
            </div>

            <div className="methodology-source-card">
              <h4>State Survey Agency Reports</h4>
              <p>
                Inspection deficiency details, scope/severity ratings (A through L). State inspectors conduct
                these surveys on behalf of CMS.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Key Metrics */}
        <section
          id="key-metrics"
          className="methodology-section section-dark"
          ref={el => sectionsRef.current[1] = el}
        >
          <h2>Key Metrics Explained</h2>
          <p className="methodology-intro">
            Every number you see on The Oversight Report has a precise definition. Here's what each metric means and how it's calculated.
          </p>

          <div className="methodology-metric">
            <h3>Facilities Analyzed (14,713)</h3>
            <p>
              Every Medicare/Medicaid-certified nursing home in the United States. Source: CMS Provider Information dataset.
            </p>
            <div className="methodology-formula">
              <span className="methodology-formula-label">Count:</span>
              <span className="methodology-formula-value">All active certified nursing facilities</span>
            </div>
          </div>

          <div className="methodology-metric">
            <h3>Facilities Reported Days With No RN On Site (5,005)</h3>
            <p>
              Count of facilities where <code>zero_rn_pct &gt; 0</code> in PBJ payroll data. This means the facility
              reported at least one day during the reporting quarter where zero registered nurse hours were logged.
            </p>
            <p className="methodology-note">
              <strong>Important:</strong> LVNs and CNAs may still have been present — this metric tracks RN absence specifically.
              Federal law requires an RN on duty at least 8 consecutive hours per day, 7 days a week
              (42 CFR §483.35).
            </p>
            <div className="methodology-formula">
              <span className="methodology-formula-label">Calculation:</span>
              <span className="methodology-formula-value">COUNT(facilities WHERE zero_rn_pct &gt; 0)</span>
            </div>
          </div>

          <div className="methodology-metric">
            <h3>High-Risk Facilities (1,180)</h3>
            <p>
              Facilities scoring in the top risk tier of our composite scoring model. The composite score combines
              weighted inputs from multiple risk dimensions.
            </p>
            <div className="methodology-formula">
              <span className="methodology-formula-label">Threshold:</span>
              <span className="methodology-formula-value">Composite Score ≥ 60</span>
            </div>
          </div>

          <div className="methodology-metric">
            <h3>Composite Risk Score (0-100)</h3>
            <p>
              Our main risk metric. Combines five dimensions of facility performance into a single normalized score.
              Higher scores indicate higher risk.
            </p>

            <div className="methodology-component">
              <h4>Staffing Score (35% weight)</h4>
              <ul>
                <li>PBJ total nursing HPRD (hours per resident day)</li>
                <li>RN HPRD specifically</li>
                <li>Weekend staffing levels</li>
                <li>Zero-RN day percentage</li>
                <li>Gap between self-reported and payroll-verified staffing</li>
              </ul>
            </div>

            <div className="methodology-component">
              <h4>Deficiency Score (25% weight)</h4>
              <ul>
                <li>Total deficiencies from state surveys</li>
                <li>Harm-level deficiencies (scope/severity G or higher)</li>
                <li>Immediate jeopardy citations (scope/severity J, K, or L)</li>
                <li>Distribution across scope/severity matrix</li>
              </ul>
            </div>

            <div className="methodology-component">
              <h4>Penalty Score (20% weight)</h4>
              <ul>
                <li>Total civil monetary penalties (fines)</li>
                <li>Frequency of penalties</li>
                <li>Denial of payment episodes</li>
                <li>Penalty-per-bed ratio</li>
              </ul>
            </div>

            <div className="methodology-component">
              <h4>Quality Score (10% weight)</h4>
              <ul>
                <li>CMS quality measures (hospitalization rates, falls, pressure ulcers, etc.)</li>
                <li>Overall star rating</li>
                <li>Quality measure star rating</li>
              </ul>
            </div>

            <div className="methodology-component">
              <h4>Ownership Score (10% weight)</h4>
              <ul>
                <li>Portfolio-wide performance of the owning entity</li>
                <li>Contractor staffing percentage</li>
                <li>Multi-facility chain risk patterns</li>
              </ul>
            </div>
          </div>

          <div className="methodology-metric">
            <h3>Star Ratings (1-5)</h3>
            <p>
              Directly from CMS. We display them but do not modify them. Star ratings are calculated by CMS based on
              three components: health inspections, staffing, and quality measures.
            </p>
            <p className="methodology-note">
              <strong>Note:</strong> CMS star ratings are widely criticized for being gameable through self-reported data.
              Our composite score exists because star ratings alone are insufficient for assessing risk.
            </p>
          </div>

          <div className="methodology-metric">
            <h3>Staffing HPRD (Hours Per Resident Day)</h3>
            <p>
              Total nursing hours divided by resident census. Reported via PBJ payroll data. This is the most
              reliable measure of actual staffing levels.
            </p>
            <div className="methodology-formula">
              <span className="methodology-formula-label">Formula:</span>
              <span className="methodology-formula-value">Total Nursing Hours ÷ Total Resident Days</span>
            </div>
            <p className="methodology-note">
              National median is approximately 3.6 HPRD. Below 3.0 is concerning. Below 2.5 is critical.
            </p>
          </div>

          <div className="methodology-metric">
            <h3>RN Gap Percentage</h3>
            <p>
              Measures the discrepancy between what a facility claims on CMS surveys versus what their payroll
              records show. A high gap suggests either data errors or intentional overreporting.
            </p>
            <div className="methodology-formula">
              <span className="methodology-formula-label">Formula:</span>
              <span className="methodology-formula-value">
                ((Self-Reported RN HPRD - PBJ RN HPRD) ÷ Self-Reported RN HPRD) × 100
              </span>
            </div>
            <p className="methodology-note">
              Gaps above 25% are significant. Gaps above 50% warrant serious scrutiny.
            </p>
          </div>

          <div className="methodology-metric">
            <h3>Zero RN Percentage</h3>
            <p>
              Percentage of days in the reporting quarter where the facility logged zero RN hours in PBJ payroll data.
            </p>
            <div className="methodology-formula">
              <span className="methodology-formula-label">Formula:</span>
              <span className="methodology-formula-value">
                (Days with 0 RN Hours ÷ Total Days in Quarter) × 100
              </span>
            </div>
            <p className="methodology-note">
              Federal minimum is 8 hours/day of RN coverage. Any facility with zero_rn_pct &gt; 0 is
              violating federal standards.
            </p>
          </div>
        </section>

        {/* Section 3: What We Don't Do */}
        <section
          id="what-we-dont-do"
          className="methodology-section section-light"
          ref={el => sectionsRef.current[2] = el}
        >
          <h2>What We Don't Do</h2>
          <p className="methodology-intro">
            Transparency requires clarity about our limitations and boundaries.
          </p>

          <div className="methodology-limitations">
            <div className="methodology-limitation-item">
              <span className="methodology-limitation-icon">×</span>
              <div>
                <h4>We do not rank facilities as "good" or "bad"</h4>
                <p>We present risk factors. Families must make their own informed decisions.</p>
              </div>
            </div>

            <div className="methodology-limitation-item">
              <span className="methodology-limitation-icon">×</span>
              <div>
                <h4>We do not include subjective reviews or patient testimonials</h4>
                <p>Our analysis is based entirely on objective government data.</p>
              </div>
            </div>

            <div className="methodology-limitation-item">
              <span className="methodology-limitation-icon">×</span>
              <div>
                <h4>We do not accept advertising or sponsored placements</h4>
                <p>No facility can pay to improve their score or ranking on The Oversight Report.</p>
              </div>
            </div>

            <div className="methodology-limitation-item">
              <span className="methodology-limitation-icon">×</span>
              <div>
                <h4>We do not modify CMS star ratings</h4>
                <p>When we display CMS stars, they are shown exactly as published by CMS.</p>
              </div>
            </div>

            <div className="methodology-limitation-item">
              <span className="methodology-limitation-icon">×</span>
              <div>
                <h4>Our composite score is a screening tool, not a clinical recommendation</h4>
                <p>Always consult with healthcare professionals and visit facilities in person.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Data Freshness */}
        <section
          id="data-freshness"
          className="methodology-section section-dark"
          ref={el => sectionsRef.current[3] = el}
        >
          <h2>Data Freshness</h2>
          <p className="methodology-intro">
            CMS releases most datasets on a quarterly schedule. We update The Oversight Report within 48 hours of each CMS release.
          </p>

          <div className="methodology-freshness-grid">
            <div className="methodology-freshness-card">
              <h4>Current Data Version</h4>
              <p className="methodology-data-date">Q4 2024</p>
              <p className="methodology-data-note">Last updated: December 2024</p>
            </div>

            <div className="methodology-freshness-card">
              <h4>Next Expected Update</h4>
              <p className="methodology-data-date">Q1 2025</p>
              <p className="methodology-data-note">Anticipated: March 2025</p>
            </div>
          </div>

          <p className="methodology-note">
            <strong>Important:</strong> Between updates, new inspections, penalties, or ownership changes may have
            occurred that are not yet reflected in our data. When making placement decisions, always verify current
            status directly with CMS Care Compare or the facility.
          </p>
        </section>

        {/* Section 5: Contact */}
        <section
          id="contact"
          className="methodology-section section-light"
          ref={el => sectionsRef.current[4] = el}
        >
          <h2>Contact & Corrections</h2>
          <p className="methodology-intro">
            We are committed to data accuracy. If you believe any information on this site is incorrect, we want to know.
          </p>

          <div className="methodology-contact-card">
            <h4>Report a Data Issue</h4>
            <p>
              Email us at <a href="mailto:contact@oversightreports.com">contact@oversightreports.com</a> with:
            </p>
            <ul>
              <li>Facility name and CCN number</li>
              <li>Specific metric or data point in question</li>
              <li>What you believe the correct information should be</li>
              <li>Source documentation if available</li>
            </ul>
            <p className="methodology-note">
              <strong>Our commitment:</strong> We will investigate and correct verified errors within 48 hours.
              If the error originated in CMS data, we will note the discrepancy and report it to CMS.
            </p>
          </div>
        </section>
      </div>

      {/* Back to Top Button */}
      <button
        className="methodology-back-to-top"
        onClick={scrollToTop}
        ref={backToTopRef}
        aria-label="Back to top"
      >
        ↑
      </button>
    </div>
  );
}
