import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@lib/firebase';
import { useAuth } from '@contexts/AuthContext';

/**
 * Hook to track unread chat messages for the current user.
 * Used primarily for displaying notification badges on the UI.
 */
export const useUnreadMessages = () => {
  const { currentUser } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      setHasUnread(false);
      setUnreadCount(0);
      return;
    }

    // Query for all unread messages where the current user is the receiver
    // This query is efficient as Firestore charges for documents returned.
    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', currentUser.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unreadDocs = snapshot.docs.map(doc => ({
        id: doc.id,
        senderId: doc.data().senderId,
        msg: doc.data().message?.substring(0, 20)
      }));
      
      if (unreadDocs.length > 0) {
        console.log("🔔 Unread Messages Found:", unreadDocs);
      }
      
      setHasUnread(!snapshot.empty);
      setUnreadCount(snapshot.size);
    }, (error) => {
      console.error("Error listening to unread messages:", error);
      // Don't reset state on error to avoid flickering, just log it.
      // The previous state (hasUnread, unreadCount) will persist.
    });

    return () => unsubscribe();
  }, [currentUser]);

  return { hasUnread, unreadCount };
};
