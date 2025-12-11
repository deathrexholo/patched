/**
 * Search Configuration Service
 * Manages search settings, feature toggles, and performance monitoring
 */

import { SearchPerformanceMetrics } from '../../types/models/search';

export interface SearchConfig {
  // Feature toggles
  enableEnhancedSearch: boolean;
  enableAutoComplete: boolean;
  enableSavedSearches: boolean;
  enableSearchAnalytics: boolean;
  enableBulkOperations: boolean;
  enableFuzzyMatching: boolean;
  
  // Performance settings
  searchTimeout: number; // milliseconds
  debounceDelay: number; // milliseconds
  maxSearchResults: number;
  cacheEnabled: boolean;
  cacheTTL: number; // milliseconds
  
  // Auto-complete settings
  autoCompleteMinChars: number;
  autoCompleteMaxSuggestions: number;
  autoCompleteDelay: number; // milliseconds
  
  // Search quality settings
  fuzzyMatchThreshold: number; // 0-1, lower = more strict
  relevanceBoostFactors: {
    exactMatch: number;
    fuzzyMatch: number;
    recency: number;
    popularity: number;
    verification: number;
  };
  
  // Monitoring settings
  performanceMonitoringEnabled: boolean;
  alertThresholds: {
    responseTime: number; // milliseconds
    errorRate: number; // percentage
    cacheHitRate: number; // percentage
  };
}

const DEFAULT_CONFIG: SearchConfig = {
  // Feature toggles
  enableEnhancedSearch: true,
  enableAutoComplete: true,
  enableSavedSearches: true,
  enableSearchAnalytics: true,
  enableBulkOperations: true,
  enableFuzzyMatching: true,
  
  // Performance settings
  searchTimeout: 10000, // 10 seconds
  debounceDelay: 300, // 300ms
  maxSearchResults: 100,
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
  
  // Auto-complete settings
  autoCompleteMinChars: 2,
  autoCompleteMaxSuggestions: 10,
  autoCompleteDelay: 200, // 200ms
  
  // Search quality settings
  fuzzyMatchThreshold: 0.6,
  relevanceBoostFactors: {
    exactMatch: 1.0,
    fuzzyMatch: 0.8,
    recency: 0.2,
    popularity: 0.1,
    verification: 0.2
  },
  
  // Monitoring settings
  performanceMonitoringEnabled: true,
  alertThresholds: {
    responseTime: 2000, // 2 seconds
    errorRate: 5, // 5%
    cacheHitRate: 80 // 80%
  }
};

class SearchConfigService {
  private config: SearchConfig;
  private listeners: Array<(config: SearchConfig) => void> = [];

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Get current search configuration
   */
  getConfig(): SearchConfig {
    return { ...this.config };
  }

  /**
   * Update search configuration
   */
  updateConfig(updates: Partial<SearchConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };
    
    // Save to localStorage
    this.saveConfig();
    
    // Notify listeners
    this.notifyListeners();
    
    // Log configuration change
    console.log('Search configuration updated:', {
      changes: this.getConfigDiff(oldConfig, this.config),
      newConfig: this.config
    });
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
    this.notifyListeners();
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof SearchConfig): boolean {
    return Boolean(this.config[feature]);
  }

  /**
   * Get feature toggle status
   */
  getFeatureToggles(): Record<string, boolean> {
    return {
      enhancedSearch: this.config.enableEnhancedSearch,
      autoComplete: this.config.enableAutoComplete,
      savedSearches: this.config.enableSavedSearches,
      searchAnalytics: this.config.enableSearchAnalytics,
      bulkOperations: this.config.enableBulkOperations,
      fuzzyMatching: this.config.enableFuzzyMatching
    };
  }

  /**
   * Update feature toggle
   */
  toggleFeature(feature: keyof SearchConfig, enabled: boolean): void {
    this.updateConfig({ [feature]: enabled });
  }

  /**
   * Get performance settings
   */
  getPerformanceSettings() {
    return {
      searchTimeout: this.config.searchTimeout,
      debounceDelay: this.config.debounceDelay,
      maxSearchResults: this.config.maxSearchResults,
      cacheEnabled: this.config.cacheEnabled,
      cacheTTL: this.config.cacheTTL
    };
  }

  /**
   * Update performance settings
   */
  updatePerformanceSettings(settings: Partial<SearchConfig>): void {
    const performanceKeys = [
      'searchTimeout', 'debounceDelay', 'maxSearchResults', 
      'cacheEnabled', 'cacheTTL'
    ];
    
    const performanceUpdates = Object.keys(settings)
      .filter(key => performanceKeys.includes(key))
      .reduce((obj, key) => {
        obj[key] = settings[key as keyof SearchConfig];
        return obj;
      }, {} as any);

    this.updateConfig(performanceUpdates);
  }

  /**
   * Get alert thresholds
   */
  getAlertThresholds() {
    return { ...this.config.alertThresholds };
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(thresholds: Partial<SearchConfig['alertThresholds']>): void {
    this.updateConfig({
      alertThresholds: { ...this.config.alertThresholds, ...thresholds }
    });
  }

  /**
   * Check if performance metrics exceed alert thresholds
   */
  checkPerformanceAlerts(metrics: SearchPerformanceMetrics): Array<{
    type: string;
    message: string;
    severity: 'warning' | 'critical';
    value: number;
    threshold: number;
  }> {
    const alerts = [];
    const thresholds = this.config.alertThresholds;

    // Response time alert
    if (metrics.averageResponseTime > thresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        message: `Average response time (${metrics.averageResponseTime}ms) exceeds threshold (${thresholds.responseTime}ms)`,
        severity: metrics.averageResponseTime > thresholds.responseTime * 2 ? 'critical' : 'warning',
        value: metrics.averageResponseTime,
        threshold: thresholds.responseTime
      });
    }

    // Error rate alert
    if (metrics.errorRate > thresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        message: `Error rate (${metrics.errorRate}%) exceeds threshold (${thresholds.errorRate}%)`,
        severity: metrics.errorRate > thresholds.errorRate * 2 ? 'critical' : 'warning',
        value: metrics.errorRate,
        threshold: thresholds.errorRate
      });
    }

    // Cache hit rate alert
    if (metrics.cacheHitRate < thresholds.cacheHitRate) {
      alerts.push({
        type: 'cache_hit_rate',
        message: `Cache hit rate (${metrics.cacheHitRate}%) below threshold (${thresholds.cacheHitRate}%)`,
        severity: metrics.cacheHitRate < thresholds.cacheHitRate * 0.5 ? 'critical' : 'warning',
        value: metrics.cacheHitRate,
        threshold: thresholds.cacheHitRate
      });
    }

    return alerts;
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(listener: (config: SearchConfig) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Export configuration for backup
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from backup
   */
  importConfig(configJson: string): void {
    try {
      const importedConfig = JSON.parse(configJson);
      
      // Validate configuration structure
      if (this.validateConfig(importedConfig)) {
        this.config = { ...DEFAULT_CONFIG, ...importedConfig };
        this.saveConfig();
        this.notifyListeners();
      } else {
        throw new Error('Invalid configuration format');
      }
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw error;
    }
  }

  /**
   * Get configuration validation status
   */
  validateCurrentConfig(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate timeout values
    if (this.config.searchTimeout < 1000) {
      warnings.push('Search timeout is very low (< 1s), may cause timeouts');
    }
    if (this.config.searchTimeout > 30000) {
      warnings.push('Search timeout is very high (> 30s), may impact user experience');
    }

    // Validate debounce delay
    if (this.config.debounceDelay < 100) {
      warnings.push('Debounce delay is very low (< 100ms), may cause excessive API calls');
    }
    if (this.config.debounceDelay > 1000) {
      warnings.push('Debounce delay is high (> 1s), may feel sluggish to users');
    }

    // Validate cache TTL
    if (this.config.cacheTTL < 60000) {
      warnings.push('Cache TTL is very low (< 1min), may not provide effective caching');
    }

    // Validate fuzzy match threshold
    if (this.config.fuzzyMatchThreshold < 0 || this.config.fuzzyMatchThreshold > 1) {
      errors.push('Fuzzy match threshold must be between 0 and 1');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(metrics?: SearchPerformanceMetrics): Array<{
    type: string;
    recommendation: string;
    impact: 'low' | 'medium' | 'high';
    configChanges?: Partial<SearchConfig>;
  }> {
    const recommendations = [];

    if (metrics) {
      // Performance-based recommendations
      if (metrics.averageResponseTime > 1000) {
        recommendations.push({
          type: 'performance',
          recommendation: 'Consider reducing search timeout and enabling more aggressive caching',
          impact: 'high' as const,
          configChanges: {
            searchTimeout: Math.max(5000, this.config.searchTimeout * 0.8),
            cacheTTL: Math.min(600000, this.config.cacheTTL * 1.5)
          }
        });
      }

      if (metrics.cacheHitRate < 60) {
        recommendations.push({
          type: 'caching',
          recommendation: 'Increase cache TTL to improve cache hit rate',
          impact: 'medium' as const,
          configChanges: {
            cacheTTL: this.config.cacheTTL * 2
          }
        });
      }

      if (metrics.errorRate > 2) {
        recommendations.push({
          type: 'reliability',
          recommendation: 'Consider increasing search timeout to reduce timeout errors',
          impact: 'medium' as const,
          configChanges: {
            searchTimeout: this.config.searchTimeout * 1.5
          }
        });
      }
    }

    // General recommendations
    if (!this.config.cacheEnabled) {
      recommendations.push({
        type: 'performance',
        recommendation: 'Enable caching to improve search performance',
        impact: 'high' as const,
        configChanges: { cacheEnabled: true }
      });
    }

    if (this.config.fuzzyMatchThreshold > 0.8) {
      recommendations.push({
        type: 'quality',
        recommendation: 'Lower fuzzy match threshold for more precise results',
        impact: 'medium' as const,
        configChanges: { fuzzyMatchThreshold: 0.6 }
      });
    }

    return recommendations;
  }

  /**
   * Private methods
   */
  private loadConfig(): SearchConfig {
    try {
      const stored = localStorage.getItem('searchConfig');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load search configuration:', error);
    }
    return { ...DEFAULT_CONFIG };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('searchConfig', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save search configuration:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('Error in config listener:', error);
      }
    });
  }

  private validateConfig(config: any): boolean {
    // Basic structure validation
    const requiredKeys = [
      'enableEnhancedSearch', 'searchTimeout', 'debounceDelay',
      'maxSearchResults', 'fuzzyMatchThreshold'
    ];
    
    return requiredKeys.every(key => key in config);
  }

  private getConfigDiff(oldConfig: SearchConfig, newConfig: SearchConfig): Record<string, any> {
    const diff: Record<string, any> = {};
    
    Object.keys(newConfig).forEach(key => {
      const typedKey = key as keyof SearchConfig;
      if (oldConfig[typedKey] !== newConfig[typedKey]) {
        diff[key] = {
          old: oldConfig[typedKey],
          new: newConfig[typedKey]
        };
      }
    });
    
    return diff;
  }
}

// Create singleton instance
const searchConfigService = new SearchConfigService();

export default searchConfigService;
export { searchConfigService, SearchConfigService };