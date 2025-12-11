/**
 * Performance Monitoring System Benchmarks
 * 
 * Comprehensive benchmarking suite to measure and validate the performance
 * of the performance monitoring system itself.
 * 
 * Requirements: 7.3, 7.4
 */

import { 
  PerformanceOptimizations,
  OptimizedDataStructures,
  BatchingThrottlingSystem
} from './PerformanceOptimizations';
import { 
  EnvironmentDetector, 
  performanceErrorBoundary
} from './ProductionSafety';

interface BenchmarkOptions {
  iterations?: number;
  warmupIterations?: number;
  timeout?: number;
  memoryTracking?: boolean;
}

interface BenchmarkResult {
  name: string;
  iterations: number;
  warmupIterations: number;
  startTime: number;
  measurements: number[];
  memoryMeasurements: number[];
  errors: any[];
  stats?: {
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
    stdDev: number;
  };
  memoryStats?: {
    count: number;
    min: number;
    max: number;
    mean: number;
    median: number;
    total: number;
  };
  rating?: string;
  timedOut?: boolean;
  error?: string;
}

/**
 * Benchmark Runner
 */
class BenchmarkRunner {
  private results: Map<string, BenchmarkResult>;
  private isEnabled: boolean;

  constructor() {
    this.results = new Map();
    this.isEnabled = !EnvironmentDetector.isProduction();
  }

  /**
   * Run a benchmark function and measure its performance
   */
  async runBenchmark(name: string, benchmarkFn: Function, options: BenchmarkOptions = {}) {
    if (!this.isEnabled) {
      return { name, skipped: true, reason: 'Production mode' };
    }

    const {
      iterations = 1000,
      warmupIterations = 100,
      timeout = 10000,
      memoryTracking = true
    } = options;

    const result: BenchmarkResult = {
      name,
      iterations,
      warmupIterations,
      startTime: Date.now(),
      measurements: [],
      memoryMeasurements: [],
      errors: []
    };

    try {
      // Warmup phase
      for (let i = 0; i < warmupIterations; i++) {
        await benchmarkFn();
      }

      // Force garbage collection if available
      if (typeof window !== 'undefined' && window.gc) {
        window.gc();
      }

      // Benchmark phase
      for (let i = 0; i < iterations; i++) {
        const startMemory = memoryTracking ? this.getMemoryUsage() : 0;
        const startTime = performance.now();
        
        try {
          await benchmarkFn();
        } catch (error) {
          result.errors.push({ iteration: i, error: error.message });
        }
        
        const endTime = performance.now();
        const endMemory = memoryTracking ? this.getMemoryUsage() : 0;
        
        result.measurements.push(endTime - startTime);
        if (memoryTracking) {
          result.memoryMeasurements.push(endMemory - startMemory);
        }

        // Check timeout
        if (Date.now() - result.startTime > timeout) {
          result.timedOut = true;
          break;
        }
      }

      // Calculate statistics
      this.calculateStatistics(result);
      this.results.set(name, result);

      return result;
    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Calculate benchmark statistics
   */
  calculateStatistics(result: BenchmarkResult) {
    const measurements = result.measurements;
    const memoryMeasurements = result.memoryMeasurements;

    if (measurements.length === 0) return;

    // Time statistics
    measurements.sort((a, b) => a - b);
    result.stats = {
      count: measurements.length,
      min: measurements[0],
      max: measurements[measurements.length - 1],
      mean: measurements.reduce((sum, val) => sum + val, 0) / measurements.length,
      median: measurements[Math.floor(measurements.length / 2)],
      p95: measurements[Math.floor(measurements.length * 0.95)],
      p99: measurements[Math.floor(measurements.length * 0.99)],
      stdDev: this.calculateStandardDeviation(measurements)
    };

    // Memory statistics
    if (memoryMeasurements.length > 0) {
      memoryMeasurements.sort((a, b) => a - b);
      result.memoryStats = {
        count: memoryMeasurements.length,
        min: memoryMeasurements[0],
        max: memoryMeasurements[memoryMeasurements.length - 1],
        mean: memoryMeasurements.reduce((sum, val) => sum + val, 0) / memoryMeasurements.length,
        median: memoryMeasurements[Math.floor(memoryMeasurements.length / 2)],
        total: memoryMeasurements.reduce((sum, val) => sum + Math.max(0, val), 0)
      };
    }

    // Performance rating
    result.rating = this.calculatePerformanceRating(result.stats);
  }

  /**
   * Calculate standard deviation
   */
  calculateStandardDeviation(values: number[]) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculate performance rating based on statistics
   */
  calculatePerformanceRating(stats: { mean: number }) {
    // Rating based on mean execution time
    if (stats.mean < 1) return 'excellent';
    if (stats.mean < 5) return 'good';
    if (stats.mean < 16) return 'acceptable';
    if (stats.mean < 50) return 'poor';
    return 'unacceptable';
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Get all benchmark results
   */
  getResults() {
    return Array.from(this.results.values());
  }

  /**
   * Get summary of all benchmarks
   */
  getSummary() {
    const results = this.getResults();
    
    return {
      totalBenchmarks: results.length,
      ratings: {
        excellent: results.filter(r => r.rating === 'excellent').length,
        good: results.filter(r => r.rating === 'good').length,
        acceptable: results.filter(r => r.rating === 'acceptable').length,
        poor: results.filter(r => r.rating === 'poor').length,
        unacceptable: results.filter(r => r.rating === 'unacceptable').length
      },
      totalErrors: results.reduce((sum, r) => sum + (r.errors?.length || 0), 0),
      averageExecutionTime: results.reduce((sum, r) => sum + (r.stats?.mean || 0), 0) / results.length,
      worstPerformer: results.reduce((worst, current) => 
        (current.stats?.mean || 0) > (worst.stats?.mean || 0) ? current : worst, results[0]
      ),
      bestPerformer: results.reduce((best, current) => 
        (current.stats?.mean || 0) < (best.stats?.mean || 0) ? current : best, results[0]
      )
    };
  }

  /**
   * Clear all results
   */
  clear() {
    this.results.clear();
  }
}

/**
 * Performance Monitoring Benchmarks
 */
class PerformanceMonitoringBenchmarks {
  private runner: BenchmarkRunner;

  constructor() {
    this.runner = new BenchmarkRunner();
  }

  /**
   * Run all benchmarks
   */
  async runAllBenchmarks() {
    const benchmarks = [
      // Data Structure Benchmarks
      { name: 'CircularBuffer-Push', fn: () => this.benchmarkCircularBufferPush() },
      { name: 'CircularBuffer-Get', fn: () => this.benchmarkCircularBufferGet() },
      { name: 'SlidingWindow-Add', fn: () => this.benchmarkSlidingWindowAdd() },
      { name: 'SlidingWindow-Calculations', fn: () => this.benchmarkSlidingWindowCalculations() },
      { name: 'MetricsAggregator-Set', fn: () => this.benchmarkMetricsAggregatorSet() },
      { name: 'MetricsAggregator-Get', fn: () => this.benchmarkMetricsAggregatorGet() },
      { name: 'StringInterner-Intern', fn: () => this.benchmarkStringInterner() },

      // Batching/Throttling Benchmarks
      { name: 'BatchedFunction-Execution', fn: () => this.benchmarkBatchedFunction() },
      { name: 'ThrottledFunction-Execution', fn: () => this.benchmarkThrottledFunction() },
      { name: 'DebouncedFunction-Execution', fn: () => this.benchmarkDebouncedFunction() },

      // Overhead Monitoring Benchmarks
      { name: 'OverheadMonitor-StartEnd', fn: () => this.benchmarkOverheadMonitoring() },
      { name: 'OverheadMonitor-Statistics', fn: () => this.benchmarkOverheadStatistics() },

      // Integration Benchmarks
      { name: 'FullWorkflow-WebVitals', fn: () => this.benchmarkWebVitalsWorkflow() },
      { name: 'FullWorkflow-ComponentTracking', fn: () => this.benchmarkComponentTrackingWorkflow() },
      { name: 'FullWorkflow-MemoryMonitoring', fn: () => this.benchmarkMemoryMonitoringWorkflow() }
    ];

    const results = [];
    for (const benchmark of benchmarks) {
      console.log(`Running benchmark: ${benchmark.name}`);
      const result = await this.runner.runBenchmark(benchmark.name, benchmark.fn, {
        iterations: 1000,
        warmupIterations: 100
      });
      results.push(result);
    }

    return results;
  }

  // Data Structure Benchmarks
  benchmarkCircularBufferPush() {
    const buffer = OptimizedDataStructures.createCircularBuffer(100);
    buffer.push(`item-${Math.random()}`);
  }

  benchmarkCircularBufferGet() {
    const buffer = OptimizedDataStructures.createCircularBuffer(100);
    // Pre-fill buffer
    for (let i = 0; i < 100; i++) {
      buffer.push(`item-${i}`);
    }
    // Benchmark get operation
    buffer.get(Math.floor(Math.random() * buffer.size));
  }

  benchmarkSlidingWindowAdd() {
    const window = OptimizedDataStructures.createSlidingWindow(60000);
    window.add(Math.random() * 100, Date.now());
  }

  benchmarkSlidingWindowCalculations() {
    const window = OptimizedDataStructures.createSlidingWindow(60000);
    // Pre-fill window
    for (let i = 0; i < 50; i++) {
      window.add(Math.random() * 100, Date.now() - i * 1000);
    }
    // Benchmark calculations
    window.getAverage();
    window.getMin();
    window.getMax();
  }

  benchmarkMetricsAggregatorSet() {
    const aggregator = OptimizedDataStructures.createMetricsAggregator(1000);
    aggregator.set(`key-${Math.random()}`, { value: Math.random() });
  }

  benchmarkMetricsAggregatorGet() {
    const aggregator = OptimizedDataStructures.createMetricsAggregator(1000);
    // Pre-fill aggregator
    const keys = [];
    for (let i = 0; i < 100; i++) {
      const key = `key-${i}`;
      keys.push(key);
      aggregator.set(key, { value: i });
    }
    // Benchmark get operation
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    aggregator.get(randomKey);
  }

  benchmarkStringInterner() {
    const interner = OptimizedDataStructures.createStringInterner();
    const componentNames = [
      'Header', 'Footer', 'Sidebar', 'MainContent', 'Navigation',
      'Button', 'Input', 'Modal', 'Dropdown', 'Card'
    ];
    const randomName = componentNames[Math.floor(Math.random() * componentNames.length)];
    interner.intern(randomName);
  }

  // Batching/Throttling Benchmarks
  benchmarkBatchedFunction() {
    const system = new BatchingThrottlingSystem();
    const mockFn = () => {};
    const batchedFn = system.createBatchedFunction(mockFn, { batchSize: 10 });
    batchedFn('test-arg');
  }

  benchmarkThrottledFunction() {
    const system = new BatchingThrottlingSystem();
    const mockFn = () => {};
    const throttledFn = system.createThrottledFunction(mockFn, { interval: 100 });
    throttledFn('test-arg');
  }

  benchmarkDebouncedFunction() {
    const system = new BatchingThrottlingSystem();
    const mockFn = () => {};
    const debouncedFn = system.createDebouncedFunction(mockFn, 100);
    debouncedFn('test-arg');
  }

  // Overhead Monitoring Benchmarks
  benchmarkOverheadMonitoring() {
    const measurement = PerformanceOptimizations.startMeasurement('benchmark-test');
    PerformanceOptimizations.endMeasurement(measurement);
  }

  benchmarkOverheadStatistics() {
    PerformanceOptimizations.getOverheadStats();
  }

  // Integration Benchmarks
  benchmarkWebVitalsWorkflow() {
    // Simulate web vitals collection workflow
    const measurement = PerformanceOptimizations.startMeasurement('webvitals-collect');
    
    // Simulate some work
    const data = { lcp: 1500, fid: 50, cls: 0.05 };
    const buffer = OptimizedDataStructures.createCircularBuffer(100);
    buffer.push(data);
    
    PerformanceOptimizations.endMeasurement(measurement);
  }

  benchmarkComponentTrackingWorkflow() {
    // Simulate component tracking workflow
    const measurement = PerformanceOptimizations.startMeasurement('component-tracking');
    
    const interner = OptimizedDataStructures.createStringInterner();
    const componentId = interner.intern('TestComponent');
    
    const aggregator = OptimizedDataStructures.createMetricsAggregator(1000);
    aggregator.set(`component-${componentId}`, {
      renderTime: Math.random() * 20,
      timestamp: Date.now()
    });
    
    PerformanceOptimizations.endMeasurement(measurement);
  }

  benchmarkMemoryMonitoringWorkflow() {
    // Simulate memory monitoring workflow
    const measurement = PerformanceOptimizations.startMeasurement('memory-monitoring');
    
    const window = OptimizedDataStructures.createSlidingWindow(60000);
    window.add(50000000, Date.now()); // 50MB
    
    const stats = {
      current: window.getValues()[0] || 0,
      average: window.getAverage(),
      trend: 'stable'
    };
    
    PerformanceOptimizations.endMeasurement(measurement);
  }

  /**
   * Get benchmark results
   */
  getResults() {
    return this.runner.getResults();
  }

  /**
   * Get benchmark summary
   */
  getSummary() {
    return this.runner.getSummary();
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const summary = this.getSummary();
    const results = this.getResults();

    const report = {
      timestamp: new Date().toISOString(),
      summary,
      details: results.map(result => ({
        name: result.name,
        rating: result.rating,
        stats: result.stats,
        memoryStats: result.memoryStats,
        errors: result.errors?.length || 0,
        timedOut: result.timedOut || false
      })),
      recommendations: this.generateRecommendations(results)
    };

    return report;
  }

  /**
   * Generate optimization recommendations based on benchmark results
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Check for poor performing benchmarks
    const poorPerformers = results.filter(r => 
      r.rating === 'poor' || r.rating === 'unacceptable'
    );

    poorPerformers.forEach(result => {
      recommendations.push({
        category: 'performance',
        priority: result.rating === 'unacceptable' ? 'critical' : 'high',
        benchmark: result.name,
        issue: `${result.name} is performing ${result.rating}ly`,
        currentPerformance: `${result.stats?.mean?.toFixed(2)}ms average`,
        suggestion: this.getOptimizationSuggestion(result.name)
      });
    });

    // Check for high memory usage
    const highMemoryUsers = results.filter(r => 
      r.memoryStats && r.memoryStats.mean > 1000000 // 1MB
    );

    highMemoryUsers.forEach(result => {
      recommendations.push({
        category: 'memory',
        priority: 'medium',
        benchmark: result.name,
        issue: 'High memory usage detected',
        currentUsage: `${(result.memoryStats.mean / 1024 / 1024).toFixed(2)}MB average`,
        suggestion: 'Consider optimizing data structures or implementing cleanup'
      });
    });

    // Check for high error rates
    const errorProneBenchmarks = results.filter(r => 
      r.errors && r.errors.length > 0
    );

    errorProneBenchmarks.forEach(result => {
      recommendations.push({
        category: 'reliability',
        priority: 'high',
        benchmark: result.name,
        issue: `${result.errors.length} errors occurred during benchmarking`,
        suggestion: 'Review error handling and edge cases'
      });
    });

    return recommendations;
  }

  /**
   * Get optimization suggestion for specific benchmark
   */
  getOptimizationSuggestion(benchmarkName) {
    const suggestions = {
      'CircularBuffer-Push': 'Consider using typed arrays for better performance',
      'CircularBuffer-Get': 'Implement index caching for frequently accessed items',
      'SlidingWindow-Add': 'Use more efficient cleanup strategy',
      'SlidingWindow-Calculations': 'Cache calculation results when data hasn\'t changed',
      'MetricsAggregator-Set': 'Consider using Map with size limits instead of custom LRU',
      'MetricsAggregator-Get': 'Implement access frequency tracking for better caching',
      'StringInterner-Intern': 'Use WeakMap for automatic cleanup of unused strings',
      'BatchedFunction-Execution': 'Optimize batch processing algorithm',
      'ThrottledFunction-Execution': 'Use requestAnimationFrame for UI-related throttling',
      'DebouncedFunction-Execution': 'Consider using passive event listeners',
      'OverheadMonitor-StartEnd': 'Reduce measurement overhead with sampling',
      'OverheadMonitor-Statistics': 'Use incremental statistics calculation',
      'FullWorkflow-WebVitals': 'Implement lazy loading for web vitals collection',
      'FullWorkflow-ComponentTracking': 'Use component pooling to reduce allocations',
      'FullWorkflow-MemoryMonitoring': 'Implement adaptive monitoring frequency'
    };

    return suggestions[benchmarkName] || 'Review implementation for optimization opportunities';
  }

  /**
   * Clear all benchmark data
   */
  clear() {
    this.runner.clear();
  }
}

// Production-safe wrapper
const PerformanceBenchmarks = EnvironmentDetector.isProduction() ? {
  runAllBenchmarks: async () => ({ skipped: true, reason: 'Production mode' }),
  getResults: () => [],
  getSummary: () => ({ totalBenchmarks: 0 }),
  generateReport: () => ({ skipped: true }),
  clear: () => {}
} : new PerformanceMonitoringBenchmarks();

export {
  PerformanceBenchmarks,
  BenchmarkRunner,
  PerformanceMonitoringBenchmarks
};

export default PerformanceBenchmarks;