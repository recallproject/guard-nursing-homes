import { useState } from 'react';

// REPLACE THIS with your actual Google Form URL
const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdemsYSy34izMr2ik-XRsK7-zXOvoOveCjjbVvjEQWrWOYCTg/viewform';

export default function FeedbackButton() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="feedback-fab-wrapper" style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '4px' }}>
      <a
        href={FEEDBACK_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="feedback-fab"
        title="Share feedback"
        onClick={() => { window.plausible && window.plausible('Feedback-Form-Click'); }}
      >
        <span className="feedback-fab-icon">?</span>
        <span className="feedback-fab-text">Feedback</span>
      </a>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', lineHeight: 1 }}
        title="Dismiss"
        aria-label="Dismiss feedback button"
      >
        ✕
      </button>
    </div>
  );
}
