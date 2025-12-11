/**
 * Performance Monitoring System Optimizations
 * 
 * This module provides optimizations to minimize the overhead of performance monitoring
 * and improve the efficiency of data collection, storage, and processing.
 * 
 * Requirements: 7.3, 7.4
 */

import { 
  EnvironmentDetector, 
  createProductionSafeWrapper, 
  performanceErrorBoundary
} from './ProductionSafety';

interface OverheadMeasurement {
  operationName: string;
  startTime: number;
  startMemory: number;
  id: string;
}

interface OverheadData {
  operationName: string;
  duration: number;
  memoryDelta: number;
  timestamp: number;
  overheadPercentage: number;
}

/**
 * Performance Overhead Monitor
 * Measures the impact of performance monitoring on application performance
 */
class PerformanceOverheadMonitor {
  private measurements: Map<string, any>;
  private overheadThreshold: number;
  private isEnabled: boolean;
  private measurementBuffer: OverheadData[];
  private bufferSize: number;

  constructor() {
    this.measurements = new Map();
    this.overheadThreshold = 1; // 1% maximum overhead
    this.isEnabled = !EnvironmentDetector.isProduction();
    this.measurementBuffer = [];
    this.bufferSize = 100;
  }

  /**
   * Start measuring overhead for a specific operation
   */
  startMeasurement(operationName: string): OverheadMeasurement | null {
    if (!this.isEnabled) return null;

    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    return {
      operationName,
      startTime,
      startMemory,
      id: `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  /**
   * End measurement and calculate overhead
   */
  endMeasurement(measurement: OverheadMeasurement | null): OverheadData | null {
    if (!this.isEnabled || !measurement) return null;

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    const duration = endTime - measurement.startTime;
    
    // Calculate overhead percentage based on operation duration
    const baselineTime = 1; // 1ms baseline
    const overheadPercentage = duration > baselineTime ? ((duration - baselineTime) / baselineTime) * 100 : 0;
    
    const overhead: OverheadData = {
      operationName: measurement.operationName,
      duration,
      memoryDelta: endMemory - measurement.startMemory,
      timestamp: Date.now(),
      overheadPercentage
    };

    this.recordOverhead(overhead);
    return overhead;
  }

  /**
   * Record overhead measurement with buffering
   */
  recordOverhead(overhead: OverheadData) {
    this.measurementBuffer.push(overhead);
    
    // Maintain buffer size
    if (this.measurementBuffer.length > this.bufferSize) {
      this.measurementBuffer.shift();
    }

    // Update running statistics
    const existing = this.measurements.get(overhead.operationName) || {
      count: 0,
      totalDuration: 0,
      totalMemory: 0,
      maxDuration: 0,
      minDuration: Infinity
    };

    existing.count++;
    existing.totalDuration += overhead.duration;
    existing.totalMemory += overhead.memoryDelta;
    existing.maxDuration = Math.max(existing.maxDuration, overhead.duration);
    existing.minDuration = Math.min(existing.minDuration, overhead.duration);
    existing.avgDuration = existing.totalDuration / existing.count;
    existing.avgMemory = existing.totalMemory / existing.count;

    this.measurements.set(overhead.operationName, existing);
  }

  /**
   * Get memory usage (fallback for when performance.memory is not available)
   */
  getMemoryUsage() {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Get overhead statistics for all operations
   */
  getOverheadStats() {
    const stats = {
      totalOperations: 0,
      totalOverhead: 0,
      averageOverhead: 0,
      maxOverhead: 0,
      operations: {}
    };

    for (const [operationName, data] of this.measurements) {
      stats.totalOperations += data.count;
      stats.totalOverhead += data.totalDuration;
      stats.maxOverhead = Math.max(stats.maxOverhead, data.maxDuration);
      
      stats.operations[operationName] = {
        count: data.count,
        avgDuration: data.avgDuration,
        maxDuration: data.maxDuration,
        minDuration: data.minDuration,
        avgMemory: data.avgMemory,
        overheadPercentage: this.calculateOverheadPercentage(data.avgDuration)
      };
    }

    stats.averageOverhead = stats.totalOperations > 0 ? 
      stats.totalOverhead / stats.totalOperations : 0;

    return stats;
  }

  /**
   * Calculate overhead percentage relative to typical operation time
   */
  calculateOverheadPercentage(duration: number) {
    const typicalFrameTime = 16.67; // 60fps
    return (duration / typicalFrameTime) * 100;
  }

  /**
   * Check if overhead is within acceptable limits
   */
  isOverheadAcceptable() {
    const stats = this.getOverheadStats();
    const overheadPercentage = this.calculateOverheadPercentage(stats.averageOverhead);
    return overheadPercentage <= this.overheadThreshold;
  }

  /**
   * Get recommendations to reduce overhead
   */
  getOptimizationRecommendations() {
    const stats = this.getOverheadStats();
    const recommendations = [];

    // Find operations with high overhead
    for (const [operationName, data] of Object.entries(stats.operations)) {
      const operationData = data as any;
      if (operationData.overheadPercentage > this.overheadThreshold) {
        recommendations.push({
          operation: operationName,
          issue: 'High overhead detected',
          currentOverhead: `${operationData.overheadPercentage.toFixed(2)}%`,
          suggestion: this.getOperationOptimization(operationName),
          priority: operationData.overheadPercentage > 5 ? 'high' : 'medium'
        });
      }
    }

    return recommendations;
  }

  /**
   * Get specific optimization suggestions for operations
   */
  getOperationOptimization(operationName: string) {
    const optimizations = {
      'webvitals-collect': 'Consider reducing collection frequency or using requestIdleCallback',
      'memory-monitoring': 'Increase monitoring interval or use sampling',
      'component-tracking': 'Implement component tracking throttling',
      'api-tracking': 'Use batched API tracking instead of individual calls',
      'dashboard-render': 'Implement virtualization for large lists',
      'data-persistence': 'Use debounced saves instead of immediate persistence'
    };

    return optimizations[operationName] || 'Consider reducing frequency or using batching';
  }

  /**
   * Reset all measurements
   */
  reset() {
    this.measurements.clear();
    this.measurementBuffer = [];
  }
}

/**
 * Efficient Data Structures for Performance Data
 */
class OptimizedDataStructures {
  /**
   * Circular Buffer for efficient historical data storage
   */
  static createCircularBuffer(maxSize = 100) {
    return {
      buffer: new Array(maxSize),
      size: 0,
      maxSize,
      head: 0,
      tail: 0,

      push(item) {
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.maxSize;
        
        if (this.size < this.maxSize) {
          this.size++;
        } else {
          this.head = (this.head + 1) % this.maxSize;
        }
      },

      get(index) {
        if (index >= this.size) return undefined;
        return this.buffer[(this.head + index) % this.maxSize];
      },

      getAll() {
        const result = [];
        for (let i = 0; i < this.size; i++) {
          result.push(this.get(i));
        }
        return result;
      },

      getLast(count = 1) {
        const result = [];
        const start = Math.max(0, this.size - count);
        for (let i = start; i < this.size; i++) {
          result.push(this.get(i));
        }
        return result;
      },

      clear() {
        this.size = 0;
        this.head = 0;
        this.tail = 0;
      },

      isFull() {
        return this.size === this.maxSize;
      }
    };
  }

  /**
   * Time-based sliding window for metrics
   */
  static createSlidingWindow(windowSizeMs = 60000) { // 1 minute default
    return {
      data: [],
      windowSize: windowSizeMs,

      add(value, timestamp = Date.now()) {
        this.data.push({ value, timestamp });
        this.cleanup(timestamp);
      },

      cleanup(currentTime = Date.now()) {
        const cutoff = currentTime - this.windowSize;
        this.data = this.data.filter(item => item.timestamp >= cutoff);
      },

      getValues() {
        this.cleanup();
        return this.data.map(item => item.value);
      },

      getAverage() {
        const values = this.getValues();
        return values.length > 0 ? 
          values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      },

      getMin() {
        const values = this.getValues();
        return values.length > 0 ? Math.min(...values) : 0;
      },

      getMax() {
        const values = this.getValues();
        return values.length > 0 ? Math.max(...values) : 0;
      },

      size() {
        this.cleanup();
        return this.data.length;
      }
    };
  }

  /**
   * Efficient metrics aggregator using Map with automatic cleanup
   */
  static createMetricsAggregator(maxEntries = 1000) {
    return {
      metrics: new Map(),
      maxEntries,
      accessOrder: [],

      set(key, value) {
        // Update access order
        const existingIndex = this.accessOrder.indexOf(key);
        if (existingIndex !== -1) {
          this.accessOrder.splice(existingIndex, 1);
        }
        this.accessOrder.push(key);

        // Set the value
        this.metrics.set(key, value);

        // Cleanup if needed
        if (this.metrics.size > this.maxEntries) {
          const oldestKey = this.accessOrder.shift();
          this.metrics.delete(oldestKey);
        }
      },

      get(key) {
        // Update access order
        const existingIndex = this.accessOrder.indexOf(key);
        if (existingIndex !== -1) {
          this.accessOrder.splice(existingIndex, 1);
          this.accessOrder.push(key);
        }

        return this.metrics.get(key);
      },

      has(key) {
        return this.metrics.has(key);
      },

      delete(key) {
        const existingIndex = this.accessOrder.indexOf(key);
        if (existingIndex !== -1) {
          this.accessOrder.splice(existingIndex, 1);
        }
        return this.metrics.delete(key);
      },

      clear() {
        this.metrics.clear();
        this.accessOrder = [];
      },

      size() {
        return this.metrics.size;
      },

      entries() {
        return this.metrics.entries();
      }
    };
  }

  /**
   * Memory-efficient string interning for component names
   */
  static createStringInterner() {
    const internMap = new Map();
    let nextId = 0;

    return {
      intern(str) {
        if (internMap.has(str)) {
          return internMap.get(str);
        }
        
        const id = nextId++;
        internMap.set(str, id);
        return id;
      },

      getString(id) {
        for (const [str, storedId] of internMap) {
          if (storedId === id) return str;
        }
        return null;
      },

      size() {
        return internMap.size;
      },

      clear() {
        internMap.clear();
        nextId = 0;
      }
    };
  }
}

interface BatchOptions {
  batchSize?: number;
  maxWaitTime?: number;
  key?: string;
}

interface ThrottleOptions {
  interval?: number;
  key?: string;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Batching and Throttling System
 */
class BatchingThrottlingSystem {
  private batches: Map<string, any>;
  private throttles: Map<string, any>;
  private isEnabled: boolean;

  constructor() {
    this.batches = new Map();
    this.throttles = new Map();
    this.isEnabled = !EnvironmentDetector.isProduction();
  }

  /**
   * Create a batched function that collects calls and executes them in batches
   */
  createBatchedFunction(fn: Function, options: BatchOptions = {}) {
    if (!this.isEnabled) return fn;

    const {
      batchSize = 10,
      maxWaitTime = 100,
      key = 'default'
    } = options;

    if (!this.batches.has(key)) {
      this.batches.set(key, {
        items: [],
        timer: null,
        batchSize,
        maxWaitTime
      });
    }

    return (...args) => {
      const batch = this.batches.get(key);
      batch.items.push(args);

      // Clear existing timer
      if (batch.timer) {
        clearTimeout(batch.timer);
      }

      // Execute immediately if batch is full
      if (batch.items.length >= batch.batchSize) {
        this.executeBatch(key, fn);
      } else {
        // Set timer for max wait time
        batch.timer = setTimeout(() => {
          this.executeBatch(key, fn);
        }, batch.maxWaitTime);
      }
    };
  }

  /**
   * Execute a batch of function calls
   */
  executeBatch(key, fn) {
    const batch = this.batches.get(key);
    if (!batch || batch.items.length === 0) return;

    const items = [...batch.items];
    batch.items = [];
    
    if (batch.timer) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }

    // Execute function with all batched arguments
    performanceErrorBoundary.safeExecute(() => {
      fn(items);
    }, null, `batch-execution-${key}`);
  }

  /**
   * Create a throttled function that limits execution frequency
   */
  createThrottledFunction(fn: Function, options: ThrottleOptions = {}) {
    if (!this.isEnabled) return fn;

    const {
      interval = 100,
      key = 'default',
      leading = true,
      trailing = true
    } = options;

    if (!this.throttles.has(key)) {
      this.throttles.set(key, {
        lastExecution: 0,
        timer: null,
        pendingArgs: null
      });
    }

    return (...args) => {
      const throttle = this.throttles.get(key);
      const now = Date.now();
      const timeSinceLastExecution = now - throttle.lastExecution;

      // Store pending arguments
      throttle.pendingArgs = args;

      // Execute immediately if enough time has passed and leading is enabled
      if (timeSinceLastExecution >= interval && leading) {
        throttle.lastExecution = now;
        performanceErrorBoundary.safeExecute(() => {
          fn(...args);
        }, null, `throttle-execution-${key}`);
        throttle.pendingArgs = null;
        return;
      }

      // Set up trailing execution if enabled
      if (trailing && !throttle.timer) {
        const remainingTime = interval - timeSinceLastExecution;
        throttle.timer = setTimeout(() => {
          if (throttle.pendingArgs) {
            throttle.lastExecution = Date.now();
            performanceErrorBoundary.safeExecute(() => {
              fn(...throttle.pendingArgs);
            }, null, `throttle-trailing-${key}`);
            throttle.pendingArgs = null;
          }
          throttle.timer = null;
        }, Math.max(0, remainingTime));
      }
    };
  }

  /**
   * Create a debounced function that delays execution until after calls have stopped
   */
  createDebouncedFunction(fn, delay = 100, key = 'default') {
    if (!this.isEnabled) return fn;

    let timer = null;

    return (...args) => {
      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        performanceErrorBoundary.safeExecute(() => {
          fn(...args);
        }, null, `debounce-execution-${key}`);
      }, delay);
    };
  }

  /**
   * Clear all batches and throttles
   */
  clear() {
    // Clear batch timers
    for (const batch of this.batches.values()) {
      if (batch.timer) {
        clearTimeout(batch.timer);
      }
    }
    this.batches.clear();

    // Clear throttle timers
    for (const throttle of this.throttles.values()) {
      if (throttle.timer) {
        clearTimeout(throttle.timer);
      }
    }
    this.throttles.clear();
  }
}

// Create singleton instances
const overheadMonitor = new PerformanceOverheadMonitor();
const batchingSystem = new BatchingThrottlingSystem();

// Production-safe wrappers
const PerformanceOptimizations = {
  // Overhead monitoring
  startMeasurement: createProductionSafeWrapper(
    (operationName) => overheadMonitor.startMeasurement(operationName),
    () => null
  ),

  endMeasurement: createProductionSafeWrapper(
    (measurement) => overheadMonitor.endMeasurement(measurement),
    () => null
  ),

  getOverheadStats: createProductionSafeWrapper(
    () => overheadMonitor.getOverheadStats(),
    () => ({ totalOperations: 0, totalOverhead: 0, operations: {} })
  ),

  isOverheadAcceptable: createProductionSafeWrapper(
    () => overheadMonitor.isOverheadAcceptable(),
    () => true
  ),

  getOptimizationRecommendations: createProductionSafeWrapper(
    () => overheadMonitor.getOptimizationRecommendations(),
    () => []
  ),

  // Data structures
  createCircularBuffer: OptimizedDataStructures.createCircularBuffer,
  createSlidingWindow: OptimizedDataStructures.createSlidingWindow,
  createMetricsAggregator: OptimizedDataStructures.createMetricsAggregator,
  createStringInterner: OptimizedDataStructures.createStringInterner,

  // Batching and throttling
  createBatchedFunction: createProductionSafeWrapper(
    (fn, options) => batchingSystem.createBatchedFunction(fn, options),
    (fn) => fn
  ),

  createThrottledFunction: createProductionSafeWrapper(
    (fn, options) => batchingSystem.createThrottledFunction(fn, options),
    (fn) => fn
  ),

  createDebouncedFunction: createProductionSafeWrapper(
    (fn, delay, key) => batchingSystem.createDebouncedFunction(fn, delay, key),
    (fn) => fn
  ),

  // Cleanup
  cleanup: () => {
    overheadMonitor.reset();
    batchingSystem.clear();
  }
};

export {
  PerformanceOptimizations,
  PerformanceOverheadMonitor,
  OptimizedDataStructures,
  BatchingThrottlingSystem
};

export default PerformanceOptimizations;