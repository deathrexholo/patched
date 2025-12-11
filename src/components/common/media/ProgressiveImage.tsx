import React, { useState, useEffect, HTMLAttributes } from 'react';
import './ProgressiveImage.css';

interface ProgressiveImageProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onLoad' | 'onError'> {
  src: string;
  placeholder?: string;
  alt: string;
  onLoad?: () => void;
  onError?: () => void;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({ 
  src, 
  placeholder, 
  alt, 
  className = '', 
  onLoad,
  onError,
  ...props 
}) => {
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '/placeholder-image.png');
  const [imageError, setImageError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setImageError(false);
    
    const img = new Image();
    
    img.onload = async () => {
      try {
        if ('caches' in window) {
          const imageCache = await caches.open('images-v1');
          
          const cachedResponse = await imageCache.match(src);
          if (!cachedResponse) {
            await imageCache.add(src);
          }
        }
        
        setImageSrc(src);
        setImageLoaded(true);
        setLoading(false);
        
        if (onLoad) {
          onLoad();
        }
      } catch (error) {
        console.warn('Failed to cache image:', error);
        setImageSrc(src);
        setImageLoaded(true);
        setLoading(false);
        
        if (onLoad) {
          onLoad();
        }
      }
    };
    
    img.onerror = () => {
      setImageError(true);
      setLoading(false);
      
      if (onError) {
        onError();
      }
    };
    
    img.src = src;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onLoad, onError]);

  const handleRetryLoad = () => {
    setImageError(false);
    setImageLoaded(false);
    setLoading(true);
    
    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setImageLoaded(true);
      setLoading(false);
    };
    img.onerror = () => {
      setImageError(true);
      setLoading(false);
    };
    img.src = src;
  };

  if (imageError) {
    return (
      <div className={`progressive-image-error ${className}`} {...props}>
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <span className="error-text">Failed to load image</span>
          <button className="retry-button" onClick={handleRetryLoad}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`progressive-image-container ${className}`} {...props}>
      {loading && (
        <div className="progressive-image-loading">
          <div className="loading-spinner"></div>
          <span className="loading-text">Loading...</span>
        </div>
      )}
      
      <img 
        src={imageSrc}
        alt={alt}
        className={`progressive-image ${imageLoaded ? 'loaded' : 'loading'} ${loading ? 'hidden' : ''}`}
        style={{
          opacity: imageLoaded ? 1 : 0.5,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
    </div>
  );
};

interface LazyProgressiveImageProps extends ProgressiveImageProps {
  threshold?: number;
  rootMargin?: string;
}

export const LazyProgressiveImage: React.FC<LazyProgressiveImageProps> = ({ 
  src, 
  placeholder, 
  alt, 
  className = '',
  threshold = 0.1,
  rootMargin = '50px',
  ...props 
}) => {
  const [inView, setInView] = useState<boolean>(false);
  const [imageRef, setImageRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!imageRef || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.unobserve(imageRef);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(imageRef);

    return () => {
      if (imageRef) {
        observer.unobserve(imageRef);
      }
    };
  }, [imageRef, threshold, rootMargin]);

  return (
    <div ref={setImageRef} className={`lazy-progressive-image ${className}`}>
      {inView ? (
        <ProgressiveImage 
          src={src}
          placeholder={placeholder}
          alt={alt}
          {...props}
        />
      ) : (
        <div className="lazy-placeholder">
          <div className="lazy-placeholder-content">
            <span>📷</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressiveImage;
