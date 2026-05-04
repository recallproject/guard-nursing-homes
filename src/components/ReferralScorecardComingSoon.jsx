import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

// "Coming Soon" preview for the Referral Scorecard.
// Renders a static blurred snapshot of what the tool looks like, with a
// centered overlay card explaining what's coming and capturing interest.

const PREVIEW_FACILITIES = [
  { rank: '#1', name: '[Sample Provider A]', loc: 'Sample metro · ID SAMPLE-001', flag: 'NON-PROFIT', flagClass: 'np', composite: 82, star: '4.0', starCls: 's-high', rn: '0.84', total: '4.21', zeroRn: '0', defs: '8', ij: '0', fines: '$0', rehosp: '17.4%', turnover: '31%', anti: '8.1%', rec: 'Strong fit', recCls: 'recommend' },
  { rank: '#2', name: '[Sample Provider B]', loc: 'Sample metro · ID SAMPLE-002', flag: 'NON-PROFIT', flagClass: 'np', composite: 76, star: '4.0', starCls: 's-high', rn: '0.71', total: '3.98', zeroRn: '2', defs: '6', ij: '0', fines: '$8.4K', rehosp: '19.1%', turnover: '42%', anti: '9.4%', rec: 'Strong fit', recCls: 'recommend' },
  { rank: '#3', name: '[Sample Provider C]', loc: 'Sample metro · ID SAMPLE-003', flag: 'PE · REIT', flagClass: 'pe', composite: 54, star: '3.0', starCls: 's-mid', rn: '0.42', total: '3.42', zeroRn: '11', defs: '14', ij: '1', fines: '$92K', rehosp: '26.8%', turnover: '58%', anti: '19.2%', rec: 'Review closely', recCls: 'consider' },
  { rank: '#4', name: '[Sample Provider D]', loc: 'Sample metro · ID SAMPLE-004', flag: 'FOR-PROFIT', flagClass: 'fp', composite: 31, star: '2.0', starCls: 's-low', rn: '0.18', total: '2.61', zeroRn: '38', defs: '31', ij: '4', fines: '$418K', rehosp: '34.2%', turnover: '76%', anti: '28.7%', rec: 'Needs review', recCls: 'avoid' },
];

const ROWS = [
  { label: 'Composite score',         key: 'composite', kind: 'pill' },
  { label: 'Overall ★',                key: 'star',      kind: 'star' },
  { label: 'RN hours / day',           key: 'rn',        kind: 'num' },
  { label: 'Total nurse hrs / day',    key: 'total',     kind: 'num' },
  { label: "Zero-RN days (Q3 '25)",    key: 'zeroRn',    kind: 'num' },
  { label: 'Deficiencies (3yr)',       key: 'defs',      kind: 'num' },
  { label: 'Immediate jeopardy',       key: 'ij',        kind: 'num' },
  { label: 'Penalties · 3yr total',    key: 'fines',     kind: 'num' },
  { label: 'Rehospitalization rate',   key: 'rehosp',    kind: 'num' },
  { label: 'Staff turnover (annual)',  key: 'turnover',  kind: 'num' },
  { label: 'Antipsychotic use (LS)',   key: 'anti',      kind: 'num' },
  { label: 'Recommendation',           key: 'rec',       kind: 'rec' },
];

function pillClass(score) {
  if (score >= 70) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

export default function ReferralScorecardComingSoon() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (window.plausible) window.plausible('Referral-Scorecard-Coming-Soon-View');
  }, []);

  const handleNotify = (e) => {
    e.preventDefault();
    if (!email) return;
    if (window.plausible) window.plausible('Referral-Scorecard-Notify-Me', { props: { email_domain: email.split('@')[1] || '' } });
    setSubmitted(true);
  };

  return (
    <div className="rsc-cs">
      <Helmet>
        <title>Referral Scorecard — Coming Soon | The Oversight Report</title>
        <meta name="description" content="A side-by-side post-acute referral scorecard for hospital case managers and discharge planners. Coming soon. Compare nursing homes, hospice, home health, IRFs, and LTACHs by federal CMS data." />
      </Helmet>

      <style>{`
        .rsc-cs { position: relative; min-height: calc(100vh - 80px); padding: 0; background: #EDF1F7; overflow: hidden; }

        /* blurred preview */
        .rsc-cs-preview {
          padding: 40px 32px;
          filter: blur(7px);
          pointer-events: none;
          user-select: none;
          opacity: 0.6;
        }
        .rsc-cs-preview-inner { max-width: 1400px; margin: 0 auto; }
        .rsc-cs-grid {
          display: grid;
          grid-template-columns: 220px repeat(4, 1fr);
          background: #FFFFFF;
          border: 1px solid #D7E0EA;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,.05), 0 6px 16px rgba(29,53,87,.07);
        }
        .rsc-cs-row { display: contents; }
        .rsc-row-label, .rsc-row-cell { padding: 14px 18px; border-bottom: 1px solid #E8EDF2; display: flex; align-items: center; }
        .rsc-row-label { background: #F8FAFC; border-right: 1px solid #E8EDF2; font-family: "JetBrains Mono", monospace; font-size: 11px; color: #64748B; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; }
        .rsc-row-cell { font-size: 14px; color: #334155; border-right: 1px solid #E8EDF2; }
        .rsc-row-cell:last-child { border-right: 0; }

        .rsc-fac-header { background: #FFFFFF; padding: 22px 18px; border-bottom: 2px solid #1D3557; }
        .rsc-fac-header.rsc-row-label { background: #1D3557; color: #fff; }
        .rsc-fac-rank { font-family: "JetBrains Mono", monospace; font-size: 10px; color: #94A3B8; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 4px; }
        .rsc-fac-name { font-family: "Source Serif 4", Georgia, serif; font-size: 16px; color: #1D3557; font-weight: 700; line-height: 1.25; margin: 0 0 4px; }
        .rsc-fac-loc { font-size: 12px; color: #64748B; }
        .rsc-fac-flag { font-family: "JetBrains Mono", monospace; font-size: 9.5px; padding: 2px 6px; border-radius: 3px; letter-spacing: 0.06em; font-weight: 700; text-transform: uppercase; margin-top: 8px; display: inline-block; }
        .rsc-fac-flag.pe { background: rgba(124,58,237,.10); color: #7C3AED; border: 1px solid rgba(124,58,237,.3); }
        .rsc-fac-flag.fp { background: #F0F4F8; color: #64748B; border: 1px solid #D7E0EA; }
        .rsc-fac-flag.np { background: rgba(13,148,136,.10); color: #0D9488; border: 1px solid rgba(13,148,136,.3); }

        .rsc-pill { display: inline-flex; font-family: "JetBrains Mono", monospace; font-size: 13px; font-weight: 700; padding: 5px 12px; border-radius: 999px; min-width: 64px; justify-content: center; }
        .rsc-pill.green { background: rgba(5,150,105,.12); color: #059669; }
        .rsc-pill.amber { background: rgba(217,119,6,.12); color: #D97706; }
        .rsc-pill.red   { background: rgba(220,38,38,.12); color: #DC2626; }

        .rsc-num { font-family: "JetBrains Mono", monospace; font-weight: 700; color: #1D3557; }
        .rsc-stars { font-family: "JetBrains Mono", monospace; font-weight: 700; }
        .rsc-stars.s-low  { color: #DC2626; }
        .rsc-stars.s-mid  { color: #D97706; }
        .rsc-stars.s-high { color: #0D9488; }
        .rsc-rec { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
        .rsc-rec.recommend { color: #059669; }
        .rsc-rec.consider  { color: #D97706; }
        .rsc-rec.avoid     { color: #DC2626; }

        /* Coming-soon overlay */
        .rsc-cs-overlay {
          position: absolute; inset: 0;
          display: flex; align-items: flex-start; justify-content: center;
          padding: 64px 24px;
          background: linear-gradient(180deg, rgba(237,241,247,0.5) 0%, rgba(237,241,247,0.85) 35%, rgba(237,241,247,0.96) 100%);
          z-index: 10;
        }
        .rsc-cs-card {
          background: #FFFFFF;
          border: 1px solid #D7E0EA;
          border-radius: 16px;
          padding: 40px 44px;
          max-width: 640px;
          width: 100%;
          box-shadow: 0 2px 8px rgba(0,0,0,.06), 0 24px 60px rgba(29,53,87,.18);
          text-align: center;
          margin-top: 40px;
        }
        .rsc-cs-eyebrow {
          font-family: "JetBrains Mono", monospace; font-size: 11px;
          color: #D97706; letter-spacing: 0.18em; text-transform: uppercase;
          font-weight: 700; margin-bottom: 14px;
        }
        .rsc-cs-title {
          font-family: "Source Serif 4", Georgia, serif;
          font-size: 38px; line-height: 1.1; color: #1D3557;
          margin: 0 0 14px; font-weight: 700;
        }
        .rsc-cs-title em { color: #2B6CB0; font-style: italic; }
        .rsc-cs-sub { font-size: 16px; color: #334155; line-height: 1.55; margin: 0 0 22px; }
        .rsc-cs-sub strong { color: #1D3557; }

        .rsc-cs-features {
          background: #F8FAFC; border: 1px solid #E8EDF2; border-radius: 10px;
          padding: 16px 20px; margin-bottom: 22px; text-align: left;
        }
        .rsc-cs-features-label { font-family: "JetBrains Mono", monospace; font-size: 10.5px; color: #64748B; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; margin-bottom: 10px; }
        .rsc-cs-features ul { margin: 0; padding-left: 18px; color: #334155; font-size: 14px; line-height: 1.6; }
        .rsc-cs-features li { margin-bottom: 4px; }
        .rsc-cs-features strong { color: #1D3557; }

        .rsc-cs-form { display: flex; gap: 8px; max-width: 420px; margin: 0 auto; }
        .rsc-cs-form input {
          flex: 1; padding: 12px 14px; border: 1px solid #D7E0EA; border-radius: 8px;
          font-size: 14px; color: #1D3557; font-family: inherit; outline: 0;
        }
        .rsc-cs-form input:focus { border-color: #2B6CB0; }
        .rsc-cs-form button {
          padding: 12px 20px; background: #2B6CB0; color: #fff; border: 0;
          border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;
          font-family: inherit;
        }
        .rsc-cs-form button:hover { background: #1D4E7E; }
        .rsc-cs-thanks {
          font-family: "JetBrains Mono", monospace; font-size: 12px; color: #059669;
          background: rgba(5,150,105,.08); border: 1px solid rgba(5,150,105,.25);
          padding: 12px 16px; border-radius: 8px;
        }
        .rsc-cs-back {
          margin-top: 18px; font-size: 13px;
          font-family: "JetBrains Mono", monospace; color: #64748B; letter-spacing: 0.04em;
        }
        .rsc-cs-back button { background: none; border: 0; color: #2B6CB0; cursor: pointer; font-family: inherit; font-size: 13px; padding: 0; }
        .rsc-cs-back button:hover { color: #1D4E7E; text-decoration: underline; }

        @media (max-width: 720px) {
          .rsc-cs-card { padding: 28px 24px; margin-top: 24px; }
          .rsc-cs-title { font-size: 28px; }
          .rsc-cs-form { flex-direction: column; }
          .rsc-cs-grid { grid-template-columns: 140px repeat(4, 1fr); font-size: 11px; }
        }
      `}</style>

      {/* blurred preview behind the overlay */}
      <div className="rsc-cs-preview" aria-hidden="true">
        <div className="rsc-cs-preview-inner">
          <div className="rsc-cs-grid">
            {/* facility headers */}
            <div className="rsc-cs-row">
              <div className="rsc-row-label rsc-fac-header">Facility</div>
              {PREVIEW_FACILITIES.map((f, i) => (
                <div key={i} className="rsc-row-cell rsc-fac-header">
                  <div>
                    <div className="rsc-fac-rank">{f.rank} by composite</div>
                    <div className="rsc-fac-name">{f.name}</div>
                    <div className="rsc-fac-loc">{f.loc}</div>
                    <span className={`rsc-fac-flag ${f.flagClass}`}>{f.flag}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* metric rows */}
            {ROWS.map((row) => (
              <div key={row.key} className="rsc-cs-row">
                <div className="rsc-row-label">{row.label}</div>
                {PREVIEW_FACILITIES.map((f, i) => {
                  const v = f[row.key];
                  if (row.kind === 'pill') {
                    return <div key={i} className="rsc-row-cell"><span className={`rsc-pill ${pillClass(v)}`}>{v}</span></div>;
                  }
                  if (row.kind === 'star') {
                    return <div key={i} className="rsc-row-cell"><span className={`rsc-stars ${f.starCls}`}>★ {v}</span></div>;
                  }
                  if (row.kind === 'rec') {
                    return <div key={i} className="rsc-row-cell"><span className={`rsc-rec ${f.recCls}`}>{v}</span></div>;
                  }
                  return <div key={i} className="rsc-row-cell"><span className="rsc-num">{v}</span></div>;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coming-soon overlay */}
      <div className="rsc-cs-overlay">
        <div className="rsc-cs-card">
          <div className="rsc-cs-eyebrow">// Coming soon</div>
          <h1 className="rsc-cs-title">Referral Scorecard,<br /><em>compared and printable.</em></h1>
          <p className="rsc-cs-sub">
            A side-by-side comparison tool for hospital case managers and discharge planners.
            Compare nursing homes, hospice, home health, inpatient rehab, and LTACHs by federal CMS data —{' '}
            <strong>staffing, deficiencies, penalties, ownership, outcomes, and risk</strong>.
            Built for the moment a clinician needs to choose where the patient goes next.
          </p>

          <div className="rsc-cs-features">
            <div className="rsc-cs-features-label">// what it covers when it ships</div>
            <ul>
              <li><strong>5 post-acute settings</strong> — SNF, home health, hospice, IRF, LTACH</li>
              <li><strong>4 facilities at a time</strong> — head-to-head, with composite scores</li>
              <li><strong>Print-ready PDFs</strong> — for charting and family conversations</li>
              <li><strong>Free for licensed clinicians</strong> — no subscription, no operator funding</li>
            </ul>
          </div>

          {!submitted ? (
            <form className="rsc-cs-form" onSubmit={handleNotify}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@hospital.org"
                aria-label="Email address"
                required
              />
              <button type="submit">Notify me</button>
            </form>
          ) : (
            <div className="rsc-cs-thanks">Thanks — we'll email you the day it ships.</div>
          )}

          <div className="rsc-cs-back">
            In the meantime, the underlying data is already free →{' '}
            <button type="button" onClick={() => navigate('/skilled-nursing')}>browse facilities</button>
          </div>
        </div>
      </div>
    </div>
  );
}
