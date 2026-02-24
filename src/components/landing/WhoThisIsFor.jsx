import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeartIcon, ScalesIcon, PenIcon, BuildingIcon } from './Icons';

gsap.registerPlugin(ScrollTrigger);

const audiences = [
  {
    icon: HeartIcon,
    title: 'Families',
    description: 'Choosing a nursing home for a parent or loved one? See which facilities have the best track records.',
  },
  {
    icon: ScalesIcon,
    title: 'Advocates',
    description: 'Elder care attorneys and patient advocates who need data to build cases or evaluate facilities.',
  },
  {
    icon: PenIcon,
    title: 'Journalists',
    description: 'Reporters investigating care quality, systemic failures, or corporate ownership patterns.',
  },
  {
    icon: BuildingIcon,
    title: 'Policymakers',
    description: 'State legislators and regulators who need a clear picture of nursing home quality statewide.',
  },
];

export default function WhoThisIsFor() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.audience-card', {
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
          <h2>Who This Is For</h2>
          <p>Anyone who believes families deserve better information</p>
        </div>
        <div className="audience-grid">
          {audiences.map((item, i) => {
            const Icon = item.icon;
            return (
              <div className="audience-card" key={i}>
                <div className="audience-card-icon">
                  <Icon size={24} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
