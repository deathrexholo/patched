/**
 * Alert Aggregation and Throttling System
 * 
 * Groups related alerts and throttles console output to prevent flooding.
 */

import type { DedupedAlert } from './AlertDeduplicator';
import { SeverityCalculator, type AlertSeverity } from './SeverityCalculator';

/**
 * Component render details for hierarchy tracking
 */
export interface ComponentRenderDetail {
  componentName: string;
  renderCount: number;
  childComponents: Map<string, ComponentRenderDetail>;
  causes: string[]; // What triggered the re-render
  avgRenderTime?: number;
}

/**
 * Aggregated alert group
 */
export interface AlertAggregation {
  key: string;
  componentName?: string;
  category: string;
  alerts: DedupedAlert[];
  totalCount: number;
  timeRange: { start: number; end: number };
  severity: AlertSeverity;
  summary: string;
  renderHierarchy?: ComponentRenderDetail; // New: detailed component hierarchy
}

/**
 * AlertAggregator class
 * 
 * Manages alert aggregation and throttling to prevent console flooding.
 */
export class AlertAggregator {
  private aggregations: Map<string, AlertAggregation>;
  private throttleInterval: number;
  private lastLogTime: number;
  private severityCalculator: SeverityCalculator;

  constructor(throttleInterval: number = 30000) { // Default 30 seconds
    this.aggregations = new Map();
    this.throttleInterval = throttleInterval;
    this.lastLogTime = 0;
    this.severityCalculator = new SeverityCalculator();
  }

  /**
   * Aggregate alerts by component/category
   * 
   * @param alerts - Array of deduplicated alerts to aggregate
   * @returns Array of alert aggregations
   */
  aggregate(alerts: DedupedAlert[]): AlertAggregation[] {
    this.aggregations.clear();

    // Group alerts by component
    alerts.forEach(alert => {
      const key = alert.component || 'system';
      
      if (!this.aggregations.has(key)) {
        // Create new aggregation
        const aggregation: AlertAggregation = {
          key,
          componentName: alert.component,
          category: this.getCategoryFromAlert(alert),
          alerts: [alert],
          totalCount: alert.count,
          timeRange: {
            start: alert.firstSeen,
            end: alert.lastSeen
          },
          severity: this.calculateSeverity(alert),
          summary: ''
        };
        
        this.aggregations.set(key, aggregation);
      } else {
        // Update existing aggregation
        const aggregation = this.aggregations.get(key)!;
        aggregation.alerts.push(alert);
        aggregation.totalCount += alert.count;
        
        // Update time range
        aggregation.timeRange.start = Math.min(aggregation.timeRange.start, alert.firstSeen);
        aggregation.timeRange.end = Math.max(aggregation.timeRange.end, alert.lastSeen);
        
        // Update severity to highest
        const alertSeverity = this.calculateSeverity(alert);
        if (this.compareSeverity(alertSeverity, aggregation.severity) > 0) {
          aggregation.severity = alertSeverity;
        }
      }
    });

    // Generate summaries and render hierarchies for each aggregation
    this.aggregations.forEach(aggregation => {
      aggregation.summary = this.generateSummary(aggregation);
      
      // Build render hierarchy for render-related alerts
      if (aggregation.category === 'renders') {
        aggregation.renderHierarchy = this.buildRenderHierarchy(aggregation.alerts);
      }
    });

    return Array.from(this.aggregations.values());
  }

  /**
   * Determine if alerts should be logged now based on throttle interval
   * 
   * @param forceCritical - Force logging if there are critical alerts
   * @returns True if alerts should be logged
   */
  shouldLog(forceCritical: boolean = false): boolean {
    const now = Date.now();
    const timeSinceLastLog = now - this.lastLogTime;

    // Always log critical alerts immediately
    if (forceCritical) {
      return true;
    }

    // Check if throttle interval has passed
    if (timeSinceLastLog >= this.throttleInterval) {
      return true;
    }

    return false;
  }

  /**
   * Log aggregated alerts to console with formatting
   * 
   * @param alerts - Array of deduplicated alerts to log
   */
  logAggregatedAlerts(alerts: DedupedAlert[]): void {
    if (alerts.length === 0) {
      return;
    }

    const aggregations = this.aggregate(alerts);
    
    // Check if we should log (including critical check)
    const hasCritical = aggregations.some(agg => agg.severity === 'critical');
    if (!this.shouldLog(hasCritical)) {
      return;
    }

    // Update last log time
    this.lastLogTime = Date.now();

    // Calculate summary statistics
    const totalAlerts = aggregations.reduce((sum, agg) => sum + agg.totalCount, 0);
    const uniqueComponents = new Set(aggregations.map(agg => agg.componentName).filter(Boolean)).size;
    const overallTimeRange = this.calculateOverallTimeRange(aggregations);

    // Group by severity
    const bySeverity = this.groupBySeverity(aggregations);

    // Log aggregated alerts with clean formatting
    console.group('🔍 Performance Alert Summary');
    console.log(`📊 Total: ${totalAlerts} alerts | Components: ${uniqueComponents} | Duration: ${this.formatTimeRange(overallTimeRange)}`);

    // Log by severity level
    (['critical', 'high', 'medium', 'low'] as AlertSeverity[]).forEach(severity => {
      const severityAlerts = bySeverity.get(severity);
      if (severityAlerts && severityAlerts.length > 0) {
        const emoji = this.getSeverityEmoji(severity);
        console.group(`${emoji} ${severity.toUpperCase()} (${severityAlerts.length} component${severityAlerts.length > 1 ? 's' : ''})`);
        
        severityAlerts.forEach(agg => {
          const componentName = agg.componentName || 'System';
          const duration = this.formatTimeRange(agg.timeRange);
          
          console.log(`• ${componentName}: ${agg.totalCount} occurrence${agg.totalCount > 1 ? 's' : ''} over ${duration}`);
          
          // Show detailed render hierarchy for render-related alerts
          if (agg.category === 'renders' && agg.renderHierarchy) {
            this.logRenderHierarchy(agg.renderHierarchy, '  ');
          } else {
            // Show traditional issues summary for non-render alerts
            const issues = agg.alerts.map(a => a.message).join(', ');
            console.log(`  ${issues}`);
          }
        });
        
        console.groupEnd();
      }
    });

    console.groupEnd();
  }

  /**
   * Calculate severity based on alert value vs threshold
   */
  private calculateSeverity(alert: DedupedAlert): AlertSeverity {
    // Use alert's severity if already calculated, otherwise calculate it
    if (alert.severity) {
      return alert.severity;
    }
    return this.severityCalculator.calculateSeverity(alert.value, alert.threshold);
  }

  /**
   * Compare two severity levels
   * @returns Positive if sev1 > sev2, negative if sev1 < sev2, 0 if equal
   */
  private compareSeverity(sev1: AlertSeverity, sev2: AlertSeverity): number {
    return this.severityCalculator.compareSeverity(sev1, sev2);
  }

  /**
   * Get category from alert
   */
  private getCategoryFromAlert(alert: DedupedAlert): string {
    if (alert.message.includes('re-render')) return 'renders';
    if (alert.message.includes('slow')) return 'performance';
    if (alert.operation) return 'operations';
    return 'general';
  }

  /**
   * Generate summary text for aggregation
   */
  private generateSummary(aggregation: AlertAggregation): string {
    const component = aggregation.componentName || 'System';
    const count = aggregation.totalCount;
    const issues = aggregation.alerts.length;
    
    return `${component}: ${count} alerts (${issues} unique issues)`;
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: AlertSeverity): string {
    return this.severityCalculator.getSeverityEmoji(severity);
  }

  /**
   * Calculate overall time range from aggregations
   */
  private calculateOverallTimeRange(aggregations: AlertAggregation[]): { start: number; end: number } {
    if (aggregations.length === 0) {
      return { start: Date.now(), end: Date.now() };
    }

    const start = Math.min(...aggregations.map(agg => agg.timeRange.start));
    const end = Math.max(...aggregations.map(agg => agg.timeRange.end));

    return { start, end };
  }

  /**
   * Group aggregations by severity
   */
  private groupBySeverity(aggregations: AlertAggregation[]): Map<AlertSeverity, AlertAggregation[]> {
    const grouped = new Map<AlertSeverity, AlertAggregation[]>();

    aggregations.forEach(agg => {
      if (!grouped.has(agg.severity)) {
        grouped.set(agg.severity, []);
      }
      grouped.get(agg.severity)!.push(agg);
    });

    return grouped;
  }

  /**
   * Format time range for display
   */
  private formatTimeRange(timeRange: { start: number; end: number }): string {
    const duration = timeRange.end - timeRange.start;
    
    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${Math.round(duration / 1000)}s`;
    } else {
      return `${Math.round(duration / 60000)}m`;
    }
  }

  /**
   * Log render hierarchy with detailed breakdown
   */
  private logRenderHierarchy(hierarchy: ComponentRenderDetail, indent: string = ''): void {
    const renderInfo = hierarchy.avgRenderTime 
      ? ` (avg: ${hierarchy.avgRenderTime.toFixed(2)}ms)`
      : '';
    
    console.log(`${indent}├─ ${hierarchy.componentName}: ${hierarchy.renderCount} renders${renderInfo}`);
    
    // Show render causes if available
    if (hierarchy.causes.length > 0) {
      const uniqueCauses = [...new Set(hierarchy.causes)];
      console.log(`${indent}│  Causes: ${uniqueCauses.join(', ')}`);
    }
    
    // Show child components recursively
    if (hierarchy.childComponents.size > 0) {
      const children = Array.from(hierarchy.childComponents.values())
        .sort((a, b) => b.renderCount - a.renderCount); // Sort by render count desc
      
      children.forEach((child, index) => {
        const isLast = index === children.length - 1;
        const childIndent = indent + (isLast ? '   ' : '│  ');
        this.logRenderHierarchy(child, childIndent);
      });
    }
  }

  /**
   * Build render hierarchy from alerts
   */
  private buildRenderHierarchy(alerts: DedupedAlert[]): ComponentRenderDetail | null {
    const renderAlerts = alerts.filter(alert => 
      alert.message.includes('re-render') || alert.message.includes('render')
    );
    
    if (renderAlerts.length === 0) {
      return null;
    }

    // Create hierarchy map
    const componentMap = new Map<string, ComponentRenderDetail>();
    
    renderAlerts.forEach(alert => {
      const componentName = alert.component || 'Unknown';
      
      if (!componentMap.has(componentName)) {
        componentMap.set(componentName, {
          componentName,
          renderCount: 0,
          childComponents: new Map(),
          causes: [],
          avgRenderTime: alert.value
        });
      }
      
      const component = componentMap.get(componentName)!;
      component.renderCount += alert.count;
      
      // Extract render causes from alert details
      if (alert.details) {
        const causes = this.extractRenderCauses(alert.details);
        component.causes.push(...causes);
      }
      
      // Update average render time
      if (alert.value && component.avgRenderTime) {
        component.avgRenderTime = (component.avgRenderTime + alert.value) / 2;
      }
    });

    // Build parent-child relationships
    this.buildComponentRelationships(componentMap);
    
    // Return the root component (usually the one with most renders or specified parent)
    const rootComponent = this.findRootComponent(componentMap);
    return rootComponent;
  }

  /**
   * Extract render causes from alert details
   */
  private extractRenderCauses(details: string): string[] {
    const causes: string[] = [];
    
    // Common render cause patterns
    const patterns = [
      /state update.*?(\w+)/gi,
      /prop change.*?(\w+)/gi,
      /context change.*?(\w+)/gi,
      /parent render.*?(\w+)/gi,
      /hook dependency.*?(\w+)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = details.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          causes.push(match[1]);
        }
      }
    });
    
    // Fallback to generic causes if no specific patterns found
    if (causes.length === 0) {
      if (details.includes('state')) causes.push('state change');
      if (details.includes('prop')) causes.push('prop change');
      if (details.includes('context')) causes.push('context change');
      if (details.includes('parent')) causes.push('parent re-render');
    }
    
    return causes;
  }

  /**
   * Build parent-child component relationships
   */
  private buildComponentRelationships(componentMap: Map<string, ComponentRenderDetail>): void {
    // This is a simplified version - in a real implementation, you'd need
    // component tree information from React DevTools or custom tracking
    
    const components = Array.from(componentMap.values());
    
    // Simple heuristic: components with "Home" in name are likely parents
    const homeComponent = components.find(c => c.componentName.includes('Home'));
    if (homeComponent) {
      // Move other components as children of Home
      components.forEach(component => {
        if (component !== homeComponent && !component.componentName.includes('Home')) {
          homeComponent.childComponents.set(component.componentName, component);
        }
      });
    }
  }

  /**
   * Find the root component in the hierarchy
   */
  private findRootComponent(componentMap: Map<string, ComponentRenderDetail>): ComponentRenderDetail | null {
    const components = Array.from(componentMap.values());
    
    // Look for Home component first
    const homeComponent = components.find(c => c.componentName.includes('Home'));
    if (homeComponent) {
      return homeComponent;
    }
    
    // Otherwise return component with most renders
    return components.reduce((max, current) => 
      current.renderCount > max.renderCount ? current : max
    );
  }

  /**
   * Set throttle interval
   */
  setThrottleInterval(intervalMs: number): void {
    this.throttleInterval = intervalMs;
  }

  /**
   * Get current throttle interval
   */
  getThrottleInterval(): number {
    return this.throttleInterval;
  }

  /**
   * Reset last log time (useful for testing)
   */
  resetThrottle(): void {
    this.lastLogTime = 0;
  }
}
