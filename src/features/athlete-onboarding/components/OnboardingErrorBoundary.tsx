import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
  showNavigation?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class OnboardingErrorBoundary extends Component<Props, State> {
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
    console.error('OnboardingErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external error reporting service if available
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, you would send this to an error reporting service
    // like Sentry, LogRocket, or Bugsnag
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getUserId(),
        retryCount: this.state.retryCount
      };

      // Store error in localStorage for debugging
      const existingErrors = JSON.parse(localStorage.getItem('onboarding-errors') || '[]');
      existingErrors.push(errorData);
      
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      
      localStorage.setItem('onboarding-errors', JSON.stringify(existingErrors));} catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  };

  private getUserId = (): string | null => {
    // Try to get user ID from various sources
    try {
      // Check localStorage for user data
      const userData = localStorage.getItem('user-data');
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed.uid || parsed.id || null;
      }
      
      // Check sessionStorage
      const sessionData = sessionStorage.getItem('user-data');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        return parsed.uid || parsed.id || null;
      }
      
      return null;
    } catch {
      return null;
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleReset = () => {
    // Clear onboarding data and start over
    try {
      localStorage.removeItem('athlete-onboarding-storage');
      sessionStorage.removeItem('athlete-onboarding-temp');
      
      // Navigate to sport selection
      window.location.href = '/athlete-onboarding/sport';
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
      // Fallback: reload the page
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    try {
      // Navigate to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to navigate home:', error);
      window.location.reload();
    }
  };

  private handleGoBack = () => {
    try {
      // Try to go back in history
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // Fallback to sport selection
        window.location.href = '/athlete-onboarding/sport';
      }
    } catch (error) {
      console.error('Failed to go back:', error);
      window.location.href = '/athlete-onboarding/sport';
    }
  };

  private getErrorMessage = (): string => {
    const { error } = this.state;
    
    if (!error) return 'An unexpected error occurred';
    
    // Provide user-friendly messages for common errors
    if (error.message.includes('ChunkLoadError')) {
      return 'Failed to load application resources. This might be due to a network issue or an app update.';
    }
    
    if (error.message.includes('Network')) {
      return 'Network connection error. Please check your internet connection and try again.';
    }
    
    if (error.message.includes('Firebase') || error.message.includes('auth')) {
      return 'Authentication error. Please try logging in again.';
    }
    
    if (error.message.includes('permission')) {
      return 'Permission error. You may not have access to this feature.';
    }
    
    // Generic error message
    return 'Something went wrong while setting up your athlete profile. We\'re working to fix this issue.';
  };

  private canRetry = (): boolean => {
    return this.state.retryCount < this.maxRetries && this.props.showRetry !== false;
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback component
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      // Default error UI
      return (
        <div className="onboarding-error-boundary">
          <div className="error-container">
            <div className="error-icon">
              <AlertTriangle size={48} />
            </div>
            
            <div className="error-content">
              <h1>Oops! Something went wrong</h1>
              <p className="error-message">
                {this.getErrorMessage()}
              </p>
              
              {this.state.retryCount > 0 && (
                <p className="retry-info">
                  Retry attempt {this.state.retryCount} of {this.maxRetries}
                </p>
              )}
            </div>
            
            <div className="error-actions">
              {this.canRetry() && (
                <button 
                  className="retry-button primary"
                  onClick={this.handleRetry}
                >
                  <RefreshCw size={20} />
                  Try Again
                </button>
              )}
              
              {this.props.showNavigation !== false && (
                <>
                  <button 
                    className="reset-button secondary"
                    onClick={this.handleReset}
                  >
                    <ArrowLeft size={20} />
                    Start Over
                  </button>
                  
                  <button 
                    className="home-button secondary"
                    onClick={this.handleGoHome}
                  >
                    <Home size={20} />
                    Go Home
                  </button>
                </>
              )}
            </div>
            
            {/* Debug information in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <div className="error-debug">
                  <h4>Error Message:</h4>
                  <pre>{this.state.error.message}</pre>
                  
                  <h4>Stack Trace:</h4>
                  <pre>{this.state.error.stack}</pre>
                  
                  {this.state.errorInfo && (
                    <>
                      <h4>Component Stack:</h4>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
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

export default OnboardingErrorBoundary;