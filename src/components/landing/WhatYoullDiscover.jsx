import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShieldIcon, TrendingUpIcon, AlertTriangleIcon, UsersIcon } from './Icons';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: ShieldIcon,
    title: 'Risk Scores',
    description: 'Every facility scored on a composite scale combining inspection failures, complaint severity, and fine history.',
  },
  {
    icon: TrendingUpIcon,
    title: 'Fine & Penalty Tracking',
    description: 'See total fines assessed, penalty trends over time, and how each facility compares to state and national averages.',
  },
  {
    icon: AlertTriangleIcon,
    title: 'Inspection Deficiencies',
    description: 'Drill into specific inspection findings — from minor paperwork issues to serious danger findings.',
  },
  {
    icon: UsersIcon,
    title: 'Staffing Analysis',
    description: 'Nurse-to-resident ratios, staff turnover indicators, and how staffing levels correlate with care quality.',
  },
];

export default function WhatYoullDiscover() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.feature-card', {
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
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="landing-section section-dark" ref={sectionRef}>
      <div className="container">
        <div className="section-header">
          <h2>What You'll Discover</h2>
          <p>Actionable data that was previously buried in government databases</p>
        </div>
        <div className="features-grid">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div className="feature-card" key={i}>
                <div className="feature-card-icon">
                  <Icon size={24} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
