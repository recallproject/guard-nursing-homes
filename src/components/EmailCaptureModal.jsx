import { useState } from 'react';
import { submitLead } from '../utils/submitLead';

/**
 * Email capture modal for AG Toolkit CSV exports
 * Collects name, organization, email (required) + title (optional)
 * Saves submissions to localStorage + sends to webhook if configured
 */
export function EmailCaptureModal({ state, onSubmit, onClose }) {
  const [form, setForm] = useState({
    name: '',
    organization: '',
    email: '',
    title: '',
    state: state || '',
  });

  const isValid = form.name.trim() && form.email.trim() && form.email.includes('@');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    // Save to localStorage + send to webhook (non-blocking)
    await submitLead(form);

    // Trigger CSV download immediately
    onSubmit(form);
  };

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="email-modal-overlay" onClick={onClose}>
      <div className="email-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Export State Report</h2>
        <p>Just your name and email to download. We'll never share your info.</p>

        <form onSubmit={handleSubmit}>
          <div className="email-modal-field">
            <label>Name <span className="field-required">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="Jane Smith"
              autoFocus
            />
          </div>

          <div className="email-modal-field">
            <label>Organization (optional)</label>
            <input
              type="text"
              value={form.organization}
              onChange={handleChange('organization')}
              placeholder="e.g. law firm, news outlet, or leave blank"
            />
          </div>

          <div className="email-modal-field">
            <label>Email <span className="field-required">*</span></label>
            <input
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              placeholder="jane.smith@state.gov"
            />
          </div>

          <div className="email-modal-field">
            <label>Title (optional)</label>
            <input
              type="text"
              value={form.title}
              onChange={handleChange('title')}
              placeholder="Assistant Attorney General"
            />
          </div>

          <div className="email-modal-actions">
            <button type="button" className="email-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="email-modal-submit" disabled={!isValid}>
              Download CSV
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
