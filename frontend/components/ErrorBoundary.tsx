import React from 'react';
import Error from './Error';

type Props = { children: React.ReactNode };

type State = { error: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <Error message={this.state.error.message} />;
    }
    return this.props.children;
  }
}
