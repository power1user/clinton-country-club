// DashboardErrorBoundary — v0.11.26 (Phase 12).
//
// Class-based React error boundary that catches render-time
// exceptions in any subtree (the AdminDashboard + its tiles, in
// our case). Without this, an unhandled exception bubbles up,
// React unmounts the tree, and the underlying page background
// shows through — which is what produced the v0.11.22 black
// screen.
//
// Behavior:
//   · Catches errors via getDerivedStateFromError + componentDidCatch
//   · Logs the full error + componentStack to console so the dev
//     console immediately shows what tile threw + where in the
//     render tree
//   · Falls back to whatever the caller passes as `fallback` —
//     for the dashboard that's the existing DesktopEmptyState
//   · Stays in error mode until the consumer changes its `resetKey`
//     prop. We bump resetKey when the user toggles "Manage tiles"
//     or switches workspace, so editing the layout clears a prior
//     crash state.
//
// React only supports error boundaries as CLASS components — there
// is no hook equivalent. That's the only reason this file is
// class-based; everything else in the codebase is functional.

import React from 'react';

export default class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log loudly. Marc can paste the console output if this ever
    // fires — the componentStack is the most useful piece (points
    // at the offending tile component).
    // eslint-disable-next-line no-console
    console.error(
      '[DashboardErrorBoundary] Dashboard crashed:',
      error,
      info?.componentStack || '(no component stack)',
    );
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      // Consumer signaled "reset" — e.g. layout changed. Try again.
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}
