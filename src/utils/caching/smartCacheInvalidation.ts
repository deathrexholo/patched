// Smart Cache Invalidation System
// Intelligent cache invalidation based on content age, user behavior, and usage patterns
// Part of Phase 4: Advanced Features implementation

import { queryClient, QUERY_CONFIGS } from '../../lib/queryClient';
import { idbStore } from './indexedDB';

class SmartCacheInvalidator {
  invalidationRules: Map<string, any>;
  cacheMetrics: Map<number, any>;
  isRunning: boolean;
  checkInterval: number;
  lastHealthCheck: number;
  strategies: Record<string, string>;
  ageThresholds: Record<string, number>;
  cacheLimits: Record<string, number>;

  constructor() {
    this.invalidationRules = new Map();
    this.cacheMetrics = new Map();
    this.isRunning = false;
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.lastHealthCheck = 0;
    
    // Invalidation strategies with different priorities
    this.strategies = {
      TIME_BASED: 'time_based',
      USAGE_BASED: 'usage_based',
      CONTENT_BASED: 'content_based',
      PREDICTIVE: 'predictive'
    };

    // Content age thresholds for different types
    this.ageThresholds = {
      posts: 60 * 60 * 1000, // 1 hour
      events: 30 * 60 * 1000, // 30 minutes
      userProfiles: 2 * 60 * 60 * 1000, // 2 hours
      messages: 5 * 60 * 1000, // 5 minutes
      sportStats: 15 * 60 * 1000, // 15 minutes
      staticContent: 24 * 60 * 60 * 1000 // 24 hours
    };

    // Cache size limits per content type
    this.cacheLimits = {
      posts: 100,
      userProfiles: 50,
      messages: 200,
      events: 25,
      staticContent: 20
    };

    // Don't auto-initialize - will be done lazily
  }

  async init() {
    try {
      // Initialize IndexedDB first with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await idbStore.init();
          break;
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      // Load invalidation rules from storage
      await this.loadInvalidationRules();
      
      // Start periodic health checks
      this.startPeriodicHealthChecks();
      
      // Setup event listeners
      this.setupEventListeners();} catch (error) {
      console.warn('Smart cache invalidator initialization failed, using fallback mode:', error);
      // Continue with default settings even if initialization fails
      this.invalidationRules = new Map();
      this.cacheMetrics = new Map();
      
      // Still setup event listeners for basic functionality
      try {
        this.setupEventListeners();
      } catch (listenerError) {
        console.warn('Failed to setup event listeners:', listenerError);
      }
    }
  }

  // Load invalidation rules from IndexedDB
  async loadInvalidationRules() {
    try {
      const rules = await idbStore.get('cache_invalidation_rules', 'rules_data');
      if (rules) {
        this.invalidationRules = new Map((rules as any)?.entries || []);}
    } catch (error) {
      console.error('Failed to load invalidation rules:', error);
      // Initialize with empty rules if store doesn't exist yet
      this.invalidationRules = new Map();
    }
  }

  // Save invalidation rules to storage
  async saveInvalidationRules() {
    try {
      await idbStore.set('cache_invalidation_rules', {
        key: 'cache_invalidation_rules', // Add required key field
        entries: Array.from(this.invalidationRules.entries()),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save invalidation rules:', error);
    }
  }

  // Perform comprehensive cache health check
  async performCacheHealthCheck() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    try {// Get all cached queries
      const queryCache = queryClient.getQueryCache();
      const allQueries = queryCache.getAll();
      
      // Analyze cache state
      const cacheAnalysis = this.analyzeCacheState(allQueries);
      
      // Apply invalidation strategies
      const invalidationResults = await this.applyInvalidationStrategies(cacheAnalysis);
      
      // Update cache metrics
      this.updateCacheMetrics(cacheAnalysis, invalidationResults);
      
      // Save updated rules
      await this.saveInvalidationRules();return {
        ...invalidationResults,
        cacheAnalysis,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Cache health check failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
      this.lastHealthCheck = Date.now();
    }
  }

  // Analyze current cache state
  analyzeCacheState(queries) {
    const analysis = {
      totalQueries: queries.length,
      staleQueries: 0,
      freshQueries: 0,
      errorQueries: 0,
      sizeByType: new Map(),
      ageDistribution: new Map(),
      usageFrequency: new Map(),
      memoryUsage: 0
    };

    queries.forEach(query => {
      const queryKey = JSON.stringify(query.queryKey);
      const contentType = this.getContentTypeFromQuery(query.queryKey);
      const age = Date.now() - (query.state.dataUpdatedAt || 0);
      const isStale = query.isStale();
      const hasError = query.state.error !== null;

      // Count by freshness
      if (hasError) {
        analysis.errorQueries++;
      } else if (isStale) {
        analysis.staleQueries++;
      } else {
        analysis.freshQueries++;
      }

      // Size by type
      const currentSize = analysis.sizeByType.get(contentType) || 0;
      analysis.sizeByType.set(contentType, currentSize + 1);

      // Age distribution
      const ageCategory = this.categorizeAge(age);
      const currentAgeCount = analysis.ageDistribution.get(ageCategory) || 0;
      analysis.ageDistribution.set(ageCategory, currentAgeCount + 1);

      // Usage frequency (based on last fetch time)
      const usage = this.calculateUsageFrequency(query);
      analysis.usageFrequency.set(queryKey, usage);

      // Estimate memory usage
      if (query.state.data) {
        analysis.memoryUsage += this.estimateDataSize(query.state.data);
      }
    });

    return analysis;
  }

  // Apply different invalidation strategies
  async applyInvalidationStrategies(analysis) {
    const results = {
      timeBasedInvalidated: 0,
      usageBasedInvalidated: 0,
      contentBasedInvalidated: 0,
      predictiveInvalidated: 0,
      totalInvalidated: 0,
      invalidatedQueries: []
    };

    const queryCache = queryClient.getQueryCache();
    const allQueries = queryCache.getAll();

    // Strategy 1: Time-based invalidation
    for (const query of allQueries) {
      if (this.shouldInvalidateByTime(query)) {
        queryClient.invalidateQueries({ queryKey: query.queryKey });
        results.timeBasedInvalidated++;
        results.invalidatedQueries.push({
          queryKey: query.queryKey,
          reason: 'time_based',
          age: Date.now() - (query.state.dataUpdatedAt || 0)
        });
      }
    }

    // Strategy 2: Usage-based invalidation
    for (const query of allQueries) {
      if (this.shouldInvalidateByUsage(query, analysis)) {
        queryClient.invalidateQueries({ queryKey: query.queryKey });
        results.usageBasedInvalidated++;
        results.invalidatedQueries.push({
          queryKey: query.queryKey,
          reason: 'usage_based',
          lastUsed: query.state.dataUpdatedAt
        });
      }
    }

    // Strategy 3: Content-based invalidation
    for (const query of allQueries) {
      if (await this.shouldInvalidateByContent(query)) {
        queryClient.invalidateQueries({ queryKey: query.queryKey });
        results.contentBasedInvalidated++;
        results.invalidatedQueries.push({
          queryKey: query.queryKey,
          reason: 'content_based',
          contentType: this.getContentTypeFromQuery(query.queryKey)
        });
      }
    }

    // Strategy 4: Predictive invalidation based on patterns
    const predictiveInvalidations = await this.performPredictiveInvalidation(analysis);
    results.predictiveInvalidated = predictiveInvalidations.length;
    results.invalidatedQueries.push(...predictiveInvalidations);

    // Strategy 5: Size-based cleanup
    await this.performSizeBasedCleanup(analysis);

    results.totalInvalidated = results.timeBasedInvalidated + results.usageBasedInvalidated + 
                              results.contentBasedInvalidated + results.predictiveInvalidated;

    return results;
  }

  // Time-based invalidation strategy
  shouldInvalidateByTime(query) {
    const contentType = this.getContentTypeFromQuery(query.queryKey);
    const threshold = this.ageThresholds[contentType] || this.ageThresholds.posts;
    const age = Date.now() - (query.state.dataUpdatedAt || 0);
    
    return age > threshold;
  }

  // Usage-based invalidation strategy
  shouldInvalidateByUsage(query, analysis) {
    const queryKey = JSON.stringify(query.queryKey);
    const usage = analysis.usageFrequency.get(queryKey) || 0;
    const contentType = this.getContentTypeFromQuery(query.queryKey);
    
    // If query hasn't been used recently and cache is over size limit
    const sizeLimit = this.cacheLimits[contentType] || 50;
    const currentSize = analysis.sizeByType.get(contentType) || 0;
    
    return usage < 0.1 && currentSize > sizeLimit;
  }

  // Content-based invalidation strategy
  async shouldInvalidateByContent(query) {
    const contentType = this.getContentTypeFromQuery(query.queryKey);
    
    // Invalidate if content has known dependencies that changed
    if (contentType === 'posts') {
      return await this.hasPostContentChanged(query);
    }
    
    if (contentType === 'events') {
      return await this.hasEventContentChanged(query);
    }
    
    if (contentType === 'userProfiles') {
      return await this.hasUserProfileChanged(query);
    }
    
    return false;
  }

  // Predictive invalidation based on usage patterns
  async performPredictiveInvalidation(analysis) {
    const invalidations = [];
    const currentHour = new Date().getHours();
    
    // Predict what content will be needed soon and invalidate stale versions
    const behaviorPatterns = await this.getUserBehaviorPatterns();
    
    for (const [contentType, patterns] of behaviorPatterns.entries()) {
      // If this is typically an active time for this content type
      if (this.isActiveTimeForContent(contentType, currentHour, patterns)) {
        const queries = queryClient.getQueryCache().findAll({
          predicate: (query) => this.getContentTypeFromQuery(query.queryKey) === contentType
        });
        
        // Invalidate stale queries for this content type
        queries.forEach(query => {
          if (query.isStale() && Date.now() - (query.state.dataUpdatedAt || 0) > this.ageThresholds[contentType]) {
            queryClient.invalidateQueries({ queryKey: query.queryKey });
            invalidations.push({
              queryKey: query.queryKey,
              reason: 'predictive',
              prediction: `Active time for ${contentType}`
            });
          }
        });
      }
    }
    
    return invalidations;
  }

  // Size-based cleanup to prevent memory bloat
  async performSizeBasedCleanup(analysis) {
    const totalMemoryMB = analysis.memoryUsage / (1024 * 1024);
    const maxMemoryMB = 50; // 50MB limit
    
    if (totalMemoryMB > maxMemoryMB) {// Remove least recently used queries
      const queries = queryClient.getQueryCache().getAll()
        .sort((a, b) => (a.state.dataUpdatedAt || 0) - (b.state.dataUpdatedAt || 0));
      
      let freedMemory = 0;
      const targetReduction = (totalMemoryMB - maxMemoryMB) * 1024 * 1024;
      
      for (const query of queries) {
        if (freedMemory >= targetReduction) break;
        
        const estimatedSize = this.estimateDataSize(query.state.data);
        queryClient.removeQueries({ queryKey: query.queryKey });
        freedMemory += estimatedSize;
      }}
  }

  // Check if post content has changed
  async hasPostContentChanged(query) {
    // This would check if post data has been updated elsewhere
    // For now, return false as we don't have real-time change detection
    return false;
  }

  // Check if event content has changed
  async hasEventContentChanged(query) {
    // Events are time-sensitive, so invalidate if they're in the past
    const eventData = query.state.data;
    if (eventData && eventData.date) {
      const eventDate = new Date(eventData.date);
      return eventDate < new Date();
    }
    return false;
  }

  // Check if user profile has changed
  async hasUserProfileChanged(query) {
    // Check if profile was updated recently in another session
    return false;
  }

  // Get user behavior patterns from predictive prefetcher
  async getUserBehaviorPatterns() {
    try {
      const behaviorData = await idbStore.get('user_behavior', 'user_behavior_data');
      if (!behaviorData) return new Map();
      
      const patterns = new Map();
      const behaviorEntries = new Map((behaviorData as any)?.entries || []);
      
      for (const [key, behavior] of behaviorEntries.entries()) {
        const contentType = (key as string).split('_')[0];
        if (!patterns.has(contentType)) {
          patterns.set(contentType, []);
        }
        patterns.get(contentType).push(...(behavior as any).patterns);
      }
      
      return patterns;
    } catch (error) {
      console.error('Failed to get behavior patterns:', error);
      // Return empty patterns if store doesn't exist yet
      return new Map();
    }
  }

  // Check if current time is active for content type
  isActiveTimeForContent(contentType, currentHour, patterns) {
    if (!patterns || patterns.length === 0) return false;
    
    const hourCounts = new Array(24).fill(0);
    patterns.forEach(pattern => {
      if (pattern.hour !== undefined) {
        hourCounts[pattern.hour]++;
      }
    });
    
    const avgActivity = hourCounts.reduce((sum, count) => sum + count, 0) / 24;
    return hourCounts[currentHour] > avgActivity * 1.5; // 50% above average
  }

  // Helper methods
  getContentTypeFromQuery(queryKey) {
    if (!queryKey || !Array.isArray(queryKey)) return 'unknown';
    
    const key = queryKey[0]?.toLowerCase() || '';
    
    if (key.includes('post')) return 'posts';
    if (key.includes('user') || key.includes('profile')) return 'userProfiles';
    if (key.includes('event')) return 'events';
    if (key.includes('message')) return 'messages';
    if (key.includes('sport') || key.includes('athlete')) return 'sportStats';
    
    return 'staticContent';
  }

  categorizeAge(age) {
    const minutes = age / (1000 * 60);
    
    if (minutes < 5) return 'fresh';
    if (minutes < 30) return 'recent';
    if (minutes < 120) return 'stale';
    if (minutes < 1440) return 'old';
    return 'ancient';
  }

  calculateUsageFrequency(query) {
    const timeSinceLastFetch = Date.now() - (query.state.dataUpdatedAt || 0);
    const fetchCount = query.state.fetchFailureCount + 1; // Approximate usage
    
    // Higher score = more frequently used
    return fetchCount / (timeSinceLastFetch / (1000 * 60 * 60)); // Usage per hour
  }

  estimateDataSize(data) {
    if (!data) return 0;
    
    try {
      // Rough estimation of memory usage
      const jsonString = JSON.stringify(data);
      return jsonString.length * 2; // Rough estimate (UTF-16)
    } catch (error) {
      return 1024; // Default estimate: 1KB
    }
  }

  // Update cache metrics for analysis
  updateCacheMetrics(analysis, results) {
    const metrics = {
      timestamp: Date.now(),
      totalQueries: analysis.totalQueries,
      memoryUsage: analysis.memoryUsage,
      invalidatedCount: results.totalInvalidated,
      hitRate: this.calculateCacheHitRate(analysis),
      sizeByType: Object.fromEntries(analysis.sizeByType),
      ageDistribution: Object.fromEntries(analysis.ageDistribution)
    };

    this.cacheMetrics.set(Date.now(), metrics);
    
    // Keep only last 100 metric entries
    if (this.cacheMetrics.size > 100) {
      const oldestKey = Math.min(...this.cacheMetrics.keys());
      this.cacheMetrics.delete(oldestKey);
    }
  }

  calculateCacheHitRate(analysis) {
    if (analysis.totalQueries === 0) return 0;
    return Math.round((analysis.freshQueries / analysis.totalQueries) * 100);
  }

  // Start periodic health checks
  startPeriodicHealthChecks() {
    setInterval(async () => {
      try {
        await this.performCacheHealthCheck();
      } catch (error) {
        console.error('Periodic cache health check failed:', error);
      }
    }, this.checkInterval);}

  // Setup event listeners for smart invalidation
  setupEventListeners() {
    // Invalidate on network reconnection
    window.addEventListener('online', () => {
      setTimeout(() => {
        this.performCacheHealthCheck();
      }, 2000);
    });

    // Listen for visibility changes to trigger cleanup
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // User returned to tab, check cache health
        if (Date.now() - this.lastHealthCheck > this.checkInterval) {
          this.performCacheHealthCheck();
        }
      }
    });
  }

  // Manual cache invalidation with predicate
  async invalidateQueriesWithPredicate(predicate, reason = 'manual') {
    const queries = queryClient.getQueryCache().findAll({ predicate });
    const invalidated = [];
    
    queries.forEach(query => {
      queryClient.invalidateQueries({ queryKey: query.queryKey });
      invalidated.push({
        queryKey: query.queryKey,
        reason
      });
    });return invalidated;
  }

  // Invalidate stale content older than specified age
  async invalidateStaleContent(maxAge = 60 * 60 * 1000) {
    return await this.invalidateQueriesWithPredicate(
      (query) => {
        const age = Date.now() - (query.state.dataUpdatedAt || 0);
        return age > maxAge;
      },
      'stale_content'
    );
  }

  // Invalidate queries by content type
  async invalidateByContentType(contentType) {
    return await this.invalidateQueriesWithPredicate(
      (query) => this.getContentTypeFromQuery(query.queryKey) === contentType,
      `content_type_${contentType}`
    );
  }

  // Get cache invalidation statistics
  getCacheInvalidationStats() {
    const recentMetrics = Array.from(this.cacheMetrics.values()).slice(-10);
    
    return {
      rulesCount: this.invalidationRules.size,
      lastHealthCheck: new Date(this.lastHealthCheck).toLocaleString(),
      isRunning: this.isRunning,
      recentMetrics,
      averageHitRate: this.calculateAverageHitRate(recentMetrics),
      memoryUsageTrend: this.calculateMemoryTrend(recentMetrics),
      invalidationFrequency: this.calculateInvalidationFrequency(recentMetrics)
    };
  }

  calculateAverageHitRate(metrics) {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + (metric.hitRate || 0), 0);
    return Math.round(sum / metrics.length);
  }

  calculateMemoryTrend(metrics) {
    if (metrics.length < 2) return 'stable';
    
    const recent = metrics[metrics.length - 1].memoryUsage || 0;
    const previous = metrics[metrics.length - 2].memoryUsage || 0;
    
    if (recent > previous * 1.1) return 'increasing';
    if (recent < previous * 0.9) return 'decreasing';
    return 'stable';
  }

  calculateInvalidationFrequency(metrics) {
    const totalInvalidated = metrics.reduce((acc, metric) => acc + (metric.invalidatedCount || 0), 0);
    const timespan = metrics.length * (this.checkInterval / (1000 * 60)); // in minutes
    return timespan > 0 ? Math.round(totalInvalidated / timespan * 60) : 0; // per hour
  }

  // Clear all invalidation data
  async clearInvalidationData() {
    this.invalidationRules.clear();
    this.cacheMetrics.clear();
    
    try {
      await idbStore.delete('cache_invalidation_rules', 'rules_data');} catch (error) {
      console.error('Failed to clear invalidation data:', error);
    }
  }

  // Force immediate cache cleanup
  async forceCleanup(options: { maxAge?: number; maxSize?: number; aggressive?: boolean } = {}) {
    const {
      maxAge = 30 * 60 * 1000, // 30 minutes default
      maxSize = 25, // Max items per type
      aggressive = false
    } = options;// Remove old entries
    await this.invalidateStaleContent(maxAge);
    
    // Size-based cleanup per content type
    const queryCache = queryClient.getQueryCache();
    const queriesByType = new Map();
    
    // Group queries by content type
    queryCache.getAll().forEach(query => {
      const contentType = this.getContentTypeFromQuery(query.queryKey);
      if (!queriesByType.has(contentType)) {
        queriesByType.set(contentType, []);
      }
      queriesByType.get(contentType).push(query);
    });
    
    // Remove excess queries per type
    let removedCount = 0;
    for (const [contentType, queries] of queriesByType.entries()) {
      if (queries.length > maxSize) {
        const sortedQueries = queries.sort((a, b) => 
          (a.state.dataUpdatedAt || 0) - (b.state.dataUpdatedAt || 0)
        );
        
        const toRemove = sortedQueries.slice(0, queries.length - maxSize);
        toRemove.forEach(query => {
          queryClient.removeQueries({ queryKey: query.queryKey });
          removedCount++;
        });
      }
    }// Trigger garbage collection if aggressive
    if (aggressive && window.gc) {
      window.gc();
    }
    
    return { removedCount, timestamp: new Date().toISOString() };
  }
}

// Create singleton instance with lazy initialization
let smartCacheInvalidatorInstance: SmartCacheInvalidator | null = null;

const getSmartCacheInvalidator = () => {
  if (!smartCacheInvalidatorInstance) {
    try {
      smartCacheInvalidatorInstance = new SmartCacheInvalidator();
      // Initialize asynchronously without blocking
      smartCacheInvalidatorInstance.init().catch(error => {
        console.warn('Smart cache invalidator async initialization failed:', error);
      });
    } catch (error) {
      console.error('Failed to create smart cache invalidator:', error);
      // Return a mock object with safe no-op methods
      smartCacheInvalidatorInstance = {
        init: async () => {},
        performCacheHealthCheck: async () => ({ totalInvalidated: 0 }),
        invalidateStaleContent: async () => [],
        invalidateByContentType: async () => [],
        forceCleanup: async () => ({ removedCount: 0 }),
        getCacheInvalidationStats: () => ({ rulesCount: 0 }),
        clearInvalidationData: async () => {},
        startPeriodicHealthChecks: () => {},
        setupEventListeners: () => {}
      } as any;
    }
  }
  return smartCacheInvalidatorInstance;
};

export const smartCacheInvalidator = getSmartCacheInvalidator();

// Hook for using smart cache invalidation in components
export const useSmartCacheInvalidation = () => {
  const performHealthCheck = async () => {
    return await smartCacheInvalidator.performCacheHealthCheck();
  };

  const invalidateStale = async (maxAge) => {
    return await smartCacheInvalidator.invalidateStaleContent(maxAge);
  };

  const invalidateByType = async (contentType) => {
    return await smartCacheInvalidator.invalidateByContentType(contentType);
  };

  const forceCleanup = async (options) => {
    return await smartCacheInvalidator.forceCleanup(options);
  };

  const getStats = () => {
    return smartCacheInvalidator.getCacheInvalidationStats();
  };

  const clearData = async () => {
    return await smartCacheInvalidator.clearInvalidationData();
  };

  return {
    performHealthCheck,
    invalidateStale,
    invalidateByType,
    forceCleanup,
    getStats,
    clearData
  };
};

export default smartCacheInvalidator;