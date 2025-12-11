import React, { memo, useMemo, CSSProperties, SyntheticEvent } from 'react';
import { getPlaceholderImage } from '../../../utils/media/placeholderImages';

interface ProfileAvatarProps {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  onError?: (error: SyntheticEvent<HTMLImageElement>) => void;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = memo(function ProfileAvatar({
  src,
  alt,
  size = 32,
  className = '',
  style = {},
  onError: onErrorProp
}) {
  const imageSource = useMemo(() => {
    if (!src) {
      return getPlaceholderImage('avatar', size);
    }
    
    if (src.includes('firebasestorage.googleapis.com') && !src.includes('alt=media')) {
      const separator = src.includes('?') ? '&' : '?';
      return `${src}${separator}alt=media`;
    }
    
    return src;
  }, [src, size]);

  const imageStyle = useMemo<CSSProperties>(() => ({
    width: size,
    height: size,
    borderRadius: '50%',
    objectFit: 'cover',
    background: 'var(--bg-secondary, #f7fafc)',
    border: '1px solid var(--border-color, #e2e8f0)',
    display: 'block',
    flexShrink: 0,
    ...style
  }), [size, style]);

  const handleError = (e: SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = getPlaceholderImage('avatar', size);
    target.onerror = null;

    // Call optional onError callback
    if (onErrorProp) {
      onErrorProp(e);
    }
  };

  return (
    <img
      src={imageSource}
      alt={alt || 'Profile'}
      className={`profile-avatar ${className}`}
      style={imageStyle}
      onError={handleError}
      loading="eager"
      decoding="sync"
      draggable={false}
      crossOrigin="anonymous"
    />
  );
});

export default ProfileAvatar;
