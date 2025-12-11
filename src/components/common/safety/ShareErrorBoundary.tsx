import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, X, WifiOff, LucideIcon } from 'lucide-react';
import errorHandler from '../../../utils/error/errorHandler';
import './ShareErrorBoundary.css';

type ErrorType = 'network' | 'permission' | 'rateLimit' | 'notFound' | 'unknown';

interface ShareErrorBoundaryProps {
  children: ReactNode;
  componentName?: string;
  shareContext?: Record<string, unknown>;
  onError?: (error: Error, errorInfo: ErrorInfo, errorType: ErrorType) => void;
  onRetry?: (retryCount: number) => void;
  onClose?: () => void;
  fallback?: (errorState: {
    error: Error | null;
    errorType: ErrorType | null;
    retry: () => Promise<void>;
    close: () => void;
    canRetry: boolean;
    retryCount: number;
    maxRetries: number;
  }) => ReactNode;
}

interface ShareErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: ErrorType | null;
  retryCount: number;
  isRetrying: boolean;
}

interface ErrorMessage {
  title: string;
  message: string;
  icon: LucideIcon;
  canRetry: boolean;
}

/**
 * Specialized Error Boundary for Share Components
 * Provides user-friendly error messages and retry mechanisms for share failures
 */
class ShareErrorBoundary extends Component<ShareErrorBoundaryProps, ShareErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: ShareErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorType: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ShareErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorType = this.categorizeError(error);
    
    errorHandler.logError(
      error, 
      `ShareErrorBoundary-${this.props.componentName || 'Share'}`, 
      errorType === 'network' ? 'warning' : 'error',
      {
        componentStack: errorInfo.componentStack,
        errorType: errorType as any,
        retryCount: this.state.retryCount,
        shareContext: this.props.shareContext
      }
    );

    this.setState({
      error,
      errorInfo,
      errorType
    });

    this.props.onError?.(error, errorInfo, errorType);
  }

  categorizeError(error: Error): ErrorType {
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'permission';
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return 'rateLimit';
    }
    if (message.includes('not found')) {
      return 'notFound';
    }
    
    return 'unknown';
  }

  handleRetry = async (): Promise<void> => {
    if (this.state.retryCount >= this.maxRetries) {
      return;
    }

    this.setState({ isRetrying: true });

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 5000);
    await new Promise(resolve => setTimeout(resolve, delay));

    this.setState(prevState => ({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorType: null,
      retryCount: prevState.retryCount + 1,
      isRetrying: false
    }));

    this.props.onRetry?.(this.state.retryCount + 1);
  };

  handleClose = (): void => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorType: null,
      retryCount: 0
    });
    this.props.onClose?.();
  };

  getErrorMessage(): ErrorMessage {
    const { errorType, error } = this.state;
    
    switch (errorType) {
      case 'network':
        return {
          title: 'Connection Issue',
          message: 'Unable to connect to the server. Please check your internet connection and try again.',
          icon: WifiOff,
          canRetry: true
        };
      case 'permission':
        return {
          title: 'Permission Denied',
          message: error?.message || 'You do not have permission to share this content.',
          icon: AlertCircle,
          canRetry: false
        };
      case 'rateLimit':
        return {
          title: 'Too Many Requests',
          message: 'You are sharing too frequently. Please wait a moment before trying again.',
          icon: AlertCircle,
          canRetry: true
        };
      case 'notFound':
        return {
          title: 'Content Not Found',
          message: 'The content you are trying to share no longer exists.',
          icon: AlertCircle,
          canRetry: false
        };
      default:
        return {
          title: 'Something Went Wrong',
          message: 'An unexpected error occurred while sharing. Please try again.',
          icon: AlertCircle,
          canRetry: true
        };
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const errorInfo = this.getErrorMessage();
      const IconComponent = errorInfo.icon;
      const canRetry = errorInfo.canRetry && this.state.retryCount < this.maxRetries;

      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorType: this.state.errorType,
          retry: this.handleRetry,
          close: this.handleClose,
          canRetry,
          retryCount: this.state.retryCount,
          maxRetries: this.maxRetries
        });
      }

      return (
        <div className="share-error-boundary">
          <div className="share-error-content">
            <button 
              className="share-error-close"
              onClick={this.handleClose}
              aria-label="Close error message"
            >
              <X size={20} />
            </button>

            <div className="share-error-icon">
              <IconComponent size={48} />
            </div>

            <h3 className="share-error-title">{errorInfo.title}</h3>
            <p className="share-error-message">{errorInfo.message}</p>

            {this.state.retryCount > 0 && (
              <p className="share-error-retry-count">
                Retry attempt {this.state.retryCount} of {this.maxRetries}
              </p>
            )}

            <div className="share-error-actions">
              {canRetry && (
                <button 
                  className="share-error-retry-btn"
                  onClick={this.handleRetry}
                  disabled={this.state.isRetrying}
                >
                  {this.state.isRetrying ? (
                    <>
                      <RefreshCw size={16} className="spinning" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      Try Again
                    </>
                  )}
                </button>
              )}
              
              <button 
                className="share-error-close-btn"
                onClick={this.handleClose}
              >
                Close
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="share-error-details">
                <summary>Error Details (Development)</summary>
                <pre>{this.state.error?.stack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ShareErrorBoundary;
