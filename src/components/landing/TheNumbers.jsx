import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { value: 14713, label: 'Facilities Tracked', prefix: '', suffix: '' },
  { value: 50, label: 'States Covered', prefix: '', suffix: '' },
  { value: 492, label: 'In Fines Exposed', prefix: '$', suffix: 'M' },
  { value: 98, label: 'Data Accuracy', prefix: '', suffix: '%' },
];

export default function TheNumbers() {
  const sectionRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          if (hasAnimated.current) return;
          hasAnimated.current = true;

          const valueEls = sectionRef.current.querySelectorAll('.number-value');
          valueEls.forEach((el, index) => {
            const stat = stats[index];
            const counter = { value: 0 };
            gsap.to(counter, {
              value: stat.value,
              duration: 2,
              delay: index * 0.15,
              ease: 'expo.out',
              onUpdate: () => {
                el.textContent =
                  stat.prefix +
                  Math.round(counter.value).toLocaleString() +
                  stat.suffix;
              },
            });
          });

          gsap.from('.number-item', {
            opacity: 0,
            y: 30,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power3.out',
          });
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="landing-section section-dark" ref={sectionRef}>
      <div className="container">
        <div className="section-header">
          <h2>The Numbers</h2>
          <p>The scope of what we monitor</p>
        </div>
        <div className="numbers-grid">
          {stats.map((stat, i) => (
            <div className="number-item" key={i}>
              <div className="number-value">0</div>
              <div className="number-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
