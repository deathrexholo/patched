import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LikeState {
  isLiked: boolean;
  likesCount: number;
  isLoading: boolean;
  error: string | null;
}

interface SocialActionsState {
  [postId: string]: LikeState;
}

interface QueuedAction {
  postId: string;
  action: 'like' | 'unlike';
  timestamp: number;
  retryCount: number;
}

interface UseSocialActionsReturn {
  getLikeState: (postId: string) => LikeState;
  toggleLike: (postId: string, currentLiked: boolean, currentCount: number) => Promise<void>;
  isLoading: (postId: string) => boolean;
  getError: (postId: string) => string | null;
  clearError: (postId: string) => void;
  retryFailedActions: () => Promise<void>;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;
const DEBOUNCE_DELAY = 300;

/**
 * Enhanced social actions hook with optimistic updates and error handling
 * Provides reliable like/unlike functionality with immediate UI feedback
 */
export const useSocialActions = (): UseSocialActionsReturn => {
  const { currentUser: user } = useAuth();
  const [state, setState] = useState<SocialActionsState>({});
  const [actionQueue, setActionQueue] = useState<QueuedAction[]>([]);
  const debounceTimers = useRef<{ [postId: string]: NodeJS.Timeout }>({});
  const processingQueue = useRef<boolean>(false);
  const subscriptions = useRef<{ [postId: string]: () => void }>({});

  /**
   * Get like state for a specific post
   */
  const getLikeState = useCallback((postId: string): LikeState => {
    return state[postId] || {
      isLiked: false,
      likesCount: 0,
      isLoading: false,
      error: null
    };
  }, [state]);

  /**
   * Update state for a specific post
   */
  const updatePostState = useCallback((postId: string, updates: Partial<LikeState>) => {
    setState(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        ...updates
      }
    }));
  }, []);

  /**
   * Initialize post state if not exists
   */
  const initializePostState = useCallback((postId: string, isLiked: boolean, likesCount: number) => {
    setState(prev => {
      if (!prev[postId]) {
        return {
          ...prev,
          [postId]: {
            isLiked,
            likesCount,
            isLoading: false,
            error: null
          }
        };
      }
      return prev;
    });
  }, []);

  /**
   * Perform actual like/unlike operation with the backend
   */
  const performLikeOperation = useCallback(async (postId: string, shouldLike: boolean): Promise<{ success: boolean; newCount: number }> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Import the social service dynamically to avoid circular dependencies
      const { default: socialService } = await import('@/services/socialService');
      
      const userInfo = {
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || null
      };

      const result = await socialService.toggleLike(postId, user.uid, userInfo);
      
      return {
        success: result.success,
        newCount: result.likesCount
      };
    } catch (error) {
      console.error('Like operation failed:', error);
      throw error;
    }
  }, [user]);

  /**
   * Process queued actions with retry logic
   */
  const processActionQueue = useCallback(async () => {
    if (processingQueue.current || actionQueue.length === 0) {
      return;
    }

    processingQueue.current = true;

    try {
      const actionsToProcess = [...actionQueue];
      const failedActions: QueuedAction[] = [];

      for (const queuedAction of actionsToProcess) {
        const { postId, action, retryCount } = queuedAction;
        
        try {
          updatePostState(postId, { isLoading: true, error: null });
          
          const shouldLike = action === 'like';
          const result = await performLikeOperation(postId, shouldLike);
          
          // Update state with server response
          updatePostState(postId, {
            isLiked: shouldLike,
            likesCount: result.newCount,
            isLoading: false,
            error: null
          });

          // Store in localStorage for persistence
          const storageKey = `like_${postId}_${user?.uid}`;
          if (shouldLike) {
            localStorage.setItem(storageKey, 'true');
          } else {
            localStorage.removeItem(storageKey);
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (retryCount < MAX_RETRY_ATTEMPTS) {
            // Retry with exponential backoff
            const delay = RETRY_DELAY * Math.pow(2, retryCount);
            setTimeout(() => {
              failedActions.push({
                ...queuedAction,
                retryCount: retryCount + 1
              });
            }, delay);
          } else {
            // Max retries reached, show error
            updatePostState(postId, {
              isLoading: false,
              error: `Failed to ${action} post: ${errorMessage}`
            });
          }
        }
      }

      // Update queue with failed actions for retry
      setActionQueue(failedActions);

    } finally {
      processingQueue.current = false;
    }
  }, [actionQueue, performLikeOperation, updatePostState, user?.uid]);

  /**
   * Add action to queue for processing
   */
  const queueAction = useCallback((postId: string, action: 'like' | 'unlike') => {
    const newAction: QueuedAction = {
      postId,
      action,
      timestamp: Date.now(),
      retryCount: 0
    };

    setActionQueue(prev => {
      // Remove any existing actions for this post to avoid conflicts
      const filtered = prev.filter(a => a.postId !== postId);
      return [...filtered, newAction];
    });

    // Process queue after a short delay
    setTimeout(processActionQueue, 100);
  }, [processActionQueue]);

  /**
   * Subscribe to real-time like updates for a post
   */
  const subscribeToPost = useCallback(async (postId: string) => {
    if (subscriptions.current[postId]) {
      return; // Already subscribed
    }

    try {
      const { default: socialService } = await import('@/services/socialService');
      
      const unsubscribe = socialService.subscribeToLikes(postId, (likesCount, likes) => {
        if (!user) return;
        
        const isLiked = likes.some(like => like.userId === user.uid);
        
        updatePostState(postId, {
          isLiked,
          likesCount,
          isLoading: false,
          error: null
        });
      });
      
      subscriptions.current[postId] = unsubscribe;
    } catch (error) {
      console.error('Failed to subscribe to post likes:', error);
    }
  }, [user, updatePostState]);

  /**
   * Initialize post state and subscribe to real-time updates
   */
  const initializePost = useCallback((postId: string, isLiked: boolean, likesCount: number) => {
    initializePostState(postId, isLiked, likesCount);
    subscribeToPost(postId);
  }, [initializePostState, subscribeToPost]);

  /**
   * Toggle like with optimistic updates and debouncing
   */
  const toggleLike = useCallback(async (postId: string, currentLiked: boolean, currentCount: number) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Initialize state and subscribe to real-time updates if needed
    initializePost(postId, currentLiked, currentCount);

    // Clear existing debounce timer
    if (debounceTimers.current[postId]) {
      clearTimeout(debounceTimers.current[postId]);
    }

    // Optimistic update
    const newLiked = !currentLiked;
    const newCount = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

    updatePostState(postId, {
      isLiked: newLiked,
      likesCount: newCount,
      error: null
    });

    // Debounce the actual API call
    debounceTimers.current[postId] = setTimeout(() => {
      const action = newLiked ? 'like' : 'unlike';
      queueAction(postId, action);
    }, DEBOUNCE_DELAY);

  }, [user, initializePost, updatePostState, queueAction]);

  /**
   * Check if a post is currently loading
   */
  const isLoading = useCallback((postId: string): boolean => {
    return state[postId]?.isLoading || false;
  }, [state]);

  /**
   * Get error for a specific post
   */
  const getError = useCallback((postId: string): string | null => {
    return state[postId]?.error || null;
  }, [state]);

  /**
   * Clear error for a specific post
   */
  const clearError = useCallback((postId: string) => {
    updatePostState(postId, { error: null });
  }, [updatePostState]);

  /**
   * Unsubscribe from real-time updates for a post
   */
  const unsubscribeFromPost = useCallback((postId: string) => {
    const unsubscribe = subscriptions.current[postId];
    if (unsubscribe) {
      unsubscribe();
      delete subscriptions.current[postId];
    }
  }, []);



  /**
   * Retry all failed actions
   */
  const retryFailedActions = useCallback(async () => {
    try {
      const { default: socialService } = await import('@/services/socialService');
      await socialService.retryFailedOperations();
    } catch (error) {
      console.error('Failed to retry operations:', error);
    }

    const failedPosts = Object.keys(state).filter(postId => state[postId].error);
    
    for (const postId of failedPosts) {
      const postState = state[postId];
      updatePostState(postId, { error: null });
      
      // Re-queue the action based on current state
      const action = postState.isLiked ? 'like' : 'unlike';
      queueAction(postId, action);
    }
  }, [state, updatePostState, queueAction]);

  /**
   * Initialize social service on mount
   */
  useEffect(() => {
    const initializeSocialService = async () => {
      try {
        const { default: socialService } = await import('@/services/socialService');
        socialService.initialize();
      } catch (error) {
        console.error('Failed to initialize social service:', error);
      }
    };

    initializeSocialService();

    // Cleanup on unmount
    return () => {
      // Unsubscribe from all posts
      Object.values(subscriptions.current).forEach(unsubscribe => unsubscribe());
      subscriptions.current = {};
    };
  }, []);

  /**
   * Load persisted like state from localStorage on mount
   */
  useEffect(() => {
    const loadPersistedState = async () => {
      if (!user) return;

      try {
        const { default: socialService } = await import('@/services/socialService');
        
        // Load state for posts that are already in our state
        for (const postId of Object.keys(state)) {
          const { liked, count } = await socialService.getLikeState(postId, user.uid);
          updatePostState(postId, {
            isLiked: liked,
            likesCount: count
          });
        }
      } catch (error) {
        console.error('Failed to load persisted like state:', error);
      }
    };

    loadPersistedState();
  }, [user, updatePostState]);

  return {
    getLikeState,
    toggleLike,
    isLoading,
    getError,
    clearError,
    retryFailedActions
  };
};