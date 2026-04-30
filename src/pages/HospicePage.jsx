import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/post-acute-home.css';

// Phase-1 placeholder — full hospice page launches May 2026 with the
// CA Auditor methodology + DOJ ground-truth validation. This page
// captures interest until then.

export default function HospicePage() {
  return (
    <>
      <Helmet>
        <title>Hospice Care Safety Data | Launching May 2026 | The Oversight Report</title>
        <meta name="description" content="Independent, clinician-built hospice safety reports. Coming May 2026. Every Medicare-certified hospice in America, screened with a state-auditor methodology validated against prosecuted cases." />
      </Helmet>

      <div className="pa-home">
        <section className="pa-hero">
          <div className="pa-hero-tagline" style={{ color: 'var(--pa-amber)' }}>
            // launching May 2026
          </div>
          <h1 className="pa-hero-title">
            Hospice safety reports, <em>coming next.</em>
          </h1>
          <p className="pa-hero-sub">
            Every Medicare-certified hospice in America — screened with a{' '}
            <strong>state-auditor methodology validated against prosecuted cases</strong>.
            Live discharge rate, length-of-stay distribution, and GIP utilization
            for all 5,500 providers, in all 50 states.
          </p>
          <div className="pa-hero-proof">
            <span className="pa-hero-proof-item">5,500 providers</span>
            <span className="pa-hero-proof-sep">·</span>
            <span className="pa-hero-proof-item">CA Auditor framework</span>
            <span className="pa-hero-proof-sep">·</span>
            <span className="pa-hero-proof-item">DOJ ground-truth validation</span>
          </div>
          <div className="pa-hero-cta-row">
            <Link to="/" className="pa-btn">← Back to home</Link>
            <Link to="/methodology" className="pa-btn pa-btn-primary">Read the methodology approach</Link>
          </div>
        </section>

        <section className="pa-moat-section" style={{ paddingTop: 64 }}>
          <div className="pa-moat-card">
            <div>
              <div className="pa-moat-eyebrow">// what's coming</div>
              <h3 className="pa-moat-title">A hospice page built like the nursing-home page.</h3>
              <p>National map of all 5,500 Medicare-certified hospices. Per-provider report cards with live discharge rate, length-of-stay distribution, GIP utilization, CAHPS family experience scores, and recent enforcement.</p>
              <p>Three observable patterns flagged for review under the 2022 California State Auditor framework — applied nationally, validated against 17 DOJ-prosecuted cases.</p>
              <div className="pa-moat-cta">→ launches alongside the cross-setting ownership view</div>
            </div>
            <div className="pa-moat-vis">
              <div className="pa-moat-vis-head">Patterns the framework screens for</div>
              <div><span className="pa-opname">Live discharge rate</span> · 90th-pct threshold: 24.1%</div>
              <div><span className="pa-opname">Long stay (&gt;180 days)</span> · national avg 14.2%</div>
              <div><span className="pa-opname">GIP utilization</span> · 90th-pct threshold: 7.4%</div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--pa-border)', color: 'var(--pa-muted)' }}>
                Sources: <span className="pa-num">CMS Care Compare · HIS · HCRIS · CA State Auditor 2021-123</span>
              </div>
            </div>
          </div>
        </section>

        <section className="pa-trust-strip">
          <div className="pa-trust-inner">
            <div className="pa-trust-cell"><div className="pa-trust-num">5,500</div><div className="pa-trust-lbl">Hospices · 50 states</div></div>
            <div className="pa-trust-cell"><div className="pa-trust-num">498M</div><div className="pa-trust-lbl">Patient days · FY2024</div></div>
            <div className="pa-trust-cell"><div className="pa-trust-num">$23.7B</div><div className="pa-trust-lbl">Medicare hospice spend</div></div>
            <div className="pa-trust-cell"><div className="pa-trust-num">17</div><div className="pa-trust-lbl">DOJ cases · validation set</div></div>
          </div>
        </section>

        <section className="pa-author">
          <div className="pa-author-inner">
            <div>
              <h2>Why this matters.</h2>
              <p>Hospice care is the most consequential health-care decision most families ever make — and the part of CMS-regulated post-acute care where oversight has lagged the furthest behind enrollment growth.</p>
              <p>The framework on this page doesn't accuse anyone. It surfaces observable metrics — sourced to CMS — that warrant a closer look by families, ombudsmen, regulators, and attorneys. The conclusions belong to them.</p>
            </div>
            <div className="pa-author-card">
              <div className="pa-author-name">Robert Benard, NP</div>
              <div className="pa-author-creds">AGACNP-BC · PMHNP-BC · DataLink Clinical LLC</div>
              <div className="pa-author-bio">Methodology and clinical interpretation by Robert Benard, NP. Independent. Sourced. Signed.</div>
            </div>
          </div>
        </section>

        <footer className="pa-footer">
          <div className="pa-footer-inner">
            <span>© 2026 DataLink Clinical LLC · oversightreports.com</span>
            <span>Citation: CA State Auditor Report 2021-123 (March 2022)</span>
            <span>
              <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link> · <Link to="/methodology">Methodology</Link>
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
