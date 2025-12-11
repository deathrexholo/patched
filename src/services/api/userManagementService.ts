import { doc, updateDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { COLLECTIONS } from '../../constants/firebase';
import { User } from '@/types/models';
import userService from './userService';

export interface UserManagementResult {
  success: boolean;
  message: string;
  updatedUser?: Partial<User>;
}

export interface BulkUserManagementResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ userId: string; error: string; }>;
}

/**
 * Enhanced user management service with bulk operations support
 */
class UserManagementService {
  /**
   * Suspend a single user
   */
  async suspendUser(userId: string, reason?: string): Promise<UserManagementResult> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const updateData = {
        isActive: false,
        status: 'suspended',
        suspendedAt: new Date().toISOString(),
        suspensionReason: reason || 'Administrative action',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);return {
        success: true,
        message: 'User suspended successfully',
        updatedUser: { id: userId, ...updateData }
      };
    } catch (error) {
      console.error('Error suspending user:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to suspend user'
      };
    }
  }

  /**
   * Verify a single user
   */
  async verifyUser(userId: string, reason?: string): Promise<UserManagementResult> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const updateData = {
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        verificationReason: reason || 'Administrative verification',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);return {
        success: true,
        message: 'User verified successfully',
        updatedUser: { id: userId, ...updateData }
      };
    } catch (error) {
      console.error('Error verifying user:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to verify user'
      };
    }
  }

  /**
   * Activate a single user
   */
  async activateUser(userId: string, reason?: string): Promise<UserManagementResult> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const updateData = {
        isActive: true,
        status: 'active',
        activatedAt: new Date().toISOString(),
        activationReason: reason || 'Administrative activation',
        updatedAt: new Date().toISOString(),
        // Clear suspension data
        suspendedAt: null,
        suspensionReason: null
      };

      await updateDoc(userRef, updateData);return {
        success: true,
        message: 'User activated successfully',
        updatedUser: { id: userId, ...updateData }
      };
    } catch (error) {
      console.error('Error activating user:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to activate user'
      };
    }
  }

  /**
   * Bulk suspend users
   */
  async bulkSuspendUsers(userIds: string[], reason?: string): Promise<BulkUserManagementResult> {
    return this.executeBulkUserOperation(userIds, 'suspend', reason);
  }

  /**
   * Bulk verify users
   */
  async bulkVerifyUsers(userIds: string[], reason?: string): Promise<BulkUserManagementResult> {
    return this.executeBulkUserOperation(userIds, 'verify', reason);
  }

  /**
   * Bulk activate users
   */
  async bulkActivateUsers(userIds: string[], reason?: string): Promise<BulkUserManagementResult> {
    return this.executeBulkUserOperation(userIds, 'activate', reason);
  }

  /**
   * Execute bulk user operation
   */
  private async executeBulkUserOperation(
    userIds: string[],
    operation: 'suspend' | 'verify' | 'activate',
    reason?: string
  ): Promise<BulkUserManagementResult> {
    const result: BulkUserManagementResult = {
      success: false,
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    if (userIds.length === 0) {
      result.success = true;
      return result;
    }// Process in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      batches.push(userIds.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      try {
        await this.processBatch(batch, operation, reason);
        result.processedCount += batch.length;
      } catch (error) {
        console.error(`Batch operation failed, processing individually:`, error);
        
        // Process individually to identify specific failures
        for (const userId of batch) {
          try {
            switch (operation) {
              case 'suspend':
                await this.suspendUser(userId, reason);
                break;
              case 'verify':
                await this.verifyUser(userId, reason);
                break;
              case 'activate':
                await this.activateUser(userId, reason);
                break;
            }
            result.processedCount++;
          } catch (error) {
            result.failedCount++;
            result.errors.push({
              userId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
    }

    result.success = result.processedCount > 0;return result;
  }

  /**
   * Process a batch of users using Firestore batch operations
   */
  private async processBatch(
    userIds: string[],
    operation: 'suspend' | 'verify' | 'activate',
    reason?: string
  ): Promise<void> {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();

    for (const userId of userIds) {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      let updateData: Record<string, any>;

      switch (operation) {
        case 'suspend':
          updateData = {
            isActive: false,
            status: 'suspended',
            suspendedAt: timestamp,
            suspensionReason: reason || 'Administrative action',
            updatedAt: timestamp
          };
          break;
        case 'verify':
          updateData = {
            isVerified: true,
            verifiedAt: timestamp,
            verificationReason: reason || 'Administrative verification',
            updatedAt: timestamp
          };
          break;
        case 'activate':
          updateData = {
            isActive: true,
            status: 'active',
            activatedAt: timestamp,
            activationReason: reason || 'Administrative activation',
            updatedAt: timestamp,
            suspendedAt: null,
            suspensionReason: null
          };
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      batch.update(userRef, updateData);
    }

    await batch.commit();
  }

  /**
   * Get user management statistics
   */
  async getUserManagementStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    verifiedUsers: number;
  }> {
    try {
      // This would typically use aggregation queries or cached statistics
      // For now, we'll return mock data
      return {
        totalUsers: 0,
        activeUsers: 0,
        suspendedUsers: 0,
        verifiedUsers: 0
      };
    } catch (error) {
      console.error('Error getting user management stats:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        suspendedUsers: 0,
        verifiedUsers: 0
      };
    }
  }

  /**
   * Validate user operation
   */
  validateUserOperation(operation: string, userIds: string[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (userIds.length === 0) {
      errors.push('No users selected');
    }

    if (userIds.length > 1000) {
      errors.push('Too many users selected. Maximum 1000 users per operation');
    }

    const validOperations = ['suspend', 'verify', 'activate'];
    if (!validOperations.includes(operation)) {
      errors.push(`Invalid operation: ${operation}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default new UserManagementService();