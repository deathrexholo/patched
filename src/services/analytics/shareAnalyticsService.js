/**
 * Share Analytics Service
 * Comprehensive analytics tracking for social sharing functionality
 */

import { db } from '../../lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  serverTimestamp,
  updateDoc,
  increment
} from 'firebase/firestore';
import { SHARE_TYPES, COLLECTIONS } from '../../constants/sharing';

class ShareAnalyticsService {
  constructor() {
    this.analyticsCollection = 'shareAnalytics';
    this.metricsCollection = 'shareMetrics';
  }

  /**
   * Track share event for analytics
   * @param {Object} eventData - Share event data
   */
  async trackShareEvent(eventData) {
    try {
      const analyticsEvent = {
        ...eventData,
        timestamp: serverTimestamp(),
        sessionId: this._generateSessionId(),
        userAgent: navigator.userAgent,
        platform: this._detectPlatform()
      };

      // Store individual event
      const eventRef = await addDoc(collection(db, this.analyticsCollection), analyticsEvent);
      
      // Update aggregated metrics
      await this._updateAggregatedMetrics(eventData);
      
      console.log('📊 Share analytics event tracked:', eventRef.id);
      return eventRef.id;
    } catch (error) {
      console.error('❌ Error tracking share event:', error);
      throw error;
    }
  }

  /**
   * Track share success metrics
   * @param {Object} shareData - Share data
   * @param {Object} result - Share result
   */
  async trackShareSuccess(shareData, result) {
    const eventData = {
      eventType: 'share_success',
      postId: shareData.postId,
      sharerId: shareData.sharerId,
      shareType: shareData.shareType,
      targetCount: shareData.targets?.length || 0,
      hasMessage: Boolean(shareData.message && shareData.message.trim()),
      privacy: shareData.privacy,
      shareId: result.shareId,
      newShareCount: result.newShareCount,
      processingTime: result.processingTime || null,
      metadata: {
        originalAuthorId: shareData.originalAuthorId,
        shareContext: shareData.metadata?.shareContext
      }
    };

    return await this.trackShareEvent(eventData);
  }

  /**
   * Track share failure metrics
   * @param {Object} shareData - Share data
   * @param {Error} error - Error that occurred
   */
  async trackShareFailure(shareData, error) {
    const eventData = {
      eventType: 'share_failure',
      postId: shareData.postId,
      sharerId: shareData.sharerId,
      shareType: shareData.shareType,
      targetCount: shareData.targets?.length || 0,
      hasMessage: Boolean(shareData.message && shareData.message.trim()),
      error: {
        message: error.message,
        code: error.code || 'unknown',
        type: error.constructor.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      metadata: {
        originalAuthorId: shareData.originalAuthorId
      }
    };

    return await this.trackShareEvent(eventData);
  }

  /**
   * Track user interaction with share UI
   * @param {string} userId - User ID
   * @param {string} action - Action taken (button_click, modal_open, etc.)
   * @param {Object} context - Additional context
   */
  async trackShareInteraction(userId, action, context = {}) {
    const eventData = {
      eventType: 'share_interaction',
      userId,
      action,
      postId: context.postId,
      timestamp: serverTimestamp(),
      context: {
        ...context,
        url: window.location.href,
        referrer: document.referrer
      }
    };

    return await this.trackShareEvent(eventData);
  }

  /**
   * Get comprehensive share analytics for a post
   * @param {string} postId - Post ID
   * @param {Object} options - Query options
   */
  async getPostShareAnalytics(postId, options = {}) {
    try {
      const { 
        timeRange = 30, // days
        includeDetails = false 
      } = options;

      // Get share events for the post
      const eventsQuery = query(
        collection(db, this.analyticsCollection),
        where('postId', '==', postId),
        orderBy('timestamp', 'desc'),
        firestoreLimit(500)
      );

      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter by time range if specified
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeRange);
      
      const filteredEvents = events.filter(event => {
        const eventDate = event.timestamp?.toDate?.() || new Date(event.timestamp);
        return eventDate >= cutoffDate;
      });

      // Calculate analytics
      const analytics = {
        postId,
        timeRange,
        totalEvents: filteredEvents.length,
        successfulShares: this._countEventsByType(filteredEvents, 'share_success'),
        failedShares: this._countEventsByType(filteredEvents, 'share_failure'),
        interactions: this._countEventsByType(filteredEvents, 'share_interaction'),
        
        // Success metrics
        successRate: this._calculateSuccessRate(filteredEvents),
        
        // Share breakdown
        shareBreakdown: this._calculateShareBreakdown(filteredEvents),
        
        // Timing analytics
        shareTimeline: this._generateDetailedTimeline(filteredEvents),
        peakTimes: this._findPeakSharingTimes(filteredEvents),
        
        // User behavior
        uniqueSharers: this._countUniqueSharers(filteredEvents),
        repeatSharers: this._findRepeatSharers(filteredEvents),
        averageTargetsPerShare: this._calculateAverageTargets(filteredEvents),
        
        // Engagement metrics
        messageUsageRate: this._calculateMessageUsageRate(filteredEvents),
        shareVelocity: this._calculateShareVelocity(filteredEvents),
        
        // Error analysis
        errorBreakdown: this._analyzeErrors(filteredEvents),
        
        // Platform analytics
        platformBreakdown: this._analyzePlatforms(filteredEvents)
      };

      if (includeDetails) {
        analytics.recentEvents = filteredEvents.slice(0, 20);
        analytics.topSharers = this._getTopSharers(filteredEvents);
      }

      return analytics;
    } catch (error) {
      console.error('❌ Error getting post share analytics:', error);
      throw error;
    }
  }

  /**
   * Get user share analytics
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   */
  async getUserShareAnalytics(userId, options = {}) {
    try {
      const { timeRange = 30 } = options;

      const eventsQuery = query(
        collection(db, this.analyticsCollection),
        where('sharerId', '==', userId),
        orderBy('timestamp', 'desc'),
        firestoreLimit(200)
      );

      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter by time range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeRange);
      
      const filteredEvents = events.filter(event => {
        const eventDate = event.timestamp?.toDate?.() || new Date(event.timestamp);
        return eventDate >= cutoffDate;
      });

      return {
        userId,
        timeRange,
        totalShares: this._countEventsByType(filteredEvents, 'share_success'),
        failedAttempts: this._countEventsByType(filteredEvents, 'share_failure'),
        successRate: this._calculateSuccessRate(filteredEvents),
        shareBreakdown: this._calculateShareBreakdown(filteredEvents),
        averageTargetsPerShare: this._calculateAverageTargets(filteredEvents),
        mostSharedPosts: this._getMostSharedPosts(filteredEvents),
        sharingPattern: this._analyzeUserSharingPattern(filteredEvents)
      };
    } catch (error) {
      console.error('❌ Error getting user share analytics:', error);
      throw error;
    }
  }

  /**
   * Get global share metrics
   * @param {Object} options - Query options
   */
  async getGlobalShareMetrics(options = {}) {
    try {
      const { timeRange = 7 } = options; // Default to last 7 days

      const metricsRef = doc(db, this.metricsCollection, 'global');
      const metricsDoc = await getDoc(metricsRef);
      
      if (!metricsDoc.exists()) {
        return this._getDefaultGlobalMetrics();
      }

      const metrics = metricsDoc.data();
      
      // Get recent events for trend analysis
      const recentEventsQuery = query(
        collection(db, this.analyticsCollection),
        orderBy('timestamp', 'desc'),
        firestoreLimit(1000)
      );

      const eventsSnapshot = await getDocs(recentEventsQuery);
      const recentEvents = eventsSnapshot.docs.map(doc => doc.data());

      return {
        ...metrics,
        trends: this._calculateTrends(recentEvents, timeRange),
        lastUpdated: metrics.lastUpdated?.toDate?.() || new Date()
      };
    } catch (error) {
      console.error('❌ Error getting global share metrics:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Update aggregated metrics
   */
  async _updateAggregatedMetrics(eventData) {
    try {
      const metricsRef = doc(db, this.metricsCollection, 'global');
      
      const updates = {
        lastUpdated: serverTimestamp()
      };

      if (eventData.eventType === 'share_success') {
        updates.totalShares = increment(1);
        updates[`sharesByType.${eventData.shareType}`] = increment(1);
        
        if (eventData.hasMessage) {
          updates.sharesWithMessages = increment(1);
        }
      } else if (eventData.eventType === 'share_failure') {
        updates.totalFailures = increment(1);
        updates[`failuresByType.${eventData.shareType}`] = increment(1);
      }

      await updateDoc(metricsRef, updates);
    } catch (error) {
      console.error('❌ Error updating aggregated metrics:', error);
    }
  }

  /**
   * Generate session ID for tracking
   */
  _generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Detect user platform
   */
  _detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      return 'mobile';
    } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Count events by type
   */
  _countEventsByType(events, eventType) {
    return events.filter(event => event.eventType === eventType).length;
  }

  /**
   * Calculate success rate
   */
  _calculateSuccessRate(events) {
    const successEvents = this._countEventsByType(events, 'share_success');
    const failureEvents = this._countEventsByType(events, 'share_failure');
    const totalAttempts = successEvents + failureEvents;
    
    return totalAttempts > 0 ? Math.round((successEvents / totalAttempts) * 100) : 100;
  }

  /**
   * Calculate share breakdown by type
   */
  _calculateShareBreakdown(events) {
    const successEvents = events.filter(event => event.eventType === 'share_success');
    
    const breakdown = {
      [SHARE_TYPES.FRIENDS]: 0,
      [SHARE_TYPES.FEED]: 0,
      [SHARE_TYPES.GROUPS]: 0
    };

    successEvents.forEach(event => {
      if (breakdown[event.shareType] !== undefined) {
        breakdown[event.shareType]++;
      }
    });

    return breakdown;
  }

  /**
   * Generate detailed timeline
   */
  _generateDetailedTimeline(events) {
    const timeline = {};
    
    events.forEach(event => {
      const date = event.timestamp?.toDate?.() || new Date(event.timestamp);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!timeline[dateKey]) {
        timeline[dateKey] = {
          date: dateKey,
          shares: 0,
          failures: 0,
          interactions: 0
        };
      }
      
      if (event.eventType === 'share_success') {
        timeline[dateKey].shares++;
      } else if (event.eventType === 'share_failure') {
        timeline[dateKey].failures++;
      } else if (event.eventType === 'share_interaction') {
        timeline[dateKey].interactions++;
      }
    });
    
    return Object.values(timeline).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Find peak sharing times
   */
  _findPeakSharingTimes(events) {
    const shareEvents = events.filter(event => event.eventType === 'share_success');
    const hourCounts = {};
    
    shareEvents.forEach(event => {
      const date = event.timestamp?.toDate?.() || new Date(event.timestamp);
      const hour = date.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const sortedHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    return sortedHours.map(([hour, count]) => ({
      hour: parseInt(hour),
      count,
      percentage: shareEvents.length > 0 ? Math.round((count / shareEvents.length) * 100) : 0
    }));
  }

  /**
   * Count unique sharers
   */
  _countUniqueSharers(events) {
    const shareEvents = events.filter(event => event.eventType === 'share_success');
    return new Set(shareEvents.map(event => event.sharerId)).size;
  }

  /**
   * Find repeat sharers
   */
  _findRepeatSharers(events) {
    const shareEvents = events.filter(event => event.eventType === 'share_success');
    const sharerCounts = {};
    
    shareEvents.forEach(event => {
      sharerCounts[event.sharerId] = (sharerCounts[event.sharerId] || 0) + 1;
    });
    
    return Object.entries(sharerCounts)
      .filter(([, count]) => count > 1)
      .length;
  }

  /**
   * Calculate average targets per share
   */
  _calculateAverageTargets(events) {
    const shareEvents = events.filter(event => event.eventType === 'share_success');
    
    if (shareEvents.length === 0) return 0;
    
    const totalTargets = shareEvents.reduce((sum, event) => sum + (event.targetCount || 0), 0);
    return Math.round((totalTargets / shareEvents.length) * 10) / 10;
  }

  /**
   * Calculate message usage rate
   */
  _calculateMessageUsageRate(events) {
    const shareEvents = events.filter(event => event.eventType === 'share_success');
    
    if (shareEvents.length === 0) return 0;
    
    const sharesWithMessages = shareEvents.filter(event => event.hasMessage).length;
    return Math.round((sharesWithMessages / shareEvents.length) * 100);
  }

  /**
   * Calculate share velocity
   */
  _calculateShareVelocity(events) {
    const shareEvents = events.filter(event => event.eventType === 'share_success');
    
    if (shareEvents.length < 2) return 0;
    
    const sortedEvents = shareEvents.sort((a, b) => {
      const dateA = a.timestamp?.toDate?.() || new Date(a.timestamp);
      const dateB = b.timestamp?.toDate?.() || new Date(b.timestamp);
      return dateB - dateA;
    });
    
    const firstEvent = sortedEvents[sortedEvents.length - 1];
    const lastEvent = sortedEvents[0];
    
    const firstDate = firstEvent.timestamp?.toDate?.() || new Date(firstEvent.timestamp);
    const lastDate = lastEvent.timestamp?.toDate?.() || new Date(lastEvent.timestamp);
    
    const hoursDiff = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60));
    
    return Math.round((shareEvents.length / hoursDiff) * 10) / 10;
  }

  /**
   * Analyze errors
   */
  _analyzeErrors(events) {
    const errorEvents = events.filter(event => event.eventType === 'share_failure');
    const errorTypes = {};
    
    errorEvents.forEach(event => {
      const errorType = event.error?.type || 'Unknown';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });
    
    return errorTypes;
  }

  /**
   * Analyze platforms
   */
  _analyzePlatforms(events) {
    const platforms = {};
    
    events.forEach(event => {
      const platform = event.platform || 'unknown';
      platforms[platform] = (platforms[platform] || 0) + 1;
    });
    
    return platforms;
  }

  /**
   * Get top sharers
   */
  _getTopSharers(events) {
    const shareEvents = events.filter(event => event.eventType === 'share_success');
    const sharerCounts = {};
    
    shareEvents.forEach(event => {
      sharerCounts[event.sharerId] = (sharerCounts[event.sharerId] || 0) + 1;
    });
    
    return Object.entries(sharerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([sharerId, count]) => ({ sharerId, count }));
  }

  /**
   * Get most shared posts for a user
   */
  _getMostSharedPosts(events) {
    const shareEvents = events.filter(event => event.eventType === 'share_success');
    const postCounts = {};
    
    shareEvents.forEach(event => {
      postCounts[event.postId] = (postCounts[event.postId] || 0) + 1;
    });
    
    return Object.entries(postCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([postId, count]) => ({ postId, count }));
  }

  /**
   * Analyze user sharing pattern
   */
  _analyzeUserSharingPattern(events) {
    const shareEvents = events.filter(event => event.eventType === 'share_success');
    
    if (shareEvents.length === 0) {
      return { pattern: 'inactive', description: 'No sharing activity' };
    }
    
    const avgTargets = this._calculateAverageTargets(events);
    const messageRate = this._calculateMessageUsageRate(events);
    const shareTypes = this._calculateShareBreakdown(events);
    
    // Determine sharing pattern
    let pattern = 'casual';
    let description = 'Casual sharer';
    
    if (shareEvents.length > 20) {
      pattern = 'active';
      description = 'Active sharer';
    }
    
    if (messageRate > 70) {
      pattern = 'engaged';
      description = 'Highly engaged sharer with frequent messages';
    }
    
    if (avgTargets > 5) {
      pattern = 'broadcaster';
      description = 'Broadcasts to many recipients';
    }
    
    return {
      pattern,
      description,
      metrics: {
        averageTargets: avgTargets,
        messageRate,
        preferredType: Object.entries(shareTypes)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none'
      }
    };
  }

  /**
   * Calculate trends
   */
  _calculateTrends(events, timeRange) {
    // Implementation for trend calculation
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange);
    
    const recentEvents = events.filter(event => {
      const eventDate = event.timestamp?.toDate?.() || new Date(event.timestamp);
      return eventDate >= cutoffDate;
    });
    
    return {
      totalShares: this._countEventsByType(recentEvents, 'share_success'),
      totalFailures: this._countEventsByType(recentEvents, 'share_failure'),
      successRate: this._calculateSuccessRate(recentEvents),
      shareBreakdown: this._calculateShareBreakdown(recentEvents)
    };
  }

  /**
   * Get default global metrics
   */
  _getDefaultGlobalMetrics() {
    return {
      totalShares: 0,
      totalFailures: 0,
      sharesByType: {
        [SHARE_TYPES.FRIENDS]: 0,
        [SHARE_TYPES.FEED]: 0,
        [SHARE_TYPES.GROUPS]: 0
      },
      failuresByType: {
        [SHARE_TYPES.FRIENDS]: 0,
        [SHARE_TYPES.FEED]: 0,
        [SHARE_TYPES.GROUPS]: 0
      },
      sharesWithMessages: 0,
      lastUpdated: new Date()
    };
  }
}

export default new ShareAnalyticsService();