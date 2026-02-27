import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Footer from '../components/landing/Footer';
import { useNavigate } from 'react-router-dom';
import { checkout } from '../utils/stripe';
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
      'Search all 14,713 Medicare nursing homes',
      'Full report cards with safety scores and accountability flags',
      'Staffing breakdown (RN/LPN/CNA hours per resident)',
      'Inspection history with plain-English context',
      'Compare up to 3 facilities side by side',
      'Interactive state map and rankings',
      'Chain safety rankings (basic view)',
      'PE/REIT ownership flags',
      '1 PDF report per day',
    ],
    cta: 'Start Searching',
    ctaLink: '/',
    ctaType: 'primary',
    disabled: false,
  },
  {
    name: 'Pro',
    price: { monthly: 14, annual: 120 },
    description: 'For families+ / Journalists',
    badge: 'MOST POPULAR',
    inherits: 'Everything in Free, plus:',
    features: [
      'Staffing trend analysis — is this facility getting better or worse? (quarterly charts)',
      'Watchlist with email alerts on new violations',
      'Unlimited PDF downloads',
      'Nearby alternatives within custom radius',
      'Chain performance deep-dive (portfolio maps, facility-level breakdown)',
      'Priority support',
    ],
    journalistNote: 'Journalists: Contact us for complimentary 90-day Pro access.',
    cta: 'Join Waitlist',
    stripeKey: { monthly: 'pro_monthly', annual: 'pro_annual' },
    ctaType: 'primary',
    disabled: false,
  },
  {
    name: 'Professional',
    price: { monthly: 59, annual: 499 },
    description: 'For attorneys / Consultants',
    badge: null,
    inherits: 'Everything in Pro, plus:',
    features: [
      'Evidence packages — 10-section litigation-ready PDFs with regulatory citations',
      'Cost report financial data — related-party transactions, revenue mix, balance sheets',
      'Ownership network explorer — trace owners across facilities and states',
      'Staffing discrepancy analysis — self-reported vs. payroll-verified staffing',
      'Bulk CSV exports (state-level, chain-level)',
      '5 user seats',
    ],
    singlePurchase: 'Single evidence PDF purchase: coming soon — join the waitlist',
    cta: 'Join Waitlist',
    stripeKey: { monthly: 'professional_monthly', annual: 'professional_annual' },
    ctaType: 'secondary',
    disabled: false,
  },
  {
    name: 'Institutional',
    price: { monthly: 299, annual: 'custom' },
    description: 'For AG offices / Hospitals / Chains',
    badge: null,
    inherits: 'Everything in Professional, plus:',
    features: [
      'Referral Scorecard — rank the SNFs you send patients to',
      'Unlimited user seats',
      'Custom branding on shared reports',
      'API access (coming soon)',
      'Quarterly briefing reports',
      'Dedicated support',
    ],
    siteNote: 'State AG site license: $2,499/yr',
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
    if (tier.disabled) return;
    if (tier.ctaLink === '/') {
      navigate('/');
    } else if (tier.stripeKey) {
      checkout(tier.stripeKey);
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
              <span className="billing-toggle-save">Save up to 29%</span>
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

              const cardClass = tier.badge
                ? 'pricing-card-featured'
                : tier.name === 'Professional'
                  ? 'pricing-card-professional'
                  : tier.name === 'Institutional'
                    ? 'pricing-card-institutional'
                    : '';

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
                      {tier.price.monthly === 0 ? (
                        <>
                          <span className="pricing-price-free">$0</span>
                          <span className="pricing-price-period">/forever</span>
                        </>
                      ) : tier.price.annual === 'custom' ? (
                        <>
                          <span className="pricing-price-currency">$</span>
                          <span className="pricing-price-value">{tier.price.monthly}</span>
                          <span className="pricing-price-period">/mo</span>
                        </>
                      ) : (
                        <>
                          <span className="pricing-price-currency">$</span>
                          <span className="pricing-price-value">{displayPrice}</span>
                          <span className="pricing-price-period">
                            {isAnnual ? '/year' : '/mo'}
                          </span>
                        </>
                      )}
                    </div>
                    {tier.price.annual === 'custom' && billingCycle === 'annual' && (
                      <div className="pricing-price-custom">
                        Custom annual pricing available
                      </div>
                    )}
                    {isAnnual && savings && tier.price.monthly > 0 && tier.price.annual !== 'custom' && (
                      <div className="pricing-price-savings">
                        Save ${savings.savings}/year ({savings.savingsPercent}%)
                      </div>
                    )}
                  </div>

                  <button
                    className={`btn ${
                      tier.ctaType === 'primary' ? 'btn-primary' : 'btn-secondary'
                    } pricing-cta ${tier.disabled ? 'pricing-cta-disabled' : ''}`}
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
                    {tier.journalistNote && (
                      <li className="pricing-feature pricing-feature-note">
                        <span className="pricing-feature-text">{tier.journalistNote}</span>
                      </li>
                    )}
                    {tier.singlePurchase && (
                      <li className="pricing-feature pricing-feature-note">
                        <span className="pricing-feature-text">{tier.singlePurchase}</span>
                      </li>
                    )}
                    {tier.siteNote && (
                      <li className="pricing-feature pricing-feature-note">
                        <span className="pricing-feature-text">{tier.siteNote}</span>
                      </li>
                    )}
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
