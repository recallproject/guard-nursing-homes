import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapPinIcon, SearchIcon, ClipboardIcon } from './Icons';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: 1,
    icon: MapPinIcon,
    title: 'Pick Your State',
    description: 'Select any state on the interactive map or search by facility name to get started.',
  },
  {
    number: 2,
    icon: SearchIcon,
    title: 'Review the Data',
    description: 'See inspection results, fines, staffing levels, and risk scores for every nursing home.',
  },
  {
    number: 3,
    icon: ClipboardIcon,
    title: 'Make Informed Choices',
    description: 'Compare facilities side-by-side and identify the safest options for your loved ones.',
  },
];

export default function HowItWorks() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.how-step', {
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
          <h2>How It Works</h2>
          <p>Three simple steps to find the right facility</p>
        </div>
        <div className="how-it-works-grid">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div className="how-step" key={step.number}>
                <div className="how-step-number">{step.number}</div>
                <div className="how-step-icon">
                  <Icon size={32} />
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                {step.number < 3 && <div className="how-step-connector" />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
