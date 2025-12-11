/**
 * Severity Calculator
 * 
 * Calculates alert severity based on threshold multipliers and provides
 * severity-based filtering and visual indicators.
 */

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Severity configuration with threshold multipliers
 */
interface SeverityConfig {
  thresholdMultiplier: number;
  severity: AlertSeverity;
  emoji: string;
}

/**
 * SeverityCalculator class
 * 
 * Provides methods to calculate alert severity, get visual indicators,
 * and filter alerts based on minimum severity levels.
 */
export class SeverityCalculator {
  private severityLevels: SeverityConfig[] = [
    { thresholdMultiplier: 10, severity: 'critical', emoji: '🔥' },
    { thresholdMultiplier: 5, severity: 'high', emoji: '🚨' },
    { thresholdMultiplier: 2, severity: 'medium', emoji: '⚠️⚠️' },
    { thresholdMultiplier: 1, severity: 'low', emoji: '⚠️' }
  ];

  private severityOrder: Record<AlertSeverity, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };

  /**
   * Calculate severity based on value vs threshold
   * 
   * @param value - The actual measured value
   * @param threshold - The threshold value
   * @returns The calculated severity level
   */
  calculateSeverity(value: number, threshold: number): AlertSeverity {
    if (threshold === 0) {
      return 'low';
    }

    const multiplier = value / threshold;

    // Find the appropriate severity level based on multiplier
    for (const level of this.severityLevels) {
      if (multiplier >= level.thresholdMultiplier) {
        return level.severity;
      }
    }

    return 'low';
  }

  /**
   * Get visual indicator (emoji) for severity level
   * 
   * @param severity - The severity level
   * @returns Emoji representing the severity
   */
  getSeverityEmoji(severity: AlertSeverity): string {
    const config = this.severityLevels.find(level => level.severity === severity);
    return config?.emoji || '⚠️';
  }

  /**
   * Determine if alert should be shown based on minimum severity filter
   * 
   * @param alertSeverity - The severity of the alert
   * @param minSeverity - The minimum severity level to show
   * @returns True if alert should be shown
   */
  shouldShow(alertSeverity: AlertSeverity, minSeverity: AlertSeverity): boolean {
    return this.severityOrder[alertSeverity] >= this.severityOrder[minSeverity];
  }

  /**
   * Compare two severity levels
   * 
   * @param sev1 - First severity level
   * @param sev2 - Second severity level
   * @returns Positive if sev1 > sev2, negative if sev1 < sev2, 0 if equal
   */
  compareSeverity(sev1: AlertSeverity, sev2: AlertSeverity): number {
    return this.severityOrder[sev1] - this.severityOrder[sev2];
  }

  /**
   * Get all severity levels in order
   * 
   * @returns Array of severity levels from lowest to highest
   */
  getSeverityLevels(): AlertSeverity[] {
    return ['low', 'medium', 'high', 'critical'];
  }

  /**
   * Get severity description
   * 
   * @param severity - The severity level
   * @returns Human-readable description of the severity
   */
  getSeverityDescription(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return 'Critical - Immediate attention required (10x+ over threshold)';
      case 'high':
        return 'High - Significant performance issue (5-10x over threshold)';
      case 'medium':
        return 'Medium - Moderate performance concern (2-5x over threshold)';
      case 'low':
        return 'Low - Minor performance issue (1-2x over threshold)';
    }
  }
}
