import React from 'react';
import Error from './Error';

type Props = { 
  children: React.ReactNode;
  fallbackRedirect?: string; // URL для перенаправления при ошибке
};

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
    
    // Проверяем, если это ошибка доступа к треду, перенаправляем
    if (error.message.includes('Thread not found or permission denied') && this.props.fallbackRedirect) {
      setTimeout(() => {
        window.location.href = this.props.fallbackRedirect!;
      }, 100);
    }
  }

  render() {
    if (this.state.error) {
      // Если это ошибка доступа к треду и есть fallbackRedirect, показываем заглушку
      if (this.state.error.message.includes('Thread not found or permission denied') && this.props.fallbackRedirect) {
        return <div className="w-full h-screen bg-background" />;
      }
      
      return (
        <Error message={`Something went wrong: ${this.state.error.message}`} />
      );
    }
    return this.props.children;
  }
}
