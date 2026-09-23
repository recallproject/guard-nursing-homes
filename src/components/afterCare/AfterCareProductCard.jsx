import {
  AFTER_CARE_MERCHANT_LABEL,
  AFTER_CARE_PRIMARY_CTA,
  AFTER_CARE_SECONDARY_CTA,
  MEDICARE_BADGE_LABEL,
  MEDICARE_COVERAGE_HELPER,
} from '../../data/afterCare';
import { track } from '../../utils/analytics';

export function AfterCareProductCard({ product, surface }) {
  const badge = MEDICARE_BADGE_LABEL[product.medicareStatus];
  const merchantName = AFTER_CARE_MERCHANT_LABEL[product.merchant] || product.merchant;

  return (
    <article className="ac-card" aria-labelledby={`ac-product-${product.id}`}>
      <p className="ac-merchant">Option from {merchantName}</p>
      <h3 id={`ac-product-${product.id}`} className="ac-card-title">{product.title}</h3>
      <p className="ac-best">
        <span className="ac-kicker">Best for</span>
        {product.bestFor}
      </p>
      {product.typicalPriceLabel ? (
        <p className="ac-price">
          <span className="ac-kicker">Typical price</span>
          {product.typicalPriceLabel}
          <span className="ac-price-note"> Approximate retail. Confirm on the product page.</span>
        </p>
      ) : null}
      <p className={`ac-badge ac-badge--${product.medicareStatus}`}>
        <span className="ac-kicker">Payment</span>
        <span>{badge}</span>
      </p>
      <p className="ac-help">{MEDICARE_COVERAGE_HELPER}</p>
      {product.coverageDetail ? <p className="ac-detail">{product.coverageDetail}</p> : null}
      {product.safetyNote ? (
        <p className="ac-safety" role="note">
          <span className="ac-kicker">Safety note</span>
          {product.safetyNote}
        </p>
      ) : null}
      <div className="ac-actions">
        <a
          className="ac-btn ac-btn--primary"
          href={product.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => track('after_care_affiliate_click', {
            product_id: product.id,
            merchant: product.merchant,
            surface,
          })}
        >
          {AFTER_CARE_PRIMARY_CTA}
          <span className="ac-sr"> for {product.title}. Affiliate link, opens in a new tab.</span>
        </a>
        <a
          className="ac-btn ac-btn--secondary"
          href={product.coverageUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('after_care_medicare_click', {
            product_id: product.id,
            surface,
          })}
        >
          {AFTER_CARE_SECONDARY_CTA}
          <span className="ac-sr"> for {product.title} on Medicare.gov. Opens in a new tab.</span>
        </a>
      </div>
      <p className="ac-link-note">{merchantName} affiliate link. We may earn a commission.</p>
    </article>
  );
}
