import { useId, useState } from 'react';
import { AFTER_CARE_PRIMARY_CTA, AFTER_CARE_WHY_CTA } from '../../data/afterCare';
import { track } from '../../utils/analytics';

export function AfterCareProductCard({ pick, surface, featured = false }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const whyId = useId();
  const titleId = useId();
  const isVive = pick.kind === 'vive';
  const href = isVive ? pick.affiliateUrl : pick.coverageUrl;
  const className = `ac-card ${featured ? 'ac-card--featured' : 'ac-card--alt'}`;

  return (
    <article className={className} aria-labelledby={titleId}>
      <div className="ac-card-media">
        <p className="ac-ribbon">{pick.label}</p>
        <img
          src={pick.image}
          alt={pick.imageAlt}
          width="700"
          height="700"
          loading={featured ? 'eager' : 'lazy'}
          decoding="async"
        />
      </div>
      <div className="ac-card-body">
        <p className="ac-category">{pick.category}</p>
        <div className="ac-title-row">
          <h3 id={titleId} className="ac-card-title">{pick.title}</h3>
          <p className="ac-price">{pick.price}</p>
        </div>
        <p className="ac-copy">{pick.copy}</p>
        {pick.comfortNote ? <p className="ac-comfort">{pick.comfortNote}</p> : null}
        {pick.safetyNote ? (
          <p className="ac-safety" role="note">{pick.safetyNote}</p>
        ) : null}
        <div className="ac-pills">
          <span className="ac-pill">{pick.fit}</span>
          <span className={`ac-pill ac-pill--medicare ac-pill--${pick.medicareStatus}`}>{pick.medicareLabel}</span>
        </div>
        <div className="ac-actions">
          <a
            className="ac-btn ac-btn--primary"
            href={href}
            target="_blank"
            rel={isVive ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
            onClick={() => track(isVive ? 'after_care_affiliate_click' : 'after_care_medicare_click', {
              product_id: pick.id,
              merchant: isVive ? 'vive' : 'medicare',
              surface,
            })}
          >
            {AFTER_CARE_PRIMARY_CTA}
            <span className="ac-sr">
              {isVive
                ? ` for ${pick.title}. Affiliate link, opens in a new tab.`
                : ` for ${pick.title} on Medicare.gov. Opens in a new tab.`}
            </span>
          </a>
          <button
            type="button"
            className="ac-btn ac-btn--why"
            aria-expanded={whyOpen}
            aria-controls={whyId}
            onClick={() => setWhyOpen((open) => !open)}
          >
            {AFTER_CARE_WHY_CTA}
          </button>
        </div>
        <p id={whyId} className="ac-why" hidden={!whyOpen}>
          {pick.why}
        </p>
        <p className="ac-merchant">{pick.merchantLine}</p>
      </div>
    </article>
  );
}
