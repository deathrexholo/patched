/**
 * Video Verification Service for Admin Dashboard
 * Handles video verification operations with real Firebase data
 */

import { doc, updateDoc, getDoc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TalentVideo } from '../types/models/search';

export interface BulkVideoOperationResult {
  processedCount: number;
  failedCount: number;
  errors: Array<{ videoId: string; error: string }>;
}

/**
 * Video Verification Service
 */
export class VideoVerificationService {
  private readonly COLLECTION_NAME = 'talentVideos';

  async approveVideo(videoId: string, reason?: string): Promise<void> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      const videoDoc = await getDoc(videoRef);

      if (!videoDoc.exists()) {
        throw new Error('Video not found');
      }

      const updateData = {
        verificationStatus: 'approved',
        approvedAt: new Date().toISOString(),
        approvalReason: reason || 'Administrative approval',
        isActive: true,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(videoRef, updateData);
      console.log(`Video ${videoId} approved successfully`);
    } catch (error) {
      throw new Error(`Failed to approve video: ${error}`);
    }
  }

  async bulkApproveVideos(videoIds: string[], reason?: string): Promise<BulkVideoOperationResult> {
    const result: BulkVideoOperationResult = {
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const videoId of videoIds) {
      try {
        await this.approveVideo(videoId, reason);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          videoId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  async rejectVideo(videoId: string, reason?: string): Promise<void> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      const videoDoc = await getDoc(videoRef);

      if (!videoDoc.exists()) {
        throw new Error('Video not found');
      }

      const updateData = {
        verificationStatus: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || 'Administrative rejection',
        isActive: false,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(videoRef, updateData);
      console.log(`Video ${videoId} rejected successfully`);
    } catch (error) {
      throw new Error(`Failed to reject video: ${error}`);
    }
  }

  async bulkRejectVideos(videoIds: string[], reason?: string): Promise<BulkVideoOperationResult> {
    const result: BulkVideoOperationResult = {
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const videoId of videoIds) {
      try {
        await this.rejectVideo(videoId, reason);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          videoId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  async flagVideo(videoId: string, reason?: string): Promise<void> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      const videoDoc = await getDoc(videoRef);

      if (!videoDoc.exists()) {
        throw new Error('Video not found');
      }

      const updateData = {
        isFlagged: true,
        flaggedAt: new Date().toISOString(),
        flagReason: reason || 'Administrative flag',
        verificationStatus: 'pending',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(videoRef, updateData);
      console.log(`Video ${videoId} flagged successfully`);
    } catch (error) {
      throw new Error(`Failed to flag video: ${error}`);
    }
  }

  async bulkFlagVideos(videoIds: string[], reason?: string): Promise<BulkVideoOperationResult> {
    const result: BulkVideoOperationResult = {
      processedCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const videoId of videoIds) {
      try {
        await this.flagVideo(videoId, reason);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          videoId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  async getVideoById(videoId: string): Promise<TalentVideo | null> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      const videoDoc = await getDoc(videoRef);

      if (!videoDoc.exists()) {
        return null;
      }

      return { id: videoDoc.id, ...videoDoc.data() } as TalentVideo;
    } catch (error) {
      throw new Error(`Failed to fetch video: ${error}`);
    }
  }

  async updateVideo(videoId: string, updates: Partial<TalentVideo>): Promise<TalentVideo> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      await updateDoc(videoRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      const updated = await this.getVideoById(videoId);
      if (!updated) throw new Error('Video not found after update');
      return updated;
    } catch (error) {
      throw new Error(`Failed to update video: ${error}`);
    }
  }

  async getVerificationStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    try {
      const videosRef = collection(db, this.COLLECTION_NAME);

      const [allVideos, pendingVideos, approvedVideos, rejectedVideos] = await Promise.all([
        getDocs(videosRef),
        getDocs(query(videosRef, where('verificationStatus', '==', 'pending'))),
        getDocs(query(videosRef, where('verificationStatus', '==', 'approved'))),
        getDocs(query(videosRef, where('verificationStatus', '==', 'rejected')))
      ]);

      return {
        total: allVideos.size,
        pending: pendingVideos.size,
        approved: approvedVideos.size,
        rejected: rejectedVideos.size
      };
    } catch (error) {
      console.error('Error getting video verification stats:', error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      };
    }
  }

  /**
   * Get all videos from Firebase for verification
   * Fetches from talentVideos collection
   */
  async getAllVideos(): Promise<TalentVideo[]> {
    try {
      console.log('🔍 Admin: Getting all videos from collection:', this.COLLECTION_NAME);
      console.log('🔍 Admin: Database instance:', db ? 'Connected' : 'Not connected');

      if (!db) {
        console.error('❌ Admin: Database not initialized');
        return [];
      }

      const videosRef = collection(db, this.COLLECTION_NAME);
      console.log('🔍 Admin: Collection reference created');

      const querySnapshot = await getDocs(videosRef);
      console.log('✅ Admin: Query executed successfully');
      console.log('📊 Admin: Total documents found:', querySnapshot.size);

      const videos: TalentVideo[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 Admin: Processing video document:', doc.id, data);

        // Handle Firestore Timestamp conversion
        let createdAtDate = new Date().toISOString();
        if (data.uploadDate) {
          try {
            // Check if it's a Firestore Timestamp (has toDate method)
            if (data.uploadDate.toDate && typeof data.uploadDate.toDate === 'function') {
              createdAtDate = data.uploadDate.toDate().toISOString();
            } else if (data.uploadDate instanceof Date) {
              createdAtDate = data.uploadDate.toISOString();
            } else if (typeof data.uploadDate === 'string') {
              createdAtDate = new Date(data.uploadDate).toISOString();
            } else if (typeof data.uploadDate === 'number') {
              createdAtDate = new Date(data.uploadDate).toISOString();
            }
          } catch (error) {
            console.error('❌ Admin: Error converting uploadDate:', data.uploadDate, error);
            createdAtDate = new Date().toISOString();
          }
        }

        let updatedAtDate = new Date().toISOString();
        if (data.updatedAt) {
          try {
            // Check if it's a Firestore Timestamp (has toDate method)
            if (data.updatedAt.toDate && typeof data.updatedAt.toDate === 'function') {
              updatedAtDate = data.updatedAt.toDate().toISOString();
            } else if (data.updatedAt instanceof Date) {
              updatedAtDate = data.updatedAt.toISOString();
            } else if (typeof data.updatedAt === 'string') {
              updatedAtDate = new Date(data.updatedAt).toISOString();
            } else if (typeof data.updatedAt === 'number') {
              updatedAtDate = new Date(data.updatedAt).toISOString();
            }
          } catch (error) {
            console.error('❌ Admin: Error converting updatedAt:', data.updatedAt, error);
            updatedAtDate = new Date().toISOString();
          }
        }

        videos.push({
          id: doc.id,
          title: data.title || 'Untitled Video',
          description: data.description || '',
          videoUrl: data.videoUrl || '',
          thumbnail: data.thumbnailUrl || '', // Map from talentVideos: thumbnailUrl
          category: data.sport || '', // Map from talentVideos: sport
          userName: data.userId || 'Unknown User', // Use userId as name
          userId: data.userId || '',
          userEmail: data.userId || '', // Use userId as email identifier
          verificationStatus: data.verificationStatus || 'pending',
          isFlagged: data.isFlagged || false,
          createdAt: createdAtDate,
          updatedAt: updatedAtDate,
          isVerified: data.verificationStatus === 'verified', // Derive from verificationStatus
          isActive: data.verificationStatus !== 'rejected' // Derive from verificationStatus
        } as TalentVideo);
      });

      console.log('✅ Admin: Videos processed successfully. Total:', videos.length);
      return videos;
    } catch (error) {
      console.error('❌ Admin: Error getting all videos from Firebase:', error);
      console.error('❌ Admin: Error details:', error instanceof Error ? error.message : error);
      return [];
    }
  }
}

// Create singleton instance
export const videoVerificationService = new VideoVerificationService();
export default videoVerificationService;