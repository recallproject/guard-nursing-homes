import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, BarChartIcon, UsersIcon, DownloadIcon, StarIcon, TrendingUpIcon, BuildingIcon, AlertTriangleIcon } from './Icons';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    Icon: SearchIcon,
    title: 'State Screening Reports',
    description: 'Filter and export facility data by state for oversight, compliance, or investigation.',
    live: true,
    to: '/screening',
  },
  {
    Icon: BarChartIcon,
    title: 'Staffing Discrepancy Index',
    description: 'Find facilities reporting more staff than payroll records show. Ranked by gap percentage.',
    live: true,
    to: '/discrepancies',
  },
  {
    Icon: UsersIcon,
    title: 'Ownership Network Explorer',
    description: 'See which companies own multiple facilities and how their portfolios perform across states.',
    live: true,
    to: '/ownership',
  },
  {
    Icon: DownloadIcon,
    title: 'Download Reports',
    description: 'Download a detailed PDF safety report for any facility — clinical context, percentile rankings, and a visit checklist.',
    live: true,
    action: 'search',
  },
  {
    Icon: StarIcon,
    title: 'Favorites & Compare',
    description: 'Save facilities, compare them side-by-side, and export a spreadsheet of your picks.',
    live: true,
    to: '/watchlist',
  },
  {
    Icon: TrendingUpIcon,
    title: 'Historical Trends',
    description: 'Track how facility safety records change over time with national snapshot data.',
    live: true,
    to: '/trends',
  },
  {
    Icon: BuildingIcon,
    title: 'Chain Rankings',
    description: 'Compare the largest nursing home chains by fines, staffing, deficiencies, and abuse citations.',
    live: true,
    to: '/chains',
  },
  {
    Icon: AlertTriangleIcon,
    title: 'High-Risk Facilities',
    description: 'Facilities meeting all five high-risk criteria — ranked by composite risk score.',
    live: true,
    to: '/high-risk',
  },
];

export default function ComingSoon({ onSearch }) {
  const sectionRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.coming-soon-card',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
            once: true,
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="landing-section section-dark" ref={sectionRef}>
      <div className="container">
        <div className="section-header">
          <h2>Professional Tools</h2>
          <p>Built for families, attorneys, regulators, and discharge planners</p>
        </div>
        <div className="coming-soon-grid">
          {features.map((feature) => (
            <div
              className={`coming-soon-card ${feature.live ? 'coming-soon-card--live' : ''}`}
              key={feature.title}
              onClick={() => {
                if (feature.action === 'search' && onSearch) { onSearch(); }
                else if (feature.live && feature.to) { navigate(feature.to); }
              }}
              role={feature.live ? 'link' : undefined}
              style={{ cursor: feature.live ? 'pointer' : 'default' }}
            >
              {feature.coming && <div className="coming-soon-badge">Coming Soon</div>}
              {feature.live && <div className="coming-soon-badge coming-soon-badge--live">Live</div>}
              <div className="coming-soon-icon"><feature.Icon size={28} /></div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              {feature.live && (
                <span className="coming-soon-link">
                  {feature.action === 'search' ? 'Search a Facility →' : 'Explore →'}
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Everything families need is free. Professional tools are live — built for attorneys, journalists, hospitals, and regulators.
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
