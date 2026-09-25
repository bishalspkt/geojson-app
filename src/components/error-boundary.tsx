import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** Shown instead of the crashed subtree; null renders nothing. */
  fallback?: ReactNode | ((reset: () => void, error: Error) => ReactNode);
  /** Where the error happened, for the console. */
  name: string;
  children: ReactNode;
}

/**
 * Keeps one broken widget (a panel, the timeline, a card) from taking the
 * whole map down with it. A chunk that failed to load (flaky network, a new
 * deploy) gets the same treatment, with a retry.
 */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[geojson.app] ${this.props.name} crashed:`, error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    const { fallback = null } = this.props;
    return typeof fallback === 'function' ? fallback(this.reset, this.state.error) : fallback;
  }
}
