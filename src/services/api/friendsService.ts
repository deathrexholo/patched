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
import userService from './userService';

interface GetFriendsListOptions {
  skipCache?: boolean;
  status?: FriendStatus;
}

class FriendsService {
  /**
   * Get user's friends list with caching
   * Queries the 'friendships' collection using user1/user2 schema
   */
  async getFriendsList(userId: string, options: GetFriendsListOptions = {}): Promise<Friend[]> {
    const { skipCache = false } = options;

    try {
      // Check cache first
      if (!skipCache) {
        const cached = friendsCache.get(userId);
        if (cached) {
          return cached;
        }
      }

      // Query friendships where user is involved
      // The friendships collection uses user1 and user2 fields
      // NOTE: We assume all documents in 'friendships' are accepted friendships.
      const friendshipsRef = collection(db, COLLECTIONS.FRIENDSHIPS);
      
      // Query 1: User is user1
      const q1 = query(
        friendshipsRef,
        where('user1', '==', userId)
      );
      
      // Query 2: User is user2
      const q2 = query(
        friendshipsRef,
        where('user2', '==', userId)
      );

      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);

      const friends: Friend[] = [];
      const friendIds = new Set<string>();
      const userProfilePromises: Promise<void>[] = [];

      // Helper to process snapshots
      // isUser1 boolean tells us if the current userId is in the 'user1' field
      // if so, the friend is in 'user2', and vice versa.
      const processSnapshot = (snapshot: any, isUser1: boolean) => {
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          const friendId = isUser1 ? data.user2 : data.user1;
          
          if (friendId && !friendIds.has(friendId)) {
            friendIds.add(friendId);
            
            // Fetch the friend's profile details since friendships collection only has IDs
            const promise = userService.getUserProfile(friendId)
              .then(userProfile => {
                if (userProfile) {
                  friends.push({
                    id: friendId,
                    friendshipId: doc.id,
                    userId: friendId,
                    displayName: userProfile.displayName || 'Unknown User',
                    photoURL: userProfile.photoURL || '',
                    status: 'accepted', // Default to accepted as it's in friendships collection
                    createdAt: data.createdAt
                  });
                } else {
                  // Fallback if profile not found
                  friends.push({
                    id: friendId,
                    friendshipId: doc.id,
                    userId: friendId,
                    displayName: 'Unknown User',
                    photoURL: '',
                    status: 'accepted',
                    createdAt: data.createdAt
                  });
                }
              })
              .catch(err => {
                console.error(`Error fetching profile for friend ${friendId}`, err);
              });
              
            userProfilePromises.push(promise);
          }
        });
      };

      processSnapshot(snapshot1, true);  // userId is user1, so friend is user2
      processSnapshot(snapshot2, false); // userId is user2, so friend is user1

      // Wait for all profile fetches to complete
      await Promise.all(userProfilePromises);

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
   * Queries the 'friendships' collection using user1/user2 schema
   */
  async areFriends(userId: string, friendId: string, currentUserId?: string): Promise<boolean> {
    try {
      // If currentUserId is provided, only check if current user is involved
      if (currentUserId && currentUserId !== userId && currentUserId !== friendId) {
        console.warn('⚠️ areFriends check skipped: currentUserId not involved', { currentUserId, userId, friendId });
        return false;
      }

      if (!userId || !friendId) {
        console.warn('⚠️ areFriends check skipped: Missing userId or friendId', { userId, friendId });
        return false;
      }

      // Check cache first for immediate consistency with friends list
      const cachedFriends = friendsCache.get(userId);
      if (cachedFriends) {
        const isFriendInCache = cachedFriends.some(f => f.id === friendId);
        if (isFriendInCache) {
          console.log(`✅ Friendship confirmed via cache for ${userId} and ${friendId}`);
          return true;
        }
      }

      console.log(`🔍 Checking friendship between ${userId} and ${friendId}`);

      const friendshipsRef = collection(db, COLLECTIONS.FRIENDSHIPS || 'friendships');

      // Check both combinations of user1/user2
      // NOTE: Removed 'status' check because friendships collection documents don't have a status field
      const q1 = query(
        friendshipsRef,
        where('user1', '==', userId),
        where('user2', '==', friendId)
      );

      const q2 = query(
        friendshipsRef,
        where('user1', '==', friendId),
        where('user2', '==', userId)
      );

      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      const found1 = !snapshot1.empty;
      const found2 = !snapshot2.empty;
      
      console.log(`✅ Friendship check result: ${found1 || found2} (Dir1: ${found1}, Dir2: ${found2})`);

      return found1 || found2;
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
   * Queries the 'friendRequests' collection using requesterId/recipientId schema
   */
  async checkFriendRequestExists(
    userId: string,
    targetUserId: string
  ): Promise<any | null> {
    try {
      const friendRequestsRef = collection(db, 'friendRequests');

      // Check if current user sent a request to target
      const q1 = query(
        friendRequestsRef,
        where('requesterId', '==', userId),
        where('recipientId', '==', targetUserId)
      );

      // Check if target user sent a request to current user
      const q2 = query(
        friendRequestsRef,
        where('requesterId', '==', targetUserId),
        where('recipientId', '==', userId)
      );

      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      // Helper to find a valid (non-rejected) request
      const findValidRequest = (snapshot: any) => {
        const validDocs = snapshot.docs.filter((doc: any) => {
          const data = doc.data();
          return data.status !== 'rejected';
        });
        return validDocs.length > 0 ? { id: validDocs[0].id, ...validDocs[0].data() } : null;
      };

      const sentRequest = findValidRequest(snapshot1);
      if (sentRequest) return sentRequest;

      const receivedRequest = findValidRequest(snapshot2);
      if (receivedRequest) return receivedRequest;

      return null;
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