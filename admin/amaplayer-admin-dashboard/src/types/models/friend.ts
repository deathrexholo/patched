import { Timestamp } from 'firebase/firestore';

/**
 * Friend request status
 */
export type FriendStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

/**
 * Friend interface
 */
export interface Friend {
  id: string;
  friendshipId: string;
  userId: string;
  displayName: string;
  photoURL: string;
  status: FriendStatus;
  createdAt: Timestamp | Date | string;
}

/**
 * Friendship relationship
 */
export interface Friendship {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterPhotoURL: string;
  recipientId: string;
  recipientName: string;
  recipientPhotoURL: string;
  status: FriendStatus;
  createdAt: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

/**
 * Friend request
 */
export interface FriendRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterPhotoURL: string;
  recipientId: string;
  status: FriendStatus;
  createdAt: Timestamp | Date | string;
}

/**
 * Data for sending a friend request
 */
export interface SendFriendRequestData {
  requesterId: string;
  requesterName: string;
  requesterPhotoURL: string;
  recipientId: string;
  recipientName: string;
  recipientPhotoURL: string;
}

/**
 * Friend search options
 */
export interface FriendSearchOptions {
  skipCache?: boolean;
  status?: FriendStatus;
}
