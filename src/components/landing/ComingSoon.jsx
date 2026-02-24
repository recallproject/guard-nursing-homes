import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useNavigate } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

const teasers = [
  {
    icon: '\uD83D\uDD14',
    title: 'Watchlist & Alerts',
    description: 'Save facilities to your watchlist and get notified when new violations are reported or fines are issued.',
  },
  {
    icon: '\uD83D\uDCC8',
    title: 'Trend Analysis',
    description: "See how a facility's safety record has changed over time. Track whether things are improving or declining.",
  },
  {
    icon: '\uD83D\uDD17',
    title: 'Ownership Network Explorer',
    description: 'See which companies own multiple facilities and how their portfolio performs across states.',
  },
];

export default function ComingSoon() {
  const sectionRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.coming-soon-card', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 85%',
          once: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="landing-section section-dark" ref={sectionRef}>
      <div className="container">
        <div className="section-header">
          <h2>Coming Soon</h2>
          <p>New tools to help you make better decisions</p>
        </div>
        <div className="coming-soon-grid">
          {teasers.map((teaser) => (
            <div className="coming-soon-card" key={teaser.title}>
              <div className="coming-soon-badge">Coming Soon</div>
              <div className="coming-soon-icon">{teaser.icon}</div>
              <h3>{teaser.title}</h3>
              <p>{teaser.description}</p>
              <div className="coming-soon-cta">
                <input
                  type="email"
                  className="coming-soon-email"
                  placeholder="your@email.com"
                  onClick={(e) => e.stopPropagation()}
                />
                <button className="coming-soon-notify-btn">Notify Me</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            These features are part of GUARD Pro and Professional plans.
          </p>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/pricing')}
          >
            View Pricing Plans →
          </button>
        </div>
      </div>
    </section>
  );
}
