import { webVitalsCollector } from './WebVitalsCollector';
import { 
  EnvironmentDetector, 
  createProductionSafeWrapper, 
  createProductionSafeAsyncWrapper,
  autoCleanupManager,
  performanceErrorBoundary
} from './ProductionSafety';
import { useState, useEffect } from 'react';

// Quick performance utilities to fix missing imports
const ImageOptimizer = {
  getResponsiveImageUrl: (src, width, quality = 80) => {
    return src;
  },
  
  getWebPUrl: (src) => {
    return src;
  },
  
  createLazyLoader: (callback) => {
    return new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
        }
      });
    }, {
      rootMargin: '50px'
    });
  }
};

// Performance data storage
const performanceData = {
  renderTimes: new Map(), // componentName -> array of render times
  apiTimes: new Map(), // endpoint -> array of response times
  componentLifecycle: new Map(), // componentName -> { mountTime, unmountTime, renderCount }
  apiErrors: new Map(), // endpoint -> error count
  activeTrackers: new Map() // trackingId -> tracker data
};

// Generate unique tracking IDs
let trackingIdCounter = 0;
const generateTrackingId = () => `tracker_${++trackingIdCounter}_${Date.now()}`;

// Register cleanup for performance data if not in production
if (!EnvironmentDetector.isProduction()) {
  autoCleanupManager.registerCleanup(
    () => {
      performanceData.renderTimes.clear();
      performanceData.apiTimes.clear();
      performanceData.componentLifecycle.clear();
      performanceData.apiErrors.clear();
      performanceData.activeTrackers.clear();
    },
    'performance-tracker-cleanup'
  );
}

// Production-safe implementations
const productionSafeImplementations = {
  startTracking: () => ({ name: '', startTime: 0, id: '' }),
  endTracking: () => 0,
  getCoreWebVitals: () => Promise.resolve({}),
  startWebVitalsCollection: () => {},
  measureRender: (componentName, renderFn) => renderFn(),
  measureApiCall: async (apiCall, endpoint) => await apiCall(),
  trackComponentMount: () => 0,
  trackComponentUnmount: () => 0,
  getMetrics: () => ({
    webVitals: null,
    componentMetrics: null,
    apiMetrics: null,
    overallScore: 0,
    timestamp: Date.now()
  }),
  getComponentMetrics: () => ({
    components: [],
    totalRenderTime: 0,
    totalRenders: 0,
    averageRenderTime: 0,
    slowestComponents: []
  }),
  getApiMetrics: () => ({
    endpoints: [],
    totalResponseTime: 0,
    totalCalls: 0,
    totalErrors: 0,
    overallErrorRate: 0,
    averageResponseTime: 0,
    slowestEndpoints: []
  }),
  calculateComponentScore: () => 100,
  calculateApiScore: () => 100,
  clearMetrics: () => {},
  getRawData: () => ({
    renderTimes: {},
    apiTimes: {},
    componentLifecycle: {},
    apiErrors: {},
    activeTrackers: {}
  }),
  trackRender: () => ({ componentName: '', timestamp: Date.now(), startTime: 0 }),
  trackMemoryUsage: () => ({ used: 0, total: 0, limit: 0 })
};

const PerformanceTracker = {
  // Basic tracking utilities
  startTracking: createProductionSafeWrapper(
    (name) => ({ 
      name, 
      startTime: performance.now(),
      id: generateTrackingId()
    }),
    productionSafeImplementations.startTracking
  ),
  
  endTracking: createProductionSafeWrapper(
    (tracker) => {
      const endTime = performance.now();
      const duration = endTime - tracker.startTime;
      
      // Store tracking data for analysis
      if (!performanceData.activeTrackers.has(tracker.id)) {
        performanceData.activeTrackers.set(tracker.id, {
          name: tracker.name,
          startTime: tracker.startTime,
          endTime,
          duration
        });
      }
      
      return duration;
    },
    productionSafeImplementations.endTracking
  ),

  // Enhanced Core Web Vitals using WebVitalsCollector
  getCoreWebVitals: createProductionSafeAsyncWrapper(
    () => {
      return Promise.resolve(webVitalsCollector.getVitals());
    },
    productionSafeImplementations.getCoreWebVitals
  ),
  
  // Start Web Vitals collection
  startWebVitalsCollection: createProductionSafeWrapper(
    () => {
      webVitalsCollector.reset();
    },
    productionSafeImplementations.startWebVitalsCollection
  ),

  // Enhanced measureRender with high-precision timing and component tracking
  measureRender: createProductionSafeWrapper(
    (componentName, renderFn) => {
    const startTime = performance.now();
    const trackingId = generateTrackingId();
    
    try {
      // Execute the render function
      const result = renderFn();
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Store render time data
      if (!performanceData.renderTimes.has(componentName)) {
        performanceData.renderTimes.set(componentName, []);
      }
      performanceData.renderTimes.get(componentName).push({
        time: renderTime,
        timestamp: Date.now(),
        trackingId
      });
      
      // Update component lifecycle data
      const lifecycle = performanceData.componentLifecycle.get(componentName) || {
        renderCount: 0,
        totalRenderTime: 0,
        averageRenderTime: 0,
        lastRenderTime: 0
      };
      
      lifecycle.renderCount++;
      lifecycle.totalRenderTime += renderTime;
      lifecycle.averageRenderTime = lifecycle.totalRenderTime / lifecycle.renderCount;
      lifecycle.lastRenderTime = renderTime;
      
      performanceData.componentLifecycle.set(componentName, lifecycle);
      
      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        const logger = require('../logging/LoggingManager').default;
        logger.performance(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Still track the render time even if it failed
      if (!performanceData.renderTimes.has(componentName)) {
        performanceData.renderTimes.set(componentName, []);
      }
      performanceData.renderTimes.get(componentName).push({
        time: renderTime,
        timestamp: Date.now(),
        trackingId,
        error: error.message
      });
      
      throw error;
    }
    },
    productionSafeImplementations.measureRender
  ),

  // Enhanced measureApiCall with endpoint-specific tracking and error handling
  measureApiCall: createProductionSafeAsyncWrapper(
    async (apiCall, endpoint) => {
    const startTime = performance.now();
    const trackingId = generateTrackingId();
    
    try {
      // Execute the API call
      const result = await apiCall();
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Store API response time data
      if (!performanceData.apiTimes.has(endpoint)) {
        performanceData.apiTimes.set(endpoint, []);
      }
      performanceData.apiTimes.get(endpoint).push({
        time: responseTime,
        timestamp: Date.now(),
        trackingId,
        success: true
      });
      
      // Log slow API calls in development
      if (process.env.NODE_ENV === 'development' && responseTime > 1000) {
        const logger = require('../logging/LoggingManager').default;
        logger.performance(`Slow API call detected: ${endpoint} took ${responseTime.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Track failed API calls
      if (!performanceData.apiTimes.has(endpoint)) {
        performanceData.apiTimes.set(endpoint, []);
      }
      performanceData.apiTimes.get(endpoint).push({
        time: responseTime,
        timestamp: Date.now(),
        trackingId,
        success: false,
        error: error.message
      });
      
      // Track error count
      const currentErrors = performanceData.apiErrors.get(endpoint) || 0;
      performanceData.apiErrors.set(endpoint, currentErrors + 1);
      
      throw error;
    }
    },
    productionSafeImplementations.measureApiCall
  ),

  // Component lifecycle tracking
  trackComponentMount: createProductionSafeWrapper(
    (componentName) => {
    const mountTime = performance.now();
    const lifecycle = performanceData.componentLifecycle.get(componentName) || {
      renderCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      lastRenderTime: 0
    };
    
    lifecycle.mountTime = mountTime;
    lifecycle.mountTimestamp = Date.now();
    
    performanceData.componentLifecycle.set(componentName, lifecycle);
    
    return mountTime;
    },
    productionSafeImplementations.trackComponentMount
  ),

  trackComponentUnmount: createProductionSafeWrapper(
    (componentName) => {
    const unmountTime = performance.now();
    const lifecycle = performanceData.componentLifecycle.get(componentName);
    
    if (lifecycle && lifecycle.mountTime) {
      lifecycle.unmountTime = unmountTime;
      lifecycle.unmountTimestamp = Date.now();
      lifecycle.totalLifetime = unmountTime - lifecycle.mountTime;
      
      performanceData.componentLifecycle.set(componentName, lifecycle);
    }
    
    return unmountTime;
    },
    productionSafeImplementations.trackComponentUnmount
  ),

  // Performance data aggregation and statistical analysis
  getMetrics: createProductionSafeWrapper(
    () => {
    const metrics = {
      webVitals: webVitalsCollector.getVitals(),
      componentMetrics: PerformanceTracker.getComponentMetrics(),
      apiMetrics: PerformanceTracker.getApiMetrics(),
      overallScore: 0,
      timestamp: Date.now()
    };
    
    // Calculate overall performance score
    const webVitalsScore = metrics.webVitals?.score?.overall || 0;
    const componentScore = PerformanceTracker.calculateComponentScore();
    const apiScore = PerformanceTracker.calculateApiScore();
    
    metrics.overallScore = Math.round((webVitalsScore * 0.4 + componentScore * 0.3 + apiScore * 0.3));
    
    return metrics;
    },
    productionSafeImplementations.getMetrics
  ),

  getComponentMetrics: createProductionSafeWrapper(
    () => {
    const components = [];
    const renderTimes = new Map();
    let totalRenderTime = 0;
    let totalRenders = 0;
    
    // Aggregate render time data
    for (const [componentName, times] of performanceData.renderTimes) {
      const validTimes = times.filter(t => !t.error).map(t => t.time);
      if (validTimes.length === 0) continue;
      
      const average = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
      const min = Math.min(...validTimes);
      const max = Math.max(...validTimes);
      const lifecycle = performanceData.componentLifecycle.get(componentName) || {};
      
      components.push({
        name: componentName,
        renderCount: validTimes.length,
        averageRenderTime: Math.round(average * 100) / 100,
        minRenderTime: Math.round(min * 100) / 100,
        maxRenderTime: Math.round(max * 100) / 100,
        totalRenderTime: Math.round(validTimes.reduce((sum, time) => sum + time, 0) * 100) / 100,
        mountTime: lifecycle.mountTime,
        unmountTime: lifecycle.unmountTime,
        totalLifetime: lifecycle.totalLifetime
      });
      
      renderTimes.set(componentName, validTimes);
      totalRenderTime += validTimes.reduce((sum, time) => sum + time, 0);
      totalRenders += validTimes.length;
    }
    
    // Sort by average render time (slowest first)
    components.sort((a, b) => b.averageRenderTime - a.averageRenderTime);
    
    return {
      components,
      totalRenderTime: Math.round(totalRenderTime * 100) / 100,
      totalRenders,
      averageRenderTime: totalRenders > 0 ? Math.round((totalRenderTime / totalRenders) * 100) / 100 : 0,
      slowestComponents: components.slice(0, 5)
    };
    },
    productionSafeImplementations.getComponentMetrics
  ),

  getApiMetrics: createProductionSafeWrapper(
    () => {
    const endpoints = [];
    let totalResponseTime = 0;
    let totalCalls = 0;
    let totalErrors = 0;
    
    // Aggregate API response time data
    for (const [endpoint, times] of performanceData.apiTimes) {
      const successfulCalls = times.filter(t => t.success);
      const failedCalls = times.filter(t => !t.success);
      const allTimes = times.map(t => t.time);
      
      if (allTimes.length === 0) continue;
      
      const average = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;
      const min = Math.min(...allTimes);
      const max = Math.max(...allTimes);
      const errorRate = (failedCalls.length / times.length) * 100;
      
      endpoints.push({
        endpoint,
        callCount: times.length,
        successfulCalls: successfulCalls.length,
        failedCalls: failedCalls.length,
        errorRate: Math.round(errorRate * 100) / 100,
        averageResponseTime: Math.round(average * 100) / 100,
        minResponseTime: Math.round(min * 100) / 100,
        maxResponseTime: Math.round(max * 100) / 100,
        totalResponseTime: Math.round(allTimes.reduce((sum, time) => sum + time, 0) * 100) / 100
      });
      
      totalResponseTime += allTimes.reduce((sum, time) => sum + time, 0);
      totalCalls += times.length;
      totalErrors += failedCalls.length;
    }
    
    // Sort by average response time (slowest first)
    endpoints.sort((a, b) => b.averageResponseTime - a.averageResponseTime);
    
    return {
      endpoints,
      totalResponseTime: Math.round(totalResponseTime * 100) / 100,
      totalCalls,
      totalErrors,
      overallErrorRate: totalCalls > 0 ? Math.round((totalErrors / totalCalls) * 100 * 100) / 100 : 0,
      averageResponseTime: totalCalls > 0 ? Math.round((totalResponseTime / totalCalls) * 100) / 100 : 0,
      slowestEndpoints: endpoints.slice(0, 5)
    };
    },
    productionSafeImplementations.getApiMetrics
  ),

  calculateComponentScore: createProductionSafeWrapper(
    () => {
    const componentMetrics = PerformanceTracker.getComponentMetrics();
    if (componentMetrics.totalRenders === 0) return 100;
    
    const avgRenderTime = componentMetrics.averageRenderTime;
    
    // Score based on average render time
    if (avgRenderTime <= 8) return 100;  // Excellent (< 8ms)
    if (avgRenderTime <= 16) return 80;  // Good (< 16ms, one frame)
    if (avgRenderTime <= 32) return 60;  // Fair (< 32ms, two frames)
    if (avgRenderTime <= 50) return 40;  // Poor (< 50ms)
    return 20; // Very poor (> 50ms)
    },
    productionSafeImplementations.calculateComponentScore
  ),

  calculateApiScore: createProductionSafeWrapper(
    () => {
    const apiMetrics = PerformanceTracker.getApiMetrics();
    if (apiMetrics.totalCalls === 0) return 100;
    
    const avgResponseTime = apiMetrics.averageResponseTime;
    const errorRate = apiMetrics.overallErrorRate;
    
    // Score based on response time and error rate
    let timeScore = 100;
    if (avgResponseTime > 200) timeScore = 80;
    if (avgResponseTime > 500) timeScore = 60;
    if (avgResponseTime > 1000) timeScore = 40;
    if (avgResponseTime > 2000) timeScore = 20;
    
    let errorScore = 100;
    if (errorRate > 1) errorScore = 80;
    if (errorRate > 5) errorScore = 60;
    if (errorRate > 10) errorScore = 40;
    if (errorRate > 20) errorScore = 20;
    
    return Math.round((timeScore * 0.7 + errorScore * 0.3));
    },
    productionSafeImplementations.calculateApiScore
  ),

  // Clear all performance data
  clearMetrics: createProductionSafeWrapper(
    () => {
    performanceData.renderTimes.clear();
    performanceData.apiTimes.clear();
    performanceData.componentLifecycle.clear();
    performanceData.apiErrors.clear();
    performanceData.activeTrackers.clear();
    },
    productionSafeImplementations.clearMetrics
  ),

  // Get raw performance data for advanced analysis
  getRawData: createProductionSafeWrapper(
    () => ({
    renderTimes: Object.fromEntries(performanceData.renderTimes),
    apiTimes: Object.fromEntries(performanceData.apiTimes),
    componentLifecycle: Object.fromEntries(performanceData.componentLifecycle),
    apiErrors: Object.fromEntries(performanceData.apiErrors),
    activeTrackers: Object.fromEntries(performanceData.activeTrackers)
    }),
    productionSafeImplementations.getRawData
  ),

  // Legacy methods for backward compatibility
  trackRender: createProductionSafeWrapper(
    (componentName) => ({ 
      componentName, 
      timestamp: Date.now(),
      startTime: performance.now()
    }),
    productionSafeImplementations.trackRender
  ),
  trackMemoryUsage: createProductionSafeWrapper(
    () => ({
      used: (performance as any).memory?.usedJSHeapSize || 0,
      total: (performance as any).memory?.totalJSHeapSize || 0,
      limit: (performance as any).memory?.jsHeapSizeLimit || 0
    }),
    productionSafeImplementations.trackMemoryUsage
  )
};

const MemoryManager = {
  cleanup: createProductionSafeWrapper(() => {}, () => {}),
  forceGarbageCollection: createProductionSafeWrapper(() => {}, () => {}),
  getMemoryUsage: createProductionSafeWrapper(
    () => ({ used: 0, total: 0 }),
    () => ({ used: 0, total: 0 })
  ),
  
  // Missing methods that hooks are calling
  startMemoryMonitoring: createProductionSafeWrapper(
    (interval) => () => {}, // return cleanup function
    (interval) => () => {} // return cleanup function
  ),
  isMemoryHigh: createProductionSafeWrapper(
    () => false,
    () => false
  ),
  getMemoryStats: createProductionSafeWrapper(
    () => ({
      current: { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 },
      peak: { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 },
      average: 0,
      trends: [],
      leaks: [],
      isHigh: false,
      monitoringDuration: 0,
      samplesCollected: 0,
      thresholds: {}
    }),
    () => ({
      current: { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 },
      peak: { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 },
      average: 0,
      trends: [],
      leaks: [],
      isHigh: false,
      monitoringDuration: 0,
      samplesCollected: 0,
      thresholds: {}
    })
  ),
  detectMemoryLeaks: createProductionSafeWrapper(
    () => [],
    () => []
  ),
  getMemoryTrend: createProductionSafeWrapper(
    () => [],
    () => []
  )
};

// React hook for debouncing values

export const useDebounce = (value: any, delay: number = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export {
  ImageOptimizer,
  PerformanceTracker,
  MemoryManager
};