import { Timestamp } from 'firebase/firestore';

/**
 * Core Message interface for chat messages
 */
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: Timestamp | Date | string;
  read: boolean;
  edited?: boolean;
  editedAt?: Timestamp | Date | string;
  deletedFor?: string[];
  deletedForEveryone?: boolean;
}

/**
 * Chat conversation with latest message
 */
export interface ChatConversation {
  id: string;
  userId: string;
  displayName: string;
  photoURL: string | null;
  lastMessage: string;
  lastMessageTime: Timestamp | Date | string;
  unreadCount: number;
  isOnline?: boolean;
}

/**
 * Data for sending a new message
 */
export interface SendMessageData {
  senderId: string;
  receiverId: string;
  message: string;
}

/**
 * Data for updating a message
 */
export interface UpdateMessageData {
  message: string;
}

/**
 * Message delete options
 */
export type MessageDeleteType = 'me' | 'everyone';

/**
 * Message violation warning
 */
export interface MessageViolation {
  type: 'spam' | 'inappropriate' | 'warning';
  message: string;
  score?: number;
  reasons?: string[];
}
