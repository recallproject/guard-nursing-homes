import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/hospice-chains.css';

const ROWS_PER_PAGE = 50;

const SORT_OPTIONS = [
  { key: 'facility_count_desc', label: 'Facility count (most first)' },
  { key: 'rating_asc', label: 'CMS rating (lowest first)' },
  { key: 'rating_desc', label: 'CMS rating (highest first)' },
  { key: 'flagged_desc', label: 'Flagged % (highest first)' },
  { key: 'name_asc', label: 'Name (A→Z)' },
];

function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-US');
}

function formatPct(n) {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toFixed(1)}%`;
}

function formatRating(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toFixed(2);
}

export default function HospiceChainsPage() {
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('facility_count_desc');
  const [page, setPage] = useState(1);

  // Plausible: list view
  useEffect(() => {
    window.plausible && window.plausible('Hospice-Chains-View');
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/hospice/chains.json')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load hospice chain data');
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setChains(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = chains;
    if (q) {
      list = list.filter((c) =>
        (c.chain_name || '').toLowerCase().includes(q) ||
        (c.norm_key || '').toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'facility_count_desc':
          return (b.facility_count || 0) - (a.facility_count || 0)
            || (a.chain_name || '').localeCompare(b.chain_name || '');
        case 'rating_asc':
          return (a.avg_cms_rating ?? 99) - (b.avg_cms_rating ?? 99);
        case 'rating_desc':
          return (b.avg_cms_rating ?? -1) - (a.avg_cms_rating ?? -1);
        case 'flagged_desc':
          return (b.flagged_pct || 0) - (a.flagged_pct || 0);
        case 'name_asc':
          return (a.chain_name || '').localeCompare(b.chain_name || '');
        default:
          return 0;
      }
    });
    return list;
  }, [chains, search, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filteredSorted.slice(startIdx, startIdx + ROWS_PER_PAGE);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
    if (val && val.length > 1) {
      window.plausible && window.plausible('Hospice-Chain-Search', {
        props: { q: val.slice(0, 40) },
      });
    }
  };

  const handleSortChange = (val) => {
    setSortKey(val);
    setPage(1);
    window.plausible && window.plausible('Hospice-Chain-Sort-Changed', {
      props: { sort: val },
    });
  };

  const totalFacilities = useMemo(
    () => chains.reduce((sum, c) => sum + (c.facility_count || 0), 0),
    [chains]
  );

  return (
    <div className="hospice-chains">
      <Helmet>
        <title>Hospice Chain Rollups | The Oversight Report</title>
        <meta
          name="description"
          content="Hospice operators with multiple Medicare-certified locations under common disclosed ownership. Aggregated CMS quality, family-experience, and pattern-flag metrics. Sourced from CMS hospice owners disclosure."
        />
        <link rel="canonical" href="https://www.oversightreports.com/hospice/chains" />
      </Helmet>

      <div className="hc-inner">
        <div className="hc-head">
          <div className="hc-eyebrow">// hospice rollups · CMS owners disclosure</div>
          <h1 className="hc-title">Hospice chain rollups.</h1>
          <p className="hc-sub">
            Hospice operators with two or more Medicare-certified locations under common
            disclosed ownership. Aggregated quality, family-experience, and pattern-flag metrics
            across each chain's member CCNs. Source: CMS hospice owners disclosure (Oct 2025).
          </p>
        </div>

        {!loading && !error && (
          <div className="hc-stats">
            <div className="hc-stat">
              <div className="hc-stat-label">Chains</div>
              <div className="hc-stat-value">{formatNumber(chains.length)}</div>
            </div>
            <div className="hc-stat">
              <div className="hc-stat-label">CCNs in rollups</div>
              <div className="hc-stat-value">{formatNumber(totalFacilities)}</div>
            </div>
            <div className="hc-stat">
              <div className="hc-stat-label">Largest chain</div>
              <div className="hc-stat-value">
                {chains[0] ? formatNumber(chains[0].facility_count) : '—'}
              </div>
            </div>
            <div className="hc-stat">
              <div className="hc-stat-label">Source date</div>
              <div className="hc-stat-value" style={{ fontSize: 18 }}>Oct 2025</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="hc-state">Loading hospice chain rollups…</div>
        )}
        {error && (
          <div className="hc-state">
            <h2>Could not load chain data</h2>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="hc-controls">
              <div className="hc-search">
                <input
                  type="text"
                  placeholder="Search chain name…"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  aria-label="Search chain name"
                />
              </div>
              <div className="hc-sortgroup">
                <label htmlFor="hc-sort">Sort:</label>
                <select
                  id="hc-sort"
                  value={sortKey}
                  onChange={(e) => handleSortChange(e.target.value)}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="hc-count">
                {formatNumber(pageRows.length)} of {formatNumber(filteredSorted.length)} chains
              </div>
            </div>

            <div className="hc-table-wrap">
              <table className="hc-table">
                <thead>
                  <tr>
                    <th className="hc-rank">#</th>
                    <th>Chain</th>
                    <th className="hc-num">Facilities</th>
                    <th className="hc-num hc-hide-mobile">States</th>
                    <th className="hc-num hc-hide-mobile">Avg CMS rating</th>
                    <th className="hc-num hc-hide-mobile">Avg HCI</th>
                    <th className="hc-num">Flagged %</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c, i) => (
                    <tr key={c.chain_slug} className="hc-row">
                      <td className="hc-rank">{startIdx + i + 1}</td>
                      <td className="hc-name">
                        <Link to={`/hospice/chain/${encodeURIComponent(c.chain_slug)}`}>
                          {c.chain_name}
                        </Link>
                        {c.is_pe_disclosed && (
                          <span className="hc-flag-pill hc-pe" title="Disclosed as private equity company on CMS owner filing">
                            PE disclosed
                          </span>
                        )}
                        {c.is_reit_disclosed && (
                          <span className="hc-flag-pill hc-reit" title="Disclosed as REIT on CMS owner filing">
                            REIT disclosed
                          </span>
                        )}
                      </td>
                      <td className="hc-num">{formatNumber(c.facility_count)}</td>
                      <td className="hc-num hc-hide-mobile">{formatNumber(c.state_count)}</td>
                      <td className="hc-num hc-hide-mobile">{formatRating(c.avg_cms_rating)}</td>
                      <td className="hc-num hc-hide-mobile">{formatRating(c.avg_hci_composite)}</td>
                      <td className="hc-num">{formatPct(c.flagged_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="hc-pager">
                <button
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Previous
                </button>
                <span className="hc-pager-info">Page {safePage} of {totalPages}</span>
                <button
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            )}

            <div className="hc-source-foot">
              Sourced from CMS hospice owners disclosure (Oct 2025) and CMS Hospice Care Compare.
              Rollups represent <strong>facilities under common disclosed ownership</strong> — based on
              filings made by enrolled hospice providers, not an independent finding of fact about
              consolidated control. Owner names normalized for grouping (e.g.{' '}
              <em>Big Org Inc</em>, <em>BIG ORG, LLC</em> = one chain). Flagged % is the share of
              member hospices with at least one CMS Hospice Care Index measure above the national
              90th percentile. Singletons (one location) are not included.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
