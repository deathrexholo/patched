import React, { useState, useRef, useEffect, CSSProperties } from 'react';
import { ImageOptimizer } from '../../../utils/performance/optimization';
import { TRANSPARENT_PIXEL } from '../../../utils/media/placeholderImages';
import './OptimizedImage.css';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  placeholder?: string | null;
  quality?: number;
  lazy?: boolean;
  webp?: boolean;
  responsive?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = null,
  quality = 80,
  lazy = true,
  webp = true,
  responsive = true,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(placeholder);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const getOptimizedSrc = (): string | null => {
    if (!src) return null;
    
    let optimizedSrc = src;
    
    if (responsive && width) {
      const widthNum = typeof width === 'number' ? width : parseInt(width as string);
      optimizedSrc = ImageOptimizer.getResponsiveImageUrl(optimizedSrc, widthNum, quality);
    }
    
    if (webp) {
      optimizedSrc = ImageOptimizer.getWebPUrl(optimizedSrc);
    }
    
    return optimizedSrc;
  };

  const loadImage = () => {
    const optimizedSrc = getOptimizedSrc();
    if (!optimizedSrc) return;

    const img = new Image();
    
    img.onload = () => {
      setCurrentSrc(optimizedSrc);
      setIsLoaded(true);
      setIsError(false);
      if (onLoad) onLoad();
    };
    
    img.onerror = () => {
      setIsError(true);
      if (onError) onError();
    };
    
    img.src = optimizedSrc;
  };

  useEffect(() => {
    if (!lazy) {
      loadImage();
      return;
    }

    if (!imgRef.current) return;

    observerRef.current = ImageOptimizer.createLazyLoader((target: Element) => {
      loadImage();
      observerRef.current?.unobserve(target);
    });

    observerRef.current.observe(imgRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, lazy]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const imageClasses = [
    'optimized-image',
    className,
    isLoaded ? 'loaded' : 'loading',
    isError ? 'error' : ''
  ].filter(Boolean).join(' ');

  const containerStyle: CSSProperties = {};
  if (width) containerStyle.width = typeof width === 'number' ? `${width}px` : width;
  if (height) containerStyle.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className="optimized-image-container" style={containerStyle}>
      <img
        ref={imgRef}
        src={currentSrc || TRANSPARENT_PIXEL}
        alt={alt}
        className={imageClasses}
        width={width}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        {...props}
      />
      
      {!isLoaded && !isError && (
        <div className="image-placeholder">
          <div className="image-skeleton"></div>
        </div>
      )}
      
      {isError && (
        <div className="image-error">
          <span>📷</span>
          <p>Failed to load image</p>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
