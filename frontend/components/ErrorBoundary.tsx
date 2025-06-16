import React from 'react';
import Error from './Error';

type Props = { children: React.ReactNode };

type State = { error: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  // Track any rendering errors encountered in child components
  state: State = { error: null };

  // Update state so the next render shows the fallback UI
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  // Log error details for debugging purposes
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <Error message={`Something went wrong: ${this.state.error.message}`} />
      );
    }
    return this.props.children;
  }
}
