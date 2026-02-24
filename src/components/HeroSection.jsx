import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import '../styles/hero.css';

export default function HeroSection({ national, onExploreClick, onSearch }) {
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const statsRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    if (!heroRef.current || !national) return;

    const ctx = gsap.context(() => {
      // Title letter animation
      const titleText = titleRef.current;
      if (titleText) {
        const words = titleText.querySelectorAll('.hero-title-word');
        words.forEach((word, wordIndex) => {
          const letters = word.querySelectorAll('.hero-title-letter');
          gsap.fromTo(
            letters,
            { opacity: 0, y: 50 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              stagger: 0.03,
              delay: wordIndex * 0.15,
              ease: 'power3.out',
            }
          );
        });
      }

      // Stats count-up animation
      const statElements = statsRef.current?.querySelectorAll('.hero-stat-value');
      if (statElements && national) {
        statElements.forEach((el, index) => {
          const targetValue = el.dataset.value;
          const isPercentage = targetValue.includes('%');
          const isMoney = targetValue.includes('$');
          const numValue = parseFloat(targetValue.replace(/[^0-9.]/g, ''));

          const counter = { value: 0 };
          gsap.to(counter, {
            value: numValue,
            duration: 2,
            delay: 1 + index * 0.2,
            ease: 'expo.out',
            onUpdate: () => {
              if (isMoney) {
                el.textContent = '$' + Math.round(counter.value).toLocaleString() + 'M';
              } else if (isPercentage) {
                el.textContent = counter.value.toFixed(1) + '%';
              } else {
                el.textContent = Math.round(counter.value).toLocaleString();
              }
            },
          });
        });
      }

      // Expansion line fade in
      gsap.fromTo(
        '.hero-expansion',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.8, delay: 1.0, ease: 'power3.out' }
      );

      // CTA button entrance
      gsap.fromTo(
        ctaRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, delay: 1.8, ease: 'power3.out' }
      );
    }, heroRef);

    return () => ctx.revert();
  }, [national]);

  // Format currency in millions
  const formatMillions = (value) => {
    return Math.round(value / 1000000);
  };

  // Calculate high risk percentage
  const highRiskPercent = national
    ? ((national.high_risk / national.total_facilities) * 100).toFixed(1)
    : 0;

  const renderTitle = (text) => {
    return text.split(' ').map((word, wordIndex) => (
      <span key={wordIndex} className="hero-title-word">
        {word.split('').map((letter, letterIndex) => (
          <span key={letterIndex} className="hero-title-letter">
            {letter}
          </span>
        ))}
        {wordIndex < text.split(' ').length - 1 && <span className="hero-title-letter"> </span>}
      </span>
    ));
  };

  return (
    <section className="hero-section" ref={heroRef}>
      <div className="hero-background">
        <div className="hero-gradient"></div>
        <div className="hero-particles">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="hero-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${15 + Math.random() * 10}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="hero-content">
        <div className="hero-title" ref={titleRef}>
          <div className="hero-title-line">{renderTitle('GUARD')}</div>
          <div className="hero-expansion">Guidance, Understanding &amp; Advocacy through Risk Disclosure</div>
        </div>

        <p className="hero-subtitle">Every family deserves the truth.</p>

        <div className="hero-stats-header">The scope of what we monitor</div>
        <div className="hero-stats" ref={statsRef}>
          <div className="hero-stat">
            <div
              className="hero-stat-value"
              data-value={national ? national.total_facilities : 14713}
            >
              0
            </div>
            <div className="hero-stat-label">Facilities Tracked</div>
          </div>
          <div className="hero-stat">
            <div
              className="hero-stat-value"
              data-value="50"
            >
              0
            </div>
            <div className="hero-stat-label">States Covered</div>
          </div>
          <div className="hero-stat">
            <div
              className="hero-stat-value"
              data-value={`$${national ? formatMillions(national.total_fines) : 492}M`}
            >
              $0M
            </div>
            <div className="hero-stat-label">In Fines Exposed</div>
          </div>
          <div className="hero-stat">
            <div
              className="hero-stat-value"
              data-value="98%"
            >
              0%
            </div>
            <div className="hero-stat-label">Data Accuracy</div>
          </div>
        </div>

        <div className="hero-cta" ref={ctaRef}>
          <button className="btn btn-primary btn-large" onClick={onExploreClick}>
            EXPLORE YOUR STATE
            <span className="hero-cta-arrow">▶</span>
          </button>

          <div className="hero-search-wrapper">
            <span className="hero-search-label">or search by name:</span>
            <input
              type="text"
              className="input input-large hero-search-input"
              placeholder="Enter facility name or city..."
              onFocus={(e) => {
                e.target.blur();
                if (onSearch) onSearch();
              }}
            />
          </div>
        </div>

        <div className="hero-scroll-indicator">
          <div className="hero-scroll-chevron"></div>
        </div>
      </div>
    </section>
  );
}
