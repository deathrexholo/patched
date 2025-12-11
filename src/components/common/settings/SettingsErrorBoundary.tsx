import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Settings, AlertTriangle, RefreshCw, Home } from 'lucide-react';
import './SettingsErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorId: string | null;
}

/**
 * Error Boundary specifically for Settings Menu Components
 * 
 * Provides specialized error handling for settings-related components
 * with appropriate fallback UI and recovery options.
 */
class SettingsErrorBoundary extends Component<Props, State> {
  private maxRetries = 2;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: null
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
    const errorId = `settings-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Comprehensive error loggingconsole.error('Component:', this.props.componentName || 'Unknown Settings Component');
    console.error('Error:', error);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error ID:', errorId);
    console.error('Retry Count:', this.state.retryCount);
    console.error('Props:', this.props);
    console.error('User Agent:', navigator.userAgent);
    console.error('URL:', window.location.href);
    console.error('Timestamp:', new Date().toISOString());// Log to performance error boundary if available
    if ((window as any).performanceErrorBoundary) {
      try {
        (window as any).performanceErrorBoundary.safeExecute(() => {}, null, `settings-error-${errorId}`);
      } catch (perfError) {
        console.warn('🔧 Settings Error - Performance boundary logging failed:', perfError);
      }
    }

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      try {
        // Send error to analytics or error tracking service
        fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            errorId,
            component: this.props.componentName || 'SettingsComponent',
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            retryCount: this.state.retryCount
          })
        }).catch(reportError => {
          console.error('Failed to report settings error:', reportError);
        });
      } catch (reportError) {
        console.error('Failed to report settings error:', reportError);
      }
    }
  }

  handleRetry = () => {if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        errorId: null
      }));
    } else {// Max retries reached, suggest page refresh
      if (window.confirm('Maximum retry attempts reached. Would you like to refresh the page?')) {
        window.location.reload();
      }
    }
  };

  handleReportError = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      component: this.props.componentName || 'SettingsComponent',
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount
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

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default settings-specific fallback UI
      return (
        <div className="settings-error-boundary">
          <div className="settings-error-content">
            <div className="settings-error-icon">
              <AlertTriangle size={32} />
            </div>
            <h3 className="settings-error-title">Settings Error</h3>
            <p className="settings-error-message">
              Something went wrong with the settings menu. 
              {this.props.componentName && ` (${this.props.componentName})`}
            </p>
            
            <div className="settings-error-actions">
              {this.state.retryCount < this.maxRetries ? (
                <button 
                  className="settings-retry-button"
                  onClick={this.handleRetry}
                  aria-label="Retry loading settings"
                >
                  <RefreshCw size={16} />
                  Try Again ({this.maxRetries - this.state.retryCount} left)
                </button>
              ) : (
                <button 
                  className="settings-retry-button"
                  onClick={() => window.location.reload()}
                  aria-label="Refresh page"
                >
                  <RefreshCw size={16} />
                  Refresh Page
                </button>
              )}

              <button 
                className="settings-report-button"
                onClick={this.handleReportError}
                aria-label="Report this error"
              >
                Report Issue
              </button>

              <button 
                className="settings-home-button"
                onClick={() => window.location.href = '/home'}
                aria-label="Go to home page"
              >
                <Home size={16} />
                Go Home
              </button>
            </div>

            {this.state.errorId && (
              <p className="settings-error-id">
                Error ID: {this.state.errorId}
              </p>
            )}

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="settings-error-details">
                <summary>Error Details (Development)</summary>
                <div className="settings-error-stack">
                  <strong>Error:</strong> {this.state.error?.message}
                  <br />
                  <strong>Stack:</strong>
                  <pre>{this.state.error?.stack}</pre>
                  <strong>Component Stack:</strong>
                  <pre>{this.state.errorInfo.componentStack}</pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SettingsErrorBoundary;