/**
 * Share Cache Service
 * Provides caching functionality for share-related data with TTL support
 */

import { CACHE_TTL } from '../../constants/sharing';

class ShareCacheService {
  constructor() {
    // In-memory cache storage
    this.cache = new Map();
    
    // Cache metadata for tracking
    this.metadata = new Map();
    
    // Cleanup interval (run every minute)
    this.cleanupInterval = setInterval(() => this._cleanup(), 60000);
  }

  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if expired/not found
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (this._isExpired(entry)) {
      this.delete(key);
      return null;
    }
    
    // Update access metadata
    this._updateAccessMetadata(key);
    
    return entry.value;
  }

  /**
   * Set item in cache with TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = null) {
    const expiresAt = ttl ? Date.now() + ttl : null;
    
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });
    
    // Initialize metadata
    this.metadata.set(key, {
      hits: 0,
      lastAccess: Date.now(),
      size: this._estimateSize(value)
    });
  }

  /**
   * Delete item from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    this.metadata.delete(key);
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (this._isExpired(entry)) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.metadata.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const entries = Array.from(this.metadata.entries());
    const totalHits = entries.reduce((sum, [, meta]) => sum + meta.hits, 0);
    const totalSize = entries.reduce((sum, [, meta]) => sum + meta.size, 0);
    
    return {
      entries: this.cache.size,
      totalHits,
      totalSize,
      hitRate: totalHits > 0 ? (totalHits / (totalHits + this.cache.size)) : 0
    };
  }

  /**
   * Get cache entry metadata
   * @param {string} key - Cache key
   * @returns {Object|null} Metadata or null
   */
  getMetadata(key) {
    return this.metadata.get(key) || null;
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param {RegExp|string} pattern - Pattern to match keys
   */
  invalidatePattern(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    
    return keysToDelete.length;
  }

  /**
   * Cleanup expired entries
   * @private
   */
  _cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this._isExpired(entry, now)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Check if cache entry is expired
   * @private
   */
  _isExpired(entry, now = Date.now()) {
    return entry.expiresAt !== null && entry.expiresAt < now;
  }

  /**
   * Update access metadata
   * @private
   */
  _updateAccessMetadata(key) {
    const meta = this.metadata.get(key);
    if (meta) {
      meta.hits++;
      meta.lastAccess = Date.now();
    }
  }

  /**
   * Estimate size of cached value
   * @private
   */
  _estimateSize(value) {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }

  /**
   * Destroy cache service and cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Create singleton instance
const shareCacheService = new ShareCacheService();

// Friends list caching methods
export const friendsCache = {
  /**
   * Get cached friends list
   * @param {string} userId - User ID
   * @returns {Array|null} Cached friends list or null
   */
  get(userId) {
    return shareCacheService.get(`friends:${userId}`);
  },

  /**
   * Set friends list in cache
   * @param {string} userId - User ID
   * @param {Array} friends - Friends list
   */
  set(userId, friends) {
    shareCacheService.set(`friends:${userId}`, friends, CACHE_TTL.FRIENDS_LIST);
  },

  /**
   * Invalidate friends cache for a user
   * @param {string} userId - User ID
   */
  invalidate(userId) {
    shareCacheService.delete(`friends:${userId}`);
  },

  /**
   * Invalidate all friends caches
   */
  invalidateAll() {
    return shareCacheService.invalidatePattern(/^friends:/);
  }
};

// Groups membership caching methods
export const groupsCache = {
  /**
   * Get cached groups list
   * @param {string} userId - User ID
   * @returns {Array|null} Cached groups list or null
   */
  get(userId) {
    return shareCacheService.get(`groups:${userId}`);
  },

  /**
   * Set groups list in cache
   * @param {string} userId - User ID
   * @param {Array} groups - Groups list
   */
  set(userId, groups) {
    shareCacheService.set(`groups:${userId}`, groups, CACHE_TTL.GROUPS_LIST);
  },

  /**
   * Invalidate groups cache for a user
   * @param {string} userId - User ID
   */
  invalidate(userId) {
    shareCacheService.delete(`groups:${userId}`);
  },

  /**
   * Invalidate all groups caches
   */
  invalidateAll() {
    return shareCacheService.invalidatePattern(/^groups:/);
  },

  /**
   * Get cached group details
   * @param {string} groupId - Group ID
   * @returns {Object|null} Cached group details or null
   */
  getGroupDetails(groupId) {
    return shareCacheService.get(`group:${groupId}`);
  },

  /**
   * Set group details in cache
   * @param {string} groupId - Group ID
   * @param {Object} groupData - Group data
   */
  setGroupDetails(groupId, groupData) {
    shareCacheService.set(`group:${groupId}`, groupData, CACHE_TTL.GROUPS_LIST);
  },

  /**
   * Invalidate specific group details
   * @param {string} groupId - Group ID
   */
  invalidateGroupDetails(groupId) {
    shareCacheService.delete(`group:${groupId}`);
  }
};

// Share count caching methods with optimistic updates
export const shareCountCache = {
  /**
   * Get cached share count
   * @param {string} postId - Post ID
   * @returns {number|null} Cached share count or null
   */
  get(postId) {
    return shareCacheService.get(`shareCount:${postId}`);
  },

  /**
   * Set share count in cache
   * @param {string} postId - Post ID
   * @param {number} count - Share count
   */
  set(postId, count) {
    shareCacheService.set(`shareCount:${postId}`, count, CACHE_TTL.SHARE_COUNTS);
  },

  /**
   * Optimistically increment share count
   * @param {string} postId - Post ID
   * @param {number} increment - Amount to increment (default 1)
   * @returns {number} New count
   */
  increment(postId, increment = 1) {
    const currentCount = this.get(postId) || 0;
    const newCount = currentCount + increment;
    this.set(postId, newCount);
    return newCount;
  },

  /**
   * Optimistically decrement share count
   * @param {string} postId - Post ID
   * @param {number} decrement - Amount to decrement (default 1)
   * @returns {number} New count
   */
  decrement(postId, decrement = 1) {
    const currentCount = this.get(postId) || 0;
    const newCount = Math.max(0, currentCount - decrement);
    this.set(postId, newCount);
    return newCount;
  },

  /**
   * Invalidate share count for a post
   * @param {string} postId - Post ID
   */
  invalidate(postId) {
    shareCacheService.delete(`shareCount:${postId}`);
  },

  /**
   * Invalidate all share counts
   */
  invalidateAll() {
    return shareCacheService.invalidatePattern(/^shareCount:/);
  }
};

// Share analytics caching methods
export const shareAnalyticsCache = {
  /**
   * Get cached share analytics
   * @param {string} postId - Post ID
   * @returns {Object|null} Cached analytics or null
   */
  get(postId) {
    return shareCacheService.get(`analytics:${postId}`);
  },

  /**
   * Set share analytics in cache
   * @param {string} postId - Post ID
   * @param {Object} analytics - Analytics data
   */
  set(postId, analytics) {
    shareCacheService.set(`analytics:${postId}`, analytics, CACHE_TTL.SHARE_ANALYTICS);
  },

  /**
   * Update analytics with optimistic data
   * @param {string} postId - Post ID
   * @param {Object} updates - Partial analytics updates
   */
  update(postId, updates) {
    const current = this.get(postId) || {
      totalShares: 0,
      shareBreakdown: { friends: 0, feed: 0, groups: 0 },
      recentShares: []
    };
    
    const updated = {
      ...current,
      ...updates,
      shareBreakdown: {
        ...current.shareBreakdown,
        ...(updates.shareBreakdown || {})
      }
    };
    
    this.set(postId, updated);
    return updated;
  },

  /**
   * Invalidate analytics for a post
   * @param {string} postId - Post ID
   */
  invalidate(postId) {
    shareCacheService.delete(`analytics:${postId}`);
  },

  /**
   * Invalidate all analytics
   */
  invalidateAll() {
    return shareCacheService.invalidatePattern(/^analytics:/);
  },

  /**
   * Get cached user analytics
   * @param {string} userId - User ID
   * @returns {Object|null} Cached user analytics or null
   */
  getUserAnalytics(userId) {
    return shareCacheService.get(`userAnalytics:${userId}`);
  },

  /**
   * Set user analytics in cache
   * @param {string} userId - User ID
   * @param {Object} analytics - User analytics data
   */
  setUserAnalytics(userId, analytics) {
    shareCacheService.set(`userAnalytics:${userId}`, analytics, CACHE_TTL.SHARE_ANALYTICS);
  },

  /**
   * Invalidate user analytics
   * @param {string} userId - User ID
   */
  invalidateUserAnalytics(userId) {
    shareCacheService.delete(`userAnalytics:${userId}`);
  }
};

// Export main service and specialized caches
export default shareCacheService;
export { shareCacheService };
