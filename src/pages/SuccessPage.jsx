import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTierName } from '../hooks/useSubscription';
import '../styles/design.css';

export default function SuccessPage() {
  const navigate = useNavigate();
  const [tierName, setTierName] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);

    // Activate the subscription tier from the pending purchase
    const pending = localStorage.getItem('pending_tier');
    if (pending) {
      localStorage.setItem('subscription_tier', pending);
      localStorage.removeItem('pending_tier');
      setTierName(getTierName(pending));
    } else {
      // Fallback: check if they already have a subscription
      const existing = localStorage.getItem('subscription_tier');
      if (existing) {
        setTierName(getTierName(existing));
      } else {
        setTierName('Pro');
      }
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-deep)',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '560px',
        textAlign: 'center',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '3rem 2rem',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          color: 'var(--text-white)',
          fontSize: '2rem',
          marginBottom: '1rem',
        }}>
          Welcome to {tierName}
        </h1>
        <p style={{
          color: 'var(--text-cream)',
          fontSize: '1.1rem',
          lineHeight: 1.6,
          marginBottom: '2rem',
        }}>
          Your subscription is active. All {tierName}-tier features are now unlocked.
          We'll send a confirmation to your email.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/')}
          >
            Start Exploring
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/methodology')}
          >
            How We Score Facilities
          </button>
        </div>
      </div>
    </div>
  );
}
