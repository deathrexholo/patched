import React, { useState, useRef, useEffect, memo, CSSProperties } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  width?: string | number;
  height?: string | number;
  style?: CSSProperties;
}

const LazyImage: React.FC<LazyImageProps> = memo(function LazyImage({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="100%25" height="100%25" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ELoading...%3C/text%3E%3C/svg%3E',
  width,
  height,
  style = {},
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isInView, setIsInView] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    setError(false);
  };

  const handleError = () => {
    setError(true);
    setIsLoaded(false);
  };

  const getOptimizedImageUrl = (url: string): string => {
    if (!url || error) return placeholder;
    
    if (url.includes('firebasestorage.googleapis.com')) {
      if (!url.includes('alt=media')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}alt=media`;
      }
    }
    
    return url;
  };

  const imageStyle: CSSProperties = {
    ...style,
    opacity: isLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    background: error ? 'var(--bg-secondary)' : 'transparent'
  };

  return (
    <div 
      ref={imgRef}
      className={`lazy-image-container ${className}`}
      style={{ 
        width: width || '100%', 
        height: height || 'auto',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {!isLoaded && !error && (
        <img
          src={placeholder}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(2px)',
            opacity: 0.6
          }}
        />
      )}
      
      {error && (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            minHeight: '200px'
          }}
        >
          <span>Failed to load image</span>
        </div>
      )}
      
      {isInView && !error && (
        <img
          src={getOptimizedImageUrl(src)}
          alt={alt}
          style={{
            ...imageStyle,
            width: '100%',
            height: 'auto',
            objectFit: (style.objectFit as any) || 'cover'
          }}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          {...props}
        />
      )}
    </div>
  );
});

export default LazyImage;
