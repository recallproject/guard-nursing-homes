/**
 * ComparePage.jsx — "Know Your Options"
 *
 * MOCKUP — Not yet wired into live routing (existing route was a placeholder).
 * Honest breakdown of every nursing home search tool available.
 * Every claim about competitors is sourced to public records.
 */

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/compare.css';

export default function ComparePage() {
  const pageRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    window.plausible && window.plausible('Compare-Page-View');
  }, []);

  return (
    <div className="compare-page" ref={pageRef}>
      <Helmet>
        <title>Know Your Options | Nursing Home Search Tools Compared | The Oversight Report</title>
        <meta name="description" content="An honest comparison of every nursing home search tool — Medicare Care Compare, ProPublica, A Place for Mom, and more. Learn how they work, who pays them, and what they don't tell you." />
      </Helmet>

      {/* ============ HERO ============ */}
      <section className="compare-hero">
        <div className="container-narrow">
          <h1>Know Your Options</h1>
          <p className="compare-subtitle">
            An honest guide to every nursing home search tool available — what they do,
            how they make money, and what they don't show you.
          </p>
          <div className="compare-hero-callout">
            Choosing a nursing home is one of the most important decisions a family will make.
            You deserve to know how the tools you're using actually work — including ours.
          </div>
        </div>
      </section>

      {/* ============ GUIDE (replaces flat TOC) ============ */}
      <section className="compare-guide-section">
        <div className="container-narrow">
          <div className="compare-guide">
            <h2 className="compare-guide-heading">What You'll Find on This Page</h2>
            <p className="compare-guide-sub">
              Click any section to jump straight there. We've organized every major nursing home
              search tool by who runs it and how they make money.
            </p>
            <div className="compare-guide-grid">
              <a href="#government" className="compare-guide-card">
                <div className="compare-guide-icon compare-guide-icon--gov">GOV</div>
                <div className="compare-guide-text">
                  <div className="compare-guide-title">
                    Government Tools
                    <span className="compare-guide-badge compare-guide-badge--safe">FREE</span>
                  </div>
                  <div className="compare-guide-desc">Medicare Care Compare &amp; the Special Focus Facility list. Official federal data — no conflicts, no commissions.</div>
                </div>
              </a>
              <a href="#journalism" className="compare-guide-card">
                <div className="compare-guide-icon compare-guide-icon--journalism">J</div>
                <div className="compare-guide-text">
                  <div className="compare-guide-title">
                    Journalism &amp; Advocacy
                    <span className="compare-guide-badge compare-guide-badge--safe">FREE</span>
                  </div>
                  <div className="compare-guide-desc">ProPublica Nursing Home Inspect &amp; LTCCC/NursingHome411. Independent, no industry funding.</div>
                </div>
              </a>
              <a href="#referral" className="compare-guide-card">
                <div className="compare-guide-icon compare-guide-icon--referral">!</div>
                <div className="compare-guide-text">
                  <div className="compare-guide-title">
                    Referral Sites
                    <span className="compare-guide-badge compare-guide-badge--caution">CONFLICT</span>
                  </div>
                  <div className="compare-guide-desc">A Place for Mom, Caring.com, SeniorAdvisor. They earn up to $12,000 per referral. Senate investigation, FTC action.</div>
                </div>
              </a>
              <a href="#rankings" className="compare-guide-card">
                <div className="compare-guide-icon compare-guide-icon--rankings">III</div>
                <div className="compare-guide-text">
                  <div className="compare-guide-title">
                    Rankings &amp; Reviews
                    <span className="compare-guide-badge compare-guide-badge--partial">PARTIAL</span>
                  </div>
                  <div className="compare-guide-desc">U.S. News &amp; Newsweek. Reputable brands, but rankings rely on star ratings CMS admits are gameable.</div>
                </div>
              </a>
              <a href="#comparison" className="compare-guide-card">
                <div className="compare-guide-icon compare-guide-icon--matrix">⚖</div>
                <div className="compare-guide-text">
                  <div className="compare-guide-title">Side-by-Side Comparison</div>
                  <div className="compare-guide-desc">12 features compared across 5 tools. See exactly which tools surface staffing, penalties, and ownership data.</div>
                </div>
              </a>
              <a href="#our-approach" className="compare-guide-card">
                <div className="compare-guide-icon compare-guide-icon--ours">TOR</div>
                <div className="compare-guide-text">
                  <div className="compare-guide-title">Our Approach</div>
                  <div className="compare-guide-desc">What The Oversight Report does, what it doesn't, and how we make money. We built this page to be honest — including about ourselves.</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SECTION 1: GOVERNMENT ============ */}
      <section id="government" className="compare-section">
        <div className="compare-section-inner">
          <h2 className="compare-section-heading">Government Tools</h2>
          <p className="compare-section-desc">
            These are built and maintained by the federal government using taxpayer-funded data.
            They're free, they have no commercial conflicts, and they're the foundation everything else is built on.
          </p>

          {/* Medicare Care Compare */}
          <div className="compare-tool-card compare-tool-card--government">
            <div className="compare-tool-header">
              <h3 className="compare-tool-name">Medicare Care Compare</h3>
              <span className="compare-tool-badge compare-tool-badge--free">Free</span>
            </div>
            <p className="compare-tool-tagline">
              The official federal tool for comparing every Medicare- and Medicaid-certified nursing home
              in the United States. Run by CMS (Centers for Medicare &amp; Medicaid Services). Formerly
              known as "Nursing Home Compare."
            </p>

            <div className="compare-does-grid">
              <div className="compare-does-col compare-does-col--yes">
                <h4>What It Does</h4>
                <ul>
                  <li>Five-Star quality ratings across inspections, staffing, and quality measures</li>
                  <li>Three years of inspection history with deficiency citations</li>
                  <li>Staffing data from payroll records, including weekend staffing</li>
                  <li>PE and REIT ownership labels (added 2024)</li>
                  <li>Special Focus Facility flags for chronic underperformers</li>
                  <li>Free downloadable datasets and API access</li>
                </ul>
              </div>
              <div className="compare-does-col compare-does-col--no">
                <h4>What It Doesn't</h4>
                <ul>
                  <li>No financial transparency — can't see where the money goes</li>
                  <li>No chain-level analysis — can't compare across an owner's portfolio</li>
                  <li>Five-Star ratings are based on self-reported data and widely criticized as gameable</li>
                  <li>No related-party transaction data</li>
                  <li>Difficult interface not designed for families</li>
                  <li>No alerts or watchlist functionality</li>
                </ul>
              </div>
            </div>

            <div className="compare-verdict">
              <strong>Start here.</strong> This is the most comprehensive data source available.
              But the ratings can be misleading and the interface makes it hard to understand what you're looking at.
              Use it for raw data, not as your only source.
            </div>
          </div>

          {/* SFF Program */}
          <div className="compare-tool-card compare-tool-card--government">
            <div className="compare-tool-header">
              <h3 className="compare-tool-name">CMS Special Focus Facility List</h3>
              <span className="compare-tool-badge compare-tool-badge--free">Free</span>
            </div>
            <p className="compare-tool-tagline">
              A quarterly list published by CMS identifying the worst-performing nursing homes
              in the country — facilities with persistent patterns of serious quality issues.
            </p>

            <div className="compare-does-grid">
              <div className="compare-does-col compare-does-col--yes">
                <h4>What It Does</h4>
                <ul>
                  <li>Names the worst nursing homes in America</li>
                  <li>Tracks whether flagged facilities improve or get terminated</li>
                  <li>Updated quarterly</li>
                </ul>
              </div>
              <div className="compare-does-col compare-does-col--no">
                <h4>What It Doesn't</h4>
                <ul>
                  <li>Published as a PDF — not searchable, no database</li>
                  <li>The "candidate" list (next tier of worst facilities) has 5x more facilities than the public list — most at-risk homes are invisible</li>
                  <li>Families have to know it exists to find it</li>
                </ul>
              </div>
            </div>

            <div className="compare-verdict">
              <strong>If your facility is on this list, that's a serious red flag.</strong> But most
              problem facilities never make it onto this list because the program is severely capacity-limited.
            </div>
          </div>
        </div>
      </section>

      {/* ============ SECTION 2: JOURNALISM ============ */}
      <section id="journalism" className="compare-section">
        <div className="compare-section-inner">
          <h2 className="compare-section-heading">Journalism &amp; Advocacy Tools</h2>
          <p className="compare-section-desc">
            Independent organizations that repackage government data into more usable formats.
            No commercial conflicts — funded by donations or grants.
          </p>

          {/* ProPublica */}
          <div className="compare-tool-card compare-tool-card--journalism">
            <div className="compare-tool-header">
              <h3 className="compare-tool-name">ProPublica Nursing Home Inspect</h3>
              <span className="compare-tool-badge compare-tool-badge--free">Free &middot; Nonprofit</span>
            </div>
            <p className="compare-tool-tagline">
              The most sophisticated public nursing home inspection database outside of the federal government.
              Covers 15,000+ facilities with 400,000+ deficiency reports. Run by the Pulitzer Prize-winning
              investigative newsroom.
            </p>

            <div className="compare-does-grid">
              <div className="compare-does-col compare-does-col--yes">
                <h4>What It Does</h4>
                <ul>
                  <li>Full-text search across all deficiency narratives — unique capability CMS doesn't offer</li>
                  <li>Advanced search: multi-state, date range, severity, category</li>
                  <li>Facility pages with fines, staffing, turnover, vaccination rates</li>
                  <li>Recently added ownership information</li>
                  <li>Embeddable widget — appears on Yelp nursing home listings</li>
                  <li>Monthly data refresh</li>
                </ul>
              </div>
              <div className="compare-does-col compare-does-col--no">
                <h4>What It Doesn't</h4>
                <ul>
                  <li>No financial data — can't see cost reports or related-party spending</li>
                  <li>No chain-level analysis or rankings</li>
                  <li>No PE/REIT ownership network visualization</li>
                  <li>No geographic heat maps</li>
                  <li>No watchlist or alert features</li>
                </ul>
              </div>
            </div>

            <div className="compare-verdict">
              <strong>Excellent for researching specific violations.</strong> If you want to know
              exactly what inspectors found at a facility, this is the best tool available.
              But it can't follow the money or show you chain-wide patterns.
            </div>
          </div>

          {/* LTCCC / NursingHome411 */}
          <div className="compare-tool-card compare-tool-card--journalism">
            <div className="compare-tool-header">
              <h3 className="compare-tool-name">NursingHome411 (LTCCC)</h3>
              <span className="compare-tool-badge compare-tool-badge--free">Free &middot; Nonprofit</span>
            </div>
            <p className="compare-tool-tagline">
              Run by the Long Term Care Community Coalition, a New York-based advocacy organization.
              Provides searchable datasets repackaged from CMS for advocates, ombudsmen, and families.
            </p>

            <div className="compare-does-grid">
              <div className="compare-does-col compare-does-col--yes">
                <h4>What It Does</h4>
                <ul>
                  <li>Four searchable datasets: Provider Info, Citations, Penalties, Staffing</li>
                  <li>Combined "Problem Facilities" list (SFF + SFF Candidates + 1-star facilities)</li>
                  <li>State-by-state comparisons</li>
                  <li>Policy briefs and advocacy alerts</li>
                </ul>
              </div>
              <div className="compare-does-col compare-does-col--no">
                <h4>What It Doesn't</h4>
                <ul>
                  <li>No individual facility report cards</li>
                  <li>No financial transparency layer</li>
                  <li>More research-oriented than family-friendly</li>
                  <li>Limited visualization tools</li>
                </ul>
              </div>
            </div>

            <div className="compare-verdict">
              <strong>Best for advocates and researchers.</strong> If you're an ombudsman or journalist
              needing sortable CMS datasets, this is useful. Not designed for a family trying to
              pick a nursing home quickly.
            </div>
          </div>
        </div>
      </section>

      {/* ============ SECTION 3: REFERRAL SITES ============ */}
      <section id="referral" className="compare-section">
        <div className="compare-section-inner">
          <h2 className="compare-section-heading">Referral Sites</h2>
          <p className="compare-section-desc">
            These sites connect families with nursing homes and assisted living communities.
            They're marketed as free, but the business model creates a fundamental conflict
            of interest that every family should understand.
          </p>

          {/* HOW THE MODEL WORKS */}
          <div className="compare-commission-diagram">
            <h4 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem', marginBottom: 20, color: 'var(--text-white)' }}>
              How Referral Sites Make Money
            </h4>
            <div className="commission-flow">
              <div className="commission-entity">Family contacts<br/>referral site</div>
              <div>
                <div className="commission-arrow">&rarr;</div>
              </div>
              <div className="commission-entity">Site refers family<br/>to a facility</div>
              <div>
                <div className="commission-arrow">&rarr;</div>
              </div>
              <div className="commission-entity">Family moves in</div>
              <div>
                <div className="commission-arrow">&rarr;</div>
              </div>
              <div className="commission-entity" style={{ borderColor: 'rgba(220,38,38,0.3)' }}>
                Facility pays<br/>referral site
                <div className="commission-label" style={{ marginTop: 4 }}>Up to $12,000</div>
              </div>
            </div>
            <p className="commission-caption">
              Commissions are typically 85–100% of the resident's first month's rent and care costs.
              Higher rent = higher commission. The family is told the service is "free."
              <br/>
              <a className="compare-source-link" href="https://www.casey.senate.gov/news/releases/casey-demands-major-assisted-living-facility-referral-service-a-place-for-mom-address-concerns-about-deceptive-marketing-practices" target="_blank" rel="noopener noreferrer">
                Source: U.S. Senate Special Committee on Aging
              </a>
            </p>
          </div>

          {/* A PLACE FOR MOM */}
          <div className="compare-tool-card compare-tool-card--referral">
            <div className="compare-tool-header">
              <h3 className="compare-tool-name">A Place for Mom</h3>
              <span className="compare-tool-badge compare-tool-badge--conflict">Conflict of Interest</span>
            </div>
            <p className="compare-tool-tagline">
              The largest for-profit senior care referral service in the U.S. Network of approximately
              14,000 communities. Owned by private equity firms General Atlantic and Silver Lake
              (since 2017), with Insight Partners investing $175 million in 2022 at a $1 billion+ valuation.
            </p>

            <div className="compare-does-grid">
              <div className="compare-does-col compare-does-col--yes">
                <h4>What It Offers</h4>
                <ul>
                  <li>Phone advisor matching service</li>
                  <li>Directory with reviews and photos</li>
                  <li>Wide geographic coverage</li>
                  <li>"Best of Senior Living" annual awards</li>
                </ul>
              </div>
              <div className="compare-does-col compare-does-col--no">
                <h4>What Families Should Know</h4>
                <ul>
                  <li>Only shows facilities that pay commissions — less than half of all facilities nationwide</li>
                  <li>Facilities accepting Medicaid often can't afford commissions and are excluded</li>
                  <li>Advisors earn bonuses tied to volume, not outcomes</li>
                  <li>Does not prominently surface CMS deficiencies, fines, or SFF status</li>
                  <li>Pricing only available by phone, not online</li>
                  <li>No financial transparency or ownership analysis</li>
                </ul>
              </div>
            </div>

            <div className="compare-warning">
              <h4>The Public Record</h4>
              <p>The following investigations, lawsuits, and findings are sourced from public government
              records and major news outlets. We encourage you to verify each one using the links provided.</p>
            </div>

            <div className="compare-record">
              <div className="compare-record-item">
                <h5>U.S. Senate Investigation</h5>
                <div className="record-date">June 19, 2024</div>
                <p>
                  Senator Bob Casey, Chairman of the Senate Special Committee on Aging, opened a
                  formal probe into A Place for Mom's business practices. The investigation found
                  that <strong>38% of families</strong> ended up paying above their stated budget,
                  rising to <strong>55% for memory care placements</strong>. Casey's letter accused
                  the company of "potentially deceptive marketing practices" by presenting itself as
                  "unbiased and no-cost" while exclusively recommending commission-paying facilities.
                  <br/><br/>
                  <a className="compare-source-link" href="https://www.casey.senate.gov/news/releases/casey-demands-major-assisted-living-facility-referral-service-a-place-for-mom-address-concerns-about-deceptive-marketing-practices" target="_blank" rel="noopener noreferrer">
                    U.S. Senate Committee on Aging — Official Release
                  </a>
                  &nbsp;&middot;&nbsp;
                  <a className="compare-source-link" href="https://www.nbcnews.com/news/us-news/senate-announces-probe-place-for-mom-referral-service-rcna157282" target="_blank" rel="noopener noreferrer">
                    NBC News Coverage
                  </a>
                </p>
              </div>

              <div className="compare-record-item">
                <h5>Washington Post Investigation</h5>
                <div className="record-date">May 16, 2024</div>
                <p>
                  The Washington Post compared A Place for Mom's "Best of Senior Living" award
                  winners against state inspection reports. They found that <strong>37.5% of award
                  winners (324 of 863)</strong> had been cited for neglect or substandard care in
                  the previous two years. Violations included resident deaths, medication errors,
                  understaffing, and sexual abuse. Current and former sales managers at multiple
                  chains described routine review manipulation — facilities selectively soliciting
                  positive reviews to meet internal "quotas."
                  <br/><br/>
                  <a className="compare-source-link" href="https://seniorhousingnews.com/2024/05/16/washington-post-analysis-links-a-place-for-mom-reviews-awards-with-care-citations/" target="_blank" rel="noopener noreferrer">
                    Senior Housing News Analysis
                  </a>
                  &nbsp;&middot;&nbsp;
                  <a className="compare-source-link" href="https://www.mcknightsseniorliving.com/news/senior-living-referral-site-accused-of-using-manipulated-reviews-listing-communities-providing-substandard-care/" target="_blank" rel="noopener noreferrer">
                    McKnight's Senior Living Coverage
                  </a>
                </p>
              </div>

              <div className="compare-record-item">
                <h5>$6 Million Class Action Settlement (Robocalling)</h5>
                <div className="record-date">Filed August 2017</div>
                <p>
                  In <em>Pine v. A Place for Mom, Inc.</em> (Case No. 2:17-cv-01826, W.D. Washington),
                  the company settled a class action alleging it used autodialers to call approximately
                  <strong>3 million people</strong> without proper consent under the Telephone Consumer
                  Protection Act. The settlement was $6 million. A second TCPA lawsuit was subsequently
                  filed alleging the company's consent language changes after the first suit were
                  still inadequate.
                  <br/><br/>
                  <a className="compare-source-link" href="https://www.mcknightsseniorliving.com/news/a-place-for-mom-agrees-to-settle-lawsuit-for-6-million/" target="_blank" rel="noopener noreferrer">
                    McKnight's Senior Living — Settlement Coverage
                  </a>
                  &nbsp;&middot;&nbsp;
                  <a className="compare-source-link" href="https://topclassactions.com/lawsuit-settlements/tcpa/a-place-for-mom-to-settle-auto-dialer-class-action-for-6-million/" target="_blank" rel="noopener noreferrer">
                    Top Class Actions
                  </a>
                </p>
              </div>

              <div className="compare-record-item">
                <h5>Seattle Times "Seniors for Sale" Investigation</h5>
                <div className="record-date">2010</div>
                <p>
                  The Seattle Times published a major investigation finding that A Place for Mom
                  referred families to senior living homes without inspecting them for quality.
                  In at least <strong>143 cases</strong>, seniors were victimized after placement
                  agencies directed them to homes with documented abuse and neglect violations.
                  The investigation directly led to Washington State passing the first comprehensive
                  law regulating elder-care referral companies in the country (RCW 18.330).
                  <br/><br/>
                  <a className="compare-source-link" href="https://www.seattletimes.com/seattle-news/special-reports/hundreds-of-adult-homes-conceal-abuse-neglect/" target="_blank" rel="noopener noreferrer">
                    Seattle Times — "Seniors for Sale"
                  </a>
                  &nbsp;&middot;&nbsp;
                  <a className="compare-source-link" href="https://www.seattletimes.com/seattle-news/state-gets-tough-on-referrals-for-elder-care/" target="_blank" rel="noopener noreferrer">
                    Seattle Times — Regulatory Response
                  </a>
                </p>
              </div>

              <div className="compare-record-item">
                <h5>Wisconsin Legislative Scrutiny</h5>
                <div className="record-date">2024–2025</div>
                <p>
                  The Wisconsin Capital Times found that <strong>two of five</strong> A Place for
                  Mom "Best of 2025" award recipients in Wisconsin had been disciplined by state
                  regulators in the previous three years. Wisconsin legislators introduced a bill
                  requiring senior care referral companies to disclose their commission structures
                  and conflicts of interest upfront.
                  <br/><br/>
                  <a className="compare-source-link" href="https://captimes.com/news/government/a-place-for-mom-assisted-living-referrals-draw-wisconsin-scrutiny/article_c6ff34f7-326f-4e60-802b-cb27e516d63c.html" target="_blank" rel="noopener noreferrer">
                    Capital Times
                  </a>
                  &nbsp;&middot;&nbsp;
                  <a className="compare-source-link" href="https://www.fox6now.com/news/wisconsin-bill-seeks-transparency-from-senior-care-referral-companies" target="_blank" rel="noopener noreferrer">
                    FOX6 Milwaukee
                  </a>
                </p>
              </div>
            </div>

            <div className="compare-verdict">
              <strong>Understand the incentive.</strong> A Place for Mom is not a neutral guide —
              it is a lead generation service paid by facilities. That doesn't mean every recommendation
              is bad. But the Senate, the Washington Post, and multiple state legislatures have
              documented a pattern of misleading families about the nature of the service.
            </div>
          </div>

          {/* CARING.COM */}
          <div className="compare-tool-card compare-tool-card--referral">
            <div className="compare-tool-header">
              <h3 className="compare-tool-name">Caring.com</h3>
              <span className="compare-tool-badge compare-tool-badge--conflict">Conflict of Interest</span>
            </div>
            <p className="compare-tool-tagline">
              The second-largest senior living referral site. Same commission-based model as A Place
              for Mom. Acquired by Oasis Senior Advisors in January 2026.
            </p>

            <div className="compare-record">
              <div className="compare-record-item">
                <h5>FTC Antitrust Action</h5>
                <div className="record-date">November 2017</div>
                <p>
                  When Red Ventures sought to acquire Bankrate (which owned Caring.com), the FTC
                  determined that the same investors would control both the #1 and #2 senior living
                  referral services — creating unacceptable market concentration. The FTC forced
                  the divestiture of Caring.com as a condition of the merger.
                  <br/><br/>
                  <a className="compare-source-link" href="https://www.ftc.gov/news-events/news/press-releases/2017/11/parties-agree-divestiture-senior-living-facilities-referral-service-caringcom-condition-red-ventures" target="_blank" rel="noopener noreferrer">
                    FTC Press Release — Divestiture Order
                  </a>
                  &nbsp;&middot;&nbsp;
                  <a className="compare-source-link" href="https://www.ftc.gov/news-events/news/press-releases/2018/03/ftc-approves-final-order-requiring-divestiture-senior-living-facilities-referral-service-caringcom" target="_blank" rel="noopener noreferrer">
                    FTC Final Order
                  </a>
                </p>
              </div>

              <div className="compare-record-item">
                <h5>Review Removal Practices</h5>
                <div className="record-date">Ongoing</div>
                <p>
                  Consumer complaints document that facilities can contest any negative review
                  on Caring.com regardless of its truthfulness. Caring.com will remove the review
                  if the facility objects — with no mechanism requiring the facility to substantiate
                  its complaint. This effectively allows facilities to scrub critical reviews.
                  <br/><br/>
                  <a className="compare-source-link" href="https://www.reviewopedia.com/caring-com-reviews" target="_blank" rel="noopener noreferrer">
                    Reviewopedia — Consumer Analysis
                  </a>
                </p>
              </div>
            </div>

            <div className="compare-verdict">
              <strong>Same commission model, same conflicts.</strong> The FTC considered the senior
              living referral market concentrated enough that two companies under common ownership
              was an antitrust concern. That tells you something about how few real options families have.
            </div>
          </div>

          {/* SENIORADVISOR */}
          <div className="compare-tool-card compare-tool-card--referral">
            <div className="compare-tool-header">
              <h3 className="compare-tool-name">SeniorAdvisor.com</h3>
              <span className="compare-tool-badge compare-tool-badge--conflict">Owned by A Place for Mom</span>
            </div>
            <p className="compare-tool-tagline">
              SeniorAdvisor.com is a <strong>wholly-owned subsidiary of A Place for Mom</strong>,
              launched in March 2013.{' '}
              <a className="compare-source-link" href="https://www.prnewswire.com/news-releases/a-place-for-mom-launches-senioradvisorcom-199855711.html" target="_blank" rel="noopener noreferrer">
                (Source: APFM Press Release)
              </a>
            </p>
            <p className="compare-tool-tagline">
              If you visit both SeniorAdvisor.com and A Place for Mom thinking you're getting two
              independent perspectives, you're not. They are the same company. The privacy policy
              on SeniorAdvisor.com is filed under "A Place for Mom, Inc."
            </p>
            <div className="compare-verdict">
              <strong>Not an independent option.</strong> Same company, different URL.
            </div>
          </div>
        </div>
      </section>

      {/* ============ SECTION 4: RANKINGS SITES ============ */}
      <section id="rankings" className="compare-section">
        <div className="compare-section-inner">
          <h2 className="compare-section-heading">Rankings &amp; Review Sites</h2>
          <p className="compare-section-desc">
            Annual "best of" lists from media outlets. Useful for high-level comparisons,
            but limited in depth and scope.
          </p>

          {/* US News */}
          <div className="compare-tool-card compare-tool-card--rankings">
            <div className="compare-tool-header">
              <h3 className="compare-tool-name">U.S. News &amp; World Report</h3>
              <span className="compare-tool-badge compare-tool-badge--paid">Partially Paywalled</span>
            </div>
            <p className="compare-tool-tagline">
              Annual rankings of 15,000+ nursing homes using their own methodology — notably,
              they do <em>not</em> use CMS's Five-Star overall rating. Emphasizes patient outcomes
              over process measures.
            </p>

            <div className="compare-does-grid">
              <div className="compare-does-col compare-does-col--yes">
                <h4>What It Does</h4>
                <ul>
                  <li>Independent methodology (better than Five-Star)</li>
                  <li>Separate short-term and long-term care ratings</li>
                  <li>Considers antipsychotic drug use, ER visit rates, weekend staffing</li>
                  <li>Consumer-friendly presentation</li>
                </ul>
              </div>
              <div className="compare-does-col compare-does-col--no">
                <h4>What It Doesn't</h4>
                <ul>
                  <li>Deep data requires a paid subscription</li>
                  <li>Still based entirely on CMS source data</li>
                  <li>No financial transparency or cost report analysis</li>
                  <li>No ownership network or chain-level analysis</li>
                  <li>Annual snapshot only — not continuously updated</li>
                </ul>
              </div>
            </div>

            <div className="compare-verdict">
              <strong>Good rankings, but surface-level.</strong> Better methodology than CMS's
              Five-Star, but still can't tell you who owns the facility, where the money goes,
              or what's happening chain-wide.
            </div>
          </div>

          {/* Newsweek */}
          <div className="compare-tool-card compare-tool-card--rankings">
            <div className="compare-tool-header">
              <h3 className="compare-tool-name">Newsweek / Statista</h3>
              <span className="compare-tool-badge compare-tool-badge--free">Free</span>
            </div>
            <p className="compare-tool-tagline">
              Annual "Best Nursing Homes" rankings produced with Statista using CMS data (52% weight),
              a peer survey of medical professionals (33%), and accreditation data (10%).
            </p>

            <div className="compare-does-grid">
              <div className="compare-does-col compare-does-col--yes">
                <h4>What It Does</h4>
                <ul>
                  <li>Adds a peer survey dimension CMS doesn't have</li>
                  <li>Three facility size tiers</li>
                </ul>
              </div>
              <div className="compare-does-col compare-does-col--no">
                <h4>What It Doesn't</h4>
                <ul>
                  <li>Only covers 25 states</li>
                  <li>Only lists the "best" — tells you nothing about the worst</li>
                  <li>Peer survey can be influenced by reputation rather than reality</li>
                  <li>No financial data, no ownership analysis</li>
                </ul>
              </div>
            </div>

            <div className="compare-verdict">
              <strong>Useful if your state is covered and you're looking at top-rated facilities.</strong>{' '}
              Ranking the best 1,050 out of 14,858 tells families
              nothing about the ones that might harm their loved ones.
            </div>
          </div>
        </div>
      </section>

      {/* ============ SECTION 5: COMPARISON TABLE ============ */}
      <section id="comparison" className="compare-section">
        <div className="compare-section-inner" style={{ maxWidth: 1100 }}>
          <h2 className="compare-section-heading">Side-by-Side Comparison</h2>
          <p className="compare-section-desc">
            What each tool covers — and what's missing.
          </p>

          <div className="compare-matrix-wrapper">
            <table className="compare-matrix">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Care Compare</th>
                  <th>ProPublica</th>
                  <th>A Place for Mom</th>
                  <th>US News</th>
                  <th className="compare-matrix-ours">The Oversight Report</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Free to use</td>
                  <td className="matrix-yes">Yes</td>
                  <td className="matrix-yes">Yes</td>
                  <td className="matrix-partial">Free*</td>
                  <td className="matrix-partial">Partial</td>
                  <td className="compare-matrix-ours-cell matrix-yes">Yes</td>
                </tr>
                <tr>
                  <td>No facility commissions</td>
                  <td className="matrix-yes">Yes</td>
                  <td className="matrix-yes">Yes</td>
                  <td className="matrix-conflict">No — up to $12K/referral</td>
                  <td className="matrix-yes">Yes</td>
                  <td className="compare-matrix-ours-cell matrix-yes">Yes</td>
                </tr>
                <tr>
                  <td>Inspection data</td>
                  <td className="matrix-yes">Yes</td>
                  <td className="matrix-yes">Yes (full text)</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-yes">Yes</td>
                  <td className="compare-matrix-ours-cell matrix-yes">Yes</td>
                </tr>
                <tr>
                  <td>Staffing data</td>
                  <td className="matrix-yes">Yes</td>
                  <td className="matrix-partial">Basic</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-yes">Yes</td>
                  <td className="compare-matrix-ours-cell matrix-yes">Yes + Zero-RN tracking</td>
                </tr>
                <tr>
                  <td>Penalty history</td>
                  <td className="matrix-yes">Yes</td>
                  <td className="matrix-yes">Yes</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-partial">Limited</td>
                  <td className="compare-matrix-ours-cell matrix-yes">Yes</td>
                </tr>
                <tr>
                  <td>Financial transparency</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="compare-matrix-ours-cell matrix-yes">Yes — cost reports &amp; related-party data</td>
                </tr>
                <tr>
                  <td>PE / REIT ownership flags</td>
                  <td className="matrix-partial">Label only</td>
                  <td className="matrix-partial">Basic</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="compare-matrix-ours-cell matrix-yes">Yes — badges + alerts</td>
                </tr>
                <tr>
                  <td>Chain safety rankings</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="compare-matrix-ours-cell matrix-yes">Yes</td>
                </tr>
                <tr>
                  <td>Ownership network analysis</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="compare-matrix-ours-cell matrix-yes">Yes</td>
                </tr>
                <tr>
                  <td>Watchlist / alerts</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="compare-matrix-ours-cell matrix-yes">Yes</td>
                </tr>
                <tr>
                  <td>Documented evidence reports</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="matrix-no">No</td>
                  <td className="compare-matrix-ours-cell matrix-yes">Yes</td>
                </tr>
                <tr>
                  <td>Designed for families</td>
                  <td className="matrix-no">Poor UX</td>
                  <td className="matrix-partial">Research-oriented</td>
                  <td className="matrix-yes">Yes</td>
                  <td className="matrix-yes">Yes</td>
                  <td className="compare-matrix-ours-cell matrix-yes">Yes</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 8 }}>
            *A Place for Mom is free to families. Facilities pay commissions of 85–100% of first month's
            rent per referral. This cost is factored into the prices families pay.
          </p>
        </div>
      </section>

      {/* ============ SECTION 6: OUR APPROACH ============ */}
      <section id="our-approach" className="compare-section">
        <div className="compare-section-inner">
          <h2 className="compare-section-heading">Our Approach</h2>
          <p className="compare-section-desc">
            We built The Oversight Report because we couldn't find a single tool that combined
            quality data, financial transparency, and ownership accountability in one place.
            Here's how we're different.
          </p>

          <div className="compare-tool-card compare-tool-card--ours">
            <div className="compare-tool-header">
              <h3 className="compare-tool-name">The Oversight Report</h3>
              <span className="compare-tool-badge compare-tool-badge--free">Free &middot; No Facility Commissions</span>
            </div>

            <div className="compare-does-grid">
              <div className="compare-does-col compare-does-col--yes">
                <h4>What We Do</h4>
                <ul>
                  <li>Facility report cards combining inspections, staffing, penalties, and financial data</li>
                  <li>PE and REIT ownership identification with visual badges</li>
                  <li>Chain safety rankings — compare every facility an owner operates</li>
                  <li>Financial transparency from Medicare cost reports (related-party transactions)</li>
                  <li>Zero-RN day tracking — when a facility had no registered nurse on duty</li>
                  <li>Ownership change alerts (sold within 3 years)</li>
                  <li>Watchlist — follow specific facilities for changes</li>
                  <li>AG enforcement toolkit for state attorneys general</li>
                  <li>Professionally documented evidence reports</li>
                </ul>
              </div>
              <div className="compare-does-col compare-does-col--no">
                <h4>Our Limitations (Honestly)</h4>
                <ul>
                  <li>We use the same CMS data as everyone else — if CMS data has gaps, so do we</li>
                  <li>Cost report data lags approximately 18 months</li>
                  <li>We don't offer phone advisors or in-person facility tours</li>
                  <li>Our ownership data relies on CMS disclosure, which has known gaps (approximately one-third of PE investments may be missing)</li>
                </ul>
              </div>
            </div>

            <div className="compare-warning" style={{ borderLeftColor: 'var(--primary)', background: 'rgba(43,108,176,0.04)' }}>
              <h4 style={{ color: 'var(--primary)' }}>How We Make Money</h4>
              <p>
                We do not take money from nursing homes. We do not receive referral commissions.
                Our revenue comes from optional paid tiers for professionals (attorneys, journalists,
                researchers) who need deeper data access, trend analysis, and evidence reports.
                The core facility report cards, safety map, and search are free — permanently.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="compare-cta">
        <div className="container-narrow">
          <h2>Start With the Data</h2>
          <p>
            Search any nursing home in America. See what the other tools don't show you.
          </p>
          <Link to="/" state={{ jumpToMap: true }} className="compare-cta-btn">
            Search Facilities
          </Link>
        </div>
      </section>

      {/* ============ FOOTNOTES ============ */}
      <section className="compare-footnotes">
        <div className="container-narrow">
          <h3>Sources &amp; References</h3>
          <ol>
            <li>
              U.S. Senate Special Committee on Aging, "Casey Demands Major Assisted Living Facility
              Referral Service A Place for Mom Address Concerns About Deceptive Marketing Practices,"
              June 19, 2024.{' '}
              <a href="https://www.casey.senate.gov/news/releases/casey-demands-major-assisted-living-facility-referral-service-a-place-for-mom-address-concerns-about-deceptive-marketing-practices" target="_blank" rel="noopener noreferrer">
                casey.senate.gov
              </a>
            </li>
            <li>
              NBC News, "Senate probes A Place for Mom, referral service accused of putting seniors
              at risk," June 2024.{' '}
              <a href="https://www.nbcnews.com/news/us-news/senate-announces-probe-place-for-mom-referral-service-rcna157282" target="_blank" rel="noopener noreferrer">
                nbcnews.com
              </a>
            </li>
            <li>
              The Washington Post, "Popular assisted living referral 'A Place for Mom' glosses over
              neglect," May 16, 2024. Analysis:{' '}
              <a href="https://seniorhousingnews.com/2024/05/16/washington-post-analysis-links-a-place-for-mom-reviews-awards-with-care-citations/" target="_blank" rel="noopener noreferrer">
                seniorhousingnews.com
              </a>
            </li>
            <li>
              McKnight's Senior Living, "A Place for Mom agrees to settle lawsuit for $6 million."{' '}
              <a href="https://www.mcknightsseniorliving.com/news/a-place-for-mom-agrees-to-settle-lawsuit-for-6-million/" target="_blank" rel="noopener noreferrer">
                mcknightsseniorliving.com
              </a>
            </li>
            <li>
              Top Class Actions, "A Place for Mom to Settle Auto-Dialer Class Action for $6 Million."{' '}
              <a href="https://topclassactions.com/lawsuit-settlements/tcpa/a-place-for-mom-to-settle-auto-dialer-class-action-for-6-million/" target="_blank" rel="noopener noreferrer">
                topclassactions.com
              </a>
            </li>
            <li>
              The Seattle Times, "Seniors for Sale" investigative series, 2010.{' '}
              <a href="https://www.seattletimes.com/seattle-news/special-reports/hundreds-of-adult-homes-conceal-abuse-neglect/" target="_blank" rel="noopener noreferrer">
                seattletimes.com
              </a>
            </li>
            <li>
              The Seattle Times, "State gets tough on referrals for elder care," 2011.{' '}
              <a href="https://www.seattletimes.com/seattle-news/state-gets-tough-on-referrals-for-elder-care/" target="_blank" rel="noopener noreferrer">
                seattletimes.com
              </a>
            </li>
            <li>
              FTC, "Parties Agree to Divestiture of Senior Living Facilities Referral Service
              Caring.com," November 2017.{' '}
              <a href="https://www.ftc.gov/news-events/news/press-releases/2017/11/parties-agree-divestiture-senior-living-facilities-referral-service-caringcom-condition-red-ventures" target="_blank" rel="noopener noreferrer">
                ftc.gov
              </a>
            </li>
            <li>
              FTC, "FTC Approves Final Order Requiring Divestiture of Caring.com," March 2018.{' '}
              <a href="https://www.ftc.gov/news-events/news/press-releases/2018/03/ftc-approves-final-order-requiring-divestiture-senior-living-facilities-referral-service-caringcom" target="_blank" rel="noopener noreferrer">
                ftc.gov
              </a>
            </li>
            <li>
              Wisconsin Capital Times, "A Place for Mom assisted living referrals draw Wisconsin
              scrutiny," 2024.{' '}
              <a href="https://captimes.com/news/government/a-place-for-mom-assisted-living-referrals-draw-wisconsin-scrutiny/article_c6ff34f7-326f-4e60-802b-cb27e516d63c.html" target="_blank" rel="noopener noreferrer">
                captimes.com
              </a>
            </li>
            <li>
              A Place for Mom, "A Place for Mom Launches SeniorAdvisor.com," March 2013.{' '}
              <a href="https://www.prnewswire.com/news-releases/a-place-for-mom-launches-senioradvisorcom-199855711.html" target="_blank" rel="noopener noreferrer">
                prnewswire.com
              </a>
            </li>
            <li>
              CMS Medicare Care Compare.{' '}
              <a href="https://www.medicare.gov/care-compare/" target="_blank" rel="noopener noreferrer">
                medicare.gov/care-compare
              </a>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
