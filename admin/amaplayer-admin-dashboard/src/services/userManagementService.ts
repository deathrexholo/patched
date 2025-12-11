/**
 * User Management Service for Admin Dashboard
 * Handles user-related operations with real Firebase data
 */

import { doc, updateDoc, getDoc, writeBatch, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types/models';

export interface BulkOperationResult {
  processedCount: number;
  failedCount: number;
  errors: Array<{ userId: string; error: string }>;
}

export class UserManagementService {
  /**
   * Suspend a single user
   */
  async suspendUser(userId: string, reason?: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const updateData = {
        isActive: false,
        status: 'suspended',
        suspendedAt: new Date().toISOString(),
        suspensionReason: reason || 'Administrative action',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);
      console.log(`User ${userId} suspended successfully`);
    } catch (error) {
      throw new Error(`Failed to suspend user: ${error}`);
    }
  }

  /**
   * Bulk suspend users
   */
  async bulkSuspendUsers(userIds: string[], reason?: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const userId of userIds) {
      try {
        await this.suspendUser(userId, reason);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  /**
   * Verify a single user
   */
  async verifyUser(userId: string, reason?: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const updateData = {
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        verificationReason: reason || 'Administrative verification',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);
      console.log(`User ${userId} verified successfully`);
    } catch (error) {
      throw new Error(`Failed to verify user: ${error}`);
    }
  }

  /**
   * Bulk verify users
   */
  async bulkVerifyUsers(userIds: string[], reason?: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const userId of userIds) {
      try {
        await this.verifyUser(userId, reason);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  /**
   * Activate a single user
   */
  async activateUser(userId: string, reason?: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const updateData = {
        isActive: true,
        status: 'active',
        activatedAt: new Date().toISOString(),
        activationReason: reason || 'Administrative activation',
        updatedAt: new Date().toISOString(),
        suspendedAt: null,
        suspensionReason: null
      };

      await updateDoc(userRef, updateData);
      console.log(`User ${userId} activated successfully`);
    } catch (error) {
      throw new Error(`Failed to activate user: ${error}`);
    }
  }

  /**
   * Bulk activate users
   */
  async bulkActivateUsers(userIds: string[], reason?: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const userId of userIds) {
      try {
        await this.activateUser(userId, reason);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  /**
   * Delete a single user account permanently
   */
  async deleteUser(userId: string, reason?: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      // Mark user as deleted before actual deletion
      const updateData = {
        isActive: false,
        isDeleted: true,
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        deletionReason: reason || 'Administrative deletion',
        deletedBy: 'admin',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);
      console.log(`User ${userId} deleted successfully`);
    } catch (error) {
      throw new Error(`Failed to delete user: ${error}`);
    }
  }

  /**
   * Bulk delete users
   */
  async bulkDeleteUsers(userIds: string[], reason?: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const userId of userIds) {
      try {
        await this.deleteUser(userId, reason);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return null;
      }

      const data = userDoc.data();
      return {
        uid: userDoc.id,
        id: userDoc.id,
        displayName: data.displayName || '',
        email: data.email || '',
        username: data.username || '',
        role: data.role || 'athlete',
        isActive: data.isActive !== false,
        isVerified: data.isVerified || false,
        photoURL: data.photoURL || '',
        sports: data.sports || [],
        postsCount: data.postsCount || 0,
        storiesCount: data.storiesCount || 0,
        followersCount: data.followersCount || 0,
        followingCount: data.followingCount || 0,
        location: data.location || '',
        bio: data.bio || '',
        gender: data.gender || '',
        dateOfBirth: data.dateOfBirth || '',
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
      } as User;
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error}`);
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      const updated = await this.getUserById(userId);
      if (!updated) throw new Error('User not found after update');
      return updated;
    } catch (error) {
      throw new Error(`Failed to update user: ${error}`);
    }
  }

  /**
   * Get user statistics from Firebase
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    suspended: number;
    verified: number;
    athletes: number;
    coaches: number;
    organizations: number;
  }> {
    try {
      const usersRef = collection(db, 'users');

      const [allUsers, activeUsers, suspendedUsers, verifiedUsers, athleteUsers, coachUsers, orgUsers] = await Promise.all([
        getDocs(usersRef),
        getDocs(query(usersRef, where('isActive', '==', true))),
        getDocs(query(usersRef, where('isActive', '==', false))),
        getDocs(query(usersRef, where('isVerified', '==', true))),
        getDocs(query(usersRef, where('role', '==', 'athlete'))),
        getDocs(query(usersRef, where('role', '==', 'coach'))),
        getDocs(query(usersRef, where('role', '==', 'organization')))
      ]);

      return {
        total: allUsers.size,
        active: activeUsers.size,
        suspended: suspendedUsers.size,
        verified: verifiedUsers.size,
        athletes: athleteUsers.size,
        coaches: coachUsers.size,
        organizations: orgUsers.size
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        total: 0,
        active: 0,
        suspended: 0,
        verified: 0,
        athletes: 0,
        coaches: 0,
        organizations: 0
      };
    }
  }

  /**
   * Get all users from Firebase
   */
  async getAllUsers(): Promise<User[]> {
    try {
      console.log('📊 Fetching all users from Firebase...');
      console.log('📊 Database reference (db):', db);

      const usersRef = collection(db, 'users');
      console.log('📊 Users collection reference created:', usersRef);

      const querySnapshot = await getDocs(usersRef);
      console.log('📊 Query snapshot received. Total documents:', querySnapshot.size);

      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📊 Processing user:', data.displayName || data.email);
        users.push({
          uid: doc.id,
          id: doc.id,
          displayName: data.displayName || '',
          email: data.email || '',
          username: data.username || '',
          role: data.role || 'athlete',
          isActive: data.isActive !== false,
          isVerified: data.isVerified || false,
          photoURL: data.photoURL || '',
          sports: data.sports || [],
          postsCount: data.postsCount || 0,
          storiesCount: data.storiesCount || 0,
          followersCount: data.followersCount || 0,
          followingCount: data.followingCount || 0,
          location: data.location || '',
          bio: data.bio || '',
          gender: data.gender || '',
          dateOfBirth: data.dateOfBirth || '',
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
        } as User);
      });

      console.log('📊 Successfully fetched', users.length, 'users from Firebase');
      return users;
    } catch (error) {
      console.error('❌ Error getting all users from Firebase:', error);
      console.error('Error type:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  /**
   * Clean up test/sample posts from Firestore
   * Deletes posts with test data (displayName: 'string', etc.)
   */
  async cleanupTestPosts(): Promise<{ deletedCount: number; errors: string[] }> {
    const result = { deletedCount: 0, errors: [] as string[] };

    try {
      console.log('🧹 Starting cleanup of test posts...');

      const postsRef = collection(db, 'posts');

      // Query for posts with displayName 'string'
      const testPostsQuery = query(
        postsRef,
        where('userDisplayName', '==', 'string')
      );

      const querySnapshot = await getDocs(testPostsQuery);
      console.log(`🧹 Found ${querySnapshot.size} test posts to delete`);

      // Delete each test post
      for (const doc of querySnapshot.docs) {
        try {
          await deleteDoc(doc.ref);
          result.deletedCount++;
          console.log(`✅ Deleted test post: ${doc.id}`);
        } catch (error) {
          const errorMsg = `Failed to delete post ${doc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(`🧹 Cleanup complete! Deleted ${result.deletedCount} test posts`);
      return result;
    } catch (error) {
      const errorMsg = `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      return result;
    }
  }

  /**
   * Clean up _schema documents from all collections in Firestore
   * These are type definition documents that should not be in production
   */
  async cleanupSchemaDocuments(): Promise<{
    collectionsProcessed: number;
    schemasDeleted: number;
    errors: string[];
  }> {
    const result = { collectionsProcessed: 0, schemasDeleted: 0, errors: [] as string[] };

    try {
      console.log('🧹 Starting cleanup of _schema documents from all collections...');

      // List of known collections to check
      const collectionsToCheck = [
        'users',
        'posts',
        'comments',
        'stories',
        'moments',
        'videos',
        'talentVideos',
        'highlights',
        'storyComments',
        'follows',
        'friendRequests',
        'friendships',
        'messages',
        'notifications',
        'contentReports',
        'moderationLogs',
        'userViolations',
        'groups',
        'shares',
        'events',
        'admins',
        'verificationRequests',
        'verifications',
        'interactions',
        'organizationConnections',
        'connectionActivity',
        'organizationConnectionRequests',
        'organisationConnectionRequest',
        'connectionInteractions',
        'videoVerifications',
        'adminLogs'
      ];

      // Process each collection
      for (const collectionName of collectionsToCheck) {
        try {
          const collectionRef = collection(db, collectionName);
          const schemaDocRef = doc(collectionRef, '_schema');
          const schemaDoc = await getDoc(schemaDocRef);

          if (schemaDoc.exists()) {
            await deleteDoc(schemaDocRef);
            result.schemasDeleted++;
            console.log(`✅ Deleted _schema from collection: ${collectionName}`);
          }
          result.collectionsProcessed++;
        } catch (error) {
          const errorMsg = `Error processing ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.warn(`⚠️ ${errorMsg}`);
          result.collectionsProcessed++;
        }
      }

      console.log(`🧹 Schema cleanup complete! Processed ${result.collectionsProcessed} collections, deleted ${result.schemasDeleted} _schema documents`);
      return result;
    } catch (error) {
      const errorMsg = `Schema cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      return result;
    }
  }

  /**
   * Clean up all test data (posts, comments, etc.)
   * Deletes documents with test/debug values
   */
  async cleanupAllTestData(): Promise<{
    postsDeleted: number;
    schemasDeleted: number;
    errors: string[];
  }> {
    const result = { postsDeleted: 0, schemasDeleted: 0, errors: [] as string[] };

    try {
      console.log('🧹 Starting comprehensive test data cleanup...');

      // Clean up test posts
      const postsResult = await this.cleanupTestPosts();
      result.postsDeleted = postsResult.deletedCount;
      result.errors.push(...postsResult.errors);

      // Clean up _schema documents
      const schemaResult = await this.cleanupSchemaDocuments();
      result.schemasDeleted = schemaResult.schemasDeleted;
      result.errors.push(...schemaResult.errors);

      console.log('🧹 Comprehensive cleanup complete!');
      console.log(`   - Test posts deleted: ${result.postsDeleted}`);
      console.log(`   - Schema documents deleted: ${result.schemasDeleted}`);
      if (result.errors.length > 0) {
        console.log(`   - Errors encountered: ${result.errors.length}`);
      }

      return result;
    } catch (error) {
      const errorMsg = `Full cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      return result;
    }
  }
}

// Create singleton instance
export const userManagementService = new UserManagementService();
export default userManagementService;