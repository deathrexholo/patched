import { doc, updateDoc, getDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TalentVideo } from '@/types/models/search';

export interface VideoVerificationResult {
  success: boolean;
  message: string;
  updatedVideo?: Partial<TalentVideo>;
}

export interface BulkVideoVerificationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ videoId: string; error: string; }>;
}

/**
 * Enhanced video verification service with bulk operations support
 */
class VideoVerificationService {
  private readonly COLLECTION_NAME = 'talentVideos';

  /**
   * Approve a single video
   */
  async approveVideo(videoId: string, reason?: string): Promise<VideoVerificationResult> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      const videoDoc = await getDoc(videoRef);
      
      if (!videoDoc.exists()) {
        return {
          success: false,
          message: 'Video not found'
        };
      }

      const updateData = {
        verificationStatus: 'approved',
        approvedAt: new Date().toISOString(),
        approvalReason: reason || 'Administrative approval',
        isActive: true,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(videoRef, updateData);return {
        success: true,
        message: 'Video approved successfully',
        updatedVideo: { id: videoId, ...updateData } as Partial<TalentVideo>
      };
    } catch (error) {
      console.error('Error approving video:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to approve video'
      };
    }
  }

  /**
   * Reject a single video
   */
  async rejectVideo(videoId: string, reason?: string): Promise<VideoVerificationResult> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      const videoDoc = await getDoc(videoRef);
      
      if (!videoDoc.exists()) {
        return {
          success: false,
          message: 'Video not found'
        };
      }

      const updateData = {
        verificationStatus: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || 'Administrative rejection',
        isActive: false,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(videoRef, updateData);return {
        success: true,
        message: 'Video rejected successfully',
        updatedVideo: { id: videoId, ...updateData } as Partial<TalentVideo>
      };
    } catch (error) {
      console.error('Error rejecting video:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reject video'
      };
    }
  }

  /**
   * Flag a single video for review
   */
  async flagVideo(videoId: string, reason?: string): Promise<VideoVerificationResult> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      const videoDoc = await getDoc(videoRef);
      
      if (!videoDoc.exists()) {
        return {
          success: false,
          message: 'Video not found'
        };
      }

      const updateData = {
        isFlagged: true,
        flaggedAt: new Date().toISOString(),
        flagReason: reason || 'Administrative flag',
        verificationStatus: 'pending',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(videoRef, updateData);return {
        success: true,
        message: 'Video flagged for review',
        updatedVideo: { id: videoId, ...updateData } as Partial<TalentVideo>
      };
    } catch (error) {
      console.error('Error flagging video:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to flag video'
      };
    }
  }

  /**
   * Bulk approve videos
   */
  async bulkApproveVideos(videoIds: string[], reason?: string): Promise<BulkVideoVerificationResult> {
    return this.executeBulkVideoOperation(videoIds, 'approve', reason);
  }

  /**
   * Bulk reject videos
   */
  async bulkRejectVideos(videoIds: string[], reason?: string): Promise<BulkVideoVerificationResult> {
    return this.executeBulkVideoOperation(videoIds, 'reject', reason);
  }

  /**
   * Bulk flag videos
   */
  async bulkFlagVideos(videoIds: string[], reason?: string): Promise<BulkVideoVerificationResult> {
    return this.executeBulkVideoOperation(videoIds, 'flag', reason);
  }

  /**
   * Execute bulk video operation
   */
  private async executeBulkVideoOperation(
    videoIds: string[],
    operation: 'approve' | 'reject' | 'flag',
    reason?: string
  ): Promise<BulkVideoVerificationResult> {
    const result: BulkVideoVerificationResult = {
      success: false,
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    if (videoIds.length === 0) {
      result.success = true;
      return result;
    }// Process in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < videoIds.length; i += batchSize) {
      batches.push(videoIds.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      try {
        await this.processBatch(batch, operation, reason);
        result.processedCount += batch.length;
      } catch (error) {
        console.error(`Batch operation failed, processing individually:`, error);
        
        // Process individually to identify specific failures
        for (const videoId of batch) {
          try {
            switch (operation) {
              case 'approve':
                await this.approveVideo(videoId, reason);
                break;
              case 'reject':
                await this.rejectVideo(videoId, reason);
                break;
              case 'flag':
                await this.flagVideo(videoId, reason);
                break;
            }
            result.processedCount++;
          } catch (error) {
            result.failedCount++;
            result.errors.push({
              videoId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
    }

    result.success = result.processedCount > 0;return result;
  }

  /**
   * Process a batch of videos using Firestore batch operations
   */
  private async processBatch(
    videoIds: string[],
    operation: 'approve' | 'reject' | 'flag',
    reason?: string
  ): Promise<void> {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();

    for (const videoId of videoIds) {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      let updateData: Record<string, any>;

      switch (operation) {
        case 'approve':
          updateData = {
            verificationStatus: 'approved',
            approvedAt: timestamp,
            approvalReason: reason || 'Administrative approval',
            isActive: true,
            updatedAt: timestamp
          };
          break;
        case 'reject':
          updateData = {
            verificationStatus: 'rejected',
            rejectedAt: timestamp,
            rejectionReason: reason || 'Administrative rejection',
            isActive: false,
            updatedAt: timestamp
          };
          break;
        case 'flag':
          updateData = {
            isFlagged: true,
            flaggedAt: timestamp,
            flagReason: reason || 'Administrative flag',
            verificationStatus: 'pending',
            updatedAt: timestamp
          };
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      batch.update(videoRef, updateData);
    }

    await batch.commit();
  }

  /**
   * Get video verification statistics
   */
  async getVideoVerificationStats(): Promise<{
    totalVideos: number;
    pendingVideos: number;
    approvedVideos: number;
    rejectedVideos: number;
    flaggedVideos: number;
  }> {
    try {
      const videosRef = collection(db, this.COLLECTION_NAME);
      
      // Get counts for each status
      const [pendingQuery, approvedQuery, rejectedQuery, flaggedQuery] = await Promise.all([
        getDocs(query(videosRef, where('verificationStatus', '==', 'pending'))),
        getDocs(query(videosRef, where('verificationStatus', '==', 'approved'))),
        getDocs(query(videosRef, where('verificationStatus', '==', 'rejected'))),
        getDocs(query(videosRef, where('isFlagged', '==', true)))
      ]);

      return {
        totalVideos: 0, // Would need to count all videos
        pendingVideos: pendingQuery.size,
        approvedVideos: approvedQuery.size,
        rejectedVideos: rejectedQuery.size,
        flaggedVideos: flaggedQuery.size
      };
    } catch (error) {
      console.error('Error getting video verification stats:', error);
      return {
        totalVideos: 0,
        pendingVideos: 0,
        approvedVideos: 0,
        rejectedVideos: 0,
        flaggedVideos: 0
      };
    }
  }

  /**
   * Get videos by verification status
   */
  async getVideosByStatus(status: 'pending' | 'approved' | 'rejected', limit: number = 50): Promise<TalentVideo[]> {
    try {
      const videosRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        videosRef,
        where('verificationStatus', '==', status)
      );
      
      const querySnapshot = await getDocs(q);
      const videos: TalentVideo[] = [];
      
      querySnapshot.forEach((doc) => {
        videos.push({
          id: doc.id,
          ...doc.data()
        } as TalentVideo);
      });
      
      return videos.slice(0, limit);
    } catch (error) {
      console.error(`Error getting ${status} videos:`, error);
      return [];
    }
  }

  /**
   * Get flagged videos
   */
  async getFlaggedVideos(limit: number = 50): Promise<TalentVideo[]> {
    try {
      const videosRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        videosRef,
        where('isFlagged', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const videos: TalentVideo[] = [];
      
      querySnapshot.forEach((doc) => {
        videos.push({
          id: doc.id,
          ...doc.data()
        } as TalentVideo);
      });
      
      return videos.slice(0, limit);
    } catch (error) {
      console.error('Error getting flagged videos:', error);
      return [];
    }
  }

  /**
   * Validate video operation
   */
  validateVideoOperation(operation: string, videoIds: string[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (videoIds.length === 0) {
      errors.push('No videos selected');
    }

    if (videoIds.length > 1000) {
      errors.push('Too many videos selected. Maximum 1000 videos per operation');
    }

    const validOperations = ['approve', 'reject', 'flag'];
    if (!validOperations.includes(operation)) {
      errors.push(`Invalid operation: ${operation}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default new VideoVerificationService();