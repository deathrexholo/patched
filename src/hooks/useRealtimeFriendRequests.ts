// Real-time friend requests hook using Firebase onSnapshot listener
import { useEffect, useState, useCallback } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { FriendRequest } from '../types/models/friend';

interface UseRealtimeFriendRequestsReturn {
  incomingRequests: FriendRequest[];  // Requests I received
  outgoingRequests: FriendRequest[];  // Requests I sent
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook for real-time friend request updates using Firebase listener
 * Automatically syncs when requests are added/accepted/rejected
 *
 * @param userId - Current user's ID
 * @returns Object containing incoming/outgoing requests, loading state, error, and refresh function
 */
export const useRealtimeFriendRequests = (
  userId: string | null
): UseRealtimeFriendRequestsReturn => {
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Setup listeners for both incoming and outgoing requests
  useEffect(() => {
    if (!userId) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setLoading(false);
      return;
    }

    let unsubscribeIncoming: Unsubscribe | null = null;
    let unsubscribeOutgoing: Unsubscribe | null = null;
    let incomingLoaded = false;
    let outgoingLoaded = false;

    const checkBothLoaded = () => {
      if (incomingLoaded && outgoingLoaded) {
        setLoading(false);
      }
    };

    try {
      setLoading(true);
      setError(null);

      // LISTENER 1: Incoming requests (where I am the recipient)
      const incomingQuery = query(
        collection(db, 'friendRequests'),
        where('recipientId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('timestamp', 'desc')
      );

      unsubscribeIncoming = onSnapshot(
        incomingQuery,
        (snapshot) => {
          try {
            const requests: FriendRequest[] = [];
            snapshot.forEach((doc) => {
              requests.push({
                id: doc.id,
                ...doc.data()
              } as FriendRequest);
            });
            setIncomingRequests(requests);
            incomingLoaded = true;
            checkBothLoaded();
          } catch (err) {
            console.error('Error processing incoming requests snapshot:', err);
            setError('Failed to load incoming friend requests');
          }
        },
        (err) => {
          console.error('❌ Incoming requests listener error:', err);
          setError('Failed to load friend requests. Please try again.');
          incomingLoaded = true;
          checkBothLoaded();
        }
      );

      // LISTENER 2: Outgoing requests (where I am the requester)
      const outgoingQuery = query(
        collection(db, 'friendRequests'),
        where('requesterId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('timestamp', 'desc')
      );

      unsubscribeOutgoing = onSnapshot(
        outgoingQuery,
        (snapshot) => {
          try {
            const requests: FriendRequest[] = [];
            snapshot.forEach((doc) => {
              requests.push({
                id: doc.id,
                ...doc.data()
              } as FriendRequest);
            });
            setOutgoingRequests(requests);
            outgoingLoaded = true;
            checkBothLoaded();
          } catch (err) {
            console.error('Error processing outgoing requests snapshot:', err);
            setError('Failed to load sent friend requests');
          }
        },
        (err) => {
          console.error('❌ Outgoing requests listener error:', err);
          setError('Failed to load sent requests. Please try again.');
          outgoingLoaded = true;
          checkBothLoaded();
        }
      );

    } catch (err: any) {
      console.error('❌ Error setting up friend request listeners:', err);
      setError(err.message || 'Failed to load friend requests');
      setLoading(false);
    }

    // Cleanup listeners on unmount
    return () => {
      if (unsubscribeIncoming) {
        unsubscribeIncoming();
      }
      if (unsubscribeOutgoing) {
        unsubscribeOutgoing();
      }
    };
  }, [userId]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setError(null);
    setLoading(true);
    // Listeners will automatically re-fetch
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  return {
    incomingRequests,
    outgoingRequests,
    loading,
    error,
    refresh
  };
};

export default useRealtimeFriendRequests;
