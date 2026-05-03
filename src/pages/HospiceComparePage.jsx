import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

// HospiceComparePage — side-by-side hospice comparison.
// Reads URL params (zip, city, state, ccns) and renders the v10 mockup.

// Static SC state averages used for "+X vs SC" delta hints when CAHPS data
// isn't present in the per-provider record. These are display-only fallbacks.
const STATE_CAHPS_AVG = {
  overall: 81,
  recommend: 84,
  pain: 76,
  comm: 79,
};

const SAMPLE_PROVIDERS = [
  {
    ccn: 'SAMPLE-1',
    name: 'Lowcountry Hospice Care',
    city: 'Charleston',
    state: 'SC',
    zip: '29403',
    ownership_type: 'Non-Profit',
    certification_date: '01/01/1998',
    parent: 'MUSC Health',
    parent_locations: 1,
    distance_mi: 4.2,
    metrics: {
      avg_daily_census: 38,
      patients_fy24: 214,
      cms_star: 4.0,
      recommended_last_days_pct: 94,
      cahps_overall: 86,
      cahps_recommend: 88,
      cahps_pain: 81,
      cahps_comm: 83,
      live_discharge_pct: 4.8,
      gip_pct: 0.4,
      care_provided_home_pct: 82,
      care_provided_nursing_pct: 11,
      inpatient_unit: true,
      public_record_items: 0,
      news_mentions: 0,
    },
    flags: { flagged_count: 0 },
    sample: true,
  },
  {
    ccn: 'SAMPLE-2',
    name: 'Coastal Carolina Hospice',
    city: 'Mt Pleasant',
    state: 'SC',
    zip: '29464',
    ownership_type: 'Non-Profit',
    certification_date: '01/01/2002',
    parent: 'Roper St Francis',
    parent_locations: 2,
    distance_mi: 6.1,
    metrics: {
      avg_daily_census: 52,
      patients_fy24: 318,
      cms_star: 4.0,
      recommended_last_days_pct: 91,
      cahps_overall: 84,
      cahps_recommend: 87,
      cahps_pain: 82,
      cahps_comm: 85,
      live_discharge_pct: 5.2,
      gip_pct: 0.6,
      care_provided_home_pct: 75,
      care_provided_nursing_pct: 17,
      inpatient_unit: true,
      public_record_items: 0,
      news_mentions: 2,
      news_mentions_note: 'positive',
    },
    flags: { flagged_count: 0 },
    sample: true,
  },
  {
    ccn: 'SAMPLE-3',
    name: 'Palmetto End-of-Life Care',
    city: 'N. Charleston',
    state: 'SC',
    zip: '29405',
    ownership_type: 'For-Profit',
    certification_date: '01/01/2008',
    parent: 'Palmetto Holdings',
    parent_locations: 8,
    distance_mi: 7.8,
    metrics: {
      avg_daily_census: 29,
      patients_fy24: 187,
      cms_star: 3.5,
      recommended_last_days_pct: 82,
      cahps_overall: 79,
      cahps_recommend: 82,
      cahps_pain: 76,
      cahps_comm: 80,
      live_discharge_pct: 17.4,
      gip_pct: 0.0,
      care_provided_home_pct: 71,
      care_provided_nursing_pct: 22,
      inpatient_unit: false,
      public_record_items: 1,
      public_record_note: 'CMS deficiency',
      news_mentions: 0,
    },
    flags: { flagged_count: 1 },
    sample: true,
  },
  {
    ccn: 'SAMPLE-4',
    name: 'Capstone Hospice & Palliative',
    city: 'Charleston',
    state: 'SC',
    zip: '29403',
    ownership_type: 'For-Profit',
    certification_date: '01/01/2014',
    parent: 'Capstone Holdings',
    parent_locations: 12,
    distance_mi: 1.8,
    ownership_flags: { pe: true },
    metrics: {
      avg_daily_census: 42,
      patients_fy24: 287,
      cms_star: 3.0,
      recommended_last_days_pct: 71,
      cahps_overall: 74,
      cahps_recommend: 79,
      cahps_pain: 68,
      cahps_comm: 76,
      live_discharge_pct: 46.2,
      gip_pct: 2.4,
      care_provided_home_pct: 68,
      care_provided_nursing_pct: 21,
      inpatient_unit: true,
      public_record_items: 5,
      public_record_note: 'DOJ + AG + OIG',
      news_mentions: 1,
      news_mentions_note: 'enforcement',
    },
    flags: { flagged_count: 2 },
    sample: true,
  },
];

// --- helpers ----------------------------------------------------------------

function titleCase(s) {
  if (!s) return '';
  return s.toString().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function getCertYear(d) {
  if (!d) return '—';
  const m = String(d).match(/(19|20)\d{2}/);
  return m ? m[0] : '—';
}

function ownershipFlagPills(p) {
  const flags = [];
  const isFP = (p.ownership_type || '').toLowerCase().includes('for-profit');
  const isNP = (p.ownership_type || '').toLowerCase().includes('non-profit');
  if (isNP) flags.push({ label: 'Non-Profit', cls: 'np' });
  else if (isFP) flags.push({ label: 'For-Profit', cls: 'fp' });
  if (p.ownership_flags?.pe) flags.push({ label: 'PE', cls: 'pe' });
  if (p.ownership_flags?.reit) flags.push({ label: 'REIT', cls: 'pe' });
  return flags;
}

function starsBucket(v) {
  if (v == null) return 's-mid';
  if (v >= 4) return 's-high';
  if (v >= 3) return 's-mid';
  return 's-low';
}

function starsString(v) {
  if (v == null) return '—';
  const full = Math.round(v);
  return '★'.repeat(full) + ` ${v.toFixed(1)}`;
}

function liveDischargeBucket(v) {
  if (v == null) return { cls: '', pill: '', label: '' };
  if (v >= 30) return { cls: 'bad', pill: 'pill-flagged', label: 'Far above 90th pct' };
  if (v >= 15) return { cls: 'warn', pill: 'pill-flagged', label: 'Above 90th pct' };
  return { cls: 'good', pill: 'pill-ok', label: 'Below threshold' };
}

function gipBucket(v) {
  if (v == null) return { cls: '', pill: '', label: '' };
  if (v >= 2) return { cls: 'bad', pill: 'pill-flagged', label: 'Above 90th pct' };
  if (v >= 1) return { cls: 'warn', pill: 'pill-flagged', label: 'Elevated' };
  return { cls: 'good', pill: 'pill-ok', label: 'Below threshold' };
}

function cahpsCell(pct, stateAvg) {
  if (pct == null) return { cls: '', delta: '' };
  const diff = pct - stateAvg;
  if (Math.abs(diff) < 1) return { cls: '', delta: 'at SC avg' };
  if (diff > 0) return { cls: 'above', delta: `+${diff.toFixed(0)} vs SC` };
  return { cls: 'below', delta: `${diff.toFixed(0)} vs SC` };
}

function recommendation(p) {
  const fc = p.flags?.flagged_count ?? 0;
  if (fc >= 2) return { cls: 'rec-avoid', label: '✕ Closer review' };
  if (fc === 1) return { cls: 'rec-consider', label: '▲ Consider w/ caution' };
  return { cls: 'rec-recommend', label: '✓ Recommend' };
}

function fmtPct(v, digits = 1) {
  if (v == null || Number.isNaN(v)) return '—';
  return `${Number(v).toFixed(digits)}%`;
}

function fmtInt(v) {
  if (v == null || Number.isNaN(v)) return '—';
  return Math.round(Number(v)).toString();
}

// rough sort: lower live-discharge + higher star = better
function compositeRank(p) {
  const m = p.metrics || {};
  const ld = m.live_discharge_pct ?? 0;
  const star = m.cms_star ?? 3;
  const fc = p.flags?.flagged_count ?? 0;
  return -(star * 10) + ld + fc * 20;
}

// --- main component ---------------------------------------------------------

export default function HospiceComparePage() {
  const [params] = useSearchParams();
  const zip = params.get('zip') || '';
  const city = params.get('city') || '';
  const state = (params.get('state') || '').toUpperCase();
  const ccnsParam = params.get('ccns') || '';

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingSample, setUsingSample] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (window.plausible) window.plausible('Hospice-Compare-Page-View');
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!state) {
        setProviders(SAMPLE_PROVIDERS);
        setUsingSample(true);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/data/hospice/states/${state}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        let pool = Array.isArray(data?.providers) ? data.providers : [];

        const ccnList = ccnsParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        let filtered = [];
        if (ccnList.length >= 2 && ccnList.length <= 5) {
          const set = new Set(ccnList.map((c) => c.toUpperCase()));
          filtered = pool.filter((p) => set.has(String(p.ccn).toUpperCase()));
        } else if (zip) {
          const prefix = zip.replace(/\D/g, '').slice(0, 3);
          filtered = pool.filter(
            (p) => (p.zip || '').replace(/\D/g, '').slice(0, 3) === prefix
          );
        } else if (city) {
          const c = city.toLowerCase().trim();
          filtered = pool.filter((p) => (p.city || '').toLowerCase().trim().includes(c));
        } else {
          filtered = pool;
        }

        const top4 = filtered.slice(0, 4);
        if (top4.length === 0) {
          setProviders(SAMPLE_PROVIDERS);
          setUsingSample(true);
        } else {
          setProviders(top4);
          setUsingSample(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setProviders(SAMPLE_PROVIDERS);
          setUsingSample(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [state, ccnsParam, zip, city]);

  const ranked = useMemo(() => {
    return [...providers].sort((a, b) => compositeRank(a) - compositeRank(b));
  }, [providers]);

  // Summary strip counts
  const total = ranked.length;
  const noFlags = ranked.filter((p) => (p.flags?.flagged_count ?? 0) === 0).length;
  const oneFlag = ranked.filter((p) => (p.flags?.flagged_count ?? 0) === 1).length;
  const multiFlag = ranked.filter((p) => (p.flags?.flagged_count ?? 0) >= 2).length;

  // Display location
  const locLabel = (() => {
    if (city && state) return `${titleCase(city)}, ${state}`;
    if (zip) return `ZIP ${zip}`;
    if (state) return state;
    return 'Charleston, SC';
  })();
  const subZip = zip || (ranked[0]?.zip || '29403');
  const stateAbbr = state || ranked[0]?.state || 'SC';

  // Best-in-row helpers
  const bestIdx = (vals, dir = 'high') => {
    let bi = -1;
    let bv = dir === 'high' ? -Infinity : Infinity;
    vals.forEach((v, i) => {
      if (v == null || Number.isNaN(v)) return;
      if (dir === 'high' && v > bv) { bv = v; bi = i; }
      if (dir === 'low' && v < bv) { bv = v; bi = i; }
    });
    return bi;
  };

  const starVals = ranked.map((p) => p.metrics?.cms_star ?? null);
  const overallVals = ranked.map((p) => p.metrics?.cahps_overall ?? null);
  const recVals = ranked.map((p) => p.metrics?.cahps_recommend ?? null);
  const painVals = ranked.map((p) => p.metrics?.cahps_pain ?? null);
  const commVals = ranked.map((p) => p.metrics?.cahps_comm ?? null);

  const bestStar = bestIdx(starVals, 'high');
  const bestOverall = bestIdx(overallVals, 'high');
  const bestRec = bestIdx(recVals, 'high');
  const bestPain = bestIdx(painVals, 'high');
  const bestComm = bestIdx(commVals, 'high');

  const handlePrint = () => window.print();

  return (
    <div className="hospice-compare">
      <Helmet>
        <title>Compare Hospices | The Oversight Report</title>
        <meta
          name="description"
          content="Side-by-side comparison of Medicare-certified hospices. Quality ratings, family experience, patterns flagged, and public-record items, sourced from federal CMS data."
        />
      </Helmet>

      <style>{HC_CSS}</style>

      <div className="hc-crumb">
        <a href="/">Home</a>
        <span className="hc-sep">›</span>
        <a href="/hospice">Hospice</a>
        <span className="hc-sep">›</span>
        Compare hospices · {locLabel}
      </div>

      <div className="hc-page-head">
        <div className="hc-eyebrow">// for case managers, discharge planners, and families comparing options</div>
        <h1 className="hc-title">Compare hospices · {locLabel} area.</h1>
        <p className="hc-sub">
          {total} Medicare-certified hospice{total === 1 ? '' : 's'} serving ZIP {subZip} within 10 miles.
          Data sourced from CMS, refreshed monthly. Print this and bring it to the discharge meeting.
          {usingSample && <span className="hc-sample-tag"> · Sample data shown</span>}
        </p>

        <div className="hc-filter-bar">
          <div className="hc-filter-group">
            <span className="hc-filter-label">ZIP / city</span>
            <input
              className="hc-filter-input"
              defaultValue={city ? `${titleCase(city)}, ${stateAbbr} ${zip || ''}`.trim() : (zip ? `${stateAbbr} ${zip}` : `${stateAbbr || ''}`)}
              readOnly
            />
          </div>
          <div className="hc-filter-group">
            <span className="hc-filter-label">Within</span>
            <select className="hc-filter-select" defaultValue="10 miles">
              <option>10 miles</option>
              <option>25 miles</option>
              <option>50 miles</option>
            </select>
          </div>
          <div className="hc-filter-group">
            <span className="hc-filter-label">Setting</span>
            <select className="hc-filter-select" defaultValue="Hospice" disabled>
              <option>Hospice</option>
            </select>
          </div>
          <div className="hc-filter-group">
            <span className="hc-filter-label">Sort by</span>
            <select className="hc-filter-select" defaultValue="Composite score">
              <option>Composite score</option>
              <option>Distance</option>
              <option>CMS rating</option>
              <option>Family experience</option>
            </select>
          </div>
          <div className="hc-filter-actions">
            <button className="hc-btn" type="button">+ Add hospice</button>
            <button className="hc-btn" type="button">Reset</button>
          </div>
        </div>

        <div className="hc-summary-strip">
          <div className="hc-summary-cell teal">
            <div className="lbl">Showing</div>
            <div className="val">{total} hospice{total === 1 ? '' : 's'}</div>
            <div className="sub">within 10 miles of {subZip}</div>
          </div>
          <div className="hc-summary-cell">
            <div className="lbl">No patterns flagged</div>
            <div className="val">{noFlags}</div>
            <div className="sub">CMS metrics within national norms</div>
          </div>
          <div className="hc-summary-cell amber">
            <div className="lbl">One pattern flagged</div>
            <div className="val">{oneFlag}</div>
            <div className="sub">worth asking questions about</div>
          </div>
          <div className="hc-summary-cell red">
            <div className="lbl">Multiple patterns flagged</div>
            <div className="val">{multiFlag}</div>
            <div className="sub">closer review recommended</div>
          </div>
        </div>
      </div>

      <section className="hc-compare-wrap">
        {loading && <div className="hc-loading">Loading hospice data…</div>}
        {error && (
          <div className="hc-error">Could not load state data ({error}). Showing sample comparison below.</div>
        )}

        <div className="hc-compare-table">
          {/* Header row */}
          <div className="hc-row">
            <div className="hc-rlabel hc-fac-hdr row-label">Hospice</div>
            {ranked.map((p, i) => {
              const flags = ownershipFlagPills(p);
              return (
                <div key={p.ccn || i} className="hc-cell hc-fac-hdr">
                  <div>
                    <div className="hc-fac-rank">#{i + 1} by composite</div>
                    <div className="hc-fac-name">{titleCase(p.name)}</div>
                    <div className="hc-fac-loc">
                      {titleCase(p.city)}, {p.state}
                      {p.distance_mi != null ? ` · ${Number(p.distance_mi).toFixed(1)} mi` : ''}
                      {' · CCN '}
                      {p.ccn}
                    </div>
                    <div className="hc-fac-flags">
                      {flags.map((f, idx) => (
                        <span key={idx} className={`hc-fac-flag flag-${f.cls}`}>{f.label}</span>
                      ))}
                    </div>
                    <div className="hc-fac-remove">× remove</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section: Provider basics */}
          <SectionHeader label="Provider basics" />
          <Row label="Avg daily census" cells={ranked.map((p) => (
            <span className="hc-num">{fmtInt(p.metrics?.avg_daily_census)}</span>
          ))} />
          <Row label="Patients (FY24)" cells={ranked.map((p) => (
            <span className="hc-num">{fmtInt(p.metrics?.patients_fy24 ?? p.metrics?.patients)}</span>
          ))} />
          <Row label="Parent operator" cells={ranked.map((p) => (
            <span style={{ fontSize: 12 }}>
              {p.parent ? `${p.parent}${p.parent_locations ? ` · ${p.parent_locations} location${p.parent_locations === 1 ? '' : 's'}` : ''}` : 'Independent'}
            </span>
          ))} />
          <Row label="Certified since" cells={ranked.map((p) => (
            <span className="hc-num">{getCertYear(p.certification_date)}</span>
          ))} />

          {/* Section: Quality & rating */}
          <SectionHeader label="Quality & rating" />
          <Row
            label="CMS overall rating"
            cells={ranked.map((p, i) => (
              <span className={`hc-stars ${starsBucket(p.metrics?.cms_star)}`}>
                {p.metrics?.cms_star != null ? starsString(p.metrics.cms_star) : '—'}
              </span>
            ))}
            bestIdx={bestStar}
          />
          <Row
            label="Recommended care · last days"
            cells={ranked.map((p) => {
              const v = p.metrics?.recommended_last_days_pct;
              const cls = v == null ? '' : v >= 90 ? 'good' : v >= 80 ? '' : 'warn';
              return <span className={`hc-num ${cls}`}>{v == null ? '—' : `${Math.round(v)}%`}</span>;
            })}
          />

          {/* Section: Family experience */}
          <SectionHeader label="Family experience (CAHPS) — % of families giving top rating" />
          <Row
            label="Overall rating"
            cells={ranked.map((p) => {
              const v = p.metrics?.cahps_overall;
              const c = cahpsCell(v, STATE_CAHPS_AVG.overall);
              return (
                <span className={`hc-cahps ${c.cls}`}>
                  <span className="pct">{v == null ? '—' : `${Math.round(v)}%`}</span>
                  {v != null && <span className="delta">{c.delta}</span>}
                </span>
              );
            })}
            bestIdx={bestOverall}
          />
          <Row
            label="Would recommend"
            cells={ranked.map((p) => {
              const v = p.metrics?.cahps_recommend;
              const c = cahpsCell(v, STATE_CAHPS_AVG.recommend);
              return (
                <span className={`hc-cahps ${c.cls}`}>
                  <span className="pct">{v == null ? '—' : `${Math.round(v)}%`}</span>
                  {v != null && <span className="delta">{c.delta}</span>}
                </span>
              );
            })}
            bestIdx={bestRec}
          />
          <Row
            label="Help for pain & symptoms"
            cells={ranked.map((p) => {
              const v = p.metrics?.cahps_pain;
              const c = cahpsCell(v, STATE_CAHPS_AVG.pain);
              return (
                <span className={`hc-cahps ${c.cls}`}>
                  <span className="pct">{v == null ? '—' : `${Math.round(v)}%`}</span>
                  {v != null && <span className="delta">{c.delta}</span>}
                </span>
              );
            })}
            bestIdx={bestPain}
          />
          <Row
            label="Communication with family"
            cells={ranked.map((p) => {
              const v = p.metrics?.cahps_comm;
              const c = cahpsCell(v, STATE_CAHPS_AVG.comm);
              return (
                <span className={`hc-cahps ${c.cls}`}>
                  <span className="pct">{v == null ? '—' : `${Math.round(v)}%`}</span>
                  {v != null && <span className="delta">{c.delta}</span>}
                </span>
              );
            })}
            bestIdx={bestComm}
          />

          {/* Section: Patterns flagged */}
          <SectionHeader label="Patterns flagged for review" />
          <Row
            label="Early live discharge rate"
            cells={ranked.map((p) => {
              const v = p.metrics?.live_discharge_pct;
              const b = liveDischargeBucket(v);
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span className={`hc-num ${b.cls}`}>{fmtPct(v)}</span>
                  {v != null && <span className={`hc-pill ${b.pill}`} style={{ marginLeft: 8 }}>{b.label}</span>}
                </span>
              );
            })}
          />
          <Row
            label="CHC / GIP utilization"
            cells={ranked.map((p) => {
              const v = p.metrics?.gip_pct;
              const b = gipBucket(v);
              const lbl = v === 0 ? 'At median' : b.label;
              const cls = v === 0 ? 'good' : b.cls;
              const pillCls = v === 0 ? 'pill-ok' : b.pill;
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span className={`hc-num ${cls}`}>{fmtPct(v)}</span>
                  {v != null && <span className={`hc-pill ${pillCls}`} style={{ marginLeft: 8 }}>{lbl}</span>}
                </span>
              );
            })}
          />

          {/* Section: Where care is delivered */}
          <SectionHeader label="Where care is delivered" />
          <Row label="% care at home" cells={ranked.map((p) => (
            <span className="hc-num">{fmtPct(p.metrics?.care_provided_home_pct, 0)}</span>
          ))} />
          <Row label="% in nursing facility" cells={ranked.map((p) => (
            <span className="hc-num">{fmtPct(p.metrics?.care_provided_nursing_pct ?? p.metrics?.care_provided_nursing_facility_pct, 0)}</span>
          ))} />
          <Row label="Inpatient hospice unit available" cells={ranked.map((p) => {
            const v = p.metrics?.inpatient_unit;
            if (v === true) return <span className="hc-pill pill-ok">Yes</span>;
            if (v === false) return <span className="hc-pill pill-neutral">No</span>;
            return <span className="hc-pill pill-neutral">—</span>;
          })} />

          {/* Section: Public record */}
          <SectionHeader label="Public record & enforcement" />
          <Row label="Public-record items (3yr)" cells={ranked.map((p) => {
            const v = p.metrics?.public_record_items ?? 0;
            const cls = v === 0 ? 'good' : v >= 3 ? 'bad' : '';
            return (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span className={`hc-num ${cls}`}>{v}</span>
                {p.metrics?.public_record_note && (
                  <span style={{ fontSize: 11, color: v >= 3 ? '#DC2626' : '#64748B', marginLeft: 8 }}>
                    {p.metrics.public_record_note}
                  </span>
                )}
              </span>
            );
          })} />
          <Row label="News mentions (12mo)" cells={ranked.map((p) => {
            const v = p.metrics?.news_mentions ?? 0;
            const note = p.metrics?.news_mentions_note;
            const isEnf = note && note.toLowerCase().includes('enforce');
            const cls = v === 0 ? 'good' : isEnf ? 'bad' : '';
            return (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span className={`hc-num ${cls}`}>{v}</span>
                {note && (
                  <span style={{ fontSize: 11, color: isEnf ? '#DC2626' : '#64748B', marginLeft: 8 }}>
                    {note}
                  </span>
                )}
              </span>
            );
          })} />

          {/* Section: Bottom line */}
          <SectionHeader label="Bottom line" />
          <Row label="Recommendation" cells={ranked.map((p) => {
            const r = recommendation(p);
            return <span className={`hc-recommend ${r.cls}`}>{r.label}</span>;
          })} />
        </div>

        {/* Action bar */}
        <div className="hc-action-bar">
          <div className="hc-action-label">// take this with you</div>
          <div className="hc-actions">
            <button className="hc-btn hc-btn-primary" onClick={handlePrint} type="button">Print this comparison</button>
            <button className="hc-btn" type="button">Download as PDF</button>
            <button className="hc-btn" type="button">Export CSV</button>
            <button className="hc-btn" type="button">Email to me</button>
            <button className="hc-btn" type="button">Share link</button>
          </div>
        </div>
      </section>

      <section className="hc-rec-summary">
        <div className="hc-rec-card">
          <div>
            <h3>What this comparison shows.</h3>
            <p>
              Hospices are ranked by a composite of CMS quality rating, family-experience scores, and patterns
              flagged in federal data. The top of the list pairs the highest CMS rating with the cleanest
              CAHPS scores and the fewest flagged patterns.
            </p>
            <p>
              When a hospice shows multiple flagged patterns — for example a high early live-discharge rate
              alongside elevated CHC/GIP utilization and public-record items — that is a signal to ask harder
              questions during the discharge meeting, not a verdict.
            </p>
          </div>
          <div>
            <h3>What this comparison does NOT show.</h3>
            <p>
              <strong>Bed availability, insurance acceptance, distance from family, language services, and
              specialty capacity</strong> (vent management, complex symptom care, pediatric hospice). These
              vary by patient and should be confirmed with each hospice directly.
            </p>
            <p className="hc-muted">
              Sourced from CMS Care Compare (refreshed monthly), CMS Hospice Item Set, OIG Exclusions Database,
              DOJ press releases, CourtListener, state AG MFCU sites, and reputable health journalism. All
              public-record items linked to their original sources.
            </p>
          </div>
        </div>
      </section>

      <section className="hc-help-block">
        <div className="hc-help-inner">
          <div className="hc-help-eyebrow">// if you've already had a concerning experience</div>
          <h2 className="hc-help-title">File a complaint with the right channel.</h2>
          <p>
            State survey agency · CMS hospice complaint · State AG Medicaid Fraud Control Unit · State
            Long-Term Care Ombudsman.
          </p>
        </div>
      </section>
    </div>
  );
}

// --- small subcomponents ----------------------------------------------------

function SectionHeader({ label }) {
  return (
    <div className="hc-row">
      <div className="hc-rlabel hc-section-label" style={{ gridColumn: '1 / -1', padding: '8px 16px', fontSize: 10, letterSpacing: '0.14em' }}>
        {label}
      </div>
    </div>
  );
}

function Row({ label, cells, bestIdx = -1 }) {
  // pad cells to 4 so layout stays stable
  const padded = [...cells];
  while (padded.length < 4) padded.push(<span style={{ color: '#94A3B8' }}>—</span>);
  return (
    <div className="hc-row">
      <div className="hc-rlabel">{label}</div>
      {padded.slice(0, 4).map((c, i) => (
        <div key={i} className={`hc-cell ${bestIdx === i ? 'hc-best' : ''}`}>{c}</div>
      ))}
    </div>
  );
}

// --- styles -----------------------------------------------------------------

const HC_CSS = `
.hospice-compare {
  --hc-navy: #1D3557;
  --hc-primary: #2B6CB0;
  --hc-primary-dark: #1D4E7E;
  --hc-amber: #D97706;
  --hc-teal: #0D9488;
  --hc-green: #059669;
  --hc-red: #DC2626;
  --hc-purple: #7C3AED;
  --hc-bg: #EDF1F7;
  --hc-bg-light: #F8FAFC;
  --hc-bg-card: #FFFFFF;
  --hc-bg-elevated: #F0F4F8;
  --hc-text: #334155;
  --hc-muted: #64748B;
  --hc-light-muted: #94A3B8;
  --hc-border: #D7E0EA;
  --hc-border-subtle: #E8EDF2;
  --hc-radius: 8px;
  --hc-radius-lg: 12px;
  --hc-shadow-sm: 0 1px 2px rgba(0,0,0,.04), 0 2px 6px rgba(29,53,87,.04);
  --hc-shadow-md: 0 1px 3px rgba(0,0,0,.05), 0 6px 16px rgba(29,53,87,.07);
  background: var(--hc-bg);
  color: var(--hc-text);
  font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

.hospice-compare a { color: inherit; text-decoration: none; }

.hospice-compare .hc-crumb {
  max-width: 1400px; margin: 0 auto; padding: 12px 32px 0;
  font-family: "JetBrains Mono", monospace; font-size: 11px;
  color: var(--hc-muted); letter-spacing: 0.04em;
}
.hospice-compare .hc-crumb a { color: var(--hc-primary); }
.hospice-compare .hc-sep { color: var(--hc-light-muted); margin: 0 8px; }

.hospice-compare .hc-page-head { max-width: 1400px; margin: 0 auto; padding: 20px 32px 0; }
.hospice-compare .hc-eyebrow {
  font-family: "JetBrains Mono", monospace; font-size: 11px;
  color: var(--hc-primary); letter-spacing: 0.16em;
  text-transform: uppercase; font-weight: 700; margin-bottom: 8px;
}
.hospice-compare .hc-title {
  font-family: "Source Serif 4", Georgia, serif;
  font-size: 36px; line-height: 1.1; color: var(--hc-navy);
  margin: 0 0 6px; font-weight: 700;
}
.hospice-compare .hc-sub { color: var(--hc-muted); margin: 0 0 20px; font-size: 15px; }
.hospice-compare .hc-sample-tag {
  font-family: "JetBrains Mono", monospace; font-size: 11px;
  color: var(--hc-amber); letter-spacing: 0.06em; text-transform: uppercase;
  font-weight: 700;
}

/* Filter bar */
.hospice-compare .hc-filter-bar {
  background: var(--hc-bg-card); border: 1px solid var(--hc-border);
  border-radius: var(--hc-radius); padding: 14px 18px; margin-bottom: 18px;
  box-shadow: var(--hc-shadow-sm);
  display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
}
.hospice-compare .hc-filter-group { display: flex; align-items: center; gap: 6px; }
.hospice-compare .hc-filter-label {
  font-family: "JetBrains Mono", monospace; font-size: 10px;
  color: var(--hc-muted); letter-spacing: 0.12em;
  text-transform: uppercase; font-weight: 700;
}
.hospice-compare .hc-filter-input,
.hospice-compare .hc-filter-select {
  background: var(--hc-bg-light); border: 1px solid var(--hc-border);
  border-radius: 6px; padding: 7px 12px; font-size: 13px;
  color: var(--hc-navy); font-family: inherit; font-weight: 600;
}
.hospice-compare .hc-filter-actions { margin-left: auto; display: flex; gap: 6px; }

.hospice-compare .hc-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 16px; border-radius: var(--hc-radius);
  font-size: 13.5px; font-weight: 600; cursor: pointer;
  transition: 120ms ease; border: 1px solid var(--hc-border);
  background: var(--hc-bg-card); color: var(--hc-text); font-family: inherit;
}
.hospice-compare .hc-btn:hover { border-color: var(--hc-primary); color: var(--hc-primary); }
.hospice-compare .hc-btn-primary {
  background: var(--hc-primary); color: #fff; border-color: var(--hc-primary);
}
.hospice-compare .hc-btn-primary:hover { background: var(--hc-primary-dark); color: #fff; }

/* Summary strip */
.hospice-compare .hc-summary-strip {
  background: var(--hc-bg-card); border: 1px solid var(--hc-border);
  border-radius: var(--hc-radius); padding: 14px 18px; margin-bottom: 18px;
  box-shadow: var(--hc-shadow-sm);
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
}
@media (max-width: 720px) { .hospice-compare .hc-summary-strip { grid-template-columns: repeat(2, 1fr); } }
.hospice-compare .hc-summary-cell .lbl {
  font-family: "JetBrains Mono", monospace; font-size: 9.5px;
  color: var(--hc-muted); letter-spacing: 0.1em;
  text-transform: uppercase; font-weight: 700; margin-bottom: 4px;
}
.hospice-compare .hc-summary-cell .val {
  font-family: "Source Serif 4", Georgia, serif; font-size: 22px;
  color: var(--hc-navy); font-weight: 700; line-height: 1;
}
.hospice-compare .hc-summary-cell .sub { font-size: 11.5px; color: var(--hc-muted); margin-top: 4px; }
.hospice-compare .hc-summary-cell.amber .val { color: var(--hc-amber); }
.hospice-compare .hc-summary-cell.red .val { color: var(--hc-red); }
.hospice-compare .hc-summary-cell.teal .val { color: var(--hc-teal); }

/* Loading / error */
.hospice-compare .hc-loading,
.hospice-compare .hc-error {
  max-width: 1400px; margin: 0 auto 12px; padding: 12px 18px;
  font-family: "JetBrains Mono", monospace; font-size: 12px;
  background: var(--hc-bg-card); border: 1px solid var(--hc-border);
  border-radius: var(--hc-radius); color: var(--hc-muted);
}
.hospice-compare .hc-error { color: var(--hc-amber); border-color: rgba(217,119,6,.3); background: rgba(217,119,6,.05); }

/* Comparison table */
.hospice-compare .hc-compare-wrap { max-width: 1400px; margin: 0 auto; padding: 0 32px; }
.hospice-compare .hc-compare-table {
  background: var(--hc-bg-card); border: 1px solid var(--hc-border);
  border-radius: var(--hc-radius-lg); box-shadow: var(--hc-shadow-md);
  overflow: hidden;
  display: grid; grid-template-columns: 220px repeat(4, 1fr); gap: 0;
}
@media (max-width: 1100px) {
  .hospice-compare .hc-compare-table { grid-template-columns: 180px repeat(4, 1fr); font-size: 12.5px; }
}
.hospice-compare .hc-row { display: contents; }

.hospice-compare .hc-rlabel,
.hospice-compare .hc-cell,
.hospice-compare .hc-fac-hdr {
  padding: 12px 16px; border-bottom: 1px solid var(--hc-border-subtle);
}
.hospice-compare .hc-rlabel {
  background: var(--hc-bg-light); border-right: 1px solid var(--hc-border-subtle);
  font-family: "JetBrains Mono", monospace; font-size: 10.5px;
  color: var(--hc-muted); letter-spacing: 0.08em; text-transform: uppercase;
  font-weight: 700; display: flex; align-items: center;
}
.hospice-compare .hc-cell {
  border-right: 1px solid var(--hc-border-subtle);
  display: flex; align-items: center;
  font-size: 13.5px; color: var(--hc-text);
}
.hospice-compare .hc-cell:last-child { border-right: 0; }
.hospice-compare .hc-section-label { background: var(--hc-navy); color: #fff; font-weight: 700; }

/* Hospice column header */
.hospice-compare .hc-fac-hdr { background: var(--hc-bg-card); padding: 18px 16px; border-bottom: 2px solid var(--hc-navy); }
.hospice-compare .hc-fac-hdr.row-label { background: var(--hc-navy); color: #fff; }
.hospice-compare .hc-fac-rank {
  font-family: "JetBrains Mono", monospace; font-size: 9.5px;
  color: var(--hc-light-muted); letter-spacing: 0.14em;
  text-transform: uppercase; margin-bottom: 4px;
}
.hospice-compare .hc-fac-name {
  font-family: "Source Serif 4", Georgia, serif; font-size: 15px;
  color: var(--hc-navy); font-weight: 700; line-height: 1.2; margin: 0 0 4px;
}
.hospice-compare .hc-fac-loc { font-size: 11.5px; color: var(--hc-muted); }
.hospice-compare .hc-fac-flags { margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap; }
.hospice-compare .hc-fac-flag {
  font-family: "JetBrains Mono", monospace; font-size: 9px;
  padding: 2px 5px; border-radius: 3px; letter-spacing: 0.06em;
  font-weight: 700; text-transform: uppercase;
}
.hospice-compare .flag-fp { background: rgba(217,119,6,.10); color: var(--hc-amber); border: 1px solid rgba(217,119,6,.3); }
.hospice-compare .flag-np { background: rgba(13,148,136,.10); color: var(--hc-teal); border: 1px solid rgba(13,148,136,.3); }
.hospice-compare .flag-pe { background: rgba(124,58,237,.10); color: var(--hc-purple); border: 1px solid rgba(124,58,237,.3); }
.hospice-compare .hc-fac-remove {
  font-family: "JetBrains Mono", monospace; font-size: 10px;
  color: var(--hc-light-muted); margin-top: 8px; cursor: pointer;
}
.hospice-compare .hc-fac-remove:hover { color: var(--hc-red); }

/* Cell value treatments */
.hospice-compare .hc-num { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 14px; color: var(--hc-navy); }
.hospice-compare .hc-num.bad  { color: var(--hc-red); }
.hospice-compare .hc-num.warn { color: var(--hc-amber); }
.hospice-compare .hc-num.good { color: var(--hc-teal); }

.hospice-compare .hc-stars { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 14px; }
.hospice-compare .hc-stars.s-low  { color: var(--hc-red); }
.hospice-compare .hc-stars.s-mid  { color: var(--hc-amber); }
.hospice-compare .hc-stars.s-high { color: var(--hc-teal); }

.hospice-compare .hc-pill {
  display: inline-block; font-family: "JetBrains Mono", monospace;
  font-size: 10px; padding: 3px 8px; border-radius: 4px;
  letter-spacing: 0.06em; font-weight: 700; text-transform: uppercase;
}
.hospice-compare .pill-flagged { background: rgba(217,119,6,.10); color: var(--hc-amber); border: 1px solid rgba(217,119,6,.3); }
.hospice-compare .pill-ok { background: rgba(13,148,136,.10); color: var(--hc-teal); border: 1px solid rgba(13,148,136,.3); }
.hospice-compare .pill-neutral { background: var(--hc-bg-elevated); color: var(--hc-muted); border: 1px solid var(--hc-border); }

.hospice-compare .hc-cahps {
  display: flex; align-items: center; gap: 6px;
  font-family: "JetBrains Mono", monospace; font-size: 12px;
}
.hospice-compare .hc-cahps .pct { font-weight: 700; }
.hospice-compare .hc-cahps .delta { font-size: 10px; color: var(--hc-muted); }
.hospice-compare .hc-cahps.below .pct { color: var(--hc-red); }
.hospice-compare .hc-cahps.above .pct { color: var(--hc-teal); }

.hospice-compare .hc-recommend {
  font-family: "JetBrains Mono", monospace; font-weight: 700;
  font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 8px 14px; border-radius: 6px; display: inline-block;
}
.hospice-compare .rec-recommend { background: rgba(13,148,136,.12); color: var(--hc-teal); border: 1px solid rgba(13,148,136,.4); }
.hospice-compare .rec-consider  { background: rgba(217,119,6,.12); color: var(--hc-amber); border: 1px solid rgba(217,119,6,.4); }
.hospice-compare .rec-avoid     { background: rgba(220,38,38,.12); color: var(--hc-red);   border: 1px solid rgba(220,38,38,.4); }

/* Best highlight */
.hospice-compare .hc-best { position: relative; }
.hospice-compare .hc-best::before {
  content: '★ best'; position: absolute; top: 4px; right: 6px;
  font-family: "JetBrains Mono", monospace; font-size: 8.5px;
  color: var(--hc-teal); font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
}

/* Action bar */
.hospice-compare .hc-action-bar {
  background: var(--hc-bg-card); border: 1px solid var(--hc-border);
  border-radius: var(--hc-radius); padding: 16px 20px; margin: 18px 0;
  box-shadow: var(--hc-shadow-sm);
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}
.hospice-compare .hc-action-label {
  font-family: "JetBrains Mono", monospace; font-size: 11px;
  color: var(--hc-muted); letter-spacing: 0.06em;
  text-transform: uppercase; font-weight: 700;
}
.hospice-compare .hc-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* Recommendation summary */
.hospice-compare .hc-rec-summary { max-width: 1400px; margin: 0 auto; padding: 24px 32px; }
.hospice-compare .hc-rec-card {
  background: var(--hc-bg-card); border: 1px solid var(--hc-border);
  border-radius: var(--hc-radius-lg); padding: 26px 32px;
  box-shadow: var(--hc-shadow-sm);
  display: grid; grid-template-columns: 1fr 1fr; gap: 32px;
}
@media (max-width: 800px) { .hospice-compare .hc-rec-card { grid-template-columns: 1fr; } }
.hospice-compare .hc-rec-card h3 {
  font-family: "Source Serif 4", Georgia, serif; font-size: 18px;
  color: var(--hc-navy); margin: 0 0 8px; font-weight: 700;
}
.hospice-compare .hc-rec-card p { color: var(--hc-text); font-size: 14px; line-height: 1.55; margin: 0 0 8px; }
.hospice-compare .hc-rec-card strong { color: var(--hc-navy); }
.hospice-compare .hc-rec-card .hc-muted { color: var(--hc-muted); font-size: 12.5px; margin-top: 12px; line-height: 1.5; }

/* Help block */
.hospice-compare .hc-help-block { background: var(--hc-navy); color: #fff; padding: 36px 32px; margin-top: 24px; }
.hospice-compare .hc-help-inner { max-width: 1400px; margin: 0 auto; }
.hospice-compare .hc-help-eyebrow {
  font-family: "JetBrains Mono", monospace; font-size: 11px;
  color: var(--hc-amber); letter-spacing: 0.18em;
  text-transform: uppercase; font-weight: 700; margin-bottom: 8px;
}
.hospice-compare .hc-help-title {
  font-family: "Source Serif 4", Georgia, serif; font-size: 22px;
  margin: 0 0 8px; font-weight: 700;
}
.hospice-compare .hc-help-block p { color: rgba(255,255,255,0.8); margin: 0; font-size: 14px; }

@media print {
  .hospice-compare .hc-filter-actions,
  .hospice-compare .hc-action-bar,
  .hospice-compare .hc-help-block { display: none; }
}
`;
