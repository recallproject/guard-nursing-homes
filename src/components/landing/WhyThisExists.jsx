import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function WhyThisExists() {
  const sectionRef = useRef(null);
  const [bioOpen, setBioOpen] = useState(false);
  const bioRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate text elements only (not the author card)
      gsap.from('.mission-content > .section-header, .mission-content > .mission-quote, .mission-content > .mission-body, .mission-content > .mission-author', {
        opacity: 0,
        y: 40,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          once: true,
        },
      });

      // Author card gets its own animation
      gsap.from('.author-card', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        delay: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          once: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (bioRef.current) {
      if (bioOpen) {
        const height = bioRef.current.scrollHeight;
        gsap.to(bioRef.current, {
          height,
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
        });
      } else {
        gsap.to(bioRef.current, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
        });
      }
    }
  }, [bioOpen]);

  return (
    <section className="landing-section section-light" ref={sectionRef} style={{ padding: '4rem 0' }}>
      <div className="container">
        <div className="mission-content">
          <div className="section-header">
            <h2>Why This Exists</h2>
          </div>
          <p className="mission-quote">
            Every year, families place their trust in nursing homes — and too often,
            that trust is broken. The data to make better decisions exists, but it's
            scattered across government databases that no one was designed to read.
          </p>
          <p className="mission-body">
            The Oversight Report pulls together inspection data, fine records, staffing
            reports, and complaint histories from CMS and state agencies into one clear
            picture. No spin. No advertising. Just the facts families need to protect
            the people they love.
          </p>
          <div className="mission-author">
            <div>
              <div className="mission-author-name">Built with public data</div>
              <div className="mission-author-role">
                100% sourced from CMS &amp; state inspection records
              </div>
            </div>
          </div>
          <div
            className={`author-card ${bioOpen ? 'author-card-expanded' : ''}`}
            onClick={() => setBioOpen(!bioOpen)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setBioOpen(!bioOpen)}
          >
            <div className="author-card-top">
              <div className="author-card-identity">
                <img src="/rob-headshot.png" alt="Robert Benard, NP" className="author-avatar" />
                <div className="author-info">
                  <div className="author-name">Robert Benard, MS, RN, CNS, AGACNP-BC, PMHNP-BC</div>
                  <div className="author-title">Nurse Practitioner | Data Researcher</div>
                  <div className="author-org">DataLink Clinical LLC</div>
                </div>
              </div>
              <p className="author-quote">&ldquo;Built at the intersection of healthcare, data, and patient advocacy.&rdquo;</p>
              <div className="author-card-toggle">
                {bioOpen ? '\u2715' : 'About the Founder'}
              </div>
            </div>
            <div className="author-bio" ref={bioRef}>
              <div className="author-bio-inner">
                <h4>Why I Built The Oversight Report</h4>
                <p>
                  I&rsquo;ve been a registered nurse since 2004 and a board-certified nurse practitioner
                  since 2013 — over 20 years in healthcare. I&rsquo;m double board-certified in
                  acute care and psychiatry, and I&rsquo;ve worked across
                  emergency medicine, trauma, neuro critical care, and addiction medicine.
                </p>
                <p>
                  I&rsquo;ve seen firsthand what happens when families don&rsquo;t have the information they
                  need — patients placed in facilities with serious safety histories, families
                  blindsided by patterns that were hiding in plain sight in government databases.
                </p>
                <p>
                  The data has always been public. CMS publishes inspection results, penalty records,
                  staffing reports, and complaint investigations for every Medicare-certified nursing
                  home in the country. But it&rsquo;s scattered across multiple websites, buried in
                  jargon, and nearly impossible for a regular person to interpret.
                </p>
                <p>
                  The Oversight Report was born from a simple belief: families shouldn&rsquo;t need a healthcare degree
                  to understand whether a nursing home is safe. I combined my clinical background
                  with data engineering to build a system that pulls all of this information together,
                  scores it, and presents it in plain language — so any family member can walk in
                  informed.
                </p>
                <p>
                  This isn&rsquo;t funded by nursing home companies. There are no ads, no sponsored
                  placements, no conflicts of interest. The Oversight Report exists because the people you love
                  deserve transparency.
                </p>
                <div className="author-bio-details">
                  <div className="author-bio-detail">
                    <strong>Background</strong>
                    <span>20+ years in nursing, double board-certified NP — Emergency Medicine, Trauma, Neuro Critical Care, Addiction Medicine</span>
                  </div>
                  <div className="author-bio-detail">
                    <strong>Data Sources</strong>
                    <span>CMS Care Compare, state survey agencies, ProPublica</span>
                  </div>
                  <div className="author-bio-detail">
                    <strong>Facilities Covered</strong>
                    <span>14,713 Medicare-certified nursing homes across all 50 states</span>
                  </div>
                  <div className="author-bio-detail">
                    <strong>Contact</strong>
                    <span><a href="mailto:contact@oversightreports.com" onClick={(e) => e.stopPropagation()}>contact@oversightreports.com</a></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
