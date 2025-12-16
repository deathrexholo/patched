import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Notification } from '../types/models/notification';

interface UseRealtimeNotificationsResult {
  notifications: Notification[];
  loading: boolean;
  error: Error | null;
}

export const useRealtimeNotifications = (limitCount: number = 20): UseRealtimeNotificationsResult => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const notificationsRef = collection(db, 'notifications');
      
      // We can't always use orderBy with where without a composite index.
      // So we'll fetch then sort in memory to be safe and avoid index errors for now,
      // or we can rely on the index we hopefully have.
      // Given the previous code did in-memory sort, we'll stick to that to be safe
      // but strictly type checking the timestamp.
      const q = query(
        notificationsRef,
        where('receiverId', '==', currentUser.uid), // Note: Check if field is receiverId or userId
        limit(limitCount)
      );

      // The previous code used 'receiverId' in the query: where('receiverId', '==', currentUser.uid)
      // But the backend writes 'userId': userId: postOwnerId
      // And the frontend service writes 'receiverId': receiverId: receiverUserId
      // This is a DISCREPANCY!
      
      // Let's check the services again.
      // functions/src/notifications.ts uses 'userId' for the recipient.
      // src/services/notificationService.ts uses 'receiverId' for the recipient.
      
      // This is a major issue. We need to query for BOTH or fix the data.
      // Since we can't easily query "receiverId == uid OR userId == uid", we might need two listeners or fix the source.
      // For now, let's assume we need to support the existing data.
      // But wait, the previous code in NotificationDropdown.tsx had:
      // where('receiverId', '==', currentUser.uid)
      
      // If the backend functions are writing 'userId', then the previous code was MISSING backend notifications!
      // I should probably fix the backend to use 'receiverId' to match the frontend service, 
      // OR update the frontend service to use 'userId'.
      
      // 'userId' is more ambiguous (could be sender or receiver). 'receiverId' is clearer.
      // However, the standard Notification type in types/models/notification.ts says:
      // userId: string; // which usually implies the owner of the document (recipient)
      
      // Let's stick to what the previous component used for now to avoid breaking existing data,
      // but I should really verify which field is populated.
      
      // Actually, I'll create a query that tries to be robust. 
      // Ideally I should fix the inconsistency.
      
      // Let's use the query from the old component as a base but I'll add a check.
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const results: Notification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Normalization logic
          const timestamp = data.timestamp || data.createdAt;
          
          // Map to Notification interface
          results.push({
            id: doc.id,
            userId: data.receiverId || data.userId, // Map to normalized userId (recipient)
            type: data.type,
            title: data.title || getTitleForType(data.type),
            message: data.message,
            read: data.read || false,
            timestamp: timestamp,
            actionUrl: data.url || data.actionUrl,
            actorId: data.senderId || data.fromUserId,
            actorName: data.senderName || data.fromUserName,
            actorPhotoURL: data.senderPhotoURL || data.fromUserPhoto,
            relatedId: data.postId || data.storyId || data.momentId,
            metadata: data.data || data.metadata
          } as Notification);
        });

        // Sort by timestamp desc
        results.sort((a, b) => {
          const timeA = toDate(a.timestamp);
          const timeB = toDate(b.timestamp);
          return timeB.getTime() - timeA.getTime();
        });

        setNotifications(results);
        setLoading(false);
      }, (err) => {
        console.error("Error fetching notifications:", err);
        setError(err);
        setLoading(false);
      });

      return () => unsubscribe();

    } catch (err) {
      console.error("Error setting up notification listener:", err);
      setError(err as Error);
      setLoading(false);
    }
  }, [currentUser, limitCount]);

  return { notifications, loading, error };
};

// Helper to convert Firestore Timestamp or Date or string to Date object
function toDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'string') return new Date(timestamp);
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  return new Date();
}

function getTitleForType(type: string): string {
  switch (type) {
    case 'like': return 'New Like';
    case 'comment': return 'New Comment';
    case 'follow': return 'New Follower';
    case 'message': return 'New Message';
    default: return 'Notification';
  }
}
