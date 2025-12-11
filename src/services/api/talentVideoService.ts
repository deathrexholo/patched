import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TalentVideo, VideoVerification } from '../../features/profile/types/TalentVideoTypes';

/**
 * Service for managing talent videos in the talentVideos collection
 *
 * Architecture:
 * - Talent videos stored in separate 'talentVideos' collection
 * - NOT embedded in user documents
 * - Each video document indexed by userId for efficient queries
 * - Supports real-time listeners for profile updates
 */
class TalentVideoService {
  private readonly COLLECTION_NAME = 'talentVideos';

  /**
   * Add a new talent video to the collection
   */
  async addTalentVideo(userId: string, videoData: TalentVideo): Promise<string> {
    try {
      const talentVideosRef = collection(db, this.COLLECTION_NAME);

      const docData = {
        ...videoData,
        userId,
        uploadDate: videoData.uploadDate instanceof Date
          ? Timestamp.fromDate(videoData.uploadDate)
          : videoData.uploadDate,
        verificationDeadline: videoData.verificationDeadline instanceof Date
          ? Timestamp.fromDate(videoData.verificationDeadline)
          : videoData.verificationDeadline,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Use custom document ID (videoData.id) to match shareable link format
      const customVideoId = docData.id;
      await setDoc(
        doc(db, this.COLLECTION_NAME, customVideoId),
        docData
      );return customVideoId;
    } catch (error) {
      console.error('❌ Error adding talent video:', error);
      throw error;
    }
  }

  /**
   * Update talent video metadata (title, description, skills, etc.)
   */
  async updateTalentVideo(videoId: string, updates: Partial<TalentVideo>): Promise<void> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);

      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      // Convert Date objects to Timestamps
      if (updates.uploadDate instanceof Date) {
        updateData.uploadDate = Timestamp.fromDate(updates.uploadDate);
      }
      if (updates.verificationDeadline instanceof Date) {
        updateData.verificationDeadline = Timestamp.fromDate(updates.verificationDeadline);
      }

      await updateDoc(videoRef, updateData);} catch (error) {
      console.error('❌ Error updating talent video:', error);
      throw error;
    }
  }

  /**
   * Delete a talent video from the collection
   */
  async deleteTalentVideo(videoId: string): Promise<void> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      await deleteDoc(videoRef);} catch (error) {
      console.error('❌ Error deleting talent video:', error);
      throw error;
    }
  }

  /**
   * Get all talent videos for a specific user
   */
  async getUserTalentVideos(userId: string): Promise<TalentVideo[]> {
    try {
      const talentVideosRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        talentVideosRef,
        where('userId', '==', userId),
        orderBy('uploadDate', 'desc')
      );

      const snapshot = await getDocs(q);
      const videos: TalentVideo[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        videos.push({
          ...data,
          id: doc.id,
          uploadDate: data.uploadDate?.toDate() || new Date(),
          verificationDeadline: data.verificationDeadline?.toDate() || undefined
        } as TalentVideo);
      });

      return videos;
    } catch (error) {
      console.error('❌ Error fetching user talent videos:', error);
      return [];
    }
  }

  /**
   * Set up real-time listener for user's talent videos
   * Returns unsubscribe function for cleanup
   */
  listenToUserTalentVideos(
    userId: string,
    onVideosUpdate: (videos: TalentVideo[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    try {
      const talentVideosRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        talentVideosRef,
        where('userId', '==', userId),
        orderBy('uploadDate', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const videos: TalentVideo[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            videos.push({
              ...data,
              id: doc.id,
              uploadDate: data.uploadDate?.toDate() || new Date(),
              verificationDeadline: data.verificationDeadline?.toDate() || undefined
            } as TalentVideo);
          });
          onVideosUpdate(videos);
        },
        (error) => {
          console.error('❌ Error in talent videos listener:', error);
          if (onError) onError(error as Error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up talent videos listener:', error);
      return () => {}; // Return no-op unsubscribe
    }
  }

  /**
   * Get a specific talent video by ID (queries by document ID field in the collection)
   */
  async getTalentVideo(videoId: string): Promise<TalentVideo | null> {
    try {
      const talentVideosRef = collection(db, this.COLLECTION_NAME);
      const videoQuery = query(talentVideosRef, where('id', '==', videoId));
      const snapshot = await getDocs(videoQuery);

      if (snapshot.empty) return null;

      const documentSnapshot = snapshot.docs[0];
      const videoData = documentSnapshot.data();

      return {
        ...videoData,
        id: documentSnapshot.id,
        uploadDate: videoData.uploadDate?.toDate() || new Date(),
        verificationDeadline: videoData.verificationDeadline?.toDate() || undefined
      } as TalentVideo;
    } catch (error) {
      console.error('❌ Error fetching talent video:', error);
      return null;
    }
  }

  /**
   * Add verification to a talent video
   */
  async addVerification(
    videoId: string,
    verification: VideoVerification
  ): Promise<void> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);

      const verificationWithTimestamp = {
        ...verification,
        verifiedAt: verification.verifiedAt instanceof Date
          ? Timestamp.fromDate(verification.verifiedAt)
          : verification.verifiedAt
      };

      // Get current document to access verifications array
      const videoSnap = await getDocs(query(collection(db, this.COLLECTION_NAME), where('id', '==', videoId)));

      if (!videoSnap.empty) {
        const currentData = videoSnap.docs[0].data();
        const currentVerifications = currentData.verifications || [];

        // Add new verification if not already present
        const updatedVerifications = currentVerifications.some(
          (v: VideoVerification) => v.verifierId === verification.verifierId
        ) ? currentVerifications : [...currentVerifications, verificationWithTimestamp];

        await updateDoc(videoRef, {
          verifications: updatedVerifications,
          updatedAt: Timestamp.now()
        });}
    } catch (error) {
      console.error('❌ Error adding verification:', error);
      throw error;
    }
  }

  /**
   * Update video verification status
   */
  async updateVerificationStatus(
    videoId: string,
    status: 'pending' | 'verified' | 'rejected'
  ): Promise<void> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      await updateDoc(videoRef, {
        verificationStatus: status,
        updatedAt: Timestamp.now()
      });} catch (error) {
      console.error('❌ Error updating verification status:', error);
      throw error;
    }
  }

  /**
   * Increment view count for a talent video
   */
  async incrementViewCount(videoId: string): Promise<void> {
    try {
      const videoRef = doc(db, this.COLLECTION_NAME, videoId);
      // Note: This should ideally use increment() but we're using a simpler approach
      await updateDoc(videoRef, {
        viewCount: (await getDocs(query(collection(db, this.COLLECTION_NAME))))
          .docs.find(d => d.id === videoId)?.data().viewCount || 0 + 1,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('❌ Error incrementing view count:', error);
    }
  }
}

export const talentVideoService = new TalentVideoService();
export default talentVideoService;
