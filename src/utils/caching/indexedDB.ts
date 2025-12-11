// IndexedDB utilities for offline data storage - Phase 3 implementation
// Comprehensive IndexedDB wrapper for AmaPlayer offline functionality

const DB_NAME = 'AmaPlayerOfflineDB';
const DB_VERSION = 3; // Incremented to trigger upgrade for cache invalidation stores

// Store names for different types of offline data
export const STORES = {
  POSTS: 'offline_posts',
  LIKES: 'offline_likes', 
  COMMENTS: 'offline_comments',
  FOLLOWS: 'offline_follows',
  USER_DATA: 'cached_users',
  MEDIA_METADATA: 'media_metadata',
  SYNC_QUEUE: 'sync_queue',
  CONFLICT_RESOLUTION: 'conflicts',
  // Analytics stores
  ANALYTICS_EVENTS: 'analytics_events',
  ANALYTICS_BATCHES: 'analytics_batches',
  ANALYTICS_SESSION: 'analytics_session',
  ANALYTICS_METADATA: 'analytics_metadata',
  // Cache invalidation rules store
  CACHE_INVALIDATION_RULES: 'cache_invalidation_rules',
  // User behavior patterns store
  USER_BEHAVIOR: 'user_behavior'
};

// IndexedDB wrapper class
class IndexedDBManager {
  private db: IDBDatabase | null;
  private isInitialized: boolean;

  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  // Initialize IndexedDB connection
  async init() {
    if (this.isInitialized && this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;this.setupStores(db);
      };

      request.onblocked = () => {
        console.warn('IndexedDB upgrade blocked. Please close other tabs and refresh.');
      };
    });
  }

  // Setup object stores on database upgrade
  setupStores(db) {// Offline posts store
    if (!db.objectStoreNames.contains(STORES.POSTS)) {
      const postsStore = db.createObjectStore(STORES.POSTS, { keyPath: 'id' });
      postsStore.createIndex('status', 'status', { unique: false });
      postsStore.createIndex('userId', 'userId', { unique: false });
      postsStore.createIndex('createdAt', 'createdAt', { unique: false });
    }

    // Offline likes store
    if (!db.objectStoreNames.contains(STORES.LIKES)) {
      const likesStore = db.createObjectStore(STORES.LIKES, { keyPath: 'id' });
      likesStore.createIndex('postId', 'postId', { unique: false });
      likesStore.createIndex('userId', 'userId', { unique: false });
      likesStore.createIndex('status', 'status', { unique: false });
    }

    // Offline comments store
    if (!db.objectStoreNames.contains(STORES.COMMENTS)) {
      const commentsStore = db.createObjectStore(STORES.COMMENTS, { keyPath: 'id' });
      commentsStore.createIndex('postId', 'postId', { unique: false });
      commentsStore.createIndex('userId', 'userId', { unique: false });
      commentsStore.createIndex('status', 'status', { unique: false });
    }

    // Offline follows store
    if (!db.objectStoreNames.contains(STORES.FOLLOWS)) {
      const followsStore = db.createObjectStore(STORES.FOLLOWS, { keyPath: 'id' });
      followsStore.createIndex('followerId', 'followerId', { unique: false });
      followsStore.createIndex('followingId', 'followingId', { unique: false });
      followsStore.createIndex('action', 'action', { unique: false }); // 'follow' or 'unfollow'
    }

    // Cached user data store
    if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
      const userStore = db.createObjectStore(STORES.USER_DATA, { keyPath: 'id' });
      userStore.createIndex('updatedAt', 'updatedAt', { unique: false });
    }

    // Media metadata store
    if (!db.objectStoreNames.contains(STORES.MEDIA_METADATA)) {
      const mediaStore = db.createObjectStore(STORES.MEDIA_METADATA, { keyPath: 'id' });
      mediaStore.createIndex('url', 'url', { unique: false });
      mediaStore.createIndex('type', 'type', { unique: false });
    }

    // Sync queue store for background sync
    if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
      const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
      syncStore.createIndex('type', 'type', { unique: false });
      syncStore.createIndex('priority', 'priority', { unique: false });
      syncStore.createIndex('createdAt', 'createdAt', { unique: false });
    }

    // Conflict resolution store
    if (!db.objectStoreNames.contains(STORES.CONFLICT_RESOLUTION)) {
      const conflictStore = db.createObjectStore(STORES.CONFLICT_RESOLUTION, { keyPath: 'id' });
      conflictStore.createIndex('entityType', 'entityType', { unique: false });
      conflictStore.createIndex('entityId', 'entityId', { unique: false });
      conflictStore.createIndex('createdAt', 'createdAt', { unique: false });
    }

    // Analytics events store
    if (!db.objectStoreNames.contains(STORES.ANALYTICS_EVENTS)) {
      const analyticsStore = db.createObjectStore(STORES.ANALYTICS_EVENTS, { keyPath: 'id' });
      analyticsStore.createIndex('type', 'type', { unique: false });
      analyticsStore.createIndex('category', 'category', { unique: false });
      analyticsStore.createIndex('priority', 'priority', { unique: false });
      analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
      analyticsStore.createIndex('synced', 'metadata.synced', { unique: false });
    }

    // Analytics batches store
    if (!db.objectStoreNames.contains(STORES.ANALYTICS_BATCHES)) {
      const batchesStore = db.createObjectStore(STORES.ANALYTICS_BATCHES, { keyPath: 'id' });
      batchesStore.createIndex('priority', 'priority', { unique: false });
      batchesStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    // Analytics session store
    if (!db.objectStoreNames.contains(STORES.ANALYTICS_SESSION)) {
      const sessionStore = db.createObjectStore(STORES.ANALYTICS_SESSION, { keyPath: 'sessionId' });
      sessionStore.createIndex('startTime', 'startTime', { unique: false });
    }

    // Analytics metadata store
    if (!db.objectStoreNames.contains(STORES.ANALYTICS_METADATA)) {
      const metadataStore = db.createObjectStore(STORES.ANALYTICS_METADATA, { keyPath: 'key' });
      metadataStore.createIndex('updatedAt', 'updatedAt', { unique: false });
    }

    // Cache invalidation rules store
    if (!db.objectStoreNames.contains(STORES.CACHE_INVALIDATION_RULES)) {
      const invalidationStore = db.createObjectStore(STORES.CACHE_INVALIDATION_RULES, { keyPath: 'key' });
      invalidationStore.createIndex('updatedAt', 'updatedAt', { unique: false });
    }

    // User behavior patterns store
    if (!db.objectStoreNames.contains(STORES.USER_BEHAVIOR)) {
      const behaviorStore = db.createObjectStore(STORES.USER_BEHAVIOR, { keyPath: 'key' });
      behaviorStore.createIndex('updatedAt', 'updatedAt', { unique: false });
    }}

  // Generic method to add data to a store
  async add(storeName, data) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic method to put (add or update) data in a store
  async put(storeName, data) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic method to get data from a store by key
  async get(storeName, key) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic method to get all data from a store
  async getAll(storeName: string): Promise<any[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Get data by index
  async getByIndex(storeName: string, indexName: string, value: any): Promise<any[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete data from store by key
  async delete(storeName, key) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all data from a store
  async clear(storeName) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Count items in store
  async count(storeName, query = null) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = query ? store.count(query) : store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get storage usage statistics
  async getStorageStats() {
    const stats = {};
    
    for (const storeName of Object.values(STORES)) {
      try {
        const count = await this.count(storeName);
        stats[storeName] = { count };
      } catch (error) {
        stats[storeName] = { count: 0, error: error.message };
      }
    }

    return stats;
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  // Reset database (delete and recreate)
  async reset() {
    try {
      // Close existing connection
      this.close();
      
      // Delete the database
      return new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        
        deleteRequest.onsuccess = () => {resolve();
        };
        
        deleteRequest.onerror = () => {
          console.error('Failed to delete IndexedDB database:', deleteRequest.error);
          reject(deleteRequest.error);
        };
        
        deleteRequest.onblocked = () => {
          console.warn('Database deletion blocked. Please close other tabs.');
        };
      });
    } catch (error) {
      console.error('Failed to reset IndexedDB:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const idbManager = new IndexedDBManager();

// Convenience methods for specific operations
export const idbStore = {
  // Initialize database
  init: () => idbManager.init(),

  // Post operations
  addOfflinePost: (post) => idbManager.put(STORES.POSTS, post),
  getOfflinePost: (postId) => idbManager.get(STORES.POSTS, postId),
  getAllOfflinePosts: () => idbManager.getAll(STORES.POSTS),
  getPendingPosts: () => idbManager.getByIndex(STORES.POSTS, 'status', 'pending'),
  deleteOfflinePost: (postId) => idbManager.delete(STORES.POSTS, postId),

  // Like operations
  addOfflineLike: (like) => idbManager.put(STORES.LIKES, like),
  getPendingLikes: () => idbManager.getByIndex(STORES.LIKES, 'status', 'pending'),
  deleteOfflineLike: (likeId) => idbManager.delete(STORES.LIKES, likeId),

  // Comment operations
  addOfflineComment: (comment) => idbManager.put(STORES.COMMENTS, comment),
  getPendingComments: () => idbManager.getByIndex(STORES.COMMENTS, 'status', 'pending'),
  deleteOfflineComment: (commentId) => idbManager.delete(STORES.COMMENTS, commentId),

  // Follow operations
  addOfflineFollow: (follow) => idbManager.put(STORES.FOLLOWS, follow),
  getPendingFollows: () => idbManager.getByIndex(STORES.FOLLOWS, 'action', 'follow'),
  getPendingUnfollows: () => idbManager.getByIndex(STORES.FOLLOWS, 'action', 'unfollow'),
  deleteOfflineFollow: (followId) => idbManager.delete(STORES.FOLLOWS, followId),

  // User data operations
  cacheUser: (user) => idbManager.put(STORES.USER_DATA, { ...user, updatedAt: Date.now() }),
  getCachedUser: (userId) => idbManager.get(STORES.USER_DATA, userId),
  getAllCachedUsers: () => idbManager.getAll(STORES.USER_DATA),

  // Sync queue operations
  addToSyncQueue: (item) => idbManager.put(STORES.SYNC_QUEUE, item),
  getSyncQueue: () => idbManager.getAll(STORES.SYNC_QUEUE),
  getSyncQueueByType: (type) => idbManager.getByIndex(STORES.SYNC_QUEUE, 'type', type),
  removeFromSyncQueue: (itemId) => idbManager.delete(STORES.SYNC_QUEUE, itemId),

  // Conflict resolution operations
  addConflict: (conflict) => idbManager.put(STORES.CONFLICT_RESOLUTION, conflict),
  getConflicts: () => idbManager.getAll(STORES.CONFLICT_RESOLUTION),
  getConflictsByEntity: (entityType, entityId) => {
    return idbManager.getByIndex(STORES.CONFLICT_RESOLUTION, 'entityType', entityType)
      .then(conflicts => conflicts.filter(c => c.entityId === entityId));
  },
  resolveConflict: (conflictId) => idbManager.delete(STORES.CONFLICT_RESOLUTION, conflictId),

  // General operations
  set: (storeName, data) => idbManager.put(storeName, data),
  get: (storeName, key) => idbManager.get(storeName, key),
  getAll: (storeName) => idbManager.getAll(storeName),
  delete: (storeName, key) => idbManager.delete(storeName, key),
  clear: (storeName) => idbManager.clear(storeName),
  count: (storeName) => idbManager.count(storeName),
  
  // Utility methods
  getStorageStats: () => idbManager.getStorageStats(),
  close: () => idbManager.close(),
  reset: () => idbManager.reset(),
};

export default idbManager;