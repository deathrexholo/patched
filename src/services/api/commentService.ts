// Centralized comment service for all content types (posts, stories, moments)
import {
  db,
} from '../../lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  increment,
  arrayUnion,
  arrayRemove,
  getDoc
} from 'firebase/firestore';
import notificationService from '../notificationService';

export type ContentType = 'post' | 'story' | 'moment';

export interface CommentData {
  text: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
}

export interface Comment extends CommentData {
  id: string;
  contentType: ContentType;
  contentId: string;
  timestamp: string;
  likes: string[]; // Array of user IDs who liked
  likesCount: number;
  replies: unknown[];
  edited?: boolean;
  editedAt?: string;
}

/**
 * Centralized Comment Service
 * Manages all comments across posts, stories, and moments
 * Provides real-time updates via Firebase listeners
 */
class CommentService {
  private static readonly COMMENTS_COLLECTION = 'comments';

  /**
   * Add a comment to any content type
   */
  static async addComment(
    contentId: string,
    contentType: ContentType,
    commentData: CommentData
  ): Promise<Comment> {
    try {
      const comment = {
        ...commentData,
        contentId,
        contentType,
        timestamp: new Date().toISOString(),
        likes: [],
        likesCount: 0,
        replies: [],
        edited: false
      };

      // Add comment to centralized comments collection
      const commentRef = await addDoc(
        collection(db, this.COMMENTS_COLLECTION),
        comment
      );// Update comment count on the content document
      await this.updateCommentCount(contentId, contentType, 1);

      // Send notification to content owner
      try {
        const ownerId = await this.getContentOwnerId(contentId, contentType);

        if (ownerId && ownerId !== commentData.userId) {
          if (contentType === 'story') {
            await notificationService.sendStoryCommentNotification(
              commentData.userId,
              commentData.userDisplayName,
              commentData.userPhotoURL || '',
              ownerId,
              contentId,
              commentData.text
            );
          } else if (contentType === 'moment') {
            await notificationService.sendMomentCommentNotification(
              commentData.userId,
              commentData.userDisplayName,
              commentData.userPhotoURL || '',
              ownerId,
              contentId,
              commentData.text
            );
          } else {
            // Post comments
            await notificationService.sendCommentNotification(
              commentData.userId,
              commentData.userDisplayName,
              commentData.userPhotoURL || '',
              ownerId,
              contentId,
              commentData.text
            );
          }
        }
      } catch (notificationError) {
        console.error('[CommentService] Failed to send comment notification:', {
          contentId,
          contentType,
          error: notificationError
        });
      }

      return {
        id: commentRef.id,
        ...comment
      } as Comment;
    } catch (error) {
      console.error(`❌ Error adding comment to ${contentType}:`, error);
      throw error;
    }
  }

  /**
   * Delete a comment
   */
  static async deleteComment(
    commentId: string,
    contentId: string,
    contentType: ContentType,
    userId: string
  ): Promise<void> {
    try {
      // Verify user owns the comment
      const commentRef = doc(db, this.COMMENTS_COLLECTION, commentId);
      const commentSnap = await getDoc(commentRef);

      if (!commentSnap.exists()) {
        throw new Error('Comment not found');
      }

      const commentData = commentSnap.data();
      if (commentData.userId !== userId) {
        throw new Error('Unauthorized to delete this comment');
      }

      // Delete the comment
      await deleteDoc(commentRef);

      // Update comment count
      await this.updateCommentCount(contentId, contentType, -1);} catch (error) {
      console.error('❌ Error deleting comment:', error);
      throw error;
    }
  }

  /**
   * Edit a comment
   */
  static async editComment(
    commentId: string,
    newText: string,
    userId: string
  ): Promise<void> {
    try {
      const commentRef = doc(db, this.COMMENTS_COLLECTION, commentId);
      const commentSnap = await getDoc(commentRef);

      if (!commentSnap.exists()) {
        throw new Error('Comment not found');
      }

      const commentData = commentSnap.data();
      if (commentData.userId !== userId) {
        throw new Error('Unauthorized to edit this comment');
      }

      // Update comment
      await updateDoc(commentRef, {
        text: newText.trim(),
        edited: true,
        editedAt: new Date().toISOString()
      });} catch (error) {
      console.error('❌ Error editing comment:', error);
      throw error;
    }
  }

  /**
   * Toggle like on a comment
   */
  static async toggleCommentLike(
    commentId: string,
    userId: string
  ): Promise<void> {
    try {
      const commentRef = doc(db, this.COMMENTS_COLLECTION, commentId);
      const commentSnap = await getDoc(commentRef);

      if (!commentSnap.exists()) {
        throw new Error('Comment not found');
      }

      const commentData = commentSnap.data();
      const likes = commentData.likes || [];
      const hasLiked = likes.includes(userId);

      if (hasLiked) {
        // Unlike
        await updateDoc(commentRef, {
          likes: arrayRemove(userId),
          likesCount: Math.max(0, (commentData.likesCount || 0) - 1)
        });} else {
        // Like
        await updateDoc(commentRef, {
          likes: arrayUnion(userId),
          likesCount: (commentData.likesCount || 0) + 1
        });}
    } catch (error) {
      console.error('❌ Error toggling comment like:', error);
      throw error;
    }
  }

  /**
   * Get all comments for a content item
   */
  static async getCommentsByContentId(
    contentId: string,
    contentType: ContentType
  ): Promise<Comment[]> {
    try {
      const q = query(
        collection(db, this.COMMENTS_COLLECTION),
        where('contentId', '==', contentId),
        where('contentType', '==', contentType),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(q);
      const comments: Comment[] = [];

      snapshot.forEach(doc => {
        comments.push({
          id: doc.id,
          ...doc.data()
        } as Comment);
      });return comments;
    } catch (error) {
      console.error('❌ Error fetching comments:', error);
      throw error;
    }
  }

  /**
   * Get content owner ID based on content type
   * @private
   */
  private static async getContentOwnerId(
    contentId: string,
    contentType: ContentType
  ): Promise<string | null> {
    try {
      const collectionName = contentType === 'post' ? 'posts'
        : contentType === 'story' ? 'stories'
        : 'moments';

      const docRef = doc(db, collectionName, contentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data()?.userId || null;
      }
      return null;
    } catch (error) {
      console.error('[CommentService] Failed to get content owner:', error);
      return null;
    }
  }

  /**
   * Update comment count on content document
   * @private
   */
  private static async updateCommentCount(
    contentId: string,
    contentType: ContentType,
    delta: number
  ): Promise<void> {
    try {
      let collectionName = '';

      switch (contentType) {
        case 'post':
          collectionName = 'posts';
          break;
        case 'story':
          collectionName = 'stories';
          break;
        case 'moment':
          collectionName = 'moments';
          break;
        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }

      const contentRef = doc(db, collectionName, contentId);
      const contentSnap = await getDoc(contentRef);

      if (contentSnap.exists()) {
        const currentCount = contentSnap.data().commentsCount || 0;
        const newCount = Math.max(0, currentCount + delta);

        await updateDoc(contentRef, {
          commentsCount: newCount
        });}
    } catch (error) {
      console.error('❌ Error updating comment count:', error);
      // Don't throw - this shouldn't fail the comment operation
    }
  }
}

export default CommentService;
