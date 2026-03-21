import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import { WatchlistProvider } from './hooks/useWatchlist';
import { trackOnce, getEntryContext } from './utils/analytics';

// Fire session_started once per browser session with entry page, referrer, and UTMs
trackOnce('session_started', getEntryContext());

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ errorInfo: info });
    console.error('React Error Boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;
      return (
        <div style={{ padding: '2rem', color: '#ef4444', background: '#0a1628', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1>Something went wrong</h1>
          {isDev ? (
            <>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#faf7f2', marginTop: '1rem' }}>
                {this.state.error?.toString()}
              </pre>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#94a3b8', marginTop: '1rem', fontSize: '0.8rem' }}>
                {this.state.error?.stack}
              </pre>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#64748b', marginTop: '1rem', fontSize: '0.75rem' }}>
                {this.state.errorInfo?.componentStack}
              </pre>
            </>
          ) : (
            <p style={{ color: '#faf7f2', marginTop: '1rem' }}>
              Please try refreshing the page. If the problem persists, contact us at contact@oversightreports.com.
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <WatchlistProvider>
            <App />
          </WatchlistProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
);
