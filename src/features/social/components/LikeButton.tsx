import React, { memo, useCallback, useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useSocialActions } from '@/hooks/useSocialActions';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/common/feedback/LoadingSpinner';
import { useToast } from '@/hooks/useToast';

interface LikeButtonProps {
  postId: string;
  initialLiked?: boolean;
  initialCount?: number;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  disabled?: boolean;
  className?: string;
  onLikeChange?: (liked: boolean, count: number) => void;
}

/**
 * Enhanced LikeButton component with optimistic updates and error handling
 * Uses the new useSocialActions hook for reliable like functionality
 */
const LikeButton: React.FC<LikeButtonProps> = memo(({
  postId,
  initialLiked = false,
  initialCount = 0,
  size = 'medium',
  showCount = true,
  disabled = false,
  className = '',
  onLikeChange
}) => {
  const { currentUser: user } = useAuth();
  const { showToast } = useToast();
  const { getLikeState, toggleLike, isLoading, getError, clearError, retryFailedActions } = useSocialActions();
  
  // Local state for debouncing rapid clicks
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  
  // Get current like state from the hook
  const likeState = getLikeState(postId);
  const error = getError(postId);
  const loading = isLoading(postId);

  // Initialize state on mount or when initial values change
  useEffect(() => {
    // Only initialize if the hook doesn't have state for this post yet
    if (likeState.likesCount === 0 && likeState.isLiked === false && !likeState.error) {
      // This will be handled by the hook internally when toggleLike is first called
    }
  }, [postId, initialLiked, initialCount, likeState]);

  // Notify parent component of like state changes
  useEffect(() => {
    if (onLikeChange && (likeState.likesCount > 0 || likeState.isLiked)) {
      onLikeChange(likeState.isLiked, likeState.likesCount);
    }
  }, [likeState.isLiked, likeState.likesCount, onLikeChange]);

  // Show error toast when error occurs
  useEffect(() => {
    if (error) {
      showToast('Like Failed', error, {
        type: 'error',
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: handleRetry
        }
      });
    }
  }, [error, showToast]);

  /**
   * Handle like button click with debouncing
   */
  const handleLikeClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      showToast('Sign In Required', 'Please sign in to like posts', {
        type: 'warning',
        duration: 3000
      });
      return;
    }

    if (disabled || loading) {
      return;
    }

    // Debounce rapid clicks
    const now = Date.now();
    if (now - lastClickTime < 300) {
      setClickCount(prev => prev + 1);
      setLastClickTime(now);
      return;
    }

    setClickCount(1);
    setLastClickTime(now);

    // Clear any existing errors
    if (error) {
      clearError(postId);
    }

    try {
      // Use current state from hook, fallback to initial values
      const currentLiked = likeState.isLiked || initialLiked;
      const currentCount = likeState.likesCount || initialCount;
      
      await toggleLike(postId, currentLiked, currentCount);
    } catch (err) {
      // Error is handled by the hook and will show via useEffect
      console.error('Like operation failed:', err);
    }
  }, [
    user,
    disabled,
    loading,
    error,
    postId,
    likeState.isLiked,
    likeState.likesCount,
    initialLiked,
    initialCount,
    lastClickTime,
    toggleLike,
    clearError,
    showToast
  ]);

  /**
   * Handle retry action
   */
  const handleRetry = useCallback(async () => {
    clearError(postId);
    await retryFailedActions();
  }, [postId, clearError, retryFailedActions]);

  // Determine display values
  const displayLiked = likeState.isLiked || initialLiked;
  const displayCount = likeState.likesCount || initialCount;

  // Size-based styling
  const sizeClasses = {
    small: 'like-button--small',
    medium: 'like-button--medium',
    large: 'like-button--large'
  };

  const iconSizes = {
    small: 16,
    medium: 20,
    large: 24
  };

  return (
    <button
      className={`like-button ${sizeClasses[size]} ${displayLiked ? 'like-button--liked' : ''} ${loading ? 'like-button--loading' : ''} ${error ? 'like-button--error' : ''} ${className}`}
      onClick={handleLikeClick}
      disabled={disabled || loading}
      aria-label={displayLiked ? 'Unlike this post' : 'Like this post'}
      title={
        !user 
          ? 'Sign in to like posts'
          : error 
          ? `Error: ${error}. Click to retry.`
          : displayLiked 
          ? 'Unlike this post' 
          : 'Like this post'
      }
    >
      <div className="like-button__content">
        {loading ? (
          <LoadingSpinner size="small" color={displayLiked ? 'primary' : 'secondary'} />
        ) : (
          <Heart
            size={iconSizes[size]}
            fill={displayLiked ? '#e91e63' : 'none'}
            color={displayLiked ? '#e91e63' : 'currentColor'}
            className={`like-button__icon ${displayLiked ? 'like-button__icon--liked' : ''}`}
          />
        )}
        
        {showCount && (
          <span className="like-button__count">
            {displayCount}
          </span>
        )}
        
        {/* Visual feedback for rapid clicks */}
        {clickCount > 1 && (
          <span className="like-button__click-feedback">
            +{clickCount - 1}
          </span>
        )}
      </div>
      
      {/* Error indicator */}
      {error && (
        <div className="like-button__error-indicator" />
      )}
    </button>
  );
});

LikeButton.displayName = 'LikeButton';

export default LikeButton;