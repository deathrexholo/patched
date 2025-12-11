import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  onSnapshot, 
  getDoc,
  runTransaction,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Like } from '@/types/models/post';

interface LikeOperation {
  postId: string;
  userId: string;
  userInfo: {
    displayName: string;
    photoURL: string | null;
  };
  action: 'like' | 'unlike';
  timestamp: number;
}

interface LikeResult {
  success: boolean;
  liked: boolean;
  likesCount: number;
  error?: string;
}

interface QueuedOperation extends LikeOperation {
  retryCount: number;
  id: string;
}

/**
 * Social service for handling like operations with Firestore
 * Provides reliable like/unlike functionality with offline support
 */
class SocialService {
  private operationQueue: QueuedOperation[] = [];
  private isProcessingQueue = false;
  private listeners: Map<string, () => void> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Toggle like on a post with transaction support
   */
  async toggleLike(
    postId: string, 
    userId: string, 
    userInfo: { displayName: string; photoURL: string | null }
  ): Promise<LikeResult> {
    try {
      const result = await runTransaction(db, async (transaction) => {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await transaction.get(postRef);
        
        if (!postDoc.exists()) {
          throw new Error('Post not found');
        }

        const postData = postDoc.data();
        const likes = (postData.likes || []) as Like[];
        const currentLikesCount = postData.likesCount || likes.length;
        
        // Check if user already liked the post
        const existingLikeIndex = likes.findIndex(like => like.userId === userId);
        const isCurrentlyLiked = existingLikeIndex !== -1;
        
        let updatedLikes: Like[];
        let updatedLikesCount: number;
        
        if (isCurrentlyLiked) {
          // Unlike: remove the like
          updatedLikes = likes.filter(like => like.userId !== userId);
          updatedLikesCount = Math.max(0, currentLikesCount - 1);
        } else {
          // Like: add the like
          const newLike: Like = {
            userId,
            userName: userInfo.displayName,
            userPhotoURL: userInfo.photoURL,
            timestamp: new Date().toISOString()
          };
          updatedLikes = [...likes, newLike];
          updatedLikesCount = currentLikesCount + 1;
        }

        // Update the post document
        transaction.update(postRef, {
          likes: updatedLikes,
          likesCount: updatedLikesCount,
          updatedAt: Timestamp.now()
        });

        return {
          success: true,
          liked: !isCurrentlyLiked,
          likesCount: updatedLikesCount
        };
      });

      // Store in localStorage for offline persistence
      this.updateLocalStorage(postId, userId, result.liked);
      
      return result;
    } catch (error) {
      console.error('Like operation failed:', error);
      
      // Queue operation for retry if it's a network error
      if (this.isRetryableError(error)) {
        await this.queueOperation({
          postId,
          userId,
          userInfo,
          action: 'like', // Will be determined by current state during retry
          timestamp: Date.now()
        });
      }
      
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to update like status'
      );
    }
  }

  /**
   * Get real-time like updates for a post
   */
  subscribeToLikes(
    postId: string, 
    callback: (likesCount: number, likes: Like[]) => void
  ): () => void {
    const postRef = doc(db, 'posts', postId);
    
    const unsubscribe = onSnapshot(
      postRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const likes = (data.likes || []) as Like[];
          const likesCount = data.likesCount || likes.length;
          callback(likesCount, likes);
        }
      },
      (error) => {
        console.error('Error listening to like updates:', error);
      }
    );

    // Store the unsubscribe function
    this.listeners.set(postId, unsubscribe);
    
    return unsubscribe;
  }

  /**
   * Unsubscribe from like updates
   */
  unsubscribeFromLikes(postId: string): void {
    const unsubscribe = this.listeners.get(postId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(postId);
    }
  }

  /**
   * Queue operation for offline/retry handling
   */
  private async queueOperation(operation: LikeOperation): Promise<void> {
    const queuedOp: QueuedOperation = {
      ...operation,
      id: `${operation.postId}_${operation.userId}_${Date.now()}`,
      retryCount: 0
    };

    this.operationQueue.push(queuedOp);
    
    // Store in localStorage for persistence across sessions
    this.saveQueueToStorage();
    
    // Process queue
    this.processQueue();
  }

  /**
   * Process queued operations with retry logic
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const operations = [...this.operationQueue];
      const failedOperations: QueuedOperation[] = [];

      for (const operation of operations) {
        try {
          // Determine current action by checking post state
          const currentAction = await this.determineAction(operation.postId, operation.userId);
          
          await this.toggleLike(operation.postId, operation.userId, operation.userInfo);
          
          // Remove from queue on success
          this.removeFromQueue(operation.id);
          
        } catch (error) {
          console.error('Queued operation failed:', error);
          
          if (operation.retryCount < 3) {
            // Retry with exponential backoff
            const delay = Math.pow(2, operation.retryCount) * 1000;
            const updatedOperation = {
              ...operation,
              retryCount: operation.retryCount + 1
            };
            
            const timeoutId = setTimeout(() => {
              failedOperations.push(updatedOperation);
              this.retryTimeouts.delete(operation.id);
            }, delay);
            
            this.retryTimeouts.set(operation.id, timeoutId);
          } else {
            // Max retries reached, remove from queue
            this.removeFromQueue(operation.id);
          }
        }
      }

      // Update queue with failed operations
      this.operationQueue = failedOperations;
      this.saveQueueToStorage();

    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Determine the action needed based on current post state
   */
  private async determineAction(postId: string, userId: string): Promise<'like' | 'unlike'> {
    try {
      const postDoc = await getDoc(doc(db, 'posts', postId));
      if (postDoc.exists()) {
        const likes = (postDoc.data().likes || []) as Like[];
        const isLiked = likes.some(like => like.userId === userId);
        return isLiked ? 'unlike' : 'like';
      }
    } catch (error) {
      console.error('Error determining action:', error);
    }
    
    // Fallback to localStorage
    const localLiked = this.getLocalLikeState(postId, userId);
    return localLiked ? 'unlike' : 'like';
  }

  /**
   * Remove operation from queue
   */
  private removeFromQueue(operationId: string): void {
    this.operationQueue = this.operationQueue.filter(op => op.id !== operationId);
    
    // Clear any pending retry timeout
    const timeoutId = this.retryTimeouts.get(operationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.retryTimeouts.delete(operationId);
    }
  }

  /**
   * Save operation queue to localStorage
   */
  private saveQueueToStorage(): void {
    try {
      localStorage.setItem('socialService_queue', JSON.stringify(this.operationQueue));
    } catch (error) {
      console.error('Error saving queue to storage:', error);
    }
  }

  /**
   * Load operation queue from localStorage
   */
  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem('socialService_queue');
      if (stored) {
        this.operationQueue = JSON.parse(stored);
        // Process any pending operations
        this.processQueue();
      }
    } catch (error) {
      console.error('Error loading queue from storage:', error);
      this.operationQueue = [];
    }
  }

  /**
   * Update localStorage with like state
   */
  private updateLocalStorage(postId: string, userId: string, liked: boolean): void {
    try {
      const key = `like_${postId}_${userId}`;
      if (liked) {
        localStorage.setItem(key, 'true');
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error updating localStorage:', error);
    }
  }

  /**
   * Get like state from localStorage
   */
  private getLocalLikeState(postId: string, userId: string): boolean {
    try {
      const key = `like_${postId}_${userId}`;
      return localStorage.getItem(key) === 'true';
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return false;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const errorCode = error.code || error.message || '';
    const retryableCodes = [
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'internal',
      'network-request-failed',
      'offline'
    ];
    
    return retryableCodes.some(code => 
      errorCode.toLowerCase().includes(code.toLowerCase())
    );
  }

  /**
   * Get current like state for a post and user
   */
  async getLikeState(postId: string, userId: string): Promise<{ liked: boolean; count: number }> {
    try {
      const postDoc = await getDoc(doc(db, 'posts', postId));
      if (postDoc.exists()) {
        const data = postDoc.data();
        const likes = (data.likes || []) as Like[];
        const liked = likes.some(like => like.userId === userId);
        const count = data.likesCount || likes.length;
        
        return { liked, count };
      }
    } catch (error) {
      console.error('Error getting like state:', error);
      
      // Fallback to localStorage
      const liked = this.getLocalLikeState(postId, userId);
      return { liked, count: 0 };
    }
    
    return { liked: false, count: 0 };
  }

  /**
   * Retry all failed operations
   */
  async retryFailedOperations(): Promise<void> {
    if (this.operationQueue.length > 0) {
      await this.processQueue();
    }
  }

  /**
   * Clear all queued operations
   */
  clearQueue(): void {
    // Clear all retry timeouts
    this.retryTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.retryTimeouts.clear();
    
    // Clear queue
    this.operationQueue = [];
    
    // Clear localStorage
    try {
      localStorage.removeItem('socialService_queue');
    } catch (error) {
      console.error('Error clearing queue from storage:', error);
    }
  }

  /**
   * Initialize service (load queue from storage)
   */
  initialize(): void {
    this.loadQueueFromStorage();
  }

  /**
   * Cleanup service (unsubscribe from all listeners)
   */
  cleanup(): void {
    // Unsubscribe from all listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    
    // Clear retry timeouts
    this.retryTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.retryTimeouts.clear();
  }
}

// Export singleton instance
export const socialService = new SocialService();
export default socialService;