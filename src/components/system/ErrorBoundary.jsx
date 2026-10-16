import { Component } from 'react';

/**
 * Catches any crash while the site renders and shows the themed error screen
 * instead of a blank page. Self-contained (CSS stars, no WebGL), so it still
 * works when the error came from the 3D scene.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, open: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('CUBYC crashed:', error, info?.componentStack);
  }

  render() {
    const { error, open } = this.state;
    if (!error) return this.props.children;
    const code = `ERR-${(String(error?.message ?? error).length * 37 + 1027).toString(16).toUpperCase()}`;
    return (
      <div className="er-page" role="alert">
        <div className="er-stars" aria-hidden="true" />
        <div className="er-stars er-stars--b" aria-hidden="true" />
        <main className="er-main">
          <div className="er-emblem" aria-hidden="true">
            <svg viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" className="er-ring" />
              <circle cx="80" cy="80" r="56" className="er-ring er-ring--dash" />
              <path d="M80 34 L122 112 H38 Z" className="er-tri" />
              <path d="M80 62 v26" className="er-mark" />
              <circle cx="80" cy="99" r="3.2" className="er-dot" />
            </svg>
          </div>
          <p className="er-kicker">
            <span>✦</span> Mission control <span>✦</span>
          </p>
          <h1 className="er-title" data-text="System malfunction">
            System malfunction
          </h1>
          <p className="er-copy">
            Something went wrong on board. The crew has been alerted — try a restart, or head back to the launch pad.
          </p>
          <p className="er-code">
            Fault code <b>{code}</b>
          </p>
          <div className="er-actions">
            <button type="button" className="er-btn er-btn--main" onClick={() => window.location.reload()}>
              Restart systems
            </button>
            <a href="/" className="er-btn">
              Return to launch pad
            </a>
          </div>
          <button type="button" className="er-details-toggle" onClick={() => this.setState({ open: !open })} aria-expanded={open}>
            {open ? 'Hide' : 'Show'} technical details
          </button>
          {open && <pre className="er-details">{String(error?.stack ?? error?.message ?? error)}</pre>}
        </main>
      </div>
    );
  }
}
