import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Compare page - side-by-side facility comparison
 * Placeholder for now
 */
export function ComparePage() {
  return (
    <div style={{
      paddingTop: '80px',
      paddingBottom: '4rem'
    }}>
      <div className="container-narrow">
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/" style={{ color: 'var(--teal)', fontSize: '0.9rem' }}>
            ← Back to Map
          </Link>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h1>Compare Facilities</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '1.1rem' }}>
            Side-by-side comparison feature coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
