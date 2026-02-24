import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Footer from '../components/landing/Footer';
import { useNavigate } from 'react-router-dom';
import '../styles/design.css';
import '../styles/pricing.css';

gsap.registerPlugin(ScrollTrigger);

const tiers = [
  {
    name: 'Free',
    price: { monthly: 0, annual: 0 },
    description: 'For families',
    badge: null,
    features: [
      'Search all 14,713 facilities',
      'Full report cards with safety scores',
      'All accountability flags and warnings',
      'Staffing breakdown (RN/LPN/CNA minutes)',
      'Inspection history with context',
      'Compare up to 3 facilities',
      'State map and rankings',
      '1 PDF download per day',
    ],
    cta: 'Start Searching',
    ctaLink: '/',
    ctaType: 'primary',
    disabled: false,
  },
  {
    name: 'Pro',
    price: { monthly: 12, annual: 99 },
    description: 'For families who want to stay informed',
    badge: 'MOST POPULAR',
    inherits: 'Everything in Free, plus:',
    features: [
      'Watchlist — save facilities and get email alerts on new violations',
      'Trend analysis — is this facility getting better or worse?',
      'Unlimited PDF downloads',
      'Nearby alternatives within custom radius',
      'Priority support',
    ],
    cta: 'Coming Soon',
    ctaLink: null,
    ctaType: 'primary',
    disabled: true,
  },
  {
    name: 'Professional',
    price: { monthly: 49, annual: 399 },
    description: 'For attorneys, journalists, and ombudsmen',
    badge: null,
    inherits: 'Everything in Pro, plus:',
    features: [
      'State Screening Reports — every facility ranked by risk, exportable',
      'Staffing Discrepancy Index — which facilities\' numbers don\'t match inspections',
      'Ownership Network Explorer — trace owners across facilities and states',
      'Evidence Packages — 10-section litigation-ready PDFs',
      'Bulk CSV exports',
      'Multi-user access (5 seats)',
    ],
    cta: 'Coming Soon',
    ctaLink: null,
    ctaType: 'secondary',
    disabled: true,
  },
  {
    name: 'Institutional',
    price: { monthly: 199, annual: null },
    description: 'For hospitals and care coordination teams',
    badge: null,
    inherits: 'Everything in Professional, plus:',
    features: [
      'Referral Scorecard — rank the SNFs you send patients to',
      'Unlimited users',
      'Shareable report links for patient families',
      'Custom branding on shared reports',
      'Embeddable quality widget',
    ],
    cta: 'Contact Us',
    ctaLink: 'mailto:contact@oversightreports.com?subject=The Oversight Report Institutional Plan',
    ctaType: 'secondary',
    disabled: false,
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly'); // annual or monthly
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
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

      gsap.fromTo('.pricing-reassurance',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.25, ease: 'power3.out' }
      );

      // Billing toggle
      gsap.fromTo('.billing-toggle',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.3, ease: 'power3.out' }
      );

      // Pricing cards
      gsap.fromTo('.pricing-card',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, delay: 0.4, ease: 'power3.out', clearProps: 'opacity,transform' }
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
    if (tier.disabled) return;
    if (tier.ctaLink === '/') {
      navigate('/');
    } else if (tier.ctaLink) {
      window.location.href = tier.ctaLink;
    }
  };

  const calculateSavings = (tier) => {
    if (!tier.price.annual) return null;
    const monthlyTotal = tier.price.monthly * 12;
    const savings = monthlyTotal - tier.price.annual;
    const savingsPercent = Math.round((savings / monthlyTotal) * 100);
    return { savings, savingsPercent };
  };

  return (
    <div className="pricing-page" ref={heroRef}>
      {/* Hero Section */}
      <section className="pricing-hero">
        <div className="container-narrow">
          <h1>Safety Data for Every Need</h1>
          <p className="pricing-subtitle">
            From families researching a single facility to institutions managing entire networks.
            Choose the plan that fits your mission.
          </p>

          <div className="pricing-reassurance">
            <span className="pricing-reassurance-icon">✓</span>
            <p>
              <strong>Families:</strong> Everything you need to research a nursing home is free. Always.
              <br />
              <span className="pricing-reassurance-sub">
                Paid plans are for attorneys, journalists, hospitals, and other professionals who need advanced analytics and bulk data tools.
              </span>
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="billing-toggle">
            <button
              className={`billing-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              className={`billing-toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`}
              onClick={() => setBillingCycle('annual')}
            >
              Annual
              <span className="billing-toggle-save">Save up to 31%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Grid */}
      <section className="pricing-grid-section">
        <div className="container-wide">
          <div className="pricing-grid" ref={gridRef}>
            {tiers.map((tier) => {
              const savings = calculateSavings(tier);
              const displayPrice =
                billingCycle === 'annual' && tier.price.annual !== null
                  ? tier.price.annual
                  : tier.price.monthly;
              const isAnnual = billingCycle === 'annual' && tier.price.annual !== null;

              return (
                <div
                  key={tier.name}
                  className={`pricing-card ${tier.badge ? 'pricing-card-featured' : ''}`}
                >
                  {tier.badge && <div className="pricing-badge">{tier.badge}</div>}

                  <div className="pricing-card-header">
                    <h3 className="pricing-tier-name">{tier.name}</h3>
                    <p className="pricing-tier-description">{tier.description}</p>
                  </div>

                  <div className="pricing-price">
                    <div className="pricing-price-amount">
                      {tier.price.monthly === 0 ? (
                        <>
                          <span className="pricing-price-free">$0</span>
                          <span className="pricing-price-period">/forever</span>
                        </>
                      ) : (
                        <>
                          <span className="pricing-price-currency">$</span>
                          <span className="pricing-price-value">{displayPrice}</span>
                          <span className="pricing-price-period">
                            {isAnnual ? '/year' : tier.name === 'Institutional' ? '/mo' : '/mo'}
                          </span>
                        </>
                      )}
                    </div>
                    {isAnnual && savings && tier.price.monthly > 0 && (
                      <div className="pricing-price-savings">
                        Save ${savings.savings}/year ({savings.savingsPercent}%)
                      </div>
                    )}
                  </div>

                  <button
                    className={`btn ${
                      tier.ctaType === 'primary' ? 'btn-primary' : 'btn-secondary'
                    } pricing-cta ${tier.disabled ? 'pricing-cta-disabled' : ''}`}
                    onClick={() => handleCtaClick(tier)}
                    disabled={tier.disabled}
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
