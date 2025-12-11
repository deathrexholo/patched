/**
 * Search Performance Monitor
 * Tracks and analyzes search performance metrics
 */

import { SearchQuery, SearchPerformanceMetrics } from '../../types/models/search';

interface SearchMetric {
  timestamp: number;
  query: SearchQuery;
  responseTime: number;
  resultCount: number;
  cached: boolean;
  errorOccurred: boolean;
  errorType?: string;
}

interface PerformanceAlert {
  id: string;
  type: 'response_time' | 'error_rate' | 'cache_hit_rate';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
  value: number;
  threshold: number;
}

class SearchPerformanceMonitor {
  private metrics: SearchMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private maxMetricsHistory = 10000; // Keep last 10k searches
  private maxAlertsHistory = 1000; // Keep last 1k alerts
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];

  /**
   * Record a search operation
   */
  recordSearch(
    query: SearchQuery,
    responseTime: number,
    resultCount: number,
    cached: boolean = false,
    errorOccurred: boolean = false,
    errorType?: string
  ): void {
    const metric: SearchMetric = {
      timestamp: Date.now(),
      query,
      responseTime,
      resultCount,
      cached,
      errorOccurred,
      errorType
    };

    this.metrics.push(metric);

    // Trim old metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Check for performance issues
    this.checkPerformanceThresholds();
  }

  /**
   * Get real-time performance status
   */
  getRealtimeStatus(): {
    totalSearches: number;
    averageResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
    searchesPerMinute: number;
    activeAlerts: number;
  } {
    const now = Date.now();
    const lastHour = now - (60 * 60 * 1000);
    const lastMinute = now - (60 * 1000);

    const recentMetrics = this.metrics.filter(m => m.timestamp >= lastHour);
    const lastMinuteMetrics = this.metrics.filter(m => m.timestamp >= lastMinute);

    const totalSearches = recentMetrics.length;
    const errorCount = recentMetrics.filter(m => m.errorOccurred).length;
    const cachedCount = recentMetrics.filter(m => m.cached).length;
    const totalResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0);

    return {
      totalSearches,
      averageResponseTime: totalSearches > 0 ? totalResponseTime / totalSearches : 0,
      errorRate: totalSearches > 0 ? (errorCount / totalSearches) * 100 : 0,
      cacheHitRate: totalSearches > 0 ? (cachedCount / totalSearches) * 100 : 0,
      searchesPerMinute: lastMinuteMetrics.length,
      activeAlerts: this.getActiveAlerts().length
    };
  }

  /**
   * Get detailed performance metrics for a date range
   */
  getMetrics(dateRange?: { start: Date; end: Date }): SearchPerformanceMetrics {
    let filteredMetrics = this.metrics;

    if (dateRange) {
      const startTime = dateRange.start.getTime();
      const endTime = dateRange.end.getTime();
      filteredMetrics = this.metrics.filter(
        m => m.timestamp >= startTime && m.timestamp <= endTime
      );
    }

    const totalSearches = filteredMetrics.length;
    const errorCount = filteredMetrics.filter(m => m.errorOccurred).length;
    const cachedCount = filteredMetrics.filter(m => m.cached).length;
    const totalResponseTime = filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0);

    // Calculate popular search terms
    const termCounts = new Map<string, number>();
    filteredMetrics.forEach(m => {
      const term = m.query.term.toLowerCase().trim();
      if (term) {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      }
    });

    const popularSearchTerms = Array.from(termCounts.entries())
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Find slow queries
    const slowQueries = filteredMetrics
      .filter(m => m.responseTime > 2000) // Queries slower than 2 seconds
      .map(m => ({
        query: m.query.term,
        responseTime: m.responseTime
      }))
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10);

    return {
      totalSearches,
      averageResponseTime: totalSearches > 0 ? totalResponseTime / totalSearches : 0,
      errorRate: totalSearches > 0 ? (errorCount / totalSearches) * 100 : 0,
      cacheHitRate: totalSearches > 0 ? (cachedCount / totalSearches) * 100 : 0,
      popularSearchTerms,
      slowQueries
    };
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(hours: number = 24): Array<{
    timestamp: number;
    averageResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
    searchCount: number;
  }> {
    const startTime = Date.now() - (hours * 60 * 60 * 1000);
    const intervalMs = (hours * 60 * 60 * 1000) / 24; // 24 data points

    const trends = [];
    
    for (let i = 0; i < 24; i++) {
      const intervalStart = startTime + (i * intervalMs);
      const intervalEnd = intervalStart + intervalMs;
      
      const intervalMetrics = this.metrics.filter(
        m => m.timestamp >= intervalStart && m.timestamp < intervalEnd
      );

      const searchCount = intervalMetrics.length;
      const errorCount = intervalMetrics.filter(m => m.errorOccurred).length;
      const cachedCount = intervalMetrics.filter(m => m.cached).length;
      const totalResponseTime = intervalMetrics.reduce((sum, m) => sum + m.responseTime, 0);

      trends.push({
        timestamp: intervalStart,
        averageResponseTime: searchCount > 0 ? totalResponseTime / searchCount : 0,
        errorRate: searchCount > 0 ? (errorCount / searchCount) * 100 : 0,
        cacheHitRate: searchCount > 0 ? (cachedCount / searchCount) * 100 : 0,
        searchCount
      });
    }

    return trends;
  }

  /**
   * Get optimization suggestions based on performance data
   */
  getOptimizationSuggestions(): Array<{
    type: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    impact: string;
    implementation: string;
  }> {
    const suggestions = [];
    const metrics = this.getRealtimeStatus();

    // High response time
    if (metrics.averageResponseTime > 1500) {
      suggestions.push({
        type: 'response_time',
        priority: 'high' as const,
        description: 'Average response time is high',
        impact: 'Improve user experience and reduce perceived latency',
        implementation: 'Enable caching, optimize queries, or increase timeout thresholds'
      });
    }

    // Low cache hit rate
    if (metrics.cacheHitRate < 70) {
      suggestions.push({
        type: 'caching',
        priority: 'medium' as const,
        description: 'Cache hit rate is below optimal',
        impact: 'Reduce server load and improve response times',
        implementation: 'Increase cache TTL or improve cache key strategy'
      });
    }

    // High error rate
    if (metrics.errorRate > 3) {
      suggestions.push({
        type: 'reliability',
        priority: 'high' as const,
        description: 'Error rate is above acceptable threshold',
        impact: 'Improve system reliability and user satisfaction',
        implementation: 'Investigate error causes and implement better error handling'
      });
    }

    // High search volume
    if (metrics.searchesPerMinute > 100) {
      suggestions.push({
        type: 'scalability',
        priority: 'medium' as const,
        description: 'High search volume detected',
        impact: 'Ensure system can handle peak loads',
        implementation: 'Consider implementing rate limiting or load balancing'
      });
    }

    return suggestions;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp >= oneHourAgo);
  }

  /**
   * Get all alerts for a date range
   */
  getAlerts(dateRange?: { start: Date; end: Date }): PerformanceAlert[] {
    if (!dateRange) {
      return [...this.alerts];
    }

    const startTime = dateRange.start.getTime();
    const endTime = dateRange.end.getTime();
    
    return this.alerts.filter(
      alert => alert.timestamp >= startTime && alert.timestamp <= endTime
    );
  }

  /**
   * Subscribe to performance alerts
   */
  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clear old metrics and alerts
   */
  cleanup(): void {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    this.metrics = this.metrics.filter(m => m.timestamp >= oneWeekAgo);
    this.alerts = this.alerts.filter(a => a.timestamp >= oneWeekAgo);
  }

  /**
   * Export performance data
   */
  exportData(dateRange?: { start: Date; end: Date }): {
    metrics: SearchMetric[];
    alerts: PerformanceAlert[];
    summary: SearchPerformanceMetrics;
  } {
    const metrics = dateRange 
      ? this.metrics.filter(m => 
          m.timestamp >= dateRange.start.getTime() && 
          m.timestamp <= dateRange.end.getTime()
        )
      : this.metrics;

    const alerts = dateRange
      ? this.getAlerts(dateRange)
      : this.alerts;

    const summary = this.getMetrics(dateRange);

    return { metrics, alerts, summary };
  }

  /**
   * Private methods
   */
  private checkPerformanceThresholds(): void {
    const recentMetrics = this.metrics.slice(-100); // Last 100 searches
    if (recentMetrics.length < 10) return; // Need minimum data

    const now = Date.now();
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    const errorRate = (recentMetrics.filter(m => m.errorOccurred).length / recentMetrics.length) * 100;
    const cacheHitRate = (recentMetrics.filter(m => m.cached).length / recentMetrics.length) * 100;

    // Check response time threshold
    if (avgResponseTime > 2000) {
      this.createAlert({
        type: 'response_time',
        severity: avgResponseTime > 5000 ? 'critical' : 'warning',
        message: `Average response time is ${Math.round(avgResponseTime)}ms`,
        value: avgResponseTime,
        threshold: 2000
      });
    }

    // Check error rate threshold
    if (errorRate > 5) {
      this.createAlert({
        type: 'error_rate',
        severity: errorRate > 15 ? 'critical' : 'warning',
        message: `Error rate is ${errorRate.toFixed(1)}%`,
        value: errorRate,
        threshold: 5
      });
    }

    // Check cache hit rate threshold
    if (cacheHitRate < 70) {
      this.createAlert({
        type: 'cache_hit_rate',
        severity: cacheHitRate < 50 ? 'critical' : 'warning',
        message: `Cache hit rate is ${cacheHitRate.toFixed(1)}%`,
        value: cacheHitRate,
        threshold: 70
      });
    }
  }

  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp'>): void {
    // Don't create duplicate alerts within 5 minutes
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentSimilarAlert = this.alerts.find(
      alert => 
        alert.type === alertData.type && 
        alert.timestamp >= fiveMinutesAgo
    );

    if (recentSimilarAlert) return;

    const alert: PerformanceAlert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now()
    };

    this.alerts.push(alert);

    // Trim old alerts
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts = this.alerts.slice(-this.maxAlertsHistory);
    }

    // Notify subscribers
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
  }
}

// Create singleton instance
const searchPerformanceMonitor = new SearchPerformanceMonitor();

export default searchPerformanceMonitor;
export { searchPerformanceMonitor, SearchPerformanceMonitor };
export type { SearchMetric, PerformanceAlert };