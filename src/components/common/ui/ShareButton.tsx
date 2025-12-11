import React, { memo, useState, useCallback, MouseEvent } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { usePostInteractions } from '../../../hooks/usePostInteractions';
import './ShareButton.css';

interface ShareButtonProps {
  postId: string;
  shareCount?: number;
  currentUserId?: string | null;
  onShare?: (postId: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * ShareButton component that matches existing like/comment button styling
 * Integrates with the social sharing system for friends, feed, and groups
 */
const ShareButton = memo<ShareButtonProps>(({ 
  postId, 
  shareCount = 0, 
  currentUserId, 
  onShare,
  disabled = false,
  size = 'medium',
  className = ''
}) => {
  const { 
    getShareState, 
    hasUserSharedPost, 
    getShareRateLimit 
  } = usePostInteractions();
  
  const [isHovered, setIsHovered] = useState(false);
  
  // Get current share state
  const shareState = getShareState(postId);
  const hasShared = hasUserSharedPost(postId, currentUserId);
  const rateLimitInfo = getShareRateLimit(currentUserId);
  
  // Determine if button should be disabled
  const isDisabled = disabled || 
                    shareState.loading || 
                    !currentUserId || 
                    rateLimitInfo.remaining === 0;

  const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    
    if (isDisabled) {
      return;
    }
    
    // Call the onShare handler which should open the share modal
    onShare?.(postId);
  }, [isDisabled, onShare, postId]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Format share count for display
  const formatShareCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  }, []);

  // Get appropriate icon based on state
  const getIcon = (): React.JSX.Element => {
    if (shareState.loading) {
      return <Loader2 size={getSizeValue()} className="spinning" />;
    }
    return <Share2 size={getSizeValue()} />;
  };

  // Get size value based on size prop
  const getSizeValue = (): number => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 24;
      default: return 20;
    }
  };

  // Build CSS classes
  const buttonClasses = [
    'action-btn',
    'share-btn',
    size,
    hasShared ? 'shared' : '',
    isDisabled ? 'disabled' : '',
    shareState.loading ? 'loading' : '',
    shareState.success ? 'success' : '',
    shareState.error ? 'error' : '',
    className
  ].filter(Boolean).join(' ');

  // Determine button title for accessibility
  const getButtonTitle = (): string => {
    if (isDisabled && rateLimitInfo.remaining === 0) {
      const resetTime = rateLimitInfo.resetTime;
      const secondsUntilReset = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 0;
      return `Rate limited. Try again in ${secondsUntilReset} seconds`;
    }
    if (shareState.loading) return 'Sharing...';
    if (shareState.error) return `Share failed: ${shareState.error}`;
    if (hasShared) return 'You have shared this post';
    return 'Share this post';
  };

  return (
    <button 
      className={buttonClasses}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={isDisabled}
      title={getButtonTitle()}
      aria-label={hasShared ? 'Shared post' : 'Share post'}
      aria-pressed={hasShared}
    >
      {getIcon()}
      <span className="share-count">
        {formatShareCount(shareCount)}
      </span>
      
      {/* Success indicator */}
      {shareState.success && (
        <div className="share-success-indicator">
          <div className="success-pulse" />
        </div>
      )}
      
      {/* Error indicator */}
      {shareState.error && (
        <div className="share-error-indicator" title={shareState.error}>
          !
        </div>
      )}
    </button>
  );
});

ShareButton.displayName = 'ShareButton';

export default ShareButton;