import { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Footer from '../components/landing/Footer';
import { useNavigate } from 'react-router-dom';
import '../styles/design.css';
import { checkoutSingleReport } from '../utils/stripe';
import '../styles/pricing.css';

gsap.registerPlugin(ScrollTrigger);

const tiers = [
  {
    name: 'Free Safety Report',
    price: '$0',
    period: 'forever',
    description: 'For families',
    features: [
      'All inspection data',
      'Staffing analysis & trends',
      'Financial transparency',
      'Ownership breakdown',
      'Visit questions & checklist',
      'Nearby alternatives',
      'Downloadable PDF',
    ],
    cta: 'Download Free Report',
    ctaLink: '/',
    ctaType: 'primary',
  },
  {
    name: 'Evidence Report',
    price: '$29',
    period: 'one-time',
    description: 'For attorneys & journalists',
    badge: 'LITIGATION-READY',
    inherits: 'Everything in Free, plus:',
    features: [
      'Exhibit-numbered citations',
      'Multi-year trend analysis',
      'Side-by-side state/national comparisons',
      'Full ownership network map',
      'Staffing discrepancy documentation',
      'Related-party transaction detail',
    ],
    cta: 'Preview Evidence Package',
    ctaLink: '/evidence',
    ctaType: 'primary',
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    window.plausible && window.plausible('Pricing-Page-View');
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero title animation
      gsap.fromTo('.pricing-hero h1',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      );

      gsap.fromTo('.pricing-hero p',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.2, ease: 'power3.out' }
      );

      gsap.fromTo('.pricing-mission',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.25, ease: 'power3.out' }
      );

      // Pricing cards
      gsap.fromTo('.pricing-card',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, delay: 0.3, ease: 'power3.out', clearProps: 'opacity,transform' }
      );

      // Academic section
      gsap.fromTo('.pricing-academic',
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
          scrollTrigger: {
            trigger: '.pricing-academic',
            start: 'top 80%',
            once: true,
          },
        }
      );

      // Transparency section
      gsap.fromTo('.pricing-transparency',
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
          scrollTrigger: {
            trigger: '.pricing-transparency',
            start: 'top 80%',
            once: true,
          },
        }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const handleCtaClick = (tier) => {
    if (tier.ctaLink === '/') {
      navigate('/');
    } else if (tier.ctaLink === '/evidence') {
      // Go to evidence preview page where they can select a facility
      navigate('/evidence');
    } else if (tier.ctaLink) {
      window.location.href = tier.ctaLink;
    }
  };

  return (
    <div className="pricing-page" ref={heroRef}>
      <Helmet>
        <title>Pricing — Evidence Packages & Professional Plans | The Oversight Report</title>
        <meta name="description" content="Nursing home evidence packages for families and attorneys. Professional monitoring tools for journalists and care managers." />
        <link rel="canonical" href="https://oversightreports.com/pricing" />
      </Helmet>
      {/* Hero Section */}
      <section className="pricing-hero">
        <div className="container-narrow">
          <h1>Safety Data for Every Need</h1>
          <p className="pricing-subtitle">
            From families researching a single facility to institutions managing entire networks.
            Choose the plan that fits your mission.
          </p>

          <div className="pricing-mission">
            <p>
              Safety data is always free. Every family deserves to know if a nursing home is safe — that will never be behind a paywall. Professional analysis tools fund this mission. No ads. No industry money. Just families and professionals who believe in transparency.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Grid */}
      <section className="pricing-grid-section">
        <div className="container-wide">
          <div className="pricing-grid" ref={gridRef}>
            {tiers.map((tier) => {
              const cardClass = tier.badge ? 'pricing-card-featured' : '';

              return (
                <div
                  key={tier.name}
                  className={`pricing-card ${cardClass}`}
                >
                  {tier.badge && <div className="pricing-badge">{tier.badge}</div>}

                  <div className="pricing-card-header">
                    <h3 className="pricing-tier-name">{tier.name}</h3>
                    <p className="pricing-tier-description">{tier.description}</p>
                  </div>

                  <div className="pricing-price">
                    <div className="pricing-price-amount">
                      <span className="pricing-price-currency">{tier.price}</span>
                      <span className="pricing-price-period">/{tier.period}</span>
                    </div>
                  </div>

                  <button
                    className={`btn ${
                      tier.ctaType === 'primary' ? 'btn-primary' : 'btn-secondary'
                    } pricing-cta`}
                    onClick={(e) => { e.stopPropagation(); handleCtaClick(tier); }}
                  >
                    {tier.cta}
                  </button>

                  <ul className="pricing-features">
                    {tier.inherits && (
                      <li className="pricing-feature pricing-feature-inherits">
                        <span className="pricing-feature-text">{tier.inherits}</span>
                      </li>
                    )}
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="pricing-feature">
                        <span className="pricing-feature-check">✓</span>
                        <span className="pricing-feature-text">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Academic Access Section */}
      <section className="pricing-academic">
        <div className="container-narrow">
          <h3>Academic Access</h3>
          <p>
            Academic researchers with a .edu email can request free Professional-tier access. We ask that you cite The Oversight Report in your methodology.
          </p>
          <a
            href="mailto:contact@oversightreports.com?subject=Academic Access Request"
            className="btn btn-secondary"
          >
            Contact: contact@oversightreports.com
          </a>
        </div>
      </section>

      {/* Transparency Section */}
      <section className="pricing-transparency">
        <div className="container-narrow">
          <div className="pricing-transparency-quote">
            <p>
              &ldquo;Safety data should be free — and it is. Pro features fund servers, data processing, and
              development. No ads, no sponsors, no conflicts of interest. Your subscription keeps it that way.&rdquo;
            </p>
          </div>
          <div className="pricing-author">
            <div className="pricing-author-name">— Robert Benard, NP</div>
            <div className="pricing-author-title">Founder, DataLink Clinical LLC</div>
          </div>
        </div>
      </section>

      {/* Donation Section */}
      <section className="pricing-donation">
        <div className="container-narrow">
          <h3>Not Ready to Subscribe?</h3>
          <p>If The Oversight Report helped you, consider supporting the project.</p>
          <a
            href="https://ko-fi.com/oversightreport"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Support on Ko-fi ☕
          </a>
        </div>
      </section>

      {/* Footer */}
      <Footer
        onExplore={() => navigate('/')}
        onSearch={() => navigate('/')}
      />
    </div>
  );
}
