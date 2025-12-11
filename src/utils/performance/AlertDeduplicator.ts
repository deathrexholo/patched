/**
 * Alert Deduplication System
 * 
 * Prevents duplicate performance alerts from flooding the console by tracking
 * unique alerts and their occurrence counts.
 */

import type { PerformanceAlert } from './PerformanceMonitoringUtils';

/**
 * Extended alert interface with deduplication metadata
 */
export interface DedupedAlert extends PerformanceAlert {
  count: number;
  firstSeen: number;
  lastSeen: number;
  occurrences: number[];
}

/**
 * AlertDeduplicator class
 * 
 * Manages alert deduplication using a Map-based storage system.
 * Generates unique keys for alerts and tracks occurrence counts and timestamps.
 */
export class AlertDeduplicator {
  private alertMap: Map<string, DedupedAlert>;
  private retentionPeriod: number;

  constructor(retentionPeriod: number = 5 * 60 * 1000) { // Default 5 minutes
    this.alertMap = new Map();
    this.retentionPeriod = retentionPeriod;
  }

  /**
   * Generate unique key for alert based on component + message + type
   * 
   * @param alert - The performance alert to generate a key for
   * @returns Unique string key for the alert
   */
  private getAlertKey(alert: PerformanceAlert): string {
    const component = alert.component || 'unknown';
    const operation = alert.operation || 'unknown';
    const message = alert.message;
    const type = alert.type;
    
    return `${component}:${operation}:${message}:${type}`;
  }

  /**
   * Add alert or update existing deduplicated alert
   * 
   * @param alert - The performance alert to add
   * @returns The deduplicated alert with updated counts
   */
  addAlert(alert: PerformanceAlert): DedupedAlert {
    const key = this.getAlertKey(alert);
    const existing = this.alertMap.get(key);

    if (existing) {
      // Update existing alert
      existing.count++;
      existing.lastSeen = alert.timestamp;
      existing.occurrences.push(alert.timestamp);
      return existing;
    } else {
      // Create new deduplicated alert
      const dedupedAlert: DedupedAlert = {
        ...alert,
        count: 1,
        firstSeen: alert.timestamp,
        lastSeen: alert.timestamp,
        occurrences: [alert.timestamp]
      };
      
      this.alertMap.set(key, dedupedAlert);
      
      // Automatically cleanup old alerts
      this.cleanup(this.retentionPeriod);
      
      return dedupedAlert;
    }
  }

  /**
   * Get all deduplicated alerts
   * 
   * @returns Array of all unique alerts with their counts
   */
  getDedupedAlerts(): DedupedAlert[] {
    return Array.from(this.alertMap.values());
  }

  /**
   * Remove alerts older than the retention window
   * 
   * @param maxAge - Maximum age in milliseconds (default: retention period)
   */
  cleanup(maxAge?: number): void {
    const cutoffTime = Date.now() - (maxAge || this.retentionPeriod);
    
    for (const [key, alert] of this.alertMap.entries()) {
      if (alert.lastSeen < cutoffTime) {
        this.alertMap.delete(key);
      }
    }
  }

  /**
   * Clear all alerts
   */
  clear(): void {
    this.alertMap.clear();
  }

  /**
   * Get the number of unique alerts
   */
  getAlertCount(): number {
    return this.alertMap.size;
  }
}
