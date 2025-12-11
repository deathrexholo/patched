// Cache management with size limits and cleanup strategies as per documentation
import { queryClient } from '../../lib/queryClient';

// Cache size and cleanup configuration
export const CACHE_CONFIG = {
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB total cache limit
  MAX_ENTRIES_PER_CACHE: 100, // Maximum entries per cache
  MAX_IMAGE_CACHE_SIZE: 20 * 1024 * 1024, // 20MB for images
  MAX_DATA_CACHE_SIZE: 30 * 1024 * 1024, // 30MB for data
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour cleanup interval
  CACHE_EXPIRY_TIME: 24 * 60 * 60 * 1000, // 24 hours default expiry
} as const;

interface CacheManagementResult {
  totalSize: number;
  cacheCount: number;
  cleaned: boolean;
}

interface CacheManagementError {
  error: string;
}

interface CacheStatistics {
  totalCaches: number;
  caches: Record<string, {
    entries: number;
    estimatedSize: number;
    sizeFormatted: string;
  }>;
  totalSize: number;
  totalEntries: number;
  totalSizeFormatted: string;
  isOverLimit: boolean;
}

interface CacheStatisticsError {
  error: string;
}

interface CleanupResult {
  cache: CacheManagementResult | CacheManagementError;
  query: QueryCleanupResult | QueryCleanupError;
  timestamp: string;
}

interface CleanupError {
  error: string;
}

interface QueryCleanupResult {
  totalQueries: number;
  removedQueries: number;
}

interface QueryCleanupError {
  error: string;
}

interface KeyWithTimestamp {
  key: Request;
  timestamp: number;
}

interface UseCacheCleanupReturn {
  performCleanup: () => Promise<CleanupResult | CleanupError>;
  getCacheStats: () => Promise<CacheStatistics | CacheStatisticsError>;
  manageCacheSize: () => Promise<CacheManagementResult | CacheManagementError>;
}

// Cache cleanup manager
export class CacheCleanupManager {
  private cleanupInterval: NodeJS.Timeout | null;
  private isCleanupRunning: boolean;

  constructor() {
    this.cleanupInterval = null;
    this.isCleanupRunning = false;
    this.startAutoCleanup();
  }

  // Start automatic cleanup interval
  startAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, CACHE_CONFIG.CLEANUP_INTERVAL);}

  // Stop automatic cleanup
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;}
  }

  // Main cleanup function as specified in documentation
  async manageCacheSize(): Promise<CacheManagementResult | CacheManagementError> {
    try {
      const cacheNames = await caches.keys();
      const MAX_CACHE_SIZE = CACHE_CONFIG.MAX_CACHE_SIZE;
      let totalCacheSize = 0;

      // Calculate total cache size and clean up individual caches
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        // Get cache size (approximate)
        const cacheSize = await this.estimateCacheSize(cache, keys);
        totalCacheSize += cacheSize;

        // Clean up if cache has too many entries
        if (keys.length > CACHE_CONFIG.MAX_ENTRIES_PER_CACHE) {
          await this.cleanupCacheEntries(cache, keys, cacheName);
        }

        // Clean up expired entries
        await this.cleanupExpiredEntries(cache, keys, cacheName);
      }

      // If total size exceeds limit, perform aggressive cleanup
      if (totalCacheSize > MAX_CACHE_SIZE) {
        await this.performAggressiveCleanup(cacheNames);
      }

      return {
        totalSize: totalCacheSize,
        cacheCount: cacheNames.length,
        cleaned: totalCacheSize > MAX_CACHE_SIZE,
      };
    } catch (error) {
      console.error('Failed to manage cache size:', error);
      return { error: (error as Error).message };
    }
  }

  // Clean up individual cache entries (remove oldest)
  async cleanupCacheEntries(cache: Cache, keys: readonly Request[], cacheName: string): Promise<number> {
    try {
      const entriesToRemove = keys.length - CACHE_CONFIG.MAX_ENTRIES_PER_CACHE;
      if (entriesToRemove <= 0) return 0;

      // Sort keys by creation time (oldest first)
      const sortedKeys = await this.sortKeysByAge(cache, keys);
      const oldestKeys = sortedKeys.slice(0, entriesToRemove + 20); // Remove 20 extra for bufferconst deletePromises = oldestKeys.map(key => cache.delete(key));
      await Promise.allSettled(deletePromises);
      
      return oldestKeys.length;
    } catch (error) {
      console.error(`Failed to cleanup cache entries for ${cacheName}:`, error);
      return 0;
    }
  }

  // Clean up expired cache entries
  async cleanupExpiredEntries(cache: Cache, keys: readonly Request[], cacheName: string): Promise<number> {
    let removedCount = 0;
    
    try {
      const now = Date.now();
      const expiredKeys: Request[] = [];

      for (const key of keys) {
        try {
          const response = await cache.match(key);
          if (response) {
            const timestamp = response.headers.get('Cache-Timestamp');
            const expires = response.headers.get('Cache-Expires');
            
            let isExpired = false;
            
            if (expires) {
              isExpired = now > parseInt(expires);
            } else if (timestamp) {
              isExpired = (now - parseInt(timestamp)) > CACHE_CONFIG.CACHE_EXPIRY_TIME;
            }
            
            if (isExpired) {
              expiredKeys.push(key);
            }
          }
        } catch (error) {
          // If we can't read the entry, consider it expired
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {const deletePromises = expiredKeys.map(key => cache.delete(key));
        await Promise.allSettled(deletePromises);
        removedCount = expiredKeys.length;
      }

      return removedCount;
    } catch (error) {
      console.error(`Failed to cleanup expired entries for ${cacheName}:`, error);
      return removedCount;
    }
  }

  // Perform aggressive cleanup when cache size exceeds limits
  async performAggressiveCleanup(cacheNames: string[]): Promise<number> {// Priority order for cache cleanup (least important first)
    const cleanupPriority = [
      'images-v1',
      'api-cache-v1', 
      'posts-',
      'user-',
      'static-v1'
    ];

    let totalCleaned = 0;

    for (const priority of cleanupPriority) {
      const matchingCaches = cacheNames.filter(name => name.includes(priority));
      
      for (const cacheName of matchingCaches) {
        try {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          
          // Remove 50% of entries from this cache
          const entriesToRemove = Math.floor(keys.length * 0.5);
          const sortedKeys = await this.sortKeysByAge(cache, keys);
          const keysToRemove = sortedKeys.slice(0, entriesToRemove);
          
          const deletePromises = keysToRemove.map(key => cache.delete(key));
          await Promise.allSettled(deletePromises);
          
          totalCleaned += keysToRemove.length;} catch (error) {
          console.error(`Failed aggressive cleanup for ${cacheName}:`, error);
        }
      }
    }

    return totalCleaned;
  }

  // Sort cache keys by age (oldest first)
  async sortKeysByAge(cache: Cache, keys: readonly Request[]): Promise<Request[]> {
    const keyTimestamps: KeyWithTimestamp[] = [];

    for (const key of keys) {
      try {
        const response = await cache.match(key);
        const timestamp = response?.headers.get('Cache-Timestamp') || '0';
        keyTimestamps.push({
          key,
          timestamp: parseInt(timestamp),
        });
      } catch (error) {
        // If we can't read the timestamp, assume it's very old
        keyTimestamps.push({
          key,
          timestamp: 0,
        });
      }
    }

    // Sort by timestamp (oldest first)
    keyTimestamps.sort((a, b) => a.timestamp - b.timestamp);
    return keyTimestamps.map(item => item.key);
  }

  // Estimate cache size (approximate)
  async estimateCacheSize(cache: Cache, keys: readonly Request[]): Promise<number> {
    let totalSize = 0;
    const sampleSize = Math.min(keys.length, 10); // Sample up to 10 entries
    
    try {
      for (let i = 0; i < sampleSize; i++) {
        const response = await cache.match(keys[i]);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
      
      // Estimate total size based on sample
      const avgEntrySize = totalSize / sampleSize;
      return Math.floor(avgEntrySize * keys.length);
    } catch (error) {
      // Fallback estimation
      return keys.length * 1024; // 1KB per entry estimate
    }
  }

  // Get cache statistics
  async getCacheStatistics(): Promise<CacheStatistics | CacheStatisticsError> {
    try {
      const cacheNames = await caches.keys();
      const stats: CacheStatistics = {
        totalCaches: cacheNames.length,
        caches: {},
        totalSize: 0,
        totalEntries: 0,
        totalSizeFormatted: '',
        isOverLimit: false,
      };

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        const size = await this.estimateCacheSize(cache, keys);
        
        stats.caches[cacheName] = {
          entries: keys.length,
          estimatedSize: size,
          sizeFormatted: this.formatBytes(size),
        };
        
        stats.totalSize += size;
        stats.totalEntries += keys.length;
      }

      stats.totalSizeFormatted = this.formatBytes(stats.totalSize);
      stats.isOverLimit = stats.totalSize > CACHE_CONFIG.MAX_CACHE_SIZE;
      
      return stats;
    } catch (error) {
      console.error('Failed to get cache statistics:', error);
      return { error: (error as Error).message };
    }
  }

  // Format bytes for display
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Manual cleanup trigger
  async runCleanup(): Promise<CleanupResult | CleanupError> {
    if (this.isCleanupRunning) {return { error: 'Cleanup already running' };
    }

    this.isCleanupRunning = true;try {
      // Clean up browser caches
      const cacheResults = await this.manageCacheSize();
      
      // Clean up React Query cache
      const queryResults = await this.cleanupReactQueryCache();return {
        cache: cacheResults,
        query: queryResults,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Cache cleanup failed:', error);
      return { error: (error as Error).message };
    } finally {
      this.isCleanupRunning = false;
    }
  }

  // Clean up React Query cache
  async cleanupReactQueryCache(): Promise<QueryCleanupResult | QueryCleanupError> {
    try {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      let removedCount = 0;
      const now = Date.now();
      
      queries.forEach(query => {
        const { dataUpdatedAt } = query.state;
        const maxAge = 10 * 60 * 1000; // 10 minutes default
        
        if (dataUpdatedAt && (now - dataUpdatedAt) > maxAge) {
          queryClient.removeQueries({ queryKey: query.queryKey });
          removedCount++;
        }
      });

      // Perform garbage collection
      queryClient.getQueryCache().clear();
      
      return {
        totalQueries: queries.length,
        removedQueries: removedCount,
      };
    } catch (error) {
      console.error('Failed to cleanup React Query cache:', error);
      return { error: (error as Error).message };
    }
  }

  // Destroy cleanup manager
  destroy(): void {
    this.stopAutoCleanup();
  }
}

// Global cache cleanup manager instance
export const cacheCleanupManager = new CacheCleanupManager();

// Utility functions for manual cache management
export const performCacheCleanup = (): Promise<CleanupResult | CleanupError> => cacheCleanupManager.runCleanup();
export const getCacheStats = (): Promise<CacheStatistics | CacheStatisticsError> => cacheCleanupManager.getCacheStatistics();
export const manageCacheSize = (): Promise<CacheManagementResult | CacheManagementError> => cacheCleanupManager.manageCacheSize();

// Hook for React components to trigger cleanup
export const useCacheCleanup = (): UseCacheCleanupReturn => {
  return {
    performCleanup: performCacheCleanup,
    getCacheStats,
    manageCacheSize,
  };
};

export default CacheCleanupManager;
