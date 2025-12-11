import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface EngagementData {
  likes?: number;
  likesCount?: number;
  comments?: number;
  commentsCount?: number;
  shares?: number;
  sharesCount?: number;
  views?: number;
  viewsCount?: number;
}

interface UseRealtimeEngagementOptions {
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Custom hook for real-time engagement data updates (likes, comments, shares, views)
 * Automatically syncs engagement counts when they change
 *
 * @param collectionName - The collection name (e.g., 'posts', 'moments')
 * @param documentId - The document ID to listen to
 * @param options - Configuration options
 * @returns engagement data, loading, error, and manual refresh function
 */
export const useRealtimeEngagement = (
  collectionName: string | null,
  documentId: string | null,
  options: UseRealtimeEngagementOptions = {}
) => {
  const { enabled = true, debounceMs = 300 } = options;

  const [engagement, setEngagement] = useState<EngagementData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  /**
   * Setup real-time listener for engagement data
   */
  const setupListener = useCallback(() => {
    if (!collectionName || !documentId || !enabled) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Subscribe to real-time updates
      unsubscribeRef.current = onSnapshot(
        doc(db, collectionName, documentId),
        (docSnapshot) => {
          try {
            if (!docSnapshot.exists()) {
              setEngagement({});
              setError(null);
              return;
            }

            const data = docSnapshot.data();
            const engagementData: EngagementData = {
              likes: data.likes?.length || data.likesCount || 0,
              likesCount: data.likes?.length || data.likesCount || 0,
              comments: data.comments?.length || data.commentsCount || 0,
              commentsCount: data.comments?.length || data.commentsCount || 0,
              shares: data.shares?.length || data.sharesCount || 0,
              sharesCount: data.shares?.length || data.sharesCount || 0,
              views: data.views?.length || data.viewsCount || 0,
              viewsCount: data.views?.length || data.viewsCount || 0
            };

            // Debounce rapid updates
            const now = Date.now();
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
            }

            if (now - lastUpdateRef.current > debounceMs) {
              setEngagement(engagementData);
              lastUpdateRef.current = now;
              setError(null);
            } else {
              debounceTimerRef.current = setTimeout(() => {
                setEngagement(engagementData);
                lastUpdateRef.current = Date.now();
                setError(null);
              }, debounceMs - (now - lastUpdateRef.current));
            }
          } catch (err) {
            console.error('Error processing engagement snapshot:', err);
            setError('Failed to update engagement data');
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          console.error('Realtime engagement listener error:', err);
          setError('Failed to listen for engagement updates');
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error setting up engagement listener:', err);
      setError('Failed to set up real-time engagement updates');
      setLoading(false);
    }
  }, [collectionName, documentId, enabled, debounceMs]);

  /**
   * Cleanup listener on unmount
   */
  useEffect(() => {
    setupListener();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [setupListener]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(() => {
    setupListener();
  }, [setupListener]);

  return {
    engagement,
    loading,
    error,
    refresh
  };
};

/**
 * Hook to track multiple posts/moments engagement in parallel
 * Useful for feeds where you need engagement data for multiple items
 */
export const useRealtimeEngagementBatch = (
  collectionName: string,
  documentIds: string[],
  options: UseRealtimeEngagementOptions = {}
) => {
  const { enabled = true } = options;

  const [engagementMap, setEngagementMap] = useState<Record<string, EngagementData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unsubscribesRef = useRef<Record<string, Unsubscribe>>({});

  /**
   * Setup listeners for all documents
   */
  const setupListeners = useCallback(() => {
    if (!enabled || documentIds.length === 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Clean up old listeners
      Object.values(unsubscribesRef.current).forEach(unsub => unsub());
      unsubscribesRef.current = {};

      // Create listeners for each document
      documentIds.forEach(docId => {
        unsubscribesRef.current[docId] = onSnapshot(
          doc(db, collectionName, docId),
          (docSnapshot) => {
            try {
              if (!docSnapshot.exists()) {
                setEngagementMap(prev => {
                  const updated = { ...prev };
                  delete updated[docId];
                  return updated;
                });
                return;
              }

              const data = docSnapshot.data();
              const engagementData: EngagementData = {
                likes: data.likes?.length || data.likesCount || 0,
                likesCount: data.likes?.length || data.likesCount || 0,
                comments: data.comments?.length || data.commentsCount || 0,
                commentsCount: data.comments?.length || data.commentsCount || 0,
                shares: data.shares?.length || data.sharesCount || 0,
                sharesCount: data.shares?.length || data.sharesCount || 0,
                views: data.views?.length || data.viewsCount || 0,
                viewsCount: data.views?.length || data.viewsCount || 0
              };

              setEngagementMap(prev => ({
                ...prev,
                [docId]: engagementData
              }));
            } catch (err) {
              console.error(`Error processing engagement snapshot for ${docId}:`, err);
            }
          },
          (err) => {
            console.error(`Realtime engagement listener error for ${docId}:`, err);
            setError('Failed to listen for some engagement updates');
          }
        );
      });

      setLoading(false);
    } catch (err) {
      console.error('Error setting up engagement batch listeners:', err);
      setError('Failed to set up real-time engagement updates');
      setLoading(false);
    }
  }, [collectionName, documentIds, enabled]);

  /**
   * Setup/update listeners when documentIds change
   */
  useEffect(() => {
    setupListeners();

    return () => {
      Object.values(unsubscribesRef.current).forEach(unsub => unsub());
      unsubscribesRef.current = {};
    };
  }, [setupListeners]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(() => {
    setupListeners();
  }, [setupListeners]);

  /**
   * Get engagement data for a specific document
   */
  const getEngagement = useCallback((docId: string): EngagementData => {
    return engagementMap[docId] || {};
  }, [engagementMap]);

  return {
    engagementMap,
    engagement: engagementMap,
    loading,
    error,
    refresh,
    getEngagement
  };
};
