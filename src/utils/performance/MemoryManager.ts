/**
 * MemoryManager - Comprehensive memory monitoring and management system
 * 
 * Provides memory usage tracking, leak detection, and cleanup utilities
 * for performance monitoring in development environments.
 */

// Extend Performance interface to include memory property
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ExtendedPerformance extends Performance {
  memory?: PerformanceMemory;
}

declare const performance: ExtendedPerformance;

interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
  supported?: boolean;
  estimated?: boolean;
}

interface MemoryLeak {
  severity: 'low' | 'medium' | 'high';
  description: string;
  trend: number;
  recommendation: string;
}

interface MemoryTrend {
  timestamp: number;
  usedMemory: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

const {
  EnvironmentDetector,
  createProductionSafeWrapper,
  createProductionSafeAsyncWrapper,
  autoCleanupManager,
  performanceErrorBoundary
} = require('./ProductionSafety');

const { PerformanceOptimizations } = require('./PerformanceOptimizations');

class MemoryManager {
  private monitoringInterval: NodeJS.Timeout | null;
  private isProductionMode: boolean;
  private memoryHistory: any;
  private memoryTrend: any;
  private monitoringStartTime: number | null;
  private thresholds: {
    high: number;
    critical: number;
    leakDetectionWindow: number;
    leakThreshold: number;
  };
  private throttledCollectMemoryData: Function;

  constructor() {
    this.monitoringInterval = null;
    this.isProductionMode = EnvironmentDetector.isProduction();

    // Use optimized circular buffer for memory history
    this.memoryHistory = PerformanceOptimizations.createCircularBuffer(100);

    // Use sliding window for trend analysis
    this.memoryTrend = PerformanceOptimizations.createSlidingWindow(300000); // 5 minutes

    this.monitoringStartTime = null;
    this.thresholds = {
      high: 50 * 1024 * 1024, // 50MB default threshold
      critical: 100 * 1024 * 1024, // 100MB critical threshold
      leakDetectionWindow: 10, // Number of samples to analyze for leaks
      leakThreshold: 1.5 // Memory growth multiplier to consider a leak
    };

    // Create throttled memory collection to reduce overhead
    this.throttledCollectMemoryData = PerformanceOptimizations.createThrottledFunction(
      this.collectMemoryData.bind(this),
      { interval: 1000, key: 'memory-collection' }
    );

    // Register cleanup if not in production
    if (!this.isProductionMode) {
      autoCleanupManager.registerCleanup(
        () => this.cleanup(),
        'memory-manager-cleanup'
      );
    }
  }

  /**
   * Start memory monitoring with configurable interval
   * @param {number} interval - Monitoring interval in milliseconds (default: 5000)
   * @returns {Function} Cleanup function to stop monitoring
   */
  startMemoryMonitoring(interval = 5000) {
    // Return no-op cleanup function in production
    if (this.isProductionMode) {
      return () => { };
    }

    return performanceErrorBoundary.safeExecute(() => {
      if (this.monitoringInterval) {
        this.stopMemoryMonitoring();
      }

      this.monitoringStartTime = Date.now();
      this.memoryHistory = [];

      // Initial memory collection
      this.collectMemoryData();

      // Set up periodic monitoring with throttling
      this.monitoringInterval = setInterval(() => {
        this.throttledCollectMemoryData();
      }, interval);

      // Return cleanup function
      return () => this.stopMemoryMonitoring();
    }, () => { }, 'memory-start-monitoring');
  }

  /**
   * Stop memory monitoring and cleanup
   */
  stopMemoryMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Collect current memory data and add to history with optimizations
   * @private
   */
  collectMemoryData() {
    const measurement = PerformanceOptimizations.startMeasurement('memory-collection');

    const memoryUsage = this.getMemoryUsage();
    const timestamp = Date.now();

    const memoryData = {
      ...memoryUsage,
      timestamp,
      relativeTime: this.monitoringStartTime ? timestamp - this.monitoringStartTime : 0
    };

    // Use optimized circular buffer (automatically handles size limits)
    this.memoryHistory.push(memoryData);

    // Add to sliding window for trend analysis
    this.memoryTrend.add(memoryUsage.usedJSHeapSize, timestamp);

    PerformanceOptimizations.endMeasurement(measurement);
  }

  /**
   * Check if memory usage is currently high
   * @returns {boolean} True if memory usage exceeds threshold
   */
  isMemoryHigh() {
    // Always return false in production
    if (this.isProductionMode) {
      return false;
    }

    return performanceErrorBoundary.safeExecute(() => {
      const currentUsage = this.getMemoryUsage();

      // Check against heap used if available, otherwise total JS heap size
      const memoryToCheck = currentUsage.usedJSHeapSize || currentUsage.totalJSHeapSize || 0;

      return memoryToCheck > this.thresholds.high;
    }, false, 'memory-is-high');
  }

  /**
   * Get current memory usage from browser APIs
   * @returns {MemoryUsage} Current memory usage data
   */
  getMemoryUsage() {
    // Return minimal data in production
    if (this.isProductionMode) {
      return {
        timestamp: Date.now(),
        supported: false,
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0
      };
    }

    return performanceErrorBoundary.safeExecute(() => {
      const memoryUsage = {
        timestamp: Date.now(),
        supported: false,
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        estimated: false
      };

      // Check for performance.memory API (Chrome/Edge)
      if (typeof performance !== 'undefined' && performance && performance.memory) {
        memoryUsage.supported = true;
        memoryUsage.usedJSHeapSize = performance.memory.usedJSHeapSize;
        memoryUsage.totalJSHeapSize = performance.memory.totalJSHeapSize;
        memoryUsage.jsHeapSizeLimit = performance.memory.jsHeapSizeLimit;
      }

      // Fallback: estimate memory usage using other methods
      if (!memoryUsage.supported) {
        memoryUsage.estimated = true;
        memoryUsage.usedJSHeapSize = this.estimateMemoryUsage();
      }

      return memoryUsage;
    }, {
      timestamp: Date.now(),
      supported: false,
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    }, 'memory-get-usage');
  }

  /**
   * Estimate memory usage when performance.memory is not available
   * @private
   * @returns {number} Estimated memory usage in bytes
   */
  estimateMemoryUsage() {
    // Basic estimation based on DOM elements and common objects
    try {
      let estimatedMemory = 0;

      if (typeof document !== 'undefined') {
        const domElements = document.querySelectorAll('*').length;
        estimatedMemory += domElements * 1000; // Rough estimate: 1KB per element
      }

      // Add estimation for JavaScript objects (very rough)
      if (typeof window !== 'undefined') {
        estimatedMemory += Object.keys(window).length * 100;
      }

      return estimatedMemory;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get memory usage trend over time using optimized sliding window
   * @returns {MemoryTrend[]} Array of memory trend data points
   */
  getMemoryTrend() {
    const historyData = this.memoryHistory.getAll();
    if (historyData.length < 2) {
      return [];
    }

    const trends = [];

    for (let i = 1; i < historyData.length; i++) {
      const current = historyData[i];
      const previous = historyData[i - 1];

      const memoryDiff = current.usedJSHeapSize - previous.usedJSHeapSize;
      const timeDiff = current.timestamp - previous.timestamp;
      const rate = timeDiff > 0 ? memoryDiff / timeDiff : 0; // bytes per millisecond

      trends.push({
        timestamp: current.timestamp,
        relativeTime: current.relativeTime,
        memoryUsage: current.usedJSHeapSize,
        memoryDiff,
        growthRate: rate,
        trend: memoryDiff > 0 ? 'increasing' : memoryDiff < 0 ? 'decreasing' : 'stable'
      });
    }

    return trends;
  }

  /**
   * Detect potential memory leaks based on usage patterns
   * @returns {MemoryLeak[]} Array of detected memory leak indicators
   */
  detectMemoryLeaks() {
    const leaks = [];
    const trends = this.getMemoryTrend();

    if (trends.length < this.thresholds.leakDetectionWindow) {
      return leaks;
    }

    // Analyze recent trends for consistent growth
    const recentTrends = trends.slice(-this.thresholds.leakDetectionWindow);
    const increasingTrends = recentTrends.filter(trend => trend.trend === 'increasing');

    // Check for consistent memory growth
    if (increasingTrends.length >= this.thresholds.leakDetectionWindow * 0.7) {
      const totalGrowth = recentTrends.reduce((sum, trend) => sum + Math.max(0, trend.memoryDiff), 0);
      const averageGrowth = totalGrowth / recentTrends.length;

      if (averageGrowth > 0) {
        leaks.push({
          type: 'consistent-growth',
          severity: totalGrowth > this.thresholds.high ? 'high' : 'medium',
          description: 'Consistent memory growth detected over recent monitoring period',
          totalGrowth,
          averageGrowth,
          detectedAt: Date.now(),
          recommendations: [
            'Check for event listeners that are not being removed',
            'Look for closures holding references to large objects',
            'Verify that timers and intervals are being cleared',
            'Check for DOM elements that are not being properly cleaned up'
          ]
        });
      }
    }

    // Check for sudden memory spikes
    const currentUsage = this.getMemoryUsage();
    const baseline = this.memoryHistory.length > 10 ?
      this.memoryHistory.slice(0, 10).reduce((sum, data) => sum + data.usedJSHeapSize, 0) / 10 :
      this.memoryHistory.length > 0 ? this.memoryHistory[0].usedJSHeapSize : currentUsage.usedJSHeapSize;

    if (baseline > 0 && currentUsage.usedJSHeapSize > baseline * this.thresholds.leakThreshold) {
      leaks.push({
        type: 'memory-spike',
        severity: 'high',
        description: 'Sudden memory usage spike detected',
        currentUsage: currentUsage.usedJSHeapSize,
        baseline,
        multiplier: currentUsage.usedJSHeapSize / baseline,
        detectedAt: Date.now(),
        recommendations: [
          'Check recent user actions that might have triggered the spike',
          'Look for large data structures being created',
          'Verify that caches are not growing unbounded',
          'Check for memory-intensive operations that are not being cleaned up'
        ]
      });
    }

    return leaks;
  }

  /**
   * Perform memory cleanup operations
   */
  cleanup() {
    // Clear memory history to free up space
    this.memoryHistory.clear();

    // Stop monitoring if active
    this.stopMemoryMonitoring();

    // Suggest garbage collection if available (Chrome DevTools)
    if (typeof window !== 'undefined' && window.gc && typeof window.gc === 'function') {
      try {
        window.gc();
      } catch (error) {
        // Ignore errors - gc() might not be available in all contexts
      }
    }

    // Clear any large objects that might be held in memory
    this.memoryTrend.cleanup();
    this.monitoringStartTime = null;
  }

  /**
   * Get comprehensive memory statistics
   * @returns {Object} Detailed memory statistics
   */
  getMemoryStats() {
    const currentUsage = this.getMemoryUsage();
    const trends = this.getMemoryTrend();
    const leaks = this.detectMemoryLeaks();

    // Get all history data from circular buffer
    const historyData = this.memoryHistory.getAll();

    // Calculate peak usage
    const peakUsage = historyData.length > 0 ?
      historyData.reduce((peak, data) => {
        return data.usedJSHeapSize > peak.usedJSHeapSize ? data : peak;
      }, currentUsage) : currentUsage;

    // Calculate average usage
    const averageUsage = historyData.length > 0 ?
      historyData.reduce((sum, data) => sum + data.usedJSHeapSize, 0) / historyData.length :
      currentUsage.usedJSHeapSize;

    return {
      current: currentUsage,
      peak: peakUsage,
      average: averageUsage,
      trends,
      leaks,
      isHigh: this.isMemoryHigh(),
      monitoringDuration: this.monitoringStartTime ? Date.now() - this.monitoringStartTime : 0,
      samplesCollected: this.memoryHistory.size,
      thresholds: this.thresholds
    };
  }

  /**
   * Configure memory monitoring thresholds
   * @param {Object} newThresholds - New threshold values
   */
  setThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Export memory data for analysis
   * @returns {Object} Exportable memory data
   */
  exportData() {
    return {
      memoryHistory: this.memoryHistory.getAll(),
      stats: this.getMemoryStats(),
      exportedAt: Date.now()
    };
  }
}

// Create singleton instance
const memoryManager = new MemoryManager();

// Export both the singleton instance and the class
export default memoryManager;
export { MemoryManager };