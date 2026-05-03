import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/hospice-chains.css';

const STATE_NAME = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin',
  WY: 'Wyoming', PR: 'Puerto Rico', VI: 'U.S. Virgin Islands',
  GU: 'Guam', MP: 'Northern Mariana Is.',
};

function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-US');
}

function formatRating(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toFixed(2);
}

function formatPct(n) {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toFixed(1)}%`;
}

export default function HospiceChainDetailPage() {
  const { slug } = useParams();
  const decodedSlug = decodeURIComponent(slug || '');

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [memberSort, setMemberSort] = useState('state_asc');
  const [pubrec, setPubrec] = useState({
    oig: 0, news: 0, doj: 0, court: 0, mfcu: 0,
    loaded: false,
  });

  // Load chain detail
  useEffect(() => {
    let cancelled = false;
    fetch(`/data/hospice/chains/${encodeURIComponent(decodedSlug)}.json`)
      .then((r) => {
        if (!r.ok) throw new Error('Chain not found');
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [decodedSlug]);

  // Plausible: detail view
  useEffect(() => {
    if (detail) {
      window.plausible && window.plausible('Hospice-Chain-Detail-View', {
        props: {
          chain: detail.chain_name,
          facilityCount: String(detail.facility_count || ''),
        },
      });
    }
  }, [detail?.chain_slug]);

  // Aggregate public-record items across member CCNs
  useEffect(() => {
    if (!detail) return;
    const ccnSet = new Set((detail.members || []).map((m) => m.ccn));
    const fetchJson = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    Promise.all([
      fetchJson('/data/hospice/oig-exclusions.json'),
      fetchJson('/data/hospice/news-feed.json'),
      fetchJson('/data/hospice/doj-actions.json'),
      fetchJson('/data/hospice/courtlistener-actions.json'),
      fetchJson('/data/hospice/mfcu-actions.json'),
    ]).then(([oig, news, doj, court, mfcu]) => {
      const sumByCcn = (feed) => {
        if (!feed || !feed.items_by_ccn) return 0;
        let total = 0;
        for (const ccn of ccnSet) {
          const arr = feed.items_by_ccn[ccn];
          if (Array.isArray(arr)) total += arr.length;
        }
        return total;
      };
      setPubrec({
        oig: sumByCcn(oig),
        news: sumByCcn(news),
        doj: sumByCcn(doj),
        court: sumByCcn(court),
        mfcu: sumByCcn(mfcu),
        loaded: true,
      });
    });
  }, [detail?.chain_slug]);

  const sortedMembers = useMemo(() => {
    if (!detail) return [];
    const list = [...(detail.members || [])];
    list.sort((a, b) => {
      switch (memberSort) {
        case 'name_asc':
          return (a.name || '~').localeCompare(b.name || '~');
        case 'state_asc':
          return ((a.state || '~~') + (a.name || '~')).localeCompare((b.state || '~~') + (b.name || '~'));
        case 'rating_asc':
          return (a.cms_overall_rating ?? 99) - (b.cms_overall_rating ?? 99);
        case 'rating_desc':
          return (b.cms_overall_rating ?? -1) - (a.cms_overall_rating ?? -1);
        case 'flagged_desc':
          return (b.flagged_count || 0) - (a.flagged_count || 0);
        default:
          return 0;
      }
    });
    return list;
  }, [detail, memberSort]);

  const handleMemberClick = (ccn, name) => {
    window.plausible && window.plausible('Hospice-Chain-Member-Click', {
      props: { ccn, chain: detail?.chain_name || '' },
    });
  };

  if (loading) {
    return (
      <div className="hospice-chain-detail">
        <div className="hc-inner">
          <div className="hc-state">Loading chain detail…</div>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="hospice-chain-detail">
        <div className="hc-inner">
          <div className="hc-state">
            <h2>Chain not found</h2>
            <p>{error || 'Could not find this hospice chain.'}</p>
            <p style={{ marginTop: 16 }}>
              <Link to="/hospice/chains">← Back to hospice chain rollups</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalPubrec = pubrec.oig + pubrec.news + pubrec.doj + pubrec.court + pubrec.mfcu;
  const stateNames = (detail.states || []).map((s) => STATE_NAME[s] || s);

  return (
    <div className="hospice-chain-detail">
      <Helmet>
        <title>{detail.chain_name} — Hospice Chain Rollup | The Oversight Report</title>
        <meta
          name="description"
          content={`${detail.chain_name}: ${detail.facility_count} Medicare-certified hospice locations across ${detail.state_count} states under common disclosed ownership. CMS quality, family-experience, and pattern-flag aggregates.`}
        />
        <link rel="canonical" href={`https://www.oversightreports.com/hospice/chain/${encodeURIComponent(detail.chain_slug)}`} />
      </Helmet>

      <div className="hc-inner">
        <div className="hc-crumb">
          <Link to="/hospice">Hospice</Link>
          <span className="hc-crumb-sep">/</span>
          <Link to="/hospice/chains">Chain rollups</Link>
          <span className="hc-crumb-sep">/</span>
          <span>{detail.chain_name}</span>
        </div>

        <div className="hc-head">
          <div className="hc-eyebrow">// chain rollup · CMS owners disclosure</div>
          <h1 className="hc-title">{detail.chain_name}</h1>
          <p className="hc-sub">
            {formatNumber(detail.facility_count)} Medicare-certified hospice locations under
            common disclosed ownership across {formatNumber(detail.state_count)}{' '}
            state{detail.state_count === 1 ? '' : 's'}.
          </p>
          <div className="hc-pills">
            {detail.is_pe_disclosed && (
              <span className="hc-flag-pill hc-pe">PE disclosed</span>
            )}
            {detail.is_reit_disclosed && (
              <span className="hc-flag-pill hc-reit">REIT disclosed</span>
            )}
            {detail.is_holding_co_disclosed && (
              <span className="hc-flag-pill">Holding co.</span>
            )}
            {detail.is_mgmt_co_disclosed && (
              <span className="hc-flag-pill">Mgmt services co.</span>
            )}
          </div>
        </div>

        <div className="hc-stats">
          <div className="hc-stat">
            <div className="hc-stat-label">Facilities</div>
            <div className="hc-stat-value">{formatNumber(detail.facility_count)}</div>
          </div>
          <div className="hc-stat">
            <div className="hc-stat-label">States</div>
            <div className="hc-stat-value">{formatNumber(detail.state_count)}</div>
          </div>
          <div className="hc-stat">
            <div className="hc-stat-label">Avg CMS rating</div>
            <div className="hc-stat-value">{formatRating(detail.avg_cms_rating)}</div>
          </div>
          <div className="hc-stat">
            <div className="hc-stat-label">Avg HCI composite</div>
            <div className="hc-stat-value">{formatRating(detail.avg_hci_composite)}</div>
          </div>
          <div className="hc-stat">
            <div className="hc-stat-label">Avg CAHPS overall</div>
            <div className="hc-stat-value">
              {detail.avg_cahps_overall != null ? `${detail.avg_cahps_overall}%` : '—'}
            </div>
          </div>
          <div className="hc-stat">
            <div className="hc-stat-label">Flagged %</div>
            <div className="hc-stat-value">{formatPct(detail.flagged_pct)}</div>
          </div>
        </div>

        <div className="hc-section">
          <h2 className="hc-section-title">Disclosure metadata</h2>
          <div className="hc-meta-grid">
            <div className="hc-meta-row">
              <span>Oldest association on file</span>
              <span>{detail.oldest_association || '—'}</span>
            </div>
            <div className="hc-meta-row">
              <span>Newest association on file</span>
              <span>{detail.newest_association || '—'}</span>
            </div>
            <div className="hc-meta-row">
              <span>Avg disclosed ownership %</span>
              <span>{detail.avg_disclosed_ownership_pct != null ? `${detail.avg_disclosed_ownership_pct}%` : '—'}</span>
            </div>
            <div className="hc-meta-row">
              <span>For-profit disclosures</span>
              <span>{formatNumber(detail.for_profit_disclosure_count)}</span>
            </div>
            <div className="hc-meta-row">
              <span>Non-profit disclosures</span>
              <span>{formatNumber(detail.non_profit_disclosure_count)}</span>
            </div>
            <div className="hc-meta-row">
              <span>Flagged member hospices</span>
              <span>{formatNumber(detail.flagged_facility_count)} of {formatNumber(detail.facility_count)}</span>
            </div>
          </div>
        </div>

        <div className="hc-section">
          <h2 className="hc-section-title">States with member hospices</h2>
          <div className="hc-state-list">
            {(detail.states || []).map((s) => (
              <span key={s} className="hc-state-chip" title={STATE_NAME[s] || s}>{s}</span>
            ))}
          </div>
        </div>

        {pubrec.loaded && totalPubrec > 0 && (
          <div className="hc-section">
            <h2 className="hc-section-title">Public-record items across this chain</h2>
            <p className="hc-sub" style={{ marginBottom: 14 }}>
              Total items in our hospice public-record feed mentioning a member CCN of this chain.
              Each item is sourced and dated. Visit a member hospice page to read the source records.
            </p>
            <div className="hc-meta-grid">
              <div className="hc-meta-row"><span>OIG exclusions</span><span>{formatNumber(pubrec.oig)}</span></div>
              <div className="hc-meta-row"><span>News articles</span><span>{formatNumber(pubrec.news)}</span></div>
              <div className="hc-meta-row"><span>DOJ actions</span><span>{formatNumber(pubrec.doj)}</span></div>
              <div className="hc-meta-row"><span>CourtListener cases</span><span>{formatNumber(pubrec.court)}</span></div>
              <div className="hc-meta-row"><span>State MFCU actions</span><span>{formatNumber(pubrec.mfcu)}</span></div>
              <div className="hc-meta-row"><span>Total</span><span>{formatNumber(totalPubrec)}</span></div>
            </div>
          </div>
        )}

        <div className="hc-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <h2 className="hc-section-title" style={{ marginBottom: 0 }}>
              Member hospices ({formatNumber(sortedMembers.length)})
            </h2>
            <div className="hc-sortgroup" style={{ fontSize: 13 }}>
              <label htmlFor="hc-member-sort" style={{ color: 'var(--hl-muted)' }}>Sort:</label>
              <select
                id="hc-member-sort"
                value={memberSort}
                onChange={(e) => setMemberSort(e.target.value)}
              >
                <option value="state_asc">State, then name</option>
                <option value="name_asc">Name (A→Z)</option>
                <option value="rating_asc">CMS rating (low first)</option>
                <option value="rating_desc">CMS rating (high first)</option>
                <option value="flagged_desc">Flagged count (high first)</option>
              </select>
            </div>
          </div>

          <div className="hc-members-wrap">
            <table className="hc-members-table">
              <thead>
                <tr>
                  <th>CCN</th>
                  <th>Name</th>
                  <th>City</th>
                  <th>State</th>
                  <th className="hc-num hc-hide-mobile">CMS</th>
                  <th className="hc-num hc-hide-mobile">HCI</th>
                  <th className="hc-num hc-hide-mobile">CAHPS</th>
                  <th className="hc-num">Flagged</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((m) => (
                  <tr key={m.ccn}>
                    <td className="hc-num" style={{ textAlign: 'left' }}>
                      <code style={{ fontSize: 12, color: 'var(--hl-muted)' }}>{m.ccn}</code>
                    </td>
                    <td className="hc-name">
                      {m.name ? (
                        <Link
                          to={`/hospice/${encodeURIComponent(m.ccn)}`}
                          onClick={() => handleMemberClick(m.ccn, m.name)}
                        >
                          {m.name}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--hl-light-muted)' }}>(directory record not found)</span>
                      )}
                    </td>
                    <td>{m.city || '—'}</td>
                    <td>{m.state || '—'}</td>
                    <td className="hc-num hc-hide-mobile">
                      {m.cms_overall_rating != null ? Number(m.cms_overall_rating).toFixed(0) : '—'}
                    </td>
                    <td className="hc-num hc-hide-mobile">
                      {m.hci_composite != null ? Number(m.hci_composite).toFixed(1) : '—'}
                    </td>
                    <td className="hc-num hc-hide-mobile">
                      {m.cahps_overall_rating_pct != null ? `${m.cahps_overall_rating_pct}%` : '—'}
                    </td>
                    <td className="hc-num">{formatNumber(m.flagged_count || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="hc-source-foot">
          Sourced from CMS hospice owners disclosure (Oct 2025) and CMS Hospice Care Compare.
          This page describes <strong>facilities under common disclosed ownership</strong> based on
          publicly filed CMS owner forms — not an independent finding of fact about consolidated
          control. Owner names normalized for grouping. Public-record counts aggregated from
          OIG LEIE, DOJ press releases, state MFCU feeds, CourtListener, and a curated
          hospice news feed; visit a member hospice page to read the source records.
          {detail.raw_owner_names_in_disclosure && detail.raw_owner_names_in_disclosure.length > 1 && (
            <>
              {' '}<br />Disclosure forms used these legal-name variants:{' '}
              <em>{detail.raw_owner_names_in_disclosure.slice(0, 8).join(' · ')}</em>
              {detail.raw_owner_names_in_disclosure.length > 8 ? ` · and ${detail.raw_owner_names_in_disclosure.length - 8} more` : ''}.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
