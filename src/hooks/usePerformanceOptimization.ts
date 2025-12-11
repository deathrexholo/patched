/**
 * Performance Optimization Hook
 * Provides utilities for component performance optimization
 */

import { useCallback, useRef, useMemo, useEffect } from 'react';

interface UsePerformanceOptimizationOptions {
  debounceMs?: number;
  throttleMs?: number;
  enableLogging?: boolean;
}

export const usePerformanceOptimization = (options: UsePerformanceOptimizationOptions = {}) => {
  const {
    debounceMs = 300,
    throttleMs = 16,
    enableLogging = process.env.NODE_ENV === 'development'
  } = options;

  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const debounceTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const throttleTimestamps = useRef<Map<string, number>>(new Map());

  // Track render performance
  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (enableLogging && renderCount.current > 1) {}
  });

  // Debounce function
  const debounce = useCallback((key: string, callback: Function, delay: number = debounceMs) => {
    const timeouts = debounceTimeouts.current;
    
    if (timeouts.has(key)) {
      clearTimeout(timeouts.get(key)!);
    }
    
    const timeout = setTimeout(() => {
      callback();
      timeouts.delete(key);
    }, delay);
    
    timeouts.set(key, timeout);
  }, [debounceMs]);

  // Throttle function
  const throttle = useCallback((key: string, callback: Function, delay: number = throttleMs) => {
    const timestamps = throttleTimestamps.current;
    const now = Date.now();
    const lastCall = timestamps.get(key) || 0;
    
    if (now - lastCall >= delay) {
      callback();
      timestamps.set(key, now);
    }
  }, [throttleMs]);

  // Memoized event handler creator
  const createOptimizedHandler = useCallback((
    handler: Function,
    type: 'debounce' | 'throttle' = 'debounce',
    key?: string
  ) => {
    const handlerKey = key || handler.name || 'anonymous';
    
    return (...args: any[]) => {
      if (type === 'debounce') {
        debounce(handlerKey, () => handler(...args));
      } else {
        throttle(handlerKey, () => handler(...args));
      }
    };
  }, [debounce, throttle]);

  // Performance stats
  const performanceStats = useMemo(() => ({
    renderCount: renderCount.current,
    averageRenderInterval: renderCount.current > 1 
      ? (Date.now() - lastRenderTime.current) / renderCount.current 
      : 0
  }), []);

  // Cleanup function
  const cleanup = useCallback(() => {
    debounceTimeouts.current.forEach(timeout => clearTimeout(timeout));
    debounceTimeouts.current.clear();
    throttleTimestamps.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    debounce,
    throttle,
    createOptimizedHandler,
    performanceStats,
    cleanup
  };
};

// Hook for intersection observer (lazy loading)
export const useIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) => {
  const observer = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Set<Element>>(new Set());

  const observe = useCallback((element: Element) => {
    if (!observer.current) {
      observer.current = new IntersectionObserver(callback, {
        rootMargin: '50px',
        threshold: 0.1,
        ...options
      });
    }
    
    observer.current.observe(element);
    elementsRef.current.add(element);
  }, [callback, options]);

  const unobserve = useCallback((element: Element) => {
    if (observer.current) {
      observer.current.unobserve(element);
      elementsRef.current.delete(element);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (observer.current) {
      observer.current.disconnect();
      elementsRef.current.clear();
    }
  }, []);

  useEffect(() => {
    return disconnect;
  }, [disconnect]);

  return { observe, unobserve, disconnect };
};

// Hook for measuring component performance
export const useComponentPerformance = (componentName: string) => {
  const startTime = useRef<number>(0);
  const renderTimes = useRef<number[]>([]);

  useEffect(() => {
    startTime.current = performance.now();
  });

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    
    renderTimes.current.push(renderTime);
    
    // Keep only last 10 render times
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(`${componentName} slow render: ${renderTime.toFixed(2)}ms`);
    }
  });

  const getAverageRenderTime = useCallback(() => {
    const times = renderTimes.current;
    return times.length > 0 
      ? times.reduce((sum, time) => sum + time, 0) / times.length 
      : 0;
  }, []);

  return {
    getAverageRenderTime,
    lastRenderTime: renderTimes.current[renderTimes.current.length - 1] || 0,
    renderCount: renderTimes.current.length
  };
};