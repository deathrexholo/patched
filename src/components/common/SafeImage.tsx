import React, { useState, useCallback, useRef, useEffect } from 'react';
import './SafeImage.css';

export interface SafeImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  placeholder?: 'avatar' | 'post' | 'custom';
  className?: string;
  onError?: (error: Event) => void;
  onLoad?: () => void;
  customPlaceholder?: string;
  loading?: 'lazy' | 'eager';
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  threshold?: number;
  rootMargin?: string;
}

interface ImageLoadingState {
  isLoading: boolean;
  hasError: boolean;
  currentSrc: string;
  fallbackUsed: boolean;
}

const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackSrc,
  placeholder = 'post',
  className = '',
  onError,
  onLoad,
  customPlaceholder,
  loading,
  width,
  height,
  style,
  threshold,
  rootMargin
}) => {
  const [loadingState, setLoadingState] = useState<ImageLoadingState>({
    isLoading: true,
    hasError: false,
    currentSrc: src,
    fallbackUsed: false
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const fallbackChain = useRef<string[]>([]);

  // Build fallback chain on mount
  useEffect(() => {
    const chain: string[] = [];

    // Only add src if it's not empty
    if (src && src.trim() !== '') {
      chain.push(src);
    }

    if (fallbackSrc && fallbackSrc.trim() !== '') {
      chain.push(fallbackSrc);
    }

    // Add local placeholder based on type
    switch (placeholder) {
      case 'avatar':
        chain.push('/assets/placeholders/default-avatar.svg');
        break;
      case 'post':
        chain.push('/assets/placeholders/default-post.svg');
        break;
      case 'custom':
        if (customPlaceholder) {
          chain.push(customPlaceholder);
        }
        break;
    }

    fallbackChain.current = chain;
  }, [src, fallbackSrc, placeholder, customPlaceholder]);

  // Reset state when src changes
  useEffect(() => {
    // If src is empty, skip directly to the first valid fallback
    if (!src || src.trim() === '') {
      const firstValidSrc = fallbackChain.current[0];
      if (firstValidSrc) {
        setLoadingState({
          isLoading: true,
          hasError: false,
          currentSrc: firstValidSrc,
          fallbackUsed: true
        });
      } else {
        // No valid fallbacks, show error state
        setLoadingState({
          isLoading: false,
          hasError: true,
          currentSrc: '',
          fallbackUsed: true
        });
      }
    } else {
      setLoadingState({
        isLoading: true,
        hasError: false,
        currentSrc: src,
        fallbackUsed: false
      });
    }
  }, [src]);

  const tryNextFallback = useCallback(() => {
    const currentIndex = fallbackChain.current.indexOf(loadingState.currentSrc);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < fallbackChain.current.length) {
      const nextSrc = fallbackChain.current[nextIndex];
      setLoadingState(prev => ({
        ...prev,
        currentSrc: nextSrc,
        fallbackUsed: nextIndex > 0,
        isLoading: true,
        hasError: false
      }));
    } else {
      // All fallbacks exhausted, show CSS placeholder
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        fallbackUsed: true
      }));
    }
  }, [loadingState.currentSrc]);

  const handleImageLoad = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      hasError: false
    }));
    onLoad?.();
  }, [onLoad]);

  // Add timeout fallback to prevent infinite spinners (5 seconds)
  useEffect(() => {
    if (!loadingState.isLoading || loadingState.hasError) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setLoadingState(prev => {
        // Only fallback if still loading (image didn't load yet)
        if (prev.isLoading && !prev.hasError) {
          return {
            ...prev,
            isLoading: false,
            hasError: true
          };
        }
        return prev;
      });
    }, 15000); // 15 second timeout - increased to handle rate-limited Google image responses (429 errors)

    return () => clearTimeout(timeoutId);
  }, [loadingState.isLoading, loadingState.hasError, loadingState.currentSrc]);

  const handleImageError = useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    onError?.(event.nativeEvent);
    tryNextFallback();
  }, [onError, tryNextFallback]);

  // If all fallbacks failed, show CSS placeholder
  if (loadingState.hasError) {
    return (
      <div 
        className={`safe-image-placeholder safe-image-placeholder--${placeholder} ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="safe-image-placeholder__content">
          {placeholder === 'avatar' && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
              <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="currentColor"/>
            </svg>
          )}
          {placeholder === 'post' && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="currentColor"/>
            </svg>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`safe-image-container ${className}`}>
      {loadingState.isLoading && (
        <div className="safe-image-loading">
          <div className="safe-image-loading__spinner"></div>
        </div>
      )}
      {loadingState.currentSrc && loadingState.currentSrc.trim() !== '' && (
        <img
          ref={imgRef}
          src={loadingState.currentSrc}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`safe-image ${loadingState.isLoading ? 'safe-image--loading' : ''}`}
          style={{
            opacity: loadingState.isLoading ? 0 : 1,
            visibility: loadingState.isLoading ? 'hidden' : 'visible',
            transition: 'opacity 0.3s ease, visibility 0.3s ease',
            ...style
          }}
          loading={loading}
          width={width}
          height={height}
          data-threshold={threshold}
          data-root-margin={rootMargin}
          crossOrigin="anonymous"
        />
      )}
    </div>
  );
};

export default SafeImage;