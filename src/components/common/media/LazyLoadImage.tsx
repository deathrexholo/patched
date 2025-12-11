import React, { useState, useRef, useEffect, CSSProperties, MouseEvent } from 'react';
import { createPlaceholderUrl } from '../../../utils/placeholderUtils';

interface LazyLoadImageProps {
  src: string;
  alt?: string;
  className?: string;
  width?: string | number;
  height?: string | number;
  placeholder?: string | null;
  fallback?: string;
  quality?: number;
  webp?: boolean;
  responsive?: boolean;
  threshold?: number;
  rootMargin?: string;
  style?: CSSProperties;
  onClick?: (event: MouseEvent<HTMLImageElement>) => void;
}

const LazyLoadImage: React.FC<LazyLoadImageProps> = ({
  src,
  alt = '',
  className = '',
  width,
  height,
  placeholder = null,
  fallback = createPlaceholderUrl(400, 300, 'post', 'Image Not Found'),
  quality = 85,
  webp = true,
  responsive = true,
  threshold = 0.1,
  rootMargin = '50px',
  style = {},
  onClick,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isInView, setIsInView] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [imageSrc, setImageSrc] = useState<string | null>(placeholder);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const getOptimizedSrc = (originalSrc: string, useWebP: boolean = false): string => {
    if (!originalSrc) return fallback;
    
    if (originalSrc.startsWith('data:') || originalSrc.startsWith('blob:')) {
      return originalSrc;
    }

    return originalSrc;
  };

  useEffect(() => {
    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (!isInView || isLoaded) return;

    const img = new Image();
    
    const handleLoad = () => {
      setImageSrc(getOptimizedSrc(src, webp));
      setIsLoaded(true);
      setHasError(false);
    };

    const handleError = () => {
      setHasError(true);
      setImageSrc(fallback);
      setIsLoaded(true);
    };

    img.onload = handleLoad;
    img.onerror = handleError;

    if (webp && supportsWebP()) {
      img.src = getOptimizedSrc(src, true);
    } else {
      img.src = getOptimizedSrc(src, false);
    }

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isInView, src, webp, fallback, isLoaded]);

  const supportsWebP = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  };

  const getResponsiveStyles = (): CSSProperties => {
    const baseStyles: CSSProperties = {
      display: 'block',
      transition: 'opacity 0.3s ease, filter 0.3s ease',
      ...style
    };

    if (responsive) {
      baseStyles.width = '100%';
      baseStyles.height = 'auto';
    } else if (width || height) {
      if (width) baseStyles.width = typeof width === 'number' ? `${width}px` : width;
      if (height) baseStyles.height = typeof height === 'number' ? `${height}px` : height;
    }

    return baseStyles;
  };

  const renderSkeleton = () => (
    <div
      ref={imgRef}
      className={`lazy-image-skeleton ${className}`}
      style={{
        ...getResponsiveStyles(),
        background: 'var(--skeleton-color, #e2e8f0)',
        borderRadius: '8px',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite alternate',
        minHeight: height || '200px'
      }}
      aria-label="Loading image..."
    />
  );

  const renderLoading = () => (
    <img
      ref={imgRef}
      src={placeholder || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlOGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+'}
      alt={alt}
      className={`lazy-image-loading ${className}`}
      style={{
        ...getResponsiveStyles(),
        filter: 'blur(5px)',
        opacity: 0.7
      }}
      onClick={onClick}
      {...props}
    />
  );

  const renderImage = () => (
    <img
      ref={imgRef}
      src={imageSrc || undefined}
      alt={alt}
      className={`lazy-image-loaded ${className} ${hasError ? 'error' : ''}`}
      style={{
        ...getResponsiveStyles(),
        opacity: isLoaded ? 1 : 0,
        filter: isLoaded ? 'none' : 'blur(5px)'
      }}
      onClick={onClick}
      {...props}
    />
  );

  if (!isInView) {
    return renderSkeleton();
  }

  if (!isLoaded) {
    return renderLoading();
  }

  return renderImage();
};

export default LazyLoadImage;
