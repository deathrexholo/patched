import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
}

export const usePerformanceMonitoring = (componentName: string) => {
  const mountTimeRef = useRef<number>(Date.now());
  const renderStartRef = useRef<number>(Date.now());

  useEffect(() => {
    // Component mounted
    const mountTime = Date.now() - mountTimeRef.current;
    
    if (process.env.NODE_ENV === 'development') {}

    // Cleanup
    return () => {
      if (process.env.NODE_ENV === 'development') {}
    };
  }, [componentName]);

  const measureRender = () => {
    renderStartRef.current = Date.now();
  };

  const logRenderTime = () => {
    const renderTime = Date.now() - renderStartRef.current;
    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(`[Performance] ${componentName} render took ${renderTime}ms (>16ms)`);
    }
  };

  return { measureRender, logRenderTime };
};

export const useMemoryMonitoring = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
      const logMemoryUsage = () => {
        const memory = (performance as any).memory;};

      const interval = setInterval(logMemoryUsage, 30000); // Log every 30 seconds
      return () => clearInterval(interval);
    }
  }, []);
};

export const useIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) => {
  const targetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });

    if (targetRef.current) {
      observer.observe(targetRef.current);
    }

    return () => observer.disconnect();
  }, [callback, options]);

  return targetRef;
};