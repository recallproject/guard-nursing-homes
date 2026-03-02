import { useState } from 'react';
import '../../styles/what-does-this-mean.css';

/**
 * WhatDoesThisMean — expandable accordion for plain-English data explanations
 * 
 * Props:
 *  - question: string (accordion header)
 *  - children: React node (expanded content)
 *  - defaultOpen: boolean
 */
export default function WhatDoesThisMean({ question, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`wdtm-section ${open ? 'wdtm-open' : ''}`}>
      <button className="wdtm-header" onClick={() => setOpen(p => !p)}>
        <span className="wdtm-header-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B6CB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>{question}</span>
        </span>
        <svg className="wdtm-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && <div className="wdtm-body">{children}</div>}
    </div>
  );
}

/**
 * KeyPoint — bullet item inside WhatDoesThisMean
 */
export function KeyPoint({ children, color = '#2B6CB0' }) {
  return (
    <div className="wdtm-keypoint">
      <span className="wdtm-bullet" style={{ color }}>•</span>
      <span>{children}</span>
    </div>
  );
}
