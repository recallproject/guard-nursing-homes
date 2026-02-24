import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const tierInfo = {
  pro: {
    label: 'Pro',
    audience: 'families who want to stay informed',
  },
  professional: {
    label: 'Professional',
    audience: 'attorneys, journalists, and ombudsmen',
  },
  institutional: {
    label: 'Institutional',
    audience: 'hospitals and care coordination teams',
  },
};

export default function ComingSoonPage({ title, description, tier, features = [] }) {
  const navigate = useNavigate();
  const info = tierInfo[tier] || tierInfo.professional;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="coming-soon-page">
      <div className="coming-soon-page__inner">
        <div className="coming-soon-page__badge">{info.label} Plan — Coming Soon</div>
        <h1 className="coming-soon-page__title">{title}</h1>
        <p className="coming-soon-page__description">{description}</p>

        {features.length > 0 && (
          <div className="coming-soon-page__features">
            <h3>What you'll get</h3>
            <ul>
              {features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="coming-soon-page__reassurance">
          <p>
            <strong>Looking for a nursing home for your family?</strong> Everything you need is free — report cards,
            safety scores, staffing data, inspection history, and facility comparison.
            No account required.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/')}
          >
            Search Facilities — Free
          </button>
        </div>

        <div className="coming-soon-page__footer">
          <p>
            This tool is designed for {info.audience}.
            <br />
            <button
              className="coming-soon-page__link"
              onClick={() => navigate('/pricing')}
            >
              View all plans →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
