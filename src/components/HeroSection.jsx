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

      // Tagline fade in
      gsap.fromTo(
        '.hero-tagline',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.7, delay: 0.6, ease: 'power3.out' }
      );

      // Stats count-up animation
      const statElements = statsRef.current?.querySelectorAll('.hero-stat-value');
      if (statElements) {
        statElements.forEach((el, index) => {
          const format = el.dataset.format;

          gsap.fromTo(
            el.closest('.hero-stat'),
            { opacity: 0, y: 25 },
            { opacity: 1, y: 0, duration: 0.6, delay: 0.9 + index * 0.15, ease: 'power3.out' }
          );

          if (format === 'ratio') {
            // "1 in 3" — just fade in, no counter
            el.textContent = el.dataset.display;
          } else if (format === 'currency') {
            const numValue = parseFloat(el.dataset.value);
            const counter = { value: 0 };
            gsap.to(counter, {
              value: numValue,
              duration: 2.2,
              delay: 1.0 + index * 0.15,
              ease: 'expo.out',
              onUpdate: () => {
                el.textContent = '$' + Math.round(counter.value).toLocaleString() + 'M';
              },
            });
          } else {
            const numValue = parseFloat(el.dataset.value);
            const counter = { value: 0 };
            gsap.to(counter, {
              value: numValue,
              duration: 2.2,
              delay: 1.0 + index * 0.15,
              ease: 'expo.out',
              onUpdate: () => {
                el.textContent = Math.round(counter.value).toLocaleString();
              },
            });
          }
        });
      }

      // Data freshness line
      gsap.fromTo(
        '.hero-data-date',
        { opacity: 0 },
        { opacity: 1, duration: 0.5, delay: 1.5, ease: 'power2.out' }
      );

      // Methodology link
      gsap.fromTo(
        '.hero-methodology',
        { opacity: 0 },
        { opacity: 1, duration: 0.5, delay: 1.6, ease: 'power2.out' }
      );

      // Trust line
      gsap.fromTo(
        '.hero-trust',
        { opacity: 0 },
        { opacity: 1, duration: 0.6, delay: 1.8, ease: 'power2.out' }
      );

      // CTA buttons
      gsap.fromTo(
        ctaRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, delay: 2.0, ease: 'power3.out' }
      );
    }, heroRef);

    return () => ctx.revert();
  }, [national]);

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
          <div className="hero-title-line hero-title-line--the">{renderTitle('THE')}</div>
          <div className="hero-title-line">{renderTitle('OVERSIGHT')}</div>
          <div className="hero-title-line">{renderTitle('REPORT')}</div>
        </div>

        <p className="hero-tagline">Nursing home safety data, independently reviewed.</p>

        <div className="hero-stats" ref={statsRef}>
          <div className="hero-stat">
            <div
              className="hero-stat-value"
              data-value={national ? national.total_facilities : 14713}
            >
              0
            </div>
            <div className="hero-stat-label">Every Medicare nursing home in America</div>
          </div>
          <div className="hero-stat hero-stat--danger">
            <div
              className="hero-stat-value"
              data-format="ratio"
              data-display="1 in 3"
            >
              &nbsp;
            </div>
            <div className="hero-stat-label">Reported days with zero RN payroll hours</div>
          </div>
          <div className="hero-stat">
            <div
              className="hero-stat-value"
              data-value="492"
              data-format="currency"
            >
              $0M
            </div>
            <div className="hero-stat-label">In federal fines for violations</div>
          </div>
        </div>

        <p className="hero-data-date">Based on CMS data through Q3 2025</p>

        <a href="/methodology" className="hero-methodology">How we calculate these numbers &rarr;</a>

        <p className="hero-trust">100% public data. No industry funding.</p>

        <div className="hero-cta" ref={ctaRef}>
          <button className="btn btn-primary btn-large" onClick={() => { if (onSearch) onSearch(); }}>
            Search a Facility
          </button>
          <button className="btn btn-secondary btn-large" onClick={onExploreClick}>
            View Your State
          </button>
        </div>
      </div>
    </section>
  );
}
