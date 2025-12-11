import React, { memo, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { generateInitials } from '../../../utils/avatar/generateInitials';
import { optimizeFirebaseImageUrl } from '../../../utils/avatar/imageOptimization';
import { getPlaceholderSVG } from '../../../utils/avatar/placeholderGenerator';
import './Avatar.css';

export interface AvatarProps {
  userId?: string;
  displayName?: string;
  photoURL?: string | null;
  variant?: 'small' | 'medium' | 'large' | 'xl';
  type?: 'user' | 'event-winner' | 'comment' | 'profile' | 'search';
  badge?: React.ReactNode;
  clickable?: boolean;
  showName?: boolean;
  fallbackInitials?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onError?: (error: Error) => void;
}

const AVATAR_SIZES: Record<string, number> = {
  small: 32,
  medium: 48,
  large: 64,
  xl: 96
};

const Avatar: React.FC<AvatarProps> = memo(function Avatar({
  userId,
  displayName = 'User',
  photoURL,
  variant = 'medium',
  type = 'user',
  badge,
  clickable = true,
  showName = false,
  fallbackInitials = true,
  className = '',
  style,
  onError
}) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(!!photoURL);

  const size = AVATAR_SIZES[variant];
  const initials = useMemo(() => generateInitials(displayName), [displayName]);

  // Optimize Firebase URLs and handle fallbacks
  const imageSource = useMemo(() => {
    if (!photoURL) return null;
    try {
      return optimizeFirebaseImageUrl(photoURL, size);
    } catch (error) {
      onError?.(error as Error);
      return null;
    }
  }, [photoURL, size, onError]);

  const placeholderSrc = useMemo(() => {
    return getPlaceholderSVG(size, size, initials || '?');
  }, [size, initials]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
    onError?.(new Error(`Failed to load avatar for ${displayName}`));
  }, [displayName, onError]);

  const handleClick = useCallback(() => {
    if (clickable && userId) {
      navigate(`/profile/${userId}`);
    }
  }, [clickable, userId, navigate]);

  const showInitials = !imageSource || imageError;
  const classes = [
    'avatar',
    `avatar--${variant}`,
    `avatar--${type}`,
    imageLoading && imageSource ? 'avatar--loading' : '',
    clickable ? 'avatar--clickable' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const wrapperStyle = {
    ...style,
    '--avatar-size': `${size}px`,
    cursor: clickable ? 'pointer' : 'default'
  } as React.CSSProperties & Record<string, string>;

  return (
    <div className={classes} style={wrapperStyle} onClick={handleClick}>
      <div className="avatar__container">
        {/* Loading spinner */}
        {imageLoading && imageSource && (
          <div className="avatar__spinner" aria-label="Loading avatar">
            <div className="spinner"></div>
          </div>
        )}

        {/* Avatar Image or Initials */}
        <div className="avatar__image-wrapper">
          {imageSource && !imageError ? (
            <img
              src={imageSource}
              alt={displayName}
              className="avatar__image"
              onLoad={handleImageLoad}
              onError={handleImageError}
              decoding="async"
              loading="lazy"
              crossOrigin="anonymous"
              draggable={false}
            />
          ) : showInitials && fallbackInitials ? (
            <div className="avatar__initials" title={displayName}>
              {initials ? (
                <span className="avatar__initials-text">{initials}</span>
              ) : (
                <span className="avatar__icon">👤</span>
              )}
            </div>
          ) : (
            <img
              src={placeholderSrc}
              alt={displayName}
              className="avatar__placeholder"
              draggable={false}
            />
          )}
        </div>

        {/* Badge (medals, status, etc.) */}
        {badge && <div className="avatar__badge">{badge}</div>}
      </div>

      {/* Display Name */}
      {showName && displayName && (
        <div className="avatar__name">{displayName}</div>
      )}
    </div>
  );
});

export default Avatar;
