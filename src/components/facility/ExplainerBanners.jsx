import { Link } from 'react-router-dom';
import ExplainerBanner from './ExplainerBanner';

/**
 * ExplainerBanners — auto-triggered banners based on facility data
 * Renders zero, one, or multiple banners depending on what the data shows.
 */
export default function ExplainerBanners({ facility }) {
  if (!facility) return null;

  const banners = [];

  // DANGER: Zero-RN days
  const zeroRnDays = facility.zero_rn_days ?? 0;
  if (zeroRnDays > 5) {
    banners.push(
      <ExplainerBanner key="zero-rn" variant="danger" icon="⚠️"
        title={`This facility reported ${zeroRnDays} days with no RN on duty last quarter`}>
        A Registered Nurse is the most qualified clinical professional on a nursing home floor. When there's no RN, there's no one trained to assess a sudden change in condition, catch a medication error, or make a clinical judgment in an emergency. The federal government proposed requiring 24/7 RN coverage — that rule was repealed in December 2025.
      </ExplainerBanner>
    );
  }

  // WARNING: Recent ownership change
  const ownerChangeYear = facility.ownership_change_year;
  if (ownerChangeYear && ownerChangeYear >= 2023) {
    banners.push(
      <ExplainerBanner key="ownership" variant="warning" icon="🔄"
        title={`This facility changed ownership in ${ownerChangeYear}`}
        linkText={facility.chain_name ? `See ${facility.chain_name}'s other facilities` : undefined}
        linkHref={facility.chain_name ? `/chain/${encodeURIComponent(facility.chain_name)}` : undefined}>
        When a nursing home is sold, care quality often dips during the transition — new management, new policies, sometimes new staff. Research shows that facilities acquired by private equity firms see a measurable decline in staffing levels in the first two years after acquisition.
      </ExplainerBanner>
    );
  }

  // INFO: Related-party transactions over $500K
  const rpt = facility.related_party_total ?? 0;
  if (rpt > 500000) {
    const fmtAmt = rpt >= 1000000
      ? `$${(rpt / 1000000).toFixed(1)}M`
      : `$${(rpt / 1000).toFixed(0)}K`;
    banners.push(
      <ExplainerBanner key="rpt" variant="info" icon="💰"
        title={`${fmtAmt} in related-party transactions (latest fiscal year)`}>
        This facility paid {fmtAmt} to companies owned or controlled by the same parent entity. This is legal, but it's a common way money gets extracted from facilities that receive Medicare and Medicaid funding. It means some of the money that could go to staffing, supplies, or maintenance is instead flowing to affiliated companies.
      </ExplainerBanner>
    );
  }

  // WARNING: Very high RN turnover
  const rnTurnover = facility.rn_turnover;
  if (rnTurnover && rnTurnover > 70) {
    banners.push(
      <ExplainerBanner key="turnover" variant="warning" icon="🚪"
        title={`RN turnover rate: ${rnTurnover.toFixed(0)}% — significantly above average`}>
        More than {Math.round(rnTurnover / 10) * 10 / 100 >= 0.7 ? 'two-thirds' : 'half'} of the RNs who worked here in the past year have left. High turnover means residents constantly see new faces, care plans get lost in transitions, and the staff who remain are often stretched thin covering for vacancies.
      </ExplainerBanner>
    );
  }

  if (banners.length === 0) return null;

  return <div className="eb-container">{banners}</div>;
}
