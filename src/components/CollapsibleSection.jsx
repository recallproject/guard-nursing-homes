import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';

export default function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!bodyRef.current) return;

    if (open) {
      const scrollHeight = bodyRef.current.scrollHeight;
      gsap.to(bodyRef.current, {
        height: scrollHeight,
        duration: 0.4,
        ease: 'power2.out'
      });
    } else {
      gsap.to(bodyRef.current, {
        height: 0,
        duration: 0.4,
        ease: 'power2.in'
      });
    }
  }, [open]);

  const toggle = () => {
    setOpen(!open);
  };

  return (
    <div className="collapsible-section">
      <button className="collapsible-header" onClick={toggle}>
        <span>{title}</span>
        <span className="collapsible-icon">{open ? '−' : '+'}</span>
      </button>
      <div className="collapsible-body" ref={bodyRef}>
        <div className="collapsible-inner">
          {children}
        </div>
      </div>
    </div>
  );
}
