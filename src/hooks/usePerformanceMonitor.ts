import { useEffect, useRef, useCallback, useState } from 'react';
import { usePerformanceStore } from '../store/performanceStore';
import { renderTracker } from '../utils/performance/RenderTracker';
import { performanceTimer } from '../utils/performance/PerformanceTimer';
import { performanceMonitoringUtils } from '../utils/performance/PerformanceMonitoringUtils';

// Performance tracker implementation using the new utilities
const PerformanceTracker = {
  trackComponentMount: (name: string) => {
    renderTracker.trackRender(name, () => null, undefined, undefined, 'mount');
  },
  trackComponentUnmount: (name: string) => {
    renderTracker.trackRender(name, () => null, undefined, undefined, 'unmount');
  },
  measureRender: (name: string, fn: () => any) => {
    return performanceTimer.measure(name, fn, 'component').result;
  },
  measureApiCall: async <T>(fn: () => Promise<T>, endpoint: string) => {
    const result = await performanceTimer.measureAsync(endpoint, fn, 'api');
    return result.result;
  },
  getComponentMetrics: () => {
    const stats = renderTracker.getAllRenderStats();
    const renderInfos = Array.from(stats.values());
    
    if (renderInfos.length === 0) {
      return {
        totalRenders: 0,
        averageRenderTime: 0,
        slowestRender: 0,
        fastestRender: 0
      };
    }

    const totalRenders = renderInfos.reduce((sum, info) => sum + info.renderCount, 0);
    const totalTime = renderInfos.reduce((sum, info) => sum + info.totalRenderTime, 0);
    const renderTimes = renderInfos.map(info => info.averageRenderTime);

    return {
      totalRenders,
      averageRenderTime: totalTime / totalRenders,
      slowestRender: Math.max(...renderTimes),
      fastestRender: Math.min(...renderTimes)
    };
  },
  getApiMetrics: () => {
    const stats = performanceTimer.getStatsByCategory('api');
    
    if (stats.length === 0) {
      return {
        totalCalls: 0,
        averageResponseTime: 0,
        slowestCall: 0,
        fastestCall: 0,
        overallErrorRate: 0
      };
    }

    const totalCalls = stats.reduce((sum, stat) => sum + stat.count, 0);
    const totalTime = stats.reduce((sum, stat) => sum + stat.totalTime, 0);
    const responseTimes = stats.map(stat => stat.averageTime);

    return {
      totalCalls,
      averageResponseTime: totalTime / totalCalls,
      slowestCall: Math.max(...responseTimes),
      fastestCall: Math.min(...responseTimes),
      overallErrorRate: 0 // Would need error tracking implementation
    };
  },
  trackApiStart: (endpoint: string) => performanceTimer.start(endpoint, 'api'),
  trackApiEnd: (trackingId: string, success: boolean) => {
    performanceTimer.end(trackingId);
  }
};

const EnvironmentDetector = {
  isProduction: () => process.env.NODE_ENV === 'production'
};

const performanceErrorBoundary = {
  safeExecute: <T>(fn: () => T, fallback: T, context: string) => {
    try {
      return fn();
    } catch (error) {
      console.warn(`Performance monitoring error in ${context}:`, error);
      return fallback;
    }
  },
  safeExecuteAsync: async <T>(fn: () => Promise<T>, fallback: T, context: string) => {
    try {
      return await fn();
    } catch (error) {
      console.warn(`Performance monitoring error in ${context}:`, error);
      return fallback;
    }
  }
};

interface UsePerformanceMonitorReturn {
  metrics: {
    apiCalls: any[];
    renderTimes: any[];
    memoryUsage: any;
  };
  measureApiCall: <T>(apiCall: () => Promise<T>, endpoint: string) => Promise<T>;
  measureRender: (component: string, duration: number) => void;
  clearMetrics: () => void;
  getAverageApiTime: (name?: string) => number;
  getAverageRenderTime: (component?: string) => number;
}

// Hook for monitoring component performance with enhanced lifecycle tracking
export const usePerformanceMonitor = (componentName: string): UsePerformanceMonitorReturn => {
  const renderStartTime = useRef<number>(performance.now());
  const mountTime = useRef<number | null>(null);
  const renderCount = useRef<number>(0);
  const updateMetrics = usePerformanceStore(state => state.updateMetrics);
  const isProductionMode = EnvironmentDetector.isProduction();

  // Track component mount and lifecycle
  useEffect(() => {
    // Skip in production
    if (isProductionMode) return;
    
    return performanceErrorBoundary.safeExecute(() => {
      // Record mount time and track component mount
      mountTime.current = performance.now();
      const mountDuration = mountTime.current - renderStartTime.current;
      
      // Track component mount in PerformanceTracker
      PerformanceTracker.trackComponentMount(componentName);

      if (process.env.NODE_ENV === 'development') {
        try {
          const logger = require('../utils/logging/LoggingManager').default;
          logger.component(`${componentName} mounted in ${mountDuration.toFixed(2)}ms`);
        } catch (e) {
          // Fallback
        }
      }

      // Update performance metrics with component data
      const updateComponentMetrics = () => {
        const componentMetrics = PerformanceTracker.getComponentMetrics();
        updateMetrics({ componentMetrics });
      };

      updateComponentMetrics();

      return () => {
        // Record unmount time and track component unmount
        const unmountTime = performance.now();
        const totalLifetime = unmountTime - (mountTime.current || 0);
        
        // Track component unmount in PerformanceTracker
        PerformanceTracker.trackComponentUnmount(componentName);

        if (process.env.NODE_ENV === 'development') {
          try {
            const logger = require('../utils/logging/LoggingManager').default;
            logger.component(`${componentName} lifetime: ${totalLifetime.toFixed(2)}ms`);
          } catch (e) {
            // Fallback
          }
        }

        // Final metrics update
        updateComponentMetrics();
      };
    }, () => {}, 'performance-monitor-lifecycle');
  }, [componentName, updateMetrics, isProductionMode]);

  // Enhanced measureRender with automatic metrics updates
  const measureRender = useCallback((renderFn: () => any) => {
    // Return render function result directly in production
    if (isProductionMode) {
      return renderFn();
    }
    
    return performanceErrorBoundary.safeExecute(() => {
      renderCount.current++;
      const result = PerformanceTracker.measureRender(componentName, renderFn);
      
      // Update metrics after render measurement
      const componentMetrics = PerformanceTracker.getComponentMetrics();
      updateMetrics({ componentMetrics });
      
      return result;
    }, renderFn(), 'performance-monitor-measure-render');
  }, [componentName, updateMetrics, isProductionMode]);

  // Enhanced measureApiCall with automatic metrics updates
  const measureApiCall = useCallback(async <T,>(apiCall: () => Promise<T>, endpoint: string): Promise<T> => {
    // Return API call result directly in production
    if (isProductionMode) {
      return await apiCall();
    }
    
    return await performanceErrorBoundary.safeExecuteAsync(async () => {
      const result = await PerformanceTracker.measureApiCall(apiCall, endpoint);
      
      // Update metrics after API call measurement
      const apiMetrics = PerformanceTracker.getApiMetrics();
      updateMetrics({ apiMetrics });
      
      return result;
    }, await apiCall(), 'performance-monitor-measure-api');
  }, [updateMetrics, isProductionMode]);

  const clearMetrics = useCallback((): void => {
    // Implementation depends on store
  }, []);

  const getAverageApiTime = useCallback((name?: string): number => {
    const apiMetrics = PerformanceTracker.getApiMetrics();
    if (!apiMetrics || apiMetrics.totalCalls === 0) return 0;
    
    // For now, return the overall average since we don't have per-endpoint breakdown
    return apiMetrics.averageResponseTime;
  }, []);

  const getAverageRenderTime = useCallback((component?: string): number => {
    const componentMetrics = PerformanceTracker.getComponentMetrics();
    if (!componentMetrics || componentMetrics.totalRenders === 0) return 0;
    
    // For now, return the overall average since we don't have per-component breakdown
    return componentMetrics.averageRenderTime;
  }, []);

  // Return enhanced performance utilities
  return {
    metrics: {
      apiCalls: [],
      renderTimes: [],
      memoryUsage: undefined
    },
    measureApiCall,
    measureRender: (component: string, duration: number) => {
      // This is a simplified version for the interface
    },
    clearMetrics,
    getAverageApiTime,
    getAverageRenderTime
  };
};

// Hook for memory monitoring with leak detection and cleanup
export const useMemoryMonitor = (interval: number = 30000) => {
  const memoryManagerRef = useRef<any>(null);
  const updateMetrics = usePerformanceStore(state => state.updateMetrics);
  const isProductionMode = EnvironmentDetector.isProduction();

  useEffect(() => {
    // Skip in production
    if (isProductionMode) return;
    
    let cleanup: (() => void) | undefined;
    let metricsUpdateInterval: NodeJS.Timeout | undefined;

    const initializeMemoryMonitoring = async () => {
      await performanceErrorBoundary.safeExecuteAsync(async () => {
        // Import the MemoryManager from optimization.ts which has proper typing
        const { MemoryManager: memoryManager } = await import('../utils/performance/optimization');
        memoryManagerRef.current = memoryManager;

        // Start memory monitoring with automatic metrics updates
        cleanup = memoryManager.startMemoryMonitoring(interval);

        // Set up periodic memory metrics updates
        metricsUpdateInterval = setInterval(() => {
          const memoryStats = memoryManager.getMemoryStats();
          updateMetrics({ memoryMetrics: memoryStats });
        }, interval);

        // Initial memory metrics collection
        const initialMemoryStats = memoryManager.getMemoryStats();
        updateMetrics({ memoryMetrics: initialMemoryStats });
      }, null, 'memory-monitor-initialize');
    };

    initializeMemoryMonitoring();

    return () => {
      if (cleanup) cleanup();
      if (metricsUpdateInterval) clearInterval(metricsUpdateInterval);
    };
  }, [interval, updateMetrics, isProductionMode]);

  // Enhanced memory utilities with leak detection
  const isMemoryHigh = useCallback((): boolean => {
    return memoryManagerRef.current ? memoryManagerRef.current.isMemoryHigh() : false;
  }, []);

  const cleanup = useCallback((): void => {
    if (memoryManagerRef.current) {
      memoryManagerRef.current.cleanup();
      // Update metrics after cleanup
      const memoryStats = memoryManagerRef.current.getMemoryStats();
      updateMetrics({ memoryMetrics: memoryStats });
    }
  }, [updateMetrics]);

  const detectMemoryLeaks = useCallback((): any[] => {
    return memoryManagerRef.current ? memoryManagerRef.current.detectMemoryLeaks() : [];
  }, []);

  const getMemoryUsage = useCallback((): any => {
    return memoryManagerRef.current ? memoryManagerRef.current.getMemoryUsage() : null;
  }, []);

  const getMemoryTrend = useCallback((): any[] => {
    return memoryManagerRef.current ? memoryManagerRef.current.getMemoryTrend() : [];
  }, []);

  return {
    isMemoryHigh,
    cleanup,
    detectMemoryLeaks,
    getMemoryUsage,
    getMemoryTrend,
    getMemoryStats: () => memoryManagerRef.current?.getMemoryStats() || null
  };
};

// Transform raw web vitals to expected format
const transformWebVitals = (rawVitals: any) => {
  if (!rawVitals) return null;
  
  const createMetric = (name: string, value: number | null) => {
    if (value === null) return null;
    
    let rating: 'good' | 'needs-improvement' | 'poor' = 'good';
    
    switch (name) {
      case 'LCP':
        rating = value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
        break;
      case 'FID':
        rating = value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
        break;
      case 'CLS':
        rating = value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
        break;
      case 'FCP':
        rating = value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
        break;
      case 'TTFB':
        rating = value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
        break;
    }
    
    return {
      name,
      value,
      rating,
      delta: 0,
      id: `${name.toLowerCase()}-${Date.now()}`
    };
  };

  return {
    lcp: createMetric('LCP', rawVitals.lcp),
    fid: createMetric('FID', rawVitals.fid),
    cls: createMetric('CLS', rawVitals.cls),
    fcp: createMetric('FCP', rawVitals.fcp),
    ttfb: createMetric('TTFB', rawVitals.ttfb),
    score: rawVitals.score || {
      lcp: 0,
      fid: 0,
      cls: 0,
      fcp: 0,
      ttfb: 0,
      overall: 0
    }
  };
};

// Hook for Core Web Vitals monitoring
export const useWebVitals = () => {
  const [vitals, setVitals] = useState<any>(null);
  const updateMetrics = usePerformanceStore(state => state.updateMetrics);
  const webVitalsCollectorRef = useRef<any>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeWebVitals = async () => {
      try {
        const webVitalsModule = await import('../utils/performance/WebVitalsCollector');
        const webVitalsCollector = webVitalsModule.webVitalsCollector || webVitalsModule.default;
        webVitalsCollectorRef.current = webVitalsCollector;

        if (typeof webVitalsCollector === 'object' && webVitalsCollector.onVitalsChange) {
          unsubscribe = webVitalsCollector.onVitalsChange((metric: string, value: number, scoreData: any) => {
            const rawVitals = webVitalsCollector.getVitals?.() || null;
            const currentVitals = rawVitals ? transformWebVitals(rawVitals) : null;
            setVitals(currentVitals);
            updateMetrics({ webVitals: currentVitals });
          });
        }

        const rawVitals = (typeof webVitalsCollector === 'object' && webVitalsCollector.getVitals) ? webVitalsCollector.getVitals() : null;
        const initialVitals = rawVitals ? transformWebVitals(rawVitals) : null;
        setVitals(initialVitals);
        updateMetrics({ webVitals: initialVitals });
      } catch (error) {
        console.warn('Failed to initialize Web Vitals:', error);
      }
    };

    initializeWebVitals();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [updateMetrics]);

  const getVitalsScore = useCallback((): any => {
    return webVitalsCollectorRef.current ? webVitalsCollectorRef.current.getVitalsScore() : null;
  }, []);

  const resetVitals = useCallback((): void => {
    if (webVitalsCollectorRef.current) {
      webVitalsCollectorRef.current.reset();
      const resetVitals = webVitalsCollectorRef.current.getVitals();
      setVitals(resetVitals);
      updateMetrics({ webVitals: resetVitals });
    }
  }, [updateMetrics]);

  return {
    vitals,
    getVitalsScore,
    resetVitals,
    isSupported: webVitalsCollectorRef.current?.isSupported || false
  };
};

// Hook for API performance monitoring
export const useApiPerformance = () => {
  const updateMetrics = usePerformanceStore(state => state.updateMetrics);
  const activeCallsRef = useRef<Map<string, any>>(new Map());

  const measureApiCall = useCallback(async <T,>(apiCall: () => Promise<T>, endpoint: string): Promise<T> => {
    const trackingId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    activeCallsRef.current.set(trackingId, {
      endpoint,
      startTime: performance.now(),
      timestamp: Date.now()
    });

    try {
      const result = await PerformanceTracker.measureApiCall(apiCall, endpoint);
      const apiMetrics = PerformanceTracker.getApiMetrics();
      updateMetrics({ apiMetrics });
      return result;
    } catch (error) {
      const apiMetrics = PerformanceTracker.getApiMetrics();
      updateMetrics({ apiMetrics });
      throw error;
    } finally {
      activeCallsRef.current.delete(trackingId);
    }
  }, [updateMetrics]);

  const trackApiStart = useCallback((endpoint: string): string => {
    const trackingId = PerformanceTracker.trackApiStart ? 
      PerformanceTracker.trackApiStart(endpoint) : 
      `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    activeCallsRef.current.set(trackingId, {
      endpoint,
      startTime: performance.now(),
      timestamp: Date.now()
    });
    
    return trackingId;
  }, []);

  const trackApiEnd = useCallback((trackingId: string, success: boolean = true): void => {
    const callData = activeCallsRef.current.get(trackingId);
    if (callData && PerformanceTracker.trackApiEnd) {
      PerformanceTracker.trackApiEnd(trackingId, success);
      const apiMetrics = PerformanceTracker.getApiMetrics();
      updateMetrics({ apiMetrics });
    }
    activeCallsRef.current.delete(trackingId);
  }, [updateMetrics]);

  const getApiMetrics = useCallback((): any => {
    return PerformanceTracker.getApiMetrics();
  }, []);

  const getActiveCalls = useCallback((): any[] => {
    return Array.from(activeCallsRef.current.entries()).map(([id, data]) => ({
      id,
      ...data,
      duration: performance.now() - data.startTime
    }));
  }, []);

  return {
    measureApiCall,
    trackApiStart,
    trackApiEnd,
    getApiMetrics,
    getActiveCalls,
    activeCallsCount: activeCallsRef.current.size
  };
};

export default {
  usePerformanceMonitor,
  useMemoryMonitor,
  useWebVitals,
  useApiPerformance
};
