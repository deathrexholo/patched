import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import './VideoErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Error Boundary for Video Components
 * 
 * Catches JavaScript errors anywhere in the video component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */
class VideoErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('VideoErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: reportError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      // Max retries reached, suggest page refresh
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="video-error-boundary">
          <div className="error-content">
            <AlertTriangle className="error-icon" size={48} />
            <h3 className="error-title">Something went wrong</h3>
            <p className="error-message">
              {this.state.error?.message || 'An unexpected error occurred while loading the video.'}
            </p>
            
            {this.state.retryCount < this.maxRetries ? (
              <button 
                className="retry-button"
                onClick={this.handleRetry}
                aria-label="Retry loading video"
              >
                <RefreshCw size={16} />
                Try Again ({this.maxRetries - this.state.retryCount} attempts left)
              </button>
            ) : (
              <button 
                className="retry-button"
                onClick={() => window.location.reload()}
                aria-label="Refresh page"
              >
                <RefreshCw size={16} />
                Refresh Page
              </button>
            )}

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre className="error-stack">
                  {this.state.error?.stack}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default VideoErrorBoundary;