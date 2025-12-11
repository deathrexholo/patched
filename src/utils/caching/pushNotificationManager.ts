// Push Notification Manager for Sync Status Updates
// Comprehensive push notification system for background sync and offline operations
// Part of Phase 4: Advanced Features implementation

class PushNotificationManager {
  registration: ServiceWorkerRegistration | null;
  isSupported: boolean;
  isPermissionGranted: boolean;
  subscriptionStatus: string;
  notificationQueue: any[];
  maxQueueSize: number;
  notificationTypes: any;
  rateLimits: any;
  lastNotificationTimes: Map<string, number>;

  constructor() {
    this.registration = null;
    this.isSupported = false;
    this.isPermissionGranted = false;
    this.subscriptionStatus = 'unknown';
    this.notificationQueue = [];
    this.maxQueueSize = 20;
    
    // Notification types and their configurations
    this.notificationTypes = {
      SYNC_SUCCESS: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'sync-success',
        renotify: false,
        requireInteraction: false,
        silent: false,
        actions: [
          { action: 'view', title: '👀 View Updates' },
          { action: 'dismiss', title: '❌ Dismiss' }
        ]
      },
      SYNC_FAILED: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'sync-error',
        renotify: true,
        requireInteraction: true,
        silent: false,
        actions: [
          { action: 'retry', title: '🔄 Retry Sync' },
          { action: 'details', title: '📋 View Details' },
          { action: 'dismiss', title: '❌ Dismiss' }
        ]
      },
      BACKGROUND_SYNC_COMPLETE: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'background-sync',
        renotify: false,
        requireInteraction: false,
        silent: true,
        actions: [
          { action: 'view', title: '👀 View Changes' }
        ]
      },
      OFFLINE_CONTENT_READY: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'offline-ready',
        renotify: false,
        requireInteraction: false,
        silent: false,
        actions: [
          { action: 'browse', title: '📱 Browse Offline' }
        ]
      },
      DATA_USAGE_WARNING: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'data-warning',
        renotify: true,
        requireInteraction: true,
        silent: false,
        actions: [
          { action: 'settings', title: '⚙️ Adjust Settings' },
          { action: 'dismiss', title: '❌ Dismiss' }
        ]
      },
      CACHE_CLEANUP_COMPLETE: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'cache-cleanup',
        renotify: false,
        requireInteraction: false,
        silent: true,
        actions: [
          { action: 'view', title: '📊 View Stats' }
        ]
      },
      PREFETCH_COMPLETE: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'prefetch-ready',
        renotify: false,
        requireInteraction: false,
        silent: true,
        actions: [
          { action: 'explore', title: '🔍 Explore Content' }
        ]
      },
      CONFLICT_RESOLVED: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'conflict-resolved',
        renotify: false,
        requireInteraction: true,
        silent: false,
        actions: [
          { action: 'review', title: '👁️ Review Changes' }
        ]
      }
    };
    
    // Notification frequency limits to prevent spam
    this.rateLimits = {
      SYNC_SUCCESS: 5 * 60 * 1000, // 5 minutes
      SYNC_FAILED: 2 * 60 * 1000, // 2 minutes  
      BACKGROUND_SYNC_COMPLETE: 10 * 60 * 1000, // 10 minutes
      OFFLINE_CONTENT_READY: 30 * 60 * 1000, // 30 minutes
      DATA_USAGE_WARNING: 60 * 60 * 1000, // 1 hour
      CACHE_CLEANUP_COMPLETE: 60 * 60 * 1000, // 1 hour
      PREFETCH_COMPLETE: 15 * 60 * 1000, // 15 minutes
      CONFLICT_RESOLVED: 0 // No rate limit for conflicts
    };
    
    this.lastNotificationTimes = new Map();
    
    this.init();
  }

  async init() {
    try {
      // Check for service worker and notification support
      this.checkSupport();
      
      if (!this.isSupported) {
        console.warn('🚫 Push notifications not supported in this browser');
        return;
      }
      
      // Get service worker registration
      await this.getServiceWorkerRegistration();
      
      // Check current permission status
      await this.checkPermissionStatus();
      
      // Setup notification click handlers
      this.setupNotificationHandlers();console.log(`   Support: ${this.isSupported}`);} catch (error) {
      console.error('Failed to initialize push notification manager:', error);
    }
  }

  // Check browser support for notifications and service workers
  checkSupport() {
    this.isSupported = (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  // Get service worker registration
  async getServiceWorkerRegistration() {
    try {
      this.registration = await navigator.serviceWorker.ready;} catch (error) {
      console.error('Failed to get service worker registration:', error);
      this.isSupported = false;
    }
  }

  // Check and update permission status
  async checkPermissionStatus() {
    if (!this.isSupported || typeof Notification === 'undefined') return;

    const permission = Notification.permission;
    this.isPermissionGranted = permission === 'granted';
    this.subscriptionStatus = permission;}

  // Request notification permissions
  async requestPermission() {
    if (!this.isSupported || typeof Notification === 'undefined') {
      throw new Error('Push notifications are not supported in this browser');
    }

    if (Notification.permission === 'granted') {
      this.isPermissionGranted = true;
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      throw new Error('Notification permissions have been denied. Please enable them in browser settings.');
    }

    try {
      const permission = await Notification.requestPermission();
      this.isPermissionGranted = permission === 'granted';
      this.subscriptionStatus = permission;return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      throw error;
    }
  }

  // Show a notification for sync status
  async showSyncNotification(type, details = {}) {
    try {
      if (!this.canShowNotification(type)) {
        return;
      }
      
      const config = this.notificationTypes[type];
      if (!config) {
        console.warn(`Unknown notification type: ${type}`);
        return;
      }
      
      const notificationData = this.createNotificationData(type, details, config);
      
      // Show the notification
      await this.displayNotification(notificationData);
      
      // Update rate limit tracking
      this.updateRateLimit(type);} catch (error) {
      console.error(`Failed to show ${type} notification:`, error);
    }
  }

  // Check if we can show a notification (rate limiting)
  canShowNotification(type) {
    if (!this.isSupported || !this.isPermissionGranted) {
      return false;
    }
    
    // Check rate limits
    const rateLimit = this.rateLimits[type];
    if (rateLimit > 0) {
      const lastTime = this.lastNotificationTimes.get(type) || 0;
      const timeSinceLastNotification = Date.now() - lastTime;
      
      if (timeSinceLastNotification < rateLimit) {return false;
      }
    }
    
    return true;
  }

  // Create notification data based on type and details
  createNotificationData(type, details, config) {
    const { title, body, data } = this.generateNotificationContent(type, details);
    
    return {
      title,
      options: {
        body,
        icon: config.icon,
        badge: config.badge,
        tag: config.tag,
        renotify: config.renotify,
        requireInteraction: config.requireInteraction,
        silent: config.silent,
        actions: config.actions,
        data: {
          type,
          timestamp: Date.now(),
          ...data,
          ...details
        },
        vibrate: config.silent ? [] : [200, 100, 200]
      }
    };
  }

  // Generate notification content based on type
  generateNotificationContent(type, details) {
    switch (type) {
      case 'SYNC_SUCCESS':
        return {
          title: '✅ Sync Complete',
          body: `Successfully synced ${details.itemCount || 'your'} updates`,
          data: { itemCount: details.itemCount }
        };
        
      case 'SYNC_FAILED':
        return {
          title: '❌ Sync Failed',
          body: `Failed to sync ${details.failedCount || 'some'} items. Tap to retry.`,
          data: { failedCount: details.failedCount, error: details.error }
        };
        
      case 'BACKGROUND_SYNC_COMPLETE':
        return {
          title: '🔄 Background Sync Complete',
          body: 'Your content has been updated in the background',
          data: { backgroundSync: true }
        };
        
      case 'OFFLINE_CONTENT_READY':
        return {
          title: '📱 Offline Content Ready',
          body: `${details.contentCount || 'New'} content is ready for offline viewing`,
          data: { contentCount: details.contentCount }
        };
        
      case 'DATA_USAGE_WARNING':
        return {
          title: '⚠️ High Data Usage',
          body: `Cache size: ${details.cacheSize || 'large'}. Consider clearing old data.`,
          data: { cacheSize: details.cacheSize }
        };
        
      case 'CACHE_CLEANUP_COMPLETE':
        return {
          title: '🧹 Cache Cleanup Complete',
          body: `Freed ${details.freedSpace || 'space'} by removing old content`,
          data: { freedSpace: details.freedSpace }
        };
        
      case 'PREFETCH_COMPLETE':
        return {
          title: '🚀 Content Prefetched',
          body: `${details.prefetchedCount || 'New'} items are ready for quick access`,
          data: { prefetchedCount: details.prefetchedCount }
        };
        
      case 'CONFLICT_RESOLVED':
        return {
          title: '⚖️ Conflict Resolved',
          body: `Resolved ${details.conflictCount || 'data'} conflicts automatically`,
          data: { conflictCount: details.conflictCount }
        };
        
      default:
        return {
          title: '📢 AmaPlayer Update',
          body: 'Your content has been updated',
          data: {}
        };
    }
  }

  // Display the notification
  async displayNotification(notificationData) {
    if (this.registration) {
      // Use service worker to show persistent notification
      await this.registration.showNotification(notificationData.title, notificationData.options);
    } else {
      // Fall back to regular notification
      new Notification(notificationData.title, notificationData.options);
    }
  }

  // Update rate limit tracking
  updateRateLimit(type) {
    this.lastNotificationTimes.set(type, Date.now());
  }

  // Setup notification click and action handlers
  setupNotificationHandlers() {
    if (!this.registration) return;
    
    // Handle notification clicks
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        this.handleNotificationClick(event.data);
      }
    });
  }

  // Handle notification click events
  handleNotificationClick(data) {
    const { notificationType, action, notificationData } = data;switch (action) {
      case 'view':
      case 'browse':
      case 'explore':
        this.navigateToContent(notificationType, notificationData);
        break;
        
      case 'retry':
        this.handleRetryAction(notificationData);
        break;
        
      case 'details':
        this.showErrorDetails(notificationData);
        break;
        
      case 'settings':
        this.openSettings();
        break;
        
      case 'review':
        this.reviewChanges(notificationData);
        break;
        
      case 'dismiss':
      default:
        // Just close the notification
        break;
    }
  }

  // Navigate to relevant content based on notification type
  navigateToContent(type, data) {
    let targetPath = '/';
    
    switch (type) {
      case 'SYNC_SUCCESS':
      case 'BACKGROUND_SYNC_COMPLETE':
        targetPath = '/'; // Home page to see updates
        break;
        
      case 'OFFLINE_CONTENT_READY':
      case 'PREFETCH_COMPLETE':
        targetPath = '/'; // Home page with fresh content
        break;
        
      case 'CACHE_CLEANUP_COMPLETE':
        targetPath = '/?demo=phase4'; // Show Phase 4 demo
        break;
        
      default:
        targetPath = '/';
    }
    
    // Focus or open the app window
    this.focusApp(targetPath);
  }

  // Focus the app window or open a new one
  async focusApp(path = '/') {
    if ('clients' in window.self) {
      // This would be in service worker context
      const clients = await (window.self as any).clients.matchAll({ type: 'window' });
      
      for (const client of clients) {
        if (client.url.includes(window.location.origin)) {
          await client.navigate(path);
          return client.focus();
        }
      }
      
      // Open new window if no existing client
      return (window.self as any).clients.openWindow(path);
    } else {
      // In main thread context
      window.location.href = path;
      window.focus();
    }
  }

  // Handle retry action for failed sync
  handleRetryAction(data) {
    // Trigger a manual sync retry
    if ((window as any).offlinePostManager) {
      (window as any).offlinePostManager.attemptImmediateSync();
    }
    
    // Show feedback to user
    this.showSyncNotification('SYNC_SUCCESS', {
      itemCount: 'retrying'
    });
  }

  // Show error details
  showErrorDetails(data) {
    // This would open a detailed error view
    this.focusApp('/?error-details=true');
  }

  // Open app settings
  openSettings() {
    this.focusApp('/?settings=offline');
  }

  // Review changes from conflict resolution
  reviewChanges(data) {
    this.focusApp('/?conflicts=resolved');
  }

  // Convenience methods for different notification types
  notifySyncSuccess(details = {}) {
    return this.showSyncNotification('SYNC_SUCCESS', details);
  }

  notifySyncFailed(details = {}) {
    return this.showSyncNotification('SYNC_FAILED', details);
  }

  notifyBackgroundSyncComplete(details = {}) {
    return this.showSyncNotification('BACKGROUND_SYNC_COMPLETE', details);
  }

  notifyOfflineContentReady(details = {}) {
    return this.showSyncNotification('OFFLINE_CONTENT_READY', details);
  }

  notifyDataUsageWarning(details = {}) {
    return this.showSyncNotification('DATA_USAGE_WARNING', details);
  }

  notifyCacheCleanupComplete(details = {}) {
    return this.showSyncNotification('CACHE_CLEANUP_COMPLETE', details);
  }

  notifyPrefetchComplete(details = {}) {
    return this.showSyncNotification('PREFETCH_COMPLETE', details);
  }

  notifyConflictResolved(details = {}) {
    return this.showSyncNotification('CONFLICT_RESOLVED', details);
  }

  // Test notification (for demo purposes)
  async testNotification() {
    if (!this.isPermissionGranted) {
      await this.requestPermission();
    }
    
    await this.showSyncNotification('SYNC_SUCCESS', {
      itemCount: 5,
      test: true
    });
  }

  // Get notification statistics
  getNotificationStats() {
    const stats = {
      isSupported: this.isSupported,
      isPermissionGranted: this.isPermissionGranted,
      subscriptionStatus: this.subscriptionStatus,
      hasServiceWorker: !!this.registration,
      rateLimits: Object.fromEntries(this.rateLimits),
      lastNotificationTimes: Object.fromEntries(this.lastNotificationTimes),
      queuedNotifications: this.notificationQueue.length
    };
    
    return stats;
  }

  // Clear all notification data
  async clearNotificationData() {
    this.notificationQueue = [];
    this.lastNotificationTimes.clear();
    
    // Clear any pending notifications
    if (this.registration) {
      try {
        const notifications = await this.registration.getNotifications();
        notifications.forEach(notification => notification.close());} catch (error) {
        console.error('Failed to clear notifications:', error);
      }
    }
  }

  // Disable notifications
  async disableNotifications() {
    await this.clearNotificationData();
    this.isPermissionGranted = false;}

  // Enable notifications (request permission if needed)
  async enableNotifications() {
    if (!this.isSupported) {
      throw new Error('Notifications not supported in this browser');
    }
    
    await this.requestPermission();
    
    if (this.isPermissionGranted) {// Test notification to confirm setup
      setTimeout(() => {
        this.testNotification();
      }, 1000);
    }
    
    return this.isPermissionGranted;
  }

  // Schedule a notification (for future features)
  scheduleNotification(type, details, delay) {
    if (delay <= 0) {
      return this.showSyncNotification(type, details);
    }
    
    setTimeout(() => {
      this.showSyncNotification(type, details);
    }, delay);}
}

// Create singleton instance
export const pushNotificationManager = new PushNotificationManager();

// Hook for using push notifications in components
export const usePushNotifications = () => {
  const requestPermission = async () => {
    return await pushNotificationManager.requestPermission();
  };

  const testNotification = async () => {
    return await pushNotificationManager.testNotification();
  };

  const notifySync = {
    success: (details) => pushNotificationManager.notifySyncSuccess(details),
    failed: (details) => pushNotificationManager.notifySyncFailed(details),
    backgroundComplete: (details) => pushNotificationManager.notifyBackgroundSyncComplete(details)
  };

  const notifyContent = {
    ready: (details) => pushNotificationManager.notifyOfflineContentReady(details),
    prefetched: (details) => pushNotificationManager.notifyPrefetchComplete(details)
  };

  const notifyMaintenance = {
    cacheCleanup: (details) => pushNotificationManager.notifyCacheCleanupComplete(details),
    dataWarning: (details) => pushNotificationManager.notifyDataUsageWarning(details),
    conflictResolved: (details) => pushNotificationManager.notifyConflictResolved(details)
  };

  const getStats = () => {
    return pushNotificationManager.getNotificationStats();
  };

  const enable = async () => {
    return await pushNotificationManager.enableNotifications();
  };

  const disable = async () => {
    return await pushNotificationManager.disableNotifications();
  };

  const clearData = async () => {
    return await pushNotificationManager.clearNotificationData();
  };

  return {
    requestPermission,
    testNotification,
    notifySync,
    notifyContent,
    notifyMaintenance,
    getStats,
    enable,
    disable,
    clearData
  };
};

export default pushNotificationManager;