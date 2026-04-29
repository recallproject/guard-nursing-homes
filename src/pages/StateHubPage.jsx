import { useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Footer from '../components/landing/Footer';
import { getStateHub } from '../data/stateHubs';
import { FACILITY_TYPES, TYPE_ORDER } from '../data/facilityTypes';
import { track } from '../utils/analytics';
import '../styles/design.css';
import '../styles/state-hub.css';

export default function StateHubPage() {
  const { stateCode } = useParams();
  const navigate = useNavigate();
  const hub = getStateHub((stateCode || '').toLowerCase());

  useEffect(() => {
    window.scrollTo(0, 0);
    if (hub) {
      window.plausible && window.plausible('State-Hub-View', { props: { state: hub.code } });
      track('state_hub_viewed', { state: hub.code });
    }
  }, [hub]);

  if (!hub) {
    return <Navigate to="/" replace />;
  }

  const handleTypeClick = (typeSlug) => {
    track('state_hub_type_click', { state: hub.code, type: typeSlug });
    if (typeSlug === 'skilled-nursing') {
      navigate(`/state/${hub.code}`);
    } else {
      navigate(`/states/${hub.slug}/${typeSlug}`);
    }
  };

  return (
    <div className="state-hub-page">
      <Helmet>
        <title>{`${hub.name} Nursing Homes, Hospice, Home Health & Rehab — The Oversight Report`}</title>
        <meta
          name="description"
          content={`Federal CMS oversight data on every ${hub.name} nursing home, hospice, home health agency, and rehab facility. Inspections, ownership, staffing, complaints. Free, no paywall.`}
        />
        <link rel="canonical" href={`https://www.oversightreports.com/states/${hub.slug}`} />
      </Helmet>

      {/* HERO */}
      <section className="state-hub-hero">
        <div className="state-hub-container">
          <div className="state-hub-eyebrow">★ {hub.eyebrow}</div>
          <h1 className="state-hub-headline">{hub.headline}</h1>
          <p className="state-hub-sub">{hub.subheadline}</p>
          <div className="state-hub-meta">
            <span><strong>{hub.totalFacilities.toLocaleString()}</strong> facilities</span>
            <span><strong>4</strong> care types</span>
            <span><strong>{hub.sourceCount}</strong> federal data sources</span>
            <span>Updated {hub.lastUpdated}</span>
          </div>
        </div>
      </section>

      <div className="state-hub-container">

        {/* NEWS CONTEXT */}
        <div className="state-hub-news">
          <div className="state-hub-news-label">{hub.newsBlock.label}</div>
          <h2 className="state-hub-news-title">{hub.newsBlock.title}</h2>
          {hub.newsBlock.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {/* FACILITY TYPES */}
        <section className="state-hub-types">
          <div className="state-hub-section-label">Browse by facility type</div>
          <h2 className="state-hub-section-title">Pick a care setting</h2>
          <p className="state-hub-section-sub">
            Each type has its own data sources, oversight rules, and reporting gaps. We show what we have, transparently.
          </p>

          <div className="state-hub-types-grid">
            {TYPE_ORDER.map((slug) => {
              const type = FACILITY_TYPES[slug];
              const count = hub.counts[slug] || 0;
              return (
                <div
                  key={slug}
                  className="state-hub-type-card"
                  data-accent={type.accentColor}
                  onClick={() => handleTypeClick(slug)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTypeClick(slug);
                    }
                  }}
                >
                  <div className="state-hub-type-header">
                    <div className="state-hub-type-name">{type.name}</div>
                    <div className="state-hub-type-count">
                      <strong>{count.toLocaleString()}</strong>
                      {slug === 'rehab-ltach' ? 'facilities' : slug === 'skilled-nursing' ? 'facilities' : 'agencies'}
                    </div>
                  </div>
                  <p className="state-hub-type-desc">{type.description}</p>
                  <div className="state-hub-type-pills">
                    {type.dataPoints.map((dp, i) => (
                      <span key={i} className="state-hub-type-pill" data-have={dp.have}>
                        {dp.label}
                      </span>
                    ))}
                  </div>
                  <span className="state-hub-type-link">
                    View {count.toLocaleString()} {hub.name} {type.name.toLowerCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* HOSPICE GAP */}
        <div className="state-hub-gap">
          <h3 className="state-hub-gap-title">{hub.hospiceGap.title}</h3>
          <p className="state-hub-gap-intro">{hub.hospiceGap.intro}</p>
          <div className="state-hub-gap-list">
            {hub.hospiceGap.items.map((item, i) => (
              <div
                key={i}
                className={`state-hub-gap-item state-hub-gap-item--${item.kind}`}
              >
                <div className="state-hub-gap-item-label">{item.label}</div>
                <div className="state-hub-gap-item-text">{item.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* METHODOLOGY */}
        <div className="state-hub-methodology">
          <h3 className="state-hub-methodology-title">Data sources</h3>
          <ul className="state-hub-methodology-list">
            {hub.methodology.map((m, i) => (
              <li key={i}>
                <strong>{m.source}</strong> — {m.detail}
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
