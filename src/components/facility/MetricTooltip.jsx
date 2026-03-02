import { useState, useRef, useEffect } from 'react';
import '../../styles/metric-tooltip.css';

/**
 * MetricTooltip — (?) hover tooltip for facility data points
 * 
 * Props:
 *  - title: string (bold tooltip heading)
 *  - children: React node (tooltip body text)
 *  - benchmark: string (optional benchmark line)
 */
export default function MetricTooltip({ title, children, benchmark }) {
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(true);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // If too close to top, flip tooltip below
      setAbove(rect.top > 220);
    }
  }, [open]);

  return (
    <span
      className="mt-trigger"
      ref={triggerRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(prev => !prev)}
      aria-label="More information"
    >
      ?
      {open && (
        <span className={`mt-tooltip ${above ? 'mt-above' : 'mt-below'}`}>
          <span className="mt-title">{title}</span>
          <span className="mt-body">{children}</span>
          {benchmark && <span className="mt-benchmark">{benchmark}</span>}
        </span>
      )}
    </span>
  );
}
