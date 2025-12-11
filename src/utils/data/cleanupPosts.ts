// Cleanup utility to remove corrupted post comment data
import { db } from '../../lib/firebase';
import { collection, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import logger from '../logging/LoggingManager';

export const cleanupCorruptedPostComments = async () => {
  try {
    logger.cleanup('Starting post comments cleanup...');
    
    // Query all posts
    const postsRef = collection(db, 'posts');
    const snapshot = await getDocs(postsRef);
    
    let updatedCount = 0;
    let checkedCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      checkedCount++;
      const data = docSnapshot.data();
      
      // Check if comments array exists and has objects with postId
      if (data.comments && Array.isArray(data.comments)) {
        let hasCorruptedComments = false;
        
        const cleanedComments = data.comments.map((comment) => {
          if (typeof comment === 'object' && comment !== null && comment.postId) {
            logger.cleanup('Found corrupted comment with postId:', comment.postId);
            hasCorruptedComments = true;
            
            // Remove postId and ensure all fields are strings
            const { postId, ...cleanComment } = comment;
            return {
              text: String(cleanComment.text || ''),
              userId: String(cleanComment.userId || ''),
              userDisplayName: String(cleanComment.userDisplayName || 'Unknown User'),
              userPhotoURL: String(cleanComment.userPhotoURL || ''),
              timestamp: cleanComment.timestamp || null
            };
          }
          return comment;
        });
        
        if (hasCorruptedComments) {
          logger.cleanup('Updating post:', docSnapshot.id);
          await updateDoc(doc(db, 'posts', docSnapshot.id), {
            comments: cleanedComments
          });
          updatedCount++;
        }
      }
    }
    
    logger.cleanup('Post comments cleanup complete:', {
      checked: checkedCount,
      updated: updatedCount,
      remaining: checkedCount - updatedCount
    });
    
    return { checked: checkedCount, updated: updatedCount };
    
  } catch (error) {
    console.error('❌ Error during post comments cleanup:', error);
    throw error;
  }
};

// Cleanup a specific post's comments
export const cleanupPostComments = async (postId) => {
  try {
    logger.cleanup('Cleaning up comments for post:', postId);
    
    const postDoc = await getDoc(doc(db, 'posts', postId));
    if (!postDoc.exists()) {
      logger.cleanup('Post not found:', postId);
      return;
    }
    
    const data = postDoc.data();
    if (data.comments && Array.isArray(data.comments)) {
      const cleanedComments = data.comments.map((comment) => {
        if (typeof comment === 'object' && comment !== null && comment.postId) {
          logger.cleanup('Removing postId from comment');
          const { postId, ...cleanComment } = comment;
          return {
            text: String(cleanComment.text || ''),
            userId: String(cleanComment.userId || ''),
            userDisplayName: String(cleanComment.userDisplayName || 'Unknown User'),
            userPhotoURL: String(cleanComment.userPhotoURL || ''),
            timestamp: cleanComment.timestamp || null
          };
        }
        return comment;
      });
      
      await updateDoc(doc(db, 'posts', postId), {
        comments: cleanedComments
      });
      
      logger.cleanup('Post comments cleaned for:', postId);
    }
    
  } catch (error) {
    console.error('❌ Error cleaning post comments:', error);
    throw error;
  }
};