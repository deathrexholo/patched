// Real-time comments hook using Firebase onSnapshot listener
import { useEffect, useState, useCallback } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  QueryConstraint,
  Unsubscribe
} from 'firebase/firestore';
import { Comment } from '../services/api/commentService';
import type { ContentType } from '../services/api/commentService';

interface UseRealtimeCommentsReturn {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook for real-time comment updates using Firebase listener
 * Automatically syncs when comments are added/edited/deleted
 * Works for all content types: posts, stories, moments
 */
export const useRealtimeComments = (
  contentId: string | null,
  contentType: ContentType = 'post'
): UseRealtimeCommentsReturn => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [unsubscribe, setUnsubscribe] = useState<Unsubscribe | null>(null);

  // Setup listener and cleanup
  useEffect(() => {
    if (!contentId) {
      setComments([]);
      setLoading(false);
      return;
    }

    let unsubscribeFn: Unsubscribe | null = null;

    const setupListener = () => {
      try {
        setLoading(true);
        setError(null);

        // Build query constraints
        const constraints: QueryConstraint[] = [
          where('contentId', '==', contentId),
          where('contentType', '==', contentType),
          orderBy('timestamp', 'asc')
        ];

        // Create query with constraints
        const q = query(
          collection(db, 'comments'),
          ...constraints
        );

        // Setup real-time listener
        unsubscribeFn = onSnapshot(
          q,
          (snapshot) => {
            try {
              const fetchedComments: Comment[] = [];

              snapshot.forEach((doc) => {
                fetchedComments.push({
                  id: doc.id,
                  ...doc.data()
                } as Comment);
              });

              setComments(fetchedComments);
              setLoading(false);} catch (err) {
              console.error('Error processing snapshot:', err);
              setError('Failed to process comments');
            }
          },
          (err) => {
            console.error('❌ Listener error:', err);
            setError('Failed to load comments. Please try again.');
            setLoading(false);
          }
        );

        setUnsubscribe(() => unsubscribeFn);
      } catch (err: any) {
        console.error('❌ Error setting up listener:', err);
        setError(err.message || 'Failed to load comments');
        setLoading(false);
      }
    };

    setupListener();

    // Cleanup listener on unmount or when contentId changes
    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, [contentId, contentType]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setError(null);
    // Just toggle loading state - the listener will automatically update
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  return {
    comments,
    loading,
    error,
    refresh
  };
};

/**
 * Hook specifically for post comments (backward compatibility)
 */
export const useRealtimePostComments = (
  postId: string | null
): UseRealtimeCommentsReturn => {
  return useRealtimeComments(postId, 'post');
};

/**
 * Hook specifically for moment comments (backward compatibility)
 */
export const useRealtimeMomentComments = (
  momentId: string | null
): UseRealtimeCommentsReturn => {
  return useRealtimeComments(momentId, 'moment');
};

/**
 * Hook specifically for story comments (backward compatibility)
 */
export const useRealtimeStoryComments = (
  storyId: string | null
): UseRealtimeCommentsReturn => {
  return useRealtimeComments(storyId, 'story');
};
