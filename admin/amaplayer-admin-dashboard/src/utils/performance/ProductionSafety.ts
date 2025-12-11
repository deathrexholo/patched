/**
 * Production Safety and Environment Detection System
 * 
 * Provides environment-based feature flags, no-op implementations for production,
 * performance monitoring overhead measurement, and error boundaries.
 */

// Environment detection
const EnvironmentDetector = {
  /**
   * Detect if we're in development mode
   */
  isDevelopment() {
    return (
      process.env.NODE_ENV === 'development' ||
      process.env.REACT_APP_ENV === 'development' ||
      (typeof window !== 'undefined' && window.location.hostname === 'localhost') ||
      (typeof window !== 'undefined' && window.location.hostname.includes('dev'))
    );
  },

  /**
   * Detect if we're in production mode
   */
  isProduction() {
    return (
      process.env.NODE_ENV === 'production' ||
      process.env.REACT_APP_ENV === 'production' ||
      !this.isDevelopment()
    );
  },

  /**
   * Detect if we're in test mode
   */
  isTest() {
    return (
      process.env.NODE_ENV === 'test' ||
      process.env.REACT_APP_ENV === 'test'
    );
  },

  /**
   * Get current environment
   */
  getEnvironment() {
    if (this.isTest()) return 'test';
    if (this.isDevelopment()) return 'development';
    return 'production';
  }
};

// Performance monitoring overhead measurement
class OverheadMonitor {
  private measurements: Array<{
    operation: string;
    executionTime: number;
    overhead: number;
    timestamp: number;
  }>;
  private maxMeasurements: number;
  private overheadThreshold: number;

  constructor() {
    this.measurements = [];
    this.maxMeasurements = 100;
    this.overheadThreshold = 1; // 1% of total execution time
  }

  /**
   * Measure the overhead of a performance monitoring operation
   */
  measureOverhead(operation, operationName = 'unknown') {
    if (EnvironmentDetector.isProduction()) {
      return operation(); // No overhead measurement in production
    }

    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    
    const overhead = endTime - startTime;
    
    this.measurements.push({
      operation: operationName,
      executionTime: overhead,
      overhead,
      timestamp: Date.now()
    });

    // Limit measurements to prevent memory bloat
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift();
    }

    // Warn if overhead is too high (increased threshold to reduce noise)
    if (overhead > 50) { // 50ms threshold - only warn for really bad overhead
      // Use centralized logging to avoid console flooding
      if (typeof require !== 'undefined') {
        try {
          const logger = require('../logging/LoggingManager').default;
          logger.performance(`High performance monitoring overhead detected: ${operationName} took ${overhead.toFixed(2)}ms`);
        } catch (e) {
          // Fallback to console if logger not available (but only in development)
          if (process.env.NODE_ENV === 'development') {
            console.warn(`High performance monitoring overhead detected: ${operationName} took ${overhead.toFixed(2)}ms`);
          }
        }
      }
    }

    return result;
  }

  /**
   * Get overhead statistics
   */
  getOverheadStats() {
    if (this.measurements.length === 0) {
      return {
        totalMeasurements: 0,
        averageOverhead: 0,
        maxOverhead: 0,
        totalOverhead: 0
      };
    }

    const overheads = this.measurements.map(m => m.overhead);
    const totalOverhead = overheads.reduce((sum, overhead) => sum + overhead, 0);
    const averageOverhead = totalOverhead / overheads.length;
    const maxOverhead = Math.max(...overheads);

    return {
      totalMeasurements: this.measurements.length,
      averageOverhead: Math.round(averageOverhead * 100) / 100,
      maxOverhead: Math.round(maxOverhead * 100) / 100,
      totalOverhead: Math.round(totalOverhead * 100) / 100,
      measurements: this.measurements.slice(-10) // Last 10 measurements
    };
  }

  /**
   * Check if monitoring overhead is acceptable
   */
  isOverheadAcceptable() {
    const stats = this.getOverheadStats();
    return stats.averageOverhead < this.overheadThreshold;
  }

  /**
   * Clear overhead measurements
   */
  clearMeasurements() {
    this.measurements = [];
  }
}

// Create singleton overhead monitor
const overheadMonitor = new OverheadMonitor();

// Automatic cleanup and memory management
class AutoCleanupManager {
  private cleanupTasks: Set<any>;
  private cleanupInterval: NodeJS.Timeout | null;
  private isActive: boolean;

  constructor() {
    this.cleanupTasks = new Set();
    this.cleanupInterval = null;
    this.isActive = false;
  }

  /**
   * Register a cleanup task
   */
  registerCleanup(cleanupFn, description = 'unknown') {
    const task = {
      cleanup: cleanupFn,
      description,
      registeredAt: Date.now()
    };
    
    this.cleanupTasks.add(task);
    
    // Start cleanup interval if not already active
    if (!this.isActive && !EnvironmentDetector.isProduction()) {
      this.startAutoCleanup();
    }

    // Return unregister function
    return () => this.cleanupTasks.delete(task);
  }

  /**
   * Start automatic cleanup process
   */
  startAutoCleanup() {
    if (this.isActive || EnvironmentDetector.isProduction()) return;

    this.isActive = true;
    
    // Run cleanup every 5 minutes in development
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, 5 * 60 * 1000);

    // Also cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.runCleanup());
      window.addEventListener('unload', () => this.runCleanup());
    }
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isActive = false;
  }

  /**
   * Run all registered cleanup tasks
   */
  runCleanup() {
    let cleanedTasks = 0;
    let failedTasks = 0;

    for (const task of this.cleanupTasks) {
      try {
        task.cleanup();
        cleanedTasks++;
      } catch (error) {
        failedTasks++;
        if (EnvironmentDetector.isDevelopment()) {
          try {
            const logger = require('../logging/LoggingManager').default;
            logger.warn('PERFORMANCE', `Cleanup task failed (${task.description}):`, error);
          } catch (e) {
            console.warn(`Cleanup task failed (${task.description}):`, error);
          }
        }
      }
    }

    if (EnvironmentDetector.isDevelopment() && (cleanedTasks > 0 || failedTasks > 0)) {
      try {
        const logger = require('../logging/LoggingManager').default;
        logger.cleanup(`Performance monitoring cleanup: ${cleanedTasks} tasks completed, ${failedTasks} failed`);
      } catch (e) {
        console.log(`Performance monitoring cleanup: ${cleanedTasks} tasks completed, ${failedTasks} failed`);
      }
    }
  }

  /**
   * Force immediate cleanup
   */
  forceCleanup() {
    this.runCleanup();
  }

  /**
   * Get cleanup statistics
   */
  getCleanupStats() {
    return {
      registeredTasks: this.cleanupTasks.size,
      isActive: this.isActive,
      tasks: Array.from(this.cleanupTasks).map(task => ({
        description: task.description,
        registeredAt: task.registeredAt
      }))
    };
  }
}

// Create singleton cleanup manager
const autoCleanupManager = new AutoCleanupManager();

// Error boundary for performance monitoring
class PerformanceErrorBoundary {
  private errors: Array<any>;
  private maxErrors: number;
  private errorThreshold: number;
  private isMonitoringDisabled: boolean;

  constructor() {
    this.errors = [];
    this.maxErrors = 50;
    this.errorThreshold = 10; // Max errors before disabling monitoring
    this.isMonitoringDisabled = false;
  }

  /**
   * Safely execute a performance monitoring operation
   */
  safeExecute(operation, fallback = null, operationName = 'unknown') {
    // If monitoring is disabled due to too many errors, return fallback
    if (this.isMonitoringDisabled) {
      return fallback;
    }

    try {
      return overheadMonitor.measureOverhead(operation, operationName);
    } catch (error) {
      this.handleError(error, operationName);
      return fallback;
    }
  }

  /**
   * Safely execute an async performance monitoring operation
   */
  async safeExecuteAsync(operation, fallback = null, operationName = 'unknown') {
    // If monitoring is disabled due to too many errors, return fallback
    if (this.isMonitoringDisabled) {
      return fallback;
    }

    try {
      const result = await overheadMonitor.measureOverhead(operation, operationName);
      return result;
    } catch (error) {
      this.handleError(error, operationName);
      return fallback;
    }
  }

  /**
   * Handle performance monitoring errors
   */
  handleError(error, operationName) {
    const errorInfo = {
      error: error.message,
      operationName,
      timestamp: Date.now(),
      stack: error.stack
    };

    this.errors.push(errorInfo);

    // Limit error storage
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Check if we should disable monitoring
    const recentErrors = this.errors.filter(
      err => Date.now() - err.timestamp < 60000 // Last minute
    );

    if (recentErrors.length >= this.errorThreshold) {
      this.disableMonitoring();
    }

    // Log error in development
    if (EnvironmentDetector.isDevelopment()) {
      try {
        const logger = require('../logging/LoggingManager').default;
        logger.error('PERFORMANCE', `Performance monitoring error in ${operationName}:`, error);
      } catch (e) {
        console.warn(`Performance monitoring error in ${operationName}:`, error);
      }
    }
  }

  /**
   * Disable performance monitoring due to excessive errors
   */
  disableMonitoring() {
    this.isMonitoringDisabled = true;
    
    if (EnvironmentDetector.isDevelopment()) {
      try {
        const logger = require('../logging/LoggingManager').default;
        logger.warn('PERFORMANCE', 'Performance monitoring disabled due to excessive errors');
      } catch (e) {
        console.warn('Performance monitoring disabled due to excessive errors');
      }
    }

    // Re-enable after 5 minutes
    setTimeout(() => {
      this.isMonitoringDisabled = false;
      this.errors = []; // Clear error history
      
      if (EnvironmentDetector.isDevelopment()) {
        try {
          const logger = require('../logging/LoggingManager').default;
          logger.info('PERFORMANCE', 'Performance monitoring re-enabled');
        } catch (e) {
          console.log('Performance monitoring re-enabled');
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const recentErrors = this.errors.filter(
      err => Date.now() - err.timestamp < 60000 // Last minute
    );

    return {
      totalErrors: this.errors.length,
      recentErrors: recentErrors.length,
      isMonitoringDisabled: this.isMonitoringDisabled,
      errorsByOperation: this.getErrorsByOperation(),
      lastError: this.errors.length > 0 ? this.errors[this.errors.length - 1] : null
    };
  }

  /**
   * Get errors grouped by operation
   */
  getErrorsByOperation() {
    const errorsByOperation = {};
    
    this.errors.forEach(error => {
      if (!errorsByOperation[error.operationName]) {
        errorsByOperation[error.operationName] = 0;
      }
      errorsByOperation[error.operationName]++;
    });

    return errorsByOperation;
  }

  /**
   * Clear error history
   */
  clearErrors() {
    this.errors = [];
    this.isMonitoringDisabled = false;
  }
}

// Create singleton error boundary
const performanceErrorBoundary = new PerformanceErrorBoundary();

// Production-safe wrapper function
const createProductionSafeWrapper = (developmentImplementation: Function, productionImplementation: Function | null = null) => {
  if (EnvironmentDetector.isProduction()) {
    return productionImplementation || (() => {});
  }
  
  return (...args: any[]) => {
    return performanceErrorBoundary.safeExecute(
      () => developmentImplementation(...args),
      productionImplementation ? productionImplementation(...args) : undefined,
      developmentImplementation.name || 'anonymous'
    );
  };
};

// Production-safe async wrapper function
const createProductionSafeAsyncWrapper = (developmentImplementation: Function, productionImplementation: Function | null = null) => {
  if (EnvironmentDetector.isProduction()) {
    return productionImplementation || (async () => {});
  }
  
  return async (...args: any[]) => {
    return await performanceErrorBoundary.safeExecuteAsync(
      () => developmentImplementation(...args),
      productionImplementation ? await productionImplementation(...args) : undefined,
      developmentImplementation.name || 'anonymous'
    );
  };
};

// Initialize cleanup on module load
if (!EnvironmentDetector.isProduction()) {
  // Register cleanup for overhead monitor
  autoCleanupManager.registerCleanup(
    () => overheadMonitor.clearMeasurements(),
    'overhead-monitor-cleanup'
  );

  // Register cleanup for error boundary
  autoCleanupManager.registerCleanup(
    () => performanceErrorBoundary.clearErrors(),
    'error-boundary-cleanup'
  );
}

export {
  EnvironmentDetector,
  OverheadMonitor,
  AutoCleanupManager,
  PerformanceErrorBoundary,
  overheadMonitor,
  autoCleanupManager,
  performanceErrorBoundary,
  createProductionSafeWrapper,
  createProductionSafeAsyncWrapper
};