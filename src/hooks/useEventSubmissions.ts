/**
 * Hook for real-time event submissions
 */

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { eventsDb as db } from '../lib/firebase-events';
import { EventSubmission } from '../types/models/submission';

interface UseEventSubmissionsOptions {
  debounceMs?: number;
  onlySubmitted?: boolean;
}

/**
 * Real-time submissions hook
 * Listens to changes in event submissions
 */
export function useEventSubmissions(
  eventId: string,
  options: UseEventSubmissionsOptions = {}
) {
  const { debounceMs = 300, onlySubmitted = false } = options;
  const [submissions, setSubmissions] = useState<EventSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setSubmissions([]);
      return;
    }

    setLoading(true);
    let unsubscribe: (() => void) | null = null;

    // Build query
    let queryConstraints: any[] = [where('eventId', '==', eventId)];
    if (onlySubmitted) {
      queryConstraints.push(where('status', '==', 'submitted'));
    }

    const q = query(collection(db, 'eventSubmissions'), ...queryConstraints);

    // Debounce timer for updates
    let debounceTimer: NodeJS.Timeout;

    // Set up real-time listener
    try {
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          // Clear previous debounce
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }

          // Debounce the state update
          debounceTimer = setTimeout(() => {
            const submissionData: EventSubmission[] = [];

            snapshot.forEach((doc) => {
              const data = doc.data();
              submissionData.push({
                id: doc.id,
                ...data,
                uploadedAt: data.uploadedAt?.toDate?.() || data.uploadedAt,
                updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
              } as EventSubmission);
            });

            // Sort by upload time (newest first)
            submissionData.sort((a, b) => {
              let timeA = 0;
              let timeB = 0;
              if (a.uploadedAt) {
                timeA = typeof a.uploadedAt === 'string'
                  ? new Date(a.uploadedAt).getTime()
                  : (a.uploadedAt as any).toDate?.().getTime?.() || 0;
              }
              if (b.uploadedAt) {
                timeB = typeof b.uploadedAt === 'string'
                  ? new Date(b.uploadedAt).getTime()
                  : (b.uploadedAt as any).toDate?.().getTime?.() || 0;
              }
              return timeB - timeA;
            });

            setSubmissions(submissionData);
            setLoading(false);
            setError(null);}, debounceMs);
        },
        (err) => {
          console.error('❌ Error listening to submissions:', err);
          setError(err as Error);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('❌ Error setting up submissions listener:', err);
      setError(err as Error);
      setLoading(false);
    }

    // Cleanup
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [eventId, debounceMs, onlySubmitted]);

  return {
    submissions,
    loading,
    error,
  };
}
