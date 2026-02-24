import { useEffect, useRef, useState } from 'react';

export default function NationalStats({ national }) {
  const [animatedValues, setAnimatedValues] = useState({
    total_facilities: 0,
    states_covered: 0,
    high_risk: 0,
    total_fines: 0
  });

  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!national || hasAnimated.current) return;

    hasAnimated.current = true;

    // Animate each value
    const duration = 1500; // ms
    const frameRate = 60;
    const totalFrames = (duration / 1000) * frameRate;

    const targets = {
      total_facilities: national.total_facilities || 0,
      states_covered: 51, // 50 states + DC
      high_risk: national.high_risk || 0,
      total_fines: national.total_fines || 0
    };

    let frame = 0;

    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const easeProgress = easeOutCubic(progress);

      setAnimatedValues({
        total_facilities: Math.floor(targets.total_facilities * easeProgress),
        states_covered: Math.floor(targets.states_covered * easeProgress),
        high_risk: Math.floor(targets.high_risk * easeProgress),
        total_fines: Math.floor(targets.total_fines * easeProgress)
      });

      if (frame >= totalFrames) {
        clearInterval(interval);
        setAnimatedValues(targets);
      }
    }, 1000 / frameRate);

    return () => clearInterval(interval);
  }, [national]);

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function formatCurrency(value) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(0)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  }

  function formatNumber(value) {
    return value.toLocaleString('en-US');
  }

  if (!national) return null;

  return (
    <div className="national-stats">
      <div className="national-stat">
        <div className="national-stat-value">
          {formatNumber(animatedValues.total_facilities)}
        </div>
        <div className="national-stat-label">Total Facilities</div>
      </div>

      <div className="national-stat">
        <div className="national-stat-value">
          {animatedValues.states_covered}
        </div>
        <div className="national-stat-label">States Covered</div>
      </div>

      <div className="national-stat">
        <div className="national-stat-value highlight">
          {formatNumber(animatedValues.high_risk)}
        </div>
        <div className="national-stat-label">High Risk</div>
      </div>

      <div className="national-stat">
        <div className="national-stat-value">
          {formatCurrency(animatedValues.total_fines)}
        </div>
        <div className="national-stat-label">Total Fines</div>
      </div>
    </div>
  );
}
