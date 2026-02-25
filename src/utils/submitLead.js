/**
 * Lead submission utility
 * Saves to localStorage as backup + sends to webhook if configured
 */

const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbweRXptvIFijDS9U_QjPc52SF1mybqPVRGdX0h2Zk9ql6GGxTgJv9e0YAMbkLiZlahGMQ/exec';

export async function submitLead(data) {
  // Always save to localStorage as backup
  const existing = JSON.parse(localStorage.getItem('ag_toolkit_submissions') || '[]');
  existing.push({ ...data, submittedAt: new Date().toISOString() });
  localStorage.setItem('ag_toolkit_submissions', JSON.stringify(existing));

  // If webhook is configured, also send to backend
  if (WEBHOOK_URL) {
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          ...data,
          submittedAt: new Date().toISOString(),
          source: 'ag_toolkit',
          page: window.location.pathname,
        }),
      });
    } catch (err) {
      console.warn('Lead webhook failed (data saved locally):', err.message);
      // Don't block the user — localStorage backup is sufficient
    }
  }
}
