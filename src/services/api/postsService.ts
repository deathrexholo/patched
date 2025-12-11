// Posts service with business logic and enhanced engagement data fetching
import { BaseService, FirestoreFilter } from './baseService';
import { COLLECTIONS } from '../../constants/firebase';
import { storage, db } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  doc,
  getDoc,
  getDocs,
  query,
  collection,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  DocumentSnapshot,
  Timestamp,
  arrayUnion,
  increment,
  updateDoc
} from 'firebase/firestore';
import { Post, CreatePostData, Like, Comment as PostComment, MediaType } from '../../types/models/post';
import { 
  sanitizeEngagementData, 
  hasUserLikedPost, 
  hasUserSharedPost,
  validatePostEngagement 
} from '../../utils/validation/engagementValidation';

/**
 * Media upload result
 */
interface MediaUploadResult {
  url: string;
  metadata: {
    size: number;
    type: string;
    name: string;
    uploadedAt: string;
  };
}

/**
 * Like toggle result
 */
interface LikeToggleResult {
  liked: boolean;
  likesCount: number;
}

/**
 * Comment data structure
 */
interface CommentData {
  text: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
}

/**
 * Comment with metadata
 */
interface Comment extends CommentData {
  id: string;
  timestamp: string;
  likes: unknown[];
  replies: unknown[];
}

/**
 * User info for like operations
 */
interface UserInfo {
  displayName: string;
  photoURL: string | null;
}

/**
 * Enhanced engagement metrics interface
 */
interface EngagementMetrics {
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked?: boolean;
  hasShared?: boolean;
}

/**
 * Posts query options for enhanced data fetching
 */
interface PostsQueryOptions {
  includeEngagementMetrics?: boolean;
  currentUserId?: string;
  limit?: number;
  startAfter?: DocumentSnapshot;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Paginated posts result with engagement data
 */
interface PaginatedPostsResult {
  posts: Post[];
  lastDocument: DocumentSnapshot | null;
  hasMore: boolean;
  totalCount?: number;
}

/**
 * Posts service providing business logic for post operations with enhanced engagement data fetching
 */
class PostsService extends BaseService<Post> {
  constructor() {
    super(COLLECTIONS.POSTS);
  }

  /**
   * Enhance post data with accurate engagement metrics using validation utilities
   */
  private enhancePostWithEngagement(postData: any, currentUserId?: string): Post {
    // Debug: Log raw post data comments
    if (process.env.NODE_ENV === 'development' && postData.comments?.length > 0) {}

    // First sanitize and validate the engagement data
    const sanitizedPost = sanitizeEngagementData(postData);

    // Debug: Log sanitized comments
    if (process.env.NODE_ENV === 'development' && sanitizedPost.comments?.length > 0) {}

    // Add user interaction states
    const isLiked = currentUserId ? hasUserLikedPost(sanitizedPost.likes, currentUserId) : false;
    const hasShared = currentUserId ? hasUserSharedPost(sanitizedPost.shares, currentUserId) : false;

    // Return enhanced post with user interaction states
    return {
      ...sanitizedPost,
      isLiked,
      hasShared
    } as Post;
  }

  /**
   * Get posts with enhanced engagement data fetching
   */
  async getPostsWithEngagement(options: PostsQueryOptions = {}): Promise<PaginatedPostsResult> {
    try {
      const {
        includeEngagementMetrics = true,
        currentUserId,
        limit = 20,
        startAfter: startAfterDoc,
        orderBy: orderByField = 'timestamp',
        orderDirection = 'desc'
      } = options;

      let q;
      if (startAfterDoc) {
        q = query(
          collection(db, this.collectionName),
          orderBy(orderByField, orderDirection),
          startAfter(startAfterDoc),
          firestoreLimit(limit)
        );
      } else {
        q = query(
          collection(db, this.collectionName),
          orderBy(orderByField, orderDirection),
          firestoreLimit(limit)
        );
      }
      
      // Filter out inactive posts after fetching (if isActive field exists)
      // This is more flexible than using a where clause

      const querySnapshot = await getDocs(q);

      const posts: Post[] = [];
      let lastDocument: DocumentSnapshot | null = null;

      for (const docSnapshot of querySnapshot.docs) {
        const docData = docSnapshot.data() as Record<string, any>;
        const postData = { id: docSnapshot.id, ...docData };
        
        // Skip inactive posts if isActive field exists and is false
        if ('isActive' in docData && docData.isActive === false) {
          continue;
        }
        
        if (includeEngagementMetrics) {
          const enhancedPost = this.enhancePostWithEngagement(postData, currentUserId);
          posts.push(enhancedPost);
        } else {
          posts.push(postData as Post);
        }
        
        lastDocument = docSnapshot;
      }

      const hasMore = posts.length === limit;return {
        posts,
        lastDocument,
        hasMore
      };
    } catch (error) {
      console.error('❌ Error fetching posts with engagement:', error);
      throw error;
    }
  }

  /**
   * Extract video duration from video file
   */
  private async extractVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = Math.round(video.duration);resolve(duration);
      };

      video.onerror = () => {
        console.warn('⚠️ Could not extract video duration, defaulting to 0');
        resolve(0);
      };

      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create post with optional media upload
   */
  async createPost(postData: CreatePostData, mediaFile: File | null = null): Promise<Post> {
    try {
      let mediaUrl: string | null = null;
      let mediaMetadata: MediaUploadResult['metadata'] | null = null;
      let type: 'image' | 'video' | 'text' = 'text';
      let duration = 0;

      // Upload media if provided
      if (mediaFile) {
        const uploadResult = await this.uploadMedia(mediaFile);
        mediaUrl = uploadResult.url;
        mediaMetadata = uploadResult.metadata;

        // Detect media type
        if (mediaFile.type.startsWith('video/')) {
          type = 'video';
          // Extract video duration
          duration = await this.extractVideoDuration(mediaFile);} else if (mediaFile.type.startsWith('image/')) {
          type = 'image';}
      }

      // Override with user-provided type/duration if available
      if (postData.type) {
        type = postData.type;
      }
      if (postData.duration !== undefined) {
        duration = postData.duration;
      }

      const postDoc = {
        ...postData,
        mediaUrl,
        mediaMetadata,
        // Add video-specific fields for moments feed compatibility
        videoUrl: type === 'video' ? mediaUrl : null,
        type,
        duration,
        videoDuration: duration,
        mediaUrls: mediaUrl ? [mediaUrl] : [],
        mediaType: type === 'video' ? 'video' as MediaType : (type === 'image' ? 'image' as MediaType : undefined),
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        likes: [],
        comments: [],
        shares: [],
        visibility: postData.visibility || 'public',
        isActive: true,
      };

      const result = await this.create(postDoc as Omit<Post, 'id'>);return result;
    } catch (error) {
      console.error('❌ Error creating post:', error);
      throw error;
    }
  }

  /**
   * Upload media file to Firebase Storage
   */
  async uploadMedia(file: File): Promise<MediaUploadResult> {
    try {
      const filename = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `posts/${filename}`);const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      const metadata: MediaUploadResult['metadata'] = {
        size: file.size,
        type: file.type,
        name: file.name,
        uploadedAt: new Date().toISOString(),
      };return { url: downloadURL, metadata };
    } catch (error) {
      console.error('❌ Error uploading media:', error);
      throw error;
    }
  }

  /**
   * Get posts by user ID with enhanced engagement metrics
   */
  async getPostsByUser(userId: string, limit: number = 20, currentUserId?: string): Promise<Post[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('timestamp', 'desc'),
        firestoreLimit(limit)
      );

      const querySnapshot = await getDocs(q);
      const posts: Post[] = [];

      querySnapshot.forEach((doc) => {
        const postData = { id: doc.id, ...doc.data() };
        const enhancedPost = this.enhancePostWithEngagement(postData, currentUserId);
        posts.push(enhancedPost);
      });return posts;
    } catch (error) {
      console.error('❌ Error getting user posts with engagement:', error);
      throw error;
    }
  }

  /**
   * Get feed posts for user (following + own posts) with enhanced engagement metrics
   */
  async getFeedPosts(userId: string, followingList: string[] = [], limit: number = 20): Promise<Post[]> {
    try {
      // Get user's own posts with engagement metrics
      const userPosts = await this.getPostsByUser(userId, Math.ceil(limit / 2), userId);
      
      // Get posts from following users with engagement metrics
      let followingPosts: Post[] = [];
      if (followingList.length > 0) {
        // Firestore 'in' query limitation - max 10 items
        const chunks = this.chunkArray(followingList, 10);
        
        for (const chunk of chunks) {
          const q = query(
            collection(db, this.collectionName),
            where('userId', 'in', chunk),
            where('isActive', '==', true),
            orderBy('timestamp', 'desc'),
            firestoreLimit(Math.ceil(limit / 2))
          );

          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            const postData = { id: doc.id, ...doc.data() };
            const enhancedPost = this.enhancePostWithEngagement(postData, userId);
            followingPosts.push(enhancedPost);
          });
        }
      }

      // Combine and sort posts by timestamp
      const allPosts = [...userPosts, ...followingPosts]
        .sort((a, b) => {
          const getTimestamp = (timestamp: any): number => {
            if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
              return timestamp.seconds;
            }
            if (timestamp instanceof Date) {
              return timestamp.getTime() / 1000;
            }
            if (typeof timestamp === 'string') {
              return new Date(timestamp).getTime() / 1000;
            }
            return 0;
          };
          
          return getTimestamp(b.timestamp) - getTimestamp(a.timestamp);
        })
        .slice(0, limit);return allPosts;
    } catch (error) {
      console.error('❌ Error getting feed posts with engagement:', error);
      throw error;
    }
  }

  /**
   * Toggle like on a post
   */
  async toggleLike(postId: string, userId: string, userInfo: UserInfo): Promise<LikeToggleResult> {
    try {
      const post = await this.getById(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      const likes = (post.likes as unknown[]) || [];
      const isLiked = likes.some((like: any) => like.userId === userId);
      
      let updatedLikes: unknown[];
      let updatedLikesCount: number;

      if (isLiked) {
        // Unlike
        updatedLikes = likes.filter((like: any) => like.userId !== userId);
        updatedLikesCount = (post.likesCount || 0) - 1;} else {
        // Like
        const likeData = {
          userId,
          userName: userInfo.displayName,
          userPhotoURL: userInfo.photoURL,
          timestamp: new Date().toISOString(),
        };
        updatedLikes = [...likes, likeData];
        updatedLikesCount = (post.likesCount || 0) + 1;}

      await this.update(postId, {
        likes: updatedLikes,
        likesCount: Math.max(0, updatedLikesCount),
      } as Partial<Post>);

      return { liked: !isLiked, likesCount: updatedLikesCount };
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      throw error;
    }
  }

  /**
   * Add comment to post using atomic arrayUnion operation
   * This ensures real-time listeners fire when comments are added
   */
  async addComment(postId: string, commentData: CommentData): Promise<PostComment> {
    try {
      const comment: PostComment = {
        id: `comment_${Date.now()}`,
        text: commentData.text,
        userId: commentData.userId,
        userDisplayName: commentData.userDisplayName,
        userPhotoURL: commentData.userPhotoURL,
        timestamp: new Date().toISOString(),
        likes: [],
        replies: [],
      };// Use atomic arrayUnion operation to append comment
      // This triggers onSnapshot listeners automatically
      const postRef = doc(db, COLLECTIONS.POSTS, postId);await updateDoc(postRef, {
        comments: arrayUnion(comment),
        commentsCount: increment(1),
      });console.log('✅ Comment data:', comment);
      return comment;
    } catch (error) {
      console.error('❌ Error adding comment to post:', postId);
      console.error('❌ Error details:', error);
      throw error;
    }
  }

  /**
   * Delete comment from post
   */
  async deleteComment(postId: string, commentIndex: number, userId: string): Promise<void> {
    try {
      const post = await this.getById(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      const comments = (post.comments as unknown[]) || [];

      if (commentIndex < 0 || commentIndex >= comments.length) {
        throw new Error('Comment not found');
      }

      const comment = comments[commentIndex] as PostComment;

      // Check if user owns the comment or owns the post
      if (comment.userId !== userId && post.userId !== userId) {
        throw new Error('Unauthorized to delete this comment');
      }

      // Remove comment from array
      const updatedComments = comments.filter((_, index) => index !== commentIndex);

      // Ensure engagement metadata is accurate
      await this.update(postId, {
        comments: updatedComments as unknown,
        commentsCount: updatedComments.length,
        likesCount: (post.likes as unknown[] || []).length,
      } as Partial<Post>);} catch (error) {
      console.error('❌ Error deleting comment:', error);
      throw error;
    }
  }

  /**
   * Edit comment in post
   */
  async editComment(postId: string, commentIndex: number, userId: string, newText: string): Promise<void> {
    try {
      const post = await this.getById(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      const comments = (post.comments as unknown[]) || [];

      if (commentIndex < 0 || commentIndex >= comments.length) {
        throw new Error('Comment not found');
      }

      const comment = comments[commentIndex] as PostComment;

      // Check if user owns the comment
      if (comment.userId !== userId) {
        throw new Error('Unauthorized to edit this comment');
      }

      // Update comment text
      const updatedComments = comments.map((c: any, index: number) => {
        if (index === commentIndex) {
          return {
            ...(c as object),
            text: newText.trim(),
            edited: true,
            editedAt: new Date().toISOString()
          };
        }
        return c;
      });

      // Ensure engagement metadata is accurate
      await this.update(postId, {
        comments: updatedComments as unknown,
        commentsCount: updatedComments.length,
        likesCount: (post.likes as unknown[] || []).length,
      } as Partial<Post>);} catch (error) {
      console.error('❌ Error editing comment:', error);
      throw error;
    }
  }

  /**
   * Toggle like on a comment
   */
  async toggleCommentLike(postId: string, commentIndex: number, userId: string): Promise<void> {
    try {const post = await this.getById(postId);
      if (!post) {
        throw new Error('Post not found');
      }const comments = (post.comments as unknown[]) || [];

      if (commentIndex < 0 || commentIndex >= comments.length) {
        throw new Error(`Comment not found at index ${commentIndex}. Total comments: ${comments.length}`);
      }

      const comment = comments[commentIndex] as any;// Handle both string[] and object[] formats for likes
      const likes = (comment.likes || []) as any[];

      // Check if user has liked - support both formats
      const hasLiked = likes.some((like: any) =>
        typeof like === 'string'
          ? like === userId
          : like?.userId === userId
      );// Toggle like
      const updatedComments = comments.map((c: any, index: number) => {
        if (index === commentIndex) {
          const newLikes = hasLiked
            ? likes.filter((like: any) =>
                typeof like === 'string'
                  ? like !== userId
                  : like?.userId !== userId
              )
            : [...likes, userId];

          const updatedComment = {
            ...(c as object),
            likes: newLikes,
            likesCount: newLikes.length
          };return updatedComment;
        }
        return c;
      });

      // Ensure engagement metadata is accurate
      const updatePayload = {
        comments: updatedComments as unknown,
        commentsCount: updatedComments.length,
        likesCount: (post.likes as unknown[] || []).length,
      };

      // Debug: Log what we're savingconsole.log('📤 Full update payload being sent to Firestore:', JSON.stringify(updatePayload, null, 2));

      await this.update(postId, updatePayload as Partial<Post>);// Verify the update by re-fetching
      const verifyPost = await this.getById(postId);
      const verifyComment = (verifyPost?.comments as unknown[])?.[commentIndex] as any;} catch (error) {
      console.error('❌ Error toggling comment like:', error);
      throw error;
    }
  }

  /**
   * Delete post (soft delete)
   */
  async deletePost(postId: string, userId: string): Promise<boolean> {
    try {
      const post = await this.getById(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      if (post.userId !== userId) {
        throw new Error('Unauthorized to delete this post');
      }

      // Delete associated media from storage
      if (post.mediaUrl) {
        try {
          const mediaRef = ref(storage, post.mediaUrl);
          await deleteObject(mediaRef);} catch (error) {
          console.warn('⚠️ Could not delete media from storage:', error);
        }
      }

      // Soft delete - mark as inactive
      await this.update(postId, {
        isActive: false,
        deletedAt: new Date().toISOString(),
      } as Partial<Post>);return true;
    } catch (error) {
      console.error('❌ Error deleting post:', error);
      throw error;
    }
  }

  /**
   * Utility method to chunk arrays for Firestore 'in' queries
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get posts by user ID (alias for getPostsByUser for consistency with hook expectations)
   */
  async getUserPosts(userId: string, limit: number = 20, currentUserId?: string): Promise<Post[]> {
    return this.getPostsByUser(userId, limit, currentUserId);
  }

  /**
   * Get posts with pagination and enhanced engagement metrics
   */
  async getPosts(options: PostsQueryOptions = {}): Promise<PaginatedPostsResult> {
    return this.getPostsWithEngagement(options);
  }

  /**
   * Get single post by ID with enhanced engagement metrics
   */
  async getPostById(postId: string, currentUserId?: string): Promise<Post | null> {
    try {
      const docRef = doc(db, this.collectionName, postId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const postData = { id: docSnap.id, ...docSnap.data() };
        const enhancedPost = this.enhancePostWithEngagement(postData, currentUserId);return enhancedPost;
      } else {
        console.warn(`⚠️ Post not found: ${postId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error getting post ${postId} with engagement:`, error);
      throw error;
    }
  }


  /**
   * Search posts by caption with enhanced engagement metrics
   */
  async searchPosts(searchTerm: string, limit: number = 20, currentUserId?: string): Promise<Post[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('caption', '>=', searchTerm),
        where('caption', '<=', searchTerm + '\uf8ff'),
        where('isActive', '==', true),
        orderBy('caption'),
        orderBy('timestamp', 'desc'),
        firestoreLimit(limit)
      );

      const querySnapshot = await getDocs(q);
      const posts: Post[] = [];

      querySnapshot.forEach((doc) => {
        const postData = { id: doc.id, ...doc.data() };
        const enhancedPost = this.enhancePostWithEngagement(postData, currentUserId);
        posts.push(enhancedPost);
      });return posts;
    } catch (error) {
      console.error('❌ Error searching posts with engagement:', error);
      throw error;
    }
  }

  /**
   * Get trending posts (high engagement in last 24h) with enhanced engagement metrics
   */
  async getTrendingPosts(limit: number = 20, currentUserId?: string): Promise<Post[]> {
    try {
      // Simple trending algorithm - posts with high engagement in last 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oneDayAgoTimestamp = Timestamp.fromDate(oneDayAgo);
      
      const q = query(
        collection(db, this.collectionName),
        where('timestamp', '>=', oneDayAgoTimestamp),
        where('isActive', '==', true),
        orderBy('timestamp', 'desc'),
        firestoreLimit(limit * 2) // Get more to filter by engagement
      );

      const querySnapshot = await getDocs(q);
      const posts: Post[] = [];

      querySnapshot.forEach((doc) => {
        const postData = { id: doc.id, ...doc.data() };
        const enhancedPost = this.enhancePostWithEngagement(postData, currentUserId);
        
        // Only include posts with some engagement
        if (enhancedPost.likesCount > 0 || enhancedPost.commentsCount > 0 || enhancedPost.sharesCount > 0) {
          posts.push(enhancedPost);
        }
      });

      // Sort by total engagement score
      const trendingPosts = posts
        .sort((a, b) => {
          const scoreA = (a.likesCount * 1) + (a.commentsCount * 2) + (a.sharesCount * 3);
          const scoreB = (b.likesCount * 1) + (b.commentsCount * 2) + (b.sharesCount * 3);
          return scoreB - scoreA;
        })
        .slice(0, limit);return trendingPosts;
    } catch (error) {
      console.error('❌ Error getting trending posts with engagement:', error);
      throw error;
    }
  }
}

export default new PostsService();
