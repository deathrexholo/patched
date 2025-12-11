import React, { memo, useState, useEffect } from 'react';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import './ShareNetworkFallback.css';

interface ShareNetworkFallbackProps {
  onRetry?: () => void;
  onCancel?: () => void;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  autoRetry?: boolean;
  retryDelay?: number;
}

/**
 * Network Fallback UI for Share Components
 * Displays when network issues are detected during sharing
 */
const ShareNetworkFallback = memo<ShareNetworkFallbackProps>(({ 
  onRetry, 
  onCancel,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  autoRetry = false,
  retryDelay = 3000
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-retry countdown
  useEffect(() => {
    if (autoRetry && isOnline && retryCount < maxRetries && !isRetrying) {
      let timeLeft = Math.ceil(retryDelay / 1000);
      setCountdown(timeLeft);

      const countdownInterval = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);

        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          onRetry?.();
        }
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [autoRetry, isOnline, retryCount, maxRetries, isRetrying, retryDelay, onRetry]);

  // Auto-retry when coming back online
  useEffect(() => {
    if (isOnline && autoRetry && retryCount < maxRetries && !isRetrying) {
      const timer = setTimeout(() => {
        onRetry?.();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, autoRetry, retryCount, maxRetries, isRetrying, onRetry]);

  const canRetry = retryCount < maxRetries;

  return (
    <div className="share-network-fallback">
      <div className="share-network-content">
        <div className="share-network-icon">
          {isOnline ? (
            <AlertCircle size={48} />
          ) : (
            <WifiOff size={48} />
          )}
        </div>

        <h3 className="share-network-title">
          {isOnline ? 'Connection Issue' : 'No Internet Connection'}
        </h3>

        <p className="share-network-message">
          {isOnline 
            ? 'Unable to complete the share. The server may be temporarily unavailable.'
            : 'Please check your internet connection and try again.'
          }
        </p>

        {retryCount > 0 && (
          <p className="share-network-retry-info">
            Retry attempt {retryCount} of {maxRetries}
          </p>
        )}

        {!isOnline && (
          <div className="share-network-status">
            <div className="status-indicator offline" />
            <span>Offline</span>
          </div>
        )}

        {isOnline && countdown !== null && autoRetry && (
          <p className="share-network-countdown">
            Retrying in {countdown} second{countdown !== 1 ? 's' : ''}...
          </p>
        )}

        <div className="share-network-actions">
          {canRetry && (
            <button 
              className="share-network-retry-btn"
              onClick={onRetry}
              disabled={isRetrying || !isOnline}
            >
              {isRetrying ? (
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
            className="share-network-cancel-btn"
            onClick={onCancel}
            disabled={isRetrying}
          >
            Cancel
          </button>
        </div>

        {!canRetry && (
          <div className="share-network-max-retries">
            <AlertCircle size={16} />
            <span>Maximum retry attempts reached. Please try again later.</span>
          </div>
        )}

        <div className="share-network-tips">
          <h4>Troubleshooting Tips:</h4>
          <ul>
            <li>Check your internet connection</li>
            <li>Try refreshing the page</li>
            <li>Disable VPN if you're using one</li>
            <li>Clear your browser cache</li>
          </ul>
        </div>
      </div>
    </div>
  );
});

ShareNetworkFallback.displayName = 'ShareNetworkFallback';

export default ShareNetworkFallback;
