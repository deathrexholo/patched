// User-specific cache management strategies as per documentation
import { queryClient } from '../../lib/queryClient';

// User-specific caching strategy constants
export const CACHE_STRATEGIES = {
  USER_POSTS: (userId) => `posts-${userId}-v1`,
  USER_PROFILE: (userId) => `profile-${userId}-v1`,
  USER_MESSAGES: (userId) => `messages-${userId}-v1`,
  FOLLOWED_CONTENT: (userId) => `following-${userId}-v1`,
  USER_EVENTS: (userId) => `events-${userId}-v1`,
  USER_SEARCHES: (userId) => `searches-${userId}-v1`,
  USER_PREFERENCES: (userId) => `preferences-${userId}-v1`,
  USER_MEDIA: (userId) => `media-${userId}-v1`,
};

// Cache segmentation manager
export class UserCacheManager {
  userId: string;
  cachePrefix: string;

  constructor(userId) {
    this.userId = userId;
    this.cachePrefix = `user-${userId}`;
  }

  // Get user-specific cache name
  getCacheName(type) {
    return CACHE_STRATEGIES[type] ? CACHE_STRATEGIES[type](this.userId) : `${this.cachePrefix}-${type}`;
  }

  // Initialize user-specific caches
  async initializeUserCaches() {
    const cacheNames = Object.keys(CACHE_STRATEGIES);
    const initPromises = cacheNames.map(async (cacheType) => {
      try {
        const cacheName = this.getCacheName(cacheType);
        await caches.open(cacheName);} catch (error) {
        console.warn(`Failed to initialize cache ${cacheType}:`, error);
      }
    });

    await Promise.allSettled(initPromises);
  }

  // Cache user-specific data
  async cacheUserData(type, data, key = 'default') {
    try {
      const cacheName = this.getCacheName(type);
      const cache = await caches.open(cacheName);
      
      // Create a response object to store in cache
      const response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Timestamp': Date.now().toString(),
          'Cache-Key': key,
        },
      });

      await cache.put(new Request(`/${type}/${key}`), response);
      return true;
    } catch (error) {
      console.error(`Failed to cache ${type} data:`, error);
      return false;
    }
  }

  // Retrieve user-specific cached data
  async getCachedUserData(type, key = 'default', maxAge = 10 * 60 * 1000) {
    try {
      const cacheName = this.getCacheName(type);
      const cache = await caches.open(cacheName);
      const response = await cache.match(new Request(`/${type}/${key}`));

      if (!response) {
        return null;
      }

      // Check if cache is still valid
      const timestamp = response.headers.get('Cache-Timestamp');
      if (timestamp && (Date.now() - parseInt(timestamp)) > maxAge) {
        // Cache expired, remove it
        await cache.delete(new Request(`/${type}/${key}`));
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to retrieve cached ${type} data:`, error);
      return null;
    }
  }

  // Clear specific user cache type
  async clearUserCache(type) {
    try {
      const cacheName = this.getCacheName(type);
      const success = await caches.delete(cacheName);
      if (success) {}
      return success;
    } catch (error) {
      console.error(`Failed to clear cache ${type}:`, error);
      return false;
    }
  }

  // Clear all user-specific caches
  async clearAllUserCaches() {
    const cacheTypes = Object.keys(CACHE_STRATEGIES);
    const clearPromises = cacheTypes.map(type => this.clearUserCache(type));
    const results = await Promise.allSettled(clearPromises);
    
    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;return successful === cacheTypes.length;
  }

  // Get cache statistics for user
  async getCacheStats() {
    const stats = {};
    const cacheTypes = Object.keys(CACHE_STRATEGIES);

    for (const type of cacheTypes) {
      try {
        const cacheName = this.getCacheName(type);
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        stats[type] = {
          cacheName,
          itemCount: keys.length,
          exists: true,
        };
      } catch (error) {
        stats[type] = {
          cacheName: this.getCacheName(type),
          itemCount: 0,
          exists: false,
          error: error.message,
        };
      }
    }

    return stats;
  }

  // Prefetch user-specific content
  async prefetchUserContent(contentTypes = []) {
    const prefetchPromises = contentTypes.map(async (contentType) => {
      try {
        switch (contentType) {
          case 'POSTS':
            await this.prefetchUserPosts();
            break;
          case 'PROFILE':
            await this.prefetchUserProfile();
            break;
          case 'MESSAGES':
            await this.prefetchUserMessages();
            break;
          case 'FOLLOWED_CONTENT':
            await this.prefetchFollowedContent();
            break;
          default:
            console.warn(`Unknown content type for prefetch: ${contentType}`);
        }
      } catch (error) {
        console.error(`Failed to prefetch ${contentType}:`, error);
      }
    });

    await Promise.allSettled(prefetchPromises);
  }

  // Prefetch user posts
  async prefetchUserPosts() {
    try {
      await queryClient.prefetchQuery({
        queryKey: ['posts', 'user', this.userId],
        queryFn: () => import('../../services/api/postsService').then(service => service.default.getUserPosts(this.userId)),
        staleTime: 5 * 60 * 1000,
      });
    } catch (error) {
      console.error('Failed to prefetch user posts:', error);
    }
  }

  // Prefetch user profile
  async prefetchUserProfile() {
    try {
      await queryClient.prefetchQuery({
        queryKey: ['user', 'profile', this.userId],
        queryFn: () => import('../../services/api/userService').then(service => service.default.getUserProfile(this.userId)),
        staleTime: 10 * 60 * 1000,
      });
    } catch (error) {
      console.error('Failed to prefetch user profile:', error);
    }
  }

  // Prefetch user messages (placeholder - implement when messagesService is available)
  async prefetchUserMessages() {
    try {
      // Messages service not yet implemented - placeholder for future functionalityreturn Promise.resolve([]);
    } catch (error) {
      console.error('Failed to prefetch user messages:', error);
    }
  }

  // Prefetch followed content
  async prefetchFollowedContent() {
    try {
      await queryClient.prefetchQuery({
        queryKey: ['posts', 'following', this.userId],
        // Follow system removed - returning empty array
        queryFn: () => Promise.resolve([]),
        staleTime: 5 * 60 * 1000,
      });
    } catch (error) {
      console.error('Failed to prefetch followed content:', error);
    }
  }

  // Sync user preferences with cache
  async syncUserPreferences(preferences) {
    await this.cacheUserData('USER_PREFERENCES', preferences, 'settings');
    
    // Update React Query cache as well
    queryClient.setQueryData(['user', 'preferences', this.userId], preferences);
  }

  // Get cached user preferences
  async getUserPreferences() {
    const cached = await this.getCachedUserData('USER_PREFERENCES', 'settings');
    if (cached) {
      return cached;
    }

    // Fallback to React Query cache
    return queryClient.getQueryData(['user', 'preferences', this.userId]);
  }
}

// Global user cache managers registry
const userCacheManagers = new Map();

// Get or create user cache manager
export const getUserCacheManager = (userId) => {
  if (!userId) {
    return null;
  }

  if (!userCacheManagers.has(userId)) {
    userCacheManagers.set(userId, new UserCacheManager(userId));
  }

  return userCacheManagers.get(userId);
};

// Clear all user cache managers (useful for logout)
export const clearAllUserCacheManagers = async () => {
  const clearPromises = Array.from(userCacheManagers.values()).map(manager => 
    manager.clearAllUserCaches()
  );
  
  await Promise.allSettled(clearPromises);
  userCacheManagers.clear();
};

// Initialize cache for new user
export const initializeUserCache = async (userId) => {
  const manager = getUserCacheManager(userId);
  if (manager) {
    await manager.initializeUserCaches();
    return manager;
  }
  return null;
};

export default UserCacheManager;