import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/data-transparency.css';

export default function DataTransparencyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    window.plausible && window.plausible('Data-Transparency-View');
  }, []);

  return (
    <div className="dt-page">
      <Helmet>
        <title>CMS Data Transparency Changes — What Was Removed and What We Kept | The Oversight Report</title>
        <meta name="description" content="As of February 2026, complaint investigation data is no longer available on Care Compare. The Oversight Report preserves this data from federal inspection records. Here's what changed." />
        <meta property="og:title" content="CMS Data Transparency Changes — The Oversight Report" />
        <meta property="og:description" content="Complaint investigation data is no longer available on Care Compare. The Oversight Report preserves it from federal inspection records so families retain access." />
        <meta property="og:url" content="https://oversightreports.com/data-transparency" />
        <link rel="canonical" href="https://oversightreports.com/data-transparency" />
      </Helmet>

      {/* HERO */}
      <section className="dt-hero">
        <div className="dt-hero-content">
          <div className="dt-hero-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            Data Transparency Changelog
          </div>
          <h1>What CMS Changed — and What We Kept</h1>
          <p className="dt-hero-subtitle">
            We track changes to federal nursing home data. When the government removes public information, we document what happened, why, and what we did about it.
          </p>
          <div className="dt-hero-trust">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            All data sourced from CMS Medicare.gov &bull; All citations linked below &bull; Last updated March 2026
          </div>
        </div>
      </section>

      {/* PAGE BODY */}
      <div className="dt-body">

        {/* CHANGE 1: Complaint Data Removed */}
        <section className="dt-section">
          <div className="dt-section-card">
            <div className="dt-change-header">
              <div className="dt-change-date">
                <span className="dt-date-label">February 25, 2026</span>
              </div>
              <span className="dt-change-tag removed">Data Removed</span>
            </div>
            <h2>Complaint Investigation Counts Removed from Care Compare</h2>

            <div className="dt-subsection">
              <h3>What happened</h3>
              <p>
                On February 25, 2026, CMS removed the number of complaint allegations and the number of facility-reported incidents from the Nursing Home Care Compare website. Previously, families could see how many complaints had been filed against a nursing home. This information is no longer available on the official CMS site.
              </p>
            </div>

            <div className="dt-subsection">
              <h3>What CMS said</h3>
              <p>
                CMS stated the removal was related to data discrepancies during their transition from the legacy ASPEN system to iQIES (Internet Quality Improvement and Evaluation System), which began in July 2025. According to CMS, the transition caused "duplicate allegations, unverified claims, and self-reported incidents that do not necessarily reflect validated quality concerns or regulatory violations" to appear on Care Compare.
              </p>
              <p>
                CMS also noted that the term "substantiated" is no longer applicable to complaints under the new system, meaning all allegations — not just validated ones — were being displayed during the transition period. CMS said it is "evaluating how to better present complaint information to ensure it is clear, accurate, and useful for consumers."
              </p>
            </div>

            <div className="dt-subsection">
              <h3>What was kept on Care Compare</h3>
              <p>
                CMS stated that information related to official complaint surveys and complaint citations issued as a result of those investigations will continue to be available on Care Compare. The removal specifically targeted the <em>count</em> of complaint allegations and facility-reported incidents — not the inspection results themselves.
              </p>
            </div>

            <div className="dt-subsection dt-subsection--highlight">
              <h3>What The Oversight Report did</h3>
              <p>
                We reconstructed complaint investigation counts from publicly available federal inspection records. The CMS Health Deficiencies and Inspection Dates files include a flag on each inspection record indicating whether it was triggered by a complaint investigation. We count these flags per facility to calculate complaint investigation totals.
              </p>
              <p>
                This is not estimated or modeled data. It is a direct count from the same federal records CMS previously used to display complaint information. Every facility on this site still shows complaint counts, investigation outcomes, and patterns over time.
              </p>
              <p>
                We archived these datasets before the removal and will continue to provide this information as long as the underlying inspection records remain publicly available.
              </p>
            </div>

            <div className="dt-sources">
              <h3>Sources</h3>
              <ul>
                <li>
                  <a href="https://www.cms.gov/files/document/qssam-26-01-nh.pdf" target="_blank" rel="noopener noreferrer">
                    CMS Quality &amp; Safety Special Alert Memo (QSSAM 26-01-NH)
                  </a>
                  <span className="dt-source-type">Official CMS memo</span>
                </li>
                <li>
                  <a href="https://www.cms.gov/medicare/health-safety-standards/quality-safety-oversight-general-information/policy-memos/policy-memos-states-and-cms-locations/updates-nursing-home-care-compare" target="_blank" rel="noopener noreferrer">
                    Updates to Nursing Home Care Compare — CMS Policy Memo
                  </a>
                  <span className="dt-source-type">CMS.gov</span>
                </li>
                <li>
                  <a href="https://www.mcknights.com/news/cms-to-remove-complaint-allegations-from-nursing-home-compare/" target="_blank" rel="noopener noreferrer">
                    CMS to remove complaint allegations from Nursing Home Compare
                  </a>
                  <span className="dt-source-type">McKnight's Long-Term Care News</span>
                </li>
                <li>
                  <a href="https://cmscompliancegroup.com/nursing-homes-skilled-nursing/cms-iqies-transition-what-nursing-homes-need-to-know-about-the-latest-data-shake-up-qssam-alert/" target="_blank" rel="noopener noreferrer">
                    CMS iQIES Transition: What Nursing Homes Need to Know
                  </a>
                  <span className="dt-source-type">CMS Compliance Group</span>
                </li>
                <li>
                  <a href="https://www.ahcancal.org/News-and-Communications/Blog/Pages/CMS-Releases-Memo-on-Data-Discrepancies-and-Other-Care-Compare-Updates.aspx" target="_blank" rel="noopener noreferrer">
                    CMS Releases Memo on Data Discrepancies and Other Care Compare Updates
                  </a>
                  <span className="dt-source-type">AHCA/NCAL</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CHANGE 2: Care Compare Data Freeze */}
        <section className="dt-section">
          <div className="dt-section-card">
            <div className="dt-change-header">
              <div className="dt-change-date">
                <span className="dt-date-label">July – September 2025</span>
              </div>
              <span className="dt-change-tag paused">Data Paused</span>
            </div>
            <h2>Care Compare Five-Star Ratings Frozen</h2>

            <div className="dt-subsection">
              <h3>What happened</h3>
              <p>
                CMS temporarily paused monthly updates to the Nursing Home Care Compare Five Star Rating System from July 30, 2025 through September 2025 during the iQIES transition. During this period, star ratings, health inspection scores, and staffing data on Care Compare were static and did not reflect current conditions.
              </p>
            </div>

            <div className="dt-subsection">
              <h3>What CMS said</h3>
              <p>
                CMS described the pause as necessary "to ensure seamless integration and maintain the highest standards of data accuracy" during the migration to the iQIES system. CMS stated that the iQIES modernization represents a "significant advancement" in data management capabilities.
              </p>
            </div>

            <div className="dt-sources">
              <h3>Sources</h3>
              <ul>
                <li>
                  <a href="https://www.mcknights.com/news/behind-cmss-freeze-of-all-nursing-home-care-compare-data/" target="_blank" rel="noopener noreferrer">
                    Behind CMS's freeze of all Nursing Home Care Compare data
                  </a>
                  <span className="dt-source-type">McKnight's Long-Term Care News</span>
                </li>
                <li>
                  <a href="https://www.cms.gov/medicare/health-safety-standards/quality-safety-oversight-general-information/quality-and-safety-special-alerts/temporary-pause-nursing-home-care-compare-updates-revised" target="_blank" rel="noopener noreferrer">
                    Temporary Pause in Nursing Home Care Compare Updates (Revised)
                  </a>
                  <span className="dt-source-type">CMS.gov</span>
                </li>
                <li>
                  <a href="https://skillednursingnews.com/2025/08/cms-pauses-nursing-home-care-compare-updates-leaving-5-star-ratings-static/" target="_blank" rel="noopener noreferrer">
                    CMS Pauses Nursing Home Care Compare Updates, Leaving 5-Star Ratings Static
                  </a>
                  <span className="dt-source-type">Skilled Nursing News</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CHANGE 3: Inspection Cycle Reduction */}
        <section className="dt-section">
          <div className="dt-section-card">
            <div className="dt-change-header">
              <div className="dt-change-date">
                <span className="dt-date-label">July 2025</span>
              </div>
              <span className="dt-change-tag changed">Methodology Changed</span>
            </div>
            <h2>Third-Cycle Inspections Dropped from Ratings</h2>

            <div className="dt-subsection">
              <h3>What happened</h3>
              <p>
                Beginning July 2025, CMS changed the health inspection rating calculation to use only the two most recent standard surveys, down from three. CMS continues to use a three-year lookback period for complaint and infection control inspections.
              </p>
            </div>

            <div className="dt-subsection">
              <h3>Why this matters</h3>
              <p>
                Using fewer inspection cycles means a facility's oldest (and sometimes worst) inspection results drop out of the rating calculation sooner. A facility with a history of serious deficiencies can see its star rating improve simply because the oldest inspection aged out — not because conditions changed.
              </p>
            </div>

            <div className="dt-sources">
              <h3>Sources</h3>
              <ul>
                <li>
                  <a href="https://www.mcknights.com/news/breaking-cms-dropping-third-cycle-inspections-from-care-compare-ratings-adding-more-chain-info/" target="_blank" rel="noopener noreferrer">
                    CMS dropping third-cycle inspections from Care Compare ratings
                  </a>
                  <span className="dt-source-type">McKnight's Long-Term Care News</span>
                </li>
                <li>
                  <a href="https://skillednursingnews.com/2025/06/breaking-cms-revamps-care-compare-to-drop-third-cycle-nursing-home-inspections-add-greater-transparency-for-chains/" target="_blank" rel="noopener noreferrer">
                    CMS Revamps Care Compare to Drop Third-Cycle Nursing Home Inspections
                  </a>
                  <span className="dt-source-type">Skilled Nursing News</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CHANGE 4: Ownership Disclosure */}
        <section className="dt-section">
          <div className="dt-section-card">
            <div className="dt-change-header">
              <div className="dt-change-date">
                <span className="dt-date-label">2025</span>
              </div>
              <span className="dt-change-tag changed">Policy Changed</span>
            </div>
            <h2>Enhanced Ownership Disclosure Requirements Suspended</h2>

            <div className="dt-subsection">
              <h3>What happened</h3>
              <p>
                CMS suspended certain enhanced ownership disclosure requirements that were part of the 2024 regulatory package. These requirements would have mandated more detailed reporting of private equity and real estate investment trust (REIT) involvement in nursing home ownership.
              </p>
            </div>

            <div className="dt-subsection dt-subsection--highlight">
              <h3>What The Oversight Report does</h3>
              <p>
                We continue to report ownership data using the currently available CMS Ownership file, which includes owner names, organization types, and ownership percentages. We also use pattern-matching to identify likely private equity and REIT involvement where CMS data alone does not disclose it. Readers should be aware that some previously proposed disclosure enhancements may not be reflected in current CMS data.
              </p>
            </div>
          </div>
        </section>

        {/* HOW WE HANDLE DATA */}
        <section className="dt-section">
          <div className="dt-section-card dt-principles-card">
            <h2>How We Handle Government Data Changes</h2>
            <div className="dt-principles">
              <div className="dt-principle">
                <div className="dt-principle-num">1</div>
                <div>
                  <strong>We document every change.</strong> When CMS removes, modifies, or pauses data, we record what changed, when, and what CMS said about it.
                </div>
              </div>
              <div className="dt-principle">
                <div className="dt-principle-num">2</div>
                <div>
                  <strong>We rebuild from public records when possible.</strong> If the underlying federal data is still publicly available, we reconstruct the metric so families don't lose access.
                </div>
              </div>
              <div className="dt-principle">
                <div className="dt-principle-num">3</div>
                <div>
                  <strong>We label everything.</strong> Reconstructed data is always marked. We show our methodology. We cite our sources. If you disagree with a number, you can check our work.
                </div>
              </div>
              <div className="dt-principle">
                <div className="dt-principle-num">4</div>
                <div>
                  <strong>We don't editorialize the reason.</strong> We report what happened and what was said. Whether these changes are good policy or bad policy is for you to decide.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER NOTE */}
        <div className="dt-footer-note">
          <p>
            This page is maintained by <Link to="/about">Robert Benard, NP</Link>. If you notice a data change we haven't documented, contact us at <a href="mailto:contact@oversightreports.com">contact@oversightreports.com</a>.
          </p>
          <p style={{marginTop: '8px'}}>
            <Link to="/methodology">Full methodology →</Link>
          </p>
        </div>

      </div>
    </div>
  );
}
