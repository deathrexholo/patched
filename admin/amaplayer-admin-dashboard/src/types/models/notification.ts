import { Timestamp } from 'firebase/firestore';

/**
 * Notification type
 */
export type NotificationType = 
  | 'like' 
  | 'comment' 
  | 'share' 
  | 'follow' 
  | 'friend_request' 
  | 'message' 
  | 'mention'
  | 'event'
  | 'system';

/**
 * Core Notification interface
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: Timestamp | Date | string;
  actionUrl?: string;
  actorId?: string;
  actorName?: string;
  actorPhotoURL?: string;
  relatedId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Data for creating a notification
 */
export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actorId?: string;
  actorName?: string;
  actorPhotoURL?: string;
  relatedId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  likes: boolean;
  comments: boolean;
  shares: boolean;
  follows: boolean;
  friendRequests: boolean;
  messages: boolean;
  mentions: boolean;
  events: boolean;
}
