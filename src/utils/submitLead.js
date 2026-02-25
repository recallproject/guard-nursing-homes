/**
 * Lead submission utility
 * Saves to localStorage as backup + sends to webhook if configured
 */

const WEBHOOK_URL = import.meta.env.VITE_LEAD_WEBHOOK_URL || null;

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
        headers: { 'Content-Type': 'application/json' },
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
