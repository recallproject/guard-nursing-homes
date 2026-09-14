import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getPostAcuteSetting } from '../data/postAcuteCatalog';
import {
  formatDateYear,
  formatMetric,
  formatPhone,
  getPath,
  isValidCcn,
  sanitizeCcn,
  stateLabel,
  toTitleCase,
} from '../utils/postAcute';
import '../styles/post-acute-setting.css';

const indexCache = new Map();
const stateCache = new Map();

function StarDisplay({ value }) {
  if (value == null || Number.isNaN(Number(value))) {
    return <span className="pas-stars pas-stars-na">Not reported</span>;
  }
  const n = Number(value);
  const cls = n <= 2 ? 'low' : n < 4 ? 'mid' : 'high';
  return <span className={`pas-stars pas-stars-${cls}`}>{n.toFixed(n % 1 === 0 ? 0 : 1)} ★</span>;
}

function MetricValue({ item, provider }) {
  const raw = getPath(provider, item.key);
  if (item.format === 'stars') return <StarDisplay value={raw} />;
  const formatted = formatMetric(raw, item.format);
  if (formatted == null) return <span className="pas-muted">Not reported</span>;
  return <span className="pas-metric-val">{formatted}</span>;
}

const SERVICE_LABELS = [
  ['nursing', 'Nursing'],
  ['physical_therapy', 'Physical therapy'],
  ['occupational_therapy', 'Occupational therapy'],
  ['speech', 'Speech'],
  ['medical_social', 'Medical social work'],
  ['home_health_aide', 'Home health aide'],
];

export default function PostAcuteProviderPage({ settingId }) {
  const setting = getPostAcuteSetting(settingId);
  const { ccn: rawCcn } = useParams();
  const ccn = sanitizeCcn(rawCcn);
  const loadKey = ccn || 'invalid';
  const [provider, setProvider] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [error, setError] = useState(null);
  const [loadedCcn, setLoadedCcn] = useState('');

  useEffect(() => {
    if (!setting) return undefined;
    let cancelled = false;

    async function load() {
      if (!isValidCcn(ccn)) {
        if (!cancelled) {
          setProvider(null);
          setNearby([]);
          setError('not-found');
          setLoadedCcn(loadKey);
        }
        return;
      }
      try {
        let index = indexCache.get(setting.id);
        if (!index) {
          const idxRes = await fetch(`/data/${setting.dataDir}/index.json`);
          if (!idxRes.ok) throw new Error('index');
          index = await idxRes.json();
          indexCache.set(setting.id, index);
        }
        const entry = index.find((p) => String(p.ccn).toUpperCase() === ccn);
        if (!entry) {
          if (!cancelled) {
            setProvider(null);
            setNearby([]);
            setError('not-found');
            setLoadedCcn(loadKey);
          }
          return;
        }
        const cacheKey = `${setting.id}:${entry.state}`;
        let st = stateCache.get(cacheKey);
        if (!st) {
          const stRes = await fetch(`/data/${setting.dataDir}/states/${encodeURIComponent(entry.state)}.json`);
          if (!stRes.ok) throw new Error('state');
          st = await stRes.json();
          stateCache.set(cacheKey, st);
        }
        const match = (st.providers || []).find((p) => String(p.ccn).toUpperCase() === ccn);
        if (!match) {
          if (!cancelled) {
            setProvider(null);
            setNearby([]);
            setError('not-found');
            setLoadedCcn(loadKey);
          }
          return;
        }
        const others = (st.providers || [])
          .filter((p) => p.ccn !== match.ccn && p.city === match.city)
          .slice(0, 6);
        if (!cancelled) {
          setProvider(match);
          setNearby(others);
          setError(null);
          setLoadedCcn(loadKey);
        }
      } catch {
        if (!cancelled) {
          setProvider(null);
          setNearby([]);
          setError('load');
          setLoadedCcn(loadKey);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [setting, ccn, loadKey]);

  const loading = loadedCcn !== loadKey;
  const titleName = useMemo(() => toTitleCase(provider?.name || ''), [provider]);

  if (!setting) return null;

  if (loading) {
    return (
      <div className="pas">
        <div className="pas-state-msg">Loading {setting.singular}…</div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="pas">
        <Helmet>
          <title>{`${setting.label} not found | The Oversight Report`}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="pas-state-msg">
          <h2>We couldn&apos;t find that {setting.singular}.</h2>
          <p>CCN {ccn || rawCcn} is not in the current CMS {setting.label.toLowerCase()} file.</p>
          <Link to={setting.route} className="pas-btn">Back to {setting.label} search</Link>
        </div>
      </div>
    );
  }

  const loc = `${toTitleCase(provider.city)}, ${provider.state} ${provider.zip || ''}`.trim();
  const desc = `${titleName} in ${loc}. CMS ${setting.label.toLowerCase()} data: CCN ${provider.ccn}${provider.phone ? `, ${formatPhone(provider.phone)}` : ''}. Sourced from ${setting.cmsTitle}.`;

  return (
    <>
      <Helmet>
        <title>{`${titleName} | ${setting.label} | The Oversight Report`}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={`https://www.oversightreports.com${setting.route}/${provider.ccn}`} />
      </Helmet>

      <div className="pas">
        <div className="pas-crumb">
          <Link to="/">Home</Link>
          <span className="pas-crumb-sep">/</span>
          <Link to={setting.route}>{setting.label}</Link>
          <span className="pas-crumb-sep">/</span>
          <Link to={`${setting.route}/state/${provider.state}`}>{stateLabel(provider.state)}</Link>
          <span className="pas-crumb-sep">/</span>
          {titleName}
        </div>

        <header className="pas-provider-head">
          <div>
            <div className="pas-eyebrow">// {setting.short} · CMS Care Compare</div>
            <h1 className="pas-provider-title">{titleName}</h1>
            <p className="pas-loc">
              {toTitleCase(provider.address)}
              {provider.address ? ', ' : ''}
              {loc}
            </p>
            <p className="pas-meta">
              CCN {provider.ccn}
              {provider.phone ? ` · ${formatPhone(provider.phone)}` : ''}
              {provider.ownership_type ? ` · ${toTitleCase(provider.ownership_type)}` : ''}
              {provider.certification_date ? ` · certified ${formatDateYear(provider.certification_date) || provider.certification_date}` : ''}
              {provider.beds != null ? ` · ${provider.beds} beds` : ''}
            </p>
            {provider.quality?.patient_care_star != null && (
              <div className="pas-flag-row">
                <StarDisplay value={provider.quality.patient_care_star} />
                <span className="pas-muted">Quality of patient care</span>
              </div>
            )}
          </div>
        </header>

        {provider.services && (
          <section className="pas-section">
            <div className="pas-section-inner">
              <div className="pas-eyebrow">// services offered</div>
              <h2>What this agency reports offering.</h2>
              <ul className="pas-services">
                {SERVICE_LABELS.map(([key, label]) => (
                  <li key={key} className={provider.services[key] ? 'on' : 'off'}>
                    <span aria-hidden="true">{provider.services[key] ? '✓' : '–'}</span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {setting.metricGroups.map((group) => (
          <section key={group.title} className="pas-section">
            <div className="pas-section-inner">
              <div className="pas-eyebrow">// cms measures</div>
              <h2>{group.title}</h2>
              <div className="pas-metrics">
                {group.items.map((item) => (
                  <div key={item.key} className="pas-metric">
                    <div className="pas-metric-label">{item.label}</div>
                    <MetricValue item={item} provider={provider} />
                    {item.better && (
                      <div className="pas-metric-hint">{item.better} is better</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {nearby.length > 0 && (
          <section className="pas-section pas-section-alt">
            <div className="pas-section-inner">
              <div className="pas-eyebrow">// nearby in {toTitleCase(provider.city)}</div>
              <h2>Other {setting.plural} in this city.</h2>
              <ul className="pas-result-list">
                {nearby.map((p) => (
                  <li key={p.ccn}>
                    <Link to={`${setting.route}/${encodeURIComponent(p.ccn)}`} className="pas-result-row">
                      <span className="pas-result-name">{toTitleCase(p.name)}</span>
                      <span className="pas-result-meta">CCN {p.ccn}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="pas-method">
          <div className="pas-section-inner">
            <h3>Source</h3>
            <p>
              {setting.cmsTitle}. First-pass provider card — identity, contact, and the CMS quality fields published for this setting.
              Not a complete inspection history.
            </p>
            <p>
              <Link to={setting.route}>← All {setting.plural}</Link>
              {' · '}
              <a href={setting.catalogUrl} target="_blank" rel="noopener noreferrer">CMS dataset</a>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
