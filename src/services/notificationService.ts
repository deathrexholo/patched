// Push Notification Service for AmaPlayer
import { messaging, getToken, onMessage } from '../lib/firebase';
import { db } from '../lib/firebase';
import { doc, setDoc, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { Messaging } from 'firebase/messaging';
import { Post } from '../types/models/post';
import { Story } from '../types/models/story';

/**
 * Notification type
 */
type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'message'
  | 'story_like'
  | 'story_view'
  | 'story_comment'
  | 'friend_request'
  | 'share_to_friend'
  | 'share_to_group'
  | 'post_shared'
  | 'connection_request'
  | 'connection_accepted'
  | 'connection_rejected';

/**
 * Notification data structure
 */
interface NotificationData {
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
  type: NotificationType;
  message: string;
  title?: string;
  postId?: string | null;
  storyId?: string | null;
  groupId?: string;
  url?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Share data structure
 */
interface ShareData {
  sharerId: string;
  sharerName?: string;
  sharerPhotoURL?: string;
  shareType: string;
  targets: string[];
  message?: string;
  postId: string;
  originalAuthorId: string;
}

/**
 * Group data structure
 */
interface GroupData {
  name: string;
  members: string[];
  [key: string]: unknown;
}

/**
 * Notification error types
 */
type NotificationErrorType = 'send_failed' | 'validation_failed' | 'permission_denied';

/**
 * Notification error data structure
 */
interface NotificationError {
  type: NotificationErrorType;
  notificationType: NotificationType;
  userId: string;
  error: Error;
  timestamp: Date;
  context?: Record<string, unknown>;
}

/**
 * Notification Service class
 */
class NotificationService {
  private token: string | null = null;
  private isSupported: boolean = false;
  private initialized: boolean = false;
  private notificationErrors: NotificationError[] = [];

  async initialize(userId?: string): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if notifications are supported
      this.isSupported = 'Notification' in window && 'serviceWorker' in navigator && !!messaging;

      if (!this.isSupported) {this.initialized = true;
        return;
      }

      // Check existing permission without requesting
      const permission = Notification.permission;if (permission === 'granted') {
        await this.getAndSaveToken(userId || null);
      }

      // Set up foreground message listener
      this.setupForegroundListener();
      this.initialized = true;

    } catch (error) {
      console.error('Error initializing notifications:', error);
      this.initialized = true;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    try {
      // Only request if permission is not already decided
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();if (permission === 'granted') {
          await this.getAndSaveToken();
        } else {}
        
        return permission;
      } else {return Notification.permission;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  async enableNotifications(userId?: string): Promise<boolean> {
    try {const permission = await this.requestPermission();
      
      if (permission === 'granted') {
        await this.initialize();
        
        if (userId) {
          await this.getAndSaveToken(userId);
        }return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error enabling notifications:', error);
      return false;
    }
  }

  async getAndSaveToken(userId: string | null = null): Promise<string | null> {
    try {
      if (!messaging) {return null;
      }

      const vapidKey = process.env.REACT_APP_VAPID_KEY;
      if (!vapidKey || vapidKey === 'your-vapid-key-here' || vapidKey.length < 80) {return null;
      }

      // Check if service worker is available and ready
      if (!('serviceWorker' in navigator)) {return null;
      }

      // Check if service worker is registered
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {return null;
      }

      const fcmToken = await getToken(messaging as Messaging, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: registration
      });

      if (fcmToken) {this.token = fcmToken;

        if (userId) {
          await this.saveTokenToDatabase(userId, fcmToken);
        }

        return fcmToken;
      } else {return null;
      }
    } catch (error: any) {
      // Only log as error if it's not a service worker issue
      if (error?.code === 'messaging/failed-service-worker-registration' ||
          error?.name === 'AbortError') {} else {
        console.error('Error getting FCM token:', error);
      }
      return null;
    }
  }

  async saveTokenToDatabase(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const existingTokens = (userData.fcmTokens as string[]) || [];
        
        if (!existingTokens.includes(token)) {
          existingTokens.push(token);
          await setDoc(userRef, { 
            fcmTokens: existingTokens,
            lastTokenUpdate: serverTimestamp()
          }, { merge: true });}
      }
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  setupForegroundListener(): void {
    if (!messaging) return;

    onMessage(messaging as Messaging, (payload) => {this.showCustomNotification({
        title: payload.notification?.title || 'AmaPlayer',
        body: payload.notification?.body || 'You have a new notification',
        icon: '/logo192.png',
        data: payload.data
      });
    });
  }

  showCustomNotification({ title, body, icon, data }: { 
    title: string; 
    body: string; 
    icon: string; 
    data?: Record<string, unknown>; 
  }): void {
    if (!this.isSupported) return;

    const notification = new Notification(title, {
      body,
      icon,
      badge: '/logo192.png',
      tag: 'amaplayer-notification',
      data,
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      
      if (data?.url && typeof data.url === 'string') {
        window.location.href = data.url;
      }
    };

    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  /**
   * Sanitize notification data to ensure only primitives are stored
   * Prevents data corruption in Firestore
   */
  private sanitizeNotificationData(data: any): any {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        sanitized[key] = value;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // For nested objects like pushData, recursively sanitize
        if (key === 'pushData' || key === 'data') {
          sanitized[key] = this.sanitizeNotificationData(value);
        } else {
          // Convert other objects to JSON strings
          console.warn(`[NotificationService] Converting object field to string: ${key}`, value);
          sanitized[key] = JSON.stringify(value);
        }
      } else if (Array.isArray(value)) {
        // Sanitize array items
        sanitized[key] = value.map(item =>
          typeof item === 'object' && item !== null ? JSON.stringify(item) : item
        );
      } else {
        // Primitive values (string, number, boolean)
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Log notification errors for debugging and monitoring
   */
  private logNotificationError(errorData: NotificationError): void {
    this.notificationErrors.push(errorData);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[NotificationService] Error logged:', {
        type: errorData.type,
        notificationType: errorData.notificationType,
        userId: errorData.userId,
        error: errorData.error.message,
        timestamp: errorData.timestamp,
        context: errorData.context
      });
    }

    // TODO: Send to analytics/monitoring service in production
    // Example: analytics.logError('notification_failed', errorData);
  }

  /**
   * Get all logged notification errors (for debugging)
   */
  getNotificationErrors(): NotificationError[] {
    return [...this.notificationErrors];
  }

  /**
   * Clear notification error log
   */
  clearNotificationErrors(): void {
    this.notificationErrors = [];
  }

  /**
   * Send notification with retry logic and exponential backoff
   * @param receiverUserId - User ID to send notification to
   * @param notification - Notification data
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @param initialDelay - Initial delay in milliseconds (default: 1000)
   */
  async sendNotificationWithRetry(
    receiverUserId: string,
    notification: NotificationData,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.sendNotificationToUser(receiverUserId, notification);
        return; // Success - exit
      } catch (error) {
        lastError = error as Error;

        // Don't retry if this is the last attempt
        if (attempt < maxRetries) {
          // Exponential backoff: delay increases with each attempt
          const delay = initialDelay * Math.pow(2, attempt - 1);

          console.warn(
            `[NotificationService] Retry attempt ${attempt}/${maxRetries} after ${delay}ms for notification type: ${notification.type}`,
            error
          );

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed - log the error
    if (lastError) {
      this.logNotificationError({
        type: 'send_failed',
        notificationType: notification.type,
        userId: receiverUserId,
        error: lastError,
        timestamp: new Date(),
        context: {
          senderId: notification.senderId,
          message: notification.message,
          retriesAttempted: maxRetries
        }
      });

      // Don't throw - notifications should not block main operations
      console.error(
        `[NotificationService] Failed to send notification after ${maxRetries} retries:`,
        lastError
      );
    }
  }

  async sendNotificationToUser(receiverUserId: string, notification: NotificationData): Promise<void> {
    try {const notificationData = {
        receiverId: receiverUserId,
        senderId: notification.senderId,
        senderName: notification.senderName,
        senderPhotoURL: notification.senderPhotoURL || '',
        type: notification.type,
        message: notification.message,
        postId: notification.postId || null,
        storyId: notification.storyId || null,
        momentId: notification.momentId || null,
        url: notification.url || '/',
        timestamp: serverTimestamp(),
        read: false,
        pushData: {
          title: notification.title || 'AmaPlayer',
          body: notification.message,
          icon: '/logo192.png',
          url: notification.url || '/',
          ...notification.data
        }
      };

      // Sanitize data before storing to prevent corruption
      const sanitizedData = this.sanitizeNotificationData(notificationData);

      await addDoc(collection(db, 'notifications'), sanitizedData);} catch (error) {
      console.error('❌ Error sending notification:', error);

      // Log error for monitoring
      this.logNotificationError({
        type: 'send_failed',
        notificationType: notification.type,
        userId: receiverUserId,
        error: error as Error,
        timestamp: new Date(),
        context: {
          senderId: notification.senderId,
          message: notification.message
        }
      });
    }
  }

  async sendLikeNotification(
    likerUserId: string,
    likerName: string,
    likerPhotoURL: string,
    contentOwnerId: string,
    contentId: string,
    contentData: any = null
  ): Promise<void> {
    if (likerUserId === contentOwnerId) return;

    // Detect content type from data
    const contentType = contentData?.contentType || 'post';
    const contentLabel = contentType === 'moment' ? 'moment' : 'post';
    const message = `${likerName} liked your ${contentLabel}`;
    const url = contentType === 'moment' ? `/moments/${contentId}` : `/post/${contentId}`;

    const notificationData: any = {
      senderId: likerUserId,
      senderName: likerName,
      senderPhotoURL: likerPhotoURL,
      type: 'like',
      message,
      title: 'New Like! ❤️',
      url,
      data: {
        contentId,
        type: 'like',
        contentType
      }
    };

    // Add content-specific fields
    if (contentType === 'moment') {
      notificationData.momentId = contentId;
    } else {
      notificationData.postId = contentId;
      notificationData.postMediaUrl = contentData?.mediaUrl;
      notificationData.postMediaType = contentData?.mediaType;
      notificationData.postCaption = contentData?.caption;
    }

    await this.sendNotificationToUser(contentOwnerId, notificationData);
  }

  async sendCommentNotification(
    commenterUserId: string, 
    commenterName: string, 
    commenterPhotoURL: string, 
    postOwnerUserId: string, 
    postId: string, 
    commentText: string, 
    postData: Partial<Post> | null = null
  ): Promise<void> {
    if (commenterUserId === postOwnerUserId) return;

    await this.sendNotificationToUser(postOwnerUserId, {
      senderId: commenterUserId,
      senderName: commenterName,
      senderPhotoURL: commenterPhotoURL,
      type: 'comment',
      message: `${commenterName} commented: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
      title: 'New Comment! 💬',
      postId: postId,
      url: `/post/${postId}`,
      postMediaUrl: postData?.mediaUrl,
      postMediaType: postData?.mediaType,
      postCaption: postData?.caption,
      data: {
        postId: postId,
        type: 'comment'
      }
    });
  }

  async sendStoryLikeNotification(
    likerUserId: string,
    likerName: string,
    likerPhotoURL: string,
    storyOwnerUserId: string,
    storyId: string,
    storyData: Partial<Story> | null = null
  ): Promise<void> {
    if (likerUserId === storyOwnerUserId) return;

    await this.sendNotificationToUser(storyOwnerUserId, {
      senderId: likerUserId,
      senderName: likerName,
      senderPhotoURL: likerPhotoURL,
      type: 'story_like',
      message: `${likerName} liked your story`,
      title: 'Story Like! ❤️',
      storyId: storyId,
      url: `/story/${storyId}`,
      storyMediaUrl: storyData?.mediaUrl,
      storyMediaType: storyData?.mediaType,
      storyThumbnail: storyData?.thumbnail,
      storyCaption: storyData?.caption,
      data: {
        storyId: storyId,
        type: 'story_like'
      }
    });
  }

  async sendStoryCommentNotification(
    commenterUserId: string,
    commenterName: string,
    commenterPhotoURL: string,
    storyOwnerUserId: string,
    storyId: string,
    commentText: string,
    storyData: Partial<Story> | null = null
  ): Promise<void> {
    if (commenterUserId === storyOwnerUserId) return;

    await this.sendNotificationToUser(storyOwnerUserId, {
      senderId: commenterUserId,
      senderName: commenterName,
      senderPhotoURL: commenterPhotoURL,
      type: 'story_comment',
      message: `${commenterName} commented: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
      title: 'Story Comment! 💬',
      storyId: storyId,
      url: `/story/${storyId}`,
      storyMediaUrl: storyData?.mediaUrl,
      storyMediaType: storyData?.mediaType,
      storyThumbnail: storyData?.thumbnail,
      storyCaption: storyData?.caption,
      data: {
        storyId: storyId,
        type: 'story_comment'
      }
    });
  }

  async sendMomentCommentNotification(
    commenterUserId: string,
    commenterName: string,
    commenterPhotoURL: string,
    momentOwnerUserId: string,
    momentId: string,
    commentText: string
  ): Promise<void> {
    if (commenterUserId === momentOwnerUserId) return;

    const message = `${commenterName} commented on your moment: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`;

    await this.sendNotificationToUser(momentOwnerUserId, {
      senderId: commenterUserId,
      senderName: commenterName,
      senderPhotoURL: commenterPhotoURL,
      type: 'comment',
      message,
      title: 'New Comment 💬',
      momentId: momentId,
      url: `/moments/${momentId}`,
      data: {
        momentId: momentId,
        type: 'comment',
        contentType: 'moment'
      }
    });
  }

  async sendFollowNotification(
    followerUserId: string,
    followerName: string,
    followerPhotoURL: string,
    followedUserId: string
  ): Promise<void> {
    await this.sendNotificationToUser(followedUserId, {
      senderId: followerUserId,
      senderName: followerName,
      senderPhotoURL: followerPhotoURL,
      type: 'follow',
      message: `${followerName} started following you`,
      title: 'New Follower! 👥',
      url: `/profile/${followerUserId}`,
      data: {
        userId: followerUserId,
        type: 'follow'
      }
    });
  }

  async sendShareNotifications(
    shareData: ShareData, 
    postData: Partial<Post>, 
    additionalData: { groupsData?: Record<string, GroupData> } = {}
  ): Promise<void> {
    try {
      const { 
        sharerId, 
        sharerName = 'Someone', 
        sharerPhotoURL = '', 
        shareType, 
        targets, 
        message = '', 
        postId, 
        originalAuthorId 
      } = shareData;

      // Send notification to original post author
      if (originalAuthorId && originalAuthorId !== sharerId) {
        await this.sendPostSharedNotification(
          sharerId, 
          sharerName, 
          sharerPhotoURL, 
          originalAuthorId, 
          postId, 
          shareType, 
          message, 
          postData
        );
      }

      // Send notifications based on share type
      switch (shareType) {
        case 'friends':
          await this.sendShareToFriendsNotifications(
            sharerId, 
            sharerName, 
            sharerPhotoURL, 
            targets, 
            postId, 
            message, 
            postData
          );
          break;

        case 'groups':
          if (additionalData.groupsData) {
            for (const groupId of targets) {
              const groupData = additionalData.groupsData[groupId];
              if (groupData && groupData.members) {
                await this.sendShareToGroupNotification(
                  sharerId, 
                  sharerName, 
                  sharerPhotoURL, 
                  groupId, 
                  groupData.members, 
                  postId, 
                  message, 
                  postData, 
                  groupData
                );
              }
            }
          }
          break;

        case 'feed':break;

        default:
          console.warn('⚠️ Unknown share type for notifications:', shareType);
      }} catch (error) {
      console.error('❌ Error sending share notifications:', error);
    }
  }

  private async sendShareToFriendsNotifications(
    sharerId: string, 
    sharerName: string, 
    sharerPhotoURL: string, 
    friendIds: string[], 
    postId: string, 
    message: string, 
    postData: Partial<Post>
  ): Promise<void> {
    if (!friendIds || friendIds.length === 0) return;

    const notifications = friendIds.map(friendId => ({
      receiverId: friendId,
      senderId: sharerId,
      senderName: sharerName,
      senderPhotoURL: sharerPhotoURL,
      type: 'share_to_friend' as NotificationType,
      message: message 
        ? `${sharerName} shared a post with you: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`
        : `${sharerName} shared a post with you`,
      title: 'Post Shared! 📤',
      postId: postId,
      url: `/post/${postId}`,
      postMediaUrl: postData?.mediaUrl,
      postMediaType: postData?.mediaType,
      postCaption: postData?.caption,
      shareMessage: message,
      data: {
        postId: postId,
        type: 'share_to_friend',
        shareMessage: message
      }
    }));

    const batchSize = 10;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(notification => this.sendNotificationToUser(notification.receiverId, notification))
      );
      
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }}

  private async sendShareToGroupNotification(
    sharerId: string, 
    sharerName: string, 
    sharerPhotoURL: string, 
    groupId: string, 
    groupMemberIds: string[], 
    postId: string, 
    message: string, 
    postData: Partial<Post>, 
    groupData: GroupData
  ): Promise<void> {
    const membersToNotify = groupMemberIds.filter(memberId => memberId !== sharerId);
    if (membersToNotify.length === 0) return;

    const groupName = groupData.name || 'a group';
    
    const notifications = membersToNotify.map(memberId => ({
      receiverId: memberId,
      senderId: sharerId,
      senderName: sharerName,
      senderPhotoURL: sharerPhotoURL,
      type: 'share_to_group' as NotificationType,
      message: message 
        ? `${sharerName} shared a post in ${groupName}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`
        : `${sharerName} shared a post in ${groupName}`,
      title: 'New Group Share! 👥',
      postId: postId,
      groupId: groupId,
      url: `/post/${postId}?group=${groupId}`,
      postMediaUrl: postData?.mediaUrl,
      postMediaType: postData?.mediaType,
      postCaption: postData?.caption,
      shareMessage: message,
      groupName: groupName,
      data: {
        postId: postId,
        groupId: groupId,
        type: 'share_to_group',
        shareMessage: message
      }
    }));

    const batchSize = 15;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(notification => this.sendNotificationToUser(notification.receiverId, notification))
      );
      
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }}

  private async sendPostSharedNotification(
    sharerId: string, 
    sharerName: string, 
    sharerPhotoURL: string, 
    postAuthorId: string, 
    postId: string, 
    shareType: string, 
    message: string, 
    postData: Partial<Post>
  ): Promise<void> {
    if (sharerId === postAuthorId) return;

    let shareTypeText = '';
    let icon = '📤';
    
    switch (shareType) {
      case 'friends':
        shareTypeText = 'with friends';
        icon = '👥';
        break;
      case 'feed':
        shareTypeText = 'to their feed';
        icon = '📰';
        break;
      case 'groups':
        shareTypeText = 'in groups';
        icon = '🏢';
        break;
      default:
        shareTypeText = '';
    }

    await this.sendNotificationToUser(postAuthorId, {
      senderId: sharerId,
      senderName: sharerName,
      senderPhotoURL: sharerPhotoURL,
      type: 'post_shared',
      message: message 
        ? `${sharerName} shared your post ${shareTypeText}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`
        : `${sharerName} shared your post ${shareTypeText}`,
      title: `Your Post Was Shared! ${icon}`,
      postId: postId,
      url: `/post/${postId}`,
      postMediaUrl: postData?.mediaUrl,
      postMediaType: postData?.mediaType,
      postCaption: postData?.caption,
      shareMessage: message,
      shareType: shareType,
      data: {
        postId: postId,
        type: 'post_shared',
        shareType: shareType,
        shareMessage: message
      }
    });}

  /**
   * Send connection request notification (to recipient)
   */
  async sendConnectionRequestNotification(
    recipientId: string,
    senderName: string,
    senderRole: 'organization' | 'coach' | 'athlete',
    senderPhotoURL: string,
    connectionType: 'org_to_athlete' | 'athlete_to_org' | 'org_to_coach' | 'coach_to_org'
  ): Promise<void> {
    const roleText = senderRole === 'organization' ? 'Organization' : 'Coach';
    const icon = senderRole === 'organization' ? '🏢' : '👨‍🏫';

    await this.sendNotificationToUser(recipientId, {
      senderId: senderRole === 'organization' ? 'org-system' : 'coach-system',
      senderName: roleText,
      senderPhotoURL: senderPhotoURL || '',
      type: 'connection_request',
      message: `${senderName} wants to connect with you`,
      title: `New Connection Request from ${senderName} ${icon}`,
      data: {
        connectionType,
        senderRole,
        senderName,
        notificationType: 'connection_request'
      }
    });}

  /**
   * Send connection accepted notification (to sender)
   */
  async sendConnectionAcceptedNotification(
    senderId: string,
    recipientName: string,
    recipientRole: 'athlete' | 'organization' | 'coach',
    recipientPhotoURL: string,
    connectionType: 'org_to_athlete' | 'athlete_to_org' | 'org_to_coach' | 'coach_to_org'
  ): Promise<void> {
    const roleText = recipientRole === 'athlete' ? 'Athlete' : 'Organization';
    const icon = recipientRole === 'athlete' ? '🏃' : '🏢';

    await this.sendNotificationToUser(senderId, {
      senderId: recipientRole === 'athlete' ? 'athlete-system' : 'org-system',
      senderName: roleText,
      senderPhotoURL: recipientPhotoURL || '',
      type: 'connection_accepted',
      message: `${recipientName} accepted your connection request`,
      title: `Connection Accepted! ${icon}`,
      data: {
        connectionType,
        recipientRole,
        recipientName,
        notificationType: 'connection_accepted'
      }
    });}

  /**
   * Send connection rejected notification (to sender)
   */
  async sendConnectionRejectedNotification(
    senderId: string,
    recipientName: string,
    recipientRole: 'athlete' | 'organization' | 'coach',
    recipientPhotoURL: string,
    connectionType: 'org_to_athlete' | 'athlete_to_org' | 'org_to_coach' | 'coach_to_org'
  ): Promise<void> {
    const roleText = recipientRole === 'athlete' ? 'Athlete' : 'Organization';
    const icon = recipientRole === 'athlete' ? '🏃' : '🏢';

    await this.sendNotificationToUser(senderId, {
      senderId: recipientRole === 'athlete' ? 'athlete-system' : 'org-system',
      senderName: roleText,
      senderPhotoURL: recipientPhotoURL || '',
      type: 'connection_rejected',
      message: `${recipientName} declined your connection request`,
      title: `Connection Request Declined ${icon}`,
      data: {
        connectionType,
        recipientRole,
        recipientName,
        notificationType: 'connection_rejected'
      }
    });}
}

const notificationService = new NotificationService();

export default notificationService;
