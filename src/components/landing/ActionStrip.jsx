import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ClipboardIcon, ScalesIcon, BarChartIcon, DownloadIcon } from './Icons';

gsap.registerPlugin(ScrollTrigger);

const actions = [
  {
    icon: ClipboardIcon,
    label: 'Get a Report Card',
    description: "Look up any facility's safety record",
    actionKey: 'search',
  },
  {
    icon: ScalesIcon,
    label: 'Compare Facilities',
    description: 'Side-by-side comparison of 2-3 places',
    actionKey: 'compare',
  },
  {
    icon: BarChartIcon,
    label: 'Explore Your State',
    description: 'Rankings and violations in your state',
    actionKey: 'explore',
  },
  {
    icon: DownloadIcon,
    label: 'Download Report',
    description: 'Get a PDF for your records',
    actionKey: 'download',
    live: true,
  },
];

export default function ActionStrip({ onSearch, onCompare, onExplore }) {
  const sectionRef = useRef(null);

  useEffect(() => {
    const cards = sectionRef.current?.querySelectorAll('.action-card');
    if (!cards?.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(cards,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 90%',
            once: true,
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const handleClick = (actionKey) => {
    switch (actionKey) {
      case 'search':
        if (onSearch) onSearch();
        break;
      case 'compare':
        if (onCompare) onCompare();
        break;
      case 'explore':
        if (onExplore) onExplore();
        break;
      case 'download':
        if (onSearch) onSearch();
        break;
    }
  };

  return (
    <section className="action-strip-section" ref={sectionRef}>
      <div className="action-strip">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <div
              key={action.actionKey}
              className="action-card"
              onClick={() => handleClick(action.actionKey)}
            >
              <div className="action-card-icon">
                <Icon size={32} />
              </div>
              <h3 className="action-card-label">{action.label}</h3>
              <p className="action-card-desc">{action.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
