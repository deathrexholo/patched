/**
 * Search Cache Service
 * Implements memory-based caching with TTL and cache hit rate monitoring
 */

import { SearchQuery, SearchResults } from '../../types/models/search';
import { searchConfigService } from './searchConfigService';

interface CacheEntry {
  key: string;
  data: SearchResults;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  totalEntries: number;
  memoryUsage: number;
  averageAccessTime: number;
}

interface CacheConfig {
  maxEntries: number;
  defaultTTL: number;
  cleanupInterval: number;
  enablePrefetching: boolean;
  prefetchThreshold: number;
}

class SearchCacheService {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
    totalEntries: 0,
    memoryUsage: 0,
    averageAccessTime: 0
  };
  
  private config: CacheConfig = {
    maxEntries: 1000,
    defaultTTL: 300000, // 5 minutes
    cleanupInterval: 60000, // 1 minute
    enablePrefetching: true,
    prefetchThreshold: 5 // Prefetch if accessed 5+ times
  };

  private cleanupTimer: NodeJS.Timeout | null = null;
  private accessTimes: number[] = [];
  private popularQueries = new Map<string, number>();

  constructor() {
    this.startCleanupTimer();
    this.loadConfig();
  }

  /**
   * Get cached search results
   */
  async get(query: SearchQuery): Promise<SearchResults | null> {
    const startTime = performance.now();
    this.stats.totalRequests++;

    const key = this.generateCacheKey(query);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.cacheMisses++;
      this.updateStats();
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.cacheMisses++;
      this.updateStats();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.cacheHits++;

    // Track access time
    const accessTime = performance.now() - startTime;
    this.accessTimes.push(accessTime);
    if (this.accessTimes.length > 1000) {
      this.accessTimes = this.accessTimes.slice(-1000);
    }

    // Track popular queries for prefetching
    this.trackPopularQuery(key);

    this.updateStats();

    // Return a copy to prevent mutation
    return {
      ...entry.data,
      cached: true
    } as SearchResults;
  }

  /**
   * Store search results in cache
   */
  async set(query: SearchQuery, results: SearchResults, customTTL?: number): Promise<void> {
    if (!searchConfigService.getConfig().cacheEnabled) {
      return;
    }

    const key = this.generateCacheKey(query);
    const ttl = customTTL || this.config.defaultTTL;

    const entry: CacheEntry = {
      key,
      data: { ...results, cached: false } as SearchResults,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, entry);
    this.updateStats();

    // Trigger prefetching for related queries
    if (this.config.enablePrefetching) {
      this.schedulePrefetching(query);
    }
  }

  /**
   * Invalidate cache entries
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      // Clear all cache
      this.cache.clear();
      this.stats.totalEntries = 0;
      return;
    }

    // Invalidate entries matching pattern
    const keysToDelete: string[] = [];
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateStats();
  }

  /**
   * Invalidate cache for specific content types
   */
  invalidateByType(contentType: 'users' | 'videos' | 'events'): void {
    this.invalidate(`"searchType":"${contentType}"`);
  }

  /**
   * Prefetch common search queries
   */
  async prefetchCommonQueries(searchFunction: (query: SearchQuery) => Promise<SearchResults>): Promise<void> {
    if (!this.config.enablePrefetching) return;

    const commonQueries = this.getCommonQueries();
    
    for (const queryKey of commonQueries) {
      try {
        const query = this.parseQueryFromKey(queryKey);
        if (query && !this.cache.has(queryKey)) {
          const results = await searchFunction(query);
          await this.set(query, results);
        }
      } catch (error) {
        console.warn('Prefetch failed for query:', queryKey, error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get detailed cache information
   */
  getCacheInfo(): {
    stats: CacheStats;
    entries: Array<{
      key: string;
      size: number;
      accessCount: number;
      lastAccessed: Date;
      expiresAt: Date;
    }>;
    popularQueries: Array<{ query: string; count: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key: this.sanitizeKeyForDisplay(key),
      size: this.estimateEntrySize(entry),
      accessCount: entry.accessCount,
      lastAccessed: new Date(entry.lastAccessed),
      expiresAt: new Date(entry.timestamp + entry.ttl)
    }));

    const popularQueries = Array.from(this.popularQueries.entries())
      .map(([query, count]) => ({ query: this.sanitizeKeyForDisplay(query), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      stats: this.getStats(),
      entries,
      popularQueries
    };
  }

  /**
   * Optimize cache performance
   */
  optimize(): {
    entriesRemoved: number;
    memoryFreed: number;
    recommendations: string[];
  } {
    const initialSize = this.cache.size;
    const initialMemory = this.estimateMemoryUsage();

    // Remove expired entries
    this.cleanupExpiredEntries();

    // Remove least accessed entries if cache is still too large
    while (this.cache.size > this.config.maxEntries * 0.8) {
      this.evictLeastRecentlyUsed();
    }

    const finalSize = this.cache.size;
    const finalMemory = this.estimateMemoryUsage();

    const recommendations = this.generateOptimizationRecommendations();

    return {
      entriesRemoved: initialSize - finalSize,
      memoryFreed: initialMemory - finalMemory,
      recommendations
    };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart cleanup timer if interval changed
    if (newConfig.cleanupInterval) {
      this.stopCleanupTimer();
      this.startCleanupTimer();
    }
  }

  /**
   * Export cache data for analysis
   */
  exportData(): {
    stats: CacheStats;
    config: CacheConfig;
    entries: number;
    popularQueries: Array<{ query: string; count: number }>;
    accessPatterns: {
      hourlyDistribution: number[];
      averageAccessTime: number;
    };
  } {
    const hourlyDistribution = new Array(24).fill(0);
    
    // Analyze access patterns
    this.cache.forEach(entry => {
      const hour = new Date(entry.lastAccessed).getHours();
      hourlyDistribution[hour] += entry.accessCount;
    });

    const averageAccessTime = this.accessTimes.length > 0
      ? this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length
      : 0;

    return {
      stats: this.getStats(),
      config: this.config,
      entries: this.cache.size,
      popularQueries: Array.from(this.popularQueries.entries())
        .map(([query, count]) => ({ query: this.sanitizeKeyForDisplay(query), count }))
        .sort((a, b) => b.count - a.count),
      accessPatterns: {
        hourlyDistribution,
        averageAccessTime
      }
    };
  }

  /**
   * Private methods
   */
  private generateCacheKey(query: SearchQuery): string {
    // Create a deterministic key from the query
    const keyObject = {
      term: query.term?.toLowerCase().trim() || '',
      searchType: query.searchType,
      filters: this.normalizeFilters(query.filters || {}),
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      limit: query.limit || 20
    };

    return JSON.stringify(keyObject);
  }

  private normalizeFilters(filters: any): any {
    // Sort object keys to ensure consistent cache keys
    const normalized: any = {};
    Object.keys(filters).sort().forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        normalized[key] = filters[key];
      }
    });
    return normalized;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestEntry: [string, CacheEntry] | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestEntry = [key, entry];
      }
    }

    if (oldestEntry) {
      this.cache.delete(oldestEntry[0]);
    }
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private updateStats(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? (this.stats.cacheHits / this.stats.totalRequests) * 100 
      : 0;
    this.stats.totalEntries = this.cache.size;
    this.stats.memoryUsage = this.estimateMemoryUsage();
    this.stats.averageAccessTime = this.accessTimes.length > 0
      ? this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length
      : 0;
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += this.estimateEntrySize(entry);
    }
    return totalSize;
  }

  private estimateEntrySize(entry: CacheEntry): number {
    // Rough estimation of memory usage
    const jsonSize = JSON.stringify(entry).length;
    return jsonSize * 2; // Account for JavaScript object overhead
  }

  private trackPopularQuery(key: string): void {
    const count = this.popularQueries.get(key) || 0;
    this.popularQueries.set(key, count + 1);

    // Keep only top 100 popular queries
    if (this.popularQueries.size > 100) {
      const entries = Array.from(this.popularQueries.entries());
      entries.sort((a, b) => b[1] - a[1]);
      this.popularQueries.clear();
      entries.slice(0, 100).forEach(([k, v]) => this.popularQueries.set(k, v));
    }
  }

  private getCommonQueries(): string[] {
    return Array.from(this.popularQueries.entries())
      .filter(([, count]) => count >= this.config.prefetchThreshold)
      .map(([key]) => key);
  }

  private parseQueryFromKey(key: string): SearchQuery | null {
    try {
      return JSON.parse(key) as SearchQuery;
    } catch {
      return null;
    }
  }

  private sanitizeKeyForDisplay(key: string): string {
    try {
      const parsed = JSON.parse(key);
      return parsed.term || 'Unknown Query';
    } catch {
      return key.substring(0, 50) + '...';
    }
  }

  private schedulePrefetching(query: SearchQuery): void {
    // Simple prefetching strategy: prefetch similar queries
    setTimeout(() => {
      this.prefetchSimilarQueries(query);
    }, 1000);
  }

  private async prefetchSimilarQueries(baseQuery: SearchQuery): Promise<void> {
    // This would be implemented with actual search function
    // For now, just a placeholder
    console.debug('Prefetching similar queries for:', baseQuery.term);
  }

  private generateOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getStats();

    if (stats.hitRate < 70) {
      recommendations.push('Consider increasing cache TTL to improve hit rate');
    }

    if (stats.totalEntries > this.config.maxEntries * 0.9) {
      recommendations.push('Cache is near capacity, consider increasing maxEntries');
    }

    if (stats.averageAccessTime > 10) {
      recommendations.push('Cache access time is high, consider optimizing cache structure');
    }

    if (this.popularQueries.size < 10) {
      recommendations.push('Enable prefetching to improve cache effectiveness');
    }

    return recommendations;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.cleanupInterval);
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private loadConfig(): void {
    const searchConfig = searchConfigService.getConfig();
    this.config.defaultTTL = searchConfig.cacheTTL;
    
    // Subscribe to config changes
    searchConfigService.subscribe((newConfig) => {
      this.config.defaultTTL = newConfig.cacheTTL;
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.cache.clear();
    this.popularQueries.clear();
    this.accessTimes = [];
  }
}

// Create singleton instance
const searchCacheService = new SearchCacheService();

export default searchCacheService;
export { searchCacheService, SearchCacheService };
export type { CacheStats, CacheConfig };