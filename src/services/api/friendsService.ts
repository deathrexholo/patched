/**
 * Friends Service with Caching
 * Manages friend relationships with cache support
 */

import { db } from '../../lib/firebase';
import { COLLECTIONS, FRIEND_STATUS } from '../../constants/sharing';
import { friendsCache } from '../cache/shareCacheService';
import { Friend, FriendStatus } from '../../types/models/friend';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  Timestamp
} from 'firebase/firestore';

interface GetFriendsListOptions {
  skipCache?: boolean;
  status?: FriendStatus;
}

class FriendsService {
  /**
   * Get user's friends list with caching
   */
  async getFriendsList(userId: string, options: GetFriendsListOptions = {}): Promise<Friend[]> {
    const { skipCache = false, status = FRIEND_STATUS.ACCEPTED } = options;

    try {
      // Check cache first
      if (!skipCache) {
        const cached = friendsCache.get(userId);
        if (cached) {
return cached;
        }
      }

      // Query friendships where user is involved
      const friendshipsRef = collection(db, COLLECTIONS.FRIENDSHIPS);
      
      // Query where user is the requester
      const q1 = query(
        friendshipsRef,
        where('requesterId', '==', userId),
        where('status', '==', status)
      );
      
      // Query where user is the recipient
      const q2 = query(
        friendshipsRef,
        where('recipientId', '==', userId),
        where('status', '==', status)
      );

      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);

      const friends: Friend[] = [];
      const friendIds = new Set<string>();

      // Process friendships where user is requester
      snapshot1.forEach(doc => {
        const data = doc.data();
        const friendId = data.recipientId;
        if (!friendIds.has(friendId)) {
          friendIds.add(friendId);
          friends.push({
            id: friendId,
            friendshipId: doc.id,
            userId: data.recipientId,
            displayName: data.recipientName || 'Unknown',
            photoURL: data.recipientPhotoURL || '',
            status: data.status,
            createdAt: data.createdAt
          });
        }
      });

      // Process friendships where user is recipient
      snapshot2.forEach(doc => {
        const data = doc.data();
        const friendId = data.requesterId;
        if (!friendIds.has(friendId)) {
          friendIds.add(friendId);
          friends.push({
            id: friendId,
            friendshipId: doc.id,
            userId: data.requesterId,
            displayName: data.requesterName || 'Unknown',
            photoURL: data.requesterPhotoURL || '',
            status: data.status,
            createdAt: data.createdAt
          });
        }
      });

      // Sort by display name
      friends.sort((a, b) => a.displayName.localeCompare(b.displayName));

      // Cache the result
      friendsCache.set(userId, friends);
return friends;

    } catch (error) {
      console.error('❌ Error getting friends list:', error);
      throw error;
    }
  }

  /**
   * Get friend details
   */
  async getFriendDetails(userId: string, friendId: string): Promise<Friend | null> {
    try {
      const friends = await this.getFriendsList(userId);
      return friends.find(f => f.id === friendId) || null;
    } catch (error) {
      console.error('❌ Error getting friend details:', error);
      return null;
    }
  }

  /**
   * Check if users are friends
   */
  async areFriends(userId: string, friendId: string): Promise<boolean> {
    try {
      const friends = await this.getFriendsList(userId);
      return friends.some(f => f.id === friendId);
    } catch (error) {
      console.error('❌ Error checking friendship:', error);
      return false;
    }
  }

  /**
   * Invalidate friends cache for a user
   */
  invalidateCache(userId: string): void {
    friendsCache.invalidate(userId);
  }

  /**
   * Invalidate all friends caches
   */
  invalidateAllCaches(): void {
    friendsCache.invalidateAll();
  }

  /**
   * Search friends by name
   */
  async searchFriends(userId: string, searchTerm: string): Promise<Friend[]> {
    try {
      const friends = await this.getFriendsList(userId);
      
      if (!searchTerm || searchTerm.trim() === '') {
        return friends;
      }

      const term = searchTerm.toLowerCase().trim();
      return friends.filter(friend => 
        friend.displayName.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('❌ Error searching friends:', error);
      return [];
    }
  }

  /**
   * Get friends count
   */
  async getFriendsCount(userId: string): Promise<number> {
    try {
      const friends = await this.getFriendsList(userId);
      return friends.length;
    } catch (error) {
      console.error('❌ Error getting friends count:', error);
      return 0;
    }
  }

  /**
   * Check if a friend request already exists between two users
   * Returns the request if found, null otherwise
   * Filters out rejected requests in code to avoid composite index requirement
   */
  async checkFriendRequestExists(
    userId: string,
    targetUserId: string
  ): Promise<any | null> {
    try {
      const friendRequestsRef = collection(db, 'friendRequests');

      // Query for existing requests from userId to targetUserId
      // Note: We don't use != operator to avoid requiring composite indexes
      const q = query(
        friendRequestsRef,
        where('requesterId', '==', userId),
        where('recipientId', '==', targetUserId)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      // Filter rejected requests in code (exclude rejected status)
      const validDocs = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status !== 'rejected';
      });

      if (validDocs.length === 0) {
        return null;
      }

      // Return the first (and should be only) matching request
      const doc = validDocs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('❌ Error checking friend request existence:', error);
      throw error;
    }
  }
}

// Create singleton instance
const friendsService = new FriendsService();

export default friendsService;
export { friendsService };
export type { Friend, GetFriendsListOptions };
