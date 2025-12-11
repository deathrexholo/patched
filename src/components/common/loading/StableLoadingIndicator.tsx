import React, { memo, useEffect, useState } from 'react';
import { LoadingState } from '../../../utils/performance/loadingStateManager';
import './StableLoadingIndicator.css';

interface StableLoadingIndicatorProps {
  loadingState: LoadingState;
  message?: string;
  showSpinner?: boolean;
  className?: string;
}

/**
 * Stable Loading Indicator Component
 * 
 * Provides smooth loading state transitions without flickering.
 * Uses CSS transitions and delayed state changes to prevent visual jumps.
 */
const StableLoadingIndicator: React.FC<StableLoadingIndicatorProps> = memo(({
  loadingState,
  message = 'Loading...',
  showSpinner = true,
  className = ''
}) => {
  const [displayState, setDisplayState] = useState<'hidden' | 'visible' | 'fading'>('hidden');
  const [shouldRender, setShouldRender] = useState(false);

  // Manage display state transitions to prevent flickering
  useEffect(() => {
    const isLoading = loadingState.isInitialLoad || loadingState.isLoadingMore;
    
    if (isLoading) {
      // Show loading indicator
      setShouldRender(true);
      // Small delay to prevent flickering on quick loads
      const showTimer = setTimeout(() => {
        setDisplayState('visible');
      }, 100);
      
      return () => clearTimeout(showTimer);
    } else {
      // Hide loading indicator with fade out
      setDisplayState('fading');
      const hideTimer = setTimeout(() => {
        setDisplayState('hidden');
        setShouldRender(false);
      }, 200);
      
      return () => clearTimeout(hideTimer);
    }
  }, [loadingState.isInitialLoad, loadingState.isLoadingMore]);

  // Don't render if not needed
  if (!shouldRender) {
    return null;
  }

  const getLoadingMessage = () => {
    if (loadingState.isInitialLoad) {
      return 'Loading posts...';
    }
    if (loadingState.isLoadingMore) {
      return 'Loading more posts...';
    }
    return message;
  };

  return (
    <div 
      className={`stable-loading-indicator ${displayState} ${className}`}
      role="status"
      aria-live="polite"
    >
      {showSpinner && (
        <div className="loading-spinner" aria-hidden="true">
          <div className="spinner-circle"></div>
        </div>
      )}
      <span className="loading-message">
        {getLoadingMessage()}
      </span>
    </div>
  );
});

StableLoadingIndicator.displayName = 'StableLoadingIndicator';

export default StableLoadingIndicator;