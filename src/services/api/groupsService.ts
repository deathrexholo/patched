/**
 * Groups Service with Caching
 * Manages group memberships with cache support
 */

import { db } from '../../lib/firebase';
import { COLLECTIONS, GROUP_PRIVACY } from '../../constants/sharing';
import { groupsCache } from '../cache/shareCacheService';
import { Group, GroupDetails, GroupPrivacy, GroupPostingPermissions } from '../../types/models/group';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  Timestamp
} from 'firebase/firestore';

interface GetGroupsListOptions {
  skipCache?: boolean;
  includePrivate?: boolean;
}

interface GetGroupDetailsOptions {
  skipCache?: boolean;
}

class GroupsService {
  /**
   * Get user's groups list with caching
   */
  async getGroupsList(userId: string, options: GetGroupsListOptions = {}): Promise<Group[]> {
    const { skipCache = false, includePrivate = true } = options;

    try {
      // Check cache first
      if (!skipCache) {
        const cached = groupsCache.get(userId);
        if (cached) {return cached;
        }
      }

      // Query groups where user is a member
      const groupsRef = collection(db, COLLECTIONS.GROUPS);
      const q = query(
        groupsRef,
        where('members', 'array-contains', userId)
      );

      const snapshot = await getDocs(q);
      const groups: Group[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Filter by privacy if needed
        if (!includePrivate && data.privacy === GROUP_PRIVACY.PRIVATE) {
          return;
        }

        groups.push({
          id: doc.id,
          name: data.name || 'Unnamed Group',
          description: data.description || '',
          photoURL: data.photoURL || '',
          privacy: data.privacy || GROUP_PRIVACY.PUBLIC,
          memberCount: data.members?.length || 0,
          admins: data.admins || [],
          isAdmin: data.admins?.includes(userId) || false,
          postingPermissions: data.postingPermissions || 'all',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });

      // Sort by name
      groups.sort((a, b) => a.name.localeCompare(b.name));

      // Cache the result
      groupsCache.set(userId, groups);return groups;

    } catch (error) {
      console.error('❌ Error getting groups list:', error);
      throw error;
    }
  }

  /**
   * Get group details with caching
   */
  async getGroupDetails(groupId: string, options: GetGroupDetailsOptions = {}): Promise<GroupDetails | null> {
    const { skipCache = false } = options;

    try {
      // Check cache first
      if (!skipCache) {
        const cached = groupsCache.getGroupDetails(groupId);
        if (cached) {return cached;
        }
      }

      const groupRef = doc(db, COLLECTIONS.GROUPS, groupId);
      const groupDoc = await getDoc(groupRef);

      if (!groupDoc.exists()) {
        return null;
      }

      const data = groupDoc.data();
      const groupDetails: GroupDetails = {
        id: groupDoc.id,
        name: data.name || 'Unnamed Group',
        description: data.description || '',
        photoURL: data.photoURL || '',
        privacy: data.privacy || GROUP_PRIVACY.PUBLIC,
        members: data.members || [],
        memberCount: data.members?.length || 0,
        admins: data.admins || [],
        isAdmin: false, // Will be set by caller if needed
        postingPermissions: data.postingPermissions || 'all',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };

      // Cache the result
      groupsCache.setGroupDetails(groupId, groupDetails);

      return groupDetails;

    } catch (error) {
      console.error('❌ Error getting group details:', error);
      return null;
    }
  }

  /**
   * Check if user is member of a group
   */
  async isMember(userId: string, groupId: string): Promise<boolean> {
    try {
      const groups = await this.getGroupsList(userId);
      return groups.some(g => g.id === groupId);
    } catch (error) {
      console.error('❌ Error checking group membership:', error);
      return false;
    }
  }

  /**
   * Check if user is admin of a group
   */
  async isAdmin(userId: string, groupId: string): Promise<boolean> {
    try {
      const groupDetails = await this.getGroupDetails(groupId);
      return groupDetails?.admins?.includes(userId) || false;
    } catch (error) {
      console.error('❌ Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Check if user can post to a group
   */
  async canPost(userId: string, groupId: string): Promise<boolean> {
    try {
      const groupDetails = await this.getGroupDetails(groupId);
      
      if (!groupDetails) {
        return false;
      }

      // Check if user is a member
      if (!groupDetails.members.includes(userId)) {
        return false;
      }

      // Check posting permissions
      const { postingPermissions, admins } = groupDetails;

      if (postingPermissions === 'all') {
        return true;
      }

      if (postingPermissions === 'admins') {
        return admins.includes(userId);
      }

      // For 'approved' permission, would need additional logic
      return false;

    } catch (error) {
      console.error('❌ Error checking posting permissions:', error);
      return false;
    }
  }

  /**
   * Invalidate groups cache for a user
   */
  invalidateCache(userId: string): void {
    groupsCache.invalidate(userId);
  }

  /**
   * Invalidate group details cache
   */
  invalidateGroupDetailsCache(groupId: string): void {
    groupsCache.invalidateGroupDetails(groupId);
  }

  /**
   * Invalidate all groups caches
   */
  invalidateAllCaches(): void {
    groupsCache.invalidateAll();
  }

  /**
   * Search groups by name
   */
  async searchGroups(userId: string, searchTerm: string): Promise<Group[]> {
    try {
      const groups = await this.getGroupsList(userId);
      
      if (!searchTerm || searchTerm.trim() === '') {
        return groups;
      }

      const term = searchTerm.toLowerCase().trim();
      return groups.filter(group => 
        group.name.toLowerCase().includes(term) ||
        group.description.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('❌ Error searching groups:', error);
      return [];
    }
  }

  /**
   * Get groups count
   */
  async getGroupsCount(userId: string): Promise<number> {
    try {
      const groups = await this.getGroupsList(userId);
      return groups.length;
    } catch (error) {
      console.error('❌ Error getting groups count:', error);
      return 0;
    }
  }

  /**
   * Get admin groups for a user
   */
  async getAdminGroups(userId: string): Promise<Group[]> {
    try {
      const groups = await this.getGroupsList(userId);
      return groups.filter(g => g.isAdmin);
    } catch (error) {
      console.error('❌ Error getting admin groups:', error);
      return [];
    }
  }
}

// Create singleton instance
const groupsService = new GroupsService();

export default groupsService;
export { groupsService };
export type { Group, GroupDetails, GetGroupsListOptions, GetGroupDetailsOptions };
