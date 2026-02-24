import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DatabaseIcon, ShieldIcon, CheckCircleIcon } from './Icons';

gsap.registerPlugin(ScrollTrigger);

const trustItems = [
  { icon: DatabaseIcon, label: 'CMS Verified Data' },
  { icon: ShieldIcon, label: 'Updated Monthly' },
  { icon: CheckCircleIcon, label: 'No Industry Funding' },
];

export default function OurData() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.trust-item', {
        opacity: 0,
        y: 20,
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
    <section className="landing-section section-light" ref={sectionRef} style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="trust-bar">
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div className="trust-item" key={i}>
                <div className="trust-item-icon">
                  <Icon size={20} />
                </div>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
