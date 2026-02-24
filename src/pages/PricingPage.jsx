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
    name: 'FREE',
    price: { monthly: 0, annual: 0 },
    description: 'For families researching facilities',
    badge: null,
    features: [
      'Search all 14,713 facilities',
      'Full safety report cards',
      'Compare up to 3 facilities',
      'State rankings and data',
      'Interactive map',
      'Basic PDF report (1 per day)',
    ],
    cta: 'Get Started Free',
    ctaLink: '/',
    ctaType: 'primary',
  },
  {
    name: 'GUARD PRO',
    price: { monthly: 12, annual: 99 },
    description: 'For families managing ongoing care',
    badge: 'MOST POPULAR',
    features: [
      'Everything in Free',
      'Unlimited PDF downloads',
      'Watchlist — save facilities, get alerts on new violations',
      'Trend analysis — is this facility getting better or worse?',
      'Nearby alternatives finder',
      'Priority email support',
    ],
    cta: 'Go Pro',
    ctaLink: 'mailto:rob@datalinkllc.com?subject=GUARD Pro Subscription',
    ctaType: 'primary',
  },
  {
    name: 'Professional',
    price: { monthly: 49, annual: 399 },
    description: 'For attorneys and care coordinators',
    badge: 'BEST FOR TEAMS',
    features: [
      'Everything in Pro',
      'Evidence packages — litigation-ready PDF bundles',
      'Bulk facility exports (CSV/PDF)',
      'Ownership network data',
      'Multi-user access (up to 5 seats)',
      'Quarterly state report summaries',
      'Direct support line',
    ],
    cta: 'Contact Us',
    ctaLink: 'mailto:rob@datalinkllc.com?subject=GUARD Professional Plan',
    ctaType: 'secondary',
  },
  {
    name: 'Institutional',
    price: { monthly: 199, annual: null },
    description: 'For hospitals and health systems',
    badge: null,
    features: [
      'Everything in Professional',
      'Unlimited users',
      'Shareable report links for families',
      'Referral network scorecard',
      'Embeddable quality widget',
      'Dedicated onboarding',
      'Custom branding on shared reports',
    ],
    cta: 'Contact Us',
    ctaLink: 'mailto:rob@datalinkllc.com?subject=GUARD Institutional Plan',
    ctaType: 'secondary',
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('annual'); // annual or monthly
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero title animation
      gsap.from('.pricing-hero h1', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out',
      });

      gsap.from('.pricing-hero p', {
        opacity: 0,
        y: 20,
        duration: 0.6,
        delay: 0.2,
        ease: 'power3.out',
      });

      // Billing toggle
      gsap.from('.billing-toggle', {
        opacity: 0,
        y: 20,
        duration: 0.6,
        delay: 0.3,
        ease: 'power3.out',
      });

      // Pricing cards
      gsap.from('.pricing-card', {
        opacity: 0,
        y: 40,
        duration: 0.7,
        stagger: 0.1,
        delay: 0.4,
        ease: 'power3.out',
      });

      // Transparency section
      gsap.from('.pricing-transparency', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        scrollTrigger: {
          trigger: '.pricing-transparency',
          start: 'top 80%',
          once: true,
        },
        ease: 'power3.out',
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const handleCtaClick = (tier) => {
    if (tier.name === 'FREE') {
      navigate('/');
    } else {
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
                        <span className="pricing-price-free">FREE</span>
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
                    } pricing-cta`}
                    onClick={() => handleCtaClick(tier)}
                  >
                    {tier.cta}
                  </button>

                  <ul className="pricing-features">
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
          <h2>Why We Charge</h2>
          <div className="pricing-transparency-quote">
            <p>
              "Safety data should be free — and it is. Every family can search, compare, and download
              reports at no cost.
            </p>
            <p>
              Pro features fund the servers, data processing, and development that keep GUARD running
              and improving. We have no ads, no sponsors, and no conflicts of interest. Your
              subscription keeps it that way."
            </p>
          </div>
          <div className="pricing-author">
            <div className="pricing-author-name">Robert Benard, NP</div>
            <div className="pricing-author-title">GUARD Creator</div>
          </div>
        </div>
      </section>

      {/* Donation Section */}
      <section className="pricing-donation">
        <div className="container-narrow">
          <h3>Not Ready to Subscribe?</h3>
          <p>If GUARD helped you, consider supporting the project.</p>
          <a
            href="https://ko-fi.com/guarddata"
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
