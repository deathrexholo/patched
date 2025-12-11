// Notification Management Service - CRUD operations for notifications
import { db } from '../../lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  receiverId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  type: string;
  message: string;
  postId?: string | null;
  storyId?: string | null;
  momentId?: string | null;
  url?: string;
  timestamp: Timestamp;
  read: boolean;
  [key: string]: any;
}

/**
 * Query options for fetching notifications
 */
export interface NotificationQueryOptions {
  limitCount?: number;
  onlyUnread?: boolean;
  afterTimestamp?: Timestamp;
}

/**
 * Notification Management Service
 * Provides full CRUD operations for user notifications
 */
export const notificationManagementService = {
  /**
   * Get user's notifications with pagination
   * @param userId - User ID to fetch notifications for
   * @param options - Query options (limit, filters, pagination)
   */
  async getUserNotifications(
    userId: string,
    options: NotificationQueryOptions = {}
  ): Promise<Notification[]> {
    try {
      const { limitCount = 20, onlyUnread = false, afterTimestamp } = options;

      let q = query(
        collection(db, 'notifications'),
        where('receiverId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      if (onlyUnread) {
        q = query(
          collection(db, 'notifications'),
          where('receiverId', '==', userId),
          where('read', '==', false),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
      }

      if (afterTimestamp) {
        q = query(q, where('timestamp', '>', afterTimestamp));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
    } catch (error) {
      console.error('[NotificationManagementService] Error fetching notifications:', error);
      throw error;
    }
  },

  /**
   * Get a single notification by ID
   * @param notificationId - Notification ID
   */
  async getNotification(notificationId: string): Promise<Notification | null> {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Notification;
      }
      return null;
    } catch (error) {
      console.error('[NotificationManagementService] Error fetching notification:', error);
      throw error;
    }
  },

  /**
   * Mark a notification as read
   * @param notificationId - Notification ID to mark as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      console.error('[NotificationManagementService] Error marking notification as read:', error);
      throw error;
    }
  },

  /**
   * Mark all user notifications as read
   * @param userId - User ID
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('receiverId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach(docSnap => {
        batch.update(docSnap.ref, { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('[NotificationManagementService] Error marking all as read:', error);
      throw error;
    }
  },

  /**
   * Delete a single notification
   * @param notificationId - Notification ID to delete
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('[NotificationManagementService] Error deleting notification:', error);
      throw error;
    }
  },

  /**
   * Delete all read notifications for a user
   * @param userId - User ID
   */
  async deleteAllRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('receiverId', '==', userId),
        where('read', '==', true)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('[NotificationManagementService] Error deleting read notifications:', error);
      throw error;
    }
  },

  /**
   * Get count of unread notifications
   * @param userId - User ID
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('receiverId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('[NotificationManagementService] Error getting unread count:', error);
      throw error;
    }
  },

  /**
   * Delete all notifications for a user (use with caution)
   * @param userId - User ID
   */
  async deleteAllNotifications(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('receiverId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('[NotificationManagementService] Error deleting all notifications:', error);
      throw error;
    }
  }
};

export default notificationManagementService;
