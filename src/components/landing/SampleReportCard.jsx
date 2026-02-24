import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { StarIcon } from './Icons';

gsap.registerPlugin(ScrollTrigger);

export default function SampleReportCard({ onSearch }) {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.report-card-mock', {
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          once: true,
        },
      });
      gsap.from('.report-cta', {
        opacity: 0,
        y: 20,
        duration: 0.6,
        delay: 0.3,
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
    <section className="landing-section section-light" ref={sectionRef}>
      <div className="container">
        <div className="section-header">
          <h2>What a Report Looks Like</h2>
          <p>Every facility gets a detailed risk profile</p>
        </div>
        <div className="report-preview">
          <div className="report-card-mock">
            <div className="report-card-header">
              <h3>Sunrise Senior Care Center</h3>
              <span className="risk-badge high">
                <span className="score">87.4</span> HIGH RISK
              </span>
            </div>
            <div className="report-card-body">
              <div className="report-row">
                <span className="report-row-label">Overall Rating</span>
                <span className="report-stars">
                  <StarIcon size={16} />
                  <StarIcon size={16} />
                </span>
              </div>
              <div className="report-row">
                <span className="report-row-label">Total Fines (3yr)</span>
                <span className="report-row-value risk-high">$284,500</span>
              </div>
              <div className="report-row">
                <span className="report-row-label">Health Inspection Score</span>
                <span className="report-row-value risk-moderate">142 pts</span>
              </div>
              <div className="report-row">
                <span className="report-row-label">Staffing Rating</span>
                <span className="report-row-value risk-high">Below Average</span>
              </div>
              <div className="report-row">
                <span className="report-row-label">Complaint Investigations</span>
                <span className="report-row-value risk-moderate">12</span>
              </div>
              <div className="report-row">
                <span className="report-row-label">Beds</span>
                <span className="report-row-value">120</span>
              </div>
            </div>
          </div>
          <div className="report-cta">
            <p>Search for any facility to see its full report</p>
            <button className="btn btn-primary btn-large" onClick={onSearch}>
              Search Facilities
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
