import React, { Component, ReactNode, ErrorInfo, useCallback } from 'react';
import errorHandler from '../../../utils/error/errorHandler';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  name?: string;
  logProps?: boolean;
  userFriendlyMessage?: string;
  fallback?: (error: Error | null, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: { timestamp: string } | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error with context
    const errorId = errorHandler.logError(
      error, 
      `ErrorBoundary-${this.props.name || 'Unknown'}`, 
      'critical', 
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.props.name,
        props: this.props.logProps ? this.props : undefined
      }
    );

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
  };

  handleReportError = (): void => {
    const errorDetails = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Copy error details to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        alert('Error details copied to clipboard. Please share this with support.');
      })
      .catch(() => {
        // Fallback: show error details in alert
        alert(`Error details:\n${JSON.stringify(errorDetails, null, 2)}`);
      });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h2>Oops! Something went wrong</h2>
            <p className="error-message">
              {this.props.userFriendlyMessage || 
               "We're sorry, but something unexpected happened. Please try again."}
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <div className="error-stack">
                  <strong>Error:</strong> {this.state.error?.message}
                  <br />
                  <strong>Stack:</strong>
                  <pre>{this.state.error?.stack}</pre>
                  <strong>Component Stack:</strong>
                  <pre>{this.state.errorInfo?.componentStack}</pre>
                </div>
              </details>
            )}

            <div className="error-actions">
              <button 
                className="retry-button" 
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              
              <button 
                className="report-button" 
                onClick={this.handleReportError}
              >
                Report Issue
              </button>
              
              <button 
                className="home-button" 
                onClick={() => window.location.href = '/home'}
              >
                Go Home
              </button>
            </div>

            {this.state.errorId && (
              <p className="error-id">
                Error ID: {this.state.errorId.timestamp}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for functional components
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>, 
  errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'> = {}
): React.FC<P> => {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

// Hook for manual error reporting in functional components
export const useErrorHandler = () => {
  const reportError = useCallback((error: Error, context: string, additionalData: Record<string, unknown> = {}) => {
    errorHandler.logError(error, context, 'error', additionalData);
  }, []);

  const reportCriticalError = useCallback((error: Error, context: string, additionalData: Record<string, unknown> = {}) => {
    errorHandler.logError(error, context, 'critical', additionalData);
  }, []);

  return { reportError, reportCriticalError };
};

export default ErrorBoundary;
