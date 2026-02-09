/**
 * ErrorBoundary
 *
 * React class component that catches rendering errors and shows fallback UI.
 * Provides "Try Again" and "Return to Dashboard" recovery options.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="mx-auto max-w-lg rounded-card border border-stitch-red bg-old-lace p-gutter-xl text-center"
        >
          <h2 className="font-headline text-xl font-bold text-stitch-red">
            Something went wrong
          </h2>
          {this.state.error && (
            <p className="mt-gutter text-sm text-ink">{this.state.error.message}</p>
          )}
          <div className="mt-gutter-lg flex items-center justify-center gap-gutter">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-button bg-ballpark px-4 py-2 text-sm font-medium text-old-lace hover:opacity-90"
            >
              Try Again
            </button>
            <a
              href="/"
              className="rounded-button border border-sandstone px-4 py-2 text-sm font-medium text-ink hover:bg-sandstone/20"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
