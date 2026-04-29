import { useEffect } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Footer from '../components/landing/Footer';
import { getStateHub } from '../data/stateHubs';
import { getTypeBySlug, FACILITY_TYPES } from '../data/facilityTypes';
import { track } from '../utils/analytics';
import '../styles/design.css';
import '../styles/state-hub.css';

export default function StateTypePage() {
  const { stateCode, typeSlug } = useParams();
  const navigate = useNavigate();
  const hub = getStateHub((stateCode || '').toLowerCase());
  const type = getTypeBySlug(typeSlug);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (hub && type) {
      window.plausible && window.plausible('State-Type-View', {
        props: { state: hub.code, type: typeSlug }
      });
      track('state_type_viewed', { state: hub.code, type: typeSlug });
    }
  }, [hub, type, typeSlug]);

  if (!hub) return <Navigate to="/" replace />;
  if (!type) return <Navigate to={`/states/${stateCode}`} replace />;

  // SNF gets routed to existing /state/CA page from the hub click handler — but if someone
  // hits this URL directly, send them there.
  if (typeSlug === 'skilled-nursing') {
    return <Navigate to={`/state/${hub.code}`} replace />;
  }

  const count = hub.counts[typeSlug] || 0;
  const unit = typeSlug === 'rehab-ltach' ? 'facilities' : 'agencies';

  return (
    <div className="state-hub-page">
      <Helmet>
        <title>{`${hub.name} ${type.name} — The Oversight Report`}</title>
        <meta
          name="description"
          content={`${count.toLocaleString()} ${type.name.toLowerCase()} ${unit} in ${hub.name}. Federal CMS data on ownership, complaints, and quality measures.`}
        />
        <link rel="canonical" href={`https://www.oversightreports.com/states/${hub.slug}/${typeSlug}`} />
      </Helmet>

      <section className="state-hub-hero">
        <div className="state-hub-container">
          <div className="state-hub-eyebrow">
            <Link to={`/states/${hub.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              ← {hub.name}
            </Link>
            {' · '}
            {type.name}
          </div>
          <h1 className="state-hub-headline">
            {count.toLocaleString()} {type.name.toLowerCase()} {unit} in {hub.name}
          </h1>
          <p className="state-hub-sub">{type.description}</p>
          <div className="state-hub-meta">
            <span><strong>{count.toLocaleString()}</strong> {unit}</span>
            <span>Source: <strong>{type.sources[0]}</strong></span>
            <span>Updated {hub.lastUpdated}</span>
          </div>
        </div>
      </section>

      <div className="state-hub-container">
        <div
          className="state-hub-gap"
          style={{ marginTop: 48 }}
        >
          <h3 className="state-hub-gap-title">Listings rolling out next</h3>
          <p className="state-hub-gap-intro">
            We have all {count.toLocaleString()} {hub.name} {type.name.toLowerCase()} {unit} in our dataset. The browsable, sortable directory for {type.name.toLowerCase()} ships next as part of the California rollout.
          </p>
          <p className="state-hub-gap-intro" style={{ marginBottom: 0 }}>
            In the meantime, see the data sources below or return to the{' '}
            <Link to={`/states/${hub.slug}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
              California hub
            </Link>
            {' '}for context on the entire post-acute landscape.
          </p>
        </div>

        <div className="state-hub-methodology">
          <h3 className="state-hub-methodology-title">Data sources for {type.name.toLowerCase()} {unit}</h3>
          <ul className="state-hub-methodology-list">
            {type.sources.map((s, i) => (
              <li key={i}><strong>{s}</strong></li>
            ))}
          </ul>
        </div>

        <div className="state-hub-methodology">
          <h3 className="state-hub-methodology-title">What we publish for {type.name.toLowerCase()}</h3>
          <ul className="state-hub-methodology-list">
            {type.dataPoints.map((dp, i) => (
              <li key={i}>
                <strong>{dp.have ? 'Available' : 'Not collected by CMS'}:</strong> {dp.label.replace(/^[★⚠✓]\s*/, '')}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Footer
        onExplore={() => navigate('/')}
        onSearch={() => navigate('/')}
      />
    </div>
  );
}
