import { doc, updateDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { COLLECTIONS } from '../../constants/firebase';
import { User, Event } from '@/types/models';
import { TalentVideo } from '@/types/models/search';

// Type definitions for bulk operations
export type BulkOperationType =
  | 'user_suspend'
  | 'user_verify'
  | 'user_activate'
  | 'video_approve'
  | 'video_reject'
  | 'video_flag'
  | 'event_activate'
  | 'event_deactivate';

export interface BulkSelectableItem {
  id: string;
  type: 'user' | 'video' | 'event';
  [key: string]: any;
}

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ itemId: string; error: string; }>;
  operationId: string;
}

export interface BulkOperationProgress {
  total: number;
  processed: number;
  failed: number;
  currentItem?: string;
}

/**
 * Service for handling bulk operations on users, videos, and events
 */
class BulkOperationsService {
  private readonly BATCH_SIZE = 500; // Firestore batch limit

  /**
   * Execute bulk operation with progress tracking
   */
  async executeBulkOperation(
    operation: BulkOperationType,
    items: BulkSelectableItem[],
    reason?: string,
    onProgress?: (progress: BulkOperationProgress) => void
  ): Promise<BulkOperationResult> {
    const operationId = `bulk_${operation}_${Date.now()}`;
    const result: BulkOperationResult = {
      success: false,
      processedCount: 0,
      failedCount: 0,
      errors: [],
      operationId
    };

    if (items.length === 0) {
      result.success = true;
      return result;
    }try {
      // Process items in batches
      const batches = this.createBatches(items, this.BATCH_SIZE);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        try {
          await this.processBatch(operation, batch, reason);
          result.processedCount += batch.length;
        } catch (error) {
          console.error(`Batch ${batchIndex} failed:`, error);
          
          // Process items individually to identify specific failures
          for (const item of batch) {
            try {
              await this.processSingleItem(operation, item, reason);
              result.processedCount++;
            } catch (itemError) {
              result.failedCount++;
              result.errors.push({
                itemId: item.id,
                error: itemError instanceof Error ? itemError.message : 'Unknown error'
              });
            }
          }
        }

        // Report progress
        if (onProgress) {
          onProgress({
            total: items.length,
            processed: result.processedCount,
            failed: result.failedCount,
            currentItem: batch[batch.length - 1]?.id
          });
        }
      }

      result.success = result.processedCount > 0;// Log the operation for audit purposes
      await this.logBulkOperation(operationId, operation, items.length, result, reason);
      
      return result;
    } catch (error) {
      console.error('Bulk operation failed:', error);
      
      result.errors.push({
        itemId: 'SYSTEM',
        error: error instanceof Error ? error.message : 'System error'
      });
      
      return result;
    }
  }

  /**
   * Process a batch of items using Firestore batch operations
   */
  private async processBatch(
    operation: BulkOperationType,
    items: BulkSelectableItem[],
    reason?: string
  ): Promise<void> {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();

    for (const item of items) {
      const updates = this.getUpdateData(operation, reason, timestamp);
      const collection = this.getCollectionForItem(item);
      const docRef = doc(db, collection, item.id);
      
      batch.update(docRef, updates);
    }

    await batch.commit();
  }

  /**
   * Process a single item (fallback for batch failures)
   */
  private async processSingleItem(
    operation: BulkOperationType,
    item: BulkSelectableItem,
    reason?: string
  ): Promise<void> {
    const updates = this.getUpdateData(operation, reason, new Date().toISOString());
    const collection = this.getCollectionForItem(item);
    const docRef = doc(db, collection, item.id);
    
    // Verify item exists before updating
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`Item ${item.id} not found`);
    }
    
    await updateDoc(docRef, updates);
  }

  /**
   * Get update data based on operation type
   */
  private getUpdateData(operation: BulkOperationType, reason?: string, timestamp?: string): Record<string, any> {
    const baseUpdate = {
      updatedAt: timestamp || new Date().toISOString(),
      lastModifiedBy: 'admin_bulk_operation'
    };

    if (reason) {
      baseUpdate['operationReason'] = reason;
    }

    switch (operation) {
      case 'user_suspend':
        return {
          ...baseUpdate,
          isActive: false,
          status: 'suspended',
          suspendedAt: timestamp,
          suspensionReason: reason
        };

      case 'user_verify':
        return {
          ...baseUpdate,
          isVerified: true,
          verifiedAt: timestamp,
          verificationReason: reason
        };

      case 'user_activate':
        return {
          ...baseUpdate,
          isActive: true,
          status: 'active',
          activatedAt: timestamp,
          // Remove suspension fields if they exist
          suspendedAt: null,
          suspensionReason: null
        };

      case 'video_approve':
        return {
          ...baseUpdate,
          verificationStatus: 'approved',
          approvedAt: timestamp,
          approvalReason: reason,
          isActive: true
        };

      case 'video_reject':
        return {
          ...baseUpdate,
          verificationStatus: 'rejected',
          rejectedAt: timestamp,
          rejectionReason: reason,
          isActive: false
        };

      case 'video_flag':
        return {
          ...baseUpdate,
          isFlagged: true,
          flaggedAt: timestamp,
          flagReason: reason,
          verificationStatus: 'pending'
        };

      case 'event_activate':
        return {
          ...baseUpdate,
          isActive: true,
          status: 'active',
          activatedAt: timestamp
        };

      case 'event_deactivate':
        return {
          ...baseUpdate,
          isActive: false,
          status: 'inactive',
          deactivatedAt: timestamp,
          deactivationReason: reason
        };

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Get Firestore collection name for item type
   */
  private getCollectionForItem(item: BulkSelectableItem): string {
    if ('role' in item) return COLLECTIONS.USERS;
    if ('verificationStatus' in item) return 'videos'; // Assuming videos collection
    if ('title' in item && 'status' in item) return 'events';
    
    throw new Error(`Unknown item type for item: ${item.id}`);
  }

  /**
   * Create batches from items array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Log bulk operation for audit purposes
   */
  private async logBulkOperation(
    operationId: string,
    operation: BulkOperationType,
    totalItems: number,
    result: BulkOperationResult,
    reason?: string
  ): Promise<void> {
    try {
      const logData = {
        operationId,
        operation,
        totalItems,
        processedCount: result.processedCount,
        failedCount: result.failedCount,
        success: result.success,
        reason: reason || null,
        errors: result.errors,
        timestamp: new Date().toISOString(),
        executedBy: 'admin' // In a real app, this would be the current admin user ID
      };

      // Log to a dedicated audit collection
      const logRef = doc(db, 'bulk_operation_logs', operationId);
      await updateDoc(logRef, logData).catch(async () => {
        // If update fails, the document doesn't exist, so create it
        const { setDoc } = await import('firebase/firestore');
        await setDoc(logRef, logData);
      });} catch (error) {
      console.error('Failed to log bulk operation:', error);
      // Don't throw here as logging failure shouldn't fail the operation
    }
  }

  /**
   * Get bulk operation history
   */
  async getBulkOperationHistory(limit: number = 50): Promise<any[]> {
    try {
      const { collection, query, orderBy, limitToLast, getDocs } = await import('firebase/firestore');
      
      const q = query(
        collection(db, 'bulk_operation_logs'),
        orderBy('timestamp', 'desc'),
        limitToLast(limit)
      );
      
      const querySnapshot = await getDocs(q);
      const history: any[] = [];
      
      querySnapshot.forEach((doc) => {
        history.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return history;
    } catch (error) {
      console.error('Failed to get bulk operation history:', error);
      return [];
    }
  }

  /**
   * Validate items before bulk operation
   */
  validateBulkOperation(operation: BulkOperationType, items: BulkSelectableItem[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (items.length === 0) {
      errors.push('No items selected for bulk operation');
    }

    if (items.length > 1000) {
      errors.push('Too many items selected. Maximum 1000 items per operation');
    }

    // Validate operation compatibility with item types
    const userOperations = ['user_suspend', 'user_verify', 'user_activate'];
    const videoOperations = ['video_approve', 'video_reject', 'video_flag'];
    const eventOperations = ['event_activate', 'event_deactivate'];

    if (userOperations.includes(operation)) {
      const nonUserItems = items.filter(item => !('role' in item));
      if (nonUserItems.length > 0) {
        errors.push(`User operation ${operation} cannot be applied to non-user items`);
      }
    }

    if (videoOperations.includes(operation)) {
      const nonVideoItems = items.filter(item => !('verificationStatus' in item));
      if (nonVideoItems.length > 0) {
        errors.push(`Video operation ${operation} cannot be applied to non-video items`);
      }
    }

    if (eventOperations.includes(operation)) {
      const nonEventItems = items.filter(item => !('title' in item && 'status' in item && !('role' in item) && !('verificationStatus' in item)));
      if (nonEventItems.length > 0) {
        errors.push(`Event operation ${operation} cannot be applied to non-event items`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Estimate operation time based on item count and operation type
   */
  estimateOperationTime(operation: BulkOperationType, itemCount: number): {
    estimatedSeconds: number;
    estimatedMinutes: number;
  } {
    // Base time per item in seconds (varies by operation complexity)
    const baseTimePerItem = {
      user_suspend: 0.5,
      user_verify: 0.3,
      user_activate: 0.3,
      video_approve: 0.4,
      video_reject: 0.4,
      video_flag: 0.2,
      event_activate: 0.2,
      event_deactivate: 0.2
    };

    const timePerItem = baseTimePerItem[operation] || 0.5;
    const estimatedSeconds = Math.ceil(itemCount * timePerItem);
    const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

    return {
      estimatedSeconds,
      estimatedMinutes
    };
  }
}

export default new BulkOperationsService();