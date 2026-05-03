import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/post-acute-home.css';

const REFRESH_HISTORY = [
  {
    date: 'May 3, 2026',
    title: 'Hospice section expansion',
    notes: 'Added 55 hospice state-detail pages, 1,076 hospice chain rollups (covering 2,159 of 6,943 hospices), and the /hospice/high-risk investigation hub applying the California State Auditor framework nationally. Wired CourtListener federal court records and rebuilt the State AG MFCU pipeline with HTML scrapers across CA/TX/NY/FL/IL/PA. 20 new Plausible analytics events. All hospice PDFs are now free.',
    source: 'CMS Hospice · CourtListener · State AGs',
  },
  {
    date: 'April 29, 2026',
    title: 'Post-acute care hub launched',
    notes: 'Five-setting navigation (SNF · Hospice · Home Health · IRF · LTCH). Hospice section live with 6,943 provider report cards, side-by-side compare, rolling national feed, and the CA State Auditor framework applied nationally.',
    source: 'Site',
  },
  {
    date: 'April 21, 2026',
    title: 'PBJ Q1 + Q2 2025 re-pulled from CMS',
    notes: 'Daily staffing data re-downloaded directly from CMS. Hash-verified. No methodology changes.',
    source: 'CMS Payroll-Based Journal',
  },
  {
    date: 'March 10, 2026',
    title: 'Security audit completed',
    notes: '20-issue audit shipped. Data unchanged.',
    source: 'Infrastructure',
  },
  {
    date: 'March 2, 2026',
    title: 'First post-launch data refresh',
    notes: 'CMS Provider Info Jan 1 2026 snapshot, deficiencies through Dec 2025, penalties through Dec 2025, HCRIS FY2024.',
    source: 'CMS Provider Info · Health Deficiencies · Penalties · HCRIS',
  },
  {
    date: 'February 24, 2026',
    title: 'Site launch',
    notes: '14,713 nursing-home report cards. The Oversight Report goes live, free, with no operator funding. 18 federal datasets integrated.',
    source: 'Site',
  },
];

export default function RefreshLogPage() {
  return (
    <>
      <Helmet>
        <title>Refresh Log | The Oversight Report</title>
        <meta name="description" content="A dated, public record of every CMS data refresh and methodology change on The Oversight Report." />
      </Helmet>

      <div className="pa-home">
        <section className="pa-hero">
          <div className="pa-hero-tagline">Public record · since launch · 2026</div>
          <h1 className="pa-masthead">Refresh Log</h1>
          <div className="pa-masthead-sub">When the data was last updated, by source.</div>
          <hr className="pa-masthead-rule" />
          <p className="pa-hero-sub">
            A dated record of every CMS data refresh, dataset addition, and methodology change since launch.
            Sources refresh on different schedules — provider info quarterly, deficiencies monthly,
            HCRIS cost reports annually.
          </p>
        </section>

        <section style={{ paddingTop: 24, paddingBottom: 80 }}>
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 32px' }}>
            {REFRESH_HISTORY.map((entry, i) => (
              <article
                key={i}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D7E0EA',
                  borderRadius: 12,
                  padding: '24px 28px',
                  marginBottom: 16,
                  boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 2px 6px rgba(29,53,87,.04)',
                }}
              >
                <div style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 11,
                  color: '#64748B',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  marginBottom: 6,
                }}>
                  {entry.date} · {entry.source}
                </div>
                <h3 style={{
                  fontFamily: '"Source Serif 4", Georgia, serif',
                  fontSize: 22,
                  color: '#1D3557',
                  margin: '0 0 8px',
                  fontWeight: 700,
                }}>
                  {entry.title}
                </h3>
                <p style={{ color: '#334155', margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>
                  {entry.notes}
                </p>
              </article>
            ))}
          </div>
        </section>

        <footer className="pa-footer">
          <div className="pa-footer-inner">
            <span>© 2026 DataLink Clinical LLC · oversightreports.com</span>
            <span>Independent. Sourced. Signed.</span>
            <span>
              <Link to="/">Home</Link> · <Link to="/methodology">Methodology</Link> · <Link to="/data-transparency">Data sources</Link>
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
