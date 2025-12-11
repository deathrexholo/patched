/**
 * Performance Monitoring Utilities
 * 
 * Provides comprehensive performance monitoring, analysis, and reporting tools
 * for development and debugging purposes.
 */

import { renderTracker, type RenderInfo } from './RenderTracker';
import { performanceTimer, type TimingStats } from './PerformanceTimer';
import { SeverityCalculator, type AlertSeverity } from './SeverityCalculator';
import { AlertDeduplicator, type DedupedAlert } from './AlertDeduplicator';
import { AlertAggregator } from './AlertAggregator';

interface AlertStatistics {
  totalAlerts: number;
  uniqueAlerts: number;
  bySeverity: Record<AlertSeverity, number>;
  byComponent: Record<string, number>;
  mostFrequent: DedupedAlert[];
}

interface PerformanceReport {
  timestamp: number;
  summary: {
    totalComponents: number;
    totalRenders: number;
    averageRenderTime: number;
    excessiveRerenders: number;
    slowRenders: number;
    totalOperations: number;
    slowOperations: number;
  };
  componentAnalysis: {
    topRerenderers: RenderInfo[];
    slowestComponents: RenderInfo[];
    problematicComponents: RenderInfo[];
  };
  operationAnalysis: {
    slowestOperations: TimingStats[];
    mostFrequentOperations: TimingStats[];
  };
  alertStatistics: AlertStatistics;
  recommendations: string[];
}

interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  component?: string;
  operation?: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  details?: string; // Additional context about what caused the alert
  renderCause?: string; // Specific render cause (state change, prop change, etc.)
  parentComponent?: string; // Parent component that might be causing re-renders
}

/**
 * Configuration interface for performance monitoring
 */
export interface MonitoringConfig {
  // Alert behavior
  enableAlerts: boolean;
  minSeverity: AlertSeverity;
  throttleInterval: number;
  deduplicationWindow: number;
  
  // Thresholds
  renderCountThreshold: number;
  renderTimeThreshold: number;
  apiTimeThreshold: number;
  
  // Console output
  enableConsoleLogging: boolean;
  logAggregatedOnly: boolean;
  maxAlertsInConsole: number;
  
  // Demo components
  enableDemoComponents: boolean;
}

class PerformanceMonitoringUtils {
  private static instance: PerformanceMonitoringUtils;
  private alerts: DedupedAlert[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private subscribers = new Set<(alert: DedupedAlert) => void>();
  private severityCalculator = new SeverityCalculator();
  private alertDeduplicator = new AlertDeduplicator();
  private alertAggregator = new AlertAggregator();
  /**
   * Default configuration values
   */
  private static readonly DEFAULT_CONFIG: MonitoringConfig = {
    // Alert behavior
    enableAlerts: true,
    minSeverity: 'low',
    throttleInterval: 30000, // 30 seconds
    deduplicationWindow: 300000, // 5 minutes
    
    // Thresholds
    renderCountThreshold: 20,
    renderTimeThreshold: 16, // ms
    apiTimeThreshold: 100, // ms
    
    // Console output
    enableConsoleLogging: true,
    logAggregatedOnly: true,
    maxAlertsInConsole: 100,
    
    // Demo components
    enableDemoComponents: false
  };

  private config: MonitoringConfig = { ...PerformanceMonitoringUtils.DEFAULT_CONFIG };

  static getInstance(): PerformanceMonitoringUtils {
    if (!PerformanceMonitoringUtils.instance) {
      PerformanceMonitoringUtils.instance = new PerformanceMonitoringUtils();
    }
    return PerformanceMonitoringUtils.instance;
  }

  /**
   * Start continuous performance monitoring
   */
  startMonitoring(intervalMs: number = 10000): void {
    if (this.isMonitoring || process.env.NODE_ENV === 'production') return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkPerformanceThresholds();
      // Cleanup old alerts based on deduplication window
      this.alertDeduplicator.cleanup(this.config.deduplicationWindow);
    }, intervalMs);

    console.log('🔍 Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🔍 Performance monitoring stopped');
  }

  /**
   * Check performance thresholds and generate alerts
   * Uses configuration thresholds for all checks
   */
  private checkPerformanceThresholds(): void {
    const renderStats = renderTracker.getAllRenderStats();
    const timerStats = performanceTimer.getAllStats();

    // Check for excessive re-renders using config threshold
    renderStats.forEach((stats, componentName) => {
      if (stats.renderCount > this.config.renderCountThreshold) {
        this.addAlert({
          type: 'warning',
          component: componentName,
          message: `Component has excessive re-renders`,
          value: stats.renderCount,
          threshold: this.config.renderCountThreshold,
          timestamp: Date.now()
        });
      }

      // Check for slow render time using config threshold
      if (stats.averageRenderTime > this.config.renderTimeThreshold) {
        this.addAlert({
          type: 'warning',
          component: componentName,
          message: `Component has slow average render time`,
          value: stats.averageRenderTime,
          threshold: this.config.renderTimeThreshold,
          timestamp: Date.now()
        });
      }
    });

    // Check for slow operations using config threshold
    timerStats.forEach((stats) => {
      if (stats.averageTime > this.config.apiTimeThreshold) {
        this.addAlert({
          type: 'warning',
          operation: stats.name,
          message: `Operation has slow average execution time`,
          value: stats.averageTime,
          threshold: this.config.apiTimeThreshold,
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * Add a performance alert
   * Respects configuration for alerts, severity filtering, and console logging
   */
  private addAlert(alert: PerformanceAlert): void {
    // Check if alerts are enabled
    if (!this.config.enableAlerts) {
      return;
    }

    // Calculate severity if not already set
    if (!alert.severity) {
      alert.severity = this.severityCalculator.calculateSeverity(alert.value, alert.threshold);
    }

    // Filter based on minimum severity
    if (!this.severityCalculator.shouldShow(alert.severity, this.config.minSeverity)) {
      return;
    }

    // Use AlertDeduplicator to handle duplicate detection
    const dedupedAlert = this.alertDeduplicator.addAlert(alert);

    // Store deduplicated alert
    this.alerts.push(dedupedAlert);

    // Limit alerts array size based on config
    if (this.alerts.length > this.config.maxAlertsInConsole) {
      this.alerts.shift();
    }

    // Notify subscribers with deduplicated alert
    this.subscribers.forEach(callback => callback(dedupedAlert));

    // Console logging based on configuration
    if (this.config.enableConsoleLogging && process.env.NODE_ENV === 'development') {
      if (this.config.logAggregatedOnly) {
        // Use AlertAggregator for throttled, aggregated logging
        const allDedupedAlerts = this.alertDeduplicator.getDedupedAlerts();
        this.alertAggregator.logAggregatedAlerts(allDedupedAlerts);
      } else {
        // Log individual alert immediately
        const emoji = this.severityCalculator.getSeverityEmoji(alert.severity);
        console.warn(`${emoji} Performance Alert [${alert.severity}]:`, {
          component: alert.component,
          operation: alert.operation,
          message: alert.message,
          value: alert.value,
          threshold: alert.threshold,
          count: dedupedAlert.count
        });
      }
    }
  }

  /**
   * Subscribe to performance alerts
   */
  subscribeToAlerts(callback: (alert: DedupedAlert) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Get recent performance alerts (deduplicated)
   */
  getRecentAlerts(limit: number = 20): DedupedAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts.length = 0;
    this.alertDeduplicator.clear();
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): AlertStatistics {
    const dedupedAlerts = this.alertDeduplicator.getDedupedAlerts();
    
    // Calculate total alerts (sum of all counts)
    const totalAlerts = dedupedAlerts.reduce((sum, alert) => sum + alert.count, 0);
    
    // Count by severity
    const bySeverity: Record<AlertSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    dedupedAlerts.forEach(alert => {
      if (alert.severity) {
        bySeverity[alert.severity] += alert.count;
      }
    });
    
    // Count by component
    const byComponent: Record<string, number> = {};
    dedupedAlerts.forEach(alert => {
      const component = alert.component || 'unknown';
      byComponent[component] = (byComponent[component] || 0) + alert.count;
    });
    
    // Get most frequent alerts (top 10 by count)
    const mostFrequent = [...dedupedAlerts]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalAlerts,
      uniqueAlerts: dedupedAlerts.length,
      bySeverity,
      byComponent,
      mostFrequent
    };
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(): PerformanceReport {
    const renderSummary = renderTracker.getPerformanceSummary();
    const timerSummary = performanceTimer.getPerformanceSummary();
    const renderStats = renderTracker.getAllRenderStats();
    const timerStats = performanceTimer.getAllStats();

    // Analyze components
    const excessiveRerenders = renderTracker.getExcessiveRerenders(10);
    const slowRenders = renderTracker.getSlowRenders(16);
    const slowOperations = performanceTimer.getSlowOperations(100);

    // Find problematic components (both excessive rerenders and slow)
    const problematicComponents = Array.from(renderStats.values()).filter(stats =>
      stats.renderCount > 10 && stats.averageRenderTime > 16
    );

    // Get most frequent operations
    const mostFrequentOperations = Array.from(timerStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get alert statistics
    const alertStatistics = this.getAlertStats();

    // Generate recommendations (including alert trends)
    const recommendations = this.generateRecommendations(
      excessiveRerenders,
      slowRenders,
      slowOperations,
      problematicComponents,
      alertStatistics
    );

    return {
      timestamp: Date.now(),
      summary: {
        totalComponents: renderSummary.totalComponents,
        totalRenders: renderSummary.totalRenders,
        averageRenderTime: renderSummary.averageRenderTime,
        excessiveRerenders: renderSummary.excessiveRerenders,
        slowRenders: renderSummary.slowRenders,
        totalOperations: timerSummary.totalOperations,
        slowOperations: timerSummary.slowOperations
      },
      componentAnalysis: {
        topRerenderers: excessiveRerenders.slice(0, 10),
        slowestComponents: slowRenders.slice(0, 10),
        problematicComponents: problematicComponents.slice(0, 10)
      },
      operationAnalysis: {
        slowestOperations: slowOperations.slice(0, 10),
        mostFrequentOperations
      },
      alertStatistics,
      recommendations
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    excessiveRerenders: RenderInfo[],
    slowRenders: RenderInfo[],
    slowOperations: TimingStats[],
    problematicComponents: RenderInfo[],
    alertStatistics: AlertStatistics
  ): string[] {
    const recommendations: string[] = [];

    if (excessiveRerenders.length > 0) {
      recommendations.push(
        `${excessiveRerenders.length} components have excessive re-renders. Consider using React.memo, useMemo, or useCallback to optimize.`
      );
    }

    if (slowRenders.length > 0) {
      recommendations.push(
        `${slowRenders.length} components have slow render times. Consider code splitting, virtualization, or optimizing expensive calculations.`
      );
    }

    if (slowOperations.length > 0) {
      recommendations.push(
        `${slowOperations.length} operations are running slowly. Consider optimizing algorithms, adding caching, or moving work to web workers.`
      );
    }

    if (problematicComponents.length > 0) {
      recommendations.push(
        `${problematicComponents.length} components have both excessive re-renders and slow render times. These should be prioritized for optimization.`
      );
    }

    // Specific recommendations based on patterns
    const apiOperations = slowOperations.filter(op => op.category === 'api');
    if (apiOperations.length > 0) {
      recommendations.push(
        'Slow API operations detected. Consider implementing request caching, debouncing, or optimistic updates.'
      );
    }

    const componentOperations = slowOperations.filter(op => op.category === 'component');
    if (componentOperations.length > 0) {
      recommendations.push(
        'Slow component operations detected. Consider lazy loading, code splitting, or moving heavy computations to useEffect.'
      );
    }

    // Alert-based recommendations
    if (alertStatistics.bySeverity.critical > 0) {
      recommendations.push(
        `${alertStatistics.bySeverity.critical} critical alerts detected. These require immediate attention to prevent severe performance degradation.`
      );
    }

    if (alertStatistics.bySeverity.high > 0) {
      recommendations.push(
        `${alertStatistics.bySeverity.high} high-severity alerts detected. Address these issues to improve application performance.`
      );
    }

    // Component-specific alert recommendations
    const topAlertComponents = Object.entries(alertStatistics.byComponent)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (topAlertComponents.length > 0 && topAlertComponents[0][1] > 5) {
      const componentNames = topAlertComponents.map(([name]) => name).join(', ');
      recommendations.push(
        `Components with most alerts: ${componentNames}. Focus optimization efforts on these components.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! No major issues detected.');
    }

    return recommendations;
  }

  /**
   * Log performance report to console
   */
  logPerformanceReport(): void {
    if (process.env.NODE_ENV === 'production') return;

    const report = this.generatePerformanceReport();

    console.group('📊 Performance Report');
    console.log('Generated at:', new Date(report.timestamp).toLocaleString());

    console.group('📈 Summary');
    console.table(report.summary);
    console.groupEnd();

    if (report.componentAnalysis.topRerenderers.length > 0) {
      console.group('🔄 Top Re-renderers');
      console.table(report.componentAnalysis.topRerenderers.map(c => ({
        component: c.componentName,
        renders: c.renderCount,
        avgTime: `${c.averageRenderTime.toFixed(2)}ms`
      })));
      console.groupEnd();
    }

    if (report.componentAnalysis.slowestComponents.length > 0) {
      console.group('🐌 Slowest Components');
      console.table(report.componentAnalysis.slowestComponents.map(c => ({
        component: c.componentName,
        avgTime: `${c.averageRenderTime.toFixed(2)}ms`,
        renders: c.renderCount
      })));
      console.groupEnd();
    }

    if (report.operationAnalysis.slowestOperations.length > 0) {
      console.group('⏱️ Slowest Operations');
      console.table(report.operationAnalysis.slowestOperations.map(o => ({
        operation: o.name,
        category: o.category,
        avgTime: `${o.averageTime.toFixed(2)}ms`,
        count: o.count
      })));
      console.groupEnd();
    }

    // Alert statistics section
    if (report.alertStatistics.totalAlerts > 0) {
      console.group('🚨 Alert Statistics');
      
      console.log('Alert Summary:');
      console.table({
        'Total Alerts': report.alertStatistics.totalAlerts,
        'Unique Alerts': report.alertStatistics.uniqueAlerts
      });

      console.log('Alerts by Severity:');
      console.table(report.alertStatistics.bySeverity);

      if (Object.keys(report.alertStatistics.byComponent).length > 0) {
        console.log('Top Components by Alert Frequency:');
        const topComponents = Object.entries(report.alertStatistics.byComponent)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([component, count]) => ({ component, count }));
        console.table(topComponents);
      }

      if (report.alertStatistics.mostFrequent.length > 0) {
        console.log('Most Frequent Alerts:');
        console.table(report.alertStatistics.mostFrequent.slice(0, 5).map(alert => ({
          component: alert.component || 'N/A',
          message: alert.message,
          count: alert.count,
          severity: alert.severity || 'N/A'
        })));
      }

      console.groupEnd();
    }

    if (report.recommendations.length > 0) {
      console.group('💡 Recommendations');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Export performance data for external analysis
   */
  exportPerformanceData(): {
    renderData: Map<string, RenderInfo>;
    timerData: Map<string, TimingStats>;
    alerts: DedupedAlert[];
    report: PerformanceReport;
  } {
    return {
      renderData: renderTracker.getAllRenderStats(),
      timerData: performanceTimer.getAllStats(),
      alerts: this.alerts,
      report: this.generatePerformanceReport()
    };
  }

  /**
   * Reset all performance data
   */
  resetAllData(): void {
    renderTracker.clear();
    performanceTimer.clear();
    this.clearAlerts();
    console.log('🔄 All performance data reset');
  }

  /**
   * Configure monitoring behavior
   * Validates configuration values before applying
   */
  configure(config: Partial<MonitoringConfig>): void {
    // Validate minSeverity if provided
    if (config.minSeverity) {
      const validSeverities: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(config.minSeverity)) {
        console.error(`❌ Invalid minSeverity: ${config.minSeverity}. Must be one of: ${validSeverities.join(', ')}`);
        return;
      }
    }

    // Validate numeric values if provided
    const numericFields = [
      'throttleInterval',
      'deduplicationWindow',
      'renderCountThreshold',
      'renderTimeThreshold',
      'apiTimeThreshold',
      'maxAlertsInConsole'
    ] as const;

    for (const field of numericFields) {
      if (config[field] !== undefined) {
        const value = config[field] as number;
        if (typeof value !== 'number' || value < 0) {
          console.error(`❌ Invalid ${field}: must be a non-negative number`);
          return;
        }
      }
    }

    // Validate boolean values if provided
    const booleanFields = [
      'enableAlerts',
      'enableConsoleLogging',
      'logAggregatedOnly',
      'enableDemoComponents'
    ] as const;

    for (const field of booleanFields) {
      if (config[field] !== undefined && typeof config[field] !== 'boolean') {
        console.error(`❌ Invalid ${field}: must be a boolean`);
        return;
      }
    }

    // Apply configuration
    this.config = { ...this.config, ...config };

    // Sync throttle interval with AlertAggregator
    if (config.throttleInterval !== undefined) {
      this.alertAggregator.setThrottleInterval(config.throttleInterval);
    }

    console.log('⚙️ Monitoring configuration updated:', this.config);
  }

  /**
   * Get current configuration
   * Returns a copy to prevent external modification
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Reset configuration to default values
   */
  resetConfig(): void {
    this.config = { ...PerformanceMonitoringUtils.DEFAULT_CONFIG };
    
    // Sync throttle interval with AlertAggregator
    this.alertAggregator.setThrottleInterval(this.config.throttleInterval);
    
    console.log('⚙️ Monitoring configuration reset to defaults');
  }

  /**
   * Set minimum severity level for alerts
   * Allows runtime changes to filter out lower severity alerts
   */
  setMinSeverity(severity: AlertSeverity): void {
    const validSeverities: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      console.error(`❌ Invalid severity level: ${severity}. Must be one of: ${validSeverities.join(', ')}`);
      return;
    }
    
    this.config.minSeverity = severity;
    console.log(`🔧 Minimum severity set to: ${severity}`);
    console.log(`   Only alerts with severity ${severity} or higher will be shown`);
  }

  /**
   * Get current minimum severity level
   */
  getMinSeverity(): AlertSeverity {
    return this.config.minSeverity;
  }

  /**
   * Enable or disable alerts
   */
  setAlertsEnabled(enabled: boolean): void {
    this.config.enableAlerts = enabled;
    console.log(`🔧 Alerts ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get filtered alerts based on minimum severity
   * @param minSeverity - Optional minimum severity to filter by (defaults to config)
   */
  getFilteredAlerts(minSeverity?: AlertSeverity): DedupedAlert[] {
    const filterSeverity = minSeverity || this.config.minSeverity;
    return this.alerts.filter(alert => {
      if (!alert.severity) return true;
      return this.severityCalculator.shouldShow(alert.severity, filterSeverity);
    });
  }

  /**
   * Get alerts grouped by severity level
   * @param minSeverity - Optional minimum severity to filter by
   */
  getAlertsBySeverity(minSeverity?: AlertSeverity): Record<AlertSeverity, DedupedAlert[]> {
    const filtered = minSeverity ? this.getFilteredAlerts(minSeverity) : this.alerts;
    
    const grouped: Record<AlertSeverity, DedupedAlert[]> = {
      low: [],
      medium: [],
      high: [],
      critical: []
    };

    filtered.forEach(alert => {
      if (alert.severity) {
        grouped[alert.severity].push(alert);
      }
    });

    return grouped;
  }

  /**
   * Get count of alerts by severity level
   * @param minSeverity - Optional minimum severity to filter by
   */
  getAlertCountBySeverity(minSeverity?: AlertSeverity): Record<AlertSeverity, number> {
    const grouped = this.getAlertsBySeverity(minSeverity);
    
    return {
      low: grouped.low.length,
      medium: grouped.medium.length,
      high: grouped.high.length,
      critical: grouped.critical.length
    };
  }

  /**
   * Get severity calculator instance
   */
  getSeverityCalculator(): SeverityCalculator {
    return this.severityCalculator;
  }
}

export const performanceMonitoringUtils = PerformanceMonitoringUtils.getInstance();
export type { PerformanceReport, PerformanceAlert, DedupedAlert, AlertStatistics };