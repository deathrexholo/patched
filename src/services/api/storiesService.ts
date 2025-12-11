// Stories Service - Firebase operations for Stories feature
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  onSnapshot,
  getDoc,
  Unsubscribe
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { Story } from '../../types/models/story';

/**
 * Story creation result
 */
interface StoryCreationResult extends Omit<Story, 'timestamp' | 'expiresAt'> {
  timestamp: ReturnType<typeof serverTimestamp>;
  expiresAt: Timestamp;
}

/**
 * Highlight data structure
 */
interface Highlight {
  id: string;
  userId: string;
  title: string;
  coverImage: string;
  storyIds: string[];
  createdAt: ReturnType<typeof serverTimestamp> | Date;
  updatedAt: ReturnType<typeof serverTimestamp> | Date;
  isPublic: boolean;
}

/**
 * Stories Service - Firebase operations for Stories feature
 */
export class StoriesService {
  
  /**
   * Create a new story
   */
  static async createStory(
    userId: string,
    userDisplayName: string,
    userPhotoURL: string | null,
    mediaFile: File,
    caption: string = '',
    mediaType: 'image' | 'video' = 'image'
  ): Promise<StoryCreationResult> {
    try {// Upload media file
      const mediaUrl = await this.uploadStoryMedia(mediaFile, userId, mediaType);
      
      // Generate thumbnail for videos
      let thumbnail: string | null = null;
      if (mediaType === 'video') {
        thumbnail = await this.generateVideoThumbnail(mediaFile);
      }
      
      // Calculate expiry time (24 hours from now)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
      
      // Generate public link
      const storyId = `story_${userId}_${Date.now()}`;
      const publicLink = `${window.location.origin}/story/${storyId}`;
      
      // Create story document
      const storyData = {
        userId,
        userDisplayName: userDisplayName || 'Anonymous User',
        userPhotoURL: userPhotoURL || '',
        mediaType,
        mediaUrl,
        thumbnail,
        caption: caption.trim(),
        timestamp: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        viewCount: 0,
        viewers: [],
        isHighlight: false,
        highlightId: null,
        sharingEnabled: true,
        publicLink
      };
      
      const docRef = await addDoc(collection(db, 'stories'), storyData);return { id: docRef.id, ...storyData };
      
    } catch (error) {
      console.error('❌ Error creating story:', error);
      throw error;
    }
  }
  
  /**
   * Upload story media to Firebase Storage
   */
  static async uploadStoryMedia(mediaFile: File, userId: string, mediaType: 'image' | 'video'): Promise<string> {
    try {
      const safeFileName = mediaFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageRef = ref(storage, `stories/${mediaType}s/${userId}/${Date.now()}-${safeFileName}`);const uploadResult = await uploadBytes(storageRef, mediaFile);
      const downloadUrl = await getDownloadURL(uploadResult.ref);return downloadUrl;
      
    } catch (error) {
      console.error('❌ Error uploading story media:', error);
      throw error;
    }
  }
  
  /**
   * Generate video thumbnail (placeholder implementation)
   */
  static async generateVideoThumbnail(_videoFile: File): Promise<string> {
    // TODO: Implement proper video thumbnail generation
    // For now, return a local placeholder
    return '/assets/placeholders/default-post.svg';
  }
  
  /**
   * Get active stories (not expired)
   */
  static async getActiveStories(): Promise<Story[]> {
    try {
      const now = new Date();
      const q = query(
        collection(db, 'stories'),
        where('expiresAt', '>', Timestamp.fromDate(now)),
        orderBy('expiresAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const stories: Story[] = [];
      
      snapshot.forEach((doc) => {
        stories.push({ id: doc.id, ...doc.data() } as Story);
      });
      
      // Sort by timestamp in memory (most recent first)
      stories.sort((a, b) => {
        const timeA = a.timestamp && typeof a.timestamp === 'object' && 'toDate' in a.timestamp 
          ? a.timestamp.toDate().getTime() 
          : 0;
        const timeB = b.timestamp && typeof b.timestamp === 'object' && 'toDate' in b.timestamp 
          ? b.timestamp.toDate().getTime() 
          : 0;
        return timeB - timeA;
      });return stories;
      
    } catch (error) {
      console.error('❌ Error fetching active stories:', error);
      return [];
    }
  }
  
  /**
   * Get stories by user ID
   */
  static async getUserStories(userId: string): Promise<Story[]> {
    try {
      const now = new Date();
      
      // Use simpler query to avoid index requirement, then filter in memory
      const q = query(
        collection(db, 'stories'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      const stories: Story[] = [];
      
      snapshot.forEach((doc) => {
        const storyData = { id: doc.id, ...doc.data() } as Story;
        
        // Filter expired stories in memory
        const expiresAt = storyData.expiresAt && typeof storyData.expiresAt === 'object' && 'toDate' in storyData.expiresAt
          ? storyData.expiresAt.toDate() 
          : new Date(storyData.expiresAt as unknown as string);
        if (expiresAt > now) {
          stories.push(storyData);
        }
      });
      
      // Sort by timestamp in memory
      stories.sort((a, b) => {
        const timeA = a.timestamp && typeof a.timestamp === 'object' && 'toDate' in a.timestamp 
          ? a.timestamp.toDate().getTime() 
          : 0;
        const timeB = b.timestamp && typeof b.timestamp === 'object' && 'toDate' in b.timestamp 
          ? b.timestamp.toDate().getTime() 
          : 0;
        return timeB - timeA; // Descending order
      });return stories;
      
    } catch (error) {
      console.error('❌ Error fetching user stories:', error);
      return [];
    }
  }
  
  /**
   * View a story (increment view count and add viewer)
   */
  static async viewStory(storyId: string, viewerId: string): Promise<void> {
    try {
      const storyRef = doc(db, 'stories', storyId);
      const storyDoc = await getDoc(storyRef);
      
      if (!storyDoc.exists()) {
        throw new Error('Story not found');
      }
      
      const storyData = storyDoc.data();
      const viewers = (storyData.viewers as string[]) || [];
      
      // Only count unique views
      if (!viewers.includes(viewerId)) {
        await updateDoc(storyRef, {
          viewCount: (storyData.viewCount || 0) + 1,
          viewers: [...viewers, viewerId]
        });
        
        // Log view for analytics
        await addDoc(collection(db, 'storyViews'), {
          storyId,
          viewerId,
          viewedAt: serverTimestamp(),
          viewDuration: 0 // Will be updated when story viewing ends
        });}
      
    } catch (error) {
      console.error('❌ Error recording story view:', error);
    }
  }
  
  /**
   * Delete a story
   */
  static async deleteStory(storyId: string, userId: string): Promise<void> {
    try {
      const storyRef = doc(db, 'stories', storyId);
      const storyDoc = await getDoc(storyRef);
      
      if (!storyDoc.exists()) {
        throw new Error('Story not found');
      }
      
      const storyData = storyDoc.data();
      
      // Only allow story owner to delete
      if (storyData.userId !== userId) {
        throw new Error('Not authorized to delete this story');
      }
      
      await deleteDoc(storyRef);} catch (error) {
      console.error('❌ Error deleting story:', error);
      throw error;
    }
  }
  
  /**
   * Get expired stories for cleanup
   */
  static async getExpiredStories(): Promise<Story[]> {
    try {
      const now = new Date();
      const q = query(
        collection(db, 'stories'),
        where('expiresAt', '<=', Timestamp.fromDate(now)),
        where('isHighlight', '==', false) // Don't delete highlighted stories
      );
      
      const snapshot = await getDocs(q);
      const expiredStories: Story[] = [];
      
      snapshot.forEach((doc) => {
        expiredStories.push({ id: doc.id, ...doc.data() } as Story);
      });
      
      return expiredStories;
      
    } catch (error) {
      console.error('❌ Error fetching expired stories:', error);
      return [];
    }
  }
  
  /**
   * Real-time listener for active stories
   */
  static onActiveStoriesUpdate(callback: (stories: Story[]) => void): Unsubscribe {
    try {
      const now = new Date();
      const q = query(
        collection(db, 'stories'),
        where('expiresAt', '>', Timestamp.fromDate(now)),
        orderBy('expiresAt', 'desc')
      );
      
      return onSnapshot(q, (snapshot) => {
        const stories: Story[] = [];
        snapshot.forEach((doc) => {
          stories.push({ id: doc.id, ...doc.data() } as Story);
        });
        
        // Sort by timestamp in memory (most recent first)
        stories.sort((a, b) => {
          const timeA = a.timestamp && typeof a.timestamp === 'object' && 'toDate' in a.timestamp 
            ? a.timestamp.toDate().getTime() 
            : 0;
          const timeB = b.timestamp && typeof b.timestamp === 'object' && 'toDate' in b.timestamp 
            ? b.timestamp.toDate().getTime() 
            : 0;
          return timeB - timeA;
        });
        
        callback(stories);
      });
      
    } catch (error) {
      console.error('❌ Error setting up stories listener:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }
}

/**
 * Highlights Service
 */
export class HighlightsService {
  
  /**
   * Create a new highlight
   */
  static async createHighlight(
    userId: string,
    title: string,
    coverImage: string,
    storyIds: string[] = []
  ): Promise<Highlight> {
    try {
      const highlightData = {
        userId,
        title: title.trim(),
        coverImage: coverImage || '',
        storyIds: storyIds,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPublic: true
      };
      
      const docRef = await addDoc(collection(db, 'highlights'), highlightData);
      
      // Mark stories as highlights
      for (const storyId of storyIds) {
        await updateDoc(doc(db, 'stories', storyId), {
          isHighlight: true,
          highlightId: docRef.id
        });
      }return { id: docRef.id, ...highlightData };
      
    } catch (error) {
      console.error('❌ Error creating highlight:', error);
      throw error;
    }
  }
  
  /**
   * Get user highlights
   */
  static async getUserHighlights(userId: string): Promise<Highlight[]> {
    try {
      const q = query(
        collection(db, 'highlights'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const highlights: Highlight[] = [];
      
      snapshot.forEach((doc) => {
        highlights.push({ id: doc.id, ...doc.data() } as Highlight);
      });
      
      return highlights;
      
    } catch (error) {
      console.error('❌ Error fetching highlights:', error);
      return [];
    }
  }
  
  /**
   * Add story to highlight
   */
  static async addStoryToHighlight(highlightId: string, storyId: string): Promise<void> {
    try {
      const highlightRef = doc(db, 'highlights', highlightId);
      const highlightDoc = await getDoc(highlightRef);
      
      if (!highlightDoc.exists()) {
        throw new Error('Highlight not found');
      }
      
      const highlightData = highlightDoc.data();
      const currentStoryIds = (highlightData.storyIds as string[]) || [];
      
      if (!currentStoryIds.includes(storyId)) {
        await updateDoc(highlightRef, {
          storyIds: [...currentStoryIds, storyId],
          updatedAt: serverTimestamp()
        });
        
        // Mark story as highlight
        await updateDoc(doc(db, 'stories', storyId), {
          isHighlight: true,
          highlightId: highlightId
        });}
      
    } catch (error) {
      console.error('❌ Error adding story to highlight:', error);
      throw error;
    }
  }
  
  /**
   * Remove story from highlight
   */
  static async removeStoryFromHighlight(highlightId: string, storyId: string): Promise<void> {
    try {
      const highlightRef = doc(db, 'highlights', highlightId);
      const highlightDoc = await getDoc(highlightRef);
      
      if (!highlightDoc.exists()) {
        throw new Error('Highlight not found');
      }
      
      const highlightData = highlightDoc.data();
      const currentStoryIds = (highlightData.storyIds as string[]) || [];
      const updatedStoryIds = currentStoryIds.filter(id => id !== storyId);
      
      await updateDoc(highlightRef, {
        storyIds: updatedStoryIds,
        updatedAt: serverTimestamp()
      });
      
      // Unmark story as highlight
      await updateDoc(doc(db, 'stories', storyId), {
        isHighlight: false,
        highlightId: null
      });} catch (error) {
      console.error('❌ Error removing story from highlight:', error);
      throw error;
    }
  }
}

export default StoriesService;
