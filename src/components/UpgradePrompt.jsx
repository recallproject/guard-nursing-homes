import { Link } from 'react-router-dom';
import { getTierInfo } from '../hooks/useSubscription';
import '../styles/upgrade-prompt.css';

/**
 * UpgradePrompt component
 *
 * Shows an upgrade overlay/card when a feature requires a higher tier.
 *
 * Props:
 * - requiredTier: 'pro' | 'professional' | 'institutional'
 * - featureName: string describing what the feature is (e.g., "Staffing Trend Analysis")
 * - children: optional, content to show behind a blur/overlay
 */
export function UpgradePrompt({ requiredTier, featureName, children }) {
  const tierInfo = getTierInfo(requiredTier);

  return (
    <div className="upgrade-gate">
      {children && (
        <div className="upgrade-gate-blur">
          {children}
        </div>
      )}
      <div className="upgrade-prompt">
        <div className="upgrade-prompt-header">
          <h3 className="upgrade-prompt-title">{featureName}</h3>
          <span className="upgrade-prompt-tier">{tierInfo.name} Feature</span>
        </div>
        <div className="upgrade-prompt-body">
          <p className="upgrade-prompt-description">{tierInfo.description}</p>
          <div className="upgrade-prompt-price">{tierInfo.price}</div>
        </div>
        <div className="upgrade-prompt-footer">
          <Link to="/pricing" className="btn btn-primary upgrade-prompt-cta">
            Subscribe to {tierInfo.name}
          </Link>
          <p className="upgrade-prompt-hint">
            View all plan features and pricing
          </p>
        </div>
      </div>
    </div>
  );
}
