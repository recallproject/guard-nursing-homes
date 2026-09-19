import { Component } from 'react';
import { Link } from 'react-router-dom';

/**
 * Keeps a Favorites/compare render error from taking down the whole app
 * (the global dark "Something went wrong" screen).
 */
export class WatchlistErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('WatchlistErrorBoundary caught:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="watchlist-page">
        <div className="watchlist-error">
          <h2>Favorites could not load</h2>
          <p>Your saved homes are still on this device. Try again, or go back to the list.</p>
          <div className="watchlist-error-actions">
            <button type="button" className="btn btn-primary" onClick={() => this.setState({ hasError: false })}>
              Try again
            </button>
            <Link to="/skilled-nursing#browse-states" className="btn btn-secondary">
              Browse states
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
