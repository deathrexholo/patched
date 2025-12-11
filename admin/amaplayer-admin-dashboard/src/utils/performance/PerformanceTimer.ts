/**
 * Performance Timing Utilities
 * 
 * Provides comprehensive timing measurements for various operations
 * including component renders, API calls, and custom operations.
 */

interface TimingMeasurement {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  category: 'component' | 'api' | 'custom' | 'navigation' | 'resource';
  metadata?: Record<string, any>;
}

interface TimingStats {
  name: string;
  category: string;
  count: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  lastMeasurement: number;
}

class PerformanceTimer {
  private static instance: PerformanceTimer;
  private measurements = new Map<string, TimingMeasurement>();
  private completedMeasurements: TimingMeasurement[] = [];
  private stats = new Map<string, TimingStats>();
  private isEnabled = process.env.NODE_ENV === 'development';
  private maxMeasurements = 1000;

  static getInstance(): PerformanceTimer {
    if (!PerformanceTimer.instance) {
      PerformanceTimer.instance = new PerformanceTimer();
    }
    return PerformanceTimer.instance;
  }

  /**
   * Start timing an operation
   */
  start(
    name: string, 
    category: TimingMeasurement['category'] = 'custom',
    metadata?: Record<string, any>
  ): string {
    if (!this.isEnabled) return name;

    const measurementId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const measurement: TimingMeasurement = {
      name,
      startTime: performance.now(),
      category,
      metadata
    };

    this.measurements.set(measurementId, measurement);
    
    // Use Performance API mark if available
    if (performance.mark) {
      try {
        performance.mark(`${name}-start`);
      } catch (e) {
        // Ignore errors in mark creation
      }
    }

    return measurementId;
  }

  /**
   * End timing an operation
   */
  end(measurementId: string): number | null {
    if (!this.isEnabled) return null;

    const measurement = this.measurements.get(measurementId);
    if (!measurement) return null;

    const endTime = performance.now();
    const duration = endTime - measurement.startTime;

    // Complete the measurement
    const completedMeasurement: TimingMeasurement = {
      ...measurement,
      endTime,
      duration
    };

    // Remove from active measurements
    this.measurements.delete(measurementId);

    // Add to completed measurements
    this.completedMeasurements.push(completedMeasurement);
    
    // Limit completed measurements
    if (this.completedMeasurements.length > this.maxMeasurements) {
      this.completedMeasurements.shift();
    }

    // Update statistics
    this.updateStats(completedMeasurement);

    // Use Performance API measure if available
    if (performance.measure && performance.mark) {
      try {
        performance.mark(`${measurement.name}-end`);
        performance.measure(
          `${measurement.name}-duration`,
          `${measurement.name}-start`,
          `${measurement.name}-end`
        );
      } catch (e) {
        // Ignore errors in measure creation
      }
    }

    return duration;
  }

  /**
   * Measure a synchronous operation
   */
  measure<T>(
    name: string,
    operation: () => T,
    category: TimingMeasurement['category'] = 'custom',
    metadata?: Record<string, any>
  ): { result: T; duration: number } {
    if (!this.isEnabled) {
      return { result: operation(), duration: 0 };
    }

    const measurementId = this.start(name, category, metadata);
    const result = operation();
    const duration = this.end(measurementId) || 0;

    return { result, duration };
  }

  /**
   * Measure an asynchronous operation
   */
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    category: TimingMeasurement['category'] = 'custom',
    metadata?: Record<string, any>
  ): Promise<{ result: T; duration: number }> {
    if (!this.isEnabled) {
      return { result: await operation(), duration: 0 };
    }

    const measurementId = this.start(name, category, metadata);
    const result = await operation();
    const duration = this.end(measurementId) || 0;

    return { result, duration };
  }

  /**
   * Update statistics for a completed measurement
   */
  private updateStats(measurement: TimingMeasurement): void {
    if (!measurement.duration) return;

    const key = `${measurement.category}:${measurement.name}`;
    const existing = this.stats.get(key);

    if (existing) {
      const newStats: TimingStats = {
        ...existing,
        count: existing.count + 1,
        totalTime: existing.totalTime + measurement.duration,
        averageTime: (existing.totalTime + measurement.duration) / (existing.count + 1),
        minTime: Math.min(existing.minTime, measurement.duration),
        maxTime: Math.max(existing.maxTime, measurement.duration),
        lastMeasurement: Date.now()
      };
      this.stats.set(key, newStats);
    } else {
      const newStats: TimingStats = {
        name: measurement.name,
        category: measurement.category,
        count: 1,
        totalTime: measurement.duration,
        averageTime: measurement.duration,
        minTime: measurement.duration,
        maxTime: measurement.duration,
        lastMeasurement: Date.now()
      };
      this.stats.set(key, newStats);
    }
  }

  /**
   * Get timing statistics for a specific operation
   */
  getStats(name: string, category?: string): TimingStats | null {
    const key = category ? `${category}:${name}` : name;
    
    // Try exact match first
    let stats = this.stats.get(key);
    if (stats) return stats;

    // If no category specified, try to find any match
    if (!category) {
      for (const [statKey, statValue] of this.stats.entries()) {
        if (statKey.endsWith(`:${name}`)) {
          return statValue;
        }
      }
    }

    return null;
  }

  /**
   * Get all timing statistics
   */
  getAllStats(): Map<string, TimingStats> {
    return new Map(this.stats);
  }

  /**
   * Get statistics by category
   */
  getStatsByCategory(category: string): TimingStats[] {
    const categoryStats: TimingStats[] = [];
    
    this.stats.forEach((stats, key) => {
      if (key.startsWith(`${category}:`)) {
        categoryStats.push(stats);
      }
    });

    return categoryStats.sort((a, b) => b.averageTime - a.averageTime);
  }

  /**
   * Get recent measurements
   */
  getRecentMeasurements(limit: number = 50): TimingMeasurement[] {
    return this.completedMeasurements.slice(-limit);
  }

  /**
   * Get measurements by category
   */
  getMeasurementsByCategory(category: string, limit: number = 50): TimingMeasurement[] {
    return this.completedMeasurements
      .filter(m => m.category === category)
      .slice(-limit);
  }

  /**
   * Get slow operations (above threshold)
   */
  getSlowOperations(thresholdMs: number = 100): TimingStats[] {
    const slow: TimingStats[] = [];
    
    this.stats.forEach(stats => {
      if (stats.averageTime > thresholdMs) {
        slow.push(stats);
      }
    });

    return slow.sort((a, b) => b.averageTime - a.averageTime);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalOperations: number;
    totalMeasurements: number;
    averageOperationTime: number;
    slowOperations: number;
    categorySummary: Record<string, {
      count: number;
      averageTime: number;
      totalTime: number;
    }>;
  } {
    let totalMeasurements = 0;
    let totalTime = 0;
    let slowOperations = 0;
    const categorySummary: Record<string, { count: number; averageTime: number; totalTime: number }> = {};

    this.stats.forEach(stats => {
      totalMeasurements += stats.count;
      totalTime += stats.totalTime;
      
      if (stats.averageTime > 100) slowOperations++;

      if (!categorySummary[stats.category]) {
        categorySummary[stats.category] = {
          count: 0,
          averageTime: 0,
          totalTime: 0
        };
      }

      const categoryStats = categorySummary[stats.category];
      categoryStats.count += stats.count;
      categoryStats.totalTime += stats.totalTime;
      categoryStats.averageTime = categoryStats.totalTime / categoryStats.count;
    });

    return {
      totalOperations: this.stats.size,
      totalMeasurements,
      averageOperationTime: totalMeasurements > 0 ? totalTime / totalMeasurements : 0,
      slowOperations,
      categorySummary
    };
  }

  /**
   * Clear all measurements and statistics
   */
  clear(): void {
    this.measurements.clear();
    this.completedMeasurements.length = 0;
    this.stats.clear();
  }

  /**
   * Enable or disable timing
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled && process.env.NODE_ENV === 'development';
  }

  /**
   * Get active measurements (not yet completed)
   */
  getActiveMeasurements(): Map<string, TimingMeasurement> {
    return new Map(this.measurements);
  }

  /**
   * Cancel an active measurement
   */
  cancel(measurementId: string): boolean {
    return this.measurements.delete(measurementId);
  }
}

export const performanceTimer = PerformanceTimer.getInstance();
export type { TimingMeasurement, TimingStats };