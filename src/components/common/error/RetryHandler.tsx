import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import LoadingSpinner from '../loading/LoadingSpinner';
import './RetryHandler.css';

interface RetryHandlerProps {
  onRetry: () => Promise<void>;
  error?: Error | string | null;
  maxRetries?: number;
  retryDelay?: number;
  showNetworkStatus?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  lastRetryTime: number | null;
  canRetry: boolean;
}

/**
 * Retry Handler Component
 * 
 * Provides retry functionality with exponential backoff,
 * network status awareness, and user-friendly error messages.
 */
const RetryHandler: React.FC<RetryHandlerProps> = ({
  onRetry,
  error,
  maxRetries = 3,
  retryDelay = 1000,
  showNetworkStatus = true,
  className = '',
  children
}) => {
  const { networkStatus, isGoodConnection } = useNetworkStatus();
  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    lastRetryTime: null,
    canRetry: true
  });

  // Reset retry state when error changes
  useEffect(() => {
    if (!error) {
      setRetryState({
        isRetrying: false,
        retryCount: 0,
        lastRetryTime: null,
        canRetry: true
      });
    }
  }, [error]);

  // Auto-retry when network comes back online
  useEffect(() => {
    if (error && 
        networkStatus.isOnline && 
        isGoodConnection && 
        retryState.retryCount > 0 && 
        retryState.retryCount < maxRetries &&
        !retryState.isRetrying) {
      
      // Auto-retry after a short delay when network is restored
      const timer = setTimeout(() => {
        handleRetry();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [networkStatus.isOnline, isGoodConnection, error, retryState, maxRetries]);

  const handleRetry = useCallback(async () => {
    if (retryState.isRetrying || retryState.retryCount >= maxRetries) {
      return;
    }

    setRetryState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
      lastRetryTime: Date.now()
    }));

    try {
      // Calculate exponential backoff delay
      const backoffDelay = retryDelay * Math.pow(2, retryState.retryCount);
      
      // Wait for backoff delay
      if (retryState.retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.min(backoffDelay, 10000)));
      }

      await onRetry();
      
      // Success - reset retry state
      setRetryState({
        isRetrying: false,
        retryCount: 0,
        lastRetryTime: null,
        canRetry: true
      });
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      
      setRetryState(prev => ({
        ...prev,
        isRetrying: false,
        canRetry: prev.retryCount < maxRetries
      }));
    }
  }, [onRetry, retryState, maxRetries, retryDelay]);

  const getErrorMessage = () => {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return 'An unexpected error occurred';
  };

  const getRetryButtonText = () => {
    if (retryState.isRetrying) return 'Retrying...';
    if (retryState.retryCount >= maxRetries) return 'Refresh Page';
    if (retryState.retryCount === 0) return 'Try Again';
    return `Try Again (${maxRetries - retryState.retryCount} left)`;
  };

  const handleFinalRetry = () => {
    if (retryState.retryCount >= maxRetries) {
      window.location.reload();
    } else {
      handleRetry();
    }
  };

  // If no error, render children
  if (!error) {
    return <>{children}</>;
  }

  return (
    <div className={`retry-handler ${className}`}>
      <div className="retry-content">
        <div className="error-icon-container">
          <AlertCircle className="error-icon" size={48} />
        </div>

        <h3 className="error-title">Something went wrong</h3>
        <p className="error-message">{getErrorMessage()}</p>

        {showNetworkStatus && (
          <div className="network-status">
            <div className={`network-indicator ${networkStatus.isOnline ? 'online' : 'offline'}`}>
              {networkStatus.isOnline ? (
                <Wifi size={16} />
              ) : (
                <WifiOff size={16} />
              )}
              <span>
                {networkStatus.isOnline
                  ? 'Connected'
                  : 'No internet connection'
                }
              </span>
            </div>

            {networkStatus.isOnline && !isGoodConnection && (
              <p className="connection-warning">
                Slow connection detected. Video quality may be reduced.
              </p>
            )}
          </div>
        )}

        <div className="retry-actions">
          <button
            className="retry-button"
            onClick={handleFinalRetry}
            disabled={retryState.isRetrying}
            aria-label={getRetryButtonText()}
          >
            {retryState.isRetrying ? (
              <LoadingSpinner size="small" />
            ) : (
              <RefreshCw size={16} />
            )}
            {getRetryButtonText()}
          </button>

          {retryState.retryCount > 0 && retryState.retryCount < maxRetries && (
            <p className="retry-info">
              Automatic retry in progress...
            </p>
          )}
        </div>

        {process.env.NODE_ENV === 'development' && error instanceof Error && (
          <details className="error-details">
            <summary>Error Details (Development)</summary>
            <pre className="error-stack">{error.stack}</pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default RetryHandler;