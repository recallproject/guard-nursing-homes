import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
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
      <Helmet>
        <title>Methodology — How We Score Nursing Homes | The Oversight Report</title>
        <meta name="description" content="Our composite risk scoring methodology. How we combine CMS staffing data, inspection citations, penalties, and ownership patterns. Includes our AI governance framework and data integrity safeguards." />
        <link rel="canonical" href="https://oversightreports.com/methodology" />
      </Helmet>
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
          <li><a href="#how-reports-are-built">How Reports Are Built</a></li>
          <li><a href="#who-reviews">Who Reviews This Data</a></li>
          <li><a href="#ai-governance">AI Governance & Data Integrity</a></li>
          <li><a href="#key-metrics">Key Metrics Explained</a></li>
          <li><a href="#what-we-dont-do">What We Don't Do</a></li>
          <li><a href="#regulatory-context">Federal Staffing Requirements</a></li>
          <li><a href="#data-freshness">Data Freshness</a></li>
          <li><a href="#transparency-changes">Data Transparency Changes</a></li>
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

            <div className="methodology-source-card">
              <h4>MDS Quality Measures</h4>
              <p>
                Clinical quality indicators reported quarterly by every nursing home, based on resident assessments.
                Includes antipsychotic medication rates, pressure ulcers, falls with injury, urinary tract infections,
                depression, and more. Source: CMS MDS 3.0.
              </p>
            </div>

            <div className="methodology-source-card">
              <h4>Claims-Based Quality Measures</h4>
              <p>
                Outcome measures derived from Medicare claims data — including 30-day re-hospitalization rates,
                emergency room visits, and discharge to community rates for short-stay (rehab) patients.
              </p>
            </div>

            <div className="methodology-source-card">
              <h4>SNF Quality Reporting Program (QRP)</h4>
              <p>
                Measures reported under the IMPACT Act, including functional improvement at discharge, Medicare
                spending per beneficiary, healthcare-associated infection rates, and COVID-19 vaccination rates
                for both residents and staff.
              </p>
            </div>

            <div className="methodology-source-card">
              <h4>SNF Value-Based Purchasing (VBP)</h4>
              <p>
                CMS performance scores and Medicare payment adjustments. Includes staff turnover rates,
                re-hospitalization performance, and whether the facility received a Medicare payment bonus or penalty.
              </p>
            </div>

            <div className="methodology-source-card">
              <h4>Fire Safety Deficiencies</h4>
              <p>
                Separate from health inspections. Fire code violations, sprinkler system issues, blocked exits,
                and emergency preparedness deficiencies. Every nursing home receives periodic fire safety inspections.
              </p>
            </div>

            <div className="methodology-source-card">
              <h4>Special Focus Facility (SFF) List</h4>
              <p>
                CMS designation for facilities with a pattern of serious quality issues. Approximately 88 of 14,713
                facilities are designated SFF at any time. These facilities receive twice the normal inspection frequency.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: How Reports Are Built */}
        <section
          id="how-reports-are-built"
          className="methodology-section section-dark"
          ref={el => sectionsRef.current[1] = el}
        >
          <h2>How Reports Are Built</h2>
          <p className="methodology-intro">
            The Oversight Report is built by a nurse practitioner using automated tools. We believe in full transparency
            about what's human and what's machine in our process.
          </p>

          <div className="methodology-source-grid">
            <div className="methodology-source-card">
              <h4>Data Pipeline (Automated)</h4>
              <p>
                We download raw CSV files directly from CMS federal databases. These files are processed through
                automated scripts that clean, merge, and structure the data across multiple datasets — linking
                inspection records with staffing data, penalty histories, ownership filings, and quality measures.
                No data is altered, fabricated, or estimated. Every number traces back to a specific CMS source file.
              </p>
            </div>

            <div className="methodology-source-card">
              <h4>Report Generation (AI-Assisted)</h4>
              <p>
                Individual facility reports and PDF documents are assembled programmatically using AI-assisted code.
                This includes structuring data into readable formats, calculating comparative metrics (national averages,
                percentiles), and generating consistent report layouts. The technology allows us to produce reports for
                all 14,713 facilities — something that would be impossible to do manually.
              </p>
            </div>

            <div className="methodology-source-card">
              <h4>Clinical Interpretation (Human)</h4>
              <p>
                Every piece of contextual language on this site — what a metric means, why it matters, what families
                should look for — is written or reviewed by Robert Benard, NP, a board-certified nurse practitioner
                with 20+ years of acute care hospital experience. The clinical framing comes from bedside experience,
                not an algorithm. When a report says "this is a red flag," that judgment comes from a clinician who
                has seen what understaffing looks like at 3am.
              </p>
            </div>
          </div>

          <p className="methodology-note">
            <strong>Our approach:</strong> We use automation and AI to do what machines do well: process large datasets
            quickly and consistently. We use clinical expertise to do what machines cannot: interpret data in the context
            of real patient care. This combination is what allows a small team to provide transparency across every
            Medicare-certified nursing home in the country.
          </p>
        </section>

        {/* Section 3: Who Reviews This Data */}
        <section
          id="who-reviews"
          className="methodology-section section-light"
          ref={el => sectionsRef.current[2] = el}
        >
          <h2>Who Reviews This Data</h2>

          <div className="methodology-bio-card">
            <div className="methodology-bio-avatar">RB</div>
            <h3>Robert Benard, NP</h3>
            <p className="methodology-bio-credentials">AGACNP-BC &middot; PMHNP-BC</p>
            <p className="methodology-bio-subtitle">Board-Certified Nurse Practitioner &middot; 20+ Years Clinical Experience</p>
            <p className="methodology-bio-text">
              Robert has spent 20+ years at the bedside in acute care hospitals. He reviews and interprets every
              report — the clinical context comes from real experience, not an algorithm.
            </p>
            <a href="mailto:contact@oversightreports.com" className="methodology-bio-email">contact@oversightreports.com</a>
          </div>

          <div className="methodology-metric" style={{ marginTop: '32px' }}>
            <h3>Independence</h3>
            <p>
              The Oversight Report is operated under DataLink Clinical LLC. This project is independent — it receives
              no funding from the nursing home industry, healthcare systems, insurance companies, or government agencies.
              Our revenue comes from optional paid services (data interpretation reports), not from the facilities we analyze.
              No facility can pay to change their data or how it is presented on this site.
            </p>
          </div>
        </section>

        {/* Section 4: AI Governance & Data Integrity */}
        <section
          id="ai-governance"
          className="methodology-section section-dark"
          ref={el => sectionsRef.current[3] = el}
        >
          <h2>AI Governance & Data Integrity</h2>
          <p className="methodology-intro">
            AI tools can produce errors — including "hallucinations," where a system generates plausible-sounding but
            fabricated information. In healthcare, this is unacceptable. We have designed our process specifically to
            minimize this risk, informed by responsible AI principles from Harvard's Data Science Initiative and
            established governance frameworks.
          </p>

          <div className="methodology-source-grid">
            <div className="methodology-source-card">
              <h4>Ground Truth Verification</h4>
              <p>
                Our AI tools process structured government datasets — rows and columns from CMS CSV files with defined
                fields and values. We do not ask AI to generate medical facts, predict outcomes, or produce clinical
                assessments from unstructured input. Every number displayed on this site can be verified against the
                original CMS source file. This design eliminates the most common source of AI hallucination: generating
                information that doesn't exist in the source data.
              </p>
            </div>

            <div className="methodology-source-card">
              <h4>Clinician Oversight (HITL)</h4>
              <p>
                The Human-in-the-Loop (HITL) model is widely recognized as the standard for responsible AI deployment
                in healthcare settings. At The Oversight Report, a board-certified nurse practitioner reviews all clinical
                interpretation, contextual language, and risk characterization. AI processes the data. A clinician decides
                what it means. This separation ensures that clinical judgment — the part that requires experience and
                accountability — is never delegated to a machine.
              </p>
            </div>

            <div className="methodology-source-card">
              <h4>Full Traceability</h4>
              <p>
                Every metric on this site includes its data source, calculation method, and the specific CMS dataset it
                comes from. Our methodology is fully documented. Any researcher, journalist, or regulator can download the
                same CMS files we use and reproduce our results independently. We do not use proprietary models, black-box
                scoring, or opaque algorithms. If you disagree with a number, you can check our work.
              </p>
            </div>

            <div className="methodology-source-card">
              <h4>Quality Checks</h4>
              <p>
                Before any data reaches the site, we run automated validation checks against known constraints: facility
                counts match CMS totals, staffing hours fall within plausible ranges, deficiency counts reconcile across
                datasets, and penalty amounts match published CMS records. When discrepancies arise between datasets, we
                flag them rather than silently resolve them. We also monitor for CMS data quality issues — such as
                facilities reporting zero staffing hours while maintaining high star ratings — and note these anomalies explicitly.
              </p>
            </div>
          </div>

          <p className="methodology-note" style={{ marginTop: '24px' }}>
            <strong>Our framework:</strong> Our approach is guided by principles from Harvard's Data Science Initiative
            frameworks for responsible AI governance: transparency in how systems work, accountability for outputs, human
            oversight of high-stakes decisions, and verifiability of results. We believe that using AI responsibly in
            healthcare means being honest about what it does, what it doesn't do, and who is accountable when something
            goes wrong. At The Oversight Report, the answer to that last question is always the same: the clinician whose
            name is on every report.
          </p>
        </section>

        {/* Section 5: Key Metrics */}
        <section
          id="key-metrics"
          className="methodology-section section-light"
          ref={el => sectionsRef.current[4] = el}
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
              Zero-RN days means no Registered Nurse on the payroll that day — LPNs/LVNs and CNAs may still
              be present, but cannot perform RN-level clinical functions such as IV medication administration,
              complex assessments, or care plan changes.
            </p>
            <div className="methodology-formula">
              <span className="methodology-formula-label">Formula:</span>
              <span className="methodology-formula-value">
                (Days with 0 RN Hours ÷ Total Days in Quarter) × 100
              </span>
            </div>
            <p className="methodology-note">
              CMS PBJ data tracks RN, LPN/LVN, and CNA hours as completely separate categories.
              When we report zero-RN days, this is based solely on the RN-specific payroll field —
              no other staff types are counted as RNs.
            </p>
          </div>
        </section>

        {/* Section 6: What We Don't Do */}
        <section
          id="what-we-dont-do"
          className="methodology-section section-dark"
          ref={el => sectionsRef.current[5] = el}
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

        {/* Section 7: Federal Regulatory Context */}
        <section
          id="regulatory-context"
          className="methodology-section section-light"
          ref={el => sectionsRef.current[6] = el}
        >
          <h2>Federal Nursing Home Staffing Requirements</h2>
          <p className="methodology-intro">
            Understanding the current regulatory framework is critical for interpreting staffing data on this site.
          </p>

          <div className="methodology-metric">
            <h3>Current Federal Law (42 CFR §483.35)</h3>
            <p>
              All Medicare/Medicaid-certified nursing homes must meet these requirements:
            </p>
            <ul>
              <li>A registered nurse (RN) on site for at least 8 consecutive hours per day, 7 days per week</li>
              <li>A full-time RN serving as Director of Nursing</li>
              <li>"Sufficient numbers" of licensed nursing staff 24 hours per day to meet residents' needs</li>
            </ul>
            <p className="methodology-note">
              <strong>Important:</strong> There is currently no federal minimum hours-per-resident-day (HPRD) requirement.
              The "sufficient" standard is qualitative, not quantitative.
            </p>
            <div className="methodology-formula">
              <span className="methodology-formula-label">Source:</span>
              <span className="methodology-formula-value">
                <a href="https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.35" target="_blank" rel="noopener noreferrer">
                  42 CFR §483.35 (Code of Federal Regulations)
                </a>
              </span>
            </div>
          </div>

          <div className="methodology-metric">
            <h3>The 2024 Staffing Rule (Never Took Effect)</h3>
            <p>
              In May 2024, CMS finalized a rule that would have established the first-ever federal minimum staffing requirements:
            </p>
            <ul>
              <li>3.48 total nursing hours per resident per day (0.55 RN + 2.45 CNA)</li>
              <li>24/7 on-site RN coverage</li>
            </ul>
            <p>
              <strong>April–June 2025:</strong> Federal courts in Texas and Iowa struck down the rule before it took effect.
            </p>
            <p>
              <strong>July 4, 2025:</strong> The{' '}
              <a href="https://www.congress.gov/bill/119th-congress/house-bill/1/text" target="_blank" rel="noopener noreferrer">
                One Big Beautiful Bill Act
              </a>{' '}
              (§71111) blocked enforcement of any federal staffing mandate through September 30, 2034.
            </p>
            <p>
              <strong>December 2, 2025:</strong> CMS formally{' '}
              <a href="https://www.federalregister.gov/documents/2025/12/03/2025-21792/medicare-and-medicaid-programs-repeal-of-minimum-staffing-standards-for-long-term-care-facilities" target="_blank" rel="noopener noreferrer">
                repealed the 2024 standards
              </a>{' '}
              via interim final rule (effective February 2, 2026).
            </p>
            <p className="methodology-note">
              <strong>Critical fact:</strong> The 24/7 RN requirement never took effect at any facility.
            </p>
          </div>

          <div className="methodology-metric">
            <h3>State-Level Variation</h3>
            <p>
              Approximately 14 states have their own staffing requirements that exceed the federal baseline:
            </p>
            <ul>
              <li>Some states require 24/7 RN coverage (the federal rule only requires 8 hours)</li>
              <li>A few states impose minimum HPRD thresholds (e.g., California requires 3.5 HPRD)</li>
              <li>State requirements remain in effect regardless of federal changes</li>
            </ul>
          </div>

          <div className="methodology-metric">
            <h3>The 18-State AG Letter (February 2, 2026)</h3>
            <p>
              On February 2, 2026,{' '}
              <a href="https://oag.ca.gov/system/files/attachments/press-docs/Repeal%20of%20Minimum%20Staffing%20Standards%20for%20LTC%20Facilities%20Comment%20Letter%202026.02.02.pdf" target="_blank" rel="noopener noreferrer">
                18 state attorneys general
              </a>{' '}
              — led by California, Massachusetts, and New York — asked CMS to implement a <strong>targeted</strong> staffing
              standard (3.48 HPRD) for:
            </p>
            <ul>
              <li>For-profit nursing homes</li>
              <li>With high-risk financial practices (related-party transactions, private equity ownership)</li>
            </ul>
            <p className="methodology-note">
              <strong>Key distinction:</strong> The AGs requested a targeted rule for high-risk operators, not a universal mandate for all facilities.
              They also asked CMS to lift the suspension of ownership disclosure requirements.
            </p>
          </div>

          <div className="methodology-metric">
            <h3>How This Affects Our Analysis</h3>
            <p>
              When we report "zero-RN days," we are identifying potential violations of the <strong>existing</strong> federal
              requirement (8 hours per day). This is not about the repealed 24/7 rule — it's about facilities that may
              not be meeting the current baseline standard that has been in place since 1987.
            </p>
          </div>

          <div className="methodology-metric">
            <h3>How Can a Facility Report Zero RN Hours?</h3>
            <p>
              Federal law requires a registered nurse on site for at least 8 consecutive hours every day. Yet CMS payroll data shows thousands of facilities reporting days with zero RN hours. There are several possible explanations:
            </p>
            <ul>
              <li>The facility actually had no RN working that day — a potential violation of 42 CFR §483.35(b)(1).</li>
              <li>The facility had an RN present but failed to submit accurate payroll data to CMS — a reporting compliance issue.</li>
              <li>The facility submitted incomplete or erroneous PBJ data — which CMS does not routinely audit or verify against actual payroll records.</li>
            </ul>
            <p>
              All three scenarios are concerning. Scenario 1 is a staffing violation. Scenarios 2 and 3 mean the public staffing data families rely on may not reflect reality.
            </p>
            <p>
              CMS conducts on-site inspections roughly every 12–15 months. Between inspections, there is no real-time monitoring of whether facilities meet the 8-hour RN requirement. Enforcement is complaint-driven: if no one reports the gap, it may not be investigated until the next scheduled survey.
            </p>
            <p>
              Some facilities — particularly small or rural homes — may qualify for a federal waiver of the 8-hour RN requirement due to workforce unavailability (42 CFR §483.35(e)). However, a waiver does not eliminate the requirement for licensed nursing coverage. Even with a waiver, a facility must still have a licensed nurse (RN or LPN) on duty and an RN available by phone.
            </p>
            <p>
              We present this data as reported by facilities to CMS. We do not independently verify staffing levels. Families with concerns about a specific facility's staffing should contact their state survey agency or the CMS regional office.
            </p>
          </div>
        </section>

        {/* Section 8: Data Freshness */}
        <section
          id="data-freshness"
          className="methodology-section section-dark"
          ref={el => sectionsRef.current[7] = el}
        >
          <h2>Data Freshness</h2>
          <p className="methodology-intro">
            CMS releases most datasets on a quarterly schedule. We update The Oversight Report within 48 hours of each CMS release.
          </p>

          <div className="methodology-freshness-grid">
            <div className="methodology-freshness-card">
              <h4>Current Data Version</h4>
              <p className="methodology-data-date">February 2026</p>
              <p className="methodology-data-note">18 CMS datasets integrated</p>
            </div>

            <div className="methodology-freshness-card">
              <h4>Last Downloaded</h4>
              <p className="methodology-data-date">March 2, 2026</p>
              <p className="methodology-data-note">Next CMS refresh: ~April 2026</p>
            </div>
          </div>

          <p className="methodology-note">
            <strong>Important:</strong> Between updates, new inspections, penalties, or ownership changes may have
            occurred that are not yet reflected in our data. When making placement decisions, always verify current
            status directly with CMS Care Compare or the facility.
          </p>
        </section>

        {/* Section 9: Government Data Transparency Changes */}
        <section
          id="transparency-changes"
          className="methodology-section section-light"
          ref={el => sectionsRef.current[8] = el}
        >
          <h2>Government Data Transparency Changes</h2>
          <p className="methodology-intro">
            We track changes to what the federal government makes publicly available. When CMS removes data from
            public view, we document it here and explain how it affects what families can see.
          </p>

          <div className="methodology-metric">
            <h3>Complaint Counts Removed from Care Compare (February 25, 2026)</h3>
            <p>
              On February 25, 2026, CMS removed complaint investigation counts from the Care Compare website.
              Previously, families could see how many complaints had been filed against a nursing home. This
              information is no longer available on the official CMS site.
            </p>
            <p>
              The Oversight Report reconstructed complaint counts from publicly available federal inspection records
              (CMS Health Deficiencies and Inspection Dates files). Each inspection record includes a flag indicating
              whether it was triggered by a complaint investigation. We count these flags per facility to calculate
              complaint investigation totals.
            </p>
            <p>
              This is not estimated or modeled data — it is a direct count from the same federal records CMS previously
              used. We archived these datasets before the removal and will continue to provide this information as long
              as the underlying inspection records remain publicly available.
            </p>
          </div>

          <div className="methodology-metric">
            <h3>Ownership Disclosure Suspension</h3>
            <p>
              CMS has suspended certain enhanced ownership disclosure requirements that were part of the 2024 regulatory
              package. We continue to report ownership data using the currently available CMS Ownership file, which
              includes owner names, organization types, and ownership percentages. Readers should be aware that some
              previously proposed disclosure enhancements (such as detailed private equity and real estate investment
              trust identification) may not be reflected in current CMS data.
            </p>
          </div>
        </section>

        {/* Section 10: Contact */}
        <section
          id="contact"
          className="methodology-section section-dark"
          ref={el => sectionsRef.current[9] = el}
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
