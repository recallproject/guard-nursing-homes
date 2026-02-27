import { useState } from 'react';

// REPLACE THIS with your actual Google Form URL
const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdemsYSy34izMr2ik-XRsK7-zXOvoOveCjjbVvjEQWrWOYCTg/viewform';

export default function FeedbackButton() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <a
      href={FEEDBACK_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="feedback-fab"
      title="Share feedback"
      onClick={() => { window.plausible && window.plausible('Feedback-Form-Click'); }}
    >
      <span className="feedback-fab-icon">💬</span>
      <span className="feedback-fab-text">Feedback</span>
    </a>
  );
}
