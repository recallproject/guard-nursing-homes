import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { checkoutClinicianReport } from '../utils/stripe';
import { useFacilityData } from '../hooks/useFacilityData';
import FacilityTypeahead from '../components/facility/FacilityTypeahead';
import '../styles/ask-clinician.css';

const SITUATIONS = [
  'Choosing a facility',
  'Already placed — concerned',
  'Considering a transfer',
  'Post-hospital discharge',
  'Evaluating quality of care',
  'Investigating an incident',
];

const RELATIONSHIPS = [
  'Son / Daughter',
  'Spouse / Partner',
  'Grandchild',
  'Sibling',
  'Legal Guardian / POA',
  'Friend / Other Family',
  'Attorney / Advocate',
  'Other',
];

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

const DELIVERABLES = [
  "Safety overview — what this facility's record actually tells us",
  'Staffing analysis — how this facility compares to state and national averages',
  'Inspection findings — what the deficiency patterns tell us about this facility',
  'Ownership context — who operates this facility and how their other homes perform',
  "Clinician's perspective — what an experienced NP notices in this data",
  '3 nearby alternatives ranked by safety data',
  'Questions to ask the facility administrator',
];

export default function AskClinicianPage() {
  const navigate = useNavigate();
  const { searchFacilities } = useFacilityData();
  const [facility, setFacility] = useState('');
  const [state, setState] = useState('');
  const [relationship, setRelationship] = useState('');
  const [situations, setSituations] = useState([]);
  const [worry, setWorry] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleSituation = (s) => {
    setSituations(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSubmit = async () => {
    if (!facility.trim()) { setError('Please enter a facility name or CCN.'); return; }
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address.'); return; }
    setError('');
    setSubmitting(true);

    // Track event
    window.plausible && window.plausible('Ask-Clinician-Submit', { props: { facility, state } });

    // Email form data to Rob via Formspree
    const FORMSPREE_ID = 'xbdaeebv';
    if (FORMSPREE_ID) {
      try {
        await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            facility, state, relationship,
            situations: situations.join(', '),
            worry, email,
            _subject: `Ask a Clinician Request: ${facility}`,
          }),
        });
      } catch (e) { /* Stripe redirect still happens */ }
    }

    // Redirect to Stripe checkout — prefill their email
    checkoutClinicianReport(email);
  };

  return (
    <div className="ac-page">
      <Helmet>
        <title>Ask a Clinician — The Oversight Report</title>
        <meta name="description" content="Get a clinician's interpretation of any nursing home's public safety data. Written by a licensed Nurse Practitioner with 20+ years of experience." />
      </Helmet>

      {/* HERO */}
      <section className="ac-hero">
        <h1 className="ac-hero-title">Ask a Clinician About Your Facility</h1>
        <p className="ac-hero-sub">
          Get a clinician's interpretation of your facility's public safety record
          — written by a nurse practitioner, not a search algorithm.
        </p>
        <div className="ac-hero-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Prepared by a board-certified Nurse Practitioner using public CMS data
        </div>
      </section>

      {/* MAIN TWO-COLUMN */}
      <div className="ac-main">

        {/* LEFT: FORM */}
        <div className="ac-form-card">
          <h2 className="ac-form-heading">Tell Us About Your Situation</h2>
          <p className="ac-form-intro">
            We'll pull the latest CMS data on your facility and add clinical context
            a family can actually understand. Most reports are delivered within 48 hours.
          </p>

          {/* Facility */}
          <div className="ac-field">
            <label className="ac-label">Facility Name, City, or CCN Number</label>
            <FacilityTypeahead
              searchFacilities={searchFacilities}
              value={facility}
              onChange={setFacility}
            />
          </div>

          {/* State */}
          <div className="ac-field">
            <label className="ac-label">State</label>
            <select value={state} onChange={e => setState(e.target.value)}>
              <option value="">Select state...</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Relationship */}
          <div className="ac-field">
            <label className="ac-label">Your Relationship to the Resident</label>
            <select value={relationship} onChange={e => setRelationship(e.target.value)}>
              <option value="">Select...</option>
              {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Situation checkboxes */}
          <div className="ac-field">
            <label className="ac-label">What's Your Situation? <span className="ac-hint">(Choose all that apply)</span></label>
            <div className="ac-concern-grid">
              {SITUATIONS.map(s => (
                <label className={`ac-concern-option ${situations.includes(s) ? 'selected' : ''}`} key={s}>
                  <input type="checkbox" checked={situations.includes(s)} onChange={() => toggleSituation(s)} />
                  {s}
                </label>
              ))}
            </div>
          </div>

          {/* Worry textarea */}
          <div className="ac-field">
            <label className="ac-label">What Are You Most Worried About? <span className="ac-hint">(Tell us in your own words)</span></label>
            <textarea
              placeholder="Example: My mom has been there 6 months and she's lost 15 pounds. The staff seems overwhelmed and I never see the same nurse twice..."
              value={worry}
              onChange={e => setWorry(e.target.value)}
            />
          </div>

          {/* Email */}
          <div className="ac-field">
            <label className="ac-label">Your Email</label>
            <input type="email" placeholder="Where should we send the report?" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          {/* Disclaimer */}
          <p className="ac-form-disclaimer">
            This service provides interpretation of publicly available government data about nursing facilities. It does not constitute medical advice, clinical guidance, or a professional recommendation about the care of any individual. No nurse-patient or provider-patient relationship is created by purchasing or receiving this report. This is not a substitute for consultation with a healthcare provider, attorney, or in-person facility evaluation.
          </p>

          {/* Error message */}
          {error && <p className="ac-error">{error}</p>}

          {/* Submit */}
          <button className="ac-submit-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Get Your Facility Report — $49'}
            <span className="ac-btn-sub">Secure payment via Stripe. Report delivered within 48 hours.</span>
          </button>

          {/* Guarantee */}
          <div className="ac-guarantee">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <p><strong>100% money-back guarantee.</strong> If the report doesn't answer your questions, we'll refund you in full — no questions asked.</p>
          </div>
        </div>

        {/* RIGHT: SIDEBAR */}
        <div className="ac-sidebar">

          {/* What You Get */}
          <div className="ac-sidebar-card">
            <h3 className="ac-sidebar-title">What You'll Receive</h3>
            <ul className="ac-deliverables">
              {DELIVERABLES.map((d, i) => (
                <li key={i}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
            <div className="ac-turnaround">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <div>Delivered within <strong>48 hours</strong><br />to your email as a PDF</div>
            </div>
          </div>

          {/* Clinician Card */}
          <div className="ac-sidebar-card ac-clinician-card">
            <div className="ac-avatar">RB</div>
            <div className="ac-clinician-name">Robert Benard, NP</div>
            <div className="ac-clinician-creds">AGACNP-BC · PMHNP-BC</div>
            <div className="ac-clinician-title">Board-Certified Nurse Practitioner · 20+ Years Clinical Experience</div>
            <p className="ac-clinician-bio">
              Robert has spent 20+ years at the bedside in acute care hospitals.
              He reviews and interprets every report — the clinical context comes
              from real experience, not an algorithm.
            </p>
            <a href="mailto:contact@oversightreports.com" style={{ fontSize: '0.8125rem', color: '#64748B', textDecoration: 'none', marginTop: '8px', display: 'block', fontFamily: "'JetBrains Mono', monospace" }}>contact@oversightreports.com</a>
          </div>

          {/* Trust Signals */}
          <div className="ac-sidebar-card">
            <h3 className="ac-sidebar-title">Why Families Trust Us</h3>
            <div className="ac-trust-signals">
              <div className="ac-trust-signal">
                <div className="ac-trust-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2B6CB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <span>Data from CMS — the same source regulators use</span>
              </div>
              <div className="ac-trust-signal">
                <div className="ac-trust-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2B6CB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <span>We don't take money from nursing homes. Ever.</span>
              </div>
              <div className="ac-trust-signal">
                <div className="ac-trust-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2B6CB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <span>Prepared by a clinician, not a marketing team</span>
              </div>
              <div className="ac-trust-signal">
                <div className="ac-trust-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2B6CB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <span>Your information stays private — we never share or sell data</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER DISCLAIMER */}
      <footer className="ac-footer">
        <p>
          Reports are prepared using the professional knowledge of a licensed Nurse Practitioner applied to publicly available CMS regulatory data. The Oversight Report is an independent service with no financial ties to any nursing facility or chain. Reports are informational — not medical advice — and do not create a provider-patient relationship.
        </p>
        <p>© 2026 DataLink Clinical LLC</p>
      </footer>
    </div>
  );
}
