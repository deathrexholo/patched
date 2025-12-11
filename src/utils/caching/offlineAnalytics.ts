// Offline Analytics Tracking System
// Comprehensive offline analytics with automatic sync and batch processing
// Part of Phase 4: Advanced Features implementation

import { idbStore } from './indexedDB';

class OfflineAnalyticsTracker {
  eventQueue: any[];
  syncInProgress: boolean;
  batchSize: number;
  syncInterval: number;
  maxQueueSize: number;
  retryAttempts: number;
  isInitialized: boolean;
  eventTypes: any;
  batchConfig: any;
  sessionId: string;
  sessionStartTime: number;
  offlineStartTime: number;
  lastSyncTime: number;
  syncStartTime: number;

  constructor() {
    this.eventQueue = [];
    this.syncInProgress = false;
    this.batchSize = 50;
    this.syncInterval = 10 * 60 * 1000; // 10 minutes
    this.maxQueueSize = 1000;
    this.retryAttempts = 3;
    this.isInitialized = false;
    
    // Analytics event types with their metadata requirements
    this.eventTypes = {
      // User interaction events
      POST_VIEWED_OFFLINE: { category: 'engagement', priority: 'medium' },
      PROFILE_VISITED_OFFLINE: { category: 'engagement', priority: 'medium' },
      SEARCH_PERFORMED_OFFLINE: { category: 'engagement', priority: 'low' },
      CONTENT_SHARED_OFFLINE: { category: 'engagement', priority: 'high' },
      COMMENT_CREATED_OFFLINE: { category: 'engagement', priority: 'high' },
      LIKE_ACTION_OFFLINE: { category: 'engagement', priority: 'medium' },
      FOLLOW_ACTION_OFFLINE: { category: 'social', priority: 'high' },
      
      // Content consumption events
      VIDEO_WATCHED_OFFLINE: { category: 'content', priority: 'medium' },
      IMAGE_VIEWED_OFFLINE: { category: 'content', priority: 'low' },
      STORY_VIEWED_OFFLINE: { category: 'content', priority: 'medium' },
      EVENT_DETAILS_VIEWED_OFFLINE: { category: 'content', priority: 'medium' },
      
      // Navigation and usage events
      PAGE_VIEWED_OFFLINE: { category: 'navigation', priority: 'low' },
      TAB_SWITCHED_OFFLINE: { category: 'navigation', priority: 'low' },
      MODAL_OPENED_OFFLINE: { category: 'ui', priority: 'low' },
      FEATURE_USED_OFFLINE: { category: 'ui', priority: 'medium' },
      
      // Performance and technical events
      CACHE_HIT: { category: 'performance', priority: 'low' },
      CACHE_MISS: { category: 'performance', priority: 'medium' },
      OFFLINE_MODE_ENTERED: { category: 'technical', priority: 'high' },
      ONLINE_MODE_RESUMED: { category: 'technical', priority: 'high' },
      SYNC_COMPLETED: { category: 'technical', priority: 'medium' },
      SYNC_FAILED: { category: 'technical', priority: 'high' },
      
      // Error and debug events
      ERROR_OCCURRED: { category: 'error', priority: 'critical' },
      WARNING_TRIGGERED: { category: 'warning', priority: 'medium' },
      DEBUG_INFO: { category: 'debug', priority: 'low' },
      
      // User session events
      SESSION_STARTED_OFFLINE: { category: 'session', priority: 'high' },
      SESSION_ENDED_OFFLINE: { category: 'session', priority: 'high' },
      BACKGROUND_SYNC_TRIGGERED: { category: 'background', priority: 'medium' },
      
      // Custom business events
      TALENT_SHOWCASE_VIEWED: { category: 'business', priority: 'high' },
      EVENT_REGISTRATION_OFFLINE: { category: 'business', priority: 'critical' },
      ATHLETE_PROFILE_FAVORITED: { category: 'business', priority: 'high' },
      SPORTS_FILTER_APPLIED: { category: 'business', priority: 'medium' }
    };
    
    // Batch processing configuration
    this.batchConfig = {
      lowPriority: { maxAge: 60 * 60 * 1000, batchSize: 100 }, // 1 hour
      medium: { maxAge: 30 * 60 * 1000, batchSize: 50 }, // 30 minutes
      high: { maxAge: 15 * 60 * 1000, batchSize: 25 }, // 15 minutes
      critical: { maxAge: 5 * 60 * 1000, batchSize: 10 } // 5 minutes
    };
    
    this.init();
  }

  async init() {
    try {
      // Initialize IndexedDB storage for analytics
      await this.initializeAnalyticsStorage();
      
      // Load pending events from storage
      await this.loadPendingEvents();
      
      // Start periodic sync
      this.startPeriodicSync();
      
      // Setup network listeners
      this.setupNetworkListeners();
      
      // Setup session tracking
      this.setupSessionTracking();
      
      this.isInitialized = true;// Track initialization
      this.trackEvent('SYSTEM_INITIALIZED', {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        offline: !navigator.onLine
      });
      
    } catch (error) {
      console.error('Failed to initialize offline analytics tracker:', error);
    }
  }

  // Initialize analytics-specific IndexedDB stores
  async initializeAnalyticsStorage() {
    // This extends the existing IndexedDB setup with analytics-specific stores
    const analyticsStores = {
      analytics_events: { keyPath: 'id', autoIncrement: false },
      analytics_batches: { keyPath: 'id', autoIncrement: false },
      analytics_session: { keyPath: 'sessionId', autoIncrement: false },
      analytics_metadata: { keyPath: 'key', autoIncrement: false }
    };

    // The stores would be added to the existing IndexedDB setup}

  // Load pending events from IndexedDB on startup
  async loadPendingEvents() {
    try {
      // Ensure IndexedDB is initialized
      await idbStore.init();
      const storedEvents = await idbStore.getAll('analytics_events');
      this.eventQueue = storedEvents || [];
      
      // Also load from localStorage fallback if any
      await this.loadFromLocalStorageFallback();} catch (error) {
      console.error('Failed to load pending analytics events:', error);
      this.eventQueue = [];
      
      // Try to load from localStorage fallback
      await this.loadFromLocalStorageFallback();
    }
  }

  // Load events from localStorage fallback
  async loadFromLocalStorageFallback() {
    try {
      const key = 'amaplayer_analytics_fallback';
      const fallbackEvents = JSON.parse(localStorage.getItem(key) || '[]');
      
      if (fallbackEvents.length > 0) {this.eventQueue = [...this.eventQueue, ...fallbackEvents];
        
        // Clear fallback storage after loading
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Failed to load from localStorage fallback:', error);
    }
  }

  // Track an analytics event
  trackEvent(eventType, eventData = {}, options = {}) {
    try {
      // Validate event type
      if (!this.eventTypes[eventType]) {
        console.warn(`Unknown analytics event type: ${eventType}`);
        return;
      }

      const eventMetadata = this.eventTypes[eventType];
      const eventId = `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const analyticsEvent = {
        id: eventId,
        type: eventType,
        category: eventMetadata.category,
        priority: eventMetadata.priority,
        timestamp: Date.now(),
        sessionId: this.getCurrentSessionId(),
        userId: (eventData as any).userId || this.getCurrentUserId(),
        data: {
          ...eventData,
          url: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          offline: !navigator.onLine,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        metadata: {
          retryCount: 0,
          synced: false,
          createdAt: new Date().toISOString(),
          syncAttempts: [],
          ...options
        }
      };

      // Add to queue
      this.eventQueue.push(analyticsEvent);
      
      // Store immediately in IndexedDB
      this.storeEventToIndexedDB(analyticsEvent);
      
      // Check if we need to sync immediately
      this.checkImmediateSync(analyticsEvent);
      
      // Prevent queue from growing too large
      if (this.eventQueue.length > this.maxQueueSize) {
        this.eventQueue = this.eventQueue.slice(-this.maxQueueSize);
      }} catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }

  // Store event to IndexedDB immediately
  async storeEventToIndexedDB(event) {
    try {
      // Ensure IndexedDB is initialized first
      await idbStore.init();
      await idbStore.set('analytics_events', event);
    } catch (error) {
      console.error('Failed to store analytics event to IndexedDB:', error);
      // Fallback: store in localStorage temporarily
      this.storeEventToLocalStorage(event);
    }
  }

  // Fallback storage method using localStorage
  storeEventToLocalStorage(event) {
    try {
      const key = 'amaplayer_analytics_fallback';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(event);
      
      // Keep only last 100 events in localStorage
      if (existing.length > 100) {
        existing.splice(0, existing.length - 100);
      }
      
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) {
      // If localStorage also fails, just log the error
      console.warn('Failed to store analytics event to localStorage fallback:', e);
    }
  }

  // Check if immediate sync is needed for critical events
  checkImmediateSync(event) {
    if (event.priority === 'critical' && navigator.onLine) {
      // Sync critical events immediately
      setTimeout(() => {
        this.syncAnalyticsEvents(true);
      }, 1000);
    }
  }

  // Perform analytics sync
  async syncAnalyticsEvents(forceCriticalOnly = false) {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;
    
    try {// Get events to sync based on priority and age
      const eventsToSync = this.getEventsToSync(forceCriticalOnly);
      
      if (eventsToSync.length === 0) {return;
      }

      // Process events in batches by priority
      const batchResults = await this.processBatchesByPriority(eventsToSync);
      
      // Update local storage after successful sync
      await this.updateLocalStorageAfterSync(batchResults);
      
      // Log sync results
      const totalSynced = batchResults.reduce((sum, batch) => sum + batch.successful, 0);
      const totalFailed = batchResults.reduce((sum, batch) => sum + batch.failed, 0);// Track sync completion
      this.trackEvent('SYNC_COMPLETED', {
        eventsSynced: totalSynced,
        eventsFailed: totalFailed,
        syncDuration: Date.now() - this.syncStartTime
      });
      
    } catch (error) {
      console.error('Analytics sync failed:', error);
      this.trackEvent('SYNC_FAILED', {
        error: error.message,
        eventsInQueue: this.eventQueue.length
      });
    } finally {
      this.syncInProgress = false;
    }
  }

  // Get events that should be synced
  getEventsToSync(forceCriticalOnly = false) {
    const now = Date.now();
    
    return this.eventQueue.filter(event => {
      if (!event.metadata || event.metadata.synced) return false;
      
      const age = now - event.timestamp;
      const priority = event.priority || 'medium';
      const maxAge = this.batchConfig[priority]?.maxAge || this.batchConfig.medium.maxAge;
      
      // For critical events or forced critical sync
      if (priority === 'critical' || forceCriticalOnly) {
        return priority === 'critical';
      }
      
      // For other events, check if they're old enough to sync
      return age >= maxAge;
    });
  }

  // Process events in batches by priority
  async processBatchesByPriority(events) {
    const eventsByPriority = this.groupEventsByPriority(events);
    const batchResults = [];
    
    // Process in priority order: critical -> high -> medium -> low
    const priorities = ['critical', 'high', 'medium', 'low'];
    
    for (const priority of priorities) {
      if (eventsByPriority[priority] && eventsByPriority[priority].length > 0) {
        const batchSize = this.batchConfig[priority]?.batchSize || 50;
        const batches = this.createBatches(eventsByPriority[priority], batchSize);
        
        for (const batch of batches) {
          const result = await this.syncBatch(batch, priority);
          batchResults.push(result);
          
          // Add delay between batches to prevent overwhelming the server
          if (batches.length > 1) {
            await this.sleep(1000); // 1 second delay
          }
        }
      }
    }
    
    return batchResults;
  }

  // Group events by priority
  groupEventsByPriority(events) {
    return events.reduce((groups, event) => {
      const priority = event.priority || 'medium';
      if (!groups[priority]) {
        groups[priority] = [];
      }
      groups[priority].push(event);
      return groups;
    }, {});
  }

  // Create batches from events array
  createBatches(events, batchSize) {
    const batches = [];
    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }
    return batches;
  }

  // Sync a batch of events
  async syncBatch(events, priority) {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // In a real implementation, this would send to your analytics endpoint
      const response = await this.sendAnalyticsBatch({
        batchId,
        priority,
        events,
        timestamp: Date.now()
      });
      
      // Mark events as synced
      events.forEach(event => {
        if (event.metadata) {
          event.metadata.synced = true;
          event.metadata.syncedAt = new Date().toISOString();
        }
      });
      
      return {
        batchId,
        priority,
        successful: events.length,
        failed: 0,
        events: events.map(e => e.id)
      };
      
    } catch (error) {
      console.error(`Failed to sync batch ${batchId}:`, error);
      
      // Update retry count for failed events
      events.forEach(event => {
        if (event.metadata) {
          event.metadata.retryCount = (event.metadata.retryCount || 0) + 1;
          event.metadata.syncAttempts.push({
            timestamp: Date.now(),
            error: error.message
          });
        }
      });
      
      return {
        batchId,
        priority,
        successful: 0,
        failed: events.length,
        error: error.message,
        events: events.map(e => e.id)
      };
    }
  }

  // Mock function to send analytics batch (replace with real API call)
  async sendAnalyticsBatch(batchData) {
    // Simulate network request
    await this.sleep(500 + Math.random() * 500);
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Network error during analytics sync');
    }
    
    return {
      success: true,
      batchId: batchData.batchId,
      processedCount: batchData.events.length
    };
  }

  // Update local storage after successful sync
  async updateLocalStorageAfterSync(batchResults) {
    try {
      const syncedEventIds = new Set();
      
      // Collect all successfully synced event IDs
      batchResults.forEach(result => {
        if (result.successful > 0) {
          result.events.forEach(eventId => syncedEventIds.add(eventId));
        }
      });
      
      // Remove synced events from queue
      this.eventQueue = this.eventQueue.filter(event => !syncedEventIds.has(event.id));
      
      // Remove synced events from IndexedDB
      for (const eventId of syncedEventIds) {
        await idbStore.delete('analytics_events', eventId);
      }} catch (error) {
      console.error('Failed to update local storage after sync:', error);
    }
  }

  // Session tracking functionality
  setupSessionTracking() {
    // Generate session ID
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionStartTime = Date.now();
    
    // Track session start
    this.trackEvent('SESSION_STARTED_OFFLINE', {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      offline: !navigator.onLine
    });
    
    // Track session end on page unload
    window.addEventListener('beforeunload', () => {
      this.trackEvent('SESSION_ENDED_OFFLINE', {
        sessionId: this.sessionId,
        sessionDuration: Date.now() - this.sessionStartTime,
        eventsTracked: this.eventQueue.length
      });
    });
    
    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.trackEvent('TAB_SWITCHED_OFFLINE', {
          action: 'focus',
          timestamp: Date.now()
        });
      } else {
        this.trackEvent('TAB_SWITCHED_OFFLINE', {
          action: 'blur',
          timestamp: Date.now()
        });
      }
    });
  }

  // Network event listeners
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.trackEvent('ONLINE_MODE_RESUMED', {
        offlineDuration: this.calculateOfflineDuration(),
        eventsPending: this.eventQueue.length
      });
      
      // Trigger sync when back online
      setTimeout(() => {
        this.syncAnalyticsEvents();
      }, 2000);
    });
    
    window.addEventListener('offline', () => {
      this.offlineStartTime = Date.now();
      this.trackEvent('OFFLINE_MODE_ENTERED', {
        timestamp: Date.now(),
        eventsInQueue: this.eventQueue.length
      });
    });
  }

  calculateOfflineDuration() {
    return this.offlineStartTime ? Date.now() - this.offlineStartTime : 0;
  }

  // Start periodic sync
  startPeriodicSync() {
    setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.syncAnalyticsEvents();
      }
    }, this.syncInterval);}

  // Helper methods
  getCurrentSessionId() {
    return this.sessionId || 'unknown_session';
  }

  getCurrentUserId() {
    // This would integrate with your auth system
    return 'current_user_id';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods for common events
  trackPageView(page, additionalData = {}) {
    this.trackEvent('PAGE_VIEWED_OFFLINE', {
      page,
      timestamp: Date.now(),
      ...additionalData
    });
  }

  trackUserInteraction(action, target, additionalData = {}) {
    const eventType = this.mapInteractionToEventType(action);
    this.trackEvent(eventType, {
      action,
      target,
      timestamp: Date.now(),
      ...additionalData
    });
  }

  trackError(error, context = {}) {
    this.trackEvent('ERROR_OCCURRED', {
      error: error.message || error,
      stack: error.stack,
      context,
      timestamp: Date.now()
    });
  }

  trackPerformance(metric, value, additionalData = {}) {
    this.trackEvent('CACHE_HIT', {
      metric,
      value,
      timestamp: Date.now(),
      ...additionalData
    });
  }

  trackBusinessEvent(eventType, data = {}) {
    this.trackEvent(eventType, {
      ...data,
      timestamp: Date.now()
    });
  }

  mapInteractionToEventType(action) {
    const mapping = {
      'click': 'FEATURE_USED_OFFLINE',
      'view': 'CONTENT_VIEWED_OFFLINE',
      'share': 'CONTENT_SHARED_OFFLINE',
      'like': 'LIKE_ACTION_OFFLINE',
      'comment': 'COMMENT_CREATED_OFFLINE',
      'follow': 'FOLLOW_ACTION_OFFLINE',
      'search': 'SEARCH_PERFORMED_OFFLINE'
    };
    
    return mapping[action] || 'FEATURE_USED_OFFLINE';
  }

  // Get analytics statistics
  getAnalyticsStats() {
    const now = Date.now();
    const sessionDuration = now - this.sessionStartTime;
    
    // Group events by category and priority
    const eventsByCategory = {};
    const eventsByPriority = {};
    
    this.eventQueue.forEach(event => {
      // By category
      const category = event.category || 'unknown';
      eventsByCategory[category] = (eventsByCategory[category] || 0) + 1;
      
      // By priority
      const priority = event.priority || 'medium';
      eventsByPriority[priority] = (eventsByPriority[priority] || 0) + 1;
    });
    
    return {
      sessionId: this.sessionId,
      sessionDuration,
      totalEvents: this.eventQueue.length,
      eventsByCategory,
      eventsByPriority,
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      isOnline: navigator.onLine,
      initialized: this.isInitialized
    };
  }

  // Export analytics data for debugging
  async exportAnalyticsData() {
    try {
      const allEvents = await idbStore.getAll('analytics_events');
      const stats = this.getAnalyticsStats();
      
      return {
        events: allEvents,
        queuedEvents: this.eventQueue,
        statistics: stats,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      throw error;
    }
  }

  // Clear all analytics data
  async clearAnalyticsData() {
    try {
      this.eventQueue = [];
      
      // Clear from IndexedDB
      await idbStore.clear('analytics_events');
      await idbStore.clear('analytics_batches');
      await idbStore.clear('analytics_session');} catch (error) {
      console.error('Failed to clear analytics data:', error);
      throw error;
    }
  }

  // Force immediate sync of all pending events
  async forceSync() {
    if (this.syncInProgress) {return;
    }await this.syncAnalyticsEvents();
  }
}

// Create singleton instance
export const offlineAnalytics = new OfflineAnalyticsTracker();

// Hook for using offline analytics in components
export const useOfflineAnalytics = () => {
  const track = (eventType, data, options) => {
    offlineAnalytics.trackEvent(eventType, data, options);
  };

  const trackPageView = (page, data) => {
    offlineAnalytics.trackPageView(page, data);
  };

  const trackInteraction = (action, target, data) => {
    offlineAnalytics.trackUserInteraction(action, target, data);
  };

  const trackError = (error, context) => {
    offlineAnalytics.trackError(error, context);
  };

  const trackBusiness = (eventType, data) => {
    offlineAnalytics.trackBusinessEvent(eventType, data);
  };

  const getStats = () => {
    return offlineAnalytics.getAnalyticsStats();
  };

  const forceSync = async () => {
    return await offlineAnalytics.forceSync();
  };

  const exportData = async () => {
    return await offlineAnalytics.exportAnalyticsData();
  };

  const clearData = async () => {
    return await offlineAnalytics.clearAnalyticsData();
  };

  return {
    track,
    trackPageView,
    trackInteraction,
    trackError,
    trackBusiness,
    getStats,
    forceSync,
    exportData,
    clearData
  };
};

export default offlineAnalytics;