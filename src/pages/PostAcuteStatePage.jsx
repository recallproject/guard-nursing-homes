import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getPostAcuteSetting, STATE_NAME } from '../data/postAcuteCatalog';
import { formatMetric, formatPhone, toTitleCase } from '../utils/postAcute';
import '../styles/post-acute-setting.css';

const ROWS_PER_PAGE = 50;

export default function PostAcuteStatePage({ settingId }) {
  const setting = getPostAcuteSetting(settingId);
  const { stateCode } = useParams();
  const code = (stateCode || '').toUpperCase();
  const stateName = STATE_NAME[code];

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loadedCode, setLoadedCode] = useState('');

  useEffect(() => {
    if (!setting || !stateName) return undefined;
    let cancelled = false;
    fetch(`/data/${setting.dataDir}/states/${encodeURIComponent(code)}.json`)
      .then((r) => {
        if (!r.ok) throw new Error('not-found');
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setError(null);
        setLoadedCode(code);
        setPage(1);
        setSearch('');
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
        setError('not-found');
        setLoadedCode(code);
      });
    return () => { cancelled = true; };
  }, [setting, code, stateName]);

  const loading = loadedCode !== code;

  const filtered = useMemo(() => {
    const list = data?.providers || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const hay = `${p.name} ${p.city} ${p.zip} ${p.ccn}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageRows = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  if (!setting) return null;
  if (!stateName) return <Navigate to={setting.route} replace />;

  return (
    <>
      <Helmet>
        <title>{`${stateName} ${setting.label} | The Oversight Report`}</title>
        <meta
          name="description"
          content={`${(data?.count || 0).toLocaleString('en-US')} Medicare-certified ${setting.plural} in ${stateName}. CMS-sourced quality data from ${setting.cmsTitle}.`}
        />
        <link rel="canonical" href={`https://www.oversightreports.com${setting.route}/state/${code}`} />
      </Helmet>

      <div className="pas">
        <section className="pas-hero pas-hero-compact">
          <div className="pas-crumb">
            <Link to="/">Home</Link>
            <span className="pas-crumb-sep">/</span>
            <Link to={setting.route}>{setting.familyLabel || setting.label}</Link>
            <span className="pas-crumb-sep">/</span>
            {stateName}
          </div>
          <div className="pas-eyebrow">// {code} · {setting.short}</div>
          <h1 className="pas-state-title">{stateName} {setting.label.toLowerCase()}</h1>
          <p className="pas-hero-sub">
            {loading ? 'Loading directory…' : `${(data?.count || 0).toLocaleString('en-US')} Medicare-certified ${setting.plural}.`}
          </p>
        </section>

        <section className="pas-results">
          <div className="pas-section-inner">
            <label className="pas-filter">
              <span className="pas-filter-label">Filter this state</span>
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Name, city, ZIP, or CCN"
                aria-label={`Filter ${setting.plural} in ${stateName}`}
              />
            </label>

            {error && loadedCode === code && (
              <p className="pas-error">No {setting.label.toLowerCase()} directory found for {stateName}.</p>
            )}

            {!error && !loading && filtered.length === 0 && (
              <p>No {setting.plural} in {stateName} match that filter.</p>
            )}

            {pageRows.length > 0 && (
              <div className="pas-table-wrap">
                <table className="pas-table">
                  <thead>
                    <tr>
                      <th scope="col">Provider</th>
                      <th scope="col">City</th>
                      <th scope="col">CCN</th>
                      <th scope="col">Phone</th>
                      <th scope="col">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((p) => (
                      <tr key={p.ccn}>
                        <td>
                          <Link to={`${setting.route}/${encodeURIComponent(p.ccn)}`}>
                            {toTitleCase(p.name)}
                          </Link>
                        </td>
                        <td>{toTitleCase(p.city)}</td>
                        <td className="pas-mono">{p.ccn}</td>
                        <td className="pas-mono">{formatPhone(p.phone) || '—'}</td>
                        <td>
                          {p.quality?.patient_care_star != null || p.survey?.summary_star != null
                            ? formatMetric(p.quality?.patient_care_star ?? p.survey?.summary_star, 'stars')
                            : p.quality?.dtc_risk_standardized_pct != null
                              ? `${formatMetric(p.quality.dtc_risk_standardized_pct, 'pct')} DTC`
                              : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pageCount > 1 && (
              <div className="pas-pager">
                <button type="button" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>Previous</button>
                <span>Page {page} of {pageCount}</span>
                <button type="button" disabled={page >= pageCount} onClick={() => setPage((n) => n + 1)}>Next</button>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
