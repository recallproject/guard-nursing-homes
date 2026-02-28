import { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../../styles/landing-v4.css';

export default function LandingV4({ onSearch, onExplore }) {
  const navigate = useNavigate();
  const statsRef = useRef(null);
  const countersAnimated = useRef(false);

  // Rolling counter animation
  useEffect(() => {
    if (!statsRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !countersAnimated.current) {
          countersAnimated.current = true;
          statsRef.current.querySelectorAll('.v4-stat-value[data-target]').forEach(el => {
            animateCounter(el);
          });
        }
      });
    }, { threshold: 0.1 });
    observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const isRatio = el.dataset.isRatio === 'true';
    const duration = 2000;
    const startTime = performance.now();
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      if (isRatio) {
        el.textContent = prefix + current;
      } else if (target > 1000) {
        el.textContent = prefix + current.toLocaleString() + suffix;
      } else {
        el.textContent = prefix + current + suffix;
      }
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // Fade-in observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('v4-visible');
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.v4-fade-in').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="v4-landing">

      {/* ═══════ 1. HERO ═══════ */}
      <section className="v4-hero">
        <div className="v4-hero-tagline">Nursing Home Safety Data, Independently Reviewed</div>
        <h1 className="v4-hero-title">Search any nursing home in America.</h1>
        <p className="v4-hero-sub">
          Inspections, staffing, fines, and ownership for all 14,713 Medicare-certified facilities.
        </p>

        <div className="v4-search-container">
          <div className="v4-search-box" onClick={() => onSearch && onSearch()}>
            <input
              className="v4-search-input"
              type="text"
              placeholder="Search by facility name, city, or ZIP code"
              readOnly
              onClick={() => onSearch && onSearch()}
            />
            <button className="v4-search-btn" onClick={(e) => { e.stopPropagation(); onSearch && onSearch(); }}>
              Search a Facility
            </button>
          </div>
        </div>

        <div className="v4-or-browse">
          or <a href="#" onClick={(e) => { e.preventDefault(); onExplore && onExplore(); }}>Browse by State</a>
        </div>

        <div className="v4-trust-line">
          Based on CMS data through Q3 2025 · <Link to="/methodology">How we calculate these numbers</Link>
        </div>
      </section>

      {/* ═══════ 2. IMPACT STATS ═══════ */}
      <div className="v4-stats-row" ref={statsRef}>
        <div className="v4-stat-item v4-fade-in">
          <div className="v4-stat-value neutral" data-target="14713" data-prefix="" data-suffix="">0</div>
          <div className="v4-stat-label">Every Medicare nursing home<br/>in America</div>
        </div>
        <div className="v4-stat-item v4-fade-in">
          <div className="v4-stat-value warning" data-target="3" data-prefix="1 in " data-suffix="" data-is-ratio="true">1 in 0</div>
          <div className="v4-stat-label">Had days with zero registered<br/>nurse hours</div>
        </div>
        <div className="v4-stat-item v4-fade-in">
          <div className="v4-stat-value money" data-target="492" data-prefix="$" data-suffix="M">$0M</div>
          <div className="v4-stat-label">In federal fines<br/>for violations</div>
        </div>
      </div>
      <div className="v4-stats-source">
        Based on CMS data through Q3 2025 · <Link to="/methodology">How we calculate these numbers</Link>
      </div>

      {/* ═══════ 3. WHAT'S INCLUDED (01-06) ═══════ */}
      <div className="v4-section">
        <div className="v4-section-header">
          <div className="v4-section-label">What's Included</div>
          <div className="v4-section-title">Data in Every Facility Report</div>
          <div className="v4-section-sub">Data you won't find assembled anywhere else</div>
        </div>

        <div className="v4-diff-grid">
          {[
            { num: '01', title: 'Staffing Verified Against Payroll', desc: "Cross-references what facilities report to the government against what they actually pay their staff. When those numbers don't match, the report flags it." },
            { num: '02', title: 'Ownership Network Mapping', desc: "See every facility an operator runs — with quality distributions for the entire portfolio. Same owner, full picture across all their locations." },
            { num: '03', title: 'Inspection Citations and Penalties', desc: "Federal and state inspection history, severity classifications, scope of harm, and monetary penalties — organized chronologically with context." },
            { num: '04', title: 'Financial Transparency', desc: "Related-party transactions from federal cost reports. See where Medicare dollars flow between facility owners and their affiliated companies." },
            { num: '05', title: 'Evidence PDFs', desc: "Exhibit-numbered, 10-section documents compiled from 12 CMS databases. Used by attorneys, journalists, regulators, and ombudsman offices." },
            { num: '06', title: 'Facility-Specific Visit Questions', desc: "Not generic checklists. Questions generated from this facility's actual deficiencies, staffing gaps, and penalty history." },
          ].map(d => (
            <div className="v4-diff-card v4-fade-in" key={d.num}>
              <div className="v4-diff-number">{d.num}</div>
              <div className="v4-diff-title">{d.title}</div>
              <div className="v4-diff-desc">{d.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ 4. COVERAGE — CARE TYPE CARDS ═══════ */}
      <div className="v4-section">
        <div className="v4-section-header">
          <div className="v4-section-label">Coverage</div>
          <div className="v4-section-title">Nursing Home Reports. Available Now.</div>
          <div className="v4-section-sub">Five More Care Types In Development.</div>
        </div>

        <div className="v4-care-grid">
          {/* NURSING HOMES — LIVE */}
          <div className="v4-care-card nh is-live v4-fade-in" onClick={() => onSearch && onSearch()}>
            <div className="v4-card-badge live"><span className="v4-badge-dot"></span> Live</div>
            <div className="v4-care-card-header">
              <div className="v4-care-card-icon nh">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/></svg>
              </div>
              <div>
                <div className="v4-care-card-name">Nursing Homes</div>
                <div className="v4-care-card-count">14,713 facilities</div>
              </div>
            </div>
            <div className="v4-care-card-desc">Long-term and skilled nursing care. Safety scores, staffing verified against payroll, ownership networks, fines, and financial transparency.</div>
            <div className="v4-care-card-data">
              <span className="v4-care-data-tag">Deficiencies</span>
              <span className="v4-care-data-tag">Payroll Staffing</span>
              <span className="v4-care-data-tag">Fines</span>
              <span className="v4-care-data-tag">Ownership</span>
              <span className="v4-care-data-tag">Cost Reports</span>
            </div>
            <div className="v4-care-card-arrow">&rarr;</div>
          </div>

          {/* COMING SOON CARDS */}
          {[
            { cls: 'hh', name: 'Home Health', count: '11,856 agencies', desc: 'In-home skilled nursing, therapy, and aide services. Quality measures, patient surveys, deficiencies, and ownership cross-referenced with nursing homes.', tags: ['OASIS Quality', 'HHCAHPS Surveys', 'Deficiencies', 'Ownership'], icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> },
            { cls: 'hospice', name: 'Hospice', count: '5,810 providers', desc: 'End-of-life care at home, facilities, or hospitals. Quality assessments, patient surveys, and deficiency citations.', tags: ['HOPE Assessments', 'CAHPS Surveys', 'Deficiencies', 'Ownership'], icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg> },
            { cls: 'irf', name: 'Inpatient Rehab', count: '1,196 facilities', desc: 'Intensive rehabilitation for stroke, brain injury, and complex medical conditions. Functional outcomes, community discharge rates, and readmission data.', tags: ['Quality Measures', 'Outcomes', 'Readmissions'], icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/></svg> },
            { cls: 'ltch', name: 'Long-Term Acute Care', count: '354 hospitals', desc: 'Extended hospital-level care for complex conditions — ventilator weaning, wound care, IV antibiotics. Quality measures and outcomes.', tags: ['Quality Measures', 'Outcomes', 'Readmissions'], icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg> },
            { cls: 'dialysis', name: 'Dialysis Centers', count: '7,929 facilities', desc: 'Outpatient dialysis clinics and hospital-based units. Patient outcomes, infection rates, staffing, and quality star ratings.', tags: ['Quality Measures', 'Patient Outcomes', 'Inspections'], icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg> },
          ].map(card => (
            <div className={`v4-care-card ${card.cls} is-coming v4-fade-in`} key={card.cls}>
              <div className="v4-card-badge coming">Coming Soon</div>
              <div className="v4-care-card-header">
                <div className={`v4-care-card-icon ${card.cls}`}>{card.icon}</div>
                <div>
                  <div className="v4-care-card-name">{card.name}</div>
                  <div className="v4-care-card-count">{card.count}</div>
                </div>
              </div>
              <div className="v4-care-card-desc">{card.desc}</div>
              <div className="v4-care-card-data">
                {card.tags.map(t => <span className="v4-care-data-tag" key={t}>{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ 5. WHO USES THIS ═══════ */}
      <div className="v4-section">
        <div className="v4-use-case-strip v4-fade-in">
          <div className="v4-use-case-title">Who Uses This</div>
          <div className="v4-use-cases">
            <div className="v4-use-case">
              <div className="v4-use-case-badge">Families</div>
              <div className="v4-use-case-quote">"My mom needs skilled nursing after her hip replacement. I need to know which facilities are actually safe — not just which ones have the nicest lobby."</div>
              <div className="v4-use-case-action">Search any facility &rarr; Free safety report</div>
            </div>
            <div className="v4-use-case">
              <div className="v4-use-case-badge">Attorneys</div>
              <div className="v4-use-case-quote">"I need documented evidence of a pattern — deficiencies, fines, staffing failures — in a format I can attach to a filing."</div>
              <div className="v4-use-case-action">Evidence Report &rarr; $29 per facility</div>
            </div>
            <div className="v4-use-case">
              <div className="v4-use-case-badge">Hospitals</div>
              <div className="v4-use-case-quote">"We discharge 200+ patients per month to post-acute care. We need a fast, data-driven way to compare facilities for each patient."</div>
              <div className="v4-use-case-action">Referral Scorecard &rarr; Coming soon</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ 6. METHODOLOGY BAR ═══════ */}
      <div className="v4-method-bar">
        <div className="v4-method-bar-inner">
          <h3>Transparent Methodology</h3>
          <p>Every number on this site is computed from public federal data. We document our sources, our calculations, and our limitations. If we got something wrong, we want to know.</p>
          <div className="v4-method-links">
            <Link to="/methodology" className="v4-method-link">Read full methodology</Link>
            <Link to="/methodology" className="v4-method-link">View data sources</Link>
            <a href="/samples/OversightReport_Sample_Evidence_Report.pdf" className="v4-method-link" download>See a sample report</a>
          </div>
        </div>
      </div>

      {/* ═══════ 7. BUILDER ═══════ */}
      <div className="v4-builder-section">
        <div className="v4-builder-label">Who Built This</div>
        <div className="v4-builder-name">Rob Benard, NP</div>
        <div className="v4-builder-title-text">Nurse Practitioner — Acute Care, Critical Care, Addiction Medicine</div>
        <div className="v4-builder-bio">
          Twenty years at the bedside taught me that families deserve better tools for the hardest decisions in healthcare. The Oversight Report exists because the data was always public — nobody had assembled it into something usable.
        </div>
        <div className="v4-builder-creds">
          <span className="v4-builder-cred">Highland Hospital / Sutter Health</span>
          <span className="v4-builder-cred">AMERSA 2024</span>
          <span className="v4-builder-cred">Cited: Harvard Data Science Review</span>
        </div>
        <Link to="/methodology" className="v4-builder-link">Read the full story</Link>
      </div>

      {/* ═══════ 8. FINAL CTA ═══════ */}
      <section className="v4-final-cta">
        <h2>Search any nursing facility</h2>
        <p>14,713 Medicare-certified nursing homes. Federal CMS data. Free to search. No login required.</p>
        <div className="v4-final-search">
          <div className="v4-search-box" onClick={() => onSearch && onSearch()}>
            <input className="v4-search-input" type="text" placeholder="Facility name, city, or ZIP code" readOnly onClick={() => onSearch && onSearch()} />
            <button className="v4-search-btn" onClick={(e) => { e.stopPropagation(); onSearch && onSearch(); }}>Search facilities</button>
          </div>
        </div>
        <div className="v4-final-trust">Public CMS data · No industry funding · No ads · No paywalls on safety data</div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="v4-footer">
        <div className="v4-footer-main">Public CMS data · No industry funding · Built by a bedside clinician</div>
        <div className="v4-footer-sub">The Oversight Report — oversightreports.com</div>
        <div className="v4-footer-links">
          <Link to="/methodology" className="v4-footer-link">Methodology</Link>
          <Link to="/methodology" className="v4-footer-link">Data Sources</Link>
          <Link to="/pricing" className="v4-footer-link">Evidence PDFs</Link>
          <Link to="/methodology" className="v4-footer-link">About</Link>
          <a href="mailto:contact@oversightreports.com" className="v4-footer-link">Contact</a>
        </div>
      </footer>
    </div>
  );
}
