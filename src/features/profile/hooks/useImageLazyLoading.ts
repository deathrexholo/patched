import { useEffect, useRef, useState } from 'react';

interface UseImageLazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
}

export const useImageLazyLoading = (
  src: string,
  options: UseImageLazyLoadingOptions = {}
) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const { threshold = 0.1, rootMargin = '50px' } = options;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (isInView && src) {
      const img = new Image();
      img.onload = () => {
        setIsLoaded(true);
        setError(null);
      };
      img.onerror = () => {
        setError('Failed to load image');
        setIsLoaded(false);
      };
      img.src = src;
    }
  }, [isInView, src]);

  return {
    imgRef,
    isLoaded,
    isInView,
    error,
    src: isInView ? src : undefined
  };
};

export const useVideoLazyLoading = (
  src: string,
  options: UseImageLazyLoadingOptions = {}
) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { threshold = 0.1, rootMargin = '50px' } = options;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (isInView && src && videoRef.current) {
      const video = videoRef.current;
      
      const handleLoadedData = () => {
        setIsLoaded(true);
        setError(null);
      };
      
      const handleError = () => {
        setError('Failed to load video');
        setIsLoaded(false);
      };

      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('error', handleError);
      
      video.src = src;
      video.load();

      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('error', handleError);
      };
    }
  }, [isInView, src]);

  return {
    videoRef,
    isLoaded,
    isInView,
    error,
    src: isInView ? src : undefined
  };
};