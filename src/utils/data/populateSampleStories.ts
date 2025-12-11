import { db } from '../../lib/firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { sampleStories, sampleHighlights } from '../../data/sampleStories';

// Helper function to convert various timestamp formats to Date
const convertToDate = (timestamp: string | Date | any): Date => {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

export const populateSampleStories = async () => {
  try {// Test Firebase connection first
    try {
      const testDoc = doc(collection(db, 'test'), 'connection-test');
      await setDoc(testDoc, { timestamp: new Date(), test: true });// Clean up test doc
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(testDoc);
    } catch (connectionError) {
      console.error('❌ Firebase connection failed:', connectionError);
      throw new Error(`Firebase connection failed: ${connectionError.message}`);
    }
    
    // Convert sample data to Firestore format with better error handling
    const storiesPromises = sampleStories.map(async (story, index) => {
      try {// Validate story data
        if (!story.id || !story.userId || !story.userDisplayName) {
          throw new Error(`Invalid story data at index ${index}: missing required fields`);
        }
        
        const storyData = {
          userId: story.userId,
          userDisplayName: story.userDisplayName,
          userPhotoURL: story.userPhotoURL || '',
          mediaType: story.mediaType,
          mediaUrl: story.mediaUrl,
          caption: story.caption || '',
          timestamp: Timestamp.fromDate(convertToDate(story.timestamp)),
          expiresAt: Timestamp.fromDate(convertToDate(story.expiresAt)),
          viewCount: story.viewCount || 0,
          viewers: story.viewers || [],
          isHighlight: story.isHighlight || false,
          highlightId: story.highlightId || null,
          sharingEnabled: story.sharingEnabled !== false,
          publicLink: `https://amaplay007.web.app/story/${story.id}`
        };
        
        const storyRef = doc(collection(db, 'stories'), story.id);
        await setDoc(storyRef, storyData);return { success: true, storyId: story.id };
      } catch (error) {
        console.error(`❌ Failed to add story ${index + 1}:`, error);
        throw new Error(`Failed to add story "${story.userDisplayName}": ${error.message}`);
      }
    });

    // Wait for all stories to be added
    await Promise.all(storiesPromises);
    
    // Add sample highlights with better error handling
    const highlightsPromises = sampleHighlights.map(async (highlight, index) => {
      try {const highlightData = {
          ...highlight,
          createdAt: Timestamp.fromDate(convertToDate(highlight.createdAt)),
          updatedAt: Timestamp.fromDate(convertToDate(highlight.updatedAt))
        };
        
        const highlightRef = doc(collection(db, 'highlights'), highlight.id);
        await setDoc(highlightRef, highlightData);return { success: true, highlightId: highlight.id };
      } catch (error) {
        console.error(`❌ Failed to add highlight ${index + 1}:`, error);
        throw new Error(`Failed to add highlight "${highlight.title}": ${error.message}`);
      }
    });

    await Promise.all(highlightsPromises);console.log(`📊 Added ${sampleStories.length} stories and ${sampleHighlights.length} highlights`);
    
    return {
      success: true,
      storiesAdded: sampleStories.length,
      highlightsAdded: sampleHighlights.length
    };
    
  } catch (error) {
    console.error('❌ Error populating sample stories:', error);
    throw error;
  }
};

// Function to clear sample data (for testing)
export const clearSampleStories = async () => {
  try {const { deleteDoc } = await import('firebase/firestore');
    
    // Delete sample stories
    const deleteStoriesPromises = sampleStories.map(async (story) => {
      const storyRef = doc(collection(db, 'stories'), story.id);
      await deleteDoc(storyRef);
    });
    
    // Delete sample highlights
    const deleteHighlightsPromises = sampleHighlights.map(async (highlight) => {
      const highlightRef = doc(collection(db, 'highlights'), highlight.id);
      await deleteDoc(highlightRef);
    });
    
    await Promise.all([...deleteStoriesPromises, ...deleteHighlightsPromises]);} catch (error) {
    console.error('❌ Error clearing sample stories:', error);
    throw error;
  }
};

// Check if sample data already exists
export const checkSampleDataExists = async () => {
  try {
    const { getDoc } = await import('firebase/firestore');
    const sampleStoryRef = doc(collection(db, 'stories'), 'story1');
    const docSnap = await getDoc(sampleStoryRef);
    return docSnap.exists();
  } catch (error) {
    console.error('❌ Error checking sample data:', error);
    return false;
  }
};