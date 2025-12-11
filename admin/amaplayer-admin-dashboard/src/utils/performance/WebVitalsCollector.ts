/**
 * WebVitalsCollector - Comprehensive Core Web Vitals tracking
 * Implements PerformanceObserver-based collection for LCP, FID, CLS, FCP, and TTFB
 * with browser compatibility checks and fallbacks
 */

import { 
  EnvironmentDetector, 
  createProductionSafeWrapper, 
  createProductionSafeAsyncWrapper,
  autoCleanupManager,
  performanceErrorBoundary
} from './ProductionSafety';
import { PerformanceOptimizations } from './PerformanceOptimizations';

// Type definitions for Web Vitals
interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface LargestContentfulPaintEntry extends PerformanceEntry {
  renderTime: number;
  loadTime: number;
}

interface FirstInputEntry extends PerformanceEntry {
  processingStart: number;
  duration: number;
}

interface NavigationTimingEntry extends PerformanceEntry {
  loadEventEnd: number;
  responseStart: number;
  requestStart: number;
}

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

class WebVitalsCollector {
  private vitals: {
    lcp: number | null;
    fid: number | null;
    cls: number | null;
    fcp: number | null;
    ttfb: number | null;
  };
  private observers: Map<string, PerformanceObserver>;
  private isSupported: boolean;
  private callbacks: Set<Function>;
  private isProductionMode: boolean;
  private batchedNotify?: Function;

  constructor() {
    this.vitals = {
      lcp: null,
      fid: null,
      cls: null,
      fcp: null,
      ttfb: null
    };
    
    this.observers = new Map();
    this.isSupported = this.checkBrowserSupport();
    this.callbacks = new Set();
    this.isProductionMode = EnvironmentDetector.isProduction();
    
    // Initialize collection if supported
    if (this.isSupported) {
      this.initializeCollection();
      
      // Register cleanup
      autoCleanupManager.registerCleanup(
        () => this.cleanup(),
        'webvitals-collector-cleanup'
      );
    }
  }

  /**
   * Check browser support for required APIs
   */
  checkBrowserSupport() {
    return (
      typeof window !== 'undefined' &&
      'PerformanceObserver' in window &&
      'performance' in window &&
      'getEntriesByType' in performance
    );
  }

  /**
   * Initialize all performance observers with optimizations
   */
  initializeCollection() {
    // Create throttled collection to reduce overhead
    const throttledCollection = PerformanceOptimizations.createThrottledFunction(() => {
      performanceErrorBoundary.safeExecute(() => {
        this.collectLCP();
        this.collectFID();
        this.collectCLS();
        this.collectFCP();
        this.collectTTFB();
      }, null, 'webvitals-initialize-collection');
    }, { interval: 100, key: 'webvitals-init' });

    throttledCollection();
  }

  /**
   * Collect Largest Contentful Paint (LCP)
   * Target: < 2.5s (good), < 4s (needs improvement), >= 4s (poor)
   */
  collectLCP() {
    if (!this.isSupported) return Promise.resolve(null);

    return performanceErrorBoundary.safeExecute(() => {
      try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          this.vitals.lcp = Math.round(lastEntry.startTime);
          this.notifyCallbacks('lcp', this.vitals.lcp);
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', observer);

      // Fallback using navigation timing
      setTimeout(() => {
        if (this.vitals.lcp === null) {
          const navigationEntry = performance.getEntriesByType('navigation')[0] as NavigationTimingEntry;
          if (navigationEntry) {
            this.vitals.lcp = Math.round(navigationEntry.loadEventEnd);
            this.notifyCallbacks('lcp', this.vitals.lcp);
          }
        }
      }, 5000);

      } catch (error) {
        if (!this.isProductionMode) {
          console.warn('LCP collection failed:', error);
        }
        return this.getFallbackLCP();
      }

      return Promise.resolve(this.vitals.lcp);
    }, null, 'webvitals-collect-lcp');
  }

  /**
   * Collect First Input Delay (FID)
   * Target: < 100ms (good), < 300ms (needs improvement), >= 300ms (poor)
   */
  collectFID() {
    if (!this.isSupported) return Promise.resolve(null);

    return performanceErrorBoundary.safeExecute(() => {
      try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as FirstInputEntry[];
        entries.forEach(entry => {
          if (entry.processingStart && entry.startTime) {
            this.vitals.fid = Math.round(entry.processingStart - entry.startTime);
            this.notifyCallbacks('fid', this.vitals.fid);
          }
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', observer);

      } catch (error) {
        if (!this.isProductionMode) {
          console.warn('FID collection failed:', error);
        }
        return this.getFallbackFID();
      }

      return Promise.resolve(this.vitals.fid);
    }, null, 'webvitals-collect-fid');
  }

  /**
   * Collect Cumulative Layout Shift (CLS)
   * Target: < 0.1 (good), < 0.25 (needs improvement), >= 0.25 (poor)
   */
  collectCLS() {
    if (!this.isSupported) return Promise.resolve(null);

    return performanceErrorBoundary.safeExecute(() => {
      let clsValue = 0;
      let sessionValue = 0;
      let sessionEntries: LayoutShiftEntry[] = [];

      try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as LayoutShiftEntry[];
        
        entries.forEach(entry => {
          // Only count layout shifts that weren't caused by user input
          if (!entry.hadRecentInput) {
            const firstSessionEntry = sessionEntries[0];
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

            // If the entry occurred less than 1 second after the previous entry
            // and less than 5 seconds after the first entry in the session,
            // include the entry in the current session
            if (sessionValue &&
                entry.startTime - lastSessionEntry.startTime < 1000 &&
                entry.startTime - firstSessionEntry.startTime < 5000) {
              sessionValue += entry.value;
              sessionEntries.push(entry);
            } else {
              sessionValue = entry.value;
              sessionEntries = [entry];
            }

            // Update the CLS value if the current session value is larger
            if (sessionValue > clsValue) {
              clsValue = sessionValue;
              this.vitals.cls = Math.round(clsValue * 1000) / 1000; // Round to 3 decimal places
              this.notifyCallbacks('cls', this.vitals.cls);
            }
          }
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', observer);

      } catch (error) {
        if (!this.isProductionMode) {
          console.warn('CLS collection failed:', error);
        }
        this.vitals.cls = 0; // Default to 0 if collection fails
      }

      return Promise.resolve(this.vitals.cls);
    }, null, 'webvitals-collect-cls');
  }

  /**
   * Collect First Contentful Paint (FCP)
   * Target: < 1.8s (good), < 3s (needs improvement), >= 3s (poor)
   */
  collectFCP() {
    if (!this.isSupported) return Promise.resolve(null);

    return performanceErrorBoundary.safeExecute(() => {
      try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            this.vitals.fcp = Math.round(entry.startTime);
            this.notifyCallbacks('fcp', this.vitals.fcp);
          }
        });
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.set('fcp', observer);

      // Fallback using performance.getEntriesByName
      setTimeout(() => {
        if (this.vitals.fcp === null) {
          const fcpEntries = performance.getEntriesByName('first-contentful-paint');
          if (fcpEntries.length > 0) {
            this.vitals.fcp = Math.round(fcpEntries[0].startTime);
            this.notifyCallbacks('fcp', this.vitals.fcp);
          }
        }
      }, 1000);

      } catch (error) {
        if (!this.isProductionMode) {
          console.warn('FCP collection failed:', error);
        }
        return this.getFallbackFCP();
      }

      return Promise.resolve(this.vitals.fcp);
    }, null, 'webvitals-collect-fcp');
  }

  /**
   * Collect Time to First Byte (TTFB)
   * Target: < 800ms (good), < 1800ms (needs improvement), >= 1800ms (poor)
   */
  collectTTFB() {
    if (!this.isSupported) return Promise.resolve(null);

    return performanceErrorBoundary.safeExecute(() => {
      try {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as NavigationTimingEntry;
      if (navigationEntry) {
        this.vitals.ttfb = Math.round(navigationEntry.responseStart - navigationEntry.requestStart);
        this.notifyCallbacks('ttfb', this.vitals.ttfb);
      }
      } catch (error) {
        if (!this.isProductionMode) {
          console.warn('TTFB collection failed:', error);
        }
        return this.getFallbackTTFB();
      }

      return Promise.resolve(this.vitals.ttfb);
    }, null, 'webvitals-collect-ttfb');
  }

  /**
   * Get overall performance score based on Core Web Vitals
   */
  getVitalsScore() {
    const scores = {
      lcp: this.getLCPScore(),
      fid: this.getFIDScore(),
      cls: this.getCLSScore(),
      fcp: this.getFCPScore(),
      ttfb: this.getTTFBScore()
    };

    // Calculate weighted average (LCP, FID, CLS are most important)
    const weights = { lcp: 0.25, fid: 0.25, cls: 0.25, fcp: 0.15, ttfb: 0.1 };
    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(scores).forEach(([metric, score]) => {
      if (score !== null) {
        totalScore += score * weights[metric];
        totalWeight += weights[metric];
      }
    });

    const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    
    return {
      overall: overallScore,
      status: this.getScoreStatus(overallScore),
      scores,
      vitals: { ...this.vitals }
    };
  }

  /**
   * Individual metric scoring functions
   */
  getLCPScore() {
    if (this.vitals.lcp === null) return null;
    if (this.vitals.lcp <= 2500) return 100; // Good
    if (this.vitals.lcp <= 4000) return 50;  // Needs improvement
    return 0; // Poor
  }

  getFIDScore() {
    if (this.vitals.fid === null) return null;
    if (this.vitals.fid <= 100) return 100; // Good
    if (this.vitals.fid <= 300) return 50;  // Needs improvement
    return 0; // Poor
  }

  getCLSScore() {
    if (this.vitals.cls === null) return null;
    if (this.vitals.cls <= 0.1) return 100; // Good
    if (this.vitals.cls <= 0.25) return 50; // Needs improvement
    return 0; // Poor
  }

  getFCPScore() {
    if (this.vitals.fcp === null) return null;
    if (this.vitals.fcp <= 1800) return 100; // Good
    if (this.vitals.fcp <= 3000) return 50;  // Needs improvement
    return 0; // Poor
  }

  getTTFBScore() {
    if (this.vitals.ttfb === null) return null;
    if (this.vitals.ttfb <= 800) return 100;  // Good
    if (this.vitals.ttfb <= 1800) return 50;  // Needs improvement
    return 0; // Poor
  }

  getScoreStatus(score) {
    if (score >= 90) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Fallback methods for unsupported browsers
   */
  getFallbackLCP() {
    try {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as NavigationTimingEntry;
      return navigationEntry ? Math.round(navigationEntry.loadEventEnd) : null;
    } catch {
      return null;
    }
  }

  getFallbackFID() {
    // FID can't be measured without user interaction, return null
    return null;
  }

  getFallbackFCP() {
    try {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      return fcpEntry ? Math.round(fcpEntry.startTime) : null;
    } catch {
      return null;
    }
  }

  getFallbackTTFB() {
    try {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as NavigationTimingEntry;
      return navigationEntry ? Math.round(navigationEntry.responseStart) : null;
    } catch {
      return null;
    }
  }

  /**
   * Subscribe to vitals updates
   */
  onVitalsChange(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Notify all callbacks of vitals changes with batching optimization
   */
  notifyCallbacks(metric, value) {
    // Directly notify callbacks - batching optimization is handled by PerformanceOptimizations
    // In production mode, batching is disabled so we just execute immediately
    // In development mode, batching collects multiple calls

    if (!this.batchedNotify) {
      // Create a handler that works in both batched and non-batched modes
      const notifyHandler = (batchesOrMetric, maybeValue) => {
        const latestUpdates = new Map();

        // Check if we're in batched mode (receiving array of args) or direct mode
        if (Array.isArray(batchesOrMetric) && Array.isArray(batchesOrMetric[0])) {
          // Batched mode: batchesOrMetric is array of [metric, value] arrays
          batchesOrMetric.forEach((batch) => {
            const [batchMetric, batchValue] = batch;
            if (batchMetric !== undefined && batchValue !== undefined) {
              latestUpdates.set(batchMetric, batchValue);
            }
          });
        } else {
          // Direct mode (production): receiving metric and value directly
          if (batchesOrMetric !== undefined && maybeValue !== undefined) {
            latestUpdates.set(batchesOrMetric, maybeValue);
          }
        }

        // Notify all callbacks with the latest values
        this.callbacks.forEach(callback => {
          performanceErrorBoundary.safeExecute(() => {
            for (const [m, v] of latestUpdates) {
              callback(m, v, this.getVitalsScore());
            }
          }, null, 'webvitals-callback');
        });
      };

      // Wrap with batching optimization (returns original fn in production)
      this.batchedNotify = PerformanceOptimizations.createBatchedFunction(
        notifyHandler,
        { batchSize: 5, maxWaitTime: 50, key: 'webvitals-callbacks' }
      );
    }

    this.batchedNotify(metric, value);
  }

  /**
   * Get current vitals data
   */
  getVitals() {
    return {
      ...this.vitals,
      score: this.getVitalsScore()
    };
  }

  /**
   * Send vitals to analytics (compatible with reportWebVitals interface)
   */
  sendToAnalytics(metric) {
    // Send to Google Analytics 4 if available
    if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
      window.gtag('event', metric.name, {
        custom_parameter_1: metric.value,
        custom_parameter_2: metric.rating
      });
    }
    
    // Send to custom analytics endpoint for poor performance
    if (metric.rating === 'poor') {
      performanceErrorBoundary.safeExecute(() => {
        fetch('/api/performance-issues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metric: metric.name,
            value: metric.value,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: Date.now()
          })
        }).catch(err => {
          if (!this.isProductionMode) {
            console.log('Analytics error:', err);
          }
        });
      }, null, 'webvitals-analytics');
    }
  }

  /**
   * Clean up observers and resources
   */
  cleanup() {
    performanceErrorBoundary.safeExecute(() => {
      this.observers.forEach(observer => {
        try {
          observer.disconnect();
        } catch (error) {
          if (!this.isProductionMode) {
            console.warn('Observer cleanup error:', error);
          }
        }
      });
      this.observers.clear();
      this.callbacks.clear();
    }, null, 'webvitals-cleanup');
  }

  /**
   * Reset all vitals data
   */
  reset() {
    this.vitals = {
      lcp: null,
      fid: null,
      cls: null,
      fcp: null,
      ttfb: null
    };
    
    if (this.isSupported) {
      this.cleanup();
      this.initializeCollection();
    }
  }
}

// Export singleton instance
export const webVitalsCollector = new WebVitalsCollector();
export default WebVitalsCollector;