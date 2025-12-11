// Share service for social sharing functionality
import { BaseService } from './baseService';
import { COLLECTIONS, SHARE_TYPES, PRIVACY_LEVELS, ERROR_MESSAGES, RATE_LIMITS } from '../../constants/sharing';
import { db } from '../../lib/firebase';
import notificationService from '../notificationService';
import shareAnalyticsService from '../analytics/shareAnalyticsService';
import sharePermissionService from '../validation/sharePermissionService';
import shareRateLimitService from '../validation/shareRateLimitService';
import shareServerValidation from '../validation/shareServerValidation';
import shareErrorLogger from '../logging/shareErrorLogger';
import { shareCountCache, shareAnalyticsCache } from '../cache/shareCacheService';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  arrayUnion, 
  arrayRemove,
  serverTimestamp,
  runTransaction,
  collection,
  query,
  where,
  getDocs,
  limit as firestoreLimit,
  addDoc
} from 'firebase/firestore';

class ShareService extends BaseService {
  constructor() {
    super(COLLECTIONS.SHARES);
    this.rateLimitCache = new Map();
  }

  /**
   * Share a post to friends
   * @param {string} postId - ID of the post to share
   * @param {string} sharerId - ID of the user sharing
   * @param {string[]} friendIds - Array of friend IDs to share with
   * @param {string} message - Optional message from sharer
   * @param {Object} sharerInfo - Sharer's user information
   * @returns {Promise<Object>} Share result
   */
  async shareToFriends(postId, sharerId, friendIds, message = '', sharerInfo = {}) {
    try {
      // Validate inputs
      this._validateShareInputs(postId, sharerId, friendIds);

      // Server-side validation
      const validationData = {
        postId,
        sharerId,
        shareType: SHARE_TYPES.FRIENDS,
        targets: friendIds,
        message,
        privacy: PRIVACY_LEVELS.FRIENDS
      };

      const validation = await shareServerValidation.validateShareOperation(validationData, sharerId);
      if (!validation.isValid) {
        const validationError = new Error(validation.errors.join(', '));
        await shareErrorLogger.logShareError(validationError, {
          operation: 'shareToFriends',
          ...validationData,
          validationErrors: validation.errors
        }, 'warning');
        throw validationError;
      }

      // Log validation warnings if any
      if (validation.warnings.length > 0) {
        console.warn('Share validation warnings:', validation.warnings);
      }
      
      // Check rate limiting and spam prevention
      const rateLimitCheck = await shareRateLimitService.checkRateLimit(sharerId, 'share_to_friends', {
        postId,
        targets: friendIds,
        message
      });
      
      if (!rateLimitCheck.allowed) {
        throw new Error(rateLimitCheck.reason);
      }
      
      // Validate post sharing permissions
      const permissionCheck = await sharePermissionService.validatePostSharingPermissions(postId, sharerId);
      if (!permissionCheck.canShare) {
        throw new Error(permissionCheck.reason);
      }
      
      if (!permissionCheck.allowedTargets.includes('friends')) {
        throw new Error('Sharing to friends is not allowed for this post');
      }
      
      const post = permissionCheck.post;
      
      // Validate friend relationships
      const friendValidation = await sharePermissionService.validateFriendRelationships(sharerId, friendIds);
      
      if (friendValidation.validFriends.length === 0) {
        throw new Error(ERROR_MESSAGES.INVALID_TARGET);
      }
      
      // Filter and validate message content
      const messageValidation = await sharePermissionService.filterShareMessage(message);
      if (messageValidation.hasViolations) {
        console.warn('⚠️ Share message had violations:', messageValidation.violations);
      }

      // Create share record
      const shareData = {
        postId,
        originalAuthorId: post.userId,
        sharerId,
        shareType: SHARE_TYPES.FRIENDS,
        targets: friendValidation.validFriends,
        message: messageValidation.filteredMessage,
        privacy: PRIVACY_LEVELS.FRIENDS,
        timestamp: serverTimestamp(),
        metadata: {
          originalPostData: this._createPostSnapshot(post),
          shareContext: 'direct_share_to_friends',
          validationResults: {
            messageViolations: messageValidation.violations,
            invalidFriends: friendValidation.invalidFriends
          }
        }
      };

      // Execute share transaction
      const result = await this._executeShareTransaction(shareData, post);
      
      // Record the share action for rate limiting
      await shareRateLimitService.recordShareAction(sharerId, 'share_to_friends', {
        postId,
        targets: friendValidation.validFriends,
        message: messageValidation.filteredMessage
      });
      
      // Send notifications
      await this._sendShareNotifications(shareData, post, sharerInfo, { friendIds: friendValidation.validFriends });
      
      // Track analytics
      await this._trackShareAnalytics(shareData, result, { 
        friendIds: friendValidation.validFriends,
        validationResults: shareData.metadata.validationResults
      });
      
      console.log('✅ Post shared to friends successfully:', result.shareId);
      return {
        success: true,
        shareId: result.shareId,
        shareType: SHARE_TYPES.FRIENDS,
        targets: friendValidation.validFriends,
        newShareCount: result.newShareCount,
        validationWarnings: messageValidation.violations.length > 0 ? messageValidation.violations : undefined
      };

    } catch (error) {
      console.error('❌ Error sharing to friends:', error);
      
      // Log error with comprehensive context
      await shareErrorLogger.logShareError(error, {
        operation: 'shareToFriends',
        postId,
        sharerId,
        shareType: SHARE_TYPES.FRIENDS,
        targets: friendIds,
        message
      }, 'error');
      
      // Track failure analytics
      await this._trackShareFailure({
        postId,
        sharerId,
        shareType: SHARE_TYPES.FRIENDS,
        targets: friendIds
      }, error);
      
      // Provide graceful degradation
      const errorMessage = this._getGracefulErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Share a post to user's feed
   * @param {string} postId - ID of the post to share
   * @param {string} sharerId - ID of the user sharing
   * @param {string} message - Optional message from sharer
   * @param {string} privacy - Privacy level for the shared post
   * @param {Object} sharerInfo - Sharer's user information
   * @returns {Promise<Object>} Share result
   */
  async shareToFeed(postId, sharerId, message = '', privacy = PRIVACY_LEVELS.PUBLIC, sharerInfo = {}) {
    try {
      // Validate inputs
      this._validateShareInputs(postId, sharerId, ['feed']);

      // Server-side validation
      const validationData = {
        postId,
        sharerId,
        shareType: SHARE_TYPES.FEED,
        targets: ['feed'],
        message,
        privacy
      };

      const validation = await shareServerValidation.validateShareOperation(validationData, sharerId);
      if (!validation.isValid) {
        const validationError = new Error(validation.errors.join(', '));
        await shareErrorLogger.logShareError(validationError, {
          operation: 'shareToFeed',
          ...validationData,
          validationErrors: validation.errors
        }, 'warning');
        throw validationError;
      }

      if (validation.warnings.length > 0) {
        console.warn('Share validation warnings:', validation.warnings);
      }
      
      // Check rate limiting and spam prevention
      const rateLimitCheck = await shareRateLimitService.checkRateLimit(sharerId, 'share_to_feed', {
        postId,
        targets: ['feed'],
        message
      });
      
      if (!rateLimitCheck.allowed) {
        throw new Error(rateLimitCheck.reason);
      }
      
      // Validate post sharing permissions
      const permissionCheck = await sharePermissionService.validatePostSharingPermissions(postId, sharerId);
      if (!permissionCheck.canShare) {
        throw new Error(permissionCheck.reason);
      }
      
      if (!permissionCheck.allowedTargets.includes('feed')) {
        throw new Error('Sharing to feed is not allowed for this post');
      }
      
      const post = permissionCheck.post;
      
      // Validate privacy level
      if (!Object.values(PRIVACY_LEVELS).includes(privacy)) {
        privacy = PRIVACY_LEVELS.PUBLIC;
      }
      
      // Filter and validate message content
      const messageValidation = await sharePermissionService.filterShareMessage(message);
      if (messageValidation.hasViolations) {
        console.warn('⚠️ Share message had violations:', messageValidation.violations);
      }

      // Create share record
      const shareData = {
        postId,
        originalAuthorId: post.userId,
        sharerId,
        shareType: SHARE_TYPES.FEED,
        targets: ['feed'],
        message: messageValidation.filteredMessage,
        privacy,
        timestamp: serverTimestamp(),
        metadata: {
          originalPostData: this._createPostSnapshot(post),
          shareContext: 'share_to_personal_feed',
          validationResults: {
            messageViolations: messageValidation.violations
          }
        }
      };

      // Execute share transaction
      const result = await this._executeShareTransaction(shareData, post);
      
      // Record the share action for rate limiting
      await shareRateLimitService.recordShareAction(sharerId, 'share_to_feed', {
        postId,
        targets: ['feed'],
        message: messageValidation.filteredMessage
      });
      
      // Send notifications
      await this._sendShareNotifications(shareData, post, sharerInfo);
      
      // Track analytics
      await this._trackShareAnalytics(shareData, result, { 
        privacy,
        validationResults: shareData.metadata.validationResults
      });
      
      console.log('✅ Post shared to feed successfully:', result.shareId);
      return {
        success: true,
        shareId: result.shareId,
        shareType: SHARE_TYPES.FEED,
        targets: ['feed'],
        newShareCount: result.newShareCount,
        privacy,
        validationWarnings: messageValidation.violations.length > 0 ? messageValidation.violations : undefined
      };

    } catch (error) {
      console.error('❌ Error sharing to feed:', error);
      
      // Log error with comprehensive context
      await shareErrorLogger.logShareError(error, {
        operation: 'shareToFeed',
        postId,
        sharerId,
        shareType: SHARE_TYPES.FEED,
        targets: ['feed'],
        message,
        privacy
      }, 'error');
      
      // Track failure analytics
      await this._trackShareFailure({
        postId,
        sharerId,
        shareType: SHARE_TYPES.FEED,
        targets: ['feed']
      }, error);
      
      const errorMessage = this._getGracefulErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Share a post to groups
   * @param {string} postId - ID of the post to share
   * @param {string} sharerId - ID of the user sharing
   * @param {string[]} groupIds - Array of group IDs to share with
   * @param {string} message - Optional context message
   * @param {Object} sharerInfo - Sharer's user information
   * @returns {Promise<Object>} Share result
   */
  async shareToGroups(postId, sharerId, groupIds, message = '', sharerInfo = {}) {
    try {
      // Validate inputs
      this._validateShareInputs(postId, sharerId, groupIds);

      // Server-side validation
      const validationData = {
        postId,
        sharerId,
        shareType: SHARE_TYPES.GROUPS,
        targets: groupIds,
        message,
        privacy: PRIVACY_LEVELS.PUBLIC
      };

      const validation = await shareServerValidation.validateShareOperation(validationData, sharerId);
      if (!validation.isValid) {
        const validationError = new Error(validation.errors.join(', '));
        await shareErrorLogger.logShareError(validationError, {
          operation: 'shareToGroups',
          ...validationData,
          validationErrors: validation.errors
        }, 'warning');
        throw validationError;
      }

      if (validation.warnings.length > 0) {
        console.warn('Share validation warnings:', validation.warnings);
      }
      
      // Check rate limiting and spam prevention
      const rateLimitCheck = await shareRateLimitService.checkRateLimit(sharerId, 'share_to_groups', {
        postId,
        targets: groupIds,
        message
      });
      
      if (!rateLimitCheck.allowed) {
        throw new Error(rateLimitCheck.reason);
      }
      
      // Validate post sharing permissions
      const permissionCheck = await sharePermissionService.validatePostSharingPermissions(postId, sharerId);
      if (!permissionCheck.canShare) {
        throw new Error(permissionCheck.reason);
      }
      
      if (!permissionCheck.allowedTargets.includes('groups')) {
        throw new Error('Sharing to groups is not allowed for this post');
      }
      
      const post = permissionCheck.post;
      
      // Validate group memberships and permissions
      const groupValidation = await sharePermissionService.validateGroupPermissions(sharerId, groupIds);
      
      if (groupValidation.validGroups.length === 0) {
        throw new Error(ERROR_MESSAGES.INVALID_TARGET);
      }
      
      // Filter and validate message content
      const messageValidation = await sharePermissionService.filterShareMessage(message);
      if (messageValidation.hasViolations) {
        console.warn('⚠️ Share message had violations:', messageValidation.violations);
      }

      // Create share record
      const shareData = {
        postId,
        originalAuthorId: post.userId,
        sharerId,
        shareType: SHARE_TYPES.GROUPS,
        targets: groupValidation.validGroups,
        message: messageValidation.filteredMessage,
        privacy: PRIVACY_LEVELS.PUBLIC, // Groups are typically public within the group
        timestamp: serverTimestamp(),
        metadata: {
          originalPostData: this._createPostSnapshot(post),
          shareContext: 'share_to_groups',
          validationResults: {
            messageViolations: messageValidation.violations,
            invalidGroups: groupValidation.invalidGroups,
            groupPermissions: groupValidation.groupPermissions
          }
        }
      };

      // Execute share transaction
      const result = await this._executeShareTransaction(shareData, post);
      
      // Record the share action for rate limiting
      await shareRateLimitService.recordShareAction(sharerId, 'share_to_groups', {
        postId,
        targets: groupValidation.validGroups,
        message: messageValidation.filteredMessage
      });
      
      // Send notifications
      await this._sendShareNotifications(shareData, post, sharerInfo, { groupIds: groupValidation.validGroups });
      
      // Track analytics
      await this._trackShareAnalytics(shareData, result, { 
        groupIds: groupValidation.validGroups,
        validationResults: shareData.metadata.validationResults
      });
      
      console.log('✅ Post shared to groups successfully:', result.shareId);
      return {
        success: true,
        shareId: result.shareId,
        shareType: SHARE_TYPES.GROUPS,
        targets: groupValidation.validGroups,
        newShareCount: result.newShareCount,
        validationWarnings: messageValidation.violations.length > 0 ? messageValidation.violations : undefined
      };

    } catch (error) {
      console.error('❌ Error sharing to groups:', error);
      
      // Log error with comprehensive context
      await shareErrorLogger.logShareError(error, {
        operation: 'shareToGroups',
        postId,
        sharerId,
        shareType: SHARE_TYPES.GROUPS,
        targets: groupIds,
        message
      }, 'error');
      
      // Track failure analytics
      await this._trackShareFailure({
        postId,
        sharerId,
        shareType: SHARE_TYPES.GROUPS,
        targets: groupIds
      }, error);
      
      const errorMessage = this._getGracefulErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get share analytics for a post
   * @param {string} postId - Post ID
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Share analytics data
   */
  async getShareAnalytics(postId, options = {}) {
    try {
      // Check cache first
      const cached = shareAnalyticsCache.get(postId);
      if (cached && !options.skipCache) {
        console.log('📦 Using cached analytics for post:', postId);
        return cached;
      }

      // Use the dedicated analytics service for comprehensive analytics
      const analyticsData = await shareAnalyticsService.getPostShareAnalytics(postId, options);
      
      // Also get basic share records for backward compatibility
      const filters = [
        { field: 'postId', operator: '==', value: postId }
      ];
      
      const shares = await this.getAll(filters, 'timestamp', 'desc', 100);
      
      // Combine analytics service data with basic share data
      const result = {
        ...analyticsData,
        // Legacy fields for backward compatibility
        recentShares: shares.slice(0, 10),
        topSharers: this._getTopSharers(shares)
      };

      // Cache the result
      shareAnalyticsCache.set(postId, result);
      
      return result;
    } catch (error) {
      console.error('❌ Error getting share analytics:', error);
      throw error;
    }
  }

  /**
   * Get user's share history and analytics
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} User share history and statistics
   */
  async getUserShareHistory(userId, options = {}) {
    try {
      const { limit = 50, includeAnalytics = true, skipCache = false } = options;
      
      // Check cache first for analytics
      if (includeAnalytics && !skipCache) {
        const cachedAnalytics = shareAnalyticsCache.getUserAnalytics(userId);
        if (cachedAnalytics) {
          console.log('📦 Using cached user analytics for:', userId);
          return cachedAnalytics;
        }
      }

      // Get basic user data
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const shareHistory = userData.shareHistory || [];
      const shareStats = userData.shareStats || {
        totalShares: 0,
        sharesByType: {
          [SHARE_TYPES.FRIENDS]: 0,
          [SHARE_TYPES.FEED]: 0,
          [SHARE_TYPES.GROUPS]: 0
        },
        lastSharedAt: null
      };

      const result = {
        history: shareHistory.slice(0, limit),
        statistics: shareStats,
        totalRecords: shareHistory.length
      };

      // Include comprehensive analytics if requested
      if (includeAnalytics) {
        try {
          const analyticsData = await shareAnalyticsService.getUserShareAnalytics(userId, options);
          result.analytics = analyticsData;
        } catch (analyticsError) {
          console.warn('⚠️ Could not load user analytics:', analyticsError);
          result.analytics = null;
        }
      }

      // Cache the result if analytics were included
      if (includeAnalytics) {
        shareAnalyticsCache.setUserAnalytics(userId, result);
      }

      return result;
    } catch (error) {
      console.error('❌ Error getting user share history:', error);
      throw error;
    }
  }

  /**
   * Get global share metrics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Global share metrics
   */
  async getGlobalShareMetrics(options = {}) {
    try {
      return await shareAnalyticsService.getGlobalShareMetrics(options);
    } catch (error) {
      console.error('❌ Error getting global share metrics:', error);
      throw error;
    }
  }

  /**
   * Track share interaction (button clicks, modal opens, etc.)
   * @param {string} userId - User ID
   * @param {string} action - Action taken
   * @param {Object} context - Additional context
   */
  async trackShareInteraction(userId, action, context = {}) {
    try {
      await shareAnalyticsService.trackShareInteraction(userId, action, context);
    } catch (error) {
      console.error('❌ Error tracking share interaction:', error);
      // Don't throw error to avoid breaking UI
    }
  }



  // Private helper methods

  /**
   * Validate share inputs
   */
  _validateShareInputs(postId, sharerId, targets) {
    if (!postId || typeof postId !== 'string') {
      throw new Error('Invalid post ID');
    }
    
    if (!sharerId || typeof sharerId !== 'string') {
      throw new Error('Invalid sharer ID');
    }
    
    if (!Array.isArray(targets) || targets.length === 0) {
      throw new Error('Invalid targets');
    }
  }

  /**
   * Get user's rate limit status
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @returns {Promise<Object>} Rate limit status
   */
  async getRateLimitStatus(userId, action = 'share') {
    try {
      return await shareRateLimitService.getUserRateLimitStatus(userId, action);
    } catch (error) {
      console.error('❌ Error getting rate limit status:', error);
      return null;
    }
  }

  /**
   * Validate share permissions for a post
   * @param {string} postId - Post ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Permission check result
   */
  async validateSharePermissions(postId, userId) {
    try {
      return await sharePermissionService.validatePostSharingPermissions(postId, userId);
    } catch (error) {
      console.error('❌ Error validating share permissions:', error);
      return {
        canShare: false,
        reason: 'Error checking permissions',
        allowedTargets: []
      };
    }
  }

  /**
   * Reset user's rate limits (admin function)
   * @param {string} userId - User ID
   * @param {string} action - Optional specific action to reset
   * @returns {Promise<boolean>} Success status
   */
  async resetUserRateLimits(userId, action = null) {
    try {
      return await shareRateLimitService.resetUserRateLimits(userId, action);
    } catch (error) {
      console.error('❌ Error resetting rate limits:', error);
      return false;
    }
  }

  /**
   * Generate spam detection report for a message
   * @param {string} userId - User ID
   * @param {string} message - Message to analyze
   * @param {Object} context - Additional context
   * @returns {Object} Spam detection report
   */
  generateSpamReport(userId, message, context = {}) {
    try {
      return shareRateLimitService.generateSpamReport(userId, message, context);
    } catch (error) {
      console.error('❌ Error generating spam report:', error);
      return null;
    }
  }

  /**
   * Get spam detection statistics
   * @param {string} timeframe - Timeframe for statistics
   * @returns {Object} Spam detection statistics
   */
  getSpamDetectionStats(timeframe = 'day') {
    try {
      return shareRateLimitService.getSpamDetectionStats(timeframe);
    } catch (error) {
      console.error('❌ Error getting spam detection stats:', error);
      return null;
    }
  }

  /**
   * Update spam detection patterns (admin function)
   * @param {string[]} newKeywords - New spam keywords
   * @param {RegExp[]} newPatterns - New suspicious patterns
   * @returns {boolean} Success status
   */
  updateSpamDetectionPatterns(newKeywords = [], newPatterns = []) {
    try {
      return shareRateLimitService.updateSpamDetectionPatterns(newKeywords, newPatterns);
    } catch (error) {
      console.error('❌ Error updating spam detection patterns:', error);
      return false;
    }
  }

  /**
   * Create snapshot of post data for share record
   */
  _createPostSnapshot(post) {
    return {
      userId: post.userId,
      userDisplayName: post.userDisplayName,
      userPhotoURL: post.userPhotoURL,
      caption: post.caption,
      mediaUrl: post.mediaUrl,
      mediaType: post.mediaType,
      timestamp: post.timestamp
    };
  }

  /**
   * Execute share transaction to update post and create share record
   */
  async _executeShareTransaction(shareData, post) {
    const result = await runTransaction(db, async (transaction) => {
      // Create share record
      const shareRef = doc(collection(db, COLLECTIONS.SHARES));
      transaction.set(shareRef, shareData);
      
      // Update post share count and shares array
      const postRef = doc(db, COLLECTIONS.POSTS, shareData.postId);
      transaction.update(postRef, {
        shareCount: increment(1),
        shares: arrayUnion(shareData.sharerId),
        lastSharedAt: serverTimestamp()
      });

      const newShareCount = (post.shareCount || 0) + 1;
      
      return {
        shareId: shareRef.id,
        newShareCount
      };
    });

    // Update cache optimistically after successful transaction
    shareCountCache.set(shareData.postId, result.newShareCount);
    
    // Invalidate analytics cache to force refresh
    shareAnalyticsCache.invalidate(shareData.postId);
    shareAnalyticsCache.invalidateUserAnalytics(shareData.sharerId);

    return result;
  }

  /**
   * Get top sharers from shares array
   */
  _getTopSharers(shares) {
    const sharerCounts = {};
    
    shares.forEach(share => {
      sharerCounts[share.sharerId] = (sharerCounts[share.sharerId] || 0) + 1;
    });
    
    return Object.entries(sharerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([sharerId, count]) => ({ sharerId, count }));
  }

  /**
   * Generate share timeline for analytics
   */
  _generateShareTimeline(shares) {
    const timeline = {};
    
    shares.forEach(share => {
      const date = share.timestamp?.toDate?.() || new Date(share.timestamp);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!timeline[dateKey]) {
        timeline[dateKey] = {
          date: dateKey,
          [SHARE_TYPES.FRIENDS]: 0,
          [SHARE_TYPES.FEED]: 0,
          [SHARE_TYPES.GROUPS]: 0,
          total: 0
        };
      }
      
      timeline[dateKey][share.shareType]++;
      timeline[dateKey].total++;
    });
    
    return Object.values(timeline).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Send share notifications based on share type
   */
  async _sendShareNotifications(shareData, post, sharerInfo, additionalData = {}) {
    try {
      // Prepare notification data
      const notificationData = {
        sharerId: shareData.sharerId,
        sharerName: sharerInfo.displayName || sharerInfo.name || 'Someone',
        sharerPhotoURL: sharerInfo.photoURL || '',
        shareType: shareData.shareType,
        targets: shareData.targets,
        message: shareData.message || '',
        postId: shareData.postId,
        originalAuthorId: shareData.originalAuthorId
      };

      // Prepare additional data for group notifications
      let groupsData = {};
      if (shareData.shareType === SHARE_TYPES.GROUPS && additionalData.groupIds) {
        // Fetch group data for notifications
        for (const groupId of additionalData.groupIds) {
          try {
            const groupRef = doc(db, COLLECTIONS.GROUPS, groupId);
            const groupSnap = await getDoc(groupRef);
            if (groupSnap.exists()) {
              groupsData[groupId] = groupSnap.data();
            }
          } catch (error) {
            console.warn(`⚠️ Could not fetch group data for notifications: ${groupId}`, error);
          }
        }
      }

      // Send notifications using notification service
      await notificationService.sendShareNotifications(
        notificationData,
        post,
        { groupsData }
      );

    } catch (error) {
      console.error('❌ Error sending share notifications:', error);
      // Don't throw error to avoid breaking the share process
    }
  }

  /**
   * Track share analytics event
   */
  async _trackShareAnalytics(shareData, result, additionalData = {}) {
    try {
      const startTime = Date.now();
      
      // Track success with the analytics service
      await shareAnalyticsService.trackShareSuccess(shareData, {
        ...result,
        processingTime: Date.now() - startTime
      });

      // Update user share history (keep existing functionality)
      await this._updateUserShareHistory(shareData.sharerId, {
        shareId: result.shareId,
        postId: shareData.postId,
        shareType: shareData.shareType,
        targetCount: shareData.targets.length,
        timestamp: serverTimestamp()
      });

      console.log('📊 Share analytics tracked successfully');
    } catch (error) {
      console.error('❌ Error tracking share analytics:', error);
      // Don't throw error to avoid breaking the share process
    }
  }



  /**
   * Update user's share history
   */
  async _updateUserShareHistory(userId, analyticsEvent) {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const shareHistory = userData.shareHistory || [];
        
        // Add new share event to history (keep last 100 events)
        const updatedHistory = [
          {
            shareId: analyticsEvent.shareId,
            postId: analyticsEvent.postId,
            shareType: analyticsEvent.shareType,
            timestamp: analyticsEvent.timestamp,
            targetCount: analyticsEvent.targetCount
          },
          ...shareHistory
        ].slice(0, 100);

        // Update share statistics
        const shareStats = userData.shareStats || {
          totalShares: 0,
          sharesByType: {
            [SHARE_TYPES.FRIENDS]: 0,
            [SHARE_TYPES.FEED]: 0,
            [SHARE_TYPES.GROUPS]: 0
          },
          lastSharedAt: null
        };

        shareStats.totalShares++;
        shareStats.sharesByType[analyticsEvent.shareType]++;
        shareStats.lastSharedAt = analyticsEvent.timestamp;

        // Update user document
        await updateDoc(userRef, {
          shareHistory: updatedHistory,
          shareStats: shareStats
        });
      }
    } catch (error) {
      console.error('❌ Error updating user share history:', error);
    }
  }

  /**
   * Track share failure analytics
   */
  async _trackShareFailure(shareData, error, additionalData = {}) {
    try {
      // Use the analytics service to track failure
      await shareAnalyticsService.trackShareFailure(shareData, error);
      console.log('📊 Share failure analytics tracked');
    } catch (analyticsError) {
      console.error('❌ Error tracking share failure:', analyticsError);
    }
  }

  /**
   * Remove a share (for undo functionality)
   */
  async removeShare(shareId, userId) {
    try {
      const share = await this.getById(shareId);
      
      if (!share) {
        throw new Error('Share not found');
      }
      
      if (share.sharerId !== userId) {
        throw new Error('Unauthorized to remove this share');
      }

      // Execute removal transaction
      await runTransaction(db, async (transaction) => {
        // Delete share record
        const shareRef = doc(db, COLLECTIONS.SHARES, shareId);
        transaction.delete(shareRef);
        
        // Update post share count
        const postRef = doc(db, COLLECTIONS.POSTS, share.postId);
        transaction.update(postRef, {
          shareCount: increment(-1),
          shares: arrayRemove(share.sharerId)
        });
      });

      console.log('✅ Share removed successfully:', shareId);
      return { success: true };

    } catch (error) {
      console.error('❌ Error removing share:', error);
      
      // Log error
      await shareErrorLogger.logShareError(error, {
        operation: 'removeShare',
        shareId,
        userId
      }, 'error');
      
      throw error;
    }
  }

  /**
   * Get graceful error message for user display
   * @param {Error} error - The error object
   * @returns {string} User-friendly error message
   */
  _getGracefulErrorMessage(error) {
    const message = error?.message?.toLowerCase() || '';
    
    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    
    // Permission errors
    if (message.includes('permission') || message.includes('unauthorized')) {
      return ERROR_MESSAGES.PERMISSION_DENIED;
    }
    
    // Rate limit errors
    if (message.includes('rate limit') || message.includes('too many')) {
      return ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
    }
    
    // Not found errors
    if (message.includes('not found')) {
      return ERROR_MESSAGES.POST_NOT_FOUND;
    }
    
    // Invalid target errors
    if (message.includes('invalid target') || message.includes('invalid friend') || message.includes('invalid group')) {
      return ERROR_MESSAGES.INVALID_TARGET;
    }
    
    // Default error message
    return error.message || ERROR_MESSAGES.SHARE_FAILED;
  }
}

export default new ShareService();